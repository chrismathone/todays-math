// @vitest-environment node
/**
 * Real Chromium geometry for the P3·P4·P5 content renderers — not mocked boxes.
 *
 *   TEXTBOOK_PDF_TEST=1 npx vitest run src/__tests__/unit/textbookRecoveryContentRender.integration.test.ts
 *
 * The page is printed with the production fonts and stylesheets (content CSS after the editorial
 * CSS), measured in the DOM, and the PDF is judged by the independent verifier
 * `scripts/qa/textbook/recovery/geometry.py` (needs Python with PyMuPDF). Evidence is written to
 * TEXTBOOK_RECOVERY_EVIDENCE_DIR, or the system temp directory — never into the repository.
 * All manuscript text here is synthetic.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { TextbookSemanticRow } from "@/contracts/textbookSemantic.contract";
import { launchExportBrowser } from "@/lib/export/pdfServer";
import { TEXTBOOK_CONTENT_CSS } from "@/lib/textbook/render/blocks/contentCss";
import {
  commonRecallRowHeights,
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
import type { RenderBlock } from "@/lib/textbook/render/model";

const run = process.env.TEXTBOOK_PDF_TEST === "1";
const OUT =
  process.env.TEXTBOOK_RECOVERY_EVIDENCE_DIR ??
  path.join(os.tmpdir(), "textbook-recovery-content-render");
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const resources = { assetUrl: () => PNG, qrDataUrl: () => PNG };
const PHASES: RecallPhase[] = ["study", "keywords", "sentences"];
const ACTIVITY = {
  study: "conceptStudy",
  keywords: "clozeRecall",
  sentences: "sentenceRecall",
} as const;
const BODY_WIDTH_MM = 178;
const COLUMN_WIDTH_MM = 85.5;

const row = (
  concept: string,
  index: number,
  label: string,
  rawText: string,
): TextbookSemanticRow => ({
  rowKey: `U01.${concept}.r${index}`,
  label,
  rawText,
  textFormat: "v15-tex",
});
/** Four concepts of three rows: fractions, a wrapping row, and rows without keywords. */
const CONCEPTS = [
  {
    conceptId: "C01",
    title: "두 분수의 합",
    rows: [
      row(
        "C01",
        1,
        "뜻",
        "두 수 {{[[\\frac{a}{b}]]}}와 [[\\frac{c}{d}]]의 합은 {{통분}}하여 구한다.",
      ),
      row(
        "C01",
        2,
        "구별",
        "짝수는 {{둘로 나누어떨어지는 수}}이고 홀수는 그렇지 않다.",
      ),
      row(
        "C01",
        3,
        "예",
        "[[\\frac{18}{6}=3]]은 자연수이고 [[-\\frac{7}{4}]]는 자연수가 아니다.",
      ),
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
        "어떤 수를 여러 번 더할 때에는 {{같은 수의 묶음}}으로 생각하여 곱셈으로 바꾸어 계산하고, 남는 수는 따로 더한 다음 처음의 식과 값이 같은지 {{다시 확인}}한다.",
      ),
      row(
        "C02",
        2,
        "판단",
        "[[1.25]]는 {{끝이 있는 소수}}이고 [[0.272727\\ldots]]는 그렇지 않다.",
      ),
      row(
        "C02",
        3,
        "연결",
        "분수를 소수로 바꿀 때에는 {{분자}}를 {{분모}}로 나눈다.",
      ),
    ],
  },
  {
    conceptId: "C03",
    title: "되풀이되는 수",
    rows: [
      row("C03", 1, "뜻", "같은 숫자 배열이 {{끝없이 되풀이되는 수}}이다."),
      row(
        "C03",
        2,
        "묶음",
        "되풀이되는 배열 가운데 {{가장 짧은 한 묶음}}을 찾는다.",
      ),
      row(
        "C03",
        3,
        "표현",
        "[[0.4313131\\ldots=0.4\\dot{3}\\dot{1}]]의 묶음은 {{[[31]]}}이다.",
      ),
    ],
  },
  {
    conceptId: "C04",
    title: "자리의 숫자",
    rows: [
      row(
        "C04",
        1,
        "방법",
        "자리 번호를 {{묶음의 길이}}로 나누고 {{나머지}}를 본다.",
      ),
      row(
        "C04",
        2,
        "나머지가 영",
        "나머지가 영이면 묶음의 {{마지막 숫자}}를 고른다.",
      ),
      row(
        "C04",
        3,
        "앞부분",
        "되풀이되지 않는 자릿수를 {{먼저 뺀 뒤}} 같은 방법을 쓴다.",
      ),
    ],
  },
];

function memory(
  phase: RecallPhase,
  index: number,
  rowHeightsMm?: Record<string, number>,
): RenderBlock {
  const concept = CONCEPTS[index];
  return {
    id: `${phase}.${concept.conceptId}`,
    sourceBlockId: `${phase}.${concept.conceptId}`,
    unitKey: "U01",
    sectionKey: `memory-${phase}`,
    kind: "recall",
    phase,
    continuation: index > 0,
    answersVisible: false,
    memoryPhases: PHASES,
    pieces: [],
    repetitionChecks: phase === "study",
    semantic: {
      activity: ACTIVITY[phase],
      title: "개념 정리",
      node: { kind: "concept", ...concept },
    },
    ...(rowHeightsMm ? { rowHeightsMm } : {}),
  } as RenderBlock;
}
const layout = {
  columnSpan: 1 as const,
  minWorkLines: 2,
  preferredWorkLines: 3,
  maxWorkLines: 10,
  keepTogether: true,
};
const problemBase = {
  id: "p",
  sourceBlockId: "p",
  unitKey: "U01",
  sectionKey: "problems",
  kind: "problem" as const,
  figures: [],
  questionType: "단답형",
  sourcePageLabel: null,
  qr: { id: "qr-1", url: "https://school.example.test/q/1" },
};
const activities: Array<{ widthMm: number; block: RenderBlock }> = [
  {
    widthMm: COLUMN_WIDTH_MM,
    block: {
      ...problemBase,
      itemId: "short",
      displayNumber: "0101",
      content: "두 수 $12$와 $18$의 공약수를 모두 구하시오.",
      learningStage: "basic",
      layout,
    } as RenderBlock,
  },
  {
    widthMm: BODY_WIDTH_MM,
    block: {
      ...problemBase,
      itemId: "written",
      displayNumber: "0102",
      content:
        "$\\frac{18}{6}$ 이 자연수인 까닭을 풀이 과정과 함께 설명하시오.",
      questionType: "서술형",
      learningStage: "written",
      layout: { ...layout, columnSpan: 2, preferredWorkLines: 6 },
    } as RenderBlock,
  },
  {
    widthMm: BODY_WIDTH_MM,
    block: {
      id: "error",
      sourceBlockId: "error",
      unitKey: "U01",
      sectionKey: "error",
      kind: "recall",
      phase: "sentences",
      repetitionChecks: false,
      semantic: { activity: "errorCheck", title: "오류 점검" },
      pieces: [
        { kind: "text", markdown: "1. 모든 짝수는 4의 배수이다.\n\n" },
        { kind: "blank", scope: "sentence" },
        { kind: "text", markdown: "\n\n2. $\\frac{18}{6}$ 은 자연수이다.\n\n" },
        { kind: "blank", scope: "sentence" },
      ],
    } as RenderBlock,
  },
  {
    widthMm: BODY_WIDTH_MM,
    block: {
      id: "term",
      sourceBlockId: "term",
      unitKey: "U01",
      sectionKey: "term",
      kind: "recall",
      phase: "keywords",
      repetitionChecks: false,
      semantic: { activity: "termRecall", title: "용어 암기" },
      pieces: [
        { kind: "blank", scope: "keyword" },
        { kind: "text", markdown: ": 둘로 나누어떨어지는 수\n\n" },
        { kind: "blank", scope: "keyword" },
        { kind: "text", markdown: ": 1과 자기 자신만 약수로 가지는 수" },
      ],
    } as RenderBlock,
  },
  {
    widthMm: BODY_WIDTH_MM,
    block: {
      id: "legacy",
      sourceBlockId: "legacy",
      unitKey: "U01",
      sectionKey: "legacy",
      kind: "recall",
      phase: "sentences",
      repetitionChecks: false,
      pieces: [
        { kind: "text", markdown: "**짝수**" },
        { kind: "blank", scope: "sentence" },
        { kind: "text", markdown: "짝수는 " },
        { kind: "blank", scope: "keyword" },
        { kind: "text", markdown: " 로 나누어떨어진다." },
      ],
    } as RenderBlock,
  },
];

const paper = (index: number, name: string, inner: string) =>
  `<article class="tb-paper tb-stage-recall tb-page-even" data-textbook-page="${index}" data-sheet="${name}"><div class="tb-block" style="left:18mm;top:20mm;width:${BODY_WIDTH_MM}mm;position:absolute;display:block">${inner}</div></article>`;
const flow = (widthMm: number, block: RenderBlock) =>
  `<div class="tb-block-inner" data-block-id="${block.id}" style="width:${widthMm}mm;height:auto;margin-bottom:4mm">${renderBlockHtml(block, resources)}</div>`;

interface Box {
  boxMm: [number, number, number, number];
}
interface Captured {
  sheet: string;
  physicalPageIndex: number;
  rows: Array<
    Box & {
      rowKey: string;
      conceptId: string;
      phase: string;
      bodyLeftMm: number;
    }
  >;
  writeBoxes: Array<
    Box & { id: string; written: boolean; columnWidthMm: number }
  >;
  qrs: Array<Box & { id: string }>;
  clips: Array<Box & { id: string; clipBoxMm: number[] }>;
  fonts: string[];
}

describe.skipIf(!run)("content geometry in real Chromium", () => {
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
  // Closing Chromium can take longer than the default hook limit when other suites run beside it.
  afterAll(async () => {
    await browser?.close();
  }, 60_000);

  async function print(name: string, rowHeightsMm?: Record<string, number>) {
    const body = [
      ...PHASES.map((phase, i) =>
        paper(
          i + 1,
          phase,
          CONCEPTS.map((_, c) =>
            flow(BODY_WIDTH_MM, memory(phase, c, rowHeightsMm)),
          ).join(""),
        ),
      ),
      paper(
        4,
        "problems",
        activities
          .slice(0, 3)
          .map((a) => flow(a.widthMm, a.block))
          .join(""),
      ),
      paper(
        5,
        "standalone",
        activities
          .slice(3)
          .map((a) => flow(a.widthMm, a.block))
          .join(""),
      ),
    ].join("");
    // The content stylesheet follows the editorial one, as the page shell will load it.
    const html = textbookHtmlDocument(name, body, css.font, css.katex).replace(
      "</style></head>",
      `</style><style>${TEXTBOOK_CONTENT_CSS}</style></head>`,
    );
    expect(html).toContain(TEXTBOOK_CONTENT_CSS);
    const page = await browser.newPage();
    await page.evaluate("globalThis.__name = (fn) => fn");
    await page.setContent(html, { waitUntil: "load" });
    const captured = (await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images).map((i) => i.decode()));
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
        const index = sheet.dataset.textbookPage;
        return {
          sheet: sheet.dataset.sheet,
          physicalPageIndex: Number(index),
          rows: Array.from(
            sheet.querySelectorAll<HTMLElement>("[data-row-key]"),
          )
            .filter((el) => el.classList.contains("tb-memory-row"))
            .map((el) => ({
              rowKey: el.dataset.rowKey,
              conceptId: el.dataset.conceptId,
              phase: el.dataset.phase,
              boxMm: box(el),
              bodyLeftMm: box(el.querySelector(".tb-memory-body")!)[0],
            })),
          writeBoxes: Array.from(
            sheet.querySelectorAll<HTMLElement>(".tb-work-lines,.tb-blank"),
          ).map((el, i) => ({
            id: `${index}.write${i}`,
            boxMm: box(el),
            written: !!el.closest(".tb-problem-wide"),
            columnWidthMm:
              (el.closest(".tb-problem") ?? el).getBoundingClientRect().width *
              mm,
          })),
          qrs: Array.from(sheet.querySelectorAll(".tb-qr")).map((el, i) => ({
            id: `${index}.qr${i}`,
            boxMm: box(el),
          })),
          clips: Array.from(
            sheet.querySelectorAll(".katex,.tb-memory-row,.tb-problem"),
          ).map((el, i) => ({
            id: `${index}.clip${i}`,
            boxMm: box(el),
            clipBoxMm: box(el.closest(".tb-block")!),
          })),
          fonts: Array.from(
            new Set(
              Array.from(
                sheet.querySelectorAll<HTMLElement>(
                  ".tb-memory-body,.tb-prose",
                ),
              ).map((el) => getComputedStyle(el).fontFamily),
            ),
          ),
        };
      });
    })) as Captured[];
    const pdf = await page.pdf({
      width: "210mm",
      height: "297mm",
      printBackground: true,
    });
    await page.close();
    const pdfPath = path.join(OUT, `${name}.pdf`);
    writeFileSync(pdfPath, pdf);
    writeFileSync(path.join(OUT, `${name}.html`), html);
    return { captured, pdfPath, pdf, html };
  }

  /** The repository's independent verifier decides; this test only supplies the witness. */
  function verify(
    name: string,
    result: Awaited<ReturnType<typeof print>>,
  ): {
    status: string;
    issues: Array<{ code: string }>;
    checked: Record<string, number>;
  } {
    const witness = {
      version: 1,
      variant: "student",
      pdfSha256: createHash("sha256").update(result.pdf).digest("hex"),
      coverage: {
        anchors: true,
        rows: true,
        writeBoxes: true,
        qrs: true,
        nodes: true,
        clips: true,
      },
      requiredFonts: ["NotoSansKR"],
      requireEmbeddedFonts: true,
      disabledActivities: [],
      publicExampleItemIds: [],
      projectedModel: { sections: [] },
      expectedRows: Object.fromEntries(
        PHASES.map((phase) => [
          phase,
          CONCEPTS.flatMap((c) => c.rows.map((r) => [c.conceptId, r.rowKey])),
        ]),
      ),
      pages: result.captured.map((page, i) => ({
        pdfPageIndex: i + 1,
        physicalPageIndex: page.physicalPageIndex,
        anchors: [],
        nodes: [],
        rows: page.rows.map((r) => ({ ...r, relativePageIndex: 0 })),
        writeBoxes: page.writeBoxes,
        qrs: page.qrs,
        clips: page.clips,
      })),
    };
    const witnessPath = path.join(OUT, `${name}-witness.json`);
    const reportPath = path.join(OUT, `${name}-geometry.json`);
    writeFileSync(witnessPath, JSON.stringify(witness, null, 2));
    try {
      execFileSync(
        "python",
        [
          "scripts/qa/textbook/recovery/geometry.py",
          result.pdfPath,
          "--witness",
          witnessPath,
          "--output",
          reportPath,
        ],
        { env: { ...process.env, PYTHONIOENCODING: "utf-8" }, stdio: "pipe" },
      );
    } catch {
      // A failed verification exits 1 after writing its report; the report is asserted below.
    }
    return JSON.parse(readFileSync(reportPath, "utf8"));
  }

  const rowsOf = (captured: Captured[], phase: string) =>
    captured.find((page) => page.sheet === phase)!.rows;

  it("prints estimated rows at one height and column start in all three phases", async () => {
    const result = await print("content-estimated");
    const study = rowsOf(result.captured, "study");
    expect(study).toHaveLength(12);
    const drift: Array<[string, string, number]> = [];
    for (const phase of ["keywords", "sentences"]) {
      const rows = rowsOf(result.captured, phase);
      expect(rows.map((r) => r.rowKey)).toEqual(study.map((r) => r.rowKey));
      rows.forEach((r, i) => {
        expect(Math.abs(r.bodyLeftMm - study[i].bodyLeftMm)).toBeLessThan(0.05);
        const delta = Math.max(
          Math.abs(r.boxMm[1] - study[i].boxMm[1]),
          Math.abs(r.boxMm[3] - study[i].boxMm[3]),
        );
        if (delta > 0.5) drift.push([phase, r.rowKey, delta]);
      });
    }
    expect(drift).toEqual([]);
    expect(result.captured[0].fonts).toEqual([
      "TextbookPretendard, sans-serif",
    ]);
    const report = verify("content-estimated", result);
    writeFileSync(
      path.join(OUT, "content-estimated-rows.json"),
      JSON.stringify(result.captured, null, 2),
    );
    expect(report.issues).toEqual([]);
    expect(report.status).toBe("passed");
    expect(report.checked.rows).toBe(36);
    expect(report.checked.writeBoxes).toBeGreaterThan(30);
    expect(report.checked.qrs).toBe(2);
  }, 180_000);

  it("prints measured rows at exactly the common maximum height", async () => {
    const natural = await print("content-natural");
    const rowHeightsMm = commonRecallRowHeights(
      natural.captured.flatMap((page) =>
        page.rows.map((r) => ({
          rowKey: r.rowKey,
          heightMm: r.boxMm[3] - r.boxMm[1],
        })),
      ),
    );
    const result = await print("content-measured", rowHeightsMm);
    const study = rowsOf(result.captured, "study");
    for (const phase of PHASES)
      rowsOf(result.captured, phase).forEach((r, i) => {
        expect(r.boxMm[3] - r.boxMm[1]).toBeCloseTo(rowHeightsMm[r.rowKey], 1);
        expect(Math.abs(r.boxMm[1] - study[i].boxMm[1])).toBeLessThan(0.05);
      });
    const report = verify("content-measured", result);
    expect(report.issues).toEqual([]);
    expect(report.status).toBe("passed");
  }, 180_000);

  it("starts rows without a concept name at one height in all three phases", async () => {
    // The automatic writer's shape: one rows node per block and no concept title. Only the
    // study sheet prints the repetition marks; the other two keep the empty bar.
    const rows = CONCEPTS.flatMap((concept) => concept.rows).slice(0, 6);
    const block = (phase: RecallPhase): RenderBlock =>
      ({
        id: `rows.${phase}`,
        sourceBlockId: `rows.${phase}`,
        unitKey: "U01",
        sectionKey: `rows-${phase}`,
        kind: "recall",
        phase,
        pieces: [],
        answersVisible: false,
        repetitionChecks: phase === "study",
        semantic: {
          activity: ACTIVITY[phase],
          node: { kind: "rows", groupKey: "concept-x.memory-0", rows },
        },
      }) as RenderBlock;
    const html = textbookHtmlDocument(
      "content-rows-kind",
      PHASES.map((phase, i) =>
        paper(i + 1, phase, flow(BODY_WIDTH_MM, block(phase))),
      ).join(""),
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
        const span = (el: Element) => {
          const r = el.getBoundingClientRect();
          return [(r.top - origin.top) * mm, (r.bottom - origin.top) * mm];
        };
        const bar = sheet.querySelector(".tb-memory-title-bare")!;
        return {
          phase: sheet.dataset.sheet,
          bar: span(bar),
          barText: bar.textContent,
          rows: Array.from(sheet.querySelectorAll(".tb-memory-row")).map(span),
        };
      });
    })) as Array<{
      phase: string;
      bar: number[];
      barText: string;
      rows: number[][];
    }>;
    await page.close();
    writeFileSync(
      path.join(OUT, "content-rows-kind.json"),
      JSON.stringify(measured, null, 2),
    );
    const [study, ...others] = measured;
    expect(measured.map((sheet) => sheet.phase)).toEqual(PHASES);
    expect(study.rows).toHaveLength(6);
    expect(study.barText).toContain("1회");
    expect(study.bar[1] - study.bar[0]).toBeGreaterThan(6.9);
    for (const sheet of others) {
      expect(sheet.barText).toBe("");
      expect(Math.abs(sheet.bar[0] - study.bar[0])).toBeLessThan(0.05);
      expect(Math.abs(sheet.bar[1] - study.bar[1])).toBeLessThan(0.05);
      expect(sheet.rows).toHaveLength(6);
      sheet.rows.forEach((row, i) => {
        expect(Math.abs(row[0] - study.rows[i][0])).toBeLessThan(0.05);
        expect(Math.abs(row[1] - study.rows[i][1])).toBeLessThan(0.05);
      });
    }
  }, 120_000);
});
