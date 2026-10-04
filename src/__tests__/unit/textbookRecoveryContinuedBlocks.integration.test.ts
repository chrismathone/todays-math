// @vitest-environment node
/**
 * Real Chromium geometry of the continuation marks.
 *
 *   TEXTBOOK_PDF_TEST=1 npx vitest run src/__tests__/unit/textbookRecoveryContinuedBlocks.integration.test.ts
 *
 * A continued bank memory block prints its lesson title and "계속" in the bar it reserves. The
 * bar must keep the height of an empty one in all three phases, however long the title is, and
 * the rows below it must not move. All text here is synthetic.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { TextbookSemanticRow } from "@/contracts/textbookSemantic.contract";
import { launchExportBrowser } from "@/lib/export/pdfServer";
import { TEXTBOOK_CONTENT_CSS } from "@/lib/textbook/render/blocks/contentCss";
import type { RecallPhase } from "@/lib/textbook/render/blocks/recall";
import {
  inlineBundleCss,
  loadTextbookLocalBundle,
} from "@/lib/textbook/render/bundle.server";
import {
  renderBlockHtml,
  textbookHtmlDocument,
} from "@/lib/textbook/render/html";
import type { RenderBlock } from "@/lib/textbook/render/model";

const run = process.env.TEXTBOOK_PDF_TEST === "1";
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const resources = { assetUrl: () => PNG, qrDataUrl: () => PNG };
const PHASES: RecallPhase[] = ["study", "keywords", "sentences"];
const ACTIVITY = {
  study: "conceptStudy",
  keywords: "clozeRecall",
  sentences: "sentenceRecall",
} as const;
const WIDTH_MM = 178;
const LONG_TITLE =
  "세 자리 수의 덧셈과 뺄셈을 여러 가지 방법으로 계산하고 그 과정을 설명하며 어림한 값과 견주어 보는 긴 이름의 소단원 그리고 그 뒤에 이어지는 더 긴 설명";
const rows = (group: string): TextbookSemanticRow[] => [
  {
    rowKey: `${group}.definition`,
    label: "받아올림",
    rawText: "같은 자리의 합이 {열}이 되면 윗자리로 올린다.",
    textFormat: "bank-blank",
  },
  {
    rowKey: `${group}.example`,
    label: "예",
    rawText: "$158 + 267$ 은 {일의 자리}부터 차례로 더한다.",
    textFormat: "bank-blank",
  },
];
/** One lesson: its first memory block, a continued one, and a continued one with a long title. */
const BLOCKS = [
  { key: "first", continuation: false, title: "세 자리 수의 덧셈" },
  { key: "continued", continuation: true, title: "세 자리 수의 덧셈" },
  { key: "long", continuation: true, title: LONG_TITLE },
] as const;
const memory = (phase: RecallPhase, at: number): RenderBlock =>
  ({
    id: `${phase}.${BLOCKS[at].key}`,
    sourceBlockId: `${phase}.${BLOCKS[at].key}`,
    unitKey: "U09",
    sectionKey: `memory-${phase}`,
    kind: "recall",
    phase,
    pieces: [],
    answersVisible: false,
    continuation: BLOCKS[at].continuation,
    memoryContinuationTitle: BLOCKS[at].title,
    repetitionChecks: phase === "study",
    semantic: {
      activity: ACTIVITY[phase],
      node: {
        kind: "rows",
        groupKey: `concept-${BLOCKS[at].key}.memory-0`,
        rows: rows(BLOCKS[at].key),
      },
    },
  }) as RenderBlock;
const conceptPart = (continuation: boolean): RenderBlock =>
  ({
    id: `concept.${continuation ? "part-1" : "part-0"}`,
    sourceBlockId: "concept",
    unitKey: "U09",
    sectionKey: "lesson",
    kind: "concept",
    conceptKey: "concept-5eed0c41-0000-4000-8000-000000000042",
    title: "세 자리 수의 덧셈",
    ordinal: 3,
    continuation,
    qr: null,
    body: {
      goal: "",
      prerequisites: [],
      definition: continuation ? "이어지는 쪽의 설명" : "받아올림이 있는 덧셈",
      conditions: null,
      examples: ["$158 + 267 = 425$"],
      counterexamples: [],
      misconceptions: [],
      explainPrompt: null,
    },
  }) as RenderBlock;

type Span = [number, number];
type Box = [number, number, number, number];
interface Measured {
  sheet: string;
  memory: Array<{
    blockId: string;
    bar: Span;
    barBox: Box;
    mark: Box | null;
    small: Box | null;
    smallText: string;
    titleClipped: boolean;
    titleFontPt: number;
    rounds: Box | null;
    rows: Span[];
  }>;
  concepts: Array<{
    blockId: string;
    title: Box | null;
    mark: Box | null;
    markText: string;
    markFontPt: number;
  }>;
}

describe.skipIf(!run)("continuation marks in real Chromium", () => {
  let browser: Awaited<ReturnType<typeof launchExportBrowser>>;
  let css: { font: string; katex: string };
  beforeAll(async () => {
    const bundle = await loadTextbookLocalBundle();
    css = {
      font: inlineBundleCss(bundle.fontCss, bundle.resources),
      katex: inlineBundleCss(bundle.katexCss, bundle.resources),
    };
    browser = await launchExportBrowser();
  }, 120_000);
  afterAll(async () => {
    await browser?.close();
  }, 60_000);

  const flow = (block: RenderBlock) =>
    `<div class="tb-block-inner" data-block-id="${block.id}" style="width:${WIDTH_MM}mm;height:auto;margin-bottom:4mm">${renderBlockHtml(block, resources)}</div>`;
  const paper = (index: number, name: string, inner: string) =>
    `<article class="tb-paper tb-stage-recall tb-page-even" data-textbook-page="${index}" data-sheet="${name}"><div class="tb-block" style="left:18mm;top:20mm;width:${WIDTH_MM}mm;position:absolute;display:block">${inner}</div></article>`;

  async function measure(): Promise<Measured[]> {
    const html = textbookHtmlDocument(
      "continued-blocks",
      [
        ...PHASES.map((phase, i) =>
          paper(
            i + 1,
            phase,
            BLOCKS.map((_, at) => flow(memory(phase, at))).join(""),
          ),
        ),
        paper(
          4,
          "concepts",
          flow(conceptPart(false)) + flow(conceptPart(true)),
        ),
      ].join(""),
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
      const mm = 25.4 / 96;
      return Array.from(
        document.querySelectorAll<HTMLElement>("[data-textbook-page]"),
      ).map((sheet) => {
        const origin = sheet.getBoundingClientRect();
        const box = (el: Element | null) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return [
            (r.left - origin.left) * mm,
            (r.top - origin.top) * mm,
            (r.right - origin.left) * mm,
            (r.bottom - origin.top) * mm,
          ];
        };
        const pt = (el: Element | null) =>
          el ? (parseFloat(getComputedStyle(el).fontSize) * 72) / 96 : 0;
        return {
          sheet: sheet.dataset.sheet,
          memory: Array.from(
            sheet.querySelectorAll<HTMLElement>("[data-block-id]"),
          )
            .filter((block) => block.querySelector(".tb-memory"))
            .map((block) => {
              const bar = block.querySelector(".tb-memory-title")!;
              const barBox = box(bar)!;
              const title = block.querySelector<HTMLElement>(
                ".tb-memory-continuation-title",
              );
              const small = block.querySelector(
                ".tb-memory-continuation small",
              );
              return {
                blockId: block.dataset.blockId,
                bar: [barBox[1], barBox[3]],
                barBox,
                mark: box(block.querySelector(".tb-memory-continuation")),
                small: box(small),
                smallText: small?.textContent ?? "",
                titleClipped: !!title && title.scrollWidth > title.clientWidth,
                titleFontPt: pt(title),
                rounds: box(block.querySelector(".tb-memory-rounds")),
                rows: Array.from(block.querySelectorAll(".tb-memory-row")).map(
                  (row) => {
                    const b = box(row)!;
                    return [b[1], b[3]];
                  },
                ),
              };
            }),
          concepts: Array.from(
            sheet.querySelectorAll<HTMLElement>("[data-block-id]"),
          )
            .filter((block) => block.querySelector(".tb-concept"))
            .map((block) => {
              const mark = block.querySelector(".tb-concept-continuation");
              return {
                blockId: block.dataset.blockId,
                title: box(block.querySelector(".tb-concept-title")),
                mark: box(mark),
                markText: mark?.textContent ?? "",
                markFontPt: pt(mark),
              };
            }),
        };
      });
    })) as Measured[];
    await page.close();
    return measured;
  }

  it("keeps the continued bar at the empty bar's height in all three phases", async () => {
    const sheets = await measure();
    const study = sheets.find((s) => s.sheet === "study")!.memory;
    expect(study.map((b) => b.blockId)).toEqual([
      "study.first",
      "study.continued",
      "study.long",
    ]);
    for (const phase of PHASES) {
      const blocks = sheets.find((s) => s.sheet === phase)!.memory;
      const [first, continued, long] = blocks;
      const empty = first.bar[1] - first.bar[0];
      // The block that starts the lesson has no mark; its bar is the 7mm it reserves.
      expect(first.mark).toBeNull();
      expect(empty).toBeGreaterThan(6.9);
      expect(empty).toBeLessThan(7.1);
      for (const block of [continued, long]) {
        expect(block.bar[1] - block.bar[0]).toBeCloseTo(empty, 1);
        // The mark is printed, inside its bar, with 계속 whole and to the left of the rounds.
        const [mark, small, bar] = [block.mark!, block.small!, block.barBox];
        expect(block.smallText).toBe("계속");
        expect(block.titleFontPt).toBeCloseTo(8, 1);
        expect(mark[3] - mark[1]).toBeGreaterThan(2);
        expect(mark[1]).toBeGreaterThanOrEqual(bar[1] - 0.05);
        expect(mark[3]).toBeLessThanOrEqual(bar[3] + 0.05);
        expect(small[2] - small[0]).toBeGreaterThan(3);
        expect(small[0]).toBeGreaterThanOrEqual(bar[0] - 0.05);
        expect(small[2]).toBeLessThanOrEqual(
          (block.rounds ? block.rounds[0] : bar[2]) + 0.05,
        );
        expect(!!block.rounds).toBe(phase === "study");
      }
      // A title too long for the bar is cut on its one line instead of raising the bar.
      expect(continued.titleClipped).toBe(false);
      expect(long.titleClipped).toBe(true);
      // Bars and rows sit where the study sheet has them.
      blocks.forEach((block, at) => {
        expect(Math.abs(block.bar[0] - study[at].bar[0])).toBeLessThan(0.05);
        expect(Math.abs(block.bar[1] - study[at].bar[1])).toBeLessThan(0.05);
        expect(block.rows).toHaveLength(2);
        block.rows.forEach((row, i) => {
          expect(Math.abs(row[0] - study[at].rows[i][0])).toBeLessThan(0.05);
          expect(Math.abs(row[1] - study[at].rows[i][1])).toBeLessThan(0.05);
        });
      });
    }
  }, 120_000);

  it("prints a continued concept part's name as a small line in place of the title", async () => {
    const [first, continued] = (await measure()).find(
      (s) => s.sheet === "concepts",
    )!.concepts;
    expect(first.mark).toBeNull();
    expect(first.title![3] - first.title![1]).toBeGreaterThan(5);
    expect(continued.title).toBeNull();
    expect(continued.markText).toBe("세 자리 수의 덧셈계속");
    expect(continued.markFontPt).toBeCloseTo(7.5, 1);
    const height = continued.mark![3] - continued.mark![1];
    expect(height).toBeGreaterThan(2.5);
    expect(height).toBeLessThan(first.title![3] - first.title![1]);
  }, 120_000);
});
