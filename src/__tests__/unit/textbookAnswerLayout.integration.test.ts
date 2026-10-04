// @vitest-environment node
/**
 * The answer variant of a real automatic book whose answers did not paginate, in real Chromium.
 *
 *   TEXTBOOK_PDF_TEST=1 TEXTBOOK_ANSWER_LAYOUT_RUN_DIR=<private run folder> \
 *     npx vitest run src/__tests__/unit/textbookAnswerLayout.integration.test.ts
 *
 * The run folder is a private QA output: `exchange.private.json`, `assets/`, `failure.json` and
 * the student chunk that was printed before the answers failed. Nothing of it is in the
 * repository, and this check records sizes and identifiers only — never question, answer or
 * solution text. Without the folder the suite is skipped.
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { textbookExchangeSchema } from "@/contracts/textbookExchange.contract";
import { launchExportBrowser } from "@/lib/export/pdfServer";
import {
  A4,
  blockWidthMm,
  textbookBodyTopMm,
} from "@/lib/textbook/layout/paginate";
import { TEXTBOOK_CONTENT_CSS } from "@/lib/textbook/render/blocks/contentCss";
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
import { renderTextbookChunk } from "@/lib/textbook/render/server";

const RUN = process.env.TEXTBOOK_ANSWER_LAYOUT_RUN_DIR ?? "";
const run =
  process.env.TEXTBOOK_PDF_TEST === "1" &&
  !!RUN &&
  existsSync(path.join(RUN, "exchange.private.json")) &&
  existsSync(path.join(RUN, "failure.json"));
const OUT =
  process.env.TEXTBOOK_RECOVERY_EVIDENCE_DIR ??
  path.join(os.tmpdir(), "textbook-answer-layout");
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const sha256 = (bytes: Uint8Array | string) =>
  createHash("sha256").update(bytes).digest("hex");

type Problem = Extract<RenderBlock, { kind: "problem" }>;
interface Probe {
  sheet: string;
  widthMm: number;
  heightMm: number;
  /** Head, prose and figures: everything of the question. */
  questionMm: number;
  questionWidthMm: number;
  figure: { widthMm: number; heightMm: number } | null;
  answerMm: number | null;
  answerWidthMm: number | null;
  answerFormulas: number;
  /** Bottom of the last formula of the answer, from the top of the block. */
  lastFormulaBottomMm: number | null;
  formulas: number;
  overflowMm: number;
}

describe.skipIf(!run)("the answer variant of a real automatic book", () => {
  let browser: Awaited<ReturnType<typeof launchExportBrowser>>;
  let css: { font: string; katex: string };
  beforeAll(async () => {
    const bundle = await loadTextbookLocalBundle();
    css = {
      font: inlineBundleCss(bundle.fontCss, bundle.resources),
      katex: inlineBundleCss(bundle.katexCss, bundle.resources),
    };
    browser = await launchExportBrowser();
    mkdirSync(OUT, { recursive: true });
  }, 120_000);
  afterAll(async () => {
    await browser?.close();
  }, 60_000);

  function load() {
    const exchangeBytes = readFileSync(path.join(RUN, "exchange.private.json"));
    const exchange = textbookExchangeSchema.parse(
      JSON.parse(exchangeBytes.toString("utf8")),
    );
    const failure = JSON.parse(
      readFileSync(path.join(RUN, "failure.json"), "utf8"),
    ) as {
      rendererGitCommit: string;
      details: Array<{
        code: string;
        path: string[];
        physicalPageIndex: number;
      }>;
    };
    const files = readdirSync(path.join(RUN, "assets"));
    const bytesOf = (assetId: string) => {
      const asset = exchange.assets.find((a) => a.assetId === assetId);
      const file = asset && files.find((f) => f.startsWith(asset.sha256));
      if (!asset || !file) throw new Error(`Missing private asset ${assetId}`);
      return {
        asset,
        bytes: readFileSync(path.join(RUN, "assets", file)),
      };
    };
    const resources = {
      assetUrl: (assetId: string) => {
        const { asset, bytes } = bytesOf(assetId);
        return `data:${asset.mimeType};base64,${bytes.toString("base64")}`;
      },
      qrDataUrl: () => PNG,
    };
    const [, unitKey, , sectionKey, , blockId] = failure.details[0].path;
    const locate = (variant: "student" | "answers") => {
      const model = createTextbookRenderModel(exchange, variant);
      const index = model.sections.findIndex(
        (s) => s.unitKey === unitKey && s.sectionKey === sectionKey,
      );
      const section = model.sections[index];
      const block = section.blocks.find((b) => b.id === blockId) as Problem;
      return { model, index, section, block };
    };
    return {
      exchange,
      exchangeSha256: sha256(exchangeBytes),
      failure,
      blockId,
      resources,
      readAsset: async (assetId: string) =>
        new Uint8Array(bytesOf(assetId).bytes),
      locate,
    };
  }

  async function measure(
    sheets: Array<{ name: string; widthMm: number; block: RenderBlock }>,
    resources: ReturnType<typeof load>["resources"],
  ): Promise<Probe[]> {
    const html = textbookHtmlDocument(
      "answer-layout",
      sheets
        .map(
          (sheet, i) =>
            // The shell a recovered lesson page gives its blocks, tall enough not to clip.
            `<article class="tb-paper tb-recovered tb-stage-basic tb-page-even" data-textbook-page="${i + 1}" data-sheet="${sheet.name}" style="height:auto;min-height:297mm"><div class="tb-block" style="left:13mm;top:20mm;width:${sheet.widthMm}mm;position:absolute;display:block"><div class="tb-block-inner" data-probe style="width:${sheet.widthMm}mm;height:auto">${renderBlockHtml(sheet.block, resources)}</div></div></article>`,
        )
        .join(""),
      css.font,
      css.katex,
    ).replace(
      "</style></head>",
      `</style><style>${TEXTBOOK_CONTENT_CSS}</style></head>`,
    );
    const page = await browser.newPage();
    await page.evaluate("globalThis.__name = (fn) => fn");
    await page.setContent(html, { waitUntil: "load" });
    const measured = (await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images).map((i) => i.decode()));
      const mm = 25.4 / 96;
      return Array.from(
        document.querySelectorAll<HTMLElement>("[data-sheet]"),
      ).map((sheet) => {
        const probe = sheet.querySelector<HTMLElement>("[data-probe]")!;
        const top = probe.getBoundingClientRect().top;
        const rect = (el: Element | null) => el?.getBoundingClientRect();
        const head = rect(probe.querySelector(".tb-problem-head"));
        const question = rect(probe.querySelector(".tb-problem-question"));
        const image = rect(probe.querySelector(".tb-problem-figure img"));
        const answer = probe.querySelector(".tb-answer");
        const answerBox = rect(answer);
        const formulas = answer
          ? Array.from(answer.querySelectorAll(".katex"))
          : [];
        const last = rect(formulas[formulas.length - 1] ?? null);
        return {
          sheet: sheet.dataset.sheet,
          widthMm: probe.getBoundingClientRect().width * mm,
          heightMm: probe.getBoundingClientRect().height * mm,
          questionMm: head && question ? (question.bottom - head.top) * mm : 0,
          questionWidthMm: question ? question.width * mm : 0,
          figure: image
            ? { widthMm: image.width * mm, heightMm: image.height * mm }
            : null,
          answerMm: answerBox ? answerBox.height * mm : null,
          answerWidthMm: answerBox ? answerBox.width * mm : null,
          answerFormulas: formulas.length,
          lastFormulaBottomMm: last ? (last.bottom - top) * mm : null,
          formulas: probe.querySelectorAll(".katex").length,
          overflowMm: (probe.scrollHeight - probe.clientHeight) * mm,
        };
      });
    })) as Probe[];
    await page.close();
    return measured;
  }

  it("reproduces the overflow in one column and fits with the answer beside the question", async () => {
    const data = load();
    expect(data.failure.details[0].code).toBe("BLOCK_OVERFLOW");
    const student = data.locate("student");
    const answers = data.locate("answers");

    // The model: only the answer variant changes, and only the layout it prints with.
    expect(student.block.layout.columnSpan).toBe(1);
    expect(student.block.answerPlacement).toBeUndefined();
    expect(student.block.answer).toBeUndefined();
    expect(answers.block.layout.columnSpan).toBe(2);
    expect(answers.block.answerPlacement).toBe("beside");
    expect(answers.block.content).toBe(student.block.content);
    expect(answers.block.figures).toEqual(student.block.figures);
    const item = data.exchange.items.find(
      (i) => i.itemId === student.block.itemId,
    )!;
    expect(item.layout.columnSpan).toBe(1);
    const snapshot = data.exchange.snapshots.find(
      (s) => s.snapshotId === item.snapshotId,
    )!;
    expect(answers.block.answer).toBe(snapshot.payload.answer);
    expect(answers.block.solution).toBe(snapshot.payload.solution);

    const narrow = blockWidthMm(student.model.config, student.block);
    const wide = blockWidthMm(answers.model.config, answers.block);
    const heading = answers.section.blocks.find((b) => b.kind === "heading")!;
    /** The answer variant as it was printed when it failed: stacked in one column. */
    const stacked = {
      ...answers.block,
      layout: student.block.layout,
      answerPlacement: undefined,
    } as RenderBlock;
    const [inStudent, failed, fullWidth, beside, head] = await measure(
      [
        { name: "student", widthMm: narrow, block: student.block },
        { name: "answers-stacked-column", widthMm: narrow, block: stacked },
        {
          name: "answers-stacked-full-width",
          widthMm: wide,
          block: {
            ...stacked,
            layout: { ...student.block.layout, columnSpan: 2 },
          } as RenderBlock,
        },
        { name: "answers-beside", widthMm: wide, block: answers.block },
        {
          name: "heading",
          widthMm: blockWidthMm(answers.model.config, heading),
          block: heading,
        },
      ],
      data.resources,
    );
    // What a continued page has left under its repeated heading.
    const availableMm =
      A4.bodyBottomMm -
      (textbookBodyTopMm(answers.section, answers.block) +
        head.heightMm +
        A4.gapMm);
    writeFileSync(
      path.join(OUT, "answer-layout-natural.json"),
      JSON.stringify(
        {
          exchangeSha256: data.exchangeSha256,
          failedAtRendererCommit: data.failure.rendererGitCommit,
          blockId: data.blockId,
          sectionKey: answers.section.sectionKey,
          columnWidthMm: narrow,
          fullWidthMm: wide,
          bodyTopMm: textbookBodyTopMm(answers.section, answers.block),
          bodyBottomMm: A4.bodyBottomMm,
          headingMm: head.heightMm,
          gapMm: A4.gapMm,
          availableOnContinuedPageMm: availableMm,
          probes: [inStudent, failed, fullWidth, beside],
        },
        null,
        2,
      ),
    );

    // 1. The failure, at the width it failed at.
    expect(narrow).toBe(86);
    expect(failed.heightMm).toBeGreaterThan(availableMm);
    expect(failed.heightMm).toBeLessThan(
      A4.bodyBottomMm - textbookBodyTopMm(answers.section, answers.block),
    );
    // 2. Beside: the question is the student's question — same column, same figure, same
    //    height — and the whole answer stands next to it at the same column width.
    expect(beside.widthMm).toBeCloseTo(wide, 1);
    expect(beside.questionWidthMm).toBeCloseTo(failed.questionWidthMm, 1);
    expect(beside.questionMm).toBeCloseTo(inStudent.questionMm, 1);
    expect(beside.figure).toEqual(inStudent.figure);
    expect(beside.answerWidthMm).toBeCloseTo(failed.answerWidthMm!, 1);
    expect(beside.answerMm).toBeCloseTo(failed.answerMm!, 0);
    expect(beside.formulas).toBe(failed.formulas);
    expect(beside.answerFormulas).toBe(failed.answerFormulas);
    expect(beside.answerFormulas).toBeGreaterThan(0);
    // 3. It fits a continued page with room to spare, and is not taller than the stacked block.
    expect(beside.heightMm).toBeLessThan(availableMm - 10);
    expect(beside.heightMm).toBeLessThan(failed.heightMm);
    expect(beside.heightMm).toBeGreaterThanOrEqual(
      Math.max(beside.questionMm, beside.answerMm!) - 0.05,
    );
    // The last formula of the solution is inside the block, and nothing spills out of it.
    expect(beside.lastFormulaBottomMm!).toBeLessThanOrEqual(
      beside.heightMm + 0.05,
    );
    expect(beside.overflowMm).toBeLessThan(0.05);
    // The student block is the size it was printed at when the answers failed.
    const printed = readFileSync(
      path.join(RUN, "student-chunk-14.html"),
      "utf8",
    );
    const placed = new RegExp(
      `data-block-id="${data.blockId}"[^>]*style="([^"]*)"`,
    ).exec(printed)![1];
    expect(placed).toContain(`width:${narrow}mm`);
    const printedHeight = Number(/height:([\d.]+)mm/.exec(placed)![1]);
    expect(Math.abs(printedHeight - inStudent.heightMm)).toBeLessThan(0.02);
  }, 240_000);

  it("fits every problem of the failed section, and never makes one taller", async () => {
    const data = load();
    const student = data.locate("student");
    const answers = data.locate("answers");
    const narrow = blockWidthMm(student.model.config, student.block);
    const wide = blockWidthMm(answers.model.config, answers.block);
    const heading = answers.section.blocks.find((b) => b.kind === "heading")!;
    const studentProblems = student.section.blocks.filter(
      (b): b is Problem => b.kind === "problem",
    );
    const answerProblems = answers.section.blocks.filter(
      (b): b is Problem => b.kind === "problem",
    );
    expect(answerProblems.map((b) => b.id)).toEqual(
      studentProblems.map((b) => b.id),
    );
    const measured = await measure(
      [
        {
          name: "heading",
          widthMm: blockWidthMm(answers.model.config, heading),
          block: heading,
        },
        ...answerProblems.flatMap((block, i) => {
          const stacked = {
            ...block,
            layout: studentProblems[i].layout,
            answerPlacement: undefined,
          } as RenderBlock;
          return [
            {
              name: `${block.id}|student`,
              widthMm: narrow,
              block: studentProblems[i],
            },
            {
              name: `${block.id}|stacked-column`,
              widthMm: narrow,
              block: stacked,
            },
            {
              name: `${block.id}|stacked-full-width`,
              widthMm: wide,
              block: {
                ...stacked,
                layout: { ...studentProblems[i].layout, columnSpan: 2 },
              } as RenderBlock,
            },
            { name: `${block.id}|beside`, widthMm: wide, block },
          ];
        }),
      ],
      data.resources,
    );
    const headingMm = measured[0].heightMm;
    const availableMm =
      A4.bodyBottomMm -
      (textbookBodyTopMm(answers.section, answers.block) +
        headingMm +
        A4.gapMm);
    const of = (id: string, layout: string) =>
      measured.find((m) => m.sheet === `${id}|${layout}`)!;
    const rows = answerProblems.map((block) => {
      const [inStudent, column, fullWidth, beside] = [
        "student",
        "stacked-column",
        "stacked-full-width",
        "beside",
      ].map((layout) => of(block.id, layout));
      return {
        blockId: block.id,
        placement: block.answerPlacement ?? null,
        studentMm: inStudent.heightMm,
        stackedColumnMm: column.heightMm,
        stackedFullWidthMm: fullWidth.heightMm,
        besideMm: beside.heightMm,
        questionMm: beside.questionMm,
        studentQuestionMm: inStudent.questionMm,
        answerMm: beside.answerMm,
        figure: beside.figure,
        studentFigure: inStudent.figure,
        formulas: [column.formulas, beside.formulas],
        overflowMm: beside.overflowMm,
      };
    });
    // The coordinator's own natural measurement of the same section, when it is in the folder.
    const theirs = path.join(RUN, "failed-section-natural-geometry.json");
    const cross = existsSync(theirs)
      ? (
          JSON.parse(readFileSync(theirs, "utf8")) as {
            results: Array<{
              variant: string;
              blocks: Array<{ blockId: string; heightMm: number }>;
            }>;
          }
        ).results
      : [];
    writeFileSync(
      path.join(OUT, "answer-layout-section.json"),
      JSON.stringify(
        { headingMm, availableOnContinuedPageMm: availableMm, rows },
        null,
        2,
      ),
    );
    expect(rows).toHaveLength(5);
    // Stacked in one column, three of the five do not fit a continued page.
    expect(
      rows.filter((r) => r.stackedColumnMm > availableMm).map((r) => r.blockId),
    ).toContain(data.blockId);
    for (const row of rows) {
      expect(row.placement, row.blockId).toBe("beside");
      // Never taller than the stacked block, and it fits.
      expect(row.besideMm, row.blockId).toBeLessThan(row.stackedColumnMm);
      expect(row.besideMm, row.blockId).toBeLessThan(availableMm);
      // The question is the student's question.
      expect(Math.abs(row.questionMm - row.studentQuestionMm)).toBeLessThan(
        0.05,
      );
      expect(row.figure).toEqual(row.studentFigure);
      expect(row.formulas[1]).toBe(row.formulas[0]);
      expect(row.overflowMm).toBeLessThan(0.05);
    }
    for (const result of cross)
      for (const block of result.blocks) {
        const mine = rows.find((r) => r.blockId === block.blockId);
        if (!mine) continue;
        expect(
          Math.abs(
            block.heightMm -
              (result.variant === "student"
                ? mine.studentMm
                : mine.stackedColumnMm),
          ),
          `${result.variant} ${block.blockId}`,
        ).toBeLessThan(0.05);
      }
  }, 240_000);

  it("prints the failed section's answers through the real chunk renderer", async () => {
    const data = load();
    const student = data.locate("student");
    const printed = readFileSync(
      path.join(RUN, "student-chunk-14.html"),
      "utf8",
    );
    const firstPage = Number(/data-textbook-page="(\d+)"/.exec(printed)![1]);
    const input = {
      exchange: data.exchange,
      officialOrigin: "https://answer-layout-qa.invalid",
      readAsset: data.readAsset,
      sectionIndices: [student.index],
      firstPhysicalPageIndex: firstPage,
      browser,
      mode: "draft" as const,
    };
    const before = JSON.stringify(data.exchange);
    const studentChunk = await renderTextbookChunk({
      ...input,
      variant: "student",
    });
    // Without student page references: this is the pagination that failed with BLOCK_OVERFLOW.
    const answerChunk = await renderTextbookChunk({
      ...input,
      variant: "answers",
    });
    expect(JSON.stringify(data.exchange)).toBe(before);

    // The student chunk: every block where the failing run printed it.
    const placements = (html: string) =>
      [
        ...html.matchAll(
          /<div class="tb-block[^"]*"[^>]*data-block-id="([^"]+)"[^>]*style="([^"]*)"/g,
        ),
      ].map((m) => `${m[1]} ${m[2]}`);
    expect(placements(studentChunk.html)).toEqual(placements(printed));
    expect(studentChunk.pages.map((p) => p.physicalPageIndex)).toEqual(
      [...printed.matchAll(/data-textbook-page="(\d+)"/g)].map((m) =>
        Number(m[1]),
      ),
    );
    // (The stylesheet names the class; no answer element may be in the page.)
    expect(studentChunk.html).not.toContain('<section class="tb-answer"');
    expect(studentChunk.html).not.toContain("data-answer-placement");

    // The answers: paginated on their own, every problem placed once across the full width.
    const problems = student.section.blocks.filter(
      (b): b is Problem => b.kind === "problem",
    );
    const placed = answerChunk.pages.flatMap((page) =>
      page.blocks
        .filter((b) => problems.some((p) => p.id === b.blockId))
        .map((b) => ({ ...b, page: page.physicalPageIndex })),
    );
    expect(placed.map((b) => b.blockId)).toEqual(problems.map((p) => p.id));
    const bodyMm = A4.bodyBottomMm - textbookBodyTopMm(student.section);
    for (const block of placed) {
      expect(block.widthMm).toBe(179);
      expect(block.yMm + block.heightMm).toBeLessThanOrEqual(
        A4.bodyBottomMm + 0.05,
      );
      expect(block.heightMm).toBeLessThan(bodyMm);
    }
    expect(
      (answerChunk.html.match(/data-answer-placement="beside"/g) ?? []).length,
    ).toBe(problems.length);
    const failed = placed.find((b) => b.blockId === data.blockId)!;
    writeFileSync(
      path.join(OUT, "answer-layout-chunk.json"),
      JSON.stringify(
        {
          sectionKey: student.section.sectionKey,
          firstPhysicalPageIndex: firstPage,
          studentPages: studentChunk.pages.length,
          answerPages: answerChunk.pages.length,
          studentPdfSha256: sha256(studentChunk.pdf),
          answersPdfSha256: sha256(answerChunk.pdf),
          failedBlock: failed,
          problems: placed,
        },
        null,
        2,
      ),
    );
    writeFileSync(path.join(OUT, "answer-layout-answers.pdf"), answerChunk.pdf);
  }, 300_000);

  it("names the student page of every question when the student pages are given", async () => {
    // The publish path: the answers are rendered with the verified student pages, which supply
    // the "문제 N쪽" labels. The student pages must be verified against the student projection —
    // the answer projection is wider by design.
    const data = load();
    const student = data.locate("student");
    const printed = readFileSync(
      path.join(RUN, "student-chunk-14.html"),
      "utf8",
    );
    const input = {
      exchange: data.exchange,
      officialOrigin: "https://answer-layout-qa.invalid",
      readAsset: data.readAsset,
      sectionIndices: [student.index],
      firstPhysicalPageIndex: Number(
        /data-textbook-page="(\d+)"/.exec(printed)![1],
      ),
      browser,
      mode: "draft" as const,
    };
    const studentChunk = await renderTextbookChunk({
      ...input,
      variant: "student",
    });
    const answerChunk = await renderTextbookChunk({
      ...input,
      variant: "answers",
      studentPages: studentChunk.pages,
    });
    const studentPageOf = new Map(
      studentChunk.pageMap.map((p) => [p.itemId, p.printedPageLabel]),
    );
    const problems = student.section.blocks.filter(
      (b): b is Problem => b.kind === "problem",
    );
    for (const problem of problems) {
      const at = answerChunk.html.indexOf(`data-block-id="${problem.id}"`);
      const label = /<h4>정답 · 문제 (\d+)쪽<\/h4>/.exec(
        answerChunk.html.slice(at),
      )![1];
      expect(label).toBe(studentPageOf.get(problem.itemId));
    }
    // The answer book's own page map is not the student's.
    expect(answerChunk.pageMap.map((p) => p.itemId)).toEqual(
      studentChunk.pageMap.map((p) => p.itemId),
    );
    expect(answerChunk.pages.length).toBeGreaterThan(studentChunk.pages.length);
  }, 300_000);
});
