/**
 * 중2 RPM 2-1 「단항식의 계산」16 + 「다항식의 계산」13 = 29유형 — 세션 4E-중2대수 소유
 * (docs/planning/tracks/middle-engine-wave3-plan.md §11.2).
 *
 * 우리 단원 배정 (`prisma/seed-data/units.ts` 실측 리터럴):
 *   지수법칙(417) ← 단항 01·02·03·04·05·06·07·08·09·15·16
 *   단항식의 곱셈과 나눗셈(418) ← 단항 10·11·12·13·14
 *   다항식의 덧셈과 뺄셈(419) ← 다항 01·02·03·04·05·11·12
 *   다항식의 곱셈과 나눗셈(420) ← 다항 06·07·08·09·10·13
 *
 * ── 이 단원에서 특히 조심한 것 ────────────────────────────────
 *
 * ⑴ **부호와 괄호.** `(-2a)^3=-8a^3` 이지 `-2a^3` 이 아니다. 계수는 `Q`(유리수)로
 *    들고 `monoPow` 가 계수까지 거듭제곱하므로 부호가 지수와 함께 움직인다.
 *    `facts` 에 밑·지수·부호를 실어 시험이 **직접 거듭제곱해** 확인한다.
 * ⑵ **`a^m\div a^n` 에서 `m<n`.** 중2 는 음의 지수를 안 배웠으므로 분모로 내린다.
 *    `monoTex` 는 지수가 음수인 변수를 **반드시** `\dfrac` 의 분모에 쓴다 —
 *    `^{-` 가 지면에 나가면 시험이 빨개진다.
 * ⑶ **동류항만 더한다.** `polyNorm` 은 변수 지수 서명(`monoKey`)이 같은 항만
 *    합친다. 시험이 답을 다시 항으로 갈라 「같은 서명이 둘 있나」를 센다.
 * ⑷ **검산은 대입으로.** 시험은 이 모듈의 대수를 하나도 안 쓴다 — 지면에 나간
 *    LaTeX 를 **직접 파싱해 유리수로 값을 매긴다**(정리 전 = 정리 후). 그래서
 *    이 파일의 식 계산이 틀리면 갈라진다.
 * ⑸ **D-73.** 제품이 가분수를 대분수로 바꾸지 않는다. 여기서는 기약 가분수만
 *    쓰고 대분수를 만들지 않는다(`census-mixed-number --middle` 이 0 이어야 한다).
 *
 * ── 답을 먼저 정하는 자리 ─────────────────────────────────────
 * 나눗셈·□ 는 **몫을 먼저 정하고** 피제수를 곱해 만든다(단항 11·13, 다항 07·08).
 * 그러지 않으면 나누어떨어지지 않는 발문이 나온다.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중2";
const BOOK = "2-1";

/** RPM 중단원 이름 — `scripts/rpm/rpm-type-catalog.json` 정본 바이트. */
const MONO_MINOR = "단항식의 계산";
const POLY_MINOR = "다항식의 계산";

/** 우리 Unit.section 정확한 이름 (`prisma/seed-data/units.ts`). */
const SEC = {
  지수법칙: "지수법칙",
  단항곱나눗: "단항식의 곱셈과 나눗셈",
  다항덧뺄: "다항식의 덧셈과 뺄셈",
  다항곱나눗: "다항식의 곱셈과 나눗셈",
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

function defFor(minor: string) {
  return (
    rpmType: string,
    rpmTitle: string,
    unitSection: string,
    difficulty: MidProblem["difficulty"],
    gen: (rng: Rng) => Body,
  ): TypeEntry => ({
    key: `${BOOK}|${minor}|${rpmType}`,
    grade: GRADE,
    unitSection,
    rpmBook: BOOK,
    rpmMinor: minor,
    rpmType,
    rpmTitle,
    handler: (rng) => ({
      grade: GRADE,
      unitSection,
      rpmBook: BOOK,
      rpmMinor: minor,
      rpmType,
      rpmTitle,
      difficulty,
      ...gen(rng),
    }),
  });
}

const defMono = defFor(MONO_MINOR);
const defPoly = defFor(POLY_MINOR);

// ── 조사 (수 읽기 끝 글자 받침) ────────────────────────

function vowelFinal(n: number): boolean {
  const d = Math.abs(n) % 10;
  return d === 2 || d === 4 || d === 5 || d === 9;
}

/** 목적격: $2$를 · $3$을 */
function eul(n: number): "을" | "를" {
  return vowelFinal(n) ? "를" : "을";
}

/** 주격: $2$가 · $3$이 */
function iGa(n: number): "이" | "가" {
  return vowelFinal(n) ? "가" : "이";
}

/** 도구격: $2$로 · $3$으로 — 모음·ㄹ 받침(일·칠·팔) 뒤는 「로」. */
function euRo(n: number): "로" | "으로" {
  const d = Math.abs(n) % 10;
  return d === 0 || d === 3 || d === 6 ? "으로" : "로";
}

// ── 유리수 ────────────────────────────────────────────

/** 기약 유리수 — 분모는 항상 양수. */
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

function q(n: number, d = 1): Q {
  if (d === 0) throw new Error("분모가 0 인 유리수");
  const s = d < 0 ? -1 : 1;
  const nn = n * s;
  const dd = d * s;
  if (nn === 0) return { n: 0, d: 1 };
  const g = gcd(nn, dd) || 1;
  return { n: nn / g, d: dd / g };
}

function qNeg(a: Q): Q {
  return { n: -a.n, d: a.d };
}

function qAdd(a: Q, b: Q): Q {
  return q(a.n * b.d + b.n * a.d, a.d * b.d);
}

function qMul(a: Q, b: Q): Q {
  return q(a.n * b.n, a.d * b.d);
}

function qDiv(a: Q, b: Q): Q {
  if (b.n === 0) throw new Error("0 으로 나눌 수 없습니다");
  return q(a.n * b.d, a.d * b.n);
}

function qPow(a: Q, k: number): Q {
  if (k < 0) throw new Error("음의 지수는 중2 미학습");
  let r = q(1);
  for (let i = 0; i < k; i += 1) r = qMul(r, a);
  return r;
}

// ── 단항식 ────────────────────────────────────────────

/** 계수 × 변수의 거듭제곱. 지수는 음수일 수 있고, 그때는 분모로 내려 쓴다. */
type Mono = { c: Q; e: Record<string, number> };

/** 변수 차례 — `\pi` 를 맨 앞에, 나머지는 사전 순서. */
function sortVars(keys: readonly string[]): string[] {
  return [...keys].sort((a, b) => {
    if (a === b) return 0;
    if (a === "π") return -1;
    if (b === "π") return 1;
    return a < b ? -1 : 1;
  });
}

function mono(c: Q, e: Record<string, number> = {}): Mono {
  if (c.n === 0) return { c: q(0), e: {} };
  const out: Record<string, number> = {};
  for (const k of Object.keys(e)) {
    const v = e[k]!;
    if (v !== 0) out[k] = v;
  }
  return { c, e: out };
}

function monoMul(a: Mono, b: Mono): Mono {
  const e: Record<string, number> = { ...a.e };
  for (const k of Object.keys(b.e)) e[k] = (e[k] ?? 0) + b.e[k]!;
  return mono(qMul(a.c, b.c), e);
}

function monoDiv(a: Mono, b: Mono): Mono {
  const e: Record<string, number> = { ...a.e };
  for (const k of Object.keys(b.e)) e[k] = (e[k] ?? 0) - b.e[k]!;
  return mono(qDiv(a.c, b.c), e);
}

/** 계수까지 함께 거듭제곱한다 — `(-2a)^3=-8a^3` 의 부호가 여기서 정해진다. */
function monoPow(m: Mono, k: number): Mono {
  const e: Record<string, number> = {};
  for (const key of Object.keys(m.e)) e[key] = m.e[key]! * k;
  return mono(qPow(m.c, k), e);
}

function monoNeg(m: Mono): Mono {
  return mono(qNeg(m.c), m.e);
}

/** 동류항 서명 — 계수를 뺀 변수 부분. 이것이 같아야 더할 수 있다. */
function monoKey(m: Mono): string {
  return sortVars(Object.keys(m.e))
    .map((k) => `${k}^${m.e[k]}`)
    .join(",");
}

function monoDeg(m: Mono): number {
  return Object.keys(m.e).reduce((s, k) => s + m.e[k]!, 0);
}

function varTex(v: string, k: number): string {
  const name = v === "π" ? "\\pi " : v;
  return k === 1 ? name : `${name}^{${k}}`;
}

/**
 * 지면에 쓰는 꼴. **지수가 음수면 분모로 내린다** — `^{-2}` 는 중2 지면에
 * 나가면 안 된다(브리프 지시). 계수의 분모도 같은 분수 안에 함께 놓는다.
 */
function monoTex(m: Mono): string {
  if (m.c.n === 0) return "0";
  const pos = sortVars(Object.keys(m.e).filter((v) => m.e[v]! > 0));
  const neg = sortVars(Object.keys(m.e).filter((v) => m.e[v]! < 0));
  const sign = m.c.n < 0 ? "-" : "";
  const abs = Math.abs(m.c.n);
  const numVars = pos.map((v) => varTex(v, m.e[v]!)).join("");
  const denVars = neg.map((v) => varTex(v, -m.e[v]!)).join("");
  if (m.c.d === 1 && denVars === "") {
    if (abs === 1 && numVars !== "") return `${sign}${numVars}`;
    return `${sign}${abs}${numVars}`;
  }
  const num = abs === 1 && numVars !== "" ? numVars : `${abs}${numVars}`;
  const den = m.c.d === 1 ? denVars : `${m.c.d}${denVars}`;
  return `${sign}\\dfrac{${num}}{${den}}`;
}

// ── 다항식 ────────────────────────────────────────────

type Poly = Mono[];

/** 차수 내림차순 → 같은 차수면 앞 변수의 지수가 큰 쪽. */
function cmpMono(a: Mono, b: Mono): number {
  const da = monoDeg(a);
  const db = monoDeg(b);
  if (da !== db) return db - da;
  const vars = sortVars([
    ...new Set([...Object.keys(a.e), ...Object.keys(b.e)]),
  ]);
  for (const v of vars) {
    const ea = a.e[v] ?? 0;
    const eb = b.e[v] ?? 0;
    if (ea !== eb) return eb - ea;
  }
  return 0;
}

/** 동류항만 합치고 0 인 항은 버린다. */
function polyNorm(terms: readonly Mono[]): Poly {
  const map = new Map<string, Mono>();
  for (const t of terms) {
    if (t.c.n === 0) continue;
    const k = monoKey(t);
    const cur = map.get(k);
    map.set(k, cur ? mono(qAdd(cur.c, t.c), t.e) : t);
  }
  const out = [...map.values()].filter((m) => m.c.n !== 0);
  out.sort(cmpMono);
  return out;
}

function polyAdd(a: Poly, b: Poly): Poly {
  return polyNorm([...a, ...b]);
}

function polySub(a: Poly, b: Poly): Poly {
  return polyNorm([...a, ...b.map(monoNeg)]);
}

function polyScale(a: Poly, k: Q): Poly {
  return polyNorm(a.map((m) => mono(qMul(m.c, k), m.e)));
}

function polyMulMono(a: Poly, m: Mono): Poly {
  return polyNorm(a.map((t) => monoMul(t, m)));
}

function polyTexPlain(p: Poly): string {
  if (p.length === 0) return "0";
  let out = monoTex(p[0]!);
  for (let i = 1; i < p.length; i += 1) {
    const t = monoTex(p[i]!);
    out += t.startsWith("-") ? `-${t.slice(1)}` : `+${t}`;
  }
  return out;
}

function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b;
}

/**
 * 계수에 분모가 있으면 **하나의 분수**로 묶어 쓴다 —
 * `\dfrac{23a}{6}+\dfrac{17b}{6}+\dfrac{7}{6}` 이 아니라 `\dfrac{23a+17b+7}{6}`.
 * 교과서·RPM 이 쓰는 꼴이고, 항이 셋이면 앞의 꼴은 지면에서 읽히지 않는다.
 */
function polyTex(p: Poly): string {
  if (p.length === 0) return "0";
  const den = p.reduce((L, m) => lcm(L, m.c.d), 1);
  if (den === 1) return polyTexPlain(p);
  return `\\dfrac{${polyTexPlain(polyScale(p, q(den)))}}{${den}}`;
}

/** 상수항 (없으면 0). 조사를 고를 때 쓴다. */
function constTerm(p: Poly): number {
  const hit = p.find((m) => monoDeg(m) === 0);
  return hit ? hit.c.n : 0;
}

// ── 지면 조립 소품 ────────────────────────────────────

function needsParen(body: string): boolean {
  return body.startsWith("-") || body.includes("\\dfrac");
}

/** `(단항식)^k` — 괄호가 필요할 때만 씌운다. */
function powTex(m: Mono, k: number): string {
  const body = monoTex(m);
  if (k === 1) return needsParen(body) ? `\\left(${body}\\right)` : body;
  return `\\left(${body}\\right)^{${k}}`;
}

function paren(inner: string): string {
  return `\\left(${inner}\\right)`;
}

/** 정수 계수를 식 앞에 쓸 때 — $1$ 은 생략, $-1$ 은 부호만. */
function coefTex(k: number): string {
  if (k === 1) return "";
  if (k === -1) return "-";
  return String(k);
}

/** `+3\left(...\right)` / `-3\left(...\right)` — 둘째 항부터 쓰는 꼴. */
function signedTermTex(k: number, inner: string): string {
  const sign = k < 0 ? "-" : "+";
  return `${sign}${coefTex(Math.abs(k))}${paren(inner)}`;
}

/** `facts` 에 단항식을 평평하게 싣는다 — 계수 분자·분모 + 변수별 지수. */
function monoFacts(prefix: string, m: Mono): Record<string, number> {
  const out: Record<string, number> = {
    [`${prefix}Num`]: m.c.n,
    [`${prefix}Den`]: m.c.d,
  };
  for (const k of Object.keys(m.e)) out[`${prefix}_${k}`] = m.e[k]!;
  return out;
}

// ── 난수 소품 ─────────────────────────────────────────

const VAR_PAIRS = [
  ["a", "b"],
  ["x", "y"],
] as const;

const NONZERO_COEFS = [2, 3, 4, 5, 6, -2, -3, -4, -5, -6] as const;

function pickVars(rng: Rng): readonly [string, string] {
  return pick(rng, VAR_PAIRS);
}

/** 계수·지수를 뽑아 단항식 하나 — 지수는 항상 1 이상. */
function randMono(
  rng: Rng,
  vars: readonly string[],
  maxExp: number,
  coefs: readonly number[] = NONZERO_COEFS,
): Mono {
  const e: Record<string, number> = {};
  for (const v of vars) e[v] = intBetween(rng, 1, maxExp);
  return mono(q(pick(rng, coefs)), e);
}

/** 계수가 작은 일차식 `ax+by+c` (문자 둘). 항이 전부 0 이면 다시 뽑는다. */
function randLinear(rng: Rng, vars: readonly [string, string]): Poly {
  return attempt(60, () => {
    const a = intBetween(rng, -5, 5);
    const b = intBetween(rng, -5, 5);
    const c = intBetween(rng, -6, 6);
    if (a === 0 || b === 0 || c === 0) return null;
    return polyNorm([
      mono(q(a), { [vars[0]]: 1 }),
      mono(q(b), { [vars[1]]: 1 }),
      mono(q(c)),
    ]);
  });
}

/** 계수가 작은 이차식 `ax^2+bx+c` (문자 하나). */
function randQuadratic(rng: Rng, v: string): Poly {
  return attempt(60, () => {
    const a = intBetween(rng, -5, 5);
    const b = intBetween(rng, -6, 6);
    const c = intBetween(rng, -8, 8);
    if (a === 0 || b === 0 || c === 0) return null;
    return polyNorm([
      mono(q(a), { [v]: 2 }),
      mono(q(b), { [v]: 1 }),
      mono(q(c)),
    ]);
  });
}

/** 계수·지수가 지면에서 읽히는 크기인가 — 폭주한 단항식을 버린다. */
function monoSane(m: Mono, maxAbs = 4096, maxExp = 14): boolean {
  if (Math.abs(m.c.n) > maxAbs || m.c.d > 64) return false;
  return Object.keys(m.e).every((k) => Math.abs(m.e[k]!) <= maxExp);
}

// ═════════ 단항식의 계산 16유형 ═════════

export const M2_MONO_TYPES: TypeEntry[] = [
  // 01 ─────────────────────────────────────────────
  defMono("01", "지수법칙 ⑴", SEC.지수법칙, "기본", (rng): Body => {
    const [v0, v1] = pickVars(rng);
    const kind = intBetween(rng, 0, 1);
    if (kind === 0) {
      const m = intBetween(rng, 2, 6);
      const n = intBetween(rng, 2, 6);
      const p = intBetween(rng, 1, 5);
      const r = intBetween(rng, 2, 5);
      const expr = `${varTex(v0, m)}\\times ${varTex(v0, n)}\\times ${varTex(v1, p)}\\times ${varTex(v1, r)}`;
      const ans = `${varTex(v0, m + n)}${varTex(v1, p + r)}`;
      return {
        content: `다음 식을 간단히 하시오.\n$${expr}$`,
        answer: `$${ans}$`,
        solution: `밑이 같은 거듭제곱의 곱셈은 지수를 더한다.\n$${varTex(v0, m)}\\times ${varTex(v0, n)}=${varTex(v0, m + n)}$, $${varTex(v1, p)}\\times ${varTex(v1, r)}=${varTex(v1, p + r)}$\n따라서 $${expr}=${ans}$ 이다.`,
        facts: { kind, m, n, p, r },
      };
    }
    const m = intBetween(rng, 2, 6);
    const x = intBetween(rng, 2, 6);
    const t = m + x;
    return {
      content: `$a^{x}\\times a^{${m}}=a^{${t}}$ 일 때, 자연수 $x$ 의 값을 구하시오.`,
      answer: `$${x}$`,
      solution: `밑이 같은 거듭제곱의 곱셈은 지수를 더하므로 $a^{x}\\times a^{${m}}=a^{x+${m}}$ 이다.\n$x+${m}=${t}$ 이므로 $x=${x}$ 이다.`,
      facts: { kind, m, t, x },
    };
  }),

  // 02 ─────────────────────────────────────────────
  defMono("02", "지수법칙 ⑵", SEC.지수법칙, "기본", (rng): Body => {
    const [v0, v1] = pickVars(rng);
    const kind = intBetween(rng, 0, 1);
    if (kind === 0) {
      const m = intBetween(rng, 2, 5);
      const n = intBetween(rng, 2, 4);
      const p = intBetween(rng, 1, 4);
      const r = intBetween(rng, 2, 3);
      const expr = `${paren(varTex(v0, m))}^{${n}}\\times ${paren(varTex(v1, p))}^{${r}}`;
      const ans = `${varTex(v0, m * n)}${varTex(v1, p * r)}`;
      return {
        content: `다음 식을 간단히 하시오.\n$${expr}$`,
        answer: `$${ans}$`,
        solution: `거듭제곱의 거듭제곱은 지수를 곱한다.\n$${paren(varTex(v0, m))}^{${n}}=${varTex(v0, m * n)}$, $${paren(varTex(v1, p))}^{${r}}=${varTex(v1, p * r)}$\n따라서 $${expr}=${ans}$ 이다.`,
        facts: { kind, m, n, p, r },
      };
    }
    const m = intBetween(rng, 2, 5);
    const n = intBetween(rng, 2, 4);
    const x = intBetween(rng, 2, 5);
    const t = m + n * x;
    return {
      content: `$a^{${m}}\\times \\left(a^{x}\\right)^{${n}}=a^{${t}}$ 일 때, 자연수 $x$ 의 값을 구하시오.`,
      answer: `$${x}$`,
      solution: `$\\left(a^{x}\\right)^{${n}}=a^{${n}x}$ 이므로 $a^{${m}}\\times a^{${n}x}=a^{${m}+${n}x}$ 이다.\n$${m}+${n}x=${t}$ 이므로 $x=${x}$ 이다.`,
      facts: { kind, m, n, t, x },
    };
  }),

  // 03 ─────────────────────────────────────────────
  // 세 갈래를 **모두** 낸다 — `m<n` 이면 분모에 남는다(음의 지수 미학습).
  defMono("03", "지수법칙 ⑶", SEC.지수법칙, "기본", (rng) => {
    const v = pick(rng, ["a", "x", "b", "y"] as const);
    const kind = intBetween(rng, 0, 2);
    if (kind === 1) {
      const m = intBetween(rng, 3, 8);
      return {
        content: `다음 식을 간단히 하시오.\n$${varTex(v, m)}\\div ${varTex(v, m)}$`,
        answer: `$1$`,
        solution: `밑이 같고 지수가 같으므로 $${varTex(v, m)}\\div ${varTex(v, m)}=1$ 이다.`,
        facts: { kind, m, n: m },
      };
    }
    const big = intBetween(rng, 5, 9);
    const small = intBetween(rng, 1, big - 2);
    const m = kind === 0 ? big : small;
    const n = kind === 0 ? small : big;
    const ansTex =
      kind === 0 ? varTex(v, m - n) : `\\dfrac{1}{${varTex(v, n - m)}}`;
    return {
      content: `다음 식을 간단히 하시오.\n$${varTex(v, m)}\\div ${varTex(v, n)}$`,
      answer: `$${ansTex}$`,
      solution:
        kind === 0
          ? `$${m}>${n}$ 이므로 지수를 빼서 $${varTex(v, m)}\\div ${varTex(v, n)}=${varTex(v, m - n)}$ 이다.`
          : `$${m}<${n}$ 이므로 $${varTex(v, m)}\\div ${varTex(v, n)}=\\dfrac{1}{${varTex(v, n - m)}}$ 이다.`,
      facts: { kind, m, n },
    };
  }),

  // 04 ─────────────────────────────────────────────
  defMono(
    "04",
    "지수법칙 ⑷ 곱의 거듭제곱",
    SEC.지수법칙,
    "기본",
    (rng): Body => {
      const [v0, v1] = pickVars(rng);
      const kind = intBetween(rng, 0, 1);
      if (kind === 0) {
        return attempt(200, () => {
          const base = randMono(rng, [v0, v1], 3, [
            2, 3, -2, -3, 1, -1,
          ] as const);
          const k = intBetween(rng, 2, 4);
          const ans = monoPow(base, k);
          if (!monoSane(ans)) return null;
          return {
            content: `다음 식을 간단히 하시오.\n$${powTex(base, k)}$`,
            answer: `$${monoTex(ans)}$`,
            solution: `곱의 거듭제곱은 각 인수를 따로 거듭제곱한다. 계수의 부호도 함께 거듭제곱되므로 괄호 안의 부호를 빠뜨리지 않는다.\n$${powTex(base, k)}=${monoTex(ans)}$`,
            facts: { kind, ...monoFacts("b", base), k },
          };
        });
      }
      // Exponent unknowns must not collide with either base-variable pair.
      // "항등식" terminology is unnecessary: state the all-values condition directly.
      const kc = pick(rng, [-3, -2, 2, 3] as const);
      const b = intBetween(rng, 2, 3);
      const a = intBetween(rng, 2, 3);
      const ey = intBetween(rng, 1, 2);
      const K = Math.pow(kc, b);
      const X = a * b;
      const c = ey * b;
      const lhs = `\left(${coefTex(kc)}${v0}^{m}${varTex(v1, ey)}\right)^{n}`;
      const rhs = `${coefTex(K)}${varTex(v0, X)}${v1}^{k}`;
      return {
        content: `자연수 $m$, $n$, $k$에 대하여 다음 등식이 문자 $${v0}$, $${v1}$의 값에 관계없이 항상 성립한다.\n$${lhs}=${rhs}$\n$m+n+k$의 값을 구하시오.`,
        answer: `$${a + b + c}$`,
        solution: `곱의 거듭제곱으로 좌변을 풀면 $${lhs}=\left(${kc}\right)^{n}${v0}^{mn}${v1}^{${coefTex(ey)}n}$이다.\n계수를 비교하면 $\left(${kc}\right)^{n}=${K}$에서 $n=${b}$이다. 두 문자의 지수를 각각 비교하면 $mn=${X}$에서 $m=${a}$이고, $k=${coefTex(ey)}n=${c}$이다.\n따라서 $m+n+k=${a}+${b}+${c}=${a + b + c}$이다.`,
        facts: { kind, kc, a, b, c, K, X, ey, m: a, n: b, k: c },
      };
    },
  ),

  // 05 ─────────────────────────────────────────────
  defMono("05", "지수법칙 ⑷ 몫의 거듭제곱", SEC.지수법칙, "응용", (rng) =>
    attempt(200, () => {
      const [v0, v1] = pickVars(rng);
      const cn = pick(rng, [1, 2, 3, -1, -2, -3] as const);
      const cd = pick(rng, [1, 2, 3] as const);
      const eUp = intBetween(rng, 1, 3);
      const eDown = intBetween(rng, 1, 3);
      const k = intBetween(rng, 2, 4);
      const base = mono(q(cn, cd), { [v0]: eUp, [v1]: -eDown });
      if (base.c.d === 1 && cd !== 1) return null;
      const ans = monoPow(base, k);
      if (!monoSane(ans)) return null;
      const baseTex = monoTex(base);
      if (!baseTex.includes("\\dfrac")) return null;
      return {
        content: `다음 식을 간단히 하시오.\n$${powTex(base, k)}$`,
        answer: `$${monoTex(ans)}$`,
        solution: `몫의 거듭제곱은 분자와 분모를 각각 거듭제곱한다.\n$${powTex(base, k)}=${monoTex(ans)}$`,
        facts: { ...monoFacts("b", base), k },
      };
    }),
  ),

  // 06 ─────────────────────────────────────────────
  defMono("06", "지수법칙의 응용 ⑴", SEC.지수법칙, "응용", (rng): Body => {
    const kind = intBetween(rng, 0, 1);
    if (kind === 0) {
      const p = pick(rng, [2, 3, 5] as const);
      const j = p === 2 ? intBetween(rng, 1, 2) : 1;
      const times = Math.pow(p, j);
      const m = intBetween(rng, 8, 20);
      const expr = Array.from({ length: times }, () => `${p}^{${m}}`).join("+");
      return {
        content: `다음 식을 간단히 하시오.\n$${expr}$`,
        answer: `$${p}^{${m + j}}$`,
        solution: `같은 수를 $${times}$번 더한 것이므로 곱셈으로 고치면 $${expr}=${times}\\times ${p}^{${m}}$ 이다.\n$${times}=${p}^{${j}}$ 이므로 $${p}^{${j}}\\times ${p}^{${m}}=${p}^{${m + j}}$ 이다.`,
        facts: { kind, p, j, times, m },
      };
    }
    const p = pick(rng, [2, 3, 7] as const);
    const r = pick(rng, [3, 5] as const);
    const cnt = intBetween(rng, 3, 4);
    const m = intBetween(rng, 2, 4);
    const n = intBetween(rng, 3, 5);
    const a = m * cnt;
    const b = n + 1;
    const left = Array.from({ length: cnt }, () => `${p}^{${m}}`).join(
      "\\times ",
    );
    const right = Array.from({ length: r }, () => `${r}^{${n}}`).join("+");
    return {
      content: `$${left}=${p}^{a}$, $${right}=${r}^{b}$ 일 때, 자연수 $a$, $b$ 에 대하여 $ab$ 의 값을 구하시오.`,
      answer: `$${a * b}$`,
      solution: `곱셈은 지수를 더하므로 $${left}=${p}^{${m}\\times ${cnt}}=${p}^{${a}}$ 에서 $a=${a}$ 이다.\n덧셈은 곱셈으로 고쳐 $${right}=${r}\\times ${r}^{${n}}=${r}^{${b}}$ 에서 $b=${b}$ 이다.\n따라서 $ab=${a * b}$ 이다.`,
      facts: { kind, p, r, cnt, m, n, a, b },
    };
  }),

  // 07 ─────────────────────────────────────────────
  // 문자는 **소문자** `a` 를 쓴다 — 홑 대문자 수식은 전처리가 직립 Roman 으로
  // 바꿔(`PURE_LABEL_REGEX`) 같은 지면에서 기울임과 섞인다.
  defMono("07", "지수법칙의 응용 ⑵", SEC.지수법칙, "심화하", (rng) =>
    attempt(200, () => {
      const p = pick(rng, [2, 3, 5] as const);
      const s = intBetween(rng, 0, 2);
      const k = intBetween(rng, 2, 4);
      const target = Math.pow(p, k);
      if (target > 125) return null;
      const shift = Math.pow(p, k * s);
      if (shift > 10000) return null;
      const defTex = s === 0 ? `a=${p}^{x}` : `a=${p}^{x+${s}}`;
      const ansTex = s === 0 ? `a^{${k}}` : `\\dfrac{a^{${k}}}{${shift}}`;
      return {
        content: `$${defTex}$ 일 때, $${target}^{x}$ 을 $a$ 를 사용하여 나타내시오.`,
        answer: `$${ansTex}$`,
        solution: `밑을 $${p}$${euRo(p)} 맞추면 $${target}^{x}=\\left(${p}^{${k}}\\right)^{x}=${p}^{${k}x}$ 이다.\n${
          s === 0
            ? `$${defTex}$ 이므로 $a^{${k}}=${p}^{${k}x}$ 이다.`
            : `$${defTex}$ 이므로 $a^{${k}}=${p}^{${k}x+${k * s}}=${p}^{${k}x}\\times ${shift}$ 이다.`
        }\n따라서 $${target}^{x}=${ansTex}$ 이다.`,
        facts: { p, s, k, target, shift },
      };
    }),
  ),

  // 08 ─────────────────────────────────────────────
  defMono("08", "자릿수 구하기", SEC.지수법칙, "응용", (rng) =>
    attempt(200, () => {
      const m = intBetween(rng, 5, 14);
      const n = intBetween(rng, 5, 14);
      if (m === n) return null;
      const lo = Math.min(m, n);
      const lead = Math.pow(m > n ? 2 : 5, Math.abs(m - n));
      if (lead > 100000) return null;
      const digits = String(lead).length + lo;
      return {
        content: `$2^{${m}}\\times 5^{${n}}$ 이 몇 자리의 자연수인지 구하시오.`,
        answer: `$${digits}$자리`,
        solution: `$2^{${m}}\\times 5^{${n}}=${lead}\\times \\left(2\\times 5\\right)^{${lo}}=${lead}\\times 10^{${lo}}$ 이다.\n$${lead}$ ${iGa(lead)} $${String(lead).length}$자리 수이므로 구하는 수는 $${String(lead).length}+${lo}=${digits}$자리의 자연수이다.`,
        facts: { m, n, lo, lead, digits },
      };
    }),
  ),

  // 09 ─────────────────────────────────────────────
  defMono("09", "지수법칙의 활용", SEC.지수법칙, "응용", (rng): Body => {
    const kind = intBetween(rng, 0, 1);
    if (kind === 0) {
      const p = pick(rng, [2, 3] as const);
      const s = intBetween(rng, 1, 3);
      const h = intBetween(rng, 4, 8);
      const start = Math.pow(p, s);
      return {
        content: `어떤 세균은 $1$시간마다 그 수가 $${p}$배가 된다고 한다. 이 세균 $${start}$마리가 $${h}$시간 후에 $${p}^{a}$마리가 된다고 할 때, 자연수 $a$ 의 값을 구하시오.`,
        answer: `$${s + h}$`,
        solution: `$1$시간마다 $${p}$배가 되므로 $${h}$시간 후에는 처음 수의 $${p}^{${h}}$배가 된다.\n$${start}=${p}^{${s}}$ 이므로 $${p}^{${s}}\\times ${p}^{${h}}=${p}^{${s + h}}$ 이다.\n따라서 $a=${s + h}$ 이다.`,
        facts: { kind, p, s, h, a: s + h },
      };
    }
    const m = intBetween(rng, 28, 34);
    const n = intBetween(rng, 14, 22);
    return {
      content: `용량이 $2^{${m}}$바이트인 저장 장치에 크기가 $2^{${n}}$바이트인 파일을 최대 몇 개까지 저장할 수 있는지 $2$의 거듭제곱으로 나타내시오.`,
      answer: `$2^{${m - n}}$개`,
      solution: `저장할 수 있는 파일의 개수는 $2^{${m}}\\div 2^{${n}}$ 이다.\n밑이 같은 거듭제곱의 나눗셈은 지수를 빼므로 $2^{${m}}\\div 2^{${n}}=2^{${m - n}}$ 이다.`,
      facts: { kind, m, n },
    };
  }),

  // 10 ─────────────────────────────────────────────
  defMono("10", "단항식의 곱셈", SEC.단항곱나눗, "기본", (rng) =>
    attempt(300, () => {
      const [v0, v1] = pickVars(rng);
      const m1 = randMono(rng, [v0, v1], 3);
      const k1 = pick(rng, [1, 1, 2, 3] as const);
      const m2 = randMono(rng, [v0, v1], 2, [2, 3, -2, -3, 1, -1] as const);
      const k2 = pick(rng, [1, 2] as const);
      const ans = monoMul(monoPow(m1, k1), monoPow(m2, k2));
      if (!monoSane(ans, 2000, 12)) return null;
      if (k1 === 1 && k2 === 1 && Math.abs(m1.c.n) === 1) return null;
      const expr = `${powTex(m1, k1)}\\times ${powTex(m2, k2)}`;
      return {
        content: `다음 식을 계산하시오.\n$${expr}$`,
        answer: `$${monoTex(ans)}$`,
        solution: `괄호가 있으면 먼저 지수법칙으로 괄호를 푼다. 그 다음 계수는 계수끼리, 문자는 문자끼리 곱한다.\n$${expr}=${monoTex(ans)}$`,
        facts: {
          ...monoFacts("m1", m1),
          k1,
          ...monoFacts("m2", m2),
          k2,
        },
      };
    }),
  ),

  // 11 ─────────────────────────────────────────────
  // **몫을 먼저 정하고** 피제수를 만든다 — 그래야 나누어떨어지고, 분모에
  // 남는 갈래도 의도대로 나온다.
  defMono("11", "단항식의 나눗셈", SEC.단항곱나눗, "응용", (rng) =>
    attempt(300, () => {
      const [v0, v1] = pickVars(rng);
      const divisor = randMono(rng, [v0, v1], 2, [2, 3, -2, -3, 4] as const);
      const k = pick(rng, [1, 1, 2] as const);
      const d0 = intBetween(rng, -2, 3);
      const d1 = intBetween(rng, -2, 3);
      if (d0 === 0 && d1 === 0) return null;
      const dividendExp: Record<string, number> = {
        [v0]: divisor.e[v0]! * k + d0,
        [v1]: divisor.e[v1]! * k + d1,
      };
      if (dividendExp[v0]! < 1 || dividendExp[v1]! < 1) return null;
      const dividend = mono(
        q(pick(rng, [8, 12, 16, 18, 24, 32, 36, -12, -18, -24] as const)),
        dividendExp,
      );
      const ans = monoDiv(dividend, monoPow(divisor, k));
      if (!monoSane(ans, 512, 10)) return null;
      if (ans.c.d > 8) return null;
      const expr = `${monoTex(dividend)}\\div ${powTex(divisor, k)}`;
      return {
        content: `다음 식을 계산하시오.\n$${expr}$`,
        answer: `$${monoTex(ans)}$`,
        solution: `나눗셈은 역수의 곱셈으로 고쳐 계산한다. 괄호가 있으면 지수법칙으로 먼저 푼다.\n$${expr}=${monoTex(ans)}$`,
        facts: {
          ...monoFacts("a", dividend),
          ...monoFacts("b", divisor),
          k,
        },
      };
    }),
  ),

  // 12 ─────────────────────────────────────────────
  defMono(
    "12",
    "단항식의 곱셈과 나눗셈의 혼합 계산",
    SEC.단항곱나눗,
    "심화하",
    (rng) =>
      attempt(300, () => {
        const [v0, v1] = pickVars(rng);
        const a = randMono(rng, [v0, v1], 3, [2, 3, -2, -3, 1, -1] as const);
        const ka = pick(rng, [1, 2, 3] as const);
        const b = randMono(rng, [v0, v1], 2, [2, 3, -2, -3] as const);
        const kb = pick(rng, [1, 2] as const);
        const c = randMono(rng, [v0, v1], 2, [2, 3, 4, -2, -3] as const);
        const order = intBetween(rng, 0, 1);
        const ans =
          order === 0
            ? monoDiv(monoMul(monoPow(a, ka), monoPow(b, kb)), c)
            : monoMul(monoDiv(monoPow(a, ka), monoPow(b, kb)), c);
        if (!monoSane(ans, 2000, 12)) return null;
        if (ans.c.d > 12) return null;
        const expr =
          order === 0
            ? `${powTex(a, ka)}\\times ${powTex(b, kb)}\\div ${powTex(c, 1)}`
            : `${powTex(a, ka)}\\div ${powTex(b, kb)}\\times ${powTex(c, 1)}`;
        return {
          content: `다음 식을 계산하시오.\n$${expr}$`,
          answer: `$${monoTex(ans)}$`,
          solution: `괄호를 지수법칙으로 풀고, 나눗셈을 역수의 곱셈으로 바꾼 뒤 계수는 계수끼리, 문자는 문자끼리 계산한다. 앞에서부터 차례로 계산해야 한다.\n$${expr}=${monoTex(ans)}$`,
          facts: {
            ...monoFacts("a", a),
            ka,
            ...monoFacts("b", b),
            kb,
            ...monoFacts("c", c),
            order,
          },
        };
      }),
  ),

  // 13 ─────────────────────────────────────────────
  // □ 를 **먼저 정하고** 우변을 만든다.
  defMono("13", " 안에 알맞은 식 구하기", SEC.단항곱나눗, "심화하", (rng) =>
    attempt(300, () => {
      const [v0, v1] = pickVars(rng);
      const box = randMono(rng, [v0, v1], 2, [2, 3, 4, 5, -2, -3, -4] as const);
      const a = randMono(rng, [v0, v1], 3, [2, 3, -2, -3] as const);
      const ka = pick(rng, [1, 2] as const);
      const b = randMono(rng, [v0, v1], 2, [2, 3, -2] as const);
      const kind = intBetween(rng, 0, 1);
      const rhs =
        kind === 0
          ? monoMul(monoDiv(monoPow(a, ka), b), box)
          : monoDiv(monoMul(monoPow(a, ka), b), box);
      if (!monoSane(rhs, 4096, 12)) return null;
      if (rhs.c.d > 12) return null;
      const lhs =
        kind === 0
          ? `${powTex(a, ka)}\\div ${powTex(b, 1)}\\times \\square`
          : `${powTex(a, ka)}\\times ${powTex(b, 1)}\\div \\square`;
      return {
        content: `다음 등식이 성립할 때, $\\square$ 안에 알맞은 식을 구하시오.\n$${lhs}=${monoTex(rhs)}$`,
        answer: `$${monoTex(box)}$`,
        solution:
          kind === 0
            ? `$\\square=${monoTex(rhs)}\\div \\left(${powTex(a, ka)}\\div ${powTex(b, 1)}\\right)$ 이므로 $\\square=${monoTex(box)}$ 이다.`
            : `$\\square=${powTex(a, ka)}\\times ${powTex(b, 1)}\\div \\left(${monoTex(rhs)}\\right)$ 이므로 $\\square=${monoTex(box)}$ 이다.`,
        facts: {
          kind,
          ...monoFacts("box", box),
          ...monoFacts("a", a),
          ka,
          ...monoFacts("b", b),
        },
      };
    }),
  ),

  // 14 ─────────────────────────────────────────────
  defMono(
    "14",
    "단항식의 곱셈과 나눗셈의 활용",
    SEC.단항곱나눗,
    "응용",
    (rng) =>
      attempt(300, (): Body | null => {
        const [v0, v1] = pickVars(rng);
        const kind = intBetween(rng, 0, 2);
        if (kind === 0) {
          const base = randMono(rng, [v0, v1], 2, [2, 4, 6, 8] as const);
          const height = randMono(rng, [v0, v1], 2, [3, 5, 7, 9] as const);
          const ans = mono(qMul(q(1, 2), qMul(base.c, height.c)), {
            [v0]: base.e[v0]! + height.e[v0]!,
            [v1]: base.e[v1]! + height.e[v1]!,
          });
          if (!monoSane(ans, 512, 8)) return null;
          if (ans.c.d !== 1) return null;
          return {
            content: `밑변의 길이가 $${monoTex(base)}$, 높이가 $${monoTex(height)}$ 인 삼각형의 넓이를 구하시오.`,
            answer: `$${monoTex(ans)}$`,
            solution: `(삼각형의 넓이)$=\\dfrac{1}{2}\\times$(밑변의 길이)$\\times$(높이) 이므로\n$\\dfrac{1}{2}\\times ${monoTex(base)}\\times ${monoTex(height)}=${monoTex(ans)}$ 이다.`,
            facts: {
              kind,
              ...monoFacts("base", base),
              ...monoFacts("height", height),
            },
          };
        }
        if (kind === 1) {
          const bottom = randMono(rng, [v0, v1], 2, [2, 3, 4, 5] as const);
          const height = randMono(rng, [v0, v1], 2, [2, 3, 4] as const);
          const volume = monoMul(bottom, height);
          if (!monoSane(volume, 512, 8)) return null;
          return {
            content: `밑넓이가 $${monoTex(bottom)}$ 이고 부피가 $${monoTex(volume)}$ 인 각기둥의 높이를 구하시오.`,
            answer: `$${monoTex(height)}$`,
            solution: `(기둥의 부피)$=$(밑넓이)$\\times$(높이) 이므로 (높이)$=$(부피)$\\div$(밑넓이) 이다.\n$${monoTex(volume)}\\div ${monoTex(bottom)}=${monoTex(height)}$`,
            facts: {
              kind,
              ...monoFacts("bottom", bottom),
              ...monoFacts("height", height),
            },
          };
        }
        const rc = pick(rng, [3, 6] as const);
        const rv = pick(rng, [v0, v1] as const);
        const re = intBetween(rng, 1, 2);
        const radius = mono(q(rc), { [rv]: re });
        const ansC = qMul(q(4, 3), qPow(radius.c, 3));
        const ans = mono(ansC, { π: 1, [rv]: re * 3 });
        if (!monoSane(ans, 4096, 8)) return null;
        return {
          content: `반지름의 길이가 $${monoTex(radius)}$ 인 구의 부피를 구하시오.`,
          answer: `$${monoTex(ans)}$`,
          solution: `(구의 부피)$=\\dfrac{4}{3}\\pi \\times$(반지름의 길이)$^{3}$ 이므로\n$\\dfrac{4}{3}\\pi \\times \\left(${monoTex(radius)}\\right)^{3}=${monoTex(ans)}$ 이다.`,
          facts: { kind, rc, re },
        };
      }),
  ),

  // 15 ─────────────────────────────────────────────
  defMono("15", "지수법칙의 응용 ⑶", SEC.지수법칙, "심화하", (rng) =>
    attempt(200, () => {
      const p = pick(rng, [2, 3, 5, 7] as const);
      const terms = intBetween(rng, 2, 3);
      const x = intBetween(rng, 2, 5);
      let factor = 0;
      for (let i = 0; i < terms; i += 1) factor += Math.pow(p, i);
      const total = Math.pow(p, x) * factor;
      if (total > 200000) return null;
      const parts: string[] = [];
      for (let i = terms - 1; i >= 0; i -= 1) {
        parts.push(i === 0 ? `${p}^{x}` : `${p}^{x+${i}}`);
      }
      const expr = parts.join("+");
      return {
        content: `$${expr}=${total}$ 일 때, 자연수 $x$ 의 값을 구하시오.`,
        answer: `$${x}$`,
        solution: `밑이 같으므로 $${p}^{x}$ 로 묶으면 $${expr}=\\left(${Array.from(
          { length: terms },
          (_v, i) => `${p}^{${terms - 1 - i}}`,
        ).join(
          "+",
        )}\\right)\\times ${p}^{x}=${factor}\\times ${p}^{x}$ 이다.\n$${factor}\\times ${p}^{x}=${total}$ 에서 $${p}^{x}=${Math.pow(p, x)}$ 이므로 $x=${x}$ 이다.`,
        facts: { p, terms, x, factor, total },
      };
    }),
  ),

  // 16 ─────────────────────────────────────────────
  defMono("16", "일의 자리의 숫자 구하기", SEC.지수법칙, "심화하", (rng) =>
    attempt(200, () => {
      const p = pick(rng, [2, 3, 7, 8] as const);
      const k = intBetween(rng, 2, 3);
      const q2 = Math.pow(p, k);
      if (q2 > 100) return null;
      const m = intBetween(rng, 8, 25);
      const n = intBetween(rng, 4, 12);
      const total = m + k * n;
      // 일의 자리는 네 개씩 되풀이된다 — `p^1` 이 cycle[0] 이므로 색인은 (지수−1) mod 4.
      const cycle = [
        p % 10,
        (p * p) % 10,
        (p * p * p) % 10,
        (p * p * p * p) % 10,
      ];
      const digit = cycle[(total - 1) % 4]!;
      return {
        content: `$${p}^{${m}}\\times ${q2}^{${n}}$ 의 일의 자리의 숫자를 구하시오.`,
        answer: `$${digit}$`,
        solution: `밑을 $${p}$${euRo(p)} 맞추면 $${q2}^{${n}}=\\left(${p}^{${k}}\\right)^{${n}}=${p}^{${k * n}}$ 이므로 주어진 수는 $${p}^{${total}}$ 이다.\n$${p}$ 의 거듭제곱의 일의 자리의 숫자는 $${cycle.join("$, $")}$ 이 이 차례로 되풀이된다. 지수 $${total}$ ${eul(total)} $4$${euRo(4)} 나눈 나머지를 보면 일의 자리의 숫자는 $${digit}$ 이다.`,
        facts: { p, k, q: q2, m, n, total, digit },
      };
    }),
  ),
];

// ═════════ 다항식의 계산 13유형 ═════════

export const M2_POLY_TYPES: TypeEntry[] = [
  // 01 ─────────────────────────────────────────────
  defPoly("01", "다항식의 덧셈과 뺄셈", SEC.다항덧뺄, "기본", (rng): Body => {
    const [v0, v1] = pickVars(rng);
    const kind = intBetween(rng, 0, 1);
    if (kind === 0) {
      return attempt(200, () => {
        const p1 = randLinear(rng, [v0, v1]);
        const p2 = randLinear(rng, [v0, v1]);
        const k1 = pick(rng, [2, 3, 4, -2, -3] as const);
        const k2 = pick(rng, [2, 3, 4, -2, -3] as const);
        const ans = polyAdd(polyScale(p1, q(k1)), polyScale(p2, q(k2)));
        if (ans.length < 2) return null;
        const expr = `${coefTex(k1)}${paren(polyTex(p1))}${signedTermTex(k2, polyTex(p2))}`;
        return {
          content: `다음 식을 계산하시오.\n$${expr}$`,
          answer: `$${polyTex(ans)}$`,
          solution: `분배법칙으로 괄호를 풀고 동류항끼리 모아서 계산한다. 동류항이 아닌 항은 더할 수 없다.\n$${expr}=${polyTex(ans)}$`,
          facts: { kind, k1, k2 },
        };
      });
    }
    return attempt(200, () => {
      const p1 = randLinear(rng, [v0, v1]);
      const p2 = randLinear(rng, [v0, v1]);
      const d1 = pick(rng, [2, 3, 4] as const);
      const d2 = pick(rng, [2, 3, 6] as const);
      if (d1 === d2) return null;
      const ans = polySub(polyScale(p1, q(1, d1)), polyScale(p2, q(1, d2)));
      if (ans.length < 2) return null;
      const expr = `\\dfrac{${polyTex(p1)}}{${d1}}-\\dfrac{${polyTex(p2)}}{${d2}}`;
      return {
        content: `다음 식을 계산하시오.\n$${expr}$`,
        answer: `$${polyTex(ans)}$`,
        solution: `분모의 최소공배수로 통분한 뒤 분자를 정리하고 동류항끼리 모은다.\n$${expr}=${polyTex(ans)}$`,
        facts: { kind, d1, d2 },
      };
    });
  }),

  // 02 ─────────────────────────────────────────────
  defPoly("02", "이차식의 덧셈과 뺄셈", SEC.다항덧뺄, "기본", (rng) =>
    attempt(200, () => {
      const v = pick(rng, ["x", "a"] as const);
      const p1 = randQuadratic(rng, v);
      const p2 = randQuadratic(rng, v);
      const kind = intBetween(rng, 0, 1);
      const k1 = kind === 0 ? 1 : pick(rng, [2, 3, -2] as const);
      const k2 = kind === 0 ? -1 : pick(rng, [2, 3, -2, -3] as const);
      const ans = polyAdd(polyScale(p1, q(k1)), polyScale(p2, q(k2)));
      // 이차식이어야 한다 — 최고차항이 지워지면 다시 뽑는다.
      if (ans.length === 0 || monoDeg(ans[0]!) !== 2) return null;
      const expr = `${coefTex(k1)}${paren(polyTex(p1))}${signedTermTex(k2, polyTex(p2))}`;
      return {
        content: `다음 식을 계산하시오.\n$${expr}$`,
        answer: `$${polyTex(ans)}$`,
        solution: `괄호를 풀 때 빼는 식은 각 항의 부호를 바꾸어 더한다. 그 다음 동류항끼리 모은다.\n$${expr}=${polyTex(ans)}$`,
        facts: { kind, k1, k2 },
      };
    }),
  ),

  // 03 ─────────────────────────────────────────────
  defPoly(
    "03",
    "괄호가 여러 개인 다항식의 덧셈과 뺄셈",
    SEC.다항덧뺄,
    "응용",
    (rng) =>
      attempt(200, () => {
        const [v0, v1] = pickVars(rng);
        const t0 = mono(q(intBetween(rng, 2, 5)), { [v0]: 1 });
        const t1 = randLinear(rng, [v0, v1]);
        const t2 = randLinear(rng, [v0, v1]);
        const t3 = randLinear(rng, [v0, v1]);
        const k = pick(rng, [2, 3, 4, -2] as const);
        const inner = polyScale(t3, q(k));
        const lvl1 = polySub(t2, inner);
        const lvl2 = polySub(t1, lvl1);
        const ans = polySub([t0], lvl2);
        if (ans.length < 2) return null;
        // 계수가 음수면 `-` 가 겹쳐 `--2(...)` 가 된다 — 부호를 합쳐서 쓴다.
        const expr = `${monoTex(t0)}-\\left[${polyTex(t1)}-\\left\\{${polyTex(t2)}${signedTermTex(-k, polyTex(t3))}\\right\\}\\right]`;
        return {
          content: `다음 식을 계산하시오.\n$${expr}$`,
          answer: `$${polyTex(ans)}$`,
          solution: `소괄호 → 중괄호 → 대괄호의 차례로 괄호를 푼다. 괄호 앞이 $-$ 이면 괄호 안 각 항의 부호를 바꾼다.\n$${expr}=${polyTex(ans)}$`,
          facts: { k },
        };
      }),
  ),

  // 04 ─────────────────────────────────────────────
  defPoly("04", "어떤 식 구하기", SEC.다항덧뺄, "기본", (rng) =>
    attempt(200, () => {
      const v = pick(rng, ["x", "a"] as const);
      const other = v === "x" ? "y" : "b";
      const useQuad = intBetween(rng, 0, 1) === 1;
      const a = useQuad ? randQuadratic(rng, v) : randLinear(rng, [v, other]);
      const b = useQuad ? randQuadratic(rng, v) : randLinear(rng, [v, other]);
      const kind = intBetween(rng, 0, 1);
      const ans = kind === 0 ? polySub(b, a) : polyAdd(b, a);
      if (ans.length < 2) return null;
      const ca = constTerm(a);
      const cb = constTerm(b);
      if (ca === 0 || cb === 0) return null;
      const verb = kind === 0 ? "더했더니" : "뺐더니";
      return {
        content: `어떤 식에${kind === 0 ? "" : "서"} $${polyTex(a)}$ ${eul(ca)} ${verb} $${polyTex(b)}$ ${iGa(cb)} 되었다. 이때 어떤 식을 구하시오.`,
        answer: `$${polyTex(ans)}$`,
        solution:
          kind === 0
            ? `어떤 식을 $A$ 라 하면 $A+\\left(${polyTex(a)}\\right)=${polyTex(b)}$ 이다.\n$A=\\left(${polyTex(b)}\\right)-\\left(${polyTex(a)}\\right)=${polyTex(ans)}$`
            : `어떤 식을 $A$ 라 하면 $A-\\left(${polyTex(a)}\\right)=${polyTex(b)}$ 이다.\n$A=\\left(${polyTex(b)}\\right)+\\left(${polyTex(a)}\\right)=${polyTex(ans)}$`,
        facts: { kind, useQuad: useQuad ? 1 : 0, ca, cb },
      };
    }),
  ),

  // 05 ─────────────────────────────────────────────
  defPoly("05", "바르게 계산한 식 구하기", SEC.다항덧뺄, "응용", (rng) =>
    attempt(200, () => {
      const v = pick(rng, ["x", "a"] as const);
      const other = v === "x" ? "y" : "b";
      const useQuad = intBetween(rng, 0, 1) === 1;
      const a = useQuad ? randQuadratic(rng, v) : randLinear(rng, [v, other]);
      const b = useQuad ? randQuadratic(rng, v) : randLinear(rng, [v, other]);
      const kind = intBetween(rng, 0, 1);
      // kind 0: 더해야 할 것을 뺐다 → 어떤 식 = B+A, 바른 답 = B+2A
      // kind 1: 빼야 할 것을 더했다 → 어떤 식 = B−A, 바른 답 = B−2A
      const some = kind === 0 ? polyAdd(b, a) : polySub(b, a);
      const ans = kind === 0 ? polyAdd(some, a) : polySub(some, a);
      if (ans.length < 2 || some.length < 2) return null;
      const ca = constTerm(a);
      const cb = constTerm(b);
      if (ca === 0 || cb === 0) return null;
      const wrong =
        kind === 0
          ? "더해야 할 것을 잘못하여 뺐더니"
          : "빼야 할 것을 잘못하여 더했더니";
      return {
        content: `어떤 식에${kind === 0 ? "" : "서"} $${polyTex(a)}$ ${eul(ca)} ${wrong} $${polyTex(b)}$ ${iGa(cb)} 되었다. 이때 바르게 계산한 식을 구하시오.`,
        answer: `$${polyTex(ans)}$`,
        solution:
          kind === 0
            ? `어떤 식을 $A$ 라 하면 $A-\\left(${polyTex(a)}\\right)=${polyTex(b)}$ 이므로 $A=${polyTex(some)}$ 이다.\n바르게 계산하면 $\\left(${polyTex(some)}\\right)+\\left(${polyTex(a)}\\right)=${polyTex(ans)}$ 이다.`
            : `어떤 식을 $A$ 라 하면 $A+\\left(${polyTex(a)}\\right)=${polyTex(b)}$ 이므로 $A=${polyTex(some)}$ 이다.\n바르게 계산하면 $\\left(${polyTex(some)}\\right)-\\left(${polyTex(a)}\\right)=${polyTex(ans)}$ 이다.`,
        facts: { kind, useQuad: useQuad ? 1 : 0, ca, cb },
      };
    }),
  ),

  // 06 ─────────────────────────────────────────────
  defPoly("06", "단항식다항식", SEC.다항곱나눗, "기본", (rng) =>
    attempt(200, () => {
      const [v0, v1] = pickVars(rng);
      const m = randMono(rng, [v0, v1], 2, [
        2, 3, 4, 5, -2, -3, -4, -5,
      ] as const);
      const p = randLinear(rng, [v0, v1]);
      const ans = polyMulMono(p, m);
      if (ans.length !== p.length) return null;
      if (!ans.every((t) => monoSane(t, 512, 8))) return null;
      const kind = intBetween(rng, 0, 1);
      const expr =
        kind === 0
          ? `${powTex(m, 1)}${paren(polyTex(p))}`
          : `${paren(polyTex(p))}\\times ${powTex(m, 1)}`;
      return {
        content: `다음 식을 전개하시오.\n$${expr}$`,
        answer: `$${polyTex(ans)}$`,
        solution: `분배법칙을 이용하여 단항식을 다항식의 각 항에 곱한다. 부호에 주의한다.\n$${expr}=${polyTex(ans)}$`,
        facts: { kind, ...monoFacts("m", m) },
      };
    }),
  ),

  // 07 ─────────────────────────────────────────────
  // **몫을 먼저 정하고** 피제수를 만든다 — 나누어떨어지게 하려면 그 수밖에 없다.
  defPoly("07", "다항식단항식", SEC.다항곱나눗, "응용", (rng) =>
    attempt(200, () => {
      const [v0, v1] = pickVars(rng);
      const kind = intBetween(rng, 0, 1);
      // 분수 계수로 나눌 때는 몫을 분모의 배수로 잡는다 — 그러지 않으면 피제수의
      // 계수가 정수가 아니게 되어 이 갈래가 거의 안 나온다.
      const den = pick(rng, [3, 5] as const);
      const quotient =
        kind === 0
          ? randLinear(rng, [v0, v1])
          : polyScale(randLinear(rng, [v0, v1]), q(den));
      const divisor =
        kind === 0
          ? randMono(rng, [v1], 1, [2, 3, -2, -3, 4] as const)
          : mono(q(pick(rng, [2, 3, 4] as const), den), { [v1]: 1 });
      const dividend = polyMulMono(quotient, divisor);
      if (dividend.length !== quotient.length) return null;
      if (!dividend.every((t) => t.c.d === 1 && monoSane(t, 512, 8)))
        return null;
      const expr = `${paren(polyTex(dividend))}\\div ${powTex(divisor, 1)}`;
      return {
        content: `다음 식을 계산하시오.\n$${expr}$`,
        answer: `$${polyTex(quotient)}$`,
        solution: `나눗셈을 분수 꼴로 고쳐 각 항을 단항식으로 나눈다. 또는 나누는 식의 역수를 각 항에 곱한다.\n$${expr}=${polyTex(quotient)}$`,
        facts: { kind, ...monoFacts("d", divisor) },
      };
    }),
  ),

  // 08 ─────────────────────────────────────────────
  defPoly(
    "08",
    "덧셈 뺄셈 곱셈 나눗셈이 혼합된 식의 계산",
    SEC.다항곱나눗,
    "심화하",
    (rng) =>
      attempt(300, () => {
        const [v0, v1] = pickVars(rng);
        const m = randMono(rng, [v0], 1, [2, 3, -2, -3] as const);
        const p = randLinear(rng, [v0, v1]);
        const left = polyMulMono(p, m);
        const quotient = randLinear(rng, [v0, v1]);
        const divisor = randMono(rng, [v0], 1, [3, -3, 2, -2, 9, -9] as const);
        const dividend = polyMulMono(quotient, divisor);
        if (!dividend.every((t) => t.c.d === 1 && monoSane(t, 512, 8))) {
          return null;
        }
        const sign = intBetween(rng, 0, 1) === 0 ? 1 : -1;
        const ans =
          sign === 1 ? polyAdd(left, quotient) : polySub(left, quotient);
        if (ans.length < 2) return null;
        const expr = `${powTex(m, 1)}${paren(polyTex(p))}${sign === 1 ? "+" : "-"}${paren(polyTex(dividend))}\\div ${powTex(divisor, 1)}`;
        return {
          content: `다음 식을 계산하시오.\n$${expr}$`,
          answer: `$${polyTex(ans)}$`,
          solution: `곱셈과 나눗셈을 먼저 하고, 그 결과를 덧셈·뺄셈으로 정리한다. 괄호 앞이 $-$ 이면 각 항의 부호를 바꾼다.\n$${expr}=${polyTex(ans)}$`,
          facts: { sign, ...monoFacts("m", m), ...monoFacts("d", divisor) },
        };
      }),
  ),

  // 09 ─────────────────────────────────────────────
  defPoly(
    "09",
    "단항식과 다항식의 곱셈과 나눗셈의 활용",
    SEC.다항곱나눗,
    "응용",
    (rng) =>
      attempt(300, () => {
        const [v0, v1] = pickVars(rng);
        const kind = intBetween(rng, 0, 1);
        if (kind === 0) {
          const w = mono(q(pick(rng, [2, 3, 4] as const)), { [v0]: 1 });
          const d = mono(q(pick(rng, [2, 3, 5] as const)), { [v1]: 1 });
          // 길이·부피는 음수가 될 수 없다 — 높이의 계수를 전부 양수로 잡는다.
          const height = polyNorm([
            mono(q(intBetween(rng, 1, 5)), { [v0]: 1 }),
            mono(q(intBetween(rng, 1, 5)), { [v1]: 1 }),
            mono(q(intBetween(rng, 1, 6))),
          ]);
          const volume = polyMulMono(height, monoMul(w, d));
          if (!volume.every((t) => t.c.d === 1 && monoSane(t, 512, 8))) {
            return null;
          }
          return {
            content: `밑면의 가로의 길이가 $${monoTex(w)}$, 세로의 길이가 $${monoTex(d)}$ 인 직육면체의 부피가 $${polyTex(volume)}$ 일 때, 이 직육면체의 높이를 구하시오.`,
            answer: `$${polyTex(height)}$`,
            solution: `(직육면체의 부피)$=$(밑넓이)$\\times$(높이) 이므로 (높이)$=$(부피)$\\div$(밑넓이) 이다.\n밑넓이는 $${monoTex(w)}\\times ${monoTex(d)}=${monoTex(monoMul(w, d))}$ 이므로\n$\\left(${polyTex(volume)}\\right)\\div ${monoTex(monoMul(w, d))}=${polyTex(height)}$ 이다.`,
            facts: { kind, ...monoFacts("w", w), ...monoFacts("d", d) },
          };
        }
        const top = polyNorm([
          mono(q(1), { [v0]: 1 }),
          mono(q(1), { [v1]: 1 }),
        ]);
        const bottomC = pick(rng, [3, 5, 7] as const);
        const bottom = polyNorm([mono(q(bottomC), { [v1]: 1 })]);
        const height = mono(q(pick(rng, [2, 4, 6] as const)), {
          [v0]: 1,
          [v1]: 1,
        });
        const ans = polyMulMono(
          polyAdd(top, bottom),
          mono(qMul(q(1, 2), height.c), height.e),
        );
        if (!ans.every((t) => t.c.d === 1 && monoSane(t, 512, 8))) return null;
        return {
          content: `윗변의 길이가 $${polyTex(top)}$, 아랫변의 길이가 $${polyTex(bottom)}$, 높이가 $${monoTex(height)}$ 인 사다리꼴의 넓이를 구하시오.`,
          answer: `$${polyTex(ans)}$`,
          solution: `(사다리꼴의 넓이)$=\\dfrac{1}{2}\\times\\{$(윗변의 길이)$+$(아랫변의 길이)$\\}\\times$(높이) 이므로\n$\\dfrac{1}{2}\\times\\left\\{\\left(${polyTex(top)}\\right)+${polyTex(bottom)}\\right\\}\\times ${monoTex(height)}=${polyTex(ans)}$ 이다.`,
          facts: { kind, bottomC, ...monoFacts("h", height) },
        };
      }),
  ),

  // 10 ─────────────────────────────────────────────
  defPoly("10", "식의 값 ⑴", SEC.다항곱나눗, "응용", (rng) =>
    attempt(300, () => {
      const [v0, v1] = pickVars(rng);
      const q1 = randLinear(rng, [v0, v1]);
      const q2 = randLinear(rng, [v0, v1]);
      const d1 = randMono(rng, [v0, v1], 1, [2, 3, -2, -3] as const);
      const d2 = randMono(rng, [v1], 1, [2, 5, -5] as const);
      const n1 = polyMulMono(q1, d1);
      const n2 = polyMulMono(q2, d2);
      if (!n1.every((t) => t.c.d === 1) || !n2.every((t) => t.c.d === 1)) {
        return null;
      }
      const xv = pick(rng, [-1, 1, 2, -2, 3] as const);
      const yv = pick(rng, [2, -2, 3, -3, 4] as const);
      if (xv === yv) return null;
      const simple = polySub(q1, q2);
      if (simple.length < 2) return null;
      const env: Record<string, number> = { [v0]: xv, [v1]: yv };
      let value = 0;
      for (const t of simple) {
        let term = t.c.n / t.c.d;
        for (const k of Object.keys(t.e)) {
          term *= Math.pow(env[k]!, t.e[k]!);
        }
        value += term;
      }
      if (!Number.isInteger(value)) return null;
      const expr = `\\dfrac{${polyTex(n1)}}{${monoTex(d1)}}-\\dfrac{${polyTex(n2)}}{${monoTex(d2)}}`;
      return {
        content: `$${v0}=${xv}$, $${v1}=${yv}$ 일 때, 다음 식의 값을 구하시오.\n$${expr}$`,
        answer: `$${value}$`,
        solution: `먼저 식을 간단히 하면 $${expr}=\\left(${polyTex(q1)}\\right)-\\left(${polyTex(q2)}\\right)=${polyTex(simple)}$ 이다.\n$${v0}=${xv}$, $${v1}=${yv}$ ${eul(yv)} 대입하면 값은 $${value}$ 이다.${
          xv < 0 || yv < 0 ? " 음수를 대입할 때는 반드시 괄호를 사용한다." : ""
        }`,
        facts: { xv, yv, value },
      };
    }),
  ),

  // 11 ─────────────────────────────────────────────
  defPoly("11", "식의 대입", SEC.다항덧뺄, "응용", (rng) =>
    attempt(200, () => {
      const [v0, v1] = pickVars(rng);
      const defA = randLinear(rng, [v0, v1]);
      const defB = randLinear(rng, [v0, v1]);
      const ka = pick(rng, [2, 3, -2] as const);
      const kb = pick(rng, [2, 3, -3] as const);
      const ans = polyAdd(polyScale(defA, q(ka)), polyScale(defB, q(-kb)));
      if (ans.length < 2) return null;
      const expr = `${coefTex(ka)}A${kb > 0 ? "-" : "+"}${coefTex(Math.abs(kb))}B`;
      return {
        content: `$A=${polyTex(defA)}$, $B=${polyTex(defB)}$ 일 때, $${expr}$ 를 $${v0}$, $${v1}$ 에 대한 식으로 나타내시오.`,
        answer: `$${polyTex(ans)}$`,
        solution: `$A$, $B$ 에 주어진 식을 **괄호를 사용하여** 대입한다.\n$${expr}=${coefTex(ka)}\\left(${polyTex(defA)}\\right)${signedTermTex(-kb, polyTex(defB))}=${polyTex(ans)}$`,
        facts: { ka, kb },
      };
    }),
  ),

  // 12 ─────────────────────────────────────────────
  defPoly("12", "규칙 찾기", SEC.다항덧뺄, "응용", (rng) => {
    const [v0, v1] = pickVars(rng);
    const kind = intBetween(rng, 0, 1);
    if (kind === 0) {
      return attempt(200, () => {
        const a = randLinear(rng, [v0, v1]);
        const b = randLinear(rng, [v0, v1]);
        const c = randLinear(rng, [v0, v1]);
        const ans = polyAdd(polyAdd(a, polyScale(b, q(2))), c);
        if (ans.length < 2) return null;
        return {
          content: `이웃한 두 칸에 적힌 식을 더하여 바로 위 칸에 쓰는 규칙으로 식을 쌓아 간다. 맨 아래 줄에 왼쪽부터 차례로 $${polyTex(a)}$, $${polyTex(b)}$, $${polyTex(c)}$ ${iGa(constTerm(c))} 적혀 있을 때, 맨 위 칸에 적힐 식을 구하시오.`,
          answer: `$${polyTex(ans)}$`,
          solution: `가운데 줄의 두 칸은 각각 $\\left(${polyTex(a)}\\right)+\\left(${polyTex(b)}\\right)$, $\\left(${polyTex(b)}\\right)+\\left(${polyTex(c)}\\right)$ 이다.\n맨 위 칸은 이 둘의 합이므로 $${polyTex(ans)}$ 이다.`,
          facts: { kind },
        };
      });
    }
    return attempt(200, () => {
      const first = randLinear(rng, [v0, v1]);
      const diff = randLinear(rng, [v0, v1]);
      const nth = intBetween(rng, 8, 12);
      const ans = polyAdd(first, polyScale(diff, q(nth - 1)));
      if (ans.length < 2) return null;
      const shown = [0, 1, 2, 3]
        .map((i) => `$${polyTex(polyAdd(first, polyScale(diff, q(i))))}$`)
        .join(", ");
      return {
        content: `어떤 규칙에 따라 식을 차례로 늘어놓은 것이다.\n${shown}, $\\cdots$\n이때 $${nth}$번째 식을 구하시오.`,
        answer: `$${polyTex(ans)}$`,
        solution: `이웃한 두 식의 차가 항상 $${polyTex(diff)}$ 이므로 $n$번째 식은 첫째 식에 $${polyTex(diff)}$ ${eul(constTerm(diff))} $\\left(n-1\\right)$번 더한 것이다.\n$${nth}$번째 식은 $\\left(${polyTex(first)}\\right)+${nth - 1}\\left(${polyTex(diff)}\\right)=${polyTex(ans)}$ 이다.`,
        facts: { kind, nth },
      };
    });
  }),

  // 13 ─────────────────────────────────────────────
  defPoly("13", "식의 값 ⑵", SEC.다항곱나눗, "심화하", (rng) =>
    attempt(200, () => {
      const base = pick(rng, [-3, -2, 2, 3] as const);
      const b = intBetween(rng, 2, 3);
      const a = intBetween(rng, 2, 4);
      const coef = Math.pow(base, b);
      const deg = a * b;
      if (Math.abs(coef) > 81 || deg > 12) return null;
      const c1 = intBetween(rng, 2, 5);
      const c2 = intBetween(rng, 2, 4);
      const c3 = intBetween(rng, 2, 5);
      const c4 = intBetween(rng, 2, 6);
      // 값 = c1·a − [ −a + c2·b − { c3·a − (c4·a − b) } ]
      const value = c1 * a - (-a + c2 * b - (c3 * a - (c4 * a - b)));
      const baseTex = base < 0 ? `\\left(${base}\\right)` : String(base);
      const eqTex = `\\left(${coefTex(base)}x^{a}\\right)^{b}=${coefTex(coef)}x^{${deg}}`;
      const exprTex = `${c1}a-\\left[-a+${c2}b-\\left\\{${c3}a-\\left(${c4}a-b\\right)\\right\\}\\right]`;
      return {
        content: `$${eqTex}$ 일 때, 다음 식의 값을 구하시오. (단, $a$, $b$ 는 자연수이다.)\n$${exprTex}$`,
        answer: `$${value}$`,
        solution: `좌변을 정리하면 $\\left(${coefTex(base)}x^{a}\\right)^{b}=${baseTex}^{b}x^{ab}$ 이다.\n계수를 비교하면 $${baseTex}^{b}=${coef}$ 에서 $b=${b}$ 이고, 지수를 비교하면 $ab=${deg}$ 에서 $a=${a}$ 이다.\n괄호를 풀어 식을 정리한 뒤 $a=${a}$, $b=${b}$ ${eul(b)} 대입하면 값은 $${value}$ 이다.`,
        facts: { base, a, b, coef, deg, c1, c2, c3, c4, value },
      };
    }),
  ),
];

/** 이 세션이 등록한 29유형 — 시험은 이 배열을 **직접** 훑는다. */
export const M2_MONO: TypeEntry[] = [...M2_MONO_TYPES, ...M2_POLY_TYPES];
