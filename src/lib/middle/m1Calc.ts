/**
 * 중1 「정수와 유리수의 계산」 — RPM 1-1 중단원 유형 27개 전량 (p54~67).
 *
 * 통째로 안 한 중단원이었다(물결 3B-계산). 우리 단원 셋에 나눠 붙는다 —
 * 「유리수의 덧셈과 뺄셈」·「유리수의 곱셈」·「유리수의 나눗셈」
 * (이름은 공유 DB `Unit.section` 실측 리터럴, 2026-08-23 조회).
 *
 * ## 이 갈래의 함정 — 검산이 동어반복이 되기 쉽다
 *
 * 다른 중단원은 「발문의 조건식을 테스트가 다시 세운다」로 독립 검산이 되지만,
 * 여기는 **«계산 결과»가 곧 답**이라 같은 식을 다시 계산하면 아무것도 못 잡는다.
 * 그래서 이 모듈의 짝 테스트(`middleM1Calc.test.ts`)는 **다른 길**로 값을 구한다:
 *
 *  - 분수 값: 생성기는 «약분해서 저장»하고, 테스트는 **약분하지 않고 교차곱**으로 견준다
 *    (`sn·(ad·bd) === (an·bd+bn·ad)·sd`). 교차곱은 약분에 불변이므로
 *    **기약인가는 따로** 잰다(`gcd=1` · 분모 ≥ 2) — 두 축이 갈라져야 둘 다 잡힌다.
 *  - 혼합 계산(21): 생성기는 괄호 순서대로 접고, 테스트는 **분배해서 항별로** 더한다.
 *  - 부호 결정(24)·대소 관계(25): 생성기는 규칙으로 정하고, 테스트는 **여덟 가지 부호를
 *    전부 대입**하거나 **구간의 표본점에 실제로 대입**해 다시 고른다.
 *  - $(-1)^n$(16): 생성기는 홀짝 규칙으로 접고, 테스트는 **구체적인 $n$ 을 넣어** 센다.
 *
 * ## 역산 방향 — 정직하게 적는다
 *
 * 계약은 「정답을 먼저 뽑고 발문을 역산한다」이다. 대부분 그렇게 했다(합·차·곱·몫의
 * 한쪽 항을 답에서 되돌려 뽑는다). 다만 **14·15·16·24·25** 는 답이 «주어진 수들의
 * 성질» 자체라 역산이 성립하지 않는다 — 그 다섯은 매개변수를 뽑은 뒤
 * **답이 깔끔한지·유일한지**를 조건으로 걸어 `attempt()` 로 다시 뽑고, 못 찾으면 던진다.
 * 없는 역산을 있는 척하지 않는다.
 *
 * ## 분수는 약분된 형태로만 끝난다
 *
 * $\dfrac{4}{2}$ 로 끝나면 그대로 지면에 나간다(2026-08-23 실제 결함 46자리).
 * 그래서 발문·정답의 분수는 **전부 기약**이고 분모가 $1$ 인 분수는 아예 안 쓴다.
 * 풀이의 통분 과정은 약분 전 분수를 보여도 되지만 **반드시 `=` 가 뒤따라야** 한다
 * (그 자리에서 «끝나지» 않는다는 뜻) — 테스트가 그 형태로 잰다.
 *
 * 숫자는 전부 `$...$` 안에 쓴다 (초등 rules.bareNumbers 가드와 같은 규칙).
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import type { MidProblem, TypeEntry } from "./types";
import { euroRo, eulReul, iGa } from "./m2Josa";

const GRADE = "중1";
const BOOK = "1-1";
const MINOR = "정수와 유리수의 계산";

/** 우리 Unit.section 정확한 이름 (공유 DB 실측 2026-08-23) */
const SEC = {
  덧뺄: "유리수의 덧셈과 뺄셈",
  곱: "유리수의 곱셈",
  나눗: "유리수의 나눗셈",
} as const;

/** 조건을 만족할 때까지 다시 뽑는다 — 못 찾으면 던진다(조용히 기본값 금지). */
function attempt<T>(tries: number, f: () => T | null): T {
  for (let i = 0; i < tries; i += 1) {
    const v = f();
    if (v !== null) return v;
  }
  throw new Error("유형 생성 재시도 초과 — 매개변수 범위를 확인하십시오");
}

type Body = Pick<MidProblem, "content" | "answer" | "solution" | "facts">;

function def(
  rpmType: string,
  rpmTitle: string,
  unitSection: string,
  difficulty: MidProblem["difficulty"],
  gen: (rng: Rng) => Body,
): TypeEntry {
  return {
    key: `${BOOK}|${MINOR}|${rpmType}`,
    grade: GRADE,
    unitSection,
    rpmBook: BOOK,
    rpmMinor: MINOR,
    rpmType,
    rpmTitle,
    handler: (rng) => ({
      grade: GRADE,
      unitSection,
      rpmBook: BOOK,
      rpmMinor: MINOR,
      rpmType,
      rpmTitle,
      difficulty,
      ...gen(rng),
    }),
  };
}

// ── 유리수 셈 (정확한 정수 분수 — 부동소수점을 쓰지 않는다) ──────────────

/** 기약이고 분모가 양수인 유리수. */
type Q = { n: number; d: number };

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b;
}

/** 분수를 **항상 기약**으로 만든다 — 여기 말고 다른 곳에서 Q 를 짓지 않는다. */
function q(n: number, d = 1): Q {
  if (d === 0) throw new Error("분모가 0인 유리수는 만들 수 없습니다");
  let sn = n;
  let sd = d;
  if (sd < 0) {
    sn = -sn;
    sd = -sd;
  }
  if (sn === 0) return { n: 0, d: 1 };
  const g = gcd(sn, sd);
  return { n: sn / g, d: sd / g };
}

function addQ(a: Q, b: Q): Q {
  return q(a.n * b.d + b.n * a.d, a.d * b.d);
}

function subQ(a: Q, b: Q): Q {
  return q(a.n * b.d - b.n * a.d, a.d * b.d);
}

function mulQ(a: Q, b: Q): Q {
  return q(a.n * b.n, a.d * b.d);
}

function divQ(a: Q, b: Q): Q {
  if (b.n === 0) throw new Error("0으로 나눌 수 없습니다");
  return q(a.n * b.d, a.d * b.n);
}

function negQ(a: Q): Q {
  return q(-a.n, a.d);
}

function powQ(a: Q, e: number): Q {
  if (e < 0) throw new Error("음의 지수는 이 모듈에서 쓰지 않습니다");
  let r = q(1);
  for (let i = 0; i < e; i += 1) r = mulQ(r, a);
  return r;
}

function eqQ(a: Q, b: Q): boolean {
  return a.n === b.n && a.d === b.d;
}

/** 지면에 낼 만큼 «깔끔한가» — 분자·분모가 커지면 다시 뽑는다. */
function nice(a: Q, maxN = 300, maxD = 60): boolean {
  return Math.abs(a.n) <= maxN && a.d <= maxD;
}

// ── KaTeX 표기 ────────────────────────────────────────────────────────

/** 기약 분수 하나. 분모가 $1$ 이면 정수로 쓴다 — `\dfrac{4}{1}` 을 만들지 않는다. */
function texQ(v: Q): string {
  if (v.d === 1) return `${v.n}`;
  return v.n < 0 ? `-\\dfrac{${-v.n}}{${v.d}}` : `\\dfrac{${v.n}}{${v.d}}`;
}

/** 부호를 뗀 몸통. */
function absTex(v: Q): string {
  return v.d === 1 ? `${Math.abs(v.n)}` : `\\dfrac{${Math.abs(v.n)}}{${v.d}}`;
}

/** 괄호 안에 부호를 붙여 쓴 꼴 — `\left(+\dfrac{2}{3}\right)`. */
function texSigned(v: Q): string {
  return `\\left(${v.n < 0 ? "-" : "+"}${absTex(v)}\\right)`;
}

/** 부호가 생략된 꼴 — 첫 항은 양수면 부호를 안 쓴다. */
function texTerm(v: Q, first: boolean): string {
  if (first) return v.n < 0 ? `-${absTex(v)}` : absTex(v);
  return `${v.n < 0 ? "-" : "+"}${absTex(v)}`;
}

/**
 * **약분하지 않은** 분수 — 통분 과정에만 쓴다. 부호는 밖으로 뺀다
 * (`\dfrac{-8}{6}` 을 만들지 않는다). 뒤에 반드시 `=` 가 오게 쓸 것.
 */
function texRawFrac(n: number, d: number): string {
  if (d === 1) return `${n}`;
  return n < 0 ? `-\\dfrac{${-n}}{${d}}` : `\\dfrac{${n}}{${d}}`;
}

/** `facts` 에 유리수를 분자·분모 두 수로 남긴다 — 테스트가 여기서 다시 센다. */
function fq(prefix: string, v: Q): Record<string, number> {
  return { [`${prefix}n`]: v.n, [`${prefix}d`]: v.d };
}

// ── 풀이 소품 ─────────────────────────────────────────────────────────

/** 여러 항의 덧셈 풀이 — 통분해 한 분수로 모으고 **기약으로 끝낸다**. */
function addSolution(terms: readonly Q[], S: Q): string {
  const left = terms
    .map((t, i) => (i === 0 ? texSigned(t) : `+${texSigned(t)}`))
    .join("");
  const lcd = terms.reduce((acc, t) => lcm(acc, t.d), 1);
  const fin = texQ(S);
  if (lcd === 1) return `$${left}=${fin}$이다.`;
  const num = terms.reduce((acc, t) => acc + t.n * (lcd / t.d), 0);
  const mid = texRawFrac(num, lcd);
  // 「통분하면」이라고만 쓰면 뒤에 통분한 **항들**이 올 것처럼 읽힌다 —
  // 실제로 오는 것은 모아 더한 한 분수다. 지면에서 그렇게 보였다.
  //
  // 그리고 모아 놓은 분수가 **딱 떨어지면** 그 중간 단계는 지면에서 답과 똑같이
  // 보인다(제품 렌더러가 $\dfrac{16}{2}$ 를 $-8$ 로 접는다 — `improperToMixed`).
  // 그대로 두면 `=-8=-8` 이 찍힌다. 실제로 그렇게 나갔다.
  const redundant = mid === fin || num % lcd === 0;
  if (redundant)
    return `분모를 $${lcd}$${euroRo(lcd)} 통분하여 더하면 $${left}=${fin}$이다.`;
  return `분모를 $${lcd}$${euroRo(lcd)} 통분하여 더하면 $${left}=${mid}=${fin}$이다.`;
}

/** 분모가 `dens` 안에 있는 $0$ 아닌 유리수 하나(약분되어 분모가 줄 수 있다). */
function randQ(rng: Rng, dens: readonly number[], maxAbsN: number): Q {
  return attempt(80, () => {
    const d = pick(rng, dens);
    const n = intBetween(rng, -maxAbsN, maxAbsN);
    if (n === 0) return null;
    return q(n, d);
  });
}

/** 반드시 «진짜 분수»(분모 ≥ 2)인 유리수 하나. */
function randFrac(rng: Rng, dens: readonly number[], maxAbsN: number): Q {
  return attempt(120, () => {
    const v = randQ(rng, dens, maxAbsN);
    return v.d === 1 ? null : v;
  });
}

const DENS = [2, 3, 4, 5, 6, 8, 10, 12] as const;

// ── $(-1)^n$ 항 (유형 16) ────────────────────────────────────────────
/**
 * 한 항 = 부호 · 밑 · 지수. `base` 가 $1$ 이면 `-1^{...}` 꼴이라 지수와 상관없이
 * 항상 $-1$ 이다(밑이 $1$ 이므로). `base` 가 $-1$ 이면 지수 $an+b$ 의 홀짝이 정한다.
 */
type NegTerm = {
  code: number;
  tex: string;
  base: 1 | -1;
  a: number;
  b: number;
};

const NEG_TERMS: readonly NegTerm[] = [
  { code: 1, tex: "-1^{n}", base: 1, a: 1, b: 0 },
  { code: 2, tex: "(-1)^{n}", base: -1, a: 1, b: 0 },
  { code: 3, tex: "(-1)^{n+1}", base: -1, a: 1, b: 1 },
  { code: 4, tex: "(-1)^{n+2}", base: -1, a: 1, b: 2 },
  { code: 5, tex: "(-1)^{2\\times n}", base: -1, a: 2, b: 0 },
  { code: 6, tex: "(-1)^{2n+1}", base: -1, a: 2, b: 1 },
  { code: 7, tex: "-1^{n+1}", base: 1, a: 1, b: 1 },
];

/** 밑이 $1$ 이면 $-1$, 아니면 지수의 홀짝. */
function negTermValue(t: NegTerm, n: number): number {
  if (t.base === 1) return -1;
  return (t.a * n + t.b) % 2 === 0 ? 1 : -1;
}

// ── 문자 대소 (유형 25) ───────────────────────────────────────────────

type Cand = { code: number; tex: string; f: (a: number) => number };

/**
 * `f` 는 «구간 안에서 순서가 늘 같은가»를 볼 때 쓰는 근삿값,
 * `q` 는 **풀이에 적을 정확한 값**이다 — 대입해 보인 수가 소수로 나가면 안 된다.
 */
type CandQ = Cand & { q: (a: Q) => Q };

const CANDS: readonly CandQ[] = [
  { code: 1, tex: "a", f: (a) => a, q: (a) => a },
  { code: 2, tex: "-a", f: (a) => -a, q: (a) => negQ(a) },
  { code: 3, tex: "a^{2}", f: (a) => a * a, q: (a) => powQ(a, 2) },
  { code: 4, tex: "-a^{2}", f: (a) => -(a * a), q: (a) => negQ(powQ(a, 2)) },
  { code: 5, tex: "a^{3}", f: (a) => a * a * a, q: (a) => powQ(a, 3) },
  {
    code: 6,
    tex: "-a^{3}",
    f: (a) => -(a * a * a),
    q: (a) => negQ(powQ(a, 3)),
  },
  {
    code: 7,
    tex: "\\dfrac{1}{a}",
    f: (a) => 1 / a,
    q: (a) => divQ(q(1), a),
  },
  {
    code: 8,
    tex: "-\\dfrac{1}{a}",
    f: (a) => -1 / a,
    q: (a) => negQ(divQ(q(1), a)),
  },
  {
    code: 9,
    tex: "\\dfrac{1}{a^{2}}",
    f: (a) => 1 / (a * a),
    q: (a) => divQ(q(1), powQ(a, 2)),
  },
];

/** `probe` 는 구간 **안쪽**의 딱 떨어지는 수 — 풀이에서 실제로 대입해 보인다. */
type Range = {
  code: number;
  tex: string;
  lo: number;
  hi: number;
  probe: Q;
};

const RANGES: readonly Range[] = [
  { code: 1, tex: "-1<a<0", lo: -1, hi: 0, probe: q(-1, 2) },
  { code: 2, tex: "0<a<1", lo: 0, hi: 1, probe: q(1, 2) },
  { code: 3, tex: "a<-1", lo: -5, hi: -1, probe: q(-2) },
  { code: 4, tex: "a>1", lo: 1, hi: 5, probe: q(2) },
];

/** 열린 구간 안쪽 표본점 — 끝점은 넣지 않는다. */
function sampleRange(r: Range, ts: readonly number[]): number[] {
  return ts.map((t) => r.lo + (r.hi - r.lo) * t);
}

const GEN_TS = [0.07, 0.19, 0.31, 0.5, 0.63, 0.79, 0.93] as const;

// ── 부호 결정 (유형 24) ───────────────────────────────────────────────

/**
 * 조건 셋이 부호 셋을 **유일하게** 정하는지 여덟 가지를 다 대 본다.
 * 유일하지 않으면 생성기가 다시 뽑는다 — 답이 여럿인 문항을 내지 않는다.
 */
function signSolutions(
  s1: number,
  s2: number,
  s3: number,
  useSum: boolean,
): { a: number; b: number; c: number }[] {
  const out: { a: number; b: number; c: number }[] = [];
  for (const a of [1, -1]) {
    for (const b of [1, -1]) {
      for (const c of [1, -1]) {
        if (Math.sign(a * b) !== s1) continue;
        const second = useSum ? a + b : a - b;
        if (Math.sign(second) !== s2) continue;
        if (Math.sign(a / c) !== s3) continue;
        out.push({ a, b, c });
      }
    }
  }
  return out;
}

function signText(s: number): string {
  return s > 0 ? ">0" : "<0";
}

// ── 유형 27 목록 ──────────────────────────────────────────────────────

export const M1_CALC: TypeEntry[] = [
  // ══ 유리수의 덧셈과 뺄셈 (01~11) ════════════════════════════════════

  def("01", "유리수의 덧셈", SEC.덧뺄, "기본", (rng) =>
    attempt(200, () => {
      const m = pick(rng, DENS);
      const S = q(intBetween(rng, -24, 24), m); // ← 답을 먼저 뽑는다
      if (S.n === 0) return null;
      const A = q(intBetween(rng, -24, 24), m);
      if (A.n === 0) return null;
      const B = subQ(S, A); // 발문의 둘째 수를 답에서 역산
      if (B.n === 0) return null;
      if (A.d === 1 && B.d === 1) return null; // 분수가 적어도 하나
      if (!nice(A) || !nice(B) || !nice(S)) return null;
      return {
        content: `다음을 계산하시오. $${texSigned(A)}+${texSigned(B)}$`,
        answer: `$${texQ(S)}$`,
        solution: addSolution([A, B], S),
        facts: { ...fq("a", A), ...fq("b", B), ...fq("s", S) },
      };
    }),
  ),

  def("02", "덧셈의 계산 법칙", SEC.덧뺄, "기본", (rng) =>
    attempt(200, () => {
      const m = pick(rng, [3, 4, 5, 6, 8, 10] as const);
      const S = q(intBetween(rng, -20, 20), m); // ← 답을 먼저
      if (S.n === 0) return null;
      const k = q(intBetween(rng, -6, 6));
      if (k.n === 0) return null;
      const U = subQ(S, k); // 분모가 같은 두 항의 합
      const A = q(intBetween(rng, -20, 20), m);
      if (A.n === 0) return null;
      const C = subQ(U, A);
      if (C.n === 0) return null;
      if (A.d === 1 || C.d === 1) return null; // 묶을 두 항은 분수라야 티가 난다
      if (A.d !== C.d) return null;
      if (!nice(A) || !nice(C) || !nice(S)) return null;
      const line = `$${texSigned(A)}+${texSigned(k)}+${texSigned(C)}$`;
      return {
        content: `덧셈의 교환법칙과 결합법칙을 이용하여 다음을 계산하시오. ${line}`,
        answer: `$${texQ(S)}$`,
        solution:
          `교환법칙으로 분모가 같은 두 수를 모으면 $${texSigned(A)}+${texSigned(C)}+${texSigned(k)}$이다.\n` +
          `결합법칙으로 앞의 두 수를 먼저 더하면 $\\left\\{${texSigned(A)}+${texSigned(C)}\\right\\}+${texSigned(k)}=${texSigned(U)}+${texSigned(k)}$이다.\n` +
          `${addSolution([U, k], S)}`,
        facts: {
          ...fq("a", A),
          ...fq("k", k),
          ...fq("c", C),
          ...fq("s", S),
        },
      };
    }),
  ),

  def("03", "유리수의 뺄셈", SEC.덧뺄, "기본", (rng) =>
    attempt(200, () => {
      const m = pick(rng, DENS);
      const S = q(intBetween(rng, -24, 24), m); // ← 답을 먼저
      if (S.n === 0) return null;
      const A = q(intBetween(rng, -24, 24), m);
      if (A.n === 0) return null;
      const B = subQ(A, S); // 빼는 수를 답에서 역산
      if (B.n === 0) return null;
      if (A.d === 1 && B.d === 1) return null;
      if (!nice(A) || !nice(B) || !nice(S)) return null;
      return {
        content: `다음을 계산하시오. $${texSigned(A)}-${texSigned(B)}$`,
        answer: `$${texQ(S)}$`,
        solution:
          `빼는 수의 부호를 바꾸어 더하면 $${texSigned(A)}-${texSigned(B)}=${texSigned(A)}+${texSigned(negQ(B))}$이다.\n` +
          `${addSolution([A, negQ(B)], S)}`,
        facts: { ...fq("a", A), ...fq("b", B), ...fq("s", S) },
      };
    }),
  ),

  def("04", "덧셈과 뺄셈의 혼합 계산", SEC.덧뺄, "응용", (rng) =>
    attempt(200, () => {
      const m = pick(rng, DENS);
      const S = q(intBetween(rng, -20, 20), m); // ← 답을 먼저
      if (S.n === 0) return null;
      const A = q(intBetween(rng, -18, 18), m);
      const B = q(intBetween(rng, -18, 18), m);
      const C = q(intBetween(rng, -18, 18), m);
      if (A.n === 0 || B.n === 0 || C.n === 0) return null;
      // S = A + B - C - D  ⇒  D 를 역산한다
      const D = subQ(subQ(addQ(A, B), C), S);
      if (D.n === 0) return null;
      if (!nice(A) || !nice(B) || !nice(C) || !nice(D) || !nice(S)) return null;
      if ([A, B, C, D].every((v) => v.d === 1)) return null;
      const line = `$${texSigned(A)}+${texSigned(B)}-${texSigned(C)}-${texSigned(D)}$`;
      return {
        content: `다음을 계산하시오. ${line}`,
        answer: `$${texQ(S)}$`,
        solution:
          `뺄셈을 모두 덧셈으로 고치면 $${texSigned(A)}+${texSigned(B)}+${texSigned(negQ(C))}+${texSigned(negQ(D))}$이다.\n` +
          `${addSolution([A, B, negQ(C), negQ(D)], S)}`,
        facts: {
          ...fq("a", A),
          ...fq("b", B),
          ...fq("c", C),
          ...fq("d", D),
          ...fq("s", S),
        },
      };
    }),
  ),

  def("05", "부호가 생략된 수의 덧셈과 뺄셈", SEC.덧뺄, "응용", (rng) =>
    attempt(200, () => {
      const m = pick(rng, DENS);
      const S = q(intBetween(rng, -20, 20), m); // ← 답을 먼저
      if (S.n === 0) return null;
      const A = q(intBetween(rng, -16, 16), m);
      const B = q(intBetween(rng, -8, 8));
      const C = q(intBetween(rng, -16, 16), m);
      if (A.n === 0 || B.n === 0 || C.n === 0) return null;
      const D = subQ(S, addQ(addQ(A, B), C)); // 마지막 항을 역산
      if (D.n === 0) return null;
      if (!nice(A) || !nice(C) || !nice(D) || !nice(S)) return null;
      if ([A, C, D].every((v) => v.d === 1)) return null;
      const terms = [A, B, C, D];
      const bare = terms.map((t, i) => texTerm(t, i === 0)).join("");
      const parened = terms
        .map((t, i) => (i === 0 ? texSigned(t) : `+${texSigned(t)}`))
        .join("");
      return {
        content: `다음을 계산하시오. $${bare}$`,
        answer: `$${texQ(S)}$`,
        solution:
          `생략된 부호와 괄호를 살리면 $${bare}=${parened}$이다.\n` +
          `${addSolution(terms, S)}`,
        facts: {
          ...fq("a", A),
          ...fq("b", B),
          ...fq("c", C),
          ...fq("d", D),
          ...fq("s", S),
        },
      };
    }),
  ),

  def("06", "어떤 수보다 만큼 큰 수 또는 작은 수", SEC.덧뺄, "응용", (rng) =>
    attempt(200, () => {
      const m = pick(rng, DENS);
      const A = q(intBetween(rng, -18, 18), m); // ← 두 수를 먼저 정한다
      const B = q(intBetween(rng, -18, 18), m);
      if (A.n === 0 || B.n === 0 || eqQ(A, B)) return null;
      const X = q(intBetween(rng, -9, 9)); // 기준 수
      const Y = q(intBetween(rng, -9, 9));
      if (X.n === 0 || Y.n === 0) return null;
      const P = subQ(A, X); // 「$X$보다 $P$만큼 큰 수」가 $A$
      const Ddiff = subQ(Y, B); // 「$Y$보다 $D$만큼 작은 수」가 $B$
      if (P.n === 0 || Ddiff.n === 0) return null;
      const S = subQ(A, B); // 묻는 값
      if (S.n === 0) return null;
      if (!nice(P) || !nice(Ddiff) || !nice(S)) return null;
      if (A.d === 1 && B.d === 1) return null;
      return {
        content:
          `$${texQ(X)}$보다 $${texQ(P)}$만큼 큰 수를 $a$, ` +
          `$${texQ(Y)}$보다 $${texQ(Ddiff)}$만큼 작은 수를 $b$라 할 때, ` +
          `$a-b$의 값을 구하시오.`,
        answer: `$${texQ(S)}$`,
        solution:
          `「보다 만큼 큰 수」는 더하고, 「보다 만큼 작은 수」는 뺀다.\n` +
          `$a=${texQ(X)}+${texSigned(P)}=${texQ(A)}$, $b=${texQ(Y)}-${texSigned(Ddiff)}=${texQ(B)}$이다.\n` +
          `${addSolution([A, negQ(B)], S)}`,
        facts: {
          ...fq("x", X),
          ...fq("p", P),
          ...fq("y", Y),
          ...fq("q", Ddiff),
          ...fq("a", A),
          ...fq("b", B),
          ...fq("s", S),
        },
      };
    }),
  ),

  def("07", "덧셈과 뺄셈 사이의 관계", SEC.덧뺄, "응용", (rng) =>
    attempt(200, () => {
      const m = pick(rng, DENS);
      const A = q(intBetween(rng, -18, 18), m); // ← 두 수(=답의 재료)를 먼저
      const B = q(intBetween(rng, -18, 18), m);
      if (A.n === 0 || B.n === 0) return null;
      const P = randFrac(rng, DENS, 12); // 발문에서 빼는 수
      const R = randFrac(rng, DENS, 12); // 발문에서 더하는 수
      const L1 = subQ(A, P); // $a-P=L_1$
      const L2 = addQ(B, R); // $b+R=L_2$
      const S = addQ(A, B);
      if (S.n === 0 || L1.n === 0 || L2.n === 0) return null;
      if (!nice(L1) || !nice(L2) || !nice(S)) return null;
      return {
        content:
          `두 수 $a$, $b$에 대하여 $a-${texSigned(P)}=${texQ(L1)}$, ` +
          `$b+${texSigned(R)}=${texQ(L2)}$일 때, $a+b$의 값을 구하시오.`,
        answer: `$${texQ(S)}$`,
        solution:
          `$\\square-A=B$이면 $\\square=B+A$이므로 $a=${texQ(L1)}+${texSigned(P)}=${texQ(A)}$이다.\n` +
          `$\\square+A=B$이면 $\\square=B-A$이므로 $b=${texQ(L2)}-${texSigned(R)}=${texQ(B)}$이다.\n` +
          `${addSolution([A, B], S)}`,
        facts: {
          ...fq("a", A),
          ...fq("b", B),
          ...fq("p", P),
          ...fq("r", R),
          ...fq("l1", L1),
          ...fq("l2", L2),
          ...fq("s", S),
        },
      };
    }),
  ),

  def("08", "바르게 계산한 답 구하기 덧셈 뺄셈", SEC.덧뺄, "응용", (rng) =>
    attempt(200, () => {
      const X = randQ(rng, DENS, 18); // ← 「어떤 유리수」를 먼저 정한다
      const A = randFrac(rng, DENS, 14);
      const wrongIsAdd = rng() < 0.5; // 빼야 할 것을 더했나 / 더해야 할 것을 뺐나
      const R = wrongIsAdd ? addQ(X, A) : subQ(X, A); // 잘못한 결과
      const S = wrongIsAdd ? subQ(X, A) : addQ(X, A); // 바르게 계산한 답
      if (X.n === 0 || R.n === 0 || S.n === 0) return null;
      if (!nice(R) || !nice(S) || !nice(X)) return null;
      const told = wrongIsAdd
        ? `어떤 유리수에서 $${texQ(A)}$${eulReul(A.n)} 빼야 할 것을 잘못하여 더했더니 그 결과가 $${texQ(R)}$${iGa(R.n)} 되었다.`
        : `어떤 유리수에 $${texQ(A)}$${eulReul(A.n)} 더해야 할 것을 잘못하여 뺐더니 그 결과가 $${texQ(R)}$${iGa(R.n)} 되었다.`;
      const undo = wrongIsAdd
        ? `$\\square+${texSigned(A)}=${texQ(R)}$이므로 $\\square=${texQ(R)}-${texSigned(A)}=${texQ(X)}$이다.`
        : `$\\square-${texSigned(A)}=${texQ(R)}$이므로 $\\square=${texQ(R)}+${texSigned(A)}=${texQ(X)}$이다.`;
      const fix = wrongIsAdd
        ? `바르게 계산하면 $${texQ(X)}-${texSigned(A)}$이다.`
        : `바르게 계산하면 $${texQ(X)}+${texSigned(A)}$이다.`;
      return {
        content: `${told} 바르게 계산한 답을 구하시오.`,
        answer: `$${texQ(S)}$`,
        solution:
          `어떤 유리수를 $\\square$라 하자.\n${undo}\n${fix}\n` +
          `${addSolution([X, wrongIsAdd ? negQ(A) : A], S)}`,
        facts: {
          ...fq("x", X),
          ...fq("a", A),
          ...fq("r", R),
          ...fq("s", S),
          wrongIsAdd: wrongIsAdd ? 1 : 0,
        },
      };
    }),
  ),

  def("09", "절댓값이 주어진 두 수의 덧셈과 뺄셈", SEC.덧뺄, "응용", (rng) =>
    attempt(200, () => {
      const M = randQ(rng, DENS, 14);
      const N = randQ(rng, DENS, 14);
      if (M.n <= 0 || N.n <= 0) return null; // 절댓값이므로 양수
      const wantMax = rng() < 0.5;
      const useSub = rng() < 0.5;
      const T = addQ(M, N); // 최댓값은 늘 $|a|+|b|$, 최솟값은 그 반대
      const S = wantMax ? T : negQ(T);
      if (!nice(T)) return null;
      if (M.d === 1 && N.d === 1) return null;
      const expr = useSub ? "a-b" : "a+b";
      const which = wantMax ? "가장 큰 값" : "가장 작은 값";
      const reason = useSub
        ? wantMax
          ? `$a$가 가장 크고 $b$가 가장 작을 때 $a-b$가 가장 크므로 $a=${texQ(M)}$, $b=${texQ(negQ(N))}$일 때이다.`
          : `$a$가 가장 작고 $b$가 가장 클 때 $a-b$가 가장 작으므로 $a=${texQ(negQ(M))}$, $b=${texQ(N)}$일 때이다.`
        : wantMax
          ? `둘 다 양수일 때 $a+b$가 가장 크므로 $a=${texQ(M)}$, $b=${texQ(N)}$일 때이다.`
          : `둘 다 음수일 때 $a+b$가 가장 작으므로 $a=${texQ(negQ(M))}$, $b=${texQ(negQ(N))}$일 때이다.`;
      return {
        content:
          `$a$의 절댓값이 $${texQ(M)}$이고 $b$의 절댓값이 $${texQ(N)}$일 때, ` +
          `$${expr}$의 값 중에서 ${which}을 구하시오.`,
        answer: `$${texQ(S)}$`,
        solution:
          `$|a|=${texQ(M)}$이므로 $a=${texQ(M)}$ 또는 $a=${texQ(negQ(M))}$이고, ` +
          `$|b|=${texQ(N)}$이므로 $b=${texQ(N)}$ 또는 $b=${texQ(negQ(N))}$이다.\n` +
          `${reason}\n` +
          `${addSolution(wantMax ? [M, N] : [negQ(M), negQ(N)], S)}`,
        facts: {
          ...fq("m", M),
          ...fq("n", N),
          ...fq("s", S),
          wantMax: wantMax ? 1 : 0,
          useSub: useSub ? 1 : 0,
        },
      };
    }),
  ),

  def("10", "덧셈과 뺄셈의 활용 ⑴", SEC.덧뺄, "기본", (rng) =>
    attempt(200, () => {
      const base = intBetween(rng, 3, 12) * 100; // 수요일 입장객
      const final = intBetween(rng, 3, 14) * 100; // ← 답(일요일 입장객)을 먼저
      const d1 = intBetween(rng, -4, 4) * 50;
      const d2 = intBetween(rng, -4, 4) * 50;
      const d3 = intBetween(rng, -4, 4) * 50;
      const d4 = final - base - d1 - d2 - d3; // 마지막 증감을 역산
      const ds = [d1, d2, d3, d4];
      if (ds.some((v) => v === 0)) return null;
      if (Math.abs(d4) > 400 || d4 % 50 !== 0) return null;
      // 증감의 합이 $0$ 이면 일요일이 수요일과 같아 답이 발문에 그대로 있다. 증감 하나
      // (「$+300$명」)와 우연히 같아도 마찬가지다(씨앗 1,000 중 13.4%, 2026-09-27).
      // 통과율 37.1% → 32.2%(전수) — 200번이면 던질 확률 $10^{-34}$.
      if (final === base || ds.includes(final)) return null;
      // 중간 어느 날도 사람 수가 음수가 되면 안 된다
      let run = base;
      for (const v of ds) {
        run += v;
        if (run <= 0) return null;
      }
      const days = ["목요일", "금요일", "토요일", "일요일"];
      const table = days
        .map(
          (day, i) => `${day} $${ds[i]! > 0 ? "+" : "-"}${Math.abs(ds[i]!)}$명`,
        )
        .join(", ");
      return {
        content:
          `어느 박물관의 입장객 수를 전날과 비교하여 늘었으면 부호 $+$, ` +
          `줄었으면 부호 $-$를 사용하여 나타내면 ${table}이다. ` +
          `수요일의 입장객이 $${base}$명이었을 때, 일요일의 입장객은 몇 명인지 구하시오.`,
        answer: `$${final}$명`,
        solution:
          `일요일의 입장객 수는 수요일의 입장객 수에 네 번의 증감을 차례로 더한 것이다.\n` +
          `$${base}${ds.map((v) => (v > 0 ? `+${v}` : `-${-v}`)).join("")}=${final}$이다.\n` +
          `따라서 일요일의 입장객은 $${final}$명이다.`,
        facts: { base, d1, d2, d3, d4, final },
      };
    }),
  ),

  def("11", "덧셈과 뺄셈의 활용 ⑵", SEC.덧뺄, "심화하", (rng) =>
    attempt(200, () => {
      const S = intBetween(rng, -8, 8); // ← 세 줄의 공통 합을 먼저
      const p1 = intBetween(rng, -9, 9);
      const p2 = intBetween(rng, -9, 9);
      const p3 = S - p1 - p2; // ㉠은 수가 전부 주어진 줄
      const r1 = intBetween(rng, -9, 9);
      const r2 = intBetween(rng, -9, 9);
      const a = S - r1 - r2; // ㉡의 빈 자리
      const t1 = intBetween(rng, -9, 9);
      const t2 = intBetween(rng, -9, 9);
      const b = S - t1 - t2; // ㉢의 빈 자리
      const all = [p1, p2, p3, r1, r2, t1, t2, a, b];
      if (all.some((v) => v === 0 || Math.abs(v) > 12)) return null;
      if (a === b) return null;
      const ans = a + b;
      if (ans === 0) return null;
      const row = (xs: (number | string)[]): string =>
        xs.map((x) => (typeof x === "number" ? `$${x}$` : `$${x}$`)).join(", ");
      return {
        content:
          `세 상자 ㉠, ㉡, ㉢에 각각 세 개의 수가 들어 있다. ` +
          `각 상자에 들어 있는 세 수의 합이 모두 같을 때, $a+b$의 값을 구하시오. ` +
          `㉠ ${row([p1, p2, p3])} / ㉡ ${row([r1, "a", r2])} / ㉢ ${row([t1, t2, "b"])}`,
        answer: `$${ans}$`,
        solution:
          `수가 전부 주어진 ㉠에서 합은 $${p1}${p2 > 0 ? `+${p2}` : `-${-p2}`}${p3 > 0 ? `+${p3}` : `-${-p3}`}=${S}$이다.\n` +
          `㉡에서 $${r1}+a${r2 > 0 ? `+${r2}` : `-${-r2}`}=${S}$이므로 $a=${a}$이다.\n` +
          `㉢에서 $${t1}${t2 > 0 ? `+${t2}` : `-${-t2}`}+b=${S}$이므로 $b=${b}$이다.\n` +
          `따라서 $a+b=${a}${b > 0 ? `+${b}` : `-${-b}`}=${ans}$이다.`,
        facts: { S, p1, p2, p3, r1, r2, t1, t2, a, b, ans },
      };
    }),
  ),

  // ══ 유리수의 곱셈 (12~17) ═══════════════════════════════════════════

  def("12", "유리수의 곱셈", SEC.곱, "기본", (rng) =>
    attempt(200, () => {
      const P = randQ(rng, DENS, 20); // ← 답을 먼저
      const A = randFrac(rng, DENS, 12);
      const B = divQ(P, A); // 둘째 인수를 역산
      if (P.n === 0 || !nice(A) || !nice(B, 60, 40) || !nice(P)) return null;
      if (A.d === 1 && B.d === 1) return null;
      return {
        content: `다음을 계산하시오. $${texSigned(A)}\\times${texSigned(B)}$`,
        answer: `$${texQ(P)}$`,
        solution:
          `음수가 ${[A, B].filter((v) => v.n < 0).length % 2 === 0 ? "짝수" : "홀수"} 개이므로 곱의 부호는 $${P.n < 0 ? "-" : "+"}$이다.\n` +
          `절댓값의 곱을 구하면 $${texSigned(A)}\\times${texSigned(B)}=${texQ(P)}$이다.`,
        facts: { ...fq("a", A), ...fq("b", B), ...fq("p", P) },
      };
    }),
  ),

  def("13", "곱셈의 계산 법칙", SEC.곱, "응용", (rng) =>
    attempt(200, () => {
      const P = randQ(rng, [2, 3, 4, 5, 6] as const, 24); // ← 답을 먼저
      const A = randFrac(rng, DENS, 10);
      const B = q(intBetween(rng, -9, 9));
      if (B.n === 0 || Math.abs(B.n) === 1) return null;
      const C = divQ(divQ(P, A), B); // 셋째 인수를 역산
      if (P.n === 0 || !nice(A) || !nice(C, 80, 40) || !nice(P)) return null;
      if (C.d === 1 && A.d === 1) return null;
      const AC = mulQ(A, C);
      return {
        content:
          `곱셈의 교환법칙과 결합법칙을 이용하여 다음을 계산하시오. ` +
          `$${texSigned(A)}\\times${texSigned(B)}\\times${texSigned(C)}$`,
        answer: `$${texQ(P)}$`,
        solution:
          `교환법칙으로 분수끼리 모으면 $${texSigned(A)}\\times${texSigned(C)}\\times${texSigned(B)}$이다.\n` +
          `결합법칙으로 앞의 두 수를 먼저 곱하면 $\\left\\{${texSigned(A)}\\times${texSigned(C)}\\right\\}\\times${texSigned(B)}=${texSigned(AC)}\\times${texSigned(B)}$이다.\n` +
          `따라서 $${texSigned(AC)}\\times${texSigned(B)}=${texQ(P)}$이다.`,
        facts: {
          ...fq("a", A),
          ...fq("b", B),
          ...fq("c", C),
          ...fq("p", P),
        },
      };
    }),
  ),

  def("14", "네 유리수 중에서 세 수를 뽑아 곱하기", SEC.곱, "심화하", (rng) =>
    attempt(300, () => {
      // 역산이 없는 유형 — 네 수를 뽑고 «극값이 유일하고 깔끔한가»를 조건으로 건다.
      const vs = [
        randFrac(rng, [2, 3, 4, 5, 6, 7] as const, 9),
        randFrac(rng, [2, 3, 4, 5, 6, 7] as const, 9),
        q(intBetween(rng, -6, 6)),
        q(intBetween(rng, -6, 6)),
      ];
      if (vs.some((v) => v.n === 0)) return null;
      const seen = new Set(vs.map((v) => `${v.n}/${v.d}`));
      if (seen.size !== 4) return null;
      const negCount = vs.filter((v) => v.n < 0).length;
      if (negCount === 0 || negCount === 4) return null;
      const products: { idx: number[]; v: Q }[] = [];
      for (let i = 0; i < 4; i += 1) {
        const idx = [0, 1, 2, 3].filter((j) => j !== i);
        products.push({
          idx,
          v: mulQ(mulQ(vs[idx[0]!]!, vs[idx[1]!]!), vs[idx[2]!]!),
        });
      }
      const wantMax = rng() < 0.5;
      const sorted = [...products].sort((x, y) =>
        wantMax ? y.v.n * x.v.d - x.v.n * y.v.d : x.v.n * y.v.d - y.v.n * x.v.d,
      );
      const best = sorted[0]!;
      const second = sorted[1]!;
      if (eqQ(best.v, second.v)) return null; // 극값이 유일해야 답이 하나다
      if (!nice(best.v, 400, 60)) return null;
      const list = vs.map((v) => `$${texQ(v)}$`).join(", ");
      const chosen = best.idx.map((j) => texSigned(vs[j]!)).join("\\times");
      return {
        content:
          `네 유리수 ${list} 중에서 서로 다른 세 수를 뽑아 곱한 값 중 ` +
          `${wantMax ? "가장 큰" : "가장 작은"} 값을 구하시오.`,
        answer: `$${texQ(best.v)}$`,
        solution:
          `곱이 ${wantMax ? "가장 크려면 음수의 개수가 짝수" : "가장 작으려면 음수의 개수가 홀수"}가 되도록 세 수를 고르고, 그중 절댓값의 곱이 가장 큰 것을 찾는다.\n` +
          `$${chosen}=${texQ(best.v)}$이다.`,
        facts: {
          ...fq("v1", vs[0]!),
          ...fq("v2", vs[1]!),
          ...fq("v3", vs[2]!),
          ...fq("v4", vs[3]!),
          wantMax: wantMax ? 1 : 0,
          ...fq("ans", best.v),
        },
      };
    }),
  ),

  def("15", "거듭제곱의 계산", SEC.곱, "응용", (rng) =>
    attempt(300, () => {
      // 역산이 없는 유형 — 밑과 지수를 뽑고 «답이 깔끔한가»를 조건으로 건다.
      const base1 = randFrac(rng, [2, 3, 4, 5] as const, 5);
      const e1 = intBetween(rng, 2, 3);
      const base2 = q(intBetween(rng, -5, 5));
      const e2 = intBetween(rng, 2, 3);
      if (base2.n === 0 || Math.abs(base2.n) === 1) return null;
      const outerMinus = rng() < 0.4; // 앞에 붙는 $-$ (괄호 밖)
      const raw = mulQ(powQ(base1, e1), powQ(base2, e2));
      const P = outerMinus ? negQ(raw) : raw;
      if (!nice(P, 400, 64)) return null;
      // 밑이 양의 정수면 괄호를 두르지 않는다 — 지면에 `(5)^{2}` 로 찍혔다.
      const head = `\\left(${texQ(base1)}\\right)^{${e1}}`;
      const tail =
        base2.n < 0
          ? `\\left(${texQ(base2)}\\right)^{${e2}}`
          : `${texQ(base2)}^{${e2}}`;
      const expr = `${outerMinus ? "-" : ""}${head}\\times${tail}`;
      const p1 = powQ(base1, e1);
      const p2 = powQ(base2, e2);
      return {
        content: `다음을 계산하시오. $${expr}$`,
        answer: `$${texQ(P)}$`,
        solution:
          `음수의 거듭제곱은 지수가 짝수이면 양수, 홀수이면 음수이다.\n` +
          `$${head}=${texQ(p1)}$, $${tail}=${texQ(p2)}$이다.\n` +
          `따라서 $${expr}=${outerMinus ? "-" : ""}${texSigned(p1)}\\times${texSigned(p2)}=${texQ(P)}$이다.`,
        facts: {
          ...fq("b1", base1),
          e1,
          ...fq("b2", base2),
          e2,
          outerMinus: outerMinus ? 1 : 0,
          ...fq("p", P),
        },
      };
    }),
  ),

  def("16", "의 계산", SEC.곱, "심화하", (rng) =>
    attempt<Body>(200, (): Body | null => {
      // 역산이 없는 유형 — 홀짝 규칙으로 접는다. 테스트는 구체적인 $n$ 을 넣어 센다.
      const shape = rng() < 0.35 ? 1 : 2;
      if (shape === 1) {
        // $(-1)+(-1)^{2}+\cdots+(-1)^{N}$ — $N$ 이 짝수면 $0$, 홀수면 $-1$
        const N = intBetween(rng, 10, 60);
        const ans = N % 2 === 0 ? 0 : -1;
        return {
          content: `다음을 계산하시오. $(-1)+(-1)^{2}+(-1)^{3}+\\cdots+(-1)^{${N}}$`,
          answer: `$${ans}$`,
          solution:
            `$(-1)^{n}$은 $n$이 짝수이면 $1$, 홀수이면 $-1$이므로 ` +
            `이웃한 두 항 $(-1)+(-1)^{2}$의 합은 $0$이다.\n` +
            (N % 2 === 0
              ? `항이 $${N}$개로 짝수이므로 두 개씩 $${N / 2}$쌍으로 묶이고, 그 합은 모두 $0$이다.\n따라서 값은 $0$이다.`
              : `앞의 $${N - 1}$개는 두 개씩 묶여 $0$이 되고 마지막 항 $(-1)^{${N}}$만 남는다.\n따라서 값은 $-1$이다.`),
          facts: { shape: 1, N, ans },
        };
      }
      const isOdd = rng() < 0.5;
      const parity = isOdd ? "홀수" : "짝수";
      const nSample = isOdd ? 5 : 4;
      // 밑이 $1$ 인 `-1^{n}` 꼴은 **맨 앞에서만** 쓴다 — 뒤에 오면 `+-1^{n}` 이 찍힌다.
      const tailPool = NEG_TERMS.filter((t) => t.base === -1);
      const idx = [
        NEG_TERMS[intBetween(rng, 0, NEG_TERMS.length - 1)]!,
        tailPool[intBetween(rng, 0, tailPool.length - 1)]!,
        tailPool[intBetween(rng, 0, tailPool.length - 1)]!,
      ];
      if (new Set(idx.map((t) => t.code)).size !== 3) return null;
      const terms = idx;
      const ops = [1, rng() < 0.5 ? 1 : -1, rng() < 0.5 ? 1 : -1];
      const ans = terms.reduce(
        (acc, t, i) => acc + ops[i]! * negTermValue(t, nSample),
        0,
      );
      const expr = terms
        .map((t, i) => (i === 0 ? t.tex : `${ops[i]! > 0 ? "+" : "-"}${t.tex}`))
        .join("");
      const perTerm = terms
        .map((t) => `$${t.tex}=${negTermValue(t, nSample)}$`)
        .join(", ");
      return {
        content: `$n$이 ${parity}일 때, $${expr}$을 계산하시오.`,
        answer: `$${ans}$`,
        solution:
          // 밑이 $1$ 인 항이 없는데 그 규칙부터 늘어놓으면 안 쓰는 말이 된다.
          (terms.some((t) => t.base === 1)
            ? `밑이 $1$인 $-1^{n}$은 지수와 상관없이 $-1$이고, $(-1)^{n}$은 지수가 짝수이면 $1$, 홀수이면 $-1$이다.\n`
            : `$(-1)^{n}$은 지수가 짝수이면 $1$, 홀수이면 $-1$이다.\n`) +
          `$n$이 ${parity}이므로 ${perTerm}이다.\n` +
          `따라서 $${expr}=${ans}$이다.`,
        facts: {
          shape: 2,
          isOdd: isOdd ? 1 : 0,
          t1: terms[0]!.code,
          t2: terms[1]!.code,
          t3: terms[2]!.code,
          o2: ops[1]!,
          o3: ops[2]!,
          ans,
        },
      };
    }),
  ),

  def("17", "분배법칙", SEC.곱, "응용", (rng) =>
    attempt(200, () => {
      const S = q(intBetween(rng, -30, 30)); // ← 답을 먼저
      if (S.n === 0) return null;
      const P = q(intBetween(rng, -30, 30)); // $a\times b$
      if (P.n === 0) return null;
      const useMinus = rng() < 0.5;
      // 구하는 값이 $a\times(b+c)=P+Q$ 또는 $a\times(b-c)=P-Q$ 이므로 $Q$ 를 역산
      const Q2 = useMinus ? subQ(P, S) : subQ(S, P);
      if (Q2.n === 0 || eqQ(Q2, P)) return null;
      if (!nice(P) || !nice(Q2) || !nice(S)) return null;
      const asked = useMinus ? "a\\times(b-c)" : "a\\times(b+c)";
      const law = useMinus
        ? `$a\\times(b-c)=a\\times b-a\\times c$`
        : `$a\\times(b+c)=a\\times b+a\\times c$`;
      const calc = useMinus
        ? `$${texQ(P)}-${texSigned(Q2)}=${texQ(S)}$`
        : `$${texQ(P)}+${texSigned(Q2)}=${texQ(S)}$`;
      return {
        content:
          `세 수 $a$, $b$, $c$에 대하여 $a\\times b=${texQ(P)}$, ` +
          `$a\\times c=${texQ(Q2)}$일 때, $${asked}$의 값을 구하시오.`,
        answer: `$${texQ(S)}$`,
        solution: `분배법칙에 의하여 ${law}이다.\n따라서 ${calc}이다.`,
        facts: {
          ...fq("p", P),
          ...fq("q", Q2),
          ...fq("s", S),
          useMinus: useMinus ? 1 : 0,
        },
      };
    }),
  ),

  // ══ 유리수의 나눗셈 (18~27) ═════════════════════════════════════════

  def("18", "역수", SEC.나눗, "기본", (rng) =>
    attempt(200, () => {
      const A = randFrac(rng, [2, 3, 4, 5, 6, 7] as const, 9); // ← 역수(=답의 재료)를 먼저
      const B = randFrac(rng, [2, 3, 4, 5, 6, 7] as const, 9);
      const X = divQ(q(1), A); // 발문에 나오는 수는 그 역수
      const Y = divQ(q(1), B);
      const S = mulQ(A, B);
      if (S.n === 0 || !nice(X) || !nice(Y) || !nice(S)) return null;
      if (eqQ(X, A) || eqQ(Y, B)) return null; // $\pm1$ 처럼 자기 자신인 것은 뺀다
      return {
        content:
          `$${texQ(X)}$의 역수를 $a$, $${texQ(Y)}$의 역수를 $b$라 할 때, ` +
          `$a\\times b$의 값을 구하시오.`,
        answer: `$${texQ(S)}$`,
        solution:
          `역수는 분자와 분모를 바꾼 수이므로 $a=${texQ(A)}$, $b=${texQ(B)}$이다.\n` +
          `따라서 $a\\times b=${texSigned(A)}\\times${texSigned(B)}=${texQ(S)}$이다.`,
        facts: {
          ...fq("x", X),
          ...fq("y", Y),
          ...fq("a", A),
          ...fq("b", B),
          ...fq("s", S),
        },
      };
    }),
  ),

  def("19", "유리수의 나눗셈", SEC.나눗, "기본", (rng) =>
    attempt(200, () => {
      const S = randQ(rng, DENS, 18); // ← 답(몫)을 먼저
      const B = randFrac(rng, DENS, 12); // 나누는 수
      const A = mulQ(S, B); // 나누어지는 수를 역산
      if (S.n === 0 || !nice(A, 200, 48) || !nice(B) || !nice(S)) return null;
      if (A.d === 1 && B.d === 1) return null;
      const invB = divQ(q(1), B);
      return {
        content: `다음을 계산하시오. $${texSigned(A)}\\div${texSigned(B)}$`,
        answer: `$${texQ(S)}$`,
        solution:
          `나누는 수의 역수를 곱하는 곱셈으로 고치면 $${texSigned(A)}\\div${texSigned(B)}=${texSigned(A)}\\times${texSigned(invB)}$이다.\n` +
          `따라서 그 값은 $${texQ(S)}$이다.`,
        facts: { ...fq("a", A), ...fq("b", B), ...fq("s", S) },
      };
    }),
  ),

  def("20", "곱셈과 나눗셈의 혼합 계산", SEC.나눗, "응용", (rng) =>
    attempt(300, () => {
      const S = randQ(rng, [2, 3, 4, 5, 6, 8] as const, 16); // ← 답을 먼저
      const base = randFrac(rng, [2, 3, 4, 5] as const, 4);
      const e = intBetween(rng, 2, 3);
      const M = q(intBetween(rng, -9, 9));
      if (S.n === 0 || M.n === 0 || Math.abs(M.n) === 1) return null;
      const P = powQ(base, e);
      const V = divQ(mulQ(P, M), S); // 나누는 수를 역산
      if (!nice(V, 200, 48) || !nice(S) || !nice(P, 300, 130)) return null;
      const expr = `\\left(${texQ(base)}\\right)^{${e}}\\times${texSigned(M)}\\div${texSigned(V)}`;
      const invV = divQ(q(1), V);
      return {
        content: `다음을 계산하시오. $${expr}$`,
        answer: `$${texQ(S)}$`,
        solution:
          `거듭제곱을 먼저 계산하면 $\\left(${texQ(base)}\\right)^{${e}}=${texQ(P)}$이다.\n` +
          `나눗셈을 역수의 곱셈으로 고치면 $${texSigned(P)}\\times${texSigned(M)}\\times${texSigned(invV)}$이다.\n` +
          `따라서 그 값은 $${texQ(S)}$이다.`,
        facts: {
          ...fq("base", base),
          e,
          ...fq("m", M),
          ...fq("v", V),
          ...fq("s", S),
        },
      };
    }),
  ),

  def("21", "덧셈 뺄셈 곱셈 나눗셈의 혼합 계산", SEC.나눗, "심화하", (rng) =>
    attempt(300, () => {
      // 뼈대: $\dfrac{1}{A}\times\left[B-\left\{C^{2}+\left(\dfrac{p}{u}-\dfrac{r}{w}\right)\times D\right\}\right]+E$
      const T = intBetween(rng, -9, 9); // ← 답을 먼저
      const E = intBetween(rng, -6, 6);
      const A = intBetween(rng, 2, 8);
      const C = intBetween(rng, 2, 4);
      const u = pick(rng, [3, 4, 5, 6] as const);
      const w = pick(rng, [2, 3, 4, 5, 6] as const);
      if (u === w) return null;
      const p = intBetween(rng, 1, u - 1);
      const r = intBetween(rng, 1, w - 1);
      if (gcd(p, u) !== 1 || gcd(r, w) !== 1) return null; // 발문의 분수도 기약이라야 한다
      const inner = subQ(q(p, u), q(r, w));
      if (inner.n === 0) return null;
      const D = lcm(u, w) * pick(rng, [1, 2] as const);
      const innerTimesD = mulQ(inner, q(D));
      if (innerTimesD.d !== 1) return null; // 중괄호 안이 정수라야 지면이 깔끔하다
      const brace = addQ(q(C * C), innerTimesD);
      if (brace.d !== 1) return null;
      const B = A * (T - E) + brace.n; // 대괄호 앞의 수를 역산
      if (Math.abs(B) > 90 || B === 0) return null;
      if (Math.abs(innerTimesD.n) > 20) return null;
      // $E=0$ 이면 끝의 「$+0$」을 안 적는다 — 값은 같고 지면만 흉하다.
      const eTail = E === 0 ? "" : E > 0 ? `+${E}` : `-${-E}`;
      const expr =
        `\\dfrac{1}{${A}}\\times\\left[${B}-\\left\\{${C}^{2}+` +
        `\\left(\\dfrac{${p}}{${u}}-\\dfrac{${r}}{${w}}\\right)\\times${D}\\right\\}\\right]` +
        eTail;
      const bracket = B - brace.n;
      return {
        content: `다음을 계산하시오. $${expr}$`,
        answer: `$${T}$`,
        solution:
          `소괄호 안을 먼저 계산하면 $\\dfrac{${p}}{${u}}-\\dfrac{${r}}{${w}}=${texQ(inner)}$이고, ` +
          `여기에 $${D}$${eulReul(D)} 곱하면 $${innerTimesD.n}$이다.\n` +
          `중괄호 안은 $${C}^{2}+${texSigned(innerTimesD)}=${C * C}${innerTimesD.n >= 0 ? `+${innerTimesD.n}` : `-${-innerTimesD.n}`}=${brace.n}$이다.\n` +
          `대괄호 안은 $${B}-${texSigned(brace)}=${bracket}$이다.\n` +
          `따라서 $\\dfrac{1}{${A}}\\times${texSigned(q(bracket))}${E === 0 ? "" : `${eTail}=${bracket / A}${eTail}`}=${T}$이다.`,
        facts: { T, E, A, C, p, u, r, w, D, B },
      };
    }),
  ),

  def("22", "곱셈과 나눗셈 사이의 관계", SEC.나눗, "응용", (rng) =>
    attempt(200, () => {
      const A = randFrac(rng, [2, 3, 4, 5, 6] as const, 9); // ← 두 수를 먼저
      const B = randFrac(rng, [2, 3, 4, 5, 6] as const, 9);
      const M = randFrac(rng, [2, 3, 4, 5, 6] as const, 9); // 발문에서 곱하는 수
      const N = randFrac(rng, [2, 3, 4, 5, 6] as const, 9); // 발문에서 나누어지는 수
      const P = mulQ(M, A); // $M\times a=P$
      const Q2 = divQ(N, B); // $N\div b=Q$
      const S = mulQ(A, B);
      if (!nice(P) || !nice(Q2) || !nice(S)) return null;
      if (eqQ(A, B)) return null;
      return {
        content:
          `두 수 $a$, $b$에 대하여 $${texSigned(M)}\\times a=${texQ(P)}$, ` +
          `$${texQ(N)}\\div b=${texQ(Q2)}$일 때, $a\\times b$의 값을 구하시오.`,
        answer: `$${texQ(S)}$`,
        solution:
          `$A\\times\\square=B$이면 $\\square=B\\div A$이므로 $a=${texQ(P)}\\div${texSigned(M)}=${texQ(A)}$이다.\n` +
          `$A\\div\\square=B$이면 $\\square=A\\div B$이므로 $b=${texQ(N)}\\div${texSigned(Q2)}=${texQ(B)}$이다.\n` +
          `따라서 $a\\times b=${texSigned(A)}\\times${texSigned(B)}=${texQ(S)}$이다.`,
        facts: {
          ...fq("a", A),
          ...fq("b", B),
          ...fq("m", M),
          ...fq("n", N),
          ...fq("p", P),
          ...fq("q", Q2),
          ...fq("s", S),
        },
      };
    }),
  ),

  def("23", "바르게 계산한 답 구하기 곱셈 나눗셈", SEC.나눗, "응용", (rng) =>
    attempt(200, () => {
      const X = randQ(rng, [2, 3, 4, 5, 6] as const, 12); // ← 「어떤 유리수」를 먼저
      const A = randFrac(rng, [2, 3, 4, 5, 6] as const, 9);
      const wrongIsMul = rng() < 0.5; // 나누어야 할 것을 곱했나 / 곱해야 할 것을 나누었나
      const R = wrongIsMul ? mulQ(X, A) : divQ(X, A);
      const S = wrongIsMul ? divQ(X, A) : mulQ(X, A);
      if (X.n === 0 || !nice(R, 200, 48) || !nice(S, 200, 48)) return null;
      if (eqQ(R, S)) return null;
      const told = wrongIsMul
        ? `어떤 유리수를 $${texQ(A)}$로 나누어야 할 것을 잘못하여 곱했더니 그 결과가 $${texQ(R)}$${iGa(R.n)} 되었다.`
        : `어떤 유리수에 $${texQ(A)}$${eulReul(A.n)} 곱해야 할 것을 잘못하여 나누었더니 그 결과가 $${texQ(R)}$${iGa(R.n)} 되었다.`;
      const undo = wrongIsMul
        ? `$\\square\\times${texSigned(A)}=${texQ(R)}$이므로 $\\square=${texQ(R)}\\div${texSigned(A)}=${texQ(X)}$이다.`
        : `$\\square\\div${texSigned(A)}=${texQ(R)}$이므로 $\\square=${texQ(R)}\\times${texSigned(A)}=${texQ(X)}$이다.`;
      const fix = wrongIsMul
        ? `바르게 계산하면 $${texQ(X)}\\div${texSigned(A)}=${texQ(S)}$이다.`
        : `바르게 계산하면 $${texQ(X)}\\times${texSigned(A)}=${texQ(S)}$이다.`;
      return {
        content: `${told} 바르게 계산한 답을 구하시오.`,
        answer: `$${texQ(S)}$`,
        solution: `어떤 유리수를 $\\square$라 하자.\n${undo}\n${fix}`,
        facts: {
          ...fq("x", X),
          ...fq("a", A),
          ...fq("r", R),
          ...fq("s", S),
          wrongIsMul: wrongIsMul ? 1 : 0,
        },
      };
    }),
  ),

  def("24", "유리수의 부호 결정", SEC.나눗, "심화하", (rng) =>
    attempt(200, () => {
      // 역산이 없는 유형 — 부호를 먼저 정하고 그 부호만 남기는 조건을 고른다.
      const sa = rng() < 0.5 ? 1 : -1;
      const sb = rng() < 0.5 ? 1 : -1;
      const sc = rng() < 0.5 ? 1 : -1;
      const s1 = Math.sign(sa * sb);
      const useSum = s1 > 0; // 부호가 같으면 «차»로는 못 가른다 — «합»을 쓴다
      const s2 = Math.sign(useSum ? sa + sb : sa - sb);
      const s3 = Math.sign(sa / sc);
      if (s2 === 0) return null;
      const sols = signSolutions(s1, s2, s3, useSum);
      // ⚠️ 이 가드는 **지금 얼개에서는 한 번도 안 걸린다**(부호 8가지 전수 확인 —
      // 짝 테스트의 「24 — 여덟 부호 전수」가 그 «없다»를 센다). 장식이라서 두는 게
      // 아니라, 조건 얼개를 바꾸면 그때부터 진짜 일하기 때문에 남긴다.
      if (sols.length !== 1) return null; // 답이 하나가 아니면 내지 않는다
      const cond2 = useSum ? "a+b" : "a-b";
      return {
        content:
          `세 유리수 $a$, $b$, $c$에 대하여 $a\\times b${signText(s1)}$, ` +
          `$${cond2}${signText(s2)}$, $a\\div c${signText(s3)}$일 때, ` +
          `$a$, $b$, $c$의 부호를 각각 구하시오.`,
        answer: `$a${signText(sa)}$, $b${signText(sb)}$, $c${signText(sc)}$`,
        solution:
          `$a\\times b${signText(s1)}$이므로 $a$와 $b$는 ${s1 > 0 ? "같은" : "다른"} 부호이다.\n` +
          (useSum
            ? `부호가 같은 두 수에 대하여 $a+b${signText(s2)}$이므로 둘 다 ${s2 > 0 ? "양수" : "음수"}이다. 즉 $a${signText(sa)}$, $b${signText(sb)}$이다.\n`
            : `$a-b${signText(s2)}$이므로 ${s2 > 0 ? "$a$가 양수, $b$가 음수" : "$a$가 음수, $b$가 양수"}이다. 즉 $a${signText(sa)}$, $b${signText(sb)}$이다.\n`) +
          `$a\\div c${signText(s3)}$이므로 $a$와 $c$는 ${s3 > 0 ? "같은" : "다른"} 부호이고, 따라서 $c${signText(sc)}$이다.`,
        facts: {
          sa,
          sb,
          sc,
          s1,
          s2,
          s3,
          useSum: useSum ? 1 : 0,
        },
      };
    }),
  ),

  def("25", "문자로 주어진 수의 대소 관계", SEC.나눗, "심화하", (rng) =>
    attempt(300, () => {
      // 역산이 없는 유형 — 구간의 표본점에 실제로 대입해 «늘 그 하나가 극값인가»를 본다.
      const r = pick(rng, RANGES);
      const idx: number[] = [];
      while (idx.length < 4) {
        const j = intBetween(rng, 0, CANDS.length - 1);
        if (!idx.includes(j)) idx.push(j);
      }
      const cands = idx.map((j) => CANDS[j]!);
      const wantMax = rng() < 0.5;
      // ⚠️ 아래 두 가드(값이 겹친다 · 구간 안에서 순서가 뒤집힌다)도 **지금 보기
      // 풀에서는 한 번도 안 걸린다**(조합 1008가지 전수 — 짝 테스트의
      // 「25 — 보기 풀 전수」가 센다). 보기를 늘리면 그때부터 진짜 일한다.
      const xs = sampleRange(r, GEN_TS);
      let winner = -1;
      for (const x of xs) {
        const vals = cands.map((c) => c.f(x));
        let bi = 0;
        for (let i = 1; i < vals.length; i += 1) {
          if (wantMax ? vals[i]! > vals[bi]! : vals[i]! < vals[bi]!) bi = i;
        }
        // 극값이 다른 것과 뚜렷이 갈려야 한다(부동소수점 잡음 배제)
        for (let i = 0; i < vals.length; i += 1) {
          if (i === bi) continue;
          if (Math.abs(vals[i]! - vals[bi]!) < 1e-6) return null;
        }
        if (winner === -1) winner = bi;
        else if (winner !== bi) return null; // 구간 안에서 순서가 뒤집히면 답이 없다
      }
      if (winner === -1) return null;
      // 풀이는 `r.probe` 하나를 대입해 보인다 — 그 점에서도 같은 것이 극값이라야
      // 「대입해 보니 이것」이 답과 어긋나지 않는다. 보기를 늘리면 여기가 막는다.
      const probeVals = cands.map((c) => c.q(r.probe));
      let pb = 0;
      for (let i = 1; i < probeVals.length; i += 1) {
        const better = wantMax
          ? probeVals[i]!.n * probeVals[pb]!.d >
            probeVals[pb]!.n * probeVals[i]!.d
          : probeVals[i]!.n * probeVals[pb]!.d <
            probeVals[pb]!.n * probeVals[i]!.d;
        if (better) pb = i;
      }
      if (pb !== winner) return null;
      const list = cands.map((c) => `$${c.tex}$`).join(", ");
      return {
        content:
          `$${r.tex}$인 유리수 $a$에 대하여 ${list} 중에서 ` +
          `${wantMax ? "가장 큰" : "가장 작은"} 수를 구하시오.`,
        answer: `$${cands[winner]!.tex}$`,
        solution:
          `조건을 만족시키는 수를 하나 골라 대신 넣어 크기를 비교한다.\n` +
          `$a=${texQ(r.probe)}$${eulReul(r.probe.n)} 넣으면 ` +
          `${cands.map((c) => `$${c.tex}=${texQ(c.q(r.probe))}$`).join(", ")}이다.\n` +
          `따라서 ${wantMax ? "가장 큰" : "가장 작은"} 수는 $${cands[winner]!.tex}$이다.`,
        facts: {
          range: r.code,
          c1: cands[0]!.code,
          c2: cands[1]!.code,
          c3: cands[2]!.code,
          c4: cands[3]!.code,
          wantMax: wantMax ? 1 : 0,
          ans: cands[winner]!.code,
        },
      };
    }),
  ),

  def("26", "실생활에서 유리수의 혼합 계산의 활용", SEC.나눗, "응용", (rng) =>
    attempt(200, () => {
      const win = intBetween(rng, 2, 6); // 이겼을 때 점수
      const lose = -intBetween(rng, 1, 3); // 졌을 때 점수
      const n = intBetween(rng, 5, 12); // 판 수
      const D = intBetween(rng, 1, 8) * (win - lose); // ← 점수 차를 먼저 잡는다
      const k = (D / (win - lose) + n) / 2; // 지애가 이긴 횟수를 역산
      if (!Number.isInteger(k) || k <= 0 || k >= n) return null;
      const scoreA = k * win + (n - k) * lose;
      const scoreB = (n - k) * win + k * lose;
      if (scoreA - scoreB !== D) return null;
      return {
        content:
          `지애와 이서는 가위바위보를 하여 이기면 $${win}$점을 얻고 지면 $${lose}$점을 얻는 놀이를 하였다. ` +
          `$0$점에서 시작하여 $${n}$번의 가위바위보를 했더니 지애가 $${k}$번 이겼다고 할 때, ` +
          `지애의 점수와 이서의 점수의 차를 구하시오. (단, 비긴 경우는 없다.)`,
        answer: `$${D}$점`,
        solution:
          `지애는 $${k}$번 이기고 $${n - k}$번 졌으므로 점수는 $${k}\\times${win}+${n - k}\\times\\left(${lose}\\right)=${scoreA}$(점)이다.\n` +
          `이서는 $${n - k}$번 이기고 $${k}$번 졌으므로 점수는 $${n - k}\\times${win}+${k}\\times\\left(${lose}\\right)=${scoreB}$(점)이다.\n` +
          // 양수를 괄호로 두르면 지면에 `9-(5)` 로 찍힌다 — 음수일 때만 두른다.
          `따라서 두 점수의 차는 $${scoreA}-${scoreB < 0 ? `\\left(${scoreB}\\right)` : scoreB}=${D}$(점)이다.`,
        facts: { win, lose, n, k, scoreA, scoreB, D },
      };
    }),
  ),

  def("27", "수직선에서 유리수의 혼합 계산의 활용", SEC.나눗, "심화하", (rng) =>
    attempt(300, () => {
      const m = intBetween(rng, 1, 4);
      const nRatio = intBetween(rng, 1, 4);
      if (gcd(m, nRatio) !== 1) return null;
      const A = randQ(rng, [2, 3, 4, 5, 6] as const, 12);
      const C = randQ(rng, [2, 3, 4, 5, 6] as const, 12); // ← 답(점 C의 수)을 먼저
      if (eqQ(A, C)) return null;
      // $C=A+(B-A)\times\dfrac{m}{m+n}$ 에서 $B$ 를 역산
      const B = addQ(A, mulQ(subQ(C, A), q(m + nRatio, m)));
      if (!nice(B, 200, 48) || !nice(A) || !nice(C)) return null;
      if (A.n * B.d >= B.n * A.d) return null; // 수직선에서 $a<b$
      const dist = subQ(B, A);
      const part = mulQ(dist, q(m, m + nRatio));
      return {
        content:
          `수직선 위의 두 점 $\\mathrm{A}$, $\\mathrm{B}$가 나타내는 수가 각각 ` +
          `$${texQ(A)}$, $${texQ(B)}$이다. 두 점 $\\mathrm{A}$, $\\mathrm{B}$ 사이를 ` +
          `$${m}:${nRatio}$${euroRo(nRatio)} 나누는 점 $\\mathrm{C}$가 나타내는 수를 구하시오.`,
        answer: `$${texQ(C)}$`,
        solution:
          `두 점 $\\mathrm{A}$, $\\mathrm{B}$ 사이의 거리는 $${texQ(B)}-${texSigned(A)}=${texQ(dist)}$이다.\n` +
          `두 점 $\\mathrm{A}$, $\\mathrm{C}$ 사이의 거리는 $${texSigned(dist)}\\times\\dfrac{${m}}{${m + nRatio}}=${texQ(part)}$이다.\n` +
          `따라서 점 $\\mathrm{C}$가 나타내는 수는 $${texQ(A)}+${texSigned(part)}=${texQ(C)}$이다.`,
        facts: {
          ...fq("a", A),
          ...fq("b", B),
          ...fq("c", C),
          m,
          nRatio,
        },
      };
    }),
  ),

  // ── 확장 유형 (갈래 C, 70~99) ─────────────────────────
  // RPM 색인은 이 중단원을 27 까지만 담는다. 색인에 없는 유형을 지어야 하므로
  // 번호를 갈래마다 나눠 쓴다 — 갈래 C 는 70번대.

  def("70", "세 유리수의 곱", SEC.곱, "기본", (rng): Body =>
    attempt(200, (): Body | null => {
      const a = q(intBetween(rng, -9, 9));
      const b = q(intBetween(rng, -9, 9));
      const c = q(intBetween(rng, -9, 9));
      // 1 은 곱셈 연습이 안 된다 — 절댓값 2 이상만.
      if ([a, b, c].some((v) => Math.abs(v.n) < 2)) return null;
      const S = mulQ(mulQ(a, b), c);
      if (!nice(S)) return null;
      const negs = [a, b, c].filter((v) => v.n < 0).length;
      return {
        content: `다음을 계산하시오.\n$${texSigned(a)}\\times${texSigned(b)}\\times${texSigned(c)}$`,
        answer: `$${texQ(S)}$`,
        solution: `음수가 $${negs}$개이므로 곱의 부호는 ${negs % 2 === 0 ? "양" : "음"}수이다.\n절댓값의 곱은 $${Math.abs(a.n)}\\times${Math.abs(b.n)}\\times${Math.abs(c.n)}=${Math.abs(S.n)}$이다.\n따라서 $${texQ(S)}$이다.`,
        facts: {
          ...fq("a", a),
          ...fq("b", b),
          ...fq("c", c),
          ...fq("S", S),
          negs,
        },
      };
    }),
  ),

  def("71", "두 분수의 곱", SEC.곱, "기본", (rng): Body =>
    attempt(200, (): Body | null => {
      const a = randFrac(rng, [2, 3, 4, 5, 6], 9);
      const b = randFrac(rng, [2, 3, 4, 5, 6], 9);
      if (a.n === 0 || b.n === 0) return null;
      const S = mulQ(a, b);
      if (!nice(S) || S.d === 1) return null;
      // 약분할 것이 없으면 `\dfrac{1}{4}=\dfrac{1}{4}` 가 된다 — 한 번만 적는다.
      const raw = texRawFrac(a.n * b.n, a.d * b.d);
      return {
        content: `다음을 계산하시오.\n$${texSigned(a)}\\times${texSigned(b)}$`,
        answer: `$${texQ(S)}$`,
        solution: `분자는 분자끼리, 분모는 분모끼리 곱한다.\n$${texSigned(a)}\\times${texSigned(b)}=${raw === texQ(S) ? raw : `${raw}=${texQ(S)}`}$이다.`,
        facts: { ...fq("a", a), ...fq("b", b), ...fq("S", S) },
      };
    }),
  ),

  def("72", "역수 구하기", SEC.곱, "기본", (rng): Body =>
    attempt(200, (): Body | null => {
      const a = randFrac(rng, [2, 3, 4, 5, 7], 9);
      if (a.n === 0 || Math.abs(a.n) === a.d) return null;
      const inv = q(a.d * (a.n < 0 ? -1 : 1), Math.abs(a.n));
      if (!nice(inv)) return null;
      return {
        content: `$${texQ(a)}$의 역수를 구하시오.`,
        answer: `$${texQ(inv)}$`,
        solution: `두 수의 곱이 $1$이 되는 수가 역수이므로 분자와 분모를 바꾸어 쓴다. 부호는 그대로 둔다.\n따라서 $${texQ(a)}$의 역수는 $${texQ(inv)}$이다.`,
        facts: { ...fq("a", a), ...fq("inv", inv) },
      };
    }),
  ),

  def("73", "곱이 주어질 때 빠진 수 구하기", SEC.곱, "기본", (rng): Body =>
    attempt(200, (): Body | null => {
      const a = randFrac(rng, [2, 3, 4, 5], 9);
      const x = randFrac(rng, [2, 3, 4, 5], 9);
      if (a.n === 0 || x.n === 0) return null;
      const S = mulQ(a, x);
      if (!nice(S) || !nice(x)) return null;
      return {
        content: `$${texSigned(a)}\\times\\square=${texQ(S)}$일 때, $\\square$에 알맞은 수를 구하시오.`,
        answer: `$${texQ(x)}$`,
        solution: `$\\square$는 $${texQ(S)}$${eulReul(S.n)} $${texQ(a)}$로 나눈 값이므로 $${texQ(a)}$의 역수를 곱한다.\n따라서 $\\square=${texQ(x)}$이다.`,
        facts: { ...fq("a", a), ...fq("x", x), ...fq("S", S) },
      };
    }),
  ),
];

/**
 * 판정형(`judge/addSub.ts` — 2026-10-08 엔진 보강 1단계)이 **같은 셈 · 같은 표기**를 쓰도록 연다.
 * 보기 식을 이 모듈의 유형(01 · 03 · 04)과 똑같이 찍어야 «같은 유형 · 같은 꼴»이 지면에서도 같다 —
 * 표기를 한 벌 더 쓰면 한쪽만 고쳐도 아무도 모른다. 여기 있는 함수의 동작은 한 글자도 안 바뀐다.
 */
export type M1Q = Q;
export const m1Rational = {
  q,
  addQ,
  subQ,
  negQ,
  nice,
  lcm,
  texQ,
  texSigned,
  texRawFrac,
} as const;
