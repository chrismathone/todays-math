/**
 * 공통수학1 「경우의 수와 순열」 — RPM 공통수학1(2022) 색인 14유형. **물결 1 세션 `h1-count` 소유.**
 *
 * 브리프 `docs/planning/tracks/high-wave1-brief.md` · 본보기 `h1Identity.ts` 를 그대로 따른다.
 *
 * ## 답을 먼저 정하지 않는다 — 세는 것이 답이다
 *
 * 경우의 수 유형은 수치(사람 수·카드 장수·동전 개수)를 먼저 뽑으면 답이 **공식 하나**로 정해진다.
 * 생성기는 교과서 풀이 그대로의 공식(곱의 법칙·묶음·빈자리 끼우기·여사건)으로 답을 내고, 시험
 * (`highPerm.test.ts`)은 같은 `facts` 로 **전수 나열**(순열·순서쌍·부분집합을 실제로 늘어놓고 센다)해서
 * 맞댄다 — 공식과 나열은 서로 다른 식이다(동어반복 방지).
 *
 * ## 난이도 — 꼴마다 칸
 *
 * 대표문제 꼴은 `기본`, 나머지 꼴은 그 유형 문항의 검은 표(중하 → 기본 · 중 → 응용 · 상중 → 심화하).
 * 규칙은 시험 쪽(`highRegistry.test.ts`)에 있고 여기서는 칸을 직접 적는다.
 *
 * ## 우리 단원(시드 `prisma/seed-data/units.ts` 공통수학1 「3. 경우의 수」)
 *
 *   01~07 → 경우의 수 · 09~14 → 순열.
 *
 * ## 보류
 *
 *   08 색칠하는 방법의 수 — 영역의 인접 관계가 **그림으로만** 정해진다(`H1_PERM_HOLD`).
 *
 * 수치·소재는 새로 지었다. RPM 원본(`.rpm-src/22/`)은 유형의 구조만 보았다(저작권).
 */
import type { Difficulty } from "@/contracts/difficulty";

import type { Rng } from "../elementary/types";

import { eul, eun, ga, gwa, ira, ro } from "./josa";
import { gcd } from "./numbers";
import { attempt, distinctInts, numAnswer, pickOne, randInt } from "./pick";
import type { HighHold, HighProblem, HighTypeEntry } from "./types";

const GRADE = "공통수학1";
const BOOK = "공통수학1";
const MINOR = "경우의 수와 순열";

/** 우리 `Unit.section` 정확한 이름 (prisma/seed-data/units.ts 공통수학1 3. 경우의 수). */
const SEC = {
  경우의수: "경우의 수",
  순열: "순열",
} as const;

export type CountBody = {
  content: string;
  answer: string;
  solution: string;
  difficulty: Difficulty;
  facts: Record<string, number>;
  distractors?: readonly string[];
};

type Body = CountBody;

// ───────────────────────────── 셈과 기호 ─────────────────────────────
// 공용 후보: 순열·조합의 셈과 기호 — `h1Comb.ts` 도 여기서 가져간다. 물결 1 은 공용 파일을
// 못 고치므로 여기 두었다. 리드가 병합 때 `numbers.ts` 옆(예: `counting.ts`)으로 올릴 자리다.

export function fact(n: number): number {
  if (!Number.isInteger(n) || n < 0)
    throw new Error(`계승을 셀 수 없습니다: ${n}`);
  let out = 1;
  for (let i = 2; i <= n; i += 1) out *= i;
  return out;
}

export function nPr(n: number, r: number): number {
  if (r < 0 || r > n) throw new Error(`순열의 수를 셀 수 없습니다: ${n}P${r}`);
  let out = 1;
  for (let i = 0; i < r; i += 1) out *= n - i;
  return out;
}

export function nCr(n: number, r: number): number {
  if (r < 0 || r > n) throw new Error(`조합의 수를 셀 수 없습니다: ${n}C${r}`);
  return nPr(n, r) / fact(r);
}

/** 공용 후보: 순열 기호 `{}_{5}\mathrm{P}_{2}` — 교과서 표기(왼쪽 아래 첨자). */
export function pTex(n: number | string, r: number | string): string {
  return `{}_{${n}}\\mathrm{P}_{${r}}`;
}

/** 공용 후보: 조합 기호 `{}_{5}\mathrm{C}_{2}`. */
export function cTex(n: number | string, r: number | string): string {
  return `{}_{${n}}\\mathrm{C}_{${r}}`;
}

/** 곱셈식 몸통 `4\times 3\times 5`. */
export function timesTex(xs: readonly (number | string)[]): string {
  return xs.join("\\times ");
}

/** 덧셈식 몸통 `3+5+1` — 경우의 수는 늘 양수라 부호를 따로 챙기지 않는다. */
export function sumTex(xs: readonly number[]): string {
  if (xs.some((x) => x < 0))
    throw new Error(`음수를 더하는 식이 아닙니다: ${xs}`);
  return xs.join("+");
}

/** 늘어놓은 수 `$1$, $2$, $3$`. */
export function listTex(xs: readonly (number | string)[]): string {
  return xs.map((x) => `$${x}$`).join(", ");
}

export function sum(xs: readonly number[]): number {
  return xs.reduce((s, x) => s + x, 0);
}

/** `(1, 3), (2, 2)` — 순서쌍 늘어놓기(수식 몸통). */
function tuplesTex(ts: readonly (readonly number[])[]): string {
  return ts.map((t) => `(${t.join(", ")})`).join(", ");
}

function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b;
}

/** `k, 2k, 3k, \cdots, nk` — 넷 이하면 전부 적는다. */
function multiplesTex(k: number, count: number): string {
  if (count <= 4) {
    return Array.from({ length: count }, (_, i) => k * (i + 1)).join(", ");
  }
  return `${k}, ${2 * k}, ${3 * k}, \\cdots, ${k * count}`;
}

/** 계수가 1 이면 숫자를 안 쓰는 항 `x` · `3y`. */
function coefTerm(c: number, v: string): string {
  return c === 1 ? v : `${c}${v}`;
}

// ───────────────────────────── 소인수분해 ─────────────────────────────

function primeFactors(n: number): [number, number][] {
  const out: [number, number][] = [];
  let m = n;
  for (let p = 2; p * p <= m; p += 1) {
    let e = 0;
    while (m % p === 0) {
      m /= p;
      e += 1;
    }
    if (e > 0) out.push([p, e]);
  }
  if (m > 1) out.push([m, 1]);
  return out;
}

/** `2^{3}\times 3\times 5` — 지수 1 은 안 쓴다. */
function primeTex(n: number): string {
  return timesTex(
    primeFactors(n).map(([p, e]) => (e === 1 ? `${p}` : `${p}^{${e}}`)),
  );
}

function divisorCount(n: number): number {
  return primeFactors(n).reduce((s, [, e]) => s * (e + 1), 1);
}

/** `(3+1)\times (1+1)` */
function divisorCountTex(n: number): string {
  return timesTex(primeFactors(n).map(([, e]) => `(${e}+1)`));
}

// ───────────────────────────── 01 ─────────────────────────────
// 합의 법칙
// 꼴 0 (기본·대표): 두 주사위 눈의 합 — 배수 · 「a 또는 b」 · 「s 이상」
// 꼴 1 (기본): 서로 다른 두 숫자로 만든 두 자리 수 — 십의 자리 조건별로 나누어 더하기
// 꼴 2 (응용): 1~N 에서 a 의 배수 또는 b 의 배수(겹침 빼기) · 어느 것으로도 안 나누어떨어짐
// 꼴 3 (응용): 카드 세 장의 합이 a 또는 b

function diceSum(s: number): number {
  return s < 2 || s > 12 ? 0 : 6 - Math.abs(7 - s);
}

function dicePairs(s: number): number[][] {
  const out: number[][] = [];
  for (let a = 1; a <= 6; a += 1) {
    const b = s - a;
    if (b >= 1 && b <= 6) out.push([a, b]);
  }
  return out;
}

/** 1~N 에서 서로 다른 세 수(작은 것부터)의 합이 s 인 것. */
function tripleSums(N: number, s: number): number[][] {
  const out: number[][] = [];
  for (let i = 1; i <= N; i += 1) {
    for (let j = i + 1; j <= N; j += 1) {
      const k = s - i - j;
      if (k > j && k <= N) out.push([i, j, k]);
    }
  }
  return out;
}

const TENS_CLASS: readonly (readonly [string, (d: number) => boolean])[] = [
  ["짝수", (d) => d % 2 === 0],
  ["홀수", (d) => d % 2 === 1],
  ["$3$의 배수", (d) => d % 3 === 0],
];

function t01(rng: Rng): Body {
  const mode = randInt(rng, 0, 3);
  if (mode === 0) {
    const kind = randInt(rng, 0, 2);
    let sums: number[];
    let cond: string;
    const facts: Record<string, number> = { mode, kind };
    if (kind === 0) {
      const k = pickOne(rng, [3, 5, 6]);
      sums = [];
      for (let t = k; t <= 12; t += k) if (t >= 2) sums.push(t);
      cond = `$${k}$의 배수가 되는`;
      facts.k = k;
    } else if (kind === 1) {
      const [a, b] = distinctInts(rng, 3, 11, 2).sort((x, y) => x - y) as [
        number,
        number,
      ];
      sums = [a, b];
      cond = `$${a}$ 또는 $${b}$${ga(String(b))} 되는`;
      facts.a = a;
      facts.b = b;
    } else {
      const s = randInt(rng, 9, 11);
      sums = [];
      for (let t = s; t <= 12; t += 1) sums.push(t);
      cond = `$${s}$ 이상인`;
      facts.s = s;
    }
    const counts = sums.map(diceSum);
    const ans = sum(counts);
    return {
      content: `서로 다른 두 개의 주사위를 동시에 던질 때, 나오는 눈의 수의 합이 ${cond} 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `두 주사위에서 나오는 눈의 수를 순서쌍으로 나타내면`,
        ...sums.map(
          (t, i) =>
            `눈의 수의 합이 $${t}$인 경우는 $${tuplesTex(dicePairs(t))}$의 $${counts[i]}$가지`,
        ),
        `이 경우들은 동시에 일어나지 않으므로 구하는 경우의 수는 $${sumTex(counts)}=${ans}$`,
      ].join("\n"),
      difficulty: "기본",
      facts,
    };
  }
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const m = randInt(rng, 4, 7);
      const cls = randInt(rng, 0, TENS_CLASS.length - 1);
      const [label, ok] = TENS_CLASS[cls]!;
      const all = Array.from({ length: m }, (_, i) => i + 1);
      const tens = all.filter(ok);
      if (tens.length < 2) return null;
      const counts = tens.map(() => m - 1);
      const ans = sum(counts);
      return {
        content: `$${m}$개의 숫자 ${listTex(all)} 중에서 서로 다른 $2$개를 택하여 만들 수 있는 두 자리 자연수 중에서 십의 자리의 숫자가 ${label}인 자연수의 개수를 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          ...tens.map(
            (d) =>
              `십의 자리의 숫자가 $${d}$인 경우, 일의 자리에는 $${d}$${eul(String(d))} 제외한 $${m - 1}$개의 숫자가 올 수 있다.`,
          ),
          `이 경우들은 동시에 일어나지 않으므로 구하는 자연수의 개수는 $${sumTex(counts)}=${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, m, cls },
      };
    });
  if (mode === 2)
    return attempt<Body>((): Body | null => {
      const kind = randInt(rng, 0, 1);
      const N = pickOne(rng, [40, 50, 60, 80, 90, 100, 120]);
      const [a, b] = distinctInts(rng, 2, 9, 2).sort((x, y) => x - y) as [
        number,
        number,
      ];
      if (b % a === 0) return null;
      const l = lcm(a, b);
      if (l > N) return null;
      const na = Math.floor(N / a);
      const nb = Math.floor(N / b);
      const nl = Math.floor(N / l);
      const either = na + nb - nl;
      const ans = kind === 0 ? either : N - either;
      const lines = [
        `$${a}$의 배수는 $${multiplesTex(a, na)}$의 $${na}$개`,
        `$${b}$의 배수는 $${multiplesTex(b, nb)}$의 $${nb}$개`,
        `$${a}$${gwa(String(a))} $${b}$의 공배수, 즉 $${l}$의 배수는 $${multiplesTex(l, nl)}$의 $${nl}$개`,
      ];
      if (kind === 0) {
        lines.push(`따라서 구하는 경우의 수는 $${na}+${nb}-${nl}=${ans}$`);
      } else {
        lines.push(
          `$${a}$${ro(String(a))} 나누어떨어지거나 $${b}$${ro(String(b))} 나누어떨어지는 자연수는 $${na}+${nb}-${nl}=${either}$(개)이므로`,
          `구하는 자연수의 개수는 $${N}-${either}=${ans}$`,
        );
      }
      return {
        content:
          kind === 0
            ? `$1$부터 $${N}$까지의 자연수가 각각 하나씩 적힌 $${N}$장의 카드 중에서 한 장을 뽑을 때, $${a}$의 배수 또는 $${b}$의 배수가 적힌 카드가 나오는 경우의 수를 구하시오.`
            : `$1$부터 $${N}$까지의 자연수 중에서 $${a}$${ro(String(a))}도 $${b}$${ro(String(b))}도 나누어떨어지지 않는 자연수의 개수를 구하시오.`,
        answer: numAnswer(ans),
        solution: lines.join("\n"),
        difficulty: "응용",
        facts: { mode, kind, N, a, b },
      };
    });
  return attempt<Body>((): Body | null => {
    const N = pickOne(rng, [7, 8, 9]);
    const [a, b] = distinctInts(rng, 6, 3 * N - 3, 2).sort((x, y) => x - y) as [
      number,
      number,
    ];
    const ta = tripleSums(N, a);
    const tb = tripleSums(N, b);
    if (ta.length === 0 || tb.length === 0 || ta.length + tb.length > 7)
      return null;
    const ans = ta.length + tb.length;
    return {
      content: `$1$부터 $${N}$까지의 자연수가 각각 하나씩 적힌 $${N}$장의 카드 중에서 $3$장의 카드를 동시에 뽑을 때, 뽑힌 카드에 적힌 세 수의 합이 $${a}$ 또는 $${b}$${ga(String(b))} 되는 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `뽑힌 카드에 적힌 세 수를 작은 수부터 순서쌍으로 나타내면`,
        `세 수의 합이 $${a}$인 경우는 $${tuplesTex(ta)}$의 $${ta.length}$가지`,
        `세 수의 합이 $${b}$인 경우는 $${tuplesTex(tb)}$의 $${tb.length}$가지`,
        `두 경우는 동시에 일어나지 않으므로 구하는 경우의 수는 $${ta.length}+${tb.length}=${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, N, a, b },
    };
  });
}

// ───────────────────────────── 02 ─────────────────────────────
// 방정식과 부등식의 해의 개수
// 꼴 0 (기본·대표): ax+by+cz=N 의 음이 아닌 정수해(또는 자연수해) — 계수가 가장 큰 문자로 나누기
// 꼴 1 (응용): x+py≤N 의 자연수해 · p≤x+y≤q 의 음이 아닌 정수해
// 꼴 2 (심화하): 값이 다른 세 물건을 각각 적어도 하나씩 사서 모두 T원 — 자연수해

const VARS = ["x", "y", "z"] as const;

/** 음이 아닌(lo=0) 또는 자연수(lo=1) u, v 로 cu·u + cv·v = R 을 푸는 순서쌍. */
function pairsOf(cu: number, cv: number, R: number, lo: number): number[][] {
  const out: number[][] = [];
  for (let u = lo; cu * u <= R - cv * lo; u += 1) {
    const rest = R - cu * u;
    if (rest % cv === 0 && rest / cv >= lo) out.push([u, rest / cv]);
  }
  return out;
}

/** 물건 이름 · 이/가 · 을/를 — 한글 낱말 뒤 조사는 손으로 적는다(수식 뒤가 아니다). */
const PRICED_ITEMS: readonly (readonly [string, string, string])[] = [
  ["연필", "이", "을"],
  ["사탕", "이", "을"],
  ["스티커", "가", "를"],
  ["공책", "이", "을"],
];

function t02(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const kind = randInt(rng, 0, 1);
      const lo = kind === 0 ? 0 : 1;
      const coefs = distinctInts(rng, 1, 6, 3);
      const N = randInt(rng, 8, 24);
      const big = coefs.indexOf(Math.max(...coefs));
      const others = [0, 1, 2].filter((i) => i !== big) as [number, number];
      const [iu, iv] = others;
      const cb = coefs[big]!;
      const cu = coefs[iu]!;
      const cv = coefs[iv]!;
      const tMax = Math.floor((N - lo * (cu + cv)) / cb);
      if (tMax < lo + 1) return null;
      const cases: { t: number; R: number; pairs: number[][] }[] = [];
      for (let t = lo; t <= tMax; t += 1) {
        const R = N - cb * t;
        const pairs = pairsOf(cu, cv, R, lo);
        if (pairs.length === 0 || pairs.length > 5) return null;
        cases.push({ t, R, pairs });
      }
      const counts = cases.map((c) => c.pairs.length);
      const ans = sum(counts);
      if (ans < 3 || ans > 10) return null;
      const eq = `${coefTerm(coefs[0]!, "x")}+${coefTerm(coefs[1]!, "y")}+${coefTerm(coefs[2]!, "z")}=${N}`;
      const B = VARS[big]!;
      const U = VARS[iu]!;
      const V = VARS[iv]!;
      const pairName = `(${U}, ${V})`;
      return {
        content: `방정식 $${eq}$${eul(eq)} 만족시키는 ${kind === 0 ? "음이 아닌 정수" : "자연수"} $x$, $y$, $z$의 순서쌍 $(x, y, z)$의 개수를 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `계수가 가장 큰 $${B}$의 값을 기준으로 나누어 생각한다.`,
          ...cases.map(
            (c) =>
              `$${B}=${c.t}$일 때, $${coefTerm(cu, U)}+${coefTerm(cv, V)}=${c.R}$이므로 순서쌍 $${pairName}$${eun(pairName)} $${tuplesTex(c.pairs)}$의 $${c.pairs.length}$개`,
          ),
          `이상에서 구하는 순서쌍의 개수는 $${sumTex(counts)}=${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, kind, a: coefs[0]!, b: coefs[1]!, c: coefs[2]!, N },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const kind = randInt(rng, 0, 1);
      if (kind === 0) {
        const p = randInt(rng, 2, 4);
        const N = randInt(rng, 5, 14);
        const yMax = Math.floor((N - 1) / p);
        if (yMax < 2) return null;
        const counts = Array.from({ length: yMax }, (_, i) => N - p * (i + 1));
        const ans = sum(counts);
        if (ans > 24) return null;
        const ineq = `x+${p}y\\le ${N}`;
        return {
          content: `부등식 $${ineq}$${eul(ineq)} 만족시키는 자연수 $x$, $y$의 순서쌍 $(x, y)$의 개수를 구하시오.`,
          answer: numAnswer(ans),
          solution: [
            ...counts.map(
              (c, i) =>
                `$y=${i + 1}$일 때, $x\\le ${c}$이므로 순서쌍 $(x, y)$${ga("(x, y)")} $${c}$개`,
            ),
            `$y\\ge ${yMax + 1}$이면 $x\\le ${N - p * (yMax + 1)}$이므로 자연수 $x$${ga("x")} 없다.`,
            `이상에서 구하는 순서쌍의 개수는 $${sumTex(counts)}=${ans}$`,
          ].join("\n"),
          difficulty: "응용",
          facts: { mode, kind, p, N },
        };
      }
      const p = randInt(rng, 1, 3);
      const q = p + randInt(rng, 2, 4);
      const ss = Array.from({ length: q - p + 1 }, (_, i) => p + i);
      const counts = ss.map((s) => s + 1);
      const ans = sum(counts);
      const pairList = (s: number): string =>
        s <= 3
          ? tuplesTex(Array.from({ length: s + 1 }, (_, i) => [i, s - i]))
          : `(0, ${s}), (1, ${s - 1}), \\cdots, (${s}, 0)`;
      const ineq = `${p}\\le x+y\\le ${q}`;
      return {
        content: `부등식 $${ineq}$${eul(ineq)} 만족시키는 음이 아닌 정수 $x$, $y$의 순서쌍 $(x, y)$의 개수를 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `$x$, $y$${ga("y")} 음이 아닌 정수이므로 $x+y$의 값은 $${ss.join(", ")}$ 중 하나이다.`,
          ...ss.map(
            (s) =>
              `$x+y=${s}$일 때, 순서쌍 $(x, y)$${eun("(x, y)")} $${pairList(s)}$의 $${s + 1}$개`,
          ),
          `이상에서 구하는 순서쌍의 개수는 $${sumTex(counts)}=${ans}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, kind, p, q },
      };
    });
  return attempt<Body>((): Body | null => {
    const u = pickOne(rng, [100, 200, 300, 500]);
    const [p, q] = pickOne(rng, [
      [2, 4],
      [2, 5],
      [3, 5],
      [2, 3],
      [3, 4],
      [2, 6],
      [3, 6],
    ] as const);
    const M = p + q + randInt(rng, 3, 14);
    const zMax = Math.floor((M - 1 - p) / q);
    if (zMax < 2) return null;
    const cases: { z: number; R: number; pairs: number[][] }[] = [];
    for (let z = 1; z <= zMax; z += 1) {
      const R = M - q * z;
      const pairs = pairsOf(1, p, R, 1);
      if (pairs.length === 0 || pairs.length > 5) return null;
      cases.push({ z, R, pairs });
    }
    const counts = cases.map((c) => c.pairs.length);
    const ans = sum(counts);
    if (ans < 3 || ans > 12) return null;
    const [item, iga, ieul] = pickOne(rng, PRICED_ITEMS);
    return {
      content: `한 개에 각각 $${u}$원, $${p * u}$원, $${q * u}$원인 세 종류의 ${item}${iga} 있다. 세 종류의 ${item}${ieul} 각각 적어도 한 개씩 포함하여 모두 $${u * M}$원어치를 사는 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `$${u}$원, $${p * u}$원, $${q * u}$원인 ${item}${ieul} 각각 $x$개, $y$개, $z$개 산다고 하면`,
        `$${u}x+${p * u}y+${q * u}z=${u * M}$, 즉 $x+${p}y+${q}z=${M}$ (단, $x$, $y$, $z$${eun("z")} 자연수)`,
        ...cases.map(
          (c) =>
            `$z=${c.z}$일 때, $x+${p}y=${c.R}$이므로 순서쌍 $(x, y)$${eun("(x, y)")} $${tuplesTex(c.pairs)}$의 $${c.pairs.length}$개`,
        ),
        `이상에서 구하는 경우의 수는 $${sumTex(counts)}=${ans}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, u, p, q, M },
    };
  });
}

// ───────────────────────────── 03 ─────────────────────────────
// 곱의 법칙
// 꼴 0 (기본·대표): 자리마다 조건이 있는 세 자리 자연수 — 자리별 가짓수의 곱
// 꼴 1 (기본): 곱으로 된 다항식을 전개했을 때 항의 개수
// 꼴 2 (응용): 다면체 주사위 여러 개의 곱이 짝수 · 3의 배수 — 전체에서 여사건 빼기

/** 자리 숫자 조건 — 라벨과 원소(0 이 아닌 숫자). */
const DIGIT_CLASSES: readonly (readonly [string, readonly number[]])[] = [
  ["소수", [2, 3, 5, 7]],
  ["$3$의 배수", [3, 6, 9]],
  ["홀수", [1, 3, 5, 7, 9]],
  ["짝수", [2, 4, 6, 8]],
  ["$8$의 약수", [1, 2, 4, 8]],
  ["$6$의 약수", [1, 2, 3, 6]],
  ["$9$의 약수", [1, 3, 9]],
];

const LETTER_POOLS = [
  ["a", "b", "c", "d", "e"],
  ["p", "q", "r", "s", "t"],
  ["x", "y", "z", "u", "v"],
] as const;

const POLYHEDRA: readonly (readonly [number, string])[] = [
  [4, "정사면체"],
  [6, "정육면체"],
  [8, "정팔면체"],
  [12, "정십이면체"],
];

function t03(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0) {
    const [h, t] = distinctInts(rng, 0, DIGIT_CLASSES.length - 1, 2) as [
      number,
      number,
    ];
    const odd = randInt(rng, 0, 1);
    const [hl, hs] = DIGIT_CLASSES[h]!;
    const [tl, ts] = DIGIT_CLASSES[t]!;
    const os = odd === 1 ? [1, 3, 5, 7, 9] : [2, 4, 6, 8];
    const ans = hs.length * ts.length * os.length;
    return {
      content: `백의 자리의 숫자는 ${hl}이고 십의 자리의 숫자는 ${tl}인 세 자리 자연수 중에서 ${odd === 1 ? "홀수" : "짝수"}의 개수를 구하시오. (단, 각 자리의 숫자는 $0$이 아니다.)`,
      answer: numAnswer(ans),
      solution: [
        `백의 자리의 숫자가 될 수 있는 것은 ${listTex(hs)}의 $${hs.length}$개`,
        `십의 자리의 숫자가 될 수 있는 것은 ${listTex(ts)}의 $${ts.length}$개`,
        `${odd === 1 ? "홀수" : "짝수"}이므로 일의 자리의 숫자가 될 수 있는 것은 ${listTex(os)}의 $${os.length}$개`,
        `따라서 구하는 자연수의 개수는 $${timesTex([hs.length, ts.length, os.length])}=${ans}$`,
      ].join("\n"),
      difficulty: "기본",
      facts: { mode, h, t, odd },
    };
  }
  if (mode === 1) {
    const three = randInt(rng, 0, 1) === 1;
    const k = three ? 3 : 2;
    const sizes = Array.from({ length: k }, () =>
      randInt(rng, 2, three ? 4 : 5),
    );
    const order = distinctInts(rng, 0, 2, k);
    const factors = sizes.map(
      (s, i) => `(${LETTER_POOLS[order[i]!]!.slice(0, s).join("+")})`,
    );
    const expr = factors.join("");
    const ans = sizes.reduce((a, b) => a * b, 1);
    return {
      content: `$${expr}$${eul(expr)} 전개하였을 때, 항의 개수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `${factors.map((f) => `$${f}$`).join(", ")}에서 각각 항을 하나씩 택하여 곱하면 문자가 서로 다르므로 모두 서로 다른 항이 된다.`,
        `따라서 항의 개수는 $${timesTex(sizes)}=${ans}$`,
      ].join("\n"),
      difficulty: "기본",
      facts: { mode, s1: sizes[0]!, s2: sizes[1]!, s3: sizes[2] ?? 0 },
    };
  }
  const kind = randInt(rng, 0, 1);
  const [f, name] = pickOne(rng, POLYHEDRA);
  const m = f === 12 ? 2 : randInt(rng, 2, 3);
  const bad = kind === 0 ? f / 2 : f - Math.floor(f / 3);
  const total = f ** m;
  const miss = bad ** m;
  const ans = total - miss;
  const want = kind === 0 ? "짝수" : "$3$의 배수";
  return {
    content: `각 면에 $1$부터 $${f}$까지의 자연수가 하나씩 적힌 ${name} 모양의 서로 다른 주사위 $${m}$개를 동시에 던질 때, 나오는 수의 곱이 ${want}인 경우의 수를 구하시오.`,
    answer: numAnswer(ans),
    solution: [
      `전체 경우의 수는 $${timesTex(Array.from({ length: m }, () => f))}=${total}$`,
      kind === 0
        ? `나오는 수의 곱이 홀수인 경우는 모든 주사위에서 홀수가 나오는 경우이므로 $${timesTex(Array.from({ length: m }, () => bad))}=${miss}$`
        : `나오는 수의 곱이 $3$의 배수가 아닌 경우는 모든 주사위에서 $3$의 배수가 아닌 수가 나오는 경우이므로 $${timesTex(Array.from({ length: m }, () => bad))}=${miss}$`,
      `따라서 구하는 경우의 수는 $${total}-${miss}=${ans}$`,
    ].join("\n"),
    difficulty: "응용",
    facts: { mode, kind, f, m },
  };
}

// ───────────────────────────── 04 ─────────────────────────────
// 약수의 개수
// 꼴 0 (기본·대표): 두 수의 양의 공약수의 개수(= 최대공약수의 약수) · 한 수의 양의 약수의 개수
// 꼴 1 (응용): 양의 약수의 개수와 총합을 함께
// 꼴 2 (응용): 양의 약수 중 짝수 · 홀수 · k 의 배수의 개수
// 꼴 3 (심화하): mⁿ 의 양의 약수의 개수가 K 일 때 n

function smoothNumber(rng: Rng, lo: number, hi: number): number | null {
  const n =
    2 ** randInt(rng, 0, 5) *
    3 ** randInt(rng, 0, 3) *
    5 ** randInt(rng, 0, 2) *
    7 ** randInt(rng, 0, 1);
  if (n < lo || n > hi || primeFactors(n).length < 2) return null;
  return n;
}

const SQUAREFREE_BASES = [6, 10, 14, 15, 21, 22, 35];
const SQUARE_TIMES_PRIME_BASES = [12, 18, 20, 28, 45, 50, 75];

function t04(rng: Rng): Body {
  const mode = randInt(rng, 0, 3);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const kind = randInt(rng, 0, 2) === 0 ? 0 : 1;
      if (kind === 0) {
        const N = smoothNumber(rng, 60, 1000);
        if (N === null || divisorCount(N) < 8) return null;
        const ans = divisorCount(N);
        return {
          content: `$${N}$의 양의 약수의 개수를 구하시오.`,
          answer: numAnswer(ans),
          solution: [
            `$${N}$${eul(String(N))} 소인수분해하면 $${N}=${primeTex(N)}$`,
            `따라서 $${N}$의 양의 약수의 개수는 $${divisorCountTex(N)}=${ans}$`,
          ].join("\n"),
          difficulty: "기본",
          facts: { mode, kind, N },
        };
      }
      const G = smoothNumber(rng, 6, 200) ?? pickOne(rng, [12, 18, 20, 24, 30]);
      const [x, y] = distinctInts(rng, 2, 9, 2) as [number, number];
      if (gcd(x, y) !== 1) return null;
      const A = G * Math.min(x, y);
      const B = G * Math.max(x, y);
      if (B > 1000 || divisorCount(G) < 4) return null;
      const ans = divisorCount(G);
      return {
        content: `$${A}$${gwa(String(A))} $${B}$의 양의 공약수의 개수를 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `$${A}=${primeTex(A)}$, $${B}=${primeTex(B)}$이므로 $${A}$${gwa(String(A))} $${B}$의 최대공약수는 $${primeTex(G)}$`,
          `두 수의 공약수는 최대공약수의 약수이므로 구하는 개수는 $${divisorCountTex(G)}=${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, kind, A, B },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const kind = randInt(rng, 0, 1);
      const N = smoothNumber(rng, 20, 300);
      if (N === null || primeFactors(N).length !== 2) return null;
      const fs = primeFactors(N);
      const x = divisorCount(N);
      const parts = fs.map(([p, e]) =>
        Array.from({ length: e + 1 }, (_, i) =>
          i === 0 ? 1 : i === 1 ? p : p ** i,
        ).reduce((s, v) => s + v, 0),
      );
      const sigmaTex = timesTex(
        fs.map(
          ([p, e]) =>
            `(${Array.from({ length: e + 1 }, (_, i) =>
              i === 0 ? "1" : i === 1 ? `${p}` : `${p}^{${i}}`,
            ).join("+")})`,
        ),
      );
      const y = parts.reduce((a, b) => a * b, 1);
      const ans = kind === 0 ? x + y : y - x;
      const expr = kind === 0 ? "x+y" : "y-x";
      return {
        content: `$${N}$의 양의 약수의 개수를 $x$, 양의 약수의 총합을 $y$${ira("y")} 할 때, $${expr}$의 값을 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `$${N}=${primeTex(N)}$이므로`,
          `양의 약수의 개수는 $x=${divisorCountTex(N)}=${x}$`,
          `양의 약수의 총합은 $y=${sigmaTex}=${timesTex(parts)}=${y}$`,
          `따라서 $${expr}=${ans}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, kind, N },
      };
    });
  if (mode === 2)
    return attempt<Body>((): Body | null => {
      const N =
        2 ** randInt(rng, 1, 4) *
        3 ** randInt(rng, 0, 3) *
        5 ** randInt(rng, 0, 2);
      if (N < 60 || N > 1000 || primeFactors(N).length < 2) return null;
      const kind = randInt(rng, 0, 2);
      const head = `$${N}=${primeTex(N)}$`;
      if (kind === 0) {
        const M = N / 2;
        const ans = divisorCount(M);
        return {
          content: `$${N}$의 양의 약수 중에서 짝수의 개수를 구하시오.`,
          answer: numAnswer(ans),
          solution: [
            head,
            `짝수인 약수는 $${M}$의 양의 약수에 각각 $2$를 곱한 것이므로 그 개수는 $${M}=${primeTex(M)}$의 양의 약수의 개수와 같다.`,
            `따라서 구하는 개수는 $${divisorCountTex(M)}=${ans}$`,
          ].join("\n"),
          difficulty: "응용",
          facts: { mode, kind, N, k: 2 },
        };
      }
      if (kind === 1) {
        let M = N;
        while (M % 2 === 0) M /= 2;
        const ans = divisorCount(M);
        if (ans < 2) return null;
        return {
          content: `$${N}$의 양의 약수 중에서 홀수의 개수를 구하시오.`,
          answer: numAnswer(ans),
          solution: [
            head,
            `홀수인 약수는 소인수 $2$를 갖지 않으므로 그 개수는 $${M}=${primeTex(M)}$의 양의 약수의 개수와 같다.`,
            `따라서 구하는 개수는 $${divisorCountTex(M)}=${ans}$`,
          ].join("\n"),
          difficulty: "응용",
          facts: { mode, kind, N, k: 0 },
        };
      }
      const k = pickOne(
        rng,
        [3, 5, 6, 10, 15].filter((d) => N % d === 0),
      );
      if (k === undefined || N / k < 4) return null;
      const M = N / k;
      const ans = divisorCount(M);
      return {
        content: `$${N}$의 양의 약수 중에서 $${k}$의 배수의 개수를 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          head,
          `$${k}$의 배수인 약수는 $${M}$의 양의 약수에 각각 $${k}$${eul(String(k))} 곱한 것이므로 그 개수는 $${M}=${primeTex(M)}$의 양의 약수의 개수와 같다.`,
          `따라서 구하는 개수는 $${divisorCountTex(M)}=${ans}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, kind, N, k },
      };
    });
  const squarefree = randInt(rng, 0, 1) === 0;
  const m = pickOne(
    rng,
    squarefree ? SQUAREFREE_BASES : SQUARE_TIMES_PRIME_BASES,
  );
  const n = randInt(rng, 2, 7);
  const fs = primeFactors(m);
  const baseTex = timesTex(
    fs.map(([p, e]) => (e === 1 ? `${p}` : `${p}^{${e}}`)),
  );
  const powTex = timesTex(
    fs.map(([p, e]) => `${p}^{${e === 1 ? "n" : `${e}n`}}`),
  );
  const K = fs.reduce((s, [, e]) => s * (e * n + 1), 1);
  const lines = [`$${m}^{n}=(${baseTex})^{n}=${powTex}$이므로`];
  if (squarefree) {
    lines.push(
      `$${m}^{n}$의 양의 약수의 개수는 $(n+1)(n+1)=(n+1)^{2}$`,
      `$(n+1)^{2}=${K}$이고 $n$은 자연수이므로 $n+1=${n + 1}$`,
      `따라서 $n=${n}$`,
    );
  } else {
    const [e1, e2] = fs.map(([, e]) => e) as [number, number];
    const A = e1 * e2;
    const Bc = e1 + e2;
    const f1 = e1 === 1 ? "n+1" : `${e1}n+1`;
    const f2 = e2 === 1 ? "n+1" : `${e2}n+1`;
    lines.push(
      `$${m}^{n}$의 양의 약수의 개수는 $(${f1})(${f2})$`,
      `$(${f1})(${f2})=${K}$에서 $${A}n^{2}+${Bc}n-${K - 1}=0$`,
      `$(n-${n})(${A}n+${A * n + Bc})=0$`,
      `$n$은 자연수이므로 $n=${n}$`,
    );
  }
  return {
    content: `$${m}^{n}$의 양의 약수의 개수가 $${K}$일 때, 자연수 $n$의 값을 구하시오.`,
    answer: numAnswer(n),
    solution: lines.join("\n"),
    difficulty: "심화하",
    facts: { mode, m, n },
  };
}

// ───────────────────────────── 등록 ─────────────────────────────

function entry(
  number: string,
  title: string,
  unitSection: string,
  make: (rng: Rng) => Body,
): HighTypeEntry {
  const meta = {
    grade: GRADE,
    unitSection,
    rpmBook: BOOK,
    rpmMinor: MINOR,
    rpmType: number,
    rpmTitle: title,
  };
  return {
    key: `${BOOK}|${MINOR}|${number}`,
    ...meta,
    handler: (rng: Rng): HighProblem => ({ ...meta, ...make(rng) }),
  };
}

/** 번호·제목은 `scripts/rpm/rpm-high-type-catalog.json` 의 **바이트 그대로**다(시험이 대조한다). */
export const H1_PERM: HighTypeEntry[] = [
  entry("01", "합의 법칙", SEC.경우의수, t01),
  entry("02", "방정식과 부등식의 해의 개수", SEC.경우의수, t02),
  entry("03", "곱의 법칙", SEC.경우의수, t03),
  entry("04", "약수의 개수", SEC.경우의수, t04),
];

const WIP =
  "작업 중 — 세션 h1-count 가 이 물결 안에 채운다(병합 전에 비어야 한다)";

export const H1_PERM_HOLD: HighHold[] = [
  ...["05", "06", "07", "09", "10", "11", "12", "13", "14"].map((n) => ({
    key: `${BOOK}|${MINOR}|${n}`,
    reason: WIP,
  })),
  {
    key: `${BOOK}|${MINOR}|08`,
    reason:
      "영역 지도 그림 필요 — 어느 영역이 서로 인접하는지가 그림으로만 정해진다. 중등 `m2Shade.ts` 의 FigureSpec v2 채색 축을 고등 적재·미리보기가 싣는지 확인한 뒤(물결 2) 등록",
  },
];
