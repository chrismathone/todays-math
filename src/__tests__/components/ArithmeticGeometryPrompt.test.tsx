import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GradeArithmeticExpression } from "@/components/arithmetic/GradeArithmeticPrompt";
import UnifiedProblem from "@/components/unified/UnifiedProblem";
import {
  getArithmeticV2Definition,
  buildArithmeticV2Sheet,
} from "@/lib/arithmetic-v2";
import {
  ARITHMETIC_V2_CATALOG_VERSION,
  ARITHMETIC_V2_ENGINE_VERSION,
} from "@/contracts/arithmeticV2.contract";
import { arithmeticToStudioProblems } from "@/lib/arithmeticOutput";
import {
  presentArithmeticGeometrySvg,
  arithmeticGeometryDisplaySize,
} from "@/lib/arithmetic-v2/presentation";
import {
  arithmeticAngleSnapshot,
  arithmeticAngleSvg,
} from "@/lib/arithmetic-v2/geometry";

describe("arithmetic geometry figures on catalog and shared review/output", () => {
  it("shows givens and the unit without a revealing polygon in inverse-count examples", () => {
    const { prompt } = getArithmeticV2Definition(
      "m1-polygon-sides-sum",
    ).problemAt(0);
    if (prompt.layout !== "math") throw new Error("Unexpected prompt");
    const { container } = render(<GradeArithmeticExpression prompt={prompt} />);
    expect(container.textContent).toContain("다각형의 내각의 크기의 합은");
    expect(container.querySelector(".katex")).not.toBeNull();
    expect(container.textContent).toContain(prompt.instruction);
    expect(container.textContent).toContain("개");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByLabelText("답란")).toBeInTheDocument();
  });
  it.each(["e4-triangle-missing-angle", "e4-right-triangle-missing-angle"])(
    "renders the real catalog example at 280px longest extent with no question mark: %s",
    (id) => {
      const { prompt } = getArithmeticV2Definition(id).problemAt(0);
      if (prompt.layout !== "math") throw new Error("Unexpected prompt");
      const { container } = render(
        <GradeArithmeticExpression prompt={prompt} />,
      );
      const figure = screen.getByRole("img", { name: prompt.text });
      const shown = presentArithmeticGeometrySvg(
        prompt.figureId!,
        arithmeticAngleSvg(prompt.figureId!, arithmeticAngleSnapshot),
      );
      const size = arithmeticGeometryDisplaySize(shown);
      expect(figure).toHaveAttribute("width", String(size.width));
      expect(figure).toHaveAttribute("height", String(size.height));
      expect(
        decodeURIComponent(figure.getAttribute("src")!.split(",")[1]),
      ).toBe(shown);
      expect(container.textContent).not.toContain("?");
      expect(screen.getByLabelText("답란")).toBeInTheDocument();
    },
  );

  it.each([
    [false, "e4-right-triangle-missing-angle"],
    [true, "e4-right-triangle-missing-angle"],
    [false, "e4-angle-sum"],
    [true, "e4-angle-sum"],
  ])(
    "shared renderer displays the full arithmetic frame and an empty answer line (print=%s, type=%s)",
    (print, typeId) => {
      const sheet = buildArithmeticV2Sheet({
        engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
        catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
        seed: "review-output-geometry",
        rounds: [
          {
            allocations: [{ typeId, count: 1 }],
          },
        ],
      });
      const [problem] = arithmeticToStudioProblems(sheet);
      const { container } = render(
        <UnifiedProblem problem={problem} print={print} />,
      );
      expect(screen.getAllByRole("img")).toHaveLength(1);
      const image = screen.getByRole("img");
      expect(image).toHaveAttribute("src", problem.figureUrls[0]);
      expect(image).toHaveStyle({
        width: `${problem.figureSourceMm[0].toFixed(2)}mm`,
      });
      expect(container.textContent).toContain("답:");
      expect(container.textContent).not.toContain(
        sheet.rounds[0].items[0].answer.text,
      );
      expect(container.querySelector(".katex-error")).toBeNull();
      expect(container.textContent).not.toContain("[그림1]");
    },
  );

  it("keeps existing numeric examples readable", () => {
    render(
      <GradeArithmeticExpression
        prompt={{ layout: "vertical", left: 31, right: 12, operator: "+" }}
      />,
    );
    expect(screen.getByLabelText("31 + 12")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
