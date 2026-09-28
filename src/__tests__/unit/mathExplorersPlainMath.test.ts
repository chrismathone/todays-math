// @vitest-environment node
/**
 * 통합 탐험 개념 카드 «일반 글자 수식» → 제품 수식 표기(`plainMathToTex`) — 트랙 K (2026-09-27).
 *
 * 원장님(학생 폰에서 탐험을 처음부터 해 보신 뒤): «카텍스 적용시키고». 카드 자료
 * (`definition-content.ts`·`definition-cards.ts`)는 원장님이 주신 패키지를 **그대로** 들여온 것이라
 * (`PROVENANCE.md` 에 원본 SHA-256) 자료는 고치지 않고 **화면에 그릴 때** 바꾼다.
 *
 * 이 파일이 보는 것 — 글 단계(렌더 전):
 *  ① 규칙 표 — 모양마다 무엇이 나와야 하는가(분수의 묶음·대분수·단위·좌표·목록·한글 사이 연산자).
 *  ② 230개념의 **모든 글**(이름·뜻·조각·낱말·발문·예·경계·해설·메모) 전수 —
 *     수식 밖에 수식 기호 0 · 수식 안은 LaTeX 만(유니코드 기호 0 · 피연산자 사이 `/` 0) ·
 *     변환 전후 «수식 글자열»이 같다 · 두 번 변환해도 같다 · 한글이 그대로다.
 * 렌더 단계(제품 `MathText` 로 그려 붉은 글자·새는 TeX·한글 손실 0)는
 * `src/__tests__/components/ExplorerMathKatex.test.tsx` 가 본다.
 *
 * 🔴 «같은 뜻» 판정의 참은 변환기에서 오지 않는다 — 아래 `canonPlain`·`canonTex` 는 이 파일이
 *    따로 짠 되읽기다. 변환기의 표를 불러 쓰면 둘이 같이 틀려도 초록이다(20-lessons 2026-08-18).
 */
import { describe, expect, it } from "vitest";
import { definitionCards } from "@/lib/math-explorers/definition-cards";
import { plainMathToTex } from "@/lib/math-explorers/plainMath";

// ── 규칙 표 ─────────────────────────────────────────────────────────────────
const RULES: [string, string][] = [
  // 식·수 — 숫자 하나도 수식으로(원장님 2026-08-22 «모든 숫자는 일반텍스트 말고 KaTeX»)
  ["x + 2 = 5의 해는 3이다.", "$x+2=5$의 해는 $3$이다."],
  ["352의 3은 300", "$352$의 $3$은 $300$"],
  ["3 × 4 = 12", "$3\\times 4=12$"],
  ["12 ÷ 3의 몫은 4", "$12\\div 3$의 몫은 $4$"],
  ["a≠0", "$a\\ne 0$"],
  ["2x ≤ 6", "$2x\\le 6$"],
  ["b²−4ac≥0이면", "$b^{2}-4ac\\ge 0$이면"],
  ["x < −3", "$x<-3$"],
  ["x = 7 − 3", "$x=7-3$"],
  ["−(x−2)=−x+2", "$-(x-2)=-x+2$"],
  ["−ab와 +ab가", "$-ab$와 $+ab$가"],
  // 거듭제곱
  ["x²", "$x^{2}$"],
  ["a² × a³ = a⁵", "$a^{2}\\times a^{3}=a^{5}$"],
  ["(a²)³ = a⁶", "$(a^{2})^{3}=a^{6}$"],
  ["y=a(x−p)²+q", "$y=a(x-p)^{2}+q$"],
  ["3²+4²=5²", "$3^{2}+4^{2}=5^{2}$"],
  // 분수 — 피연산자 사이 `/` 만. 괄호 묶음은 벗겨 분자·분모로
  ["1/2", "$\\frac{1}{2}$"],
  ["−1/2은", "$-\\frac{1}{2}$은"],
  ["1/2 × 1/3 = 1/6", "$\\frac{1}{2}\\times\\frac{1}{3}=\\frac{1}{6}$"],
  ["20 × 2/5와 20 × 3/5", "$20\\times\\frac{2}{5}$와 $20\\times\\frac{3}{5}$"],
  ["y = 6/x", "$y=\\frac{6}{x}$"],
  ["y = −2/x", "$y=-\\frac{2}{x}$"],
  ["a/(a+b)", "$\\frac{a}{a+b}$"],
  ["y/x가 일정한", "$\\frac{y}{x}$가 일정한"],
  ["x = (−b ± √(b²−4ac))/(2a)", "$x=\\frac{-b\\pm\\sqrt{b^{2}-4ac}}{2a}$"],
  // 한글이 낀 `/` 는 분수로 못 세운다(한글은 수식 밖이어야 한다) — 빗금 그대로
  ["중심각/360°", "중심각$/360^{\\circ}$"],
  ["360°/중심각", "$360^{\\circ}/$중심각"],
  // 대분수 — «자연수 + 과/와 + 진분수» 네 곳뿐(초등 엔진 `fracLatex` 와 같은 모양)
  ["1과 1/2", "$1\\frac{1}{2}$"],
  ["2와 3/4", "$2\\frac{3}{4}$"],
  [
    "1과 1/2은 3/2과 크기가 같다.",
    "$1\\frac{1}{2}$은 $\\frac{3}{2}$과 크기가 같다.",
  ],
  // 연산자 뒤도 대분수 — 식 가운데 새 수(분수의 곱셈 보정 예, D-143 ⑦). 앞의 대분수와 한 꼴로
  [
    "1과 1/2 × 2/3 = 1과 1/3",
    "$1\\frac{1}{2}\\times\\frac{2}{3}=1\\frac{1}{3}$",
  ],
  ["3 + 2와 1/4", "$3+2\\frac{1}{4}$"],
  // 분수 뒤 «과» 는 대분수가 아니다
  ["3/6과 2/6", "$\\frac{3}{6}$과 $\\frac{2}{6}$"],
  [
    "1과 2의 평균은 자료에 없는 1.5야.",
    "$1$과 $2$의 평균은 자료에 없는 $1.5$야.",
  ],
  ["3과 −3 두 개", "$3$과 $-3$ 두 개"],
  // 근호
  ["√9 = 3", "$\\sqrt{9}=3$"],
  ["−√9", "$-\\sqrt{9}$"],
  ["√a는", "$\\sqrt{a}$는"],
  ["√((−3)²)", "$\\sqrt{(-3)^{2}}$"],
  ["√(a²)은", "$\\sqrt{a^{2}}$은"],
  // 기호
  ["π", "$\\pi$"],
  ["90°", "$90^{\\circ}$"],
  ["80°÷2", "$80^{\\circ}\\div 2$"],
  ["25%", "$25\\%$"],
  ["기호 %로 나타낸다.", "기호 $\\%$로 나타낸다."],
  ["0.333…", "$0.333\\cdots$"],
  [
    "…, −2, −1, 0, 1, 2, …가",
    "$\\cdots$, $-2$, $-1$, $0$, $1$, $2$, $\\cdots$가",
  ],
  ["17 ÷ 5 = 3 … 2를", "$17\\div 5=3\\cdots 2$를"],
  ["34 → 30", "$34\\rightarrow 30$"],
  ["분산 9 → 표준편차 3", "분산 $9\\rightarrow$ 표준편차 $3$"],
  ["2상자 ↔ 12개", "$2$상자 $\\leftrightarrow 12$개"],
  ["□ × 3 = △", "$\\square\\times 3=\\triangle$"],
  [
    "□개씩 3묶음인 물건 수 △를",
    "$\\square$개씩 $3$묶음인 물건 수 $\\triangle$를",
  ],
  // 한글 사이에 낀 연산자는 연산자만 수식으로
  ["빨강:파랑 = 2:3", "빨강$:$파랑 $=2:3$"],
  ["2분 = 120초", "$2$분 $=120$초"],
  ["이며 밑넓이×높이÷", "이며 밑넓이$\\times$높이$\\div$"],
  ["가로+세로", "가로$+$세로"],
  // 단위 — 초등 엔진 `unitNum` 과 같은 `\,\mathrm{}`
  ["2cm = 20mm", "$2\\,\\mathrm{cm}=20\\,\\mathrm{mm}$"],
  ["(3 + 2) × 2 cm", "$(3+2)\\times 2\\,\\mathrm{cm}$"],
  ["(2 + 4) × 3 ÷ 2 cm²", "$(2+4)\\times 3\\div 2\\,\\mathrm{cm}^{2}$"],
  ["12.56cm²", "$12.56\\,\\mathrm{cm}^{2}$"],
  ["cm³ 같은 단위", "$\\mathrm{cm}^{3}$ 같은 단위"],
  ["cm나 m를 써.", "$\\mathrm{cm}$나 $\\mathrm{m}$를 써."],
  ["L와 mL", "$\\mathrm{L}$와 $\\mathrm{mL}$"],
  // 수와 수가 연산자 없이 띄어 있으면 두 식이다(수식 안에서는 공백이 사라져 `1 L500` 이 된다)
  [
    "1L 500mL = 1500mL",
    "$1\\,\\mathrm{L}$ $500\\,\\mathrm{mL}=1500\\,\\mathrm{mL}$",
  ],
  [
    "1kg 300g은 1030g이다.",
    "$1\\,\\mathrm{kg}$ $300\\,\\mathrm{g}$은 $1030\\,\\mathrm{g}$이다.",
  ],
  // 목록·좌표 — 괄호 안이나 붙여 쓴 목록만 한 식. 띄어 쓴 목록은 수마다 따로(초등 엔진 나열과 같게)
  ["변이 3, 3, 4인 삼각형", "변이 $3$, $3$, $4$인 삼각형"],
  ["자료 1,3,5의 중앙값", "자료 $1,3,5$의 중앙값"],
  [
    "x축 방향으로 p, y축 방향으로 q만큼",
    "$x$축 방향으로 $p$, $y$축 방향으로 $q$만큼",
  ],
  ["(p, q)", "$(p,q)$"],
  ["빨강 3명, 파랑 4명", "빨강 $3$명, 파랑 $4$명"],
  [
    "가로 4cm, 세로 3cm인",
    "가로 $4\\,\\mathrm{cm}$, 세로 $3\\,\\mathrm{cm}$인",
  ],
  ["몫 5, 나머지는 2", "몫 $5$, 나머지는 $2$"],
  ["(2,−3)에 대한", "$(2,-3)$에 대한"],
  ["(x,y)=(2,1)", "$(x,y)=(2,1)$"],
  ["x+y=3, x−y=1의 해를", "$x+y=3$, $x-y=1$의 해를"],
  ["(1,2), (0,3) 등을", "$(1,2)$, $(0,3)$ 등을"],
  // 문자 — 변수·점 이름은 수식, 삼각비는 명령, 영어 낱말은 글
  ["x좌표와 y좌표", "$x$좌표와 $y$좌표"],
  ["n각형의 내각의 합은", "$n$각형의 내각의 합은"],
  ["xy가 일정한", "$xy$가 일정한"],
  ["sin A는", "$\\sin A$는"],
  ["tan 45° = 1", "$\\tan 45^{\\circ}=1$"],
  ["A의 대변의 길이", "$A$의 대변의 길이"],
  ["반직선 AB와 반직선 BA는", "반직선 $AB$와 반직선 $BA$는"],
  ["삼각형의 SSS 합동", "삼각형의 $SSS$ 합동"],
  ["AM=3, MB=7", "$AM=3$, $MB=7$"],
  [
    "여기서 소수는 prime number야. 0.3 같은",
    "여기서 소수는 prime number야. $0.3$ 같은",
  ],
  // 글만 있는 조각은 그대로 — 조각 끝 공백도 지킨다(빈칸 단추 사이 띄어쓰기)
  ["맞다", "맞다"],
  [" 중에서 약수가 ", " 중에서 약수가 "],
  ["=", "$=$"],
  [", ", ", "],
];

describe("plainMathToTex — 규칙 표", () => {
  it.each(RULES)("%s", (plain, tex) => {
    expect(plainMathToTex(plain)).toBe(tex);
  });

  it("이미 `$…$` 인 구간은 건드리지 않는다", () => {
    expect(plainMathToTex("값은 $\\frac{1}{2}$이고 3이다.")).toBe(
      "값은 $\\frac{1}{2}$이고 $3$이다.",
    );
  });
});

// ── 전수 ────────────────────────────────────────────────────────────────────
/** 카드 하나가 화면에 내보내는 글 전부. 자료 모양(`CourseCard`)의 글 칸을 빠짐없이. */
function cardTexts(card: (typeof definitionCards)[number]): string[] {
  return [
    card.name,
    card.definition,
    ...card.pieces,
    ...card.words,
    card.exampleTitle,
    ...card.examples.map((example) => example.text),
    card.trap,
    card.explanation,
    card.note,
  ];
}
const ALL = [...new Set(definitionCards.flatMap(cardTexts))];

/** `$…$` 밖(글)과 안(수식)을 가른다. */
function split(tex: string): { prose: string; math: string[] } {
  const math: string[] = [];
  const prose = tex.replace(/\$([^$]*)\$/g, (_m, inner: string) => {
    math.push(inner);
    return " ";
  });
  return { prose, math };
}

/** 수식 밖에 남으면 안 되는 것 — 숫자·연산·기호·괄호·위첨자. */
const MATH_OUTSIDE = /[0-9⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ+\-−×÷=≠<>≤≥±:/√π°%…→↔□△()]/g;
/** 수식 밖에 남아도 되는 라틴 낱말 — 영어 설명(`prime number`)뿐. 나머지 문자는 수식이어야 한다. */
const ENGLISH_WORDS = new Set(["prime", "number"]);

const SUPER: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
  ⁿ: "n",
};
/** 원문 → 수식 글자열(한글·공백·괄호·빗금 빼고, 위첨자는 `^`). */
function canonPlain(text: string): string {
  return text
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ]/g, (ch) => `^${SUPER[ch]}`)
    .replace(/[가-힣\s()/]/g, "")
    .replace(/-/g, "−");
}
/** 변환본 → 같은 글자열. 명령은 이 파일이 따로 쓴 되읽기 표로만 읽는다. */
const TEX_BACK: [RegExp, string][] = [
  [/\^\{\\circ\}/g, "°"],
  [/\\,/g, ""],
  [/\\%/g, "%"],
  [/\\(?:frac|mathrm)/g, ""],
  [/\\sqrt/g, "√"],
  [/\\times/g, "×"],
  [/\\div/g, "÷"],
  [/\\le\b/g, "≤"],
  [/\\ge\b/g, "≥"],
  [/\\ne\b/g, "≠"],
  [/\\pm/g, "±"],
  [/\\pi\b/g, "π"],
  [/\\cdots/g, "…"],
  [/\\rightarrow/g, "→"],
  [/\\leftrightarrow/g, "↔"],
  [/\\square/g, "□"],
  [/\\triangle/g, "△"],
  [/\\(sin|cos|tan)\b/g, "$1"],
];
function canonTex(tex: string): string {
  let out = tex.replace(/\$/g, "");
  for (const [re, to] of TEX_BACK) out = out.replace(re, to);
  return out.replace(/[{}가-힣\s()/]/g, "").replace(/-/g, "−");
}

describe("plainMathToTex — 230개념 모든 글 전수", () => {
  it("전수 대상이 실제로 230개념의 글이다 (0 은 «깨끗»과 «못 셈»을 안 가른다)", () => {
    expect(definitionCards).toHaveLength(230);
    // 2026-09-27 실측: 글 3,910개(겹침 뺀 2,887) 중 수식이 든 글 1,174.
    expect(ALL.length).toBeGreaterThan(2800);
    const withMath = ALL.filter((text) => plainMathToTex(text).includes("$"));
    expect(withMath.length).toBeGreaterThan(1100);
  });

  it("수식 밖에 수식 기호·숫자·문자가 남지 않는다", () => {
    const failures: string[] = [];
    for (const text of ALL) {
      const { prose } = split(plainMathToTex(text));
      const symbols = prose.match(MATH_OUTSIDE) ?? [];
      const letters = (prose.match(/[A-Za-z]+/g) ?? []).filter(
        (word) => !ENGLISH_WORDS.has(word),
      );
      if (symbols.length || letters.length)
        failures.push(`${text} → ${[...symbols, ...letters].join(" ")}`);
    }
    expect(failures).toEqual([]);
  });

  it("수식 안은 LaTeX 만 — 유니코드 기호 0 · 피연산자 사이 빗금 0 · 중괄호 짝", () => {
    const failures: string[] = [];
    for (const text of ALL) {
      for (const math of split(plainMathToTex(text)).math) {
        if (/[^\x20-\x7e]/.test(math))
          failures.push(`유니코드: ${text} → ${math}`);
        if (/[0-9A-Za-z)}]\/[0-9A-Za-z(\\]/.test(math))
          failures.push(`빗금 분수: ${text} → ${math}`);
        let depth = 0;
        for (const ch of math.replace(/\\[{}%]/g, "")) {
          depth += ch === "{" ? 1 : ch === "}" ? -1 : 0;
          if (depth < 0) break;
        }
        if (depth !== 0) failures.push(`중괄호: ${text} → ${math}`);
        if (!math.trim()) failures.push(`빈 수식: ${text}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("변환 전후 수식 글자열이 같다 (수·문자·기호의 차례와 값)", () => {
    const failures: string[] = [];
    for (const text of ALL) {
      const tex = plainMathToTex(text);
      if (canonTex(tex) !== canonPlain(text))
        failures.push(
          `${text}\n  원문 ${canonPlain(text)}\n  변환 ${canonTex(tex)}`,
        );
    }
    expect(failures).toEqual([]);
  });

  it("두 번 변환해도 같다", () => {
    for (const text of ALL) {
      const once = plainMathToTex(text);
      expect(plainMathToTex(once), text).toBe(once);
    }
  });

  it("한글이 그대로다 — 대분수(«1과 1/2»)의 «과/와» 만 빠진다", () => {
    const failures: string[] = [];
    for (const text of ALL) {
      // 분수 뒤 «과»(`3/6과 2/6`)는 대분수가 아니다 — 앞이 빗금·소수점·숫자면 뺀다.
      const mixed =
        text.match(/(?<![0-9./])[0-9]+[과와] [0-9]+\/[0-9]+/g)?.length ?? 0;
      const before = (text.match(/[가-힣]/g) ?? []).join("");
      const after = split(plainMathToTex(text)).prose.match(/[가-힣]/g) ?? [];
      if (after.length !== before.length - mixed) failures.push(text);
      if (!mixed && after.join("") !== before) failures.push(text);
    }
    expect(failures).toEqual([]);
  });
});
