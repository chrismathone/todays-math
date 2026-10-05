// @vitest-environment node
/**
 * Real Chromium geometry of memory sheets converted from an original v15 page.
 *
 *   TEXTBOOK_PDF_TEST=1 npx vitest run src/__tests__/unit/textbookRecoverySourceMemory.integration.test.ts
 *
 * The first suite uses synthetic rows. The second compares the original unit's rows with the
 * geometry measured from the original typesetter; it needs the private reference directory
 * (`exchange-semantic.json` and `requested-row-paired-geometry.json`) in
 * TEXTBOOK_RECOVERY_REFERENCE_DIR and is skipped without it. Evidence — boxes, row keys, font
 * names and hashes, never manuscript text — is written to TEXTBOOK_RECOVERY_EVIDENCE_DIR or the
 * system temp directory, never into the repository.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { textbookExchangeSchema } from "@/contracts/textbookExchange.contract";
import type { TextbookSemanticRow } from "@/contracts/textbookSemantic.contract";
import { launchExportBrowser } from "@/lib/export/pdfServer";
import { TEXTBOOK_CONTENT_CSS } from "@/lib/textbook/render/blocks/contentCss";
import {
  commonRecallRowHeights,
  recallDisplayRows,
  type RecallPhase,
} from "@/lib/textbook/render/blocks/recall";
import {
  inlineBundleCss,
  loadTextbookLocalBundle,
} from "@/lib/textbook/render/bundle.server";
import {
  renderBlockHtml,
  textbookHtmlDocument,
} from "@/lib/textbook/render/html";
import {
  createTextbookRenderModel,
  type RenderBlock,
} from "@/lib/textbook/render/model";

const run = process.env.TEXTBOOK_PDF_TEST === "1";
const REFERENCE = process.env.TEXTBOOK_RECOVERY_REFERENCE_DIR ?? "";
const hasReference =
  !!REFERENCE &&
  existsSync(path.join(REFERENCE, "exchange-semantic.json")) &&
  existsSync(path.join(REFERENCE, "requested-row-paired-geometry.json"));
/** Boxes of the original sheet's instruction bar, measured from the original typesetter. */
const FULLMASTER = path.join(REFERENCE, "original-fullmaster-geometry.json");
const OUT =
  process.env.TEXTBOOK_RECOVERY_EVIDENCE_DIR ??
  path.join(os.tmpdir(), "textbook-recovery-source-memory");
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const resources = { assetUrl: () => PNG, qrDataUrl: () => PNG };
const PHASES: RecallPhase[] = ["study", "keywords", "sentences"];
const ACTIVITY = {
  study: "conceptStudy",
  keywords: "clozeRecall",
  sentences: "sentenceRecall",
} as const;
const PAGE = { study: 18, keywords: 19, sentences: 20 } as const;
/** The original sheet's content width (`.master-block` in the measured geometry). */
const WIDTH_MM = 179;
const TOLERANCE_MM = 0.5;
const sha256 = (bytes: Uint8Array | string) =>
  createHash("sha256").update(bytes).digest("hex");

type Variant = "student" | "answers";
type Box = [number, number, number, number];
interface MeasuredRow {
  rowKey: string;
  origin: string | null;
  measured: boolean;
  box: Box;
  label: Box;
  body: Box;
  padding: [number, number];
  bodyMinHeight: string;
  labelLineHeight: number;
  labelFontSize: number;
  rules: Box[];
  ruleOnly: boolean;
  /** Content taller than the row box, in mm. */
  overflow: number;
  /** Printed key marks, keyword blanks, and characters of body text. */
  keys: number;
  blanks: number;
  textLength: number;
  fractions: number;
  tightFractions: number;
}
/** The instruction bar above the first concept of a sheet. */
interface MeasuredBar {
  box: Box;
  bold: Box;
  span: Box;
  paddingTop: number;
  borderTop: number;
  marginBottom: number;
  boldFontPt: number;
  boldLeading: number;
}
interface MeasuredBlock {
  blockId: string;
  source: boolean;
  box: Box;
  title: Box | null;
  checkbar: MeasuredBar | null;
  rows: MeasuredRow[];
}
interface MeasuredSheet {
  sheet: string;
  blocks: MeasuredBlock[];
  fonts: { body: string; label: string; math: string };
  faces: string[];
}

const height = (box: Box) => box[3] - box[1];
const paper = (index: number, name: string, inner: string) =>
  `<article class="tb-paper tb-stage-recall tb-page-even" data-textbook-page="${index}" data-sheet="${name}"><div class="tb-block" style="left:13mm;top:20mm;width:${WIDTH_MM}mm;position:absolute;display:block">${inner}</div></article>`;
const flow = (block: RenderBlock) =>
  `<div class="tb-block-inner" data-block-id="${block.id}" style="width:${WIDTH_MM}mm;height:auto;margin-bottom:4.7mm">${renderBlockHtml(block, resources)}</div>`;

describe.skipIf(!run)("source memory sheets in real Chromium", () => {
  let browser: Awaited<ReturnType<typeof launchExportBrowser>>;
  let css: { font: string; katex: string };
  let fontFiles: Record<string, string>;
  beforeAll(async () => {
    const bundle = await loadTextbookLocalBundle();
    css = {
      font: inlineBundleCss(bundle.fontCss, bundle.resources),
      katex: inlineBundleCss(bundle.katexCss, bundle.resources),
    };
    fontFiles = Object.fromEntries(
      [...bundle.resources]
        .filter(([url]) => url.includes("/editorial/fonts/"))
        .map(([url, resource]) => [
          url.slice(url.lastIndexOf("/") + 1),
          sha256(resource.bytes),
        ]),
    );
    browser = await launchExportBrowser();
    mkdirSync(OUT, { recursive: true });
  }, 120_000);
  afterAll(async () => {
    await browser?.close();
  }, 60_000);

  /** Prints the sheets with the production fonts and stylesheets and measures every row. */
  async function measure(
    name: string,
    sheets: Array<{ name: string; blocks: RenderBlock[] }>,
    contentCss = TEXTBOOK_CONTENT_CSS,
  ): Promise<{ sheets: MeasuredSheet[]; html: string }> {
    const html = textbookHtmlDocument(
      name,
      sheets
        .map((sheet, i) =>
          paper(i + 1, sheet.name, sheet.blocks.map(flow).join("")),
        )
        .join(""),
      css.font,
      css.katex,
    ).replace("</style></head>", `</style><style>${contentCss}</style></head>`);
    const page = await browser.newPage();
    await page.evaluate("globalThis.__name = (fn) => fn");
    await page.setContent(html, { waitUntil: "load" });
    const measured = (await page.evaluate(async () => {
      await document.fonts.ready;
      const mm = 25.4 / 96;
      return Array.from(
        document.querySelectorAll<HTMLElement>("[data-textbook-page]"),
      ).map((sheet) => {
        const origin = sheet.getBoundingClientRect();
        const box = (el: Element) => {
          const r = el.getBoundingClientRect();
          return [
            (r.left - origin.left) * mm,
            (r.top - origin.top) * mm,
            (r.right - origin.left) * mm,
            (r.bottom - origin.top) * mm,
          ];
        };
        const family = (selector: string) => {
          const el = sheet.querySelector(selector);
          return el ? getComputedStyle(el).fontFamily : "";
        };
        return {
          sheet: sheet.dataset.sheet,
          fonts: {
            body: family(".tb-memory-body"),
            label: family(".tb-memory-label"),
            math: family(".katex"),
          },
          faces: Array.from(document.fonts)
            .filter((face) => face.status === "loaded")
            .map((face) => `${face.family} ${face.weight} ${face.style}`)
            .sort(),
          blocks: Array.from(
            sheet.querySelectorAll<HTMLElement>("[data-block-id]"),
          ).map((block) => {
            const section = block.querySelector<HTMLElement>(".tb-memory")!;
            const title = section.querySelector(".tb-memory-title");
            const bar = section.querySelector(".tb-recall-checkbar");
            const bold = bar?.querySelector(":scope > b");
            const span = bar?.querySelector(":scope > span");
            return {
              blockId: block.dataset.blockId,
              source: section.classList.contains("tb-memory-source"),
              box: box(section),
              title: title ? box(title) : null,
              checkbar:
                bar && bold && span
                  ? {
                      box: box(bar),
                      bold: box(bold),
                      span: box(span),
                      paddingTop:
                        parseFloat(getComputedStyle(bar).paddingTop) * mm,
                      borderTop:
                        parseFloat(getComputedStyle(bar).borderTopWidth) * mm,
                      marginBottom:
                        parseFloat(getComputedStyle(bar).marginBottom) * mm,
                      boldFontPt:
                        (parseFloat(getComputedStyle(bold).fontSize) * 72) / 96,
                      boldLeading:
                        parseFloat(getComputedStyle(bold).lineHeight) /
                        parseFloat(getComputedStyle(bold).fontSize),
                    }
                  : null,
              rows: Array.from(
                section.querySelectorAll<HTMLElement>(".tb-memory-row"),
              ).map((row) => {
                const style = getComputedStyle(row);
                const label = row.querySelector(".tb-memory-label")!;
                const body = row.querySelector(".tb-memory-body")!;
                const labelStyle = getComputedStyle(label);
                return {
                  rowKey: row.dataset.rowKey,
                  origin: row.dataset.rowOrigin ?? null,
                  measured: row.classList.contains("tb-memory-row-measured"),
                  box: box(row),
                  overflow: (row.scrollHeight - row.clientHeight) * mm,
                  keys: row.querySelectorAll(".tb-memory-key").length,
                  blanks: row.querySelectorAll(".tb-blank-keyword").length,
                  textLength: (body.textContent ?? "").trim().length,
                  label: box(label),
                  body: box(body),
                  padding: [
                    parseFloat(style.paddingTop) * mm,
                    parseFloat(style.paddingBottom) * mm,
                  ],
                  bodyMinHeight: getComputedStyle(body).minHeight,
                  labelLineHeight: parseFloat(labelStyle.lineHeight),
                  labelFontSize: parseFloat(labelStyle.fontSize),
                  rules: Array.from(row.querySelectorAll(".tb-write-line")).map(
                    box,
                  ),
                  ruleOnly: !!row.querySelector(".tb-blank-rule"),
                  fractions: row.querySelectorAll(".mfrac").length,
                  tightFractions: Array.from(
                    row.querySelectorAll(".mfrac"),
                  ).filter((frac) => frac.querySelector(".mtight")).length,
                };
              }),
            };
          }),
        };
      });
    })) as MeasuredSheet[];
    await page.close();
    writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(measured));
    return { sheets: measured, html };
  }

  const row = (
    concept: string,
    index: number,
    label: string,
    rawText: string,
  ): TextbookSemanticRow => ({
    rowKey: `U09.${concept}.r${index}`,
    label,
    rawText,
    textFormat: "v15-tex",
  });
  /** One line, one line with fractions, a key fraction, and a row long enough for 7mm lines. */
  const CONCEPTS = [
    {
      conceptId: "C01",
      title: "분수와 소수",
      rows: [
        row("C01", 1, "뜻", "분모가 {{10의 거듭제곱}}인 분수는 소수로 쓴다."),
        row(
          "C01",
          2,
          "예",
          "[[\\frac{3}{8}]]은 {{[[\\frac{375}{1000}]]}}와 값이 같다.",
        ),
        row("C01", 3, "구별", "{{자연수}}는 분모가 일인 분수로 본다."),
      ],
    },
    {
      conceptId: "C02",
      title: "길게 이어지는 설명",
      rows: [
        row(
          "C02",
          1,
          "성질",
          "어떤 수를 여러 번 더할 때에는 {{같은 수의 묶음}}으로 생각하여 곱셈으로 바꾸어 계산하고, 남는 수는 따로 더한 다음 처음의 식과 값이 같은지 {{다시 확인}}한다. 이때 묶음의 크기를 바꾸어도 전체의 값은 달라지지 않으며, 묶는 차례를 바꾸어도 마찬가지이다. 계산을 마친 뒤에는 묶음의 수와 남는 수를 식으로 다시 써서 처음에 주어진 수와 같은지 견주어 본다.",
        ),
        row("C02", 2, "판단", "[[1.25]]는 {{끝이 있는 소수}}이다."),
      ],
    },
  ];
  const BANK_ROWS: TextbookSemanticRow[] = [
    {
      rowKey: "e5.x.definition",
      label: "약수",
      rawText: "어떤 수를 {나누어떨어지게} 하는 수이다.",
      textFormat: "bank-blank",
    },
    {
      rowKey: "e5.x.example",
      label: "예",
      rawText: "$\\frac{1}{2}$ 은 {약수}가 아니다.",
      textFormat: "bank-blank",
    },
  ];
  function sourceBlock(
    phase: RecallPhase,
    index: number,
    variant: Variant,
    rowHeightsMm?: Record<string, number>,
  ): RenderBlock {
    const concept = CONCEPTS[index];
    const reveal = variant === "answers";
    const hidden = !reveal && phase !== "study";
    return {
      id: `${phase}.${concept.conceptId}`,
      sourceBlockId: `${phase}.${concept.conceptId}`,
      unitKey: "U09",
      sectionKey: `memory-${phase}`,
      kind: "recall",
      phase,
      continuation: index > 0,
      answersVisible: reveal,
      memoryPhases: [],
      pieces: [],
      repetitionChecks: phase === "study",
      displayRows: recallDisplayRows(concept.rows, phase, reveal),
      semantic: {
        activity: ACTIVITY[phase],
        source: {
          unit: "U09",
          page: PAGE[phase],
          kind: "fullmaster",
          path: `pages[${PAGE[phase] - 1}]`,
        },
        // As the model does for a student: the hidden phases carry no row text.
        node: {
          kind: "concept",
          ...concept,
          rows: hidden
            ? concept.rows.map((r) => ({ ...r, rawText: "" }))
            : concept.rows,
        },
      },
      ...(rowHeightsMm ? { rowHeightsMm } : {}),
    } as RenderBlock;
  }
  const bankBlock = (phase: RecallPhase): RenderBlock =>
    ({
      id: `bank.${phase}`,
      sourceBlockId: `bank.${phase}`,
      unitKey: "U09",
      sectionKey: `bank-${phase}`,
      kind: "recall",
      phase,
      pieces: [],
      answersVisible: false,
      repetitionChecks: phase === "study",
      semantic: {
        activity: ACTIVITY[phase],
        node: { kind: "rows", groupKey: "concept-x.memory-0", rows: BANK_ROWS },
      },
    }) as RenderBlock;
  const sheetsOf = (variant: Variant, rowHeightsMm?: Record<string, number>) =>
    PHASES.map((phase) => ({
      name: phase,
      blocks: CONCEPTS.map((_, i) =>
        sourceBlock(phase, i, variant, rowHeightsMm),
      ),
    }));
  const rowsOf = (sheets: MeasuredSheet[], name: string) =>
    sheets.find((s) => s.sheet === name)!.blocks.flatMap((b) => b.rows);

  it("gives a source row the original padding, no body floor and display fractions", async () => {
    const { sheets } = await measure("source-synthetic-natural", [
      ...sheetsOf("answers"),
      { name: "bank", blocks: [bankBlock("study")] },
    ]);
    const study = rowsOf(sheets, "study");
    expect(study).toHaveLength(5);
    for (const r of study) {
      expect(r.origin).toBe("source");
      expect(r.padding[0]).toBeCloseTo(1.5, 2);
      expect(r.padding[1]).toBeCloseTo(1.5, 2);
      expect(r.bodyMinHeight).toBe("0px");
      expect(r.labelLineHeight / r.labelFontSize).toBeCloseTo(1.9, 2);
      expect(r.tightFractions).toBe(0);
    }
    // A one-line row is its label (0.7mm + 7.4pt at 1.9) above 3mm of padding: 8.64mm in the
    // original. The fraction row is taller than that, and neither is raised to a 7mm floor.
    const [oneLine, withFractions] = study;
    expect(height(oneLine.box)).toBeCloseTo(8.644, 1);
    expect(withFractions.fractions).toBe(2);
    expect(height(withFractions.box)).toBeGreaterThan(
      height(oneLine.box) + 0.4,
    );
    expect(height(withFractions.box)).toBeLessThan(10.2);
    // The title bar with its concept code is 8.43mm in the original (leading 1.65).
    const sourceBlocks = sheets.find((s) => s.sheet === "study")!.blocks;
    expect(sourceBlocks.every((b) => b.source)).toBe(true);
    for (const b of sourceBlocks) expect(height(b.title!)).toBeCloseTo(8.43, 1);
    // The instruction bar of the first concept is the original's: a rule, 2mm above 7.6pt text
    // at leading 1.6, and 3.2mm before the title. A continued concept has none.
    const [opening, following] = sourceBlocks;
    expect(following.checkbar).toBeNull();
    const bar = opening.checkbar!;
    expect(bar.paddingTop).toBeCloseTo(2, 2);
    expect(bar.borderTop).toBeGreaterThan(0.1);
    expect(bar.marginBottom).toBeCloseTo(3.2, 2);
    expect(bar.boldFontPt).toBeCloseTo(7.6, 1);
    expect(bar.boldLeading).toBeCloseTo(1.6, 2);
    expect(height(bar.box)).toBeCloseTo(6.553, 1);
    expect(opening.title![1] - bar.box[1]).toBeCloseTo(9.749, 1);
    // The bank sheet beside it keeps its own geometry: 1.1mm padding around a 7mm floor.
    const bank = rowsOf(sheets, "bank");
    expect(bank.map((r) => r.origin)).toEqual([null, null]);
    for (const r of bank) {
      expect(r.padding[0]).toBeCloseTo(1.1, 2);
      expect(r.bodyMinHeight).not.toBe("0px");
      expect(height(r.box)).toBeGreaterThanOrEqual(9.19);
      expect(r.labelLineHeight / r.labelFontSize).toBeCloseTo(1.9, 2);
    }
    expect(bank[1].fractions).toBe(1);
    expect(bank[1].tightFractions).toBe(1);
    // Its instruction bar stays the generic one: no rule, no padding, 3mm before the bar.
    const bankBar = sheets.find((s) => s.sheet === "bank")!.blocks[0].checkbar!;
    expect(bankBar.paddingTop).toBe(0);
    expect(bankBar.borderTop).toBe(0);
    expect(bankBar.marginBottom).toBeCloseTo(3, 2);
    expect(bankBar.boldFontPt).toBeCloseTo(7.3, 1);
    expect(bankBar.boldLeading).toBeCloseTo(1.7, 2);
    expect(height(bankBar.box)).toBeLessThan(5);
    expect(sheets[0].fonts.body).toBe("TextbookPretendard, sans-serif");
  }, 180_000);

  it("starts every row at one position in the study, keyword and sentence sheets", async () => {
    // The canonical height of a row is its natural height on the private study probe.
    const probe = await measure("source-synthetic-probe", [
      sheetsOf("answers")[0],
    ]);
    const rowHeightsMm = commonRecallRowHeights(
      rowsOf(probe.sheets, "study").map((r) => ({
        rowKey: r.rowKey,
        heightMm: height(r.box),
      })),
    );
    const { sheets, html } = await measure(
      "source-synthetic-measured",
      sheetsOf("student", rowHeightsMm),
    );
    const study = rowsOf(sheets, "study");
    for (const phase of PHASES) {
      const rows = rowsOf(sheets, phase);
      expect(rows.map((r) => r.rowKey)).toEqual(study.map((r) => r.rowKey));
      rows.forEach((r, i) => {
        expect(r.measured).toBe(true);
        expect(height(r.box)).toBeCloseTo(rowHeightsMm[r.rowKey], 1);
        expect(Math.abs(r.box[1] - study[i].box[1])).toBeLessThan(0.05);
        expect(Math.abs(r.box[3] - study[i].box[3])).toBeLessThan(0.05);
        expect(Math.abs(r.body[0] - study[i].body[0])).toBeLessThan(0.05);
        expect(r.overflow, `${phase} ${r.rowKey}`).toBeLessThan(0.05);
      });
    }
    // The student pages carry neither a key nor a hidden sentence.
    for (const text of ["10의 거듭제곱", "같은 수의 묶음", "끝이 있는 소수"])
      expect(html.split(text).length - 1).toBe(1); // the study sheet only
    const sentences = rowsOf(sheets, "sentences");
    expect(sentences.every((r) => r.fractions === 0)).toBe(true);
    // A short row is written on one rule that ends at the bottom of its body.
    const short = sentences[0];
    expect(short.ruleOnly).toBe(true);
    expect(short.rules).toHaveLength(1);
    expect(Math.abs(short.rules[0][3] - short.body[3])).toBeLessThan(0.05);
    expect(short.rules[0][1]).toBeGreaterThanOrEqual(short.body[1] - 0.05);
    // A long row is written on whole lines 7mm apart, inside its body.
    const long = sentences[3];
    expect(long.ruleOnly).toBe(false);
    expect(long.rules.length).toBeGreaterThanOrEqual(2);
    expect(long.rules.length).toBe(
      Math.floor((rowHeightsMm[long.rowKey] - 3) / 7),
    );
    long.rules.forEach((rule, i) => {
      expect(height(rule)).toBeCloseTo(7, 1);
      if (i > 0) expect(rule[3] - long.rules[i - 1][3]).toBeCloseTo(7, 1);
      expect(rule[1]).toBeGreaterThanOrEqual(long.body[1] - 0.05);
    });
    expect(
      Math.abs(long.rules[long.rules.length - 1][3] - long.body[3]),
    ).toBeLessThan(0.05);
  }, 180_000);

  describe.skipIf(!hasReference)("against the original typesetter", () => {
    interface Anchor {
      id: string;
      selector: string;
      ordinal: number;
      boxMm: Box;
    }
    interface Oracle {
      method: string;
      manuscriptSha256: string;
      pages: Array<{ sourcePage: number; anchors: Anchor[] }>;
    }
    /** Per concept block: its height, title height, and each row's offset and height. */
    function oracleBlocks(oracle: Oracle, sourcePage: number) {
      const anchors = oracle.pages.find(
        (p) => p.sourcePage === sourcePage,
      )!.anchors;
      const of = (selector: string) =>
        anchors
          .filter((a) => a.selector === selector)
          .sort((a, b) => a.ordinal - b.ordinal)
          .map((a) => a.boxMm);
      const rows = of(".master-row");
      const labels = of(".master-row .label");
      const titles = of(".master-title");
      expect(labels).toHaveLength(rows.length);
      return of(".master-block").map((block, i) => ({
        height: height(block),
        title: height(titles[i]),
        rows: rows
          .map((r, at) => ({ r, label: labels[at] }))
          .filter(({ r }) => r[1] >= block[1] && r[3] <= block[3])
          .map(({ r, label }) => ({
            top: r[1] - block[1],
            height: height(r),
            labelTop: label[1] - r[1],
            labelHeight: height(label),
            labelWidth: label[2] - label[0],
          })),
      }));
    }
    const load = () => {
      const exchangeBytes = readFileSync(
        path.join(REFERENCE, "exchange-semantic.json"),
      );
      const oracleBytes = readFileSync(
        path.join(REFERENCE, "requested-row-paired-geometry.json"),
      );
      return {
        exchange: textbookExchangeSchema.parse(
          JSON.parse(exchangeBytes.toString("utf8")),
        ),
        oracle: JSON.parse(oracleBytes.toString("utf8")) as Oracle,
        hashes: {
          exchange: sha256(exchangeBytes),
          oracle: sha256(oracleBytes),
        },
      };
    };
    const memoryBlocks = (
      model: ReturnType<typeof createTextbookRenderModel>,
      sourcePage: number,
    ) =>
      model.sections
        .flatMap((s) => s.blocks)
        .filter(
          (b) => b.kind === "recall" && b.semantic?.source?.page === sourcePage,
        );
    type Miss = { where: string; got: number; want: number };
    function compare(
      blocks: MeasuredBlock[],
      expected: ReturnType<typeof oracleBlocks>,
      sheet: string,
    ) {
      const misses: Miss[] = [];
      const deltas: Miss[] = [];
      const check = (where: string, got: number, want: number) => {
        deltas.push({ where, got, want });
        if (Math.abs(got - want) > TOLERANCE_MM)
          misses.push({ where, got, want });
      };
      expect(blocks).toHaveLength(expected.length);
      blocks.forEach((block, b) => {
        const want = expected[b];
        expect(block.rows).toHaveLength(want.rows.length);
        // The original block starts at its title; the sheet's instruction bar sits above it.
        const top = block.title![1];
        check(`${sheet}.block${b}.title`, height(block.title!), want.title);
        check(`${sheet}.block${b}.height`, block.box[3] - top, want.height);
        block.rows.forEach((r, i) => {
          check(
            `${sheet}.${r.rowKey}.height`,
            height(r.box),
            want.rows[i].height,
          );
          check(`${sheet}.${r.rowKey}.top`, r.box[1] - top, want.rows[i].top);
          // The label column: where it starts in the row, how tall and how wide it is.
          check(
            `${sheet}.${r.rowKey}.labelTop`,
            r.label[1] - r.box[1],
            want.rows[i].labelTop,
          );
          check(
            `${sheet}.${r.rowKey}.labelHeight`,
            height(r.label),
            want.rows[i].labelHeight,
          );
          check(
            `${sheet}.${r.rowKey}.labelWidth`,
            r.label[2] - r.label[0],
            want.rows[i].labelWidth,
          );
        });
      });
      return { misses, deltas };
    }

    it("prints the original rows within 0.5mm of the original geometry, fractions included", async () => {
      const { exchange, oracle, hashes } = load();
      const answers = createTextbookRenderModel(exchange, "answers");
      const student = createTextbookRenderModel(exchange, "student");
      const probeBlocks = memoryBlocks(answers, PAGE.study);
      expect(probeBlocks.length).toBeGreaterThan(0);
      expect(probeBlocks.every((b) => b.semantic?.source)).toBe(true);

      // 1. The private study probe at its natural height.
      const probe = await measure("source-original-probe", [
        { name: "study", blocks: probeBlocks },
      ]);
      const natural = compare(
        probe.sheets[0].blocks,
        oracleBlocks(oracle, PAGE.study),
        "probe",
      );
      const probeRows = probe.sheets[0].blocks.flatMap((b) => b.rows);
      expect(probeRows.every((r) => r.origin === "source")).toBe(true);
      expect(probeRows.some((r) => r.fractions > 0)).toBe(true);
      expect(probeRows.every((r) => r.tightFractions === 0)).toBe(true);

      // 2. The student sheets with the probe's heights as the common height. Source rows are
      // rounded up to 0.01mm, as the measurement does, so the rounding does not add up down a page.
      const rowHeightsMm = Object.fromEntries(
        probeRows.map((r) => [
          r.rowKey,
          Math.ceil(height(r.box) * 100 - 1e-6) / 100,
        ]),
      );
      const printed = await measure(
        "source-original-student",
        PHASES.map((phase) => ({
          name: phase,
          blocks: memoryBlocks(student, PAGE[phase]).map((block) => ({
            ...block,
            rowHeightsMm,
          })),
        })),
      );
      const results = PHASES.map((phase) =>
        compare(
          printed.sheets.find((s) => s.sheet === phase)!.blocks,
          oracleBlocks(oracle, PAGE[phase]),
          phase,
        ),
      );
      const study = rowsOf(printed.sheets, "study");
      const drift: Miss[] = [];
      for (const phase of PHASES)
        rowsOf(printed.sheets, phase).forEach((r, i) => {
          for (const edge of [1, 3] as const)
            if (Math.abs(r.box[edge] - study[i].box[edge]) > 0.05)
              drift.push({
                where: `${phase}.${r.rowKey}.${edge}`,
                got: r.box[edge],
                want: study[i].box[edge],
              });
        });

      // 2b. The instruction bar of each sheet against the original typesetter's, when measured.
      const barDeltas: Miss[] = [];
      if (existsSync(FULLMASTER)) {
        const original = JSON.parse(readFileSync(FULLMASTER, "utf8")) as {
          pages: Array<{
            sourcePage: number;
            checkbar: { box: Box };
            checkbarBold: { box: Box };
            checkbarSpan: { box: Box };
            titles: Box[];
            rows: Box[];
          }>;
        };
        for (const phase of PHASES) {
          const want = original.pages.find(
            (p) => p.sourcePage === PAGE[phase],
          )!;
          const [first] = printed.sheets.find((s) => s.sheet === phase)!.blocks;
          const bar = first.checkbar!;
          const top = bar.box[1];
          const wantTop = want.checkbar.box[1];
          const check = (where: string, got: number, expected: number) =>
            barDeltas.push({ where: `${phase}.${where}`, got, want: expected });
          check("checkbar.height", height(bar.box), height(want.checkbar.box));
          check(
            "bold.top",
            bar.bold[1] - top,
            want.checkbarBold.box[1] - wantTop,
          );
          check("bold.height", height(bar.bold), height(want.checkbarBold.box));
          check(
            "span.top",
            bar.span[1] - top,
            want.checkbarSpan.box[1] - wantTop,
          );
          check("span.height", height(bar.span), height(want.checkbarSpan.box));
          check(
            "title.top",
            first.title![1] - top,
            want.titles[0][1] - wantTop,
          );
          check(
            "firstRow.top",
            first.rows[0].box[1] - top,
            want.rows[0][1] - wantTop,
          );
        }
        expect(barDeltas).toHaveLength(21);
        for (const d of barDeltas)
          expect(Math.abs(d.got - d.want), d.where).toBeLessThan(0.05);
      }

      // 3. Control: the same rows with the bank's defaults do not meet the original geometry.
      const bankDefaults = await measure("source-original-bank-defaults", [
        {
          name: "study",
          blocks: probeBlocks.map(
            (block) =>
              ({
                ...block,
                semantic: { ...block.semantic!, source: undefined },
              }) as RenderBlock,
          ),
        },
      ]);
      const control = compare(
        bankDefaults.sheets[0].blocks,
        oracleBlocks(oracle, PAGE.study),
        "bank-defaults",
      );

      const worst = (list: Miss[]) =>
        list.reduce((max, d) => Math.max(max, Math.abs(d.got - d.want)), 0);
      writeFileSync(
        path.join(OUT, "source-original-comparison.json"),
        JSON.stringify(
          {
            toleranceMm: TOLERANCE_MM,
            reference: hashes,
            oracleManuscriptSha256: oracle.manuscriptSha256,
            oracleMethod: oracle.method,
            fontFiles,
            fonts: printed.sheets[0].fonts,
            faces: printed.sheets[0].faces,
            studentHtmlSha256: sha256(printed.html),
            rowHeightsMm,
            natural: { worstMm: worst(natural.deltas), ...natural },
            printed: PHASES.map((phase, i) => ({
              phase,
              worstMm: worst(results[i].deltas),
              ...results[i],
            })),
            drift,
            instructionBar: {
              measuredOriginal: existsSync(FULLMASTER),
              worstMm: worst(barDeltas),
              deltas: barDeltas,
            },
            bankDefaults: {
              worstMm: worst(control.deltas),
              misses: control.misses,
            },
          },
          null,
          2,
        ),
      );
      // The acceptance tolerance, and the tighter fact: the natural probe is the original geometry.
      expect(natural.misses).toEqual([]);
      expect(worst(natural.deltas)).toBeLessThan(0.05);
      for (const result of results) {
        expect(result.misses).toEqual([]);
        expect(worst(result.deltas)).toBeLessThan(0.1);
      }
      expect(drift).toEqual([]);
      expect(control.misses.length).toBeGreaterThan(0);
      // Nothing is taller than the fixed row it is printed in.
      for (const phase of PHASES)
        for (const r of rowsOf(printed.sheets, phase))
          expect(r.overflow, `${phase} ${r.rowKey}`).toBeLessThan(0.05);

      // Student pages: a blank for every key and no key mark; no body text on the sentence sheet.
      const keyCount = memoryBlocks(answers, PAGE.keywords)
        .flatMap((b) => (b.kind === "recall" ? (b.displayRows ?? []) : []))
        .flatMap((r) => r.pieces)
        .filter((piece) => piece.kind === "key").length;
      expect(keyCount).toBeGreaterThan(0);
      const keywords = rowsOf(printed.sheets, "keywords");
      expect(keywords.reduce((n, r) => n + r.keys, 0)).toBe(0);
      expect(keywords.reduce((n, r) => n + r.blanks, 0)).toBe(keyCount);
      const sentences = rowsOf(printed.sheets, "sentences");
      expect(sentences.every((r) => r.textLength === 0)).toBe(true);
      expect(sentences.every((r) => r.fractions === 0)).toBe(true);
      expect(sentences.every((r) => r.ruleOnly && r.rules.length === 1)).toBe(
        true,
      );
      // And the student model: no row text and no key piece in either hidden phase.
      for (const phase of ["keywords", "sentences"] as const) {
        const blocks = memoryBlocks(student, PAGE[phase]);
        expect(JSON.stringify(blocks)).not.toMatch(/"rawText":"[^"]/);
        const pieces = blocks
          .flatMap((b) => (b.kind === "recall" ? (b.displayRows ?? []) : []))
          .flatMap((r) => r.pieces);
        expect(pieces.some((piece) => piece.kind === "key")).toBe(false);
        if (phase === "sentences") expect(pieces).toEqual([]);
      }
    }, 300_000);
  });
});
