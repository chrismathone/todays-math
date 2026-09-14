import { describe, expect, it } from "vitest";
import { hideQuestionScores } from "@/components/unified/questionScoreDisplay";
import { repositionScore } from "@/components/unified/nativeProblemLayout";

describe("display-only question point labels", () => {
  it("does not infer a question score from source SVG text or edit its labels", () => {
    const svg = "<svg>\n<text>[9점]</text>\n</svg>";
    const source = `값을 구하시오.\n\n${svg}`;
    expect(repositionScore(source)).toBe(source);
    expect(repositionScore(source, 3)).toBe(`값을 구하시오. [3점]\n\n${svg}`);
    expect(repositionScore(source, 3, false)).toBe(source);
  });
  it.each([
    "[3점]",
    "[ 3.0 점 ]",
    "[총 5점]",
    String.raw`\[3점\]`,
    "$[3점]$",
    "$$[3점]$$",
    String.raw`\([3점]\)`,
    String.raw`$\left[3\,\text{점}\right]$`,
    String.raw`[$3$점]`,
    String.raw`[$3\mathrm{점}$]`,
    String.raw`$\text{[3점]}$`,
    "**[3점]**",
    "__[3점]__",
  ])("removes only the complete score token %s", (score) => {
    expect(
      hideQuestionScores(`값을 구하시오. ${score}\n(1) 이유를 쓰시오. [2점]`),
    ).toBe("값을 구하시오. \n(1) 이유를 쓰시오. ");
  });

  it.each([
    "$[3, 5]$",
    "$[3점]+x$",
    String.raw`$3\text{점}+x$`,
    String.raw`\([3점]+x\)`,
    "세 점 A, B, C와 3점의 좌표",
    "[3]",
    "(3)",
    String.raw`한 번 이길 때마다 $3\text{점}$을 얻는다.`,
    String.raw`$3\text{점}$`,
    String.raw`\[3\text{점}+x\]`,
    "① [3점]\n② [4점]",
    "| 점수 | [3점] |",
    String.raw`$x=3.0,\; y=2$`,
    "[그림3]",
    "[서술형]",
    '<svg><text>[3점]</text><text x="3">A</text></svg>',
    '<figure><img src="/q[3점].png" /><figcaption>[3점]</figcaption></figure>',
    '![원본 [3점]](/q[3점].png "[3점]")',
    String.raw`![원본 \[3점\]](/q.png)`,
    '![3점][source]\n\n[source]: /image.png "[3점]"',
    "![3점]\n\n[3점]: /image.png",
    "<table><tr><td>[3점]</td></tr></table>",
    '[출처 [3점]](/source "[3점]")',
    "`[3점]`",
    "```text\n[3점]\n```",
    '<span title="[3점]">A</span>',
  ])(
    "preserves mathematical values and protected source markup: %s",
    (source) => {
      expect(hideQuestionScores(source)).toBe(source);
    },
  );
});
