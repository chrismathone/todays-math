import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnswerPage } from "@/components/unified/print/AnswerPage";
import {
  DEFAULT_PRINT_OPTIONS,
  type PrintTemplateProps,
} from "@/components/unified/print/types";

const props: PrintTemplateProps = {
  page: 1,
  totalPages: 1,
  columns: 1,
  startingNumber: 1,
  meta: { title: "확인 학습", subject: "수학" },
  options: DEFAULT_PRINT_OPTIONS,
  problems: [
    {
      id: "fraction",
      variant: {
        id: "fraction",
        content: "계산하시오.",
        answer: "$\\frac{7}{3}$",
        solution: "분모를 같게 하여 계산합니다.",
        grade: "초5",
        chapter: "분수",
        section: "",
        difficulty: "",
        problemCode: "",
        figureUrls: [],
        figureSvg: null,
        figureDims: [],
        figureSourceMm: [],
        topic: "분수",
      },
    },
  ],
};
describe("H2 answer paper", () => {
  it("prints only the grid in quick-answer mode", () => {
    const { container } = render(
      <AnswerPage
        {...props}
        options={{ ...props.options, quickAnswerOnly: true }}
      />,
    );
    const grid = screen.getByRole("table", { name: "빠른 채점표" });
    expect(within(grid).getAllByRole("cell")).toHaveLength(1);
    expect(container.querySelectorAll("[data-answer-solution]")).toHaveLength(
      0,
    );
    expect(screen.queryByText("분모를 같게 하여 계산합니다.")).toBeNull();
    expect(grid.querySelector(".katex")?.textContent).toContain("2");
  });
  it("prints the same answer view in the grid and the following solution", () => {
    const { container } = render(<AnswerPage {...props} />);
    const grid = screen.getByRole("table", { name: "빠른 채점표" });
    const solution = container.querySelector("[data-answer-solution]")!;
    expect(
      grid.compareDocumentPosition(solution) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(grid.querySelector(".katex")?.innerHTML).toBe(
      solution.querySelector(".katex")?.innerHTML,
    );
    expect(solution.textContent).toContain("분모를 같게 하여 계산합니다.");
  });
  it("draws a shrunk wide answer smaller in the key only, never in the solution", () => {
    const { container } = render(
      <AnswerPage
        {...props}
        layout={{
          keyRows: [
            { cells: [{ index: 0, span: 5, scale: 0.84 }], height: 40 },
          ],
          solutionIndices: [0],
          indices: [0],
          scales: [1],
          splitIndex: 1,
          groupStart: 0,
        }}
      />,
    );
    const grid = screen.getByRole("table", { name: "빠른 채점표" });
    const shrunk = grid.querySelector<HTMLElement>("[data-answer-scale]")!;
    expect(shrunk.dataset.answerScale).toBe("0.84");
    expect(shrunk.style.fontSize).toBe("0.84em");
    expect(shrunk.querySelector(".katex")).not.toBeNull();
    const solution = container.querySelector("[data-answer-solution]")!;
    expect(solution.querySelector("[data-answer-scale]")).toBeNull();
  });
  it("keeps a fitting answer at full size", () => {
    render(<AnswerPage {...props} />);
    const grid = screen.getByRole("table", { name: "빠른 채점표" });
    expect(grid.querySelector("[data-answer-scale]")).toBeNull();
  });
});
