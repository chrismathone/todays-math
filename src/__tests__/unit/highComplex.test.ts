/**
 * 공통수학1 「복소수」 14유형 — **독립 검산** (본보기 `highIdentity.test.ts` 를 따른다).
 *
 * 생성기의 답을 믿지 않는다. 두 축으로 본다:
 *
 *   ⑴ `VERIFY` — `facts` 의 원 수치로 **다른 식**을 세워 답의 값을 다시 낸다. 부동소수 복소수로
 *      직접 거듭제곱·대입 · 연립을 거꾸로 풀기 · 켤레 등식은 z=1, z=i 대입으로 선형 사상을 만들어 풀기.
 *      지면의 답은 `highAnswer.readAnswerValues`(다항식이면 `highPage.parsePolyTex`)로 읽어 맞댄다.
 *   ⑵ `SHOWN` — **발문의 수식을 그대로 계산해** facts 와 맞댄다. 시험 쪽 식 계산기(`texValue`)는
 *      √(−a) 를 정의대로 주치(主値) 제곱근 i√a 로 두고 곱·나눗셈을 복소수 산술로만 한다 —
 *      「음수끼리의 곱」 규칙을 모르므로 생성기와 같이 틀릴 수 없다.
 *
 * 계산기·다항식 셈은 제품(`numbers.ts`·`poly.ts`)을 안 부른다(같이 틀리지 않게).
 * 지면·조사·난이도·형식 규칙은 `highRegistry.test.ts` 가 등록 유형 전부에 돈다 — 여기 옮겨 적지 않는다.
 */
import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import {
  generateHighProblem,
  registeredHighTypes,
} from "../../lib/high/generate";
import { H1_COMPLEX, H1_COMPLEX_HOLD } from "../../lib/high/h1Complex";
import type { HighProblem } from "../../lib/high/types";
import { readAnswerValues, sameValues, type Cx } from "../helpers/highAnswer";
import {
  highCatalog,
  mathSpans,
  parsePolyTex,
  pkey,
} from "../helpers/highPage";

const BOOK = "공통수학1";
const MINOR = "복소수";
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

/** 주치 제곱근 — 음의 실수는 i√|a| (지면의 √(−a) 의 정의). */
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
const isReal = (a: Cx): boolean => Math.abs(a.im) <= EPS;

/** 실계수 이차방정식 t²+bt+c=0 의 실근(겹근은 하나). */
function realRoots(b: number, c: number): number[] {
  const D = b * b - 4 * c;
  if (D < -EPS) return [];
  if (Math.abs(D) <= EPS) return [-b / 2];
  const s = Math.sqrt(D);
  return [(-b - s) / 2, (-b + s) / 2];
}

// ───────────────────────────── 식 계산기 (시험 쪽) ─────────────────────────────
//
// 지면의 수식 한 조각을 복소수로 계산한다. 읽는 것: 정수 · i · 한 글자 문자(환경에서) ·
// \alpha \beta · 아래첨자 z_{1} · \dfrac \frac \sqrt \overline · ( ) \left( \right) · |…| ·
// 거듭제곱 ^{정수} · 붙여 쓴 곱 · \times \cdot · + -. 그 밖의 꼴은 **던진다**(조용히 통과 금지).

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

/** 지면 수식 한 조각의 값. */
function texValue(tex: string, env: Readonly<Record<string, Cx>> = {}): Cx {
  return new TexParser(tokenize(tex), env, tex).all();
}

/** 발문의 수식 조각들. */
const spans = (p: HighProblem): string[] => mathSpans(p.content);

/** `A=B` 꼴 조각의 오른쪽 · 왼쪽. */
const rhs = (span: string): string => span.slice(span.indexOf("=") + 1);
const lhs = (span: string): string => span.slice(0, span.indexOf("="));

// ───────────────────────────── 기대값 ─────────────────────────────

type Fact = Record<string, number>;
type Expect =
  | { vals: Cx[] }
  | { poly: number[] }
  /** 문자 식 정답 — 표본 점마다 값을 맞댄다 */
  | { fn: (env: Record<string, Cx>) => Cx; samples: Record<string, Cx>[] };

const vals = (...xs: (number | Cx)[]): Expect => ({
  vals: xs.map((x) => (typeof x === "number" ? C(x) : x)),
});

function eachProblem(
  fn: (p: HighProblem, key: string, number: string) => void,
): void {
  for (const entry of H1_COMPLEX) {
    for (const seed of SEEDS) {
      for (let v = 0; v < VARIANTS; v += 1) {
        fn(generateHighProblem(entry.key, seed, v), entry.key, entry.rpmType);
      }
    }
  }
}

/** 발문에서 `re` 에 맞는 첫 조각 — 없으면 던진다. */
function spanOf(p: HighProblem, re: RegExp): string {
  const s = spans(p).find((x) => re.test(x));
  if (s === undefined)
    throw new Error(`발문에 ${re} 조각이 없다: ${p.content}`);
  return s;
}

const CPLX_T = [C(0.3, 0.2), C(-1.7, 0.5), C(1.1, -2.3)];
const REAL_T = [C(0.3), C(-1.7), C(2.45)];

/** 지면의 식과 facts 로 지은 식이 표본 점마다 같은가 — 맞댄 횟수를 돌려준다. */
function sameOn(
  shown: (t: Cx) => Cx,
  want: (t: Cx) => Cx,
  ts: readonly Cx[],
  what: string,
): number {
  for (const t of ts) {
    const a = shown(t);
    const b = want(t);
    expect(
      near(a, b),
      `${what}: t=${JSON.stringify(t)} 에서 ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`,
    ).toBe(true);
  }
  return ts.length;
}

function expectNear(a: Cx, b: Cx, what: string): number {
  expect(
    near(a, b),
    `${what}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`,
  ).toBe(true);
  return 1;
}

/** 실계수 다항식(낮은 차수부터)의 값. */
const pv = (c: readonly number[], x: number): number =>
  c.reduce((s, k, i) => s + k * x ** i, 0);

/** 이차 이하 실계수 다항식의 실근 — 제품 풀이를 안 부르고 근의 공식으로. */
function rootsOf(c: readonly number[]): number[] {
  if ((c[2] ?? 0) !== 0) return realRoots(c[1]! / c[2]!, c[0]! / c[2]!);
  if ((c[1] ?? 0) !== 0) return [-c[0]! / c[1]!];
  return [];
}

/** 근 모음의 합집합(가까우면 같은 근). */
function unionRoots(...lists: number[][]): number[] {
  const out: number[] = [];
  for (const x of lists.flat())
    if (!out.some((y) => Math.abs(x - y) <= EPS)) out.push(x);
  return out;
}

/** 조건에 맞는 근이 **정확히 하나**인지 보고 그 근. */
function onlyOne(xs: number[], what: string): number {
  expect(
    xs.length,
    `${what}: 조건에 맞는 실수가 하나가 아니다 (${xs.join(", ")})`,
  ).toBe(1);
  return xs[0]!;
}

// ── 01~07 ──

function classify(v: Cx): 0 | 1 | 2 {
  if (isReal(v)) return 0;
  return Math.abs(v.re) <= EPS ? 2 : 1;
}

function t02Value(f: Fact): Cx {
  if (f.mode === 0)
    return add(
      mul(C(f.a1!, f.b1!), C(f.a2!, f.b2!)),
      div(C(f.nr!, f.ni!), C(f.dr!, f.di!)),
    );
  if (f.mode === 1)
    return sub(
      add(mul(C(f.k1!), C(f.a1!, f.b1!)), C(f.a2!, f.b2!)),
      mul(C(f.k2!), C(f.a3!, f.b3!)),
    );
  if (f.mode === 2) {
    const z = C(f.p!, f.k! * Math.sqrt(f.r!));
    return add(pow(z, 2), pow(conj(z), 2));
  }
  const x = C(f.xr!, f.xi!);
  const y = C(f.yr!, f.yi!);
  return add(add(mul(C(f.a!), mul(x, y)), mul(C(f.b!), x)), mul(C(f.c!), y));
}

/** 03 — 대입할 점과 지면이 말하는 식. */
function t03Point(f: Fact): { at: Cx; v: string; g: (t: Cx) => Cx } {
  if (f.mode === 0)
    return {
      at: div(C(f.p!, f.k! * Math.sqrt(f.r!)), C(f.d!)),
      v: "x",
      g: (t) => add(add(mul(C(f.c2!), pow(t, 2)), mul(C(f.c1!), t)), C(f.c0!)),
    };
  if (f.mode === 1)
    return {
      at: C(f.p!, f.k! * Math.sqrt(f.r!)),
      v: "z",
      g: (t) => add(sub(pow(t, 2), mul(C(2 * f.p!), t)), C(f.c!)),
    };
  if (f.mode === 2)
    return {
      at: div(C(f.nr!, f.ni!), C(f.dr!, f.di!)),
      v: "z",
      g: (t) =>
        add(
          add(add(pow(t, 3), mul(C(f.c2!), pow(t, 2))), mul(C(f.c1!), t)),
          C(f.c0!),
        ),
    };
  const N = f.p! ** 2 + f.q! ** 2;
  return {
    at: csqrt(C(f.p!, f.q!)),
    v: "x",
    g: (t) =>
      add(
        add(
          add(
            add(
              add(pow(t, 4), mul(C(f.B!), pow(t, 3))),
              mul(C(-2 * f.p!), pow(t, 2)),
            ),
            mul(C(-2 * f.p! * f.B!), t),
          ),
          C(f.c!),
        ),
        div(C(f.B! * N), t),
      ),
  };
}

function t04Pair(f: Fact): [Cx, Cx] {
  if (f.mode === 0) return [C(f.a!, f.b!), C(f.a!, -f.b!)];
  if (f.mode === 1) {
    const K = f.m! * (f.u! ** 2 + f.v! ** 2);
    return [div(C(K), C(f.u!, f.v!)), div(C(K), C(f.u!, -f.v!))];
  }
  const x = C(f.a!, -f.b!);
  return [x, div(C(f.a! ** 2 + f.b! ** 2), x)];
}

const T04_EXPR: Record<string, (x: Cx, y: Cx) => Cx> = {
  "0-0": (x, y) => add(div(y, x), div(x, y)),
  "0-1": (x, y) => add(sub(pow(x, 2), mul(x, y)), pow(y, 2)),
  "0-2": (x, y) => add(pow(x, 3), pow(y, 3)),
  "1-0": (x, y) =>
    add(sub(sub(pow(x, 3), mul(pow(x, 2), y)), mul(x, pow(y, 2))), pow(y, 3)),
  "1-1": (x, y) => add(pow(x, 2), pow(y, 2)),
  "2-0": (x, y) => sub(pow(x, 3), pow(y, 3)),
};

/** 05·07 — z(x) 의 실수부분·허수부분 다항식(낮은 차수부터). */
function reIm(number: string, f: Fact): [number[], number[]] {
  const quad = (u: number, v: number): number[] => [u * v, -(u + v), 1];
  if (number === "05") {
    if (f.mode === 0) return [quad(f.r1!, f.r2!), [-f.m! * f.r1!, f.m!]];
    if (f.mode === 1) return [quad(f.a!, f.b!), quad(f.a!, f.c!)];
    return [quad(f.p!, f.q!), quad(f.p!, f.r!)];
  }
  if (f.mode === 0) return [quad(f.p!, f.q!), quad(f.p!, f.r!)];
  return [quad(f.p!, f.q!), [-f.m! * f.s!, f.m!]];
}

/** 06 — 연립을 거꾸로 푼 (x, y). */
function t06Solution(f: Fact): [number, number][] {
  if (f.mode === 0) {
    const det = f.a! * f.d! - f.b! * f.c!;
    return [
      [
        (f.er! * f.d! - f.c! * f.ei!) / det,
        (f.a! * f.ei! - f.b! * f.er!) / det,
      ],
    ];
  }
  if (f.mode === 1) return [[f.pr! + f.pi!, f.pr! - f.pi!]];
  const S = -f.c!;
  const P = f.m! / f.k!;
  expect(S * S - 4 * P, "실수 x, y 가 있어야 한다").toBeGreaterThanOrEqual(
    -EPS,
  );
  const r = realRoots(-S, P);
  const x = r[0]!;
  const y = r[r.length - 1]!;
  return [
    [x, y],
    [y, x],
  ];
}

const VERIFY_A: Record<string, (f: Fact, p: HighProblem) => Expect> = {
  "01": (f, p) => {
    if (f.mode === 0) {
      const items = mathSpans(p.content.split("\n")[1]!);
      const cls = items.map((t) => classify(texValue(t)));
      return vals(
        cls.filter((c) =>
          f.kind === 0 ? c === 0 : f.kind === 1 ? c !== 0 : c === 2,
        ).length,
      );
    }
    return vals([f.re! + f.im!, f.re! - f.im!, f.re! * f.im!][f.ask!]!);
  },
  "02": (f) => {
    const v = t02Value(f);
    if (f.mode === 0) return vals(f.ask === 0 ? v.re + v.im : v.re - v.im);
    if (f.mode === 3) return vals(f.part === 0 ? v.re : v.im);
    return vals(v);
  },
  "03": (f) => {
    const { at, g } = t03Point(f);
    // x²=p+qi 의 두 근 ±x 어느 쪽을 넣어도 값이 같아야 문항이 성립한다.
    if (f.mode === 3)
      expectNear(g(neg(at)), g(at), "03 두 제곱근에서 값이 다르다");
    return vals(g(at));
  },
  "04": (f) => {
    const [x, y] = t04Pair(f);
    return vals(T04_EXPR[`${f.mode}-${f.ask ?? 0}`]!(x, y));
  },
  "05": (f) => {
    const [re, im] = reIm("05", f);
    if (f.mode === 0) {
      const xs =
        f.ask === 0
          ? rootsOf(re).filter((x) => Math.abs(pv(im, x)) > EPS)
          : rootsOf(im);
      return vals(onlyOne(xs, "05 꼴 0"));
    }
    if (f.mode === 1)
      return vals(
        unionRoots(rootsOf(re), rootsOf(im)).reduce((s, x) => s + x, 0),
      );
    const xs =
      f.sign === 0
        ? rootsOf(im).filter((x) => Math.abs(pv(re, x)) > EPS)
        : rootsOf(re).filter((x) => Math.abs(pv(im, x)) > EPS);
    const x = onlyOne(xs, "05 꼴 2");
    const z2 = pow(C(pv(re, x), pv(im, x)), 2);
    expect(
      isReal(z2) && (f.sign === 0 ? z2.re > 0 : z2.re < 0),
      "05 꼴 2 z² 의 부호",
    ).toBe(true);
    return vals(x);
  },
  "06": (f) => {
    const [[x, y]] = t06Solution(f) as [[number, number]];
    if (f.mode === 0) return vals([x + y, x - y, x * y][f.ask!]!);
    if (f.mode === 1) return vals(f.al! * x + f.be! * y);
    return vals([x * x + y * y, (x - y) ** 2, x ** 3 + y ** 3][f.ask!]!);
  },
  "07": (f) => {
    const [re, im] = reIm("07", f);
    if (f.mode === 0) {
      const x = onlyOne(
        rootsOf(im).filter((t) => Math.abs(pv(re, t)) > EPS),
        "07 꼴 0",
      );
      return vals(x);
    }
    return vals(rootsOf(re).reduce((s, x) => s + x, 0));
  },
};

const SHOWN_A: Record<string, (f: Fact, p: HighProblem) => number> = {
  "01": (f, p) => {
    if (f.mode === 0) {
      expect(mathSpans(p.content.split("\n")[1]!).length, "01 수가 여섯").toBe(
        6,
      );
      return 1;
    }
    return expectNear(texValue(spans(p)[0]!), C(f.re!, f.im!), "01 복소수");
  },
  "02": (f, p) => {
    if (f.mode !== 3)
      return expectNear(texValue(spans(p)[0]!), t02Value(f), "02 식");
    const def = rhs(spanOf(p, /\\star y=/));
    const [xs, ys] = spanOf(p, /\)\\star\(/).split("\\star") as [
      string,
      string,
    ];
    let n = expectNear(texValue(xs), C(f.xr!, f.xi!), "02 연산 왼쪽");
    n += expectNear(texValue(ys), C(f.yr!, f.yi!), "02 연산 오른쪽");
    const X = C(0.7, -1.3);
    const Y = C(-2.1, 0.4);
    n += expectNear(
      texValue(def, { x: X, y: Y }),
      add(add(mul(C(f.a!), mul(X, Y)), mul(C(f.b!), X)), mul(C(f.c!), Y)),
      "02 연산의 정의",
    );
    return n;
  },
  "03": (f, p) => {
    const { at, v, g } = t03Point(f);
    const [given, expr] = spans(p) as [string, string];
    const n = expectNear(
      texValue(rhs(given)),
      f.mode === 3 ? C(f.p!, f.q!) : at,
      "03 주어진 수",
    );
    return n + sameOn((t) => texValue(expr, { [v]: t }), g, CPLX_T, "03 식");
  },
  "04": (f, p) => {
    const [x, y] = t04Pair(f);
    let n = expectNear(texValue(rhs(spanOf(p, /^x=/))), x, "04 x");
    n +=
      f.mode === 2
        ? expectNear(texValue(rhs(spanOf(p, /^xy=/))), mul(x, y), "04 xy")
        : expectNear(texValue(rhs(spanOf(p, /^y=/))), y, "04 y");
    const all = spans(p);
    const target = all[all.length - 1]!;
    return (
      n +
      expectNear(
        texValue(target, { x, y }),
        T04_EXPR[`${f.mode}-${f.ask ?? 0}`]!(x, y),
        "04 식",
      )
    );
  },
  "05": (f, p) => {
    const [re, im] = reIm("05", f);
    const zt = f.mode === 0 ? spans(p)[0]! : rhs(spanOf(p, /^z=/));
    return sameOn(
      (t) => texValue(zt, { x: t }),
      (t) => C(pv(re, t.re), pv(im, t.re)),
      REAL_T,
      "05 z(x)",
    );
  },
  "06": (f, p) => {
    const eq = spans(p)[0]!;
    let n = 0;
    for (const [x, y] of t06Solution(f)) {
      const env = { x: C(x), y: C(y) };
      n += expectNear(
        texValue(lhs(eq), env),
        texValue(rhs(eq), env),
        "06 등식이 해에서 성립",
      );
    }
    if (f.mode === 0)
      n += expectNear(texValue(rhs(eq)), C(f.er!, f.ei!), "06 우변");
    if (f.mode === 1)
      n += expectNear(texValue(rhs(eq)), C(f.pr!, f.pi!), "06 우변");
    return n;
  },
  "07": (f, p) => {
    const [re, im] = reIm("07", f);
    const zt = rhs(spanOf(p, /^z=/));
    return sameOn(
      (t) => texValue(zt, { x: t }),
      (t) => C(pv(re, t.re), pv(im, t.re)),
      REAL_T,
      "07 z(x)",
    );
  },
};

// ── 08~14 ──

/**
 * 켤레가 섞인 등식 L(z)=R 을 푼다. L 은 z 에 대해 **실선형**이다(z̄ 때문에 복소선형이 아님) —
 * z=1, z=i 를 넣어 두 열을 얻고 실수 2×2 연립으로 푼다. 계수를 손으로 전개하지 않는다.
 */
function solveRealLinear(L: (z: Cx) => Cx, R: Cx): Cx {
  const c1 = L(C(1));
  const ci = L(C(0, 1));
  const det = c1.re * ci.im - ci.re * c1.im;
  expect(
    Math.abs(det),
    "켤레 등식의 해가 하나로 정해지지 않는다",
  ).toBeGreaterThan(EPS);
  return C(
    (R.re * ci.im - ci.re * R.im) / det,
    (c1.re * R.im - R.re * c1.im) / det,
  );
}

function t08Solution(f: Fact): Cx {
  const w = f.mode === 0 ? C(f.r!) : C(f.s!, f.t!);
  return solveRealLinear(
    (z) => add(mul(C(f.p!, f.q!), z), mul(w, conj(z))),
    C(f.er!, f.ei!),
  );
}

function t08Pm(f: Fact): Cx[] {
  const a = f.S! / 2;
  const b2 = f.N! - a * a;
  expect(b2, "08 꼴 2: z 가 허수여야 한다").toBeGreaterThan(0);
  return [C(a, Math.sqrt(b2)), C(a, -Math.sqrt(b2))];
}

/** 09 — 지면의 합을 한 항씩 더한다(주기 공식을 안 쓴다). */
function t09Sum(f: Fact): Cx {
  let s = C(0);
  let cur = C(1);
  for (let k = 1; k <= f.n!; k += 1) {
    cur = f.mode === 2 ? div(cur, C(0, 1)) : mul(cur, C(0, 1));
    s = add(s, f.mode === 1 ? mul(C(k), cur) : cur);
  }
  return s;
}

function t10Value(f: Fact): Cx {
  if (f.mode === 0) {
    const a = pow(div(C(1, 1), C(1, -1)), f.n!);
    const b = pow(div(C(1, -1), C(1, 1)), f.n!);
    return f.minus === 1 ? sub(a, b) : add(a, b);
  }
  const a = pow(C(1, 1), 2 * f.m!);
  const b = pow(C(1, -1), 2 * f.m!);
  return f.minus === 1 ? sub(a, b) : add(a, b);
}

const T10_TARGET = [C(1), C(0, 1), C(-1), C(0, -1)];

const t10Unit = (f: Fact): Cx => div(C(1, f.sgn === 0 ? 1 : -1), C(Math.SQRT2));

/** 12 — 조건을 만족시키는 표본 점 · 어기는 점. */
function t12Points(f: Fact): {
  ok: Record<string, Cx>[];
  bad: Record<string, Cx>;
} {
  if (f.mode === 0) {
    return f.cond === 0
      ? {
          ok: [
            { a: C(1.7), b: C(-2.3) },
            { a: C(0.4), b: C(-5.1) },
            { a: C(3.3), b: C(-0.6) },
          ],
          bad: { a: C(1.7), b: C(2.3) },
        }
      : {
          ok: [
            { a: C(-1.3), b: C(-2.9) },
            { a: C(-4.2), b: C(-0.7) },
            { a: C(-0.5), b: C(-3.8) },
          ],
          bad: { a: C(1.3), b: C(2.9) },
        };
  }
  const lo = Math.min(f.p!, f.q!);
  const hi = Math.max(f.p!, f.q!);
  if (f.form === 0) {
    return {
      ok: [0.3, 0.7].map((s) => ({ a: C(f.q! + (f.p! - f.q!) * s) })),
      bad: { a: C(f.p! + 1.4) },
    };
  }
  return {
    ok: [0.5, 2.3].map((s) => ({ a: C(lo - s) })),
    bad: { a: C(hi + 1.4) },
  };
}

function t13Points(f: Fact): { ok: Cx[]; bad: Cx } {
  if (f.mode === 1) {
    const x = -f.al! / 2;
    return { ok: [C(x, 0.7), C(x, 1.9), C(x, -2.3)], bad: C(x + 0.6, 0.7) };
  }
  const r = Math.sqrt(f.k!);
  const at = (rr: number, th: number): Cx =>
    C(rr * Math.cos(th), rr * Math.sin(th));
  return { ok: [at(r, 0.7), at(r, 2.1)], bad: at(1.3 * r, 0.7) };
}

function t14Value(f: Fact): Cx {
  if (f.mode === 0) {
    const al = C(f.ar!, f.ai!);
    const be = C(f.br!, f.bi!);
    const s = C(f.minus === 1 ? -1 : 1);
    // αᾱ ± ᾱβ ± αβ̄ + ββ̄ 을 그대로 — 인수분해한 꼴을 안 쓴다.
    return add(
      add(
        add(mul(al, conj(al)), mul(s, mul(conj(al), be))),
        mul(s, mul(al, conj(be))),
      ),
      mul(be, conj(be)),
    );
  }
  if (f.mode === 1) {
    // z̄₁ 과 k·z̄₂ 는 t²−At+kB=0 의 두 근이다(곱 k·z̄₁z̄₂=kB, 합 A).
    const A = C(f.Ar!, f.Ai!);
    const kB = mul(C(f.k!), C(f.Br!, f.Bi!));
    const s = csqrt(sub(mul(A, A), mul(C(4), kB)));
    const u = conj(div(add(A, s), C(2)));
    const v = conj(div(sub(A, s), C(2)));
    return mul(sub(u, C(1)), sub(v, C(1)));
  }
  const c = C(f.cr!, f.ci!);
  const len = Math.hypot(c.re, c.im);
  expect(len * len, "14 꼴 2: 그런 z, w 가 있어야 한다").toBeLessThanOrEqual(
    4 * f.N! + EPS,
  );
  const t = Math.sqrt(f.N! - (len * len) / 4);
  const z = add(div(c, C(2)), mul(C(0, t / len), c));
  const w = sub(c, z);
  expectNear(C(mul(z, conj(z)).re), C(f.N!), "14 |z|²");
  expectNear(C(mul(w, conj(w)).re), C(f.N!), "14 |w|²");
  return add(div(C(1), z), div(C(1), w));
}

const VERIFY_B: Record<string, (f: Fact, p: HighProblem) => Expect> = {
  "08": (f) => {
    if (f.mode === 2) return { vals: t08Pm(f) };
    const z = t08Solution(f);
    return f.mode === 0 ? vals(z) : vals(mul(z, conj(z)));
  },
  "09": (f) => {
    const s = t09Sum(f);
    if (f.mode === 1) return vals(f.ask === 0 ? s.re + s.im : s.re - s.im);
    return vals(s);
  },
  "10": (f) => {
    if (f.mode !== 2) return vals(t10Value(f));
    const unit = pow(t10Unit(f), 2);
    let n = 0;
    for (let k = 1; k <= f.N!; k += 1)
      if (near(pow(unit, k), T10_TARGET[f.cIdx!]!)) n += 1;
    return vals(n);
  },
  "11": (f, p) => {
    if (f.mode === 0) {
      const v = texValue(lhs(spans(p)[0]!));
      return vals(f.ask === 0 ? v.re + v.im : v.re - v.im);
    }
    if (f.mode === 1) return vals(texValue(spans(p)[0]!));
    // −p<x<q 에서 네 근호의 곱은 −(x+p)(q−x) = (x+p)(x−q)
    return { poly: [-f.p! * f.q!, f.p! - f.q!, 1] };
  },
  "12": (f, p) => {
    const all = spans(p);
    const E = all[all.length - 1]!;
    if (f.mode === 1) return vals(f.p! - f.q!);
    return { fn: (env) => texValue(E, env), samples: t12Points(f).ok };
  },
  "13": (f) => {
    if (f.mode === 0) {
      const z = C(f.a!, f.b!);
      return vals(add(pow(z, 2), pow(conj(z), 2)));
    }
    const { ok, bad } = t13Points(f);
    const w = (z: Cx): Cx =>
      f.mode === 1
        ? div(C(1), add(add(pow(z, 2), mul(C(f.al!), z)), C(f.be!)))
        : div(z, add(C(f.k!), pow(z, 2)));
    for (const z of ok)
      expect(isReal(w(z)), `13 조건을 만족시키는 z 에서 실수가 아니다`).toBe(
        true,
      );
    expect(isReal(w(bad)), "13 조건이 z 를 가르지 못한다").toBe(false);
    if (f.mode === 1) return vals(add(ok[0]!, conj(ok[0]!)));
    const z = ok[0]!;
    const m = C(f.m!);
    return vals(sub(mul(add(z, m), add(conj(z), m)), mul(m, add(z, conj(z)))));
  },
  "14": (f) => vals(t14Value(f)),
};

const SHOWN_B: Record<string, (f: Fact, p: HighProblem) => number> = {
  "08": (f, p) => {
    if (f.mode === 2) {
      let n = expectNear(
        texValue(rhs(spanOf(p, /^z\\overline\{z\}=/))),
        C(f.N!),
        "08 zz̄",
      );
      const eq2 = spanOf(p, /^z\+\\dfrac/);
      for (const z of t08Pm(f)) {
        n += expectNear(
          texValue(lhs(eq2), { z }),
          texValue(rhs(eq2)),
          "08 z+N/z",
        );
      }
      return n;
    }
    const eq = spanOf(p, /=/);
    const z = t08Solution(f);
    let n = expectNear(texValue(rhs(eq)), C(f.er!, f.ei!), "08 우변");
    n += expectNear(
      texValue(lhs(eq), { z }),
      texValue(rhs(eq)),
      "08 등식이 해에서 성립",
    );
    return n;
  },
  "09": (f, p) => {
    const last = [...spanOf(p, /i\^\{/).matchAll(/i\^\{(\d+)\}/g)].pop();
    expect(Number(last?.[1]), "09 마지막 지수").toBe(f.n);
    return 1;
  },
  "10": (f, p) => {
    if (f.mode !== 2)
      return expectNear(texValue(spans(p)[0]!), t10Value(f), "10 식");
    const eq = spans(p)[0]!;
    let n = expectNear(texValue(rhs(eq)), T10_TARGET[f.cIdx!]!, "10 우변");
    for (let k = 1; k <= 4; k += 1) {
      n += expectNear(
        texValue(lhs(eq), { n: C(k) }),
        pow(t10Unit(f), 2 * k),
        "10 좌변",
      );
    }
    return n + expectNear(texValue(spans(p)[1]!), C(f.N!), "10 N");
  },
  "11": (f, p) => {
    // 이 유형의 마디 — 음수끼리의 곱이나 음수로 나누기가 발문에 있어야 한다.
    if (f.mode !== 2) {
      const pit =
        /\\sqrt\{-\d+\}\\sqrt\{-\d+\}|\\dfrac\{\\sqrt\{\d+\}\}\{\\sqrt\{-\d+\}\}|\\sqrt\{-\d+\}\)/;
      expect(
        pit.test(p.content),
        `11 발문에 음수 근호의 곱·나눗셈이 없다: ${p.content}`,
      ).toBe(true);
      return 1;
    }
    const expr = spans(p)[1]!;
    const xs = [0.2, 0.5, 0.8].map((s) => C(-f.p! + (f.p! + f.q!) * s));
    return (
      1 +
      sameOn(
        (x) => texValue(expr, { x }),
        (x) => mul(add(x, C(f.p!)), sub(x, C(f.q!))),
        xs,
        "11 네 근호의 곱",
      )
    );
  },
  "12": (f, p) => {
    const cond = spanOf(p, /=-\\sqrt/);
    const { ok, bad } = t12Points(f);
    let n = 0;
    for (const env of ok) {
      n += expectNear(
        texValue(lhs(cond), env),
        texValue(rhs(cond), env),
        "12 조건이 성립해야 할 점",
      );
    }
    expect(
      near(texValue(lhs(cond), bad), texValue(rhs(cond), bad)),
      "12 조건이 부호를 가르지 못한다",
    ).toBe(false);
    if (f.mode === 1) {
      const all = spans(p);
      const E = all[all.length - 1]!;
      for (const env of ok)
        n += expectNear(texValue(E, env), C(f.p! - f.q!), "12 식의 값");
    }
    return n + 1;
  },
  "13": (f, p) => {
    if (f.mode === 0)
      return expectNear(texValue(rhs(spanOf(p, /^z=/))), C(f.a!, f.b!), "13 z");
    const frac = spanOf(p, /^\\dfrac/);
    const { ok } = t13Points(f);
    const want = (z: Cx): Cx =>
      f.mode === 1
        ? div(C(1), add(add(pow(z, 2), mul(C(f.al!), z)), C(f.be!)))
        : div(z, add(C(f.k!), pow(z, 2)));
    let n = sameOn((z) => texValue(frac, { z }), want, ok, "13 분수");
    if (f.mode === 2) {
      const ask = spanOf(p, /^\(z/);
      const m = C(f.m!);
      n += sameOn(
        (z) => texValue(ask, { z }),
        (z) => sub(mul(add(z, m), add(conj(z), m)), mul(m, add(z, conj(z)))),
        ok,
        "13 묻는 식",
      );
    }
    return n;
  },
  "14": (f, p) => {
    if (f.mode === 0) {
      const al = C(f.ar!, f.ai!);
      const be = C(f.br!, f.bi!);
      let n = expectNear(texValue(rhs(spanOf(p, /^\\alpha=/))), al, "14 α");
      n += expectNear(texValue(rhs(spanOf(p, /^\\beta=/))), be, "14 β");
      return (
        n +
        expectNear(
          texValue(spans(p)[2]!, { alpha: al, beta: be }),
          t14Value(f),
          "14 식",
        )
      );
    }
    if (f.mode === 1) {
      const sum = spanOf(p, /^\\overline\{z_\{1\}\}[+-]/);
      const prod = spanOf(p, /\\times/);
      let n = expectNear(texValue(rhs(sum)), C(f.Ar!, f.Ai!), "14 켤레의 합");
      n += expectNear(texValue(rhs(prod)), C(f.Br!, f.Bi!), "14 켤레의 곱");
      // 합 조각의 좌변에 문자 계수 k 가 제대로 찍혔나 — z₁=1, z₂=i 를 넣어 k 를 거꾸로 읽는다.
      const probe = texValue(lhs(sum), { z_1: C(0), z_2: C(0, 1) });
      return n + expectNear(probe, C(0, -f.k!), "14 켤레의 합의 계수");
    }
    let n = expectNear(
      texValue(rhs(spanOf(p, /^z\\overline\{z\}=/))),
      C(f.N!),
      "14 zz̄",
    );
    n += expectNear(
      texValue(rhs(spanOf(p, /^w\\overline\{w\}=/))),
      C(f.N!),
      "14 ww̄",
    );
    return (
      n +
      expectNear(texValue(rhs(spanOf(p, /^z\+w=/))), C(f.cr!, f.ci!), "14 z+w")
    );
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
  if ("poly" in want) {
    const pp = parsePolyTex(body);
    return pp !== null && pkey(pp) === pkey(want.poly);
  }
  return want.samples.every((env) => near(texValue(body, env), want.fn(env)));
}

// ───────────────────────────── 시험 ─────────────────────────────

describe("고등 공통수학1 복소수 — 등록", () => {
  it("색인 14유형을 전부 등록했고 번호·제목·중단원이 색인 바이트와 같다", () => {
    expect(catalogRows.length, "색인 유형 수").toBe(14);
    expect(H1_COMPLEX.length + H1_COMPLEX_HOLD.length).toBe(catalogRows.length);
    for (const e of H1_COMPLEX) {
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
    for (const e of H1_COMPLEX) {
      expect(sections.has(e.unitSection), `${e.key} — ${e.unitSection}`).toBe(
        true,
      );
    }
  });

  it("등록부에 들어 있다", () => {
    const keys = new Set(registeredHighTypes().map((e) => e.key));
    for (const e of H1_COMPLEX) expect(keys.has(e.key)).toBe(true);
  });
});

describe("고등 공통수학1 복소수 — 값", () => {
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
    expect(n).toBe(H1_COMPLEX.length * SEEDS.length * VARIANTS);
  });

  it("오답은 값으로도 정답과 다르다 — 모양만 다르고 같은 수인 보기가 없다", () => {
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
    ).toBeGreaterThan(400);
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
