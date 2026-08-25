/**
 * 중2 「일차함수와 일차방정식」 24유형 — 물결 5D 가 채우는 **남은 번호만**.
 *
 * 이 세 중단원은 이미 반쯤 차 있다(물결 2C `m2Func.ts` · 2D `m2Real.ts`).
 * 실측(2026-08-24 `scripts/middle/type-census.ts`):
 *   · 일차함수와 그 그래프  ⑴ 11/13 → 여기서 **10 · 13**
 *   · 일차함수와 그 그래프  ⑵  8/16 → 여기서 **01 · 02 · 04 · 08 · 13 · 14 · 15 · 16**
 *   · 일차함수와 일차방정식의 관계 1/15 → 여기서 **01~06 · 08~15**
 * 이미 있는 번호를 또 내면 `generate.ts` 의 키 겹침 검사가 던진다.
 *
 * 발문 말투·`facts` 모양·`unitSection` 은 같은 중단원의 `m2Func.ts` 를 따른다 —
 * 한 중단원이 지면에서 두 벌로 보이면 안 된다. 다만 단위는 새 관례
 * (`\,\mathrm{cm}`)를 쓴다. 옛 `$5 cm$` 는 단위가 이탤릭으로 나간다.
 *
 * 생성 규칙(물결 공통 계약):
 *   1. **답을 먼저 정하고 발문을 만든다** — 교점·절편·기울기를 먼저 정수로 잡고
 *      거기서 계수를 역산한다. 그래야 지면에 분수가 안 샌다.
 *   2. `facts` 에 발문의 원 수치를 남기고, **시험이 다른 관계식으로** 다시 유도한다.
 *   3. 수는 전부 `$...$` 안에 (elementary rules.bareNumbers 가드).
 *   4. `attempt` 가 다 떨어지면 던진다 — 조용히 기본값을 돌려주지 않는다.
 *
 * ## 이 단원에서 막아야 하는 것
 *
 * · **$ax+by+c=0$ 에서 $b=0$ 이면 $x=k$ 꼴 세로선이라 일차함수가 아니다.**
 *   「일차함수로 나타내시오」 갈래에서 그 값이 나오면 답이 없다 — `nonZero` 로 잠근다.
 *   반대로 세로선·가로선을 **묻는** 유형(관계05·06)은 일부러 내고, 시험이
 *   「$x=t$ 는 함수가 아니다」를 따로 확인한다.
 * · **$x$절편과 $y$절편은 뒤집어 쓰기 쉽다.** 갈래마다 시험이 둘을 따로 계산해 맞댄다.
 * · **사분면**은 기울기·절편의 부호가 가른다. 시험은 부호표를 옮겨 적지 않고
 *   **직선 위의 점을 실제로 찍어** 그 사분면에 드는 점이 있는지 센다.
 *
 * ## 그림 — `linearGraph` 를 **쓰기만** 한다 (엔진은 5E 소유)
 *
 * 넷(⑴13 · ⑵02 · ⑵14 · 관계12)이 그림을 싣는다. `marks` 는 직선 위가 아니면
 * 엔진이 던지므로 **그림 자체가 검산**이다. 엔진 제약(2026-08-24 실측):
 *   · `xRange`·`yRange` 는 원점을 품고 폭이 4~12칸
 *   · `lines[].slope` 는 $|m|$ 이 $1/6$~$6$ — **가로선(기울기 0)·세로선은 못 그린다**
 *   · `marks` 는 정수 격자점 최대 4개, 원점은 못 찍는다
 * 그래서 관계05·06(좌표축에 평행한 직선)은 **글자만**이다 — 없는 도형을 지어내지 않는다.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";
import { CHOICE_MARKS } from "../problem/choiceCountRule";

import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중2";
const BOOK = "2-1";
// 색인의 실제 문자열 — ⑴⑵ 앞은 **얇은 공백(U+2009) + 보통 공백**이다.
// `scripts/rpm/rpm-type-catalog.json` 에서 바이트 그대로 떠 왔다. 보통 공백 둘로
// 적으면 어디서도 안 걸리고, middleTypeCoverage.test.ts 가 정본과 대조해 막는다.
const MINOR_G1 = "일차함수와 그 그래프  ⑴";
const MINOR_G2 = "일차함수와 그 그래프  ⑵";
const MINOR_REL = "일차함수와 일차방정식의 관계";

/** 우리 Unit.section 정확한 이름 (`prisma/seed-data/units.ts` 리터럴) */
const SEC = {
  성질: "일차함수의 그래프의 성질",
  절편: "일차함수의 그래프와 절편",
  기울기: "일차함수의 그래프와 기울기",
  식구하기: "일차함수의 식 구하기",
  활용기타: "일차함수의 활용(속력, 도형, 기타)",
  일차방정식: "일차함수와 일차방정식",
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
  return attempt(80, () => {
    const v = intBetween(rng, lo, hi);
    return v === 0 ? null : v;
  });
}

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

/** `+3` / `-3` — 뒤에 이어 붙이는 항. `0` 도 `+0` 이라야 `-4`+`0`=`-40` 이 안 된다. */
function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

/**
 * 곱셈의 뒷항 — 음수면 괄호. `3\times-2` 는 지면에서 「3×−2」로 붙어 나간다.
 * 값 검사는 이런 것을 통과시킨다(계산 결과가 맞으니까) — 눈으로만 보인다.
 */
function paren(n: number): string {
  return n < 0 ? `(${n})` : `${n}`;
}

/** `mx` 꼴 — 1x·-1x 를 x·-x 로. */
function mono(m: number): string {
  return monoVar(m, "x");
}

/** `3k`·`-k`·`k` — 계수 붙은 한 글자 변수. */
function monoVar(m: number, v: string): string {
  if (m === 1) return v;
  if (m === -1) return `-${v}`;
  return `${m}${v}`;
}

/** 식 중간에 이어 붙이는 항 — `+2y` / `-y`. 계수 0 이면 빈 문자열. */
function contTerm(c: number, v: string): string {
  if (c === 0) return "";
  const mag = Math.abs(c) === 1 ? "" : `${Math.abs(c)}`;
  return `${c < 0 ? "-" : "+"}${mag}${v}`;
}

/** `mx+b` 꼴 (b=0 이면 mx). */
function linear(m: number, b: number): string {
  if (b === 0) return mono(m);
  return `${mono(m)}${signed(b)}`;
}

/** `3x-2y` — 연립방정식 좌변. */
function abTex(a: number, b: number): string {
  return `${mono(a)}${contTerm(b, "y")}`;
}

/** `3x-2y+6=0` — 일차방정식 정본 꼴. */
function eqTex(a: number, b: number, c: number): string {
  return `${abTex(a, b)}${c === 0 ? "" : signed(c)}=0`;
}

/** `y=mx+b` 를 `mx-y+b=0` 으로 — 같은 직선의 일차방정식 표기. */
function lineEqTex(m: number, b: number): string {
  return `${mono(m)}-y${signed(b)}=0`;
}

/**
 * 기약분수 `num/den` 의 교과 표기 — den=1 이면 정수, 음수는 분수 앞에 부호.
 * (D-73 — 제품이 가분수를 대분수로 바꾸지 않는다. 대분수가 필요하면 직접 쓴다.)
 */
function fracTex(num: number, den: number): string {
  if (den === 1) return `${num}`;
  return `${num < 0 ? "-" : ""}\\dfrac{${Math.abs(num)}}{${den}}`;
}

/** 분수 기울기의 `x` 항 — `\dfrac{2}{3}x` · `-x` · `2x`. */
function slopeTerm(num: number, den: number): string {
  if (den === 1) return mono(num);
  return `${fracTex(num, den)}x`;
}

/**
 * 기울기 $m(\ne 0)$ · $y$절편 $n(\ne 0)$ 인 직선이 **지나지 않는** 사분면.
 *
 * 생성기 쪽 규칙이다. 시험은 이 표를 옮겨 적지 않고 **직선 위의 점을 실제로
 * 찍어** 확인한다 — 표를 두 벌 두면 한쪽만 틀려도 아무도 모른다.
 */
function quadNotPassed(m: number, n: number): number {
  if (m > 0) return n > 0 ? 4 : 2;
  return n > 0 ? 3 : 1;
}

/** 표식은 `choiceCountRule` 한 곳에서 온다 — 세 모듈이 각자 적으면 한쪽만 고쳐진다. */
const CIRCLED = CHOICE_MARKS;

// ── 수식 뒤 조사 — 한 곳에서 고친다 ────────────────────────────────
//
// 「$y=x+1$와」·「$x=3$를」은 KaTeX·bareNumbers 를 **전부 통과한다**. 값도 맞다.
// 지면에서만 걸린다 — 그래서 발문마다 손으로 고르면 반드시 샌다(실측: 이 모듈
// 초판에서 203자리). 규칙을 여기 하나만 두고 모든 발문이 이것을 지나가게 한다.
// 시험은 `rules.ts` 의 `josaFaults`(이 모듈과 **다른 구현**)로 0 인지 다시 잰다.

/** 끝 숫자를 한자 수사로 읽었을 때 받침이 있는가. 영·일·삼·육·칠·팔 만 있다. */
const DIGIT_BATCHIM: Record<string, boolean> = {
  "0": true,
  "1": true,
  "2": false,
  "3": true,
  "4": false,
  "5": false,
  "6": true,
  "7": true,
  "8": true,
  "9": false,
};

/**
 * 알파벳 이름의 받침 — **엘·엠·엔만** 있다.
 * `x` 는 「엑스」라 끝소리에 받침이 없다(「엑」의 ㄱ 은 끝 음절이 아니다) — 그래서
 * 「$y=2x$와」가 맞다. 여기를 헷갈리면 이 모듈 전체가 한 방향으로 틀린다.
 */
const LETTER_BATCHIM: Record<string, boolean> = { l: true, m: true, n: true };

const JOSA_PAIR: Record<string, readonly [string, string]> = {
  을: ["을", "를"],
  를: ["을", "를"],
  이: ["이", "가"],
  가: ["이", "가"],
  과: ["과", "와"],
  와: ["과", "와"],
  은: ["은", "는"],
  는: ["은", "는"],
};

/**
 * 「로 / 으로」는 **표가 다르다** — 받침이 없을 때뿐 아니라 **ㄹ받침**에서도 「로」다
 * (일로·칠로·팔로). 위 표를 그대로 쓰면 「$y=3$로」는 고쳐도 「$x=1$으로」를 만든다.
 * 그래서 한자 수사별로 따로 적는다: 으로가 필요한 것은 영(ㅇ)·삼(ㅁ)·육(ㄱ) 뿐이다.
 */
const RO_NEEDS_EURO: Record<string, boolean> = {
  "0": true,
  "1": false,
  "2": false,
  "3": true,
  "4": false,
  "5": false,
  "6": true,
  "7": false,
  "8": false,
  "9": false,
};

const RO_RE = /\$([^$]*)\$( ?)(으로|로)(?![가-힣])/g;

/** 「$y=3$로」 → 「$y=3$으로」. 수로 끝나는 것만 고친다(문자는 소리를 못 정한다). */
function fixRo(text: string): string {
  return text.replace(RO_RE, (whole, span: string, gap: string) => {
    if (UNIT_TAIL_RE.test(span)) return whole;
    const cleaned = span.replace(/[)\]}\s]+$/, "");
    const digit = cleaned.match(/(\d)$/);
    if (!digit) return whole;
    return `$${span}$${gap}${RO_NEEDS_EURO[digit[1]!] ? "으로" : "로"}`;
  });
}

const JOSA_RE = /\$([^$]*)\$( ?)(을|를|이|가|과|와|은|는)(?![가-힣])/g;

/**
 * 단위로 **끝나는** 수식 — 소리의 끝을 낱말이 정하므로 이 규칙 밖이다.
 * ⚠️ 「`\mathrm` 이 들어 있으면 건너뛴다」로 쓰면 안 된다 — 꼭짓점 이름
 * `$\mathrm{B}(3, 6)$` 처럼 **가운데** 있는 것까지 놓쳐 24자리가 안 고쳐졌다.
 */
const UNIT_TAIL_RE = /(?:\\mathrm\{[^{}]*\}|\\degree)\s*$/;

/**
 * `$...$` 바로 뒤 조사를 읽는 소리에 맞춘다. **못 읽는 것은 손대지 않는다** —
 * 단위(`\mathrm{cm}`·`\degree`)는 낱말이 소리의 끝을 정하므로 이 규칙 밖이다
 * (`rules.ts` 의 `josaFaults` 도 같은 이유로 그 자리를 «안 잰다»고 적어 두었다).
 */
function fixJosa(text: string): string {
  return text.replace(
    JOSA_RE,
    (whole, span: string, gap: string, j: string) => {
      if (UNIT_TAIL_RE.test(span)) return whole;
      const cleaned = span.replace(/[)\]}\s]+$/, "");
      const digit = cleaned.match(/(\d)$/);
      let batchim: boolean;
      if (digit) {
        batchim = DIGIT_BATCHIM[digit[1]!]!;
      } else {
        const letter = cleaned.slice(-1).toLowerCase();
        if (!/[a-z]/.test(letter)) return whole;
        batchim = LETTER_BATCHIM[letter] ?? false;
      }
      const pair = JOSA_PAIR[j]!;
      return `$${span}$${gap}${batchim ? pair[0] : pair[1]}`;
    },
  );
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
    handler: (rng) => {
      const body = gen(rng);
      return {
        grade: GRADE,
        unitSection,
        rpmBook: BOOK,
        rpmMinor,
        rpmType,
        rpmTitle,
        difficulty,
        ...body,
        // 조사는 **여기 한 곳**에서만 맞춘다 — 발문마다 고르면 반드시 샌다.
        content: fixRo(fixJosa(body.content)),
        answer: fixRo(fixJosa(body.answer)),
        solution: fixRo(fixJosa(body.solution)),
      };
    },
  };
}

export const M2_LINE: TypeEntry[] = [
  // ── 일차함수와 그 그래프 ⑴ — 남은 10 · 13 ──────────────
  /**
   * ⑴10 그래프 그리기 — 기울기와 $y$절편으로 «다음 점»을 찾는 그 동작 자체를 묻는다.
   * ⑴04(그래프 위의 점)·⑴06(절편)과 겹치지 않게 «이동한 점»을 답으로 둔다.
   */
  def(MINOR_G1, "10", "일차함수의 그래프 그리기", SEC.기울기, "응용", (rng) =>
    attempt(200, () => {
      const den = pick(rng, [1, 2, 3] as const);
      const num = nonZero(rng, -5, 5);
      if (gcd(Math.abs(num), den) !== 1) return null;
      if (den === 1 && Math.abs(num) > 4) return null;
      const b = nonZero(rng, -6, 6);
      const p = den;
      const q = b + num;
      if (q === 0) return null;
      const ans = p + q;
      const dir = num > 0 ? "위쪽" : "아래쪽";
      return {
        content:
          `일차함수 $y=${slopeTerm(num, den)}${signed(b)}$의 그래프를 기울기와 $y$절편을 이용하여 그리려고 한다. ` +
          `$y$절편을 나타내는 점에서 오른쪽으로 $${den}$칸, ${dir}으로 $${Math.abs(num)}$칸 이동한 점을 $\\mathrm{P}(p, q)$라 할 때, $p+q$의 값을 구하시오.`,
        answer: `$${ans}$`,
        solution:
          `$y$절편이 $${b}$이므로 그래프는 점 $(0, ${b})$를 지난다.\n` +
          `기울기가 $${fracTex(num, den)}$이므로 $x$의 값이 $${den}$만큼 증가하면 $y$의 값은 $${Math.abs(num)}$만큼 ${num > 0 ? "증가" : "감소"}한다.\n` +
          `따라서 이동한 점은 $(${p}, ${q})$이므로 $p+q=${ans}$이다.`,
        facts: { num, den, b, p, q, ans },
      };
    }),
  ),

  /**
   * ⑴13 두 그래프와 좌표축 — $y$절편을 함께 쓰는 두 직선과 $x$축이 삼각형을 만든다.
   * 두 $x$절편을 먼저 정수로 잡고 기울기를 역산한다(답을 먼저 정한다).
   */
  def(
    MINOR_G1,
    "13",
    "두 일차함수의 그래프와 좌표축으로 둘러싸인 도형의 넓이",
    SEC.절편,
    "심화",
    (rng) =>
      attempt(300, () => {
        const c = nonZero(rng, -6, 6);
        const x1 = -intBetween(rng, 1, 4);
        const x2 = intBetween(rng, 1, 4);
        if (c % x1 !== 0 || c % x2 !== 0) return null;
        const m1 = -c / x1;
        const m2 = -c / x2;
        if (m1 === m2) return null;
        if (Math.abs(m1) > 6 || Math.abs(m2) > 6) return null;
        const twice = Math.abs(x2 - x1) * Math.abs(c);
        if (twice % 2 !== 0) return null;
        const area = twice / 2;
        const xlo = x1 - 1;
        const xhi = x2 + 1;
        const ylo = Math.min(-1, c) - 1;
        const yhi = Math.max(1, c) + 1;
        if (xhi - xlo < 4 || xhi - xlo > 12) return null;
        if (yhi - ylo < 4 || yhi - ylo > 12) return null;
        return {
          content: `오른쪽 그림과 같이 두 일차함수 $y=${linear(m1, c)}$와 $y=${linear(m2, c)}$의 그래프와 $x$축으로 둘러싸인 도형의 넓이를 구하시오.`,
          answer: `$${area}$`,
          solution:
            `두 그래프의 $y$절편이 모두 $${c}$이므로 두 그래프는 점 $(0, ${c})$에서 만난다.\n` +
            `$y=${linear(m1, c)}$의 $x$절편은 $${x1}$, $y=${linear(m2, c)}$의 $x$절편은 $${x2}$이다.\n` +
            `밑변의 길이가 $${Math.abs(x2 - x1)}$, 높이가 $${Math.abs(c)}$인 삼각형이므로 넓이는 $\\dfrac{1}{2}\\times ${Math.abs(x2 - x1)}\\times ${Math.abs(c)}=${area}$이다.`,
          facts: { c, x1, x2, m1, m2, area },
          figureSpec: {
            version: "elem-1",
            kind: "linearGraph",
            lines: [
              { slope: m1, yIntercept: c },
              { slope: m2, yIntercept: c },
            ],
            xRange: [xlo, xhi],
            yRange: [ylo, yhi],
            marks: [
              [x1, 0],
              [x2, 0],
              [0, c],
            ],
          },
        };
      }),
  ),

  // ── 일차함수와 그 그래프 ⑵ — 남은 01·02·04·08·13·14·15·16 ──
  /**
   * ⑵01 그래프의 성질 — 「옳은 것은 몇 개인가」. 다섯 항목의 참·거짓을 각각
   * 흔들고, 시험은 그 다섯을 **따로** 다시 판정해 개수를 맞댄다.
   * ㉤(사분면)은 시험이 부호표가 아니라 **점을 찍어** 확인한다.
   */
  def(MINOR_G2, "01", "일차함수 의 그래프의 성질", SEC.성질, "응용", (rng) =>
    attempt(200, () => {
      const a = nonZero(rng, -4, 4);
      const b = nonZero(rng, -6, 6);
      const up = intBetween(rng, 0, 1);
      const k = b + pick(rng, [0, 1, -1, 2, -2] as const);
      const t = a + pick(rng, [0, 1, -1, 2, -2] as const);
      if (t === 0) return null;
      const p = nonZero(rng, -4, 4);
      const q = a * p + b + pick(rng, [0, 1, -1, 2, -2] as const);
      if (q === 0) return null;
      const n = intBetween(rng, 1, 4);
      const truths = [
        (up === 1) === a > 0,
        k === b,
        t === a,
        q === a * p + b,
        n !== quadNotPassed(a, b),
      ];
      const ans = truths.filter(Boolean).length;
      const items = [
        `오른쪽 ${up === 1 ? "위" : "아래"}로 향하는 직선이다.`,
        `$y$절편은 $${k}$이다.`,
        `$x$의 값이 $1$만큼 증가할 때 $y$의 값은 $${Math.abs(t)}$만큼 ${t > 0 ? "증가" : "감소"}한다.`,
        `점 $(${p}, ${q})$를 지난다.`,
        `제$${n}$사분면을 지난다.`,
      ]
        .map((s, i) => `${CIRCLED[i]} ${s}`)
        .join("\n");
      const yes = truths
        .map((v, i) => (v ? CIRCLED[i] : null))
        .filter((v): v is (typeof CIRCLED)[number] => v !== null)
        .join(", ");
      return {
        content: `일차함수 $y=${linear(a, b)}$의 그래프에 대한 다음 설명 중 옳은 것은 모두 몇 개인지 구하시오.\n${items}`,
        answer: `$${ans}$개`,
        solution:
          `기울기가 $${a}$, $y$절편이 $${b}$이므로 그래프는 오른쪽 ${a > 0 ? "위" : "아래"}로 향하고, 점 $(${p}, ${a * p + b})$를 지난다.\n` +
          `$x$의 값이 $1$만큼 증가하면 $y$의 값은 $${Math.abs(a)}$만큼 ${a > 0 ? "증가" : "감소"}하고, 그래프는 제$${quadNotPassed(a, b)}$사분면을 지나지 않는다.\n` +
          `옳은 것은 ${yes === "" ? "없다" : `${yes}이다`}. 따라서 $${ans}$개이다.`,
        facts: { a, b, up, k, t, p, q, n, ans },
      };
    }),
  ),

  /**
   * ⑵02 그래프와 $a$, $b$ 의 부호 — 그림에서 부호를 읽고 **다른 식**의 그래프를 판단한다.
   * 그림에는 눈금 숫자를 안 찍는다(`marks` 없음) — 부호만 보는 문항이다.
   *
   * 묻는 식은 $\pm a$·$\pm b$ 를 기울기·$y$절편에 바꿔 끼운 일곱 가지다
   * (주어진 $y=ax+b$ 자신은 뺀다). 발문이 한 가지뿐이면 한 유형에서 여러 문항을
   * 못 뽑는다 — 실제로 4문항을 못 채워 던졌다.
   */
  def(MINOR_G2, "02", "일차함수 의 그래프와 의 부호", SEC.성질, "심화", (rng) =>
    attempt(120, () => {
      const a = pick(rng, [-3, -2, -1, 1, 2, 3] as const);
      const b = pick(rng, [-4, -3, -2, -1, 1, 2, 3, 4] as const);
      // 묻는 식 $y=({\pm}s)x+({\pm}i)$ — `sSrc` 가 0 이면 기울기가 $a$, 1 이면 $b$.
      const sSrc = intBetween(rng, 0, 1);
      const sNeg = intBetween(rng, 0, 1);
      const iNeg = intBetween(rng, 0, 1);
      if (sSrc === 0 && sNeg === 0 && iNeg === 0) return null; // 주어진 식 그대로
      const sName = sSrc === 0 ? "a" : "b";
      const iName = sSrc === 0 ? "b" : "a";
      const sVal = sSrc === 0 ? a : b;
      const iVal = sSrc === 0 ? b : a;
      const m2 = sNeg === 1 ? -sVal : sVal;
      const n2 = iNeg === 1 ? -iVal : iVal;
      const form = `${sNeg === 1 ? "-" : ""}${sName}x${iNeg === 1 ? "-" : "+"}${iName}`;
      const sTex = `${sNeg === 1 ? "-" : ""}${sName}`;
      const iTex = `${iNeg === 1 ? "-" : ""}${iName}`;
      const quad = quadNotPassed(m2, n2);
      return {
        content: `오른쪽 그림은 일차함수 $y=ax+b$의 그래프이다. 이때 일차함수 $y=${form}$의 그래프는 제 몇 사분면을 지나지 않는지 구하시오.`,
        answer: `제$${quad}$사분면`,
        solution:
          `그래프가 오른쪽 ${a > 0 ? "위" : "아래"}로 향하므로 $a${a > 0 ? ">" : "<"}0$이고, $y$절편이 ${b > 0 ? "양수" : "음수"}이므로 $b${b > 0 ? ">" : "<"}0$이다.\n` +
          `따라서 $y=${form}$의 기울기 $${sTex}$는 ${m2 > 0 ? "양수" : "음수"}이고 $y$절편 $${iTex}$는 ${n2 > 0 ? "양수" : "음수"}이므로, 그래프는 오른쪽 ${m2 > 0 ? "위" : "아래"}로 향하고 $y$축과 ${n2 > 0 ? "양" : "음"}의 부분에서 만난다.\n` +
          `그러므로 제$${quad}$사분면을 지나지 않는다.`,
        facts: { a, b, sSrc, sNeg, iNeg, m2, n2, quad },
        figureSpec: {
          version: "elem-1",
          kind: "linearGraph",
          lines: [{ slope: a, yIntercept: b }],
          xRange: [-4, 4],
          yRange: [-5, 5],
        },
      };
    }),
  ),

  /**
   * ⑵04 두 그래프의 일치 — 기울기뿐 아니라 $y$절편까지 같아야 한다.
   * ⑵03(평행)은 절편이 **다를** 것을 요구한다 — 그 차이가 이 유형의 요지다.
   */
  def(MINOR_G2, "04", "두 일차함수의 그래프의 일치", SEC.성질, "응용", (rng) =>
    attempt(150, () => {
      const a = nonZero(rng, -4, 4);
      const mult = intBetween(rng, 2, 3);
      const off = nonZero(rng, -4, 4);
      const coef2 = mult * a - off;
      if (coef2 === 0 || Math.abs(coef2) > 6) return null;
      const b = nonZero(rng, -6, 6);
      const ans = a + b;
      return {
        content:
          `두 일차함수 $y=(${mult}a${signed(-off)})x${signed(b)}$와 $y=${mono(coef2)}+b$의 그래프가 일치할 때, ` +
          `상수 $a$, $b$에 대하여 $a+b$의 값을 구하시오.`,
        answer: `$${ans}$`,
        solution:
          `두 그래프가 일치하면 기울기와 $y$절편이 각각 같다.\n` +
          `기울기에서 $${mult}a${signed(-off)}=${coef2}$이므로 $${mult}a=${coef2 + off}$, 즉 $a=${a}$이다.\n` +
          `$y$절편에서 $b=${b}$이다. 따라서 $a+b=${ans}$이다.`,
        facts: { a, b, mult, off, coef2, ans },
      };
    }),
  ),

  /**
   * ⑵08 절편 둘로 식 구하기 — $x$절편·$y$절편을 **뒤집어 쓰는** 실수가 잦다.
   * 시험이 둘을 따로 계산해 맞댄다(`m*x0+c===0` 과 `t===m*s+c` 를 함께 본다).
   */
  def(
    MINOR_G2,
    "08",
    "일차함수의 식 구하기 절편절편이 주어질 때",
    SEC.식구하기,
    "응용",
    (rng) =>
      attempt(200, () => {
        const m = nonZero(rng, -4, 4);
        const x0 = nonZero(rng, -6, 6);
        const c = -m * x0;
        if (c === 0 || Math.abs(c) > 15) return null;
        const s = attempt(60, () => {
          const v = nonZero(rng, -5, 5);
          return v === x0 ? null : v;
        });
        const t = m * s + c;
        if (t === 0 || Math.abs(t) > 30) return null;
        return {
          content: `$x$절편이 $${x0}$이고 $y$절편이 $${c}$인 일차함수의 그래프가 점 $(${s}, t)$를 지날 때, $t$의 값을 구하시오.`,
          answer: `$${t}$`,
          solution:
            `$y$절편이 $${c}$이므로 구하는 식을 $y=mx${signed(c)}$라 하자.\n` +
            `$x$절편이 $${x0}$이므로 $x=${x0}$, $y=0$을 대입하면 $${monoVar(x0, "m")}${signed(c)}=0$에서 $m=${m}$이고, 일차함수의 식은 $y=${linear(m, c)}$이다.\n` +
            `$x=${s}$를 대입하면 $t=${m * s}${signed(c)}=${t}$이다.`,
          facts: { m, x0, c, s, t },
        };
      }),
  ),

  /**
   * ⑵13 도형에서의 활용 — 점 $\mathrm{P}$ 가 변 위를 움직일 때 삼각형의 넓이.
   * 넓이 계수 $\dfrac{1}{2}vh$ 가 정수가 되게 잡아 지면에 분수가 안 남게 한다.
   */
  def(
    MINOR_G2,
    "13",
    "일차함수의 활용 도형에서의 문제",
    SEC.활용기타,
    "응용",
    (rng) =>
      attempt(200, () => {
        const h = intBetween(rng, 4, 10);
        const w = intBetween(rng, 6, 16);
        const v = pick(rng, [1, 2, 3] as const);
        if ((h * v) % 2 !== 0) return null;
        const coef = (h * v) / 2;
        const t = intBetween(rng, 2, 8);
        if (v * t > w) return null;
        const S = coef * t;
        return {
          content:
            `직사각형 $\\mathrm{ABCD}$에서 $\\overline{\\mathrm{AB}}=${h}\\,\\mathrm{cm}$, $\\overline{\\mathrm{BC}}=${w}\\,\\mathrm{cm}$이다. ` +
            `점 $\\mathrm{P}$는 점 $\\mathrm{B}$를 출발하여 변 $\\mathrm{BC}$를 따라 점 $\\mathrm{C}$까지 매초 $${v}\\,\\mathrm{cm}$의 속력으로 움직인다. ` +
            `출발한 지 $x$초 후의 삼각형 $\\mathrm{ABP}$의 넓이를 $y\\,\\mathrm{cm^2}$라 할 때, 삼각형 $\\mathrm{ABP}$의 넓이가 $${S}\\,\\mathrm{cm^2}$가 되는 것은 출발한 지 몇 초 후인지 구하시오.`,
          answer: `$${t}$초 후`,
          solution:
            `$x$초 후 $\\overline{\\mathrm{BP}}=${monoVar(v, "x")}\\,\\mathrm{cm}$이므로 $y=\\dfrac{1}{2}\\times ${monoVar(v, "x")}\\times ${h}=${monoVar(coef, "x")}$이다.\n` +
            `$y=${S}$일 때 $${monoVar(coef, "x")}=${S}$이므로 $x=${t}$이다.\n` +
            `이때 $\\overline{\\mathrm{BP}}=${v * t}\\,\\mathrm{cm}$로 $\\overline{\\mathrm{BC}}$를 넘지 않으므로 답은 $${t}$초 후이다.`,
          facts: { h, w, v, coef, t, S },
        };
      }),
  ),

  /**
   * ⑵14 그래프가 주어진 활용 — 온도를 가로축에 둔다.
   * `linearGraph` 는 **원점을 품는 범위**만 받으므로 가로축이 음수까지 간다.
   * 시간·길이처럼 음수가 뜻 없는 양을 가로축에 두면 지면이 거짓말이 된다 —
   * 온도는 음수가 그대로 뜻이 있어 그 제약과 어긋나지 않는다.
   */
  def(
    MINOR_G2,
    "14",
    "일차함수의 활용 그래프가 주어진 경우의 문제",
    SEC.활용기타,
    "응용",
    (rng) =>
      attempt(200, () => {
        const m = pick(rng, [1, 2] as const);
        const c = intBetween(rng, 3, 5);
        const p = pick(rng, [2, 3] as const);
        const top = m * p + c;
        if (top > 9) return null;
        const t = intBetween(rng, 6, 12);
        const ans = m * t + c;
        const xlo = -2;
        const xhi = p + 2;
        const ylo = -2;
        const yhi = top + 1;
        if (xhi - xlo < 4 || xhi - xlo > 12) return null;
        if (yhi - ylo < 4 || yhi - ylo > 12) return null;
        return {
          content:
            `오른쪽 그림은 어떤 기체의 온도 $x\\degree\\mathrm{C}$와 부피 $y\\,\\mathrm{cm^3}$ 사이의 관계를 나타낸 그래프이다. ` +
            `온도가 $${t}\\degree\\mathrm{C}$일 때, 이 기체의 부피를 구하시오.`,
          answer: `$${ans}\\,\\mathrm{cm^3}$`,
          solution:
            `그래프가 두 점 $(0, ${c})$, $(${p}, ${top})$을 지나므로 기울기는 $\\dfrac{${top - c}}{${p}}=${m}$이고 $y$절편은 $${c}$이다.\n` +
            `따라서 $y=${linear(m, c)}$이다.\n` +
            `$x=${t}$를 대입하면 $y=${m * t}${signed(c)}=${ans}$이므로 부피는 $${ans}\\,\\mathrm{cm^3}$이다.`,
          facts: { m, c, p, top, t, ans },
          figureSpec: {
            version: "elem-1",
            kind: "linearGraph",
            lines: [{ slope: m, yIntercept: c }],
            xRange: [xlo, xhi],
            yRange: [ylo, yhi],
            marks: [
              [0, c],
              [p, top],
            ],
          },
        };
      }),
  ),

  /**
   * ⑵15 $x$축과 만나는 두 점 사이의 거리 — 답이 **둘** 나오는 갈래다.
   * 「단, $a>0$」로 하나만 남게 하고, 버린 쪽을 `facts.other` 에 실어
   * 시험이 「정말 하나뿐인가」를 확인하게 한다.
   */
  def(
    MINOR_G2,
    "15",
    "두 일차함수의 그래프가 축과 만나는 두 점 사이의 거리가 주어진 경우",
    SEC.절편,
    "심화",
    (rng) =>
      attempt(300, () => {
        const m1 = nonZero(rng, -4, 4);
        const m2 = nonZero(rng, -4, 4);
        const x2 = nonZero(rng, -5, 5);
        const b2 = -m2 * x2;
        if (b2 === 0 || Math.abs(b2) > 20) return null;
        const d = intBetween(rng, 2, 8);
        const aPlus = -m1 * (x2 + d);
        const aMinus = -m1 * (x2 - d);
        const positives = [aPlus, aMinus].filter((v) => v > 0);
        if (positives.length !== 1) return null;
        const a = positives[0]!;
        const x1 = a === aPlus ? x2 + d : x2 - d;
        const other = a === aPlus ? aMinus : aPlus;
        if (Math.abs(a) > 32) return null;
        return {
          content:
            `두 일차함수 $y=${mono(m1)}+a$와 $y=${linear(m2, b2)}$의 그래프가 $x$축과 만나는 두 점 사이의 거리가 $${d}$일 때, ` +
            `상수 $a$의 값을 구하시오. (단, $a>0$)`,
          answer: `$${a}$`,
          solution:
            `$y=${linear(m2, b2)}$의 그래프는 $x$축과 점 $(${x2}, 0)$에서 만난다.\n` +
            `$y=${mono(m1)}+a$의 그래프가 $x$축과 만나는 점의 $x$좌표를 $k$라 하면 $${monoVar(m1, "k")}+a=0$이고, 두 점 사이의 거리가 $${d}$이므로 $k=${x2 + d}$ 또는 $k=${x2 - d}$이다.\n` +
            `이때 $a=${aPlus}$ 또는 $a=${aMinus}$인데 $a>0$이므로 $a=${a}$이다.`,
          facts: { m1, m2, b2, x2, d, a, x1, other },
        };
      }),
  ),

  /**
   * ⑵16 여러 가지 활용 — 저금액. ⑵11(물의 양)·⑵12(속력)과 소재가 겹치지 않게 골랐다.
   */
  def(
    MINOR_G2,
    "16",
    "일차함수의 활용 여러 가지 활용 문제",
    SEC.활용기타,
    "응용",
    (rng) =>
      attempt(120, () => {
        const c = intBetween(rng, 2, 6) * 10000;
        const r = pick(rng, [3000, 5000, 8000, 10000] as const);
        const t = intBetween(rng, 5, 15);
        const target = c + r * t;
        if (target > 200000) return null;
        return {
          content:
            `현재 저금통에 $${c}$원이 들어 있고, 이번 달부터 매달 $${r}$원씩 저금하려고 한다. ` +
            `저금하기 시작한 지 $x$개월 후의 저금액을 $y$원이라 할 때, 저금액이 $${target}$원이 되는 것은 저금하기 시작한 지 몇 개월 후인지 구하시오.`,
          answer: `$${t}$개월 후`,
          solution:
            `처음 저금액이 $${c}$원이고 매달 $${r}$원씩 늘어나므로 $y=${c}+${r}x$이다.\n` +
            `$y=${target}$일 때 $${c}+${r}x=${target}$이므로 $${r}x=${target - c}$이다.\n` +
            `따라서 $x=${t}$이므로 $${t}$개월 후이다.`,
          facts: { c, r, t, target },
        };
      }),
  ),

  // ── 일차함수와 일차방정식의 관계 — 남은 01~06 · 08~15 ────
  /**
   * 관계01 — 일차방정식 $ax+by+c=0$ 과 일차함수는 **같은 것**이라는 이 중단원의 요지.
   * $b\ne0$ 이 아니면 $x=k$ 꼴 세로선이라 일차함수가 아니다 — `nonZero` 로 잠근다.
   */
  def(
    MINOR_REL,
    "01",
    "일차함수와 일차방정식의 관계",
    SEC.일차방정식,
    "기본",
    (rng) =>
      attempt(200, () => {
        const m = nonZero(rng, -4, 4);
        const n = nonZero(rng, -6, 6);
        const k = nonZero(rng, -3, 3);
        const a = -m * k;
        const b = k;
        const c = -n * k;
        if (Math.abs(a) > 12 || Math.abs(c) > 18) return null;
        const ans = m + n;
        return {
          content: `일차방정식 $${eqTex(a, b, c)}$의 그래프의 기울기를 $m$, $y$절편을 $n$이라 할 때, $m+n$의 값을 구하시오.`,
          answer: `$${ans}$`,
          solution:
            `$${eqTex(a, b, c)}$을 $y$에 대하여 풀면 $y=${linear(m, n)}$이다.\n` +
            `따라서 $m=${m}$, $n=${n}$이므로 $m+n=${ans}$이다.`,
          facts: { a, b, c, m, n, ans },
        };
      }),
  ),

  /** 관계02 — 그래프 위의 점. 대입 한 번으로 상수항이 정해진다. */
  def(
    MINOR_REL,
    "02",
    "일차방정식의 그래프 위의 점",
    SEC.일차방정식,
    "기본",
    (rng) =>
      attempt(200, () => {
        const a = nonZero(rng, -5, 5);
        const b = nonZero(rng, -5, 5);
        const p = nonZero(rng, -5, 5);
        const q = nonZero(rng, -5, 5);
        const c = -(a * p + b * q);
        if (c === 0 || Math.abs(c) > 40) return null;
        return {
          content: `일차방정식 $${abTex(a, b)}+c=0$의 그래프가 점 $(${p}, ${q})$를 지날 때, 상수 $c$의 값을 구하시오.`,
          answer: `$${c}$`,
          solution:
            `$x=${p}$, $y=${q}$를 대입하면 $${a * p}${signed(b * q)}+c=0$이다.\n` +
            `즉 $${a * p + b * q}+c=0$이므로 $c=${c}$이다.`,
          facts: { a, b, p, q, c },
        };
      }),
  ),

  /**
   * 관계03 — 계수의 부호만 주고 사분면을 묻는다. $y$ 에 대하여 풀면
   * 기울기 $-\dfrac{a}{b}$, $y$절편 $-\dfrac{c}{b}$ 의 부호가 답을 정한다.
   */
  def(
    MINOR_REL,
    "03",
    // ⚠️ 색인 정본에 **백스페이스(U+0008)** 가 한 자 끼어 있다 — PDF 목차에서 수식
    //    자리(「$ax+by+c=0$」)가 빠지며 남은 자국이다. 눈에 안 보이지만
    //    middleTypeCoverage.test.ts 가 글자 그대로 대조하므로 지우면 빨개진다.
    "일차방정식 의 그래프와\u0008 의 부호",
    SEC.일차방정식,
    "심화",
    (rng) =>
      attempt(60, () => {
        const sa = pick(rng, [1, -1] as const);
        const sb = pick(rng, [1, -1] as const);
        const sc = pick(rng, [1, -1] as const);
        const m = -sa / sb;
        const n = -sc / sb;
        const quad = quadNotPassed(m, n);
        const gt = (s: number) => (s > 0 ? ">" : "<");
        return {
          content: `$a${gt(sa)}0$, $b${gt(sb)}0$, $c${gt(sc)}0$일 때, 일차방정식 $ax+by+c=0$의 그래프는 제 몇 사분면을 지나지 않는지 구하시오.`,
          answer: `제$${quad}$사분면`,
          solution:
            `$ax+by+c=0$을 $y$에 대하여 풀면 $y=-\\dfrac{a}{b}x-\\dfrac{c}{b}$이다.\n` +
            `$-\\dfrac{a}{b}${gt(m)}0$이므로 그래프는 오른쪽 ${m > 0 ? "위" : "아래"}로 향하고, $-\\dfrac{c}{b}${gt(n)}0$이므로 $y$절편은 ${n > 0 ? "양수" : "음수"}이다.\n` +
            `따라서 제$${quad}$사분면을 지나지 않는다.`,
          facts: { sa, sb, sc, quad },
        };
      }),
  ),

  /**
   * 관계04 — 두 점을 지나는 직선을 $ax+by+c=0$ 꼴로. 일반형은 상수배만큼
   * 자유롭기 때문에 $x$ 의 계수를 못 박아 $b$, $c$ 가 하나로 정해지게 했다.
   */
  def(MINOR_REL, "04", "직선의 방정식 구하기", SEC.일차방정식, "응용", (rng) =>
    attempt(250, () => {
      const m = nonZero(rng, -4, 4);
      const n = nonZero(rng, -6, 6);
      const lam = pick(rng, [1, -1, 2, -2] as const);
      const a = lam * m;
      const b = -lam;
      const c = lam * n;
      if (Math.abs(a) > 12 || Math.abs(c) > 20) return null;
      const x1 = intBetween(rng, -4, 1);
      const dx = intBetween(rng, 2, 5);
      const x2 = x1 + dx;
      const y1 = m * x1 + n;
      const y2 = m * x2 + n;
      if (Math.abs(y1) > 20 || Math.abs(y2) > 20) return null;
      const ans = b + c;
      return {
        content:
          `두 점 $(${x1}, ${y1})$, $(${x2}, ${y2})$를 지나는 직선의 방정식이 $${mono(a)}+by+c=0$일 때, ` +
          `상수 $b$, $c$에 대하여 $b+c$의 값을 구하시오.`,
        answer: `$${ans}$`,
        solution:
          `기울기는 $\\dfrac{${y2 - y1}}{${dx}}=${m}$이고, $y=${mono(m)}+n$에 $x=${x1}$, $y=${y1}$을 대입하면 $n=${n}$이다.\n` +
          `즉 직선의 방정식은 $y=${linear(m, n)}$이고, $x$의 계수가 $${a}$가 되도록 정리하면 $${eqTex(a, b, c)}$이다.\n` +
          `따라서 $b=${b}$, $c=${c}$이므로 $b+c=${ans}$이다.`,
        facts: { x1, y1, x2, y2, m, n, lam, a, b, c, ans },
      };
    }),
  ),

  /**
   * 관계05 — $x=k$ 는 세로선이라 **함수가 아니다**. $y=k$ 는 가로선이다.
   * 둘을 뒤집어 쓰는 실수가 이 유형의 표적이라 시험이 $s$·$t$ 를 따로 맞댄다.
   */
  def(MINOR_REL, "05", "방정식 의 그래프", SEC.일차방정식, "기본", (rng) =>
    attempt(80, () => {
      const p = nonZero(rng, -6, 6);
      const q = nonZero(rng, -6, 6);
      const s = q;
      const t = p;
      const ans = s + t;
      return {
        content:
          `점 $(${p}, ${q})$를 지나고 $x$축에 평행한 직선의 방정식을 $y=s$, ` +
          `$y$축에 평행한 직선의 방정식을 $x=t$라 할 때, $s+t$의 값을 구하시오.`,
        answer: `$${ans}$`,
        solution:
          `$x$축에 평행한 직선 위의 점은 $y$좌표가 모두 같으므로 그 방정식은 $y=${q}$, 즉 $s=${q}$이다.\n` +
          `$y$축에 평행한 직선 위의 점은 $x$좌표가 모두 같으므로 그 방정식은 $x=${p}$, 즉 $t=${p}$이다.\n` +
          `따라서 $s+t=${ans}$이다.`,
        facts: { p, q, s, t, ans },
      };
    }),
  ),

  /** 관계06 — 좌표축에 평행한 네 직선이 만드는 직사각형. */
  def(
    MINOR_REL,
    "06",
    "좌표축에 평행한 네 직선으로 둘러싸인 도형의 넓이",
    SEC.일차방정식,
    "응용",
    (rng) =>
      attempt(80, () => {
        const x1 = intBetween(rng, -6, 0);
        const w = intBetween(rng, 2, 8);
        const x2 = x1 + w;
        const y1 = intBetween(rng, -6, 0);
        const h = intBetween(rng, 2, 8);
        const y2 = y1 + h;
        const area = w * h;
        return {
          content: `네 직선 $x=${x1}$, $x=${x2}$, $y=${y1}$, $y=${y2}$로 둘러싸인 도형의 넓이를 구하시오.`,
          answer: `$${area}$`,
          solution:
            `$x=${x1}$과 $x=${x2}$는 $y$축에 평행한 두 직선이고 그 사이의 거리는 $${w}$이다.\n` +
            `$y=${y1}$과 $y=${y2}$는 $x$축에 평행한 두 직선이고 그 사이의 거리는 $${h}$이다.\n` +
            `둘러싸인 도형은 직사각형이므로 넓이는 $${w}\\times ${h}=${area}$이다.`,
          facts: { x1, x2, y1, y2, w, h, area },
        };
      }),
  ),

  /** 관계08 — 교점을 두 식에 **각각** 대입해 미지수 둘을 따로 구한다. */
  def(
    MINOR_REL,
    "08",
    "두 일차방정식의 그래프의 교점의 좌표를 이용하여 미지수의 값 구하기",
    SEC.연립해,
    "응용",
    (rng) =>
      attempt(250, () => {
        const p = nonZero(rng, -4, 4);
        const q = nonZero(rng, -4, 4);
        const a1 = nonZero(rng, -4, 4);
        const b1 = nonZero(rng, -4, 4);
        const a2 = nonZero(rng, -4, 4);
        const b = nonZero(rng, -4, 4);
        if (a1 * b - a2 * b1 === 0) return null;
        const c = a1 * p + b1 * q;
        const c2 = a2 * p + b * q;
        if (c === 0 || c2 === 0) return null;
        if (Math.abs(c) > 30 || Math.abs(c2) > 30) return null;
        const ans = b + c;
        return {
          content:
            `두 일차방정식 $${abTex(a1, b1)}=c$와 $${mono(a2)}+by=${c2}$의 그래프의 교점의 좌표가 $(${p}, ${q})$일 때, ` +
            `상수 $b$, $c$에 대하여 $b+c$의 값을 구하시오.`,
          answer: `$${ans}$`,
          solution:
            `교점의 좌표를 두 식에 각각 대입한다.\n` +
            `$${abTex(a1, b1)}=c$에서 $${a1 * p}${signed(b1 * q)}=c$이므로 $c=${c}$이다.\n` +
            `$${mono(a2)}+by=${c2}$에서 $${a2 * p}${contTerm(q, "b")}=${c2}$이므로 $${monoVar(q, "b")}=${c2 - a2 * p}$, 즉 $b=${b}$이다.\n` +
            `따라서 $b+c=${ans}$이다.`,
          facts: { a1, b1, a2, b, c2, p, q, c, ans },
        };
      }),
  ),

  /** 관계09 — 교점을 지나는 새 직선. 교점을 먼저 정수로 잡고 두 식을 만든다. */
  def(
    MINOR_REL,
    "09",
    "두 일차방정식의 그래프의 교점을 지나는 직선의 방정식",
    SEC.연립해,
    "심화",
    (rng) =>
      attempt(250, () => {
        const p = nonZero(rng, -4, 4);
        const q = nonZero(rng, -4, 4);
        const a1 = nonZero(rng, -4, 4);
        const b1 = nonZero(rng, -4, 4);
        const a2 = nonZero(rng, -4, 4);
        const b2 = nonZero(rng, -4, 4);
        if (a1 * b2 - a2 * b1 === 0) return null;
        const c1 = a1 * p + b1 * q;
        const c2 = a2 * p + b2 * q;
        if (Math.abs(c1) > 30 || Math.abs(c2) > 30) return null;
        const m = nonZero(rng, -4, 4);
        const n = q - m * p;
        if (n === 0 || Math.abs(n) > 25) return null;
        return {
          content:
            `두 일차방정식 $${abTex(a1, b1)}=${c1}$, $${abTex(a2, b2)}=${c2}$의 그래프의 교점을 지나고 ` +
            `기울기가 $${m}$인 직선의 $y$절편을 구하시오.`,
          answer: `$${n}$`,
          solution:
            `연립방정식을 풀면 두 그래프의 교점의 좌표는 $(${p}, ${q})$이다.\n` +
            `구하는 직선을 $y=${mono(m)}+n$이라 하고 $x=${p}$, $y=${q}$를 대입하면 $${q}=${m * p}+n$이다.\n` +
            `따라서 $n=${n}$이므로 $y$절편은 $${n}$이다.`,
          facts: { a1, b1, c1, a2, b2, c2, p, q, m, n },
        };
      }),
  ),

  /** 관계10 — 세 직선이 한 점에서 만난다 = 앞의 둘의 교점을 셋째도 지난다. */
  def(
    MINOR_REL,
    "10",
    "세 직선이 한 점에서 만날 때",
    SEC.연립해,
    "심화",
    (rng) =>
      attempt(250, () => {
        const p = nonZero(rng, -4, 4);
        const q = nonZero(rng, -4, 4);
        const m1 = nonZero(rng, -4, 4);
        const m2 = nonZero(rng, -4, 4);
        const m3 = nonZero(rng, -4, 4);
        if (m1 === m2 || m2 === m3 || m1 === m3) return null;
        const n1 = q - m1 * p;
        const n2 = q - m2 * p;
        const a = q - m3 * p;
        if (n1 === 0 || n2 === 0 || a === 0) return null;
        if (Math.abs(n1) > 20 || Math.abs(n2) > 20 || Math.abs(a) > 25)
          return null;
        return {
          content: `세 직선 $y=${linear(m1, n1)}$, $y=${linear(m2, n2)}$, $y=${mono(m3)}+a$가 한 점에서 만날 때, 상수 $a$의 값을 구하시오.`,
          answer: `$${a}$`,
          solution:
            `앞의 두 직선의 교점을 구하면 $${linear(m1, n1)}=${linear(m2, n2)}$에서 $x=${p}$이고, 이때 $y=${q}$이다.\n` +
            `세 직선이 한 점에서 만나므로 $y=${mono(m3)}+a$도 점 $(${p}, ${q})$를 지난다.\n` +
            `$${q}=${m3 * p}+a$이므로 $a=${a}$이다.`,
          facts: { m1, n1, m2, n2, m3, p, q, a },
        };
      }),
  ),

  /**
   * 관계11 — 해의 개수와 교점의 개수. 평행(해 없음)과 일치(무수히 많음)를
   * 한 유형에서 번갈아 낸다. `facts.many` 가 어느 갈래인지 표시한다.
   */
  def(
    MINOR_REL,
    "11",
    "연립방정식의 해의 개수와 교점의 개수",
    SEC.연립해,
    "응용",
    (rng) =>
      attempt(250, () => {
        const a2 = nonZero(rng, -4, 4);
        const b2 = nonZero(rng, -4, 4);
        const c2 = nonZero(rng, -9, 9);
        const lam = pick(rng, [2, -2, 3, -3] as const);
        const a = lam * a2;
        const b1 = lam * b2;
        const many = intBetween(rng, 0, 1);
        const gap = nonZero(rng, -4, 4);
        const c1 = many === 1 ? lam * c2 : lam * c2 + gap;
        if (Math.abs(a) > 12 || Math.abs(b1) > 12 || Math.abs(c1) > 32)
          return null;
        if (c1 === 0) return null;
        const tail =
          many === 1
            ? `이때 $${c1}=${paren(c2)}\\times ${paren(lam)}$이므로 두 그래프는 실제로 일치한다.`
            : `이때 $${c1}\\ne${lam * c2}=${paren(c2)}\\times ${paren(lam)}$이므로 두 그래프는 실제로 평행하다.`;
        return {
          content:
            `연립방정식 $\\begin{cases}ax${contTerm(b1, "y")}=${c1}\\\\${abTex(a2, b2)}=${c2}\\end{cases}$의 해가 ` +
            `${many === 1 ? "무수히 많을" : "없을"} 때, 상수 $a$의 값을 구하시오.`,
          answer: `$${a}$`,
          solution:
            `${
              many === 1
                ? "두 일차방정식의 그래프가 일치하면 해가 무수히 많고, 그러려면 $x$의 계수·$y$의 계수·상수항의 비가 모두 같아야 한다."
                : "두 일차방정식의 그래프가 평행하면 해가 없고, 그러려면 $x$의 계수와 $y$의 계수의 비는 같고 상수항의 비만 달라야 한다."
            }\n` +
            `$y$의 계수에서 $${b1}=${paren(b2)}\\times ${paren(lam)}$이므로 두 식의 비는 $${lam}$이다.\n` +
            `따라서 $a=${paren(a2)}\\times ${paren(lam)}=${a}$이다. ${tail}`,
          facts: { a, b1, c1, a2, b2, c2, lam, many },
        };
      }),
  ),

  /**
   * 관계12 — 두 직선과 $y$축이 만드는 삼각형. ⑴13 은 $x$축과 «일차함수» 꼴,
   * 여기는 $y$축과 «일차방정식» 꼴이다. 교점을 먼저 정수로 잡는다.
   */
  def(
    MINOR_REL,
    "12",
    "직선으로 둘러싸인 도형의 넓이",
    SEC.연립해,
    "심화",
    (rng) =>
      attempt(300, () => {
        const p = nonZero(rng, -3, 3);
        const q = intBetween(rng, -3, 3);
        const m1 = nonZero(rng, -3, 3);
        const m2 = nonZero(rng, -3, 3);
        if (m1 === m2) return null;
        const b1 = q - m1 * p;
        const b2 = q - m2 * p;
        if (b1 === 0 || b2 === 0) return null;
        if (Math.abs(b1) > 5 || Math.abs(b2) > 5) return null;
        const twice = Math.abs(b1 - b2) * Math.abs(p);
        if (twice % 2 !== 0) return null;
        const area = twice / 2;
        const xlo = Math.min(-1, p) - 1;
        const xhi = Math.max(1, p) + 1;
        const ylo = Math.min(-1, b1, b2, q) - 1;
        const yhi = Math.max(1, b1, b2, q) + 1;
        if (xhi - xlo < 4 || xhi - xlo > 12) return null;
        if (yhi - ylo < 4 || yhi - ylo > 12) return null;
        return {
          content: `오른쪽 그림과 같이 두 직선 $${lineEqTex(m1, b1)}$, $${lineEqTex(m2, b2)}$와 $y$축으로 둘러싸인 도형의 넓이를 구하시오.`,
          answer: `$${area}$`,
          solution:
            `두 직선을 $y$에 대하여 풀면 $y=${linear(m1, b1)}$, $y=${linear(m2, b2)}$이다.\n` +
            `두 직선이 $y$축과 만나는 점은 $(0, ${b1})$, $(0, ${b2})$이고, 두 직선의 교점은 $(${p}, ${q})$이다.\n` +
            `밑변의 길이가 $${Math.abs(b1 - b2)}$, 높이가 $${Math.abs(p)}$인 삼각형이므로 넓이는 $\\dfrac{1}{2}\\times ${Math.abs(b1 - b2)}\\times ${Math.abs(p)}=${area}$이다.`,
          facts: { m1, b1, m2, b2, p, q, area },
          figureSpec: {
            version: "elem-1",
            kind: "linearGraph",
            lines: [
              { slope: m1, yIntercept: b1 },
              { slope: m2, yIntercept: b2 },
            ],
            xRange: [xlo, xhi],
            yRange: [ylo, yhi],
            marks: [
              [0, b1],
              [0, b2],
              [p, q],
            ],
          },
        };
      }),
  ),

  /** 관계13 — 직선 위에서 $x$좌표와 $y$좌표가 같은 점. $a+b\ne0$ 이어야 정해진다. */
  def(MINOR_REL, "13", "직선의 방정식의 활용", SEC.일차방정식, "응용", (rng) =>
    attempt(250, () => {
      const k = nonZero(rng, -6, 6);
      const a = nonZero(rng, -5, 5);
      const b = nonZero(rng, -5, 5);
      if (a + b === 0) return null;
      const c = -(a + b) * k;
      if (c === 0 || Math.abs(c) > 40) return null;
      return {
        content: `일차방정식 $${eqTex(a, b, c)}$의 그래프 위의 점 중에서 $x$좌표와 $y$좌표가 같은 점의 $x$좌표를 구하시오.`,
        answer: `$${k}$`,
        solution:
          `구하는 점을 $(k, k)$라 하고 $x=k$, $y=k$를 대입하면 $${monoVar(a, "k")}${contTerm(b, "k")}${signed(c)}=0$이다.\n` +
          `즉 $${monoVar(a + b, "k")}=${-c}$이므로 $k=${k}$이다.\n` +
          `따라서 구하는 $x$좌표는 $${k}$이다.`,
        facts: { a, b, c, k },
      };
    }),
  ),

  /**
   * 관계14 — 직선 $y=ax$ 가 선분과 만날 조건. 두 끝점의 $\dfrac{y}{x}$ 가
   * 기울기의 경계다. 두 값이 정수가 되게 끝점을 잡는다.
   */
  def(
    MINOR_REL,
    "14",
    "직선과 선분이 만날 조건",
    SEC.일차방정식,
    "심화",
    (rng) =>
      attempt(200, () => {
        const xa = intBetween(rng, 1, 5);
        const xb = intBetween(rng, 1, 5);
        const ka = intBetween(rng, 1, 4);
        const kb = intBetween(rng, 1, 4);
        if (ka === kb) return null;
        const ya = ka * xa;
        const yb = kb * xb;
        if (ya > 14 || yb > 14) return null;
        const aMax = Math.max(ka, kb);
        const aMin = Math.min(ka, kb);
        return {
          content:
            `두 점 $\\mathrm{A}(${xa}, ${ya})$, $\\mathrm{B}(${xb}, ${yb})$를 이은 선분 $\\mathrm{AB}$와 직선 $y=ax$가 만날 때, ` +
            `상수 $a$의 최댓값을 구하시오.`,
          answer: `$${aMax}$`,
          solution:
            `직선 $y=ax$가 점 $\\mathrm{A}$를 지날 때 $${ya}=${monoVar(xa, "a")}$에서 $a=${ka}$이다.\n` +
            `점 $\\mathrm{B}$를 지날 때 $${yb}=${monoVar(xb, "a")}$에서 $a=${kb}$이다.\n` +
            `직선이 선분 $\\mathrm{AB}$와 만나려면 $${aMin}\\le a\\le${aMax}$이어야 하므로 $a$의 최댓값은 $${aMax}$이다.`,
          facts: { xa, ya, xb, yb, ka, kb, aMax, aMin },
        };
      }),
  ),

  /**
   * 관계15 — 직사각형의 넓이를 이등분하는 직선은 **두 대각선의 교점**을 지난다.
   * 중심을 먼저 잡고 기울기를 정수로 떨어뜨린다.
   */
  def(
    MINOR_REL,
    "15",
    "도형의 넓이를 이등분하는 직선",
    SEC.일차방정식,
    "심화",
    (rng) =>
      attempt(200, () => {
        const cx = attempt(60, () => {
          const v = nonZero(rng, -4, 4);
          return Math.abs(v) < 2 ? null : v;
        });
        const m = nonZero(rng, -3, 3);
        const cy = m * cx;
        if (Math.abs(cy) > 9) return null;
        const w = intBetween(rng, 1, 4);
        const h = intBetween(rng, 1, 4);
        const x1 = cx - w;
        const x2 = cx + w;
        const y1 = cy - h;
        const y2 = cy + h;
        return {
          content:
            `네 점 $\\mathrm{A}(${x1}, ${y1})$, $\\mathrm{B}(${x2}, ${y1})$, $\\mathrm{C}(${x2}, ${y2})$, $\\mathrm{D}(${x1}, ${y2})$를 ` +
            `꼭짓점으로 하는 직사각형 $\\mathrm{ABCD}$의 넓이를 이등분하고 원점을 지나는 직선의 기울기를 구하시오.`,
          answer: `$${m}$`,
          solution:
            `직사각형의 넓이를 이등분하는 직선은 두 대각선의 교점을 지난다.\n` +
            `교점의 $x$좌표는 $${x1}$과 $${x2}$의 한가운데인 $${cx}$, $y$좌표는 $${y1}$과 $${y2}$의 한가운데인 $${cy}$이다.\n` +
            `구하는 직선을 $y=mx$라 하고 $x=${cx}$, $y=${cy}$를 대입하면 $${cy}=${monoVar(cx, "m")}$이므로 $m=${m}$이다.`,
          facts: { x1, y1, x2, y2, cx, cy, w, h, m },
        };
      }),
  ),
];
