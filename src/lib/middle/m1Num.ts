/**
 * 중1 RPM 1-1 「수」 세 중단원 38유형 — 세션 3B-수 소유.
 *
 * 담는 것 (`scripts/rpm/rpm-type-catalog.json` 정본 기준):
 *   - 소인수분해 04~10 (7유형)   — 01~03 은 `m1Book1.ts` 가 이미 낸다
 *   - 최대공약수와 최소공배수 01~16 (16유형, 전량)
 *   - 정수와 유리수 01~15 (15유형, 전량)
 *
 * 전부 텍스트라 도형 대기가 없다. 보류 유형 없음.
 *
 * ## 생성 규칙 — 정답을 먼저 뽑고 발문을 역산한다
 *
 * 이 갈래는 역산이 특히 잘 맞는다. 약수의 개수·최대공약수·최소공배수는 **답에서
 * 거꾸로 수를 만들 수 있기** 때문이다:
 *   - 약수의 개수 → 지수를 먼저 뽑으면 개수는 $\prod(e_i+1)$ 로 따라온다.
 *   - 최대공약수·최소공배수 → 「몫 쪽 소수 집합을 겹치지 않게 가른다」는 구성만
 *     지키면 $\gcd$, $\mathrm{lcm}$ 이 **계산 없이** 정해진다(`gcdPair`).
 *
 * 그래서 **이 파일은 유클리드 호제법을 한 번도 부르지 않는다.** 테스트는 거꾸로
 * 호제법과 «약수 전수 열거»로 다시 재고, 소인수분해도 **시행나눗셈으로 다시 해서**
 * 확인한다 — 생성기와 다른 길이다(동어반복 금지).
 *
 * 숫자는 전부 `$...$` 안에 쓴다 (elementary/rules `bareNumbers` 가드).
 * 조건이 안 맞으면 `attempt()` 로 다시 뽑고, 소진되면 **던진다**.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { eulReul, waGwa } from "./m2Josa";
import type { Body } from "./m1Shared";
import { attempt, defType, pickDistinct, shuffle } from "./m1Shared";
import type { TypeEntry } from "./types";

const BOOK = "1-1";

/** RPM 중단원 이름 — 정본 바이트 그대로 (`middleTypeCoverage.test.ts` 가 전량 대조). */
const MIN_소인수 = "소인수분해";
const MIN_최대최소 = "최대공약수와 최소공배수";
const MIN_정수 = "정수와 유리수";

/** 우리 Unit.section 정확한 이름 (공유 DB 실측 2026-08-23, orderIndex 362~367) */
const SEC = {
  소인수: "소인수분해",
  최대: "공약수와 최대공약수",
  최소: "공배수와 최소공배수",
  활용: "최대공약수와 최소공배수의 활용",
  정수: "정수와 유리수",
  대소: "수의 대소관계",
} as const;

/**
 * 한글 낱말 뒤 조사 — 끝 글자의 **받침**으로 가른다(유니코드 조합 규칙).
 * 수 뒤 조사는 `m2Josa` 의 `waGwa` 를 쓴다 — 규칙을 두 벌로 두지 않는다.
 */
function wordHasBatchim(w: string): boolean {
  const code = w.charCodeAt(w.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return false;
  return code % 28 !== 0;
}
const wEun = (w: string): string => (wordHasBatchim(w) ? "은" : "는");
const wEul = (w: string): string => (wordHasBatchim(w) ? "을" : "를");
const wGwa = (w: string): string => (wordHasBatchim(w) ? "과" : "와");

/**
 * 수 뒤 「은/는」 — `m2Josa` 의 받침 판정을 **되쓴다**(규칙을 옮겨 적지 않는다).
 * `eulReul(n)` 이 「을」이면 받침이 있는 읽기다.
 */
const nEun = (n: number): string => (eulReul(n) === "을" ? "은" : "는");
const nEul = eulReul;

/**
 * 분수 표기 뒤 조사에 쓸 «읽을 때 마지막에 오는 수».
 * `improperToMixed`(textPreprocess) 가 가분수를 **대분수**로 그리므로
 * 마지막에 읽는 수는 분자가 아니라 **나머지**다: $14/5$ → 「$2$와 $5$분의 **$4$**」.
 */
function fracTail(num: number, den: number): number {
  const a = Math.abs(num);
  if (a % den === 0) return a / den;
  return a > den ? a % den : a;
}
const nGwa = waGwa;

// ── 소인수분해 소품 ────────────────────────────────────────

const SMALL_PRIMES = [2, 3, 5, 7, 11, 13] as const;

/** 소인수분해 한 벌 — `[소수, 지수]` 목록. 소수는 오름차순으로 정규화해서 쓴다. */
type Fac = readonly (readonly [number, number])[];

function normFac(f: Fac): [number, number][] {
  return f
    .filter(([, e]) => e > 0)
    .map(([p, e]) => [p, e] as [number, number])
    .sort((x, y) => x[0] - y[0]);
}

function facValue(f: Fac): number {
  let v = 1;
  for (const [p, e] of f) v *= p ** e;
  return v;
}

/** 소인수분해 꼴 KaTeX 몸통 — `2^{2}\times3\times5`. `$` 는 밖에서 감싼다. */
function facTex(f: Fac): string {
  const parts = normFac(f).map(([p, e]) => (e === 1 ? `${p}` : `${p}^{${e}}`));
  if (parts.length === 0) return "1";
  return parts.join("\\times");
}

function mulFac(a: Fac, b: Fac): [number, number][] {
  const m = new Map<number, number>();
  for (const [p, e] of [...a, ...b]) m.set(p, (m.get(p) ?? 0) + e);
  return normFac([...m.entries()].map(([p, e]) => [p, e] as [number, number]));
}

/** 약수의 개수 — 지수에 $1$ 을 더해 곱한다(생성기 쪽 길). */
function divisorCountFac(f: Fac): number {
  let n = 1;
  for (const [, e] of normFac(f)) n *= e + 1;
  return n;
}

/**
 * 임의의 수의 약수의 개수 — 시행나눗셈. 유형 10 처럼 «구성으로 모르는 수»가
 * 끼는 자리에서만 쓴다. (테스트는 약수를 전수 열거해 센다 — 다른 길.)
 */
function divisorCountOf(n: number): number {
  let rest = n;
  let count = 1;
  for (let p = 2; p * p <= rest; p += 1) {
    let e = 0;
    while (rest % p === 0) {
      rest /= p;
      e += 1;
    }
    if (e > 0) count *= e + 1;
  }
  if (rest > 1) count *= 2;
  return count;
}

/**
 * 소품 함수는 **던지지 않고 `null` 을 돌려준다.**
 *
 * 왜: 소품이 `attempt()` 로 던지면 그 예외가 부르는 쪽의 `attempt()` 를
 * **뚫고 나간다** — 부르는 쪽은 다시 뽑을 기회를 잃고 유형 전체가 죽는다.
 * (실제로 08·11·13 이 그렇게 죽었다.) 재시도 판단은 부르는 쪽이 한다.
 */
function tries<T>(n: number, f: () => T | null): T | null {
  for (let i = 0; i < n; i += 1) {
    const v = f();
    if (v !== null) return v;
  }
  return null;
}

/** 서로 다른 소수 `k` 개에 지수를 붙인 소인수분해 — 값이 `[lo, hi]` 안이어야 한다. */
function randomFac(
  rng: Rng,
  k: number,
  maxExp: number,
  lo: number,
  hi: number,
  pool: readonly number[] = SMALL_PRIMES,
): [number, number][] | null {
  if (pool.length < k) return null;
  return tries(300, () => {
    const ps = pickDistinct(rng, pool, k).sort((a, b) => a - b);
    const f = ps.map(
      (p) => [p, intBetween(rng, 1, maxExp)] as [number, number],
    );
    const v = facValue(f);
    if (v < lo || v > hi) return null;
    return f;
  });
}

/**
 * 최대공약수·최소공배수 문제의 두 수를 **구성으로** 만든다.
 *
 * 두 «몫»(`a`, `b`)의 소수 집합을 겹치지 않게 가르므로, 소수마다 한쪽 지수만
 * 커진다 → `min` 은 언제나 `g` 의 지수, `max` 는 `g+한쪽` 이다. 그래서
 * `gcd(A,B)=G`, `lcm(A,B)=G×a×b` 가 **계산 없이** 참이다.
 * `bump` 는 `g` 의 첫 소수를 `a` 쪽에만 더 얹어 「같은 소수의 지수가 다른」
 * 교과서적인 모양을 만든다 — `b` 는 그 소수를 갖지 않으므로 위 논증이 유지된다.
 */
type GcdPair = {
  g: [number, number][];
  facA: [number, number][];
  facB: [number, number][];
  facL: [number, number][];
  G: number;
  A: number;
  B: number;
  L: number;
};

function gcdPair(
  rng: Rng,
  opts: {
    maxG: number;
    maxV: number;
    maxL: number;
    pool?: readonly number[];
    maxExp?: number;
  },
): GcdPair | null {
  const pool = opts.pool ?? SMALL_PRIMES;
  const maxExp = opts.maxExp ?? 2;
  return tries(600, () => {
    const ps = shuffle(rng, pool);
    const nG = intBetween(rng, 1, 2);
    const nA = intBetween(rng, 1, 2);
    const nB = intBetween(rng, 1, 2);
    if (nG + nA + nB > ps.length) return null;

    const g: [number, number][] = [];
    for (let i = 0; i < nG; i += 1)
      g.push([ps[i]!, intBetween(rng, 1, maxExp)]);
    const a: [number, number][] = [];
    for (let i = 0; i < nA; i += 1)
      a.push([ps[nG + i]!, intBetween(rng, 1, maxExp)]);
    const b: [number, number][] = [];
    for (let i = 0; i < nB; i += 1)
      b.push([ps[nG + nA + i]!, intBetween(rng, 1, maxExp)]);
    if (intBetween(rng, 0, 1) === 1)
      a.push([ps[0]!, intBetween(rng, 1, maxExp)]);

    const facA = mulFac(g, a);
    const facB = mulFac(g, b);
    const facL = mulFac(facA, b);
    const G = facValue(g);
    const A = facValue(facA);
    const B = facValue(facB);
    const L = facValue(facL);
    if (G > opts.maxG || A > opts.maxV || B > opts.maxV || L > opts.maxL) {
      return null;
    }
    if (A === B || A === G || B === G) return null;
    return { g: normFac(g), facA, facB, facL, G, A, B, L };
  });
}

/**
 * 서로소인 두 «몫» — 소수 집합을 겹치지 않게 갈라 만든다.
 * 활용 유형(나누어 주기·타일·간격)이 쓴다. 생성기는 gcd 를 부르지 않는다.
 */
function coprimeQuotients(
  rng: Rng,
  lo: number,
  hi: number,
): [number, number] | null {
  return tries(300, () => {
    const ps = shuffle(rng, SMALL_PRIMES);
    const na = intBetween(rng, 1, 2);
    const nb = intBetween(rng, 1, 2);
    let a = 1;
    let b = 1;
    for (let i = 0; i < na; i += 1) a *= ps[i]! ** intBetween(rng, 1, 2);
    for (let i = 0; i < nb; i += 1) b *= ps[na + i]! ** intBetween(rng, 1, 2);
    if (a < lo || a > hi || b < lo || b > hi || a === b) return null;
    return [a, b] as [number, number];
  });
}

/** 서로소인 세 «몫» — 정육면체·세 수 유형이 쓴다(쌍마다 서로소). */
function coprimeTriple(
  rng: Rng,
  lo: number,
  hi: number,
): [number, number, number] | null {
  return tries(300, () => {
    const ps = shuffle(rng, SMALL_PRIMES);
    const v = [0, 1, 2].map((i) => ps[i]! ** intBetween(rng, 1, 2)) as [
      number,
      number,
      number,
    ];
    for (const x of v) if (x < lo || x > hi) return null;
    if (v[0] === v[1] || v[1] === v[2] || v[0] === v[2]) return null;
    return v;
  });
}

// ── 유리수 소품 ────────────────────────────────────────────

/** 표시용 수 한 개 — `tex` 는 `$` 없이, 값은 `num/den`(항상 `den>0`). */
type NumTok = { tex: string; num: number; den: number };

function intTok(v: number, plus = false): NumTok {
  const tex = v > 0 && plus ? `+${v}` : `${v}`;
  return { tex, num: v, den: 1 };
}

/** 분수 표시 — `-\frac{3}{2}`. 약분하지 않은 채로 둘 수 있다(정수가 되는 함정). */
function fracTok(sign: number, num: number, den: number): NumTok {
  const body = `\\frac{${num}}{${den}}`;
  return {
    tex: sign < 0 ? `-${body}` : body,
    num: sign < 0 ? -num : num,
    den,
  };
}

/** 소수 표시 — `2.5`. 값은 기약이 아니어도 된다. */
function decTok(sign: number, whole: number, tenth: number): NumTok {
  const body = `${whole}.${tenth}`;
  return {
    tex: sign < 0 ? `-${body}` : body,
    num: sign * (whole * 10 + tenth),
    den: 10,
  };
}

function tokValue(t: NumTok): number {
  return t.num / t.den;
}

function isIntegerTok(t: NumTok): boolean {
  return t.num % t.den === 0;
}

function tokList(toks: readonly NumTok[]): string {
  return toks.map((t) => `$${t.tex}$`).join(", ");
}

/** `facts` 는 수만 담는다 — 표시한 수들을 분자/분모로 남겨 테스트가 되짚는다. */
function tokFacts(toks: readonly NumTok[]): Record<string, number> {
  const out: Record<string, number> = {};
  toks.forEach((t, i) => {
    out[`n${i + 1}`] = t.num;
    out[`d${i + 1}`] = t.den;
  });
  return out;
}

/**
 * 기약인 «가분수/진분수» (분자, 분모) 쌍 — 서로소이고 분자가 분모의 배수가 아니다.
 *
 * 왜 표인가: 아무 분자나 뽑으면 $\\frac{6}{4}$ 가 나오고, `improperToMixed` 는
 * 그것을 $1\\frac{2}{4}$ 로 **약분하지 않고** 그린다 — 지면에 기약이 아닌
 * 분수가 나간다. 표로 두면 생성기가 약분을 계산할 필요가 없다.
 */
const PROPER_FRACS: readonly (readonly [number, number])[] = [
  [1, 2],
  [3, 2],
  [5, 2],
  [7, 2],
  [9, 2],
  [1, 3],
  [2, 3],
  [4, 3],
  [5, 3],
  [7, 3],
  [8, 3],
  [10, 3],
  [1, 4],
  [3, 4],
  [5, 4],
  [7, 4],
  [9, 4],
  [11, 4],
  [1, 5],
  [2, 5],
  [3, 5],
  [4, 5],
  [6, 5],
  [7, 5],
  [8, 5],
  [9, 5],
];

/** 서로 다른 값의 표시 수 묶음 — 정수·분수·소수를 섞는다. */
function mixedToks(rng: Rng, n: number): NumTok[] | null {
  return tries(300, () => {
    const out: NumTok[] = [];
    for (let i = 0; i < n; i += 1) {
      const kind = intBetween(rng, 0, 3);
      if (kind === 0) {
        out.push(intTok(intBetween(rng, -9, 9), intBetween(rng, 0, 1) === 1));
      } else if (kind === 1) {
        const [num, den] = pick(rng, PROPER_FRACS);
        out.push(fracTok(pick(rng, [-1, 1] as const), num, den));
      } else if (kind === 2) {
        out.push(
          decTok(
            pick(rng, [-1, 1] as const),
            intBetween(rng, 0, 6),
            intBetween(rng, 1, 9),
          ),
        );
      } else {
        // 약분하면 정수가 되는 분수 — 「정수가 아닌 유리수」의 단골 함정
        const den = pick(rng, [2, 3, 4] as const);
        const q = intBetween(rng, 1, 4);
        out.push(fracTok(pick(rng, [-1, 1] as const), den * q, den));
      }
    }
    const vals = out.map(tokValue);
    if (new Set(vals).size !== n) return null;
    if (new Set(out.map((t) => t.tex)).size !== n) return null;
    return out;
  });
}

// ═══════════════════════════════════════════════════════════
// 소인수분해 04~10
// ═══════════════════════════════════════════════════════════

const 소인수분해_TYPES: TypeEntry[] = [
  defType(BOOK, MIN_소인수, "04", "소인수분해", SEC.소인수, "easy", (rng) =>
    attempt(300, (): Body | null => {
      // 역산: 지수를 먼저 뽑아 N 을 만든다 — 답(소인수분해 꼴)이 먼저 있다.
      const kind = intBetween(rng, 0, 1);
      const f = randomFac(rng, intBetween(rng, 2, 3), 3, 24, 900);
      if (!f) return null;
      const N = facValue(f);
      const expSum = normFac(f).reduce((s, [, e]) => s + e, 0);
      if (kind === 1 && normFac(f).length !== 2) return null;
      if (kind === 1) {
        const [[p, m], [q, n]] = normFac(f) as [
          [number, number],
          [number, number],
        ];
        return {
          content: `$${N}$${nEul(N)} 소인수분해 하면 $a^{x}\\times b^{y}$이다. 이때 $x+y$의 값을 구하시오. (단, $a$, $b$는 $a<b$인 소수이다.)`,
          answer: `$${expSum}$`,
          solution: `$${N}$${nEul(N)} 작은 소수부터 차례로 나누면 $${N}=${facTex(f)}$이다.\n따라서 $a=${p}$, $x=${m}$, $b=${q}$, $y=${n}$이므로 $x+y=${m}+${n}=${expSum}$이다.`,
          facts: { kind, N, expSum, p1: p, e1: m, p2: q, e2: n },
        };
      }
      const nf = normFac(f);
      return {
        content: `$${N}$${nEul(N)} 소인수분해 하시오.`,
        answer: `$${facTex(f)}$`,
        solution: `$${N}$${nEul(N)} 작은 소수부터 차례로 나누어 몫이 소수가 될 때까지 계속한다.\n따라서 $${N}=${facTex(f)}$이다.`,
        facts: {
          kind,
          N,
          expSum,
          p1: nf[0]![0],
          e1: nf[0]![1],
          p2: nf[1]![0],
          e2: nf[1]![1],
          p3: nf[2]?.[0] ?? 0,
          e3: nf[2]?.[1] ?? 0,
        },
      };
    }),
  ),

  defType(BOOK, MIN_소인수, "05", "소인수 구하기", SEC.소인수, "easy", (rng) =>
    attempt(300, (): Body | null => {
      const kind = intBetween(rng, 0, 2); // 0 합 · 1 가장 큰 소인수 · 2 개수
      const k = intBetween(rng, 2, 3);
      const f = randomFac(rng, k, 3, 30, 1200);
      if (!f) return null;
      const nf = normFac(f);
      const primes = nf.map(([p]) => p);
      const N = facValue(f);
      const sum = primes.reduce((s, p) => s + p, 0);
      const biggest = primes[primes.length - 1]!;
      const answer = kind === 0 ? sum : kind === 1 ? biggest : primes.length;
      const ask =
        kind === 0
          ? "모든 소인수의 합"
          : kind === 1
            ? "가장 큰 소인수"
            : "서로 다른 소인수의 개수";
      const unit = kind === 2 ? "개" : "";
      return {
        content: `$${N}$의 ${ask}${wEul(ask)} 구하시오.`,
        answer: `$${answer}$${unit}`,
        solution: `$${N}=${facTex(f)}$이므로 $${N}$의 소인수는 ${primes
          .map((p) => `$${p}$`)
          .join(", ")}이다.\n따라서 ${ask}${wEun(ask)} $${answer}$${unit}이다.`,
        facts: {
          kind,
          N,
          answer,
          p1: nf[0]![0],
          e1: nf[0]![1],
          p2: nf[1]![0],
          e2: nf[1]![1],
          p3: nf[2]?.[0] ?? 0,
          e3: nf[2]?.[1] ?? 0,
        },
      };
    }),
  ),

  defType(BOOK, MIN_소인수, "06", "약수 구하기", SEC.소인수, "mid", (rng) =>
    attempt(300, (): Body | null => {
      const kind = intBetween(rng, 0, 2); // 0 두 번째로 큰 약수 · 1 제곱수인 약수 · 2 가장 큰 홀수
      // 2 를 반드시 넣는다 — kind 2(가장 큰 홀수)가 성립해야 한다.
      const odds = pickDistinct(
        rng,
        [3, 5, 7, 11] as const,
        intBetween(rng, 1, 2),
      );
      const f: [number, number][] = normFac([
        [2, intBetween(rng, 1, 3)],
        ...odds.map((p) => [p, intBetween(rng, 1, 2)] as [number, number]),
      ]);
      const N = facValue(f);
      if (N < 24 || N > 1500) return null;
      const e2 = f.find(([p]) => p === 2)![1];
      const squareCount = f.reduce(
        (s, [, e]) => s * (Math.floor(e / 2) + 1),
        1,
      );
      const oddPart = N / 2 ** e2;
      if (kind === 2 && oddPart === 1) return null;
      const second = N / 2;
      const answer = kind === 0 ? second : kind === 1 ? squareCount : oddPart;
      const ask =
        kind === 0
          ? "약수 중 두 번째로 큰 수"
          : kind === 1
            ? "약수 중 어떤 자연수의 제곱이 되는 수의 개수"
            : "약수 중 가장 큰 홀수";
      const unit = kind === 1 ? "개" : "";
      const solution =
        kind === 0
          ? `$${N}=${facTex(f)}$이고, 가장 큰 약수는 $${N}$ 자신이다.\n두 번째로 큰 약수는 $${N}$${nEul(N)} 가장 작은 소인수 $2$로 나눈 $${second}$이다.`
          : kind === 1
            ? `$${N}=${facTex(f)}$이다. 약수가 제곱수이려면 각 소인수의 지수가 짝수여야 하므로, 지수 $e$마다 고를 수 있는 값은 $0$부터 $e$ 이하의 짝수까지이다.\n따라서 그 개수는 $${f
                .map(([, e]) => Math.floor(e / 2) + 1)
                .join("\\times")}=${squareCount}$(개)이다.`
            : `$${N}=${facTex(f)}$이다. 홀수인 약수는 소인수 $2$를 갖지 않으므로 $${N}$에서 $2^{${e2}}$을 뺀 부분의 약수이다.\n따라서 가장 큰 홀수인 약수는 $${oddPart}$이다.`;
      return {
        content: `$${N}$의 ${ask}${wEul(ask)} 구하시오.`,
        answer: `$${answer}$${unit}`,
        solution,
        facts: { kind, N, answer, e2 },
      };
    }),
  ),

  defType(
    BOOK,
    MIN_소인수,
    "07",
    "약수의 개수 구하기",
    SEC.소인수,
    "easy",
    (rng) =>
      attempt(300, (): Body | null => {
        // 역산: 지수를 먼저 뽑으면 약수의 개수가 곱으로 따라 나온다.
        const kind = intBetween(rng, 0, 2); // 0 수로 제시 · 1 소인수분해 꼴로 제시 · 2 N/n 이 자연수
        const f = randomFac(rng, intBetween(rng, 2, 3), 3, 30, 3000);
        if (!f) return null;
        const N = facValue(f);
        const count = divisorCountFac(f);
        if (count < 4) return null;
        const shown = kind === 1 ? facTex(f) : `${N}`;
        const content =
          kind === 2
            ? `$\\frac{${N}}{n}$이 자연수가 되도록 하는 자연수 $n$의 개수를 구하시오.`
            : `$${shown}$의 약수의 개수를 구하시오.`;
        const lead =
          kind === 2
            ? `$\\frac{${N}}{n}$이 자연수이려면 $n$은 $${N}$의 약수여야 한다.\n`
            : "";
        return {
          content,
          answer: `$${count}$개`,
          solution: `${lead}$${N}=${facTex(f)}$이므로 약수의 개수는 각 지수에 $1$을 더하여 곱한 $${normFac(
            f,
          )
            .map(([, e]) => `(${e}+1)`)
            .join("\\times")}=${count}$(개)이다.`,
          facts: { kind, N, count },
        };
      }),
  ),

  defType(
    BOOK,
    MIN_소인수,
    "08",
    "약수의 개수가 주어질 때 지수 구하기",
    SEC.소인수,
    "mid",
    (rng) =>
      attempt(400, (): Body | null => {
        const kind = intBetween(rng, 0, 1); // 0 지수 하나 · 1 지수 둘(a>b)
        const [p, q] = pickDistinct(rng, [2, 3, 5, 7] as const, 2).sort(
          (x, y) => x - y,
        ) as [number, number];
        if (kind === 0) {
          // 역산: 답 a 를 먼저 뽑고, 그 a 가 나오도록 약수의 개수 k 를 정한다.
          const a = intBetween(rng, 2, 5);
          const n = intBetween(rng, 1, 4);
          const k = (a + 1) * (n + 1);
          const N = p ** a * q ** n;
          if (N > 40000) return null;
          return {
            content: `$${p}^{a}\\times${q}^{${n}}$의 약수의 개수가 $${k}$일 때, 자연수 $a$의 값을 구하시오.`,
            answer: `$${a}$`,
            solution: `약수의 개수는 지수에 $1$을 더하여 곱한 것이므로 $(a+1)\\times(${n}+1)=${k}$이다.\n$(a+1)\\times${n + 1}=${k}$에서 $a+1=${a + 1}$이므로 $a=${a}$이다.`,
            facts: { kind, p, q, n, k, a, N },
          };
        }
        // 역산: 답 (a, b) 를 먼저 뽑는다. a>b 조건이 답을 하나로 못 박는지 확인한다.
        const b = intBetween(rng, 1, 3);
        const a = intBetween(rng, b + 1, 6);
        const k = (a + 1) * (b + 1);
        const N = p ** a * q ** b;
        if (N > 40000) return null;
        // 「$a>b$ 이고 $(a+1)(b+1)=k$」를 만족시키는 쌍이 하나뿐이어야 한다.
        let hits = 0;
        for (let x = 1; x <= 20; x += 1) {
          for (let y = 1; y < x; y += 1) {
            if ((x + 1) * (y + 1) === k) hits += 1;
          }
        }
        if (hits !== 1) return null;
        return {
          content: `$${p}^{a}\\times${q}^{b}$의 약수의 개수가 $${k}$일 때, 자연수 $a$, $b$에 대하여 $a+b$의 값을 구하시오. (단, $a>b$이다.)`,
          answer: `$${a + b}$`,
          solution: `약수의 개수는 $(a+1)\\times(b+1)=${k}$이다.\n$a>b$인 자연수 $a$, $b$는 $a=${a}$, $b=${b}$뿐이므로 $a+b=${a}+${b}=${a + b}$이다.`,
          facts: { kind, p, q, a, b, k, N },
        };
      }),
  ),

  defType(
    BOOK,
    MIN_소인수,
    "09",
    "제곱인 수 만들기",
    SEC.소인수,
    "mid",
    (rng) =>
      attempt(400, (): Body | null => {
        const kind = intBetween(rng, 0, 2); // 0 곱하기 · 1 나누기 · 2 곱한 뒤 제곱근
        // 역산: 지수가 홀수인 소인수를 먼저 정하면 「곱할 수」가 곧 그 곱이다.
        const nf = randomFac(rng, intBetween(rng, 2, 3), 3, 40, 1200);
        if (!nf) return null;
        const odd = nf.filter(([, e]) => e % 2 === 1);
        if (odd.length === 0 || odd.length > 2) return null;
        const N = facValue(nf);
        const x = odd.reduce((s, [p]) => s * p, 1);
        if (x === 1) return null;
        // kind 1(나누기)은 N/x 가 제곱수가 되는 같은 x 다.
        const squared = kind === 1 ? N / x : N * x;
        const y = Math.round(Math.sqrt(squared));
        if (y * y !== squared) return null;
        const oddTex = odd.map(([p]) => `$${p}$`).join(", ");
        // 조사는 «목록의 마지막 수» 읽기를 따른다.
        const oddLast = odd[odd.length - 1]![0];
        if (kind === 0) {
          return {
            content: `$${N}$에 자연수를 곱하여 어떤 자연수의 제곱이 되도록 하려고 한다. 곱할 수 있는 가장 작은 자연수를 구하시오.`,
            answer: `$${x}$`,
            solution: `$${N}=${facTex(nf)}$이다. 제곱인 수는 모든 소인수의 지수가 짝수이므로, 지수가 홀수인 소인수 ${oddTex}${nEul(oddLast)} 한 번씩 더 곱해야 한다.\n따라서 곱할 수 있는 가장 작은 자연수는 $${x}$이다.`,
            facts: { kind, N, x, y, squared },
          };
        }
        if (kind === 1) {
          return {
            content: `$${N}$${nEul(N)} 자연수로 나누어 어떤 자연수의 제곱이 되도록 하려고 한다. 나눌 수 있는 가장 작은 자연수를 구하시오.`,
            answer: `$${x}$`,
            solution: `$${N}=${facTex(nf)}$이다. 지수가 홀수인 소인수 ${oddTex}${nEul(oddLast)} 한 번씩 없애야 모든 지수가 짝수가 된다.\n따라서 나눌 수 있는 가장 작은 자연수는 $${x}$이고, 이때 $${N}\\div${x}=${squared}=${y}^{2}$이다.`,
            facts: { kind, N, x, y, squared },
          };
        }
        return {
          content: `$${N}$에 가장 작은 자연수 $x$를 곱하여 어떤 자연수 $y$의 제곱이 되도록 할 때, $x+y$의 값을 구하시오.`,
          answer: `$${x + y}$`,
          solution: `$${N}=${facTex(nf)}$이므로 지수가 홀수인 소인수 ${oddTex}${nEul(oddLast)} 한 번씩 더 곱해야 한다. 즉 $x=${x}$이다.\n이때 $${N}\\times${x}=${squared}=${y}^{2}$이므로 $y=${y}$이고, $x+y=${x}+${y}=${x + y}$이다.`,
          facts: { kind, N, x, y, squared },
        };
      }),
  ),

  defType(
    BOOK,
    MIN_소인수,
    "10",
    "약수의 개수가 주어질 때  안에 들어 갈 수 있는 자연수 구하기",
    SEC.소인수,
    "hard",
    (rng) =>
      attempt(400, (): Body | null => {
        // 역산: □ 에 들어갈 답 x 를 먼저 뽑고, 그 x 에서 약수의 개수 k 를 만든다.
        // 그런 뒤 x 보다 작은 수로는 k 가 안 되는 것을 확인한다(답이 «가장 작은 수»).
        const base = randomFac(rng, intBetween(rng, 1, 2), 5, 6, 300);
        if (!base) return null;
        const B = facValue(base);
        const x = intBetween(rng, 2, 40);
        const k = divisorCountOf(B * x);
        if (k < 6 || k > 40) return null;
        for (let m = 1; m < x; m += 1) {
          if (divisorCountOf(B * m) === k) return null;
        }
        return {
          content: `$${facTex(base)}\\times\\square$의 약수의 개수가 $${k}$일 때, $\\square$ 안에 들어갈 수 있는 가장 작은 자연수를 구하시오.`,
          answer: `$${x}$`,
          solution: `$\\square$ 안에 $1$부터 차례로 넣어 $${facTex(
            base,
          )}\\times\\square$를 소인수분해 하고 약수의 개수를 세어 본다.\n$\\square=${x}$일 때 $${B}\\times${x}=${B * x}$의 약수의 개수가 처음으로 $${k}$가 된다.\n따라서 구하는 가장 작은 자연수는 $${x}$이다.`,
          facts: { B, x, k, N: B * x },
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 최대공약수와 최소공배수 01~16
// ═══════════════════════════════════════════════════════════

const 최대최소_TYPES: TypeEntry[] = [
  defType(BOOK, MIN_최대최소, "01", "서로소", SEC.최대, "easy", (rng) =>
    attempt(300, (): Body | null => {
      // 역산: 「N 과 서로소인 수」의 개수를 셀 범위를 먼저 정하고, N 은 소인수를
      // 우리가 고른 수로 만든다 — 세는 일은 발문 그대로 남는다.
      const f = randomFac(rng, intBetween(rng, 1, 2), 2, 6, 60);
      if (!f) return null;
      const N = facValue(f);
      const primes = normFac(f).map(([p]) => p);
      const limit = intBetween(rng, 15, 40);
      let count = 0;
      for (let v = 1; v <= limit; v += 1) {
        if (primes.every((p) => v % p !== 0)) count += 1;
      }
      if (count < 4) return null;
      return {
        content: `$${limit}$ 이하의 자연수 중에서 $${N}$${waGwa(N)} 서로소인 수의 개수를 구하시오.`,
        answer: `$${count}$개`,
        solution: `$${N}=${facTex(f)}$이므로 $${N}$의 소인수는 ${primes
          .map((p) => `$${p}$`)
          .join(
            ", ",
          )}이다.\n$${N}$${waGwa(N)} 서로소인 수는 이 소인수를 하나도 갖지 않는 수, 즉 ${primes
          .map((p) => `$${p}$`)
          .join(
            ", ",
          )}의 배수가 아닌 수이다.\n$${limit}$ 이하의 자연수 중 그런 수는 $${count}$개이다.`,
        facts: {
          N,
          limit,
          count,
          p1: primes[0]!,
          p2: primes[1] ?? 0,
        },
      };
    }),
  ),

  defType(
    BOOK,
    MIN_최대최소,
    "02",
    "최대공약수 구하기",
    SEC.최대,
    "easy",
    (rng) =>
      attempt(300, (): Body | null => {
        const kind = intBetween(rng, 0, 1); // 0 소인수분해 꼴 제시 · 1 수로 제시
        const g = gcdPair(rng, { maxG: 200, maxV: 2000, maxL: 200000 });
        if (!g) return null;
        if (g.G === 1) return null;
        const shownA = kind === 0 ? facTex(g.facA) : `${g.A}`;
        const shownB = kind === 0 ? facTex(g.facB) : `${g.B}`;
        const ansTex = kind === 0 ? facTex(g.g) : `${g.G}`;
        return {
          content: `두 수 $${shownA}$, $${shownB}$의 최대공약수를 구하시오.`,
          answer: `$${ansTex}$`,
          solution: `$${g.A}=${facTex(g.facA)}$, $${g.B}=${facTex(g.facB)}$이다.\n최대공약수는 공통인 소인수를 지수가 작거나 같은 것으로 택하여 곱한 $${facTex(
            g.g,
          )}=${g.G}$이다.`,
          facts: { kind, A: g.A, B: g.B, G: g.G },
        };
      }),
  ),

  defType(
    BOOK,
    MIN_최대최소,
    "03",
    "공약수와 최대공약수",
    SEC.최대,
    "mid",
    (rng) =>
      attempt(300, (): Body | null => {
        const kind = intBetween(rng, 0, 2); // 0 개수 · 1 가장 큰 수 · 2 두 번째로 큰 수
        const g = gcdPair(rng, { maxG: 300, maxV: 3000, maxL: 200000 });
        if (!g) return null;
        if (g.G < 4) return null;
        const dc = divisorCountFac(g.g);
        const smallestPrime = g.g[0]![0];
        const second = g.G / smallestPrime;
        const answer = kind === 0 ? dc : kind === 1 ? g.G : second;
        if (kind === 2 && second === 1) return null;
        const ask =
          kind === 0
            ? "공약수의 개수"
            : kind === 1
              ? "공약수 중 가장 큰 수"
              : "공약수 중 두 번째로 큰 수";
        const unit = kind === 0 ? "개" : "";
        const tail =
          kind === 0
            ? `공약수는 최대공약수 $${g.G}$의 약수이므로 그 개수는 $${g.G}=${facTex(
                g.g,
              )}$의 약수의 개수인 $${normFac(g.g)
                .map(([, e]) => `(${e}+1)`)
                .join("\\times")}=${dc}$(개)이다.`
            : kind === 1
              ? `공약수 중 가장 큰 수는 최대공약수 자신이므로 $${g.G}$이다.`
              : `공약수는 최대공약수 $${g.G}$의 약수이다. 두 번째로 큰 약수는 $${g.G}$${nEul(g.G)} 가장 작은 소인수 $${smallestPrime}$로 나눈 $${second}$이다.`;
        return {
          content: `두 수 $${g.A}$, $${g.B}$의 ${ask}${wEul(ask)} 구하시오.`,
          answer: `$${answer}$${unit}`,
          solution: `$${g.A}=${facTex(g.facA)}$, $${g.B}=${facTex(
            g.facB,
          )}$이므로 최대공약수는 $${facTex(g.g)}=${g.G}$이다.\n${tail}`,
          facts: { kind, A: g.A, B: g.B, G: g.G, answer },
        };
      }),
  ),

  defType(
    BOOK,
    MIN_최대최소,
    "04",
    "최대공약수의 활용 일정한 양을 가능한 한 많은 사람에게 나누어 주기",
    SEC.활용,
    "mid",
    (rng) =>
      attempt(300, (): Body | null => {
        const kind = intBetween(rng, 0, 2); // 0 사람 수 · 1 한 사람 몫(앞) · 2 두 몫의 합
        // 역산: 사람 수 g 와 «한 사람 몫» s, t 를 먼저 뽑는다. s, t 가 서로소이므로
        // 최대공약수가 정확히 g 다 — 생성기는 gcd 를 계산하지 않는다.
        const g = intBetween(rng, 6, 24);
        const st = coprimeQuotients(rng, 2, 12);
        if (!st) return null;
        const [s, t] = st;
        const A = g * s;
        const B = g * t;
        if (A > 400 || B > 400) return null;
        const [item1, item2] = pickDistinct(
          rng,
          ["사과", "귤", "배", "감", "사탕", "초콜릿", "공책", "연필"] as const,
          2,
        ) as [string, string];
        const answer = kind === 0 ? g : kind === 1 ? s : s + t;
        const ask =
          kind === 0
            ? `최대 몇 명의 학생에게 나누어 줄 수 있는지 구하시오.`
            : kind === 1
              ? `이때 한 학생이 받는 ${item1}의 개수를 구하시오.`
              : `이때 한 학생이 받는 ${item1}${wGwa(item1)} ${item2}의 개수의 합을 구하시오.`;
        const lead = kind === 0 ? "" : `가능한 한 많은 학생에게 나누어 줄 때, `;
        return {
          content: `${item1} $${A}$개와 ${item2} $${B}$개를 학생들에게 남김없이 똑같이 나누어 주려고 한다. ${lead}${ask}`,
          answer: `$${answer}$${kind === 0 ? "명" : "개"}`,
          solution: `남김없이 똑같이 나누어 주려면 학생 수는 $${A}$${nGwa(A)} $${B}$의 공약수여야 하고, 가능한 한 많이 나누어 주려면 최대공약수여야 한다.\n$${A}=${g}\\times${s}$, $${B}=${g}\\times${t}$이고 $${s}$${nGwa(s)} $${t}$${nEun(t)} 서로소이므로 최대공약수는 $${g}$이다.\n따라서 학생 수는 $${g}$명이고, 한 학생이 받는 ${item1}${wEun(item1)} $${s}$개, ${item2}${wEun(item2)} $${t}$개이다.`,
          facts: { kind, A, B, g, s, t, answer },
        };
      }),
  ),

  defType(
    BOOK,
    MIN_최대최소,
    "05",
    "최대공약수의 활용 직사각형 직육면체 채우기",
    SEC.활용,
    "mid",
    (rng) =>
      attempt(300, (): Body | null => {
        const kind = intBetween(rng, 0, 2); // 0 한 변 · 1 개수(직사각형) · 2 개수(직육면체)
        const g = intBetween(rng, 4, 30);
        if (kind === 2) {
          const uvw = coprimeTriple(rng, 2, 9);
          if (!uvw) return null;
          const [u, v, w] = uvw;
          const A = g * u;
          const B = g * v;
          const C = g * w;
          if (A > 600 || B > 600 || C > 600) return null;
          const cubes = u * v * w;
          return {
            content: `가로, 세로의 길이가 각각 $${A}\\,\\mathrm{cm}$, $${B}\\,\\mathrm{cm}$이고 높이가 $${C}\\,\\mathrm{cm}$인 직육면체 모양의 상자를 같은 크기의 정육면체 모양의 블록으로 빈틈없이 채우려고 한다. 블록의 크기를 최대로 할 때, 필요한 블록의 개수를 구하시오.`,
            answer: `$${cubes}$개`,
            solution: `블록의 한 모서리의 길이는 $${A}$, $${B}$, $${C}$의 공약수여야 하고, 크기를 최대로 하려면 최대공약수여야 한다.\n$${A}=${g}\\times${u}$, $${B}=${g}\\times${v}$, $${C}=${g}\\times${w}$이고 $${u}$, $${v}$, $${w}$${nEun(w)} 쌍마다 서로소이므로 최대공약수는 $${g}$이다.\n따라서 필요한 블록은 $${u}\\times${v}\\times${w}=${cubes}$(개)이다.`,
            facts: { kind, A, B, C, g, u, v, w, answer: cubes },
          };
        }
        const uv = coprimeQuotients(rng, 2, 12);
        if (!uv) return null;
        const [u, v] = uv;
        const A = g * u;
        const B = g * v;
        if (A > 600 || B > 600) return null;
        const tiles = u * v;
        const answer = kind === 0 ? g : tiles;
        const ask =
          kind === 0
            ? `타일의 한 변의 길이를 구하시오.`
            : `필요한 타일의 개수를 구하시오.`;
        return {
          content: `가로의 길이가 $${A}\\,\\mathrm{cm}$, 세로의 길이가 $${B}\\,\\mathrm{cm}$인 직사각형 모양의 벽에 같은 크기의 정사각형 모양의 타일을 빈틈없이 붙이려고 한다. 가능한 한 큰 타일을 붙일 때, ${ask}`,
          answer: kind === 0 ? `$${answer}\\,\\mathrm{cm}$` : `$${answer}$개`,
          solution: `타일의 한 변의 길이는 $${A}$${nGwa(A)} $${B}$의 공약수여야 하고, 가능한 한 크게 하려면 최대공약수여야 한다.\n$${A}=${g}\\times${u}$, $${B}=${g}\\times${v}$이고 $${u}$${nGwa(u)} $${v}$${nEun(v)} 서로소이므로 최대공약수는 $${g}$이다.\n따라서 타일의 한 변의 길이는 $${g}\\,\\mathrm{cm}$이고, 필요한 타일은 $${u}\\times${v}=${tiles}$(개)이다.`,
          facts: { kind, A, B, g, u, v, answer },
        };
      }),
  ),

  defType(
    BOOK,
    MIN_최대최소,
    "06",
    "최대공약수의 활용 일정한 간격으로 놓기",
    SEC.활용,
    "mid",
    (rng) =>
      attempt(300, (): Body | null => {
        const kind = intBetween(rng, 0, 1); // 0 개수 · 1 간격
        const g = intBetween(rng, 4, 30);
        const uv = coprimeQuotients(rng, 2, 12);
        if (!uv) return null;
        const [u, v] = uv;
        const A = g * u;
        const B = g * v;
        if (A > 600 || B > 600) return null;
        const trees = 2 * (u + v);
        const perimeter = 2 * (A + B);
        const [thing, unit] = pick(rng, [
          ["나무", "그루"],
          ["화분", "개"],
          ["기둥", "개"],
          ["가로등", "개"],
        ] as const);
        const answer = kind === 0 ? trees : g;
        const ask =
          kind === 0
            ? `필요한 ${thing}의 수를 구하시오.`
            : `${thing} 사이의 간격을 구하시오.`;
        return {
          content: `가로의 길이가 $${A}\\,\\mathrm{m}$, 세로의 길이가 $${B}\\,\\mathrm{m}$인 직사각형 모양의 땅의 둘레에 일정한 간격으로 ${thing}${wEul(thing)} 놓으려고 한다. 네 모퉁이에는 반드시 놓고 ${thing} 사이의 간격이 최대가 되게 할 때, ${ask}`,
          answer:
            kind === 0 ? `$${answer}$${unit}` : `$${answer}\\,\\mathrm{m}$`,
          solution: `간격은 $${A}$${nGwa(A)} $${B}$의 공약수여야 하고, 최대가 되려면 최대공약수여야 한다.\n$${A}=${g}\\times${u}$, $${B}=${g}\\times${v}$이고 $${u}$${nGwa(u)} $${v}$${nEun(v)} 서로소이므로 간격은 $${g}\\,\\mathrm{m}$이다.\n둘레의 길이가 $2\\times(${A}+${B})=${perimeter}\\,\\mathrm{m}$이므로 필요한 개수는 $${perimeter}\\div${g}=${trees}$이다.`,
          facts: { kind, A, B, g, u, v, trees, perimeter, answer },
        };
      }),
  ),

  defType(
    BOOK,
    MIN_최대최소,
    "07",
    "최소공배수 구하기",
    SEC.최소,
    "easy",
    (rng) =>
      attempt(300, (): Body | null => {
        const kind = intBetween(rng, 0, 1); // 0 소인수분해 꼴 제시 · 1 수로 제시
        const g = gcdPair(rng, { maxG: 60, maxV: 400, maxL: 6000 });
        if (!g) return null;
        const shownA = kind === 0 ? facTex(g.facA) : `${g.A}`;
        const shownB = kind === 0 ? facTex(g.facB) : `${g.B}`;
        const ansTex = kind === 0 ? facTex(g.facL) : `${g.L}`;
        return {
          content: `두 수 $${shownA}$, $${shownB}$의 최소공배수를 구하시오.`,
          answer: `$${ansTex}$`,
          solution: `$${g.A}=${facTex(g.facA)}$, $${g.B}=${facTex(g.facB)}$이다.\n최소공배수는 공통인 소인수와 공통이 아닌 소인수를 모두 곱하되, 공통인 것은 지수가 크거나 같은 것을 택하므로 $${facTex(
            g.facL,
          )}=${g.L}$이다.`,
          facts: { kind, A: g.A, B: g.B, L: g.L },
        };
      }),
  ),

  defType(
    BOOK,
    MIN_최대최소,
    "08",
    "공배수와 최소공배수",
    SEC.최소,
    "mid",
    (rng) =>
      attempt(400, (): Body | null => {
        const kind = intBetween(rng, 0, 2); // 0 범위 안 개수 · 1 가장 작은 세 자리 · 2 k번째
        const g = gcdPair(rng, {
          maxG: 40,
          maxV: 200,
          maxL: 600,
          pool: [2, 3, 5, 7],
        });
        if (!g) return null;
        const L = g.L;
        if (L < 12) return null;
        if (kind === 0) {
          const limit = L * intBetween(rng, 3, 9) + intBetween(rng, 0, L - 1);
          const count = Math.floor(limit / L);
          if (count < 3) return null;
          return {
            content: `두 수 $${g.A}$, $${g.B}$의 공배수 중 $${limit}$ 이하인 자연수의 개수를 구하시오.`,
            answer: `$${count}$개`,
            solution: `$${g.A}=${facTex(g.facA)}$, $${g.B}=${facTex(
              g.facB,
            )}$이므로 최소공배수는 $${L}$이다.\n공배수는 최소공배수의 배수이므로 $${limit}$ 이하인 것은 $${L}\\times1$부터 $${L}\\times${count}$까지 $${count}$개이다.`,
            facts: { kind, A: g.A, B: g.B, L, limit, answer: count },
          };
        }
        if (kind === 1) {
          if (L > 300) return null;
          const m = Math.ceil(100 / L);
          const value = L * m;
          if (value > 999) return null;
          return {
            content: `두 수 $${g.A}$, $${g.B}$의 공배수 중 가장 작은 세 자리 자연수를 구하시오.`,
            answer: `$${value}$`,
            solution: `$${g.A}=${facTex(g.facA)}$, $${g.B}=${facTex(
              g.facB,
            )}$이므로 최소공배수는 $${L}$이다.\n공배수는 $${L}$의 배수이고, 세 자리 자연수가 되는 가장 작은 것은 $${L}\\times${m}=${value}$이다.`,
            facts: { kind, A: g.A, B: g.B, L, m, answer: value },
          };
        }
        const k = intBetween(rng, 3, 7);
        const value = L * k;
        return {
          content: `두 수 $${g.A}$, $${g.B}$의 공배수 중 $${k}$번째로 작은 수를 구하시오.`,
          answer: `$${value}$`,
          solution: `$${g.A}=${facTex(g.facA)}$, $${g.B}=${facTex(
            g.facB,
          )}$이므로 최소공배수는 $${L}$이다.\n공배수는 최소공배수의 배수이므로 $${k}$번째로 작은 수는 $${L}\\times${k}=${value}$이다.`,
          facts: { kind, A: g.A, B: g.B, L, k, answer: value },
        };
      }),
  ),

  defType(
    BOOK,
    MIN_최대최소,
    "09",
    "최대공약수와 최소공배수가 주어질 때 지수 구하기",
    SEC.최소,
    "hard",
    (rng) =>
      attempt(400, (): Body | null => {
        // 역산: 답 (a, b) 를 먼저 뽑고 최대공약수·최소공배수를 만든다.
        // 소수 p 쪽은 «작은 쪽»이 a 라서 최대공약수가 a 를 못 박고,
        // 소수 q 쪽은 «큰 쪽»이 b 라서 최소공배수가 b 를 못 박는다.
        const [p, q, r] = pickDistinct(rng, [2, 3, 5, 7] as const, 3) as [
          number,
          number,
          number,
        ];
        const a = intBetween(rng, 1, 3);
        const pOther = intBetween(rng, a + 1, a + 3);
        const qOther = intBetween(rng, 1, 3);
        const b = intBetween(rng, qOther + 1, qOther + 3);
        const rExp = intBetween(rng, 1, 2);
        // A = p^a × q^qOther × r^rExp,  B = p^pOther × q^b
        const facA: [number, number][] = normFac([
          [p, a],
          [q, qOther],
          [r, rExp],
        ]);
        const facB: [number, number][] = normFac([
          [p, pOther],
          [q, b],
        ]);
        const facG: [number, number][] = normFac([
          [p, a],
          [q, qOther],
        ]);
        const facL: [number, number][] = normFac([
          [p, pOther],
          [q, b],
          [r, rExp],
        ]);
        // 소인수는 오름차순으로, 지수 $1$ 은 적지 않는다(미지수 a·b 는 남긴다).
        const symTex = (terms: [number, string][]): string =>
          [...terms]
            .sort((x, y) => x[0] - y[0])
            .map(([base, e]) => (e === "1" ? `${base}` : `${base}^{${e}}`))
            .join("\\times");
        const texA = symTex([
          [p, "a"],
          [q, `${qOther}`],
          [r, `${rExp}`],
        ]);
        const texB = symTex([
          [p, `${pOther}`],
          [q, "b"],
        ]);
        return {
          content: `두 수 $${texA}$, $${texB}$의 최대공약수가 $${facTex(
            facG,
          )}$, 최소공배수가 $${facTex(
            facL,
          )}$일 때, 자연수 $a$, $b$에 대하여 $a+b$의 값을 구하시오.`,
          answer: `$${a + b}$`,
          solution: `최대공약수는 공통인 소인수의 지수가 작거나 같은 것을 택하므로, 소인수 $${p}$에서 $\\min(a,\\,${pOther})=${a}$이다. 즉 $a=${a}$이다.\n최소공배수는 지수가 크거나 같은 것을 택하므로, 소인수 $${q}$에서 $\\max(${qOther},\\,b)=${b}$이다. 즉 $b=${b}$이다.\n따라서 $a+b=${a}+${b}=${a + b}$이다.`,
          facts: {
            p,
            q,
            r,
            a,
            b,
            pOther,
            qOther,
            rExp,
            A: facValue(facA),
            B: facValue(facB),
            G: facValue(facG),
            L: facValue(facL),
          },
        };
      }),
  ),

  defType(
    BOOK,
    MIN_최대최소,
    "10",
    "미지수가 포함된 세 수의 최소공배수",
    SEC.최소,
    "hard",
    (rng) =>
      attempt(400, (): Body | null => {
        const kind = intBetween(rng, 0, 1); // 0 x 구하기 · 1 세 수의 최대공약수
        // 역산: 답 x 를 먼저 뽑고, 세 계수의 최소공배수를 곱해 L 을 만든다.
        const x = intBetween(rng, 2, 15);
        const trio = pickDistinct(
          rng,
          [
            [4, 5, 6],
            [3, 4, 6],
            [2, 3, 4],
            [6, 8, 12],
            [4, 6, 9],
            [3, 5, 6],
            [2, 5, 8],
            [6, 9, 15],
          ] as const,
          1,
        )[0]!;
        const [c1, c2, c3] = trio;
        // 계수의 최소공배수·최대공약수는 표에서 직접 센다(호제법을 쓰지 않는다).
        let lc = 1;
        for (let v = 1; v <= c1 * c2 * c3; v += 1) {
          if (v % c1 === 0 && v % c2 === 0 && v % c3 === 0) {
            lc = v;
            break;
          }
        }
        let gc = 1;
        for (let v = 1; v <= Math.min(c1, c2, c3); v += 1) {
          if (c1 % v === 0 && c2 % v === 0 && c3 % v === 0) gc = v;
        }
        const L = lc * x;
        if (L > 3000) return null;
        const answer = kind === 0 ? x : gc * x;
        return {
          content:
            kind === 0
              ? `세 자연수 $${c1}\\times x$, $${c2}\\times x$, $${c3}\\times x$의 최소공배수가 $${L}$일 때, 자연수 $x$의 값을 구하시오.`
              : `세 자연수 $${c1}\\times x$, $${c2}\\times x$, $${c3}\\times x$의 최소공배수가 $${L}$일 때, 세 자연수의 최대공약수를 구하시오.`,
          answer: `$${answer}$`,
          solution: `세 수를 $x$로 묶으면 최소공배수는 $x$와 $${c1}$, $${c2}$, $${c3}$의 최소공배수 $${lc}$의 곱이다.\n$${lc}\\times x=${L}$이므로 $x=${x}$이다.${
            kind === 1
              ? `\n$${c1}$, $${c2}$, $${c3}$의 최대공약수가 $${gc}$이므로 세 자연수의 최대공약수는 $${gc}\\times${x}=${gc * x}$이다.`
              : ""
          }`,
          facts: { kind, c1, c2, c3, x, L, lc, gc, answer },
        };
      }),
  ),

  defType(
    BOOK,
    MIN_최대최소,
    "11",
    "최소공배수가 주어질 때 미지수 구하기",
    SEC.최소,
    "hard",
    (rng) =>
      attempt(400, (): Body | null => {
        const kind = intBetween(rng, 0, 1); // 0 가장 작은 N · 1 가능한 N 의 개수
        // 역산: 답 N 을 먼저 뽑고 최소공배수 L 을 만든 뒤, N 보다 작은 수로는
        // 그 L 이 안 나오는 것을 확인한다(배수 관계는 나눗셈으로만 본다).
        const g = gcdPair(rng, {
          maxG: 30,
          maxV: 120,
          maxL: 400,
          pool: [2, 3, 5, 7],
        });
        if (!g) return null;
        const A = g.A;
        const N0 = g.B;
        const L = g.L;
        if (L < 12 || L > 400) return null;
        const cands: number[] = [];
        for (let n = 1; n <= L; n += 1) {
          if (L % n !== 0) continue;
          // lcm(A, n) === L 인지 «배수 관계»로만 판정한다.
          let ok = L % A === 0;
          if (ok) {
            for (let m = 1; m < L; m += 1) {
              if (m % A === 0 && m % n === 0) {
                ok = false;
                break;
              }
            }
          }
          if (ok) cands.push(n);
        }
        if (cands.length === 0) return null;
        if (!cands.includes(N0)) return null;
        const answer = kind === 0 ? cands[0]! : cands.length;
        if (kind === 1 && cands.length < 2) return null;
        const ask =
          kind === 0
            ? `자연수 $N$ 중 가장 작은 수를 구하시오.`
            : `자연수 $N$의 개수를 구하시오.`;
        return {
          content: `두 자연수 $${A}$${waGwa(A)} $N$의 최소공배수가 $${L}$일 때, ${ask}`,
          answer: `$${answer}$${kind === 1 ? "개" : ""}`,
          solution: `$N$은 $${L}$의 약수여야 하고, $${A}$${waGwa(A)} $N$의 공배수 중 가장 작은 것이 $${L}$이어야 한다.\n조건을 만족시키는 $N$은 ${cands
            .map((v) => `$${v}$`)
            .join(
              ", ",
            )}의 $${cands.length}$개이고, 그중 가장 작은 수는 $${cands[0]!}$이다.`,
          facts: { kind, A, L, answer, count: cands.length, least: cands[0]! },
        };
      }),
  ),

  defType(
    BOOK,
    MIN_최대최소,
    "12",
    "최소공배수의 활용 정사각형 정육면체 만들기",
    SEC.활용,
    "mid",
    (rng) =>
      attempt(300, (): Body | null => {
        const kind = intBetween(rng, 0, 1); // 0 한 변 · 1 필요한 장수
        // 역산: 한 변 L 을 «가로·세로의 최소공배수»가 되도록 구성으로 만든다.
        const g = gcdPair(rng, {
          maxG: 20,
          maxV: 80,
          maxL: 400,
          pool: [2, 3, 5, 7],
        });
        if (!g) return null;
        const A = g.A;
        const B = g.B;
        const L = g.L;
        if (A === B || L > 400) return null;
        const sheets = (L / A) * (L / B);
        if (sheets < 4) return null;
        const answer = kind === 0 ? L : sheets;
        const ask =
          kind === 0
            ? `정사각형의 한 변의 길이를 구하시오.`
            : `필요한 종이의 장수를 구하시오.`;
        return {
          content: `가로의 길이가 $${A}\\,\\mathrm{cm}$, 세로의 길이가 $${B}\\,\\mathrm{cm}$인 직사각형 모양의 종이를 겹치지 않게 빈틈없이 늘어놓아 될 수 있는 대로 작은 정사각형을 만들려고 한다. ${ask}`,
          answer: kind === 0 ? `$${answer}\\,\\mathrm{cm}$` : `$${answer}$장`,
          solution: `정사각형의 한 변의 길이는 $${A}$${nGwa(A)} $${B}$의 공배수여야 하고, 될 수 있는 대로 작으려면 최소공배수여야 한다.\n$${A}=${facTex(
            g.facA,
          )}$, $${B}=${facTex(g.facB)}$이므로 최소공배수는 $${L}$이다.\n따라서 한 변의 길이는 $${L}\\,\\mathrm{cm}$이고, 필요한 종이는 가로로 $${L}\\div${A}=${L / A}$(장), 세로로 $${L}\\div${B}=${L / B}$(장)씩 놓으므로 $${L / A}\\times${L / B}=${sheets}$(장)이다.`,
          facts: { kind, A, B, L, sheets, answer },
        };
      }),
  ),

  defType(
    BOOK,
    MIN_최대최소,
    "13",
    "최소공배수의 활용 동시에 출발하여 다시 만나는 경우",
    SEC.활용,
    "mid",
    (rng) =>
      attempt(300, (): Body | null => {
        const kind = intBetween(rng, 0, 2); // 0 몇 분 후 · 1 시각 · 2 횟수
        const g = gcdPair(rng, {
          maxG: 12,
          maxV: 60,
          maxL: 180,
          pool: [2, 3, 5],
        });
        if (!g) return null;
        const a = g.A;
        const b = g.B;
        const L = g.L;
        if (a < 4 || b < 4 || L < 20 || L > 180) return null;
        // 「오전 hh시」로 적으므로 hh 는 11 을 넘으면 안 되고,
        // 「오후 (endHour-12)시」로 적으므로 endHour 는 12 를 넘어야 한다.
        const startHour = intBetween(rng, 6, 8);
        const endHour = intBetween(rng, 13, 16);
        const totalMin = (endHour - startHour) * 60;
        const times = Math.floor(totalMin / L);
        if (kind === 2 && times < 2) return null;
        const hh = startHour + Math.floor(L / 60);
        const mm = L % 60;
        if (hh > 11 || mm === 0) return null;
        const [lineA, lineB] = pickDistinct(
          rng,
          ["A", "B", "C", "D"] as const,
          2,
        ) as [string, string];
        if (kind === 0) {
          return {
            content: `어느 버스 정류장에서 ${lineA} 버스는 $${a}$분마다, ${lineB} 버스는 $${b}$분마다 출발한다. 두 버스가 오전 $${startHour}$시에 동시에 출발하였을 때, 그 후 처음으로 다시 동시에 출발하는 것은 몇 분 후인지 구하시오.`,
            answer: `$${L}$분 후`,
            solution: `두 버스가 동시에 출발하는 시간 간격은 $${a}$${nGwa(a)} $${b}$의 공배수이고, 처음으로 다시 만나는 것은 최소공배수일 때이다.\n$${a}=${facTex(
              g.facA,
            )}$, $${b}=${facTex(g.facB)}$이므로 최소공배수는 $${L}$이다.\n따라서 $${L}$분 후이다.`,
            facts: { kind, a, b, L, startHour, answer: L },
          };
        }
        if (kind === 1) {
          return {
            content: `어느 버스 정류장에서 ${lineA} 버스는 $${a}$분마다, ${lineB} 버스는 $${b}$분마다 출발한다. 두 버스가 오전 $${startHour}$시에 동시에 출발하였을 때, 그 후 처음으로 다시 동시에 출발하는 시각을 구하시오.`,
            answer: `오전 $${hh}$시 $${mm}$분`,
            solution: `$${a}$${nGwa(a)} $${b}$의 최소공배수가 $${L}$이므로 $${L}$분 후에 처음으로 다시 동시에 출발한다.\n${
              L < 60
                ? ""
                : `$${L}$분은 $${Math.floor(L / 60)}$시간 $${mm}$분이므로 `
            }구하는 시각은 오전 $${hh}$시 $${mm}$분이다.`,
            facts: { kind, a, b, L, startHour, hh, mm },
          };
        }
        return {
          content: `어느 버스 정류장에서 ${lineA} 버스는 $${a}$분마다, ${lineB} 버스는 $${b}$분마다 출발한다. 두 버스가 오전 $${startHour}$시에 동시에 출발하였을 때, 오전 $${startHour}$시부터 오후 $${endHour - 12}$시까지 두 버스가 동시에 출발하는 횟수를 구하시오. (단, 오전 $${startHour}$시에 출발한 것은 세지 않는다.)`,
          answer: `$${times}$번`,
          solution: `$${a}$${nGwa(a)} $${b}$의 최소공배수가 $${L}$이므로 $${L}$분마다 동시에 출발한다.\n오전 $${startHour}$시부터 오후 $${endHour - 12}$시까지는 $${totalMin}$분이므로 $${totalMin}\\div${L}$의 몫인 $${times}$번 동시에 출발한다.`,
          facts: { kind, a, b, L, startHour, endHour, totalMin, answer: times },
        };
      }),
  ),

  defType(
    BOOK,
    MIN_최대최소,
    "14",
    "최소공배수의 활용 맞물려 도는 톱니바퀴",
    SEC.활용,
    "mid",
    (rng) =>
      attempt(300, (): Body | null => {
        const kind = intBetween(rng, 0, 2); // 0 A 회전 수 · 1 맞물린 톱니 수 · 2 B 회전 수
        const g = gcdPair(rng, {
          maxG: 12,
          maxV: 60,
          maxL: 600,
          pool: [2, 3, 5, 7],
        });
        if (!g) return null;
        const a = g.A;
        const b = g.B;
        const L = g.L;
        if (a < 8 || b < 8 || L > 600) return null;
        const turnA = L / a;
        const turnB = L / b;
        if (turnA < 2 || turnB < 2) return null;
        const answer = kind === 0 ? turnA : kind === 1 ? L : turnB;
        const ask =
          kind === 0
            ? `두 톱니바퀴가 같은 톱니에서 처음으로 다시 맞물리려면 톱니바퀴 A는 몇 바퀴 회전해야 하는지 구하시오.`
            : kind === 1
              ? `두 톱니바퀴가 같은 톱니에서 처음으로 다시 맞물릴 때까지 맞물려 돌아간 톱니의 개수를 구하시오.`
              : `두 톱니바퀴가 같은 톱니에서 처음으로 다시 맞물리려면 톱니바퀴 B는 몇 바퀴 회전해야 하는지 구하시오.`;
        const unit = kind === 1 ? "개" : "바퀴";
        return {
          content: `톱니의 수가 각각 $${a}$개, $${b}$개인 두 톱니바퀴 A, B가 맞물려 돌아가고 있다. ${ask}`,
          answer: `$${answer}$${unit}`,
          solution: `처음으로 다시 같은 톱니에서 맞물릴 때까지 돌아간 톱니의 개수는 $${a}$${nGwa(a)} $${b}$의 최소공배수이다.\n$${a}=${facTex(
            g.facA,
          )}$, $${b}=${facTex(g.facB)}$이므로 최소공배수는 $${L}$이다.\n따라서 A는 $${L}\\div${a}=${turnA}$(바퀴), B는 $${L}\\div${b}=${turnB}$(바퀴) 회전한다.`,
          facts: { kind, a, b, L, turnA, turnB, answer },
        };
      }),
  ),

  defType(
    BOOK,
    MIN_최대최소,
    "15",
    "최대공약수와 최소공배수의 관계",
    SEC.활용,
    "hard",
    (rng) =>
      attempt(400, (): Body | null => {
        const kind = intBetween(rng, 0, 2); // 0 가장 큰 N · 1 가장 큰 것과 가장 작은 것의 합 · 2 개수
        // 역산: 최대공약수 G 와 최소공배수 L 을 구성으로 만들고, 조건을 만족시키는
        // N 을 전수로 찾는다. N 이 여럿이어야 문제가 성립한다.
        const [p, q, r] = pickDistinct(rng, [2, 3, 5, 7] as const, 3) as [
          number,
          number,
          number,
        ];
        const G = p * q;
        const A = G * p;
        const B = G * q;
        const L = G * p * q * r;
        if (L > 2000) return null;
        const cands: number[] = [];
        for (let n = 1; n <= L; n += 1) {
          if (L % n !== 0) continue;
          // 세 수의 최대공약수가 G, 최소공배수가 L 인지 «나눗셈»으로만 판정한다.
          let gg = 1;
          for (let v = 1; v <= Math.min(A, B, n); v += 1) {
            if (A % v === 0 && B % v === 0 && n % v === 0) gg = v;
          }
          if (gg !== G) continue;
          let ll = 0;
          for (let m = 1; m <= L; m += 1) {
            if (m % A === 0 && m % B === 0 && m % n === 0) {
              ll = m;
              break;
            }
          }
          if (ll !== L) continue;
          cands.push(n);
        }
        if (cands.length < 2) return null;
        const biggest = cands[cands.length - 1]!;
        const smallest = cands[0]!;
        const answer =
          kind === 0 ? biggest : kind === 1 ? biggest + smallest : cands.length;
        const ask =
          kind === 0
            ? `$N$의 값이 될 수 있는 수 중 가장 큰 수를 구하시오.`
            : kind === 1
              ? `$N$의 값이 될 수 있는 수 중 가장 큰 수와 가장 작은 수의 합을 구하시오.`
              : `$N$의 값이 될 수 있는 수의 개수를 구하시오.`;
        return {
          content: `세 자연수 $${A}$, $${B}$, $N$의 최대공약수가 $${G}$이고 최소공배수가 $${L}$일 때, ${ask}`,
          answer: `$${answer}$${kind === 2 ? "개" : ""}`,
          solution: `$N$은 최소공배수 $${L}$의 약수이면서, 세 수의 최대공약수가 $${G}$, 최소공배수가 $${L}$이 되어야 한다.\n조건을 만족시키는 $N$은 ${cands
            .map((v) => `$${v}$`)
            .join(
              ", ",
            )}의 $${cands.length}$개이다.\n따라서 가장 큰 수는 $${biggest}$, 가장 작은 수는 $${smallest}$이다.`,
          facts: {
            kind,
            A,
            B,
            G,
            L,
            biggest,
            smallest,
            count: cands.length,
            answer,
          },
        };
      }),
  ),

  defType(
    BOOK,
    MIN_최대최소,
    "16",
    "최대공약수와 최소공배수가 주어질 때  두 수의 합과 차 구하기",
    SEC.활용,
    "hard",
    (rng) =>
      attempt(400, (): Body | null => {
        const kind = intBetween(rng, 0, 2); // 0 합→차 · 1 차→합 · 2 합→큰 수
        // 역산: 최대공약수 G 와 서로소인 두 몫 a>b 를 먼저 뽑는다.
        // A=Ga, B=Gb 이므로 합·차·최소공배수가 계산 없이 정해진다.
        const G = intBetween(rng, 2, 15);
        const uv = coprimeQuotients(rng, 2, 13);
        if (!uv) return null;
        const [u, v] = uv;
        const a = Math.max(u, v);
        const b = Math.min(u, v);
        if (a === b) return null;
        const A = G * a;
        const B = G * b;
        const S = G * (a + b);
        const D = G * (a - b);
        const L = G * a * b;
        if (A > 400 || L > 3000 || D === 0) return null;
        // 조건을 만족시키는 쌍이 하나뿐인지 확인한다(전수).
        let hits = 0;
        for (let x = 1; x <= 40; x += 1) {
          for (let y = 1; y < x; y += 1) {
            if (x * y !== L / G) continue;
            const known = kind === 1 ? G * (x - y) === D : G * (x + y) === S;
            if (known) hits += 1;
          }
        }
        if (hits !== 1) return null;
        const given = kind === 1 ? `차가 $${D}$` : `합이 $${S}$`;
        const ask =
          kind === 0
            ? `$A-B$의 값을 구하시오.`
            : kind === 1
              ? `$A+B$의 값을 구하시오.`
              : `두 수 중 큰 수를 구하시오.`;
        const answer = kind === 0 ? D : kind === 1 ? S : A;
        return {
          content: `${given}이고 최대공약수가 $${G}$, 최소공배수가 $${L}$인 두 자연수를 $A$, $B$라 할 때, ${ask} (단, $A>B$이다.)`,
          answer: `$${answer}$`,
          solution: `최대공약수가 $${G}$이므로 $A=${G}\\times a$, $B=${G}\\times b$ ($a$, $b$는 서로소, $a>b$)로 놓을 수 있다.\n최소공배수가 $${L}$이므로 $${G}\\times a\\times b=${L}$에서 $a\\times b=${
            L / G
          }$이다.\n${
            kind === 1
              ? `차가 $${D}$이므로 $${G}\\times(a-b)=${D}$에서 $a-b=${a - b}$이다.`
              : `합이 $${S}$이므로 $${G}\\times(a+b)=${S}$에서 $a+b=${a + b}$이다.`
          }\n따라서 $a=${a}$, $b=${b}$이고 $A=${A}$, $B=${B}$이다.`,
          facts: { kind, G, L, S, D, A, B, a, b, answer },
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 정수와 유리수 01~15
// ═══════════════════════════════════════════════════════════

/** 유형 01 의 소재 — 부호의 뜻이 서로 반대인 낱말 쌍. */
const SIGN_CONTEXTS: readonly {
  intro: string;
  particle: string;
  pos: string;
  neg: string;
  unitIn: string;
  unitOut: string;
}[] = [
  {
    intro: "영상의 온도",
    particle: "를",
    pos: "영상",
    neg: "영하",
    unitIn: "\\,^{\\circ}\\mathrm{C}",
    unitOut: "",
  },
  {
    intro: "해수면보다 높은 것",
    particle: "을",
    pos: "해발",
    neg: "해저",
    unitIn: "\\,\\mathrm{m}",
    unitOut: "",
  },
  {
    intro: "수입",
    particle: "을",
    pos: "수입",
    neg: "지출",
    unitIn: "",
    unitOut: "원",
  },
  {
    intro: "증가한 것",
    particle: "을",
    pos: "증가",
    neg: "감소",
    unitIn: "\\,\\%",
    unitOut: "",
  },
];

/**
 * 유형 04 의 참·거짓 문장 — 「옳은 것의 개수」를 셀 재료.
 * 테스트는 이 표를 **딴 손으로 옮긴 자기 표**로 다시 판정한다(동어반복 금지).
 */
const PROPS: readonly { text: string; truth: boolean }[] = [
  { text: "모든 자연수는 정수이다.", truth: true },
  { text: "모든 정수는 유리수이다.", truth: true },
  { text: "모든 유리수는 정수이다.", truth: false },
  { text: "$0$은 정수이다.", truth: true },
  { text: "$0$은 양수도 음수도 아니다.", truth: true },
  { text: "$0$은 유리수가 아니다.", truth: false },
  { text: "음의 정수는 자연수이다.", truth: false },
  { text: "정수가 아닌 유리수가 있다.", truth: true },
  { text: "자연수가 아닌 양의 정수가 있다.", truth: false },
  { text: "가장 작은 정수가 있다.", truth: false },
  { text: "$-5$는 정수이면서 유리수이다.", truth: true },
  { text: "분모가 $1$인 분수는 정수로 나타낼 수 있다.", truth: true },
  { text: "$1$과 $2$ 사이에는 유리수가 없다.", truth: false },
  {
    text: "서로 다른 두 유리수 사이에는 항상 다른 유리수가 있다.",
    truth: true,
  },
];

const LABELS = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ"] as const;

/**
 * 유형 15 의 조건 — `id` 로 테스트와 계약한다.
 * 테스트는 같은 `id` 에 대해 **자기 손으로 옮긴 술어**로 다시 판정한다.
 */
const ORDER_CONDS: readonly { id: number; text: string }[] = [
  { id: 0, text: "$a$는 $b$보다 크다." },
  { id: 1, text: "$b$는 $c$보다 작다." },
  { id: 2, text: "$a$는 음수이다." },
  { id: 3, text: "$c$는 양수이다." },
  { id: 4, text: "$b$의 절댓값은 $a$의 절댓값보다 크다." },
  { id: 5, text: "$a$의 절댓값과 $c$의 절댓값은 같다." },
  {
    id: 6,
    text: "$c$를 수직선 위에 나타내면 $a$를 나타내는 점보다 오른쪽에 있다.",
  },
  { id: 7, text: "$b$는 $a$, $b$, $c$ 중 가장 작은 수이다." },
];

/** 생성기 쪽 술어 — 테스트는 이 배열을 쓰지 않고 자기 것을 쓴다. */
function orderCondHolds(id: number, a: number, b: number, c: number): boolean {
  switch (id) {
    case 0:
      return a > b;
    case 1:
      return b < c;
    case 2:
      return a < 0;
    case 3:
      return c > 0;
    case 4:
      return Math.abs(b) > Math.abs(a);
    case 5:
      return Math.abs(a) === Math.abs(c);
    case 6:
      return c > a;
    case 7:
      return b < a && b < c;
    default:
      throw new Error(`모르는 조건 id: ${id}`);
  }
}

/** 세 값의 대소 순서를 `$b<a<c$` 꼴로. */
function orderTex(a: number, b: number, c: number): string {
  const names: [string, number][] = [
    ["a", a],
    ["b", b],
    ["c", c],
  ];
  return `$${names
    .sort((x, y) => x[1] - y[1])
    .map(([n]) => n)
    .join("<")}$`;
}

const 정수_TYPES: TypeEntry[] = [
  defType(
    BOOK,
    MIN_정수,
    "01",
    "부호를 사용하여 나타내기",
    SEC.정수,
    "easy",
    (rng) =>
      attempt(300, (): Body | null => {
        const kind = intBetween(rng, 0, 1); // 0 a+b · 1 b-a
        const ctx = pick(rng, SIGN_CONTEXTS);
        // 역산: 답이 될 두 수 a(<0), b(>0) 를 먼저 뽑는다.
        const negVal =
          intBetween(rng, 2, 40) * (ctx.unitOut === "원" ? 100 : 1);
        const posVal =
          intBetween(rng, 2, 40) * (ctx.unitOut === "원" ? 100 : 1);
        const a = -negVal;
        const b = posVal;
        const answer = kind === 0 ? a + b : b - a;
        if (answer === 0) return null;
        const askTex = kind === 0 ? "a+b" : "b-a";
        return {
          content: `${ctx.intro}${ctx.particle} 양의 부호 $+$를 사용하여 나타낼 때, ${ctx.neg} $${negVal}${ctx.unitIn}$${ctx.unitOut}를 $a${ctx.unitIn}$${ctx.unitOut}, ${ctx.pos} $${posVal}${ctx.unitIn}$${ctx.unitOut}를 $b${ctx.unitIn}$${ctx.unitOut}로 나타낸다. 이때 $${askTex}$의 값을 구하시오.`,
          answer: `$${answer}$`,
          solution: `${ctx.pos}은 양의 부호를, ${ctx.neg}는 음의 부호를 사용하여 나타내므로 $a=${a}$, $b=${b}$이다.\n따라서 $${askTex}=${answer}$이다.`,
          facts: { kind, a, b, answer },
        };
      }),
  ),

  defType(BOOK, MIN_정수, "02", "정수의 분류", SEC.정수, "easy", (rng) =>
    attempt(400, (): Body | null => {
      const kind = intBetween(rng, 0, 3); // 0 양의 정수 · 1 음의 정수 · 2 정수 · 3 정수가 아닌 유리수
      const n = intBetween(rng, 6, 7);
      const toks = mixedToks(rng, n);
      if (!toks) return null;
      const ints = toks.filter(isIntegerTok);
      const pos = ints.filter((t) => tokValue(t) > 0);
      const neg = ints.filter((t) => tokValue(t) < 0);
      const nonInt = toks.filter((t) => !isIntegerTok(t));
      const answer =
        kind === 0
          ? pos.length
          : kind === 1
            ? neg.length
            : kind === 2
              ? ints.length
              : nonInt.length;
      if (answer < 1) return null;
      if (ints.length < 2 || nonInt.length < 2) return null;
      const ask =
        kind === 0
          ? "양의 정수"
          : kind === 1
            ? "음의 정수"
            : kind === 2
              ? "정수"
              : "정수가 아닌 유리수";
      const shown =
        kind === 0 ? pos : kind === 1 ? neg : kind === 2 ? ints : nonInt;
      return {
        content: `다음 수 중에서 ${ask}의 개수를 구하시오.\n${tokList(toks)}`,
        answer: `$${answer}$개`,
        solution: `분수는 약분하여 정수가 되는지 먼저 살핀다.\n${ask}는 ${tokList(
          shown,
        )}의 $${answer}$개이다.`,
        facts: { kind, n, answer, ...tokFacts(toks) },
      };
    }),
  ),

  defType(BOOK, MIN_정수, "03", "유리수의 분류", SEC.정수, "easy", (rng) =>
    attempt(400, (): Body | null => {
      const kind = intBetween(rng, 0, 3); // 0 정수가 아닌 유리수 · 1 양의 유리수 · 2 음의 유리수 · 3 정수
      const n = intBetween(rng, 6, 7);
      const toks = mixedToks(rng, n);
      if (!toks) return null;
      const ints = toks.filter(isIntegerTok);
      const nonInt = toks.filter((t) => !isIntegerTok(t));
      const posQ = toks.filter((t) => tokValue(t) > 0);
      const negQ = toks.filter((t) => tokValue(t) < 0);
      const answer =
        kind === 0
          ? nonInt.length
          : kind === 1
            ? posQ.length
            : kind === 2
              ? negQ.length
              : ints.length;
      if (answer < 1) return null;
      if (ints.length < 2 || nonInt.length < 2) return null;
      if (posQ.length < 1 || negQ.length < 1) return null;
      const ask =
        kind === 0
          ? "정수가 아닌 유리수"
          : kind === 1
            ? "양의 유리수"
            : kind === 2
              ? "음의 유리수"
              : "정수";
      const shown =
        kind === 0 ? nonInt : kind === 1 ? posQ : kind === 2 ? negQ : ints;
      return {
        content: `다음 유리수 중에서 ${ask}의 개수를 구하시오.\n${tokList(toks)}`,
        answer: `$${answer}$개`,
        solution: `분수는 약분하여 정수가 되는지 먼저 살피고, 부호로 양·음을 가른다.\n${ask}는 ${tokList(
          shown,
        )}의 $${answer}$개이다.`,
        facts: { kind, n, answer, ...tokFacts(toks) },
      };
    }),
  ),

  defType(
    BOOK,
    MIN_정수,
    "04",
    "정수와 유리수의 성질",
    SEC.정수,
    "mid",
    (rng) =>
      attempt(400, (): Body | null => {
        // 역산: 「옳은 것의 개수」를 먼저 정하고 그만큼 참인 문장을 고른다.
        const n = intBetween(rng, 4, 5);
        const trueCount = intBetween(rng, 1, n - 1);
        const trues = PROPS.filter((p) => p.truth);
        const falses = PROPS.filter((p) => !p.truth);
        if (trues.length < trueCount || falses.length < n - trueCount) {
          return null;
        }
        const picked = shuffle(rng, [
          ...pickDistinct(rng, trues, trueCount),
          ...pickDistinct(rng, falses, n - trueCount),
        ]);
        const lines = picked
          .map((p, i) => `${LABELS[i]!}. ${p.text}`)
          .join("\n");
        const right: string[] = [];
        picked.forEach((prop, i) => {
          if (prop.truth) right.push(LABELS[i]!);
        });
        return {
          content: `다음 중 옳은 것의 개수를 구하시오.\n${lines}`,
          answer: `$${trueCount}$개`,
          solution: `옳은 것은 ${right.join(", ")}이다.\n따라서 옳은 것은 $${trueCount}$개이다.`,
          facts: { n, trueCount },
        };
      }),
  ),

  defType(
    BOOK,
    MIN_정수,
    "05",
    "수를 수직선 위에 나타내기",
    SEC.정수,
    "easy",
    (rng) =>
      attempt(300, (): Body | null => {
        const kind = intBetween(rng, 0, 2); // 0 오른쪽 · 1 왼쪽 · 2 두 점 사이 거리
        if (kind === 2) {
          const s = intBetween(rng, -12, 12);
          const t = intBetween(rng, -12, 12);
          if (s === t) return null;
          const d = Math.abs(s - t);
          return {
            content: `수직선 위에서 $${s}$${nEul(s)} 나타내는 점과 $${t}$${nEul(t)} 나타내는 점 사이의 거리를 구하시오.`,
            answer: `$${d}$`,
            solution: `두 점 사이의 거리는 두 수의 차의 절댓값이다.\n$|${s}-(${t})|=${d}$이므로 구하는 거리는 $${d}$이다.`,
            facts: { kind, s, t, d },
          };
        }
        // 역산: 답이 될 점 x 를 먼저 뽑고 시작점을 되돌려 정한다.
        const x = intBetween(rng, -12, 12);
        const d = intBetween(rng, 2, 14);
        const s = kind === 0 ? x - d : x + d;
        const dir = kind === 0 ? "오른쪽" : "왼쪽";
        return {
          content: `수직선 위에서 $${s}$${nEul(s)} 나타내는 점으로부터 ${dir}으로 $${d}$만큼 떨어진 점이 나타내는 수를 구하시오.`,
          answer: `$${x}$`,
          solution: `${dir}으로 $${d}$만큼 이동하면 수는 $${d}$만큼 ${
            kind === 0 ? "커진다" : "작아진다"
          }.\n따라서 구하는 수는 $${s}${kind === 0 ? "+" : "-"}${d}=${x}$이다.`,
          facts: { kind, s, d, x },
        };
      }),
  ),

  defType(
    BOOK,
    MIN_정수,
    "06",
    "수직선 위의 두 점으로부터 같은 거리에 있는 점",
    SEC.정수,
    "mid",
    (rng) =>
      attempt(300, (): Body | null => {
        const kind = intBetween(rng, 0, 1); // 0 한가운데 점 · 1 두 수 중 큰 수
        // 역산: 한가운데 m 과 반거리 d 를 먼저 뽑아 두 수를 만든다.
        const m = intBetween(rng, -9, 9);
        const d = intBetween(rng, 2, 9);
        const lo = m - d;
        const hi = m + d;
        if (kind === 0) {
          return {
            content: `수직선 위에서 $${lo}$${nGwa(lo)} $${hi}$${nEul(hi)} 나타내는 두 점으로부터 같은 거리에 있는 점이 나타내는 수를 구하시오.`,
            answer: `$${m}$`,
            solution: `두 점으로부터 같은 거리에 있는 점은 두 점의 한가운데에 있다.\n두 수의 합의 절반이므로 $\\frac{${lo}+(${hi})}{2}=${m}$이다.`,
            facts: { kind, lo, hi, m, d },
          };
        }
        return {
          content: `수직선 위에서 두 수 $a$, $b$를 나타내는 두 점 사이의 거리가 $${
            2 * d
          }$이고, 두 점으로부터 같은 거리에 있는 점이 나타내는 수가 $${m}$이다. 두 수 중 큰 수를 구하시오.`,
          answer: `$${hi}$`,
          solution: `한가운데 점에서 양쪽으로 각각 $${2 * d}\\div2=${d}$만큼 떨어져 있다.\n따라서 두 수는 $${m}-${d}=${lo}$${nGwa(lo)} $${m}+${d}=${hi}$이고, 큰 수는 $${hi}$이다.`,
          facts: { kind, lo, hi, m, d },
        };
      }),
  ),

  defType(BOOK, MIN_정수, "07", "절댓값", SEC.정수, "easy", (rng) =>
    attempt(300, (): Body | null => {
      const kind = intBetween(rng, 0, 2); // 0 a+b · 1 a-b · 2 a×b
      const sign = intBetween(rng, 0, 1); // b 가 양수(0) 인가 음수(1) 인가
      const m = intBetween(rng, 2, 15);
      const n = intBetween(rng, 2, 15);
      const a = m;
      const b = sign === 0 ? n : -n;
      const answer = kind === 0 ? a + b : kind === 1 ? a - b : a * b;
      if (answer === 0) return null;
      const askTex = kind === 0 ? "a+b" : kind === 1 ? "a-b" : "a\\times b";
      const word = sign === 0 ? "양수" : "음수";
      return {
        content: `$-${m}$의 절댓값을 $a$, 절댓값이 $${n}$인 ${word}를 $b$라 할 때, $${askTex}$의 값을 구하시오.`,
        answer: `$${answer}$`,
        solution: `절댓값은 부호를 떼어 낸 수이므로 $a=${a}$이다.\n절댓값이 $${n}$인 ${word}는 $${b}$이므로 $b=${b}$이다.\n따라서 $${askTex}=${answer}$이다.`,
        facts: { kind, sign, m, n, a, b, answer },
      };
    }),
  ),

  defType(BOOK, MIN_정수, "08", "절댓값의 성질", SEC.정수, "mid", (rng) =>
    attempt(300, (): Body | null => {
      const kind = intBetween(rng, 0, 2); // 0 n 이하 · 1 n 미만 · 2 m 이상 n 이하
      if (kind === 2) {
        const lo = intBetween(rng, 1, 6);
        const hi = lo + intBetween(rng, 1, 6);
        const count = 2 * (hi - lo + 1);
        return {
          content: `절댓값이 $${lo}$ 이상 $${hi}$ 이하인 정수의 개수를 구하시오.`,
          answer: `$${count}$개`,
          solution: `절댓값이 $${lo}$ 이상 $${hi}$ 이하인 정수는 $${lo}$부터 $${hi}$까지의 양의 정수 $${
            hi - lo + 1
          }$개와 그 각각의 음수 $${hi - lo + 1}$개이다.\n따라서 모두 $${count}$개이다.`,
          facts: { kind, lo, hi, count },
        };
      }
      const n = intBetween(rng, 2, 12);
      const count = kind === 0 ? 2 * n + 1 : 2 * n - 1;
      const word = kind === 0 ? "이하" : "미만";
      const extra =
        kind === 0
          ? `$-${n}$부터 $${n}$까지의 정수이므로 $${n}$개의 음의 정수, $0$, $${n}$개의 양의 정수로 모두 $${count}$개이다.`
          : `$-${n - 1}$부터 $${n - 1}$까지의 정수이므로 $${n - 1}$개의 음의 정수, $0$, $${
              n - 1
            }$개의 양의 정수로 모두 $${count}$개이다.`;
      return {
        content: `절댓값이 $${n}$ ${word}인 정수의 개수를 구하시오.`,
        answer: `$${count}$개`,
        solution: `절댓값이 $${n}$ ${word}인 정수는 ${extra}`,
        facts: { kind, n, count },
      };
    }),
  ),

  defType(
    BOOK,
    MIN_정수,
    "09",
    "절댓값을 이용하여 수 찾기",
    SEC.정수,
    "mid",
    (rng) =>
      attempt(300, (): Body | null => {
        const kind = intBetween(rng, 0, 2); // 0 두 점 사이 거리 · 1 두 수의 합 · 2 두 수의 곱
        if (kind === 1) {
          const m = intBetween(rng, 2, 15);
          const n = intBetween(rng, 2, 15);
          if (m === n) return null;
          return {
            content: `절댓값이 $${m}$인 음수와 절댓값이 $${n}$인 양수의 합을 구하시오.`,
            answer: `$${n - m}$`,
            solution: `절댓값이 $${m}$인 음수는 $-${m}$이고, 절댓값이 $${n}$인 양수는 $${n}$이다.\n따라서 두 수의 합은 $-${m}+${n}=${n - m}$이다.`,
            facts: { kind, m, n, answer: n - m },
          };
        }
        const n = intBetween(rng, 2, 15);
        if (kind === 0) {
          return {
            content: `수직선 위에서 절댓값이 $${n}$인 두 수를 나타내는 두 점 사이의 거리를 구하시오.`,
            answer: `$${2 * n}$`,
            solution: `절댓값이 $${n}$인 수는 $${n}$${nGwa(n)} $-${n}$이다.\n두 점은 $0$을 나타내는 점에서 각각 $${n}$만큼 떨어져 있으므로 두 점 사이의 거리는 $${n}+${n}=${
              2 * n
            }$이다.`,
            facts: { kind, n, answer: 2 * n },
          };
        }
        return {
          content: `절댓값이 $${n}$인 두 수의 곱을 구하시오.`,
          answer: `$${-(n * n)}$`,
          solution: `절댓값이 $${n}$인 수는 $${n}$${nGwa(n)} $-${n}$이다.\n따라서 두 수의 곱은 $${n}\\times(-${n})=${-(n * n)}$이다.`,
          facts: { kind, n, answer: -(n * n) },
        };
      }),
  ),

  defType(
    BOOK,
    MIN_정수,
    "10",
    "절댓값이 같고 부호가 반대인 두 수",
    SEC.정수,
    "mid",
    (rng) =>
      attempt(300, (): Body | null => {
        const kind = intBetween(rng, 0, 2); // 0 큰 수 · 1 작은 수 · 2 거리
        // 역산: 큰 수 x 를 먼저 뽑으면 두 점 사이의 거리는 2x 다.
        const x = intBetween(rng, 2, 20);
        const d = 2 * x;
        if (kind === 2) {
          return {
            content: `절댓값이 같고 부호가 반대인 두 수 중 큰 수가 $${x}$일 때, 이 두 수를 나타내는 수직선 위의 두 점 사이의 거리를 구하시오.`,
            answer: `$${d}$`,
            solution: `두 수는 $${x}$${nGwa(x)} $-${x}$이다.\n두 점은 $0$을 나타내는 점에서 각각 $${x}$만큼 떨어져 있으므로 두 점 사이의 거리는 $${x}+${x}=${d}$이다.`,
            facts: { kind, x, d, answer: d },
          };
        }
        const answer = kind === 0 ? x : -x;
        const ask = kind === 0 ? "큰 수" : "작은 수";
        return {
          content: `절댓값이 같고 부호가 반대인 두 수를 나타내는 수직선 위의 두 점 사이의 거리가 $${d}$일 때, 두 수 중 ${ask}를 구하시오.`,
          answer: `$${answer}$`,
          solution: `절댓값이 같고 부호가 반대인 두 수는 $0$을 나타내는 점에서 같은 거리에 있다.\n두 점 사이의 거리가 $${d}$이므로 각각 $${d}\\div2=${x}$만큼 떨어져 있다.\n따라서 두 수는 $${x}$${nGwa(x)} $-${x}$이고, ${ask}는 $${answer}$이다.`,
          facts: { kind, x, d, answer },
        };
      }),
  ),

  defType(BOOK, MIN_정수, "11", "수의 대소 관계", SEC.대소, "mid", (rng) =>
    attempt(400, (): Body | null => {
      const kind = intBetween(rng, 0, 1); // 0 작은 것부터 · 1 큰 것부터
      const n = intBetween(rng, 4, 5);
      const toks = mixedToks(rng, n);
      if (!toks) return null;
      const k = intBetween(rng, 2, n - 1);
      const asc = [...toks].sort((x, y) => tokValue(x) - tokValue(y));
      const target = kind === 0 ? asc[k - 1]! : asc[n - k]!;
      const dir = kind === 0 ? "작은" : "큰";
      return {
        content: `다음 수를 ${dir} 것부터 차례로 나열할 때, $${k}$번째에 오는 수를 구하시오.\n${tokList(
          toks,
        )}`,
        answer: `$${target.tex}$`,
        solution: `분수와 소수를 견주기 쉽게 고쳐 크기를 비교하면 작은 것부터 차례로 ${tokList(
          asc,
        )}이다.\n따라서 ${dir} 것부터 $${k}$번째에 오는 수는 $${target.tex}$이다.`,
        facts: { kind, n, k, ...tokFacts(toks) },
      };
    }),
  ),

  defType(
    BOOK,
    MIN_정수,
    "12",
    "부등호를 사용하여 나타내기",
    SEC.대소,
    "easy",
    (rng) =>
      attempt(300, (): Body | null => {
        // 역산: 부등호 두 개를 먼저 정하고 그에 맞는 말을 고른다.
        const lowOps = [
          { text: "보다 크거나 같고", strict: 0 },
          { text: " 이상이고", strict: 0 },
          { text: "보다 작지 않고", strict: 0 },
          { text: "보다 크고", strict: 1 },
          { text: " 초과이고", strict: 1 },
        ] as const;
        const highOps = [
          { text: "보다 작거나 같다.", strict: 0 },
          { text: " 이하이다.", strict: 0 },
          { text: "보다 크지 않다.", strict: 0 },
          { text: "보다 작다.", strict: 1 },
          { text: " 미만이다.", strict: 1 },
        ] as const;
        const li = intBetween(rng, 0, lowOps.length - 1);
        const hi = intBetween(rng, 0, highOps.length - 1);
        const low = lowOps[li]!;
        const high = highOps[hi]!;
        const a = intBetween(rng, -12, 6);
        const b = a + intBetween(rng, 2, 14);
        const loSym = low.strict === 0 ? "\\le" : "<";
        const hiSym = high.strict === 0 ? "\\le" : "<";
        return {
          content: `다음을 부등호를 사용하여 나타내시오.\n$x$는 $${a}$${low.text} $${b}$${high.text}`,
          answer: `$${a}${loSym} x${hiSym}${b}$`,
          solution: `「크거나 같다」, 「이상」, 「작지 않다」는 $\\le$로, 「크다」, 「초과」는 $<$로 나타낸다.\n따라서 $${a}${loSym} x${hiSym}${b}$이다.`,
          facts: {
            a,
            b,
            lowIdx: li,
            highIdx: hi,
            loStrict: low.strict,
            hiStrict: high.strict,
          },
        };
      }),
  ),

  defType(
    BOOK,
    MIN_정수,
    "13",
    "두 유리수 사이에 있는 정수",
    SEC.대소,
    "mid",
    (rng) =>
      attempt(400, (): Body | null => {
        const kind = intBetween(rng, 0, 2); // 0 개수 · 1 가장 큰 정수 · 2 정수의 합
        // 역산: 사이에 들어갈 정수 구간 [lo, hi] 를 먼저 정하고,
        // 양 끝에 «정수가 아닌» 유리수를 놓아 그 구간이 정확히 답이 되게 한다.
        const lo = intBetween(rng, -6, 2);
        const hi = lo + intBetween(rng, 2, 6);
        const coprime = [
          [1, 2],
          [1, 3],
          [2, 3],
          [1, 4],
          [3, 4],
          [1, 5],
          [2, 5],
          [3, 5],
          [4, 5],
        ] as const;
        const [s1, t1] = pick(rng, coprime);
        const [s2, t2] = pick(rng, coprime);
        // 왼쪽 끝: lo-1 < L < lo  ·  오른쪽 끝: hi < R < hi+1
        const lNum = lo * t1 - s1;
        const rNum = hi * t2 + s2;
        const leftTex =
          lNum < 0 ? `-\\frac{${-lNum}}{${t1}}` : `\\frac{${lNum}}{${t1}}`;
        const rightTex =
          rNum < 0 ? `-\\frac{${-rNum}}{${t2}}` : `\\frac{${rNum}}{${t2}}`;
        const ints: number[] = [];
        for (let v = lo; v <= hi; v += 1) ints.push(v);
        const count = ints.length;
        const sum = ints.reduce((s, v) => s + v, 0);
        const answer = kind === 0 ? count : kind === 1 ? hi : sum;
        const ask =
          kind === 0
            ? "사이에 있는 정수의 개수를 구하시오."
            : kind === 1
              ? "사이에 있는 정수 중 가장 큰 수를 구하시오."
              : "사이에 있는 모든 정수의 합을 구하시오.";
        return {
          content: `두 유리수 $${leftTex}$${nGwa(fracTail(lNum, t1))} $${rightTex}$ ${ask}`,
          answer: `$${answer}$${kind === 0 ? "개" : ""}`,
          solution: `$${leftTex}$${nEun(fracTail(lNum, t1))} $${lo - 1}$${nGwa(lo - 1)} $${lo}$ 사이의 수이고, $${rightTex}$${nEun(fracTail(rNum, t2))} $${hi}$${nGwa(hi)} $${
            hi + 1
          }$ 사이의 수이다.\n따라서 두 수 사이에 있는 정수는 ${ints
            .map((v) => `$${v}$`)
            .join(", ")}의 $${count}$개이고, 구하는 값은 $${answer}$이다.`,
          facts: { kind, lo, hi, lNum, lDen: t1, rNum, rDen: t2, answer },
        };
      }),
  ),

  defType(BOOK, MIN_정수, "14", "절댓값의 응용", SEC.정수, "hard", (rng) =>
    attempt(300, (): Body | null => {
      const kind = intBetween(rng, 0, 2); // 0 b · 1 a · 2 a+b
      // 역산: |a| = t, |b| = k×t 를 먼저 정하면 두 점 사이의 거리가 t(1+k) 다.
      const t = intBetween(rng, 2, 12);
      const k = intBetween(rng, 2, 4);
      const a = -t;
      const b = k * t;
      const dist = t + k * t;
      const answer = kind === 0 ? b : kind === 1 ? a : a + b;
      const askTex = kind === 0 ? "b" : kind === 1 ? "a" : "a+b";
      return {
        content: `두 수 $a$, $b$에 대하여 $a<0$, $b>0$이고 $b$의 절댓값은 $a$의 절댓값의 $${k}$배이다. 수직선 위에서 $a$, $b$를 나타내는 두 점 사이의 거리가 $${dist}$일 때, $${askTex}$의 값을 구하시오.`,
        answer: `$${answer}$`,
        solution: `$a$의 절댓값을 $t$라 하면 $b$의 절댓값은 $${k}t$이다.\n$a<0$, $b>0$이므로 두 점 사이의 거리는 $t+${k}t=${
          k + 1
        }t$이고, $${k + 1}t=${dist}$에서 $t=${t}$이다.\n따라서 $a=${a}$, $b=${b}$이므로 $${askTex}=${answer}$이다.`,
        facts: { kind, t, k, a, b, dist, answer },
      };
    }),
  ),

  defType(
    BOOK,
    MIN_정수,
    "15",
    "조건을 만족시키는 수의 대소 관계",
    SEC.대소,
    "hard",
    (rng) =>
      attempt(400, (): Body | null => {
        // 역산: 실제 값 a, b, c 를 먼저 뽑고, 그 값에서 참인 조건만 골라 낸다.
        // 그런 다음 그 조건들이 **대소 순서를 하나로** 정하는지 전수로 확인한다.
        const a = intBetween(rng, -8, 8);
        const b = intBetween(rng, -8, 8);
        const c = intBetween(rng, -8, 8);
        if (a === b || b === c || a === c) return null;
        const holds = ORDER_CONDS.filter((cd) =>
          orderCondHolds(cd.id, a, b, c),
        );
        if (holds.length < 3) return null;
        const want = Math.min(intBetween(rng, 3, 4), holds.length);
        const chosen = pickDistinct(rng, holds, want);
        const ids = chosen.map((cd) => cd.id);
        // 같은 조건을 만족시키는 다른 (a, b, c) 가 다른 순서를 내면 문제가 안 된다.
        const wantOrder = orderTex(a, b, c);
        for (let x = -8; x <= 8; x += 1) {
          for (let y = -8; y <= 8; y += 1) {
            for (let z = -8; z <= 8; z += 1) {
              if (x === y || y === z || x === z) continue;
              if (!ids.every((id) => orderCondHolds(id, x, y, z))) continue;
              if (orderTex(x, y, z) !== wantOrder) return null;
            }
          }
        }
        const marks = ["(가)", "(나)", "(다)", "(라)"] as const;
        const lines = chosen
          .map((cd, i) => `${marks[i]!} ${cd.text}`)
          .join("\n");
        return {
          content: `다음 조건을 만족시키는 서로 다른 세 수 $a$, $b$, $c$의 대소 관계를 부등호를 사용하여 나타내시오.\n${lines}`,
          answer: wantOrder,
          solution: `조건을 모두 만족시키는 세 수를 수직선 위에 놓아 보면 $a=${a}$, $b=${b}$, $c=${c}$${nGwa(c)} 같은 자리 관계가 된다.\n따라서 대소 관계는 ${wantOrder}이다.`,
          facts: {
            a,
            b,
            c,
            n: ids.length,
            c1: ids[0]!,
            c2: ids[1]!,
            c3: ids[2]!,
            c4: ids[3] ?? -1,
          },
        };
      }),
  ),
];

/** 3B-수 세션이 낸 38유형. `m1Extra.ts` 가 이 배열 한 줄만 spread 한다. */
export const M1_NUM: TypeEntry[] = [
  ...소인수분해_TYPES,
  ...최대최소_TYPES,
  ...정수_TYPES,
];
