/**
 * 중2 「일차함수」 함수 유형 18개 — 함숫값·그래프·기울기·식 구하기·활용 (물결 2C).
 *
 * RPM 2-1 색인이 유형 정본이다(`scripts/rpm/rpm-type-catalog.json` — 번호·제목
 * 그대로. 색인 제목은 수식 자리가 빠져 「절편절편」처럼 읽히는 것이 있는데, 그것이
 * 색인의 실제 문자열이다). 우리 DB 실측(2026-08-23): 함수와 함숫값 3건 ·
 * 일차함수의 그래프와 기울기 0건 · 일차함수의 활용(온도, 길이) 4건.
 *
 * 그림 유형 셋(⑴07 그래프→기울기 · ⑴11 절편 넓이 · 관계07 교점)은 이 물결이
 * 만든 `linearGraph` kind 를 figureSpec 으로 싣는다 — **marks 가 직선 위에
 * 없으면 엔진이 던지므로 그림 자체가 검산이다**(물결 2D 계약 선행 이행:
 * 테스트가 facts ↔ figureSpec 일치도 대조한다).
 *
 * 생성 규칙은 m1LinearApply 와 같다 — **정답을 먼저 뽑고 발문을 역산한다.**
 * `facts` 에 발문의 원 수치를 남기고, 테스트가 조건식을 독립 재계산한다.
 * 숫자는 전부 `$...$` 안에 쓴다 (elementary rules.bareNumbers 가드).
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { CHOICE_COUNT, CHOICE_MARKS } from "../problem/choiceCountRule";

import type { MidProblem, TypeEntry } from "./types";
import { euroRo, eulReul, iGa, waGwa } from "./m2Josa";

const GRADE = "중2";
const BOOK = "2-1";
// 색인의 실제 문자열 — ⑴⑵ 앞은 **얇은 공백(U+2009) + 보통 공백**이다.
// 보통 공백 둘로 적으면 어디서도 안 걸린다(2026-08-23 실제 결함) —
// middleTypeCoverage.test.ts 가 정본과 글자 그대로 대조해 막는다.
const MINOR_G1 = "일차함수와 그 그래프  ⑴";
const MINOR_G2 = "일차함수와 그 그래프  ⑵";
const MINOR_REL = "일차함수와 일차방정식의 관계";

/** 우리 Unit.section 정확한 이름 (공유 DB 실측 2026-08-23) */
const SEC = {
  함숫값: "함수와 함숫값",
  성질: "일차함수의 그래프의 성질",
  절편: "일차함수의 그래프와 절편",
  기울기: "일차함수의 그래프와 기울기",
  식구하기: "일차함수의 식 구하기",
  온도길이: "일차함수의 활용(온도, 길이)",
  연립해: "일차함수의 그래프와 연립방정식의 해",
  일차방정식: "일차함수와 일차방정식",
} as const;

/** 조건을 만족할 때까지 다시 뽑는다 — 못 찾으면 던진다(조용히 기본값 금지). */
function attempt<T>(tries: number, f: () => T | null): T {
  for (let i = 0; i < tries; i += 1) {
    const v = f();
    if (v !== null) return v;
  }
  throw new Error("유형 생성 재시도 초과 — 매개변수 범위를 확인하십시오");
}

/** 0 이 아닌 정수 — 계수·좌표용. */
function nonZero(rng: Rng, lo: number, hi: number): number {
  return attempt(60, () => {
    const v = intBetween(rng, lo, hi);
    return v === 0 ? null : v;
  });
}

/** `mx` 꼴 — 1x·-1x 를 x·-x 로. */
function mono(m: number): string {
  if (m === 1) return "x";
  if (m === -1) return "-x";
  return `${m}x`;
}

/**
 * 기약분수 `num/den` 의 교과 표기 — den=1 이면 정수, 음수는 분수 앞에 부호.
 * 계산 사슬 없이 결과만 적는 자리에 쓴다(`4/2` 로 끝나면 지면에 그대로 나간다).
 */
function fracTex(num: number, den: number): string {
  if (den === 1) return `${num}`;
  return `${num < 0 ? "-" : ""}\\dfrac{${Math.abs(num)}}{${den}}`;
}

/**
 * 앞 항에 이어 붙이는 항 — `+3` / `-3`. **이중 부호(`+-`)를 막는다.**
 *
 * 값 검산은 이 부류를 구조적으로 못 본다(값도 KaTeX 도 맞다).
 * `scripts/qa/probe-middle-page-smells.ts` 가 지면을 따로 센다.
 */
function addend(v: number): string {
  return v >= 0 ? `+${v}` : `${v}`;
}

/** `3a` 꼴 — 계수 1·-1 을 `a`·`-a` 로. 앞에 오는 항에 쓴다. */
function coef(v: number, name: string): string {
  if (v === 1) return name;
  if (v === -1) return `-${name}`;
  return `${v}${name}`;
}

/** 이어 붙이는 `+3a` 꼴 — 계수 1·-1 과 부호를 같이 다듬는다. */
function addCoef(v: number, name: string): string {
  return v >= 0 ? `+${coef(v, name)}` : coef(v, name);
}

/** `mx+b` 꼴 (b=0 이면 mx). */
function linear(m: number, b: number): string {
  if (b === 0) return mono(m);
  return `${mono(m)}${b > 0 ? `+${b}` : b}`;
}

type Body = Pick<MidProblem, "content" | "answer" | "solution" | "facts"> & {
  figureSpec?: MidProblem["figureSpec"];
};

function def(
  rpmMinor: string,
  rpmType: string,
  rpmTitle: string,
  unitSection: string,
  difficulty: MidProblem["difficulty"],
  gen: (rng: Rng) => Body,
): TypeEntry {
  return {
    key: `${BOOK}|${rpmMinor}|${rpmType}`,
    grade: GRADE,
    unitSection,
    rpmBook: BOOK,
    rpmMinor,
    rpmType,
    rpmTitle,
    handler: (rng) => ({
      grade: GRADE,
      unitSection,
      rpmBook: BOOK,
      rpmMinor,
      rpmType,
      rpmTitle,
      difficulty,
      ...gen(rng),
    }),
  };
}

/**
 * ⑴01 「y 가 x 의 함수인가」 판별 소재 — (발문, 함수인가).
 * 테스트가 같은 차례의 진릿값 표를 **따로** 들고 대조한다(지어냄 방지).
 */
export const FUNC_POOL: readonly { text: string; isFunc: boolean }[] = [
  { text: "자연수 $x$의 약수의 개수 $y$", isFunc: true },
  { text: "자연수 $x$의 약수 $y$", isFunc: false },
  { text: "자연수 $x$를 $3$으로 나눈 나머지 $y$", isFunc: true },
  { text: "절댓값이 $x$인 정수 $y$", isFunc: false },
  { text: "$x$보다 $2$만큼 큰 수 $y$", isFunc: true },
  { text: "자연수 $x$보다 작은 홀수 $y$", isFunc: false },
  { text: "한 개에 $500$원인 물건 $x$개의 값 $y$원", isFunc: true },
  { text: "둘레의 길이가 $x$인 직사각형의 넓이 $y$", isFunc: false },
];

/** ⑴03 일차함수 판별 소재 — (식, 일차함수인가). */
export const LINEAR_POOL: readonly { text: string; isLinear: boolean }[] = [
  { text: "$y=3x-1$", isLinear: true },
  { text: "$y=\\dfrac{5}{x}$", isLinear: false },
  { text: "$y=x^2-x(x+2)$", isLinear: true }, // 정리하면 y=-2x
  { text: "$y=7$", isLinear: false },
  { text: "$xy=10$", isLinear: false },
  { text: "$y=\\dfrac{x}{3}$", isLinear: true },
  { text: "$y=x(x-1)$", isLinear: false },
  { text: "$y=5-2x$", isLinear: true },
];

/** 표식은 `choiceCountRule` 한 곳에서 온다 — 세 모듈이 각자 적으면 한쪽만 고쳐진다. */
const CIRCLED = CHOICE_MARKS;

/** 겹치지 않게 n개 뽑기 — 순서도 무작위. */
function pickDistinct(rng: Rng, size: number, n: number): number[] {
  const out: number[] = [];
  for (let guard = 0; out.length < n; guard += 1) {
    if (guard > 400) throw new Error("pickDistinct 재시도 초과");
    const i = intBetween(rng, 0, size - 1);
    if (!out.includes(i)) out.push(i);
  }
  return out;
}

export const M2_FUNC: TypeEntry[] = [
  // ── 일차함수와 그 그래프 ⑴ ─────────────────────────────
  def(MINOR_G1, "01", "함수", SEC.함숫값, "기본", (rng) => {
    // 🔴 보기는 **정확히 다섯** (원장님 2026-08-25). 예전에는 넷이었다 —
    //    지면이 ㉠ 목록을 «보기»로 안 읽어서 개수 세는 자에도 안 걸렸다.
    const idx = pickDistinct(rng, FUNC_POOL.length, CHOICE_COUNT);
    const ans = idx.filter((i) => FUNC_POOL[i]!.isFunc).length;
    const items = idx
      .map((i, k) => `${CIRCLED[k]} ${FUNC_POOL[i]!.text}`)
      .join("\n");
    const yes = idx
      .map((i, k) => ({ i, k }))
      .filter(({ i }) => FUNC_POOL[i]!.isFunc)
      .map(({ k }) => CIRCLED[k])
      .join(", ");
    return {
      content: `다음 중 $y$가 $x$의 함수인 것은 모두 몇 개인지 구하시오.\n${items}`,
      answer: `$${ans}$개`,
      solution: `$x$의 값 하나에 $y$의 값이 오직 하나씩 대응하면 함수이다.\n함수인 것은 ${yes === "" ? "없다" : `${yes}이다`}.\n따라서 $${ans}$개이다.`,
      facts: {
        i0: idx[0]!,
        i1: idx[1]!,
        i2: idx[2]!,
        i3: idx[3]!,
        i4: idx[4]!,
        ans,
      },
    };
  }),

  def(MINOR_G1, "02", "함숫값", SEC.함숫값, "기본", (rng) => {
    const a = nonZero(rng, -5, 5);
    const b = intBetween(rng, -6, 6);
    const p = nonZero(rng, -5, 5);
    const q = attempt(60, () => {
      const v = nonZero(rng, -5, 5);
      return v === p ? null : v;
    });
    const ans = a * (p + q) + 2 * b;
    return {
      content: `일차함수 $f(x)=${linear(a, b)}$에 대하여 $f(${p})+f(${q})$의 값을 구하시오.`,
      answer: `$${ans}$`,
      solution: `$f(${p})=${a * p + b}$, $f(${q})=${a * q + b}$이다.\n따라서 $f(${p})+f(${q})=${a * p + b}${a * q + b >= 0 ? `+${a * q + b}` : a * q + b}=${ans}$이다.`,
      facts: { a, b, p, q, ans },
    };
  }),

  def(MINOR_G1, "03", "일차함수", SEC.함숫값, "기본", (rng) => {
    const idx = pickDistinct(rng, LINEAR_POOL.length, 5);
    const ans = idx.filter((i) => LINEAR_POOL[i]!.isLinear).length;
    const items = idx
      .map((i, k) => `${CIRCLED[k]} ${LINEAR_POOL[i]!.text}`)
      .join("\n");
    const yes = idx
      .map((i, k) => ({ i, k }))
      .filter(({ i }) => LINEAR_POOL[i]!.isLinear)
      .map(({ k }) => CIRCLED[k])
      .join(", ");
    return {
      content: `다음 중 $y$가 $x$에 대한 일차함수인 것은 모두 몇 개인지 구하시오.\n${items}`,
      answer: `$${ans}$개`,
      solution: `$y=ax+b (a\\ne0)$ 꼴로 정리되면 일차함수이다.\n일차함수인 것은 ${yes === "" ? "없다" : `${yes}이다`}.\n따라서 $${ans}$개이다.`,
      facts: {
        i0: idx[0]!,
        i1: idx[1]!,
        i2: idx[2]!,
        i3: idx[3]!,
        i4: idx[4]!,
        ans,
      },
    };
  }),

  def(MINOR_G1, "04", "일차함수의 그래프 위의 점", SEC.함숫값, "기본", (rng) =>
    attempt(80, () => {
      const a = nonZero(rng, -4, 4);
      const k = nonZero(rng, -5, 5);
      const b = intBetween(rng, -6, 6);
      const q = a * k + b;
      if (q === 0 || Math.abs(q) > 20) return null;
      return {
        content: `점 $(k, ${q})$${iGa(q)} 일차함수 $y=${linear(a, b)}$의 그래프 위에 있을 때, $k$의 값을 구하시오.`,
        answer: `$${k}$`,
        solution: `$x=k$, $y=${q}$${eulReul(q)} 대입하면 $${q}=${a === 1 ? "k" : a === -1 ? "-k" : `${a}k`}${b > 0 ? `+${b}` : b === 0 ? "" : b}$이므로 $${a === 1 ? "k" : a === -1 ? "-k" : `${a}k`}=${q - b}$이다.\n따라서 $k=${k}$이다.`,
        facts: { a, b, q, k },
      };
    }),
  ),

  def(MINOR_G1, "05", "일차함수의 그래프의 평행이동", SEC.성질, "응용", (rng) =>
    attempt(80, () => {
      const a = nonZero(rng, -4, 4);
      const p = nonZero(rng, -4, 4);
      const q = nonZero(rng, -8, 8);
      const c = q - a * p;
      if (c === 0 || Math.abs(c) > 12) return null;
      return {
        content: `일차함수 $y=${mono(a)}$의 그래프를 $y$축의 방향으로 $c$만큼 평행이동하였더니 점 $(${p}, ${q})$${eulReul(q)} 지났다. $c$의 값을 구하시오.`,
        answer: `$${c}$`,
        solution: `평행이동한 그래프의 식은 $y=${mono(a)}+c$이다.\n$x=${p}$, $y=${q}$${eulReul(q)} 대입하면 $${q}=${a * p}+c$이다.\n따라서 $c=${c}$이다.`,
        facts: { a, p, q, c },
      };
    }),
  ),

  def(MINOR_G1, "06", "일차함수의 그래프의 절편절편", SEC.절편, "응용", (rng) =>
    attempt(120, () => {
      const m = nonZero(rng, -4, 4);
      const x0 = nonZero(rng, -6, 6);
      const b = -m * x0;
      if (b === 0 || Math.abs(b) > 12) return null;
      const ans = x0 + b;
      return {
        content: `일차함수 $y=${linear(m, b)}$의 그래프의 $x$절편을 $a$, $y$절편을 $b$라 할 때, $a+b$의 값을 구하시오.`,
        answer: `$${ans}$`,
        solution: `$y=0$을 대입하면 $${linear(m, b)}=0$에서 $x=${x0}$이므로 $a=${x0}$이다.\n$x=0$을 대입하면 $b=${b}$이다.\n따라서 $a+b=${ans}$이다.`,
        facts: { m, b, x0, ans },
      };
    }),
  ),

  def(MINOR_G1, "07", "일차함수의 그래프의 기울기", SEC.기울기, "응용", (rng) =>
    attempt(200, () => {
      // 그림이 직선을 말한다 — 격자점 두 개를 점선 안내선으로 찍는다(0891 문법).
      const [num, den] = pick(rng, [
        [1, 1],
        [-1, 1],
        [2, 1],
        [-2, 1],
        [1, 2],
        [-1, 2],
      ] as const);
      const b = intBetween(rng, -2, 2);
      const x1 = -intBetween(rng, 1, 2) * den;
      const x2 = intBetween(rng, 1, 2) * den;
      const y1 = (num * x1) / den + b;
      const y2 = (num * x2) / den + b;
      if (y1 === 0 || y2 === 0 || Math.abs(y1) > 5 || Math.abs(y2) > 5)
        return null;
      const p = intBetween(rng, 2, 4) * den;
      if (p === x2 - x1) return null; // 그림의 두 점 간격 그대로면 문제가 안 된다
      const ans = (num * p) / den;
      const xlo = Math.min(-2, x1 - 1);
      const xhi = Math.max(2, x2 + 1);
      const ylo = Math.min(-2, y1 - 1, y2 - 1);
      const yhi = Math.max(2, y1 + 1, y2 + 1);
      if (xhi - xlo > 12 || yhi - ylo > 12) return null;
      return {
        content: `오른쪽 그림과 같은 일차함수의 그래프에서 $x$의 값이 $${p}$만큼 증가할 때, $y$의 값의 증가량을 구하시오.`,
        answer: `$${ans}$`,
        solution: `그래프가 두 점 $(${x1}, ${y1})$, $(${x2}, ${y2})$${eulReul(y2)} 지나므로 기울기는 $${fracTex(num, den)}$이다.\n$x$의 값이 $${p}$만큼 증가할 때 $y$의 값의 증가량은 $${fracTex(num, den)}\\times${p}=${ans}$이다.`,
        facts: { num, den, b, x1, y1, x2, y2, p, ans },
        figureSpec: {
          version: "elem-1",
          kind: "linearGraph",
          lines: [{ slope: num / den, yIntercept: b }],
          xRange: [xlo, xhi],
          yRange: [ylo, yhi],
          marks: [
            [x1, y1],
            [x2, y2],
          ],
        },
      };
    }),
  ),

  def(
    MINOR_G1,
    "08",
    "두 점을 지나는 일차함수의 그래프의 기울기",
    SEC.기울기,
    "기본",
    (rng) =>
      attempt(80, () => {
        const m = nonZero(rng, -4, 4);
        const x1 = intBetween(rng, -5, 2);
        const dx = intBetween(rng, 2, 5);
        const x2 = x1 + dx;
        const y1 = intBetween(rng, -6, 6);
        const y2 = y1 + m * dx;
        if (Math.abs(y2) > 20) return null;
        return {
          content: `두 점 $(${x1}, ${y1})$, $(${x2}, ${y2})$${eulReul(y2)} 지나는 일차함수의 그래프의 기울기를 구하시오.`,
          answer: `$${m}$`,
          solution: `기울기는 $\\dfrac{${y2}-(${y1 >= 0 ? y1 : `${y1}`})}{${x2}-(${x1 >= 0 ? x1 : `${x1}`})}=\\dfrac{${y2 - y1}}{${dx}}=${m}$이다.`,
          facts: { x1, y1, x2, y2, m },
        };
      }),
  ),

  def(
    MINOR_G1,
    "09",
    "세 점이 한 직선 위에 있을 조건",
    SEC.기울기,
    "심화하",
    (rng) =>
      attempt(80, () => {
        const m = nonZero(rng, -3, 3);
        const c = intBetween(rng, -4, 4);
        const x1 = intBetween(rng, -4, -1);
        const x2 = intBetween(rng, 0, 3);
        const x3 = intBetween(rng, 4, 6);
        if (x1 === x2 || x2 === x3) return null;
        const y1 = m * x1 + c;
        const y2 = m * x2 + c;
        const k = m * x3 + c;
        if ([y1, y2, k].some((v) => Math.abs(v) > 20)) return null;
        return {
          content: `세 점 $\\mathrm{A}(${x1}, ${y1})$, $\\mathrm{B}(${x2}, ${y2})$, $\\mathrm{C}(${x3}, k)$가 한 직선 위에 있을 때, $k$의 값을 구하시오.`,
          answer: `$${k}$`,
          solution: `두 점 $\\mathrm{A}$, $\\mathrm{B}$를 지나는 직선의 기울기는 $\\dfrac{${y2 - y1}}{${x2 - x1}}=${m}$이다.\n$\\mathrm{B}$, $\\mathrm{C}$의 기울기도 같아야 하므로 $\\dfrac{k-(${y2 >= 0 ? y2 : `${y2}`})}{${x3 - x2}}=${m}$이다.\n따라서 $k=${k}$이다.`,
          facts: { x1, y1, x2, y2, x3, k },
        };
      }),
  ),

  def(
    MINOR_G1,
    "11",
    "일차함수의 그래프와 좌표축으로 둘러싸인 도형의 넓이",
    SEC.절편,
    "응용",
    (rng) =>
      attempt(200, () => {
        const x0 = nonZero(rng, -5, 5);
        const b = nonZero(rng, -5, 5);
        if ((Math.abs(x0) * Math.abs(b)) % 2 !== 0) return null;
        const m = -b / x0;
        if (Math.abs(m) > 4 || Math.abs(m) < 0.25) return null;
        if (!Number.isInteger(m * 2)) return null; // 지면에 쓸 수 있는 기울기만(정수·반정수)
        const area = (Math.abs(x0) * Math.abs(b)) / 2;
        const mtext = Number.isInteger(m)
          ? linear(m, b)
          : `${m < 0 ? "-" : ""}\\dfrac{${Math.abs(m * 2)}}{2}x${b > 0 ? `+${b}` : b}`;
        const xlo = Math.min(-2, x0 - 2);
        const xhi = Math.max(2, x0 + 2);
        const ylo = Math.min(-2, b - 2);
        const yhi = Math.max(2, b + 2);
        if (xhi - xlo > 12 || yhi - ylo > 12) return null;
        return {
          content: `일차함수 $y=${mtext}$의 그래프와 $x$축 및 $y$축으로 둘러싸인 도형의 넓이를 구하시오.`,
          answer: `$${area}$`,
          solution: `$x$절편은 $${x0}$, $y$절편은 $${b}$이다.\n둘러싸인 도형은 두 절편을 밑변·높이로 하는 직각삼각형이므로 넓이는 $\\dfrac{1}{2}\\times${Math.abs(x0)}\\times${Math.abs(b)}=${area}$이다.`,
          facts: { x0, b, area },
          figureSpec: {
            version: "elem-1",
            kind: "linearGraph",
            lines: [{ slope: m, yIntercept: b }],
            xRange: [xlo, xhi],
            yRange: [ylo, yhi],
            marks: [
              [x0, 0],
              [0, b],
            ],
          },
        };
      }),
  ),

  def(
    MINOR_G1,
    "12",
    "함숫값을 이용하여 일차함수의 그래프의 기울기 구하기",
    SEC.기울기,
    "심화하",
    (rng) =>
      attempt(80, () => {
        const m = nonZero(rng, -4, 4);
        const p = intBetween(rng, -4, 6);
        const q = attempt(60, () => {
          const v = intBetween(rng, -6, 4);
          return v === p ? null : v;
        });
        const d = m * (p - q);
        if (d === 0 || Math.abs(d) > 24) return null;
        return {
          content: `일차함수 $y=f(x)$에 대하여 $f(${p})-f(${q})=${d}$일 때, 이 일차함수의 그래프의 기울기를 구하시오.`,
          answer: `$${m}$`,
          solution: `기울기는 $\\dfrac{f(${p})-f(${q})}{${p}-(${q >= 0 ? q : `${q}`})}=\\dfrac{${d}}{${p - q}}=${m}$이다.`,
          facts: { p, q, d, m },
        };
      }),
  ),

  // ── 일차함수와 그 그래프 ⑵ ─────────────────────────────
  def(MINOR_G2, "03", "두 일차함수의 그래프의 평행", SEC.성질, "응용", (rng) =>
    attempt(80, () => {
      const a = nonZero(rng, -4, 4);
      const mult = intBetween(rng, 2, 3);
      const off = nonZero(rng, -3, 3);
      const coef2 = mult * a - off;
      if (coef2 === 0) return null;
      const c1 = intBetween(rng, -5, 5);
      const c2 = attempt(60, () => {
        const v = intBetween(rng, -5, 5);
        return v === c1 ? null : v;
      });
      return {
        // $c_1=0$ 이면 식이 「$x$(엑스)」로 끝난다.
        content: `두 일차함수 $y=(${mult}a${off > 0 ? `-${off}` : `+${-off}`})x${c1 > 0 ? `+${c1}` : c1 === 0 ? "" : c1}$${c1 === 0 ? "와" : waGwa(c1)} $y=${linear(coef2, c2)}$의 그래프가 서로 평행할 때, 상수 $a$의 값을 구하시오.`,
        answer: `$${a}$`,
        solution: `두 그래프가 평행하면 기울기가 같다.\n$${mult}a${off > 0 ? `-${off}` : `+${-off}`}=${coef2}$에서 $${mult}a=${coef2 + off}$이다.\n따라서 $a=${a}$이다.`,
        facts: { a, mult, off, coef2, c1, c2 },
      };
    }),
  ),

  def(
    MINOR_G2,
    "05",
    "일차함수의 식 구하기 기울기와 절편이 주어질 때",
    SEC.식구하기,
    "기본",
    (rng) =>
      attempt(80, () => {
        const m = nonZero(rng, -4, 4);
        const b = nonZero(rng, -6, 6);
        const p = nonZero(rng, -4, 4);
        const k = m * p + b;
        if (Math.abs(k) > 20) return null;
        return {
          content: `기울기가 $${m}$이고 $y$절편이 $${b}$인 일차함수의 그래프가 점 $(${p}, k)$를 지날 때, $k$의 값을 구하시오.`,
          answer: `$${k}$`,
          solution: `일차함수의 식은 $y=${linear(m, b)}$이다.\n$x=${p}$${eulReul(p)} 대입하면 $k=${m * p}${b > 0 ? `+${b}` : b}=${k}$이다.`,
          facts: { m, b, p, k },
        };
      }),
  ),

  def(
    MINOR_G2,
    "06",
    "일차함수의 식 구하기 기울기와 한 점의 좌표가 주어질 때",
    SEC.식구하기,
    "응용",
    (rng) =>
      attempt(80, () => {
        const m = nonZero(rng, -4, 4);
        const p = nonZero(rng, -4, 4);
        const q = intBetween(rng, -6, 6);
        const b = q - m * p;
        if (b === 0 || Math.abs(b) > 15) return null;
        return {
          content: `기울기가 $${m}$이고 점 $(${p}, ${q})$${eulReul(q)} 지나는 일차함수의 그래프의 $y$절편을 구하시오.`,
          answer: `$${b}$`,
          solution: `일차함수의 식을 $y=${mono(m)}+b$라 하면 $x=${p}$, $y=${q}$${eulReul(q)} 대입하여 $${q}=${m * p}+b$이다.\n따라서 $b=${b}$이므로 $y$절편은 $${b}$이다.`,
          facts: { m, p, q, b },
        };
      }),
  ),

  def(
    MINOR_G2,
    "07",
    "일차함수의 식 구하기 두 점의 좌표가 주어질 때",
    SEC.식구하기,
    "응용",
    (rng) =>
      attempt(80, () => {
        const m = nonZero(rng, -3, 3);
        const x1 = intBetween(rng, -4, 1);
        const dx = intBetween(rng, 2, 5);
        const x2 = x1 + dx;
        const b = nonZero(rng, -6, 6);
        const y1 = m * x1 + b;
        const y2 = m * x2 + b;
        if (Math.abs(y1) > 15 || Math.abs(y2) > 15) return null;
        return {
          content: `두 점 $(${x1}, ${y1})$, $(${x2}, ${y2})$${eulReul(y2)} 지나는 일차함수의 그래프의 $y$절편을 구하시오.`,
          answer: `$${b}$`,
          solution: `기울기는 $\\dfrac{${y2 - y1}}{${dx}}=${m}$이다.\n$y=${mono(m)}+b$에 $x=${x1}$, $y=${y1}$${eulReul(y1)} 대입하면 $${y1}=${m * x1}+b$, $b=${b}$이다.\n따라서 $y$절편은 $${b}$이다.`,
          facts: { x1, y1, x2, y2, m, b },
        };
      }),
  ),

  def(
    MINOR_G2,
    "09",
    "일차함수의 활용 온도에 대한 문제",
    SEC.온도길이,
    "응용",
    (rng) =>
      attempt(80, () => {
        const t0 = intBetween(rng, 16, 30);
        const d = pick(rng, [3, 4, 5, 6] as const); // 100 m 당 하강 (×0.1℃ 단위 아님 — 정수 유지)
        const h = intBetween(rng, 4, 12) * 100;
        const ans = t0 - (d * h) / 100;
        if (ans <= -30 || ans === 0) return null;
        return {
          content: `지면의 기온이 $${t0}\\degree\\mathrm{C}$이고, 높이가 $100 m$ 높아질 때마다 기온이 $${d}\\degree\\mathrm{C}$씩 내려간다고 한다. 높이가 $${h} m$인 곳의 기온을 구하시오.`,
          answer: `$${ans}\\degree\\mathrm{C}$`,
          solution: `높이 $x m$인 곳의 기온을 $y\\degree\\mathrm{C}$라 하면 $y=${t0}-\\dfrac{${d}}{100}x$이다.\n$x=${h}$${eulReul(h)} 대입하면 $y=${t0}-${(d * h) / 100}=${ans}$이다.\n따라서 $${ans}\\degree\\mathrm{C}$이다.`,
          facts: { t0, d, h, ans },
        };
      }),
  ),

  def(
    MINOR_G2,
    "10",
    "일차함수의 활용 길이에 대한 문제",
    SEC.온도길이,
    "응용",
    (rng) =>
      attempt(80, () => {
        const L0 = intBetween(rng, 20, 30);
        const r = pick(rng, [1, 2] as const);
        const t = intBetween(rng, 4, 9);
        const Lk = L0 - r * t;
        if (Lk <= 2) return null;
        return {
          content: `길이가 $${L0} cm$인 양초에 불을 붙이면 $1$분에 $${r} cm$씩 일정하게 짧아진다. 남은 양초의 길이가 $${Lk} cm$가 되는 것은 불을 붙인 지 몇 분 후인지 구하시오.`,
          answer: `$${t}$분 후`,
          solution: `$x$분 후 남은 길이를 $y cm$라 하면 $y=${L0}-${mono(r)}$이다.\n$y=${Lk}$${eulReul(Lk)} 대입하면 $${Lk}=${L0}-${mono(r)}$에서 $${r === 1 ? "x" : `${r}x`}=${L0 - Lk}$이다.\n따라서 $${t}$분 후이다.`,
          facts: { L0, r, Lk, t },
        };
      }),
  ),

  def(
    MINOR_G2,
    "25",
    "일차함수의 활용 산의 기온 변화",
    SEC.온도길이,
    "기본",
    (rng) => {
      const ground = intBetween(rng, 18, 28);
      const drop = intBetween(rng, 2, 5);
      const units = intBetween(rng, 4, 9);
      const height = units * 100;
      const ans = ground - drop * units;
      return {
        content: `지면에서의 기온은 $${ground}\\degree\\mathrm{C}$이고 높이가 $100 m$ 높아질 때마다 기온이 $${drop}\\degree\\mathrm{C}$씩 내려간다. 높이가 $${height} m$인 곳의 기온을 계산하시오.`,
        answer: `$${ans}\\degree\\mathrm{C}$`,
        solution: `$${height} m$는 $100 m$의 $${units}$배이므로 기온은 $${drop}\\times${units}=${drop * units}\\degree\\mathrm{C}$ 내려간다. 따라서 구하는 기온은 $${ground}-${drop * units}=${ans}\\degree\\mathrm{C}$이다.`,
        facts: { ground, drop, units, height, ans },
      };
    },
  ),

  def(
    MINOR_G2,
    "26",
    "일차함수의 활용 물의 온도가 내려가는 시간",
    SEC.온도길이,
    "응용",
    (rng) => {
      const start = intBetween(rng, 72, 92);
      const rate = intBetween(rng, 3, 6);
      const time = intBetween(rng, 5, 10);
      const target = start - rate * time;
      return {
        content: `온도가 $${start}\\degree\\mathrm{C}$인 물을 식히면 $1$분마다 온도가 $${rate}\\degree\\mathrm{C}$씩 일정하게 내려간다. 물의 온도가 $${target}\\degree\\mathrm{C}$가 되는 것은 식히기 시작한 지 몇 분 후인지 구하시오.`,
        answer: `$${time}$분 후`,
        solution: `$x$분 후의 온도를 $y\\degree\\mathrm{C}$라 하면 $y=${start}-${rate}x$이다. $${target}=${start}-${rate}x$이므로 $${rate}x=${start - target}$, 따라서 $x=${time}$이다.`,
        facts: { start, rate, time, target },
      };
    },
  ),

  def(
    MINOR_G2,
    "27",
    "일차함수의 활용 온도계의 액주 길이",
    SEC.온도길이,
    "응용",
    (rng) => {
      const base = intBetween(rng, 3, 8);
      const rate = intBetween(rng, 2, 4);
      const temp = intBetween(rng, 5, 12);
      const length = base + rate * temp;
      return {
        content: `어떤 온도계의 액주 길이는 온도가 $0\\degree\\mathrm{C}$일 때 $${base} mm$이고, 온도가 $1\\degree\\mathrm{C}$ 올라갈 때마다 $${rate} mm$씩 길어진다. 온도가 $${temp}\\degree\\mathrm{C}$일 때 액주 길이를 구하시오.`,
        answer: `$${length} mm$`,
        solution: `온도를 $x\\degree\\mathrm{C}$, 액주 길이를 $y mm$라 하면 $y=${rate}x+${base}$이다. $x=${temp}$${eulReul(temp)} 대입하면 $y=${rate}\\times${temp}+${base}=${length}$이다.`,
        facts: { base, rate, temp, length },
      };
    },
  ),

  def(
    MINOR_G2,
    "28",
    "일차함수의 활용 금속 막대의 길이",
    SEC.온도길이,
    "심화하",
    (rng) => {
      const baseTemp = intBetween(rng, 5, 15);
      const baseLength = intBetween(rng, 40, 70);
      const rate = intBetween(rng, 2, 5);
      const rise = intBetween(rng, 4, 9);
      const temp = baseTemp + rise;
      const length = baseLength + rate * rise;
      return {
        content: `금속 막대의 길이는 온도가 $${baseTemp}\\degree\\mathrm{C}$일 때 $${baseLength} mm$이고, 온도가 $1\\degree\\mathrm{C}$ 올라갈 때마다 $${rate} mm$씩 늘어난다. 이 막대의 길이가 $${length} mm$일 때 온도를 구하시오.`,
        answer: `$${temp}\\degree\\mathrm{C}$`,
        solution: `온도가 $${baseTemp}\\degree\\mathrm{C}$에서 $x\\degree\\mathrm{C}$로 올라가면 길이는 $${baseLength}+${rate}(x-${baseTemp})$이다. $${length}=${baseLength}+${rate}(x-${baseTemp})$이므로 $x-${baseTemp}=${rise}$, 따라서 $x=${temp}$이다.`,
        facts: { baseTemp, baseLength, rate, rise, temp, length },
      };
    },
  ),

  def(
    MINOR_G2,
    "29",
    "일차함수의 활용 용수철의 길이",
    SEC.온도길이,
    "기본",
    (rng) => {
      const base = intBetween(rng, 8, 15);
      const rate = intBetween(rng, 2, 4);
      const weight = intBetween(rng, 4, 9);
      const length = base + rate * weight;
      return {
        content: `추를 달지 않은 용수철의 길이는 $${base} cm$이고, 추의 무게가 $1 kg$ 늘어날 때마다 용수철의 길이는 $${rate} cm$씩 늘어난다. 무게가 $${weight} kg$인 추를 달았을 때 용수철의 길이를 계산하시오.`,
        answer: `$${length} cm$`,
        solution: `추의 무게를 $x kg$, 용수철의 길이를 $y cm$라 하면 $y=${rate}x+${base}$이다. $x=${weight}$${eulReul(weight)} 대입하면 $y=${rate}\\times${weight}+${base}=${length}$이다.`,
        facts: { base, rate, weight, length },
      };
    },
  ),

  def(
    MINOR_G2,
    "30",
    "일차함수의 활용 물통의 수위",
    SEC.온도길이,
    "응용",
    (rng) => {
      const base = intBetween(rng, 4, 12);
      const rate = intBetween(rng, 2, 5);
      const time = intBetween(rng, 5, 10);
      const height = base + rate * time;
      return {
        content: `물의 높이가 $${base} cm$인 물통에 물을 넣었더니 물의 높이가 $1$분마다 $${rate} cm$씩 일정하게 높아졌다. 물의 높이가 $${height} cm$가 되는 것은 물을 넣기 시작한 지 몇 분 후인지 구하시오.`,
        answer: `$${time}$분 후`,
        solution: `$x$분 후 물의 높이를 $y cm$라 하면 $y=${rate}x+${base}$이다. $${height}=${rate}x+${base}$이므로 $${rate}x=${height - base}$, 따라서 $x=${time}$이다.`,
        facts: { base, rate, time, height },
      };
    },
  ),

  def(
    MINOR_G2,
    "31",
    "일차함수의 활용 두 양초의 길이",
    SEC.온도길이,
    "심화하",
    (rng) =>
      attempt(80, () => {
        const rateA = intBetween(rng, 2, 4);
        const rateB = rateA + intBetween(rng, 1, 3);
        const meet = intBetween(rng, 4, 8);
        const startB = intBetween(rng, 32, 45);
        const startA = startB - (rateB - rateA) * meet;
        const length = startA - rateA * meet;
        if (length <= 5) return null;
        return {
          content: `길이가 각각 $${startA} cm$, $${startB} cm$인 두 양초 A, B에 동시에 불을 붙였다. A는 $1$분에 $${rateA} cm$, B는 $1$분에 $${rateB} cm$씩 일정하게 짧아질 때, 두 양초의 길이가 같아지는 것은 몇 분 후인지 구하시오.`,
          answer: `$${meet}$분 후`,
          solution: `$x$분 후 두 양초의 길이는 각각 $${startA}-${rateA}x$, $${startB}-${rateB}x$이다. $${startA}-${rateA}x=${startB}-${rateB}x$에서 $${mono(rateB - rateA)}=${startB - startA}$이므로 $x=${meet}$이다.`,
          facts: { rateA, rateB, meet, startA, startB, length },
        };
      }),
  ),

  def(
    MINOR_G2,
    "32",
    "일차함수의 활용 두 시점에서 길이 구하기",
    SEC.온도길이,
    "심화하",
    (rng) => {
      const rate = intBetween(rng, 2, 5);
      const t1 = intBetween(rng, 2, 5);
      const t2 = t1 + intBetween(rng, 3, 6);
      const length1 = intBetween(rng, 28, 42);
      const start = length1 + rate * t1;
      const length2 = start - rate * t2;
      return {
        content: `일정한 속력으로 짧아지는 양초의 길이가 불을 붙인 지 $${t1}$분 후에 $${length1} cm$이고 $1$분마다 $${rate} cm$씩 짧아진다. 불을 붙인 지 $${t2}$분 후의 길이를 구하시오.`,
        answer: `$${length2} cm$`,
        solution: `처음 길이는 $${length1}+${rate}\\times${t1}=${start} cm$이다. $x$분 후의 길이는 $y=${start}-${rate}x$이므로 $x=${t2}$일 때 $y=${start}-${rate}\\times${t2}=${length2}$이다.`,
        facts: { rate, t1, t2, length1, start, length2 },
      };
    },
  ),

  // ── 일차함수와 일차방정식의 관계 ────────────────────────
  def(
    MINOR_REL,
    "07",
    "연립방정식의 해와 그래프의 교점",
    SEC.연립해,
    "응용",
    (rng) =>
      attempt(200, () => {
        const m1 = nonZero(rng, -3, 3);
        const m2 = attempt(60, () => {
          const v = nonZero(rng, -3, 3);
          return v === m1 ? null : v;
        });
        const p = nonZero(rng, -3, 3);
        const q = nonZero(rng, -3, 3);
        const b1 = q - m1 * p;
        const b2 = q - m2 * p;
        // |b|>3 이면 ±4 범위에서 직선이 구석만 스칠 수 있다 — 엔진(linearGraph)이
        // 그런 스펙을 던지므로, 생성기가 먼저 좁힌다.
        if (Math.abs(b1) > 3 || Math.abs(b2) > 3) return null;
        return {
          // $b_1=0$ 이면 식이 「$x$(엑스)」로 끝난다.
          content: `오른쪽 그림은 두 일차함수 $y=${linear(m1, b1)}$${b1 === 0 ? "와" : waGwa(b1)} $y=${linear(m2, b2)}$의 그래프이다. 연립방정식 $\\begin{cases}y=${linear(m1, b1)}\\\\y=${linear(m2, b2)}\\end{cases}$의 해를 구하시오.`,
          answer: `$x=${p}$, $y=${q}$`,
          solution: `연립방정식의 해는 두 그래프의 교점의 좌표와 같다.\n두 그래프는 점 $(${p}, ${q})$에서 만나므로 해는 $x=${p}$, $y=${q}$이다.`,
          facts: { m1, b1, m2, b2, p, q },
          figureSpec: {
            version: "elem-1",
            kind: "linearGraph",
            lines: [
              { slope: m1, yIntercept: b1, label: `y=${linear(m1, b1)}` },
              { slope: m2, yIntercept: b2, label: `y=${linear(m2, b2)}` },
            ],
            xRange: [-4, 4],
            yRange: [-4, 4],
            marks: [[p, q]],
          },
        };
      }),
  ),

  // ── 확장 유형 (갈래 C, 70~99) ─────────────────────────
  // RPM 색인은 이 중단원을 13유형까지만 담는다. 130소단원을 10유형으로 올리려면
  // 색인에 없는 유형을 지어야 하므로 **번호를 갈래마다 나눠 쓴다** — 갈래 C 는 70번대.
  // (파일로만 나누면 안 겹치지 않는다: 한 중단원이 파일 여럿에 걸쳐 있다.
  //  2026-08-27 에 `2-2|도형의 닮음|31~35` 가 실제로 두 갈래에서 겹쳤다.)

  def(
    MINOR_G1,
    "70",
    "함숫값이 주어질 때 미지수 구하기",
    SEC.함숫값,
    "기본",
    (rng) =>
      attempt(80, () => {
        const a = nonZero(rng, -5, 5);
        const b = intBetween(rng, -6, 6);
        const p = nonZero(rng, -4, 4);
        const q = a * p + b;
        if (Math.abs(q) > 25) return null;
        const pa = p === 1 ? "a" : p === -1 ? "-a" : `${p}a`;
        const tail = b > 0 ? `+${b}` : b === 0 ? "" : `${b}`;
        return {
          content: `일차함수 $f(x)=ax${tail}$에 대하여 $f(${p})=${q}$일 때, 상수 $a$의 값을 구하시오.`,
          answer: `$${a}$`,
          solution: `$x=${p}$${eulReul(p)} 대입하면 $${pa}${tail}=${q}$이다.\n따라서 $${pa}=${q - b}$이므로 $a=${a}$이다.`,
          facts: { a, b, p, q },
        };
      }),
  ),

  def(
    MINOR_G1,
    "71",
    "두 함숫값이 주어질 때 일차함수의 식",
    SEC.함숫값,
    "응용",
    (rng) =>
      attempt(80, () => {
        const a = nonZero(rng, -4, 4);
        const b = nonZero(rng, -6, 6);
        const p = intBetween(rng, -4, 1);
        const q = p + intBetween(rng, 2, 5);
        const fp = a * p + b;
        const fq = a * q + b;
        if (Math.abs(fp) > 25 || Math.abs(fq) > 25) return null;
        const ans = a + b;
        return {
          content: `일차함수 $f(x)=ax+b$에 대하여 $f(${p})=${fp}$, $f(${q})=${fq}$일 때, $a+b$의 값을 구하시오.`,
          answer: `$${ans}$`,
          solution: `두 식을 변끼리 빼면 $${q - p}a=${fq - fp}$이므로 $a=${a}$이다.\n$f(${p})=${fp}$에 $a=${a}$${eulReul(a)} 대입하면 $${a * p}+b=${fp}$이므로 $b=${b}$이다.\n따라서 $a+b=${ans}$이다.`,
          facts: { a, b, p, q, fp, fq, ans },
        };
      }),
  ),

  def(
    MINOR_G1,
    "72",
    "두 함숫값의 합에서 상수 구하기",
    SEC.함숫값,
    "응용",
    (rng) =>
      attempt(80, () => {
        const a = nonZero(rng, -5, 5);
        const b = nonZero(rng, -9, 9);
        const p = intBetween(rng, 2, 6);
        const s = 2 * b;
        return {
          content: `일차함수 $f(x)=${mono(a)}+b$에 대하여 $f(${p})+f(${-p})=${s}$일 때, 상수 $b$의 값을 구하시오.`,
          answer: `$${b}$`,
          solution: `$f(${p})=${a * p}+b$, $f(${-p})=${-a * p}+b$이므로 두 값을 더하면 $x$항이 없어져 $2b$가 된다.\n$2b=${s}$이므로 $b=${b}$이다.`,
          facts: { a, b, p, s },
        };
      }),
  ),

  def(MINOR_G1, "73", "일차함수가 되기 위한 조건", SEC.함숫값, "기본", (rng) =>
    attempt(80, () => {
      const k = nonZero(rng, -6, 6);
      const c = nonZero(rng, -8, 8);
      const head = k > 0 ? `a-${k}` : `a+${-k}`;
      return {
        content: `$y=(${head})x${c > 0 ? `+${c}` : `${c}`}$${iGa(c)} $x$에 대한 일차함수가 되도록 할 때, 상수 $a$의 값이 될 수 없는 수를 구하시오.`,
        answer: `$${k}$`,
        solution: `일차함수가 되려면 $x$의 계수가 $0$이 아니어야 한다.\n$${head}\\ne0$이어야 하므로 $a\\ne${k}$이다.\n따라서 될 수 없는 수는 $${k}$이다.`,
        facts: { k, c },
      };
    }),
  ),

  def(
    MINOR_G1,
    "74",
    "정비례 관계에서 함숫값 구하기",
    SEC.함숫값,
    "기본",
    (rng) =>
      attempt(120, () => {
        const a = nonZero(rng, -5, 5);
        const p = nonZero(rng, -5, 5);
        const r = attempt(60, () => {
          const v = nonZero(rng, -6, 6);
          return v === p ? null : v;
        });
        const q = a * p;
        const ans = a * r;
        if (Math.abs(q) > 25 || Math.abs(ans) > 30) return null;
        return {
          content: `정비례 관계 $f(x)=ax$에 대하여 $f(${p})=${q}$일 때, $f(${r})$의 값을 구하시오.`,
          answer: `$${ans}$`,
          solution: `$f(${p})=${p === 1 ? "a" : p === -1 ? "-a" : `${p}a`}=${q}$이므로 $a=${a}$이다.\n따라서 $f(${r})=${a}\\times${r < 0 ? `(${r})` : r}=${ans}$이다.`,
          facts: { a, p, q, r, ans },
        };
      }),
  ),

  def(
    MINOR_G1,
    "75",
    "함숫값의 차가 주어질 때 함숫값 구하기",
    SEC.함숫값,
    "심화하",
    (rng) =>
      attempt(200, () => {
        const a = nonZero(rng, -4, 4);
        const b = intBetween(rng, -6, 6);
        const q = intBetween(rng, -3, 2);
        const p = q + intBetween(rng, 2, 5);
        const r = attempt(60, () => {
          const v = intBetween(rng, -4, 6);
          return v === p || v === q ? null : v;
        });
        const d = a * (p - q);
        const e = a * q + b;
        const ans = a * r + b;
        if ([d, e, ans].some((v) => Math.abs(v) > 30)) return null;
        return {
          content: `일차함수 $f(x)$에 대하여 $f(${p})-f(${q})=${d}$이고 $f(${q})=${e}$일 때, $f(${r})$의 값을 구하시오.`,
          answer: `$${ans}$`,
          solution: `기울기는 $\\dfrac{${d}}{${p}-(${q})}=\\dfrac{${d}}{${p - q}}=${a}$이다.\n$f(${q})=${e}$이므로 $f(${r})=${e}${a >= 0 ? `+${a}` : `-${-a}`}\\times(${r}-(${q}))=${ans}$이다.`,
          facts: { a, b, p, q, r, d, e, ans },
        };
      }),
  ),

  def(
    MINOR_G1,
    "76",
    "x의 값의 증가량에 대한 y의 값의 증가량",
    SEC.기울기,
    "기본",
    (rng) =>
      attempt(80, () => {
        const m = nonZero(rng, -5, 5);
        const p = intBetween(rng, 2, 8);
        const ans = m * p;
        if (Math.abs(ans) > 40) return null;
        return {
          content: `기울기가 $${m}$인 일차함수의 그래프에서 $x$의 값이 $${p}$만큼 증가할 때, $y$의 값의 증가량을 구하시오.`,
          answer: `$${ans}$`,
          solution: `(기울기)$=\\dfrac{(y의 값의 증가량)}{(x의 값의 증가량)}$이므로 $y$의 값의 증가량은 $(기울기)\\times(x의 값의 증가량)$이다.\n따라서 $${m}\\times${p}=${ans}$이다.`,
          facts: { m, p, ans },
        };
      }),
  ),

  def(
    MINOR_G1,
    "77",
    "y의 값의 증가량이 주어질 때 기울기 구하기",
    SEC.기울기,
    "기본",
    (rng) =>
      attempt(80, () => {
        const m = nonZero(rng, -5, 5);
        const p = intBetween(rng, 2, 8);
        const d = m * p;
        if (Math.abs(d) > 40) return null;
        return {
          content: `어떤 일차함수의 그래프에서 $x$의 값이 $${p}$만큼 증가할 때 $y$의 값은 $${Math.abs(d)}$만큼 ${d > 0 ? "증가" : "감소"}한다. 이 그래프의 기울기를 구하시오.`,
          answer: `$${m}$`,
          solution: `$y$의 값의 증가량은 $${d}$이다.\n따라서 기울기는 $\\dfrac{${d}}{${p}}=${m}$이다.`,
          facts: { m, p, d },
        };
      }),
  ),

  def(
    MINOR_G1,
    "78",
    "기울기가 주어질 때 점의 좌표 구하기",
    SEC.기울기,
    "응용",
    (rng) =>
      attempt(120, () => {
        const m = nonZero(rng, -4, 4);
        const a = intBetween(rng, -5, 2);
        const dx = intBetween(rng, 2, 5);
        const x2 = a + dx;
        const y1 = intBetween(rng, -6, 6);
        const y2 = y1 + m * dx;
        if (Math.abs(y2) > 25) return null;
        return {
          content: `두 점 $(a, ${y1})$, $(${x2}, ${y2})$${eulReul(y2)} 지나는 일차함수의 그래프의 기울기가 $${m}$일 때, $a$의 값을 구하시오.`,
          answer: `$${a}$`,
          solution: `$\\dfrac{${y2}-(${y1})}{${x2}-a}=${m}$에서 $\\dfrac{${y2 - y1}}{${x2}-a}=${m}$이다.\n따라서 $${x2}-a=${dx}$이므로 $a=${a}$이다.`,
          facts: { m, a, x2, y1, y2 },
        };
      }),
  ),

  def(
    MINOR_G1,
    "79",
    "기울기가 주어질 때 계수 구하기",
    SEC.기울기,
    "기본",
    (rng) =>
      attempt(120, () => {
        const a = nonZero(rng, -4, 4);
        const mult = intBetween(rng, 2, 4);
        const off = nonZero(rng, -5, 5);
        const m = mult * a - off;
        if (m === 0 || Math.abs(m) > 20) return null;
        const c = nonZero(rng, -6, 6);
        const head = off > 0 ? `${mult}a-${off}` : `${mult}a+${-off}`;
        return {
          content: `일차함수 $y=(${head})x${c > 0 ? `+${c}` : `${c}`}$의 그래프의 기울기가 $${m}$일 때, 상수 $a$의 값을 구하시오.`,
          answer: `$${a}$`,
          solution: `$x$의 계수가 곧 기울기이므로 $${head}=${m}$이다.\n$${mult}a=${m + off}$이므로 $a=${a}$이다.`,
          facts: { a, mult, off, m, c },
        };
      }),
  ),

  def(
    MINOR_G1,
    "80",
    "기울기가 같은 두 직선에서 미지수 구하기",
    SEC.기울기,
    "심화하",
    (rng) =>
      attempt(200, () => {
        const m = nonZero(rng, -3, 3);
        const x1 = intBetween(rng, -5, -1);
        const d1 = intBetween(rng, 2, 4);
        const x2 = x1 + d1;
        const y1 = intBetween(rng, -5, 5);
        const y2 = y1 + m * d1;
        const x3 = intBetween(rng, 0, 3);
        const d2 = intBetween(rng, 2, 5);
        const x4 = x3 + d2;
        const y3 = intBetween(rng, -5, 5);
        const k = y3 + m * d2;
        if ([y2, k].some((v) => Math.abs(v) > 25)) return null;
        return {
          content: `두 점 $(${x1}, ${y1})$, $(${x2}, ${y2})$${eulReul(y2)} 지나는 직선과 두 점 $(${x3}, ${y3})$, $(${x4}, k)$를 지나는 직선의 기울기가 서로 같을 때, $k$의 값을 구하시오.`,
          answer: `$${k}$`,
          solution: `앞 직선의 기울기는 $\\dfrac{${y2 - y1}}{${d1}}=${m}$이다.\n뒤 직선도 기울기가 같아야 하므로 $\\dfrac{k-(${y3})}{${d2}}=${m}$이다.\n따라서 $k=${k}$이다.`,
          facts: { m, x1, y1, x2, y2, x3, y3, x4, k },
        };
      }),
  ),

  def(
    MINOR_G1,
    "81",
    "y절편이 주어질 때 상수 구하기",
    SEC.절편,
    "기본",
    (rng) =>
      attempt(120, () => {
        const a = nonZero(rng, -5, 5);
        const mult = intBetween(rng, 2, 4);
        const off = nonZero(rng, -6, 6);
        const b = mult * a - off;
        if (b === 0 || Math.abs(b) > 20) return null;
        const m = nonZero(rng, -4, 4);
        const head = off > 0 ? `${mult}a-${off}` : `${mult}a+${-off}`;
        return {
          content: `일차함수 $y=${mono(m)}+(${head})$의 그래프의 $y$절편이 $${b}$일 때, 상수 $a$의 값을 구하시오.`,
          answer: `$${a}$`,
          solution: `$y$절편은 상수항이므로 $${head}=${b}$이다.\n$${mult}a=${b + off}$이므로 $a=${a}$이다.`,
          facts: { a, mult, off, b, m },
        };
      }),
  ),

  def(
    MINOR_G1,
    "82",
    "일차함수의 그래프의 x절편 구하기",
    SEC.절편,
    "기본",
    (rng) =>
      attempt(120, () => {
        const m = nonZero(rng, -5, 5);
        const x0 = nonZero(rng, -6, 6);
        const b = -m * x0;
        if (Math.abs(b) > 24) return null;
        return {
          content: `일차함수 $y=${linear(m, b)}$의 그래프의 $x$절편을 구하시오.`,
          answer: `$${x0}$`,
          solution: `$x$절편은 $y=0$일 때의 $x$의 값이다.\n$${linear(m, b)}=0$에서 $${mono(m)}=${-b}$이므로 $x=${x0}$이다.`,
          facts: { m, b, x0 },
        };
      }),
  ),

  def(MINOR_G1, "83", "x절편과 y절편의 곱", SEC.절편, "응용", (rng) =>
    attempt(120, () => {
      const m = nonZero(rng, -4, 4);
      const x0 = nonZero(rng, -5, 5);
      const b = -m * x0;
      if (Math.abs(b) > 20) return null;
      const ans = x0 * b;
      return {
        content: `일차함수 $y=${linear(m, b)}$의 그래프의 $x$절편과 $y$절편의 곱을 구하시오.`,
        answer: `$${ans}$`,
        solution: `$y=0$을 대입하면 $x$절편은 $${x0}$이고, $x=0$을 대입하면 $y$절편은 $${b}$이다.\n따라서 두 절편의 곱은 $${x0}\\times${b < 0 ? `(${b})` : b}=${ans}$이다.`,
        facts: { m, b, x0, ans },
      };
    }),
  ),

  def(
    MINOR_G1,
    "84",
    "x절편이 주어질 때 상수 구하기",
    SEC.절편,
    "기본",
    (rng) =>
      attempt(120, () => {
        const m = nonZero(rng, -5, 5);
        const p = nonZero(rng, -6, 6);
        const b = -m * p;
        if (Math.abs(b) > 24) return null;
        return {
          content: `일차함수 $y=${mono(m)}+b$의 그래프의 $x$절편이 $${p}$일 때, 상수 $b$의 값을 구하시오.`,
          answer: `$${b}$`,
          solution: `$x$절편이 $${p}$이므로 그래프는 점 $(${p}, 0)$을 지난다.\n$x=${p}$, $y=0$을 대입하면 $0=${m * p}+b$이므로 $b=${b}$이다.`,
          facts: { m, p, b },
        };
      }),
  ),

  def(
    MINOR_G1,
    "85",
    "x절편이 같은 두 일차함수의 그래프",
    SEC.절편,
    "심화하",
    (rng) =>
      attempt(200, () => {
        const x0 = nonZero(rng, -5, 5);
        const m1 = nonZero(rng, -4, 4);
        const m2 = attempt(60, () => {
          const v = nonZero(rng, -4, 4);
          return v === m1 ? null : v;
        });
        const b1 = -m1 * x0;
        const k = -m2 * x0;
        if (Math.abs(b1) > 20 || Math.abs(k) > 20) return null;
        return {
          content: `두 일차함수 $y=${linear(m1, b1)}$${waGwa(b1)} $y=${mono(m2)}+k$의 그래프의 $x$절편이 서로 같을 때, 상수 $k$의 값을 구하시오.`,
          answer: `$${k}$`,
          solution: `앞 그래프의 $x$절편은 $${linear(m1, b1)}=0$에서 $x=${x0}$이다.\n뒤 그래프도 점 $(${x0}, 0)$을 지나야 하므로 $0=${m2 * x0}+k$이다.\n따라서 $k=${k}$이다.`,
          facts: { x0, m1, b1, m2, k },
        };
      }),
  ),

  def(
    MINOR_G1,
    "86",
    "두 절편의 합이 주어질 때 상수 구하기",
    SEC.절편,
    "심화하",
    (rng) =>
      attempt(200, () => {
        const m = nonZero(rng, -5, 5);
        const x0 = nonZero(rng, -6, 6);
        const b = -m * x0;
        if (b === 0 || Math.abs(b) > 24) return null;
        const sum = x0 + b;
        if (sum === 0) return null;
        return {
          content: `일차함수 $y=${mono(m)}+b$의 그래프에서 ($x$절편)$+$($y$절편)$=${sum}$일 때, 상수 $b$의 값을 구하시오.`,
          answer: `$${b}$`,
          solution: `$y$절편은 $b$이고, $x$절편은 $${mono(m)}+b=0$에서 $x=${x0}$이다.\n두 절편의 합이 $${sum}$이므로 $${x0}+${b < 0 ? `(${b})` : b}=${sum}$${iGa(sum)} 되어 $b=${b}$이다.`,
          facts: { m, x0, b, sum },
        };
      }),
  ),

  def(
    MINOR_G2,
    "70",
    "두 점이 주어질 때 x절편 구하기",
    SEC.식구하기,
    "응용",
    (rng) =>
      attempt(200, () => {
        const m = nonZero(rng, -4, 4);
        const x0 = nonZero(rng, -5, 5);
        const b = -m * x0;
        const x1 = attempt(60, () => {
          const v = intBetween(rng, -5, 2);
          return v === x0 ? null : v;
        });
        const dx = intBetween(rng, 2, 5);
        const x2 = x1 + dx;
        if (x2 === x0) return null;
        const y1 = m * x1 + b;
        const y2 = m * x2 + b;
        if ([y1, y2, b].some((v) => Math.abs(v) > 24)) return null;
        return {
          content: `두 점 $(${x1}, ${y1})$, $(${x2}, ${y2})$${eulReul(y2)} 지나는 일차함수의 그래프의 $x$절편을 구하시오.`,
          answer: `$${x0}$`,
          solution: `기울기는 $\\dfrac{${y2 - y1}}{${dx}}=${m}$이므로 그래프의 식은 $y=${linear(m, b)}$이다.\n$y=0$을 대입하면 $x=${x0}$이다.`,
          facts: { m, b, x0, x1, y1, x2, y2 },
        };
      }),
  ),

  def(
    MINOR_G2,
    "71",
    "기울기와 한 점이 주어질 때 x절편 구하기",
    SEC.식구하기,
    "응용",
    (rng) =>
      attempt(200, () => {
        const m = nonZero(rng, -4, 4);
        const x0 = nonZero(rng, -5, 5);
        const b = -m * x0;
        const p = attempt(60, () => {
          const v = nonZero(rng, -5, 5);
          return v === x0 ? null : v;
        });
        const q = m * p + b;
        if (q === 0 || [q, b].some((v) => Math.abs(v) > 24)) return null;
        return {
          content: `기울기가 $${m}$이고 점 $(${p}, ${q})$${eulReul(q)} 지나는 일차함수의 그래프의 $x$절편을 구하시오.`,
          answer: `$${x0}$`,
          solution: `식을 $y=${mono(m)}+b$라 하고 $x=${p}$, $y=${q}$${eulReul(q)} 대입하면 $${q}=${m * p}+b$이므로 $b=${b}$이다.\n$y=${linear(m, b)}$에서 $y=0$을 대입하면 $x=${x0}$이다.`,
          facts: { m, p, q, b, x0 },
        };
      }),
  ),

  def(
    MINOR_G2,
    "72",
    "두 절편이 주어질 때 기울기 구하기",
    SEC.식구하기,
    "기본",
    (rng) =>
      attempt(120, () => {
        const m = nonZero(rng, -5, 5);
        const x0 = nonZero(rng, -6, 6);
        const b = -m * x0;
        if (Math.abs(b) > 24) return null;
        return {
          content: `$x$절편이 $${x0}$이고 $y$절편이 $${b}$인 일차함수의 그래프의 기울기를 구하시오.`,
          answer: `$${m}$`,
          solution: `그래프는 두 점 $(${x0}, 0)$, $(0, ${b})$${eulReul(b)} 지난다.\n따라서 기울기는 $\\dfrac{${b}-0}{0-(${x0})}=\\dfrac{${b}}{${-x0}}=${m}$이다.`,
          facts: { m, x0, b },
        };
      }),
  ),

  def(
    MINOR_G2,
    "73",
    "평행하고 한 점을 지나는 그래프의 y절편",
    SEC.식구하기,
    "응용",
    (rng) =>
      attempt(200, () => {
        const m = nonZero(rng, -4, 4);
        const c = nonZero(rng, -6, 6);
        const p = nonZero(rng, -4, 4);
        const q = intBetween(rng, -8, 8);
        const b = q - m * p;
        if (b === 0 || b === c || Math.abs(b) > 20) return null;
        return {
          content: `일차함수 $y=${linear(m, c)}$의 그래프와 평행하고 점 $(${p}, ${q})$${eulReul(q)} 지나는 일차함수의 그래프의 $y$절편을 구하시오.`,
          answer: `$${b}$`,
          solution: `평행하면 기울기가 같으므로 구하는 식은 $y=${mono(m)}+b$이다.\n$x=${p}$, $y=${q}$${eulReul(q)} 대입하면 $${q}=${m * p}+b$이므로 $b=${b}$이다.`,
          facts: { m, c, p, q, b },
        };
      }),
  ),

  def(
    MINOR_G2,
    "74",
    "두 점으로 식을 세워 다른 점의 좌표 구하기",
    SEC.식구하기,
    "심화하",
    (rng) =>
      attempt(200, () => {
        const m = nonZero(rng, -3, 3);
        const b = nonZero(rng, -6, 6);
        const x1 = intBetween(rng, -4, 0);
        const dx = intBetween(rng, 2, 4);
        const x2 = x1 + dx;
        const r = attempt(60, () => {
          const v = intBetween(rng, -5, 7);
          return v === x1 || v === x2 ? null : v;
        });
        const y1 = m * x1 + b;
        const y2 = m * x2 + b;
        const k = m * r + b;
        if ([y1, y2, k].some((v) => Math.abs(v) > 25)) return null;
        return {
          content: `두 점 $(${x1}, ${y1})$, $(${x2}, ${y2})$${eulReul(y2)} 지나는 일차함수의 그래프가 점 $(${r}, k)$를 지날 때, $k$의 값을 구하시오.`,
          answer: `$${k}$`,
          solution: `기울기는 $\\dfrac{${y2 - y1}}{${dx}}=${m}$이고, $y=${mono(m)}+b$에 $x=${x1}$, $y=${y1}$${eulReul(y1)} 대입하면 $b=${b}$이다.\n$y=${linear(m, b)}$에 $x=${r}$${eulReul(r)} 대입하면 $k=${k}$이다.`,
          facts: { m, b, x1, y1, x2, y2, r, k },
        };
      }),
  ),

  def(
    MINOR_G2,
    "75",
    "기울기와 한 점이 주어질 때 계수와 상수항의 합",
    SEC.식구하기,
    "기본",
    (rng) =>
      attempt(120, () => {
        const m = nonZero(rng, -5, 5);
        const p = nonZero(rng, -4, 4);
        const q = intBetween(rng, -8, 8);
        const b = q - m * p;
        if (b === 0 || Math.abs(b) > 20) return null;
        const ans = m + b;
        return {
          content: `기울기가 $${m}$이고 점 $(${p}, ${q})$${eulReul(q)} 지나는 일차함수의 식을 $y=ax+b$라 할 때, $a+b$의 값을 구하시오.`,
          answer: `$${ans}$`,
          solution: `기울기가 $${m}$이므로 $a=${m}$이고, 식은 $y=${mono(m)}+b$이다.\n$x=${p}$, $y=${q}$${eulReul(q)} 대입하면 $b=${b}$이다.\n따라서 $a+b=${ans}$이다.`,
          facts: { m, p, q, b, ans },
        };
      }),
  ),

  def(MINOR_G2, "76", "그래프가 지나지 않는 사분면", SEC.성질, "응용", (rng) =>
    attempt(120, () => {
      const m = nonZero(rng, -4, 4);
      const b = nonZero(rng, -8, 8);
      // 기울기·y절편의 부호가 «안 지나는 사분면» 하나를 정한다.
      //   m>0,b>0 → 4 · m>0,b<0 → 2 · m<0,b>0 → 3 · m<0,b<0 → 1
      const miss = m > 0 ? (b > 0 ? 4 : 2) : b > 0 ? 3 : 1;
      return {
        content: `일차함수 $y=${linear(m, b)}$의 그래프가 지나지 않는 사분면을 구하시오.`,
        answer: `제$${miss}$사분면`,
        solution: `기울기가 ${m > 0 ? "양수" : "음수"}이고 $y$절편이 ${b > 0 ? "양수" : "음수"}이므로 그래프는 오른쪽 ${m > 0 ? "위" : "아래"}로 향하며 $y$축의 ${b > 0 ? "양" : "음"}의 부분을 지난다.\n따라서 제$${miss}$사분면을 지나지 않는다.`,
        facts: { m, b, miss },
      };
    }),
  ),

  def(
    MINOR_G2,
    "77",
    "y의 값이 감소할 조건에서 상수의 최댓값",
    SEC.성질,
    "기본",
    (rng) =>
      attempt(120, () => {
        const k = intBetween(rng, -4, 8);
        const c = nonZero(rng, -6, 6);
        const head = k > 0 ? `a-${k}` : k === 0 ? "a" : `a+${-k}`;
        return {
          content: `일차함수 $y=(${head})x${c > 0 ? `+${c}` : `${c}`}$의 그래프에서 $x$의 값이 증가할 때 $y$의 값은 감소한다. 이때 상수 $a$가 될 수 있는 가장 큰 정수를 구하시오.`,
          answer: `$${k - 1}$`,
          solution: `$x$의 값이 증가할 때 $y$의 값이 감소하려면 기울기가 음수여야 한다.\n$${head}<0$이므로 $a<${k}$이고, 가장 큰 정수는 $${k - 1}$이다.`,
          facts: { k, c, ans: k - 1 },
        };
      }),
  ),

  def(MINOR_G2, "78", "평행이동한 그래프의 y절편", SEC.성질, "기본", (rng) =>
    attempt(120, () => {
      const m = nonZero(rng, -4, 4);
      const b = nonZero(rng, -7, 7);
      const k = nonZero(rng, -8, 8);
      const ans = b + k;
      if (ans === 0 || Math.abs(ans) > 15) return null;
      return {
        content: `일차함수 $y=${linear(m, b)}$의 그래프를 $y$축의 방향으로 $${k}$만큼 평행이동한 그래프의 $y$절편을 구하시오.`,
        answer: `$${ans}$`,
        solution: `$y$축의 방향으로 $${k}$만큼 평행이동하면 식은 $y=${mono(m)}${addend(b)}${addend(k)}$${iGa(k)} 된다.\n따라서 $y$절편은 $${b}${addend(k)}=${ans}$이다.`,
        facts: { m, b, k, ans },
      };
    }),
  ),

  def(
    MINOR_G2,
    "79",
    "두 그래프가 y축 위에서 만날 조건",
    SEC.성질,
    "응용",
    (rng) =>
      attempt(200, () => {
        const b = nonZero(rng, -9, 9);
        const a = nonZero(rng, -5, 5);
        const mult = intBetween(rng, 2, 4);
        const off = mult * a - b;
        if (off === 0) return null;
        const m1 = nonZero(rng, -4, 4);
        const m2 = attempt(60, () => {
          const v = nonZero(rng, -4, 4);
          return v === m1 ? null : v;
        });
        const head = off > 0 ? `${mult}a-${off}` : `${mult}a+${-off}`;
        return {
          content: `두 일차함수 $y=${linear(m1, b)}$${waGwa(b)} $y=${mono(m2)}+(${head})$의 그래프가 $y$축 위의 같은 점에서 만날 때, 상수 $a$의 값을 구하시오.`,
          answer: `$${a}$`,
          solution: `$y$축 위에서 만나려면 두 그래프의 $y$절편이 같아야 한다.\n$${head}=${b}$에서 $${mult}a=${b + off}$이므로 $a=${a}$이다.`,
          facts: { a, b, mult, off, m1, m2 },
        };
      }),
  ),

  def(
    MINOR_G2,
    "80",
    "평행이동한 그래프가 주어진 그래프와 일치할 조건",
    SEC.성질,
    "심화하",
    (rng) =>
      attempt(200, () => {
        const m = nonZero(rng, -4, 4);
        const b = nonZero(rng, -7, 7);
        const k = nonZero(rng, -8, 8);
        const c = b + k;
        if (c === 0 || Math.abs(c) > 15) return null;
        return {
          content: `일차함수 $y=${linear(m, b)}$의 그래프를 $y$축의 방향으로 $k$만큼 평행이동하였더니 일차함수 $y=${linear(m, c)}$의 그래프와 일치하였다. $k$의 값을 구하시오.`,
          answer: `$${k}$`,
          solution: `평행이동한 그래프의 식은 $y=${mono(m)}${addend(b)}+k$이다.\n두 그래프가 일치하려면 $y$절편이 같아야 하므로 $${b}+k=${c}$이다.\n따라서 $k=${k}$이다.`,
          facts: { m, b, k, c },
        };
      }),
  ),

  def(
    MINOR_REL,
    "70",
    "두 그래프의 교점의 좌표의 합",
    SEC.연립해,
    "기본",
    (rng) =>
      attempt(200, () => {
        const m1 = nonZero(rng, -4, 4);
        const m2 = attempt(60, () => {
          const v = nonZero(rng, -4, 4);
          return v === m1 ? null : v;
        });
        const p = nonZero(rng, -4, 4);
        const q = nonZero(rng, -6, 6);
        const b1 = q - m1 * p;
        const b2 = q - m2 * p;
        if ([b1, b2].some((v) => v === 0 || Math.abs(v) > 18)) return null;
        return {
          content: `두 일차함수 $y=${linear(m1, b1)}$${waGwa(b1)} $y=${linear(m2, b2)}$의 그래프의 교점의 $x$좌표와 $y$좌표의 합을 구하시오.`,
          answer: `$${p + q}$`,
          solution: `두 식을 연립하면 $${linear(m1, b1)}=${linear(m2, b2)}$에서 $${coef(m1 - m2, "x")}=${b2 - b1}$이므로 $x=${p}$이다.\n$y=${linear(m1, b1)}$에 대입하면 $y=${q}$이다.\n따라서 교점은 $(${p}, ${q})$이고 좌표의 합은 $${p + q}$이다.`,
          facts: { m1, b1, m2, b2, p, q, ans: p + q },
        };
      }),
  ),

  def(
    MINOR_REL,
    "71",
    "교점을 지나고 기울기가 주어진 직선의 y절편",
    SEC.연립해,
    "응용",
    (rng) =>
      attempt(200, () => {
        const m1 = nonZero(rng, -4, 4);
        const m2 = attempt(60, () => {
          const v = nonZero(rng, -4, 4);
          return v === m1 ? null : v;
        });
        const p = nonZero(rng, -4, 4);
        const q = nonZero(rng, -6, 6);
        const b1 = q - m1 * p;
        const b2 = q - m2 * p;
        const m3 = attempt(60, () => {
          const v = nonZero(rng, -4, 4);
          return v === m1 || v === m2 ? null : v;
        });
        const b3 = q - m3 * p;
        if ([b1, b2, b3].some((v) => v === 0 || Math.abs(v) > 18)) return null;
        return {
          content: `두 일차함수 $y=${linear(m1, b1)}$${waGwa(b1)} $y=${linear(m2, b2)}$의 그래프의 교점을 지나고 기울기가 $${m3}$인 직선의 $y$절편을 구하시오.`,
          answer: `$${b3}$`,
          solution: `두 식을 연립하면 교점은 $(${p}, ${q})$이다.\n구하는 직선을 $y=${mono(m3)}+b$라 하고 $x=${p}$, $y=${q}$${eulReul(q)} 대입하면 $b=${b3}$이다.`,
          facts: { m1, b1, m2, b2, p, q, m3, b3 },
        };
      }),
  ),

  def(
    MINOR_REL,
    "72",
    "교점의 x좌표가 주어질 때 상수 구하기",
    SEC.연립해,
    "응용",
    (rng) =>
      attempt(200, () => {
        const m1 = nonZero(rng, -4, 4);
        const m2 = attempt(60, () => {
          const v = nonZero(rng, -4, 4);
          return v === m1 ? null : v;
        });
        const p = nonZero(rng, -4, 4);
        const b1 = nonZero(rng, -8, 8);
        const q = m1 * p + b1;
        const k = q - m2 * p;
        if (q === 0 || k === 0 || Math.abs(k) > 20) return null;
        return {
          content: `두 일차함수 $y=${linear(m1, b1)}$${waGwa(b1)} $y=${mono(m2)}+k$의 그래프의 교점의 $x$좌표가 $${p}$일 때, 상수 $k$의 값을 구하시오.`,
          answer: `$${k}$`,
          solution: `$x=${p}$${eulReul(p)} $y=${linear(m1, b1)}$에 대입하면 교점은 $(${p}, ${q})$이다.\n이 점이 $y=${mono(m2)}+k$ 위에 있으므로 $${q}=${m2 * p}+k$이고, $k=${k}$이다.`,
          facts: { m1, b1, m2, k, p, q },
        };
      }),
  ),

  def(
    MINOR_REL,
    "73",
    "연립방정식의 해가 주어질 때 두 상수의 곱",
    SEC.연립해,
    "심화하",
    (rng) =>
      attempt(200, () => {
        const p = nonZero(rng, -4, 4);
        const q = nonZero(rng, -4, 4);
        const a = nonZero(rng, -4, 4);
        const b = nonZero(rng, -4, 4);
        const c1 = a * p + q;
        const c2 = p + b * q;
        if ([c1, c2].some((v) => Math.abs(v) > 24)) return null;
        return {
          content: `두 일차방정식 $ax+y=${c1}$, $x+by=${c2}$의 그래프의 교점이 $(${p}, ${q})$일 때, $ab$의 값을 구하시오.`,
          answer: `$${a * b}$`,
          solution: `교점은 두 그래프 위의 점이다.\n$ax+y=${c1}$에 대입하면 $${coef(p, "a")}${addend(q)}=${c1}$이므로 $a=${a}$이다.\n$x+by=${c2}$에 대입하면 $${p}${addCoef(q, "b")}=${c2}$이므로 $b=${b}$이다.\n따라서 $ab=${a * b}$이다.`,
          facts: { p, q, a, b, c1, c2, ans: a * b },
        };
      }),
  ),

  def(
    MINOR_REL,
    "74",
    "일차방정식의 그래프의 기울기 구하기",
    SEC.일차방정식,
    "기본",
    (rng) =>
      attempt(200, () => {
        const m = nonZero(rng, -4, 4);
        const bb = nonZero(rng, -5, 5);
        const a = -m * bb;
        const c = nonZero(rng, -9, 9);
        if (a === 0 || Math.abs(a) > 20) return null;
        return {
          content: `일차방정식 $${a === 1 ? "x" : a === -1 ? "-x" : `${a}x`}${bb > 0 ? `+${bb === 1 ? "" : bb}y` : `-${bb === -1 ? "" : -bb}y`}${c > 0 ? `+${c}` : `${c}`}=0$의 그래프의 기울기를 구하시오.`,
          answer: `$${m}$`,
          // $y$ 의 계수가 $1$ 이면 이미 $y=\cdots$ 꼴이라 나눌 것이 없다.
          solution: `$y$에 대하여 풀면 $${coef(bb, "y")}=${coef(-a, "x")}${addend(-c)}$이다.\n${bb === 1 ? `$x$의 계수는 $${m}$이므로` : `양변을 $${bb}$${euroRo(bb)} 나누면 $x$의 계수는 $\\dfrac{${-a}}{${bb}}=${m}$이므로`} 기울기는 $${m}$이다.`,
          facts: { a, b: bb, c, m },
        };
      }),
  ),
];
