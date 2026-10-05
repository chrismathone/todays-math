/**
 * Synthetic source-question pages for the native question row tests, the DOM probe that reads
 * them back and the judge that decides.
 *
 * 🔴 Every heading, prompt, strategy and footer built here is invented for the test. Nothing is
 * taken from the original v15 manuscript or from a published book, and no result obtained with
 * this fixture says anything about equality with the original PDF.
 */
import type { TextbookExchange } from "@/contracts/textbookExchange.contract";
import type {
  TextbookActivity,
  TextbookSemantic,
  TextbookSourceFragment,
} from "@/contracts/textbookSemantic.contract";
import { contentHash, snapshotHash } from "@/lib/textbook/hash.server";
import {
  fixtureUuid,
  SYNTHETIC_ORIGIN,
  textbookFixture,
} from "./textbookFixture";

export interface SourceQuestionSpec {
  /** Unique in the exchange: the block is `q-<id>`, the item `item-<id>`. */
  id: string;
  /** Synthetic prompt. */
  content: string;
  /** Synthetic native heading; absent leaves the default number heading. */
  header?: TextbookSourceFragment[];
  columnSpan?: 1 | 2;
  workLines?: number;
  /** `false`: a saved or bank problem without any source metadata. */
  source?: boolean;
  /** Gives the problem a solution QR beside its prompt. */
  qr?: boolean;
}
export interface SourceGroupSpec {
  groupId: string;
  title: string;
  example: SourceQuestionSpec;
  confirms: SourceQuestionSpec[];
}
export interface SourceSectionSpec {
  sectionKey: string;
  title: string;
  /** Native page kind: scriptcheck, basic, exercise, drill, practice, reasoning … */
  kind: string;
  activity: TextbookActivity;
  templateKey?: string;
  /** Synthetic fixed page note, carried by the first source block. */
  footer?: TextbookSourceFragment[];
  blocks: Array<SourceQuestionSpec | { group: SourceGroupSpec }>;
}

export const blockIdOf = (id: string) => `q-${id}`;
export const itemIdOf = (id: string) => `item-${id}`;

/**
 * A heading tree in the shape the native template uses: the question number as raw text in a span
 * inside the strong element (so the number's glyphs must inherit the strong's font), a label, a tag.
 */
export const syntheticHeader = (
  number: string,
  label: string,
  tag?: string,
): TextbookSourceFragment[] => [
  { tag: "strong", children: [{ tag: "span", rawText: number }] },
  { tag: "span", attributes: { className: "qlabel" }, rawText: label },
  ...(tag
    ? [
        {
          tag: "span" as const,
          attributes: { className: "tag" },
          rawText: tag,
        },
      ]
    : []),
];
/** The text a heading tree prints, without whitespace. */
export const headerText = (header: readonly TextbookSourceFragment[]): string =>
  header
    .map(
      (node) =>
        (node.rawText ?? "").replace(/\s+/g, "") +
        headerText(node.children ?? []),
    )
    .join("");
export const syntheticFooter = (label: string): TextbookSourceFragment[] => [
  {
    tag: "div",
    attributes: { className: "checkbar" },
    children: [
      { tag: "strong", rawText: label },
      { tag: "span", rawText: "합성 확인 표시" },
    ],
  },
];

/** Synthetic sentences of different lengths: the long one wraps to several lines in one column. */
export const SHORT_PROMPT = "합성 발문: 짧은 물음.";
export const LONG_PROMPT =
  "합성 발문: 어떤 수에 삼을 더한 다음 그 결과를 두 배 한 값이 처음 수의 네 배보다 이만큼 작을 때, 처음 수를 구하는 과정을 식으로 쓰고 단계마다 무엇을 했는지 한 문장씩 설명하시오.";
/** A heading two lines tall by an explicit break: taller than its neighbour, never wider than its column. */
export const LONG_HEADER: TextbookSourceFragment[] = [
  { tag: "strong", children: [{ tag: "span", rawText: "01" }] },
  {
    tag: "span",
    attributes: { className: "qlabel" },
    children: [
      { tag: "span", rawText: "합성으로 지은 머리말 첫 줄" },
      { tag: "br" },
      { tag: "span", rawText: "합성으로 지은 머리말 둘째 줄" },
    ],
  },
  { tag: "span", attributes: { className: "tag" }, rawText: "합성 표지" },
];
/** A heading whose label is too long for one line of its column and has to wrap. */
export const WRAPPING_HEADER = syntheticHeader(
  "01",
  "합성으로 지은 아주 긴 머리말을 두 줄이 되도록 이어 쓴 문항 제목입니다 그리고 조금 더 이어 씁니다",
  "합성 표지",
);
export const SHORT_HEADER = syntheticHeader("02", "합성 짧은 머리");

/** One synthetic unit whose sections are source pages (or saved sections, where `source` is false). */
export function sourceRowsExchange(
  sections: readonly SourceSectionSpec[],
  page = 17,
): TextbookExchange {
  const exchange = textbookFixture(1, 0);
  exchange.config.print.coverMode = "separate";
  exchange.units[0].sections = [];
  let serial = 0;
  for (const spec of sections) {
    let footerPlaced = false;
    const blocks: TextbookExchange["units"][number]["sections"][number]["blocks"] =
      [];
    const addProblem = (
      question: SourceQuestionSpec,
      node?: TextbookSemantic["node"],
      stage?: TextbookExchange["items"][number]["learningStage"],
    ) => {
      const n = serial++;
      const payload = {
        format: "markdown-latex" as const,
        content: question.content,
        answer: `합성 정답 ${n}`,
        solution: `합성 풀이 ${n}`,
        questionType: "단답형",
        figures: [],
      };
      const snapshot: TextbookExchange["snapshots"][number] = {
        snapshotId: `snap-${question.id}`,
        source: {
          system: "todays-math",
          problemId: fixtureUuid(n + 100),
          problemCode: `SYNTHETIC-SOURCE-${n}`,
        },
        sourceUpdatedAt: null,
        capturedAt: "2026-10-05T00:00:00Z",
        unitId: fixtureUuid(3),
        familyKey: "synthetic-only",
        difficulty: "기본",
        problemType: "합성",
        payload,
        contentHash: contentHash(payload),
        sourceMetadata: {
          unitId: fixtureUuid(3),
          grade: "초5",
          chapter: "합성 단원",
          section: "합성 소단원",
          difficulty: "기본",
          originalScore: 3,
        },
        rawSource: {
          figureUrls: [],
          figureDims: [],
          figureSourceMm: [],
          choiceFigureIndex: [],
          figureSvgAssetId: null,
        },
      };
      snapshot.snapshotHash = snapshotHash(snapshot);
      exchange.snapshots.push(snapshot);
      const workLines = question.workLines ?? 3;
      exchange.items.push({
        itemId: itemIdOf(question.id),
        editionId: exchange.edition.editionId,
        snapshotId: snapshot.snapshotId,
        linkStatus: "linked",
        sourceTestId: null,
        sourceTestProblemId: null,
        unitKey: exchange.units[0].unitKey,
        sectionKey: spec.sectionKey,
        learningStage: stage ?? "basic",
        displayNumber: String(n + 1).padStart(3, "0"),
        orderIndex: n,
        layout: {
          columnSpan: question.columnSpan ?? 1,
          minWorkLines: 0,
          preferredWorkLines: workLines,
          maxWorkLines: Math.max(workLines, 10),
          keepTogether: true,
        },
        qrTargetId: question.qr ? `qr-${question.id}` : null,
      });
      if (question.qr) {
        const slug = `synthetic_source_${String(n).padStart(8, "0")}`;
        exchange.qrTargets.push({
          qrTargetId: `qr-${question.id}`,
          editionId: exchange.edition.editionId,
          itemId: itemIdOf(question.id),
          slug,
          url: `${SYNTHETIC_ORIGIN}/q/${slug}`,
        });
      }
      const withSource = question.source !== false;
      const footer = withSource && spec.footer && !footerPlaced;
      if (footer) footerPlaced = true;
      blocks.push({
        blockId: blockIdOf(question.id),
        kind: "problem",
        itemId: itemIdOf(question.id),
        ...(withSource
          ? {
              semantic: {
                activity: spec.activity,
                source: {
                  unit: "U01",
                  page,
                  kind: spec.kind,
                  path: `synthetic/${question.id}`,
                },
                ...(footer ? { sourceFooter: spec.footer } : {}),
                ...(question.header
                  ? { sourceQuestionHeader: question.header }
                  : {}),
                ...(node ? { node } : {}),
              },
            }
          : {}),
      });
    };
    for (const entry of spec.blocks) {
      if (!("group" in entry)) {
        addProblem(entry);
        continue;
      }
      const group = entry.group;
      const node = {
        kind: "exampleGroup" as const,
        groupId: group.groupId,
        title: group.title,
        strategy: "합성 풀이 전략: 조건을 식으로 옮긴다.",
        exampleItemId: itemIdOf(group.example.id),
        confirmItemIds: group.confirms.map((confirm) => itemIdOf(confirm.id)),
      };
      blocks.push({
        blockId: `g-${group.groupId}`,
        kind: "text",
        markdown: group.title,
        semantic: {
          activity: spec.activity,
          title: group.title,
          source: {
            unit: "U01",
            page,
            kind: spec.kind,
            path: `synthetic/group/${group.groupId}`,
          },
          node,
        },
      });
      addProblem(group.example, node, "worked-example");
      for (const confirm of group.confirms) addProblem(confirm, node);
    }
    exchange.units[0].sections.push({
      sectionKey: spec.sectionKey,
      title: spec.title,
      templateKey: spec.templateKey ?? `reference-${spec.kind}`,
      startPolicy: "continue",
      blocks,
    });
  }
  return exchange;
}

/** Source page number the synthetic pages claim, and the physical page they are rendered on. */
export const SOURCE_PAGE = 17;
export const STANDARD_FOOTER = syntheticFooter("합성 질문 확인");
/**
 * One synthetic source page and one saved section:
 * a1+a2 — the longest heading beside the longest prompt; b1+b2 — a double prompt beside a formula
 * and no authored heading; c1 — a column problem without a partner; w1 — a wide problem;
 * s1, s2 — saved problems without source metadata.
 */
export const standardSections = (): SourceSectionSpec[] => [
  {
    sectionKey: "sc",
    title: "합성 수업 확인",
    kind: "scriptcheck",
    activity: "dialogueCheck",
    footer: STANDARD_FOOTER,
    blocks: [
      { id: "a1", content: SHORT_PROMPT, header: LONG_HEADER },
      { id: "a2", content: LONG_PROMPT, header: SHORT_HEADER },
      {
        id: "b1",
        content: `${LONG_PROMPT} ${LONG_PROMPT}`,
        header: syntheticHeader("03", "합성 머리 셋"),
      },
      { id: "b2", content: "합성 발문: 값 [[\\frac{3}{4}]] 을 소수로 쓰시오." },
      {
        id: "c1",
        content: "합성 발문: 짝 없는 문항.",
        header: syntheticHeader("05", "합성 머리 다섯"),
      },
      {
        id: "w1",
        content: LONG_PROMPT,
        columnSpan: 2,
        header: syntheticHeader("06", "합성 넓은 문항"),
      },
    ],
  },
  {
    sectionKey: "saved",
    title: "합성 저장 구획",
    kind: "practice",
    activity: "practice",
    templateKey: "practice",
    blocks: [
      { id: "s1", content: SHORT_PROMPT, source: false },
      { id: "s2", content: LONG_PROMPT, source: false },
    ],
  },
];
export type MeasuredSizes = Record<
  string,
  { head: number; prompt?: number; main?: number }
>;
/** What the standard pages must show; `sizes` are the renderer's own measured values when known. */
export const standardExpectation = (
  sizes?: MeasuredSizes,
): SourceRowExpectation => ({
  pairs: (
    [
      ["q-a1", "q-a2"],
      ["q-b1", "q-b2"],
    ] as Array<[string, string]>
  ).map((ids) => ({
    ids,
    alignPrompt: true,
    ...(sizes?.[ids[0]] ? { sizes: sizes[ids[0]] } : {}),
  })),
  untouched: ["q-c1", "q-w1", "q-s1", "q-s2"],
  headers: {
    "q-a1": headerText(LONG_HEADER),
    "q-a2": headerText(SHORT_HEADER),
    "q-b1": "03합성머리셋",
    // No authored heading: the default number of the fourth problem stays.
    "q-b2": "004",
    "q-c1": "05합성머리다섯",
    "q-w1": "06합성넓은문항",
  },
  footers: { [SOURCE_PAGE]: headerText(STANDARD_FOOTER) },
});
/** A linked source group: one solved example beside its first confirmation, a second below. */
export const linkedGroupSections = (): SourceSectionSpec[] => [
  {
    sectionKey: "pr",
    title: "합성 유형",
    kind: "practice",
    activity: "workedExamples",
    footer: syntheticFooter("합성 유형 확인"),
    blocks: [
      {
        group: {
          groupId: "g1",
          title: "합성 유형 하나",
          example: {
            id: "e1",
            content: "합성 예제: 짧은 물음.",
            header: syntheticHeader("01", "합성 예제", "합성 표지"),
          },
          confirms: [
            {
              id: "f1",
              content: LONG_PROMPT,
              header: syntheticHeader("02", "합성 확인"),
            },
            {
              id: "f2",
              content: "합성 확인 둘.",
              header: syntheticHeader("03", "합성 확인 둘"),
            },
          ],
        },
      },
    ],
  },
];
export const linkedGroupExpectation = (
  sizes?: MeasuredSizes,
): SourceRowExpectation => ({
  pairs: [
    {
      ids: ["q-e1", "q-f1"],
      alignPrompt: false,
      ...(sizes?.["q-e1"] ? { sizes: sizes["q-e1"] } : {}),
    },
  ],
  untouched: ["q-f2"],
  headers: {
    "q-e1": "01합성예제합성표지",
    "q-f1": "02합성확인",
    "q-f2": "03합성확인둘",
  },
  footers: { [SOURCE_PAGE]: "합성유형확인합성확인표시" },
});
/** Two native rows of one kind: enough to see the gap between rows of that kind. */
export const kindSections = (
  kind: string,
  activity: TextbookActivity,
): SourceSectionSpec[] => [
  {
    sectionKey: "k",
    title: "합성",
    kind,
    activity,
    footer: syntheticFooter("합성 확인"),
    blocks: [
      { id: "a1", content: SHORT_PROMPT, header: LONG_HEADER },
      { id: "a2", content: LONG_PROMPT, header: SHORT_HEADER },
      { id: "b1", content: LONG_PROMPT, header: SHORT_HEADER },
      { id: "b2", content: SHORT_PROMPT, header: LONG_HEADER },
    ],
  },
];
export const kindExpectation = (
  sizes?: MeasuredSizes,
): SourceRowExpectation => ({
  pairs: (
    [
      ["q-a1", "q-a2"],
      ["q-b1", "q-b2"],
    ] as Array<[string, string]>
  ).map((ids) => ({
    ids,
    alignPrompt: true,
    ...(sizes?.[ids[0]] ? { sizes: sizes[ids[0]] } : {}),
  })),
  untouched: [],
  headers: {
    "q-a1": headerText(LONG_HEADER),
    "q-a2": headerText(SHORT_HEADER),
    "q-b1": headerText(SHORT_HEADER),
    "q-b2": headerText(LONG_HEADER),
  },
  footers: { [SOURCE_PAGE]: "합성확인합성확인표시" },
});

// ---------------------------------------------------------------------------------------------
// Reading a rendered page back
// ---------------------------------------------------------------------------------------------

export type Box = [number, number, number, number];
export interface CapturedProblem {
  blockId: string;
  blockBoxMm: Box;
  sectionBoxMm: Box;
  source: boolean;
  role: string | null;
  inGrid: boolean;
  headBoxMm: Box;
  headStyleHeight: string;
  headText: string;
  /** How far the heading's own children reach below its box. */
  headOverflowMm: number;
  /** The number's inner raw-text span beside the strong element that holds it. */
  numberFont: {
    strongPx: number;
    spanPx: number;
    strongWeight: string;
    spanWeight: string;
    strongSpacing: string;
    spanSpacing: string;
  } | null;
  /** Lines the question number and the tag chip are set on (1 unless they were broken). */
  numberLines: number;
  tagLines: number;
  promptBoxMm: Box;
  promptStyleMinHeight: string;
  promptText: string;
  /** The prompt row (prose beside its QR or above its figure) and the height reserved for it. */
  mainBoxMm: Box;
  mainStyleMinHeight: string;
  hasQr: boolean;
  workTopMm: number | null;
}
export interface CapturedSourcePage {
  physicalPageIndex: number;
  paperMm: [number, number];
  contentBoxMm: Box | null;
  footer: {
    boxMm: Box;
    position: string;
    parentIsPaper: boolean;
    insideContent: boolean;
    text: string;
  } | null;
  footerCount: number;
  grids: Array<{ className: string; boxMm: Box }>;
  problems: CapturedProblem[];
  fontReady: boolean;
}

/**
 * One plain function of `document`, kept as source text so that no transpiler helper can enter
 * it: evaluated as a string in Chromium, built with `new Function` for a jsdom document.
 */
export const SOURCE_ROW_PROBE = String.raw`function (document) {
  var view = document.defaultView;
  var mm = 25.4 / 96;
  function strip(s) { return (s || "").replace(/\s+/g, ""); }
  function round(v) { return Math.round(v * 100) / 100; }
  var papers = document.querySelectorAll("[data-textbook-page]"), result = [];
  for (var p = 0; p < papers.length; p++) {
    (function (paper) {
      var origin = paper.getBoundingClientRect();
      function box(el) {
        var r = el.getBoundingClientRect();
        return [round((r.left - origin.left) * mm), round((r.top - origin.top) * mm), round((r.right - origin.left) * mm), round((r.bottom - origin.top) * mm)];
      }
      var content = paper.querySelector(".tb-reference-content");
      var footers = paper.querySelectorAll(".tb-source-page-footer"), footer = footers[0] || null;
      var problems = [], blocks = paper.querySelectorAll(".tb-block");
      for (var i = 0; i < blocks.length; i++) {
        var block = blocks[i], section = block.querySelector(".tb-problem");
        if (!section) continue;
        var head = section.querySelector(".tb-problem-head");
        var prompt = section.querySelector(".tb-problem-question > .tb-prose");
        var work = section.querySelector(".tb-work-area:not([data-empty-work])");
        var headBox = box(head), deepest = headBox[3];
        for (var k = 0; k < head.children.length; k++) deepest = Math.max(deepest, box(head.children[k])[3]);
        var inGrid = false;
        for (var up = block.parentNode; up && up !== paper; up = up.parentNode)
          if (up.classList && up.classList.contains("tb-source-question-grid")) inGrid = true;
        problems.push({
          blockId: block.getAttribute("data-block-id"),
          blockBoxMm: box(block), sectionBoxMm: box(section),
          source: section.classList.contains("tb-source-problem"),
          role: section.getAttribute("data-example-role"),
          inGrid: inGrid,
          headBoxMm: headBox, headStyleHeight: head.style.height || "", headText: strip(head.textContent),
          headOverflowMm: round(deepest - headBox[3]),
          numberFont: (function () {
            var strong = head.querySelector("strong"), span = strong && strong.querySelector("span");
            if (!span || !view) return null;
            var outer = view.getComputedStyle(strong), inner = view.getComputedStyle(span);
            return {
              strongPx: parseFloat(outer.fontSize), spanPx: parseFloat(inner.fontSize),
              strongWeight: outer.fontWeight, spanWeight: inner.fontWeight,
              strongSpacing: outer.letterSpacing, spanSpacing: inner.letterSpacing
            };
          })(),
          numberLines: (function () {
            var strong = head.querySelector("strong");
            var text = strong && (strong.querySelector("span") || strong);
            return text && text.getClientRects ? text.getClientRects().length : 1;
          })(),
          tagLines: (function () {
            var tag = head.querySelector(".tag");
            if (!tag || !document.createRange) return 1;
            var range = document.createRange();
            range.selectNodeContents(tag);
            if (!range.getClientRects) return 1;
            var tops = {}, rects = range.getClientRects(), count = 0;
            for (var r = 0; r < rects.length; r++) {
              var key = Math.round(rects[r].top);
              if (rects[r].width > 0.5 && !tops[key]) { tops[key] = true; count++; }
            }
            return count || 1;
          })(),
          promptBoxMm: box(prompt), promptStyleMinHeight: prompt.style.minHeight || "", promptText: strip(prompt.textContent),
          mainBoxMm: box(section.querySelector(".tb-problem-main")),
          mainStyleMinHeight: section.querySelector(".tb-problem-main").style.minHeight || "",
          hasQr: !!section.querySelector(".tb-qr"),
          workTopMm: work ? box(work)[1] : null
        });
      }
      var inside = false;
      if (footer) for (var at = footer.parentNode; at && at !== paper; at = at.parentNode)
        if (at === content) inside = true;
      var grids = [], found = paper.querySelectorAll(".tb-source-question-grid");
      for (var g = 0; g < found.length; g++) grids.push({ className: found[g].className, boxMm: box(found[g]) });
      result.push({
        physicalPageIndex: Number(paper.getAttribute("data-textbook-page")),
        paperMm: [round(origin.width * mm), round(origin.height * mm)],
        contentBoxMm: content ? box(content) : null,
        footer: footer ? {
          boxMm: box(footer),
          position: view ? view.getComputedStyle(footer).position : "",
          parentIsPaper: footer.parentNode === paper,
          insideContent: inside,
          text: strip(footer.textContent)
        } : null,
        footerCount: footers.length,
        grids: grids,
        problems: problems,
        fontReady: !!(document.fonts && document.fonts.check && document.fonts.check("400 13px TextbookPretendard", "가나다"))
      });
    })(papers[p]);
  }
  return result;
}`;

// ---------------------------------------------------------------------------------------------
// Judging it
// ---------------------------------------------------------------------------------------------

export interface SourceRowExpectation {
  /** Native two-column rows and linked groups, as the production plan names them. */
  pairs: Array<{
    ids: [string, string];
    alignPrompt: boolean;
    /** What the renderer's own measurement returned for the pair, when it is known. */
    sizes?: { head: number; prompt?: number; main?: number };
  }>;
  /** Source or saved problems that belong to no pair: nothing may be set on them. */
  untouched: string[];
  /** Authored headings by block id, as printed text without whitespace. */
  headers: Record<string, string>;
  /** Pages that carry the fixed note, with its text without whitespace. */
  footers: Record<number, string>;
}
export interface SourceRowFailure {
  rule:
    | "missing"
    | "pair-head-height"
    | "pair-head-top"
    | "pair-prompt-height"
    | "pair-main-height"
    | "work-top"
    | "untouched"
    | "header-kept"
    | "footer-fixed"
    | "head-number-font"
    | "head-number-wrap"
    | "no-clip";
  id: string;
  detail: string;
}
const TOLERANCE_MM = 0.06;
/** The native question number is set at 12.5pt. */
const NUMBER_FONT_PX = (12.5 * 96) / 72;
const height = (box: Box) => box[3] - box[1];

/**
 * `geometry: false` is for a DOM without layout (jsdom): the inline heights, the heading text and
 * the place of the fixed note in the tree are still judged.
 */
export function judgeSourceRows(
  pages: readonly CapturedSourcePage[],
  expected: SourceRowExpectation,
  options: { geometry?: boolean } = {},
): SourceRowFailure[] {
  const geometry = options.geometry ?? true;
  const failures: SourceRowFailure[] = [];
  const fail = (rule: SourceRowFailure["rule"], id: string, detail: string) =>
    failures.push({ rule, id, detail });
  const problems = new Map(
    pages.flatMap((page) =>
      page.problems.map((problem) => [problem.blockId, problem] as const),
    ),
  );
  for (const pair of expected.pairs) {
    const [a, b] = pair.ids.map((id) => problems.get(id));
    const name = pair.ids.join("+");
    if (!a || !b) {
      fail("missing", name, "짝의 문항이 지면에 없다");
      continue;
    }
    // The heading: one inline height on both, and the same physical box.
    if (!a.headStyleHeight || a.headStyleHeight !== b.headStyleHeight)
      fail(
        "pair-head-height",
        name,
        `머리 높이 지정 «${a.headStyleHeight}» / «${b.headStyleHeight}»`,
      );
    if (
      pair.sizes &&
      Math.abs(parseFloat(a.headStyleHeight) - pair.sizes.head) > 0.001
    )
      fail(
        "pair-head-height",
        name,
        `머리 높이 지정 ${a.headStyleHeight} ≠ 측정값 ${pair.sizes.head}mm`,
      );
    if (geometry) {
      if (
        Math.abs(height(a.headBoxMm) - height(b.headBoxMm)) > TOLERANCE_MM ||
        (pair.sizes &&
          Math.abs(height(a.headBoxMm) - pair.sizes.head) > TOLERANCE_MM)
      )
        fail(
          "pair-head-height",
          name,
          `머리 상자 ${height(a.headBoxMm).toFixed(2)} / ${height(b.headBoxMm).toFixed(2)}mm${pair.sizes ? ` (측정값 ${pair.sizes.head.toFixed(2)})` : ""}`,
        );
      if (Math.abs(a.headBoxMm[1] - b.headBoxMm[1]) > TOLERANCE_MM)
        fail(
          "pair-head-top",
          name,
          `머리 윗선 ${a.headBoxMm[1]} / ${b.headBoxMm[1]}mm`,
        );
    }
    if (!pair.alignPrompt) {
      // A linked group aligns its headings only.
      for (const member of [a, b])
        if (member.promptStyleMinHeight)
          fail(
            "pair-prompt-height",
            member.blockId,
            `연결 묶음인데 발문에 높이 지정 «${member.promptStyleMinHeight}»`,
          );
      continue;
    }
    if (
      !a.promptStyleMinHeight ||
      a.promptStyleMinHeight !== b.promptStyleMinHeight
    )
      fail(
        "pair-prompt-height",
        name,
        `발문 높이 지정 «${a.promptStyleMinHeight}» / «${b.promptStyleMinHeight}»`,
      );
    if (
      pair.sizes?.prompt !== undefined &&
      Math.abs(parseFloat(a.promptStyleMinHeight) - pair.sizes.prompt) > 0.001
    )
      fail(
        "pair-prompt-height",
        name,
        `발문 높이 지정 ${a.promptStyleMinHeight} ≠ 측정값 ${pair.sizes.prompt}mm`,
      );
    if (
      geometry &&
      (Math.abs(height(a.promptBoxMm) - height(b.promptBoxMm)) > TOLERANCE_MM ||
        (pair.sizes?.prompt !== undefined &&
          Math.abs(height(a.promptBoxMm) - pair.sizes.prompt) > TOLERANCE_MM))
    )
      fail(
        "pair-prompt-height",
        name,
        `발문 상자 ${height(a.promptBoxMm).toFixed(2)} / ${height(b.promptBoxMm).toFixed(2)}mm${pair.sizes?.prompt !== undefined ? ` (측정값 ${pair.sizes.prompt.toFixed(2)})` : ""}`,
      );
    // A QR or a figure makes the prompt row taller than its prose: then the whole row is reserved
    // on both sides. Without one, nothing is reserved.
    const reserved =
      pair.sizes?.main !== undefined || a.hasQr || b.hasQr
        ? a.mainStyleMinHeight !== "" &&
          a.mainStyleMinHeight === b.mainStyleMinHeight &&
          (pair.sizes?.main === undefined ||
            Math.abs(parseFloat(a.mainStyleMinHeight) - pair.sizes.main) <=
              0.001)
        : a.mainStyleMinHeight === "" && b.mainStyleMinHeight === "";
    if (!reserved)
      fail(
        "pair-main-height",
        name,
        `발문 줄 높이 지정 «${a.mainStyleMinHeight}» / «${b.mainStyleMinHeight}»${pair.sizes?.main !== undefined ? ` (측정값 ${pair.sizes.main}mm)` : ""}`,
      );
    else if (
      geometry &&
      Math.abs(height(a.mainBoxMm) - height(b.mainBoxMm)) > TOLERANCE_MM &&
      (a.hasQr || b.hasQr)
    )
      fail(
        "pair-main-height",
        name,
        `발문 줄 상자 ${height(a.mainBoxMm).toFixed(2)} / ${height(b.mainBoxMm).toFixed(2)}mm`,
      );
    if (
      geometry &&
      a.workTopMm !== null &&
      b.workTopMm !== null &&
      Math.abs(a.workTopMm - b.workTopMm) > TOLERANCE_MM
    )
      fail("work-top", name, `풀이 칸 윗선 ${a.workTopMm} / ${b.workTopMm}mm`);
  }
  for (const id of expected.untouched) {
    const problem = problems.get(id);
    if (!problem) fail("missing", id, "문항이 지면에 없다");
    else if (problem.headStyleHeight || problem.promptStyleMinHeight)
      fail(
        "untouched",
        id,
        `짝이 아닌데 높이 지정 «${problem.headStyleHeight}» «${problem.promptStyleMinHeight}»`,
      );
  }
  for (const [id, text] of Object.entries(expected.headers)) {
    const problem = problems.get(id);
    if (!problem) fail("missing", id, "문항이 지면에 없다");
    else if (problem.headText !== text)
      fail("header-kept", id, `머리 «${problem.headText}» ≠ 원고 «${text}»`);
  }
  for (const page of pages) {
    const wanted = expected.footers[page.physicalPageIndex];
    const at = String(page.physicalPageIndex);
    if (wanted === undefined) {
      if (page.footerCount)
        fail("footer-fixed", at, "고정 쪽 안내가 없어야 할 쪽에 있다");
    } else if (!page.footer || page.footerCount !== 1)
      fail("footer-fixed", at, `고정 쪽 안내 ${page.footerCount}개`);
    else {
      const footer = page.footer;
      if (footer.text !== wanted)
        fail("footer-fixed", at, `안내 글 «${footer.text}» ≠ «${wanted}»`);
      // Outside the content box in the tree: a note inside it would join the flow.
      if (!footer.parentIsPaper || footer.insideContent)
        fail("footer-fixed", at, "쪽 안내가 본문 상자 안에 있다");
      if (geometry) {
        if (footer.position !== "absolute")
          fail("footer-fixed", at, `쪽 안내의 position 이 ${footer.position}`);
        if (
          Math.abs(footer.boxMm[1] - 270) > 0.2 ||
          Math.abs(footer.boxMm[3] - 278) > 0.2
        )
          fail(
            "footer-fixed",
            at,
            `쪽 안내 ${footer.boxMm[1]}~${footer.boxMm[3]}mm (270~278 이어야 한다)`,
          );
        const lowest = Math.max(
          page.contentBoxMm?.[3] ?? 0,
          ...page.problems.map((problem) => problem.blockBoxMm[3]),
        );
        if (lowest > footer.boxMm[1] + TOLERANCE_MM)
          fail(
            "footer-fixed",
            at,
            `본문이 ${lowest}mm 까지 내려와 쪽 안내(${footer.boxMm[1]}mm)와 겹친다`,
          );
      }
    }
    if (!geometry) continue;
    for (const problem of page.problems) {
      if (problem.sectionBoxMm[3] > problem.blockBoxMm[3] + 0.3)
        fail(
          "no-clip",
          problem.blockId,
          `문항 ${problem.sectionBoxMm[3]}mm 가 블록 ${problem.blockBoxMm[3]}mm 밖`,
        );
      if (problem.source && !problem.role && problem.headOverflowMm > 0.6)
        fail(
          "no-clip",
          problem.blockId,
          `머리 글이 머리 상자 아래로 ${problem.headOverflowMm}mm`,
        );
      // The number is raw text in a span inside the strong: it prints with the strong's own font.
      const font = problem.numberFont;
      if (
        font &&
        (Math.abs(font.spanPx - font.strongPx) > 0.01 ||
          Math.abs(font.strongPx - NUMBER_FONT_PX) > 0.05 ||
          font.spanWeight !== font.strongWeight ||
          font.spanSpacing !== font.strongSpacing)
      )
        fail(
          "head-number-font",
          problem.blockId,
          `번호 글자 ${font.spanPx}px/${font.spanWeight}/${font.spanSpacing} ≠ 머리 번호 ${font.strongPx}px/${font.strongWeight}/${font.strongSpacing} (12.5pt 여야 한다)`,
        );
      // A question number or a tag chip is never broken over two lines.
      if (problem.source && (problem.numberLines > 1 || problem.tagLines > 1))
        fail(
          "head-number-wrap",
          problem.blockId,
          `번호 ${problem.numberLines}줄 · 표지 ${problem.tagLines}줄 (한 줄이어야 한다)`,
        );
    }
    // Rows keep their order down the page and never run into each other.
    const rows = [...page.problems].sort(
      (a, b) => a.blockBoxMm[1] - b.blockBoxMm[1],
    );
    for (let i = 1; i < rows.length; i++) {
      const upper = rows
        .slice(0, i)
        .filter((other) => other.blockBoxMm[1] < rows[i].blockBoxMm[1] - 0.5);
      for (const other of upper)
        if (
          other.blockBoxMm[3] > rows[i].blockBoxMm[1] + TOLERANCE_MM &&
          other.blockBoxMm[0] < rows[i].blockBoxMm[2] - 0.5 &&
          rows[i].blockBoxMm[0] < other.blockBoxMm[2] - 0.5
        )
          fail(
            "no-clip",
            rows[i].blockId,
            `윗줄 ${other.blockId} (${other.blockBoxMm[3]}mm) 와 겹친다 (${rows[i].blockBoxMm[1]}mm)`,
          );
    }
  }
  return failures;
}

/** Gaps between consecutive rows of problems on a page, top to bottom. */
export function rowGapsMm(page: CapturedSourcePage): number[] {
  const rows: Array<[number, number]> = [];
  for (const problem of [...page.problems].sort(
    (a, b) => a.blockBoxMm[1] - b.blockBoxMm[1],
  )) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(last[0] - problem.blockBoxMm[1]) < 0.5)
      last[1] = Math.max(last[1], problem.blockBoxMm[3]);
    else rows.push([problem.blockBoxMm[1], problem.blockBoxMm[3]]);
  }
  return rows
    .slice(1)
    .map((row, index) => Math.round((row[0] - rows[index][1]) * 100) / 100);
}
