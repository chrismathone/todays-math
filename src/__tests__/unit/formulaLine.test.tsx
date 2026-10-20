/**
 * «글 다음 식만 있는 줄» — 한 줄 여백 + 가운데 (원장님 2026-10-20 «글과 식 사이에 한 줄 정도 여백을 두고, 식만 가운데»).
 *
 * 규칙은 `src/lib/math/formulaLine.ts` 한 곳이고 지면(remark 플러그인)과 높이 자(`estimateProblemPx`)가 같이 부른다.
 * 렌더 · 자의 «동률»만 보면 둘이 같이 틀려도 초록이다 — 그래서 꼴마다 «붙는다 / 안 붙는다»를 따로 단정한다(Codex 검토).
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MathText } from "@/components/math/MathText";
import { ProblemContent } from "@/components/math/ProblemContent";
import {
  formulaGapLines,
  formulaLinePlan,
  isFormulaOnlyParagraph,
} from "@/lib/math/formulaLine";
import { preprocessMarkdown } from "@/lib/math/markdownPreprocess";
import { estimateProblemPx, JASEUP_RULER } from "@/lib/printOverflow";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";

describe("isFormulaOnlyParagraph", () => {
  it("식 하나, 또는 쉼표로 가른 식 나열이면 참", () => {
    expect(isFormulaOnlyParagraph("$563\\times42$")).toBe(true);
    expect(isFormulaOnlyParagraph("$\\frac{5}{7}$,  $\\frac{6}{7}$")).toBe(true);
    expect(isFormulaOnlyParagraph("$567+723=\\square$")).toBe(true);
    expect(isFormulaOnlyParagraph("$$x+1=2$$")).toBe(true);
  });
  it("글이 섞이거나, 식 여럿을 공백만으로 이었거나(합쳐진 번호 없는 보기), 비면 거짓", () => {
    expect(isFormulaOnlyParagraph("$3$시간 $39$분, $2$시간 $1$분")).toBe(false);
    expect(isFormulaOnlyParagraph("$a$ 의 값을 구하시오.")).toBe(false);
    expect(isFormulaOnlyParagraph("$5-3x\\ge x+9$ $6x\\le3x+1$")).toBe(false);
    expect(isFormulaOnlyParagraph("   ")).toBe(false);
  });
});

describe("formulaLinePlan", () => {
  it("글 바로 뒤의 식 문단 하나만", () => {
    expect(formulaLinePlan(["text", "formula"])).toEqual([false, true]);
    expect(formulaLinePlan(["text", "formula", "text"])).toEqual([false, true, false]);
  });
  it("앞에 글이 없는 식(계산만 있는 문항) · 상자 뒤의 식 · 잇단 식(번호 없는 보기)은 그대로", () => {
    expect(formulaLinePlan(["formula"])).toEqual([false]);
    expect(formulaLinePlan(["other", "formula"])).toEqual([false, false]);
    expect(formulaLinePlan(["text", "formula", "formula"])).toEqual([false, false, false]);
  });
});

function html(content: string): string {
  return renderToStaticMarkup(<ProblemContent content={content} deferFigures={false} />);
}

const FLAG = '<p class="leading-relaxed" data-formula-line="" style="text-align:center;margin-block-start:1lh">';

describe("지면 — ProblemContent 발문", () => {
  it("«…구하시오.» 뒤 식만 문단(원장님이 보신 초4 1-3-3)에 가운데 · 위 한 줄", () => {
    const out = html("다음 곱셈을 어림하려고 합니다. $815$를 몇백으로 어림한 값과 $57$을 몇십으로 어림한 값의 합을 구하시오.\n\n$815\\times57$");
    expect(out).toContain(FLAG);
    expect(out.match(/data-formula-line/g)).toHaveLength(1);
  });
  it("중등 «…구하시오.\\n$식$» (줄바꿈 하나)도 파서가 문단으로 세우므로 같다", () => {
    expect(html("다음 등식이 성립할 때, $\\square$ 안에 알맞은 식을 구하시오.\n$3x\\times\\square=6x^{2}$")).toContain(FLAG);
  });
  it("쉼표 나열(«다음 두 분수 중 …» 뒤 «$\\frac57$,  $\\frac67$»)도 한 줄로 가운데", () => {
    expect(html("다음 두 분수 중 더 큰 분수를 쓰시오.\n\n$\\frac{5}{7}$,  $\\frac{6}{7}$")).toContain(FLAG);
  });
  it("한 줄 `$$…$$` 도 같다 — 자도 한 줄을 센다", () => {
    const content = "다음을 구하시오.\n\n$$x+1=2$$";
    expect(html(content)).toContain(FLAG);
    expect(formulaGapLines(preprocessMarkdown(parseProblemContent(content).question))).toBe(1);
  });
  it("번호 없는 보기(«…아닌 것은?» 뒤 식 줄들 — 파서가 한 줄로 합친다)에는 붙지 않는다", () => {
    const out = html("다음 중 일차부등식이 아닌 것은?\n\n$5-3x\\ge x+9$\n\n$6x\\le3x+1$\n\n$x-2x^{2}>7-2x^{2}$");
    expect(out).not.toContain("data-formula-line");
  });
  it("식만 있는 단독 문항 · 보기 ①~⑤ 에는 붙지 않는다", () => {
    expect(html("$141\\times90=\\square$")).not.toContain("data-formula-line");
    expect(html("다음 중 가장 큰 수는?\n① $1$\n② $2$\n③ $3$\n④ $4$\n⑤ $5$")).not.toContain("data-formula-line");
  });
  it("🔴 현행(후보로 남김): 홑 줄바꿈 뒤 쉼표 나열(중1 «…구하시오.\\n$2$, $3$, $x$») 은 한 문단 안의 줄이라 아직 대상 밖", () => {
    expect(html("다음 수 중 가장 큰 수를 구하시오.\n$2$, $3$, $5$")).not.toContain("data-formula-line");
  });
  it("정답 · 해설(MathText)은 바뀌지 않는다", () => {
    const out = renderToStaticMarkup(<MathText as="div" text={"몫은 다음과 같다.\n\n$563\\times42$"} />);
    expect(out).not.toContain("data-formula-line");
  });
});

describe("높이 자 — 지면이 더한 여백을 같이 센다", () => {
  it("식 문단 위 여백 한 줄", () => {
    const text = estimateProblemPx("다음을 구하시오.\n\n다음을 보시오.");
    const formula = estimateProblemPx("다음을 구하시오.\n\n$563\\times42$");
    expect(formula - text).toBe(JASEUP_RULER.line);
  });
  it("지면이 단 표지 수와 자가 센 줄 수가 같다", () => {
    const samples = [
      "다음 곱셈을 어림하려고 합니다. 합을 구하시오.\n\n$563\\times42$",
      "다음 식을 보시오.\n\n$2x+3=7$\n\n이때 $x$의 값을 구하시오.",
      "다음 두 분수 중 더 큰 분수를 쓰시오.\n\n$\\frac{5}{7}$,  $\\frac{6}{7}$",
      "다음 등식이 성립할 때, 식을 구하시오.\n$3x\\times\\square=6x^{2}$",
      "다음을 구하시오.\n\n$$x+1=2$$",
      "다음 중 일차부등식이 아닌 것은?\n\n$5-3x\\ge x+9$\n\n$6x\\le3x+1$\n\n$x-2x^{2}>7-2x^{2}$",
      "$141\\times90=\\square$",
      "가로 $5$ cm 입니다.\n\n세로는?",
    ];
    for (const content of samples) {
      const painted = (html(content).match(/data-formula-line/g) ?? []).length;
      const counted = formulaGapLines(preprocessMarkdown(parseProblemContent(content).question));
      expect(counted, content).toBe(painted);
    }
  });
});
