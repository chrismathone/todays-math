import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import UnifiedProblem from "@/components/unified/UnifiedProblem";
import { ProblemBody } from "@/components/unified/print/templates/ProblemBody";
import { TEMPLATE_COMPONENTS } from "@/components/unified/print/templateComponents";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
} from "@/components/unified/print/types";
import type { StudioProblem } from "@/components/unified/types";

const plain: StudioProblem & { topic: string } = {
  id: "scores",
  content: String.raw`값 $x=3$을 구하시오. \[3점\]
(1) 값을 구하시오. $[2점]$`,
  answer: "3",
  solution: "3을 대입합니다.",
  grade: "중1",
  chapter: "",
  section: "",
  difficulty: "",
  problemCode: "",
  figureUrls: [],
  figureDims: [],
  figureSourceMm: [],
  figureSvg: null,
  topic: "",
};
const native = {
  ...plain,
  ocr: {
    number: 1,
    blocks: [
      { type: "text" as const, value: "1. 값을 구하시오. [3점]", rows: [] },
    ],
    choiceGroups: [],
    subQuestions: [
      {
        number: 1,
        score: 2,
        printedScore: "2.0",
        contents: [
          {
            type: "text" as const,
            value: "(1) 이유를 쓰시오. [2점]",
            rows: [],
          },
        ],
      },
    ],
    score: 3,
    printedScore: "3.0",
    confidence: "high" as const,
    choicesLayout: "auto" as const,
    bodyMissing: false,
    choicesMissing: false,
  },
};

describe("print score visibility", () => {
  it("keeps arithmetic readable without increasing general bank body type", () => {
    const { container, rerender } = render(
      <ProblemBody
        problem={{ ...plain, source: { kind: "arithmeticSheet" } }}
        fontSize={11.5}
        compact
        options={DEFAULT_PRINT_OPTIONS}
      />,
    );
    expect(container.querySelector("[data-problem-body]")).toHaveStyle({
      fontSize: "20px",
    });
    rerender(
      <ProblemBody
        problem={plain}
        fontSize={11.5}
        compact
        options={DEFAULT_PRINT_OPTIONS}
      />,
    );
    expect(container.querySelector("[data-problem-body]")).toHaveStyle({
      fontSize: "11.5px",
    });
  });

  it.each(Object.entries(TEMPLATE_COMPONENTS))(
    "%s hides parent/subquestion points and restores them",
    (_, Template) => {
      const before = JSON.stringify(native);
      const props = {
        page: 1,
        totalPages: 1,
        columns: 1 as const,
        meta: { ...DEFAULT_PRINT_META, totalScore: 100 },
        startingNumber: 1,
        problems: [{ id: native.id, variant: native }],
        options: DEFAULT_PRINT_OPTIONS,
      };
      const { container, rerender } = render(<Template {...props} />);
      expect(
        container.querySelector("[data-problem-body]")?.textContent,
      ).not.toContain("점");
      rerender(
        <Template
          {...props}
          options={{ ...DEFAULT_PRINT_OPTIONS, hideScores: false }}
        />,
      );
      expect(
        container.querySelector("[data-problem-body]")?.textContent,
      ).toContain("[3.0점]");
      expect(
        container.querySelector("[data-native-subquestion]")?.textContent,
      ).toContain("[2.0점]");
      expect(JSON.stringify(native)).toBe(before);
    },
  );

  it.each([
    plain,
    {
      ...native,
      content: plain.content,
      ocr: { ...native.ocr, contentEdited: true },
    },
  ])(
    "hides plain/edited imported scores while retaining math and restoring original display",
    (problem) => {
      const { container, rerender } = render(
        <ProblemBody
          problem={problem}
          options={{ ...DEFAULT_PRINT_OPTIONS, hideScores: false }}
        />,
      );
      const original = container.innerHTML;
      const before = JSON.stringify(problem);
      rerender(
        <ProblemBody problem={problem} options={DEFAULT_PRINT_OPTIONS} />,
      );
      expect(container.textContent).not.toContain("점");
      expect(container.querySelector("annotation")).toHaveTextContent("x=3");
      expect(container.textContent).toContain("(1)");
      rerender(
        <ProblemBody
          problem={problem}
          options={{ ...DEFAULT_PRINT_OPTIONS, hideScores: false }}
        />,
      );
      expect(container.innerHTML).toBe(original);
      expect(JSON.stringify(problem)).toBe(before);
    },
  );

  it("does not hide original/review scores or change source images and SVG labels", () => {
    const { container, rerender } = render(<UnifiedProblem problem={native} />);
    expect(container.textContent).toContain("[3.0점]");
    const image = {
      ...native,
      croppedImage: "data:image/png;base64,original",
      content: "원본 [3점]",
    };
    rerender(<ProblemBody problem={image} options={DEFAULT_PRINT_OPTIONS} />);
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      image.croppedImage,
    );
    expect(container.querySelector("img")).toHaveAttribute(
      "alt",
      image.content,
    );
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><text>[3점]</text></svg>';
    rerender(
      <ProblemBody
        problem={{ ...plain, figureSvg: svg }}
        options={DEFAULT_PRINT_OPTIONS}
      />,
    );
    expect(container.querySelector("svg text")).toHaveTextContent("[3점]");
  });

  it("uses numeric OCR scores without touching choice values", () => {
    const problem = {
      ...native,
      ocr: {
        ...native.ocr,
        printedScore: undefined,
        score: 4.5,
        blocks: [{ type: "text" as const, value: "값을 구하시오.", rows: [] }],
        subQuestions: [
          {
            number: 1,
            score: 2.5,
            contents: [
              { type: "text" as const, value: "(1) 이유를 쓰시오.", rows: [] },
            ],
          },
        ],
        choiceGroups: [
          {
            number: 1,
            contents: [{ type: "equation" as const, value: "3", rows: [] }],
          },
        ],
      },
    };
    const { container, rerender } = render(
      <ProblemBody problem={problem} options={DEFAULT_PRINT_OPTIONS} />,
    );
    expect(
      container.querySelector("[data-native-choice] annotation"),
    ).toHaveTextContent("3");
    expect(container.textContent).not.toContain("4.5점");
    expect(container.textContent).not.toContain("2.5점");
    rerender(
      <ProblemBody
        problem={problem}
        options={{ ...DEFAULT_PRINT_OPTIONS, hideScores: false }}
      />,
    );
    expect(container.textContent).toContain("[4.5점]");
    expect(container.textContent).toContain("[2.5점]");
  });
});
