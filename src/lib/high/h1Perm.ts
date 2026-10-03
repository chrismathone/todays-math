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

// ───────────────────────────── 05 ─────────────────────────────
// 수형도를 이용하는 경우의 수
// 꼴 0 (기본·대표): 네 사람(네 숫자) 모두 자기 것이 아닌 것 — 나열해서 센다
// 꼴 1 (응용): 한 사람은 정해진 남의 것, 나머지는 모두 자기 것이 아닌 것
// 꼴 2 (응용): 한 사람만 자기 것 — 그 사람을 정하고 나머지를 나열

const PEOPLE = ["A", "B", "C", "D", "E"] as const;
const GOODS = ["a", "b", "c", "d", "e"] as const;

/** 사람·물건 수를 세는 우리말 — 「네 사람」. 아라비아 숫자로 쓰지 않는다. */
export const NUM_WORD: Readonly<Record<number, string>> = {
  2: "두",
  3: "세",
  4: "네",
  5: "다섯",
  6: "여섯",
  7: "일곱",
  8: "여덟",
  9: "아홉",
  10: "열",
};

/** 0..n-1 의 순열 전부(사전식) — 수형도의 가지를 그대로 늘어놓은 것. */
export function permutationsOf(n: number): number[][] {
  const out: number[][] = [];
  const cur: number[] = [];
  const used = new Array<boolean>(n).fill(false);
  const go = (): void => {
    if (cur.length === n) {
      out.push([...cur]);
      return;
    }
    for (let i = 0; i < n; i += 1) {
      if (used[i]) continue;
      used[i] = true;
      cur.push(i);
      go();
      cur.pop();
      used[i] = false;
    }
  };
  go();
  return out;
}

/** 바꾸어 가지는 상황 — 한글 낱말 뒤 조사는 손으로 적는다(수식 뒤가 아니다). */
const SWAP_CTX = [
  {
    intro: "각자 선물을 하나씩 가지고 와서 서로 바꾸어 가지기로 하였다.",
    item: "선물",
    brought: "가져온 선물",
    own: "자신이 가져온 선물",
    get: "가지",
  },
  {
    intro: "각자 우산을 하나씩 맡겨 두었다가 한 개씩 임의로 찾아가려고 한다.",
    item: "우산",
    brought: "맡긴 우산",
    own: "자신의 우산",
    get: "찾아가",
  },
] as const;

/** `(b, a, d, c)` — 사람 순서대로 가지는 물건. */
function goodsTuple(p: readonly number[]): string {
  return `(${p.map((i) => GOODS[i]!).join(", ")})`;
}

function t05(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0) {
    const ctx = randInt(rng, 0, SWAP_CTX.length);
    const n = 4;
    const all = permutationsOf(n).filter((p) => p.every((v, i) => v !== i));
    const firsts = [...new Set(all.map((p) => p[0]!))];
    const groups = firsts.map((f) => all.filter((p) => p[0] === f));
    const counts = groups.map((g) => g.length);
    const ans = all.length;
    if (ctx === SWAP_CTX.length) {
      const digits = (p: readonly number[]): string =>
        p.map((i) => i + 1).join("");
      return {
        content: `네 개의 숫자 $1$, $2$, $3$, $4$를 모두 한 번씩 사용하여 네 자리 자연수를 만들 때, 천의 자리의 숫자는 $1$이 아니고 백의 자리의 숫자는 $2$가 아니고 십의 자리의 숫자는 $3$이 아니고 일의 자리의 숫자는 $4$가 아닌 자연수의 개수를 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `천의 자리의 숫자로 나누어 조건에 맞는 자연수를 모두 나열하면`,
          ...groups.map(
            (g, i) =>
              `천의 자리의 숫자가 $${firsts[i]! + 1}$인 경우: $${g.map(digits).join(", ")}$의 $${g.length}$가지`,
          ),
          `따라서 구하는 자연수의 개수는 $${sumTex(counts)}=${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, ctx, n },
      };
    }
    const c = SWAP_CTX[ctx]!;
    const who = PEOPLE.slice(0, n).join(", ");
    const word = NUM_WORD[n]!;
    const goods = GOODS.slice(0, n)
      .map((g) => `$${g}$`)
      .join(", ");
    return {
      content: `${who} ${word} 사람이 ${c.intro} ${word} 사람 모두 ${c.own}이 아닌 ${c.item}을 ${c.get}는 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `${who}${ga(PEOPLE[n - 1]!)} ${c.brought}을 각각 ${goods}${ira(GOODS[n - 1]!)} 하고, ${who}${ga(PEOPLE[n - 1]!)} ${c.get}는 ${c.item}을 차례로 나열하면`,
        ...groups.map(
          (g, i) =>
            `A가 $${GOODS[firsts[i]!]!}$${eul(GOODS[firsts[i]!]!)} ${c.get}는 경우: $${g.map(goodsTuple).join(", ")}$의 $${g.length}$가지`,
        ),
        `따라서 구하는 경우의 수는 $${sumTex(counts)}=${ans}$`,
      ].join("\n"),
      difficulty: "기본",
      facts: { mode, ctx, n },
    };
  }
  const ctx = randInt(rng, 0, SWAP_CTX.length - 1);
  const c = SWAP_CTX[ctx]!;
  const n = pickOne(rng, [4, 5]);
  const who = PEOPLE.slice(0, n).join(", ");
  const word = NUM_WORD[n]!;
  const goods = GOODS.slice(0, n)
    .map((g) => `$${g}$`)
    .join(", ");
  const naming = `${who}${ga(PEOPLE[n - 1]!)} ${c.brought}을 각각 ${goods}${ira(GOODS[n - 1]!)} 하면`;
  if (mode === 1) {
    const t = randInt(rng, 1, n - 1);
    const T = PEOPLE[t]!;
    const all = permutationsOf(n).filter(
      (p) => p[0] === t && p.every((v, i) => i === 0 || v !== i),
    );
    const seconds = [...new Set(all.map((p) => p[1]!))];
    const groups = seconds.map((s) => all.filter((p) => p[1] === s));
    const counts = groups.map((g) => g.length);
    const ans = all.length;
    const rest = PEOPLE.slice(1, n).join(", ");
    return {
      content: `${who} ${word} 사람이 ${c.intro} A는 ${T}${ga(T)} ${c.brought}을 ${c.get}고, 나머지 ${NUM_WORD[n - 1]!} 사람은 모두 ${c.own}이 아닌 ${c.item}을 ${c.get}는 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `${naming} A가 ${c.get}는 ${c.item}은 $${GOODS[t]!}$이다.`,
        `${rest}${ga(PEOPLE[n - 1]!)} ${c.get}는 ${c.item}을 차례로 나열하면`,
        ...groups.map(
          (g, i) =>
            `B가 $${GOODS[seconds[i]!]!}$${eul(GOODS[seconds[i]!]!)} ${c.get}는 경우: $${g.map((p) => goodsTuple(p.slice(1))).join(", ")}$의 $${g.length}$가지`,
        ),
        `따라서 구하는 경우의 수는 $${sumTex(counts)}=${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, ctx, n, t },
    };
  }
  const sub = permutationsOf(n - 1).filter((p) => p.every((v, i) => v !== i));
  const shifted = sub.map((p) => [0, ...p.map((v) => v + 1)]);
  const ans = n * sub.length;
  const rest = PEOPLE.slice(1, n).join(", ");
  return {
    content: `${who} ${word} 사람이 ${c.intro} 이 중에서 한 사람만 ${c.own}을 ${c.get}는 경우의 수를 구하시오.`,
    answer: numAnswer(ans),
    solution: [
      `${c.own}을 ${c.get}는 한 사람을 정하는 경우의 수는 $${n}$`,
      `이를테면 A만 ${c.own}을 ${c.get}는 경우, ${naming} 나머지 ${rest}${ga(PEOPLE[n - 1]!)} ${c.get}는 ${c.item}을 차례로 나열하면`,
      `$${shifted.map((p) => goodsTuple(p.slice(1))).join(", ")}$의 $${sub.length}$가지`,
      `따라서 구하는 경우의 수는 $${n}\\times ${sub.length}=${ans}$`,
    ].join("\n"),
    difficulty: "응용",
    facts: { mode, ctx, n },
  };
}

// ───────────────────────────── 06 ─────────────────────────────
// 지불 방법의 수와 지불 금액의 수
// 꼴 0 (기본·대표): 지불하는 방법의 수 (l+1)(m+1)(n+1)−1
// 꼴 1 (응용): 지불할 수 있는 금액의 수 — 큰 단위를 작은 단위로 바꾸어 겹침을 없앤다
// 꼴 2 (심화하): 방법의 수와 금액의 수를 함께(a−b · a+b)

/** 세 단위(작은 것부터). */
const PAY_FAMILIES: readonly (readonly [number, number, number])[] = [
  [10, 50, 100],
  [50, 100, 500],
  [1000, 5000, 10000],
];
/** 큰 것 = 가운데 × 2, 가운데 = 작은 것 × 5 — 작은 것이 넷 이하면 가운데와 안 겹친다. */
const OVERLAP_FAMILIES: readonly (readonly [number, number, number])[] = [
  [10, 50, 100],
  [100, 500, 1000],
];

function moneyTex(v: number, cnt: number): string {
  return v >= 1000
    ? `$${v}$원짜리 지폐 $${cnt}$장`
    : `$${v}$원짜리 동전 $${cnt}$개`;
}

/** 「지폐로」·「동전으로」 — 한글 낱말 뒤 조사. */
function moneyRo(v: number): string {
  return v >= 1000 ? "지폐로" : "동전으로";
}

function moneyUnit(v: number): string {
  return v >= 1000 ? "장" : "개";
}

type Pay = {
  S: number;
  M: number;
  L: number;
  a: number;
  b: number;
  c: number;
  kind: number;
};

function drawPay(rng: Rng, kind: number): Pay | null {
  if (kind === 0) {
    const [S, M, L] = pickOne(rng, OVERLAP_FAMILIES);
    return {
      S,
      M,
      L,
      a: randInt(rng, 1, 4),
      b: randInt(rng, 1, 3),
      c: randInt(rng, 1, 3),
      kind,
    };
  }
  const a = randInt(rng, 4, 9);
  const b = randInt(rng, 1, 3);
  if (a + 5 * b < 9) return null;
  return { S: 1000, M: 5000, L: 10000, a, b, c: randInt(rng, 1, 3), kind };
}

/** 금액의 수 · 그 앞의 풀이 줄들 · 끝줄에 쓸 셈(수식 몸통). */
function payAmounts(p: Pay): { count: number; lines: string[]; expr: string } {
  if (p.kind === 0) {
    const mids = p.b + 2 * p.c;
    const count = (mids + 1) * (p.a + 1) - 1;
    return {
      count,
      lines: [
        `$${p.L}$원짜리 ${p.L >= 1000 ? "지폐" : "동전"} $${p.c}$${moneyUnit(p.L)}${p.L >= 1000 ? "을" : "를"} $${p.M}$원짜리 동전 $${2 * p.c}$개로 바꾸어 생각하면 $${p.M}$원짜리 동전 $${mids}$개와 $${p.S}$원짜리 동전 $${p.a}$개로 지불할 수 있는 금액의 수와 같다.`,
        `$${p.S}$원짜리 동전 $${p.a}$개로는 $${p.M}$원을 만들 수 없으므로 지불하는 금액이 서로 겹치지 않는다.`,
      ],
      expr: `${mids + 1}\\times ${p.a + 1}-1=${count}`,
    };
  }
  const count = p.a + 5 * p.b + 10 * p.c;
  return {
    count,
    lines: [
      `$10000$원짜리 지폐 $${p.c}$장과 $5000$원짜리 지폐 $${p.b}$장을 모두 $1000$원짜리 지폐로 바꾸면 $1000$원짜리 지폐가 $${10 * p.c}+${5 * p.b}+${p.a}=${count}$장이 된다.`,
      `$1000$원짜리 지폐가 $${p.a}$장 있으므로 $1000$원부터 $${1000 * count}$원까지 $1000$원 단위의 금액을 모두 지불할 수 있다.`,
    ],
    expr: `${count}`,
  };
}

function t06(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0) {
    const [S, M, L] = pickOne(rng, PAY_FAMILIES);
    const a = randInt(rng, 1, 5);
    const b = randInt(rng, 1, 5);
    const c = randInt(rng, 1, 5);
    const ans = (a + 1) * (b + 1) * (c + 1) - 1;
    const ways = (v: number, n: number): string =>
      `$${v}$원짜리 ${moneyRo(v)} 지불하는 방법은 $0$${moneyUnit(v)}부터 $${n}$${moneyUnit(v)}까지 $${n + 1}$가지`;
    return {
      content: `${moneyTex(L, c)}, ${moneyTex(M, b)}, ${moneyTex(S, a)}의 일부 또는 전부를 사용하여 지불하는 방법의 수를 구하시오. (단, $0$원을 지불하는 경우는 제외한다.)`,
      answer: numAnswer(ans),
      solution: [
        ways(L, c),
        ways(M, b),
        ways(S, a),
        `이때 $0$원을 지불하는 경우를 빼면 구하는 방법의 수는 $${timesTex([c + 1, b + 1, a + 1])}-1=${ans}$`,
      ].join("\n"),
      difficulty: "기본",
      facts: { mode, kind: 0, s: S, m: M, l: L, a, b, c },
    };
  }
  return attempt<Body>((): Body | null => {
    const kind = randInt(rng, 0, 1);
    const p = drawPay(rng, kind);
    if (p === null) return null;
    const list = `${moneyTex(p.L, p.c)}, ${moneyTex(p.M, p.b)}, ${moneyTex(p.S, p.a)}`;
    const facts = {
      mode,
      kind,
      s: p.S,
      m: p.M,
      l: p.L,
      a: p.a,
      b: p.b,
      c: p.c,
    };
    if (mode === 1) {
      const { count, lines, expr } = payAmounts(p);
      return {
        content: `${list}의 일부 또는 전부를 사용하여 지불할 수 있는 금액의 수를 구하시오. (단, $0$원을 지불하는 경우는 제외한다.)`,
        answer: numAnswer(count),
        solution: [...lines, `따라서 구하는 금액의 수는 $${expr}$`].join("\n"),
        difficulty: "응용",
        facts,
      };
    }
    const ask = randInt(rng, 0, 1);
    const A = (p.a + 1) * (p.b + 1) * (p.c + 1) - 1;
    const { count: B, lines, expr: bExpr } = payAmounts(p);
    const ans = ask === 0 ? A - B : A + B;
    const expr = ask === 0 ? "a-b" : "a+b";
    return {
      content: `${list}의 일부 또는 전부를 사용하여 지불하는 방법의 수를 $a$, 지불할 수 있는 금액의 수를 $b$${ira("b")} 할 때, $${expr}$의 값을 구하시오. (단, $0$원을 지불하는 경우는 제외한다.)`,
      answer: numAnswer(ans),
      solution: [
        `지불하는 방법의 수는 $a=${timesTex([p.c + 1, p.b + 1, p.a + 1])}-1=${A}$`,
        ...lines,
        `지불할 수 있는 금액의 수는 $b=${bExpr}$`,
        `따라서 $${expr}=${ans}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { ...facts, ask },
    };
  });
}

// ───────────────────────────── 07 ─────────────────────────────
// 도로망에서의 경우의 수 — 도로망은 「어느 두 지역 사이에 도로가 몇 개」로 글에 다 적는다
// 꼴 0 (기본·대표): B, C 를 모두 거쳐 D 로 — 두 갈래의 곱을 더한다
// 꼴 1 (응용): A 에서 D 로 가는 모든 길 — 네 갈래
// 꼴 2 (응용): A 에서 B 에 갔다가 A 로 돌아오기(A 말고는 다시 안 지난다)

function roadsTex(
  edges: readonly (readonly [string, string, number])[],
): string {
  return edges
    .map(([x, y, k]) => `${x}${gwa(x)} ${y}${eul(y)} 잇는 도로가 $${k}$개`)
    .join(", ");
}

function t07(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  const tail =
    mode === 2
      ? "(단, A 지역을 제외하고 한 번 지나간 지역은 다시 지나지 않는다.)"
      : "(단, 한 번 지나간 지역은 다시 지나지 않는다.)";
  if (mode === 2) {
    const ac = randInt(rng, 1, 3);
    const cb = randInt(rng, 1, 3);
    const bd = randInt(rng, 1, 3);
    const da = randInt(rng, 1, 3);
    const cd = randInt(rng, 1, 2);
    const x = ac * cb * bd * da;
    const y = da * bd * cb * ac;
    const ans = x + y;
    const roads = roadsTex([
      ["A", "C", ac],
      ["C", "B", cb],
      ["B", "D", bd],
      ["D", "A", da],
      ["C", "D", cd],
    ]);
    return {
      content: `네 지역 A, B, C, D 사이에 ${roads} 있고, 그 밖의 두 지역을 직접 잇는 도로는 없다. A 지역에서 출발하여 B 지역에 갔다가 다시 A 지역으로 돌아오는 경우의 수를 구하시오. ${tail}`,
      answer: numAnswer(ans),
      solution: [
        `A → C → B로 가면 C를 이미 지났으므로 B → D → A로 돌아와야 한다. 이 경우의 수는 $${timesTex([ac, cb, bd, da])}=${x}$`,
        `A → D → B로 가면 D를 이미 지났으므로 B → C → A로 돌아와야 한다. 이 경우의 수는 $${timesTex([da, bd, cb, ac])}=${y}$`,
        `A → C → D → B 또는 A → D → C → B로 가면 C, D를 모두 지났으므로 A로 돌아올 수 없다.`,
        `따라서 구하는 경우의 수는 $${x}+${y}=${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, ac, cb, bd, da, cd },
    };
  }
  const ab = randInt(rng, 1, 3);
  const bc = randInt(rng, 1, 3);
  const cd = randInt(rng, 1, 3);
  const ac = randInt(rng, 1, 2);
  const bd = randInt(rng, 1, 2);
  const roads = roadsTex([
    ["A", "B", ab],
    ["B", "C", bc],
    ["C", "D", cd],
    ["A", "C", ac],
    ["B", "D", bd],
  ]);
  const head = `네 지역 A, B, C, D 사이에 ${roads} 있고, 그 밖의 두 지역을 직접 잇는 도로는 없다.`;
  const abcd = ab * bc * cd;
  const acbd = ac * bc * bd;
  if (mode === 0) {
    const ans = abcd + acbd;
    return {
      content: `${head} A 지역에서 출발하여 B, C 두 지역을 모두 거쳐 D 지역에 도착하는 경우의 수를 구하시오. ${tail}`,
      answer: numAnswer(ans),
      solution: [
        `A → B → C → D로 가는 경우의 수는 $${timesTex([ab, bc, cd])}=${abcd}$`,
        `A → C → B → D로 가는 경우의 수는 $${timesTex([ac, bc, bd])}=${acbd}$`,
        `두 경우는 동시에 일어나지 않으므로 구하는 경우의 수는 $${abcd}+${acbd}=${ans}$`,
      ].join("\n"),
      difficulty: "기본",
      facts: { mode, ab, bc, cd, ac, bd },
    };
  }
  const abd = ab * bd;
  const acd = ac * cd;
  const ans = abd + acd + abcd + acbd;
  return {
    content: `${head} A 지역에서 출발하여 D 지역으로 가는 경우의 수를 구하시오. ${tail}`,
    answer: numAnswer(ans),
    solution: [
      `A → B → D로 가는 경우의 수는 $${timesTex([ab, bd])}=${abd}$`,
      `A → C → D로 가는 경우의 수는 $${timesTex([ac, cd])}=${acd}$`,
      `A → B → C → D로 가는 경우의 수는 $${timesTex([ab, bc, cd])}=${abcd}$`,
      `A → C → B → D로 가는 경우의 수는 $${timesTex([ac, bc, bd])}=${acbd}$`,
      `이상에서 구하는 경우의 수는 $${sumTex([abd, acd, abcd, acbd])}=${ans}$`,
    ].join("\n"),
    difficulty: "응용",
    facts: { mode, ab, bc, cd, ac, bd },
  };
}

// ───────────────────────────── 순열 공용 ─────────────────────────────

const LETTERS = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const BIG_PEOPLE = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;
const VOWEL_SET = new Set(["a", "e", "i", "o", "u"]);

/**
 * 문자가 모두 다른 영어 낱말 — 모음은 a·e·i·o·u(`y` 가 든 낱말은 모음인지 갈려서 뺐다).
 * RPM 이 쓴 낱말은 쓰지 않는다(소재를 새로 짓는다).
 */
const WORDS = [
  "planet",
  "castle",
  "garden",
  "orange",
  "friend",
  "number",
  "cousin",
  "silver",
  "winter",
  "flower",
  "bridge",
  "master",
  "painter",
  "kingdom",
  "journal",
  "blanket",
  "stadium",
  "monster",
  "chapter",
  "cabinet",
  "question",
  "computer",
  "magnetic",
  "hospital",
  "republic",
] as const;

type Word = {
  w: number;
  word: string;
  n: number;
  vowels: string[];
  cons: string[];
};

function wordInfo(w: number): Word {
  const word = WORDS[w]!;
  const letters = [...word];
  if (new Set(letters).size !== letters.length) {
    throw new Error(`문자가 겹치는 낱말입니다: ${word}`);
  }
  return {
    w,
    word,
    n: letters.length,
    vowels: letters.filter((c) => VOWEL_SET.has(c)),
    cons: letters.filter((c) => !VOWEL_SET.has(c)),
  };
}

/** 조건에 맞는 낱말 하나 — 없으면 던진다(표를 줄이다 조용히 비지 않게). */
function pickWord(rng: Rng, ok: (x: Word) => boolean): Word {
  const pool = WORDS.map((_, i) => wordInfo(i)).filter(ok);
  if (pool.length === 0) throw new Error("조건에 맞는 낱말이 없습니다");
  return pickOne(rng, pool);
}

/** `$a$, $b$, $c$` */
function mathList(xs: readonly string[]): string {
  return xs.map((x) => `$${x}$`).join(", ");
}

/** `$a$, $b$, $c$를` — 끝 글자에 맞춘 을/를까지. */
function mathListEul(xs: readonly string[]): string {
  return `${mathList(xs)}${eul(xs[xs.length - 1]!)}`;
}

/** 두 자리 · 세 자리 … — 아라비아 숫자로 쓰지 않는다. */
export function digitWord(r: number): string {
  const w = NUM_WORD[r];
  if (w === undefined) throw new Error(`자리 수 낱말이 없습니다: ${r}`);
  return `${w} 자리`;
}

/** `5!=120` */
function factEq(n: number): string {
  return `${n}!=${fact(n)}`;
}

/** 짝이 되는 두 무리 — 한글 낱말 뒤 조사는 손으로 적는다. */
const PAIR_GROUPS: readonly (readonly [string, string])[] = [
  ["남학생", "여학생"],
  ["어른", "어린이"],
  ["선생님", "학생"],
];

const SPORT_GROUPS: readonly (readonly [string, string])[] = [
  ["농구 선수", "배구 선수"],
  ["남학생", "여학생"],
  ["어른", "어린이"],
];

// ───────────────────────────── 09 ─────────────────────────────
// 이웃하는 순열의 수
// 꼴 0 (기본·대표): 문자 n 개 중 정한 두(세) 문자가 이웃 — 묶어서 나열 × 묶음 안
// 꼴 1 (기본): 한 무리가 모두 이웃
// 꼴 2 (응용): 두 무리가 각각 이웃
// 꼴 3 (심화하): 이웃하는 경우의 수가 K 일 때 인원 · 「a와 b 또는 b와 c」(겹침 빼기)

function t09(rng: Rng): Body {
  const mode = randInt(rng, 0, 3);
  if (mode === 0) {
    const kind = randInt(rng, 0, 1);
    const g = kind === 0 ? 2 : 3;
    const n = randInt(rng, 5, 7);
    const letters = LETTERS.slice(0, n);
    const picks = distinctInts(rng, 0, n - 1, g)
      .sort((x, y) => x - y)
      .map((i) => letters[i]!);
    const last = picks[g - 1]!;
    const named =
      g === 2 ? `$${picks[0]}$${gwa(picks[0]!)} $${last}$` : mathList(picks);
    const outer = fact(n - g + 1);
    const inner = fact(g);
    const ans = outer * inner;
    return {
      content: `$${n}$개의 문자 ${mathListEul(letters)} 일렬로 나열할 때, ${named}${ga(last)} ${g === 2 ? "서로" : "모두"} 이웃하도록 나열하는 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `${named}${eul(last)} 한 문자로 생각하여 $${n - g + 1}$개의 문자를 일렬로 나열하는 경우의 수는 $${factEq(n - g + 1)}$`,
        `${named}${ga(last)} 자리를 바꾸는 경우의 수는 $${factEq(g)}$`,
        `따라서 구하는 경우의 수는 $${outer}\\times ${inner}=${ans}$`,
      ].join("\n"),
      difficulty: "기본",
      facts: { mode, kind, n },
    };
  }
  if (mode === 1) {
    const grp = randInt(rng, 0, PAIR_GROUPS.length - 1);
    const [X, Y] = PAIR_GROUPS[grp]!;
    const m = randInt(rng, 2, 4);
    const w = randInt(rng, 2, 4);
    const outer = fact(m + 1);
    const inner = fact(w);
    const ans = outer * inner;
    return {
      content: `${X} $${m}$명과 ${Y} $${w}$명을 일렬로 세울 때, ${Y}끼리 이웃하도록 세우는 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `${Y} $${w}$명을 한 사람으로 생각하여 $${m + 1}$명을 일렬로 세우는 경우의 수는 $${factEq(m + 1)}$`,
        `${Y} $${w}$명이 자리를 바꾸는 경우의 수는 $${factEq(w)}$`,
        `따라서 구하는 경우의 수는 $${outer}\\times ${inner}=${ans}$`,
      ].join("\n"),
      difficulty: "기본",
      facts: { mode, grp, m, w },
    };
  }
  if (mode === 2) {
    const e = randInt(rng, 1, 3);
    const mm = randInt(rng, 2, 3);
    const h = randInt(rng, 2, 3);
    const a = fact(e + 2);
    const b = fact(mm);
    const c = fact(h);
    const ans = a * b * c;
    return {
      content: `초등학생 $${e}$명, 중학생 $${mm}$명, 고등학생 $${h}$명을 일렬로 세울 때, 중학생은 중학생끼리, 고등학생은 고등학생끼리 이웃하도록 세우는 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `중학생 $${mm}$명을 한 사람, 고등학생 $${h}$명을 한 사람으로 생각하여 $${e + 2}$명을 일렬로 세우는 경우의 수는 $${factEq(e + 2)}$`,
        `중학생끼리 자리를 바꾸는 경우의 수는 $${factEq(mm)}$`,
        `고등학생끼리 자리를 바꾸는 경우의 수는 $${factEq(h)}$`,
        `따라서 구하는 경우의 수는 $${timesTex([a, b, c])}=${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, e, m: mm, h },
    };
  }
  const kind = randInt(rng, 0, 1);
  if (kind === 0) {
    const g = randInt(rng, 2, 3);
    const n = randInt(rng, 2, 8 - g);
    const K = fact(n + 1) * fact(g);
    return {
      content: `고등학생 $${g}$명과 중학생 $n$명을 일렬로 세울 때, 고등학생끼리 이웃하도록 세우는 경우의 수가 $${K}$이다. 이때 자연수 $n$의 값을 구하시오.`,
      answer: numAnswer(n),
      solution: [
        `고등학생 $${g}$명을 한 사람으로 생각하여 $(n+1)$명을 일렬로 세우는 경우의 수는 $(n+1)!$`,
        `고등학생 $${g}$명이 자리를 바꾸는 경우의 수는 $${factEq(g)}$`,
        `즉 $(n+1)!\\times ${fact(g)}=${K}$이므로 $(n+1)!=${K / fact(g)}=${n + 1}!$`,
        `따라서 $n+1=${n + 1}$이므로 $n=${n}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, kind, g, n },
    };
  }
  const n = randInt(rng, 5, 7);
  const letters = LETTERS.slice(0, n);
  const one = fact(n - 1) * 2;
  const both = fact(n - 2) * 2;
  const ans = one + one - both;
  return {
    content: `$${n}$개의 문자 ${mathListEul(letters)} 일렬로 나열할 때, $a$와 $b$ 또는 $b$와 $c$가 서로 이웃하도록 나열하는 경우의 수를 구하시오.`,
    answer: numAnswer(ans),
    solution: [
      `$a$, $b$가 이웃하도록 나열하는 경우의 수는 $${n - 1}!\\times 2!=${one}$`,
      `$b$, $c$가 이웃하도록 나열하는 경우의 수는 $${n - 1}!\\times 2!=${one}$`,
      `$a$, $b$와 $b$, $c$가 모두 이웃하는 경우, 즉 $abc$ 또는 $cba$가 한 묶음이 되도록 나열하는 경우의 수는 $${n - 2}!\\times 2=${both}$`,
      `따라서 구하는 경우의 수는 $${one}+${one}-${both}=${ans}$`,
    ].join("\n"),
    difficulty: "심화하",
    facts: { mode, kind, n },
  };
}

// ───────────────────────────── 10 ─────────────────────────────
// 이웃하지 않는 순열의 수
// 꼴 0 (기본·대표): 한 무리를 먼저 세우고 사이사이와 양 끝에 다른 무리
// 꼴 1 (응용): 낱말의 모음끼리 이웃하지 않게
// 꼴 2 (심화하): A와 B는 이웃하고 C와 D는 이웃하지 않게
// 꼴 3 (응용): 일렬로 놓인 의자에 어느 두 사람도 옆에 앉지 않게 — 빈 의자 사이에 끼우기

function t10(rng: Rng): Body {
  const mode = randInt(rng, 0, 3);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const grp = randInt(rng, 0, SPORT_GROUPS.length - 1);
      const [X, Y] = SPORT_GROUPS[grp]!;
      const a = randInt(rng, 2, 5);
      const b = randInt(rng, 2, 4);
      if (b > a + 1 || a + b > 8) return null;
      const x = fact(a);
      const y = nPr(a + 1, b);
      const ans = x * y;
      return {
        content: `${X} $${a}$명과 ${Y} $${b}$명을 일렬로 세울 때, ${Y}끼리 이웃하지 않도록 세우는 경우의 수를 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `${X} $${a}$명을 일렬로 세우는 경우의 수는 $${factEq(a)}$`,
          `${X}의 사이사이와 양 끝의 $${a + 1}$개의 자리에 ${Y} $${b}$명을 세우는 경우의 수는 $${pTex(a + 1, b)}=${y}$`,
          `따라서 구하는 경우의 수는 $${x}\\times ${y}=${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, grp, a, b },
      };
    });
  if (mode === 1) {
    const W = pickWord(
      rng,
      (x) => x.vowels.length >= 2 && x.vowels.length <= x.cons.length + 1,
    );
    const c = W.cons.length;
    const v = W.vowels.length;
    const x = fact(c);
    const y = nPr(c + 1, v);
    const ans = x * y;
    return {
      content: `${W.word}의 $${W.n}$개의 문자를 일렬로 나열할 때, 모음끼리 이웃하지 않도록 나열하는 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `자음 ${mathListEul(W.cons)} 일렬로 나열하는 경우의 수는 $${factEq(c)}$`,
        `자음의 사이사이와 양 끝의 $${c + 1}$개의 자리에 모음 ${mathListEul(W.vowels)} 나열하는 경우의 수는 $${pTex(c + 1, v)}=${y}$`,
        `따라서 구하는 경우의 수는 $${x}\\times ${y}=${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, wi: W.w, n: W.n, v },
    };
  }
  if (mode === 2) {
    const n = randInt(rng, 6, 7);
    const r = n - 4;
    const who = BIG_PEOPLE.slice(0, n).join(", ");
    const x = fact(r + 1);
    const y = nPr(r + 2, 2);
    const ans = x * 2 * y;
    return {
      content: `${who} ${NUM_WORD[n]!} 명을 일렬로 세울 때, A와 B는 이웃하고 C와 D는 이웃하지 않도록 세우는 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `A와 B를 한 사람으로 생각하여 C, D를 제외한 $${r + 1}$명을 일렬로 세우는 경우의 수는 $${factEq(r + 1)}$`,
        `A와 B가 자리를 바꾸는 경우의 수는 $2!=2$`,
        `일렬로 세운 $${r + 1}$명의 사이사이와 양 끝의 $${r + 2}$개의 자리에 C와 D를 세우는 경우의 수는 $${pTex(r + 2, 2)}=${y}$`,
        `따라서 구하는 경우의 수는 $${timesTex([x, 2, y])}=${ans}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, n },
    };
  }
  return attempt<Body>((): Body | null => {
    const k = randInt(rng, 2, 3);
    const m = randInt(rng, k + 2, 8);
    if (m - k + 1 < k) return null;
    const ans = nPr(m - k + 1, k);
    return {
      content: `학생 $${k}$명이 일렬로 놓인 $${m}$개의 의자에 앉을 때, 어느 두 학생도 바로 옆 의자에 앉지 않도록 앉는 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `학생이 앉지 않는 빈 의자 $${m - k}$개를 먼저 일렬로 놓고, 그 사이사이와 양 끝의 $${m - k + 1}$개의 자리 중 $${k}$개의 자리에 학생이 앉을 의자를 하나씩 놓으면 된다.`,
        `이때 학생 $${k}$명은 서로 다르므로 구하는 경우의 수는 $${pTex(m - k + 1, k)}=${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, k, m },
    };
  });
}

// ───────────────────────────── 11 ─────────────────────────────
// 자리에 대한 조건이 있는 순열의 수
// 꼴 0 (기본·대표): 양 끝에 한 무리 — 양 끝을 먼저 세운다
// 꼴 1 (응용): 두 무리가 교대로
// 꼴 2 (응용): 모음이 모두 홀수(짝수) 번째 자리에
// 꼴 3 (응용): 정한 두 문자 사이에 k 개의 문자

function t11(rng: Rng): Body {
  const mode = randInt(rng, 0, 3);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const grp = randInt(rng, 0, PAIR_GROUPS.length - 1);
      const [X, Y] = PAIR_GROUPS[grp]!;
      const a = randInt(rng, 2, 4);
      const c = randInt(rng, 1, 4);
      if (a + c - 2 < 2 || a + c > 7) return null;
      const x = nPr(a, 2);
      const y = fact(a + c - 2);
      const ans = x * y;
      return {
        content: `${X} $${a}$명과 ${Y} $${c}$명을 일렬로 세울 때, 양 끝에 ${X}이 오도록 세우는 경우의 수를 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `${X} $${a}$명 중 $2$명을 양 끝에 세우는 경우의 수는 $${pTex(a, 2)}=${x}$`,
          `양 끝의 $2$명을 제외한 $${a + c - 2}$명을 일렬로 세우는 경우의 수는 $${factEq(a + c - 2)}$`,
          `따라서 구하는 경우의 수는 $${x}\\times ${y}=${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, grp, a, c },
      };
    });
  if (mode === 1) {
    const b = randInt(rng, 2, 4);
    const a = b + randInt(rng, 0, 1);
    const x = fact(a) * fact(b);
    const lines =
      a === b
        ? [
            `남학생, 여학생의 순서로 교대로 서는 경우의 수는 $${a}!\\times ${b}!=${x}$`,
            `여학생, 남학생의 순서로 교대로 서는 경우의 수도 $${a}!\\times ${b}!=${x}$`,
            `따라서 구하는 경우의 수는 $${x}+${x}=${2 * x}$`,
          ]
        : [
            `남학생이 $${a}$명, 여학생이 $${b}$명이므로 양 끝에 남학생이 서야 한다.`,
            `남학생 $${a}$명을 일렬로 세우는 경우의 수는 $${factEq(a)}$`,
            `남학생의 사이사이의 $${b}$개의 자리에 여학생 $${b}$명을 세우는 경우의 수는 $${factEq(b)}$`,
            `따라서 구하는 경우의 수는 $${fact(a)}\\times ${fact(b)}=${x}$`,
          ];
    const ans = a === b ? 2 * x : x;
    return {
      content: `남학생 $${a}$명과 여학생 $${b}$명이 일렬로 설 때, 남학생과 여학생이 교대로 서는 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: lines.join("\n"),
      difficulty: "응용",
      facts: { mode, a, b },
    };
  }
  if (mode === 2) {
    const kind = randInt(rng, 0, 1);
    const W = pickWord(rng, (x) => {
      const slots = kind === 0 ? Math.ceil(x.n / 2) : Math.floor(x.n / 2);
      return x.vowels.length >= 2 && x.vowels.length <= slots;
    });
    const slots = kind === 0 ? Math.ceil(W.n / 2) : Math.floor(W.n / 2);
    const v = W.vowels.length;
    const x = nPr(slots, v);
    const y = fact(W.n - v);
    const ans = x * y;
    const place = kind === 0 ? "홀수" : "짝수";
    return {
      content: `${W.word}의 $${W.n}$개의 문자를 일렬로 나열할 때, 모음이 모두 ${place} 번째 자리에 오도록 나열하는 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `$${slots}$개의 ${place} 번째 자리 중 $${v}$개의 자리에 모음 ${mathListEul(W.vowels)} 나열하는 경우의 수는 $${pTex(slots, v)}=${x}$`,
        `나머지 $${W.n - v}$개의 자리에 자음 ${mathListEul(W.cons)} 나열하는 경우의 수는 $${factEq(W.n - v)}$`,
        `따라서 구하는 경우의 수는 $${x}\\times ${y}=${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, kind, wi: W.w, n: W.n, v },
    };
  }
  return attempt<Body>((): Body | null => {
    const W = pickWord(rng, (x) => x.n <= 7);
    const k = randInt(rng, 1, 3);
    if (W.n - k - 1 < 2) return null;
    const [i, j] = distinctInts(rng, 0, W.n - 1, 2).sort((p, q) => p - q) as [
      number,
      number,
    ];
    const X = W.word[i]!;
    const Y = W.word[j]!;
    const x = nPr(W.n - 2, k);
    const y = fact(W.n - k - 1);
    const ans = x * y * 2;
    return {
      content: `${W.word}의 $${W.n}$개의 문자를 일렬로 나열할 때, $${X}$${gwa(X)} $${Y}$ 사이에 $${k}$개의 문자가 들어가도록 나열하는 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `$${X}$${gwa(X)} $${Y}$${eul(Y)} 제외한 $${W.n - 2}$개의 문자 중 $${k}$개를 택하여 $${X}$${gwa(X)} $${Y}$ 사이에 나열하는 경우의 수는 $${pTex(W.n - 2, k)}=${x}$`,
        `$${X}$, $${Y}$${gwa(Y)} 그 사이의 $${k}$개의 문자를 한 문자로 생각하여 $${W.n - k - 1}$개의 문자를 일렬로 나열하는 경우의 수는 $${factEq(W.n - k - 1)}$`,
        `$${X}$${gwa(X)} $${Y}$${ga(Y)} 자리를 바꾸는 경우의 수는 $2!=2$`,
        `따라서 구하는 경우의 수는 $${timesTex([x, y, 2])}=${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, wi: W.w, n: W.n, k },
    };
  });
}

// ───────────────────────────── 12 ─────────────────────────────
// ‘적어도’의 조건이 있는 순열의 수 — (전체) − (그렇지 않은 경우)
// 꼴 0 (기본·대표): 적어도 한쪽 끝에 모음 — 양 끝 모두 자음을 뺀다
// 꼴 1 (응용): 두 자리를 뽑을 때 적어도 한 명은 남학생
// 꼴 2 (응용): 정한 두 문자 사이에 적어도 한 문자 — 이웃하는 경우를 뺀다
// 꼴 3 (심화하): 적어도 두 모음이 이웃 · 경우의 수가 K 일 때 짝수의 개수

/** 두 자리 이름 · 둘째 자리의 (으)로 꼴 — 한글 낱말 뒤 조사는 손으로 적는다. */
const ROLE_PAIRS: readonly (readonly [string, string, string])[] = [
  ["회장", "부회장", "부회장으로"],
  ["반장", "부반장", "부반장으로"],
  ["대표", "부대표", "부대표로"],
];

function t12(rng: Rng): Body {
  const mode = randInt(rng, 0, 3);
  if (mode === 0) {
    const W = pickWord(rng, (x) => x.cons.length >= 2);
    const c = W.cons.length;
    const total = fact(W.n);
    const both = nPr(c, 2) * fact(W.n - 2);
    const ans = total - both;
    return {
      content: `${W.word}의 $${W.n}$개의 문자를 일렬로 나열할 때, 적어도 한쪽 끝에 모음이 오도록 나열하는 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `$${W.n}$개의 문자를 일렬로 나열하는 경우의 수는 $${factEq(W.n)}$`,
        `양 끝에 모두 자음이 오도록 나열하는 경우의 수는 $${pTex(c, 2)}\\times ${W.n - 2}!=${both}$`,
        `따라서 구하는 경우의 수는 $${total}-${both}=${ans}$`,
      ].join("\n"),
      difficulty: "기본",
      facts: { mode, wi: W.w, n: W.n, v: W.vowels.length },
    };
  }
  if (mode === 1) {
    const role = randInt(rng, 0, ROLE_PAIRS.length - 1);
    const [R1, R2, R2ro] = ROLE_PAIRS[role]!;
    const b = randInt(rng, 2, 6);
    const g = randInt(rng, 2, 6);
    const total = nPr(b + g, 2);
    const none = nPr(g, 2);
    const ans = total - none;
    return {
      content: `남학생 $${b}$명과 여학생 $${g}$명 중에서 ${R1} $1$명, ${R2} $1$명을 뽑을 때, ${R1}, ${R2} 중에서 적어도 한 명은 남학생이 뽑히는 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `$${b + g}$명의 학생 중에서 ${R1} $1$명, ${R2} $1$명을 뽑는 경우의 수는 $${pTex(b + g, 2)}=${total}$`,
        `${R1}, ${R2ro} 모두 여학생이 뽑히는 경우의 수는 $${pTex(g, 2)}=${none}$`,
        `따라서 구하는 경우의 수는 $${total}-${none}=${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, role, b, g },
    };
  }
  if (mode === 2) {
    const n = randInt(rng, 5, 7);
    const letters = LETTERS.slice(0, n);
    const [i, j] = distinctInts(rng, 0, n - 1, 2).sort((p, q) => p - q) as [
      number,
      number,
    ];
    const X = letters[i]!;
    const Y = letters[j]!;
    const total = fact(n);
    const adj = fact(n - 1) * 2;
    const ans = total - adj;
    return {
      content: `$${n}$개의 문자 ${mathListEul(letters)} 일렬로 나열할 때, $${X}$${gwa(X)} $${Y}$ 사이에 적어도 한 개의 문자가 오도록 나열하는 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `$${n}$개의 문자를 일렬로 나열하는 경우의 수는 $${factEq(n)}$`,
        `$${X}$${gwa(X)} $${Y}$${ga(Y)} 이웃하도록 나열하는 경우의 수는 $${n - 1}!\\times 2!=${adj}$`,
        `따라서 구하는 경우의 수는 $${total}-${adj}=${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, n },
    };
  }
  const kind = randInt(rng, 0, 1);
  if (kind === 0) {
    const W = pickWord(
      rng,
      (x) => x.vowels.length >= 2 && x.vowels.length <= x.cons.length + 1,
    );
    const c = W.cons.length;
    const v = W.vowels.length;
    const total = fact(W.n);
    const none = fact(c) * nPr(c + 1, v);
    const ans = total - none;
    return {
      content: `${W.word}의 $${W.n}$개의 문자를 일렬로 나열할 때, 적어도 두 개의 모음이 이웃하도록 나열하는 경우의 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `$${W.n}$개의 문자를 일렬로 나열하는 경우의 수는 $${factEq(W.n)}$`,
        `모음 ${mathList(W.vowels)} 중 어느 두 모음도 이웃하지 않도록 나열하는 경우의 수는 자음을 먼저 나열하고 그 사이사이와 양 끝에 모음을 나열하므로 $${c}!\\times ${pTex(c + 1, v)}=${none}$`,
        `따라서 구하는 경우의 수는 $${total}-${none}=${ans}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, kind, wi: W.w, n: W.n, v },
    };
  }
  return attempt<Body>((): Body | null => {
    const n = randInt(rng, 5, 7);
    const e = randInt(rng, 1, 4);
    const o = n - e;
    if (o < 2 || o > 5) return null;
    const K = fact(n) - nPr(o, 2) * fact(n - 2);
    const f = fact(n - 2);
    return {
      content: `서로 다른 한 자리 자연수 $${n}$개를 일렬로 나열할 때, 적어도 한쪽 끝에 짝수가 오도록 나열하는 경우의 수가 $${K}$이다. 이때 이 $${n}$개의 자연수 중 짝수의 개수를 구하시오.`,
      answer: numAnswer(e),
      solution: [
        `$${n}$개의 자연수를 일렬로 나열하는 경우의 수는 $${factEq(n)}$`,
        `홀수의 개수를 $k$${ira("k")} 하면 양 끝에 모두 홀수가 오도록 나열하는 경우의 수는 $${pTex("k", 2)}\\times ${n - 2}!=${f}k(k-1)$`,
        `즉 $${fact(n)}-${f}k(k-1)=${K}$이므로 $k(k-1)=${o * (o - 1)}=${o}\\times ${o - 1}$`,
        `$k$는 자연수이므로 $k=${o}$`,
        `따라서 짝수의 개수는 $${n}-${o}=${e}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, kind, n, e },
    };
  });
}

// ───────────────────────────── 13 ─────────────────────────────
// 순열을 이용한 자연수의 개수 — 맨 앞자리에는 0 이 올 수 없다
// 꼴 0 (기본·대표): 0 을 포함한 숫자로 만든 짝수 — 일의 자리 0 과 0 이 아닌 짝수로 나누기
// 꼴 1 (기본): 5 의 배수 — 일의 자리 0 · 5
// 꼴 2 (응용): 맨 앞자리와 일의 자리가 모두 홀수
// 꼴 3 (심화하): 3 의 배수(세 수의 합) · 만들 수 있는 모든 수의 합

function zeroToK(k: number): number[] {
  return Array.from({ length: k + 1 }, (_, i) => i);
}

function t13(rng: Rng): Body {
  const mode = randInt(rng, 0, 3);
  if (mode <= 2) {
    const k = mode === 1 ? randInt(rng, 5, 6) : randInt(rng, 4, 6);
    const r = randInt(rng, 3, 4);
    const head = `$${k + 1}$개의 숫자 ${listTex(zeroToK(k))} 중에서 서로 다른 $${r}$개의 숫자를 사용하여 ${digitWord(r)} 자연수를 만들 때,`;
    if (mode === 0) {
      const evens = zeroToK(k).filter((d) => d > 0 && d % 2 === 0);
      const E = evens.length;
      const x = nPr(k, r - 1);
      const y = E * (k - 1) * nPr(k - 1, r - 2);
      const ans = x + y;
      return {
        content: `${head} 짝수의 개수를 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `일의 자리의 숫자가 $0$인 경우, 나머지 $${r - 1}$개의 자리에 $0$을 제외한 $${k}$개의 숫자 중 $${r - 1}$개를 나열하므로 $${pTex(k, r - 1)}=${x}$`,
          `일의 자리의 숫자가 ${listTex(evens)} 중 하나인 경우, 맨 앞자리에는 $0$과 일의 자리의 숫자를 제외한 $${k - 1}$개의 숫자가 올 수 있고 나머지 $${r - 2}$개의 자리에는 남은 $${k - 1}$개의 숫자 중 $${r - 2}$개를 나열하므로 $${timesTex([E, k - 1, pTex(k - 1, r - 2)])}=${y}$`,
          `따라서 구하는 짝수의 개수는 $${x}+${y}=${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, k, r },
      };
    }
    if (mode === 1) {
      const x = nPr(k, r - 1);
      const y = (k - 1) * nPr(k - 1, r - 2);
      const ans = x + y;
      return {
        content: `${head} $5$의 배수의 개수를 구하시오.`,
        answer: numAnswer(ans),
        solution: [
          `$5$의 배수는 일의 자리의 숫자가 $0$ 또는 $5$이다.`,
          `일의 자리의 숫자가 $0$인 경우, 나머지 $${r - 1}$개의 자리에 $0$을 제외한 $${k}$개의 숫자 중 $${r - 1}$개를 나열하므로 $${pTex(k, r - 1)}=${x}$`,
          `일의 자리의 숫자가 $5$인 경우, 맨 앞자리에는 $0$과 $5$를 제외한 $${k - 1}$개의 숫자가 올 수 있고 나머지 $${r - 2}$개의 자리에는 남은 $${k - 1}$개의 숫자 중 $${r - 2}$개를 나열하므로 $${k - 1}\\times ${pTex(k - 1, r - 2)}=${y}$`,
          `따라서 구하는 $5$의 배수의 개수는 $${x}+${y}=${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, k, r },
      };
    }
    const odds = zeroToK(k).filter((d) => d % 2 === 1);
    const o = odds.length;
    const x = nPr(o, 2);
    const y = nPr(k - 1, r - 2);
    const ans = x * y;
    return {
      content: `${head} 맨 앞자리의 숫자와 일의 자리의 숫자가 모두 홀수인 자연수의 개수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `맨 앞자리와 일의 자리에 홀수 ${listTex(odds)} 중 서로 다른 $2$개를 나열하는 경우의 수는 $${pTex(o, 2)}=${x}$`,
        `나머지 $${r - 2}$개의 자리에 남은 $${k - 1}$개의 숫자 중 $${r - 2}$개를 나열하는 경우의 수는 $${pTex(k - 1, r - 2)}=${y}$`,
        `따라서 구하는 자연수의 개수는 $${x}\\times ${y}=${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, k, r },
    };
  }
  const kind = randInt(rng, 0, 1);
  if (kind === 0) {
    const k = randInt(rng, 5, 6);
    const ds = Array.from({ length: k }, (_, i) => i + 1);
    const triples: number[][] = [];
    for (let i = 1; i <= k; i += 1)
      for (let j = i + 1; j <= k; j += 1)
        for (let l = j + 1; l <= k; l += 1)
          if ((i + j + l) % 3 === 0) triples.push([i, j, l]);
    const T = triples.length;
    const ans = T * 6;
    return {
      content: `$${k}$개의 숫자 ${listTex(ds)} 중에서 서로 다른 $3$개의 숫자를 사용하여 만들 수 있는 세 자리 자연수 중 $3$의 배수의 개수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `$3$의 배수는 각 자리의 숫자의 합이 $3$의 배수이다.`,
        `서로 다른 $3$개의 숫자의 합이 $3$의 배수인 경우는 $${tuplesTex(triples)}$의 $${T}$가지`,
        `이 각각에 대하여 세 숫자를 일렬로 나열하는 경우의 수는 $3!=6$이므로 구하는 개수는 $${T}\\times 6=${ans}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, kind, k },
    };
  }
  const [k, r] = pickOne(rng, [
    [4, 2],
    [5, 2],
    [6, 2],
    [4, 3],
    [6, 3],
  ] as const);
  const ds = Array.from({ length: k }, (_, i) => i + 1);
  const m = nPr(k - 1, r - 1);
  const half = (k * (k + 1)) / 2;
  const S = half * m;
  const ans = r === 3 ? S * 111 : S * 11;
  return {
    content: `$${k}$개의 숫자 ${listTex(ds)} 중에서 서로 다른 $${r}$개의 숫자를 사용하여 만들 수 있는 ${digitWord(r)} 자연수를 모두 더한 값을 구하시오.`,
    answer: numAnswer(ans),
    solution: [
      `어느 한 자리의 숫자를 정하면 나머지 $${r - 1}$개의 자리에 남은 $${k - 1}$개의 숫자 중 $${r - 1}$개를 나열하는 경우의 수는 $${pTex(k - 1, r - 1)}=${m}$이므로 각 자리에는 $1$부터 $${k}$까지의 숫자가 각각 $${m}$번씩 온다.`,
      `따라서 각 자리의 숫자의 합은 $(1+2+\\cdots+${k})\\times ${m}=${half}\\times ${m}=${S}$`,
      r === 3
        ? `구하는 합은 $${S}\\times 100+${S}\\times 10+${S}=${ans}$`
        : `구하는 합은 $${S}\\times 10+${S}=${ans}$`,
    ].join("\n"),
    difficulty: "심화하",
    facts: { mode, kind, k, r },
  };
}

// ───────────────────────────── 14 ─────────────────────────────
// 사전식 배열에 의한 경우의 수 — 앞자리부터 정해 나가며 덩어리째 센다
// 꼴 0 (기본·대표): 0 을 포함한 숫자로 만든 네 자리 수 중 T 보다 큰 수
// 꼴 1 (응용): 낱말의 문자를 사전식으로 늘어놓을 때 주어진 문자열은 몇 번째
// 꼴 2 (심화하): 숫자를 모두 한 번씩 써서 만든 수를 작은 것부터 늘어놓을 때 m 번째 수

/** 문자열의 사전식 순위(1부터) · 풀이 줄 · 더한 덩어리들. */
function lexRank(target: readonly string[]): {
  rank: number;
  lines: string[];
  parts: number[];
} {
  const n = target.length;
  const remaining = [...target].sort();
  const lines: string[] = [];
  const parts: number[] = [];
  let rank = 1;
  for (let i = 0; i < n; i += 1) {
    const cur = target[i]!;
    const smaller = remaining.filter((c) => c < cur);
    const m = n - 1 - i;
    if (smaller.length > 0) {
      const prefix = target.slice(0, i).join("");
      const starts = smaller.map((c) => `${prefix}${c}`);
      const lastStart = starts[starts.length - 1]!;
      const block = smaller.length * fact(m);
      lines.push(
        smaller.length === 1
          ? `${lastStart}${ro(lastStart)} 시작하는 문자열의 개수는 $${factEq(m)}$`
          : `${starts.join(", ")}${ro(lastStart)} 시작하는 문자열의 개수는 각각 $${factEq(m)}$이므로 $${smaller.length}\\times ${fact(m)}=${block}$`,
      );
      parts.push(block);
      rank += block;
    }
    remaining.splice(remaining.indexOf(cur), 1);
  }
  return { rank, lines, parts };
}

function t14(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0) {
    const k = randInt(rng, 5, 7);
    const a = randInt(rng, 2, k - 1);
    const b = pickOne(
      rng,
      zeroToK(k).filter((d) => d !== a),
    );
    const T = 1000 * a + 100 * b;
    const bigger = zeroToK(k).filter((d) => d > a);
    const ss = zeroToK(k).filter((d) => d >= b && d !== a);
    const x = bigger.length * nPr(k, 3);
    const y = ss.length * nPr(k - 1, 2);
    const ans = x + y;
    return {
      content: `$${k + 1}$개의 숫자 ${listTex(zeroToK(k))} 중에서 서로 다른 $4$개의 숫자를 사용하여 네 자리 자연수를 만들 때, $${T}$보다 큰 수의 개수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `천의 자리의 숫자가 $${a}$보다 큰 경우, 천의 자리에 ${listTex(bigger)}의 $${bigger.length}$가지가 오고 나머지 자리에 남은 $${k}$개의 숫자 중 $3$개를 나열하므로 $${bigger.length}\\times ${pTex(k, 3)}=${x}$`,
        `천의 자리의 숫자가 $${a}$이고 백의 자리의 숫자가 $${b}$ 이상인 경우, 백의 자리에 ${listTex(ss)}의 $${ss.length}$가지가 오고 나머지 자리에 남은 $${k - 1}$개의 숫자 중 $2$개를 나열하므로 $${ss.length}\\times ${pTex(k - 1, 2)}=${y}$`,
        `따라서 구하는 자연수의 개수는 $${x}+${y}=${ans}$`,
      ].join("\n"),
      difficulty: "기본",
      facts: { mode, k, a, b },
    };
  }
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const W = pickWord(rng, (x) => x.n === 6);
      const idx = distinctInts(rng, 0, W.n - 1, W.n);
      const target = idx.map((i) => W.word[i]!);
      const { rank, lines, parts } = lexRank(target);
      if (rank < 20 || rank > fact(W.n) - 20 || lines.length > 5) return null;
      const t = target.join("");
      const code = Number(idx.join(""));
      return {
        content: `${W.word}의 $${W.n}$개의 문자를 모두 한 번씩 사용하여 만든 문자열을 사전식으로 배열할 때, ${t}${eun(t)} 몇 번째에 오는지 구하시오.`,
        answer: numAnswer(rank),
        solution: [
          `알파벳 순서로 앞자리부터 차례로 정해 나가면`,
          ...lines,
          `따라서 ${t}${eun(t)} $${sumTex(parts)}+1=${rank}$번째에 온다.`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, wi: W.w, n: W.n, code },
      };
    });
  return attempt<Body>((): Body | null => {
    const k = randInt(rng, 4, 5);
    const total = k * fact(k);
    const m = randInt(rng, 10, total - 10);
    let prefix: number[] = [];
    let remaining = zeroToK(k);
    let cum = 0;
    const lines: string[] = [];
    while (remaining.length > 3) {
      const rest = remaining.length - 1;
      const cands = remaining.filter((d) => !(prefix.length === 0 && d === 0));
      const block = fact(rest);
      const skipped: number[] = [];
      let chosen: number | null = null;
      for (const d of cands) {
        if (cum + block < m) {
          skipped.push(d);
          cum += block;
        } else {
          chosen = d;
          break;
        }
      }
      if (chosen === null) return null;
      if (skipped.length > 0) {
        const boxes = "\\square".repeat(rest);
        const forms = skipped.map((d) => `${prefix.join("")}${d}${boxes}`);
        lines.push(
          skipped.length === 1
            ? `$${forms[0]}$ 꼴의 자연수의 개수는 $${factEq(rest)}$`
            : `$${forms.join(", ")}$ 꼴의 자연수의 개수는 각각 $${factEq(rest)}$이므로 $${skipped.length}\\times ${fact(rest)}=${skipped.length * block}$`,
        );
      }
      prefix = [...prefix, chosen];
      remaining = remaining.filter((d) => d !== chosen);
    }
    const tails = permutationsOf(remaining.length).map((p) =>
      p.map((i) => remaining[i]!),
    );
    const nums = tails.map((t) => Number([...prefix, ...t].join("")));
    const need = m - cum;
    const ans = nums[need - 1];
    if (ans === undefined || lines.length === 0) return null;
    const shown = nums.slice(0, need).join(", ");
    return {
      content: `$${k + 1}$개의 숫자 ${listTex(zeroToK(k))}${eul(String(k))} 모두 한 번씩 사용하여 만들 수 있는 ${digitWord(k + 1)} 자연수를 크기가 작은 것부터 차례대로 나열할 때, $${m}$번째에 오는 수를 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        ...lines,
        `여기까지 모두 $${cum}$개이고, $${prefix.join("")}${"\\square".repeat(remaining.length)}$ 꼴의 수를 작은 것부터 나열하면 $${shown}${need < nums.length ? ", \\cdots" : ""}$`,
        `따라서 $${m}$번째에 오는 수는 $${ans}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, k, m },
    };
  });
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

/** 색인의 유형 번호는 보존하고, 표시 제목의 OCR 잔재만 바로잡았다. */
export const H1_PERM: HighTypeEntry[] = [
  entry("01", "합의 법칙", SEC.경우의수, t01),
  entry("02", "방정식과 부등식의 해의 개수", SEC.경우의수, t02),
  entry("03", "곱의 법칙", SEC.경우의수, t03),
  entry("04", "약수의 개수", SEC.경우의수, t04),
  entry("05", "수형도를 이용하는 경우의 수", SEC.경우의수, t05),
  entry("06", "지불 방법의 수와 지불 금액의 수", SEC.경우의수, t06),
  entry("07", "도로망에서의 경우의 수", SEC.경우의수, t07),
  entry("09", "이웃하는 순열의 수", SEC.순열, t09),
  entry("10", "이웃하지 않는 순열의 수", SEC.순열, t10),
  entry("11", "자리에 대한 조건이 있는 순열의 수", SEC.순열, t11),
  entry("12", "‘적어도’의 조건이 있는 순열의 수", SEC.순열, t12),
  entry("13", "순열을 이용한 자연수의 개수", SEC.순열, t13),
  entry("14", "사전식 배열에 의한 경우의 수", SEC.순열, t14),
];

export const H1_PERM_HOLD: HighHold[] = [
  {
    key: `${BOOK}|${MINOR}|08`,
    reason:
      "영역 지도 그림 필요 — 어느 영역이 서로 인접하는지가 그림으로만 정해진다. 중등 `m2Shade.ts` 의 FigureSpec v2 채색 축을 고등 적재·미리보기가 싣는지 확인한 뒤(물결 2) 등록",
  },
];
