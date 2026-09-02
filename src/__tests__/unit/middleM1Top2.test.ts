/**
 * 중1 **2차 확대 갈래**(`m1Top2.ts`) — `심화중`·`심화상` 넷을 지킨다 (D-116).
 *
 * ## 검산이 무엇을 보는가 — **지면만 본다**
 *
 * `VERIFY` 의 함수는 인자가 **`content` 하나**다. `facts` 도 `answer` 도 안 받는다.
 * 그래서 생성기의 산술을 옮겨 적을 수가 **구조적으로 없다** — 지면에 실제로 찍힌
 * 글자를 파싱해 **다른 길로** 답을 다시 낸다.
 *
 * | 유형 | 생성기가 간 길 | 여기가 가는 길 |
 * |---|---|---|
 * | `41U` | 주기를 $1$~$4$ 로 접어 곱한다(되풀이 성질) | **`BigInt` 로 $b^{e}$ 를 통째로 계산**해 $10$ 으로 나눈 나머지를 본다 — 주기라는 개념을 한 번도 안 쓴다 |
 * | `42U` | $p^{9}$·$p^{4}q$ **꼴로 만들어** 낸다 | $2$ 부터 상한까지 **모든 수의 약수를 세어** 열 개인 것을 고른다(무식한 길) |
 * | `43U` | 분자·분모를 $ab$ 로 접어 $(ps-q)/(rs+u)$ 를 계산한다 | $\frac1a+\frac1b=s$ 인 $(a,b)$ 를 **두 벌 실제로 대입**해 값을 낸다 — 접지 않는다 |
 * | `44U` | 공통분모 $L$ 로 통분한 **분자의 합이 $L$ 의 배수**인지 본다 | 지면의 **약분된 분수**에서 분모의 최소공배수를 새로 구해 유리수로 직접 더한다 |
 *
 * ## 🔴 등록 전에도 이 시험은 **제품과 같은 지면**을 본다
 *
 * `generate.ts` 등록은 리드 몫이라, 이 시험이 쓰일 때 `registeredTypes()` 가 아직 이
 * 넷을 모를 수 있다. 그렇다고 후처리를 여기 다시 적으면 규칙이 두 벌이 된다 —
 * 그래서 `build()` 가 제품의 후처리 **함수 자체**(`tidySolution`·`wrapDanClause`·
 * `resolveMiddleTier`·보기 규칙 셋)를 그대로 부르고, 등록되면 곧바로
 * `generateMiddleProblem` 으로 갈아탄다. 「등록 상태가 넷 다 같은가」와
 * 「후처리가 이 넷에 대해 항등인가」를 각각 시험이 따로 잰다 — 그래야 갈아타는
 * 순간 갈라지면 빨개진다.
 *
 * ## 눈금 — **이 자가 «아니오» 를 낼 수 있는가**
 *
 * 검산기를 **엔진을 거치지 않은 손으로 쓴 지면**에 먼저 대 본다 — 양성(답을 아는
 * 지면에서 그 답을 낸다)과 음성(모양이 어긋나거나 불변식을 어긴 지면은 **던진다**).
 * 손으로 쓴 지면에는 `facts` 가 없으므로, 검산기가 `facts.x` 를 되읽는 판이었다면
 * 이 눈금은 **통과할 수가 없다**(2026-08-21 「0 은 «깨끗»과 «못 셈»을 안 가른다」).
 *
 * ⚠️ 음성 표본 하나는 **정찰 브리프가 손으로 적은 `44U` 수치 예**다. 그 판은 살아남은
 *    네 조합이 다섯째 수를 **모두** 포함해 우리 ㉠ 불변식(`noCommonNumber`)에 걸린다 —
 *    「그럴듯한 지면」에 자가 실제로 «아니오» 를 내는 것을 여기서 보인다.
 */
import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";

import { bareNumbers } from "@/lib/elementary/rules";
import { createRng } from "@/lib/elementary/rng";
import { renderMathHtml } from "@/lib/math/renderMathHtml";
import { pointsAtFigure } from "@/lib/middle/figureReference";
import { generateMiddleProblem, registeredTypes } from "@/lib/middle/generate";
import {
  allNumbersUsed,
  allTriplesSum,
  integerTriples,
  lastDigitOfPower,
  M1_TOP_2,
  ninthPowers,
  noCommonNumber,
  tenDivisorBranches,
  tenDivisorNumbers,
  TRIPLES,
  unitDigitCycle,
  unitDigitOfProduct,
  valueFromReciprocalSum,
} from "@/lib/middle/m1Top2";
import { tidySolution } from "@/lib/middle/solutionText";
import type { MidProblem } from "@/lib/middle/types";
import { resolveMiddleTier } from "@/lib/middle/tier";
import { assertChooseAllAnswerCount } from "@/lib/problem/chooseAllRule";
import {
  assertChoiceCount,
  assertChoiceMarks,
} from "@/lib/problem/choiceCountRule";
import { wrapDanClause } from "@/lib/problemText";

import { extensionNumberReason } from "../helpers/rpmCatalog";
import { josaMismatches, pageSmells } from "../helpers/midPage";

const K41 = "1-1|소인수분해|41U";
const K42 = "1-1|소인수분해|42U";
const K43 = "1-1|문자의 사용과 식의 계산|43U";
const K44 = "1-1|정수와 유리수의 계산|44U";
const KEYS = [K41, K42, K43, K44] as const;

/** 유형마다 사람이 못 박은 갈래 — 조용히 바뀌면 빨개진다. */
const EXPECTED_TIER: Record<string, string> = {
  [K41]: "심화중",
  [K42]: "심화상",
  [K43]: "심화중",
  [K44]: "심화상",
};

const SEEDS = [20260902, 3, 11, 515151, 99991];
const VARIANTS = 4;

/** 값 검산용 — 씨앗 $55$ × 변형 $4$ = **$220$ 판** (브리프가 요구한 $200$ 이상). */
const BULK: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [];
  for (let s = 0; s < 55; s += 1) {
    for (let v = 0; v < VARIANTS; v += 1) out.push([1000003 + s * 7919, v]);
  }
  return out;
})();

// ── 제품과 같은 지면을 만드는 자리 (머리말 참조) ────────────────

const REGISTERED = new Set(registeredTypes().map((t) => t.key));
const ENTRY = new Map(M1_TOP_2.map((e) => [e.key, e]));

/** 제품 후처리 함수를 **그대로 불러** 지면을 짓는다 — 규칙을 옮겨 적지 않는다. */
function build(key: string, seed: number, variant = 0): MidProblem {
  if (REGISTERED.has(key)) return generateMiddleProblem(key, seed, variant);
  const entry = ENTRY.get(key);
  if (entry === undefined) throw new Error(`명부에 없는 키: ${key}`);
  const p: MidProblem = entry.handler(createRng(seed + variant * 0x9e37));
  const content = wrapDanClause(p.content);
  assertChooseAllAnswerCount(content, p.answer, `중1 2차 ${key}`);
  assertChoiceCount(content, `중1 2차 ${key}`);
  assertChoiceMarks(content, `중1 2차 ${key}`);
  return {
    ...p,
    content,
    solution: tidySolution(p.solution),
    difficulty: resolveMiddleTier(p.difficulty, content, !!p.figureSpec),
  };
}

// ── 소품 ────────────────────────────────────────────────────

/** 파싱이 안 되면 **던진다** — 조용히 통과시키면 그 유형은 분모 밖이 된다. */
function grab(re: RegExp, content: string, who: string): string[] {
  const m = re.exec(content);
  if (m === null) throw new Error(`${who}: 지면 모양이 다르다 — ${content}`);
  return m.slice(1);
}

const num = (s: string): number => Number(s);

function answerNumber(text: string): number {
  const m = text.match(/-?\d+(?:\.\d+)?/);
  if (m === null) throw new Error(`답에 수가 없다: ${text}`);
  return Number(m[0]);
}

/**
 * **지면을 제품 렌더러로 실제로 그려 본다** — 붉거나 중립 폴백이면 참.
 *
 * 값 검산도 냄새 자도 이 축을 못 본다: 없는 명령이나 날 LaTeX 는 **값이 맞고
 * 냄새 목록에도 없다.** 판정을 명령 목록으로 하지 않고 **화면과 같은 방식으로
 * 렌더해서** 한다.
 */
function brokenRender(text: string): boolean {
  const html = renderMathHtml(text);
  return (
    html.includes("katex-error") ||
    html.includes("#cc0000") ||
    html.includes("math-raw")
  );
}

function lcm(a: number, b: number): number {
  let x = a;
  let y = b;
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return (a / x) * b;
}

/** 지면의 약분된 분수 다섯 — `(부호, 분자, 분모)`. */
function parseFractions(list: string): { n: number; d: number }[] {
  const out: { n: number; d: number }[] = [];
  for (const m of list.matchAll(/\$(-?)\\dfrac\{(\d+)\}\{(\d+)\}\$/g)) {
    out.push({ n: (m[1] === "-" ? -1 : 1) * Number(m[2]), d: Number(m[3]) });
  }
  return out;
}

// ── 검산기 — 인자는 `content` 하나뿐이다 ────────────────────────

/** `41U` 가 쓸 수 있는 밑 — 일의 자리 주기가 **정확히 $4$** 인 것만. */
const ALLOWED_BASES = new Set([2, 3, 7, 8]);

const VERIFY: Record<string, (content: string) => number> = {
  // 41U — 주기라는 개념을 **안 쓰고** `BigInt` 로 거듭제곱을 통째로 계산한다.
  [K41]: (content) => {
    const [b1, e1, b2, e2] = grab(
      /^\$(\d+)\^\{(\d+)\}\\times(\d+)\^\{(\d+)\}\$의 일의 자리의 숫자를 구하시오\.$/,
      content,
      "41U",
    );
    const B1 = num(b1!);
    const B2 = num(b2!);
    const E1 = num(e1!);
    const E2 = num(e2!);
    if (!ALLOWED_BASES.has(B1) || !ALLOWED_BASES.has(B2))
      throw new Error(`41U: 주기가 4 가 아닌 밑이다 ${B1}·${B2}`);
    if (B1 === B2) throw new Error("41U: 밑이 같으면 지수법칙으로 합쳐진다");
    if (B1 * B2 === 16)
      throw new Error(
        "41U: 2 와 8 은 지수법칙으로 합쳐져 되풀이 성질이 필요 없다",
      );
    if (E1 % 4 === E2 % 4)
      throw new Error("41U: 두 나머지가 같으면 주기의 한 자리만 쓴다 (㉠)");
    // ⚠️ `10n` 리터럴은 이 저장소의 tsc 목표(ES2019)에서 못 쓴다 — `BigInt(10)` 으로 짓는다.
    const TEN = BigInt(10);
    const digit = (b: number, e: number): number =>
      Number(BigInt(b) ** BigInt(e) % TEN);
    const x = (digit(B1, E1) * digit(B2, E2)) % 10;
    // ㉡ 굳힘이 항등식이면 안 된다 — 지수를 하나만 늘려도 답이 달라져야 한다.
    if ((digit(B1, E1 + 1) * digit(B2, E2)) % 10 === x)
      throw new Error("41U: 첫째 지수를 흔들어도 답이 그대로다");
    if ((digit(B1, E1) * digit(B2, E2 + 1)) % 10 === x)
      throw new Error("41U: 둘째 지수를 흔들어도 답이 그대로다");
    return x;
  },

  // 42U — 꼴을 쓰지 않고 $2$ 부터 상한까지 **약수를 세어** 열 개인 것을 모은다.
  [K42]: (content) => {
    const [limit] = grab(
      /^약수의 개수가 \$10\$개인 \$(\d+)\$ 이하의 자연수를 모두 찾아 그 합을 구하시오\.$/,
      content,
      "42U",
    );
    const N = num(limit!);
    const kept: number[] = [];
    for (let n = 2; n <= N; n += 1) {
      let d = 0;
      for (let k = 1; k * k <= n; k += 1) {
        if (n % k !== 0) continue;
        d += k === n / k ? 1 : 2;
      }
      if (d === 10) kept.push(n);
    }
    // ㉡ 「밑을 바꿔 가며 다 본다」가 실제로 일을 해야 한다 — $p=2$ 갈래(=$16$ 의 배수)
    //    만 보아도 답이 같으면 그 걸음은 장식이다.
    if (!kept.some((v) => v % 16 !== 0))
      throw new Error(
        "42U: 후보가 전부 16 의 배수라 밑을 2 로만 보아도 답이 같다",
      );
    if (kept.filter((v) => v % 16 === 0).length < 3)
      throw new Error("42U: $p=2$ 갈래가 너무 얕아 열거가 뜻이 없다");
    if (kept.length < 4 || kept.length > 7)
      throw new Error(`42U: 후보가 ${kept.length} 개다 (넷~일곱이어야 한다)`);
    const x = kept.reduce((a, b) => a + b, 0);
    // ㉠ 답이 **후보 전부의 합**이라 목록의 어느 자리도 답이 될 수 없다.
    if (kept.includes(x)) throw new Error("42U: 답이 후보 목록 안에 있다");
    return x;
  },

  // 43U — 접지 않는다. $\frac1a+\frac1b=s$ 인 $(a,b)$ 를 **두 벌 실제로 대입**한다.
  [K43]: (content) => {
    const [s, p1, q1, p2, r1, u1, r2] = grab(
      /^\$0\$이 아닌 두 수 \$a\$, \$b\$에 대하여 \$\\dfrac\{1\}\{a\}\+\\dfrac\{1\}\{b\}=(\d+)\$일 때, \$\\dfrac\{(\d*)a-(\d*)ab\+(\d*)b\}\{(\d*)a\+(\d*)ab\+(\d*)b\}\$의 값을 구하시오\.$/,
      content,
      "43U",
    );
    const coef = (t: string): number => (t === "" ? 1 : Number(t));
    const S = num(s!);
    const P = coef(p1!);
    const Q = coef(q1!);
    const R = coef(r1!);
    const U = coef(u1!);
    // 🔴 $a$ 와 $b$ 의 계수가 같아야 $ab$ 로 나눌 때 $\frac1a+\frac1b$ 덩어리가 생긴다.
    if (coef(p2!) !== P) throw new Error("43U: 분자의 $a$·$b$ 계수가 다르다");
    if (coef(r2!) !== R) throw new Error("43U: 분모의 $a$·$b$ 계수가 다르다");
    // ㉡ 주어진 값이 답을 실제로 정해야 한다 — 기울기 분자가 $pu+qr$ 이다.
    if (P * U + Q * R === 0)
      throw new Error("43U: 주어진 값을 흔들어도 답이 그대로다 (굳힘이 장식)");
    /** $\frac1a+\frac1b=t$ 인 $(a,b)$ 를 대입해 얻은 값. 접지 않고 그대로 계산한다. */
    const substitute = (t: number, a: number, b: number): number => {
      const numerator = P * a - Q * a * b + P * b;
      const denominator = R * a + U * a * b + R * b;
      if (Math.abs(1 / a + 1 / b - t) > 1e-9)
        throw new Error("43U: 대입할 두 수가 조건을 안 만족한다");
      if (Math.abs(denominator) < 1e-12) throw new Error("43U: 분모가 0 이다");
      return numerator / denominator;
    };
    const v1 = substitute(S, 3 / S, 3 / (2 * S));
    const v2 = substitute(S, 2 / S, 2 / S);
    if (Math.abs(v1 - v2) > 1e-9)
      throw new Error(`43U: $(a,b)$ 를 바꾸면 값이 달라진다 ${v1} ≠ ${v2}`);
    if (Math.abs(v1 - Math.round(v1)) > 1e-9)
      throw new Error(`43U: 값이 정수가 아니다 ${v1}`);
    // ㉡ 을 지면에서 한 번 더 — 주어진 값을 $1$ 늘리면 답이 달라져야 한다.
    const shifted = substitute(S + 1, 3 / (S + 1), 3 / (2 * (S + 1)));
    if (Math.abs(shifted - v1) < 1e-9)
      throw new Error("43U: 주어진 값을 흔들어도 답이 그대로다");
    return Math.round(v1);
  },

  // 44U — 지면의 **약분된 분수**에서 분모의 최소공배수를 새로 구해 유리수로 더한다.
  [K44]: (content) => {
    const [list] = grab(
      /^다섯 개의 유리수 (.+?) 중에서 서로 다른 세 수를 뽑아 더하려고 한다\./,
      content,
      "44U",
    );
    const fr = parseFractions(list!);
    if (fr.length !== 5) throw new Error(`44U: 유리수가 ${fr.length} 개다`);
    if (fr.some((f) => f.d === 1)) throw new Error("44U: 정수가 섞여 있다");
    if (new Set(fr.map((f) => `${f.n}/${f.d}`)).size !== 5)
      throw new Error("44U: 같은 수가 두 번 나온다");
    const D = fr.reduce((acc, f) => lcm(acc, f.d), 1);
    const N = fr.map((f) => f.n * (D / f.d));
    const kept: { at: number; sum: number }[] = [];
    // ⚠️ 분자를 먼저 다 더하고 **마지막에 한 번만** 나눈다 — 조합마다 나눠 더하면
    //    부동소수 오차가 쌓여 「조건을 지운 답」 대조가 못 세는 자리가 생긴다.
    let looseNumerator = 0;
    TRIPLES.forEach((t, at) => {
      const s = N[t[0]]! + N[t[1]]! + N[t[2]]!;
      looseNumerator += s;
      if (s % D === 0) kept.push({ at, sum: s / D });
    });
    const loose = looseNumerator / D;
    if (kept.length < 3 || kept.length > 5)
      throw new Error(`44U: 살아남는 경우가 ${kept.length} 가지다`);
    if (!allNumbersUsed(kept))
      throw new Error("44U: 어느 한 수가 어느 경우에도 안 쓰인다 (장식)");
    if (!noCommonNumber(kept))
      throw new Error("44U: 살아남은 경우가 어느 한 수를 늘 포함한다 (㉠)");
    const x = kept.reduce((a, k) => a + k.sum, 0);
    // ㉡ 「합이 정수」 조건을 지우면 답이 달라져야 한다.
    if (Math.abs(loose - x) < 1e-9)
      throw new Error("44U: 조건을 지워도 답이 같다");
    return x;
  },
};

// ── 눈금 — 손으로 쓴 지면 (엔진을 안 거친다) ──────────────────

/**
 * 양성: 답을 아는 지면에서 그 답을 낸다.
 *
 * 손 계산 — `41U`: $3^{100}$ 은 $100=4\times25$ 라 주기 $3,9,7,1$ 의 넷째 $1$,
 * $7^{50}$ 은 $50=4\times12+2$ 라 주기 $7,9,3,1$ 의 둘째 $9$ → $1\times9=9$.
 * `42U`: $200$ 이하는 $48$·$80$·$112$·$162$·$176$ → 합 $578$.
 * `43U`: $(3\times5-1)/(1\times5+2)=14/7=2$. $a=\frac13,b=\frac12$ 로 대입해도 같다.
 * `44U`: 분자 $-9,-8,-1,5,8$ ($L=6$) → $-18\to-3$, $-12\to-2$, $12\to2$ → 합 $-3$.
 */
const CALIBRATION: ReadonlyArray<readonly [string, string, number]> = [
  [K41, "$3^{100}\\times7^{50}$의 일의 자리의 숫자를 구하시오.", 9],
  [K41, "$2^{2023}\\times7^{2024}$의 일의 자리의 숫자를 구하시오.", 8],
  [
    K42,
    "약수의 개수가 $10$개인 $200$ 이하의 자연수를 모두 찾아 그 합을 구하시오.",
    578,
  ],
  [
    K42,
    "약수의 개수가 $10$개인 $280$ 이하의 자연수를 모두 찾아 그 합을 구하시오.",
    1058,
  ],
  [
    K43,
    "$0$이 아닌 두 수 $a$, $b$에 대하여 $\\dfrac{1}{a}+\\dfrac{1}{b}=5$일 때, $\\dfrac{3a-ab+3b}{a+2ab+b}$의 값을 구하시오.",
    2,
  ],
  [
    K43,
    "$0$이 아닌 두 수 $a$, $b$에 대하여 $\\dfrac{1}{a}+\\dfrac{1}{b}=4$일 때, $\\dfrac{5a-5ab+5b}{a+ab+b}$의 값을 구하시오.",
    3,
  ],
  [
    K44,
    "다섯 개의 유리수 $-\\dfrac{3}{2}$, $-\\dfrac{4}{3}$, $-\\dfrac{1}{6}$, $\\dfrac{5}{6}$, $\\dfrac{4}{3}$ 중에서 서로 다른 세 수를 뽑아 더하려고 한다. 그 합이 정수가 되는 모든 경우에 대하여 그때의 합을 모두 더한 값을 구하시오.",
    -3,
  ],
];

/** 음성: 모양이 어긋나거나 **불변식을 어긴** 지면은 던진다. */
const REJECTS: ReadonlyArray<readonly [string, string, string]> = [
  [
    K41,
    "$2^{2023}\\times8^{2024}$의 일의 자리의 숫자를 구하시오.",
    "밑이 $2$·$8$ 이면 지수법칙으로 합쳐져 되풀이 성질이 필요 없다",
  ],
  [
    K41,
    "$3^{100}\\times7^{52}$의 일의 자리의 숫자를 구하시오.",
    "두 나머지가 둘 다 $0$ — 주기의 넷째 자리만 쓴다 (㉠)",
  ],
  [
    K41,
    "$5^{100}\\times6^{50}$의 일의 자리의 숫자를 구하시오.",
    "밑 $5$·$6$ 은 주기가 $1$ — 지수를 흔들어도 답이 그대로다 (㉡ 음성 대조)",
  ],
  [
    K41,
    "$a=3^{4}$, $b=5^{2}$, $c=2^{2}$일 때, 가장 큰 수와 가장 작은 수의 차를 구하시오.",
    "같은 소단원 심화하 `17` 의 지면 — 모양이 다르므로 던져야 한다",
  ],
  [
    K42,
    "약수의 개수가 $10$개인 $150$ 이하의 자연수를 모두 찾아 그 합을 구하시오.",
    "$162$ 가 범위 밖이라 후보가 전부 $16$ 의 배수 — 밑을 $2$ 로만 보아도 답이 같다 (㉡ 음성 대조)",
  ],
  [
    K42,
    "약수의 개수가 $10$개인 $600$ 이하의 자연수를 모두 찾아 그 합을 구하시오.",
    "후보가 일곱을 넘어 열거가 지면에 안 담긴다",
  ],
  [
    K42,
    "$3^{4}\\times\\square$의 약수의 개수가 $15$일 때, $\\square$ 안에 들어갈 수 있는 가장 작은 자연수를 구하시오.",
    "같은 소단원 심화하 `10` 의 지면 — 모양이 다르므로 던져야 한다",
  ],
  [
    K43,
    "$0$이 아닌 두 수 $a$, $b$에 대하여 $\\dfrac{1}{a}+\\dfrac{1}{b}=5$일 때, $\\dfrac{3a-ab+4b}{a+2ab+b}$의 값을 구하시오.",
    "분자의 $a$·$b$ 계수가 달라 $ab$ 로 나눠도 덩어리가 안 생긴다",
  ],
  [
    K43,
    "$0$이 아닌 두 수 $a$, $b$에 대하여 $\\dfrac{1}{a}+\\dfrac{1}{b}=5$일 때, $\\dfrac{3a-ab+3b}{a+3ab+b}$의 값을 구하시오.",
    "$14/8$ — 값이 정수가 아니다",
  ],
  [
    K43,
    "$2x-5y=9$일 때, $4x-10y+3$의 값을 구하시오.",
    "같은 소단원 심화하 `51` 의 지면 — 모양이 다르므로 던져야 한다",
  ],
  [
    K44,
    "다섯 개의 유리수 $-\\dfrac{1}{2}$, $\\dfrac{2}{3}$, $\\dfrac{5}{6}$, $-\\dfrac{4}{3}$, $\\dfrac{3}{2}$ 중에서 서로 다른 세 수를 뽑아 더하려고 한다. 그 합이 정수가 되는 모든 경우에 대하여 그때의 합을 모두 더한 값을 구하시오.",
    "정찰 브리프의 손 예 — 살아남은 네 조합이 $\\frac{5}{6}$ 를 **모두** 포함한다 (㉠)",
  ],
  [
    K44,
    "다섯 개의 유리수 $\\dfrac{1}{6}$, $\\dfrac{1}{3}$, $\\dfrac{1}{2}$, $\\dfrac{2}{3}$, $\\dfrac{5}{6}$ 중에서 서로 다른 세 수를 뽑아 더하려고 한다. 그 합이 정수가 되는 모든 경우에 대하여 그때의 합을 모두 더한 값을 구하시오.",
    "살아남는 경우가 둘뿐 — 열 가지를 견주는 뜻이 옅다",
  ],
  [
    K44,
    "세 상자 ㉠, ㉡, ㉢에 각각 세 개의 수가 들어 있다. 각 상자에 들어 있는 세 수의 합이 모두 같을 때, $a+b$의 값을 구하시오.",
    "같은 소단원 심화하 `11` 의 지면 — 모양이 다르므로 던져야 한다",
  ],
];

describe("중1 2차 확대 갈래 — 눈금 (이 자가 «아니오» 를 낼 수 있는가)", () => {
  it.each(CALIBRATION)(
    "양성 %s — 손으로 쓴 지면에서 답을 낸다",
    (key, content, want) => {
      expect(VERIFY[key]!(content)).toBe(want);
    },
  );

  it.each(REJECTS)("음성 %s — %s", (key, content) => {
    expect(() => VERIFY[key]!(content)).toThrow();
  });
});

/**
 * 굳힘 함수 자체의 눈금 — **음성 대조를 같이 둔다.**
 *
 * 「굳힘을 흔들면 답이 달라진다」만 재면 그 자가 «아니오» 를 낼 수 있는지 알 수 없다.
 * 그래서 흔들어도 **안 달라지는** 입력을 일부러 넣어 그 사실을 확인한다.
 */
describe("중1 2차 확대 갈래 — 굳힘 함수와 음성 대조", () => {
  it("`lastDigitOfPower` 는 손 계산과 맞는다", () => {
    expect(lastDigitOfPower(3, 100)).toBe(1);
    expect(lastDigitOfPower(7, 50)).toBe(9);
    expect(lastDigitOfPower(2, 2023)).toBe(8);
    expect(lastDigitOfPower(7, 2024)).toBe(1);
    expect(unitDigitCycle(3)).toEqual([3, 9, 7, 1]);
    expect(unitDigitCycle(7)).toEqual([7, 9, 3, 1]);
    expect(unitDigitOfProduct(3, 100, 7, 50)).toBe(9);
    expect(() => lastDigitOfPower(3, 0)).toThrow();
  });

  it("🔴 음성 대조 — 밑 $5$·$6$(주기 $1$)·$4$·$9$(주기 $2$)는 지수를 흔들어도 그대로다", () => {
    for (let e = 1; e <= 12; e += 1) {
      // 주기 1 — 하나만 늘려도 안 바뀐다. 「달라진다」 가드가 여기서 «아니오» 를 낸다.
      expect(lastDigitOfPower(5, e)).toBe(lastDigitOfPower(5, e + 1));
      expect(lastDigitOfPower(6, e)).toBe(lastDigitOfPower(6, e + 1));
      // 주기 2 — 둘 늘리면 안 바뀐다.
      expect(lastDigitOfPower(4, e)).toBe(lastDigitOfPower(4, e + 2));
      expect(lastDigitOfPower(9, e)).toBe(lastDigitOfPower(9, e + 2));
      // 우리가 쓰는 밑 넷은 하나만 늘려도 바뀌고, 넷 늘리면 되돌아온다.
      for (const b of [2, 3, 7, 8]) {
        expect(lastDigitOfPower(b, e)).not.toBe(lastDigitOfPower(b, e + 1));
        expect(lastDigitOfPower(b, e)).not.toBe(lastDigitOfPower(b, e + 2));
        expect(lastDigitOfPower(b, e)).not.toBe(lastDigitOfPower(b, e + 3));
        expect(lastDigitOfPower(b, e)).toBe(lastDigitOfPower(b, e + 4));
      }
    }
  });

  it("`tenDivisorNumbers` 는 꼴로 만든 목록이고 무식한 셈과 맞는다", () => {
    const brute = (limit: number): number[] => {
      const out: number[] = [];
      for (let n = 2; n <= limit; n += 1) {
        let d = 0;
        for (let k = 1; k * k <= n; k += 1) {
          if (n % k !== 0) continue;
          d += k === n / k ? 1 : 2;
        }
        if (d === 10) out.push(n);
      }
      return out;
    };
    for (const limit of [150, 170, 200, 280, 600, 700]) {
      expect(tenDivisorNumbers(limit), `상한 ${limit}`).toEqual(brute(limit));
    }
    expect(ninthPowers(280)).toEqual([]);
    expect(ninthPowers(600)).toEqual([512]);
    expect(tenDivisorBranches(200).map((b) => b.p)).toEqual([2, 3]);
  });

  it("🔴 음성 대조 — 상한이 $162$ 아래면 「밑을 $2$ 로만 본 합」이 참 답과 같아진다", () => {
    const loose = (limit: number): number =>
      tenDivisorNumbers(limit)
        .filter((v) => v % 16 === 0)
        .reduce((a, b) => a + b, 0);
    const tight = (limit: number): number =>
      tenDivisorNumbers(limit).reduce((a, b) => a + b, 0);
    // 「굳힘이 일한다」 가드가 «아니오» 를 낼 수 있음을 보인다.
    expect(loose(150)).toBe(tight(150));
    expect(loose(200)).not.toBe(tight(200));
  });

  it("`valueFromReciprocalSum` 은 나누어떨어질 때만 값을 낸다", () => {
    expect(valueFromReciprocalSum(5, 3, 1, 1, 2)).toBe(2);
    expect(valueFromReciprocalSum(4, 5, 5, 1, 1)).toBe(3);
    // $(3\times4-1)/(1\times4+2)=11/6$ — 나누어떨어지지 않는다.
    expect(valueFromReciprocalSum(4, 3, 1, 1, 2)).toBeNull();
  });

  it("🔴 음성 대조 — $pu+qr=0$ 이면 주어진 값과 무관하게 값이 그대로다", () => {
    // $p=2$, $q=-1$, $r=2$, $u=1$ → 분자 $2s+1$, 분모 $2s+1$ 이라 늘 $1$.
    for (let s = 2; s <= 9; s += 1) {
      expect(valueFromReciprocalSum(s, 2, -1, 2, 1)).toBe(1);
    }
    // 우리가 쓰는 계수(전부 양수)에서는 $s$ 가 커지면 값이 **단조증가**한다.
    // ⚠️ 「$s$ 와 $s+1$ 이 다르다」로 재면 안 된다 — 둘 다 나누어떨어지지 않아
    //    `null` 이면 **같아져서** 그 단정이 거짓 초록이 아니라 거짓 빨강이 된다.
    //    (실제로 처음 그렇게 썼다가 빨개졌다.)
    for (const [p, q, r, u] of [
      [9, 9, 1, 1],
      [5, 5, 1, 1],
      [4, 2, 1, 1],
    ] as const) {
      const grow: number[] = [];
      for (let s = 2; s <= 30; s += 1) {
        const got = valueFromReciprocalSum(s, p, q, r, u);
        if (got !== null) grow.push(got);
      }
      expect(grow.length, `${p}/${q}/${r}/${u}`).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < grow.length; i += 1) {
        expect(
          grow[i]!,
          `${p}/${q}/${r}/${u}: ${grow.join(",")}`,
        ).toBeGreaterThan(grow[i - 1]!);
      }
    }
  });

  it("`integerTriples` 와 그 불변식 도구가 손 계산과 맞는다", () => {
    // 정찰 브리프의 손 예 — 분자 $-3,4,5,-8,9$ ($L=6$).
    const kept = integerTriples([-3, 4, 5, -8, 9], 6);
    expect(kept.map((k) => k.sum)).toEqual([1, -1, 3, 1]);
    expect(allNumbersUsed(kept)).toBe(true);
    // 🔴 그 예는 살아남은 넷이 셋째 수($\frac56$)를 **모두** 포함한다 — 우리는 막는다.
    expect(noCommonNumber(kept)).toBe(false);
    // 눈금의 양성 표본은 통과한다.
    const good = integerTriples([-9, -8, -1, 5, 8], 6);
    expect(good.map((k) => k.sum)).toEqual([-3, -2, 2]);
    expect(allNumbersUsed(good)).toBe(true);
    expect(noCommonNumber(good)).toBe(true);
    expect(allTriplesSum([-9, -8, -1, 5, 8], 6)).toBe(-5);
    expect(TRIPLES.length).toBe(10);
  });
});

describe("중1 2차 확대 갈래 — 배선", () => {
  it("유형이 정확히 넷이고 키가 안 겹친다", () => {
    expect(M1_TOP_2.length).toBe(4);
    expect(new Set(M1_TOP_2.map((e) => e.key)).size).toBe(4);
    expect(M1_TOP_2.map((e) => e.key).sort()).toEqual([...KEYS].sort());
  });

  it("번호가 `U` 규약을 지키고 중단원이 RPM 색인에 있다", () => {
    for (const e of M1_TOP_2) {
      expect(/^\d+U$/.test(e.rpmType), e.key).toBe(true);
      expect(extensionNumberReason(e), e.key).toBeNull();
    }
  });

  it("소단원 이름이 교육과정 정본에 글자 그대로 있다", () => {
    for (const e of M1_TOP_2) {
      expect(
        CURRICULUM_UNITS.some(
          (u) => u.grade === "중1" && u.section === e.unitSection,
        ),
        `${e.key} → ${e.unitSection}`,
      ).toBe(true);
      expect(e.grade).toBe("중1");
    }
  });

  it("🔴 등록 상태가 넷 다 같다 — 절반만 등록되면 절반은 제품을, 절반은 대역을 탄다", () => {
    const n = KEYS.filter((k) => REGISTERED.has(k)).length;
    expect(n === 0 || n === KEYS.length, `등록 ${n}/${KEYS.length}`).toBe(true);
  });

  it("🔴 제품 후처리가 이 넷에 대해 항등이다 — 그래서 대역이 제품과 같은 지면을 낸다", () => {
    for (const e of M1_TOP_2) {
      for (const seed of SEEDS) {
        for (let v = 0; v < VARIANTS; v += 1) {
          const raw = e.handler(createRng(seed + v * 0x9e37));
          expect(wrapDanClause(raw.content), `${e.key} 단절`).toBe(raw.content);
          expect(tidySolution(raw.solution), `${e.key} 되풀이`).toBe(
            raw.solution,
          );
          expect(
            resolveMiddleTier(raw.difficulty, raw.content, !!raw.figureSpec),
            `${e.key} 갈래 내리기`,
          ).toBe(raw.difficulty);
        }
      }
    }
  });
});

describe("중1 2차 확대 갈래 — 지면과 값", () => {
  it("🔴 중1에 `심화중`·`심화상` 이 둘씩 생겼다 (D-116 ⑴)", () => {
    const tiers = M1_TOP_2.map((e) => build(e.key, SEEDS[0]!).difficulty);
    expect(tiers.filter((t) => t === "심화중").length).toBe(2);
    expect(tiers.filter((t) => t === "심화상").length).toBe(2);
  });

  for (const e of M1_TOP_2) {
    describe(e.key, () => {
      it("갈래가 못 박은 그대로다 (씨앗·변형을 가로질러)", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < VARIANTS; v += 1) {
            expect(
              build(e.key, seed, v).difficulty,
              `${e.key} seed ${seed} v${v}`,
            ).toBe(EXPECTED_TIER[e.key]);
          }
        }
      });

      it("🔴 220판을 지면만 보고 다시 풀면 같은 답이 나온다 — 생성기 산술을 안 옮겨 적는다", () => {
        for (const [seed, v] of BULK) {
          const p = build(e.key, seed, v);
          expect(VERIFY[e.key]!(p.content), `${e.key} ${seed}/${v}`).toBe(
            answerNumber(p.answer),
          );
        }
      });

      it("`facts.x` 가 정답이다 (이웃 모듈과 같은 계약)", () => {
        for (const [seed, v] of BULK) {
          const p = build(e.key, seed, v);
          expect(p.facts.x, `${e.key} ${seed}/${v}`).toBe(
            answerNumber(p.answer),
          );
        }
      });

      it("지면이 깨끗하다 — 렌더·냄새·조사·맨 숫자·그림 지시", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < VARIANTS; v += 1) {
            const p = build(e.key, seed, v);
            for (const text of [p.content, p.answer, p.solution]) {
              expect(brokenRender(text), `${e.key} 렌더: ${text}`).toBe(false);
              expect(pageSmells(text), `${e.key} 냄새`).toEqual([]);
              expect(josaMismatches(text), `${e.key} 조사`).toEqual([]);
              expect(bareNumbers(text), `${e.key} 맨 숫자`).toEqual([]);
            }
            // 그림이 없으므로 발문이 지면을 가리키면 종이에서 못 푼다.
            expect(p.figureSpec ?? null, e.key).toBe(null);
            expect(pointsAtFigure(p.content), e.key).toBeNull();
          }
        }
      });

      it("🔴 해설이 걸음을 건너뛰지 않는다 (D-116 ⑸)", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < VARIANTS; v += 1) {
            const p = build(e.key, seed, v);
            const lines = p.solution.split("\n");
            expect(lines.length, `${e.key} 해설 줄`).toBeGreaterThanOrEqual(4);
            expect(p.solution.length, `${e.key} 해설이 짧다`).toBeGreaterThan(
              150,
            );
            // 중간 계산이 실제로 적혀 있어야 한다 — 등식이 셋 이상.
            expect(
              (p.solution.match(/=/g) ?? []).length,
              `${e.key} 중간 등식`,
            ).toBeGreaterThanOrEqual(3);
            // 마지막 줄이 답을 실제로 말한다.
            expect(lines[lines.length - 1]!, `${e.key} 마지막 줄`).toContain(
              String(answerNumber(p.answer)),
            );
          }
        }
      });

      it("변형 공간이 열 문항을 낸다 — 발문이 겹치지 않는다", () => {
        const seen = new Set<string>();
        for (let v = 0; v < 300 && seen.size < 10; v += 1) {
          seen.add(build(e.key, 20260902, v).content);
        }
        expect(seen.size, e.key).toBe(10);
      });
    });
  }
});

/**
 * 🔴 **㉠ 창이 한쪽 끝만인가** — 「살아남는 후보가 늘 목록의 같은 자리」면 굳힘이
 * «어느 후보인가»를 한 번도 안 고른다. 갈래마다 축이 다르므로 **따로** 잰다.
 * 「축이 없다」와 「축이 초록이다」는 다른 말이라 `43U` 는 «해당 없음»을 따로 찍는다.
 */
describe("중1 2차 확대 갈래 — ㉠ 창이 한쪽 끝만인가", () => {
  it("`41U` — 주기의 네 자리가 씨앗을 가로질러 다 나온다", () => {
    const slots = new Set<number>();
    for (const [seed, v] of BULK) {
      const p = build(K41, seed, v);
      slots.add(p.facts.r1 === 0 ? 4 : p.facts.r1!);
      slots.add(p.facts.r2 === 0 ? 4 : p.facts.r2!);
      // 한 문항 안에서도 두 자리가 달라야 한다.
      expect(p.facts.r1, `${seed}/${v}`).not.toBe(p.facts.r2);
    }
    expect([...slots].sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
  });

  it("`42U` — 답이 후보 전부의 합이라 목록의 어느 자리도 답이 아니다", () => {
    for (const [seed, v] of BULK) {
      const p = build(K42, seed, v);
      const kept = tenDivisorNumbers(p.facts.limit!);
      expect(kept.length, `${seed}/${v}`).toBeGreaterThanOrEqual(4);
      expect(kept.length, `${seed}/${v}`).toBeLessThanOrEqual(7);
      expect(kept, `${seed}/${v}`).not.toContain(p.facts.x!);
      expect(kept.reduce((a, b) => a + b, 0)).toBe(p.facts.x!);
    }
  });

  it("`43U` — **해당 없음**: 후보 목록이 없다. 값이 하나로 굳는 것을 대신 잰다", () => {
    for (const [seed, v] of BULK) {
      const p = build(K43, seed, v);
      const s = p.facts.s!;
      const value = (a: number, b: number): number =>
        (p.facts.p! * a - p.facts.q! * a * b + p.facts.p! * b) /
        (p.facts.r! * a + p.facts.u! * a * b + p.facts.r! * b);
      // 조건을 만족하는 $(a,b)$ 를 세 벌 잡아도 값이 같다 — 후보를 고를 일이 없다.
      const vals = [
        value(3 / s, 3 / (2 * s)),
        value(2 / s, 2 / s),
        value(4 / s, 4 / (3 * s)),
      ];
      for (const got of vals) {
        expect(Math.abs(got - p.facts.x!), `${seed}/${v}`).toBeLessThan(1e-9);
      }
    }
  });

  it("`44U` — 살아남는 자리가 씨앗을 가로질러 갈리고 열 자리를 다 덮는다", () => {
    const sets = new Set<string>();
    const slots = new Set<number>();
    for (const [seed, v] of BULK) {
      const p = build(K44, seed, v);
      const ns = [
        p.facts.n1!,
        p.facts.n2!,
        p.facts.n3!,
        p.facts.n4!,
        p.facts.n5!,
      ];
      const kept = integerTriples(ns, p.facts.L!);
      expect(kept.length, `${seed}/${v}`).toBeGreaterThanOrEqual(3);
      expect(kept.length, `${seed}/${v}`).toBeLessThanOrEqual(5);
      expect(allNumbersUsed(kept), `${seed}/${v}`).toBe(true);
      expect(noCommonNumber(kept), `${seed}/${v}`).toBe(true);
      sets.add(kept.map((k) => k.at).join(","));
      for (const k of kept) slots.add(k.at);
    }
    expect(sets.size).toBeGreaterThanOrEqual(10);
    expect([...slots].sort((a, b) => a - b)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
  });
});

/**
 * 🔴 **㉡ 굳힘이 항등식인가** — 굳힘 조건을 흔들었을 때 답이 그대로면 그것은 굳힘이
 * 아니라 장식이다. 위 「굳힘 함수와 음성 대조」가 그 자가 «아니오» 를 낼 수 있음을
 * 보였으므로, 여기서는 **실제로 나온 지면**이 그 자를 통과하는지를 잰다.
 */
describe("중1 2차 확대 갈래 — ㉡ 굳힘이 항등식인가", () => {
  it("`41U` — 지수를 하나만 $1$ 늘려도 답이 달라진다", () => {
    for (const [seed, v] of BULK) {
      const p = build(K41, seed, v);
      const { b1, e1, b2, e2, x } = p.facts as Record<string, number>;
      expect(unitDigitOfProduct(b1!, e1!, b2!, e2!)).toBe(x!);
      expect(
        unitDigitOfProduct(b1!, e1! + 1, b2!, e2!),
        `${seed}/${v}`,
      ).not.toBe(x!);
      expect(
        unitDigitOfProduct(b1!, e1!, b2!, e2! + 1),
        `${seed}/${v}`,
      ).not.toBe(x!);
    }
  });

  it("`42U` — 「밑을 $2$ 로만 본 합」이 참 답과 다르다", () => {
    for (const [seed, v] of BULK) {
      const p = build(K42, seed, v);
      const kept = tenDivisorNumbers(p.facts.limit!);
      const loose = kept.filter((n) => n % 16 === 0).reduce((a, b) => a + b, 0);
      expect(loose, `${seed}/${v}`).not.toBe(p.facts.x!);
      expect(p.facts.loose!).toBe(loose);
      expect(kept, `${seed}/${v}`).toContain(162);
    }
  });

  it("`43U` — 주어진 역수의 합을 흔들면 답이 달라진다", () => {
    for (const [seed, v] of BULK) {
      const { s, p, q, r, u, x } = build(K43, seed, v).facts as Record<
        string,
        number
      >;
      expect(valueFromReciprocalSum(s!, p!, q!, r!, u!)).toBe(x!);
      expect(
        valueFromReciprocalSum(s! + 1, p!, q!, r!, u!),
        `${seed}/${v}`,
      ).not.toBe(x!);
      expect(p! * u! + q! * r!, `${seed}/${v}`).not.toBe(0);
    }
  });

  it("`44U` — 「합이 정수」 조건을 지우면 답이 달라진다", () => {
    for (const [seed, v] of BULK) {
      const p = build(K44, seed, v);
      const ns = [
        p.facts.n1!,
        p.facts.n2!,
        p.facts.n3!,
        p.facts.n4!,
        p.facts.n5!,
      ];
      const L = p.facts.L!;
      expect(allTriplesSum(ns, L), `${seed}/${v}`).not.toBe(p.facts.x!);
      expect(integerTriples(ns, L).length).toBeLessThan(TRIPLES.length);
    }
  });
});

/**
 * 🔴 **후보를 견주는 갈래는 후보를 하나씩 적는다** (D-116 ⑹).
 *
 * 「구하면」 뒤에 답만 오면 학생이 그 걸음을 못 밟는다. 42U 는 밑을 바꿔 가는 갈래마다,
 * 44U 는 **열 가지 조합마다** 한 줄씩 적혀 있는지 지면 글자로 센다.
 */
describe("중1 2차 확대 갈래 — 해설이 후보를 하나씩 적는가", () => {
  it("`42U` — 후보와 각 갈래의 소수 $q$ 가 해설에 다 나온다", () => {
    for (const seed of SEEDS) {
      for (let v = 0; v < VARIANTS; v += 1) {
        const p = build(K42, seed, v);
        const limit = p.facts.limit!;
        for (const n of tenDivisorNumbers(limit)) {
          expect(p.solution, `${seed}/${v} 후보 ${n}`).toContain(`$${n}$`);
        }
        for (const b of tenDivisorBranches(limit)) {
          expect(p.solution, `${seed}/${v} 밑 ${b.p}`).toContain(
            `$p=${b.p}$이면`,
          );
          for (const q of b.qs) {
            expect(p.solution, `${seed}/${v} 소수 ${q}`).toContain(`$${q}$`);
          }
        }
        // $p^{9}$ 갈래가 비었다는 것을 **명시**한다.
        expect(p.solution).toContain("$2^{9}=512$");
      }
    }
  });

  it("`44U` — 열 가지 조합이 전부 한 줄씩 적히고 살고 죽는 까닭이 붙는다", () => {
    for (const seed of SEEDS) {
      for (let v = 0; v < VARIANTS; v += 1) {
        const p = build(K44, seed, v);
        const caseLines = p.solution
          .split("\n")
          .filter((l) => /^\$[a-e]\+[a-e]\+[a-e]\$: /.test(l));
        expect(caseLines.length, `${seed}/${v}`).toBe(10);
        const alive = caseLines.filter((l) => /배수이다\)$/.test(l)).length;
        const dead = caseLines.filter((l) => /배수가 아니다\)$/.test(l)).length;
        expect(alive + dead, `${seed}/${v}`).toBe(10);
        expect(alive).toBe(p.facts.kept!);
      }
    }
  });
});
