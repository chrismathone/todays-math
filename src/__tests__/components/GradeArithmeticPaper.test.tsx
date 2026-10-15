import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  buildArithmeticV2Sheet,
  listArithmeticV2PrintItems,
} from "@/lib/arithmetic-v2";
import { arithmeticToStudioProblems } from "@/lib/arithmeticOutput";
import {
  gradeArithmeticPaperPages,
  type GradeArithmeticPaperRound,
} from "@/components/arithmetic/GradeArithmeticPaper";

const rounds: GradeArithmeticPaperRound[] = [
  {
    round: 1,
    items: [
      {
        number: 1,
        prompt: {
          layout: "math",
          text: "1/2 + 1/3",
          latex: "\\frac{1}{2}+\\frac{1}{3}",
        },
        answer: {
          kind: "rational",
          exact: ["5", "6"],
          text: "5/6",
          latex: "\\frac{5}{6}",
        },
      },
      {
        number: 2,
        prompt: { layout: "math", text: "(x+2)(x-3)", latex: "(x+2)(x-3)" },
        answer: {
          kind: "polynomial",
          exact: ["2", "1", "1", "1", "-1", "1", "0", "-6", "1"],
          text: "x²-x-6",
          latex: "x^2-x-6",
        },
      },
    ],
  },
];
describe("grade arithmetic paper separation", () => {
  it("uses the saved-sheet projection for administrator pages without a redundant figure", () => {
    const sheet = buildArithmeticV2Sheet({
      engineVersion: "arithmetic-engine-v2",
      catalogVersion: "arithmetic-catalog-v2",
      seed: "admin-notation",
      rounds: [
        {
          allocations: [
            { typeId: "m3-pythagoras-isosceles-height-surd", count: 1 },
          ],
        },
      ],
    });
    const pages = gradeArithmeticPaperPages({
      rounds: [{ round: 1, items: listArithmeticV2PrintItems(sheet) }],
      problems: arithmeticToStudioProblems(sheet),
      title: "선분 표기",
      mode: "questions",
      density: 24,
    });
    const { container } = render(<>{pages.map((page) => page.node)}</>);
    const body = container.querySelector("[data-native-problem]")!;
    expect(
      body.querySelectorAll(".overline-line").length,
    ).toBeGreaterThanOrEqual(6);
    expect(body.querySelector("img")).toBeNull();
    expect(body.querySelector(".katex-error")).toBeNull();
    expect(body.querySelector("annotation")?.textContent).toContain(
      "\\overline{\\mathrm{AB}}",
    );
  });
  it("renders question expressions and blanks without putting answer-only values in the question DOM", () => {
    const pages = gradeArithmeticPaperPages({
      rounds,
      title: "분수와 식 연습",
      mode: "questions",
      density: 12,
    });
    const { container } = render(<>{pages.map((page) => page.node)}</>);
    expect(
      container.querySelectorAll('[data-page-kind="questions"]'),
    ).toHaveLength(1);
    expect(container.querySelectorAll('[aria-label="답란"]')).toHaveLength(2);
    expect(container.querySelector('[data-page-kind="answers"]')).toBeNull();
    expect(container.innerHTML).not.toContain("x^2-x-6");
    expect(container.innerHTML).not.toContain("frac{5}{6}");
  });
  it("prints only answers with the original numbers and no question expressions or worked solution", () => {
    const pages = gradeArithmeticPaperPages({
      rounds,
      title: "분수와 식 연습",
      mode: "answers",
      density: 24,
    });
    const { container } = render(<>{pages.map((page) => page.node)}</>);
    expect(
      container.querySelectorAll('[data-page-kind="answers"]'),
    ).toHaveLength(1);
    expect(container.innerHTML).toContain("x^2-x-6");
    expect(container.innerHTML).toContain("frac{5}{6}");
    expect(container.innerHTML).not.toContain("(x+2)(x-3)");
    expect(container.textContent).not.toContain("해설");
    expect(container.querySelector('[aria-label="답란"]')).toBeNull();
  });
  it("keeps round boundaries and paginates the answer grid separately", () => {
    const many = Array.from({ length: 50 }, (_, i) => ({
      ...rounds[0].items[i % 2],
      number: i + 1,
    }));
    const pages = gradeArithmeticPaperPages({
      rounds: [
        { round: 1, items: many },
        { round: 2, items: rounds[0].items },
      ],
      title: "연산",
      mode: "both",
      density: 24,
    });
    expect(pages).toHaveLength(9);
    expect(
      pages.filter((page) => page.caption.startsWith("문제지")),
    ).toHaveLength(6);
    expect(pages[5].caption).toContain("2회차");
  });
});
