// @vitest-environment node
/**
 * A linked example group that is taller than a page of the answer book.
 *
 * The sizes below are what the real renderer measured for the answer variant of the frozen
 * 중3-2 section whose answers did not paginate (EXAMPLE_GROUP_OVERFLOW, 0.82 mm over). They are
 * sizes only: the questions, answers and figures of that book are not in the repository. The
 * same section runs through real Chromium in textbookRecoveryPairedOverflow.integration.test.ts.
 */
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { textbookFixture } from "../helpers/textbookFixture";
import {
  A4,
  blockWidthMm,
  paginateTextbookSections,
  studentPageMapFromPages,
  textbookBodyTopMm,
  TextbookLayoutError,
  type BlockMeasurement,
  type BlockPlacement,
  type TextbookPage,
} from "@/lib/textbook/layout/paginate";
import { editorialBlock } from "@/lib/textbook/render/editorial";
import { renderBlockHtml, renderPageHtml } from "@/lib/textbook/render/html";
import {
  createTextbookRenderModel,
  type RenderBlock,
  type RenderSection,
  type TextbookRenderModel,
  type TextbookVariant,
} from "@/lib/textbook/render/model";

type Problem = Extract<RenderBlock, { kind: "problem" }>;
/** Measured in the answer variant, in mm. */
const FROZEN = {
  heading: 34.24,
  title: 12.83,
  groups: [
    { example: 103.19, confirms: [165.05] },
    { example: 140.13, confirms: [200.75] },
  ],
  firstPhysicalPageIndex: 29,
  failedAtPhysicalPageIndex: 31,
};
const RESOURCES = {
  assetUrl: () => "data:image/png;base64,",
  qrDataUrl: () => "",
};

function world(
  variant: TextbookVariant,
  groups: Array<{ example: number; confirms: number[] }> = FROZEN.groups,
  options: { source?: boolean } = {},
) {
  const base = createTextbookRenderModel(textbookFixture(1, 1), variant);
  const config = {
    ...base.config,
    print: { ...base.config.print, innerMarginMm: 18, outerMarginMm: 13 },
  };
  const origin = base.sections[0];
  const original = origin.blocks.find((b) => b.kind === "problem") as Problem;
  const common = {
    unitKey: origin.unitKey,
    sectionKey: origin.sectionKey,
    editorialStage: "practice" as const,
  };
  const source = options.source
    ? {
        source: {
          unit: "U01",
          page: 24,
          kind: "paired",
          sectionName: "대표예제",
          path: "pages[0]",
        },
      }
    : {};
  const blocks: RenderBlock[] = [
    {
      ...common,
      id: "activity-heading",
      sourceBlockId: "g1-title",
      kind: "heading",
      title: "대표예제와 확인",
      semantic: { activity: "workedExamples", ...source },
    },
  ];
  const heights = new Map<string, number>([
    ["activity-heading", FROZEN.heading],
  ]);
  let number = 0;
  groups.forEach((sizes, g) => {
    const ids = {
      title: `g${g + 1}-title`,
      example: `g${g + 1}-example`,
      confirms: sizes.confirms.map((_, c) => `g${g + 1}-confirm-${c + 1}`),
    };
    const semantic = {
      activity: "workedExamples" as const,
      ...source,
      node: {
        kind: "exampleGroup" as const,
        groupId: `example-${ids.example}`,
        title: `삼각비의 뜻 · 유형 ${g + 1}`,
        strategy: "$1+1=2$",
        strategyKind: "captured-solution" as const,
        exampleItemId: ids.example,
        confirmItemIds: ids.confirms,
      },
    };
    blocks.push({
      ...common,
      id: ids.title,
      sourceBlockId: ids.title,
      kind: "text",
      markdown: "",
      semantic,
      exampleGroupNumber: g + 1,
    });
    heights.set(ids.title, FROZEN.title);
    [ids.example, ...ids.confirms].forEach((itemId, index) => {
      number += 1;
      const { publicWorkedExample: _public, ...rest } = original;
      void _public;
      blocks.push({
        ...rest,
        ...common,
        id: itemId,
        sourceBlockId: itemId,
        itemId,
        displayNumber: String(number),
        semantic,
        content: `$${number}+3$을 계산하시오.`,
        qr: null,
        sourcePageLabel: variant === "answers" ? String(27 + g) : null,
        learningStage: index === 0 ? "worked-example" : "concept-check",
        layout: {
          ...original.layout,
          columnSpan: 1,
          minWorkLines: 2,
          preferredWorkLines: 2,
          maxWorkLines: 2,
        },
        ...(variant === "answers"
          ? { answer: `정답 ${number}`, solution: `해설 ${number}` }
          : index === 0
            ? { publicWorkedExample: { answer: "5", solution: "$2+3=5$" } }
            : {}),
        ...(index > 0 ? { exampleConfirmIndex: index - 1 } : {}),
      } as RenderBlock);
      heights.set(
        itemId,
        index === 0 ? sizes.example : sizes.confirms[index - 1],
      );
    });
  });
  const section: RenderSection = {
    ...origin,
    templateKey: "auto-lesson-part",
    startPolicy: "continue",
    editorialStage: "practice",
    blocks,
  };
  const model: TextbookRenderModel = { ...base, config, sections: [section] };
  const measurements: BlockMeasurement[] = blocks.map((block) => ({
    blockId: block.id,
    widthMm: blockWidthMm(config, block),
    heightMm: heights.get(block.id)!,
  }));
  const layout = (maxPages?: number) =>
    paginateTextbookSections([section], measurements, config, {
      firstPhysicalPageIndex: FROZEN.firstPhysicalPageIndex,
      ...(maxPages ? { maxPages } : {}),
    });
  return { model, section, config, measurements, layout, heights };
}
const caught = (run: () => unknown): TextbookLayoutError => {
  try {
    run();
  } catch (error) {
    if (error instanceof TextbookLayoutError) return error;
    throw error;
  }
  throw new Error("Expected a layout error");
};
const at = (page: TextbookPage, blockId: string) =>
  page.blocks.find((placement) => placement.blockId === blockId)!;
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

describe("the frozen 중3-2 answer group that did not paginate", () => {
  it("is 0.82 mm taller than a continued page, with or without its example beside it", () => {
    const { section } = world("answers");
    const heading = section.blocks[0];
    const [, second] = FROZEN.groups;
    const room =
      A4.bodyBottomMm -
      (textbookBodyTopMm(section, heading) + FROZEN.heading + A4.gapMm);
    expect(textbookBodyTopMm(section, heading)).toBe(23);
    expect(room).toBeCloseTo(215.76, 2);
    const together =
      FROZEN.title + Math.max(second.example, 3 + second.confirms[0]);
    expect(together - room).toBeCloseTo(0.82, 2);
    // Moving the confirmation to a page of its own does not help while it keeps the 3 mm it is
    // set below an example: the right column alone is what is too tall.
    expect(FROZEN.title + 3 + second.confirms[0] - room).toBeCloseTo(0.82, 2);
    expect(room - (FROZEN.title + second.confirms[0])).toBeCloseTo(2.18, 2);
    // The first group of the section fits beside its example and is not part of the failure.
    const [first] = FROZEN.groups;
    expect(
      FROZEN.title + Math.max(first.example, 3 + first.confirms[0]),
    ).toBeLessThan(room);
  });

  it("is still rejected for students, at the block and page the frozen run reported", () => {
    const { layout, section } = world("student");
    const error = caught(layout);
    expect(error.issues).toEqual([
      {
        code: "EXAMPLE_GROUP_OVERFLOW",
        message:
          "예제와 확인문제를 한 지면에 넣을 수 없습니다. 원고·그림·풀이 공간을 조정하세요.",
        severity: "error",
        path: [
          "units",
          section.unitKey,
          "sections",
          section.sectionKey,
          "blocks",
          "g2-title",
        ],
        physicalPageIndex: FROZEN.failedAtPhysicalPageIndex,
      },
    ]);
  });

  it("is still rejected for a group taken from an original page, in both variants", () => {
    for (const variant of ["student", "answers"] as const) {
      const { layout } = world(variant, FROZEN.groups, { source: true });
      expect(caught(layout).issues[0].code).toBe("EXAMPLE_GROUP_OVERFLOW");
    }
  });

  it("continues in the answer book: the example first, the confirmation under the repeated title", () => {
    const { layout } = world("answers");
    const result = layout();
    expect(result.pages.map((page) => page.physicalPageIndex)).toEqual([
      29, 30, 31,
    ]);
    expect(result.nextPhysicalPageIndex).toBe(32);
    expect(result.issues).toEqual([]);
    // Odd pages start at the inner margin (18), even pages at the outer margin (13).
    expect(rows(result.pages[0])).toEqual([
      ["activity-heading", 1, 18, 23, 34.24, false],
      ["g1-title", 1, 18, 61.24, 12.83, false],
      ["g1-example", 1, 18, 74.07, 103.19, false],
      ["g1-confirm-1", 2, 111, 77.07, 165.05, false],
    ]);
    expect(rows(result.pages[1])).toEqual([
      ["activity-heading", 1, 13, 23, 34.24, true],
      ["g2-title", 1, 13, 61.24, 12.83, false],
      ["g2-example", 1, 13, 74.07, 140.13, false],
    ]);
    // The confirmation keeps its column and width. With no example beside it, it starts at the
    // title's bottom edge — that is what makes it fit: 74.07 + 200.75 = 274.82 ≤ 277.
    expect(rows(result.pages[2])).toEqual([
      ["activity-heading", 1, 18, 23, 34.24, true],
      ["g2-title", 1, 18, 61.24, 12.83, true],
      ["g2-confirm-1", 2, 111, 74.07, 200.75, false],
    ]);
    for (const page of result.pages)
      for (const placement of page.blocks)
        expect(placement.yMm + placement.heightMm).toBeLessThanOrEqual(
          A4.bodyBottomMm,
        );
    // Every problem is placed once, with the item it had.
    expect(result.pageMap).toEqual([
      {
        itemId: "g1-example",
        physicalPageIndex: 29,
        printedPageLabel: "29",
        column: 1,
      },
      {
        itemId: "g1-confirm-1",
        physicalPageIndex: 29,
        printedPageLabel: "29",
        column: 2,
      },
      {
        itemId: "g2-example",
        physicalPageIndex: 30,
        printedPageLabel: "30",
        column: 1,
      },
      {
        itemId: "g2-confirm-1",
        physicalPageIndex: 31,
        printedPageLabel: "31",
        column: 2,
      },
    ]);
  });

  it("places every block: titles may repeat as a continuation, a problem never does", () => {
    const { layout, section } = world("answers");
    const placements = layout().pages.flatMap((page) => page.blocks);
    for (const block of section.blocks) {
      const placed = placements.filter((p) => p.blockId === block.id);
      const first = placed.filter((p) => !p.continuation);
      expect(first, block.id).toHaveLength(1);
      if (block.kind === "problem") {
        expect(placed, block.id).toHaveLength(1);
        expect(placed[0].itemId).toBe(block.itemId);
        expect(placed[0].widthMm).toBe(86);
      } else expect(placed.every((p) => p.itemId === undefined)).toBe(true);
    }
    expect(
      placements.filter((p) => p.continuation).map((p) => p.blockId),
    ).toEqual(["activity-heading", "activity-heading", "g2-title"]);
    expect(
      placements.every((p) =>
        section.blocks.some((block) => block.id === p.blockId),
      ),
    ).toBe(true);
  });

  it("keeps the page limit: a continuation never gets a page beyond it", () => {
    const { layout } = world("answers");
    expect(caught(() => layout(2)).issues[0].code).toBe("PAGE_LIMIT");
    expect(layout(3).pages).toHaveLength(3);
  });
});

describe("a group that fits is laid out as it always was", () => {
  const fitting = [
    { example: 103.19, confirms: [165.05] },
    { example: 60, confirms: [20, 20.5] },
  ];
  it("in both variants, at the same coordinates, with the 3 mm inset beside the example", () => {
    const student = world("student", fitting).layout();
    const answers = world("answers", fitting).layout();
    expect(answers.pages).toEqual(student.pages);
    expect(answers.pageMap).toEqual(student.pageMap);
    expect(student.pages).toHaveLength(2);
    expect(rows(student.pages[0])).toEqual([
      ["activity-heading", 1, 18, 23, 34.24, false],
      ["g1-title", 1, 18, 61.24, 12.83, false],
      ["g1-example", 1, 18, 74.07, 103.19, false],
      ["g1-confirm-1", 2, 111, 77.07, 165.05, false],
    ]);
    // The second group is shorter than the 102 mm a group always takes.
    expect(rows(student.pages[1])).toEqual([
      ["activity-heading", 1, 13, 23, 34.24, true],
      ["g2-title", 1, 13, 61.24, 12.83, false],
      ["g2-example", 1, 13, 74.07, 60, false],
      ["g2-confirm-1", 2, 106, 77.07, 20, false],
      ["g2-confirm-2", 2, 106, 97.07, 20.5, false],
    ]);
    // A placement of a group that fits has exactly the keys it always had, in their order.
    expect(
      student.pages[1].blocks.map((placement) => Object.keys(placement)),
    ).toEqual([
      [
        "blockId",
        "continuation",
        "column",
        "xMm",
        "yMm",
        "widthMm",
        "heightMm",
      ],
      ["blockId", "column", "xMm", "yMm", "widthMm", "heightMm"],
      ["blockId", "itemId", "column", "xMm", "yMm", "widthMm", "heightMm"],
      ["blockId", "itemId", "column", "xMm", "yMm", "widthMm", "heightMm"],
      ["blockId", "itemId", "column", "xMm", "yMm", "widthMm", "heightMm"],
    ]);
  });

  it("starts what follows 3 mm under the group's 102 mm, as before", () => {
    const { section, config, measurements } = world("answers", [
      { example: 60, confirms: [20] },
    ]);
    const after: RenderBlock = {
      id: "after",
      sourceBlockId: "after",
      unitKey: section.unitKey,
      sectionKey: section.sectionKey,
      kind: "text",
      markdown: "다음 글",
      semantic: { activity: "workedExamples" },
      editorialStage: "practice",
    };
    section.blocks.push(after);
    const result = paginateTextbookSections(
      [section],
      [
        ...measurements,
        {
          blockId: "after",
          widthMm: blockWidthMm(config, after),
          heightMm: 10,
        },
      ],
      config,
      { firstPhysicalPageIndex: 30 },
    );
    expect(result.pages).toHaveLength(1);
    expect(at(result.pages[0], "after").yMm).toBeCloseTo(61.24 + 102 + 3, 6);
  });

  it("fills a page without continuing, and continues two hundredths of a millimetre later", () => {
    // 215.76 mm of room − 12.83 mm title − 3 mm inset = 199.93 mm for the right column.
    const fits = world("answers", [
      { example: 50, confirms: [199.92] },
    ]).layout();
    expect(fits.pages).toHaveLength(1);
    expect(at(fits.pages[0], "g1-confirm-1").yMm).toBeCloseTo(77.07, 6);
    const over = world("answers", [
      { example: 50, confirms: [199.94] },
    ]).layout();
    expect(over.pages).toHaveLength(2);
    expect(at(over.pages[1], "g1-confirm-1").yMm).toBeCloseTo(74.07, 6);
    expect(at(over.pages[1], "g1-title").continuation).toBe(true);
  });
});

describe("a continued answer group directly under the activity heading", () => {
  const first = [FROZEN.groups[1]];
  it("continues where it stands: no page is left with the heading alone", () => {
    const { layout } = world("answers", first);
    const result = layout();
    expect(rows(result.pages[0])).toEqual([
      ["activity-heading", 1, 18, 23, 34.24, false],
      ["g1-title", 1, 18, 61.24, 12.83, false],
      ["g1-example", 1, 18, 74.07, 140.13, false],
    ]);
    expect(rows(result.pages[1])).toEqual([
      ["activity-heading", 1, 13, 23, 34.24, true],
      ["g1-title", 1, 13, 61.24, 12.83, true],
      ["g1-confirm-1", 2, 106, 74.07, 200.75, false],
    ]);
    expect(result.pages).toHaveLength(2);
    for (const page of result.pages)
      expect(page.blocks.some((placement) => placement.itemId)).toBe(true);
  });
  it("is rejected for students one page on, as it always was", () => {
    const error = caught(world("student", first).layout);
    expect(error.issues[0].code).toBe("EXAMPLE_GROUP_OVERFLOW");
    expect(error.issues[0].physicalPageIndex).toBe(31);
  });
  it("takes a new page first when something else stands above it", () => {
    const { section, config, measurements } = world("answers", first);
    const before: RenderBlock = {
      id: "before",
      sourceBlockId: "before",
      unitKey: section.unitKey,
      sectionKey: section.sectionKey,
      kind: "text",
      markdown: "앞 글",
      semantic: { activity: "workedExamples" },
      editorialStage: "practice",
    };
    section.blocks.splice(1, 0, before);
    const result = paginateTextbookSections(
      [section],
      [
        ...measurements,
        {
          blockId: "before",
          widthMm: blockWidthMm(config, before),
          heightMm: 10,
        },
      ],
      config,
      { firstPhysicalPageIndex: 29 },
    );
    expect(
      result.pages.map((page) => page.blocks.map((p) => p.blockId)),
    ).toEqual([
      ["activity-heading", "before"],
      ["activity-heading", "g1-title", "g1-example"],
      ["activity-heading", "g1-title", "g1-confirm-1"],
    ]);
  });
});

describe("several confirmations of one continued answer group", () => {
  const sizes = [{ example: 100, confirms: [80, 80, 80, 80, 80, 80] }];
  it("keeps as many beside the example as fit and continues the rest in order, two pages on", () => {
    const { layout } = world("answers", sizes);
    const result = layout();
    expect(result.pages).toHaveLength(3);
    // 12.83 + 3 + 80 + 80 = 175.83 fits; a third confirmation (255.83) does not.
    expect(rows(result.pages[0])).toEqual([
      ["activity-heading", 1, 18, 23, 34.24, false],
      ["g1-title", 1, 18, 61.24, 12.83, false],
      ["g1-example", 1, 18, 74.07, 100, false],
      ["g1-confirm-1", 2, 111, 77.07, 80, false],
      ["g1-confirm-2", 2, 111, 157.07, 80, false],
    ]);
    expect(rows(result.pages[1])).toEqual([
      ["activity-heading", 1, 13, 23, 34.24, true],
      ["g1-title", 1, 13, 61.24, 12.83, true],
      ["g1-confirm-3", 2, 106, 74.07, 80, false],
      ["g1-confirm-4", 2, 106, 154.07, 80, false],
    ]);
    expect(rows(result.pages[2])).toEqual([
      ["activity-heading", 1, 18, 23, 34.24, true],
      ["g1-title", 1, 18, 61.24, 12.83, true],
      ["g1-confirm-5", 2, 111, 74.07, 80, false],
      ["g1-confirm-6", 2, 111, 154.07, 80, false],
    ]);
    expect(result.pageMap.map((p) => [p.itemId, p.physicalPageIndex])).toEqual([
      ["g1-example", 29],
      ["g1-confirm-1", 29],
      ["g1-confirm-2", 29],
      ["g1-confirm-3", 30],
      ["g1-confirm-4", 30],
      ["g1-confirm-5", 31],
      ["g1-confirm-6", 31],
    ]);
  });

  it("puts the next block under the last continued part", () => {
    const { section, config, measurements } = world("answers", sizes);
    const after: RenderBlock = {
      id: "after",
      sourceBlockId: "after",
      unitKey: section.unitKey,
      sectionKey: section.sectionKey,
      kind: "text",
      markdown: "다음 글",
      semantic: { activity: "workedExamples" },
      editorialStage: "practice",
    };
    section.blocks.push(after);
    const result = paginateTextbookSections(
      [section],
      [
        ...measurements,
        {
          blockId: "after",
          widthMm: blockWidthMm(config, after),
          heightMm: 10,
        },
      ],
      config,
      { firstPhysicalPageIndex: 29 },
    );
    expect(result.pages).toHaveLength(3);
    // The last part: 12.83 + 160 = 172.83 mm, then the 3 mm that follows every group.
    expect(at(result.pages[2], "after").yMm).toBeCloseTo(61.24 + 172.83 + 3, 6);
  });
});

describe("what a continued answer group still refuses", () => {
  it("a confirmation taller than a continued page under its title", () => {
    // 215.76 − 12.83 = 202.93 mm is all a continued page has under the title.
    const fits = world("answers", [{ example: 140.13, confirms: [202.92] }]);
    expect(fits.layout().pages).toHaveLength(2);
    const { layout, section } = world("answers", [
      { example: 140.13, confirms: [202.94] },
    ]);
    const error = caught(layout);
    expect(error.issues[0].code).toBe("EXAMPLE_GROUP_OVERFLOW");
    expect(error.issues[0].path).toEqual([
      "units",
      section.unitKey,
      "sections",
      section.sectionKey,
      "blocks",
      "g1-title",
    ]);
  });

  it("an example taller than a continued page under its title", () => {
    // Beside this example a 201 mm confirmation cannot stand (3 + 201 > 202.93): it continues.
    expect(
      world("answers", [{ example: 202.92, confirms: [201] }]).layout().pages,
    ).toHaveLength(2);
    const { layout } = world("answers", [{ example: 202.94, confirms: [201] }]);
    expect(caught(layout).issues[0].code).toBe("EXAMPLE_GROUP_OVERFLOW");
  });

  it("a group one of whose members has no answer", () => {
    const { layout, section } = world("answers");
    const member = section.blocks.find((b) => b.id === "g2-example") as Problem;
    delete member.answer;
    expect(caught(layout).issues[0].code).toBe("EXAMPLE_GROUP_OVERFLOW");
  });

  it("student page references built from a continued layout", () => {
    const { layout, section, config } = world("answers");
    const error = caught(() =>
      studentPageMapFromPages([section], layout().pages, config),
    );
    expect(error.issues[0].code).toBe("STUDENT_BLOCK_REF");
    expect(error.issues[0].path).toEqual([
      "studentPages",
      31,
      "blocks",
      "g2-title",
    ]);
  });
});

describe("the pages of a continued answer group", () => {
  const group = (html: string) =>
    /<section class="tb-paired-group paired-group"[\s\S]*<\/section>/.exec(
      html,
    )![0];
  /** The block exactly as the measured block was rendered. */
  const inner = (
    model: TextbookRenderModel,
    placement: BlockPlacement,
  ): string => {
    const section = model.sections[0];
    const block = section.blocks.find((b) => b.id === placement.blockId)!;
    return renderBlockHtml(
      editorialBlock(
        placement.continuation ? { ...block, continuedPage: true } : block,
        section,
      ),
      RESOURCES,
    );
  };

  it("prints each block once with all of its markup, its item and its student page", () => {
    const { model, layout, section } = world("answers");
    const { pages } = layout();
    const html = pages.map((page) => renderPageHtml(page, model, RESOURCES));
    pages.forEach((page, index) => {
      for (const placement of page.blocks) {
        const block = inner(model, placement);
        expect(html[index].split(block).length - 1, placement.blockId).toBe(1);
        expect(
          html[index].split(`data-block-id="${placement.blockId}"`).length - 1,
        ).toBe(1);
      }
      expect((html[index].match(/data-block-id=/g) ?? []).length).toBe(
        page.blocks.length,
      );
    });
    const problems = section.blocks.filter(
      (b): b is Problem => b.kind === "problem",
    );
    const book = html.join("");
    for (const problem of problems) {
      expect(book.split(`data-item-id="${problem.itemId}"`).length - 1).toBe(1);
      const own = book.slice(book.indexOf(`data-item-id="${problem.itemId}"`));
      const answer =
        /<section class="tb-answer"[^>]*>([\s\S]*?)<\/section>/.exec(own)![1];
      expect(answer).toContain(`정답 · 문제 ${problem.sourcePageLabel}쪽`);
      expect(answer).toContain(problem.answer);
      expect(answer).toContain(problem.solution);
      const placement = pages
        .flatMap((page) => page.blocks)
        .find((p) => p.itemId === problem.itemId)!;
      expect(inner(model, placement)).toContain(
        `data-example-group="example-${problem.itemId.replace(/-confirm-\d+$/, "-example")}" data-example-role="${problem.itemId.endsWith("-example") ? "example" : "confirm"}"`,
      );
    }
    // The second group's problems refer to student page 28, where both of them are printed.
    expect(html[1]).toContain("정답 · 문제 28쪽");
    expect(html[2]).toContain("정답 · 문제 28쪽");
  });

  it("marks only the continued title, inside its group and beside nothing else", () => {
    const { model, layout } = world("answers");
    const { pages } = layout();
    const [whole, first, continued] = pages.map((page) =>
      group(renderPageHtml(page, model, RESOURCES)),
    );
    const label =
      '<small class="tb-continuation-label" data-continuation style="right:0;top:0;line-height:8.5mm">계속</small>';
    expect(whole).not.toContain("data-continuation");
    expect(first).not.toContain("data-continuation");
    expect(continued.split(label).length - 1).toBe(1);
    expect(continued.split("data-continuation").length - 1).toBe(1);
    expect(continued).toContain(
      'class="tb-block tb-continuation" data-template-key="auto-lesson-part" data-block-id="g2-title"',
    );
    // Both parts carry the group, each member its role.
    for (const part of [first, continued])
      expect(part).toContain(
        '<section class="tb-paired-group paired-group" data-example-group="example-g2-example"',
      );
    expect(first).toContain('class="tb-paired-worked worked"');
    expect(first).not.toContain('class="tb-paired-twins twins"');
    expect(first).toContain('data-example-role="example"');
    expect(continued).toContain('class="tb-paired-twins twins"');
    expect(continued).not.toContain('class="tb-paired-worked worked"');
    expect(continued).toContain(
      'data-example-role="confirm" data-confirm-index="0"',
    );
    // Columns: the example column of the first part is as tall as the example, the continued
    // column starts at the title's bottom edge, 93 mm (86 + 7) to the right of the left column.
    expect(first).toContain(
      '<div class="tb-paired-cols paired-cols" style="left:0;top:12.83mm;width:100%;height:140.13mm">',
    );
    expect(continued).toContain(
      '<div class="tb-paired-cols paired-cols" style="left:0;top:12.83mm;width:100%;height:200.75mm"><div class="tb-paired-twins twins" style="left:93mm;top:0;width:86mm;height:200.75mm">',
    );
    expect(continued).toContain(
      'data-item-id="g2-confirm-1" style="left:0mm;top:0mm;width:86mm;height:200.75mm"',
    );
  });

  it("prints a group that fits byte for byte as it was printed before", () => {
    for (const variant of ["student", "answers"] as const) {
      const { model, layout } = world(variant, [FROZEN.groups[0]]);
      const [page] = layout().pages;
      expect(page.blocks).toHaveLength(4);
      const [title, example, confirm] = page.blocks.slice(1);
      const body = (p: BlockPlacement, x: number, y: number) =>
        `<div class="tb-block" data-template-key="auto-lesson-part" data-block-id="${p.blockId}" data-activity="workedExamples"${p.itemId ? ` data-item-id="${p.itemId}"` : ""} style="left:${p.xMm - x}mm;top:${p.yMm - y}mm;width:${p.widthMm}mm;height:${p.heightMm}mm"><div class="tb-block-inner">${inner(model, p)}</div></div>`;
      const columnsTop = title.yMm + title.heightMm;
      const columnsEnd = Math.max(
        example.yMm + example.heightMm,
        confirm.yMm + confirm.heightMm,
      );
      // The markup of the group as html.ts wrote it before continuation existed.
      const legacy = `<section class="tb-paired-group paired-group" data-example-group="example-g1-example" style="left:${title.xMm - 18}mm;top:${title.yMm - title.yMm}mm;width:${title.widthMm}mm;height:${Math.max(102, columnsEnd - title.yMm)}mm">${body(title, title.xMm, title.yMm)}<div class="tb-paired-cols paired-cols" style="left:0;top:${title.heightMm}mm;width:100%;height:${columnsEnd - columnsTop}mm"><div class="tb-paired-worked worked" style="left:0;top:0;width:${example.widthMm}mm;height:${example.heightMm}mm">${body(example, example.xMm, columnsTop)}</div><div class="tb-paired-twins twins" style="left:${confirm.xMm - title.xMm}mm;top:0;width:${confirm.widthMm}mm;height:${columnsEnd - columnsTop}mm">${body(confirm, confirm.xMm, columnsTop)}</div></div></section>`;
      expect(group(renderPageHtml(page, model, RESOURCES))).toBe(legacy);
    }
  });

  it("refuses a page whose group is incomplete in any other way", () => {
    const three = [{ example: 100, confirms: [80, 80, 80] }];
    const answers = world("answers", three);
    const pages = answers.layout().pages;
    expect(pages).toHaveLength(2);
    const render = (page: TextbookPage, model = answers.model) =>
      renderPageHtml(page, model, RESOURCES);
    const without = (page: TextbookPage, ...ids: string[]): TextbookPage => ({
      ...page,
      blocks: page.blocks.filter((p) => !ids.includes(p.blockId)),
    });
    expect(() => render(pages[0])).not.toThrow();
    expect(() => render(pages[1])).not.toThrow();
    // Students and original pages never print part of a group.
    expect(() => render(pages[0], world("student", three).model)).toThrow(
      /Incomplete rendered example group/,
    );
    expect(() =>
      render(pages[0], world("answers", three, { source: true }).model),
    ).toThrow(/Incomplete rendered example group/);
    // First part: the example, then confirmations from the first one on.
    expect(() => render(without(pages[0], "g1-example"))).toThrow(
      /Incomplete rendered example group/,
    );
    expect(() => render(without(pages[0], "g1-confirm-1"))).toThrow(
      /Incomplete rendered example group/,
    );
    // Continued part: no example, at least one confirmation, none skipped.
    const moved = (blockId: string): TextbookPage => ({
      ...pages[1],
      blocks: [...pages[1].blocks, at(pages[0], blockId)],
    });
    expect(() => render(moved("g1-example"))).toThrow(
      /Incomplete rendered example group/,
    );
    expect(() => render(moved("g1-confirm-1"))).toThrow(
      /Incomplete rendered example group/,
    );
    expect(() => render(without(pages[1], "g1-confirm-3"))).toThrow(
      /Incomplete rendered example group/,
    );
    // A whole group under a title marked as a continuation is not a layout of this paginator.
    const whole = world("answers", [{ example: 60, confirms: [20] }]);
    const [page] = whole.layout().pages;
    expect(() => renderPageHtml(page, whole.model, RESOURCES)).not.toThrow();
    expect(() =>
      renderPageHtml(
        {
          ...page,
          blocks: page.blocks.map((p) =>
            p.blockId === "g1-title" ? { ...p, continuation: true } : p,
          ),
        },
        whole.model,
        RESOURCES,
      ),
    ).toThrow(/Incomplete rendered example group/);
  });
});
