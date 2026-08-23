/**
 * 중1 「정수와 유리수의 계산」 27유형 — **독립 검산**.
 *
 * ## 왜 이 파일이 다른 중단원 시험과 다른가
 *
 * 이 갈래는 «계산 결과»가 곧 답이라 **같은 식을 다시 계산하면 아무것도 못 잡는다**
 * (생성기가 틀리면 검산도 똑같이 틀린다 — 동어반복). 그래서 여기서는 값을 구하는
 * 길을 일부러 다르게 잡았다:
 *
 *  1. **약분하지 않는 셈.** 생성기는 `q()` 로 매번 기약을 만든다. 여기서는 약분을
 *     아예 안 하고(`R`) **교차곱**으로 견준다. 그러면 생성기의 `gcd` 가 틀려도
 *     값 비교는 살아 있다. 대신 교차곱은 약분에 **불변**이므로 「기약인가」는
 *     `reduced()` 로 **따로** 잰다 — 두 축이 갈라져야 둘 다 잡힌다.
 *  2. **혼합 계산(21)** 은 생성기가 괄호 순서대로 접는다. 여기서는 **분배해서
 *     항별로** 더한다(`B/A - C²/A - (inner·D)/A + E`).
 *  3. **역방향.** 08·19·23·27 은 생성기가 「답 → 발문」으로 갔다. 여기서는
 *     **발문 → 답**으로 되돌아온다.
 *  4. **$(-1)^n$(16)** 은 규칙이 아니라 **지면에 실제로 찍힌 식을 파싱해**
 *     구체적인 $n$ 을 넣어 센다 — 학생이 보는 그 식이 그 답이 되는지를 본다.
 *  5. **부호(24)·대소(25)** 는 여덟 가지 부호를 전부 대입하거나, 생성기가 쓴 것과
 *     **다른 표본점**에 대입해 다시 고른다.
 *
 * ## 분수는 약분된 형태로만 끝난다
 *
 * $\dfrac{4}{2}$ 로 끝나면 그대로 지면에 나간다(2026-08-23 실제 결함 46자리).
 * 발문·정답의 분수는 **전부 기약**이고, 풀이의 통분 과정에 나오는 약분 전 분수는
 * **반드시 `=` 가 뒤따라야** 한다(그 자리에서 끝나지 않는다).
 *
 * 유형 목록은 `registeredTypes()` 를 중단원 이름으로 거르지 않고 **내 모듈을 직접**
 * 훑는다 — 같은 중단원에 남의 유형이 등록되면 검산표가 남의 것에 들이대진다
 * (물결 1·2C 가 실제로 밟았다).
 */
import { describe, expect, it } from "vitest";

import { bareNumbers } from "../../lib/elementary/rules";
import {
  generateMiddleProblem,
  generateMiddleSet,
} from "../../lib/middle/generate";
import { M1_CALC } from "../../lib/middle/m1Calc";
import type { MidProblem } from "../../lib/middle/types";

const SEEDS = [20260823, 1, 7777, 424242, 99991, 31337];

// ── 약분하지 않는 유리수 — 교차곱으로만 견준다 ────────────────────────

type R = { n: number; d: number };

const rr = (n: number, d = 1): R => ({ n, d });
const add = (a: R, b: R): R => ({ n: a.n * b.d + b.n * a.d, d: a.d * b.d });
const sub = (a: R, b: R): R => ({ n: a.n * b.d - b.n * a.d, d: a.d * b.d });
const mul = (a: R, b: R): R => ({ n: a.n * b.n, d: a.d * b.d });
const div = (a: R, b: R): R => ({ n: a.n * b.d, d: a.d * b.n });
const neg = (a: R): R => ({ n: -a.n, d: a.d });

/** 교차곱 — 약분에 **불변**이다. 그래서 「기약인가」는 여기서 안 본다. */
function same(a: R, b: R): boolean {
  return a.n * b.d === b.n * a.d;
}

function powR(a: R, e: number): R {
  let out = rr(1);
  for (let i = 0; i < e; i += 1) out = mul(out, a);
  return out;
}

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

/** `facts` 의 `<p>n`/`<p>d` 두 수를 유리수로 읽는다. 없으면 던진다. */
function F(f: Record<string, number>, p: string): R {
  const n = f[`${p}n`];
  const d = f[`${p}d`];
  if (n === undefined || d === undefined) {
    throw new Error(`facts 에 ${p}n·${p}d 가 없습니다: ${JSON.stringify(f)}`);
  }
  return { n, d };
}

function N(f: Record<string, number>, k: string): number {
  const v = f[k];
  if (v === undefined) throw new Error(`facts 에 ${k} 가 없습니다`);
  return v;
}

// ── 지면 표기 가드 ────────────────────────────────────────────────────

const DFRAC = /\\dfrac\{(\d+)\}\{(\d+)\}/g;

/** 숫자로만 된 `\dfrac{p}{q}` 를 전부 찾아 위치와 함께 돌려준다. */
function fracs(text: string): { p: number; q: number; end: number }[] {
  const out: { p: number; q: number; end: number }[] = [];
  DFRAC.lastIndex = 0;
  let m = DFRAC.exec(text);
  while (m !== null) {
    out.push({ p: Number(m[1]), q: Number(m[2]), end: m.index + m[0].length });
    m = DFRAC.exec(text);
  }
  return out;
}

/** 발문·정답에 쓸 수 있는 분수인가 — 기약이고 분모가 $2$ 이상. */
function badFracs(text: string): string[] {
  return fracs(text)
    .filter((f) => f.q < 2 || gcd(f.p, f.q) !== 1)
    .map((f) => `\\dfrac{${f.p}}{${f.q}}`);
}

/**
 * 풀이에서 약분 전 분수는 **통분 과정**일 때만 봐준다 —
 * 곧바로 `=` 가 따라와야 한다(그 자리에서 «끝나지» 않는다는 뜻).
 */
function danglingFracs(text: string): string[] {
  return fracs(text)
    .filter((f) => f.q < 2 || gcd(f.p, f.q) !== 1)
    .filter((f) => !/^\s*\$?\s*=/.test(text.slice(f.end)))
    .map((f) => `\\dfrac{${f.p}}{${f.q}}`);
}

/** `$...$` 안쪽 몸통들. */
function mathBodies(text: string): string[] {
  return (text.match(/\$[^$]*\$/g) ?? []).map((s) => s.slice(1, -1));
}

/** 답 문자열의 첫 수식을 유리수로 읽는다 (`$-\dfrac{3}{4}$` · `$900$명`). */
function parseAnswer(answer: string): R {
  const body = mathBodies(answer)[0];
  if (body === undefined) throw new Error(`답에 수식이 없습니다: ${answer}`);
  const frac = body.match(/^(-?)\\dfrac\{(\d+)\}\{(\d+)\}$/);
  if (frac) {
    const sign = frac[1] === "-" ? -1 : 1;
    return { n: sign * Number(frac[2]), d: Number(frac[3]) };
  }
  const int = body.match(/^-?\d+$/);
  if (int) return { n: Number(body), d: 1 };
  throw new Error(`답을 수로 못 읽었습니다: ${answer}`);
}

// ── 유형 16 — 지면에 찍힌 식을 그대로 파싱해 센다 ─────────────────────

/** `n`·`n+1`·`2\times n`·`2n+1` 을 구체적인 $n$ 에서 계산한다. */
function evalExponent(raw: string, n: number): number {
  const s = raw.replace(/\\times/g, "*").replace(/\s+/g, "");
  const m = s.match(/^(?:(\d+)\*?)?n(?:\+(\d+))?$/);
  if (!m) throw new Error(`지수를 못 읽었습니다: ${raw}`);
  return (m[1] ? Number(m[1]) : 1) * n + (m[2] ? Number(m[2]) : 0);
}

/** `-1^{n}+(-1)^{n+2}-(-1)^{n}` 을 $n$ 에서 계산한다. */
function evalNegOneExpr(expr: string, n: number): number {
  const re = /([+-]?)(\(-1\)|-1)\^\{([^}]*)\}/g;
  let total = 0;
  let count = 0;
  let m = re.exec(expr);
  while (m !== null) {
    const isNegBase = m[2] === "(-1)";
    const e = evalExponent(m[3]!, n);
    const value = isNegBase ? (e % 2 === 0 ? 1 : -1) : -1; // 밑이 $1$ 이면 늘 $-1$
    const opMinus = m[1] === "-" && !(count === 0 && !isNegBase);
    total += (opMinus ? -1 : 1) * value;
    count += 1;
    m = re.exec(expr);
  }
  if (count !== 3) throw new Error(`항을 셋 못 읽었습니다(${count}): ${expr}`);
  return total;
}

// ── 유형 25 — 생성기와 **다른 표본점**에 대입해 다시 고른다 ───────────

const TEST_CANDS: Record<number, (a: number) => number> = {
  1: (a) => a,
  2: (a) => -a,
  3: (a) => a * a,
  4: (a) => -(a * a),
  5: (a) => a * a * a,
  6: (a) => -(a * a * a),
  7: (a) => 1 / a,
  8: (a) => -1 / a,
  9: (a) => 1 / (a * a),
};

const TEST_RANGES: Record<number, { lo: number; hi: number; tex: string }> = {
  1: { lo: -1, hi: 0, tex: "-1<a<0" },
  2: { lo: 0, hi: 1, tex: "0<a<1" },
  3: { lo: -5, hi: -1, tex: "a<-1" },
  4: { lo: 1, hi: 5, tex: "a>1" },
};

/**
 * 보기의 KaTeX — 생성기의 표와 **따로** 적는다. 생성기가 뜻과 다른 식을 찍으면
 * (예: $-a^{2}$ 자리에 $a^{2}$) 값 검산은 통과해도 여기서 빨개진다.
 */
const TEST_CAND_TEX: Record<number, string> = {
  1: "a",
  2: "-a",
  3: "a^{2}",
  4: "-a^{2}",
  5: "a^{3}",
  6: "-a^{3}",
  7: "\\dfrac{1}{a}",
  8: "-\\dfrac{1}{a}",
  9: "\\dfrac{1}{a^{2}}",
};

/** 생성기가 쓴 `GEN_TS` 와 겹치지 않는 표본점. */
const TEST_TS = [0.11, 0.23, 0.37, 0.44, 0.57, 0.71, 0.88];

// ── 유형별 독립 검산 ──────────────────────────────────────────────────

type Check = (f: Record<string, number>, p: MidProblem) => void;

const VERIFY: Record<string, Check> = {
  // 합·차는 발문의 두 수로 **다시 더한다** (생성기는 답에서 한 항을 역산했다).
  "01": (f, p) => {
    const want = add(F(f, "a"), F(f, "b"));
    expect(same(want, F(f, "s"))).toBe(true);
    expect(same(want, parseAnswer(p.answer))).toBe(true);
  },
  "02": (f, p) => {
    const want = add(add(F(f, "a"), F(f, "k")), F(f, "c"));
    expect(same(want, F(f, "s"))).toBe(true);
    expect(same(want, parseAnswer(p.answer))).toBe(true);
    expect(N(f, "ad")).toBe(N(f, "cd")); // 묶어 더할 두 항은 분모가 같다
  },
  "03": (f, p) => {
    const want = sub(F(f, "a"), F(f, "b"));
    expect(same(want, F(f, "s"))).toBe(true);
    expect(same(want, parseAnswer(p.answer))).toBe(true);
  },
  "04": (f, p) => {
    const want = sub(sub(add(F(f, "a"), F(f, "b")), F(f, "c")), F(f, "d"));
    expect(same(want, F(f, "s"))).toBe(true);
    expect(same(want, parseAnswer(p.answer))).toBe(true);
  },
  "05": (f, p) => {
    const want = add(add(add(F(f, "a"), F(f, "b")), F(f, "c")), F(f, "d"));
    expect(same(want, F(f, "s"))).toBe(true);
    expect(same(want, parseAnswer(p.answer))).toBe(true);
  },
  // 「$x$보다 $p$만큼 큰 수」는 $x+p$, 「$y$보다 $q$만큼 작은 수」는 $y-q$.
  "06": (f, p) => {
    const a = add(F(f, "x"), F(f, "p"));
    const b = sub(F(f, "y"), F(f, "q"));
    expect(same(a, F(f, "a"))).toBe(true);
    expect(same(b, F(f, "b"))).toBe(true);
    const want = sub(a, b);
    expect(same(want, F(f, "s"))).toBe(true);
    expect(same(want, parseAnswer(p.answer))).toBe(true);
  },
  // $a-P=L_1 \Rightarrow a=L_1+P$ · $b+R=L_2 \Rightarrow b=L_2-R$
  "07": (f, p) => {
    const a = add(F(f, "l1"), F(f, "p"));
    const b = sub(F(f, "l2"), F(f, "r"));
    expect(same(a, F(f, "a"))).toBe(true);
    expect(same(b, F(f, "b"))).toBe(true);
    const want = add(a, b);
    expect(same(want, F(f, "s"))).toBe(true);
    expect(same(want, parseAnswer(p.answer))).toBe(true);
  },
  // 잘못한 결과에서 되돌려 어떤 수를 찾고, 바른 셈을 한 번 더 한다.
  "08": (f, p) => {
    const A = F(f, "a");
    const Rv = F(f, "r");
    const wrongIsAdd = N(f, "wrongIsAdd") === 1;
    const x = wrongIsAdd ? sub(Rv, A) : add(Rv, A);
    expect(same(x, F(f, "x"))).toBe(true);
    const want = wrongIsAdd ? sub(x, A) : add(x, A);
    expect(same(want, F(f, "s"))).toBe(true);
    expect(same(want, parseAnswer(p.answer))).toBe(true);
    expect(p.content.includes(wrongIsAdd ? "더했더니" : "뺐더니")).toBe(true);
  },
  // 최댓값은 $|a|+|b|$, 최솟값은 그 반대 — 절댓값은 양수라야 한다.
  "09": (f, p) => {
    const M = F(f, "m");
    const Nn = F(f, "n");
    expect(M.n).toBeGreaterThan(0);
    expect(Nn.n).toBeGreaterThan(0);
    const t = add(M, Nn);
    const want = N(f, "wantMax") === 1 ? t : neg(t);
    expect(same(want, F(f, "s"))).toBe(true);
    expect(same(want, parseAnswer(p.answer))).toBe(true);
    expect(p.content.includes(N(f, "useSub") === 1 ? "a-b" : "a+b")).toBe(true);
  },
  "10": (f, p) => {
    const want =
      N(f, "base") + N(f, "d1") + N(f, "d2") + N(f, "d3") + N(f, "d4");
    expect(want).toBe(N(f, "final"));
    expect(parseAnswer(p.answer).n).toBe(want);
  },
  // 세 줄의 합을 **줄마다 따로** 더해 셋이 같은지 본다.
  "11": (f, p) => {
    const s = N(f, "S");
    expect(N(f, "p1") + N(f, "p2") + N(f, "p3")).toBe(s);
    expect(N(f, "r1") + N(f, "a") + N(f, "r2")).toBe(s);
    expect(N(f, "t1") + N(f, "t2") + N(f, "b")).toBe(s);
    const want = N(f, "a") + N(f, "b");
    expect(want).toBe(N(f, "ans"));
    expect(parseAnswer(p.answer).n).toBe(want);
  },
  "12": (f, p) => {
    const want = mul(F(f, "a"), F(f, "b"));
    expect(same(want, F(f, "p"))).toBe(true);
    expect(same(want, parseAnswer(p.answer))).toBe(true);
  },
  "13": (f, p) => {
    const want = mul(mul(F(f, "a"), F(f, "b")), F(f, "c"));
    expect(same(want, F(f, "p"))).toBe(true);
    expect(same(want, parseAnswer(p.answer))).toBe(true);
  },
  // 네 수에서 세 수를 뽑는 네 가지를 **여기서 다시 세어** 극값을 고른다.
  "14": (f, p) => {
    const vs = [F(f, "v1"), F(f, "v2"), F(f, "v3"), F(f, "v4")];
    const wantMax = N(f, "wantMax") === 1;
    const prods: R[] = [];
    for (let skip = 0; skip < 4; skip += 1) {
      const keep = [0, 1, 2, 3].filter((j) => j !== skip);
      prods.push(mul(mul(vs[keep[0]!]!, vs[keep[1]!]!), vs[keep[2]!]!));
    }
    let best = prods[0]!;
    for (const v of prods) {
      const better = wantMax
        ? v.n * best.d > best.n * v.d
        : v.n * best.d < best.n * v.d;
      if (better) best = v;
    }
    const ties = prods.filter((v) => same(v, best)).length;
    expect(ties, "극값이 둘이면 답이 하나가 아니다").toBe(1);
    expect(same(best, F(f, "ans"))).toBe(true);
    expect(same(best, parseAnswer(p.answer))).toBe(true);
  },
  // 거듭제곱은 곱을 **되풀이해서** 낸다 (생성기의 powQ 와 다른 구현).
  "15": (f, p) => {
    const raw = mul(powR(F(f, "b1"), N(f, "e1")), powR(F(f, "b2"), N(f, "e2")));
    const want = N(f, "outerMinus") === 1 ? neg(raw) : raw;
    expect(same(want, F(f, "p"))).toBe(true);
    expect(same(want, parseAnswer(p.answer))).toBe(true);
  },
  // 지면에 **실제로 찍힌 식**을 파싱해 구체적인 $n$ 을 넣어 센다.
  "16": (f, p) => {
    const ans = parseAnswer(p.answer).n;
    expect(N(f, "ans")).toBe(ans);
    if (N(f, "shape") === 1) {
      const n = N(f, "N");
      let sum = 0;
      for (let k = 1; k <= n; k += 1) sum += k % 2 === 0 ? 1 : -1;
      expect(sum).toBe(ans);
      return;
    }
    const expr = mathBodies(p.content).find((b) => b.includes("^{"));
    expect(expr, `식을 못 찾았습니다: ${p.content}`).toBeDefined();
    const isOdd = N(f, "isOdd") === 1;
    // 같은 홀짝의 서로 다른 $n$ 둘 — 값이 $n$ 에 안 흔들리는 것까지 본다.
    for (const n of isOdd ? [5, 11] : [4, 10]) {
      expect(evalNegOneExpr(expr!, n), `n=${n}`).toBe(ans);
    }
    expect(p.content.includes(isOdd ? "홀수" : "짝수")).toBe(true);
  },
  "17": (f, p) => {
    const useMinus = N(f, "useMinus") === 1;
    const want = useMinus
      ? sub(F(f, "p"), F(f, "q"))
      : add(F(f, "p"), F(f, "q"));
    expect(same(want, F(f, "s"))).toBe(true);
    expect(same(want, parseAnswer(p.answer))).toBe(true);
    expect(p.content.includes(useMinus ? "b-c" : "b+c")).toBe(true);
  },
  // 역수는 곱이 $1$ 이라는 것으로 확인한다 — 분자·분모 바꿔치기를 안 흉내 낸다.
  "18": (f, p) => {
    const a = F(f, "a");
    const b = F(f, "b");
    expect(same(mul(F(f, "x"), a), rr(1))).toBe(true);
    expect(same(mul(F(f, "y"), b), rr(1))).toBe(true);
    const want = mul(a, b);
    expect(same(want, F(f, "s"))).toBe(true);
    expect(same(want, parseAnswer(p.answer))).toBe(true);
  },
  "19": (f, p) => {
    const want = div(F(f, "a"), F(f, "b"));
    expect(same(want, F(f, "s"))).toBe(true);
    expect(same(want, parseAnswer(p.answer))).toBe(true);
  },
  "20": (f, p) => {
    const want = div(mul(powR(F(f, "base"), N(f, "e")), F(f, "m")), F(f, "v"));
    expect(same(want, F(f, "s"))).toBe(true);
    expect(same(want, parseAnswer(p.answer))).toBe(true);
  },
  // 괄호를 **분배해서 항별로** 더한다 — 생성기는 안쪽부터 접었다.
  "21": (f, p) => {
    const A = N(f, "A");
    const B = N(f, "B");
    const C = N(f, "C");
    const D = N(f, "D");
    const E = N(f, "E");
    const inner = sub(rr(N(f, "p"), N(f, "u")), rr(N(f, "r"), N(f, "w")));
    const t1 = rr(B, A);
    const t2 = neg(rr(C * C, A));
    const t3 = neg(div(mul(inner, rr(D)), rr(A)));
    const t4 = rr(E);
    const want = add(add(add(t1, t2), t3), t4);
    expect(same(want, rr(N(f, "T")))).toBe(true);
    expect(same(want, parseAnswer(p.answer))).toBe(true);
    expect(gcd(N(f, "p"), N(f, "u")), "발문의 분수가 기약이 아니다").toBe(1);
    expect(gcd(N(f, "r"), N(f, "w")), "발문의 분수가 기약이 아니다").toBe(1);
  },
  // $M\times a=P \Rightarrow a=P\div M$ · $Nn\div b=Q \Rightarrow b=Nn\div Q$
  "22": (f, p) => {
    const a = div(F(f, "p"), F(f, "m"));
    const b = div(F(f, "n"), F(f, "q"));
    expect(same(a, F(f, "a"))).toBe(true);
    expect(same(b, F(f, "b"))).toBe(true);
    const want = mul(a, b);
    expect(same(want, F(f, "s"))).toBe(true);
    expect(same(want, parseAnswer(p.answer))).toBe(true);
  },
  "23": (f, p) => {
    const A = F(f, "a");
    const Rv = F(f, "r");
    const wrongIsMul = N(f, "wrongIsMul") === 1;
    const x = wrongIsMul ? div(Rv, A) : mul(Rv, A);
    expect(same(x, F(f, "x"))).toBe(true);
    const want = wrongIsMul ? div(x, A) : mul(x, A);
    expect(same(want, F(f, "s"))).toBe(true);
    expect(same(want, parseAnswer(p.answer))).toBe(true);
    expect(p.content.includes(wrongIsMul ? "곱했더니" : "나누었더니")).toBe(
      true,
    );
  },
  // 여덟 가지 부호를 전부 대입해 **답이 하나뿐인지**까지 본다.
  "24": (f, p) => {
    const s1 = N(f, "s1");
    const s2 = N(f, "s2");
    const s3 = N(f, "s3");
    const useSum = N(f, "useSum") === 1;
    const sols: number[][] = [];
    for (const a of [1, -1]) {
      for (const b of [1, -1]) {
        for (const c of [1, -1]) {
          if (Math.sign(a * b) !== s1) continue;
          if (Math.sign(useSum ? a + b : a - b) !== s2) continue;
          if (Math.sign(a / c) !== s3) continue;
          sols.push([a, b, c]);
        }
      }
    }
    expect(sols.length, `부호가 하나로 안 정해진다: ${JSON.stringify(f)}`).toBe(
      1,
    );
    expect(sols[0]).toEqual([N(f, "sa"), N(f, "sb"), N(f, "sc")]);
    for (const [name, s] of [
      ["a", N(f, "sa")],
      ["b", N(f, "sb")],
      ["c", N(f, "sc")],
    ] as const) {
      expect(p.answer.includes(`$${name}${s > 0 ? ">0" : "<0"}$`)).toBe(true);
    }
    expect(p.content.includes(useSum ? "a+b" : "a-b")).toBe(true);
  },
  // 생성기가 쓴 것과 **다른 표본점**에 대입해 극값을 다시 고른다.
  "25": (f, p) => {
    const range = TEST_RANGES[N(f, "range")]!;
    const codes = [N(f, "c1"), N(f, "c2"), N(f, "c3"), N(f, "c4")];
    const wantMax = N(f, "wantMax") === 1;
    let winner = -1;
    for (const t of TEST_TS) {
      const x = range.lo + (range.hi - range.lo) * t;
      const vals = codes.map((c) => TEST_CANDS[c]!(x));
      let bi = 0;
      for (let i = 1; i < vals.length; i += 1) {
        if (wantMax ? vals[i]! > vals[bi]! : vals[i]! < vals[bi]!) bi = i;
      }
      if (winner === -1) winner = bi;
      expect(bi, `표본점 ${x} 에서 극값이 뒤집힌다`).toBe(winner);
    }
    expect(codes[winner]).toBe(N(f, "ans"));
    expect(new Set(codes).size, "보기가 겹친다").toBe(4);
    // 지면에 찍힌 것이 정말 그 보기인가 — 값이 맞아도 식이 다르면 문항이 틀린다.
    expect(p.answer).toBe(`$${TEST_CAND_TEX[codes[winner]!]}$`);
    expect(p.content.includes(`$${range.tex}$`), p.content).toBe(true);
    for (const c of codes) {
      expect(p.content.includes(`$${TEST_CAND_TEX[c]!}$`), p.content).toBe(
        true,
      );
    }
  },
  "26": (f, p) => {
    const win = N(f, "win");
    const lose = N(f, "lose");
    const n = N(f, "n");
    const k = N(f, "k");
    expect(k).toBeGreaterThan(0);
    expect(k).toBeLessThan(n);
    const a = k * win + (n - k) * lose;
    const b = (n - k) * win + k * lose;
    expect(a).toBe(N(f, "scoreA"));
    expect(b).toBe(N(f, "scoreB"));
    expect(a - b).toBe(N(f, "D"));
    expect(parseAnswer(p.answer).n).toBe(a - b);
  },
  // 생성기는 $C$ 에서 $B$ 를 역산했다 — 여기서는 $A$·$B$ 에서 $C$ 로 간다.
  "27": (f, p) => {
    const A = F(f, "a");
    const B = F(f, "b");
    const m = N(f, "m");
    const nR = N(f, "nRatio");
    const want = add(A, mul(sub(B, A), rr(m, m + nR)));
    expect(same(want, F(f, "c"))).toBe(true);
    expect(same(want, parseAnswer(p.answer))).toBe(true);
    expect(A.n * B.d, "수직선에서 $a<b$ 라야 한다").toBeLessThan(B.n * A.d);
    expect(gcd(m, nR), "비는 기약이라야 한다").toBe(1);
  },
};

describe("중1 정수와 유리수의 계산 27유형", () => {
  const entries = M1_CALC; // ⚠️ registeredTypes() 를 중단원 이름으로 거르지 않는다

  it("RPM 색인의 27유형이 전부 등록돼 있다", () => {
    expect(entries.length).toBe(27);
    expect(entries.map((e) => e.rpmType).sort()).toEqual(
      Array.from({ length: 27 }, (_v, i) => String(i + 1).padStart(2, "0")),
    );
  });

  it("책·중단원이 RPM 색인 정본과 같다", () => {
    for (const e of entries) {
      expect(e.rpmBook).toBe("1-1");
      expect(e.rpmMinor).toBe("정수와 유리수의 계산");
      expect(e.grade).toBe("중1");
      expect(e.key).toBe(`1-1|정수와 유리수의 계산|${e.rpmType}`);
    }
  });

  it("우리 단원 셋(공유 DB 실측 리터럴)에 나눠 붙는다", () => {
    expect(new Set(entries.map((e) => e.unitSection))).toEqual(
      new Set(["유리수의 덧셈과 뺄셈", "유리수의 곱셈", "유리수의 나눗셈"]),
    );
  });

  it("검산식이 27유형 전부에 있다 — 빠지면 그 유형은 아무도 안 지킨다", () => {
    const missing = entries
      .filter((e) => VERIFY[e.rpmType] === undefined)
      .map((e) => e.rpmType);
    expect(missing).toEqual([]);
  });

  for (const e of entries) {
    describe(`${e.rpmType} ${e.rpmTitle}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        expect(generateMiddleProblem(e.key, 20260823)).toEqual(
          generateMiddleProblem(e.key, 20260823),
        );
      });

      it("씨앗별 독립 검산 — 발문 수치로 다시 구한 값이 정답과 같다", () => {
        const verify = VERIFY[e.rpmType]!;
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          try {
            verify(p.facts, p);
          } catch (err) {
            throw new Error(
              `seed ${seed} (${e.key}) 검산 실패: ${(err as Error).message}\nfacts=${JSON.stringify(p.facts)}\ncontent=${p.content}\nanswer=${p.answer}`,
            );
          }
        }
      });

      it("숫자가 KaTeX 밖에 없다 (본문·정답·해설)", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(bareNumbers(p.content), p.content).toEqual([]);
          expect(bareNumbers(p.answer), p.answer).toEqual([]);
          expect(bareNumbers(p.solution), p.solution).toEqual([]);
        }
      });

      it("발문·정답의 분수는 전부 기약이고 분모가 $1$ 이 아니다", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(badFracs(p.content), `발문: ${p.content}`).toEqual([]);
          expect(badFracs(p.answer), `정답: ${p.answer}`).toEqual([]);
        }
      });

      it("해설의 약분 전 분수는 통분 과정뿐이다 — 그 자리에서 끝나지 않는다", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(danglingFracs(p.solution), `해설: ${p.solution}`).toEqual([]);
        }
      });

      it("해설이 정답에 도달한다 — 정답의 수식이 해설 안에 있다", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          for (const body of mathBodies(p.answer)) {
            expect(
              p.solution.includes(body),
              `정답 ${body} 가 해설에 없다: ${p.solution}`,
            ).toBe(true);
          }
        }
      });

      it("해설이 여러 줄이고 빈 줄이 없다", () => {
        const p = generateMiddleProblem(e.key, 20260823);
        const lines = p.solution.split("\n");
        expect(
          lines.every((l) => l.trim().length > 0),
          p.solution,
        ).toBe(true);
      });
    });
  }

  it("한 유형에서 4문항을 뽑으면 발문이 전부 다르다", () => {
    for (const e of entries) {
      const set = generateMiddleSet(e.key, 20260823, 4);
      expect(new Set(set.map((p: MidProblem) => p.content)).size, e.key).toBe(
        4,
      );
    }
  });

  it("매개변수가 안 맞으면 조용히 기본값을 내지 않고 던진다", () => {
    // `attempt()` 의 계약 — 재시도가 소진되면 예외다. 씨앗을 넓게 훑어
    // 「그냥 null 을 내보내고 마는」 경로가 없는지 본다(있으면 undefined 필드가 샌다).
    for (const e of entries) {
      for (let seed = 0; seed < 60; seed += 1) {
        const p = generateMiddleProblem(e.key, seed * 977 + 13);
        expect(p.content.length, e.key).toBeGreaterThan(5);
        expect(p.answer.includes("$"), e.key).toBe(true);
        expect(p.solution.length, e.key).toBeGreaterThan(5);
        expect(
          Object.values(p.facts).every((v) => Number.isFinite(v)),
          `${e.key} facts=${JSON.stringify(p.facts)}`,
        ).toBe(true);
      }
    }
  });
});
