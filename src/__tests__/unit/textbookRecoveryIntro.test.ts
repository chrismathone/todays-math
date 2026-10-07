// @vitest-environment node
/**
 * The automatic unit introduction, judged against the frozen parent source without a browser:
 * the production writer, projection, paginator and page renderer for all 72 chapters on an even
 * and on an odd start, the longest chapter, partial ranges, and the manual even-left rule.
 *
 * jsdom has no layout. Heights here are stated measurements, so these tests prove what is placed
 * and printed, not that it fits: real heights, overlap and the art are judged in Chromium by
 * `scripts/qa/textbook/recovery/intro-proof.ts`. The single page is a complete replacement page;
 * nothing here calls it equal to the original spread.
 */
import { createRequire } from "node:module";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { TextbookExchange } from "@/contracts/textbookExchange.contract";
import { textbookSemanticNodeSchema } from "@/contracts/textbookSemantic.contract";
import { sectionTitleTex } from "@/lib/concept-blank/sections";
import {
  blockWidthMm,
  paginateTextbookSections,
  TextbookLayoutError,
  type TextbookLayout,
} from "@/lib/textbook/layout/paginate";
import { renderPageHtml } from "@/lib/textbook/render/html";
import {
  createTextbookRenderModel,
  type RenderBlock,
  type TextbookRenderModel,
} from "@/lib/textbook/render/model";
import { unitOpeningById, unitOpenings } from "@/lib/textbook/unitOpenings";
import {
  allIntroBooks,
  expectedIntro,
  INTRO_DOM_PROBE,
  INTRO_HEIGHT_MM,
  INTRO_TOP_MM,
  introBook,
  introNode,
  lfSha256,
  parentSourceDigest,
  partialCases,
  PLAN_FILE,
  PLAN_SHA256,
  squash,
  verifyIntro,
  writeIntroSection,
  type CapturedIntroPage,
  type IntroCase,
  type IntroFailure,
  type MeasuredForms,
} from "../../../scripts/qa/textbook/recovery/intro-proof";

const { JSDOM } = createRequire(import.meta.url)("jsdom") as {
  JSDOM: new (html: string) => { window: { document: Document } };
};
const probe = new Function(`return ${INTRO_DOM_PROBE}`)() as (
  document: Document,
) => CapturedIntroPage[];
const resources = {
  assetUrl: (): string => {
    throw new Error("An introduction holds no stored asset");
  },
  qrDataUrl: (): string => {
    throw new Error("An introduction holds no QR");
  },
};

type Heights = {
  left: number;
  right: number;
  single: number;
  other: number;
  /** What the renderer's left-face text check reports; absent when it was not run. */
  leftTextFits?: boolean;
};
const FITS: Heights = { left: 254, right: 200, single: 230, other: 20 };
const heightOf = (block: RenderBlock, heights: Heights) =>
  block.unitIntroPart ? heights[block.unitIntroPart] : heights.other;

interface Laid {
  model: TextbookRenderModel;
  layout: TextbookLayout;
  html: string;
  pages: CapturedIntroPage[];
  /** The stated heights of the three forms, as the renderer would have measured them. */
  measured: MeasuredForms;
}
/** The production projection, paginator and page markup over stated block heights. */
function lay(
  exchange: TextbookExchange,
  sectionIndices: number[],
  start: number,
  heights: Partial<Heights> = {},
  options: { maxPages?: number; drop?: (block: RenderBlock) => boolean } = {},
): Laid {
  const whole = createTextbookRenderModel(exchange, "student");
  const model = {
    ...whole,
    sections: sectionIndices.map((index) => whole.sections[index]),
  };
  const all = { ...FITS, ...heights };
  const layout = paginateTextbookSections(
    model.sections,
    model.sections
      .flatMap((section) => section.blocks)
      .filter((block) => !options.drop?.(block))
      .map((block) => ({
        blockId: block.id,
        widthMm: blockWidthMm(model.config, block),
        heightMm: heightOf(block, all),
        ...(block.unitIntroPart === "left" && all.leftTextFits !== undefined
          ? { introTextFits: all.leftTextFits }
          : {}),
      })),
    model.config,
    { firstPhysicalPageIndex: start, maxPages: options.maxPages ?? 32 },
  );
  const html = layout.pages
    .map((page) => renderPageHtml(page, model, resources))
    .join("");
  return { model, layout, html, pages: read(html), measured: all };
}
const read = (html: string) =>
  probe(new JSDOM(`<body>${html}</body>`).window.document);
const codeOf = (run: () => unknown): string => {
  try {
    run();
  } catch (error) {
    if (error instanceof TextbookLayoutError) return error.issues[0].code;
    throw error;
  }
  return "placed";
};
const rules = (failures: IntroFailure[]) => [
  ...new Set(failures.map((failure) => `${failure.rule}/${failure.anchor}`)),
];

const longest: IntroCase = {
  caseId: "m1-03",
  opening: unitOpeningById("m1-03")!,
};
const before = parentSourceDigest();
afterAll(() => {
  // Writing, projecting and printing every chapter leaves the parent source as it was.
  expect(parentSourceDigest()).toEqual(before);
});

describe("frozen parent source of the introductions", () => {
  it("is 72 chapters and 360 sections in 14 books, and the approved plan is unchanged", () => {
    expect(unitOpenings()).toHaveLength(72);
    expect(
      unitOpenings().reduce((sum, opening) => sum + opening.sections.length, 0),
    ).toBe(360);
    const books = allIntroBooks();
    expect(books).toHaveLength(14);
    expect(books.map((book) => book.cases.length)).toEqual([
      6, 6, 6, 6, 6, 6, 6, 6, 4, 4, 4, 5, 4, 3,
    ]);
    expect(longest.opening.sections).toHaveLength(13);
    expect(
      Math.max(...unitOpenings().map((opening) => opening.sections.length)),
    ).toBe(13);
    expect(lfSha256(PLAN_FILE)).toBe(PLAN_SHA256);
  });

  it("cannot be changed through the catalogue or through a written node", () => {
    const opening = unitOpenings()[0];
    expect(() => {
      (opening.sections as unknown as unknown[]).push({});
    }).toThrow(TypeError);
    expect(() => {
      (opening as { question: string }).question = "바꾼 물음";
    }).toThrow(TypeError);
    const block = writeIntroSection({ caseId: opening.id, opening }, "u-x")
      .blocks[0];
    const node = block.semantic!.node!;
    if (node.kind !== "unitIntro") throw new Error("unitIntro node expected");
    expect(Object.isFrozen(node.goals)).toBe(false);
    node.goals.push("원고에 없는 목표");
    node.path.length = 0;
    node.provenance!.sourceHashes.length = 0;
    expect(parentSourceDigest()).toEqual(before);
    expect(opening.sections.map((section) => section.goal)).not.toContain(
      "원고에 없는 목표",
    );
  });
});

describe("writer and projection for all 72 chapters", () => {
  it("writes every goal, path step, key phrase, check and date of the whole chapter with its provenance", () => {
    let goals = 0;
    let withMath = 0;
    for (const book of allIntroBooks())
      for (const introCase of book.cases) {
        const { opening } = introCase;
        const section = writeIntroSection(introCase, `u-${opening.id}`);
        expect(section.templateKey).toBe("auto-unit-intro");
        expect(section.startPolicy).toBe("continue");
        expect(section.blocks).toHaveLength(1);
        const node = textbookSemanticNodeSchema.parse(
          section.blocks[0].semantic!.node,
        );
        if (node.kind !== "unitIntro") throw new Error(opening.id);
        expect(node.goals).toEqual(opening.sections.map((s) => s.goal));
        expect(node.path).toEqual(
          opening.sections.map((s) => sectionTitleTex(s.title)),
        );
        expect(node.question).toBe(opening.question);
        expect(node.explanation).toBe(opening.explanation);
        expect(node.keyPhrase).toBe(opening.keyPhrase);
        expect(node.check).toEqual(opening.check.map((prompt) => prompt.text));
        expect(node.check).toHaveLength(2);
        expect(node.dateLabel).toBe("공부를 시작한 날");
        expect(node.provenance).toEqual({
          origin: "bank-derived",
          sourceHash: opening.provenance.sourceHash,
          sourceConceptIds: opening.sections.flatMap((s) => s.conceptIds),
          sourceHashes: opening.sections.map((s) => s.sourceHash),
          editor: opening.provenance.editor,
          reviewer: opening.provenance.reviewer,
          status: "AI 검수",
          humanReview: false,
        });
        goals += node.goals.length;
        withMath += node.path.filter((step) => step.includes("$")).length;
      }
    expect(goals).toBe(360);
    // Section names with units are typeset: the formula path of the page text is exercised.
    expect(withMath).toBe(8);
  });

  it("projects one written block into exactly the left, right and single measured forms", () => {
    for (const book of allIntroBooks()) {
      const model = createTextbookRenderModel(introBook(book.cases), "student");
      expect(model.sections).toHaveLength(book.cases.length);
      model.sections.forEach((section, index) => {
        expect(section.blocks.map((block) => block.unitIntroPart)).toEqual([
          "left",
          "right",
          "single",
        ]);
        const source = section.blocks[0].sourceBlockId;
        expect(section.blocks.map((block) => block.id)).toEqual([
          `${source}.intro-left`,
          `${source}.intro-right`,
          `${source}.intro-single`,
        ]);
        for (const block of section.blocks) {
          expect(block.kind).toBe("text");
          expect(block.unitNumber).toBe(index + 1);
          expect(block.editorialStage).toBe("unit");
        }
      });
    }
  });
});

describe("all 72 chapters on an even and on an odd start", () => {
  it("prints the spread on an even start and the complete single page on an odd start, with nothing omitted or added", () => {
    const failures: Array<IntroFailure & { start: number }> = [];
    let renders = 0;
    let pages = 0;
    let goals = 0;
    const layouts: Record<string, number> = {};
    for (const book of allIntroBooks()) {
      const exchange = introBook(book.cases);
      book.cases.forEach((introCase, unitIndex) => {
        const expected = expectedIntro(introCase, unitIndex + 1);
        for (const start of [2, 3]) {
          const laid = lay(exchange, [unitIndex], start);
          renders++;
          pages += laid.pages.length;
          goals += laid.pages.reduce((sum, page) => sum + page.goals.length, 0);
          const parts = laid.pages.map((page) => page.part).join("+");
          layouts[parts] = (layouts[parts] ?? 0) + 1;
          for (const failure of verifyIntro(expected, laid.pages, {
            firstPhysicalPageIndex: start,
            issues: laid.layout.issues,
            geometry: false,
            node: introNode(exchange, unitIndex),
            measured: laid.measured,
          }))
            failures.push({ ...failure, start });
        }
      });
    }
    expect(failures).toEqual([]);
    expect(renders).toBe(144);
    expect(layouts).toEqual({ "left+right": 72, single: 72 });
    expect(pages).toBe(216);
    expect(goals).toBe(720);
    // 144 renders take about 10s alone and 21–27s beside other heavy files — past the default 20s.
  }, 60_000);

  it("places a spread at 16mm as two 254mm faces and a single page at its measured height", () => {
    const exchange = introBook([longest]);
    const spread = lay(exchange, [0], 2);
    expect(spread.layout.issues).toEqual([]);
    expect(spread.layout.nextPhysicalPageIndex).toBe(4);
    expect(
      spread.layout.pages.map((page) => ({
        index: page.physicalPageIndex,
        label: page.printedPageLabel,
        kind: page.kind,
        stage: page.editorialStage,
        blocks: page.blocks.map((block) => ({
          part: block.blockId.split(".intro-")[1],
          xMm: block.xMm,
          yMm: block.yMm,
          widthMm: block.widthMm,
          heightMm: block.heightMm,
        })),
      })),
    ).toEqual([
      {
        index: 2,
        label: "2",
        kind: "content",
        stage: "unit",
        blocks: [
          {
            part: "left",
            xMm: 16,
            yMm: INTRO_TOP_MM,
            widthMm: 176,
            heightMm: INTRO_HEIGHT_MM,
          },
        ],
      },
      {
        index: 3,
        label: "3",
        kind: "content",
        stage: "unit",
        blocks: [
          {
            part: "right",
            xMm: 18,
            yMm: INTRO_TOP_MM,
            widthMm: 176,
            heightMm: INTRO_HEIGHT_MM,
          },
        ],
      },
    ]);
    const single = lay(exchange, [0], 3, { single: 224.23 });
    expect(single.layout.nextPhysicalPageIndex).toBe(4);
    expect(single.layout.pages).toHaveLength(1);
    expect(single.layout.pages[0].blocks).toEqual([
      expect.objectContaining({ xMm: 18, yMm: INTRO_TOP_MM, heightMm: 224.23 }),
    ]);
    expect(single.layout.issues).toEqual([
      expect.objectContaining({
        code: "AUTO_INTRO_SINGLE_PAGE",
        severity: "warning",
        physicalPageIndex: 3,
        message:
          "홀수 시작 쪽이므로 도입의 질문·설명·목표·학습 순서·출발점을 한 쪽에 함께 배치했습니다.",
      }),
    ]);
  });

  it("never pads: every start page from 2 to 9 yields exactly the introduction pages", () => {
    const exchange = introBook([longest]);
    for (let start = 2; start <= 9; start++) {
      const { layout } = lay(exchange, [0], start);
      expect(layout.pages.map((page) => page.physicalPageIndex)).toEqual(
        start % 2 === 0 ? [start, start + 1] : [start],
      );
      for (const page of layout.pages) expect(page.blocks).toHaveLength(1);
    }
  });
});

describe("the longest chapter and measured heights", () => {
  const exchange = introBook([longest]);
  const expected = expectedIntro(longest, 1);

  it("keeps all 13 goals and 13 path steps in both layouts", () => {
    for (const start of [2, 3]) {
      const { pages } = lay(exchange, [0], start);
      const holder = pages.find((page) => page.goals.length)!;
      expect(holder.goals).toEqual(expected.goals.map(squash));
      expect(holder.path).toEqual(expected.path.map(squash));
      expect(holder.goals).toHaveLength(13);
    }
  });

  it("falls back to the complete single page, with its warning, when the right face of an even start is too tall", () => {
    // About 300mm is what Chromium measures for the right face of this chapter.
    const laid = lay(exchange, [0], 2, { right: 300.2, single: 224.23 });
    expect(laid.pages.map((page) => page.part)).toEqual(["single"]);
    expect(laid.layout.issues.map((issue) => issue.message)).toEqual([
      "두 쪽 도입의 측정 공간이 부족하여 같은 전체 내용을 한 쪽에 함께 배치했습니다.",
    ]);
    // Required behaviour: the measured right face does not fit, so the complete page is right.
    expect(
      verifyIntro(expected, laid.pages, {
        firstPhysicalPageIndex: 2,
        issues: laid.layout.issues,
        geometry: false,
        measured: laid.measured,
      }),
    ).toEqual([]);
    // The same page is wrong where the measured spread fits, or where no measurement excuses it.
    for (const measured of [{ ...laid.measured, right: 245.9 }, undefined])
      expect(
        rules(
          verifyIntro(expected, laid.pages, {
            firstPhysicalPageIndex: 2,
            geometry: false,
            ...(measured ? { measured } : {}),
          }),
        ),
      ).toEqual(["layout-choice/pages"]);
    // And a spread is wrong where its right face was measured too tall.
    expect(
      rules(
        verifyIntro(expected, lay(exchange, [0], 2).pages, {
          firstPhysicalPageIndex: 2,
          geometry: false,
          measured: laid.measured,
        }),
      ),
    ).toEqual(["layout-choice/pages"]);
  });

  it("falls back to the complete single page when the text of the fixed left face leaves its slots", () => {
    const laid = lay(exchange, [0], 2, { leftTextFits: false });
    expect(laid.pages.map((page) => page.part)).toEqual(["single"]);
    expect(laid.layout.issues.map((issue) => issue.code)).toEqual([
      "AUTO_INTRO_SINGLE_PAGE",
    ]);
    expect(
      verifyIntro(expected, laid.pages, {
        firstPhysicalPageIndex: 2,
        issues: laid.layout.issues,
        geometry: false,
        measured: laid.measured,
      }),
    ).toEqual([]);
    // A left face reported as fitting, or not reported at all, keeps the spread.
    for (const leftTextFits of [true, undefined])
      expect(
        lay(exchange, [0], 2, { leftTextFits }).pages.map((page) => page.part),
      ).toEqual(["left", "right"]);
    // With the left text out of its slots and no single page that fits, nothing is printed.
    expect(
      codeOf(() => lay(exchange, [0], 2, { leftTextFits: false, single: 260 })),
    ).toBe("AUTO_INTRO_OVERFLOW");
  });

  it("rejects an introduction that fits neither layout instead of cutting or shrinking it", () => {
    const tall = { right: 300, single: 254.01 };
    expect(codeOf(() => lay(exchange, [0], 2, tall))).toBe(
      "AUTO_INTRO_OVERFLOW",
    );
    expect(codeOf(() => lay(exchange, [0], 3, tall))).toBe(
      "AUTO_INTRO_OVERFLOW",
    );
    expect(codeOf(() => lay(exchange, [0], 3, { single: 254 }))).toBe("placed");
    // A measurement that is missing, empty or of another width never becomes a placed page.
    for (const single of [0, Number.NaN, Number.POSITIVE_INFINITY, -1])
      expect(codeOf(() => lay(exchange, [0], 3, { single }))).toBe(
        "AUTO_INTRO_OVERFLOW",
      );
    expect(
      codeOf(() =>
        lay(
          exchange,
          [0],
          3,
          {},
          {
            drop: (block) => block.unitIntroPart === "single",
          },
        ),
      ),
    ).toBe("AUTO_INTRO_OVERFLOW");
    const whole = createTextbookRenderModel(exchange, "student");
    expect(
      codeOf(() =>
        paginateTextbookSections(
          whole.sections,
          whole.sections[0].blocks.map((block) => ({
            blockId: block.id,
            widthMm: 100,
            heightMm: 200,
          })),
          whole.config,
          { firstPhysicalPageIndex: 3 },
        ),
      ),
    ).toBe("AUTO_INTRO_OVERFLOW");
  });

  it("keeps the renderer's page bound and rejects a foreign block in the section", () => {
    expect(codeOf(() => lay(exchange, [0], 2, {}, { maxPages: 1 }))).toBe(
      "PAGE_LIMIT",
    );
    expect(codeOf(() => lay(exchange, [0], 3, {}, { maxPages: 1 }))).toBe(
      "placed",
    );
    const extra = structuredClone(exchange);
    extra.units[0].sections[0].blocks.push({
      blockId: "added-text",
      kind: "text",
      markdown: "끼워 넣은 글.",
    });
    expect(codeOf(() => lay(extra, [0], 2))).toBe("AUTO_INTRO_SOURCE");
  });
});

describe("partial selected range", () => {
  it("prints exactly the selected goals and path steps in catalogue order, in both layouts", () => {
    const counts: Record<string, number> = {};
    for (const introCase of partialCases()) {
      const exchange = introBook([introCase]);
      const expected = expectedIntro(introCase, 1);
      counts[introCase.caseId] = expected.goals.length;
      expect(expected.unselectedGoals.length).toBe(
        introCase.opening.sections.length - expected.goals.length,
      );
      const node = textbookSemanticNodeSchema.parse(introNode(exchange, 0));
      if (node.kind !== "unitIntro") throw new Error(introCase.caseId);
      expect(node.provenance!.sourceHashes).toEqual(expected.sourceHashes);
      expect(node.provenance!.sourceConceptIds).toEqual(
        expected.sourceConceptIds,
      );
      // The chapter hash still names the whole frozen chapter.
      expect(node.provenance!.sourceHash).toBe(expected.sourceHash);
      for (const start of [2, 3]) {
        const laid = lay(exchange, [0], start);
        expect(
          verifyIntro(expected, laid.pages, {
            firstPhysicalPageIndex: start,
            issues: laid.layout.issues,
            geometry: false,
            node: introNode(exchange, 0),
          }),
        ).toEqual([]);
        for (const goal of expected.unselectedGoals)
          expect(laid.html).not.toContain(goal);
      }
    }
    expect(counts).toEqual({
      "m1-03.partial-3to7": 5,
      "m1-03.partial-first": 1,
      "e3-1-6.partial-2of7": 2,
    });
  });

  it("follows the catalogue, not the request order, and refuses a section the chapter does not have", () => {
    const sections = longest.opening.sections;
    const reversed = introBook([
      {
        caseId: "m1-03.reversed",
        opening: longest.opening,
        selected: [sections[6].title, sections[2].title, sections[6].title],
      },
    ]);
    const node = introNode(reversed, 0) as { goals: string[] };
    expect(node.goals).toEqual([sections[2].goal, sections[6].goal]);
    expect(() =>
      introBook([
        {
          caseId: "m1-03.unknown",
          opening: longest.opening,
          selected: [sections[0].title, "이 단원에 없는 소단원"],
        },
      ]),
    ).toThrow("선택 범위의 단원 도입 원고를 찾을 수 없습니다.");
  });
});

describe("manual even-left stays strict", () => {
  const manual = (
    sectionKey: string,
    startPolicy: "even-left" | "continue",
  ): TextbookExchange["units"][number]["sections"][number] => ({
    sectionKey,
    title: "수동 구획",
    templateKey: "guide",
    startPolicy,
    blocks: [
      { blockId: `${sectionKey}-text`, kind: "text", markdown: "수동 원고." },
    ],
  });

  it("fails a manual even-left section on an odd page and inserts no blank page", () => {
    const first = introBook([longest], () => ({
      before: [manual("manual", "even-left")],
    }));
    expect(codeOf(() => lay(first, [0], 3))).toBe("SECTION_PARITY");
    expect(codeOf(() => lay(first, [0], 2))).toBe("placed");
    // Spread on 2–3, a one-page section on 4, then the strict section would start on 5.
    const after = introBook([longest], () => ({
      after: [manual("filler", "continue"), manual("strict", "even-left")],
    }));
    expect(codeOf(() => lay(after, [0, 1, 2], 2))).toBe("SECTION_PARITY");
  });

  it("lets a manual even-left section follow either introduction layout on the even page it leaves", () => {
    const book = introBook([longest], () => ({
      after: [manual("strict", "even-left")],
    }));
    for (const start of [2, 3]) {
      const { layout } = lay(book, [0, 1], start);
      const strict = layout.pages.find((page) => page.sectionKey === "strict")!;
      expect(strict.physicalPageIndex).toBe(4);
      expect(layout.pages.map((page) => page.physicalPageIndex)).toEqual(
        start === 2 ? [2, 3, 4] : [3, 4],
      );
    }
  });
});

describe("negative controls: the verifier fails what it must", () => {
  const exchange = introBook([longest]);
  const expected = expectedIntro(longest, 1);
  const judge = (html: string, start: number, node?: unknown) =>
    rules(
      verifyIntro(expected, read(html), {
        firstPhysicalPageIndex: start,
        geometry: false,
        ...(node === undefined ? {} : { node }),
      }),
    );
  // Laid out inside the tests: a broken layout must fail a test, not the collection of the file.
  let spread = "";
  let single = "";
  beforeAll(() => {
    spread = lay(exchange, [0], 2).html;
    single = lay(exchange, [0], 3).html;
  });
  /** A page mutant must change the page; a mutant that changes nothing proves nothing. */
  const mutate = (html: string, from: RegExp | string, to: string) => {
    const mutated = html.replace(from, () => to);
    expect(mutated).not.toBe(html);
    return mutated;
  };

  it("passes the unmutated pages", () => {
    expect(judge(spread, 2, introNode(exchange, 0))).toEqual([]);
    expect(judge(single, 3, introNode(exchange, 0))).toEqual([]);
  });

  it("fails a dropped goal and names the place", () => {
    const dropped = structuredClone(exchange);
    const node = introNode(dropped, 0) as { goals: string[] };
    const [gone] = node.goals.splice(6, 1);
    for (const start of [2, 3]) {
      const failures = verifyIntro(expected, lay(dropped, [0], start).pages, {
        firstPhysicalPageIndex: start,
        geometry: false,
      });
      expect(rules(failures)).toEqual(
        expect.arrayContaining(["count/goals", "no-filler/intro-text"]),
      );
      const count = failures.find((failure) => failure.rule === "count")!;
      expect(count.detail).toBe("지면 12개 ≠ 원천 13개");
      expect(count.page).toBe(3);
      expect(
        failures.find((failure) => failure.anchor === "goals[6]")!.detail,
      ).toContain(squash(gone));
    }
  });

  it("fails a dropped path step, a dropped check and an added sentence", () => {
    for (const [edit, wanted] of [
      [(node: IntroNodeLike) => node.path.pop(), "count/path"],
      [(node: IntroNodeLike) => node.check.pop(), "count/check"],
      [
        (node: IntroNodeLike) => node.goals.push("채워 넣은 문장."),
        "count/goals",
      ],
      [
        (node: IntroNodeLike) => (node.keyPhrase = undefined),
        "retained-once/key",
      ],
      [
        (node: IntroNodeLike) => (node.question += " 덧붙인 말"),
        "text-equal/question",
      ],
    ] as const) {
      const edited = structuredClone(exchange);
      edit(introNode(edited, 0) as IntroNodeLike);
      for (const start of [2, 3])
        expect(
          rules(
            verifyIntro(expected, lay(edited, [0], start).pages, {
              firstPhysicalPageIndex: start,
              geometry: false,
            }),
          ),
        ).toEqual(expect.arrayContaining([wanted, "no-filler/intro-text"]));
    }
  });

  it("fails missing art, a wrong illustration, a missing date and a missing key", () => {
    const art =
      /<figure><img [^>]*data-textbook-editorial-image[^>]*><\/figure>/;
    for (const [html, start] of [
      [spread, 2],
      [single, 3],
    ] as const) {
      expect(judge(mutate(html, art, ""), start)).toEqual([
        "retained-once/art",
      ]);
      expect(
        judge(
          mutate(
            html,
            "/textbook/editorial/u01.png",
            "/textbook/editorial/u02.png",
          ),
          start,
        ),
      ).toEqual(["art-loaded/art"]);
      expect(
        judge(
          mutate(html, /<div class="tb-intro-date">[\s\S]*?<\/div>/, ""),
          start,
        ),
      ).toEqual(
        expect.arrayContaining(["retained-once/date", "no-filler/intro-text"]),
      );
      expect(
        judge(
          mutate(html, /<div class="tb-intro-key">[\s\S]*?<\/div>/, ""),
          start,
        ),
      ).toEqual(
        expect.arrayContaining(["retained-once/key", "no-filler/intro-text"]),
      );
      expect(
        judge(mutate(html, '<div class="tb-semantic-line"></div>', ""), start),
      ).toEqual(["writing-space/check[0]"]);
      expect(
        judge(
          mutate(
            html,
            "<h3>나의 출발점</h3>",
            "<h3>나의 출발점</h3><p>빈 곳을 채운 글</p>",
          ),
          start,
        ),
      ).toEqual(["no-filler/intro-text"]);
    }
  });

  it("fails a layout that does not belong to its start page and a repeated part", () => {
    // The pages keep their own numbers; the claimed start page is what is wrong.
    expect(judge(single, 2)).toEqual(
      expect.arrayContaining(["layout-choice/pages", "page-order/paper"]),
    );
    expect(judge(spread, 3)).toEqual(
      expect.arrayContaining(["layout-choice/pages", "page-order/paper"]),
    );
    expect(judge(spread + single, 2)).toEqual(
      expect.arrayContaining(["layout-choice/pages", "retained-once/question"]),
    );
  });

  it("fails an unselected goal on the page, a printed hash and a changed provenance", () => {
    const partial = partialCases()[0];
    const partialExpected = expectedIntro(partial, 1);
    // The whole chapter printed where only five sections were selected.
    expect(
      rules(
        verifyIntro(partialExpected, read(single), {
          firstPhysicalPageIndex: 3,
          geometry: false,
        }),
      ),
    ).toEqual(expect.arrayContaining(["count/goals", "selected-range/goals"]));
    expect(
      judge(
        mutate(
          single,
          "<h3>나의 출발점</h3>",
          `<h3>나의 출발점</h3><i>${expected.sourceHash}</i>`,
        ),
        3,
      ),
    ).toEqual(expect.arrayContaining(["no-filler/provenance"]));

    const tampered = structuredClone(introNode(exchange, 0)) as IntroNodeLike;
    tampered.provenance.sourceHash = "0".repeat(64);
    expect(judge(single, 3, tampered)).toEqual(["source-hash/node.provenance"]);
    const reviewed = structuredClone(introNode(exchange, 0)) as IntroNodeLike;
    reviewed.provenance.humanReview = true;
    expect(judge(single, 3, reviewed)).toEqual(["source-hash/node"]);
    const malformed = structuredClone(introNode(exchange, 0)) as IntroNodeLike;
    malformed.provenance.sourceHash = "not-a-hash";
    expect(textbookSemanticNodeSchema.safeParse(malformed).success).toBe(false);
    expect(judge(single, 3, malformed)).toEqual(["source-hash/node"]);
    const partialNode = structuredClone(
      introNode(exchange, 0),
    ) as IntroNodeLike;
    partialNode.provenance.sourceHashes.pop();
    expect(judge(single, 3, partialNode)).toEqual([
      "source-hash/node.provenance",
    ]);
  });
});

interface IntroNodeLike {
  question: string;
  keyPhrase?: string;
  goals: string[];
  path: string[];
  check: string[];
  provenance: {
    sourceHash: string;
    sourceHashes: string[];
    humanReview: boolean;
  };
}
