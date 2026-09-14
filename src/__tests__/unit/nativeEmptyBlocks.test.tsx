import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Root } from "mdast";
import { MarkdownRenderer } from "@/components/math/MarkdownRenderer";
import { remarkEmptyBlockquotes } from "@/components/math/remarkNativeContent";
import { ProblemContent } from "@/components/math/ProblemContent";
import NativeProblem from "@/components/unified/NativeProblem";
import type { StudioProblem } from "@/components/unified/types";
import { blocksToMarkdown } from "@/lib/mathgen/blocksToMarkdown";
import type { ContentBlock } from "@/lib/mathgen/contracts";

const text = (value: string): ContentBlock => ({
  type: "text",
  value,
  rows: [],
});
const stem =
  "17. [서답형 1] 이차방정식 $(x-2)^2=6$의 해 중 일차부등식 $3x-7<x-5$를 만족시키는 해를 구하고, 그 과정을 다음 <조건>을 포함하여 서술하시오. [6점]";
const condition =
  "<조건>\n○ 주어진 이차방정식을 풀 것\n○ 주어진 일차부등식을 풀 것";
const blocks = [text(stem), text(condition)];
const problem: StudioProblem = {
  id: "native-empty-condition-regression",
  content: blocksToMarkdown(blocks),
  answer: "",
  solution: "",
  grade: "중3",
  chapter: "",
  section: "",
  difficulty: "",
  problemCode: "",
  figureUrls: [],
  figureSvg: null,
  figureDims: [],
  figureSourceMm: [],
};
const withOcr = (contents: ContentBlock[]): StudioProblem => ({
  ...problem,
  ocr: {
    number: 17,
    blocks: contents,
    choiceGroups: [],
    subQuestions: [],
    confidence: "high",
    choicesLayout: "auto",
    bodyMissing: false,
    choicesMissing: false,
  },
});
// Both generic quotes and recognized condition cards use this existing border.
const quoteSelector = 'div[class*="my-4 border"]';

describe("native OCR empty bordered blocks", () => {
  it.each([false, true])(
    "drops the orphan quote from a saved serialized condition (print=%s)",
    (print) => {
      // parseProblemContent rebuilds an already quoted condition marker and leaves
      // a bare `>` before it: this fixture reproduced the reported extra rectangle.
      const stored = JSON.stringify(problem);
      const { container } = render(
        <NativeProblem problem={problem} print={print} />,
      );
      expect(container.querySelectorAll(quoteSelector)).toHaveLength(1);
      const box = container.querySelector("[data-box-card]");
      expect(box).toHaveTextContent("주어진 이차방정식을 풀 것");
      expect(box).toHaveTextContent("주어진 일차부등식을 풀 것");
      expect(container.querySelectorAll("[data-box-item]")).toHaveLength(2);
      expect(container.querySelectorAll("img, .katex-error")).toHaveLength(0);
      expect(container.querySelectorAll("annotation")).toHaveLength(2);
      expect(JSON.stringify(problem)).toBe(stored);
    },
  );

  it.each([false, true])(
    "drops a bare quote emitted by typed OCR without changing condition content (print=%s)",
    (print) => {
      const native = withOcr([text(stem), text("> \n\n"), text(condition)]);
      const stored = JSON.stringify(native);
      const { container } = render(
        <NativeProblem problem={native} print={print} />,
      );
      expect(container.querySelectorAll(quoteSelector)).toHaveLength(1);
      const box = container.querySelector(quoteSelector);
      expect(box).toHaveTextContent("주어진 이차방정식을 풀 것");
      expect(box).toHaveTextContent("주어진 일차부등식을 풀 것");
      expect(container.querySelectorAll("img, .katex-error")).toHaveLength(0);
      expect(container.querySelectorAll("annotation")).toHaveLength(2);
      expect(JSON.stringify(native)).toBe(stored);
    },
  );

  it.each([">", "> \n> \n", "> > \n> >", "> &nbsp;"])(
    "removes a structurally empty quote: %j",
    (content) => {
      const { container } = render(
        <MarkdownRenderer content={content} nativeFigures={[]} />,
      );
      expect(container.querySelectorAll(quoteSelector)).toHaveLength(0);
    },
  );

  it.each([
    ["condition", "> &lt;조건1&gt;\n>\n> (가) $x>0$"],
    ["answer line", "> ___"],
    ["dotted answer line", "> ············"],
    ["blank answer formula", String.raw`> $\boxed{\phantom{0}}$`],
    ["formula", "> $x^2=6$"],
    ["figure anchor", "> [그림1]"],
    ["code", "> `>`"],
  ])("preserves %s inside a quote", (_name, content) => {
    const { container } = render(
      <MarkdownRenderer
        content={content}
        nativeFigures={[{ src: "/condition-figure.png" }]}
      />,
    );
    expect(container.querySelectorAll(quoteSelector)).toHaveLength(1);
    expect(container.querySelectorAll(".katex-error")).toHaveLength(0);
  });

  it("keeps intentional blank table cells and print answer space", () => {
    const native = withOcr([
      text("빈칸을 채우시오."),
      {
        type: "table",
        value: "",
        rows: [
          ["", ""],
          ["", ""],
        ],
      },
    ]);
    native.ocr!.subQuestions = [
      { number: 1, contents: [text("답을 쓰시오.")] },
    ];
    const { container } = render(<NativeProblem problem={native} print />);
    expect(container.querySelectorAll("[data-native-table] td")).toHaveLength(
      4,
    );
    expect(
      container.querySelectorAll("[data-native-solve-space]"),
    ).toHaveLength(1);
  });

  it("keeps structural leaves even when they have no text", () => {
    const tree: Root = {
      type: "root",
      children: [
        {
          type: "blockquote",
          children: [{ type: "paragraph", children: [{ type: "break" }] }],
        },
        {
          type: "blockquote",
          children: [
            {
              type: "table",
              children: [
                {
                  type: "tableRow",
                  children: [{ type: "tableCell", children: [] }],
                },
              ],
            },
          ],
        },
        { type: "blockquote", children: [{ type: "html", value: "<input>" }] },
      ],
    };
    const original = structuredClone(tree);
    remarkEmptyBlockquotes()(tree);
    expect(tree).toEqual(original);
  });

  it("also removes a bare quote on the shared saved-Markdown path", () => {
    const { container } = render(<MarkdownRenderer content=">" />);
    expect(container.querySelectorAll(quoteSelector)).toHaveLength(0);
  });

  it("repairs the legacy ProblemContent condition without rewriting stored formulas", () => {
    const original = problem.content;
    const { container } = render(<ProblemContent content={original} />);
    expect(container.querySelectorAll(quoteSelector)).toHaveLength(1);
    const box = container.querySelector("[data-box-card]");
    expect(box).toHaveTextContent("주어진 이차방정식을 풀 것");
    expect(box).toHaveTextContent("주어진 일차부등식을 풀 것");
    expect(container.querySelectorAll("[data-box-item]")).toHaveLength(2);
    expect(container.querySelectorAll("annotation")).toHaveLength(2);
    expect(problem.content).toBe(original);
  });
});
