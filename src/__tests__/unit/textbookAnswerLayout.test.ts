// @vitest-environment jsdom
/**
 * The answer variant sets an ordinary one-column problem across the row, its answer beside the
 * question, so a tall question and its solution never stack in one column. Nothing of the
 * student variant, the saved layout or the page labels changes. All text here is synthetic.
 */
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { canonicalJson } from "@/lib/textbook/canonical";
import {
  A4,
  blockWidthMm,
  paginateTextbookSections,
  studentPageMapFromPages,
} from "@/lib/textbook/layout/paginate";
import {
  ANSWER_CASE_COLUMN_GAP_MM,
  ANSWER_CASE_GRID_STYLE,
  answerCaseLayout,
} from "@/lib/textbook/render/answerLayout";
import { renderBlockHtml } from "@/lib/textbook/render/html";
import {
  createTextbookRenderModel,
  type RenderBlock,
} from "@/lib/textbook/render/model";
import { textbookFixture } from "../helpers/textbookFixture";

const resources = {
  assetUrl: (id: string) => `/assets/${id}.png`,
  qrDataUrl: () => "data:image/png;base64,AA==",
};
const parse = (html: string) =>
  new DOMParser().parseFromString(html, "text/html");
const render = (block: RenderBlock) => renderBlockHtml(block, resources);
type Problem = Extract<RenderBlock, { kind: "problem" }>;
const problems = (model: ReturnType<typeof createTextbookRenderModel>) =>
  model.sections
    .flatMap((section) => section.blocks)
    .filter((block): block is Problem => block.kind === "problem");
const layout = {
  columnSpan: 1 as const,
  minWorkLines: 2,
  preferredWorkLines: 3,
  maxWorkLines: 10,
  keepTogether: true,
};

describe("which problems take the row in the answer variant", () => {
  it("moves an ordinary one-column problem across the row, answer beside the question", () => {
    const stored = { ...layout };
    const result = answerCaseLayout(stored, { activity: "practice" } as never);
    expect(result).toEqual({
      layout: { ...layout, columnSpan: 2 },
      placement: "beside",
    });
    // The stored layout object is not the one that changed.
    expect(stored).toEqual(layout);
  });

  it("leaves a block without semantic metadata exactly as it was saved", () => {
    // A manuscript saved before semantic metadata keeps the answer book it has always had.
    const result = answerCaseLayout(layout, undefined);
    expect(result).toEqual({ layout });
    expect(result.layout).toBe(layout);
    expect("placement" in result).toBe(false);
  });

  it("leaves a linked example group, an original page and a wide problem as they are", () => {
    const group = {
      node: {
        kind: "exampleGroup" as const,
        groupId: "g1",
        title: "대표예제",
        strategy: "같은 유형",
        exampleItemId: "item-0",
        confirmItemIds: ["item-1"],
      },
    };
    const source = {
      source: { unit: "U01", page: 24, kind: "paired", path: "pages[23]" },
    };
    for (const semantic of [group, source]) {
      const result = answerCaseLayout(layout, semantic);
      expect(result.placement).toBeUndefined();
      expect(result.layout).toBe(layout);
    }
    const wide = { ...layout, columnSpan: 2 as const };
    const result = answerCaseLayout(wide, { activity: "written" } as never);
    expect(result.placement).toBeUndefined();
    expect(result.layout).toBe(wide);
  });

  it("keeps the gap of the page's own two columns between the halves", () => {
    expect(ANSWER_CASE_COLUMN_GAP_MM).toBe(A4.columnGapMm);
    expect(ANSWER_CASE_GRID_STYLE).toBe(
      "display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:7mm;align-items:start",
    );
  });
});

describe("the render model", () => {
  const exchange = () => {
    const fixture = textbookFixture(1, 5);
    const blockOf = (index: number) =>
      fixture.units[0].sections[0].blocks.find(
        (b) => b.kind === "problem" && b.itemId === fixture.items[index].itemId,
      )!;
    // Two ordinary problems of a manuscript with semantic metadata (one with no writing
    // space), a wide written one, a linked pair, and a fifth saved without any metadata.
    blockOf(0).semantic = { activity: "practice" };
    blockOf(1).semantic = { activity: "basicCheck" };
    blockOf(2).semantic = { activity: "written" };
    fixture.items[1].layout = {
      ...fixture.items[1].layout,
      minWorkLines: 0,
      preferredWorkLines: 0,
      maxWorkLines: 0,
    };
    fixture.items[2].layout = { ...fixture.items[2].layout, columnSpan: 2 };
    blockOf(3).semantic = {
      activity: "workedExamples",
      node: {
        kind: "exampleGroup",
        groupId: "pair-1",
        title: "대표예제",
        strategy: "같은 유형",
        exampleItemId: fixture.items[3].itemId,
        confirmItemIds: [fixture.items[0].itemId],
      },
    };
    fixture.pageMap = fixture.items.map((item, i) => ({
      itemId: item.itemId,
      physicalPageIndex: 2 + (i >> 1),
      printedPageLabel: String(2 + (i >> 1)),
      column: ((i % 2) + 1) as 1 | 2,
    }));
    return fixture;
  };

  it("leaves the student variant exactly as the saved layout says", () => {
    const fixture = exchange();
    const before = canonicalJson(fixture);
    const student = problems(createTextbookRenderModel(fixture, "student"));
    expect(student).toHaveLength(5);
    student.forEach((block, i) => {
      // The very layout object of the item: nothing derived, nothing copied.
      expect(block.layout).toBe(fixture.items[i].layout);
      expect(block.answerPlacement).toBeUndefined();
      expect(block.answer).toBeUndefined();
      expect("answerPlacement" in block).toBe(false);
    });
    // The fixture page is 176mm wide between its margins: two 84.5mm columns and a 7mm gap.
    expect(student.map((b) => blockWidthMm(fixture.config, b))).toEqual([
      84.5, 84.5, 176, 84.5, 84.5,
    ]);
    expect(canonicalJson(fixture)).toBe(before);
  });

  it("sets ordinary one-column problems across the row in the answer variant only", () => {
    const fixture = exchange();
    const before = canonicalJson(fixture);
    const answers = problems(createTextbookRenderModel(fixture, "answers"));
    expect(
      answers.map((b) => [b.layout.columnSpan, b.answerPlacement ?? null]),
    ).toEqual([
      [2, "beside"],
      [2, "beside"],
      // Already wide: its question keeps the width it was written for.
      [2, null],
      // A linked pair keeps its own columns.
      [1, null],
      // No semantic metadata: the answer stays stacked in the student's column.
      [1, null],
    ]);
    expect(answers[2].layout).toBe(fixture.items[2].layout);
    expect(answers[3].layout).toBe(fixture.items[3].layout);
    expect(answers[4].layout).toBe(fixture.items[4].layout);
    expect("answerPlacement" in answers[4]).toBe(false);
    // Everything else of the saved layout is carried over, the legacy zero included.
    expect(answers[0].layout).toEqual({
      ...fixture.items[0].layout,
      columnSpan: 2,
    });
    expect(answers[1].layout.preferredWorkLines).toBe(0);
    expect(answers[1].layout.minWorkLines).toBe(0);
    // The saved items and the exchange are untouched.
    expect(fixture.items.map((item) => item.layout.columnSpan)).toEqual([
      1, 1, 2, 1, 1,
    ]);
    expect(canonicalJson(fixture)).toBe(before);
  });

  it("keeps the student page label, the QR and the content of every answer", () => {
    const fixture = exchange();
    const student = problems(createTextbookRenderModel(fixture, "student"));
    const answers = problems(createTextbookRenderModel(fixture, "answers"));
    answers.forEach((block, i) => {
      expect(block.sourcePageLabel).toBe(fixture.pageMap[i].printedPageLabel);
      expect(block.sourcePageLabel).toBe(student[i].sourcePageLabel);
      expect(block.qr).toEqual(student[i].qr);
      expect(block.content).toBe(student[i].content);
      expect(block.displayNumber).toBe(student[i].displayNumber);
      expect(block.answer).toBe(fixture.snapshots[i].payload.answer);
      expect(block.solution).toBe(fixture.snapshots[i].payload.solution);
    });
  });
});

describe("the printed answer case", () => {
  const base = {
    id: "p1",
    sourceBlockId: "p1",
    unitKey: "U09",
    sectionKey: "s1",
    kind: "problem" as const,
    itemId: "item-1",
    displayNumber: "3",
    content: "두 수 $12$와 $18$의 최대공약수를 구하시오.",
    figures: [
      {
        assetId: "figure-1",
        sha256: "0".repeat(64),
        choiceIndex: null,
        sourceWidthMm: null,
        altText: "문제 그림",
      },
    ],
    questionType: "단답형",
    sourcePageLabel: "23",
    qr: { id: "qr-1", url: "https://school.example.test/q/1" },
  };
  const answer = {
    answer: "$6$",
    solution:
      "$12 = 2^2 \\times 3$ 이고 $18 = 2 \\times 3^2$ 이므로 공통인 소인수의 곱은 $2 \\times 3 = 6$ 이다.",
  };
  const student = { ...base, layout } as RenderBlock;
  const stacked = { ...base, layout, ...answer } as RenderBlock;
  const beside = {
    ...base,
    layout: { ...layout, columnSpan: 2 },
    answerPlacement: "beside",
    ...answer,
  } as RenderBlock;

  it("sets the question in the first half and the whole answer in the second", () => {
    const dom = parse(render(beside));
    const section = dom.querySelector<HTMLElement>("section.tb-problem")!;
    expect(section.dataset.answerPlacement).toBe("beside");
    expect(section.classList.contains("tb-problem-answer-beside")).toBe(true);
    // Not a wide question: the rules for wide written problems do not apply to it.
    expect(section.classList.contains("tb-problem-wide")).toBe(false);
    const grid = section.querySelector<HTMLElement>(
      ":scope > .tb-answer-case",
    )!;
    expect(grid.getAttribute("style")).toBe(ANSWER_CASE_GRID_STYLE);
    const [question, answerPart] = Array.from(grid.children);
    expect(grid.children).toHaveLength(2);
    // First half: head, prompt, figure and QR, as in a student column.
    expect(question.classList.contains("tb-answer-case-question")).toBe(true);
    expect(question.querySelector(".tb-problem-head strong")?.textContent).toBe(
      "3",
    );
    expect(question.querySelector(".tb-prose")?.textContent).toContain(
      "최대공약수를 구하시오.",
    );
    expect(question.querySelectorAll(".tb-problem-figure img")).toHaveLength(1);
    expect(question.querySelector(".tb-qr")?.getAttribute("data-qr-id")).toBe(
      "qr-1",
    );
    // The QR keeps its place beside the prompt.
    expect(question.classList.contains("tb-problem-has-qr")).toBe(true);
    expect(
      question.querySelector(":scope > .tb-problem-main > .tb-qr"),
    ).not.toBeNull();
    expect(question.querySelector(".tb-answer")).toBeNull();
    // Second half: the answer with its student page and the complete solution.
    expect(answerPart.classList.contains("tb-answer")).toBe(true);
    expect(answerPart.getAttribute("style")).toBe("margin-top:0");
    expect(answerPart.querySelector("h4")?.textContent).toBe(
      "정답 · 문제 23쪽",
    );
    expect(answerPart.querySelectorAll(".katex")).toHaveLength(4);
    expect(answerPart.textContent).toContain("공통인 소인수의 곱은");
    expect(answerPart.textContent?.trim().endsWith("이다.")).toBe(true);
    // No writing space in the answer variant.
    expect(section.querySelector(".tb-work-lines")).toBeNull();
  });

  it("prints the same question and the same answer as the stacked block", () => {
    const [a, b] = [parse(render(stacked)), parse(render(beside))];
    for (const selector of [
      ".tb-problem-head",
      ".tb-problem-question",
      ".tb-qr",
    ])
      expect(b.querySelector(selector)?.outerHTML).toBe(
        a.querySelector(selector)?.outerHTML,
      );
    expect(b.querySelector(".tb-answer")?.innerHTML).toBe(
      a.querySelector(".tb-answer")?.innerHTML,
    );
  });

  it("leaves the stacked answer block and the student block as they were", () => {
    const stackedHtml = render(stacked);
    expect(stackedHtml).not.toContain("tb-answer-case");
    expect(stackedHtml).not.toContain("data-answer-placement");
    expect(stackedHtml).toContain('<section class="tb-answer"><h4>');
    // A natively wide problem is still the wide stacked block.
    const wide = render({
      ...stacked,
      layout: { ...layout, columnSpan: 2 },
    } as RenderBlock);
    expect(wide).toContain("tb-problem-wide");
    expect(wide).not.toContain("tb-answer-case");

    const studentHtml = render(student);
    expect(studentHtml).not.toContain("tb-answer");
    expect(studentHtml).not.toContain("data-answer-placement");
    expect(parse(studentHtml).querySelectorAll(".tb-work-line")).toHaveLength(
      3,
    );
    // The placement means nothing without an answer: a student block never takes it.
    expect(
      render({ ...student, answerPlacement: "beside" } as RenderBlock),
    ).toBe(studentHtml);
  });

  it("keeps a saved zero of writing lines at zero in both variants", () => {
    const zero = {
      ...layout,
      minWorkLines: 0,
      preferredWorkLines: 0,
      maxWorkLines: 0,
    };
    const studentDom = parse(render({ ...base, layout: zero } as RenderBlock));
    expect(studentDom.querySelectorAll(".tb-work-line")).toHaveLength(0);
    expect(
      studentDom
        .querySelector(".tb-work-area")
        ?.hasAttribute("data-empty-work"),
    ).toBe(true);
    const answerDom = parse(
      render({
        ...beside,
        layout: { ...zero, columnSpan: 2 },
      } as RenderBlock),
    );
    expect(answerDom.querySelectorAll(".tb-work-line")).toHaveLength(0);
    expect(answerDom.querySelector(".tb-answer-case")).not.toBeNull();
  });
});

describe("student page references under a wider answer projection", () => {
  /**
   * A manuscript with semantic metadata: its ordinary answers take the row. A problem is
   * 130mm tall, so the student book has two problems on each of pages 2 and 3.
   */
  function world() {
    const fixture = textbookFixture(1, 4);
    for (const block of fixture.units[0].sections[0].blocks)
      if (block.kind === "problem") block.semantic = { activity: "practice" };
    const student = createTextbookRenderModel(fixture, "student");
    const measurements = student.sections.flatMap((section) =>
      section.blocks.map((block) => ({
        blockId: block.id,
        widthMm: blockWidthMm(fixture.config, block),
        heightMm: block.kind === "problem" ? 130 : 14,
      })),
    );
    const layout = paginateTextbookSections(
      student.sections,
      measurements,
      fixture.config,
      { includeCover: true },
    );
    return { fixture, student, layout };
  }
  const verify = (
    { fixture, student }: ReturnType<typeof world>,
    pages: ReturnType<typeof world>["layout"]["pages"],
  ) => studentPageMapFromPages(student.sections, pages, fixture.config);

  it("takes the labels from the student's own pages, checked against the student projection", () => {
    const w = world();
    const pageMap = verify(w, w.layout.pages);
    expect(pageMap).toEqual(w.layout.pageMap);
    expect(pageMap.map((p) => [p.printedPageLabel, p.column])).toEqual([
      ["2", 1],
      ["2", 2],
      ["3", 1],
      ["3", 2],
    ]);
    const answers = createTextbookRenderModel(
      { ...w.fixture, pageMap },
      "answers",
    );
    expect(
      problems(answers).map((b) => [b.answerPlacement, b.sourcePageLabel]),
    ).toEqual([
      ["beside", "2"],
      ["beside", "2"],
      ["beside", "3"],
      ["beside", "3"],
    ]);
    // The answer book paginates on its own widths, one problem to a row.
    const answerLayout = paginateTextbookSections(
      answers.sections,
      answers.sections.flatMap((section) =>
        section.blocks.map((block) => ({
          blockId: block.id,
          widthMm: blockWidthMm(w.fixture.config, block),
          heightMm: block.kind === "problem" ? 130 : 14,
        })),
      ),
      w.fixture.config,
      { includeCover: true },
    );
    const answerIds = problems(answers).map((b) => b.id);
    expect(
      answerLayout.pages.flatMap((page) =>
        page.blocks
          .filter((block) => answerIds.includes(block.blockId))
          .map((block) => [block.blockId, block.widthMm, block.column]),
      ),
    ).toEqual(answerIds.map((id) => [id, 176, 1]));
    expect(answerLayout.pageMap).not.toEqual(pageMap);
    // The wider answer projection is not what student pages may be checked against.
    expect(() =>
      studentPageMapFromPages(
        answers.sections,
        w.layout.pages,
        w.fixture.config,
      ),
    ).toThrow(/STUDENT_PLACEMENT/);
  });

  it("rejects a student page whose block is not at its student width", () => {
    const w = world();
    const problem = problems(w.student)[1];
    for (const widthMm of [176, 84.5 + 1, 40]) {
      const pages = structuredClone(w.layout.pages);
      for (const page of pages)
        for (const block of page.blocks)
          if (block.blockId === problem.id) block.widthMm = widthMm;
      expect(() => verify(w, pages), `width ${widthMm}`).toThrow(
        /STUDENT_PLACEMENT/,
      );
    }
    // Untouched pages still pass: the check is the tampering, not the fixture.
    expect(() => verify(w, structuredClone(w.layout.pages))).not.toThrow();
  });

  it("rejects student pages that were not carried over as they were printed", () => {
    const w = world();
    const tampered = (
      change: (pages: ReturnType<typeof world>["layout"]["pages"]) => void,
    ) => {
      const pages = structuredClone(w.layout.pages);
      change(pages);
      return () => verify(w, pages);
    };
    // A page out of sequence.
    expect(
      tampered((pages) => {
        pages[2].physicalPageIndex += 1;
        pages[2].printedPageLabel = String(pages[2].physicalPageIndex);
      }),
    ).toThrow(/STUDENT_PAGE_ORDER/);
    // A label that is not the page's own number.
    expect(
      tampered((pages) => {
        pages[1].printedPageLabel = "9";
      }),
    ).toThrow(/STUDENT_PAGE_LABEL/);
    // A page lost on the way: its blocks are missing from the reference.
    expect(tampered((pages) => void pages.pop())).toThrow(
      /STUDENT_MISSING_BLOCK/,
    );
    // The same problem referenced on two pages.
    expect(
      tampered((pages) => {
        pages[2].blocks.push(
          pages[1].blocks.find(
            (block) => block.blockId === problems(w.student)[0].id,
          )!,
        );
      }),
    ).toThrow(/STUDENT_BLOCK_REF/);
    // A reference that names another problem's item.
    expect(
      tampered((pages) => {
        const placed = pages[1].blocks.find(
          (block) => block.blockId === problems(w.student)[0].id,
        )!;
        placed.itemId = problems(w.student)[1].itemId;
      }),
    ).toThrow(/STUDENT_ITEM_REF/);
  });
});
