/**
 * 중1 「문자의 사용과 식의 계산」16 + 「일차방정식의 풀이」17 = 33유형 (`m1Expr.ts`) — 독립 검산.
 *
 * ## 무엇이 «독립»인가
 *
 * 생성기는 **계수 산술**로 답을 만든다(역산해서 $p$, $q$, 해 $r$ 을 정한다).
 * 여기서는 그 산술을 **옮겨 적지 않는다.** 대신 발문·정답에 실제로 찍힌 LaTeX 를
 * 작은 계산기(`evalTex`)로 파싱해 **수를 대입해서 잰다**:
 *
 *  - 방정식 유형은 **정답의 해를 대입**해 좌변과 우변이 같은지 본다(3B 브리프 지시).
 *  - 계산 유형은 표본 $x$ 여럿에서 **발문의 식과 정답의 식이 같은 값**인지 본다.
 *  - 판별 유형(등식·항등식·등식의 성질·일차방정식)은 **여러 점에서 재어** 스스로 센다 —
 *    생성기가 붙인 «종류» 꼬리표를 안 믿는다.
 *  - 「두 방정식의 해가 같은 경우」는 첫 방정식을 **여기서 직접 풀어** 해를 얻는다.
 *  - 「이항」·「특수한 해」는 계수를 **찍어서 되찾는다**($f(1)-f(0)$ 로 기울기, $-f(0)$ 로 상수).
 *
 * 그래서 생성기가 역산을 틀리면 여기서 빨개진다. 계산기가 보는 것은 **지면에 나가는
 * 글자 그대로**라, 계수는 맞는데 렌더가 틀린 경우(부호·괄호·지수)도 같이 잡힌다.
 *
 * 유형 번호·제목·중단원 이름은 `scripts/rpm/rpm-type-catalog.json`(정본)과 직접 대조한다 —
 * 손 목록 이중화 금지 (2026-08-18 교훈). 시험이 훑는 것은 `registeredTypes()` 전량이 아니라
 * **자기 모듈 `M1_EXPR`** 이다 — 중단원 이름으로 거르면 같은 중단원의 남의 유형
 * (`m1Book1.ts` 의 문자 09·10·12·13, 일차방정식 05)이 이 검산표에 들이대진다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { bareNumbers } from "../../lib/elementary/rules";
import { renderMathHtml } from "../../lib/math/renderMathHtml";
import {
  generateMiddleProblem,
  generateMiddleSet,
  registeredTypes,
} from "../../lib/middle/generate";
import { M1_EXPR } from "../../lib/middle/m1Expr";
import type { MidProblem } from "../../lib/middle/types";

const REPO = path.resolve(__dirname, "../../..");
const SEEDS = [20260823, 1, 7777, 424242, 99991];

type Env = Record<string, number>;

// ══════════════════════════════════════════════════════════════
//  독립 계산기 — 지면에 찍힌 LaTeX 에 수를 대입해 값을 낸다.
//  생성기는 이 코드를 안 쓴다(계수 산술로 답을 만든다). 그래서 동어반복이 아니다.
// ══════════════════════════════════════════════════════════════

const OPENERS: readonly (readonly [string, string])[] = [
  ["\\left(", "\\right)"],
  ["\\left[", "\\right]"],
  ["\\left\\{", "\\right\\}"],
  ["(", ")"],
  ["[", "]"],
  ["\\{", "\\}"],
];

class TexEval {
  private i = 0;

  constructor(
    private readonly s: string,
    private readonly env: Env,
  ) {}

  static run(tex: string, env: Env): number {
    const p = new TexEval(tex, env);
    const v = p.expr();
    p.ws();
    if (p.i !== p.s.length) {
      throw new Error(
        `계산기가 다 못 읽었다: ${tex} (남은 것 ${p.s.slice(p.i)})`,
      );
    }
    return v;
  }

  private ws(): void {
    while (this.i < this.s.length && /\s/.test(this.s[this.i]!)) this.i += 1;
  }

  private eat(tok: string): boolean {
    this.ws();
    if (this.s.startsWith(tok, this.i)) {
      this.i += tok.length;
      return true;
    }
    return false;
  }

  private expect(tok: string): void {
    if (!this.eat(tok)) {
      throw new Error(`${tok} 를 기대했다: ${this.s.slice(this.i)}`);
    }
  }

  private startsFactor(): boolean {
    this.ws();
    const rest = this.s.slice(this.i);
    if (rest === "") return false;
    if (/^[0-9A-Za-z]/.test(rest)) return true;
    if (rest.startsWith("\\dfrac{") || rest.startsWith("\\frac{")) return true;
    for (const [open] of OPENERS) {
      if (rest.startsWith(open)) return true;
    }
    return false;
  }

  private expr(): number {
    let v = this.unary();
    for (;;) {
      this.ws();
      if (this.eat("+")) v += this.unary();
      else if (this.eat("-")) v -= this.unary();
      else break;
    }
    return v;
  }

  /** 곱셈·나눗셈 — 나란히 놓인 것은 생략된 곱셈으로 읽는다. */
  private unary(): number {
    this.ws();
    if (this.eat("-")) return -this.unary();
    if (this.eat("+")) return this.unary();
    let v = this.power();
    for (;;) {
      this.ws();
      if (this.eat("\\times")) {
        v *= this.power();
        continue;
      }
      if (this.eat("\\div")) {
        v /= this.power();
        continue;
      }
      if (this.startsFactor()) {
        v *= this.power();
        continue;
      }
      break;
    }
    return v;
  }

  private power(): number {
    let v = this.atom();
    while (this.eat("^{")) {
      const e = this.expr();
      this.expect("}");
      v = v ** e;
    }
    return v;
  }

  private atom(): number {
    this.ws();
    if (this.eat("\\dfrac{") || this.eat("\\frac{")) {
      const n = this.expr();
      this.expect("}");
      this.expect("{");
      const d = this.expr();
      this.expect("}");
      return n / d;
    }
    for (const [open, close] of OPENERS) {
      if (this.eat(open)) {
        const v = this.expr();
        this.expect(close);
        return v;
      }
    }
    const num = /^\d+(?:\.\d+)?/.exec(this.s.slice(this.i));
    if (num) {
      this.i += num[0].length;
      return Number(num[0]);
    }
    const letter = /^[A-Za-z]/.exec(this.s.slice(this.i));
    if (letter) {
      this.i += 1;
      const name = letter[0];
      if (!(name in this.env)) {
        throw new Error(`값을 모르는 문자 ${name}: ${this.s}`);
      }
      return this.env[name]!;
    }
    throw new Error(`읽을 수 없는 자리: ${this.s.slice(this.i)} (${this.s})`);
  }
}

function evalTex(tex: string, env: Env = {}): number {
  return TexEval.run(tex, env);
}

function close(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
}

/** `$...$` 안쪽만 뽑는다 — 학생이 보는 그대로를 읽는다. */
function segs(text: string): string[] {
  return (text.match(/\$[^$]*\$/g) ?? []).map((m) => m.slice(1, -1));
}

function sides(eq: string): [string, string] {
  const parts = eq.split("=");
  if (parts.length !== 2) throw new Error(`등호가 하나가 아니다: ${eq}`);
  return [parts[0]!, parts[1]!];
}

function firstNumber(text: string): number {
  const m = text.match(/-?\d+(?:\.\d+)?/);
  if (!m) throw new Error(`수가 없습니다: ${text}`);
  return Number(m[0]);
}

function allNumbers(text: string): number[] {
  return (text.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
}

/** 마지막 줄의 항목들 — 판별 유형(01·04·06·09)이 나열한 다섯. */
function itemSegs(content: string): string[] {
  return segs(content.split("\n").pop()!);
}

/** 생성기의 `lin` 과 **다른 손**으로 쓴 일차식 표기 — 발문 대조용. */
function linOf(a: number, b: number): string {
  let out = "";
  if (a !== 0) out += `${a === 1 ? "" : a === -1 ? "-" : a}x`;
  if (b !== 0 || out === "") {
    out += out === "" ? `${b}` : b < 0 ? `-${-b}` : `+${b}`;
  }
  return out;
}

/** 발문에서 「$문자=값$」 꼴 조각을 걷어 환경을 만들고, 남은 하나를 식으로 본다. */
function assignmentsAndExpr(content: string): { env: Env; expr: string } {
  const env: Env = {};
  let expr = "";
  for (const seg of segs(content)) {
    const m = /^([a-z])=(.+)$/.exec(seg);
    if (m) env[m[1]!] = evalTex(m[2]!);
    else expr = seg;
  }
  if (expr === "") throw new Error(`식 조각이 없다: ${content}`);
  return { env, expr };
}

/** 「$-1$의 지수 꼴 → 부호」를 생성기와 **따로** 적은 표 (2026-08-21: 표를 두 벌 두되 대조한다). */
const FORM_LABEL: Record<number, string> = {
  0: "2n",
  1: "2n+1",
  2: "2n-1",
  3: "n",
  4: "n+1",
};

function signByParity(form: number, ctx: number): number {
  // ctx 0 = n 자연수 · 1 = n 홀수 · 2 = n 짝수
  if (form === 0) return 1; // 2n 은 늘 짝수
  if (form === 1 || form === 2) return -1; // 2n±1 은 늘 홀수
  const nIsOdd = ctx === 1;
  const expIsOdd = form === 3 ? nIsOdd : !nIsOdd;
  return expIsOdd ? -1 : 1;
}

// ══════════════════════════════════════════════════════════════
//  유형별 검산
// ══════════════════════════════════════════════════════════════

const XS = [0, 1, 2, -3, 7];
const K = (n: string) => `1-1|문자의 사용과 식의 계산|${n}`;
const E = (n: string) => `1-1|일차방정식의 풀이|${n}`;

/** 발문의 식과 정답의 식이 표본 $x$ 전부에서 같은 값인가 (11·14·15). */
function sameValueAsAnswer(p: MidProblem): void {
  const expr = segs(p.content).slice(-1)[0]!;
  const ans = segs(p.answer)[0]!;
  for (const x of XS) {
    const l = evalTex(expr, { x });
    const r = evalTex(ans, { x });
    expect(close(l, r), `x=${x}: ${expr} → ${l} vs ${ans} → ${r}`).toBe(true);
  }
  // 정답이 실제로 일차식이고 facts 의 (p, q) 와 맞는가
  const q = evalTex(ans, { x: 0 });
  const slope = evalTex(ans, { x: 1 }) - q;
  expect(close(q, p.facts.q!), `상수항 ${q} vs ${p.facts.q}`).toBe(true);
  expect(close(slope, p.facts.p!), `x의 계수 ${slope} vs ${p.facts.p}`).toBe(
    true,
  );
}

/** 정답의 해를 방정식에 **대입**해 좌변=우변을 확인한다 (10~14). */
function rootSatisfies(p: MidProblem): void {
  const eq = segs(p.content).find((s) => s.includes("="))!;
  const [L, R] = sides(eq);
  const r = firstNumber(p.answer);
  expect(r).toBe(p.facts.r);
  expect(
    close(evalTex(L, { x: r }), evalTex(R, { x: r })),
    `해 ${r} 대입 실패: ${eq}`,
  ).toBe(true);
  // 해가 하나뿐인가 — 좌변−우변의 기울기가 0이 아니어야 한다
  const f = (x: number) => evalTex(L, { x }) - evalTex(R, { x });
  expect(Math.abs(f(1) - f(0))).toBeGreaterThan(1e-9);
}

const CHECKS: Record<string, (p: MidProblem) => void> = {
  [K("01")]: (p) => {
    const raw = segs(p.content).slice(-1)[0]!;
    const ans = segs(p.answer)[0]!;
    // 발문에 곱해진 x·y 의 개수가 정답의 지수와 맞는가 (facts 와도 대조)
    expect((raw.match(/\\times x/g) ?? []).length).toBe(p.facts.ex);
    expect((raw.match(/\\times y/g) ?? []).length).toBe(p.facts.ey);
    for (const env of [
      { x: 2, y: 3, z: 5 },
      { x: -3, y: 4, z: 2 },
      { x: 5, y: -2, z: 7 },
    ]) {
      expect(close(evalTex(raw, env), evalTex(ans, env)), raw).toBe(true);
    }
  },

  [K("02")]: (p) => {
    const ans = segs(p.answer)[0]!;
    const f = p.facts;
    const expected: Record<number, (e: Env) => number> = {
      0: (e) => f.m! * e.a! + f.n! * e.b!,
      1: (e) => f.N! - f.m! * e.a!,
      2: (e) => 60 * e.a! + f.m!,
      3: (e) => 100 * e.a! + f.m!,
      4: (e) => e.a! - (f.p! * e.a!) / 100,
    };
    for (const e of [
      { a: 300, b: 700 },
      { a: 1200, b: 250 },
    ]) {
      expect(close(evalTex(ans, e), expected[f.mode!]!(e)), ans).toBe(true);
    }
  },

  [K("03")]: (p) => {
    const ans = segs(p.answer)[0]!;
    const f = p.facts;
    const expected: Record<number, (e: Env) => number> = {
      0: (e) => 2 * (e.a! + f.m! * e.b!),
      1: (e) => (2 * f.h! * e.a! * e.b!) / 2,
      2: (e) => ((e.a! + f.d!) * e.h!) / 2,
      3: (e) => f.k! * f.n! * e.x!,
    };
    for (const e of [
      { a: 7, b: 3, h: 5, x: 4 },
      { a: 2, b: 9, h: 6, x: 11 },
    ]) {
      expect(close(evalTex(ans, e), expected[f.mode!]!(e)), ans).toBe(true);
    }
  },

  [K("04")]: (p) => {
    const ans = segs(p.answer)[0]!;
    const f = p.facts;
    const expected: Record<number, (e: Env) => number> = {
      0: (e) => f.D! / e.x!,
      1: (e) => f.v! * e.a!,
      2: (e) => (100 * e.a!) / f.W!,
      3: (e) => (f.W! * e.a!) / 100,
      4: (e) => f.D! - f.v! * e.a!,
    };
    for (const e of [
      { a: 3, x: 4 },
      { a: 12, x: 25 },
    ]) {
      expect(close(evalTex(ans, e), expected[f.mode!]!(e)), ans).toBe(true);
    }
  },

  [K("05")]: (p) => {
    const { env, expr } = assignmentsAndExpr(p.content);
    expect(close(evalTex(expr, env), firstNumber(p.answer)), expr).toBe(true);
    expect(firstNumber(p.answer)).toBe(p.facts.V);
  },

  [K("06")]: (p) => {
    const { env, expr } = assignmentsAndExpr(p.content);
    expect(close(evalTex(expr, env), firstNumber(p.answer)), expr).toBe(true);
    expect(firstNumber(p.answer)).toBe(p.facts.V);
  },

  [K("07")]: (p) => {
    const f = p.facts;
    const formula = segs(p.content).find(
      (s) => /[a-z]/.test(s) && /\d/.test(s),
    )!;
    const V = firstNumber(p.answer);
    expect(V).toBe(f.V);
    const got =
      f.mode === 0
        ? evalTex(formula, { x: f.T! })
        : f.mode === 1
          ? evalTex(formula, { x: f.T! }) * f.t!
          : f.mode === 2
            ? evalTex(formula, { t: f.T! })
            : evalTex(formula, { x: f.a!, y: f.b! });
    expect(close(got, V), `${formula} → ${got} vs ${V}`).toBe(true);
  },

  [K("08")]: (p) => {
    const f = p.facts;
    const V = firstNumber(p.answer);
    const expected =
      f.mode === 0
        ? f.H! - f.c! * f.T!
        : f.mode === 1
          ? f.F! + f.r! * f.T!
          : f.mode === 2
            ? f.w! * f.a! + f.b!
            : 0.38 * f.m!;
    expect(close(V, expected), `${V} vs ${expected}`).toBe(true);
    expect(V).toBe(f.V);
    // 발문이 facts 의 수치를 실제로 말하고 있는가 (발문↔facts 어긋남 방지)
    const nums = new Set(allNumbers(p.content));
    const params =
      f.mode === 0
        ? [f.c!, f.T!, f.H!]
        : f.mode === 1
          ? [f.F!, f.r!, f.T!]
          : f.mode === 2
            ? [f.w!, f.a!, f.b!, f.c!]
            : [f.m!];
    for (const v of params) expect(nums.has(v), `발문에 ${v} 없음`).toBe(true);
  },

  [K("11")]: sameValueAsAnswer,
  [K("14")]: sameValueAsAnswer,
  [K("15")]: sameValueAsAnswer,

  [K("16")]: (p) => {
    const ms = segs(p.content);
    const aDef = ms.find((s) => s.startsWith("A="))!.slice(2);
    const bDef = ms.find((s) => s.startsWith("B="))!.slice(2);
    const comb = ms.find((s) => !s.startsWith("A=") && !s.startsWith("B="))!;
    const ans = segs(p.answer)[0]!;
    for (const x of XS) {
      const A = evalTex(aDef, { x });
      const B = evalTex(bDef, { x });
      const got = evalTex(comb, { A, B });
      expect(close(got, evalTex(ans, { x })), `x=${x}: ${comb}`).toBe(true);
    }
  },

  [K("17")]: (p) => {
    const [A, B] = segs(p.content);
    const R = segs(p.answer)[0]!;
    for (const env of [
      { x: 1, y: 2 },
      { x: -3, y: 5 },
      { x: 4, y: -2 },
    ]) {
      const a = evalTex(A!, env);
      const b = evalTex(B!, env);
      const r = evalTex(R, env);
      // mode 0: 어떤 식 − A = B · mode 1: 어떤 식 + A = B
      const got = p.facts.mode === 0 ? r - a : r + a;
      expect(close(got, b), `${R} / ${A} / ${B}`).toBe(true);
    }
  },

  [K("18")]: (p) => {
    const [A, B] = segs(p.content);
    const R = segs(p.answer)[0]!;
    for (const env of [
      { x: 1, y: 2 },
      { x: -3, y: 5 },
      { x: 4, y: -2 },
    ]) {
      const a = evalTex(A!, env);
      const b = evalTex(B!, env);
      const box = b - a; // 잘못 «더해서» B 가 되었으므로 어떤 식은 B − A
      const correct = p.facts.mode === 0 ? box - a : a - box;
      expect(close(correct, evalTex(R, env)), `${R} / ${A} / ${B}`).toBe(true);
    }
  },

  [K("19")]: (p) => {
    const f = p.facts;
    const ans = segs(p.answer)[0]!;
    // 발문이 말하는 치수 — 시험이 **자기 손으로** 다시 그려 대조한다
    if (f.mode === 0 || f.mode === 2) {
      expect(p.content).toContain(`$${linOf(f.a!, f.b!)}$`);
      expect(p.content).toContain(`$${linOf(f.c!, f.d!)}$`);
    }
    if (f.mode === 1) {
      expect(p.content).toContain(`$${linOf(f.a!, f.b!)}$`);
      expect(p.content).toContain(`$${2 * f.h!}$`);
    }
    if (f.mode === 2) expect(p.content).toContain(`$${linOf(f.e!, f.f!)}$`);
    for (const x of XS) {
      const expected =
        f.mode === 0
          ? 2 * (f.a! * x + f.b! + (f.c! * x + f.d!))
          : f.mode === 1
            ? ((f.a! * x + f.b!) * (2 * f.h!)) / 2
            : f.a! * x + f.b! + (f.c! * x + f.d!) + (f.e! * x + f.f!);
      expect(close(evalTex(ans, { x }), expected), `x=${x}: ${ans}`).toBe(true);
    }
  },

  [K("20")]: (p) => {
    const f = p.facts;
    const s1 = signByParity(f.e1!, f.ctx!);
    const s2 = signByParity(f.e2!, f.ctx!);
    expect(s1, "e1 부호").toBe(f.s1);
    expect(s2, "e2 부호").toBe(f.s2);
    // 발문이 그 지수 꼴과 n 의 성질을 실제로 말하는가
    expect(p.content).toContain(`(-1)^{${FORM_LABEL[f.e1!]}}`);
    expect(p.content).toContain(`(-1)^{${FORM_LABEL[f.e2!]}}`);
    expect(p.content).toContain(
      `$n$이 ${f.ctx === 0 ? "자연수" : f.ctx === 1 ? "홀수" : "짝수"}일 때`,
    );
    const ans = segs(p.answer)[0]!;
    for (const x of XS) {
      const expected = s1 * (f.a! * x + f.b!) - s2 * (f.c! * x + f.d!);
      expect(close(evalTex(ans, { x }), expected), `x=${x}: ${ans}`).toBe(true);
    }
  },

  [E("01")]: (p) => {
    const items = itemSegs(p.content);
    expect(items.length).toBe(5);
    const isEquation = (s: string) =>
      s.includes("=") && !/[<>]/.test(s) && !/\\(?:ge|le|ne)\b/.test(s);
    expect(items.filter(isEquation).length).toBe(firstNumber(p.answer));
    expect(firstNumber(p.answer)).toBe(p.facts.count);
  },

  [E("02")]: (p) => {
    const f = p.facts;
    const [L, R] = sides(segs(p.answer)[0]!);
    const want: Record<number, (x: number) => [number, number]> = {
      0: (x) => [f.a! * x - f.b!, f.c! * x],
      1: (x) => [f.k! * x, f.P!],
      2: (x) => [f.p! * x + f.q! * f.m!, f.T!],
      3: (x) => [f.a! * x + f.r!, f.b! * x - f.s!],
      4: (x) => [f.N! - f.p! * x, f.C!],
    };
    for (const x of [1, 2, 3, 5]) {
      const [wl, wr] = want[f.mode!]!(x);
      expect(close(evalTex(L, { x }), wl), `좌변 x=${x}: ${L}`).toBe(true);
      expect(close(evalTex(R, { x }), wr), `우변 x=${x}: ${R}`).toBe(true);
    }
  },

  [E("03")]: (p) => {
    const eq = segs(p.content).find((s) => s.includes("="))!;
    const [L, R] = sides(eq);
    const r = firstNumber(p.answer);
    expect(Math.abs(r), "해의 절댓값이 발문의 값과 달라졌다").toBe(p.facts.k);
    expect(close(evalTex(L, { x: r }), evalTex(R, { x: r })), eq).toBe(true);
    expect(
      close(evalTex(L, { x: -r }), evalTex(R, { x: -r })),
      "반대 부호도 해가 되면 답이 하나가 아니다",
    ).toBe(false);
  },

  [E("04")]: (p) => {
    const items = itemSegs(p.content);
    expect(items.length).toBe(5);
    const isIdentity = (s: string) => {
      const [L, R] = sides(s);
      return [0, 1, 2, 3, -4].every((x) =>
        close(evalTex(L, { x }), evalTex(R, { x })),
      );
    };
    expect(items.filter(isIdentity).length).toBe(firstNumber(p.answer));
    expect(firstNumber(p.answer)).toBe(p.facts.count);
  },

  [E("06")]: (p) => {
    const items = itemSegs(p.content);
    expect(items.length).toBe(5);
    const isTrue = (s: string) => {
      const [L, R] = sides(s);
      return [1, 2, 3, -4, 7].every((t) =>
        close(evalTex(L, { a: t, b: t }), evalTex(R, { a: t, b: t })),
      );
    };
    expect(items.filter(isTrue).length).toBe(firstNumber(p.answer));
    expect(firstNumber(p.answer)).toBe(p.facts.count);
  },

  [E("07")]: rootSatisfies,
  [E("10")]: rootSatisfies,
  [E("11")]: rootSatisfies,
  [E("12")]: rootSatisfies,
  [E("13")]: rootSatisfies,

  [E("08")]: (p) => {
    const eq = segs(p.content)[0]!;
    const [L, R] = sides(eq);
    const f = (x: number) => evalTex(L, { x }) - evalTex(R, { x });
    const a = f(1) - f(0);
    const b = -f(0);
    expect(a, "a>0 의 꼴이어야 한다").toBeGreaterThan(0);
    expect(close(a + b, firstNumber(p.answer)), `${a}+${b}`).toBe(true);
  },

  [E("09")]: (p) => {
    const items = itemSegs(p.content);
    expect(items.length).toBe(5);
    const isLinearEq = (s: string) => {
      const [L, R] = sides(s);
      const f = (x: number) => evalTex(L, { x }) - evalTex(R, { x });
      const v = [0, 1, 2, 3].map(f);
      const d = [v[1]! - v[0]!, v[2]! - v[1]!, v[3]! - v[2]!];
      const straight = close(d[0]!, d[1]!) && close(d[1]!, d[2]!);
      return straight && Math.abs(d[0]!) > 1e-9;
    };
    expect(items.filter(isLinearEq).length).toBe(firstNumber(p.answer));
    expect(firstNumber(p.answer)).toBe(p.facts.count);
  },

  [E("14")]: (p) => {
    const seg = segs(p.content).find((s) => s.includes(":"))!;
    const [lhs, rhs] = sides(seg);
    const [A, B] = lhs.split(":");
    const [C, D] = rhs.split(":");
    const r = firstNumber(p.answer);
    expect(r).toBe(p.facts.r);
    const cross = (x: number) =>
      evalTex(A!, { x }) * evalTex(D!, { x }) -
      evalTex(B!, { x }) * evalTex(C!, { x });
    expect(close(cross(r), 0), `비례식이 해에서 안 맞는다: ${seg}`).toBe(true);
    expect(Math.abs(cross(r + 1)), "해가 하나뿐이어야 한다").toBeGreaterThan(
      1e-9,
    );
  },

  [E("15")]: (p) => {
    const eq = segs(p.content)[0]!;
    const [L, R] = sides(eq);
    const rSeg = segs(p.content).find((s) => /^x=-?\d+$/.test(s))!;
    const r = firstNumber(rSeg);
    const a = firstNumber(p.answer);
    expect(a).toBe(p.facts.aVal);
    expect(
      close(evalTex(L, { x: r, a }), evalTex(R, { x: r, a })),
      `x=${r}, a=${a} 대입 실패: ${eq}`,
    ).toBe(true);
    expect(
      close(evalTex(L, { x: r, a: a + 1 }), evalTex(R, { x: r, a: a + 1 })),
      "다른 a 로도 성립하면 답이 하나가 아니다",
    ).toBe(false);
  },

  [E("16")]: (p) => {
    const ms = segs(p.content);
    const hasA = (s: string) => /(^|[^A-Za-z\\])a([^A-Za-z]|$)/.test(s);
    const eq1 = ms.find((s) => s.includes("=") && !hasA(s))!;
    const eq2 = ms.find((s) => s.includes("=") && hasA(s))!;
    // 첫 방정식을 **여기서 직접 푼다** — 생성기가 적어 둔 해를 안 믿는다
    const [L1, R1] = sides(eq1);
    const g = (x: number) => evalTex(L1, { x }) - evalTex(R1, { x });
    const slope = g(1) - g(0);
    expect(Math.abs(slope)).toBeGreaterThan(1e-9);
    const r = -g(0) / slope;
    expect(Number.isInteger(r), `해가 정수가 아니다: ${r}`).toBe(true);
    const a = firstNumber(p.answer);
    const [L2, R2] = sides(eq2);
    expect(
      close(evalTex(L2, { x: r, a }), evalTex(R2, { x: r, a })),
      `공통해 ${r} 에서 a=${a} 가 안 맞는다: ${eq2}`,
    ).toBe(true);
  },

  [E("17")]: (p) => {
    const eq = segs(p.content).find((s) => s.includes("="))!;
    const [L, R] = sides(eq);
    const f = (x: number, a: number) =>
      evalTex(L, { x, a }) - evalTex(R, { x, a });
    // a 는 좌변에 계수 1로 그대로 있어야 한다 — 그래야 아래 식이 성립한다
    expect(close(f(0, 1) - f(0, 0), 1), "a 의 계수가 1이 아니다").toBe(true);
    const k = f(1, 0) - f(0, 0);
    const s = -f(0, 0);
    const vals: number[] = [];
    for (let a = 1; a <= 300; a += 1) {
      const x = (s - a) / k;
      if (!Number.isInteger(x)) continue;
      if (p.facts.mode === 0 ? x >= 1 : x <= -1) vals.push(a);
    }
    expect(vals.length, "조건을 만족시키는 a 가 없다").toBeGreaterThan(1);
    if (p.facts.mode === 0) {
      expect(allNumbers(p.answer)).toEqual(vals);
    } else {
      expect(firstNumber(p.answer)).toBe(vals.length);
    }
    expect(p.facts.count).toBe(vals.length);
  },

  [E("18")]: (p) => {
    const eq = segs(p.content).find((s) => s.includes("="))!;
    const [L, R] = sides(eq);
    if (p.facts.mode === 0) {
      const F = (x: number, a: number, b: number) =>
        evalTex(L, { x, a, b }) - evalTex(R, { x, a, b });
      // 우변의 x 계수 m 을 찍어서 되찾는다
      const m = -(F(1, 0, 0) - F(0, 0, 0));
      const v0 = F(0, m, 0);
      const slopeB = F(0, m, 1) - v0;
      expect(close(slopeB, m), "b 의 기울기가 x 의 계수와 달라졌다").toBe(true);
      const b = -v0 / slopeB;
      for (const x of [0, 1, 2, -3]) {
        expect(
          close(F(x, m, b), 0),
          `a=${m}, b=${b} 에서 항등식이 아니다`,
        ).toBe(true);
      }
      expect(close(m + b, firstNumber(p.answer)), `${m}+${b}`).toBe(true);
    } else {
      const a = firstNumber(p.answer);
      const F = (x: number) => evalTex(L, { x, a }) - evalTex(R, { x, a });
      expect(close(F(1) - F(0), 0), "x 의 계수가 0이 아니다").toBe(true);
      expect(close(F(0), 0), "상수항까지 같으면 해가 무수히 많다").toBe(false);
    }
  },
};

// ══════════════════════════════════════════════════════════════
//  명부·색인·등록
// ══════════════════════════════════════════════════════════════

/** 우리 `Unit.section` 실측 리터럴 — 유형마다 손으로 못 박는다. */
const EXPECTED_SECTION: Record<string, string> = {
  [K("01")]: "문자의 사용과 식의 값",
  [K("02")]: "문자의 사용과 식의 값",
  [K("03")]: "문자의 사용과 식의 값",
  [K("04")]: "문자의 사용과 식의 값",
  [K("05")]: "문자의 사용과 식의 값",
  [K("06")]: "문자의 사용과 식의 값",
  [K("07")]: "문자의 사용과 식의 값",
  [K("08")]: "문자의 사용과 식의 값",
  [K("11")]: "일차식의 뜻Ⅱ",
  [K("14")]: "일차식의 뜻Ⅱ",
  [K("15")]: "일차식의 뜻Ⅱ",
  [K("16")]: "일차식의 뜻Ⅱ",
  [K("17")]: "일차식의 뜻Ⅱ",
  [K("18")]: "일차식의 뜻Ⅱ",
  [K("19")]: "일차식의 뜻Ⅱ",
  [K("20")]: "일차식의 뜻Ⅱ",
  [E("01")]: "방정식과 그 해",
  [E("02")]: "방정식과 그 해",
  [E("03")]: "방정식과 그 해",
  [E("04")]: "방정식과 그 해",
  [E("06")]: "등식의 성질",
  [E("07")]: "등식의 성질",
  [E("08")]: "등식의 성질",
  [E("09")]: "일차방정식의 풀이",
  [E("10")]: "일차방정식의 풀이",
  [E("11")]: "일차방정식의 풀이",
  [E("12")]: "일차방정식의 풀이",
  [E("13")]: "일차방정식의 풀이",
  [E("14")]: "일차방정식의 풀이",
  [E("15")]: "일차방정식의 활용(해의 응용)",
  [E("16")]: "일차방정식의 활용(해의 응용)",
  [E("17")]: "일차방정식의 활용(해의 응용)",
  [E("18")]: "일차방정식의 활용(해의 응용)",
};

describe("중1 식·방정식 33유형 (m1Expr)", () => {
  it("33유형 명부와 unitSection 이 실측 그대로다", () => {
    expect(new Set(M1_EXPR.map((e) => e.key))).toEqual(
      new Set(Object.keys(EXPECTED_SECTION)),
    );
    expect(M1_EXPR.length).toBe(33);
    for (const e of M1_EXPR) {
      expect(e.unitSection, e.key).toBe(EXPECTED_SECTION[e.key]);
      expect(e.key).toBe(`${e.rpmBook}|${e.rpmMinor}|${e.rpmType}`);
      expect(e.grade).toBe("중1");
      expect(e.rpmBook).toBe("1-1");
    }
  });

  it("우리 단원 6개에 나눠 붙는다", () => {
    expect(new Set(M1_EXPR.map((e) => e.unitSection))).toEqual(
      new Set([
        "문자의 사용과 식의 값",
        "일차식의 뜻Ⅱ",
        "방정식과 그 해",
        "등식의 성질",
        "일차방정식의 풀이",
        "일차방정식의 활용(해의 응용)",
      ]),
    );
  });

  it("유형 번호·제목이 RPM 색인(정본)에 실재한다", () => {
    const catalog = JSON.parse(
      readFileSync(
        path.resolve(REPO, "scripts/rpm/rpm-type-catalog.json"),
        "utf-8",
      ),
    ) as Record<
      string,
      { types: { minor: string; number: string; title: string }[] }
    >;
    for (const e of M1_EXPR) {
      const hit = catalog[e.rpmBook]?.types.find(
        (t) => t.minor === e.rpmMinor && t.number === e.rpmType,
      );
      expect(hit, `${e.key} — 색인에 없는 번호`).toBeDefined();
      expect(hit!.title, e.key).toBe(e.rpmTitle);
    }
  });

  it("이웃 모듈이 이미 낸 다섯은 여기서 다시 내지 않는다", () => {
    // m1Book1.ts 몫 — 겹치면 generate.ts 가 던지므로 여기서 먼저 막는다.
    const mine = new Set(M1_EXPR.map((e) => e.key));
    for (const k of [K("09"), K("10"), K("12"), K("13"), E("05")]) {
      expect(mine.has(k), `${k} 는 m1Book1.ts 몫이다`).toBe(false);
      expect(
        registeredTypes().some((e) => e.key === k),
        `${k} 가 어디에도 등록돼 있지 않다`,
      ).toBe(true);
    }
  });

  it("모든 유형이 generate 진입점에 등록돼 있다", () => {
    const keys = new Set(registeredTypes().map((e) => e.key));
    for (const e of M1_EXPR) expect(keys.has(e.key), e.key).toBe(true);
  });

  for (const e of M1_EXPR) {
    describe(`${e.rpmType} ${e.rpmTitle}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        expect(generateMiddleProblem(e.key, 20260823)).toEqual(
          generateMiddleProblem(e.key, 20260823),
        );
      });

      it("씨앗별 독립 검산 — 대입해서 잰다", () => {
        const check = CHECKS[e.key];
        expect(check, `검산식 누락: ${e.key}`).toBeDefined();
        for (const seed of SEEDS) check!(generateMiddleProblem(e.key, seed));
      });

      it("변형 24개도 전부 검산을 통과한다", () => {
        // 고정 씨앗 다섯이 못 건드리는 가지(mode·ctx)를 변형이 넓게 밟는다.
        const check = CHECKS[e.key]!;
        for (let variant = 0; variant < 24; variant += 1) {
          check(generateMiddleProblem(e.key, 20260823, variant));
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
        // KaTeX 는 모르는 명령을 에러가 아니라 #cc0000 으로 그린다 (2026-08-14) —
        // 성공 여부는 실제 렌더로만 잰다.
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          for (const part of [p.content, p.answer, p.solution]) {
            const html = renderMathHtml(part);
            expect(/#cc0000/i.test(html), part).toBe(false);
            expect(html.includes("math-raw"), part).toBe(false);
          }
        }
      });

      it("분모에 음수를 두지 않는다", () => {
        // 렌더는 멀쩡해서 안 걸린다 — 지면에서만 보이는 결함이라 글자로 막는다.
        for (let variant = 0; variant < 24; variant += 1) {
          const p = generateMiddleProblem(e.key, 20260823, variant);
          for (const part of [p.content, p.answer, p.solution]) {
            expect(/\\d?frac\{[^{}]*\}\{-/.test(part), part).toBe(false);
          }
        }
      });
    });
  }

  it("한 유형에서 4문항을 뽑으면 발문이 전부 다르다", () => {
    for (const e of M1_EXPR) {
      const set = generateMiddleSet(e.key, 20260823, 4);
      expect(new Set(set.map((p: MidProblem) => p.content)).size, e.key).toBe(
        4,
      );
    }
  });

  it("가지가 있는 유형은 모든 가지가 표본에 나온다", () => {
    // 픽스처가 경계를 안 가르면 그 가지의 변이는 영영 초록이다 (2026-08-21).
    const seen = (key: string, field: string, tries: number): Set<number> => {
      const s = new Set<number>();
      for (let v = 0; v < tries; v += 1) {
        s.add(generateMiddleProblem(key, 20260823, v).facts[field]!);
      }
      return s;
    };
    expect(seen(K("02"), "mode", 80)).toEqual(new Set([0, 1, 2, 3, 4]));
    expect(seen(K("03"), "mode", 80)).toEqual(new Set([0, 1, 2, 3]));
    expect(seen(K("04"), "mode", 80)).toEqual(new Set([0, 1, 2, 3, 4]));
    expect(seen(K("05"), "mode", 80)).toEqual(new Set([0, 1, 2]));
    expect(seen(K("06"), "mode", 60)).toEqual(new Set([0, 1]));
    expect(seen(K("07"), "mode", 80)).toEqual(new Set([0, 1, 2, 3]));
    expect(seen(K("08"), "mode", 80)).toEqual(new Set([0, 1, 2, 3]));
    expect(seen(K("11"), "mode", 80)).toEqual(new Set([0, 1, 2]));
    expect(seen(K("16"), "mode", 80)).toEqual(new Set([0, 1]));
    expect(seen(K("17"), "mode", 60)).toEqual(new Set([0, 1]));
    expect(seen(K("17"), "hasY", 60)).toEqual(new Set([0, 1]));
    expect(seen(K("18"), "mode", 60)).toEqual(new Set([0, 1]));
    expect(seen(K("18"), "hasY", 60)).toEqual(new Set([0, 1]));
    expect(seen(K("19"), "mode", 80)).toEqual(new Set([0, 1, 2]));
    expect(seen(K("20"), "ctx", 80)).toEqual(new Set([0, 1, 2]));
    expect(seen(K("20"), "s1", 80)).toEqual(new Set([1, -1]));
    expect(seen(E("02"), "mode", 80)).toEqual(new Set([0, 1, 2, 3, 4]));
    expect(seen(E("07"), "mode", 60)).toEqual(new Set([0, 1]));
    expect(seen(E("15"), "mode", 60)).toEqual(new Set([0, 1]));
    expect(seen(E("17"), "mode", 60)).toEqual(new Set([0, 1]));
    expect(seen(E("18"), "mode", 60)).toEqual(new Set([0, 1]));
    // 03 은 해가 양수·음수 둘 다 나와야 절댓값 판정이 뜻을 가진다
    const roots = seen(E("03"), "r", 80);
    expect([...roots].some((v) => v > 0)).toBe(true);
    expect([...roots].some((v) => v < 0)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
//  계산기 자체 눈금 — 판정자를 믿기 전에 판정자를 시험한다 (2026-08-20)
// ══════════════════════════════════════════════════════════════

describe("evalTex — 계산기가 실패를 셀 수 있는 형태인가", () => {
  it("양성 대조군 — 우리가 실제로 찍는 꼴을 옳게 읽는다", () => {
    expect(evalTex("2x+3", { x: 5 })).toBe(13);
    expect(evalTex("-x+7", { x: 2 })).toBe(5);
    expect(evalTex("x^{2}-7x+5", { x: -5 })).toBe(65);
    expect(evalTex("\\dfrac{9}{5}x+32", { x: 35 })).toBe(95);
    expect(
      evalTex("(-5)\\times x\\times x\\times y\\div z", { x: 2, y: 3, z: 4 }),
    ).toBe(-15);
    expect(evalTex("-\\dfrac{5x^{2}y}{z}", { x: 2, y: 3, z: 4 })).toBe(-15);
    expect(
      evalTex(
        "-x-\\left[-5x+2\\left\\{5x-\\left(x+7\\right)\\right\\}\\right]",
        { x: 3 },
      ),
    ).toBe(2);
    expect(evalTex("0.72(x+y)+40.6", { x: 20, y: 5 })).toBeCloseTo(58.6, 9);
    expect(evalTex("50+70t-5t^{2}", { t: 3 })).toBe(215);
    expect(evalTex("A-3B", { A: 10, B: 2 })).toBe(4);
    expect(evalTex("-\\dfrac{1}{3}")).toBeCloseTo(-1 / 3, 12);
    expect(
      evalTex("\\left(6x+6\\right)\\div\\dfrac{3}{7}", { x: 1 }),
    ).toBeCloseTo(28, 9);
  });

  it("음성 대조군 — 모르는 글자·안 닫힌 괄호·덜 읽은 꼬리는 던진다", () => {
    expect(() => evalTex("2x+3", {})).toThrow();
    expect(() => evalTex("\\left(2x", { x: 1 })).toThrow();
    expect(() => evalTex("2x)", { x: 1 })).toThrow();
    expect(() => evalTex("\\sqrt{4}")).toThrow();
  });

  it("틀린 값을 옳다고 하지 않는다", () => {
    expect(evalTex("2x+3", { x: 5 })).not.toBe(14);
    expect(close(evalTex("x^{2}", { x: -3 }), -9)).toBe(false);
  });
});
