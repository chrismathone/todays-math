import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProblemContent } from "@/components/math/ProblemContent";

const content =
  "다음 중 등식인 것의 개수를 구하시오.\n$-3x-7$, $-2x-9=-4$, $6x+2y-6$, $-6x-1=1$, $-5x+6y+2$";

describe("practice problem reading layout", () => {
  it("renders each complete expression in an aligned row through the existing KaTeX renderer", () => {
    const { container, getByRole } = render(
      <ProblemContent content={content} practiceLayout />,
    );
    const list = getByRole("list", { name: "문제에 주어진 항목" });
    expect(list.querySelectorAll("li")).toHaveLength(5);
    expect(list.querySelectorAll(".katex")).toHaveLength(5);
    expect(container.querySelector(".katex-error")).toBeNull();
    expect(container.textContent).toContain(
      "다음 중 등식인 것의 개수를 구하시오.",
    );
  });

  it("leaves default source and print rendering unchanged", () => {
    const { container } = render(<ProblemContent content={content} />);
    expect(container.querySelector("[data-practice-problem-text]")).toBeNull();
    expect(container.querySelector("[data-problem-items]")).toBeNull();
    expect(container.querySelectorAll(".katex")).toHaveLength(5);
  });

  it("keeps protected figures and original multiple-choice markers alongside the shared layout", () => {
    const { container } = render(
      <ProblemContent
        content={`${content}\n① $1$\n② $2$`}
        practiceLayout
        figureSvg='<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="3" /></svg>'
      />,
    );
    expect(
      container.querySelector("[data-figure-svg] svg circle"),
    ).not.toBeNull();
    expect(container.textContent).toContain("①");
    expect(container.textContent).toContain("②");
    expect(container.querySelector(".katex-error")).toBeNull();
  });
});
