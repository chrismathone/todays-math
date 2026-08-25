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
        content: `점 $(k, ${q})$가 일차함수 $y=${linear(a, b)}$의 그래프 위에 있을 때, $k$의 값을 구하시오.`,
        answer: `$${k}$`,
        solution: `$x=k$, $y=${q}$를 대입하면 $${q}=${a === 1 ? "k" : a === -1 ? "-k" : `${a}k`}${b > 0 ? `+${b}` : b === 0 ? "" : b}$이므로 $${a === 1 ? "k" : a === -1 ? "-k" : `${a}k`}=${q - b}$이다.\n따라서 $k=${k}$이다.`,
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
        content: `일차함수 $y=${mono(a)}$의 그래프를 $y$축의 방향으로 $c$만큼 평행이동하였더니 점 $(${p}, ${q})$를 지났다. $c$의 값을 구하시오.`,
        answer: `$${c}$`,
        solution: `평행이동한 그래프의 식은 $y=${mono(a)}+c$이다.\n$x=${p}$, $y=${q}$를 대입하면 $${q}=${a * p}+c$이다.\n따라서 $c=${c}$이다.`,
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
        solution: `그래프가 두 점 $(${x1}, ${y1})$, $(${x2}, ${y2})$를 지나므로 기울기는 $${fracTex(num, den)}$이다.\n$x$의 값이 $${p}$만큼 증가할 때 $y$의 값의 증가량은 $${fracTex(num, den)}\\times${p}=${ans}$이다.`,
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
          content: `두 점 $(${x1}, ${y1})$, $(${x2}, ${y2})$를 지나는 일차함수의 그래프의 기울기를 구하시오.`,
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
    "심화",
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
    "심화",
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
        content: `두 일차함수 $y=(${mult}a${off > 0 ? `-${off}` : `+${-off}`})x${c1 > 0 ? `+${c1}` : c1 === 0 ? "" : c1}$와 $y=${linear(coef2, c2)}$의 그래프가 서로 평행할 때, 상수 $a$의 값을 구하시오.`,
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
          solution: `일차함수의 식은 $y=${linear(m, b)}$이다.\n$x=${p}$를 대입하면 $k=${m * p}${b > 0 ? `+${b}` : b}=${k}$이다.`,
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
          content: `기울기가 $${m}$이고 점 $(${p}, ${q})$를 지나는 일차함수의 그래프의 $y$절편을 구하시오.`,
          answer: `$${b}$`,
          solution: `일차함수의 식을 $y=${mono(m)}+b$라 하면 $x=${p}$, $y=${q}$를 대입하여 $${q}=${m * p}+b$이다.\n따라서 $b=${b}$이므로 $y$절편은 $${b}$이다.`,
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
          content: `두 점 $(${x1}, ${y1})$, $(${x2}, ${y2})$를 지나는 일차함수의 그래프의 $y$절편을 구하시오.`,
          answer: `$${b}$`,
          solution: `기울기는 $\\dfrac{${y2 - y1}}{${dx}}=${m}$이다.\n$y=${mono(m)}+b$에 $x=${x1}$, $y=${y1}$을 대입하면 $${y1}=${m * x1}+b$, $b=${b}$이다.\n따라서 $y$절편은 $${b}$이다.`,
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
          solution: `높이 $x m$인 곳의 기온을 $y\\degree\\mathrm{C}$라 하면 $y=${t0}-\\dfrac{${d}}{100}x$이다.\n$x=${h}$을 대입하면 $y=${t0}-${(d * h) / 100}=${ans}$이다.\n따라서 $${ans}\\degree\\mathrm{C}$이다.`,
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
          solution: `$x$분 후 남은 길이를 $y cm$라 하면 $y=${L0}-${mono(r)}$이다.\n$y=${Lk}$를 대입하면 $${Lk}=${L0}-${mono(r)}$에서 $${r === 1 ? "x" : `${r}x`}=${L0 - Lk}$이다.\n따라서 $${t}$분 후이다.`,
          facts: { L0, r, Lk, t },
        };
      }),
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
          content: `오른쪽 그림은 두 일차함수 $y=${linear(m1, b1)}$과 $y=${linear(m2, b2)}$의 그래프이다. 연립방정식 $\\begin{cases}y=${linear(m1, b1)}\\\\y=${linear(m2, b2)}\\end{cases}$의 해를 구하시오.`,
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
];
