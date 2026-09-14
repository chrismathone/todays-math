import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import UnifiedProblem from "@/components/unified/UnifiedProblem";
import type { StudioProblem } from "@/components/unified/types";
import type { ContentBlock } from "@/lib/mathgen/contracts";

const text = (value: string): ContentBlock => ({
  type: "text",
  value,
  rows: [],
});
const problem: StudioProblem = {
  id: "native",
  content: "4. 옳지 않은 것은? [그림1]",
  answer: "2",
  solution: "풀이",
  grade: "중1",
  chapter: "",
  section: "",
  difficulty: "",
  problemCode: "",
  figureUrls: ["/first.png", "/second.png"],
  figureSvg: null,
  figureDims: [100, 50, 100, 50],
  figureSourceMm: [30, 30],
  ocr: {
    number: 4,
    blocks: [
      text("4. 옳지 않은 것은? [그림1]"),
      {
        type: "table",
        value: "",
        rows: [
          ["항목", "값"],
          ["A", "\\frac{9}{4}"],
        ],
      },
    ],
    choiceGroups: [1, 2, 3, 4, 5].map((number) => ({
      number,
      contents: [text(number === 2 ? "[그림2]" : String(number))],
    })),
    subQuestions: [],
    score: 3,
    printedScore: "3.0",
    labelType: "객관식",
    confidence: "high",
    choicesLayout: "1x5",
    bodyMissing: false,
    choicesMissing: false,
  },
};
describe("native OCR worksheet rendering", () => {
  it("positions figures in their body/choice anchors, keeps tables, and prints score/number only once", () => {
    const { container } = render(<UnifiedProblem problem={problem} print />);
    expect(container.querySelectorAll("img")).toHaveLength(2);
    expect(
      container.querySelector('[data-native-choice="2"] img'),
    ).toHaveAttribute("src", "/second.png");
    expect(container.textContent).not.toContain("[그림");
    expect(container.textContent).not.toContain("4. 옳지");
    expect(container.textContent?.match(/\[3\.0점\]/g)).toHaveLength(1);
    expect(container.querySelector("strong.underline")).toHaveTextContent(
      "않은",
    );
    expect(container.querySelector("table")).toHaveTextContent("항목값A");
    expect(container.querySelector("table annotation")).toHaveTextContent(
      "\\dfrac{9}{4}",
    );
    expect(container.querySelector("[data-native-choices]")).toHaveStyle({
      gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    });
    expect(container.textContent!.indexOf("3.0점")).toBeLessThan(
      container.textContent!.indexOf("항목"),
    );
    expect(problem.ocr!.blocks[0].value).toBe("4. 옳지 않은 것은? [그림1]");
  });
  it.each([
    ["2x3", 3],
    ["3x2", 2],
    ["5x1", 1],
  ] as const)("honors %s choice columns", (layout, columns) => {
    const { container } = render(
      <UnifiedProblem
        problem={{
          ...problem,
          ocr: { ...problem.ocr!, choicesLayout: layout },
        }}
      />,
    );
    expect(container.querySelector("[data-native-choices]")).toHaveStyle({
      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    });
  });
  it("keeps subquestion scores and answer space without duplicating original subquestion markers", () => {
    const { container } = render(
      <UnifiedProblem
        print
        problem={{
          ...problem,
          figureUrls: [],
          ocr: {
            ...problem.ocr!,
            blocks: [text("4. 다음을 구하시오.")],
            choiceGroups: [],
            subQuestions: [
              {
                number: 1,
                contents: [text("(1) 값을 구하시오.")],
                score: 2,
                printedScore: "2.0",
              },
              { number: 2, contents: [text("이유를 쓰시오.")] },
            ],
          },
        }}
      />,
    );
    expect(
      container.querySelectorAll("[data-native-subquestion]"),
    ).toHaveLength(2);
    expect(
      container.querySelectorAll("[data-native-solve-space]"),
    ).toHaveLength(2);
    expect(container.textContent).not.toContain("(1) (1)");
    expect(container.textContent).toContain("[2.0점]");
  });
  it("applies mixed fractions only to elementary display, including native table cells", () => {
    const { container, rerender } = render(
      <UnifiedProblem problem={{ ...problem, grade: "초5" }} />,
    );
    expect(container.querySelector("table annotation")).toHaveTextContent(
      "2\\dfrac{1}{4}",
    );
    rerender(
      <UnifiedProblem
        problem={{
          ...problem,
          grade: "초5",
          content: "가분수를 대분수로 바꾸시오.",
        }}
      />,
    );
    expect(container.querySelector("table annotation")).toHaveTextContent(
      "\\dfrac{9}{4}",
    );
  });
  it("keeps image-output crops authoritative even when typed OCR exists", () => {
    render(
      <UnifiedProblem problem={{ ...problem, croppedImage: "/crop.png" }} />,
    );
    expect(screen.getByRole("img")).toHaveAttribute("src", "/crop.png");
  });
});
