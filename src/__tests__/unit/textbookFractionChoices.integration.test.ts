// @vitest-environment node
/**
 * Real Chromium, product fonts and production CSS: the fraction choices of the frozen 중2-1 bank
 * problem (student p30) must not meet. Each choice row's glyph boxes are measured against the
 * next row's, in the measurement DOM that sets the block heights and in a printed page, at the
 * student column and at the answer book's question half. Removing the clearance or the row
 * marks brings the overlap back, so the check is not blind.
 *
 * Private inputs only: `TEXTBOOK_PDF_TEST=1` and `TEXTBOOK_FRACTION_CHOICE_RUN_DIR` (a frozen run
 * folder holding `exchange.private.json`; its sibling book folders are measured too). Evidence
 * goes to `TEXTBOOK_RECOVERY_EVIDENCE_DIR`, outside the repository.
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Page } from "puppeteer-core";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  textbookExchangeSchema,
  type TextbookExchange,
} from "@/contracts/textbookExchange.contract";
import { launchExportBrowser } from "@/lib/export/pdfServer";
import { canonicalJson } from "@/lib/textbook/canonical";
import { blockWidthMm } from "@/lib/textbook/layout/paginate";
import {
  CHOICE_ROW_CLASS,
  FRACTION_CHOICE_CSS,
} from "@/lib/textbook/render/blocks/fractionChoiceRows";
import { renderProblemHtml } from "@/lib/textbook/render/blocks/problem";
import {
  inlineBundleCss,
  loadTextbookLocalBundle,
} from "@/lib/textbook/render/bundle.server";
import { editorialBlock } from "@/lib/textbook/render/editorial";
import {
  measurementHtml,
  renderBlockHtml,
  textbookHtmlDocument,
} from "@/lib/textbook/render/html";
import {
  createTextbookRenderModel,
  type RenderBlock,
  type TextbookRenderModel,
} from "@/lib/textbook/render/model";

const RUN = process.env.TEXTBOOK_FRACTION_CHOICE_RUN_DIR ?? "";
const run =
  process.env.TEXTBOOK_PDF_TEST === "1" &&
  !!RUN &&
  existsSync(path.join(RUN, "exchange.private.json"));
const OUT =
  process.env.TEXTBOOK_RECOVERY_EVIDENCE_DIR ??
  path.join(os.tmpdir(), "textbook-fraction-choices");
const BLOCK = "d146236c-24aa-4a61-a039-78952a732ceb";
const ITEM = "adc85440-6aed-41c7-876b-ba60738f0019";
const variants = ["student", "answers"] as const;
type Problem = Extract<RenderBlock, { kind: "problem" }>;

interface Gap {
  row: number;
  gapPt: number;
}
interface Measured {
  id: string;
  rows: number;
  /** Clearance between the last glyph of one line group and the first of the next, in pt. */
  gaps: Gap[];
  minGapPt: number;
  /** Math on different lines within one wrapped choice, grouped by actual formula baseline. */
  innerGapsPt: number[];
  /** Glyph boxes outside the block, in pt (0 = none). */
  clipPt: number;
  heightMm: number;
  proseWidthMm: number;
  fractions: number;
  textStyleFractions: number;
  text: string;
}

const sha256 = (data: string | Buffer) =>
  createHash("sha256").update(data).digest("hex");

function loadExchange(dir: string): {
  raw: string;
  exchange: TextbookExchange;
  resources: { assetUrl: (id: string) => string; qrDataUrl: () => string };
} {
  const raw = readFileSync(path.join(dir, "exchange.private.json"), "utf8");
  const exchange = textbookExchangeSchema.parse(JSON.parse(raw));
  const cache = new Map<string, string>();
  const resources = {
    assetUrl(id: string) {
      if (cache.has(id)) return cache.get(id)!;
      const asset = exchange.assets.find((a) => a.assetId === id);
      if (!asset) throw new Error(`Unknown frozen asset ${id}`);
      const file = readdirSync(path.join(dir, "assets")).find((name) =>
        name.startsWith(asset.sha256),
      );
      if (!file) throw new Error(`Missing frozen asset ${id}`);
      const bytes = readFileSync(path.join(dir, "assets", file));
      expect(sha256(bytes), id).toBe(asset.sha256);
      const url = `data:${asset.mimeType};base64,${bytes.toString("base64")}`;
      cache.set(id, url);
      return url;
    },
    qrDataUrl(): string {
      throw new Error(
        "This frozen fraction fixture does not support QR assets",
      );
    },
  };
  return { raw, exchange, resources };
}

/** The model with only the given blocks, so a page holds just what is measured. */
function only(
  model: TextbookRenderModel,
  keep: (block: RenderBlock) => boolean,
): TextbookRenderModel {
  return {
    ...model,
    sections: model.sections
      .map((section) => ({ ...section, blocks: section.blocks.filter(keep) }))
      .filter((section) => section.blocks.length),
  };
}

const STYLE_ID = "fraction-choice-css";
// A zero override still tests the baseline when html.ts later imports the production rule.
const NO_CLEARANCE_CSS = FRACTION_CHOICE_CSS.replace(
  /margin-block:[^}]*/,
  "margin-block:0",
);
/** Production CSS, with the exported rule appended after it as html.ts will import it. */
function documentHtml(
  body: string,
  css: { font: string; katex: string },
  withRule = true,
): string {
  const html = textbookHtmlDocument(
    "fraction choices",
    body,
    css.font,
    css.katex,
  );
  return html.replace(
    "</head>",
    `<style id="${STYLE_ID}">${withRule ? FRACTION_CHOICE_CSS : NO_CLEARANCE_CSS}</style></head>`,
  );
}

/** In-page: the glyph clearances of every measured block that has choice rows. */
function measureRows(rowClass: string): Measured[] {
  const pt = 72 / 96;
  const mm = 25.4 / 96;
  type Box = { top: number; bottom: number; left: number; right: number };
  const glyphs = (nodes: Node[]): Box[] => {
    const boxes: Box[] = [];
    const add = (r: DOMRect) => {
      if (r.width > 0 && r.height > 0) boxes.push(r);
    };
    for (const node of nodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (!(node.textContent ?? "").trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const r of Array.from(range.getClientRects())) add(r);
        continue;
      }
      if (!(node instanceof Element)) continue;
      const leaves = [node, ...Array.from(node.querySelectorAll("*"))].filter(
        (el) =>
          (el.tagName === "svg" && el.closest(".katex-html")) ||
          (!el.closest("svg") &&
            el.children.length === 0 &&
            (el.textContent ?? "").trim() !== ""),
      );
      for (const leaf of leaves) {
        if (leaf.closest(".katex-html") || leaf.tagName === "svg")
          add(leaf.getBoundingClientRect());
        else
          for (const child of Array.from(leaf.childNodes))
            if (
              child.nodeType === Node.TEXT_NODE &&
              child.textContent!.trim()
            ) {
              const range = document.createRange();
              range.selectNodeContents(child);
              for (const r of Array.from(range.getClientRects())) add(r);
            }
      }
    }
    return boxes;
  };
  const out: Measured[] = [];
  for (const block of Array.from(
    document.querySelectorAll<HTMLElement>(
      "[data-measure-id], [data-print-probe]",
    ),
  )) {
    const p = block.querySelector<HTMLElement>(
      `.tb-prose > p > .${rowClass}, .tb-prose > p > [data-choice-row]`,
    )?.parentElement;
    if (!p) continue;
    const rows = Array.from(
      p.querySelectorAll<HTMLElement>(":scope > [data-choice-row]"),
    );
    const firstAt = Array.from(p.childNodes).indexOf(rows[0]);
    const stem = Array.from(p.childNodes)
      .slice(0, firstAt)
      .filter((n) => n.nodeName !== "BR");
    // The stem's last line is the group above the first choice.
    const stemBoxes = glyphs(stem);
    const lastStemTop = Math.max(...stemBoxes.map((b) => b.top));
    const groups = [
      stemBoxes.filter((b) => b.bottom > lastStemTop),
      ...rows.map((row) => glyphs([row])),
    ];
    const gaps: Gap[] = [];
    for (let i = 1; i < groups.length; i++) {
      if (!groups[i - 1].length || !groups[i].length) continue;
      const above = Math.max(...groups[i - 1].map((b) => b.bottom));
      const below = Math.min(...groups[i].map((b) => b.top));
      gaps.push({ row: i, gapPt: +((below - above) * pt).toFixed(3) });
    }
    const innerGapsPt: number[] = [];
    for (const row of rows) {
      const mathLines: Array<{ baseline: number; boxes: Box[] }> = [];
      for (const base of Array.from(
        row.querySelectorAll<HTMLElement>(".katex-html > .katex-base"),
      )) {
        const strut = base.querySelector<HTMLElement>(":scope > .katex-strut");
        if (!strut) continue;
        const align = getComputedStyle(strut).verticalAlign;
        const shift = align === "baseline" ? 0 : parseFloat(align);
        if (!Number.isFinite(shift))
          throw new Error(`Unsupported formula vertical alignment: ${align}`);
        const baseline = strut.getBoundingClientRect().bottom + shift;
        let line = mathLines.find(
          (l) => Math.abs(l.baseline - baseline) < 0.25,
        );
        if (!line) {
          line = { baseline, boxes: [] };
          mathLines.push(line);
        }
        line.boxes.push(...glyphs([base]));
      }
      mathLines.sort((a, b) => a.baseline - b.baseline);
      for (let i = 1; i < mathLines.length; i++) {
        const above = mathLines[i - 1].boxes;
        const below = mathLines[i].boxes;
        if (above.length && below.length)
          innerGapsPt.push(
            +(
              (Math.min(...below.map((b) => b.top)) -
                Math.max(...above.map((b) => b.bottom))) *
              pt
            ).toFixed(3),
          );
      }
    }
    const frame = block.getBoundingClientRect();
    let clip = 0;
    for (const box of groups.flat())
      clip = Math.max(
        clip,
        frame.top - box.top,
        box.bottom - frame.bottom,
        frame.left - box.left,
        box.right - frame.right,
      );
    const prose = block.querySelector<HTMLElement>(".tb-prose")!;
    out.push({
      id: block.dataset.measureId ?? block.dataset.printProbe ?? "",
      rows: rows.length,
      gaps,
      minGapPt: Math.min(...gaps.map((g) => g.gapPt)),
      innerGapsPt,
      clipPt: +(Math.max(0, clip) * pt).toFixed(3),
      heightMm: +(frame.height * mm).toFixed(3),
      proseWidthMm: +(prose.getBoundingClientRect().width * mm).toFixed(3),
      fractions: rows.reduce(
        (n, r) => n + r.querySelectorAll(".mfrac").length,
        0,
      ),
      textStyleFractions: rows.reduce(
        (n, r) =>
          n + r.querySelectorAll(".mfrac .mtight, .mtight .mfrac").length,
        0,
      ),
      text: prose.textContent ?? "",
    });
  }
  return out;
}

async function open(page: Page, html: string) {
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      ["400", "700"].map((w) =>
        document.fonts.load(`${w} 12px TextbookPretendard`),
      ),
    );
  });
  const fonts = await page.evaluate(() =>
    Array.from(document.fonts).map((f) => ({
      family: f.family,
      weight: f.weight,
      status: f.status,
    })),
  );
  for (const weight of ["400", "700"])
    expect(
      fonts.some(
        (f) =>
          f.family === "TextbookPretendard" &&
          f.weight === weight &&
          f.status === "loaded",
      ),
    ).toBe(true);
  expect(
    fonts.some((f) => f.family.startsWith("KaTeX_") && f.status === "loaded"),
  ).toBe(true);
}
const measure = (page: Page) =>
  page.evaluate(measureRows, CHOICE_ROW_CLASS) as Promise<Measured[]>;

describe.skipIf(!run)("fraction choices in real Chromium", () => {
  let browser: Awaited<ReturnType<typeof launchExportBrowser>>;
  let css: { font: string; katex: string };
  const evidence: Record<string, unknown> = {};
  beforeAll(async () => {
    const bundle = await loadTextbookLocalBundle();
    css = {
      font: inlineBundleCss(bundle.fontCss, bundle.resources),
      katex: inlineBundleCss(bundle.katexCss, bundle.resources),
    };
    browser = await launchExportBrowser();
    evidence.browser = await browser.version();
    mkdirSync(OUT, { recursive: true });
  }, 120_000);
  afterAll(async () => {
    const save = () =>
      writeFileSync(
        path.join(OUT, "fraction-choices.json"),
        JSON.stringify(evidence, null, 1),
      );
    save();
    if (!browser) return;
    const child = browser.process();
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Windows can stall after Browser.close while its dedicated process has already exited.
    // Preserve evidence first, and bound cleanup to the browser this test launched.
    try {
      await Promise.race([
        browser.close(),
        new Promise<void>((resolve) => {
          timer = setTimeout(() => {
            evidence.cleanupFallback = {
              browserProcessId: child?.pid,
              alreadyExited: child?.exitCode !== null,
              terminated: child?.exitCode === null ? child.kill() : false,
            };
            resolve();
          }, 15_000);
        }),
      ]);
    } finally {
      clearTimeout(timer);
      save();
    }
  }, 60_000);

  async function newPage() {
    const page = await browser.newPage();
    await page.evaluate("globalThis.__name = (fn) => fn");
    return page;
  }

  it("sets the five display fractions of the p30 problem apart, in the measured and the printed block", async () => {
    const { raw, exchange, resources } = loadExchange(RUN);
    const before = {
      file: sha256(raw),
      canonical: sha256(canonicalJson(exchange)),
    };
    const item = exchange.items.find((i) => i.itemId === ITEM)!;
    const snapshot = exchange.snapshots.find(
      (s) => s.snapshotId === item.snapshotId,
    )!;
    const target: Record<string, unknown> = {};
    for (const variant of variants) {
      const model = createTextbookRenderModel(exchange, variant);
      const section = model.sections.find((s) =>
        s.blocks.some((b) => b.id === BLOCK),
      )!;
      const block = section.blocks.find((b) => b.id === BLOCK) as Problem;
      expect(block.kind).toBe("problem");
      expect(block.itemId).toBe(ITEM);
      expect(block.qr).toBeNull();
      // The stored content reaches the renderer as it is: no TeX or order change.
      expect(block.content).toBe(snapshot.payload.content);
      expect(block.semantic && !block.semantic.source).toBe(true);
      const page = await newPage();
      // 1. The measurement DOM the block heights come from.
      await open(
        page,
        documentHtml(
          measurementHtml(
            only(model, (b) => b.id === BLOCK),
            resources,
          ),
          css,
        ),
      );
      const [measured] = await measure(page);
      // 2. A printed A4 page with the block in its column.
      const width = blockWidthMm(model.config, block);
      const editorial = editorialBlock(block, section);
      if (editorial.kind !== "problem")
        throw new Error("Expected problem projection");
      const problemHtml = renderProblemHtml(editorial, resources);
      const renderedBlock = renderBlockHtml(editorial, resources);
      // The production dispatcher adds the editorial wrapper around this exact problem.
      expect(renderedBlock.split(problemHtml).length).toBe(2);
      const printed = `<article class="tb-paper tb-recovered tb-stage-basic tb-page-even" data-textbook-page="1" data-template-key="${section.templateKey}"><div class="tb-block" data-template-key="${section.templateKey}" data-print-probe="${BLOCK}" style="left:13mm;top:40mm;width:${width}mm;height:${measured.heightMm}mm"><div class="tb-block-inner">${renderedBlock}</div></div></article>`;
      await open(page, documentHtml(printed, css));
      const [print] = await measure(page);
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
      });
      writeFileSync(path.join(OUT, `p30-${variant}.pdf`), pdf);
      await page.close();
      for (const m of [measured, print]) {
        expect(m.rows).toBe(5);
        expect(m.fractions).toBe(5);
        // \dfrac stays a display fraction.
        expect(m.textStyleFractions).toBe(0);
        expect(m.gaps).toHaveLength(5);
        expect(m.minGapPt).toBeGreaterThanOrEqual(0);
        expect(m.clipPt).toBe(0);
      }
      expect(print.text).toBe(measured.text);
      const redact = (m: Measured) => ({
        ...m,
        text: undefined,
        textSha256: sha256(m.text),
      });
      target[variant] = {
        blockWidthMm: width,
        figureCount: block.figures.length,
        measured: redact(measured),
        print: redact(print),
      };
    }
    // The answer book sets the question in a half as wide as the student column.
    const s = target.student as { measured: Measured };
    const a = target.answers as { measured: Measured };
    expect(
      Math.abs(s.measured.proseWidthMm - a.measured.proseWidthMm),
    ).toBeLessThan(0.05);
    const after = {
      file: sha256(
        readFileSync(path.join(RUN, "exchange.private.json"), "utf8"),
      ),
      canonical: sha256(canonicalJson(exchange)),
    };
    expect(after).toEqual(before);
    evidence.target = { ...target, exchange: before };
  }, 240_000);

  it("brings the overlap back when the clearance or the row marks are taken away", async () => {
    const { exchange, resources } = loadExchange(RUN);
    const model = only(
      createTextbookRenderModel(exchange, "student"),
      (b) => b.id === BLOCK,
    );
    const page = await newPage();
    await open(page, documentHtml(measurementHtml(model, resources), css));
    const fixed = (await measure(page))[0];
    // Tamper 1: neutralize every copy of the rule, including a later production CSS import.
    await page.evaluate(
      (id, rule) => {
        document.getElementById(id)!.textContent = rule;
      },
      STYLE_ID,
      NO_CLEARANCE_CSS,
    );
    const noRule = (await measure(page))[0];
    // Tamper 2: the rule back, the row class taken off the choices.
    await page.evaluate(
      (id, rule, rowClass) => {
        document.getElementById(id)!.textContent = rule;
        for (const row of Array.from(document.querySelectorAll(`.${rowClass}`)))
          row.classList.remove(rowClass);
      },
      STYLE_ID,
      FRACTION_CHOICE_CSS,
      CHOICE_ROW_CLASS,
    );
    const noClass = (await measure(page))[0];
    await page.close();
    expect(fixed.minGapPt).toBeGreaterThanOrEqual(0);
    for (const tampered of [noRule, noClass]) {
      expect(tampered.rows).toBe(5);
      expect(tampered.minGapPt).toBeLessThan(-3);
      expect(tampered.heightMm).toBeLessThan(fixed.heightMm);
    }
    evidence.tamper = {
      fixed: { minGapPt: fixed.minGapPt, heightMm: fixed.heightMm },
      noRule: {
        minGapPt: noRule.minGapPt,
        gaps: noRule.gaps,
        heightMm: noRule.heightMm,
      },
      noClass: { minGapPt: noClass.minGapPt, heightMm: noClass.heightMm },
    };
  }, 240_000);

  it("keeps every fraction choice block of the frozen books apart and leaves the others' heights alone", async () => {
    const root = path.dirname(RUN);
    const books = readdirSync(root).filter((d) =>
      existsSync(path.join(root, d, "exchange.private.json")),
    );
    const rows: Array<Record<string, unknown>> = [];
    let unchanged = 0;
    let changed = 0;
    for (const book of books) {
      const { exchange, resources } = loadExchange(path.join(root, book));
      for (const variant of variants) {
        const model = createTextbookRenderModel(exchange, variant);
        const choiceBlocks = only(
          model,
          (b) => b.kind === "problem" && /\n[ \t]*①/.test(b.content),
        );
        if (!choiceBlocks.sections.length) continue;
        const page = await newPage();
        await open(
          page,
          documentHtml(measurementHtml(choiceBlocks, resources), css),
        );
        const fixed = await measure(page);
        const heights = async () =>
          page.evaluate(() =>
            Object.fromEntries(
              Array.from(
                document.querySelectorAll<HTMLElement>("[data-measure-id]"),
              ).map((b) => [
                b.dataset.measureId!,
                b.getBoundingClientRect().height * (25.4 / 96),
              ]),
            ),
          );
        const withRule = await heights();
        // Evidence for the PDF glyph boxes: one block to a printed page.
        await page.addStyleTag({
          content:
            ".tb-measure{position:static}.tb-measure-block{break-before:page;break-inside:avoid}",
        });
        writeFileSync(
          path.join(OUT, `books-${book}-${variant}.pdf`),
          await page.pdf({ format: "A4", printBackground: true }),
        );
        expect((await measure(page)).map((m) => m.minGapPt)).toEqual(
          fixed.map((m) => m.minGapPt),
        );
        await page.evaluate(
          (id, rule) => {
            document.getElementById(id)!.textContent = rule;
          },
          STYLE_ID,
          NO_CLEARANCE_CSS,
        );
        const withoutRule = await heights();
        const before = await measure(page);
        await page.close();
        for (const m of fixed) {
          expect(
            m.minGapPt,
            `${book} ${variant} ${m.id}`,
          ).toBeGreaterThanOrEqual(0);
          expect(m.clipPt, `${book} ${variant} ${m.id}`).toBe(0);
          expect(m.textStyleFractions).toBe(
            before.find((b) => b.id === m.id)!.textStyleFractions,
          );
          rows.push({
            book,
            variant,
            id: m.id,
            rows: m.rows,
            minGapPt: m.minGapPt,
            beforeMinGapPt: before.find((b) => b.id === m.id)!.minGapPt,
            heightMm: m.heightMm,
            beforeHeightMm: +withoutRule[m.id].toFixed(3),
          });
        }
        // A choice block without rows has the same height with or without the rule.
        for (const [id, height] of Object.entries(withRule)) {
          if (fixed.some((m) => m.id === id)) {
            changed++;
            continue;
          }
          unchanged++;
          expect(
            Math.abs(height - withoutRule[id]),
            `${book} ${variant} ${id}`,
          ).toBeLessThan(0.001);
        }
      }
    }
    expect(changed).toBeGreaterThan(0);
    expect(unchanged).toBeGreaterThan(0);
    evidence.books = { books: books.length, changed, unchanged, rows };
  }, 900_000);

  it("keeps a nested fraction, a long wrapped choice and a mixed column apart at the student width", async () => {
    const { exchange, resources } = loadExchange(RUN);
    const model = createTextbookRenderModel(exchange, "student");
    const section = model.sections.find((s) =>
      s.blocks.some((b) => b.id === BLOCK),
    )!;
    const target = section.blocks.find((b) => b.id === BLOCK) as Problem;
    const cases: Record<string, string> = {
      nested: [
        "물음",
        "① $\\dfrac{\\dfrac{1}{2}}{3}$",
        "② $\\dfrac{2}{\\dfrac{3}{4}}$",
        "③ $\\dfrac{1}{2}$",
        "④ $\\dfrac{\\sqrt{3}}{2}$",
        "⑤ $1\\dfrac{2}{3}$",
      ].join("\n"),
      long: [
        "물음",
        `① $\\dfrac{1}{2}$ 보다 크고 ${"가나다라 ".repeat(24)}$\\dfrac{3}{4}$ 보다 작다`,
        "② $\\dfrac{1}{3}$",
        `③ ${"마바사 ".repeat(20)}$\\dfrac{5}{6}$`,
        "④ $\\dfrac{2}{3}x+\\dfrac{1}{4}y=1$",
        "⑤ $\\dfrac{7}{8}$",
      ].join("\n"),
      mixed: [
        "물음",
        "① $2$",
        "② $\\dfrac{1}{2}$",
        "③ 없다",
        "④ $\\frac{3}{4}$",
        "⑤ $\\left(\\dfrac{1}{2}\\right)^2$",
      ].join("\n"),
      cases: [
        "물음",
        "① $\\begin{cases} x+y=1 \\\\ x-y=3 \\end{cases}$",
        "② $\\dfrac{1}{2}$",
        "③ $\\begin{cases} x=2 \\\\ y=-1 \\end{cases}$",
      ].join("\n"),
      innerBreak:
        "물음\n① **$\\dfrac{1}{2}$\n$\\dfrac{3}{4}$**\n② $\\dfrac{1}{3}$",
      longFormula: `물음\n① $${Array.from({ length: 16 }, () => "\\dfrac{1}{2}").join("+")}$\n② $\\dfrac{1}{3}$`,
    };
    const synthetic = Object.entries(cases).map(([name, content]) => ({
      ...target,
      id: name,
      sourceBlockId: name,
      content,
    }));
    const page = await newPage();
    await open(
      page,
      documentHtml(
        measurementHtml(
          { ...model, sections: [{ ...section, blocks: synthetic }] },
          resources,
        ),
        css,
      ),
    );
    const measured = await measure(page);
    evidence.synthetic = measured.map((m) => ({ ...m, text: undefined }));
    await page.screenshot({
      path: path.join(OUT, "synthetic-choices.png"),
      fullPage: true,
    });
    await page.close();
    expect(measured.map((m) => m.id).sort()).toEqual(Object.keys(cases).sort());
    for (const m of measured) {
      expect(m.minGapPt, m.id).toBeGreaterThanOrEqual(0);
      expect(m.clipPt, m.id).toBe(0);
      for (const gap of m.innerGapsPt)
        expect(gap, m.id).toBeGreaterThanOrEqual(0);
    }
    for (const id of ["innerBreak", "longFormula"])
      expect(
        measured.find((m) => m.id === id)!.innerGapsPt.length,
        id,
      ).toBeGreaterThan(0);
  }, 240_000);
});
