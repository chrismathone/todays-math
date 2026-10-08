/**
 * 공통수학1 「인수분해」 10유형 — **독립 검산** (물결 1 세션 `h1-poly`).
 *
 * 본보기 `highIdentity.test.ts` 를 따른다. 생성기의 답을 믿지 않고 `facts` 로 **다른 식**을 세운다.
 * 인수분해한 식(정답)은 여러 점에서 **값**으로 원래 식과 맞댄다 — 전개형·곱꼴·여러 문자 어느 모양이든
 * 같은 자로 읽힌다(`evalTex`). 계수를 묻는 꼴은 시험이 **스스로 인수분해한다**(정수근 찾기 · 계수 맞추기 ·
 * 조건식을 풀어 대입). 다항식 셈과 지면 읽기는 제품(`src/lib/high/poly.ts`)을 안 부른다.
 *
 * 지면 · 난이도 · 형식은 `highRegistry.test.ts` 가 등록 유형 전부에 돈다 — 여기 옮겨 적지 않는다.
 *
 * 공용 후보(리드에게 — 세션은 `helpers/` 를 못 고친다): `evalTex`(문자·괄호·지수·분수·근호가 섞인 식을
 * 값으로) · `Shown`(발문의 식을 여러 점의 값으로 대조). `highAnswer.readValues` 는 문자를 못 읽는다.
 */
import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import {
  generateHighProblem,
  registeredHighHolds,
  registeredHighTypes,
} from "../../lib/high/generate";
import { H1_FACTOR, H1_FACTOR_HOLD } from "../../lib/high/h1Factor";
import type { HighProblem } from "../../lib/high/types";
import { readAnswerValues, readValues } from "../helpers/highAnswer";
import {
  highCatalog,
  mathSpans,
  padd,
  parsePolyTex,
  pkey,
  plongDivide,
  pmul,
  proots,
  pval,
  type P,
} from "../helpers/highPage";

const BOOK = "공통수학1";
const MINOR = "인수분해";
const SEEDS = [20260913, 1, 7777, 424242, 99991];
const VARIANTS = 14;

const catalogRows = highCatalog(BOOK).filter((t) => t.minor === MINOR);
const rowOf = (number: string) => {
  const row = catalogRows.find((t) => t.number === number);
  if (!row) throw new Error(`색인에 없는 번호: ${number}`);
  return row;
};

type Fact = Record<string, number>;
type Env = Record<string, number>;

// ───────────────────────────── 식 → 값 ─────────────────────────────

type Tok =
  | { k: "num"; v: number }
  | { k: "var"; v: string }
  | { k: "+" | "-" | "*" | "(" | ")" | "{" | "}" | "^" | "frac" | "sqrt" };

function lex(src: string): Tok[] {
  const s = src.replace(/\\left|\\right/g, "").replace(/\s+/g, "");
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
    const cmd = /^\\(dfrac|frac|sqrt|times|cdot)(?![a-zA-Z])/.exec(rest);
    if (cmd) {
      const n = cmd[1]!;
      out.push({
        k: n === "sqrt" ? "sqrt" : n === "times" || n === "cdot" ? "*" : "frac",
      });
      i += cmd[0].length;
      continue;
    }
    if (rest.startsWith("\\{") || rest.startsWith("\\}")) {
      out.push({ k: rest[1] === "{" ? "(" : ")" });
      i += 2;
      continue;
    }
    const ch = s[i]!;
    if (/[a-zA-Z]/.test(ch)) {
      out.push({ k: "var", v: ch });
      i += 1;
      continue;
    }
    if ("+-(){}^".includes(ch)) {
      out.push({ k: ch as "+" | "-" | "(" | ")" | "{" | "}" | "^" });
      i += 1;
      continue;
    }
    throw new Error(`식을 못 읽는다 «${rest.slice(0, 12)}» (${src})`);
  }
  return out;
}

/** 수·문자·괄호·`\{\}`·지수·`\dfrac`·`\sqrt`·`\times`·붙여 쓴 곱. 그 밖은 던진다. */
class Evaluator {
  private pos = 0;

  constructor(
    private readonly toks: Tok[],
    private readonly env: Env,
    private readonly src: string,
  ) {}

  private fail(why: string): never {
    throw new Error(`식을 못 읽는다 — ${why} (${this.src})`);
  }

  private peek(): Tok | undefined {
    return this.toks[this.pos];
  }

  private take(k: Tok["k"]): void {
    if (this.peek()?.k !== k) this.fail(`«${k}» 가 와야 할 자리`);
    this.pos += 1;
  }

  all(): number {
    const v = this.expr();
    if (this.pos !== this.toks.length) this.fail("끝에 남은 조각");
    return v;
  }

  private expr(): number {
    let sign = 1;
    const t0 = this.peek();
    if (t0?.k === "+" || t0?.k === "-") {
      this.pos += 1;
      sign = t0.k === "-" ? -1 : 1;
    }
    let v = sign * this.term();
    for (let t = this.peek(); t?.k === "+" || t?.k === "-"; t = this.peek()) {
      this.pos += 1;
      const r = this.term();
      v = t.k === "+" ? v + r : v - r;
    }
    return v;
  }

  private starts(t: Tok | undefined): boolean {
    return (
      t !== undefined &&
      (t.k === "num" ||
        t.k === "var" ||
        t.k === "(" ||
        t.k === "frac" ||
        t.k === "sqrt")
    );
  }

  private term(): number {
    let v = this.power();
    for (;;) {
      const t = this.peek();
      if (t?.k === "*") {
        this.pos += 1;
        v *= this.power();
        continue;
      }
      if (this.starts(t)) {
        v *= this.power();
        continue;
      }
      return v;
    }
  }

  private power(): number {
    let b = this.atom();
    while (this.peek()?.k === "^") {
      this.pos += 1;
      const t = this.peek();
      let e: number;
      if (t?.k === "{") e = this.group();
      else if (t?.k === "num") {
        this.pos += 1;
        e = t.v;
      } else return this.fail("지수 자리");
      b = b ** e;
    }
    return b;
  }

  private group(): number {
    this.take("{");
    const v = this.expr();
    this.take("}");
    return v;
  }

  private atom(): number {
    const t = this.peek();
    if (!t) return this.fail("수가 와야 할 자리에서 끝났다");
    this.pos += 1;
    switch (t.k) {
      case "num":
        return t.v;
      case "var": {
        const v = this.env[t.v];
        if (v === undefined) return this.fail(`모르는 문자 ${t.v}`);
        return v;
      }
      case "(": {
        const v = this.expr();
        this.take(")");
        return v;
      }
      case "{": {
        const v = this.expr();
        this.take("}");
        return v;
      }
      case "frac": {
        const a = this.group();
        const b = this.group();
        return a / b;
      }
      case "sqrt":
        return Math.sqrt(this.group());
      default:
        return this.fail(`«${t.k}» 로 시작하는 수`);
    }
  }
}

function evalTex(src: string, env: Env): number {
  return new Evaluator(lex(src), env, src).all();
}

/** 문자에 넣어 볼 값 — 정수가 아니어서 우연히 같아질 일이 없다. */
const ENVS: Env[] = [
  {
    a: 0.71,
    b: -1.29,
    c: 1.93,
    k: 0.43,
    p: 1.13,
    q: -0.61,
    r: 2.27,
    x: 1.37,
    y: -0.83,
    z: 2.11,
  },
  {
    a: -1.41,
    b: 0.87,
    c: 2.63,
    k: -1.17,
    p: -0.79,
    q: 1.73,
    r: -2.21,
    x: -0.93,
    y: 1.58,
    z: -1.21,
  },
  {
    a: 2.05,
    b: 1.33,
    c: -0.47,
    k: 2.31,
    p: 0.51,
    q: 2.39,
    r: 1.07,
    x: 2.44,
    y: 0.36,
    z: 0.92,
  },
];

const close = (x: number, y: number) =>
  Math.abs(x - y) <= 1e-7 * Math.max(1, Math.abs(y));

// ───────────────────────────── 발문 대조 ─────────────────────────────

/**
 * 발문이 facts 의 식·수치를 **실제로** 보여 주나.
 *   · `expr` — 발문의 수식 조각(등식의 변 · 괄호 속)을 여러 점에서 값으로 읽어 맞댄다
 *   · `poly` — $x$ 다항식 · `eq` — `왼쪽=수` · `has` — 고정된 틀의 조각
 */
class Shown {
  checked = 0;
  private readonly vecs: number[][] = [];
  private readonly polys = new Set<string>();
  private readonly eqs = new Map<string, number[]>();

  constructor(
    private readonly content: string,
    private readonly where: string,
  ) {
    for (const span of mathSpans(content)) {
      const parts = span.split("=");
      const inner = [...span.matchAll(/\(([^()]*)\)/g)].map((m) => m[1]!);
      for (const piece of [...parts, ...inner]) {
        const p = parsePolyTex(piece);
        if (p) this.polys.add(pkey(p));
        try {
          this.vecs.push(ENVS.map((e) => evalTex(piece, e)));
        } catch {
          // 못 읽는 조각(부등호 · \cdots · 함수 기호)은 대조하지 않는다
        }
      }
      for (let i = 0; i + 1 < parts.length; i += 1) {
        let vals: { re: number; im: number }[] | null;
        try {
          vals = readValues(parts[i + 1]!);
        } catch {
          vals = null;
        }
        if (vals && vals.length === 1 && Math.abs(vals[0]!.im) < 1e-12) {
          const lhs = parts[i]!.replace(/\s+/g, "");
          this.eqs.set(lhs, [...(this.eqs.get(lhs) ?? []), vals[0]!.re]);
        }
      }
    }
  }

  expr(fn: (e: Env) => number): void {
    this.checked += 1;
    const want = ENVS.map(fn);
    expect(
      this.vecs.some((v) => v.every((x, i) => close(x, want[i]!))),
      `${this.where}: 발문에 그 식이 없다`,
    ).toBe(true);
  }

  poly(p: readonly number[]): void {
    this.checked += 1;
    expect(
      this.polys.has(pkey(p)),
      `${this.where}: 발문에 다항식 ${pkey(p)} 가 없다`,
    ).toBe(true);
  }

  eq(lhs: string, v: number): void {
    this.checked += 1;
    const got = this.eqs.get(lhs) ?? [];
    expect(
      got.some((g) => close(g, v)),
      `${this.where}: 발문에 ${lhs}=${v} 가 없다 (${JSON.stringify(got)})`,
    ).toBe(true);
  }

  has(fragment: string): void {
    this.checked += 1;
    expect(
      this.content.includes(fragment),
      `${this.where}: 발문에 «${fragment}» 가 없다`,
    ).toBe(true);
  }
}

// ───────────────────────────── 시험 쪽 셈 ─────────────────────────────

/** 정수·유리 근을 찾아 곱으로 벗긴다 — 분모 후보 `dens`. 남은 몫과 근을 돌려준다. */
function peelRoots(
  f: readonly number[],
  dens: readonly number[],
): { roots: number[]; rest: P } {
  let rest: P = [...f];
  const roots: number[] = [];
  for (let guard = 0; guard < 8; guard += 1) {
    let found: number | null = null;
    for (const d of dens) {
      for (let n = -40; n <= 40 && found === null; n += 1) {
        const x = n / d;
        if (Math.abs(pval(rest, x)) < 1e-9) found = x;
      }
      if (found !== null) break;
    }
    if (found === null) break;
    roots.push(found);
    // 조립제법으로 (x - found) 를 벗긴다
    const out: number[] = [];
    let carry = 0;
    for (let i = rest.length - 1; i >= 1; i -= 1) {
      carry = carry * found + rest[i]!;
      out.unshift(carry);
    }
    rest = out;
  }
  return { roots, rest };
}

const isInt = (v: number) => Math.abs(v - Math.round(v)) < 1e-9;

/** 전개된 이변수 이차식에서 지정된 인수 꼴의 실수 계수를 모두 푼다. */
function factor04Solutions(
  value: (x: number, y: number) => number,
  g: number,
  h: number,
): [number, number, number][] {
  const constant = value(0, 0);
  const ab = (value(1, 0) + value(-1, 0)) / 2 - constant;
  const c = (value(0, 1) + value(0, -1)) / 2 - constant;
  const xy = value(1, 1) - value(1, 0) - value(0, 1) + constant;
  expect(c, "이 꼴의 y² 계수를 읽었다").not.toBe(0);
  const discriminant = xy * xy - 4 * c * ab;
  if (discriminant < 0) return [];
  // b=xy-ac를 ab에 넣은 이차방정식의 두 실근: 정수 범위로 좁히지 않는다.
  const candidates = [
    ...new Set([
      (xy - Math.sqrt(discriminant)) / (2 * c),
      (xy + Math.sqrt(discriminant)) / (2 * c),
    ]),
  ];
  return candidates
    .map((a): [number, number, number] => [a, xy - a * c, c])
    .filter(([a, b, cc]) =>
      [
        [0, 0],
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
      ].every(([x, y]) =>
        close((a * x! + y! + g) * (b * x! + cc * y! + h), value(x!, y!)),
      ),
    );
}

/** 순환식 여섯 — 제품의 문자열을 안 읽고 시험 쪽에서 값으로 다시 적었다. */
const CYCLIC: ((a: number, b: number, c: number) => number)[] = [
  (a, b, c) =>
    a * (b + c) ** 2 + b * (c + a) ** 2 + c * (a + b) ** 2 - 4 * a * b * c,
  (a, b, c) =>
    a * a * (b + c) + b * b * (c + a) + c * c * (a + b) + 2 * a * b * c,
  (a, b, c) => (a + b + c) * (a * b + b * c + c * a) - a * b * c,
  (a, b, c) => a * a * (b - c) + b * b * (c - a) + c * c * (a - b),
  (a, b, c) => a * b * (a - b) + b * c * (b - c) + c * a * (c - a),
  (a, b, c) => (a - b) ** 3 + (b - c) ** 3 + (c - a) ** 3,
];

const LETTERS = [
  ["a", "b", "c"],
  ["x", "y", "z"],
  ["p", "q", "r"],
] as const;

/** 삼각형 조건식 — 변의 값 [a, b, c] 와 역할(P, Q, R 자리)로. */
function triE(s: readonly number[], f: Fact, right: boolean): number {
  const P = s[f.iP!]!;
  const Q = s[f.iQ!]!;
  const R = s[f.iR!]!;
  if (right) return (P + Q) * (P * P + Q * Q - R * R);
  return f.fam === 0
    ? P * P - P * R - Q * Q + Q * R
    : P * P - Q * Q + P * R - Q * R;
}

// ───────────────────────────── VERIFY ─────────────────────────────

type Expect =
  { num: number } | { expr: (e: Env) => number; envs?: (e: Env) => Env };

function checkAnswer(p: HighProblem, want: Expect, where: string): void {
  if ("num" in want) {
    const got = readAnswerValues(p.answer);
    expect(got.length, `${where} 값 개수`).toBe(1);
    expect(Math.abs(got[0]!.im), where).toBeLessThan(1e-9);
    expect(
      Math.abs(got[0]!.re - want.num),
      `${where}: 지면 ${p.answer} · 검산 ${want.num}`,
    ).toBeLessThan(1e-6 * Math.max(1, Math.abs(want.num)));
    return;
  }
  const body = /^\$(.+)\$$/.exec(p.answer.trim())![1]!;
  for (const base of ENVS) {
    const env = want.envs ? want.envs(base) : base;
    const got = evalTex(body, env);
    const exp = want.expr(env);
    expect(
      close(got, exp),
      `${where}: 지면 ${p.answer} 가 ${JSON.stringify(env)} 에서 ${got} · 검산 ${exp}`,
    ).toBe(true);
  }
}

const VERIFY: Record<string, (f: Fact) => Expect> = {
  "01": (f) => {
    if (f.mode === 0) {
      const { p, q, sg } = f;
      if (f.fam === 0) {
        return {
          expr: (e) =>
            p! ** 3 * e.x! ** 3 + sg! * q! ** 3 * (f.y === 1 ? e.y! ** 3 : 1),
        };
      }
      if (f.fam === 1) {
        return {
          expr: (e) =>
            p! ** 3 * e.x! ** 3 +
            3 * sg! * p! * p! * q! * e.x! * e.x! * e.y! +
            3 * p! * q! * q! * e.x! * e.y! * e.y! +
            sg! * q! ** 3 * e.y! ** 3,
        };
      }
      return {
        expr: (e) =>
          e.x! ** 2 +
          p! * p! * e.y! ** 2 +
          q! * q! +
          2 * p! * e.x! * e.y! +
          2 * p! * q! * e.y! +
          2 * q! * e.x!,
      };
    }
    // (x+m)^3 ± n^3 = (x+a)(x^2+bx+c) — 시험이 스스로 인수분해한다
    const cube = pmul(pmul([f.m!, 1], [f.m!, 1]), [f.m!, 1]);
    const F = padd(cube, [f.sg! * f.n! ** 3]);
    const { roots, rest } = peelRoots(F, [1]);
    expect(roots.length, "정수근이 하나여야 한다").toBe(1);
    const a = -roots[0]!;
    const [c, b] = [rest[0]!, rest[1]!];
    return { num: [a + b + c, a - b + c, a * b * c][f.exprId!]! };
  },

  "02": (f) => {
    const fours = [f.al!, f.de!, f.be!, f.gm!];
    const prod = fours.reduce<P>((acc, r) => pmul(acc, [r, 1]), [1]);
    if (f.mode === 0) {
      const F = padd(prod, [f.k!]);
      const { roots, rest } = peelRoots(F, [1]);
      expect(
        roots.length,
        "정수근이 둘이어야 한다(남은 이차식은 더 안 쪼개진다)",
      ).toBe(2);
      const [a, b] = roots.map((r) => -r) as [number, number];
      expect(rest[1], "남은 이차식의 x 계수가 발문과 다르다").toBe(
        f.al! + f.de!,
      );
      const c = rest[0]!;
      return { num: [a + b + c, a + b - c, a * b * c][f.exprId!]! };
    }
    if (f.mode === 1) {
      const F = padd(pmul([f.p!, f.s!, 1], [f.q!, f.s!, 1]), [f.k!]);
      const a = F[3]! - f.s!;
      const b = F[0]! / f.m!;
      expect(
        pkey(pmul([f.m!, a, 1], [b, f.s!, 1])),
        "주어진 꼴로 안 쪼개진다",
      ).toBe(pkey(F));
      return { num: [a * b, a + b, a - b][f.exprId!]! };
    }
    const u = prod[3]! / 2;
    const w = (prod[2]! - u * u) / 2;
    expect(prod[1], "완전제곱식이 될 수 없다").toBe(2 * u * w);
    return { num: w * w - prod[0]! };
  },

  "03": (f) => {
    if (f.mode === 0) {
      const S = f.u! ** 2 + f.v! ** 2;
      const Pd = f.u! ** 2 * f.v! ** 2;
      const D = Math.sqrt(S * S - 4 * Pd);
      const Xs = [(S - D) / 2, (S + D) / 2];
      const roots = Xs.flatMap((X) => [Math.sqrt(X), -Math.sqrt(X)]);
      const [a, b, c, d] = roots.map((r) => -r).sort((x, y) => x - y) as [
        number,
        number,
        number,
        number,
      ];
      return {
        num: [a * d - b * c, a * b + c * d, a + 2 * b + 3 * c + 4 * d][
          f.exprId!
        ]!,
      };
    }
    if (f.mode === 1) {
      // x^4 + (2m - n^2)x^2 + m^2 = (x^2+ax+b)(x^2-cx+d), a,b,c,d > 0
      const F0 = f.m! ** 2;
      const F2 = 2 * f.m! - f.n! ** 2;
      const b = Math.sqrt(F0);
      const a = Math.sqrt(2 * b - F2);
      const [c, d] = [a, b];
      return {
        num: [a + b + c + d, a * b + c * d, a * b * c * d][f.exprId!]!,
      };
    }
    if (f.v === 0) {
      const B1 = f.b! - f.a! ** 2;
      const B0 = -(f.a! ** 2) * f.b!;
      const D = Math.sqrt(B1 * B1 - 4 * B0);
      const X1 = (-B1 + D) / 2;
      const X2 = (-B1 - D) / 2;
      return { num: Math.sqrt(X1) + -X2 };
    }
    // x^4 - 2u^2x^2 + u^4 = (x+a)^2(x+b)^2, a > b
    return { num: Math.sqrt(f.u! ** 2) - -Math.sqrt(f.u! ** 2) };
  },

  "04": (f) => {
    if (f.mode === 0) {
      const { p, q, r, s } = f as Required<Fact>;
      return {
        expr: (e) =>
          e.x! ** 2 +
          (p! + r!) * e.x! * e.y! +
          p! * r! * e.y! ** 2 +
          (q! + s!) * e.x! +
          (p! * s! + q! * r!) * e.y! +
          q! * s!,
      };
    }
    if (f.mode === 1) {
      const { a, b, c, g, h } = f as Required<Fact>;
      const solutions = factor04Solutions(
        (x, y) => (a! * x + y + g!) * (b! * x + c! * y + h!),
        g!,
        h!,
      );
      expect(
        solutions.length,
        "주어진 꼴의 실수 계수 해가 없다",
      ).toBeGreaterThan(0);
      const values = solutions.map(
        ([A, B, Cc]) => [A + B - Cc, A + B + Cc, A * B * Cc][f.exprId!]!,
      );
      expect(
        values.every((v) => close(v, values[0]!)),
        "모든 실수 계수 해에서 목표값이 같다",
      ).toBe(true);
      return { num: values[0]! };
    }
    const { u, v } = f as Required<Fact>;
    return {
      expr: (e) =>
        e.x! ** 3 -
        e.x! ** 2 * e.y! -
        (u! + v!) * e.x! ** 2 +
        (u! + v!) * e.x! * e.y! +
        u! * v! * e.x! -
        u! * v! * e.y!,
    };
  },

  "05": (f) => {
    const I = CYCLIC[f.id!]!;
    const L = LETTERS[f.set!]!;
    if (f.mode === 0) return { expr: (e) => I(e[L[0]]!, e[L[1]]!, e[L[2]]!) };
    if (f.mode === 1) {
      const [p, q, r] = [f.p!, f.q!, f.r!];
      return { num: I((p - q + r) / 2, (p + q - r) / 2, (q + r - p) / 2) };
    }
    return { num: I(f.p! + f.q!, f.q!, 0) };
  },

  "06": (f) => {
    if (f.mode === 0) {
      const F = pmul(pmul([-f.r1!, 1], [-f.r2!, f.P!]), [-f.r3!, 1]);
      const { roots } = peelRoots(F, f.P === 1 ? [1] : [1, f.P!]);
      expect(roots.length, "근을 셋 다 못 찾았다").toBe(3);
      let A: number;
      let B: number;
      let Cc: number;
      if (f.P === 1) {
        [A, B, Cc] = roots.map((r) => -r) as [number, number, number];
      } else {
        const ints = roots.filter(isInt);
        const frac = roots.filter((r) => !isInt(r));
        expect(frac.length, "정수가 아닌 근이 하나여야 한다").toBe(1);
        [A, Cc] = ints.map((r) => -r) as [number, number];
        B = -f.P! * frac[0]!;
      }
      return {
        num: [A * A + B * B + Cc * Cc, A + B + Cc, A * B * Cc][f.exprId!]!,
      };
    }
    if (f.mode === 1) {
      const F = pmul(proots([f.r1!, f.r2!]), [f.n!, f.m!, 1]);
      return { expr: (e) => pval(F, e.x!) };
    }
    // (x-r)^2 이 인수 ⇔ f(r) = 0 이고 f'(r) = 0 — 두 식을 풀어 a, b
    const r = f.r!;
    const a = (f.c! - 2 * r ** 3) / (r * r);
    const b = -3 * r * r - 2 * a * r;
    return { num: [a + b, a * b][f.exprId!]! };
  },

  "07": (f) => {
    if (f.mode === 0) {
      const { a, b, k } = f as Required<Fact>;
      return {
        envs: (e) => ({ ...e, y: -(a! * e.x! + k!) / b! }),
        expr: (e) =>
          k! * k! -
          a! * a! * e.x! ** 2 +
          2 * a! * b! * e.x! * e.y! -
          b! * b! * e.y! ** 2,
      };
    }
    const { c, d } = f as Required<Fact>;
    return {
      envs: (e) => ({ ...e, z: -c! - e.x! - e.y! }),
      expr: (e) =>
        e.x! * e.y! * e.z! +
        e.x! ** 2 * e.y! +
        c! * e.x! * e.y! -
        d! * e.x! -
        d! * e.z! -
        c! * d!,
    };
  },

  "08": (f) => {
    if (f.mode === 0) {
      const g = f.g!;
      const p = f.p!;
      const diff = f.tgt === 0 || f.tgt === 4;
      const a = diff
        ? (g + Math.sqrt(g * g + 4 * p)) / 2
        : (g + Math.sqrt(g * g - 4 * p)) / 2;
      const b = diff ? a - g : g - a;
      const T = [
        a ** 3 - b ** 3 + a * a * b - a * b * b,
        a ** 3 + b ** 3 + a * a * b + a * b * b,
        a * a * b + a * b * b + a + b,
        a ** 3 * b + a * b ** 3,
        a ** 3 - b ** 3 - a * a * b + a * b * b,
      ][f.tgt!]!;
      return { num: T };
    }
    if (f.mode === 1) {
      const x = f.m! + Math.sqrt(f.r!);
      const y = f.m! - Math.sqrt(f.r!);
      return {
        num:
          f.fam === 0
            ? x ** 4 - x ** 3 * y - x * y ** 3 + y ** 4
            : x ** 3 + x * x * y + x * y * y + y ** 3,
      };
    }
    const [p, q, r] = [f.p!, f.q!, f.r!];
    const a = (p - q + r) / 2;
    const b = (p + q - r) / 2;
    const c = (q + r - p) / 2;
    return { num: (a + b + c) * (a * b + b * c + c * a) - a * b * c };
  },

  "09": (f) => {
    const B = (v: number) => BigInt(v);
    if (f.mode === 0) {
      const N = B(f.N!);
      const one = B(1);
      let num: bigint;
      let den: bigint;
      if (f.fam === 0) {
        num = N ** B(3) + one;
        den = (N - one) * N + one;
      } else if (f.fam === 1) {
        num = N ** B(3) - one;
        den = N * (N + one) + one;
      } else {
        const k = B(f.k!);
        num = (N - k) ** B(3) * (N + k) ** B(3);
        den = (N * N - B(2) * k * k) * N * N + k ** B(4);
      }
      expect(num % den, "나누어떨어지지 않는다").toBe(B(0));
      return { num: Number(num / den) };
    }
    if (f.fam === 0) {
      let s = 0;
      let sign = 1;
      for (let o = f.T!; o >= 1; o -= 2) {
        s += sign * o * o;
        sign = -sign;
      }
      return { num: s };
    }
    if (f.fam === 1) {
      const { x, d } = f as Required<Fact>;
      const v = Math.sqrt(
        x! * (x! + d!) * (x! + 2 * d!) * (x! + 3 * d!) + d! ** 4,
      );
      expect(isInt(v), "제곱근이 자연수가 아니다").toBe(true);
      return { num: v };
    }
    const fx = pmul(pmul(pmul([-f.a!, 1], [-f.a!, 1]), [-f.a!, 1]), [-f.b!, 1]);
    return { num: pval(fx, f.N!) };
  },

  "10": (f) => {
    const s = [0, 0, 0];
    if (f.mode === 0) {
      s[f.iP!] = f.vp!;
      s[f.iQ!] = f.vp!;
      s[f.iR!] = f.vr!;
      expect(triE(s, f, false), "이등변인데 조건식이 0 이 아니다").toBe(0);
      return { num: s[0]! + s[1]! + s[2]! };
    }
    const q = Math.sqrt(f.h! ** 2 - f.vp! ** 2);
    s[f.iP!] = f.vp!;
    s[f.iQ!] = q;
    s[f.iR!] = f.h!;
    expect(
      Math.abs(triE(s, f, true)),
      "직각인데 조건식이 0 이 아니다",
    ).toBeLessThan(1e-9);
    return { num: (f.vp! * q) / 2 };
  },
};

// ───────────────────────────── SHOWN ─────────────────────────────

const SHOWN: Record<string, (f: Fact, sh: Shown) => void> = {
  "01": (f, sh) => {
    if (f.mode === 1) {
      sh.expr((e) => (e.x! + f.m!) ** 3 + f.sg! * f.n! ** 3);
      return;
    }
    const want = VERIFY["01"]!(f) as { expr: (e: Env) => number };
    sh.expr(want.expr);
  },
  "02": (f, sh) => {
    const fours = [f.al!, f.de!, f.be!, f.gm!];
    if (f.mode === 0) {
      sh.expr((e) => fours.reduce((acc, r) => acc * (e.x! + r), 1) + f.k!);
    } else if (f.mode === 1) {
      sh.poly([f.p!, f.s!, 1]);
      sh.poly([f.q!, f.s!, 1]);
      sh.expr(
        (e) =>
          (e.x! ** 2 + f.s! * e.x! + f.p!) * (e.x! ** 2 + f.s! * e.x! + f.q!) +
          f.k!,
      );
    } else {
      sh.expr((e) => fours.reduce((acc, r) => acc * (e.x! + r), 1) + e.k!);
    }
  },
  "03": (f, sh) => {
    if (f.mode === 0) {
      sh.poly([f.u! ** 2 * f.v! ** 2, 0, -(f.u! ** 2 + f.v! ** 2), 0, 1]);
    } else if (f.mode === 1) {
      sh.poly([f.m! ** 2, 0, 2 * f.m! - f.n! ** 2, 0, 1]);
    } else if (f.v === 0) {
      sh.poly([-(f.a! ** 2) * f.b!, 0, f.b! - f.a! ** 2, 0, 1]);
    } else {
      sh.poly([f.u! ** 4, 0, -2 * f.u! ** 2, 0, 1]);
    }
  },
  "04": (f, sh) => {
    if (f.mode === 1) {
      const { a, b, c, g, h } = f as Required<Fact>;
      sh.expr((e) => (a! * e.x! + e.y! + g!) * (b! * e.x! + c! * e.y! + h!));
      return;
    }
    sh.expr((VERIFY["04"]!(f) as { expr: (e: Env) => number }).expr);
  },
  "05": (f, sh) => {
    const I = CYCLIC[f.id!]!;
    const L = LETTERS[f.set!]!;
    sh.expr((e) => I(e[L[0]]!, e[L[1]]!, e[L[2]]!));
    if (f.mode === 1) {
      sh.eq(`${L[0]}+${L[1]}`, f.p!);
      sh.eq(`${L[1]}+${L[2]}`, f.q!);
      sh.eq(`${L[2]}+${L[0]}`, f.r!);
    } else if (f.mode === 2) {
      sh.eq(`${L[0]}-${L[1]}`, f.p!);
      sh.eq(`${L[1]}-${L[2]}`, f.q!);
    }
  },
  "06": (f, sh) => {
    if (f.mode === 0) {
      sh.poly(pmul(pmul([-f.r1!, 1], [-f.r2!, f.P!]), [-f.r3!, 1]));
    } else if (f.mode === 1) {
      sh.poly(pmul(proots([f.r1!, f.r2!]), [f.n!, f.m!, 1]));
    } else {
      sh.expr((e) => e.x! ** 3 + e.a! * e.x! ** 2 + e.b! * e.x! + f.c!);
      sh.poly([-f.r!, 1]);
    }
  },
  "07": (f, sh) => {
    if (f.mode === 0) {
      const { a, b, k } = f as Required<Fact>;
      sh.expr(
        (e) =>
          k! * k! -
          a! * a! * e.x! ** 2 +
          2 * a! * b! * e.x! * e.y! -
          b! * b! * e.y! ** 2,
      );
      sh.expr((e) => a! * e.x! + b! * e.y! + k!);
      return;
    }
    const { c, d } = f as Required<Fact>;
    sh.expr(
      (e) =>
        e.x! * e.y! * e.z! +
        e.x! ** 2 * e.y! +
        c! * e.x! * e.y! -
        d! * e.x! -
        d! * e.z! -
        c! * d!,
    );
    sh.eq("x+y+z", -c!);
  },
  "08": (f, sh) => {
    if (f.mode === 0) {
      sh.eq(f.tgt === 0 || f.tgt === 4 ? "a-b" : "a+b", f.g!);
      sh.eq("ab", f.p!);
    } else if (f.mode === 1) {
      sh.eq("x", f.m! + Math.sqrt(f.r!));
      sh.eq("y", f.m! - Math.sqrt(f.r!));
    } else {
      sh.eq("a+b", f.p!);
      sh.eq("b+c", f.q!);
      sh.eq("c+a", f.r!);
    }
  },
  "09": (f, sh) => {
    if (f.mode === 0) {
      if (f.fam === 2) sh.has(`${f.N! - f.k!}^{3}\\times ${f.N! + f.k!}^{3}`);
      else sh.has(`${f.N}^{3}${f.fam === 0 ? "+" : "-"}1`);
      return;
    }
    if (f.fam === 0) sh.has(`${f.T}^{2}-${f.T! - 2}^{2}`);
    else if (f.fam === 1) sh.has(`\\sqrt{${f.x}\\times ${f.x! + f.d!}\\times `);
    else
      sh.poly(pmul(pmul(pmul([-f.a!, 1], [-f.a!, 1]), [-f.a!, 1]), [-f.b!, 1]));
  },
  "10": (f, sh) => {
    const right = f.mode === 1;
    sh.expr((e) => triE([e.a!, e.b!, e.c!], f, right));
    const names = ["a", "b", "c"];
    if (f.mode === 0) {
      sh.eq(names[f.showP === 1 ? f.iP! : f.iQ!]!, f.vp!);
      sh.eq(names[f.iR!]!, f.vr!);
    } else {
      sh.eq(names[f.iP!]!, f.vp!);
      sh.eq(names[f.iR!]!, f.h!);
    }
  },
};

const MODES: Record<string, number> = {
  "01": 2,
  "02": 3,
  "03": 3,
  "04": 3,
  "05": 3,
  "06": 3,
  "07": 2,
  "08": 3,
  "09": 2,
  "10": 2,
};

function eachProblem(
  fn: (p: HighProblem, key: string, number: string) => void,
) {
  for (const entry of H1_FACTOR) {
    for (const seed of SEEDS) {
      for (let v = 0; v < VARIANTS; v += 1) {
        fn(generateHighProblem(entry.key, seed, v), entry.key, entry.rpmType);
      }
    }
  }
}

describe("고등 공통수학1 인수분해 — 등록", () => {
  it("색인 10유형을 전부 등록했고 번호·제목·중단원이 색인 바이트와 같다", () => {
    expect(catalogRows.length, "색인 유형 수").toBe(10);
    expect(H1_FACTOR.length + H1_FACTOR_HOLD.length).toBe(catalogRows.length);
    for (const e of H1_FACTOR) {
      const row = rowOf(e.rpmType);
      expect(e.rpmTitle, `${e.key} 제목`).toBe(row.title);
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
    for (const e of H1_FACTOR) {
      expect(sections.has(e.unitSection), `${e.key} — ${e.unitSection}`).toBe(
        true,
      );
    }
  });

  it("등록부에 들어 있고, 보류와 겹치지 않는다", () => {
    const keys = new Set(registeredHighTypes().map((e) => e.key));
    for (const e of H1_FACTOR) expect(keys.has(e.key)).toBe(true);
    const held = new Set(registeredHighHolds().map((h) => h.key));
    for (const e of H1_FACTOR) expect(held.has(e.key)).toBe(false);
  });
});

describe("고등 공통수학1 인수분해 — 값", () => {
  it("HIGH-ALG-001: 씨앗 113을 포함한 300판의 모든 실수 계수 해에서 답이 하나다", () => {
    let checked = 0;
    for (let seed = 0; seed < 300; seed += 1) {
      const p = generateHighProblem(`${BOOK}|${MINOR}|04`, seed);
      if (p.facts.mode !== 1) continue;
      checked += 1;
      const spans = mathSpans(p.content);
      const form = /^\(ax\+y([+-]\d+)\)\(bx\+cy([+-]\d+)\)$/.exec(spans[1]!);
      expect(form, `seed ${seed}: 인수의 상수항`).not.toBeNull();
      const solutions = factor04Solutions(
        (x, y) => evalTex(spans[0]!, { x, y }),
        Number(form![1]),
        Number(form![2]),
      );
      expect(
        solutions.length,
        `seed ${seed}: 발문을 만족하는 (a,b,c)가 있다`,
      ).toBeGreaterThan(0);
      const target = spans.at(-1)!;
      for (const [a, b, c] of solutions)
        expect(
          readAnswerValues(p.answer)[0]!.re,
          `seed ${seed}: 모든 계수 해의 목표값`,
        ).toBeCloseTo(evalTex(target, { a, b, c }), 9);
    }
    expect(checked, "300판 중 해당 꼴을 실제로 검산한 수").toBeGreaterThan(50);
  });

  it("HIGH-ALG-001: 정수 조건만으로도 유일해지지 않는 반례를 센다", () => {
    const solutions = factor04Solutions(
      (x, y) => (x + y + 1) * (x - y - 1),
      1,
      -1,
    );
    expect(solutions).toEqual([
      [1, 1, -1],
      [-1, -1, -1],
    ]);
    expect(new Set(solutions.map(([a, b, c]) => a + b - c)).size).toBe(2);
  });

  it("정답을 facts 로 다시 세운 것과 같다", () => {
    eachProblem((p, key, number) => {
      const want = VERIFY[number]!(p.facts);
      checkAnswer(p, want, `${key} (${JSON.stringify(p.facts)})`);
    });
  });

  it("발문이 facts 가 말하는 식·수치를 그대로 보여 준다", () => {
    let checked = 0;
    eachProblem((p, key, number) => {
      const sh = new Shown(p.content, `${key} (${JSON.stringify(p.facts)})`);
      SHOWN[number]!(p.facts, sh);
      expect(sh.checked, `${key}: 이 꼴은 대조가 하나도 없다`).toBeGreaterThan(
        0,
      );
      checked += sh.checked;
    });
    expect(
      checked,
      "지면 대조가 하나도 안 돌면 이 검사는 장식이다",
    ).toBeGreaterThan(1000);
  });

  it("유형마다 모든 꼴이 한 번은 검산된다", () => {
    const seen = new Map<string, Set<number>>();
    eachProblem((p, _key, number) => {
      if (!seen.has(number)) seen.set(number, new Set());
      seen.get(number)!.add(p.facts.mode!);
    });
    for (const [number, n] of Object.entries(MODES)) {
      expect(
        [...(seen.get(number) ?? [])].sort(),
        `${number}: 안 돈 꼴이 있다`,
      ).toEqual(Array.from({ length: n }, (_, i) => i));
    }
  });
});

describe("고등 공통수학1 인수분해 — 오답", () => {
  it("생성기가 낸 오답은 정답과 **값이 다른** 식이다", () => {
    let withDistractors = 0;
    eachProblem((p, key) => {
      if (!p.distractors) return;
      withDistractors += 1;
      expect(p.distractors, key).toHaveLength(4);
      const body = /^\$(.+)\$$/.exec(p.answer.trim())![1]!;
      const ans = ENVS.map((e) => evalTex(body, e));
      for (const d of p.distractors) {
        const inner = /^\$(.+)\$$/.exec(d.trim())![1]!;
        const got = ENVS.map((e) => evalTex(inner, e));
        expect(
          got.some((g, i) => !close(g, ans[i]!)),
          `${key} 오답이 정답과 같은 값: ${d} ≡ ${p.answer}`,
        ).toBe(true);
      }
    });
    expect(
      withDistractors,
      "오답을 내는 꼴이 하나도 안 나오면 이 검사는 장식이다",
    ).toBeGreaterThan(50);
  });

  // 2026-10-08 적재 전 관문(`scripts/qa/highLoadGate.ts`)이 찾은 것 — 04 꼴 0 에서 $r=-p$ 이면 오답 둘이
  // 인수의 차례만 다른 같은 식이었다. 글자는 달라 `pickDistractors` 의 겹침 검사를 지났다.
  it("🔴 오답끼리도 **값이 다른** 식이다 — 인수의 차례만 바꾼 같은 식이 보기 둘로 나가지 않는다", () => {
    const valuesOf = (s: string) => {
      const inner = /^\$(.+)\$$/.exec(s.trim())![1]!;
      return ENVS.map((e) => evalTex(inner, e));
    };
    let pairs = 0;
    let opposite = 0;
    const check = (p: HighProblem, key: string) => {
      if (!p.distractors) return;
      const vals = p.distractors.map(valuesOf);
      for (let i = 0; i < vals.length; i += 1)
        for (let j = i + 1; j < vals.length; j += 1) {
          pairs += 1;
          expect(
            vals[i]!.some((g, k) => !close(g, vals[j]![k]!)),
            `${key} 오답 둘이 같은 값: ${p.distractors[i]} ≡ ${p.distractors[j]}`,
          ).toBe(true);
        }
    };
    eachProblem(check);
    // 04 꼴 0 의 그 자리($p+r=0$)는 따로 넓게 — 위 다섯 씨앗에 안 걸리면 이 검사가 그 판을 못 본다.
    for (let seed = 1; seed <= 400; seed += 1) {
      const p = generateHighProblem(`${BOOK}|${MINOR}|04`, seed, 0);
      if (p.facts.mode !== 0) continue;
      if (p.facts.p! + p.facts.r! === 0) opposite += 1;
      check(p, `04 씨앗 ${seed}`);
    }
    expect(pairs, "견준 오답 쌍").toBeGreaterThan(1000);
    expect(opposite, "04 꼴 0 가운데 $r=-p$ 인 판").toBeGreaterThan(10);
  });
});

// 쓰지 않는 도구가 남으면 lint 가 운다 — plongDivide 는 01 꼴 1 을 다른 길로 한 번 더 확인할 때 쓴다
describe("고등 공통수학1 인수분해 — 검산 도구", () => {
  it("peelRoots 는 긴 나눗셈과 같은 몫을 낸다", () => {
    const F = pmul(pmul([2, 1], [-3, 1]), [1, 1, 1]);
    const { roots, rest } = peelRoots(F, [1]);
    expect(roots.sort((a, b) => a - b)).toEqual([-2, 3]);
    expect(pkey(rest)).toBe(pkey(plongDivide(F, proots([-2, 3])).q));
  });
});
