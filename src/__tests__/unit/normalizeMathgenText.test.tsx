import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MathText } from "@/components/math/MathText";
import { ProblemContent } from "@/components/math/ProblemContent";
import {
  normalizeMathgenAnswer,
  normalizeMathgenText,
} from "@/lib/math/normalizeMathgenText";
import { preprocessMathText } from "@/lib/math/textPreprocess";
import { tokenizeMath } from "@/lib/math/segments";
import { renderMathHtml } from "@/lib/math/renderMathHtml";
import { parseDevAiResult } from "@/lib/dev-ai/tasks";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";

const reported = String.raw`\displaystyle 15.\[함수 $f(x)=x^2$에 대하여 $f(2)$의 값을 구하시오.\]`;
const clean = String.raw`15.함수 $f(x)=x^2$에 대하여 $f(2)$의 값을 구하시오.`;
const visible = (html: string) => {
  const root = document.createElement("div");
  root.innerHTML = html;
  root.querySelectorAll(".katex").forEach((node) => node.remove());
  return root.textContent ?? "";
};
const expectSafe = (html: string) => {
  expect(html).toContain("katex");
  expect(html).not.toMatch(/katex-error|math-raw|#cc0000/);
  expect(visible(html)).not.toMatch(/\\(?:displaystyle|frac|\[|\])/);
};

describe("Mathgen postprocessing parity with conservative guards", () => {
  it.each([
    reported,
    reported.slice(0, -2),
    String.raw`\displaystyle $$이동 거리= $x(b)-x(a)=8.$`,
  ])("repairs the reported prose-prefixed display: %s", (input) => {
    const output = normalizeMathgenText(input);
    expect(output).not.toMatch(/\\displaystyle|\$\$|\\\[|\\\]/);
    expectSafe(renderMathHtml(input));
    expect(normalizeMathgenText(output)).toBe(output);
  });
  it("repairs saved recognition in both the shared React and HTML render paths", () => {
    expect(normalizeMathgenText(reported)).toBe(clean);
    for (const html of [
      renderMathHtml(reported),
      renderToStaticMarkup(<MathText text={reported} />),
      renderToStaticMarkup(<ProblemContent content={reported} />),
    ]) {
      expectSafe(html);
      expect(visible(html)).toContain("함수");
      expect(visible(html)).toContain("의 값을 구하시오.");
    }
  });
  it.each([
    String.raw`$\frac{9}{4}$`,
    String.raw`$$\displaystyle\sum_{k=1}^{n}k$$`,
    String.raw`$\left\[\frac{1}{2}\right\]$`,
    String.raw`$\{x\mid x>0\}$`,
    String.raw`$\sqrt[3]{8}=2$`,
    String.raw`$\text{3 times per day at 3 pm sharp}$`,
    String.raw`$\begin{cases}x&\text{양수}\\0&\text{그 외}\end{cases}$`,
    "수량은 1,000원, 15.5kg, 3.14이고 시간은 3 pm이다.",
    "Read the note.\nnext line\ttext stays.\rnew paragraph.",
    String.raw`Read this at times when pm is printed.`,
    String.raw`\[참고\]는 표기이며 \(선택\)도 보존한다.`,
    String.raw`\\[참고\\]는 이스케이프된 표기이다.`,
    String.raw`<svg><text>\frac{1}{2}</text></svg>`,
    String.raw`<table><tr><td>1,000</td></tr></table>`,
    String.raw`![그림](figure.png)`,
    "`\\frac{1}{2}` and ```tex\n\\frac{1}{2}\n```",
    "```tex\n" + reported + "\n```",
  ])("preserves legitimate source content and is idempotent: %s", (input) => {
    expect(normalizeMathgenText(input)).toBe(input);
    expect(normalizeMathgenText(normalizeMathgenText(input))).toBe(input);
  });
  it("converts actual slash delimiters without touching bracket commands inside math", () => {
    expect(normalizeMathgenText(String.raw`\[\frac{1}{2}\]`)).toBe(
      String.raw`$$\frac{1}{2}$$`,
    );
    expectSafe(renderMathHtml(String.raw`$\left\[\frac{1}{2}\right\]$`));
  });
  it("recovers JSON control damage only with known command evidence", () => {
    const input = "$\frac{1}{2} \times 3 + \theta + \nabla f + \rho$";
    const output = normalizeMathgenText(input);
    expect(output).toBe(
      String.raw`$\frac{1}{2} \times 3 + \theta + \nabla f + \rho$`,
    );
    expectSafe(renderMathHtml(input));
    expect(normalizeMathgenText("\ttext\nnext\rrow")).toBe("\ttext\nnext\rrow");
  });
  it("removes only empty internal KaTeX placeholders, preserving actual content and code", () => {
    const placeholder = '<span data-katex-id="math-0"></span>';
    expect(normalizeMathgenText("앞" + placeholder + "뒤")).toBe("앞뒤");
    expect(
      normalizeMathgenText(
        "앞&lt;span data-katex-id=&quot;math-0&quot;&gt;&lt;/span&gt;뒤",
      ),
    ).toBe("앞뒤");
    expect(normalizeMathgenText("`" + placeholder + "`")).toBe(
      "`" + placeholder + "`",
    );
    const content = '<span data-katex-id="math-0">원문</span>';
    expect(normalizeMathgenText(content)).toBe(content);
  });
  it("protects a loose balanced fraction without swallowing prose or choices", () => {
    const input = String.raw`$x=-1$ 또는 \frac{\sqrt{2}}{2}이다. ① \frac{1}{2} ② 2`;
    expect(normalizeMathgenText(input)).toBe(
      String.raw`$x=-1$ 또는 $\frac{\sqrt{2}}{2}$이다. ① $\frac{1}{2}$ ② 2`,
    );
    expectSafe(renderMathHtml(input));
    expect(visible(renderMathHtml(input))).toContain("이다. ①");
  });
  it("closes the brace a pulled-in prefix opened instead of cutting the group", () => {
    // 앞머리 `A^{` 를 끌어오면 `{` 는 수식 안에 있는데 짝 `}` 는 밖에 남아
    // `$A^{\bigstar$}` 가 됐다 — KaTeX 가 거부해 지면에 원문이 드러났다.
    const input = String.raw`에 대하여 A^{\bigstar}=\{x+y \mid x \in A\}로 정의한다.`;
    const once = normalizeMathgenText(input);
    expect(once).toBe(
      String.raw`에 대하여 $A^{\bigstar}=\{x+y \mid x \in A\}$로 정의한다.`,
    );
    expect(normalizeMathgenText(once)).toBe(once);
    expectSafe(renderMathHtml(input));
  });
  it("restores Mathgen circled markers before wrapping without broadening existing choice glyphs", () => {
    const input = String.raw`\textcircled{1} $\frac{1}{2}$ \textcircled{2} 3, \textcircled{ㄱ}, \textcircled{가}, ❶ 규칙`;
    expect(normalizeMathgenText(input)).toBe(
      String.raw`① $\frac{1}{2}$ ② 3, ㉠, ㉮, ❶ 규칙`,
    );
  });
  it("repairs saved circled choices before the shared problem parser splits them", () => {
    const input =
      "값은?\n" +
      String.raw`\textcircled{1} $\frac{1}{2}$` +
      "\n" +
      String.raw`\textcircled{2} $2$`;
    expect(parseProblemContent(input).choices).toEqual([
      String.raw`$\frac{1}{2}$`,
      "$2$",
    ]);
  });
  it.each([
    String.raw`5 - \frac{1}{3} \times \left[\frac{9}{7}-9\right]의 값은?`,
    String.raw`\sum_{k=1}^{n}k의 값은?`,
    String.raw`\sqrt[3]{8}=2이다. ① 2 ② 3`,
    String.raw`\begin{cases}x&\text{양수}\\0&\text{그 외}\end{cases}`,
  ])(
    "wraps full loose expressions with scripts and delimiter pairs: %s",
    (input) => {
      const once = normalizeMathgenText(input);
      expect(normalizeMathgenText(once)).toBe(once);
      expectSafe(renderMathHtml(input));
      expect(
        tokenizeMath(once).filter((segment) => segment.type !== "text").length,
      ).toBe(1);
    },
  );
  it("spaces answer lists while preserving quantities and math commas", () => {
    expect(
      normalizeMathgenAnswer(String.raw`-28,-22,-16,1,000원,$(1,2)$`),
    ).toBe(String.raw`-28, -22, -16, 1,000원, $(1,2)$`);
    expect(normalizeMathgenAnswer("1,000,000원")).toBe("1,000,000원");
  });
  it("keeps formula and choice boundaries stable across repeated preprocessing", () => {
    const input = reported + "\n① $1$\n② $4$\n③ $9$";
    const once = preprocessMathText(input);
    expect(preprocessMathText(once)).toBe(once);
    expect(
      tokenizeMath(once)
        .filter((segment) => segment.type !== "text")
        .every((segment) => !/[가-힣①②③]/.test(segment.value)),
    ).toBe(true);
  });
  it("does not promote the problem parser's escaped list period into math", () => {
    const input = String.raw`15\.함수 $f(x)=x^2$의 값을 구하시오.`;
    expectSafe(renderToStaticMarkup(<MathText text={input} />));
    expect(
      tokenizeMath(preprocessMathText(input)).filter(
        (segment) => segment.type !== "text",
      ),
    ).toHaveLength(1);
  });
  it("keeps escaped prose brackets outside math through the complete preprocessor", () => {
    const input = String.raw`\\[참고\\] 및 \[선택\]`;
    expect(tokenizeMath(preprocessMathText(input))).toEqual([
      { type: "text", value: input },
    ]);
  });
});

describe("new dev-ai responses use the same text normalization", () => {
  it("parses valid JSON before attempting LaTeX repair, preserving ordinary whitespace", () => {
    const content =
      "Read the text.\nnext line\ttext starts here.\n" +
      String.raw`$\frac{1}{2}\times 3$`;
    const result = parseDevAiResult(JSON.stringify({ content }), "ocr");
    expect(result.content).toBe(content);
  });
  it("still repairs malformed JSON escapes and post-parse control damage", () => {
    const result = parseDevAiResult(
      String.raw`{"content":"값은 $\frac{1}{2}+\sqrt{4}$이다."}`,
      "ocr",
    );
    expect(result.content).toBe(String.raw`값은 $\frac{1}{2}+\sqrt{4}$이다.`);
    const validButDamaged = parseDevAiResult(
      String.raw`{"content":"값은 $\frac{1}{2} \times 3$이다."}`,
      "ocr",
    );
    expect(validButDamaged.content).toBe(
      String.raw`값은 $\frac{1}{2} \times 3$이다.`,
    );
  });
  it("normalizes crop OCR and preserves existing valid formulas", () => {
    const result = parseDevAiResult(
      JSON.stringify({ content: reported, answer: "1,000원" }),
      "ocr",
    );
    expect(result.content).toBe(clean);
    expect(result.answer).toBe("1,000원");
  });
  it("normalizes every page problem without changing coordinates or metadata", () => {
    const bbox = { left: 0, top: 0, width: 300, height: 300 };
    const result = parseDevAiResult(
      JSON.stringify({
        problems: [{ content: reported, answer: "-28,-22", bbox }],
      }),
      "page-ocr",
    );
    expect(result.problems?.[0]).toMatchObject({
      content: clean,
      answer: "-28, -22",
      bbox,
    });
  });
  it("normalizes answer and solution without another AI call", () => {
    const result = parseDevAiResult(
      JSON.stringify({ answer: "-28,-22", solution: reported }),
      "solution",
    );
    expect(result.answer).toBe("-28, -22");
    expect(result.solution).toBe(clean);
  });
});

describe("해설 줄머리 앞 글자 그대로의 \\n — 원장님 2026-11-11 «일부 해설에서 \\n 으로 나온다»", () => {
  it("«…이다.\\nstep2)»는 줄바꿈 · 수식 안의 \\neq · \\notin 은 그대로", () => {
    const raw =
      "step1) $B\\cap X=\\{4\\}$이므로 $2\\notin X$, $a\\neq b$이다.\\nstep2) 따라서 $a+b=-2$이다.\\nstep10) 끝.";
    const out = normalizeMathgenText(raw);
    expect(out).toBe(
      "step1) $B\\cap X=\\{4\\}$이므로 $2\\notin X$, $a\\neq b$이다.\nstep2) 따라서 $a+b=-2$이다.\nstep10) 끝.",
    );
    // 화면에도 글자 \n 이 남지 않는다.
    expect(renderToStaticMarkup(<ProblemContent content={raw} />)).not.toMatch(
      /\\nstep/,
    );
  });
});
