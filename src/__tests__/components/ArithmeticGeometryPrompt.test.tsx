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
  it.each([
    ["e4-triangle-missing-angle", "다음 삼각형에서 □의 값을 구하세요."],
    [
      "e4-right-triangle-missing-angle",
      "다음 직각삼각형에서 □의 값을 구하세요.",
    ],
  ])(
    "shows the angle figure with □ at the empty arc and the group question instead of prose: %s",
    (id, question) => {
      const { prompt } = getArithmeticV2Definition(id).problemAt(0);
      if (prompt.layout !== "math") throw new Error("Unexpected prompt");
      const { container } = render(
        <GradeArithmeticExpression prompt={prompt} typeId={id} />,
      );
      // 2026-10-16: 초등 각도 is figure-first — the figure carries both givens
      // and the unknown is □ (not x, not ㉠); nothing of the prose is printed.
      const image = screen.getByRole("img");
      expect(image.getAttribute("src")).toContain("data:image/svg+xml");
      expect(
        decodeURIComponent(image.getAttribute("src")!.split(",")[1] ?? ""),
      ).toContain("aria-label=");
      // The □ of the group question is typeset (\square), as in «□ABCD».
      const [head, tail] = question.split("□");
      expect(container.textContent).toContain(head);
      expect(container.textContent).toContain(tail);
      const math = [...container.querySelectorAll("annotation")]
        .map((node) => node.textContent)
        .join(" ");
      expect(math).toContain("\\square");
      // The given angles live on the figure now, not in the prose.
      for (const angle of prompt.text.matchAll(/(\d+)°/g))
        expect(math).not.toContain(`${angle[1]}^{\\circ}`);
      expect(container.textContent).not.toContain("숫자가 없는");
      expect(container.textContent).not.toContain("주어진 각");
      expect(container.textContent).not.toContain("?");
      expect(screen.getByLabelText("답란")).toBeInTheDocument();
    },
  );

  it.each([
    [false, "m1-parallel-angle"],
    [true, "m1-parallel-angle"],
    [false, "m2-right-triangle-height"],
    [true, "m2-right-triangle-height"],
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
      expect(problem.content).toContain("\\underline{\\hspace{2em}}");
      expect(container.textContent).not.toContain("정답:");
      expect(container.querySelector(".katex-error")).toBeNull();
      expect(container.textContent).not.toContain("[그림1]");
    },
  );

  it("prints the 초5 figure with «□ cm» on the target side and no prose: e5-trapezoid-area-bottom", () => {
    const sheet = buildArithmeticV2Sheet({
      engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
      catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
      seed: "no-redundant-figure",
      rounds: [
        { allocations: [{ typeId: "e5-trapezoid-area-bottom", count: 1 }] },
      ],
    });
    const before = structuredClone(sheet);
    const [problem] = arithmeticToStudioProblems(sheet);
    render(<UnifiedProblem problem={problem} print />);
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(problem.figureSvg).toContain('aria-label="□ cm"');
    expect(problem.figureSvg).not.toContain(">아랫변<");
    expect(problem.content).not.toContain("아랫변");
    expect(problem.arithmetic?.groupInstruction).toBe(
      "다음 사다리꼴에서 □의 값을 구하세요.",
    );
    expect(sheet).toEqual(before);
  });

  it.each(["e6-cuboid-base-volume"])(
    "keeps given quantities and the target in prose while omitting duplicate dimensions: %s",
    (typeId) => {
      const sheet = buildArithmeticV2Sheet({
        engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
        catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
        seed: "no-redundant-figure",
        rounds: [{ allocations: [{ typeId, count: 1 }] }],
      });
      const before = structuredClone(sheet);
      const [problem] = arithmeticToStudioProblems(sheet);
      const { container } = render(<UnifiedProblem problem={problem} print />);
      expect(screen.queryByRole("img")).toBeNull();
      expect(problem.content).not.toMatch(/겨냥도|\[그림/);
      expect(problem.figureSvg).toBeNull();
      expect(problem.figureUrls).toEqual([]);
      expect(container.textContent).toContain(
        typeId.includes("trapezoid") ? "아랫변" : "부피",
      );
      expect(container.querySelector(".katex-error")).toBeNull();
      expect(sheet).toEqual(before);
      expect(problem.source).toMatchObject({ item: before.rounds[0].items[0] });
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
