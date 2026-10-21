/**
 * 중2 「단항식의 계산 16 + 다항식의 계산 13」 29유형 — 독립 검산.
 * (세션 4E-중2대수 — docs/planning/tracks/middle-engine-wave3-plan.md §11.2)
 *
 * ── 검산이 생성기와 다른 방법인가 ────────────────────────────
 *
 * 이 파일은 `m2Mono.ts` 의 대수(Q·Mono·Poly)를 **하나도 쓰지 않는다**. 대신
 * **지면에 나간 LaTeX 를 직접 파싱해 유리수(BigInt)로 값을 매긴다** — 그리고
 * 「정리 전 식」과 「정리 후 답」에 여러 점을 대입해 값이 같은지 본다
 * (브리프: 「검산은 대입으로. 문자가 둘이면 (2,3)·(-1,4) 처럼 여러 쌍을」).
 *
 * 왜 이 방식인가: 생성기가 상징 계산으로 답을 만들었다면, 여기서는 **수치**로
 * 되짚는다. 같은 식을 옮겨 적으면 동어반복이고(계약 §2), `facts` 의 계수를
 * 그대로 곱해 보는 것도 결국 생성기의 곱셈을 한 번 더 하는 것이다.
 * 게다가 이 방식은 **지면 그 자체**를 읽으므로 조립 과정에서 생긴 결함
 * (2026-08-24 실제로 `--2\left(...\right)` 이중 부호가 여기서 잡혔다)도 본다.
 *
 * 지수법칙·자릿수·일의 자리처럼 대입이 안 되는 갈래는 **BigInt 거듭제곱**으로
 * 직접 계산한다(생성기는 지수의 덧셈·뺄셈으로 답을 낸다 — 다른 연산이다).
 *
 * ── 이 단원에서 특히 지키는 것 ───────────────────────────────
 *  ⑴ 부호와 괄호: `(-2a)^3=-8a^3` — 대입 검산이 부호를 바로 가른다.
 *  ⑵ 음의 지수 금지: 지면 전량에 `^{-` 가 없어야 한다(중2 미학습).
 *  ⑶ 동류항: 답을 **다시 항으로 갈라** 같은 변수 서명이 둘 있으면 빨강.
 *  ⑷ D-73: 지면에 대분수를 만들지 않는다(가분수 그대로).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { bareNumbers } from "../../lib/elementary/rules";
import { renderMathHtml } from "../../lib/math/renderMathHtml";
import {
  generateMiddleProblem,
  generateMiddleSet,
  registeredTypes,
} from "../../lib/middle/generate";
import { M2_MONO } from "../../lib/middle/m2Mono";
import type { MidProblem } from "../../lib/middle/types";

const SEEDS = [20260824, 3, 555, 90210, 7777];
const R = "2-1|단항식의 계산";
const P = "2-1|다항식의 계산";

// ═══ 유리수 (BigInt) — 검산 쪽 산술 ═══════════════════

type Frac = { n: bigint; d: bigint };

const ZERO = BigInt(0);
const ONE = BigInt(1);
const TEN = BigInt(10);

function bgcd(a: bigint, b: bigint): bigint {
  let x = a < ZERO ? -a : a;
  let y = b < ZERO ? -b : b;
  while (y !== ZERO) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

function fr(n: bigint | number, d: bigint | number = ONE): Frac {
  let nn = typeof n === "number" ? BigInt(n) : n;
  let dd = typeof d === "number" ? BigInt(d) : d;
  if (dd === ZERO) throw new Error("검산 중 0 으로 나눔");
  if (dd < ZERO) {
    nn = -nn;
    dd = -dd;
  }
  if (nn === ZERO) return { n: ZERO, d: ONE };
  const g = bgcd(nn, dd);
  return { n: nn / g, d: dd / g };
}

const addF = (a: Frac, b: Frac): Frac => fr(a.n * b.d + b.n * a.d, a.d * b.d);
const subF = (a: Frac, b: Frac): Frac => fr(a.n * b.d - b.n * a.d, a.d * b.d);
const mulF = (a: Frac, b: Frac): Frac => fr(a.n * b.n, a.d * b.d);
const divF = (a: Frac, b: Frac): Frac => {
  if (b.n === ZERO) throw new Error("검산 중 0 으로 나눔");
  return fr(a.n * b.d, a.d * b.n);
};
const negF = (a: Frac): Frac => ({ n: -a.n, d: a.d });
const eqF = (a: Frac, b: Frac): boolean => a.n === b.n && a.d === b.d;
const showF = (a: Frac): string => (a.d === ONE ? `${a.n}` : `${a.n}/${a.d}`);

function powF(a: Frac, k: number): Frac {
  if (!Number.isInteger(k)) throw new Error(`정수가 아닌 지수 ${k}`);
  if (k < 0) return divF(fr(1), powF(a, -k));
  let r = fr(1);
  for (let i = 0; i < k; i += 1) r = mulF(r, a);
  return r;
}

// ═══ LaTeX 파서 — 지면 문자열을 그대로 읽는다 ═════════
//
// 모르는 글자·명령을 만나면 **던진다**. 조립이 이상해지면 조용히 넘어가지
// 않고 여기서 빨개진다 (「가드는 실패를 셀 수 있는 형태여야 한다」).

type Tok = { k: "num" | "id" | "cmd" | "sym"; v: string };

function tokenize(tex: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < tex.length) {
    const c = tex[i]!;
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < tex.length && /[0-9]/.test(tex[j]!)) j += 1;
      out.push({ k: "num", v: tex.slice(i, j) });
      i = j;
      continue;
    }
    if (/[a-zA-Z]/.test(c)) {
      out.push({ k: "id", v: c });
      i += 1;
      continue;
    }
    if (c === "\\") {
      const m = /^\\([a-zA-Z]+|.)/.exec(tex.slice(i));
      if (!m) throw new Error(`토큰 실패: ${tex.slice(i, i + 12)}`);
      i += m[0].length;
      const name = `\\${m[1]}`;
      // `\left` · `\right` 는 구분자 크기 지시일 뿐 값에 영향이 없다.
      if (name === "\\left" || name === "\\right") continue;
      out.push({ k: "cmd", v: name });
      continue;
    }
    if ("+-^{}()[]=,".includes(c)) {
      out.push({ k: "sym", v: c });
      i += 1;
      continue;
    }
    throw new Error(`모르는 글자 «${c}» — ${tex}`);
  }
  return out;
}

const isSym = (t: Tok | undefined, v: string): boolean =>
  !!t && t.k === "sym" && t.v === v;
const isCmd = (t: Tok | undefined, v: string): boolean =>
  !!t && t.k === "cmd" && t.v === v;

function canStartFactor(t: Tok | undefined): boolean {
  if (!t) return false;
  if (t.k === "num" || t.k === "id") return true;
  if (t.k === "sym") return t.v === "(" || t.v === "[";
  return ["\\{", "\\dfrac", "\\frac", "\\pi"].includes(t.v);
}

/** 지면 LaTeX 한 덩어리의 값. `env` 에 없는 문자를 만나면 던진다. */
function evalTex(tex: string, env: Record<string, Frac>): Frac {
  const toks = tokenize(tex);
  let i = 0;
  const peek = (): Tok | undefined => toks[i];
  const take = (): Tok => {
    const t = toks[i];
    if (!t) throw new Error(`식이 끊겼습니다: ${tex}`);
    i += 1;
    return t;
  };

  function braced(): Frac {
    const open = take();
    if (!isSym(open, "{")) throw new Error(`{ 가 아님: ${tex}`);
    const v = expr();
    const close = take();
    if (!isSym(close, "}")) throw new Error(`} 가 아님: ${tex}`);
    return v;
  }

  function primary(): Frac {
    const t = take();
    if (t.k === "num") return fr(BigInt(t.v));
    if (t.k === "id") {
      const v = env[t.v];
      if (v === undefined) throw new Error(`값이 없는 문자 «${t.v}» — ${tex}`);
      return v;
    }
    if (t.k === "sym" && (t.v === "(" || t.v === "[")) {
      const v = expr();
      const close = take();
      const want = t.v === "(" ? ")" : "]";
      if (!isSym(close, want)) throw new Error(`${want} 가 아님: ${tex}`);
      return v;
    }
    if (t.k === "cmd" && t.v === "\\{") {
      const v = expr();
      const close = take();
      if (!isCmd(close, "\\}")) throw new Error(`\\} 가 아님: ${tex}`);
      return v;
    }
    if (t.k === "cmd" && (t.v === "\\dfrac" || t.v === "\\frac")) {
      const a = braced();
      const b = braced();
      return divF(a, b);
    }
    if (t.k === "cmd" && t.v === "\\pi") {
      const v = env["pi"];
      if (v === undefined) throw new Error(`\\pi 값이 없습니다 — ${tex}`);
      return v;
    }
    throw new Error(`모르는 토큰 ${JSON.stringify(t)} — ${tex}`);
  }

  function factor(): Frac {
    if (isSym(peek(), "-")) {
      take();
      return negF(factor());
    }
    let base = primary();
    if (isSym(peek(), "^")) {
      take();
      const e = isSym(peek(), "{") ? braced() : primary();
      if (e.d !== ONE) throw new Error(`정수가 아닌 지수 — ${tex}`);
      base = powF(base, Number(e.n));
    }
    return base;
  }

  /**
   * 붙여 쓴 인수 덩어리 — `4xy^{2}` 하나. **`\div` 다음에는 이 덩어리 전체가
   * 제수다**(교과서 관례: `18x^{3}y^{5}\div 4xy^{2}` 의 나누는 식은 `4xy^{2}`).
   * 붙여 쓴 곱셈이 `\div` 보다 세게 묶이고, `\times` 는 그렇지 않다 —
   * `A\div B\times C` 는 앞에서부터 `(A\div B)\times C` 다.
   * 이 규칙은 **생성기가 아니라 교과서 표기**에서 왔고, 아래
   * 「나눗셈 읽는 규칙」 픽스처가 그것을 못 박는다.
   */
  function juxtaposed(): Frac {
    let acc = factor();
    while (canStartFactor(peek())) acc = mulF(acc, factor());
    return acc;
  }

  function term(): Frac {
    let acc = juxtaposed();
    for (;;) {
      const t = peek();
      if (!t) break;
      if (isCmd(t, "\\times") || isCmd(t, "\\cdot")) {
        take();
        acc = mulF(acc, juxtaposed());
        continue;
      }
      if (isCmd(t, "\\div")) {
        take();
        acc = divF(acc, juxtaposed());
        continue;
      }
      break;
    }
    return acc;
  }

  function expr(): Frac {
    let sign = ONE;
    if (isSym(peek(), "-")) {
      take();
      sign = -ONE;
    } else if (isSym(peek(), "+")) {
      take();
    }
    let acc = mulF(term(), fr(sign));
    for (;;) {
      const t = peek();
      if (isSym(t, "+")) {
        take();
        acc = addF(acc, term());
        continue;
      }
      if (isSym(t, "-")) {
        take();
        acc = subF(acc, term());
        continue;
      }
      break;
    }
    return acc;
  }

  const value = expr();
  if (i !== toks.length) {
    throw new Error(`다 읽지 못했습니다: ${tex} (남은 ${toks[i]?.v})`);
  }
  return value;
}

/** 식에 나오는 문자들 — 대입할 점을 고를 때 쓴다. */
function freeVars(tex: string): string[] {
  const out = new Set<string>();
  for (const t of tokenize(tex)) {
    if (t.k === "id") out.add(t.v);
    if (t.k === "cmd" && t.v === "\\pi") out.add("pi");
  }
  return [...out];
}

/**
 * 대입할 점 — 정수·음수·분수를 섞는다. 한 점에서 우연히 값이 같아도
 * 다른 점에서 갈라진다(브리프: 「(2,3)·(-1,4) 처럼 여러 쌍을 대라」).
 */
const POINTS: Record<string, Frac>[] = [
  { a: fr(2), b: fr(3), x: fr(2), y: fr(3), pi: fr(5) },
  { a: fr(-1), b: fr(4), x: fr(-1), y: fr(4), pi: fr(7) },
  { a: fr(5), b: fr(-2), x: fr(3), y: fr(-5), pi: fr(3) },
  { a: fr(1, 2), b: fr(-3, 2), x: fr(1, 2), y: fr(-3, 2), pi: fr(2) },
  { a: fr(-4, 3), b: fr(5, 3), x: fr(-4, 3), y: fr(5, 3), pi: fr(11) },
];

function pointFor(
  index: number,
  vars: readonly string[],
): Record<string, Frac> {
  const src = POINTS[index]!;
  const env: Record<string, Frac> = {};
  for (const v of vars) {
    const hit = src[v];
    if (hit === undefined) {
      throw new Error(`대입할 값을 정하지 않은 문자 «${v}»`);
    }
    env[v] = hit;
  }
  return env;
}

/** 두 식이 **같은 함수**인가 — POINTS 전량에 대입해 값을 견준다. */
function expectSameValue(left: string, right: string, label: string): void {
  const vars = [...new Set([...freeVars(left), ...freeVars(right)])];
  for (let k = 0; k < POINTS.length; k += 1) {
    const env = pointFor(k, vars);
    const lv = evalTex(left, env);
    const rv = evalTex(right, env);
    expect(
      eqF(lv, rv),
      `${label}\n  좌 ${left} = ${showF(lv)}\n  우 ${right} = ${showF(rv)}\n  점 ${JSON.stringify(
        Object.fromEntries(
          Object.entries(env).map(([kk, vv]) => [kk, showF(vv)]),
        ),
      )}`,
    ).toBe(true);
  }
}

// ═══ 지면에서 항을 되읽는 자 — 동류항 가드 ═════════════

/** 중괄호·괄호 깊이 0 에서 `+`/`-` 로 가른다. */
function splitTerms(tex: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < tex.length; i += 1) {
    const c = tex[i]!;
    if (c === "\\") {
      i += 1;
      continue;
    }
    if (c === "{" || c === "(" || c === "[") depth += 1;
    else if (c === "}" || c === ")" || c === "]") depth -= 1;
    else if ((c === "+" || c === "-") && depth === 0 && i > start) {
      out.push(tex.slice(start, i));
      start = i;
    }
  }
  out.push(tex.slice(start));
  return out.filter((s) => s.length > 0);
}

/** `{` 에 짝이 되는 `}` 위치. 못 찾으면 -1. */
function braceClose(s: string, open: number): number {
  let d = 0;
  for (let i = open; i < s.length; i += 1) {
    if (s[i] === "\\") {
      i += 1;
      continue;
    }
    if (s[i] === "{") d += 1;
    else if (s[i] === "}") {
      d -= 1;
      if (d === 0) return i;
    }
  }
  return -1;
}

/**
 * 한 항의 **변수 서명** — `{변수: 지수}`. 분모의 변수는 음의 지수로 센다.
 * `\dfrac{3x}{5y^{2}}` → `{x:1, y:-2}` · `\dfrac{2x}{3}` → `{x:1}`.
 */
function termSignature(term: string): string {
  const acc: Record<string, number> = {};
  const walk = (s: string, sign: number): void => {
    let i = 0;
    while (i < s.length) {
      const c = s[i]!;
      if (c === "\\") {
        const m = /^\\([a-zA-Z]+|.)/.exec(s.slice(i))!;
        const name = m[1]!;
        i += m[0].length;
        if (name === "dfrac" || name === "frac") {
          const o1 = s.indexOf("{", i);
          const c1 = braceClose(s, o1);
          const o2 = s.indexOf("{", c1 + 1);
          const c2 = braceClose(s, o2);
          if (o1 < 0 || c1 < 0 || o2 < 0 || c2 < 0) {
            throw new Error(`분수를 못 읽었습니다: ${term}`);
          }
          walk(s.slice(o1 + 1, c1), sign);
          walk(s.slice(o2 + 1, c2), -sign);
          i = c2 + 1;
          continue;
        }
        if (name === "pi") {
          acc["pi"] = (acc["pi"] ?? 0) + sign;
          continue;
        }
        if (name === "left" || name === "right" || name === "square") continue;
        throw new Error(`서명에서 모르는 명령 \\${name}: ${term}`);
      }
      if (/[a-zA-Z]/.test(c)) {
        let e = 1;
        let j = i + 1;
        if (s[j] === "^") {
          const o = s.indexOf("{", j);
          const cl = braceClose(s, o);
          e = Number(s.slice(o + 1, cl));
          j = cl + 1;
        }
        acc[c] = (acc[c] ?? 0) + sign * e;
        i = j;
        continue;
      }
      i += 1;
    }
  };
  walk(term.replace(/^[-+]/, ""), 1);
  return Object.entries(acc)
    .filter(([, v]) => v !== 0)
    .sort(([p], [k]) => (p < k ? -1 : 1))
    .map(([k, v]) => `${k}^${v}`)
    .join(",");
}

/** 전체가 「(다항식) ÷ (수)」 꼴이면 분자를 열어 항을 센다. */
function answerTerms(tex: string): string[] {
  const m = /^(-?)\\dfrac\{/.exec(tex);
  if (m) {
    const o1 = tex.indexOf("{");
    const c1 = braceClose(tex, o1);
    const o2 = tex.indexOf("{", c1 + 1);
    const c2 = braceClose(tex, o2);
    if (c2 === tex.length - 1 && /^\d+$/.test(tex.slice(o2 + 1, c2))) {
      return splitTerms(tex.slice(o1 + 1, c1));
    }
  }
  return splitTerms(tex);
}

/** 정리한 식에 동류항이 남아 있으면 안 된다. */
function expectNoLikeTerms(tex: string, label: string): void {
  const seen = new Map<string, string>();
  for (const t of answerTerms(tex)) {
    const sig = termSignature(t);
    const prev = seen.get(sig);
    expect(
      prev,
      `${label} — 동류항이 남았다: «${prev}» 와 «${t}» (서명 ${sig || "상수"})\n  ${tex}`,
    ).toBeUndefined();
    seen.set(sig, t);
  }
}

// ═══ 지면 조각 꺼내기 ═════════════════════════════════

function maths(text: string): string[] {
  return [...text.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]!);
}

function lastMath(text: string): string {
  const all = maths(text);
  expect(all.length, `수식이 없습니다: ${text}`).toBeGreaterThan(0);
  return all[all.length - 1]!;
}

function answerMath(p: MidProblem): string {
  const all = maths(p.answer);
  expect(all.length, `정답에 수식이 없습니다: ${p.answer}`).toBe(1);
  return all[0]!;
}

/** 깊이 0 의 `=` 로 가른다. */
function splitEq(tex: string): [string, string] {
  let depth = 0;
  for (let i = 0; i < tex.length; i += 1) {
    const c = tex[i]!;
    if (c === "\\") {
      i += 1;
      continue;
    }
    if (c === "{" || c === "(" || c === "[") depth += 1;
    else if (c === "}" || c === ")" || c === "]") depth -= 1;
    else if (c === "=" && depth === 0) {
      return [tex.slice(0, i), tex.slice(i + 1)];
    }
  }
  throw new Error(`등식이 아닙니다: ${tex}`);
}

/** 「정리 전 = 정리 후」 — 계산·전개·간단히 하기 유형의 공통 검산. */
function checkSimplify(p: MidProblem): void {
  const expr = lastMath(p.content);
  const ans = answerMath(p);
  expectSameValue(expr, ans, p.rpmTitle);
  expectNoLikeTerms(ans, p.rpmTitle);
}

function bigPow(base: number, e: number): bigint {
  let r = ONE;
  const b = BigInt(base);
  for (let i = 0; i < e; i += 1) r *= b;
  return r;
}

/** 유리수 → 정수 (아니면 던진다). */
function toInt(f: Frac, label: string): bigint {
  expect(f.d === ONE, `${label} 이 정수가 아닙니다 (${showF(f)})`).toBe(true);
  return f.n;
}

// ═══ 유형별 검산 ═════════════════════════════════════

type Check = (p: MidProblem) => void;

const CHECKS: Record<string, Check> = {
  // ── 단항식의 계산 ──────────────────────────────────
  [`${R}|01`]: (p) => {
    if (p.facts.kind === 0) return checkSimplify(p);
    // `a^{x}\times a^{6}=a^{9}` — 답 x 를 넣으면 두 변의 **값**이 같아야 한다.
    const [lhs, rhs] = splitEq(maths(p.content)[0]!);
    const x = Number(toInt(evalTex(answerMath(p), {}), "x"));
    for (const base of [2, 3, 5]) {
      const env = { a: fr(base), x: fr(x) };
      expect(eqF(evalTex(lhs, env), evalTex(rhs, env)), `밑 ${base}`).toBe(
        true,
      );
    }
    expect(x).toBeGreaterThan(0);
  },
  [`${R}|02`]: (p) => {
    if (p.facts.kind === 0) return checkSimplify(p);
    const [lhs, rhs] = splitEq(maths(p.content)[0]!);
    const x = Number(toInt(evalTex(answerMath(p), {}), "x"));
    for (const base of [2, 3, 7]) {
      const env = { a: fr(base), x: fr(x) };
      expect(eqF(evalTex(lhs, env), evalTex(rhs, env)), `밑 ${base}`).toBe(
        true,
      );
    }
    expect(x).toBeGreaterThan(0);
  },
  [`${R}|03`]: (p) => {
    checkSimplify(p);
    // 중2 는 음의 지수를 안 배웠다 — `m<n` 이면 분모에 남아야 한다.
    const ans = answerMath(p);
    expect(ans, "음의 지수가 지면에 나갔다").not.toMatch(/\^\s*\{?\s*-/);
    if (p.facts.m! < p.facts.n!) {
      expect(ans, "m<n 인데 분수가 아니다").toContain("\\dfrac{1}{");
    }
    if (p.facts.m === p.facts.n) expect(ans).toBe("1");
  },
  [`${R}|04`]: (p) => {
    if (p.facts.kind === 0) return checkSimplify(p);
    // Unknown exponents are independent of BOTH base-variable pairs.
    const ms = maths(p.content);
    const equation = ms.find((s) => s.includes("="));
    expect(equation).toBeDefined();
    const [lhs, rhs] = splitEq(equation!);
    const sum = Number(toInt(evalTex(answerMath(p), {}), "m+n+k"));
    const mnk = { m: fr(p.facts.m!), n: fr(p.facts.n!), k: fr(p.facts.k!) };
    expect(p.content).toContain("값에 관계없이 항상 성립");
    for (let k = 0; k < POINTS.length; k += 1) {
      const env = { ...pointFor(k, ["a", "b", "x", "y"]), ...mnk };
      expect(eqF(evalTex(lhs, env), evalTex(rhs, env)), `점 ${k}`).toBe(true);
    }
    const sumExpression = ms.find((s) => s.replace(/\s+/g, "") === "m+n+k");
    expect(sumExpression).toBeDefined();
    expect(Number(toInt(evalTex(sumExpression!, mnk), "m+n+k"))).toBe(sum);
    for (const v of [p.facts.m!, p.facts.n!, p.facts.k!]) {
      expect(Number.isInteger(v) && v > 0).toBe(true);
    }
  },
  [`${R}|05`]: (p) => {
    checkSimplify(p);
    expect(answerMath(p), "몫의 거듭제곱인데 분수가 아니다").toContain(
      "\\dfrac",
    );
  },
  [`${R}|06`]: (p) => {
    if (p.facts.kind === 0) {
      // `p^m` 을 k번 더하면 `k \times p^m` — BigInt 로 곧바로 센다.
      const expr = lastMath(p.content);
      const terms = expr.split("+");
      expect(terms.length).toBe(p.facts.times);
      const one = toInt(evalTex(terms[0]!, {}), "한 항");
      const total = BigInt(terms.length) * one;
      expect(toInt(evalTex(answerMath(p), {}), "답")).toBe(total);
      for (const t of terms) expect(t).toBe(terms[0]);
      return;
    }
    const ms = maths(p.content);
    const env = { a: fr(p.facts.a!), b: fr(p.facts.b!) };
    for (const eq of [ms[0]!, ms[1]!]) {
      const [l, r] = splitEq(eq);
      expect(eqF(evalTex(l, env), evalTex(r, env)), eq).toBe(true);
    }
    expect(toInt(evalTex(answerMath(p), {}), "ab")).toBe(
      toInt(evalTex(ms[4]!, env), "ab"),
    );
  },
  [`${R}|07`]: (p) => {
    // `a=p^{x+s}` 로 `q^{x}` 를 나타낸다 — x 를 실제로 바꿔 가며 값을 견준다.
    const ms = maths(p.content);
    const [, defRhs] = splitEq(ms[0]!);
    const target = ms[1]!;
    const ans = answerMath(p);
    for (const x of [1, 2, 3, 4]) {
      const aVal = evalTex(defRhs, { x: fr(x) });
      const want = evalTex(target, { x: fr(x) });
      const got = evalTex(ans, { a: aVal, x: fr(x) });
      expect(
        eqF(got, want),
        `x=${x}: ${ans} = ${showF(got)} ≠ ${target} = ${showF(want)}`,
      ).toBe(true);
    }
  },
  [`${R}|08`]: (p) => {
    // 「몇 자리인가」 — 식을 통째로 값 매겨 **십진 자릿수를 센다**.
    const value = toInt(evalTex(lastMath(p.content), {}), "곱");
    const digits = value.toString().length;
    expect(Number(toInt(evalTex(answerMath(p), {}), "자릿수"))).toBe(digits);
    expect(p.answer.endsWith("자리")).toBe(true);
  },
  [`${R}|09`]: (p) => {
    const ms = maths(p.content);
    if (p.facts.kind === 0) {
      const start = toInt(evalTex(ms[2]!, {}), "처음 수");
      const rate = Number(toInt(evalTex(ms[1]!, {}), "배율"));
      const hours = Number(toInt(evalTex(ms[3]!, {}), "시간"));
      const want = start * bigPow(rate, hours);
      const got = toInt(
        evalTex(ms[4]!, { a: evalTex(answerMath(p), {}) }),
        "결과",
      );
      expect(got).toBe(want);
      return;
    }
    const capacity = toInt(evalTex(ms[0]!, {}), "용량");
    const size = toInt(evalTex(ms[1]!, {}), "크기");
    const count = toInt(evalTex(answerMath(p), {}), "개수");
    expect(count * size).toBe(capacity);
    expect(p.answer.endsWith("개")).toBe(true);
  },
  [`${R}|10`]: checkSimplify,
  [`${R}|11`]: checkSimplify,
  [`${R}|12`]: checkSimplify,
  [`${R}|13`]: (p) => {
    // □ 에 답을 **끼워 넣고** 등식이 성립하는지 본다.
    const eq = maths(p.content)[1]!;
    const ans = answerMath(p);
    const [lhs, rhs] = splitEq(eq);
    expect(lhs, "□ 가 좌변에 없다").toContain("\\square");
    const filled = lhs.replace("\\square", `\\left(${ans}\\right)`);
    expectSameValue(filled, rhs, `${p.rpmTitle} □ 대입`);
    expectNoLikeTerms(ans, p.rpmTitle);
  },
  [`${R}|14`]: (p) => {
    const ms = maths(p.content);
    const ans = answerMath(p);
    if (p.content.includes("삼각형")) {
      const vars = [...new Set([...freeVars(ms[0]!), ...freeVars(ms[1]!)])];
      for (let k = 0; k < POINTS.length; k += 1) {
        const env = pointFor(k, vars);
        const want = mulF(
          fr(1, 2),
          mulF(evalTex(ms[0]!, env), evalTex(ms[1]!, env)),
        );
        expect(eqF(evalTex(ans, env), want), `삼각형 넓이 점 ${k}`).toBe(true);
      }
      return;
    }
    if (p.content.includes("각기둥")) {
      // (밑넓이) × (높이) = (부피)
      const vars = [...new Set([...freeVars(ms[0]!), ...freeVars(ms[1]!)])];
      for (let k = 0; k < POINTS.length; k += 1) {
        const env = pointFor(k, vars);
        const got = mulF(evalTex(ms[0]!, env), evalTex(ans, env));
        expect(eqF(got, evalTex(ms[1]!, env)), `기둥 부피 점 ${k}`).toBe(true);
      }
      return;
    }
    expect(p.content).toContain("구의 부피");
    const vars = [...new Set([...freeVars(ms[0]!), "pi"])];
    for (let k = 0; k < POINTS.length; k += 1) {
      const env = pointFor(k, vars);
      const r = evalTex(ms[0]!, env);
      const want = mulF(mulF(fr(4, 3), env["pi"]!), powF(r, 3));
      expect(eqF(evalTex(ans, env), want), `구의 부피 점 ${k}`).toBe(true);
    }
  },
  [`${R}|15`]: (p) => {
    const [lhs, rhs] = splitEq(maths(p.content)[0]!);
    const x = Number(toInt(evalTex(answerMath(p), {}), "x"));
    expect(x).toBeGreaterThan(0);
    expect(toInt(evalTex(lhs, { x: fr(x) }), "좌변")).toBe(
      toInt(evalTex(rhs, {}), "우변"),
    );
    // 답이 유일한가 — 한 칸 옆이면 값이 달라야 한다.
    for (const dx of [-1, 1]) {
      if (x + dx <= 0) continue;
      expect(
        toInt(evalTex(lhs, { x: fr(x + dx) }), "좌변") ===
          toInt(evalTex(rhs, {}), "우변"),
      ).toBe(false);
    }
  },
  [`${R}|16`]: (p) => {
    const value = toInt(evalTex(lastMath(p.content), {}), "곱");
    expect(Number(toInt(evalTex(answerMath(p), {}), "일의 자리"))).toBe(
      Number(value % TEN),
    );
  },

  // ── 다항식의 계산 ──────────────────────────────────
  [`${P}|01`]: checkSimplify,
  [`${P}|02`]: (p) => {
    checkSimplify(p);
    // 이차식이어야 한다 — 최고차항이 지워지면 이 유형이 아니다.
    const sigs = answerTerms(answerMath(p)).map(termSignature);
    expect(
      sigs.some((s) => /\^2$/.test(s)),
      `이차항 없음: ${p.answer}`,
    ).toBe(true);
  },
  [`${P}|03`]: checkSimplify,
  [`${P}|04`]: (p) => {
    const ms = maths(p.content);
    const [a, b] = [ms[0]!, ms[1]!];
    const ans = answerMath(p);
    const plus = p.content.includes("더했더니");
    const vars = [
      ...new Set([...freeVars(a), ...freeVars(b), ...freeVars(ans)]),
    ];
    for (let k = 0; k < POINTS.length; k += 1) {
      const env = pointFor(k, vars);
      const got = plus
        ? addF(evalTex(ans, env), evalTex(a, env))
        : subF(evalTex(ans, env), evalTex(a, env));
      expect(eqF(got, evalTex(b, env)), `어떤 식 점 ${k}`).toBe(true);
    }
    expectNoLikeTerms(ans, p.rpmTitle);
  },
  [`${P}|05`]: (p) => {
    const ms = maths(p.content);
    const [a, b] = [ms[0]!, ms[1]!];
    const ans = answerMath(p);
    // 「더해야 할 것을 뺐다」 → 어떤 식 = B+A, 바른 답 = 어떤 식 + A
    const shouldAdd = p.content.includes("더해야");
    const vars = [
      ...new Set([...freeVars(a), ...freeVars(b), ...freeVars(ans)]),
    ];
    for (let k = 0; k < POINTS.length; k += 1) {
      const env = pointFor(k, vars);
      const av = evalTex(a, env);
      const bv = evalTex(b, env);
      const some = shouldAdd ? addF(bv, av) : subF(bv, av);
      const want = shouldAdd ? addF(some, av) : subF(some, av);
      expect(eqF(evalTex(ans, env), want), `바르게 계산 점 ${k}`).toBe(true);
    }
    expectNoLikeTerms(ans, p.rpmTitle);
  },
  [`${P}|06`]: checkSimplify,
  [`${P}|07`]: checkSimplify,
  [`${P}|08`]: checkSimplify,
  [`${P}|09`]: (p) => {
    const ms = maths(p.content);
    const ans = answerMath(p);
    if (p.content.includes("직육면체")) {
      const vars = [
        ...new Set([
          ...freeVars(ms[0]!),
          ...freeVars(ms[1]!),
          ...freeVars(ms[2]!),
        ]),
      ];
      for (let k = 0; k < POINTS.length; k += 1) {
        const env = pointFor(k, vars);
        const got = mulF(
          mulF(evalTex(ms[0]!, env), evalTex(ms[1]!, env)),
          evalTex(ans, env),
        );
        expect(eqF(got, evalTex(ms[2]!, env)), `직육면체 점 ${k}`).toBe(true);
      }
      return;
    }
    expect(p.content).toContain("사다리꼴");
    const vars = [
      ...new Set([
        ...freeVars(ms[0]!),
        ...freeVars(ms[1]!),
        ...freeVars(ms[2]!),
      ]),
    ];
    for (let k = 0; k < POINTS.length; k += 1) {
      const env = pointFor(k, vars);
      const want = mulF(
        mulF(fr(1, 2), addF(evalTex(ms[0]!, env), evalTex(ms[1]!, env))),
        evalTex(ms[2]!, env),
      );
      expect(eqF(evalTex(ans, env), want), `사다리꼴 점 ${k}`).toBe(true);
    }
    expectNoLikeTerms(ans, p.rpmTitle);
  },
  [`${P}|10`]: (p) => {
    const ms = maths(p.content);
    const env: Record<string, Frac> = {};
    for (const assign of [ms[0]!, ms[1]!]) {
      const [name, value] = splitEq(assign);
      env[name.trim()] = evalTex(value, {});
    }
    const got = evalTex(ms[2]!, env);
    expect(eqF(got, evalTex(answerMath(p), {})), `식의 값: ${ms[2]}`).toBe(
      true,
    );
  },
  [`${P}|11`]: (p) => {
    const ms = maths(p.content);
    const [, defA] = splitEq(ms[0]!);
    const [, defB] = splitEq(ms[1]!);
    const combo = ms[2]!;
    const ans = answerMath(p);
    const vars = [...new Set([...freeVars(defA), ...freeVars(defB)])];
    for (let k = 0; k < POINTS.length; k += 1) {
      const env = pointFor(k, vars);
      const withAB = {
        ...env,
        A: evalTex(defA, env),
        B: evalTex(defB, env),
      };
      expect(
        eqF(evalTex(combo, withAB), evalTex(ans, env)),
        `식의 대입 점 ${k}`,
      ).toBe(true);
    }
    expectNoLikeTerms(ans, p.rpmTitle);
  },
  [`${P}|12`]: (p) => {
    const ms = maths(p.content);
    const ans = answerMath(p);
    if (p.content.includes("맨 위 칸")) {
      // 이웃한 두 칸의 합을 위 칸에 → 맨 위 = A + 2B + C
      const [a, b, c] = [ms[0]!, ms[1]!, ms[2]!];
      const vars = [
        ...new Set([...freeVars(a), ...freeVars(b), ...freeVars(c)]),
      ];
      for (let k = 0; k < POINTS.length; k += 1) {
        const env = pointFor(k, vars);
        const want = addF(
          addF(evalTex(a, env), mulF(fr(2), evalTex(b, env))),
          evalTex(c, env),
        );
        expect(eqF(evalTex(ans, env), want), `쌓기 점 ${k}`).toBe(true);
      }
      expectNoLikeTerms(ans, p.rpmTitle);
      return;
    }
    const shown = [ms[0]!, ms[1]!, ms[2]!, ms[3]!];
    expect(ms[4]).toBe("\\cdots");
    const nth = Number(toInt(evalTex(ms[5]!, {}), "번째"));
    const vars = [...new Set(shown.flatMap(freeVars))];
    for (let k = 0; k < POINTS.length; k += 1) {
      const env = pointFor(k, vars);
      const vals = shown.map((s) => evalTex(s, env));
      const d = subF(vals[1]!, vals[0]!);
      // 늘어놓은 넷이 정말 같은 차를 갖는가 (규칙이 있는가)
      expect(eqF(subF(vals[2]!, vals[1]!), d), "차가 일정하지 않다").toBe(true);
      expect(eqF(subF(vals[3]!, vals[2]!), d), "차가 일정하지 않다").toBe(true);
      const want = addF(vals[0]!, mulF(fr(nth - 1), d));
      expect(eqF(evalTex(ans, env), want), `규칙 점 ${k}`).toBe(true);
    }
    expectNoLikeTerms(ans, p.rpmTitle);
  },
  [`${P}|13`]: (p) => {
    const ms = maths(p.content);
    const [lhs, rhs] = splitEq(ms[0]!);
    const ab = { a: fr(p.facts.a!), b: fr(p.facts.b!) };
    for (let k = 0; k < 3; k += 1) {
      const env = { ...ab, ...pointFor(k, ["x"]) };
      expect(eqF(evalTex(lhs, env), evalTex(rhs, env)), `등식 점 ${k}`).toBe(
        true,
      );
    }
    expect(toInt(evalTex(ms[3]!, ab), "식의 값")).toBe(
      toInt(evalTex(answerMath(p), {}), "답"),
    );
  },
};

// ═══ 스위트 ═══════════════════════════════════════════

type CatalogType = { minor: string; number: string; title: string };

describe("중2 단항식·다항식의 계산 29유형 (4E-중2대수)", () => {
  it("29유형이 등록돼 있고 유형 번호가 계획과 같다", () => {
    expect(M2_MONO.length).toBe(29);
    const nums = (minor: string): string[] =>
      M2_MONO.filter((e) => e.rpmMinor === minor)
        .map((e) => e.rpmType)
        .sort();
    expect(nums("단항식의 계산")).toEqual(
      Array.from({ length: 16 }, (_v, i) => String(i + 1).padStart(2, "0")),
    );
    expect(nums("다항식의 계산")).toEqual(
      Array.from({ length: 13 }, (_v, i) => String(i + 1).padStart(2, "0")),
    );
  });

  it("RPM 유형 번호·제목이 색인 정본과 일치한다 (지어낸 제목 금지)", () => {
    const raw = readFileSync(
      resolve(__dirname, "../../../scripts/rpm/rpm-type-catalog.json"),
      "utf-8",
    );
    const catalog = JSON.parse(raw) as Record<string, { types: CatalogType[] }>;
    for (const e of M2_MONO) {
      const book = catalog[e.rpmBook]!.types;
      const hit = book.find(
        (t) => t.minor === e.rpmMinor && t.number === e.rpmType,
      );
      expect(hit, `색인에 없는 유형: ${e.key}`).toBeDefined();
      expect(hit!.title, e.key).toBe(e.rpmTitle);
    }
  });

  it("우리 단원 4개에 시드 이름 그대로 붙는다", () => {
    const count = new Map<string, number>();
    for (const e of M2_MONO) {
      count.set(e.unitSection, (count.get(e.unitSection) ?? 0) + 1);
    }
    // `prisma/seed-data/units.ts` 실측 리터럴 (중2 1. 수와 식)
    expect(count).toEqual(
      new Map([
        ["지수법칙", 11],
        ["단항식의 곱셈과 나눗셈", 5],
        ["다항식의 덧셈과 뺄셈", 7],
        ["다항식의 곱셈과 나눗셈", 6],
      ]),
    );
  });

  it("모든 유형이 generate 진입점에 등록돼 있다", () => {
    const keys = new Set(registeredTypes().map((e) => e.key));
    for (const e of M2_MONO) {
      expect(keys.has(e.key), e.key).toBe(true);
    }
  });

  for (const e of M2_MONO) {
    describe(`${e.rpmMinor} ${e.rpmType} ${e.rpmTitle}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        const a = generateMiddleProblem(e.key, 20260824);
        const b = generateMiddleProblem(e.key, 20260824);
        expect(a).toEqual(b);
      });

      it("독립 검산 — 씨앗 5개 + 변형 16개", () => {
        const check = CHECKS[e.key];
        expect(check, `검산식 누락: ${e.key}`).toBeDefined();
        for (const seed of SEEDS) check!(generateMiddleProblem(e.key, seed));
        // 고정 씨앗이 못 밟는 갈래(kind)를 변형이 넓게 밟는다
        for (let variant = 0; variant < 16; variant += 1) {
          check!(generateMiddleProblem(e.key, 20260824, variant));
        }
      });

      it("숫자가 KaTeX 밖에 없다 (본문·정답·해설)", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(bareNumbers(p.content)).toEqual([]);
          expect(bareNumbers(p.answer)).toEqual([]);
          expect(bareNumbers(p.solution)).toEqual([]);
        }
      });

      it("실제 렌더러가 붉은 글자·raw 폴백 없이 그린다", () => {
        // KaTeX 는 unknown command 를 에러가 아니라 #cc0000 으로 그린다
        // (CLAUDE.md 2026-08-14) — 성공 여부는 실제 렌더로만 잰다.
        for (const seed of SEEDS.slice(0, 3)) {
          const p = generateMiddleProblem(e.key, seed);
          for (const part of [p.content, p.answer, p.solution]) {
            const html = renderMathHtml(part);
            expect(/#cc0000/i.test(html), part).toBe(false);
            expect(html.includes("math-raw"), part).toBe(false);
          }
        }
      });
    });
  }

  it("한 유형에서 4문항을 뽑으면 발문이 전부 다르다", () => {
    for (const e of M2_MONO) {
      const set = generateMiddleSet(e.key, 20260824, 4);
      const contents = new Set(set.map((p: MidProblem) => p.content));
      expect(contents.size, e.key).toBe(4);
    }
  });

  /**
   * 지면 전량 발견기 — 「어디에 음의 지수가 나오는지」를 미리 정하지 않는다.
   * 유형별 검산은 자기가 아는 자리만 본다(「목록을 손으로 쓰면 세는 쪽과
   * 고치는 쪽이 같이 눈이 먼다」 CLAUDE.md 2026-08-18).
   */
  it("지면 어디에도 음의 지수가 없다 (중2 미학습)", () => {
    for (const e of M2_MONO) {
      for (let v = 0; v < 24; v += 1) {
        const p = generateMiddleProblem(e.key, 20260824, v);
        for (const part of [p.content, p.answer, p.solution]) {
          expect(part, `${e.key} 음의 지수`).not.toMatch(/\^\s*\{?\s*-/);
        }
      }
    }
  });

  it("부호가 겹쳐 찍힌 자리가 없다 (`--2(...)` 류)", () => {
    for (const e of M2_MONO) {
      for (let v = 0; v < 24; v += 1) {
        const p = generateMiddleProblem(e.key, 20260824, v);
        for (const part of [p.content, p.answer, p.solution]) {
          for (const m of maths(part)) {
            expect(m, `${e.key} 부호 겹침`).not.toMatch(/[-+]\s*[-+]/);
          }
        }
      }
    }
  });

  it("빈 분수·빈 지수가 지면에 없다", () => {
    for (const e of M2_MONO) {
      for (let v = 0; v < 24; v += 1) {
        const p = generateMiddleProblem(e.key, 20260824, v);
        for (const part of [p.content, p.answer, p.solution]) {
          expect(part, `${e.key} 빈 자리`).not.toMatch(
            /\\d?frac\s*\{\s*\}|\^\s*\{\s*\}/,
          );
        }
      }
    }
  });

  /**
   * D-73 — 제품이 가분수를 대분수로 바꾸지 않으므로, **우리가 대분수를 만들면
   * 그대로 나간다**. 지면 전량에서 「정수 바로 뒤에 분수」 꼴을 막는다.
   * (계약 §7 · `scripts/qa/census-mixed-number.ts` 와 같은 열쇠)
   */
  it("대분수를 만들지 않는다 (D-73)", () => {
    for (const e of M2_MONO) {
      for (let v = 0; v < 24; v += 1) {
        const p = generateMiddleProblem(e.key, 20260824, v);
        for (const part of [p.content, p.answer, p.solution]) {
          expect(part, `${e.key} 대분수`).not.toMatch(/\d\\d?frac\s*\{/);
        }
      }
    }
  });

  /**
   * 답이 기약인가 — 분자의 **모든** 정수 계수와 분모의 정수 계수가 서로소여야
   * 한다. 지면에서 직접 `\dfrac{...}{...}` 를 열어 훑는다(생성기의 약분을
   * 믿지 않는다). 분자가 다항식이면 항마다 계수를 세야 한다 —
   * 첫 계수만 보면 `\dfrac{2x+11y-3}{12}` 를 「약분이 남았다」로 잘못 읽는다.
   */
  it("답의 분수 계수가 기약이다", () => {
    const gcdN = (a: number, b: number): number =>
      b === 0 ? Math.abs(a) : gcdN(b, a % b);
    /** 항 앞머리의 정수 계수 — 없으면 $1$. */
    const leadCoef = (term: string): number => {
      const m = /^[-+]?(\d+)/.exec(term.trim());
      return m ? Number(m[1]) : 1;
    };
    for (const e of M2_MONO) {
      for (let v = 0; v < 24; v += 1) {
        const p = generateMiddleProblem(e.key, 20260824, v);
        for (const m of maths(p.answer)) {
          let at = m.indexOf("\\dfrac");
          while (at >= 0) {
            const o1 = m.indexOf("{", at);
            const c1 = braceClose(m, o1);
            const o2 = m.indexOf("{", c1 + 1);
            const c2 = braceClose(m, o2);
            expect(c1 > 0 && c2 > 0, `분수를 못 읽음: ${m}`).toBe(true);
            const nums = splitTerms(m.slice(o1 + 1, c1)).map(leadCoef);
            const den = leadCoef(m.slice(o2 + 1, c2));
            const g = nums.reduce((acc, n) => gcdN(acc, n), den);
            expect(g, `${e.key} 기약이 아님: ${m}`).toBe(1);
            at = m.indexOf("\\dfrac", c2);
          }
        }
      }
    }
  });

  /**
   * 나눗셈을 읽는 규칙 — **이 검사가 없으면 위 검산이 무엇을 재는지 모른다.**
   * 교과서는 `\div` 뒤에 붙여 쓴 단항식 **전체**를 제수로 읽는다. 만약 평가기가
   * `\div` 를 앞의 한 인수에만 걸면 `12a^{2}b\div 3ab` 가 $4a^{3}b^{2}$ 이 되어
   * 뜻이 완전히 달라진다 — 그러면 「같은 값」검산은 생성기가 무엇을 하든
   * 초록이 될 수 있다. 값을 **손으로 못 박아** 그 자리를 지킨다.
   */
  it("`\\div` 는 붙여 쓴 단항식 전체를 제수로 읽는다", () => {
    const env = { a: fr(2), b: fr(3), x: fr(2), y: fr(5) };
    const cases: [string, Frac][] = [
      ["12a^{2}b\\div 3ab", fr(8)], // = 4a → 8
      ["18x^{3}y^{5}\\div 4xy^{2}", fr(9 * 4 * 125, 2)], // = 9x^2y^3/2
      ["12a^{2}b\\div 3ab\\times 2b", fr(48)], // 앞에서부터 → 4a·2b = 8ab
      ["\\left(-16ab\\right)\\div 2b^{2}", fr(-16, 3)], // = -8a/b
    ];
    for (const [tex, want] of cases) {
      const got = evalTex(tex, env);
      expect(
        eqF(got, want),
        `${tex} = ${showF(got)} (기대 ${showF(want)})`,
      ).toBe(true);
    }
  });
});
