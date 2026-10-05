// @vitest-environment node
/**
 * The «CHECK» subheading that closes the authored body of a native concept page, in the answer
 * book. The questions it introduces are taller there and may move to the next page; the
 * subheading has to go with them.
 *
 * The sizes below are what the real renderer measured for the answer variant of the converted
 * original pages 14, 15 and 16 (sizes only — the manuscript of those pages is not in the
 * repository; the fragments here are synthetic). The same pages run through real Chromium in
 * textbookRecoveryAnswerCheckHeading.integration.test.ts.
 */
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { TextbookSourceFragment } from "@/contracts/textbookSemantic.contract";
import { textbookFixture } from "../helpers/textbookFixture";
import {
  A4,
  blockWidthMm,
  paginateTextbookSections,
  TextbookLayoutError,
  type BlockMeasurement,
  type TextbookPage,
} from "@/lib/textbook/layout/paginate";
import { renderPageHtml } from "@/lib/textbook/render/html";
import {
  createTextbookRenderModel,
  type RenderBlock,
  type TextbookVariant,
} from "@/lib/textbook/render/model";

/** Measured in the answer variant, in mm: heading, body, subheading, the two questions. */
const MEASURED = {
  heading: 35,
  /** Page 14: everything stays on one page. */
  fits: { whole: 150.78, body: 138.11, check: 10.08, questions: [59.31, 57.2] },
  /** Page 15: the questions move on. */
  moves: {
    whole: 166.48,
    body: 153.8,
    check: 10.08,
    questions: [59.24, 59.24],
  },
  /** Page 16: the first question alone would still fit under the subheading; its row does not. */
  uneven: {
    whole: 158.78,
    body: 146.1,
    check: 10.08,
    questions: [53.46, 59.28],
  },
};
type Sizes = {
  whole: number;
  body: number;
  check: number;
  questions: number[];
};
const RESOURCES = {
  assetUrl: () => "data:image/png;base64,",
  qrDataUrl: () => "data:image/png;base64,",
};
const span = (rawText: string): TextbookSourceFragment => ({
  tag: "span",
  rawText,
});
const BODY: TextbookSourceFragment = {
  tag: "div",
  attributes: { className: "note" },
  children: [span("합성 설명 $1+1=2$")],
};
const TABLE: TextbookSourceFragment = {
  tag: "table",
  attributes: { className: "grid-table" },
  children: [
    {
      tag: "tbody",
      children: [
        { tag: "tr", children: [{ tag: "td", children: [span("합성 표")] }] },
      ],
    },
  ],
};
const CHECK: TextbookSourceFragment = {
  tag: "div",
  attributes: { className: "subheading" },
  children: [{ tag: "h2", children: [span("합성 확인")] }],
};
const FOOTER: TextbookSourceFragment = {
  tag: "div",
  attributes: { className: "checkbar" },
  children: [{ tag: "strong", children: [span("합성 꼬리말")] }],
};

function manuscript(
  options: {
    fragments?: TextbookSourceFragment[];
    kind?: string;
    source?: boolean;
    between?: boolean;
    questions?: boolean;
  } = {},
) {
  const exchange = textbookFixture(1, 2);
  const section = exchange.units[0].sections[0];
  const source = (path: string, questionId?: string) => ({
    unit: "U01",
    page: 15,
    kind: options.kind ?? "concept2",
    sectionName: "개념 이해",
    tone: "forest" as const,
    path,
    ...(questionId ? { questionId } : {}),
  });
  section.templateKey = "reference-concept2";
  section.startPolicy = "continue";
  const questions = section.blocks.map((block, i) => ({
    ...block,
    semantic: {
      activity: "concepts" as const,
      source: source(`questions.Q${i}`, `Q${i}`),
    },
  }));
  section.blocks = [
    {
      blockId: "authored",
      kind: "text",
      markdown: "",
      semantic: {
        activity: "concepts",
        ...(options.source === false ? {} : { source: source("pages[14]") }),
        node: {
          kind: "fragments",
          fragments: options.fragments ?? [BODY, TABLE, CHECK],
        },
        sourceFooter: [FOOTER],
      },
    },
    ...(options.between
      ? [
          {
            blockId: "between",
            kind: "text" as const,
            markdown: "",
            semantic: {
              activity: "concepts" as const,
              source: source("pages[14]"),
              node: { kind: "fragments" as const, fragments: [BODY] },
            },
          },
        ]
      : []),
    ...(options.questions === false ? [] : questions),
  ];
  return exchange;
}
function world(
  variant: TextbookVariant,
  options?: Parameters<typeof manuscript>[0],
) {
  const exchange = manuscript(options);
  const base = createTextbookRenderModel(exchange, variant);
  const config = {
    ...base.config,
    print: { ...base.config.print, innerMarginMm: 18, outerMarginMm: 13 },
  };
  const model = { ...base, config };
  const section = model.sections[0];
  const layout = (sizes: Sizes, firstPhysicalPageIndex = 8) => {
    const height = (block: RenderBlock) =>
      block.kind === "heading"
        ? MEASURED.heading
        : block.kind === "problem"
          ? sizes.questions[Number(block.itemId.replace("item-", ""))]
          : block.id === "authored.subheading"
            ? sizes.check
            : section.blocks.some((b) => b.id === "authored.subheading")
              ? sizes.body
              : sizes.whole;
    const measurements: BlockMeasurement[] = section.blocks.map((block) => ({
      blockId: block.id,
      widthMm: blockWidthMm(config, block),
      heightMm: height(block),
    }));
    return paginateTextbookSections([section], measurements, config, {
      firstPhysicalPageIndex,
    });
  };
  return { exchange, model, section, config, layout };
}
const round = (value: number) => Math.round(value * 100) / 100;
/** [blockId, column, x, y, height, continuation] of every placement of a page. */
const rows = (page: TextbookPage) =>
  page.blocks.map((p) => [
    p.blockId,
    p.column,
    round(p.xMm),
    round(p.yMm),
    round(p.heightMm),
    p.continuation ?? false,
  ]);
const fragmentsOf = (block: RenderBlock) =>
  block.semantic?.node?.kind === "fragments"
    ? block.semantic.node.fragments
    : [];

describe("the projection of a native concept page that ends with its check subheading", () => {
  it("leaves the student variant exactly as the manuscript has it", () => {
    const { exchange, section } = world("student");
    expect(section.blocks.map((b) => b.id)).toEqual([
      "authored.activity-heading",
      "authored",
      "block-0",
      "block-1",
    ]);
    const authored = section.blocks[1];
    const stored = exchange.units[0].sections[0].blocks[0];
    expect(authored.semantic).toBe(stored.semantic);
    expect(fragmentsOf(authored)).toEqual([BODY, TABLE, CHECK]);
    expect(section.blocks.some((b) => b.keepWithNext)).toBe(false);
  });

  it("gives the answer variant the subheading as a block of its own, kept with the questions", () => {
    const stored = structuredClone(manuscript());
    const { exchange, section } = world("answers");
    expect(section.blocks.map((b) => [b.id, b.sourceBlockId, b.kind])).toEqual([
      ["authored.activity-heading", "authored", "heading"],
      ["authored", "authored", "text"],
      ["authored.subheading", "authored", "text"],
      ["block-0", "block-0", "problem"],
      ["block-1", "block-1", "problem"],
    ]);
    const [, body, check] = section.blocks;
    // The manuscript's own fragment objects, in order, each in exactly one block.
    expect(fragmentsOf(body)).toHaveLength(2);
    expect(fragmentsOf(body)[0]).toBe(BODY);
    expect(fragmentsOf(body)[1]).toBe(TABLE);
    expect(fragmentsOf(check)).toHaveLength(1);
    expect(fragmentsOf(check)[0]).toBe(CHECK);
    expect(body.keepWithNext).toBeUndefined();
    expect(check.keepWithNext).toBe(true);
    // The page-end note stays with the body; activity, source and stage are the page's.
    expect(body.semantic?.sourceFooter).toEqual([FOOTER]);
    expect(check.semantic?.sourceFooter).toBeUndefined();
    expect(check.semantic?.source).toEqual(body.semantic?.source);
    expect(check.semantic?.activity).toBe("concepts");
    expect([body.editorialStage, check.editorialStage]).toEqual([
      "concept",
      "concept",
    ]);
    expect(section.blocks.filter((b) => b.kind === "heading")).toHaveLength(1);
    // The stored manuscript is not touched.
    expect(exchange).toEqual(stored);
  });

  it.each([
    [
      "the subheading is not the last fragment",
      { fragments: [BODY, CHECK, TABLE] },
    ],
    ["the body ends with something else", { fragments: [BODY, TABLE] }],
    [
      "the class only resembles it",
      {
        fragments: [
          BODY,
          { ...CHECK, attributes: { className: "subheading-note" } },
        ],
      },
    ],
    [
      "the subheading is nested in another fragment",
      { fragments: [BODY, { tag: "div" as const, children: [CHECK] }] },
    ],
    ["no question follows it", { between: true }],
    ["nothing follows it", { questions: false }],
    ["the page is not a native concept page", { kind: "lesson" }],
    ["the block is not from an original page", { source: false }],
  ])("does not split when %s", (_, options) => {
    const { section } = world("answers", options);
    expect(section.blocks.map((b) => b.id)).not.toContain(
      "authored.subheading",
    );
    expect(section.blocks.some((b) => b.keepWithNext)).toBe(false);
    const authored = section.blocks.find((b) => b.id === "authored")!;
    expect(fragmentsOf(authored)).toEqual(
      options.fragments ?? [BODY, TABLE, CHECK],
    );
  });

  it("splits on the class token among several, on each of the three concept kinds", () => {
    for (const kind of ["concept1", "concept2", "concept3"]) {
      const marked = { ...CHECK, attributes: { className: "wide subheading" } };
      const { section } = world("answers", { kind, fragments: [BODY, marked] });
      const check = section.blocks.find((b) => b.id === "authored.subheading")!;
      expect(fragmentsOf(check)[0]).toBe(marked);
      expect(check.keepWithNext).toBe(true);
    }
  });

  it("keeps a body that is only the subheading whole, and with the questions", () => {
    const { section } = world("answers", { fragments: [CHECK] });
    expect(section.blocks.map((b) => b.id)).toEqual([
      "authored.activity-heading",
      "authored",
      "block-0",
      "block-1",
    ]);
    expect(section.blocks[1].keepWithNext).toBe(true);
    expect(fragmentsOf(section.blocks[1])).toEqual([CHECK]);
    expect(section.blocks[1].semantic?.sourceFooter).toEqual([FOOTER]);
    expect(
      world("student", { fragments: [CHECK] }).section.blocks[1].keepWithNext,
    ).toBeUndefined();
  });
});

describe("the answer pages of a native concept page", () => {
  it("held the subheading back alone before: the layout the unsplit block still gives", () => {
    // The student model is the unsplit block. Laid out with the answer sizes it shows the
    // defect: the body, with the subheading inside it, ends page 8 and the questions open page 9.
    const pages = world("student").layout(MEASURED.moves).pages;
    expect(pages.map(rows)).toEqual([
      [
        ["authored.activity-heading", 1, 13, 23, 35, false],
        ["authored", 1, 13, 62, 166.48, false],
      ],
      [
        ["authored.activity-heading", 1, 18, 23, 35, true],
        ["block-0", 1, 18, 62, 59.24, false],
        ["block-1", 2, 111, 62, 59.24, false],
      ],
    ]);
  });

  it("move the subheading to the page of its questions", () => {
    const result = world("answers").layout(MEASURED.moves);
    expect(result.pages.map(rows)).toEqual([
      [
        ["authored.activity-heading", 1, 13, 23, 35, false],
        ["authored", 1, 13, 62, 153.8, false],
      ],
      [
        ["authored.activity-heading", 1, 18, 23, 35, true],
        ["authored.subheading", 1, 18, 62, 10.08, false],
        ["block-0", 1, 18, 74.68, 59.24, false],
        ["block-1", 2, 111, 74.68, 59.24, false],
      ],
    ]);
    expect(result.pageMap).toEqual([
      {
        itemId: "item-0",
        physicalPageIndex: 9,
        printedPageLabel: "9",
        column: 1,
      },
      {
        itemId: "item-1",
        physicalPageIndex: 9,
        printedPageLabel: "9",
        column: 2,
      },
    ]);
    expect(result.issues).toEqual([]);
    expect(result.nextPhysicalPageIndex).toBe(10);
  });

  it("decide by the whole row: a taller second question moves the subheading too", () => {
    // 62 + 146.1 + 2.6 + 10.08 + 2.6 = 223.38; the first question would end at 276.84, its row at 282.66.
    const result = world("answers").layout(MEASURED.uneven);
    expect(result.pages.map(rows)).toEqual([
      [
        ["authored.activity-heading", 1, 13, 23, 35, false],
        ["authored", 1, 13, 62, 146.1, false],
      ],
      [
        ["authored.activity-heading", 1, 18, 23, 35, true],
        ["authored.subheading", 1, 18, 62, 10.08, false],
        ["block-0", 1, 18, 74.68, 59.28, false],
        ["block-1", 2, 111, 74.68, 59.28, false],
      ],
    ]);
  });

  it("leave a page that holds everything as it was: the questions stand where they stood", () => {
    // Body + 2.6 + subheading is the height of the block they are cut from. Each of the two is
    // measured to a hundredth, rounded up: on page 14 that puts the questions 0.01 mm lower.
    const tail = (page: TextbookPage) => page.blocks.filter((p) => p.itemId);
    const unsplit = world("student").layout(MEASURED.fits).pages;
    const split = world("answers").layout(MEASURED.fits).pages;
    expect(unsplit).toHaveLength(1);
    expect(split).toHaveLength(1);
    expect(rows(split[0])).toEqual([
      ["authored.activity-heading", 1, 13, 23, 35, false],
      ["authored", 1, 13, 62, 138.11, false],
      ["authored.subheading", 1, 13, 202.71, 10.08, false],
      ["block-0", 1, 13, 215.39, 59.31, false],
      ["block-1", 2, 106, 215.39, 59.31, false],
    ]);
    expect(rows(unsplit[0]).slice(1)).toEqual([
      ["authored", 1, 13, 62, 150.78, false],
      ["block-0", 1, 13, 215.38, 59.31, false],
      ["block-1", 2, 106, 215.38, 59.31, false],
    ]);
    expect(split[0].blocks[0]).toEqual(unsplit[0].blocks[0]);
    expect(tail(split[0]).map((p) => ({ ...p, yMm: 0 }))).toEqual(
      tail(unsplit[0]).map((p) => ({ ...p, yMm: 0 })),
    );
    // Sizes that add up exactly leave the questions exactly where they were.
    const exact = { ...MEASURED.fits, body: 138.1 };
    const same = world("answers").layout(exact).pages;
    expect(tail(same[0]).map((p) => round(p.yMm))).toEqual([215.38, 215.38]);
    expect(tail(same[0]).map((p) => ({ ...p, yMm: 0 }))).toEqual(
      tail(unsplit[0]).map((p) => ({ ...p, yMm: 0 })),
    );
  });

  it("keep the subheading where it is when the questions fit by a hundredth, and move it a hundredth later", () => {
    // Under the subheading the row may be 277 − (62 + 153.8 + 2.6 + 10.08 + 2.6) = 45.92 mm tall.
    const at = (height: number) =>
      world("answers").layout({
        ...MEASURED.moves,
        questions: [height, height],
      });
    const stays = at(45.91);
    expect(stays.pages).toHaveLength(1);
    expect(rows(stays.pages[0])[2]).toEqual([
      "authored.subheading",
      1,
      13,
      218.4,
      10.08,
      false,
    ]);
    const moves = at(45.93);
    expect(moves.pages).toHaveLength(2);
    expect(moves.pages[0].blocks.map((p) => p.blockId)).toEqual([
      "authored.activity-heading",
      "authored",
    ]);
    expect(moves.pages[1].blocks.map((p) => p.blockId)).toEqual([
      "authored.activity-heading",
      "authored.subheading",
      "block-0",
      "block-1",
    ]);
  });

  it("place every block once, and each question on one page only", () => {
    for (const sizes of [MEASURED.fits, MEASURED.moves, MEASURED.uneven]) {
      const { section, layout } = world("answers");
      const result = layout(sizes);
      const placements = result.pages.flatMap((page) => page.blocks);
      for (const block of section.blocks) {
        const own = placements.filter((p) => p.blockId === block.id);
        expect(
          own.filter((p) => !p.continuation),
          block.id,
        ).toHaveLength(1);
        if (block.kind !== "heading") expect(own, block.id).toHaveLength(1);
      }
      expect(result.pageMap.map((p) => p.itemId)).toEqual(["item-0", "item-1"]);
      for (const p of placements)
        expect(p.yMm + p.heightMm).toBeLessThanOrEqual(A4.bodyBottomMm);
    }
  });
});

describe("what keeping a block with the next row never does", () => {
  it("rejects a row that fits alone but cannot fit with its kept subheading", () => {
    // The row fits a page of its own (62 + 205 ≤ 277) but not under the subheading (74.68 + 205).
    const sizes = { ...MEASURED.moves, questions: [205, 205] };
    expect(world("student").layout(sizes).pages).toHaveLength(2);
    expect(() => world("answers").layout(sizes)).toThrow("BLOCK_OVERFLOW");
  });

  it("rejects an impossible kept pair even when the subheading already opens a new page", () => {
    // The body fills its page, so the subheading already opens the next one; the row after it
    // is too tall to follow on any page.
    const sizes = { whole: 0, body: 206, check: 10.08, questions: [205, 205] };
    expect(() => world("answers").layout(sizes)).toThrow("BLOCK_OVERFLOW");
  });

  it("does not move twice: a subheading that itself went to the next page takes its questions there", () => {
    const sizes = {
      whole: 0,
      body: 206,
      check: 10.08,
      questions: [59.24, 59.24],
    };
    const result = world("answers").layout(sizes);
    expect(result.pages.map(rows)).toEqual([
      [
        ["authored.activity-heading", 1, 13, 23, 35, false],
        ["authored", 1, 13, 62, 206, false],
      ],
      [
        ["authored.activity-heading", 1, 18, 23, 35, true],
        ["authored.subheading", 1, 18, 62, 10.08, false],
        ["block-0", 1, 18, 74.68, 59.24, false],
        ["block-1", 2, 111, 74.68, 59.24, false],
      ],
    ]);
  });

  it("does not reach past the next row: what is placed after it stays where it is", () => {
    // The first row fits under the subheading; the second does not. Only that row moves.
    const exchange = manuscript();
    const section = exchange.units[0].sections[0];
    const extra = textbookFixture(1, 4);
    exchange.snapshots = extra.snapshots;
    exchange.items = extra.items;
    exchange.qrTargets = extra.qrTargets;
    const [, first] = section.blocks;
    section.blocks.push(
      ...extra.units[0].sections[0].blocks.slice(2).map((block) => ({
        ...block,
        semantic: (first as { semantic: object }).semantic,
      })),
    );
    const base = createTextbookRenderModel(exchange, "answers");
    const config = {
      ...base.config,
      print: { ...base.config.print, innerMarginMm: 18, outerMarginMm: 13 },
    };
    const blocks = base.sections[0].blocks;
    const height: Record<string, number> = {
      "authored.activity-heading": 35,
      authored: 100,
      "authored.subheading": 12,
      "block-0": 59.24,
      "block-1": 59.24,
      "block-2": 59.24,
      "block-3": 59.24,
    };
    const result = paginateTextbookSections(
      base.sections,
      blocks.map((block) => ({
        blockId: block.id,
        widthMm: blockWidthMm(config, block),
        heightMm: height[block.id],
      })),
      config,
      { firstPhysicalPageIndex: 8 },
    );
    expect(
      result.pages.map((page) => page.blocks.map((p) => p.blockId)),
    ).toEqual([
      [
        "authored.activity-heading",
        "authored",
        "authored.subheading",
        "block-0",
        "block-1",
      ],
      ["authored.activity-heading", "block-2", "block-3"],
    ]);
  });
});

describe("what keeping a block with the next row leaves alone", () => {
  /** Lays the section out with one height per block id. */
  const paginate = (
    { section, config }: ReturnType<typeof world>,
    heights: Record<string, number>,
  ) =>
    paginateTextbookSections(
      [section],
      section.blocks.map((block) => ({
        blockId: block.id,
        widthMm: blockWidthMm(config, block),
        heightMm: heights[block.id],
      })),
      config,
      { firstPhysicalPageIndex: 8 },
    ).pages.map((page) => page.blocks.map((p) => p.blockId));

  it("a block that is not marked: it stays when the row after it moves on", () => {
    const w = world("answers", { between: true });
    expect(
      w.section.blocks.map((b) => [b.id, b.keepWithNext ?? false]),
    ).toEqual([
      ["authored.activity-heading", false],
      ["authored", false],
      ["between", false],
      ["block-0", false],
      ["block-1", false],
    ]);
    expect(
      paginate(w, {
        "authored.activity-heading": 35,
        authored: 150,
        between: 10,
        "block-0": 59.24,
        "block-1": 59.24,
      }),
    ).toEqual([
      ["authored.activity-heading", "authored", "between"],
      ["authored.activity-heading", "block-0", "block-1"],
    ]);
  });

  it("a marked block under which something else was placed: only the last block of a page moves", () => {
    // An example group is placed after the subheading without passing through a row. The row
    // after the group moves on; the subheading above the group is not what it follows.
    const w = world("answers");
    const question = w.section.blocks.find((b) => b.kind === "problem")!;
    const node = {
      kind: "exampleGroup" as const,
      groupId: "group",
      title: "합성 묶음",
      strategy: "$1+1=2$",
      strategyKind: "captured-solution" as const,
      exampleItemId: "g-example",
      confirmItemIds: ["g-confirm"],
    };
    const semantic = { activity: "workedExamples" as const, node };
    w.section.blocks.splice(
      3,
      0,
      {
        id: "g-title",
        sourceBlockId: "g-title",
        unitKey: w.section.unitKey,
        sectionKey: w.section.sectionKey,
        kind: "text",
        markdown: "",
        semantic,
        editorialStage: "concept",
      },
      ...["g-example", "g-confirm"].map((id): RenderBlock => ({
        ...question,
        id,
        sourceBlockId: id,
        itemId: id,
        semantic,
      })),
    );
    expect(
      paginate(w, {
        "authored.activity-heading": 35,
        authored: 60,
        "authored.subheading": 10.08,
        "g-title": 12.83,
        "g-example": 50,
        "g-confirm": 40,
        "block-0": 59.24,
        "block-1": 59.24,
      }),
    ).toEqual([
      [
        "authored.activity-heading",
        "authored",
        "authored.subheading",
        "g-title",
        "g-example",
        "g-confirm",
      ],
      ["authored.activity-heading", "block-0", "block-1"],
    ]);
  });

  it("a marked block that is all its page holds besides headings: no page is left to headings alone", () => {
    // Two headings above the subheading; a new page repeats only the second and so has room
    // for the subheading and its row. Moving it would leave the first page to its headings.
    const w = world("answers");
    const [heading, , check, ...questions] = w.section.blocks;
    w.section.blocks = [
      heading,
      {
        ...heading,
        id: "second-heading",
        sourceBlockId: "second-heading",
        title: "둘째 제목",
      } as RenderBlock,
      check,
      ...questions,
    ];
    expect(
      paginate(w, {
        "authored.activity-heading": 35,
        "second-heading": 35,
        "authored.subheading": 10.08,
        "block-0": 170,
        "block-1": 170,
      }),
    ).toEqual([
      ["authored.activity-heading", "second-heading", "authored.subheading"],
      ["second-heading", "block-0", "block-1"],
    ]);
  });
});

describe("what the answer pages still refuse", () => {
  const issue = (run: () => unknown) => {
    try {
      run();
    } catch (error) {
      if (error instanceof TextbookLayoutError) return error.issues[0];
      throw error;
    }
    throw new Error("Expected a layout error");
  };
  it("a row of questions no page can hold — the same error, block and page as the unsplit block", () => {
    // 220 mm does not fit under a continued heading (62 + 220 > 277); 260 mm fits no page at all.
    for (const height of [220, 260]) {
      const sizes = { ...MEASURED.moves, questions: [height, height] };
      const unsplit = issue(() => world("student").layout(sizes));
      const split = issue(() => world("answers").layout(sizes));
      expect(unsplit.code).toBe("BLOCK_OVERFLOW");
      expect(unsplit.path.at(-1)).toBe("block-0");
      expect(split).toEqual(unsplit);
    }
  });
  it("a body taller than a page, with or without its subheading", () => {
    const sizes = {
      whole: 260,
      body: 255,
      check: 10.08,
      questions: [59.24, 59.24],
    };
    expect(issue(() => world("student").layout(sizes)).code).toBe(
      "BLOCK_OVERFLOW",
    );
    const split = issue(() => world("answers").layout(sizes));
    expect(split.code).toBe("BLOCK_OVERFLOW");
    expect(split.path.at(-1)).toBe("authored");
  });
});

describe("the printed answer pages", () => {
  it("print the subheading once, above its questions, and every fragment once", () => {
    const { model, layout } = world("answers");
    const pages = layout(MEASURED.moves).pages;
    const html = pages.map((page) => renderPageHtml(page, model, RESOURCES));
    const count = (text: string, part: string) => text.split(part).length - 1;
    // Page 8: the body and the page-end note; no subheading.
    expect(count(html[0], 'data-block-id="authored"')).toBe(1);
    expect(count(html[0], 'class="subheading"')).toBe(0);
    expect(count(html[0], 'class="note"')).toBe(1);
    expect(count(html[0], 'class="grid-table"')).toBe(1);
    expect(count(html[0], "tb-source-page-footer")).toBe(1);
    expect(count(html[0], "data-item-id=")).toBe(0);
    // Page 9: the subheading, then both questions; the note is not repeated.
    expect(count(html[1], 'data-block-id="authored.subheading"')).toBe(1);
    expect(count(html[1], 'class="subheading"')).toBe(1);
    expect(count(html[1], 'class="note"')).toBe(0);
    expect(count(html[1], "tb-source-page-footer")).toBe(0);
    expect(count(html[1], 'data-item-id="item-0"')).toBe(1);
    expect(count(html[1], 'data-item-id="item-1"')).toBe(1);
    expect(html[1].indexOf('data-block-id="authored.subheading"')).toBeLessThan(
      html[1].indexOf('data-item-id="item-0"'),
    );
    // The fragments of the two blocks are, joined, the markup of the one block students get.
    const content = (text: string, blockId: string) =>
      new RegExp(
        `data-block-id="${blockId}"[\\s\\S]*?<section class="tb-source-fragments" data-source-kind="concept2">([\\s\\S]*?)</section>`,
      ).exec(text)![1];
    const student = world("student");
    const whole = content(
      renderPageHtml(
        student.layout(MEASURED.fits).pages[0],
        student.model,
        RESOURCES,
      ),
      "authored",
    );
    expect(
      content(html[0], "authored") + content(html[1], "authored\\.subheading"),
    ).toBe(whole);
    expect(whole).toContain("합성 확인");
  });
});
