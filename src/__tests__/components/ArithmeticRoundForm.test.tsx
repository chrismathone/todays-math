import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AnswerPage } from "@/components/unified/print/AnswerPage";
import { WorksheetPrint } from "@/components/unified/print/WorksheetPrint";
import { TEMPLATE_COMPONENTS } from "@/components/unified/print/templateComponents";
import { packMeasured } from "@/components/unified/print/pack";
import {
  DEFAULT_PRINT_OPTIONS,
  type PrintMeta,
  type PrintOptions,
  type PrintTemplate,
  type ProblemReview,
} from "@/components/unified/print/types";

// jsdom has no layout. Keep the real round boundaries, packer and print tree;
// browser geometry is verified separately, not inferred from these heights.
vi.mock("@/components/unified/print/useMeasuredPages", () => ({
  useMeasuredPages: (
    _template: unknown,
    problems: ProblemReview[],
    options: PrintOptions,
    _meta: PrintMeta,
    answer = false,
  ) => ({
    pages: packMeasured(
      problems.map(() => 80),
      { first: 650, cont: 850 },
      answer
        ? { ...options, template: "jeongtong", layoutMode: "spacing" }
        : options,
      problems.flatMap((problem, index) =>
        index > 0 &&
        problem.variant.arithmetic?.round !==
          problems[index - 1].variant.arithmetic?.round
          ? [index]
          : [],
      ),
    ),
    ready: true,
    layoutError: false,
    fontError: false,
    fontStyle: {},
    measureNode: null,
  }),
}));

const meta: PrintMeta = {
  title: "분수와 소수 연습",
  subject: "수학",
  schoolName: "수학학교",
  patternName: "계산의 순서",
  patternStrategy: "계산 순서 확인",
  todayGoal: "차례대로 계산하기",
  conceptNote: "계산 원리",
};
const problems: ProblemReview[] = Array.from({ length: 200 }, (_, index) => {
  const number = index + 1;
  const group = Math.floor(index / 50);
  return {
    id: `round-form-${number}`,
    variant: {
      id: `round-form-${number}`,
      content: `${number} + 1 =`,
      answer: `${number + 1}`,
      solution: "정답지에 숨기는 해설",
      grade: "초3",
      chapter: "덧셈",
      section: `유형 ${group + 1}`,
      topic: `유형 ${group + 1}`,
      difficulty: "",
      problemCode: "",
      figureUrls: [],
      figureDims: [],
      figureSourceMm: [],
      figureSvg: null,
      source: { kind: "arithmeticSheet" },
      arithmetic: {
        round: index < 100 ? 1 : 2,
        number,
        groupKey: `group-${group}`,
        groupTitle: `유형 ${group + 1}`,
      },
    },
    sectionHeading: index % 50 === 0 ? `유형 ${group + 1}` : undefined,
  };
});

function parse(markup: string) {
  return new DOMParser().parseFromString(markup, "text/html").body;
}

function assertRoundInsideForm(paper: Element, round: number, title: string) {
  const labels = paper.querySelectorAll("[data-arithmetic-round]");
  expect(labels).toHaveLength(1);
  const label = labels[0];
  expect(label.tagName).toBe("SPAN");
  expect(label.textContent).toBe(`${round}회차`);
  expect(label.parentElement).not.toBe(paper);
  expect(paper.querySelector(":scope > [data-arithmetic-round]")).toBeNull();
  // Round and title must share an existing form region below the A4 root.
  let region = label.parentElement!;
  while (region !== paper && !region.textContent?.includes(title))
    region = region.parentElement!;
  expect(region).not.toBe(paper);
  expect(region.contains(paper.querySelector(".measure-body"))).toBe(false);
  expect(
    paper.querySelector(".measure-body [data-arithmetic-round]"),
  ).toBeNull();
  return label;
}

describe.each(Object.entries(TEMPLATE_COMPONENTS))(
  "%s arithmetic round belongs to the paper form",
  (template, Template) => {
    const options = {
      ...DEFAULT_PRINT_OPTIONS,
      template: template as PrintTemplate,
      quickAnswerOnly: true,
    };
    const base = {
      page: 1,
      totalPages: 4,
      totalProblems: 100,
      columns: 1 as const,
      meta,
      problems: problems.slice(0, 1),
      startingNumber: 1,
      options,
    };
    const formTitle =
      template === "modern"
        ? meta.schoolName!
        : template === "pyeongga"
          ? `${meta.subject} 영역`
          : template === "yuhyung"
            ? meta.patternName!
            : meta.title;

    it.each([1, 2] as const)(
      "keeps the same dedicated round field on first, continuation and next-round pages (%s columns)",
      (columns) => {
        const labels: string[] = [];
        for (const state of [
          { page: 1, round: 12, firstPage: true },
          { page: 2, round: 12, firstPage: false },
          { page: 3, round: 13, firstPage: true },
        ]) {
          const paper = parse(
            renderToStaticMarkup(
              <Template
                {...base}
                {...state}
                columns={columns}
                options={{ ...options, columns }}
              />,
            ),
          ).firstElementChild!;
          const label = assertRoundInsideForm(paper, state.round, formTitle);
          labels.push(
            label.parentElement!.outerHTML.replace(/1[23]회차/g, "회차"),
          );
          expect(paper.querySelectorAll("[data-problem-body]")).toHaveLength(1);
          expect(
            paper.querySelector("[data-arithmetic-type-heading]")?.textContent,
          ).toBe("유형 1");
          if (template === "jeongtong")
            expect(
              label.closest("tr")?.firstElementChild?.getAttribute("colspan"),
            ).toBe("5");
          if (template === "yuhyung")
            expect(label.parentElement?.textContent).toContain("100 문항");
        }
        expect(labels[1]).toBe(labels[0]);
        expect(labels[2]).toBe(labels[0]);
      },
    );

    it("keeps round chrome out of question measurement and ordinary sheets", () => {
      const measured = parse(
        renderToStaticMarkup(
          <Template {...base} round={1} measure={{ columnWidthPx: 300 }} />,
        ),
      );
      expect(measured.querySelector("[data-arithmetic-round]")).toBeNull();
      expect(
        measured.querySelector(
          "[data-measure-idx] [data-arithmetic-type-heading]",
        )?.textContent,
      ).toBe("유형 1");
      for (const page of [1, 2]) {
        const ordinary = parse(
          renderToStaticMarkup(
            <Template {...base} page={page} problems={[]} />,
          ),
        );
        expect(ordinary.querySelector("[data-arithmetic-round]")).toBeNull();
        expect(ordinary.textContent).not.toContain("회차");
      }
    });

    it("prints all 200 questions and matching answers across two separate rounds", () => {
      const selected = problems.map(({ variant }) => variant);
      const before = JSON.stringify(selected);
      const output = parse(
        renderToStaticMarkup(
          <WorksheetPrint
            selected={selected}
            title={meta.title}
            printMeta={meta}
            options={{
              ...options,
              columns: 2,
              layoutMode: "count",
              problemsPerColumn: 4,
              showAnswers: true,
            }}
            onReady={() => {}}
          />,
        ),
      ).querySelector("[data-mathgen-document]")!;
      const questions = [
        ...output.querySelectorAll('[data-page-kind="questions"]'),
      ];
      const answers = [
        ...output.querySelectorAll('[data-page-kind="answers"]'),
      ];
      expect(questions.length).toBeGreaterThan(2);
      expect(answers.length).toBeGreaterThan(2);
      const numbers: number[] = [];
      const answerNumbers: number[] = [];
      const printedAnswers: string[] = [];
      for (const [pages, isAnswer] of [
        [questions, false],
        [answers, true],
      ] as const) {
        for (const page of pages) {
          const paper = page.firstElementChild!;
          const items = [
            ...paper.querySelectorAll(
              isAnswer ? ".measure-body strong" : "[data-problem-header]",
            ),
          ];
          const pageNumbers = items.map((item) =>
            Number(item.textContent!.replace(/\D/g, "")),
          );
          const round = pageNumbers[0] <= 100 ? 1 : 2;
          expect(
            pageNumbers.every((number) => (number <= 100 ? 1 : 2) === round),
          ).toBe(true);
          assertRoundInsideForm(
            paper,
            round,
            isAnswer ? meta.title : formTitle,
          );
          (isAnswer ? answerNumbers : numbers).push(...pageNumbers);
          if (isAnswer) {
            for (const item of items) {
              const row = item.parentElement!.cloneNode(true) as Element;
              row.querySelector("strong")!.remove();
              printedAnswers.push(row.textContent!.trim());
            }
          }
        }
      }
      expect(numbers).toEqual(Array.from({ length: 200 }, (_, i) => i + 1));
      expect(answerNumbers).toEqual(numbers);
      expect(printedAnswers).toEqual(selected.map((problem) => problem.answer));
      expect(
        [...output.querySelectorAll("[data-arithmetic-type-heading]")].map(
          (node) => node.textContent,
        ),
      ).toEqual(["유형 1", "유형 2", "유형 3", "유형 4"]);
      expect(output.textContent).not.toContain("정답지에 숨기는 해설");
      expect(JSON.stringify(selected)).toBe(before);
    });
  },
);

it.each([true, false])(
  "puts the answer round inside its title header (quick=%s)",
  (quickAnswerOnly) => {
    const props = {
      page: 3,
      round: 2,
      totalPages: 4,
      columns: 1 as const,
      meta,
      problems: problems.slice(100, 101),
      startingNumber: 101,
      options: { ...DEFAULT_PRINT_OPTIONS, quickAnswerOnly },
    };
    const paper = parse(
      renderToStaticMarkup(<AnswerPage {...props} />),
    ).firstElementChild!;
    const label = assertRoundInsideForm(paper, 2, meta.title);
    expect(label.closest("header")?.querySelector("h2")?.textContent).toContain(
      quickAnswerOnly ? "빠른 정답" : "정답과 해설",
    );
    expect(paper.querySelector("strong")?.textContent).toBe("101.");
    expect(paper.textContent?.includes("정답지에 숨기는 해설")).toBe(
      !quickAnswerOnly,
    );
    const measured = parse(
      renderToStaticMarkup(
        <AnswerPage {...props} measure={{ columnWidthPx: 300 }} />,
      ),
    );
    expect(measured.querySelector("[data-arithmetic-round]")).toBeNull();
  },
);
