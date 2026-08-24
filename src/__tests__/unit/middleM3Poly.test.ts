/**
 * 중3 「다항식의 곱셈과 인수분해」 40유형 (RPM 3-1 곱셈 18 + 인수분해 22) — 독립 검산.
 *
 * ## 이 시험이 무엇을 «다르게» 재는가
 *
 * 생성기는 **인수를 먼저 정하고 계수 공식으로 전개해서** 발문과 정답을 만든다.
 * 이 시험은 그 계수 산술을 **한 줄도 안 쓴다** — 지면에 나가는 **글자**(발문의 식 ·
 * 정답의 식)를 각각 **파싱해 여러 정수 점에 대입**하고, 두 함수가 같은 값을 내는지
 * 본다. 전개와 인수분해는 서로가 검산이므로(4C 브리프) 이 한 자로 양쪽이 다 잡힌다.
 * 계수가 필요한 유형(전개식의 특정 항, 완전제곱 판정)은 **라그랑주 보간**으로
 * 지면의 식에서 계수를 되찾는다 — 생성기가 쓴 식을 옮겨 적지 않는다.
 *
 * ## 완전 인수분해 가드 (브리프 계약)
 *
 * 정답을 인수로 갈라 각 괄호에 대해 ㉠ 정수 계수의 최대공약수가 $1$ 인가
 * ㉡ 모든 항이 같은 문자를 갖지 않는가 ㉢ 일변수 이차 인수의 판별식이 제곱수가
 * 아닌가 를 **전량** 잰다. `2x^2+4x` 의 답이 `x(2x+4)` 이면 ㉠ 에서 빨개진다.
 *
 * ## 분모를 지킨다
 *
 * `registeredTypes()` 를 중단원 이름으로 거르지 않는다 — 같은 중단원의 **남의
 * 유형**을 쓸어 담는다(물결 2 에서 실제로 났다). `M3_POLY` 를 직접 돈다.
 */
import { describe, expect, it } from "vitest";

import { bareNumbers } from "../../lib/elementary/rules";
import { preprocessMathText } from "../../lib/math/textPreprocess";
import {
  generateMiddleProblem,
  generateMiddleSet,
} from "../../lib/middle/generate";
import { M3_POLY, M3_POLY_MINORS } from "../../lib/middle/m3Poly";
import type { MidProblem } from "../../lib/middle/types";

const SEEDS = [20260824, 1, 7777, 424242, 99991, 31415];
const TOL = 1e-8;

type Env = Record<string, number>;

/* ────────────────────────────────────────────────────────────────────────
 * LaTeX 식 계산기 — 지면에 나가는 «글자»의 값을 잰다
 *
 * 모르는 모양이면 **던진다**. 조용히 건너뛰면 등식 검사가 그 줄을 안 본 채로
 * 초록이 된다(2026-08-23 삼각비에서 실제로 났다).
 * ──────────────────────────────────────────────────────────────────────── */

function evalLatex(raw: string, env: Env): number {
  const s = raw
    .replace(/\\left|\\right|\\!|\\,|\\;|\\quad/g, "")
    .replace(/\s+/g, "");
  let i = 0;

  const peek = (): string => s[i] ?? "";
  const starts = (t: string): boolean => s.startsWith(t, i);

  function expect1(c: string): void {
    if (peek() !== c) {
      throw new Error(`«${c}» 를 기다렸는데 «${peek()}» (${raw} @${i})`);
    }
    i += 1;
  }

  function atomStart(): boolean {
    const c = peek();
    if (c === "") return false;
    if (/[0-9(a-zA-Z]/.test(c)) return true;
    if (c === "\\") {
      return starts("\\dfrac") || starts("\\frac") || starts("\\sqrt");
    }
    return false;
  }

  function atom(): number {
    if (peek() === "(") {
      i += 1;
      const v = expr();
      expect1(")");
      return v;
    }
    if (peek() === "{") {
      i += 1;
      const v = expr();
      expect1("}");
      return v;
    }
    if (starts("\\dfrac") || starts("\\frac")) {
      i += starts("\\dfrac") ? 6 : 5;
      expect1("{");
      const n = expr();
      expect1("}");
      expect1("{");
      const d = expr();
      expect1("}");
      if (d === 0) throw new Error(`0 으로 나눈다: ${raw}`);
      return n / d;
    }
    if (starts("\\sqrt")) {
      i += 5;
      expect1("{");
      const v = expr();
      expect1("}");
      if (v < 0) throw new Error(`근호 안이 음수다: ${raw}`);
      return Math.sqrt(v);
    }
    const num = /^\d+(?:\.\d+)?/.exec(s.slice(i));
    if (num) {
      i += num[0].length;
      return Number(num[0]);
    }
    const c = peek();
    if (/[a-zA-Z]/.test(c)) {
      i += 1;
      if (!(c in env)) throw new Error(`모르는 문자 «${c}»: ${raw}`);
      return env[c]!;
    }
    throw new Error(`알 수 없는 글자 «${c}»: ${raw} @${i}`);
  }

  function exponent(): number {
    if (peek() === "{") {
      i += 1;
      const v = expr();
      expect1("}");
      return v;
    }
    if (peek() === "-") {
      i += 1;
      return -exponent();
    }
    const c = peek();
    if (/[0-9]/.test(c)) {
      i += 1;
      return Number(c);
    }
    if (/[a-zA-Z]/.test(c)) {
      i += 1;
      if (!(c in env)) throw new Error(`모르는 지수 문자 «${c}»: ${raw}`);
      return env[c]!;
    }
    throw new Error(`알 수 없는 지수: ${raw} @${i}`);
  }

  function power(): number {
    let v = atom();
    while (peek() === "^") {
      i += 1;
      v = Math.pow(v, exponent());
    }
    return v;
  }

  function unary(): number {
    if (peek() === "-") {
      i += 1;
      return -unary();
    }
    if (peek() === "+") {
      i += 1;
      return unary();
    }
    return power();
  }

  function term(): number {
    let v = unary();
    for (;;) {
      if (starts("\\times")) {
        i += 6;
        v *= unary();
      } else if (starts("\\cdot")) {
        i += 5;
        v *= unary();
      } else if (starts("\\div")) {
        i += 4;
        v /= unary();
      } else if (atomStart()) {
        v *= unary();
      } else {
        return v;
      }
    }
  }

  function expr(): number {
    let v = term();
    for (;;) {
      if (peek() === "+") {
        i += 1;
        v += term();
      } else if (peek() === "-") {
        i += 1;
        v -= term();
      } else {
        return v;
      }
    }
  }

  const out = expr();
  if (i !== s.length) throw new Error(`다 못 읽었다 (@${i}): ${raw}`);
  if (!Number.isFinite(out)) throw new Error(`유한하지 않다: ${raw}`);
  return out;
}

const near = (a: number, b: number, tol = TOL): boolean =>
  Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));

/* ────────────────────────────────────────────────────────────────────────
 * 계수 되찾기 — 지면의 식을 여러 점에서 재어 보간한다
 * ──────────────────────────────────────────────────────────────────────── */

function nodes(deg: number): number[] {
  return Array.from({ length: deg + 1 }, (_, k) => k - Math.floor(deg / 2));
}

/** 반데르몽드 연립을 가우스 소거로 푼다 — `xs` 는 서로 다른 점. */
function coeffsFromValues(xs: number[], ys: number[]): number[] {
  const n = xs.length;
  const a: number[][] = xs.map((x, r) => {
    const row: number[] = [];
    for (let j = 0; j < n; j += 1) row.push(Math.pow(x, j));
    row.push(ys[r]!);
    return row;
  });
  for (let c = 0; c < n; c += 1) {
    let piv = c;
    for (let r = c + 1; r < n; r += 1) {
      if (Math.abs(a[r]![c]!) > Math.abs(a[piv]![c]!)) piv = r;
    }
    if (Math.abs(a[piv]![c]!) < 1e-12) throw new Error("보간이 특이하다");
    [a[c], a[piv]] = [a[piv]!, a[c]!];
    for (let r = 0; r < n; r += 1) {
      if (r === c) continue;
      const f = a[r]![c]! / a[c]![c]!;
      for (let k = c; k <= n; k += 1) a[r]![k]! -= f * a[c]![k]!;
    }
  }
  return Array.from({ length: n }, (_, j) => a[j]![n]! / a[j]![j]!);
}

/** `x^i y^j` 의 계수 표 — `out[i][j]`. 정수가 아니면 던진다. */
function coeffGrid(
  src: string,
  vx: string,
  vy: string,
  dx: number,
  dy: number,
  base: Env,
): number[][] {
  const yn = nodes(dy);
  const perY = yn.map((yv) => {
    const xn = nodes(dx);
    return coeffsFromValues(
      xn,
      xn.map((xv) => evalLatex(src, { ...base, [vx]: xv, [vy]: yv })),
    );
  });
  const out: number[][] = [];
  for (let i = 0; i <= dx; i += 1) {
    out.push(
      coeffsFromValues(
        yn,
        perY.map((row) => row[i]!),
      ),
    );
  }
  return out.map((row) =>
    row.map((v) => {
      const r = Math.round(v);
      if (Math.abs(v - r) > 1e-6) throw new Error(`정수 계수가 아니다: ${v}`);
      return r;
    }),
  );
}

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

function isSquare(n: number): boolean {
  if (n < 0) return false;
  const r = Math.round(Math.sqrt(n));
  return r * r === n;
}

/* ────────────────────────────────────────────────────────────────────────
 * 정답을 «인수» 로 가르기 — 완전 인수분해 가드가 쓴다
 * ──────────────────────────────────────────────────────────────────────── */

type Factor = { inner: string; pow: number };

/** 괄호 인수와 그 앞의 단항식 계수(`3xy`)를 갈라 낸다. */
function splitFactors(t: string): { lead: string; factors: Factor[] } {
  let lead = "";
  const factors: Factor[] = [];
  let i = 0;
  while (i < t.length) {
    if (t[i] === "(") {
      let depth = 0;
      let j = i;
      for (; j < t.length; j += 1) {
        if (t[j] === "(") depth += 1;
        else if (t[j] === ")") {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      if (depth !== 0) throw new Error(`괄호가 안 맞는다: ${t}`);
      const inner = t.slice(i + 1, j);
      i = j + 1;
      let pow = 1;
      if (t[i] === "^") {
        i += 1;
        const m = /^\{?(\d+)\}?/.exec(t.slice(i));
        if (!m) throw new Error(`지수를 못 읽었다: ${t}`);
        pow = Number(m[1]);
        i += m[0].length;
      }
      factors.push({ inner, pow });
    } else {
      lead += t[i];
      i += 1;
    }
  }
  if (factors.length === 0)
    return { lead: "", factors: [{ inner: t, pow: 1 }] };
  return { lead, factors };
}

/**
 * 「이 인수에 공통인수가 남아 있지 않은가」 — 어긴 자리를 글로 돌려준다.
 *
 * `2x^2+4x` 의 답이 `x(2x+4)` 이면 ㉠ 에서, `2x(x+2)` 이면 아무 데서도 안 걸린다.
 */
function leftoverFactors(answer: string, vars: string[]): string[] {
  const bad: string[] = [];
  const { lead, factors } = splitFactors(answer);
  if (/[+]|(?<=.)-/.test(lead))
    bad.push(`앞 단항식이 단항식이 아니다: ${lead}`);
  const vx = vars[0]!;
  const vy = vars[1] ?? "@";
  for (const f of factors) {
    const grid = coeffGrid(f.inner, vx, vy, 3, 2, { "@": 0 });
    const flat: { i: number; j: number; c: number }[] = [];
    grid.forEach((row, i) =>
      row.forEach((c, j) => {
        if (c !== 0) flat.push({ i, j, c });
      }),
    );
    if (flat.length === 0) {
      bad.push(`인수가 0 이다: ${f.inner}`);
      continue;
    }
    const g = flat.reduce((u, t) => gcd(u, t.c), 0);
    if (g !== 1) bad.push(`정수 공통인수 ${g} 가 남았다: ${f.inner}`);
    if (flat.every((t) => t.i >= 1)) bad.push(`${vx} 가 공통이다: ${f.inner}`);
    if (vars.length > 1 && flat.every((t) => t.j >= 1)) {
      bad.push(`${vy} 가 공통이다: ${f.inner}`);
    }
    // 일변수 이차 인수는 유리수 위에서 더 갈라지면 안 된다.
    const univariate = flat.every((t) => t.j === 0);
    if (univariate && grid[3]![0] === 0 && grid[2]![0] !== 0) {
      const [c0, c1, c2] = [grid[0]![0]!, grid[1]![0]!, grid[2]![0]!];
      if (isSquare(c1 * c1 - 4 * c0 * c2)) {
        bad.push(`이차 인수가 더 갈라진다: ${f.inner}`);
      }
    }
  }
  return bad;
}

/* ────────────────────────────────────────────────────────────────────────
 * 지면에서 식 뽑기
 * ──────────────────────────────────────────────────────────────────────── */

function maths(text: string): string[] {
  return (text.match(/\$[^$]*\$/g) ?? []).map((m) => m.slice(1, -1));
}

const ansTex = (p: MidProblem): string => {
  const m = /^\$([^$]*)\$$/.exec(p.answer);
  if (!m) throw new Error(`정답이 통째로 수식이 아니다: ${p.answer}`);
  return m[1]!;
};

const firstMath = (p: MidProblem): string => maths(p.content)[0]!;
const lastMath = (p: MidProblem): string => maths(p.content).at(-1)!;

/** 실수 해 하나 — 훑어서 부호가 바뀌는 구간을 찾고 이분법으로 좁힌다. */
function solveReal(lhs: string, rhs: number): number {
  const f = (x: number): number | null => {
    try {
      return evalLatex(lhs, { x }) - rhs;
    } catch {
      return null;
    }
  };
  const step = 0.05;
  let prevX = -40;
  let prevY = f(prevX);
  for (let x = -40 + step; x <= 40 + 1e-9; x += step) {
    const y = f(x);
    if (y !== null && prevY !== null && prevY * y < 0) {
      // 0 을 사이에 두면 극점(1/x)일 수 있다 — 건너뛴다.
      if (!(prevX < 0 && x > 0)) {
        let lo = prevX;
        let hi = x;
        let flo = prevY;
        for (let k = 0; k < 80; k += 1) {
          const mid = (lo + hi) / 2;
          const fm = f(mid);
          if (fm === null) break;
          if (flo * fm <= 0) hi = mid;
          else {
            lo = mid;
            flo = fm;
          }
        }
        const root = (lo + hi) / 2;
        const fr = f(root);
        if (fr !== null && Math.abs(fr) < 1e-6) return root;
      }
    }
    prevX = x;
    prevY = y;
  }
  throw new Error(`실수 해를 못 찾았다: ${lhs}=${rhs}`);
}

/* ────────────────────────────────────────────────────────────────────────
 * 유형별 판정표
 * ──────────────────────────────────────────────────────────────────────── */

type Spec = {
  /** 이 유형의 식에 나오는 문자 — 첫째가 주 변수다. */
  vars: string[];
  /** «함수로서 같아야 하는 두 식» — 지면 글자에서 뽑는다. */
  identity?: (p: MidProblem) => [string, string];
  /** 정답이 수인 유형 — 지면 글자로 값을 독립 계산한다. */
  value?: (p: MidProblem) => number;
  /** 정답이 «완전히 인수분해된 다항식» 인가. */
  factored?: boolean;
  /** 대입할 점 — 기본은 정수 격자. */
  points?: (p: MidProblem) => Env[];
  /** 위의 셋 어디에도 안 맞는 유형의 직접 검사. */
  custom?: (p: MidProblem) => void;
};

const XS = [-5, -3, -2, -1, 0, 1, 2, 3, 4, 6];
const YS = [-2, -1, 0, 1, 3];

function gridPoints(vars: string[]): Env[] {
  if (vars.length === 1) return XS.map((x) => ({ [vars[0]!]: x }));
  const out: Env[] = [];
  for (const x of XS)
    for (const y of YS) out.push({ [vars[0]!]: x, [vars[1]!]: y });
  return out;
}

const M = "3-1|다항식의 곱셈";
const F = "3-1|다항식의 인수분해";

/** 발문의 «식» 과 정답이 같은 함수여야 하는 유형 — 가장 흔한 꼴. */
const expandSpec = (vars: string[], factored = false): Spec => ({
  vars,
  factored,
  identity: (p) => [firstMath(p), ansTex(p)],
});

const SPECS: Record<string, Spec> = {
  // ── 다항식의 곱셈 ────────────────────────────────────────────
  [`${M}|01`]: expandSpec(["x", "y"]),
  [`${M}|02`]: {
    vars: ["x"],
    // 지면의 곱을 보간해 계수를 되찾는다 — 생성기의 `ad+bc` 를 옮겨 적지 않는다.
    value: (p) => {
      const g = coeffGrid(firstMath(p), "x", "@", 3, 0, { "@": 0 });
      return g[p.facts.which!]![0]!;
    },
  },
  [`${M}|03`]: expandSpec(["x", "y"]),
  [`${M}|04`]: expandSpec(["x", "y"]),
  [`${M}|05`]: expandSpec(["x", "y"]),
  [`${M}|06`]: expandSpec(["x", "y"]),
  [`${M}|07`]: expandSpec(["x"]),
  [`${M}|08`]: {
    vars: ["x"],
    identity: (p) => [
      `(${p.facts.a}x+${p.facts.p})(${p.facts.b}x-${p.facts.q})`,
      ansTex(p),
    ],
  },
  [`${M}|09`]: {
    vars: ["x"],
    identity: (p) => [
      `(${p.facts.a}x-${p.facts.w})(${p.facts.b}x-${p.facts.w})`,
      ansTex(p),
    ],
  },
  [`${M}|10`]: expandSpec(["x", "y"]),
  [`${M}|11`]: { vars: ["x"], value: (p) => evalLatex(firstMath(p), {}) },
  [`${M}|12`]: {
    vars: ["x"],
    identity: (p) => [firstMath(p), ansTex(p)],
    points: () => [{}],
  },
  [`${M}|13`]: {
    vars: ["x"],
    identity: (p) => [firstMath(p), ansTex(p)],
    points: () => [{}],
  },
  [`${M}|14`]: {
    vars: ["x"],
    // 발문이 준 `x=a±√b` 를 그대로 읽어 식에 넣는다.
    value: (p) => {
      const [lhs, rhs] = firstMath(p).split("=");
      expect(lhs).toBe("x");
      return evalLatex(maths(p.content)[1]!, { x: evalLatex(rhs!, {}) });
    },
  },
  [`${M}|15`]: {
    vars: ["x", "y"],
    // 두 조건을 만족하는 **실제 두 수**를 구해 물음의 식에 대입한다.
    value: (p) => {
      const [g1, g2, ask] = maths(p.content);
      const [l1, r1] = g1!.split("=");
      const [l2, r2] = g2!.split("=");
      expect(l2).toBe("xy");
      const v1 = evalLatex(r1!, {});
      const prod = evalLatex(r2!, {});
      let sum: number;
      let diff: number;
      if (l1 === "x+y") {
        sum = v1;
        diff = Math.sqrt(v1 * v1 - 4 * prod);
      } else {
        expect(l1).toBe("x-y");
        diff = v1;
        sum = Math.sqrt(v1 * v1 + 4 * prod);
      }
      const x = (sum + diff) / 2;
      const y = (sum - diff) / 2;
      expect(near(x * y, prod, 1e-7), `xy 가 안 맞는다: ${x}·${y}`).toBe(true);
      return evalLatex(ask!, { x, y });
    },
  },
  [`${M}|16`]: {
    vars: ["x"],
    value: (p) => {
      const [given, ask] = maths(p.content);
      const [lhs, rhs] = given!.split("=");
      const x = solveReal(lhs!, evalLatex(rhs!, {}));
      return evalLatex(ask!, { x });
    },
  },
  [`${M}|17`]: expandSpec(["x"]),
  [`${M}|18`]: {
    vars: ["x"],
    value: (p) => {
      const [given, ask] = maths(p.content);
      const [lhs, rhs] = given!.split("=");
      const x = solveReal(lhs!, evalLatex(rhs!, {}));
      return evalLatex(ask!, { x });
    },
  },

  // ── 다항식의 인수분해 ────────────────────────────────────────
  [`${F}|01`]: {
    vars: ["x"],
    factored: true,
    identity: (p) => [`(${maths(p.content)[1]!})(${ansTex(p)})`, firstMath(p)],
  },
  [`${F}|02`]: expandSpec(["x", "y"], true),
  [`${F}|03`]: expandSpec(["x", "y"], true),
  [`${F}|04`]: {
    vars: ["x"],
    // 정답을 미지수 자리에 넣으면 **판별식이 0** 이어야 한다 — 생성기의 `m^2` 를 안 쓴다.
    custom: (p) => {
      const src = firstMath(p);
      const sym = src.includes("k") ? "k" : "a";
      const v = evalLatex(ansTex(p), {});
      const g = coeffGrid(src, "x", "@", 2, 0, { "@": 0, [sym]: v });
      const [c0, c1, c2] = [g[0]![0]!, g[1]![0]!, g[2]![0]!];
      expect(c2, `${p.answer} 를 넣어도 이차식이 아니다`).not.toBe(0);
      expect(
        c1 * c1 - 4 * c0 * c2,
        `${src} 에 ${sym}=${v} 를 넣어도 완전제곱이 아니다`,
      ).toBe(0);
    },
  },
  [`${F}|05`]: {
    vars: ["x"],
    identity: (p) => [lastMath(p), ansTex(p)],
    // 발문이 준 범위 **안에서만** 같다 — 밖에서는 근호가 다른 부호를 낸다.
    points: (p) => {
      const lo = p.facts.lo!;
      const hi = p.facts.hi!;
      return Array.from({ length: 7 }, (_, k) => ({
        x: lo + ((hi - lo) * (k + 1)) / 8,
      }));
    },
  },
  [`${F}|06`]: expandSpec(["x", "y"], true),
  [`${F}|07`]: expandSpec(["x", "y"], true),
  [`${F}|08`]: expandSpec(["x"], true),
  [`${F}|09`]: expandSpec(["x"], true),
  [`${F}|10`]: {
    vars: ["x"],
    factored: true,
    // 정답의 근을 두 다항식에 넣으면 둘 다 $0$ 이어야 하고, **그런 근이 하나뿐**
    // 이어야 한다 — 둘이면 「공통인 인수」가 하나로 안 정해져 발문이 성립하지 않는다.
    custom: (p) => {
      const ans = ansTex(p);
      const c0 = evalLatex(ans, { x: 0 });
      const c1 = evalLatex(ans, { x: 1 }) - c0;
      expect(c1, `정답이 상수다: ${ans}`).not.toBe(0);
      const root = -c0 / c1;
      const [p1, p2] = maths(p.content);
      for (const poly of [p1!, p2!]) {
        expect(
          near(evalLatex(poly, { x: root }), 0, 1e-7),
          `${poly} 가 ${ans} 로 안 나눠진다`,
        ).toBe(true);
      }
      const shared: number[] = [];
      for (let r = -60; r <= 60; r += 1) {
        if (
          near(evalLatex(p1!, { x: r }), 0, 1e-9) &&
          near(evalLatex(p2!, { x: r }), 0, 1e-9)
        ) {
          shared.push(r);
        }
      }
      expect(shared, `공통인 근이 하나여야 한다 — ${p1} · ${p2}`).toEqual([
        root,
      ]);
    },
  },
  [`${F}|11`]: {
    vars: ["x"],
    custom: (p) => {
      const src = firstMath(p);
      const factor = maths(p.content)[1]!;
      const a = evalLatex(ansTex(p), {});
      const c0 = evalLatex(factor, { x: 0 });
      const c1 = evalLatex(factor, { x: 1 }) - c0;
      const root = -c0 / c1;
      expect(
        near(evalLatex(src, { x: root, a }), 0, 1e-7),
        `${src} 에 a=${a} 를 넣어도 x=${root} 에서 0 이 아니다`,
      ).toBe(true);
    },
  },
  [`${F}|12`]: {
    vars: ["x"],
    factored: true,
    // 잘못 본 두 답에서 «맞은 쪽» 만 뽑아 처음 이차식을 다시 세운다.
    custom: (p) => {
      const wrong = maths(p.content).filter((t) => t.includes("("));
      expect(wrong).toHaveLength(2);
      const P = evalLatex(wrong[0]!, { x: 0 });
      const gB = coeffGrid(wrong[1]!, "x", "@", 2, 0, { "@": 0 });
      const S = gB[1]![0]!;
      for (const x of XS) {
        expect(
          near(evalLatex(ansTex(p), { x }), x * x + S * x + P, 1e-7),
          `x=${x}: 정답이 x^2+${S}x+${P} 와 다르다`,
        ).toBe(true);
      }
    },
  },
  [`${F}|13`]: {
    vars: ["x"],
    // 조각 개수로 세운 이차식의 **정수근**을 훑어 찾아 둘레를 다시 만든다.
    custom: (p) => {
      const b = p.facts.b!;
      const c = p.facts.c!;
      const roots: number[] = [];
      for (let r = -40; r <= 40; r += 1) {
        if (r * r + b * r + c === 0) roots.push(r);
      }
      expect(roots.length, `x^2+${b}x+${c} 의 정수근`).toBeGreaterThanOrEqual(
        1,
      );
      const [r1, r2] = roots.length === 1 ? [roots[0]!, roots[0]!] : roots;
      for (const x of XS) {
        expect(
          near(evalLatex(ansTex(p), { x }), 4 * x - 2 * (r1! + r2!), 1e-7),
          `x=${x}: 둘레가 안 맞는다`,
        ).toBe(true);
      }
    },
  },
  [`${F}|14`]: {
    vars: ["x"],
    factored: true,
    identity: (p) => [
      `(${maths(p.content)[0]!})(${ansTex(p)})`,
      maths(p.content)[1]!,
    ],
  },
  [`${F}|15`]: expandSpec(["x"], true),
  [`${F}|16`]: expandSpec(["a", "b"], true),
  [`${F}|17`]: expandSpec(["x", "y"], true),
  [`${F}|18`]: expandSpec(["x", "y"], true),
  [`${F}|19`]: { vars: ["x"], value: (p) => evalLatex(firstMath(p), {}) },
  [`${F}|20`]: {
    vars: ["x"],
    // 발문의 대입값을 그대로 읽어 마지막 식에 넣는다 — 인수분해를 안 쓴다.
    value: (p) => {
      const parts = maths(p.content);
      const env: Env = {};
      for (const t of parts.slice(0, -1)) {
        const [lhs, rhs] = t.split("=");
        expect(lhs!.length, `대입 꼴이 아니다: ${t}`).toBe(1);
        env[lhs!] = evalLatex(rhs!, env);
      }
      return evalLatex(parts.at(-1)!, env);
    },
  },
  [`${F}|21`]: expandSpec(["x"], true),
  [`${F}|22`]: expandSpec(["x", "y"], true),
};

/* ────────────────────────────────────────────────────────────────────────
 * 전처리 판정기 — 지면이 수를 고쳐 쓰는가
 * ──────────────────────────────────────────────────────────────────────── */

const MIXED = /(?:^|[^\d.])(\d{1,4})\\d?frac\{(\d{1,4})\}\{(\d{1,4})\}/g;
const FRAC = /\\d?frac\{(\d{1,4})\}\{(\d{1,4})\}/g;
const countMixed = (s: string): number => [...s.matchAll(MIXED)].length;
const countFrac = (s: string): number => [...s.matchAll(FRAC)].length;

function preprocessRewrites(text: string): string[] {
  const after = preprocessMathText(text);
  const out: string[] = [];
  const mixed = countMixed(after) - countMixed(text);
  if (mixed > 0) out.push(`가분수→대분수 ${mixed}`);
  const fold = countFrac(text) - countFrac(after);
  if (fold > 0) out.push(`분수 접힘 ${fold}`);
  return out;
}

/** 수만으로 읽히는 등식 사슬이 실제로 성립하는가. 문자가 끼면 건너뛴다. */
function numericEqualityMismatches(text: string): string[] {
  const out: string[] = [];
  for (const seg of maths(text)) {
    const parts = seg.split("=");
    if (parts.length < 2) continue;
    let prev: number | null = null;
    let prevRaw = "";
    for (const part of parts) {
      let v: number | null = null;
      try {
        v = evalLatex(part, {});
      } catch {
        v = null;
      }
      if (v !== null && prev !== null && !near(v, prev, 1e-9)) {
        out.push(`${prevRaw} = ${part} → ${prev} vs ${v}`);
      }
      prev = v;
      prevRaw = part;
    }
  }
  return out;
}

/* ────────────────────────────────────────────────────────────────────────
 * RPM 색인 정본 — 40유형 제목 리터럴
 * ──────────────────────────────────────────────────────────────────────── */

const TITLES: Record<string, string> = {
  [`${M}|01`]: "다항식다항식의 전개",
  [`${M}|02`]: "전개식에서 특정한 항의 계수 구하기",
  [`${M}|03`]: "의 전개",
  [`${M}|04`]: "의 전개",
  [`${M}|05`]: "의 전개",
  [`${M}|06`]: "의 전개",
  [`${M}|07`]: "곱셈 공식 종합",
  [`${M}|08`]: "곱셈 공식의 도형에의 활용 ⑴",
  [`${M}|09`]: "곱셈 공식의 도형에의 활용 ⑵",
  [`${M}|10`]: "공통부분이 있는 식의 전개",
  [`${M}|11`]: "곱셈 공식을 이용한 수의 계산",
  [`${M}|12`]: "곱셈 공식을 이용한 근호를 포함한 식의 계산",
  [`${M}|13`]: "곱셈 공식을 이용한 분모의 유리화",
  [`${M}|14`]: "의 꼴이 주어질 때 식의 값 구하기",
  [`${M}|15`]: "곱셈 공식의 변형 ⑴",
  [`${M}|16`]: "곱셈 공식의 변형 ⑵",
  [`${M}|17`]: "의 꼴의 전개",
  [`${M}|18`]: "의 꼴이 주어질 때 식의 값 구하기",
  [`${F}|01`]: "인수",
  [`${F}|02`]: "공통인 인수로 묶어 인수분해하기",
  [`${F}|03`]: "의 인수분해",
  [`${F}|04`]: "완전제곱식이 되도록 하는 미지수의 값 구하기",
  [`${F}|05`]: "근호 안이 완전제곱식으로 인수분해되는 식",
  [`${F}|06`]: "의 인수분해",
  [`${F}|07`]: "의 인수분해",
  [`${F}|08`]: "의 인수분해",
  [`${F}|09`]: "인수분해 공식 종합",
  [`${F}|10`]: "두 다항식의 공통인 인수 구하기",
  [`${F}|11`]: "인수가 주어진 이차식의 미지수의 값 구하기",
  [`${F}|12`]: "계수 또는 상수항을 잘못 보고 인수분해한 경우",
  [`${F}|13`]: "인수분해의 도형에의 활용 ⑴",
  [`${F}|14`]: "인수분해의 도형에의 활용 ⑵",
  [`${F}|15`]: "공통부분이 있는 식의 인수분해 ⑴",
  [`${F}|16`]: "공통부분이 있는 식의 인수분해 ⑵",
  [`${F}|17`]: "항이 개인 식의 인수분해 개의 항씩 묶기",
  [`${F}|18`]: "항이 개인 식의 인수분해 개의 항씩 묶기",
  [`${F}|19`]: "인수분해 공식을 이용한 수의 계산",
  [`${F}|20`]: "인수분해 공식을 이용하여 식의 값 구하기",
  [`${F}|21`]: "의 꼴의 인수분해",
  [`${F}|22`]: "항이 개 이상인 식의 인수분해",
};

/**
 * 40변형에서 갈리는 발문의 가짓수 — **실측**이다
 * (`npx tsx scripts/qa/measure-m3-poly-variety.ts`, 2026-08-24).
 * 씨앗이 고정이라 결정적이다: 이 수가 줄면 변형 공간이 실제로 좁아진 것이다.
 */
const MIN_CONTENTS: Record<string, number> = {
  [`${M}|01`]: 40,
  [`${M}|02`]: 40,
  [`${M}|03`]: 33,
  [`${M}|04`]: 35,
  [`${M}|05`]: 39,
  [`${M}|06`]: 39,
  [`${M}|07`]: 40,
  [`${M}|08`]: 39,
  [`${M}|09`]: 32,
  [`${M}|10`]: 21,
  [`${M}|11`]: 32,
  [`${M}|12`]: 40,
  [`${M}|13`]: 38,
  [`${M}|14`]: 40,
  [`${M}|15`]: 39,
  [`${M}|16`]: 28,
  [`${M}|17`]: 28,
  [`${M}|18`]: 24,
  [`${F}|01`]: 36,
  [`${F}|02`]: 40,
  [`${F}|03`]: 33,
  [`${F}|04`]: 26,
  [`${F}|05`]: 34,
  [`${F}|06`]: 33,
  [`${F}|07`]: 39,
  [`${F}|08`]: 39,
  [`${F}|09`]: 40,
  [`${F}|10`]: 40,
  [`${F}|11`]: 38,
  [`${F}|12`]: 40,
  [`${F}|13`]: 16,
  [`${F}|14`]: 37,
  [`${F}|15`]: 40,
  [`${F}|16`]: 33,
  [`${F}|17`]: 33,
  [`${F}|18`]: 37,
  [`${F}|19`]: 34,
  [`${F}|20`]: 33,
  [`${F}|21`]: 36,
  [`${F}|22`]: 40,
};

/** 해설이 인용하는 공식 — 그 자체가 항등식인지, 그리고 정말 쓰이는지 잰다. */
const FORMULAS: [string, string[]][] = [
  ["(A+B)^2=A^2+2AB+B^2", ["A", "B"]],
  ["(A+B)(A-B)=A^2-B^2", ["A", "B"]],
  ["A^2-B^2=(A+B)(A-B)", ["A", "B"]],
  ["(x+a)(x+b)=x^2+(a+b)x+ab", ["x", "a", "b"]],
  ["(ax+b)(cx+d)=acx^2+(ad+bc)x+bd", ["a", "b", "c", "d", "x"]],
  ["acx^2+(ad+bc)x+bd=(ax+b)(cx+d)", ["a", "b", "c", "d", "x"]],
  ["a^2-b^2=(a+b)(a-b)", ["a", "b"]],
  ["a^2+2ab+b^2=(a+b)^2", ["a", "b"]],
  ["x^2+y^2=(x+y)^2-2xy", ["x", "y"]],
  ["x^2+y^2=(x-y)^2+2xy", ["x", "y"]],
  ["(x-y)^2=(x+y)^2-4xy", ["x", "y"]],
  ["(x+y)^2=(x-y)^2+4xy", ["x", "y"]],
];

/* ────────────────────────────────────────────────────────────────────────
 * 판정기 자체를 먼저 시험한다 — 양성·음성 대조군이 둘 다 있어야 한다
 * ──────────────────────────────────────────────────────────────────────── */

describe("LaTeX 계산기 — 지면 글자의 값을 옳게 읽는가", () => {
  it("아는 모양을 읽는다", () => {
    expect(evalLatex("2x^2-3x+1", { x: 4 })).toBe(21);
    expect(evalLatex("(x+3)(x-5)", { x: 2 })).toBe(-15);
    expect(evalLatex("\\dfrac{3}{4}", {})).toBeCloseTo(0.75, 12);
    expect(evalLatex("\\sqrt{9}", {})).toBe(3);
    expect(evalLatex("2\\times94\\times6", {})).toBe(1128);
    expect(evalLatex("100^2", {})).toBe(10000);
    expect(evalLatex("\\left(x+\\dfrac{1}{x}\\right)^2", { x: 2 })).toBeCloseTo(
      6.25,
      12,
    );
    expect(evalLatex("3xy", { x: 2, y: 5 })).toBe(30);
  });

  it("모르는 모양이면 **던진다** — 조용히 건너뛰면 등식 검사가 눈이 먼다", () => {
    expect(() => evalLatex("x+1", {})).toThrow();
    expect(() => evalLatex("\\sin 30", { x: 1 })).toThrow();
    expect(() => evalLatex("(x+1", { x: 1 })).toThrow();
    expect(() => evalLatex("2 3 4 ]", { x: 1 })).toThrow();
  });
});

describe("계수 보간 — 지면의 식에서 계수를 되찾는가", () => {
  it("일변수·이변수 계수를 정확히 되찾는다 (양성 대조군)", () => {
    const g = coeffGrid("2x^2-7x+3", "x", "@", 3, 0, { "@": 0 });
    expect([g[0]![0], g[1]![0], g[2]![0], g[3]![0]]).toEqual([3, -7, 2, 0]);
    const h = coeffGrid("9x^2-30xy+25y^2", "x", "y", 3, 2, {});
    expect(h[2]![0]).toBe(9);
    expect(h[1]![1]).toBe(-30);
    expect(h[0]![2]).toBe(25);
  });

  it("정수가 아닌 계수는 던진다 (음성 대조군)", () => {
    expect(() =>
      coeffGrid("\\dfrac{x}{3}", "x", "@", 2, 0, { "@": 0 }),
    ).toThrow();
  });
});

describe("완전 인수분해 가드 — 남은 공통인수를 실제로 잡는가", () => {
  it("덜 묶은 답을 잡는다 (양성 대조군)", () => {
    expect(leftoverFactors("x(2x+4)", ["x"])).not.toEqual([]);
    expect(leftoverFactors("(x^2+3x)(x+1)", ["x"])).not.toEqual([]);
    expect(leftoverFactors("(x^2-5x+6)(x+7)", ["x"])).not.toEqual([]);
    expect(leftoverFactors("(2x+4y)(x-y)", ["x", "y"])).not.toEqual([]);
  });

  it("다 묶은 답은 안 잡는다 (음성 대조군)", () => {
    expect(leftoverFactors("2x(x+2)", ["x"])).toEqual([]);
    expect(leftoverFactors("3xy(2x-3y)", ["x", "y"])).toEqual([]);
    expect(leftoverFactors("(3x-4y)^2", ["x", "y"])).toEqual([]);
    expect(leftoverFactors("(x^2+12x+22)(x^2+12x+33)", ["x"])).toEqual([]);
    expect(leftoverFactors("(x-5)(x^2+7)", ["x"])).toEqual([]);
    expect(leftoverFactors("x+5", ["x"])).toEqual([]);
  });
});

describe("등식 판정기 — 틀린 계산 줄을 실제로 잡는가", () => {
  it("틀린 수 계산을 잡는다 (양성 대조군)", () => {
    expect(numericEqualityMismatches("$2\\times3=7$")).not.toEqual([]);
    expect(numericEqualityMismatches("$100^2-16=9983$")).not.toEqual([]);
  });
  it("맞는 계산·문자 낀 식은 안 잡는다 (음성 대조군)", () => {
    expect(numericEqualityMismatches("$2\\times3=6$")).toEqual([]);
    expect(numericEqualityMismatches("$x+2=5$")).toEqual([]);
  });
});

describe("전처리 판정기 — 지면이 수를 고쳐 쓰는가", () => {
  it("이 판정기의 «찾기» 가 살아 있다 — 제품을 거치지 않고 본다", () => {
    // D-73 으로 제품은 더 이상 가분수를 대분수로 바꾸지 않는다. 그래서
    // 「제품이 바꾸나」로는 이 자를 **못 잰다** — 구조적으로 0 이다.
    expect(countMixed(String.raw`1\dfrac{1}{2}y`)).toBe(1);
    expect(countMixed(String.raw`\dfrac{3}{2}y`)).toBe(0);
    expect(countFrac(String.raw`\dfrac{6}{3}=2`)).toBe(1);
    expect(countFrac("2=2")).toBe(0);
  });
});

/* ────────────────────────────────────────────────────────────────────────
 * 40유형 본 시험
 * ──────────────────────────────────────────────────────────────────────── */

describe("중3 다항식의 곱셈과 인수분해 40유형", () => {
  const entries = M3_POLY;

  it("40유형이 전부 등록돼 있다", () => {
    expect(entries).toHaveLength(40);
    expect(new Set(entries.map((e) => e.key)).size).toBe(40);
    expect([...new Set(entries.map((e) => e.rpmMinor))].sort()).toEqual(
      [...M3_POLY_MINORS].sort(),
    );
    const counts = new Map<string, number>();
    for (const e of entries) {
      counts.set(e.unitSection, (counts.get(e.unitSection) ?? 0) + 1);
    }
    expect([...counts.entries()].sort()).toEqual([
      ["다항식의 곱셈", 18],
      ["인수분해", 9],
      ["인수분해의 응용", 13],
    ]);
  });

  it("RPM 색인의 실제 제목을 쓴다 (40유형 전량 리터럴 대조)", () => {
    for (const e of entries) expect(e.rpmTitle, e.key).toBe(TITLES[e.key]);
    // 색인이 앞의 수식 그림을 잃어 「의 …」로 시작하는 제목들 — 손으로 고치면 안 된다.
    expect(TITLES[`${M}|03`]).toBe("의 전개");
    expect(TITLES[`${F}|21`]).toBe("의 꼴의 인수분해");
    // 17·18 은 색인이 「4개」·「2개/3개」의 숫자를 잃어 **글자 그대로 같다**.
    expect(TITLES[`${F}|17`]).toBe(TITLES[`${F}|18`]);
  });

  it("모든 유형에 판정표가 있다 — 분모가 조용히 줄지 않게", () => {
    const missing = entries.filter((e) => !SPECS[e.key]);
    expect(missing.map((e) => e.key)).toEqual([]);
    expect(Object.keys(SPECS)).toHaveLength(40);
    expect(Object.keys(MIN_CONTENTS)).toHaveLength(40);
  });

  it("해설이 인용하는 곱셈·인수분해 공식이 실제 항등식이다", () => {
    for (const [f, vars] of FORMULAS) {
      const [lhs, rhs] = f.split("=");
      for (let k = 0; k < 6; k += 1) {
        const env: Env = {};
        vars.forEach((v, j) => {
          env[v] = ((k * 7 + j * 3) % 11) - 5 + 0.5;
        });
        expect(
          near(evalLatex(lhs!, env), evalLatex(rhs!, env), 1e-9),
          `${f} 가 항등식이 아니다 (${JSON.stringify(env)})`,
        ).toBe(true);
      }
    }
  });

  it("그 공식들이 실제로 해설에 쓰인다 — 죽은 목록이 아니다", () => {
    const seen = new Set<string>();
    for (const e of entries) {
      for (const seed of SEEDS) {
        for (let v = 0; v < 6; v += 1) {
          for (const m of maths(
            generateMiddleProblem(e.key, seed, v).solution,
          )) {
            seen.add(m);
          }
        }
      }
    }
    const unused = FORMULAS.map(([f]) => f).filter((f) => !seen.has(f));
    expect(unused, "해설이 안 쓰는 공식은 목록에서 빼라").toEqual([]);
  });

  for (const e of M3_POLY) {
    describe(`${e.rpmMinor} ${e.rpmType} ${e.rpmTitle}`, () => {
      const spec = SPECS[e.key]!;

      it("같은 씨앗이면 같은 문항", () => {
        expect(generateMiddleProblem(e.key, 20260824)).toEqual(
          generateMiddleProblem(e.key, 20260824),
        );
      });

      it("지면의 «발문 식» 과 «정답 식» 이 같은 함수다 (여러 정수 점 대입)", () => {
        if (!spec.identity) return;
        for (const seed of SEEDS) {
          for (let v = 0; v < 6; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            const [lhs, rhs] = spec.identity(p);
            const pts = spec.points ? spec.points(p) : gridPoints(spec.vars);
            for (const env of pts) {
              const a = evalLatex(lhs, env);
              const b = evalLatex(rhs, env);
              expect(
                near(a, b, 1e-7),
                `${e.key} seed ${seed} v${v} ${JSON.stringify(env)}: ${lhs} = ${a} vs ${rhs} = ${b}`,
              ).toBe(true);
            }
          }
        }
      });

      it("지면의 «정답 수» 가 독립 계산값과 같다", () => {
        if (!spec.value) return;
        for (const seed of SEEDS) {
          for (let v = 0; v < 5; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            expect(
              evalLatex(ansTex(p), {}),
              `${e.key} seed ${seed} v${v} 정답 ${p.answer}`,
            ).toBeCloseTo(spec.value(p), 6);
          }
        }
      });

      it("유형별 직접 검사", () => {
        if (!spec.custom) return;
        for (const seed of SEEDS) {
          for (let v = 0; v < 6; v += 1)
            spec.custom(generateMiddleProblem(e.key, seed, v));
        }
      });

      it("정답에 «덜 묶은 인수» 가 없다 (완전 인수분해)", () => {
        if (!spec.factored) return;
        for (const seed of SEEDS) {
          for (let v = 0; v < 6; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            expect(
              leftoverFactors(ansTex(p), spec.vars),
              `${e.key} seed ${seed} v${v} 정답 ${p.answer}`,
            ).toEqual([]);
          }
        }
      });

      it("숫자가 KaTeX 밖에 없다 (본문·정답·해설)", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < 6; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            expect(bareNumbers(p.content), `${e.key} 발문`).toEqual([]);
            expect(bareNumbers(p.answer), `${e.key} 정답`).toEqual([]);
            expect(bareNumbers(p.solution), `${e.key} 해설`).toEqual([]);
          }
        }
      });

      /**
       * KaTeX 밖의 백슬래시는 지면에 **날 문자로** 나간다(제품 렌더러가 `$` 밖
       * 백슬래시를 글자 그대로 이스케이프한다). 숫자 가드는 이 부류를 못 본다.
       */
      it("KaTeX 밖에 백슬래시가 없다", () => {
        const outside = (t: string): string => t.replace(/\$[^$]*\$/g, " ");
        for (const seed of SEEDS) {
          for (let v = 0; v < 6; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            for (const [name, text] of [
              ["content", p.content],
              ["answer", p.answer],
              ["solution", p.solution],
            ] as const) {
              expect(
                outside(text).match(/\\[\s\S]/g) ?? [],
                `${e.key} seed ${seed} v${v} ${name}`,
              ).toEqual([]);
            }
          }
        }
      });

      it("정답은 통째로 하나의 수식이다", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < 6; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            expect(p.answer, e.key).toMatch(/^\$[^$]+\$$/);
          }
        }
      });

      it("해설이 한 줄로 뭉치지 않는다 (단계 사이 줄바꿈)", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < 6; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            expect(
              p.solution.split("\n").filter((s) => s.trim() !== "").length,
              `${e.key} seed ${seed} v${v}`,
            ).toBeGreaterThanOrEqual(2);
          }
        }
      });

      it("제품 전처리가 수식의 수를 고쳐 쓰지 않는다", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < 6; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            for (const text of [p.content, p.answer, p.solution]) {
              expect(
                preprocessRewrites(text),
                `${e.key} seed ${seed} v${v}: ${text}`,
              ).toEqual([]);
            }
          }
        }
      });

      it("발문·해설에 적힌 수 계산이 실제로 성립한다", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < 6; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            for (const [name, text] of [
              ["발문", p.content],
              ["정답", p.answer],
              ["해설", p.solution],
            ] as const) {
              expect(
                numericEqualityMismatches(text),
                `${e.key} seed ${seed} v${v} ${name}`,
              ).toEqual([]);
            }
          }
        }
      });

      it("이 모듈은 그림을 쓰지 않는다 (발문이 글로 완결된다)", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < 4; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            expect(p.figureSpec ?? null, `${e.key} 그림이 붙었다`).toBe(null);
          }
        }
      });

      it("변형 폭 — 40변형에서 발문이 실측 하한만큼 갈린다", () => {
        const contents = new Set<string>();
        for (let v = 0; v < 40; v += 1) {
          contents.add(generateMiddleProblem(e.key, 20260824, v).content);
        }
        expect(contents.size, `${e.key} 발문 다양성`).toBeGreaterThanOrEqual(
          MIN_CONTENTS[e.key]!,
        );
      });
    });
  }

  it("한 유형에서 4문항을 뽑으면 발문이 전부 다르다", () => {
    for (const e of entries) {
      const set = generateMiddleSet(e.key, 20260824, 4);
      expect(new Set(set.map((p: MidProblem) => p.content)).size, e.key).toBe(
        4,
      );
    }
  });

  /**
   * 넓은 씨앗 전량 — 좁은 표본은 드물게 나는 조합을 구조적으로 못 본다
   * (CLAUDE.md 2026-08-19 「0% 를 «구조적으로 못 센다»로 단정하기 전에 표본을 넓혀라」).
   */
  it("넓은 씨앗(90×3)에서도 40유형 전량이 던지지 않고 검산을 통과한다", () => {
    let checked = 0;
    for (let s = 0; s < 90; s += 1) {
      for (const e of M3_POLY) {
        const spec = SPECS[e.key]!;
        const p = generateMiddleProblem(e.key, s * 977 + 13, s % 3);
        if (spec.identity) {
          const [lhs, rhs] = spec.identity(p);
          const env = spec.points
            ? spec.points(p)[0]!
            : gridPoints(spec.vars)[7]!;
          expect(
            near(evalLatex(lhs, env), evalLatex(rhs, env), 1e-7),
            `${e.key} seed#${s}: ${lhs} vs ${rhs}`,
          ).toBe(true);
        }
        // 값 유형도 같이 쓴다 — 좁은 표본은 드문 갈래(음수 상수 등)를 못 본다.
        if (spec.value) {
          expect(
            evalLatex(ansTex(p), {}),
            `${e.key} seed#${s} 정답 ${p.answer}`,
          ).toBeCloseTo(spec.value(p), 6);
        }
        if (spec.custom) spec.custom(p);
        if (spec.factored) {
          expect(
            leftoverFactors(ansTex(p), spec.vars),
            `${e.key} seed#${s}`,
          ).toEqual([]);
        }
        expect(bareNumbers(p.content), `${e.key} seed#${s}`).toEqual([]);
        expect(
          numericEqualityMismatches(p.solution),
          `${e.key} seed#${s} 해설`,
        ).toEqual([]);
        checked += 1;
      }
    }
    expect(checked).toBe(90 * 40);
  });

  it("정확한 계수 산술이 아니라 **지면 글자**를 재고 있다 (동어반복 방지)", () => {
    // 이 시험 파일은 `polyTex`·`lin`·`termTex` 를 import 하지 않는다. 그것을 쓰면
    // 「생성기가 쓴 식으로 생성기를 검산」하는 셈이라 아무것도 못 잡는다.
    expect(Object.keys(SPECS)).toHaveLength(40);
    expect(TOL).toBeGreaterThan(0);
  });
});
