import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NativeProblem from "@/components/unified/NativeProblem";
import type { StudioProblem } from "@/components/unified/types";

const problem: StudioProblem = {
  id: "native-figure-decoration",
  content: "그림을 보고 답하시오.",
  answer: "",
  solution: "",
  grade: "중1",
  chapter: "",
  section: "",
  difficulty: "",
  problemCode: "",
  figureUrls: ["/first.png", "/second.png", "/third.png"],
  figureSvg: null,
  figureDims: [100, 50, 100, 50, 100, 50],
  figureSourceMm: [30, 40, 50],
  ocr: {
    number: 1,
    blocks: [{ type: "text", value: "본문 그림 [그림2]", rows: [] }],
    choiceGroups: [
      { number: 1, contents: [{ type: "text", value: "[그림3]", rows: [] }] },
    ],
    subQuestions: [],
    confidence: "high",
    choicesLayout: "auto",
    bodyMissing: false,
    choicesMissing: false,
  },
};

describe("native figure decoration", () => {
  it("preserves source indexes and sizing across body, choice and unanchored images", () => {
    const { container } = render(
      <NativeProblem
        problem={problem}
        print={false}
        renderFigure={(index, image) => (
          <span data-figure-editor={index}>{image}</span>
        )}
      />,
    );
    expect(container.querySelectorAll("[data-figure-editor]")).toHaveLength(3);
    for (let index = 0; index < 3; index++) {
      const image = container.querySelector(
        `[data-figure-editor="${index}"] img`,
      );
      expect(image).toHaveAttribute("src", problem.figureUrls[index]);
      expect(image).toHaveStyle({
        width: `${problem.figureSourceMm[index]}mm`,
      });
    }
    expect(
      container.querySelector(
        '[data-native-choice="1"] [data-figure-editor="2"]',
      ),
    ).not.toBeNull();
    expect(container.querySelectorAll("img")).toHaveLength(3);
  });

  it("preserves plain printing when no decorator is supplied", () => {
    const { container } = render(<NativeProblem problem={problem} print />);
    expect(container.querySelectorAll("img")).toHaveLength(3);
    expect(container.querySelectorAll("[data-figure-editor]")).toHaveLength(0);
  });

  it("honors a decorator that deliberately hides an image", () => {
    const { container } = render(
      <NativeProblem
        problem={problem}
        print={false}
        renderFigure={() => null}
      />,
    );
    expect(container.querySelectorAll("img")).toHaveLength(0);
  });
});
