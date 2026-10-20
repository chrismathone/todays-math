/**
 * 짧은 인라인 식은 안에서 줄을 바꾸지 않는다 (2026-10-20 교차 검수).
 * 세 모델이 모두 짚은 꼴: «$(n-$ / $1)$개» · «$Q(ab, b-$ / $a)$» · «$\frac18<x<$ / $\frac14$» · «$3$ / 개월».
 * KaTeX 는 연산 기호 · 관계 기호 뒤에 줄바꿈 자리를 둔다 — 긴 식은 그래야 칸을 안 넘으므로 긴 식은 그대로 둔다.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MathText } from "@/components/math/MathText";
import { ProblemContent } from "@/components/math/ProblemContent";
import { MATH_NOWRAP_MAX_UNITS } from "@/components/math/rehypeMathNowrap";
import { displayWidth } from "@/lib/math/displayWidth";

const html = (content: string) => renderToStaticMarkup(<ProblemContent content={content} deferFigures={false} />);
const NOWRAP = '<span class="katex" style="white-space:nowrap">';

describe("짧은 인라인 식", () => {
  it("식 안에서 줄을 바꾸지 않는다", () => {
    const out = html("밑변의 길이가 $(n-1)$ cm인 삼각형의 넓이를 구하시오.");
    expect(out).toContain(NOWRAP);
  });
  it("식 바깥 글자는 감싸지 않는다 — 식 뒤 조사가 같은 글자 마디에 남는다(맨 앞에 U+2060 하나만 더한다)", () => {
    const out = html("강아지는 $3$개월 때 무게가 $x$를 넘는다.");
    expect(out).toMatch(/<\/span><\/span>개월 때 무게가 <span class="katex"/);
    expect(out).toMatch(/<\/span><\/span>\u2060를 넘는다\./);
  });
  it(`넓은 식(표시폭 ${MATH_NOWRAP_MAX_UNITS}단위 넘음)은 그대로 — 칸을 넘지 않게 KaTeX 의 줄바꿈 자리를 둔다`, () => {
    // 교차 검수 3회차: TeX 39자인 고등 식이 안 끊겨 칸을 넘었다
    const long = "y=-2(x^{2}+2x+2)^{2}+8(x^{2}+2x+2)+k";
    expect(displayWidth(`$${long}$`)).toBeGreaterThan(MATH_NOWRAP_MAX_UNITS);
    expect(html(`다음 등식이 성립함을 증명하시오. 모든 자연수 $n$ 에 대하여 $${long}$ 이다.`).match(/white-space:nowrap/g)?.length).toBe(1);
  });
  it("여러 줄 블록 식(katex-display)은 건드리지 않는다", () => {
    expect(html("다음을 계산하시오.\n\n$$\n12+3\n$$")).not.toContain("white-space:nowrap");
  });
  it("정답 · 해설(MathText)도 같은 규칙", () => {
    expect(renderToStaticMarkup(<MathText as="div" text="따라서 $(n-1)$개이다." />)).toContain(NOWRAP);
  });
});

describe("한 줄 기호 보기 «㉠ $식$ ㉡ $식$» (4 · 5차 교차 검수)", () => {
  it("기호와 그 식을 한 덩어리로 묶는다 — «㉠» 만 줄 끝에 남지 않는다(빈칸 · 붙은 빈칸 둘 다)", () => {
    for (const gap of ["\u00a0", " "]) {
      const out = html(`값이 더 큰 식을 찾아 기호를 쓰시오.  ㉠${gap}$72\\div(2\\times6)$\u3000\u3000㉡${gap}$72\\div2\\times6$`);
      expect(out.match(/<span style="white-space:nowrap">㉠\u00a0<span class="katex"/g)?.length, gap).toBe(1);
      expect(out.match(/<span style="white-space:nowrap">㉡\u00a0<span class="katex"/g)?.length, gap).toBe(1);
    }
  });
  it("문장 속 기호(«㉠과 ㉡에»)와 기호 없는 식은 그대로", () => {
    const out = html("㉠과 ㉡에 알맞은 수의 합을 구하시오. 답은 $3$ 이다.");
    expect(out).not.toContain('<span style="white-space:nowrap">');
  });
});

/**
 * 식 뒤 조사 · 서술격은 식과 한 줄에 선다 (D-164 ⑴ · 2026-10-21 리드 · Codex 합의).
 * 감싸개를 만들지 않고 조사 글 마디 맨 앞에 WORD JOINER 하나 — 글 마디가 갈리면 «…$x$를 유한소수로»를
 * 한 마디로 찾는 화면이 못 찾는다(`ProblemBankFormatFilter.test.tsx`). 줄이 실제로 안 갈리는지는
 * Chrome 에서 잰다(`mathParticleBreakChrome.test.tsx`).
 */
describe("식 뒤 조사 · 서술격 잇기 (D-164 ⑴)", () => {
  const WJ = "\u2060";
  /** 식 바로 뒤 글 마디들 — 닫는 `</span>` 이 이어진 끝이 `.katex` 가 닫히는 자리다(식마다 그 수가 다르다). */
  const afterMath = (content: string) =>
    [...html(content).matchAll(/(?:<\/span>)+([^<]+)/g)].map((m) => m[1]!);

  it("조사 · 서술격 낱말이면 그 글 마디 맨 앞에 U+2060 하나 — 글 마디는 그대로 하나다", () => {
    const cases: [string, string][] = [
      ["$x$의 값을 구하시오.", "의 값을 구하시오."],
      ["답은 $25$입니다.", "입니다."],
      ["$a=3$이므로 참이다.", "이므로 참이다."],
      ["$x=1$일 때의 값", "일 때의 값"],
      ["$\\overline{AB}$에서는 같다.", "에서는 같다."],
      ["$3$까지이므로 끝난다.", "까지이므로 끝난다."],
      ["남은 것은 $5$뿐이다.", "뿐이다."],
      ["$x$라고 하자.", "라고 하자."],
    ];
    for (const [content, tail] of cases)
      expect(afterMath(content), content).toContain(`${WJ}${tail}`);
  });

  it("분수 · 긴 식 뒤에도 잇는다 — 잇기는 식의 폭과 무관하다(긴 식은 안에서는 그대로 갈린다)", () => {
    expect(afterMath("$\\frac{1}{2}$의 값")).toContain(`${WJ}의 값`);
    const long = "y=-2(x^{2}+2x+2)^{2}+8(x^{2}+2x+2)+k";
    expect(afterMath(`$${long}$이다.`)).toContain(`${WJ}이다.`);
  });

  /**
   * Chrome 은 원자 인라인 뒤 줄바꿈을 U+2060 하나로 안 막는다 — 마지막 조각을 감싼 상자가 nowrap 이어야 한다
   * (2026-10-21 실측). 짧은 식은 `.katex` 가 이미 nowrap 이고, 긴 식은 마지막 조각만 상자에 넣는다.
   */
  it("긴 식은 마지막 조각 하나만 nowrap 상자에 넣는다 — 앞 조각 사이의 줄바꿈 자리는 그대로", () => {
    const long = "y=-2(x^{2}+2x+2)^{2}+8(x^{2}+2x+2)+k";
    const PIN = '<span style="white-space:nowrap"><span class="katex-base">';
    const out = html(`다음 식에서 $${long}$이므로 참이다.`);
    expect(out.split(PIN).length - 1).toBe(1);
    expect(out).not.toContain('<span class="katex" style="white-space:nowrap">'); // 식 전체는 묶지 않는다
    expect(out.match(/<span class="katex-base">/g)!.length).toBeGreaterThan(2);
    // 조사가 없으면 상자도 없다 — 긴 식은 오늘 그대로
    expect(html(`다음 식에서 $${long}$ 이다.`)).not.toContain(PIN);
  });

  it("조각이 하나뿐인 긴 식은 `.katex` 에 nowrap — 안에 줄바꿈 자리가 없어 조각 구조를 안 바꾼다", () => {
    const single = "\\sqrt{x^{2}+2x+1+y^{2}+2y+1+z^{2}+2z+1}";
    expect(displayWidth(`$${single}$`)).toBeGreaterThan(MATH_NOWRAP_MAX_UNITS);
    const out = html(`따라서 $${single}$의 값을 구하시오.`);
    expect(out).toContain('<span class="katex" style="white-space:nowrap">');
    expect(out).not.toContain('<span style="white-space:nowrap"><span class="katex-base">');
  });

  it("음성 대조 — 단위 · 의존명사 · 독립 낱말 · 띄어 쓴 조사는 잇지 않는다(첫 글자로 가르지 않는다)", () => {
    for (const content of [
      "$3$개월 동안", // 단위
      "모두 $3$가지이다.", // 의존명사 — «가»로 시작하지만 조사가 아니다
      "$2$도막으로 자른다.", // 단위 — «도»로 시작
      "$3$이상이다.", // 독립 낱말 — «이»로 시작
      "$x$이때 성립한다.", // 독립 낱말
      "$x$ 의 값", // 띄어 쓴 조사는 원래 줄을 바꿔도 되는 자리
      "$3$ 이상", // 독립 낱말(띄어 씀)
      "$3$ 개", // 단위(띄어 씀)
    ])
      expect(html(content), content).not.toContain(WJ);
  });

  it("두 번 넣지 않는다 — 이미 이어진 마디는 그대로", () => {
    expect(html(`$x$${WJ}의 값`).match(/\u2060/g)?.length).toBe(1);
  });

  it("블록 식(katex-display) 뒤 문단에는 넣지 않는다", () => {
    expect(html("다음을 계산하시오.\n\n$$\n12+3\n$$\n\n의 값")).not.toContain(WJ);
  });

  it("기호 보기 감싸개 «㉠ $식$» 뒤의 조사도 잇는다 — 감싸개 바로 뒤에 남는다", () => {
    const out = html("값을 구하시오.  ㉠ $72\\div(2\\times6)$의 값");
    expect(out).toMatch(/<span style="white-space:nowrap">㉠\u00a0<span class="katex".*?<\/span><\/span><\/span>\u2060의 값/);
  });

  it("정답 · 해설(MathText)도 같은 규칙", () => {
    expect(renderToStaticMarkup(<MathText as="div" text="따라서 $x=3$이다." />)).toContain(`${WJ}이다.`);
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

describe("지수 · 첨자 안의 분수는 키우지 않는다 (교과서 지수 문항)", () => {
  it("`8^{\\frac14}` 는 `\\dfrac` 이 되지 않는다 — 밖의 분수는 그대로 `\\dfrac`", async () => {
    const { preprocessMarkdown } = await import("@/lib/math/markdownPreprocess");
    const out = preprocessMarkdown("$\\frac{1}{2}\\times8^{\\frac{1}{4}}+a_{\\frac{n}{2}}$");
    expect(out).toContain("\\dfrac{1}{2}");
    expect(out).toContain("8^{\\frac{1}{4}}");
    expect(out).toContain("a_{\\frac{n}{2}}");
  });
});
