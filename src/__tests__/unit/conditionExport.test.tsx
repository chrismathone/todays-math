import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarkdownRenderer } from "@/components/math/MarkdownRenderer";
import NativeProblem from "@/components/unified/NativeProblem";
import { blocksToMarkdown } from "@/lib/mathgen/blocksToMarkdown";
import type { ContentBlock } from "@/lib/mathgen/contracts";
import type { StudioProblem } from "@/components/unified/types";
import { splitBoxSegments } from "@/lib/math/boxBlock";

const text = (value: string): ContentBlock => ({
  type: "text",
  value,
  rows: [],
});
const blocks = [
  text("다음 조건을 만족하는 수를 구하시오."),
  text("<조건> • 첫째 조건이다.\n이어지는 설명이다. • 둘째 조건이다."),
];
const problem: StudioProblem = {
  id: "condition",
  content: "",
  answer: "",
  solution: "",
  grade: "중1",
  chapter: "",
  section: "",
  difficulty: "",
  problemCode: "",
  figureUrls: [],
  figureSvg: null,
  figureDims: [],
  figureSourceMm: [],
  ocr: {
    number: 1,
    blocks,
    choiceGroups: [],
    subQuestions: [],
    confidence: "high",
    choicesLayout: "auto",
    bodyMissing: false,
    choicesMissing: false,
  },
};

describe("condition export content", () => {
  it("does not expose quote prefixes as condition items in saved Markdown", () => {
    const content = blocksToMarkdown([
      text("다음 조건을 쓰시오."),
      text("<조건>\n○ 첫째 조건이다.\n○ 둘째 조건이다."),
    ]);
    const { container } = render(
      <NativeProblem problem={{ ...problem, content, ocr: undefined }} print />,
    );
    expect(container.querySelectorAll("[data-box-item]")).toHaveLength(2);
    expect(
      container.querySelector("[data-box-card]")?.textContent,
    ).not.toContain(">");
  });
  it("unwraps only explicitly labelled quote syntax, preserving inequalities and other quotes", () => {
    const quote = "> 일반 인용문\n> $a>b$이다.";
    expect(splitBoxSegments(quote)).toEqual([{ kind: "text", text: quote }]);
    const parsed = splitBoxSegments(
      "> <조건>\n>\n> • $a>b$이다.\n>\n> • $c<d$이다.\n\n마지막 발문이다. [6점]",
    );
    const box = parsed.find((segment) => segment.kind === "box");
    expect(box).toMatchObject({
      lead: "",
      items: ["• $a>b$이다.", "• $c<d$이다."],
    });
    const tail = parsed.at(-1)!;
    expect(tail.kind).toBe("text");
    if (tail.kind === "text")
      expect(tail.text.trim()).toBe("마지막 발문이다. [6점]");
  });
  it("preserves bullets and quotes every continuation without changing the source", () => {
    const before = structuredClone(blocks);
    const markdown = blocksToMarkdown(blocks);
    expect(markdown).toContain(
      "> <조건>\n>\n> • 첫째 조건이다.\n> 이어지는 설명이다.\n>\n> • 둘째 조건이다.",
    );
    expect(blocks).toEqual(before);
  });

  it("preserves multiline inequalities and the score after a quoted box", () => {
    const segments = splitBoxSegments(
      "> <조건>\n>\n> ㄱ. $$a>\n> b$$이다.\n>\n> ㄴ. $c<d$이다.\n\n발문을 마친다. [6점]",
    );
    const box = segments.find((segment) => segment.kind === "box");
    expect(box).toMatchObject({
      lead: "",
      items: ["ㄱ. $$a>\nb$$이다.", "ㄴ. $c<d$이다."],
    });
    const tail = segments.at(-1)!;
    expect(tail.kind).toBe("text");
    if (tail.kind === "text") expect(tail.text).toContain("[6점]");
  });

  it("renders native conditions as a label followed by two ordinary bullet items", () => {
    const { container } = render(<NativeProblem problem={problem} print />);
    expect(container.querySelector("[data-box-header]")?.textContent).toBe(
      "〈조건〉",
    );
    const items = container.querySelectorAll("[data-box-item]");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("• 첫째 조건이다.");
    expect(items[0]).toHaveTextContent("이어지는 설명이다.");
    expect(items[1]).toHaveTextContent("• 둘째 조건이다.");
    expect(container.querySelector("[data-box-header] strong")).toBeNull();
    expect(container.querySelector("[data-box-item] strong")).toBeNull();
  });

  it("separates previously serialized compact quote lines from their heading", () => {
    const { container } = render(
      <MarkdownRenderer
        content={"> <조건>\n> • 첫째 $x$ 조건이다.\n> • 둘째 조건이다."}
      />,
    );
    expect(container.querySelector("[data-box-header]")?.textContent).toBe(
      "〈조건〉",
    );
    expect(container.querySelectorAll("[data-box-item]")).toHaveLength(2);
    expect(container.querySelector("[data-box-item] .katex")).not.toBeNull();
    expect(container.querySelector("[data-box-item]")).toHaveTextContent(
      "• 첫째",
    );
  });

  it("retains unlabelled boxes without inventing a heading or losing continuation text", () => {
    const markdown = blocksToMarkdown([text("<상자> • 첫째\n설명 • 둘째")]);
    const { container } = render(<MarkdownRenderer content={markdown} />);
    expect(container.querySelector("[data-box-header]")).toBeNull();
    expect(container).toHaveTextContent("• 첫째");
    expect(container).toHaveTextContent("설명");
    expect(container).toHaveTextContent("• 둘째");
  });
});
