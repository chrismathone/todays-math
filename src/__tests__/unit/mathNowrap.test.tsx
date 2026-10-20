/**
 * 짧은 인라인 식은 안에서 줄을 바꾸지 않는다 (2026-10-20 교차 검수).
 * 세 모델이 모두 짚은 꼴: «$(n-$ / $1)$개» · «$Q(ab, b-$ / $a)$» · «$\frac18<x<$ / $\frac14$» · «$3$ / 개월».
 * KaTeX 는 연산 기호 · 관계 기호 뒤에 줄바꿈 자리를 둔다 — 긴 식은 그래야 칸을 안 넘으므로 긴 식은 그대로 둔다.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MathText } from "@/components/math/MathText";
import { ProblemContent } from "@/components/math/ProblemContent";
import { MATH_NOWRAP_MAX_TEX } from "@/components/math/rehypeMathNowrap";

const html = (content: string) => renderToStaticMarkup(<ProblemContent content={content} deferFigures={false} />);
const NOWRAP = '<span class="katex" style="white-space:nowrap">';

describe("짧은 인라인 식", () => {
  it("식 안에서 줄을 바꾸지 않는다", () => {
    const out = html("밑변의 길이가 $(n-1)$ cm인 삼각형의 넓이를 구하시오.");
    expect(out).toContain(NOWRAP);
  });
  it("식 바깥 글자는 건드리지 않는다 — 식 뒤 조사가 같은 글자 마디에 남는다", () => {
    const out = html("강아지는 $3$개월 때 무게가 $x$를 넘는다.");
    expect(out).toMatch(/<\/span><\/span>개월 때 무게가 <span class="katex"/);
    expect(out).toMatch(/<\/span><\/span>를 넘는다\./);
  });
  it(`긴 식(TeX ${MATH_NOWRAP_MAX_TEX}자 넘음)은 그대로 — 칸을 넘지 않게 KaTeX 의 줄바꿈 자리를 둔다`, () => {
    const long = "1\\cdot 2+3\\cdot 2^{2}+5\\cdot 2^{3}+\\cdots+(2n-1)\\cdot 2^{n}=(2n-3)\\cdot 2^{n+1}+6";
    expect(long.length).toBeGreaterThan(MATH_NOWRAP_MAX_TEX);
    expect(html(`다음 등식이 성립함을 증명하시오. 모든 자연수 $n$ 에 대하여 $${long}$ 이다.`).match(/white-space:nowrap/g)?.length).toBe(1);
  });
  it("여러 줄 블록 식(katex-display)은 건드리지 않는다", () => {
    expect(html("다음을 계산하시오.\n\n$$\n12+3\n$$")).not.toContain("white-space:nowrap");
  });
  it("정답 · 해설(MathText)도 같은 규칙", () => {
    expect(renderToStaticMarkup(<MathText as="div" text="따라서 $(n-1)$개이다." />)).toContain(NOWRAP);
  });
});

describe("앞 첨자 «$_{n}\\mathrm{C}_{r}$» (교과서 13행)", () => {
  it("연산 기호 · 식 머리 뒤의 «_{» 앞에 빈 묶음을 둔다 — 첨자가 «+» 에 붙지 않는다", async () => {
    const { preprocessMarkdown } = await import("@/lib/math/markdownPreprocess");
    const out = preprocessMarkdown("$_{n}\\mathrm{C}_{0}+_{n}\\mathrm{C}_{1}\\times 3=2^{40}$을 만족시키는 $n$");
    expect(out).toContain("{}_{n}\\mathrm{C}_{0}+{}_{n}\\mathrm{C}_{1}");
    expect(preprocessMarkdown("$x_{1}+y_{2}$")).not.toContain("{}_");
  });
});

describe("KaTeX 글리프 없는 기호 «⫽» · «ﾟ» (교과서 89 · 22행)", () => {
  it("수식 안은 \\parallel · ^{\\circ}, 밖은 ∥ · °", async () => {
    const { preprocessMarkdown } = await import("@/lib/math/markdownPreprocess");
    const out = preprocessMarkdown("$l⫽m$일 때, $\\angle x=50ﾟ$ 이고 직선 l⫽m, 각 50ﾟ");
    expect(out).toContain("\\parallel");
    expect(out).toContain("^{\\circ}");
    expect(out).not.toMatch(/[⫽ﾟ]/);
    expect(out).toContain("l∥m");
    expect(out).toContain("50°");
  });
});

describe("한 줄의 보기 항목 여럿 «ㄱ. … ㄴ. …» (교과서 44 · 변형 2행)", () => {
  it("항목 이름 앞을 전각 공백 둘로 벌린다 — 줄 머리가 «ㄱ.» 인 줄만", async () => {
    const { preprocessMarkdown } = await import("@/lib/math/markdownPreprocess");
    const out = preprocessMarkdown("다음 중 고르시오.\nㄱ. $a+b$ ㄴ. $a-b$ ㄷ. $b-a$");
    expect(out).toContain("$  ㄴ. ");
    expect(out).toContain("$  ㄷ. ");
    expect(preprocessMarkdown("그림의 ㄱ. 과 ㄴ. 을 비교")).not.toContain(" ");
  });
});
