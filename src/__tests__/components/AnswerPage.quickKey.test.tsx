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
});
