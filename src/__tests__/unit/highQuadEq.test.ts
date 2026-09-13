/**
 * 공통수학1 「이차방정식」 17유형 — **독립 검산** (본보기 `highIdentity.test.ts` 를 따른다).
 *
 *   ⑴ `VERIFY` — `facts` 의 원 수치로 **다른 식**을 세워 답의 값을 다시 낸다. 근과 계수의 관계로
 *      지은 답은 **근을 근의 공식으로 직접 구해 대입**해서 맞대고, 판별식 조건은 경계 양쪽 값을
 *      실제로 넣어 본다. 절댓값 방정식은 두 범위를 따로 풀어 걸러 낸다.
 *   ⑵ `SHOWN` — 발문의 수식을 시험 쪽 식 계산기(`texValue`)로 계산해 facts 와 맞댄다.
 *      방정식은 x=0, ±1 을 넣어 계수를 거꾸로 읽는다(지면 글자를 파싱하지 않는다).
 *
 * 식 계산기는 `highComplex.test.ts` 와 같은 판이다 — 시험 연장(`helpers/`)은 리드 소유라 옮기지
 * 못했다(보고서의 공용 후보). 제품(`numbers.ts`·`poly.ts`)은 안 부른다.
 */
import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import {
  generateHighProblem,
  registeredHighTypes,
} from "../../lib/high/generate";
import { H1_QUAD_EQ, H1_QUAD_EQ_HOLD } from "../../lib/high/h1QuadEq";
import type { HighProblem } from "../../lib/high/types";
import { readAnswerValues, sameValues, type Cx } from "../helpers/highAnswer";
import {
  highCatalog,
  mathSpans,
  parsePolyTex,
  pkey,
} from "../helpers/highPage";

const BOOK = "공통수학1";
const MINOR = "이차방정식";
const SEEDS = [20260913, 1, 7777, 424242, 99991];
const VARIANTS = 14;
const EPS = 1e-6;

const catalogRows = highCatalog(BOOK).filter((t) => t.minor === MINOR);

// ───────────────────────────── 복소수 셈 (시험 쪽) ─────────────────────────────

const C = (re: number, im = 0): Cx => ({ re, im });
const add = (a: Cx, b: Cx): Cx => C(a.re + b.re, a.im + b.im);
const sub = (a: Cx, b: Cx): Cx => C(a.re - b.re, a.im - b.im);
const mul = (a: Cx, b: Cx): Cx =>
  C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const conj = (a: Cx): Cx => C(a.re, -a.im);
const neg = (a: Cx): Cx => C(-a.re, -a.im);

function div(a: Cx, b: Cx): Cx {
  const n = b.re * b.re + b.im * b.im;
  if (n === 0) throw new Error("0 으로 나누었다");
  return C((a.re * b.re + a.im * b.im) / n, (a.im * b.re - a.re * b.im) / n);
}

function pow(a: Cx, n: number): Cx {
  if (!Number.isInteger(n)) throw new Error(`지수가 정수가 아니다: ${n}`);
  if (n < 0) return div(C(1), pow(a, -n));
  let out = C(1);
  let base = a;
  for (let k = n; k > 0; k >>= 1) {
    if (k & 1) out = mul(out, base);
    base = mul(base, base);
  }
  return out;
}

function csqrt(a: Cx): Cx {
  if (a.im === 0) {
    return a.re >= 0 ? C(Math.sqrt(a.re)) : C(0, Math.sqrt(-a.re));
  }
  const r = Math.hypot(a.re, a.im);
  return C(
    Math.sqrt((r + a.re) / 2),
    Math.sign(a.im) * Math.sqrt((r - a.re) / 2),
  );
}

const near = (a: Cx, b: Cx, eps = EPS): boolean =>
  Math.abs(a.re - b.re) <= eps && Math.abs(a.im - b.im) <= eps;

/** Ax²+Bx+C=0 의 두 근(복소수) — 근의 공식을 부동소수로. */
function croots(A: number, B: number, Cc: number): [Cx, Cx] {
  const s = csqrt(C(B * B - 4 * A * Cc));
  return [div(sub(C(-B), s), C(2 * A)), div(add(C(-B), s), C(2 * A))];
}

/** 실근만(겹근은 하나). */
function realRootsOf(A: number, B: number, Cc: number): number[] {
  const D = B * B - 4 * A * Cc;
  if (D < -EPS) return [];
  if (Math.abs(D) <= EPS) return [-B / (2 * A)];
  const s = Math.sqrt(D);
  return [(-B - s) / (2 * A), (-B + s) / (2 * A)];
}

// ───────────────────────────── 식 계산기 (시험 쪽 — highComplex 와 같은 판) ─────────────────────────────

type Tok =
  | { k: "num"; v: number }
  | { k: "var"; v: string }
  | { k: "i" }
  | { k: "cmd"; v: "sqrt" | "frac" | "overline" }
  | { k: "op"; v: "+" | "-" }
  | { k: "mul" }
  | { k: "(" | ")" | "{" | "}" | "^" | "|" | "_" };

function tokenize(src: string): Tok[] {
  const s = src
    .replace(/\\left|\\right/g, "")
    .replace(/\\,/g, "")
    .replace(/\s+/g, "");
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const rest = s.slice(i);
    const num = /^\d+/.exec(rest);
    if (num) {
      out.push({ k: "num", v: Number(num[0]) });
      i += num[0].length;
      continue;
    }
    const cmd = /^\\([a-zA-Z]+)/.exec(rest);
    if (cmd) {
      const name = cmd[1]!;
      if (name === "dfrac" || name === "frac")
        out.push({ k: "cmd", v: "frac" });
      else if (name === "sqrt") out.push({ k: "cmd", v: "sqrt" });
      else if (name === "overline") out.push({ k: "cmd", v: "overline" });
      else if (name === "times" || name === "cdot") out.push({ k: "mul" });
      else if (name === "alpha" || name === "beta")
        out.push({ k: "var", v: name });
      else throw new Error(`식 계산기가 모르는 명령 \\${name} (${src})`);
      i += cmd[0].length;
      continue;
    }
    const ch = s[i]!;
    if (ch === "i") out.push({ k: "i" });
    else if (/[a-z]/.test(ch)) out.push({ k: "var", v: ch });
    else if (ch === "+" || ch === "-") out.push({ k: "op", v: ch });
    else if ("(){}^|_".includes(ch))
      out.push({ k: ch as "(" | ")" | "{" | "}" | "^" | "|" | "_" });
    else throw new Error(`식 계산기가 못 읽는 글자 «${ch}» (${src})`);
    i += 1;
  }
  return out;
}

class TexParser {
  private pos = 0;
  private absDepth = 0;

  constructor(
    private readonly toks: Tok[],
    private readonly env: Readonly<Record<string, Cx>>,
    private readonly src: string,
  ) {}

  private fail(why: string): never {
    throw new Error(`식 계산기: ${why} (${this.src})`);
  }

  private peek(): Tok | undefined {
    return this.toks[this.pos];
  }

  private eat(k: Tok["k"]): Tok {
    const t = this.toks[this.pos];
    if (!t || t.k !== k) this.fail(`«${k}» 가 와야 할 자리`);
    this.pos += 1;
    return t;
  }

  all(): Cx {
    const v = this.expr();
    if (this.pos !== this.toks.length) this.fail("끝에 남은 조각");
    return v;
  }

  private expr(): Cx {
    const first = this.peek();
    let acc: Cx;
    if (first?.k === "op") {
      this.pos += 1;
      const t = this.term();
      acc = first.v === "-" ? neg(t) : t;
    } else {
      acc = this.term();
    }
    for (let t = this.peek(); t?.k === "op"; t = this.peek()) {
      this.pos += 1;
      const r = this.term();
      acc = t.v === "+" ? add(acc, r) : sub(acc, r);
    }
    return acc;
  }

  private startsFactor(t: Tok | undefined): boolean {
    if (!t) return false;
    if (t.k === "|") return this.absDepth === 0;
    return (
      t.k === "num" ||
      t.k === "var" ||
      t.k === "i" ||
      t.k === "cmd" ||
      t.k === "("
    );
  }

  private term(): Cx {
    let acc = this.power();
    for (;;) {
      const t = this.peek();
      if (t?.k === "mul") {
        this.pos += 1;
        acc = mul(acc, this.power());
      } else if (this.startsFactor(t)) {
        acc = mul(acc, this.power());
      } else {
        return acc;
      }
    }
  }

  private power(): Cx {
    const base = this.atom();
    if (this.peek()?.k !== "^") return base;
    this.pos += 1;
    let e: Cx;
    if (this.peek()?.k === "{") {
      this.pos += 1;
      e = this.expr();
      this.eat("}");
    } else {
      e = C((this.eat("num") as { k: "num"; v: number }).v);
    }
    const n = Math.round(e.re);
    if (Math.abs(e.im) > EPS || Math.abs(e.re - n) > EPS)
      this.fail("지수가 정수가 아니다");
    return pow(base, n);
  }

  private group(): Cx {
    this.eat("{");
    const v = this.expr();
    this.eat("}");
    return v;
  }

  private atom(): Cx {
    const t = this.peek();
    if (!t) this.fail("수가 와야 할 자리에서 끝났다");
    this.pos += 1;
    switch (t.k) {
      case "num":
        return C(t.v);
      case "i":
        return C(0, 1);
      case "var": {
        let name = t.v;
        if (this.peek()?.k === "_") {
          this.pos += 1;
          this.eat("{");
          name = `${name}_${(this.eat("num") as { k: "num"; v: number }).v}`;
          this.eat("}");
        }
        const v = this.env[name];
        if (!v) this.fail(`값을 모르는 문자 ${name}`);
        return v;
      }
      case "cmd":
        if (t.v === "sqrt") return csqrt(this.group());
        if (t.v === "overline") return conj(this.group());
        return div(this.group(), this.group());
      case "(": {
        const v = this.expr();
        this.eat(")");
        return v;
      }
      case "|": {
        this.absDepth += 1;
        const v = this.expr();
        this.absDepth -= 1;
        this.eat("|");
        if (Math.abs(v.im) > EPS) this.fail("복소수의 절댓값");
        return C(Math.abs(v.re));
      }
      default:
        return this.fail(`«${t.k}» 로 시작하는 수`);
    }
  }
}

function texValue(tex: string, env: Readonly<Record<string, Cx>> = {}): Cx {
  return new TexParser(tokenize(tex), env, tex).all();
}

// ───────────────────────────── 지면 읽기 ─────────────────────────────

const spans = (p: HighProblem): string[] => mathSpans(p.content);
const rhs = (span: string): string => span.slice(span.indexOf("=") + 1);
const lhs = (span: string): string => span.slice(0, span.indexOf("="));

function spanOf(p: HighProblem, re: RegExp): string {
  const s = spans(p).find((x) => re.test(x));
  if (s === undefined)
    throw new Error(`발문에 ${re} 조각이 없다: ${p.content}`);
  return s;
}

/**
 * `좌변=우변` 방정식을 x 의 이차 이하 다항식으로 읽는다 — x=0, ±1, 2 를 넣어 계수를 거꾸로 푼다.
 * 다른 문자는 `env` 로 준다. 삼차 이상이면(네 점이 안 맞으면) 던진다.
 */
function quadOf(
  eq: string,
  env: Readonly<Record<string, Cx>> = {},
): [number, number, number] {
  const f = (x: number): number => {
    const e = { ...env, x: C(x) };
    const hasEq = eq.includes("=");
    const v = hasEq
      ? sub(texValue(lhs(eq), e), texValue(rhs(eq), e))
      : texValue(eq, e);
    if (Math.abs(v.im) > EPS) throw new Error(`실계수 방정식이 아니다: ${eq}`);
    return v.re;
  };
  const c0 = f(0);
  const c1 = (f(1) - f(-1)) / 2;
  const c2 = (f(1) + f(-1)) / 2 - c0;
  if (Math.abs(c2 * 4 + c1 * 2 + c0 - f(2)) > 1e-6)
    throw new Error(`이차 이하가 아니다: ${eq}`);
  return [c0, c1, c2];
}

/** 계수 세 개를 맞대고 맞댄 횟수. */
function expectCoefs(
  got: readonly number[],
  want: readonly number[],
  what: string,
): number {
  const ok =
    got.length === want.length &&
    got.every((g, i) => Math.abs(g - want[i]!) <= 1e-6);
  expect(ok, `${what}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`).toBe(
    true,
  );
  return 1;
}

function expectNear(a: Cx, b: Cx, what: string): number {
  expect(
    near(a, b),
    `${what}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`,
  ).toBe(true);
  return 1;
}

// ───────────────────────────── 기대값 ─────────────────────────────

type Fact = Record<string, number>;
/** 수 · 다항식 · `…=0` 방정식(좌변 계수) 정답. */
type Expect = { vals: Cx[] } | { poly: number[] } | { eq: number[] };

const vals = (...xs: (number | Cx)[]): Expect => ({
  vals: xs.map((x) => (typeof x === "number" ? C(x) : x)),
});

function eachProblem(
  fn: (p: HighProblem, key: string, number: string) => void,
): void {
  for (const entry of H1_QUAD_EQ) {
    for (const seed of SEEDS) {
      for (let v = 0; v < VARIANTS; v += 1) {
        fn(generateHighProblem(entry.key, seed, v), entry.key, entry.rpmType);
      }
    }
  }
}

/** 이차 이하 계수 [c0, c1, c2] 의 판별식. */
const discOf = (c: readonly number[]): number =>
  c[1]! * c[1]! - 4 * c[2]! * c[0]!;

/** 한 변수 함수의 이차 이하 계수를 세 점으로 읽는다(네 번째 점으로 확인). */
function fit(g: (t: number) => number, what: string): [number, number, number] {
  const c0 = g(0);
  const c1 = (g(1) - g(-1)) / 2;
  const c2 = (g(1) + g(-1)) / 2 - c0;
  expect(
    Math.abs(c2 * 4 + c1 * 2 + c0 - g(2)),
    `${what}: 이차 이하가 아니다`,
  ).toBeLessThan(1e-6);
  return [c0, c1, c2];
}

function onlyOne(xs: number[], what: string): number {
  expect(
    xs.length,
    `${what}: 조건에 맞는 값이 하나가 아니다 (${xs.join(", ")})`,
  ).toBe(1);
  return xs[0]!;
}

/** 2×2 연립 [[a,b],[c,d]]·[x,y]=[e,f] — 크라메르. */
function solve2(
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
): [number, number] {
  const det = a * d - b * c;
  expect(Math.abs(det), "연립이 하나로 안 풀린다").toBeGreaterThan(EPS);
  return [(e * d - b * f) / det, (a * f - e * c) / det];
}

/** 발문의 단위 붙은 수 — `$16\,\mathrm{m}$` · `$9\,\%$`. */
const unitNums = (p: HighProblem): number[] =>
  spans(p)
    .map((s) => /^(\d+)\\,(?:\\mathrm|\\%)/.exec(s)?.[1])
    .filter((x): x is string => x !== undefined)
    .map(Number);

/** 08 — 근과 계수의 관계로 지은 식을 **근을 직접 넣어** 계산한다. */
function t08Value(f: Fact): Cx {
  if (f.mode === 2) {
    const rs = realRootsOf(1, -f.S!, f.P!);
    const [x, y] = [rs[0]!, rs[rs.length - 1]!];
    return f.ask === 0 ? C(Math.sqrt(x) + Math.sqrt(y)) : C(Math.abs(x - y));
  }
  const [al, be] =
    f.mode === 0 ? croots(1, -f.S!, f.P!) : croots(f.A!, f.B!, f.C!);
  const one = C(1);
  const two = C(2);
  if (f.mode === 0) {
    return [
      add(pow(al, 3), pow(be, 3)),
      add(pow(al, 2), pow(be, 2)),
      pow(sub(al, be), 2),
      add(mul(pow(al, 2), be), mul(al, pow(be, 2))),
      mul(add(al, one), add(be, one)),
    ][f.e!]!;
  }
  return [
    add(div(be, al), div(al, be)),
    add(div(one, al), div(one, be)),
    mul(sub(mul(two, al), one), sub(mul(two, be), one)),
    add(pow(al, 2), pow(be, 2)),
    add(div(one, add(one, al)), div(one, add(one, be))),
  ][f.e!]!;
}

const VERIFY_A: Record<string, (f: Fact, p: HighProblem) => Expect> = {
  "01": (f, p) => {
    if (f.mode === 0) return { vals: croots(f.A!, f.B!, f.C!) };
    if (f.mode === 1) {
      const [r1, r2] = croots(f.A!, f.B!, f.C!);
      const a = ((r1.re + r2.re) / 2) * 2 * f.A!;
      const root = f.A! * Math.hypot(r2.re - r1.re, r2.im - r1.im);
      return vals(a + root * root);
    }
    if (f.mode === 2) {
      const op = (a: number, b: number): number =>
        f.al! * a * b + f.be! * a + f.gm! * b;
      const [c0, c1, c2] = fit(
        (x) => op(x, x) - op(x, f.c!) - f.K!,
        "01 연산으로 세운 방정식",
      );
      const rs = realRootsOf(c2, c1, c0);
      expect(rs.length, "01 꼴 2: 실근이 둘").toBe(2);
      return vals(f.ask === 0 ? rs[0]! + rs[1]! : rs[0]! * rs[1]!);
    }
    const [c0, c1, c2] = quadOf(spans(p)[0]!);
    const rs = realRootsOf(c2, c1, c0);
    return vals(Math.abs(rs[1]! - rs[0]!));
  },
  "02": (f, p) => {
    if (f.mode === 0) {
      const eq = spanOf(p, /^kx\^\{2\}/);
      const g = (k: number, a: number, b: number): number =>
        texValue(lhs(eq), { k: C(k), x: C(f.r!), a: C(a), b: C(b) }).re;
      const row = (k: number): [number, number, number] => [
        g(k, 1, 0) - g(k, 0, 0),
        g(k, 0, 1) - g(k, 0, 0),
        -g(k, 0, 0),
      ];
      const [a1, b1, e1] = row(1);
      const [a2, b2, e2] = row(2);
      const [a, b] = solve2(a1, b1, a2, b2, e1, e2);
      return vals([a - b, a + b, a * b][f.ask!]!);
    }
    if (f.mode === 1) {
      const eq = spans(p)[0]!;
      const g = (k: number): number =>
        texValue(lhs(eq), { x: C(f.r!), k: C(k) }).re;
      const k0 = -g(0) / (g(1) - g(0));
      const [c0, c1, c2] = quadOf(eq, { k: C(k0) });
      const other = onlyOne(
        realRootsOf(c2, c1, c0).filter((x) => Math.abs(x - f.r!) > EPS),
        "02 다른 한 근",
      );
      return vals(k0 + other);
    }
    if (f.mode === 2) {
      const eq = spans(p)[0]!;
      const u = texValue(spans(p)[1]!);
      const g = (a: number): Cx => texValue(lhs(eq), { x: u, a: C(a) });
      return vals(-g(0).re / (g(1).re - g(0).re));
    }
    const [al, be] = croots(1, -f.p!, f.s!);
    const val = (z: Cx): Cx =>
      f.ask === 0
        ? f.s! > 0
          ? add(pow(z, 3), pow(z, -3))
          : sub(pow(z, 3), pow(z, -3))
        : add(pow(z, 2), pow(z, -2));
    expectNear(val(al), val(be), "02 두 근에서 값이 같아야 한다");
    return vals(val(al));
  },
  "03": (f) => {
    let xs: number[];
    if (f.mode === 0) {
      const hi = realRootsOf(1, f.s!, f.t! - f.s! * f.c!).filter(
        (x) => x >= f.c! - 1e-9,
      );
      const lo = realRootsOf(1, -f.s!, f.t! + f.s! * f.c!).filter(
        (x) => x < f.c! - 1e-9,
      );
      xs = [...lo, ...hi];
      return vals(xs.reduce((s, x) => s + x, 0));
    }
    if (f.mode === 1) {
      xs = [...realRootsOf(1, f.p!, -f.q!), ...realRootsOf(1, f.p!, f.q!)];
      return vals(xs.reduce((s, x) => s * x, 1));
    }
    const hi = realRootsOf(1, -f.a!, -f.b!).filter((x) => x >= 0);
    const lo = realRootsOf(1, f.a!, -f.b!).filter((x) => x < 0);
    return vals([...lo, ...hi].reduce((s, x) => s * x, 1));
  },
  "04": (f) => {
    if (f.mode === 0) {
      const x = onlyOne(
        realRootsOf(1, -(f.a! + f.b!), f.a! * f.b! - f.S!).filter(
          (t) => t > 0 && t < Math.min(f.a!, f.b!),
        ),
        "04 길의 폭",
      );
      return vals(x);
    }
    if (f.mode === 1) {
      const s = f.s!;
      const x = onlyOne(
        realRootsOf(
          s * f.k!,
          -2 * s * s * (f.k! + 1),
          4 * s ** 3 - f.V!,
        ).filter((t) => t > 2 * s),
        "04 종이의 세로",
      );
      return vals(f.k! * x * x);
    }
    if (f.variant === 0) return vals(Math.sqrt(100 * f.p!));
    return vals(
      onlyOne(
        realRootsOf(2, 100, -100 * f.p!).filter((t) => t > 0 && t < 50),
        "04 가격",
      ),
    );
  },
  "05": (f, p) => {
    if (f.mode === 0) {
      const ks: number[] = [];
      for (let k = -80; k <= 80; k += 1) {
        const D = f.b! * f.b! - 4 * (k + f.c!);
        if (
          (f.kind === 0 && D > 0) ||
          (f.kind === 1 && D < 0) ||
          (f.kind === 2 && D >= 0)
        )
          ks.push(k);
      }
      return vals(f.kind === 1 ? Math.min(...ks) : Math.max(...ks));
    }
    if (f.mode === 1) {
      let n = 0;
      for (let m = 1; m <= 300; m += 1)
        if ((m + f.B!) ** 2 - (m * m + f.A!) < 0) n += 1;
      return vals(n);
    }
    if (f.mode === 2) {
      const eq = spans(p)[0]!;
      const [d0, d1, d2] = fit(
        (k) => discOf(quadOf(eq, { k: C(k) })),
        "05 판별식",
      );
      const ks = realRootsOf(d2, d1, d0);
      expect(ks.length, "05 꼴 2: 중근이 되는 k 가 둘").toBe(2);
      return vals(ks[0]! + ks[1]!);
    }
    const a = -f.c! / 2;
    const b = a * a;
    return vals([a + b, a * b][f.ask!]!);
  },
  "06": (f, p) => {
    const [e1, e2] = [
      spanOf(p, /-a=0$/),
      spans(p).find((s) => /^\d*x\^\{2\}-ax/.test(s))!,
    ];
    if (f.mode === 0) {
      const [d0, d1, d2] = fit(
        (a) => discOf(quadOf(e1, { a: C(a) })),
        "06 앞 방정식의 판별식",
      );
      const a0 = onlyOne(
        realRootsOf(d2, d1, d0).filter((a) => a > 0),
        "06 a",
      );
      return vals(discOf(quadOf(e2, { a: C(a0) })));
    }
    const e2b = spans(p).find((s) => /^x\^\{2\}.*-\(a/.test(s))!;
    const imag = f.imag === 1;
    const Ds: number[] = [];
    for (let a = -80; a <= 80; a += 1) {
      const d1 = discOf(quadOf(e1, { a: C(a) }));
      if (imag ? d1 < 0 : d1 > 0) Ds.push(discOf(quadOf(e2b, { a: C(a) })));
    }
    for (const D of Ds)
      expect(imag ? D < 0 : D > 0, "06 판별이 정해지지 않는다").toBe(true);
    return vals(imag ? Math.max(...Ds) : Math.min(...Ds));
  },
  "07": (f, p) => {
    const expr = spanOf(p, /x\^\{2\}/);
    if (f.mode === 0) {
      const [d0, d1] = fit(
        (k) => discOf(quadOf(expr, { k: C(k) })),
        "07 판별식",
      );
      const k0 = -d0 / d1;
      expect(
        Math.abs(quadOf(expr, { k: C(k0) })[2]),
        "07 이차식이어야 한다",
      ).toBeGreaterThan(EPS);
      return vals(k0);
    }
    if (f.mode === 1) return vals([1 + 2 * f.p!, 2 * f.p!][f.ask!]!);
    const [d0, d1, d2] = fit(
      (m) => discOf(quadOf(expr, { m: C(m) })),
      "07 판별식",
    );
    const m0 = onlyOne(
      realRootsOf(d2, d1, d0).filter((m) => m > 0),
      "07 m",
    );
    const c = quadOf(expr, { m: C(m0) });
    return vals(m0 + -c[1] / 2);
  },
  "08": (f) => vals(t08Value(f)),
};

const SHOWN_A: Record<string, (f: Fact, p: HighProblem) => number> = {
  "01": (f, p) => {
    if (f.mode === 0)
      return expectCoefs(quadOf(spans(p)[0]!), [f.C!, f.B!, f.A!], "01 방정식");
    if (f.mode === 1) {
      const form = spanOf(p, /^x=\\dfrac\{a/);
      expect(Number(/\{(\d+)\}$/.exec(form)?.[1]), "01 해의 분모").toBe(
        2 * f.A!,
      );
      return (
        1 + expectCoefs(quadOf(spans(p)[0]!), [f.C!, f.B!, f.A!], "01 방정식")
      );
    }
    if (f.mode === 2) {
      const def = rhs(spanOf(p, /\\odot b=/));
      const [a, b] = [1.3, -0.7];
      const n = expectNear(
        texValue(def, { a: C(a), b: C(b) }),
        C(f.al! * a * b + f.be! * a + f.gm! * b),
        "01 연산의 정의",
      );
      const m = /\\odot \(?(-?\d+)\)?\)=(-?\d+)$/.exec(
        spanOf(p, /\(x\\odot x\)/),
      );
      expect([Number(m?.[1]), Number(m?.[2])], "01 연산 등식의 수").toEqual([
        f.c,
        f.K,
      ]);
      return n + 1;
    }
    const [c0, c1, c2] = quadOf(spans(p)[0]!);
    const got = realRootsOf(c2, c1, c0).map((x) => C(x));
    const want = [f.p1!, f.p2!].map((t) => C(Math.sqrt(f.m!) + t));
    expect(sameValues(got, want, 1e-6), `01 근이 √m+p 가 아니다`).toBe(true);
    return 1;
  },
  "02": (f, p) => {
    if (f.mode === 0) {
      let n = expectNear(
        texValue(rhs(spanOf(p, /^x=-?\d+$/))),
        C(f.r!),
        "02 근",
      );
      const eq = spanOf(p, /^kx\^\{2\}/);
      const [a, b] = [f.m! * f.r!, -f.r! * f.r!];
      for (const k of [3, -2]) {
        n += expectNear(
          texValue(lhs(eq), { k: C(k), x: C(f.r!), a: C(a), b: C(b) }),
          C(0),
          "02 k 에 관계없이",
        );
      }
      return n;
    }
    if (f.mode === 1) {
      const eq = spans(p)[0]!;
      let n = expectNear(texValue(spans(p)[1]!), C(f.r!), "02 한 근");
      n += expectCoefs(quadOf(eq, { k: C(0) }), [0, f.p!, 1], "02 k=0");
      return (
        n + expectCoefs(quadOf(eq, { k: C(1) }), [f.qd!, 1 + f.p!, 1], "02 k=1")
      );
    }
    if (f.mode === 2) {
      const eq = spans(p)[0]!;
      let n = expectNear(
        texValue(spans(p)[1]!),
        C(f.p! + Math.sqrt(f.m!)),
        "02 한 근",
      );
      n += expectNear(
        C(quadOf(eq, { a: C(0) })[0]),
        C(f.c0! + f.c1! * Math.sqrt(f.m!)),
        "02 상수항",
      );
      return n;
    }
    return expectCoefs(quadOf(spans(p)[0]!), [f.s!, -f.p!, 1], "02 방정식");
  },
  "03": (f, p) => {
    const eq = spans(p)[0]!;
    const want = (x: number): number =>
      f.mode === 0
        ? x * x + f.s! * Math.abs(x - f.c!) + f.t!
        : f.mode === 1
          ? Math.abs(x * x + f.p! * x) - f.q!
          : x * x - f.a! * Math.abs(x) - f.b!;
    let n = 0;
    for (const x of [-3.3, 0.4, 2.7, (f.c ?? 0) - 0.5, (f.c ?? 0) + 0.5]) {
      const got = sub(
        texValue(lhs(eq), { x: C(x) }),
        texValue(rhs(eq), { x: C(x) }),
      );
      n += expectNear(got, C(want(x)), `03 방정식 x=${x}`);
    }
    return n;
  },
  "04": (f, p) => {
    const got = unitNums(p);
    const want =
      f.mode === 0 ? [f.a!, f.b!, f.S!] : f.mode === 1 ? [f.s!, f.V!] : [f.p!];
    for (const w of want) expect(got, `04 발문에 ${w} 가 없다`).toContain(w);
    return want.length;
  },
  "05": (f, p) => {
    // 「$x$에 대한 …」 으로 시작하는 발문은 첫 조각이 `x` 다 — `=0` 으로 끝나는 조각을 잡는다.
    const eq = spanOf(p, /=0$/);
    if (f.mode === 0)
      return expectCoefs(quadOf(eq, { k: C(0) }), [f.c!, f.b!, 1], "05 k=0");
    if (f.mode === 1)
      return expectCoefs(
        quadOf(eq, { m: C(2) }),
        [1, 2 * (2 + f.B!), 4 + f.A!],
        "05 m=2",
      );
    if (f.mode === 2) {
      const pp = f.p!;
      const n = expectCoefs(
        quadOf(eq, { k: C(0) }),
        [pp * pp + f.r!, -2 * pp, 1],
        "05 k=0",
      );
      return (
        n +
        expectCoefs(
          quadOf(eq, { k: C(1) }),
          [pp * pp + f.q! + f.r!, -2 * pp - 2, 1],
          "05 k=1",
        )
      );
    }
    // 답 a, b 를 넣으면 k 에 관계없이 판별식이 0 이어야 한다
    const a = -f.c! / 2;
    let n = 0;
    for (const k of [-2, 0, 3]) {
      const d = discOf(quadOf(eq, { k: C(k), a: C(a), b: C(a * a) }));
      expect(Math.abs(d), `05 k=${k} 에서 중근이 아니다`).toBeLessThan(1e-6);
      n += 1;
    }
    return n;
  },
  "06": (f, p) => {
    const e1 = spanOf(p, /-a=0$/);
    if (f.mode === 0) {
      const e2 = spans(p).find((s) => /^\d*x\^\{2\}-ax/.test(s))!;
      const n = expectCoefs(
        quadOf(e1, { a: C(1) }),
        [f.c! - 1, 1, 1],
        "06 앞 방정식",
      );
      return (
        n +
        expectCoefs(
          quadOf(e2, { a: C(2) }),
          [2 + f.Q!, -2, f.P!],
          "06 뒤 방정식",
        )
      );
    }
    const e2 = spans(p).find((s) => /^x\^\{2\}.*-\(a/.test(s))!;
    const n = expectCoefs(
      quadOf(e1, { a: C(1) }),
      [-1, 2 * f.p!, 1],
      "06 앞 방정식",
    );
    return (
      n +
      expectCoefs(
        quadOf(e2, { a: C(1) }),
        [-(1 + f.r!), f.q!, 1],
        "06 뒤 방정식",
      )
    );
  },
  "07": (f, p) => {
    const expr = spanOf(p, /x\^\{2\}/);
    if (f.mode === 0)
      return expectCoefs(
        quadOf(expr, { k: C(2) }),
        [2 + f.c!, 4 + f.b!, 2 + f.a!],
        "07 k=2",
      );
    if (f.mode === 1) {
      let n = 0;
      for (const k of [-3, 0, 2, 5]) {
        const d = discOf(quadOf(expr, { k: C(k), a: C(1), b: C(2 * f.p!) }));
        expect(Math.abs(d), `07 k=${k} 에서 완전제곱식이 아니다`).toBeLessThan(
          1e-6,
        );
        n += 1;
      }
      return n;
    }
    return expectCoefs(
      quadOf(expr, { m: C(1) }),
      [f.P! + f.Q!, -1, 1],
      "07 m=1",
    );
  },
  "08": (f, p) => {
    const want = f.mode === 1 ? [f.C!, f.B!, f.A!] : [f.P!, -f.S!, 1];
    let n = expectCoefs(quadOf(spans(p)[0]!), want, "08 방정식");
    const all = spans(p);
    const target = all[all.length - 1]!;
    const [al, be] =
      f.mode === 2
        ? realRootsOf(1, -f.S!, f.P!).map((x) => C(x))
        : f.mode === 0
          ? croots(1, -f.S!, f.P!)
          : croots(f.A!, f.B!, f.C!);
    n += expectNear(
      texValue(target, { alpha: al!, beta: be ?? al! }),
      t08Value(f),
      "08 식",
    );
    return n;
  },
};

/** 방정식 조각에서 이차 이하 계수 [c0,c1,c2] 로 두 근의 합·곱. */
const sumProd = (c: readonly number[]): [number, number] => [
  -c[1]! / c[2]!,
  c[0]! / c[2]!,
];

/** 정수 후보 가운데 조건을 만족시키는 것. */
function scanInts(
  lo: number,
  hi: number,
  ok: (k: number) => boolean,
): number[] {
  const out: number[] = [];
  for (let k = lo; k <= hi; k += 1) if (ok(k)) out.push(k);
  return out;
}

const isInt = (x: number): boolean => Math.abs(x - Math.round(x)) <= 1e-7;

/** 3×3 대칭 행렬식 — 이차식 Ax²+Bxy+Cy²+Dx+Ey+F 가 두 일차식의 곱 ⇔ 이 값이 0. */
const conicDet = (
  A: number,
  B: number,
  Cy: number,
  D: number,
  E: number,
  F: number,
): number =>
  2 * A * (4 * Cy * F - E * E) -
  B * (2 * B * F - D * E) +
  D * (B * E - 2 * Cy * D);

/** 13 꼴 0 — 새 두 근. */
function t13Pair(f: Fact): [Cx, Cx] {
  const [al, be] = croots(1, -f.S!, f.P!);
  const k = C(f.k!);
  if (f.kind === 0) return [sub(k, al), sub(k, be)];
  if (f.kind === 1) return [mul(k, al), mul(k, be)];
  return [add(al, k), add(be, k)];
}

/** 두 근 → 최고차항 계수가 lead 인 방정식의 계수(정수로 반올림하되 정수가 아니면 던진다). */
function eqFromRoots(r1: Cx, r2: Cx, lead = 1): number[] {
  const s = add(r1, r2);
  const pr = mul(r1, r2);
  const c = [lead * pr.re, -lead * s.re, lead];
  expect(Math.abs(s.im) + Math.abs(pr.im), "근이 켤레가 아니다").toBeLessThan(
    1e-6,
  );
  for (const x of c)
    expect(isInt(x), `방정식 계수가 정수가 아니다: ${c.join(",")}`).toBe(true);
  return c.map(Math.round);
}

const VERIFY_B: Record<string, (f: Fact, p: HighProblem) => Expect> = {
  "09": (f, p) => {
    const [al, be] =
      f.mode === 0 ? croots(1, f.p!, f.q!) : croots(1, -f.S!, f.P!);
    if (f.mode === 0) {
      const g = (z: Cx): Cx => add(add(pow(z, 2), mul(C(f.u!), z)), C(f.v!));
      return vals(mul(g(al), g(be)));
    }
    if (f.mode === 1) {
      // d₂ 는 facts 에 없다 — 지면의 식을 근에 넣고, 두 근을 바꿔 넣어도 같은지(대칭식인지) 본다.
      const all = spans(p);
      const target = all[all.length - 1]!;
      const v1 = texValue(target, { alpha: al, beta: be });
      expectNear(
        texValue(target, { alpha: be, beta: al }),
        v1,
        "09 대칭식이 아니다",
      );
      return vals(v1);
    }
    const den = (z: Cx): Cx =>
      add(sub(pow(z, 2), mul(C(f.S! - f.k!), z)), C(f.P!));
    return vals(add(div(be, den(al)), div(al, den(be))));
  },
  "10": (f, p) => {
    const eq = spans(p)[0]!;
    if (f.mode === 0) {
      const [g0, g1, g2] = fit(
        (k) => discOf(quadOf(eq, { k: C(k) })) - f.N!,
        "10 (α−β)²",
      );
      return vals(
        onlyOne(
          realRootsOf(g2, g1, g0).filter((k) => k > 0),
          "10 양수 k",
        ),
      );
    }
    if (f.mode === 1) {
      const h = (k: number): number => {
        const [S, P] = sumProd(quadOf(eq, { k: C(k) }));
        return S * (P + 1) - f.N!;
      };
      const [h0, h1, h2] = fit(h, "10 (α+β)(αβ+1)");
      return vals(
        onlyOne(
          realRootsOf(h2, h1, h0).filter(isInt).map(Math.round),
          "10 정수 k",
        ),
      );
    }
    const ks = scanInts(-120, 40, (k) => {
      const c = quadOf(eq, { k: C(k) });
      if (discOf(c) <= EPS) return false;
      const rs = realRootsOf(c[2], c[1], c[0]);
      return Math.abs(Math.abs(rs[0]!) + Math.abs(rs[1]!) - f.N!) <= 1e-7;
    });
    return vals(onlyOne(ks, "10 |α|+|β|"));
  },
  "11": (f, p) => {
    if (f.mode === 0) {
      const eq = spans(p)[0]!;
      const [pp, qq] = [f.p!, f.q!];
      // 두 근의 비가 p:q ⇔ (p r₂ − q r₁)(p r₁ − q r₂) = pq(S²−2P) − (p²+q²)P = 0
      const h = (k: number): number => {
        const [S, P] = sumProd(quadOf(eq, { k: C(k) }));
        return pp * qq * (S * S - 2 * P) - (pp * pp + qq * qq) * P;
      };
      const [h0, h1, h2] = fit(h, "11 비");
      const ks = realRootsOf(h2, h1, h0);
      expect(ks.length, "11 꼴 0: k 가 둘").toBe(2);
      for (const k of ks) {
        const c = quadOf(eq, { k: C(k) });
        const [r1, r2] = croots(c[2], c[1], c[0]);
        const ratioOk =
          near(mul(C(qq), r1), mul(C(pp), r2), 1e-5) ||
          near(mul(C(qq), r2), mul(C(pp), r1), 1e-5);
        expect(
          ratioOk,
          `11 k=${k} 에서 두 근의 비가 ${pp}:${qq} 가 아니다`,
        ).toBe(true);
      }
      return vals(ks[0]! + ks[1]!);
    }
    if (f.mode === 1) {
      const e1 = spanOf(p, /m\^\{2\}/);
      const e2 = spans(p).find((s) => s !== e1 && /=0$/.test(s))!;
      const [g0, g1, g2] = fit(
        (m) => discOf(quadOf(e1, { m: C(m) })) - f.d! * f.d!,
        "11 두 근의 차",
      );
      const ms = realRootsOf(g2, g1, g0).filter((m) =>
        f.cz === 0 ? Math.abs(m) > EPS : m > EPS,
      );
      const m0 = onlyOne(ms, "11 m");
      const [, P] = sumProd(quadOf(e2, { m: C(m0) }));
      return vals(P);
    }
    if (f.mode === 2) {
      const eq = spans(p)[0]!;
      const ms = scanInts(-30, 40, (m) => {
        const c = quadOf(eq, { m: C(m) });
        const rs = realRootsOf(c[2], c[1], c[0]);
        return (
          rs.length === 2 &&
          rs.every((r) => isInt(r) && r >= 1 - EPS) &&
          Math.abs(rs[1]! - rs[0]! - 1) <= 1e-7
        );
      });
      return vals(onlyOne(ms, "11 연속인 자연수"));
    }
    const eq = spanOf(p, /=0$/);
    const [s0, s1, s2] = fit((m) => quadOf(eq, { m: C(m) })[1], "11 x 의 계수");
    const ms = realRootsOf(s2, s1, s0).filter((m) => {
      const [, P] = sumProd(quadOf(eq, { m: C(m) }));
      return P < -EPS;
    });
    return vals(onlyOne(ms, "11 절댓값이 같고 부호가 다름"));
  },
  "12": (f) => {
    if (f.mode === 0) {
      const found: [number, number][] = [];
      for (let a = -12; a <= 12; a += 1) {
        for (let b = -12; b <= 12; b += 1) {
          // 두 근을 **중복집합으로** 맞댄다 — 한 근씩 대입만 보면 중근일 때 조건이 하나로 줄어
          // 가짜 (a, b) 가 끼어든다(실측으로 걸렸다).
          const [al, be] = croots(1, a, b);
          const shifted = [add(al, C(f.t!)), add(be, C(f.t!))];
          if (sameValues(croots(1, b, a), shifted, 1e-7)) found.push([a, b]);
        }
      }
      expect(found.length, "12 a, b 가 하나로 정해져야 한다").toBe(1);
      const [a, b] = found[0]!;
      return vals([a * b, a - b, a * a + b * b][f.ask!]!);
    }
    if (f.mode === 1) {
      const found: [number, number][] = [];
      for (let a = -40; a <= 40; a += 1) {
        for (let b = -40; b <= 40; b += 1) {
          // x²+bx+Q=0 의 두 근이 α+β=a, αβ=P
          if (a + f.P! === -b && a * f.P! === f.Q!) found.push([a, b]);
        }
      }
      expect(found.length, "12 a, b 가 하나로 정해져야 한다").toBe(1);
      const [a, b] = found[0]!;
      return vals([a - b, a * b][f.ask!]!);
    }
    const [al, be] = croots(1, f.p!, f.P!);
    const sg = C(f.sg!);
    const r1 = add(al, div(sg, al));
    const r2 = add(be, div(sg, be));
    const a = neg(add(r1, r2));
    const b = mul(r1, r2);
    return vals(add(a, b));
  },
  "13": (f, p) => {
    if (f.mode === 0) {
      const [r1, r2] = t13Pair(f);
      return { eq: eqFromRoots(r1, r2) };
    }
    const [al, be] =
      f.mode === 2 ? croots(f.A!, f.B!, f.C!) : croots(1, -f.S!, f.P!);
    if (f.mode === 1) {
      const c = eqFromRoots(pow(al, 2), pow(be, 2));
      const [a, b] = [c[1]!, c[0]!];
      return vals([a + b, a * b, a - b][f.ask!]!);
    }
    if (f.mode === 2) {
      const lead = Number(
        /^(\d*)x\^\{2\}\+ax\+b=0$/.exec(spanOf(p, /\+ax\+b=0$/))?.[1] || 1,
      );
      const c = eqFromRoots(
        add(al, div(C(1), be)),
        add(be, div(C(1), al)),
        lead,
      );
      return vals(c[1]! + c[0]!);
    }
    const z = C(f.p!, f.q!);
    const m = neg(add(z, conj(z))).re;
    const n = mul(z, conj(z)).re;
    const all = spans(p);
    const L = Number(all[all.indexOf("x^{2}", 1) + 1]);
    return { eq: eqFromRoots(C(1 / m), C(n), L) };
  },
  "14": (f) => {
    if (f.mode === 0) {
      const u = f.p! + f.q! * Math.sqrt(f.m!);
      const ub = f.p! - f.q! * Math.sqrt(f.m!);
      const a = -(u + ub);
      const b = (u * ub) / f.k!;
      return vals([a - b, a + b, a * b][f.ask!]!);
    }
    if (f.mode === 1) {
      const z = div(C(f.c!), C(f.u!, -f.v!));
      const a = neg(add(z, conj(z)));
      const b = mul(z, conj(z));
      const t = C(f.t!);
      return vals(add(add(pow(t, 2), mul(a, t)), b));
    }
    const u = f.k! / (f.w! - Math.sqrt(f.m!));
    const d = f.w! * f.w! - f.m!;
    const ub = (f.k! * f.w!) / d - (f.k! / d) * Math.sqrt(f.m!);
    return vals(-(u + ub) + u * ub);
  },
  "15": (f) => {
    if (f.mode === 0) {
      // det 은 F 에 대해 일차 — F=0, 1 을 넣어 푼다. 답 k = −F.
      const g = (F: number): number => conicDet(1, f.B!, f.C!, f.D!, f.E!, F);
      return vals(-(-g(0) / (g(1) - g(0))));
    }
    const g = (Cy: number): number =>
      conicDet(f.A!, f.B!, Cy, f.D!, f.E!, f.F!);
    return vals(-g(0) / (g(1) - g(0)));
  },
  "16": (f) => {
    if (f.mode === 0) {
      const P = f.r1! * f.r2!;
      const S = f.irr === 1 ? 2 * f.h! : f.s1! + f.s2!;
      const rs = realRootsOf(1, -S, P);
      return vals(f.big === 1 ? Math.max(...rs) : Math.min(...rs));
    }
    // 잘못 적용한 공식을 실제로 돌려 본다: a=1, b=−(r₁+r₂), c=4r₁r₂ 이면 두 근이 r₁, r₂ 여야 한다.
    const b = -(f.r1! + f.r2!);
    const c = 4 * f.r1! * f.r2!;
    const w = Math.sqrt(b * b - c);
    expect(
      sameValues(
        [C((-b - w) / 2), C((-b + w) / 2)],
        [C(f.r1!), C(f.r2!)],
        1e-9,
      ),
      "16 잘못 적용한 공식이 발문의 두 근을 안 낸다",
    ).toBe(true);
    const rs = realRootsOf(1, b, c);
    return vals(f.big === 1 ? Math.max(...rs) : Math.min(...rs));
  },
  "17": (f) => {
    if (f.mode === 1) {
      const [al, be] = [2.3, f.P! / 2.3];
      return vals((al / f.a!) * (be / f.a!));
    }
    const [al, be] =
      f.mode === 0 ? [C(1.7), C(f.S! - 1.7)] : croots(1, -f.S!, f.P!);
    const x1 = div(sub(al, C(f.b!)), C(f.a!));
    const x2 = div(sub(be, C(f.b!)), C(f.a!));
    // f(ax+b) 의 근이 맞는지 — f(t)=(t−α)(t−β) 에 넣어 0
    const fOf = (t: Cx): Cx => mul(sub(t, al), sub(t, be));
    for (const x of [x1, x2])
      expectNear(fOf(add(mul(C(f.a!), x), C(f.b!))), C(0), "17 f(ax+b) 의 근");
    return vals(f.mode === 0 ? add(x1, x2) : mul(x1, x2));
  },
};

const SHOWN_B: Record<string, (f: Fact, p: HighProblem) => number> = {
  "09": (f, p) => {
    const eq = spans(p)[0]!;
    if (f.mode === 0) {
      const n = expectCoefs(quadOf(eq), [f.q!, f.p!, 1], "09 방정식");
      const all = spans(p);
      const [al, be] = croots(1, f.p!, f.q!);
      const g = (z: Cx): Cx => add(add(pow(z, 2), mul(C(f.u!), z)), C(f.v!));
      return (
        n +
        expectNear(
          texValue(all[all.length - 1]!, { alpha: al, beta: be }),
          mul(g(al), g(be)),
          "09 식",
        )
      );
    }
    let n = expectCoefs(quadOf(eq), [f.P!, -f.S!, 1], "09 방정식");
    const all = spans(p);
    const target = all[all.length - 1]!;
    if (f.mode === 1) {
      n += expectNear(
        texValue(target, { alpha: C(0), beta: C(0) }),
        C(f.e!),
        "09 상수항",
      );
      n += expectNear(
        texValue(target, { alpha: C(1), beta: C(0) }),
        C(f.c1! + f.d1! + f.e!),
        "09 α 의 계수",
      );
      return n;
    }
    const [al, be] = croots(1, -f.S!, f.P!);
    const den = (z: Cx): Cx =>
      add(sub(pow(z, 2), mul(C(f.S! - f.k!), z)), C(f.P!));
    return (
      n +
      expectNear(
        texValue(target, { alpha: al, beta: be }),
        add(div(be, den(al)), div(al, den(be))),
        "09 식",
      )
    );
  },
  "10": (f, p) => {
    const eq = spans(p)[0]!;
    if (f.mode === 2) {
      const n = expectCoefs(quadOf(eq, { k: C(0) }), [0, f.p!, 1], "10 방정식");
      return (
        n +
        expectNear(texValue(rhs(spanOf(p, /^\|\\alpha\|/))), C(f.N!), "10 N")
      );
    }
    const want = f.mode === 0 ? [f.b!, -f.a!, 1] : [f.r!, -f.q!, 1];
    const n = expectCoefs(quadOf(eq, { k: C(0) }), want, "10 방정식");
    return (
      n +
      expectNear(
        texValue(rhs(spanOf(p, /^\(\\alpha-\\beta\)|^\\alpha\^\{2\}\\beta/))),
        C(f.N!),
        "10 N",
      )
    );
  },
  "11": (f, p) => {
    if (f.mode === 0) {
      const n = expectCoefs(
        quadOf(spans(p)[0]!, { k: C(0) }),
        [0, -f.a!, 1],
        "11 방정식",
      );
      expect(spanOf(p, /^\d+:\d+$/), "11 비").toBe(`${f.p}:${f.q}`);
      return n + 1;
    }
    if (f.mode === 1) {
      const e1 = spanOf(p, /m\^\{2\}/);
      const e2 = spans(p).find((s) => s !== e1 && /=0$/.test(s))!;
      const n = expectCoefs(
        quadOf(e1, { m: C(0) }),
        [f.v!, f.P!, 1],
        "11 앞 방정식",
      );
      const c = quadOf(e2, { m: C(1) });
      expect([c[0], c[2]], "11 뒤 방정식").toEqual([f.C2! + f.E!, f.A!]);
      return n + 1;
    }
    if (f.mode === 2)
      return expectCoefs(
        quadOf(spans(p)[0]!, { m: C(0) }),
        [f.c!, 0, 1],
        "11 방정식",
      );
    return expectCoefs(
      quadOf(spanOf(p, /=0$/), { m: C(0) }),
      [f.z!, f.v!, f.A!],
      "11 방정식",
    );
  },
  "12": (f, p) => {
    if (f.mode === 0) {
      const at = spanOf(p, /^\\alpha[+-]\d+$/);
      return expectNear(texValue(at, { alpha: C(0) }), C(f.t!), "12 α+t");
    }
    if (f.mode === 1) {
      const n = expectCoefs(
        quadOf(spanOf(p, /-ax/), { a: C(0) }),
        [f.P!, 0, 1],
        "12 앞 방정식",
      );
      return (
        n +
        expectCoefs(
          quadOf(spanOf(p, /\+bx/), { b: C(0) }),
          [f.Q!, 0, 1],
          "12 뒤 방정식",
        )
      );
    }
    const n = expectCoefs(quadOf(spans(p)[0]!), [f.P!, f.p!, 1], "12 방정식");
    const r1 = spanOf(p, /^\\alpha[+-]\\dfrac/);
    return (
      n +
      expectNear(texValue(r1, { alpha: C(2) }), C(2 + f.sg! / 2), "12 새 근")
    );
  },
  "13": (f, p) => {
    if (f.mode === 3)
      return expectNear(texValue(spans(p)[1]!), C(f.p!, f.q!), "13 허근");
    const want = f.mode === 2 ? [f.C!, f.B!, f.A!] : [f.P!, -f.S!, 1];
    let n = expectCoefs(quadOf(spans(p)[0]!), want, "13 방정식");
    if (f.mode === 0) {
      const [r1t, r2t] = [spans(p)[3]!, spans(p)[4]!];
      const env = { alpha: C(2.5), beta: C(-1.5) };
      const k = f.k!;
      const f1 = [k - 2.5, k * 2.5, 2.5 + k][f.kind!]!;
      const f2 = [k + 1.5, k * -1.5, -1.5 + k][f.kind!]!;
      n += expectNear(texValue(r1t, env), C(f1), "13 새 근 1");
      n += expectNear(texValue(r2t, env), C(f2), "13 새 근 2");
    }
    return n;
  },
  "14": (f, p) => {
    if (f.mode === 0) {
      const n = expectNear(
        texValue(spans(p)[1]!),
        C(f.p! + f.q! * Math.sqrt(f.m!)),
        "14 한 근",
      );
      return (
        n +
        expectCoefs(
          quadOf(spans(p)[0]!, { a: C(0), b: C(1) }),
          [f.k!, 0, 1],
          "14 방정식",
        )
      );
    }
    if (f.mode === 1) {
      const n = expectNear(
        texValue(spanOf(p, /^\\dfrac\{\d+\}\{/)),
        div(C(f.c!), C(f.u!, -f.v!)),
        "14 한 근",
      );
      return (
        n +
        expectNear(
          texValue(spanOf(p, /^x[+-]\d+$/), { x: C(0) }),
          C(-f.t!),
          "14 나누는 식",
        )
      );
    }
    return expectNear(
      texValue(spanOf(p, /^\\dfrac/)),
      C(f.k! / (f.w! - Math.sqrt(f.m!))),
      "14 한 근",
    );
  },
  "15": (f, p) => {
    const expr = spanOf(p, /x\^\{2\}/);
    let n = 0;
    for (const [x, y] of [
      [0.7, -1.3],
      [2.1, 0.4],
    ] as const) {
      const got = texValue(expr, { x: C(x), y: C(y), k: C(0), a: C(0) });
      const want =
        f.mode === 0
          ? x * x + f.B! * x * y + f.C! * y * y + f.D! * x + f.E! * y
          : f.A! * x * x + f.B! * x * y + f.D! * x + f.E! * y + f.F!;
      n += expectNear(got, C(want), "15 이차식");
    }
    return n;
  },
  "16": (f, p) => {
    const nums = spans(p)
      .map((s) => {
        try {
          return texValue(s);
        } catch {
          return null;
        }
      })
      .filter((v): v is Cx => v !== null);
    const has = (x: number): boolean => nums.some((v) => near(v, C(x)));
    const want = [f.r1!, f.r2!];
    if (f.mode === 0) {
      if (f.irr === 1)
        want.push(f.h! + Math.sqrt(f.m!), f.h! - Math.sqrt(f.m!));
      else want.push(f.s1!, f.s2!);
    }
    for (const w of want) expect(has(w), `16 발문에 ${w} 가 없다`).toBe(true);
    return want.length;
  },
  "17": (f, p) => {
    // `f(x)=0` 이 아닌 쪽 — `f(3x+1)=0` · `f(2x)=0`
    const inner = /^f\((.+)\)=0$/.exec(spanOf(p, /^f\((?!x\)).+\)=0$/))?.[1];
    expect(inner, `17 f(ax+b) 가 없다: ${p.content}`).toBeDefined();
    const a = f.a!;
    const b = f.mode === 1 ? 0 : f.b!;
    let n = expectNear(
      texValue(inner!, { x: C(0) }),
      C(b),
      "17 안쪽 식 상수항",
    );
    n += expectNear(
      texValue(inner!, { x: C(1) }),
      C(a + b),
      "17 안쪽 식 기울기",
    );
    const shown = spans(p)
      .filter((s) => /^-?\d+$/.test(s))
      .map(Number);
    const want = f.mode === 0 ? [f.S!] : f.mode === 1 ? [f.P!] : [];
    for (const w of want) expect(shown, `17 발문에 ${w} 가 없다`).toContain(w);
    return n + want.length;
  },
};

const VERIFY: Record<string, (f: Fact, p: HighProblem) => Expect> = {
  ...VERIFY_A,
  ...VERIFY_B,
};
const SHOWN: Record<string, (f: Fact, p: HighProblem) => number> = {
  ...SHOWN_A,
  ...SHOWN_B,
};

/** 수식 한 덩어리를 기대값과 맞댄다 — 오답에도 같은 자를 대어 «값이 정답과 같은 오답»을 막는다. */
function matches(tex: string, want: Expect): boolean {
  const body = /^\$(.+)\$$/.exec(tex.trim())?.[1];
  if (body === undefined) throw new Error(`수식 한 덩어리가 아니다: ${tex}`);
  if ("vals" in want) return sameValues(readAnswerValues(tex), want.vals, EPS);
  if ("eq" in want) {
    const m = /^(.+)=0$/.exec(body);
    const pp = m ? parsePolyTex(m[1]!) : null;
    return pp !== null && pkey(pp) === pkey(want.eq);
  }
  const pp = parsePolyTex(body);
  return pp !== null && pkey(pp) === pkey(want.poly);
}

// ───────────────────────────── 시험 ─────────────────────────────

describe("고등 공통수학1 이차방정식 — 등록", () => {
  it("색인 17유형을 전부 등록했고 번호·제목·중단원이 색인 바이트와 같다", () => {
    expect(catalogRows.length, "색인 유형 수").toBe(17);
    expect(H1_QUAD_EQ.length + H1_QUAD_EQ_HOLD.length).toBe(catalogRows.length);
    for (const e of H1_QUAD_EQ) {
      const row = catalogRows.find((t) => t.number === e.rpmType);
      expect(row, `${e.key}: 색인에 없는 번호`).toBeDefined();
      expect(e.rpmTitle, `${e.key} 제목`).toBe(row!.title);
      expect(e.rpmMinor).toBe(MINOR);
      expect(e.rpmBook).toBe(BOOK);
      expect(e.grade).toBe(BOOK);
      expect(e.key).toBe(`${BOOK}|${MINOR}|${e.rpmType}`);
    }
  });

  it("유형의 단원은 교육과정 시드에 실제로 있는 이름이다", () => {
    const sections = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === BOOK).map((u) => u.section),
    );
    for (const e of H1_QUAD_EQ) {
      expect(sections.has(e.unitSection), `${e.key} — ${e.unitSection}`).toBe(
        true,
      );
    }
  });

  it("등록부에 들어 있다", () => {
    const keys = new Set(registeredHighTypes().map((e) => e.key));
    for (const e of H1_QUAD_EQ) expect(keys.has(e.key)).toBe(true);
  });
});

describe("고등 공통수학1 이차방정식 — 지면(공용 자의 사각지대)", () => {
  // `midPage.pageSmells` 의 「계수 1 을 적었다」는 `1x` 처럼 **문자 앞**만 본다 — `-1(4+4k)` 처럼
  // 괄호 앞의 계수 1 은 구조적으로 못 본다(2026-09-13 미리보기를 눈으로 보다 찾음).
  // 공용 자는 리드 소유라 이 모듈 시험에 둔다 — 보고서의 공용 후보.
  it("계수 1 을 괄호 앞에 적지 않는다", () => {
    let n = 0;
    eachProblem((p, key) => {
      for (const text of [
        p.content,
        p.answer,
        p.solution,
        ...(p.distractors ?? []),
      ]) {
        expect(/(?<![\d.])1\(/.test(text), `${key}: ${text}`).toBe(false);
        n += 1;
      }
    });
    expect(n).toBeGreaterThan(1000);
  });
});

describe("고등 공통수학1 이차방정식 — 값", () => {
  it("정답을 facts 로 다시 세운 것과 같다", () => {
    let n = 0;
    eachProblem((p, key, number) => {
      const want = VERIFY[number]!(p.facts, p);
      expect(
        matches(p.answer, want),
        `${key} 정답 ${p.answer} (${JSON.stringify(p.facts)})`,
      ).toBe(true);
      n += 1;
    });
    expect(n).toBe(H1_QUAD_EQ.length * SEEDS.length * VARIANTS);
  });

  it("오답은 값으로도 정답과 다르다 — 모양만 다르고 같은 수·같은 방정식인 보기가 없다", () => {
    let n = 0;
    eachProblem((p, key, number) => {
      if (!p.distractors) return;
      const want = VERIFY[number]!(p.facts, p);
      for (const d of p.distractors) {
        expect(matches(d, want), `${key} 오답 ${d} 의 값이 정답과 같다`).toBe(
          false,
        );
        n += 1;
      }
    });
    expect(
      n,
      "오답을 내는 꼴이 거의 안 나오면 이 검사는 장식이다",
    ).toBeGreaterThan(300);
  });

  it("발문이 facts 가 말하는 수·식을 그대로 보여 준다", () => {
    let checked = 0;
    eachProblem((p, _key, number) => {
      checked += SHOWN[number]!(p.facts, p);
    });
    expect(
      checked,
      "지면 대조가 거의 안 돌면 이 검사는 장식이다",
    ).toBeGreaterThan(2000);
  });
});
