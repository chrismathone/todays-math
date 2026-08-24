/**
 * 중2 「일차부등식 01~09 · 연립일차방정식 01~11·19·20 · 연립일차방정식의 활용 01~08」
 * 30유형 — 독립 검산 (물결 5C).
 *
 * ## 검산이 생성기와 어떻게 다른가
 *
 * 생성기는 **답을 먼저 정하고** 식을 짓는다. 이 시험은 반대로 간다 —
 * **지면에 인쇄된 식을 직접 파싱해서** 다시 푼다. 그래서
 *
 *  - 생성기가 소거법을 틀리면 빨개지고,
 *  - **값은 맞는데 인쇄가 틀린** 경우(계수를 잘못 찍었다·부등호를 안 뒤집었다)도
 *    빨개진다. 「값 검사가 다 초록이어도 지면은 흉할 수 있다」(CLAUDE.md 2026-08-24)의
 *    반대편을 막는 자리다.
 *
 * 파서는 이 파일 안에 있다(유리수 산술 · $x$, $y$ 2변수 다항식). 제품 코드를 부르지
 * 않으므로 생성기와 **공유하는 규칙이 없다**.
 *
 * ## 유형별로 무엇을 다시 세나
 *  - 보기 유형(부등식 뜻·성질·일차부등식 뜻·미지수 2개·연립의 해): 인쇄된 보기를
 *    **하나씩 파싱해 정의를 적용**하고 답 letters 를 다시 만든다.
 *  - 부등식 풀이: 파싱 → 독립 풀이 + **경계값 양옆 대입**(해 쪽은 참, 반대쪽은 거짓).
 *  - 연립방정식: 파싱 → **크라메르 공식**으로 풀고, 답을 **두 식에 되대입**한다.
 *    계수 행렬식이 0 이 아닌지도 여기서 본다(해가 유일한가).
 *  - 활용: 발문이 말하는 상황을 **전수 탐색**으로 다시 풀고 유일한지 센다.
 *    개수·나이·금액이 자연수인지도 함께 본다.
 *
 * ⚠️ 이 시험은 **자기 배열(M2_SYSTEM)만** 훑는다. `registeredTypes()` 를 중단원
 *    이름으로 거르면 같은 중단원의 **남의 유형**(m2IneqApply·m2SystemApply)이
 *    이 파일의 검산표에 들이대져 「검산식 누락」으로 빨개진다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { bareNumbers } from "../../lib/elementary/rules";
import {
  generateMiddleProblem,
  generateMiddleSet,
} from "../../lib/middle/generate";
import { M2_SYSTEM } from "../../lib/middle/m2System";
import { renderMathHtml } from "../../lib/math/renderMathHtml";
import { parseProblemContent } from "../../lib/problem/parseProblemContent";
import type { MidProblem } from "../../lib/middle/types";

const OWNED = M2_SYSTEM;
const SEEDS = [20260824, 1, 7777, 424242, 99991];
const LETTERS = ["①", "②", "③", "④", "⑤"] as const;

// ════════════════════════════════════════════════════════
//  유리수
// ════════════════════════════════════════════════════════
type Rat = { n: number; d: number };

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

function rat(n: number, d = 1): Rat {
  if (d === 0) throw new Error("분모가 0");
  const s = d < 0 ? -1 : 1;
  const g = gcd(n, d) || 1;
  return { n: (s * n) / g, d: (s * d) / g };
}

const RZERO = rat(0);
const RONE = rat(1);

function radd(a: Rat, b: Rat): Rat {
  return rat(a.n * b.d + b.n * a.d, a.d * b.d);
}
function rneg(a: Rat): Rat {
  return { n: -a.n, d: a.d };
}
function rsub(a: Rat, b: Rat): Rat {
  return radd(a, rneg(b));
}
function rmul(a: Rat, b: Rat): Rat {
  return rat(a.n * b.n, a.d * b.d);
}
function rdiv(a: Rat, b: Rat): Rat {
  if (b.n === 0) throw new Error("0 으로 나눔");
  return rat(a.n * b.d, a.d * b.n);
}
function rzero(a: Rat): boolean {
  return a.n === 0;
}
function req(a: Rat, b: Rat): boolean {
  return a.n * b.d === b.n * a.d;
}
/** a - b 의 부호. */
function rsign(a: Rat, b: Rat): number {
  return Math.sign(a.n * b.d - b.n * a.d);
}
function rnum(a: Rat): number {
  return a.n / a.d;
}

// ════════════════════════════════════════════════════════
//  2변수 다항식 (키: `${x지수},${y지수}`)
// ════════════════════════════════════════════════════════
type Poly = Map<string, Rat>;

function pConst(r: Rat): Poly {
  const m: Poly = new Map();
  if (!rzero(r)) m.set("0,0", r);
  return m;
}
function pVar(slot: "x" | "y"): Poly {
  const m: Poly = new Map();
  m.set(slot === "x" ? "1,0" : "0,1", RONE);
  return m;
}
function pAdd(a: Poly, b: Poly): Poly {
  const m: Poly = new Map(a);
  for (const [k, v] of b) {
    const cur = m.get(k) ?? RZERO;
    const s = radd(cur, v);
    if (rzero(s)) m.delete(k);
    else m.set(k, s);
  }
  return m;
}
function pNeg(a: Poly): Poly {
  const m: Poly = new Map();
  for (const [k, v] of a) m.set(k, rneg(v));
  return m;
}
function pSub(a: Poly, b: Poly): Poly {
  return pAdd(a, pNeg(b));
}
function pMul(a: Poly, b: Poly): Poly {
  const m: Poly = new Map();
  for (const [ka, va] of a) {
    for (const [kb, vb] of b) {
      const [ax, ay] = ka.split(",").map(Number) as [number, number];
      const [bx, by] = kb.split(",").map(Number) as [number, number];
      const k = `${ax + bx},${ay + by}`;
      const cur = m.get(k) ?? RZERO;
      const s = radd(cur, rmul(va, vb));
      if (rzero(s)) m.delete(k);
      else m.set(k, s);
    }
  }
  return m;
}
function pCoef(p: Poly, ex: number, ey: number): Rat {
  return p.get(`${ex},${ey}`) ?? RZERO;
}
function pIsConst(p: Poly): boolean {
  return [...p.keys()].every((k) => k === "0,0");
}
function pEval(p: Poly, x: Rat, y: Rat): Rat {
  let out = RZERO;
  for (const [k, v] of p) {
    const [ex, ey] = k.split(",").map(Number) as [number, number];
    let term = v;
    for (let i = 0; i < ex; i += 1) term = rmul(term, x);
    for (let i = 0; i < ey; i += 1) term = rmul(term, y);
    out = radd(out, term);
  }
  return out;
}
/** 일차식($x$만)인가 — $x^2$·$y$·$xy$ 가 없고 $x$의 계수가 0 이 아니다. */
function pIsLinearX(p: Poly): boolean {
  for (const k of p.keys()) if (k !== "0,0" && k !== "1,0") return false;
  return !rzero(pCoef(p, 1, 0));
}

// ════════════════════════════════════════════════════════
//  LaTeX 토크나이저 · 파서
// ════════════════════════════════════════════════════════
type Tok =
  | { t: "num"; v: Rat }
  | { t: "var"; v: string }
  | { t: "rel"; v: string }
  | { t: "op"; v: string }
  | { t: "frac" }
  | { t: "open"; v: string }
  | { t: "close"; v: string }
  | { t: "caret" }
  | { t: "colon" };

const SKIP_CMDS = new Set([
  "left",
  "right",
  "cdots",
  "dots",
  "ldots",
  "quad",
  "qquad",
  "displaystyle",
]);

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  const s = src;
  const readGroup = (): void => {
    // `{...}` 를 통째로 건너뛴다 (\mathrm{cm} 같은 장식)
    if (s[i] !== "{") return;
    let depth = 0;
    while (i < s.length) {
      if (s[i] === "{") depth += 1;
      else if (s[i] === "}") {
        depth -= 1;
        if (depth === 0) {
          i += 1;
          return;
        }
      }
      i += 1;
    }
  };
  while (i < s.length) {
    const c = s[i]!;
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    if (c === "\\") {
      const m = /^\\([a-zA-Z]+)/.exec(s.slice(i));
      if (!m) {
        // `\,` `\%` `\ ` 처럼 한 글자짜리 — 그냥 버린다
        i += 2;
        continue;
      }
      const cmd = m[1]!;
      i += m[0].length;
      if (cmd === "dfrac" || cmd === "frac" || cmd === "tfrac") {
        out.push({ t: "frac" });
      } else if (cmd === "times" || cmd === "cdot") {
        out.push({ t: "op", v: "*" });
      } else if (cmd === "div") {
        out.push({ t: "op", v: "/" });
      } else if (cmd === "le" || cmd === "leq") {
        out.push({ t: "rel", v: "<=" });
      } else if (cmd === "ge" || cmd === "geq") {
        out.push({ t: "rel", v: ">=" });
      } else if (cmd === "mathrm" || cmd === "text" || cmd === "mathit") {
        readGroup();
      } else if (SKIP_CMDS.has(cmd)) {
        // 아무것도 안 한다
      } else {
        throw new Error(`모르는 명령: \\${cmd}`);
      }
      continue;
    }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(s[i + 1] ?? ""))) {
      const m = /^([0-9]*)(?:\.([0-9]*))?(?:\\overline\{([0-9]+)\})?/.exec(
        s.slice(i),
      )!;
      const [whole, intPart, preRaw, cycRaw] = m as unknown as [
        string,
        string,
        string | undefined,
        string | undefined,
      ];
      i += whole.length;
      const ip = intPart === "" ? "0" : intPart;
      const pre = preRaw ?? "";
      if (cycRaw !== undefined) {
        const p = pre.length;
        const q = cycRaw.length;
        const head = Number(ip + pre || "0");
        const full = Number(ip + pre + cycRaw);
        out.push({ t: "num", v: rat(full - head, 10 ** p * (10 ** q - 1)) });
      } else if (pre !== "") {
        out.push({ t: "num", v: rat(Number(ip + pre), 10 ** pre.length) });
      } else {
        out.push({ t: "num", v: rat(Number(ip)) });
      }
      continue;
    }
    if (/[a-zA-Z]/.test(c)) {
      out.push({ t: "var", v: c });
      i += 1;
      continue;
    }
    if (c === "(" || c === "{") {
      out.push({ t: "open", v: c });
      i += 1;
      continue;
    }
    if (c === ")" || c === "}") {
      out.push({ t: "close", v: c });
      i += 1;
      continue;
    }
    if (c === "^") {
      out.push({ t: "caret" });
      i += 1;
      continue;
    }
    if (c === ":") {
      out.push({ t: "colon" });
      i += 1;
      continue;
    }
    if (c === "=" || c === "<" || c === ">") {
      out.push({ t: "rel", v: c });
      i += 1;
      continue;
    }
    if (c === "+" || c === "-" || c === "*" || c === "/") {
      out.push({ t: "op", v: c });
      i += 1;
      continue;
    }
    throw new Error(`모르는 글자: ${c} (${src})`);
  }
  return out;
}

type VarMap = Record<string, "x" | "y">;
const DEFAULT_VARS: VarMap = { x: "x", y: "y" };

class Parser {
  private i = 0;

  constructor(
    private readonly toks: Tok[],
    private readonly vars: VarMap,
  ) {}

  private peek(): Tok | undefined {
    return this.toks[this.i];
  }
  private next(): Tok {
    const t = this.toks[this.i];
    if (!t) throw new Error("식이 갑자기 끝났습니다");
    this.i += 1;
    return t;
  }

  parseAll(): Poly {
    const p = this.expr();
    if (this.i !== this.toks.length) throw new Error("남는 토큰이 있습니다");
    return p;
  }

  expr(): Poly {
    let sign = 1;
    const first = this.peek();
    if (first && first.t === "op" && (first.v === "+" || first.v === "-")) {
      this.i += 1;
      if (first.v === "-") sign = -1;
    }
    let out = sign === 1 ? this.term() : pNeg(this.term());
    for (;;) {
      const t = this.peek();
      if (!t || t.t !== "op" || (t.v !== "+" && t.v !== "-")) break;
      this.i += 1;
      const rhs = this.term();
      out = t.v === "+" ? pAdd(out, rhs) : pSub(out, rhs);
    }
    return out;
  }

  private startsPrimary(t: Tok | undefined): boolean {
    if (!t) return false;
    return (
      t.t === "num" ||
      t.t === "var" ||
      t.t === "frac" ||
      (t.t === "open" && (t.v === "(" || t.v === "{"))
    );
  }

  term(): Poly {
    let out = this.power();
    for (;;) {
      const t = this.peek();
      if (t && t.t === "op" && t.v === "*") {
        this.i += 1;
        out = pMul(out, this.power());
        continue;
      }
      if (t && t.t === "op" && t.v === "/") {
        this.i += 1;
        const den = this.power();
        if (!pIsConst(den)) throw new Error("상수가 아닌 것으로 나눔");
        out = pMul(out, pConst(rdiv(RONE, pCoef(den, 0, 0))));
        continue;
      }
      if (this.startsPrimary(t)) {
        out = pMul(out, this.power());
        continue;
      }
      break;
    }
    return out;
  }

  power(): Poly {
    const base = this.primary();
    const t = this.peek();
    if (!t || t.t !== "caret") return base;
    this.i += 1;
    let e: number;
    const nx = this.next();
    if (nx.t === "num") {
      e = rnum(nx.v);
    } else if (nx.t === "open" && nx.v === "{") {
      const inner = this.next();
      if (inner.t !== "num") throw new Error("지수가 수가 아닙니다");
      e = rnum(inner.v);
      const close = this.next();
      if (close.t !== "close") throw new Error("지수 괄호가 안 닫혔습니다");
    } else {
      throw new Error("지수를 읽을 수 없습니다");
    }
    if (!Number.isInteger(e) || e < 0 || e > 4) {
      throw new Error(`지원하지 않는 지수: ${e}`);
    }
    let out = pConst(RONE);
    for (let k = 0; k < e; k += 1) out = pMul(out, base);
    return out;
  }

  primary(): Poly {
    const t = this.next();
    if (t.t === "num") return pConst(t.v);
    if (t.t === "var") {
      const slot = this.vars[t.v];
      if (!slot) throw new Error(`모르는 문자: ${t.v}`);
      return pVar(slot);
    }
    if (t.t === "open") {
      const inner = this.expr();
      const close = this.next();
      if (close.t !== "close") throw new Error("괄호가 안 닫혔습니다");
      return inner;
    }
    if (t.t === "frac") {
      const o1 = this.next();
      if (o1.t !== "open") throw new Error("분수의 분자가 없습니다");
      const num = this.expr();
      const c1 = this.next();
      if (c1.t !== "close") throw new Error("분자 괄호가 안 닫혔습니다");
      const o2 = this.next();
      if (o2.t !== "open") throw new Error("분수의 분모가 없습니다");
      const den = this.expr();
      const c2 = this.next();
      if (c2.t !== "close") throw new Error("분모 괄호가 안 닫혔습니다");
      if (!pIsConst(den)) throw new Error("분모가 상수가 아닙니다");
      return pMul(num, pConst(rdiv(RONE, pCoef(den, 0, 0))));
    }
    throw new Error(`식을 읽을 수 없습니다: ${JSON.stringify(t)}`);
  }
}

/** 깊이 0 에서 토큰 배열을 자른다. */
function splitTop(toks: Tok[], hit: (t: Tok) => boolean): Tok[][] {
  const parts: Tok[][] = [];
  let cur: Tok[] = [];
  let depth = 0;
  for (const t of toks) {
    if (t.t === "open") depth += 1;
    if (t.t === "close") depth -= 1;
    if (depth === 0 && hit(t)) {
      parts.push(cur);
      cur = [];
      continue;
    }
    cur.push(t);
  }
  parts.push(cur);
  return parts;
}

type Chain = { polys: Poly[]; rels: string[] };

/** `A rel B rel C` 를 파싱한다. */
function parseChain(src: string, vars: VarMap = DEFAULT_VARS): Chain {
  const toks = tokenize(src);
  const rels: string[] = [];
  const parts = splitTop(toks, (t) => {
    if (t.t !== "rel") return false;
    rels.push(t.v);
    return true;
  });
  const polys = parts.map((p) => new Parser(p, vars).parseAll());
  return { polys, rels };
}

function parseExprOnly(src: string, vars: VarMap = DEFAULT_VARS): Poly {
  return new Parser(tokenize(src), vars).parseAll();
}

function relTrue(rel: string, sign: number): boolean {
  if (rel === "<") return sign < 0;
  if (rel === ">") return sign > 0;
  if (rel === "<=") return sign <= 0;
  if (rel === ">=") return sign >= 0;
  if (rel === "=") return sign === 0;
  throw new Error(`모르는 부등호: ${rel}`);
}

/** 인쇄된 관계식이 주어진 $(x,y)$ 에서 참인가. */
function chainHolds(ch: Chain, x: Rat, y: Rat): boolean {
  for (let k = 0; k < ch.rels.length; k += 1) {
    const l = pEval(ch.polys[k]!, x, y);
    const r = pEval(ch.polys[k + 1]!, x, y);
    if (!relTrue(ch.rels[k]!, rsign(l, r))) return false;
  }
  return true;
}

/** `a·x + c REL 0` 을 $x$에 대해 푼다 — 음수로 나누면 부등호가 뒤집힌다. */
function solveLinIneq(p: Poly, rel: string): { rel: string; s: Rat } {
  if (!pIsLinearX(p)) throw new Error("일차부등식이 아닙니다");
  const a = pCoef(p, 1, 0);
  const c = pCoef(p, 0, 0);
  const s = rdiv(rneg(c), a);
  const flip = a.n < 0;
  const F: Record<string, string> = {
    "<": ">",
    ">": "<",
    "<=": ">=",
    ">=": "<=",
  };
  return { rel: flip ? F[rel]! : rel, s };
}

/** 두 일차식(좌변−우변)을 크라메르 공식으로 푼다. */
function solve2(p1: Poly, p2: Poly): { x: Rat; y: Rat; det: Rat } {
  for (const p of [p1, p2]) {
    for (const k of p.keys()) {
      if (k !== "0,0" && k !== "1,0" && k !== "0,1") {
        throw new Error("일차식이 아닙니다");
      }
    }
  }
  const a1 = pCoef(p1, 1, 0);
  const b1 = pCoef(p1, 0, 1);
  const c1 = rneg(pCoef(p1, 0, 0));
  const a2 = pCoef(p2, 1, 0);
  const b2 = pCoef(p2, 0, 1);
  const c2 = rneg(pCoef(p2, 0, 0));
  const det = rsub(rmul(a1, b2), rmul(a2, b1));
  if (rzero(det)) throw new Error("해가 유일하지 않습니다 (행렬식 0)");
  const x = rdiv(rsub(rmul(c1, b2), rmul(c2, b1)), det);
  const y = rdiv(rsub(rmul(a1, c2), rmul(a2, c1)), det);
  return { x, y, det };
}

// ════════════════════════════════════════════════════════
//  지면에서 조각 꺼내기
// ════════════════════════════════════════════════════════
function mathBlocks(text: string): string[] {
  return [...text.matchAll(/\$([^$]*)\$/g)].map((m) => m[1]!);
}

function choiceLines(content: string): { letter: string; maths: string[] }[] {
  const out: { letter: string; maths: string[] }[] = [];
  for (const line of content.split("\n")) {
    const m = /^([①②③④⑤])\s*(.*)$/.exec(line);
    if (!m) continue;
    out.push({ letter: m[1]!, maths: mathBlocks(m[2]!) });
  }
  return out;
}

function answerLetters(answer: string): string[] {
  return answer
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** `\begin{cases}A\\B\end{cases}` 안의 두 식. */
function casesEquations(text: string): string[] {
  const m = /\\begin\{cases\}([\s\S]*?)\\end\{cases\}/.exec(text);
  expect(m, `cases 블록이 없습니다: ${text}`).not.toBeNull();
  return m![1]!
    .split(/\\\\/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** 답 `$x=3$, $y=-5$` 에서 해를 꺼낸다. */
function answerXY(answer: string): { x: number; y: number } {
  const m = /\$x=(-?\d+)\$,\s*\$y=(-?\d+)\$/.exec(answer);
  expect(m, `해 꼴이 아닙니다: ${answer}`).not.toBeNull();
  return { x: Number(m![1]), y: Number(m![2]) };
}

function firstNumber(text: string): number {
  const m = /-?\d+(?:\.\d+)?/.exec(text);
  if (!m) throw new Error(`답에 수가 없습니다: ${text}`);
  return Number(m[0]);
}

/** 이 수들이 **발문에 실제로 인쇄돼** 있는가 — 계산만 맞고 인쇄가 다른 것을 막는다. */
function expectPrinted(content: string, values: number[]): void {
  for (const v of values) {
    const re = new RegExp(`(?<![\\d.])${Math.abs(v)}(?![\\d.])`);
    expect(re.test(content), `발문에 $${v}$ 가 없습니다: ${content}`).toBe(
      true,
    );
  }
}

/** 부등식을 담은 math 블록 하나 — 여러 개면 첫 번째. */
function ineqBlock(content: string): string {
  for (const b of mathBlocks(content)) {
    if (/[<>]|\\le|\\ge/.test(b)) return b;
  }
  throw new Error(`부등식이 없습니다: ${content}`);
}

// ════════════════════════════════════════════════════════
//  유형별 검산
// ════════════════════════════════════════════════════════
type Check = (p: MidProblem) => void;

/** 보기 유형 공통 — 인쇄된 보기에 판정 규칙을 대어 답 letters 를 다시 만든다. */
function checkChoices(
  p: MidProblem,
  judge: (tex: string) => boolean,
  lo: number,
  hi: number,
): void {
  const items = choiceLines(p.content);
  expect(items.length, p.content).toBe(5);
  const want: string[] = [];
  items.forEach((it, i) => {
    expect(it.letter).toBe(LETTERS[i]);
    expect(it.maths.length, `보기 ${it.letter} 의 수식 개수`).toBe(1);
    if (judge(it.maths[0]!)) want.push(it.letter);
  });
  expect(want.length, `참인 보기 수 (${p.content})`).toBeGreaterThanOrEqual(lo);
  expect(want.length, `참인 보기 수 (${p.content})`).toBeLessThanOrEqual(hi);
  expect(answerLetters(p.answer), p.content).toEqual(want);
}

/** 인쇄된 일차부등식을 풀어 답과 맞대고, 경계값 양옆을 실제로 대입해 본다. */
function checkSolvedIneq(p: MidProblem): void {
  const ch = parseChain(ineqBlock(p.content));
  expect(ch.rels.length, p.content).toBe(1);
  const rel = ch.rels[0]!;
  expect(rel === "=", `등식이 실렸습니다: ${p.content}`).toBe(false);
  const diff = pSub(ch.polys[0]!, ch.polys[1]!);
  const got = solveLinIneq(diff, rel);

  const ans = parseChain(mathBlocks(p.answer)[0]!);
  expect(ans.rels.length, p.answer).toBe(1);
  expect(req(pCoef(ans.polys[0]!, 1, 0), RONE), p.answer).toBe(true);
  expect(pIsConst(ans.polys[1]!), p.answer).toBe(true);
  const aRel = ans.rels[0]!;
  const aS = pCoef(ans.polys[1]!, 0, 0);

  expect(aRel, `부등호 방향 (${p.content} → ${p.answer})`).toBe(got.rel);
  expect(req(aS, got.s), `경계값 (${p.content} → ${p.answer})`).toBe(true);

  // 실제 대입 — 답이 말하는 참·거짓과 인쇄된 부등식의 참·거짓이 같아야 한다
  const base = rnum(aS);
  for (const v of [
    base - 2,
    base - 1,
    base - 0.5,
    base,
    base + 0.5,
    base + 1,
    base + 2,
  ]) {
    const q = rat(Math.round(v * 2), 2);
    const orig = chainHolds(ch, q, RZERO);
    const want = relTrue(aRel, rsign(q, aS));
    expect(orig, `$x=${rnum(q)}$ 에서 갈림 (${p.content} → ${p.answer})`).toBe(
      want,
    );
  }
}

/** 인쇄된 두 식을 풀어 답과 맞대고, 답을 두 식에 되대입한다. */
function checkSolvedSystem(p: MidProblem, eqs: Poly[]): void {
  expect(eqs.length, "식이 둘이 아닙니다").toBe(2);
  const { x, y, det } = solve2(eqs[0]!, eqs[1]!);
  expect(rzero(det), "계수 행렬식이 0 — 해가 유일하지 않다").toBe(false);
  const want = answerXY(p.answer);
  expect(rnum(x), `x (${p.content})`).toBe(want.x);
  expect(rnum(y), `y (${p.content})`).toBe(want.y);
  // 되대입 — 두 식이 모두 성립하는가
  for (const e of eqs) {
    expect(rzero(pEval(e, rat(want.x), rat(want.y))), p.content).toBe(true);
  }
}

/** `\begin{cases}…\end{cases}` 의 두 식을 「좌변−우변」 다항식으로. */
function casesPolys(content: string): Poly[] {
  return casesEquations(content).map((eq) => {
    const ch = parseChain(eq);
    expect(ch.rels, eq).toEqual(["="]);
    return pSub(ch.polys[0]!, ch.polys[1]!);
  });
}

/** 유일한 자연수 해를 전수로 찾는다 — 없거나 둘 이상이면 실패. */
function uniqueBy<T>(cands: T[], ok: (v: T) => boolean, label: string): T {
  const hit = cands.filter(ok);
  expect(hit.length, `${label} — 해가 유일하지 않다`).toBe(1);
  return hit[0]!;
}

const INEQ_WORDS: [string, string][] = [
  ["이상", ">="],
  ["이하", "<="],
  ["초과", ">"],
  ["미만", "<"],
];

/** 「부등식으로 나타내기」— 상황이 뜻하는 양을 시험이 **따로** 계산해 대조한다. */
const PHRASE_VALUE: Record<
  number,
  (f: Record<string, number>, x: number) => number
> = {
  0: (f, x) => f.p! * x, // 볼펜 x자루의 값
  1: (_f, x) => 3 * x, // 정삼각형의 둘레
  2: (f, x) => f.p! * x, // 시속 p로 x시간 간 거리
  3: (f, x) => 2 * (f.p! + x), // 직사각형의 둘레
  4: (f, x) => f.p! * x - f.r!, // x의 p배에서 r을 뺀 수
};

const IQ = "일차부등식";
const SY = "연립일차방정식";
const AP = "연립일차방정식의 활용";

const CHECKS: Record<string, Check> = {
  // ── 일차부등식 ───────────────────────────────────────
  [`${IQ}|01`]: (p) =>
    checkChoices(
      p,
      (tex) => {
        const ch = parseChain(tex);
        return ch.rels.length > 0 && ch.rels.every((r) => r !== "=");
      },
      2,
      4,
    ),

  [`${IQ}|02`]: (p) => {
    const hit = INEQ_WORDS.filter(([w]) => p.content.includes(w));
    expect(hit.length, `관계 낱말이 하나여야 한다: ${p.content}`).toBe(1);
    const wantRel = hit[0]![1];
    const ans = parseChain(mathBlocks(p.answer)[0]!);
    expect(ans.rels, p.answer).toEqual([wantRel]);
    const f = p.facts;
    const value = PHRASE_VALUE[f.scn!]!;
    expect(pIsConst(ans.polys[1]!), p.answer).toBe(true);
    expect(rnum(pCoef(ans.polys[1]!, 0, 0)), "한계값").toBe(f.q!);
    for (const x of [-3, 0, 1, 2, 5, 8]) {
      expect(
        rnum(pEval(ans.polys[0]!, rat(x), RZERO)),
        `$x=${x}$ 에서 좌변이 상황과 다르다: ${p.content} → ${p.answer}`,
      ).toBe(value(f, x));
    }
    expectPrinted(p.content, [f.q!]);
  },

  [`${IQ}|03`]: (p) => {
    const ch = parseChain(ineqBlock(p.content));
    expect(ch.rels.length, p.content).toBe(1);
    const dom = [-2, -1, 0, 1, 2];
    const got = dom.filter((v) => chainHolds(ch, rat(v), RZERO));
    expect(got.length, `해가 없거나 전부다: ${p.content}`).toBeGreaterThan(0);
    expect(got.length, `해가 전부다: ${p.content}`).toBeLessThan(5);
    const said = mathBlocks(p.answer).map(Number);
    expect(said, `${p.content} → ${p.answer}`).toEqual(got);
    // 발문의 정의역이 실제로 그 다섯 수인가
    for (const v of dom) expect(p.content).toContain(`$${v}$`);
  },

  [`${IQ}|04`]: (p) => {
    const VARS: VarMap = { a: "x", b: "y" };
    const PAIRS: [number, number][] = [
      [1, 2],
      [-4, -1],
      [-3, 5],
      [0, 7],
      [-9, -8],
    ];
    checkChoices(
      p,
      (tex) => {
        const ch = parseChain(tex, VARS);
        expect(ch.rels.length, tex).toBe(1);
        // 좌변은 $a$만, 우변은 $b$만 써야 한다
        expect(rzero(pCoef(ch.polys[0]!, 0, 1)), tex).toBe(true);
        expect(rzero(pCoef(ch.polys[1]!, 1, 0)), tex).toBe(true);
        const truths = PAIRS.map(([a, b]) => chainHolds(ch, rat(a), rat(b)));
        expect(new Set(truths).size, `표본마다 참·거짓이 다르다: ${tex}`).toBe(
          1,
        );
        return truths[0]!;
      },
      1,
      4,
    );
    expect(p.content).toContain("$a<b$");
  },

  [`${IQ}|05`]: (p) => {
    const blocks = mathBlocks(p.content);
    const dom = parseChain(blocks[0]!);
    expect(dom.rels.length, p.content).toBe(2);
    expect(pIsConst(dom.polys[0]!), p.content).toBe(true);
    expect(pIsConst(dom.polys[2]!), p.content).toBe(true);
    const lo = pCoef(dom.polys[0]!, 0, 0);
    const hi = pCoef(dom.polys[2]!, 0, 0);
    expect(rsign(lo, hi), "정의역이 뒤집혔다").toBeLessThan(0);
    const defBlock = blocks.find((b) => b.startsWith("A="))!;
    const A = parseExprOnly(defBlock.slice(2));
    expect(pIsLinearX(A), defBlock).toBe(true);

    const vLo = pEval(A, lo, RZERO);
    const vHi = pEval(A, hi, RZERO);
    const closLo = dom.rels[0] === "<=";
    const closHi = dom.rels[1] === "<=";
    const asc = rsign(vLo, vHi) < 0;
    const wantLo = asc ? vLo : vHi;
    const wantHi = asc ? vHi : vLo;
    const wantClosLo = asc ? closLo : closHi;
    const wantClosHi = asc ? closHi : closLo;

    const ans = parseChain(mathBlocks(p.answer)[0]!, { A: "x" });
    expect(ans.rels.length, p.answer).toBe(2);
    expect(req(pCoef(ans.polys[0]!, 0, 0), wantLo), p.answer).toBe(true);
    expect(req(pCoef(ans.polys[2]!, 0, 0), wantHi), p.answer).toBe(true);
    expect(ans.rels[0] === "<=", `아래 끝 닫힘 (${p.answer})`).toBe(wantClosLo);
    expect(ans.rels[1] === "<=", `위 끝 닫힘 (${p.answer})`).toBe(wantClosHi);

    // 정의역 안쪽 점은 답 구간 안에 들어가야 한다
    for (let t = 1; t <= 9; t += 1) {
      const x = radd(lo, rmul(rsub(hi, lo), rat(t, 10)));
      const v = pEval(A, x, RZERO);
      expect(rsign(v, wantLo) >= 0 && rsign(v, wantHi) <= 0, p.answer).toBe(
        true,
      );
    }
  },

  [`${IQ}|06`]: (p) =>
    checkChoices(
      p,
      (tex) => {
        const ch = parseChain(tex);
        if (ch.rels.length !== 1 || ch.rels[0] === "=") return false;
        const d = pSub(ch.polys[0]!, ch.polys[1]!);
        if (!rzero(pCoef(d, 0, 1))) return false; // $y$가 있으면 아니다
        if (!rzero(pCoef(d, 2, 0))) return false; // $x^2$이 남으면 아니다
        return !rzero(pCoef(d, 1, 0));
      },
      2,
      3,
    ),

  [`${IQ}|07`]: checkSolvedIneq,
  [`${IQ}|08`]: checkSolvedIneq,
  [`${IQ}|09`]: checkSolvedIneq,

  // ── 연립일차방정식 ───────────────────────────────────
  [`${SY}|01`]: (p) =>
    checkChoices(
      p,
      (tex) => {
        const ch = parseChain(tex);
        if (ch.rels.length !== 1 || ch.rels[0] !== "=") return false;
        const d = pSub(ch.polys[0]!, ch.polys[1]!);
        for (const k of d.keys()) {
          if (k !== "0,0" && k !== "1,0" && k !== "0,1") return false;
        }
        return !rzero(pCoef(d, 1, 0)) && !rzero(pCoef(d, 0, 1));
      },
      2,
      3,
    ),

  [`${SY}|02`]: (p) => {
    const eq = mathBlocks(p.content).find((b) => /x.*y.*=/.test(b))!;
    const ch = parseChain(eq);
    expect(ch.rels, eq).toEqual(["="]);
    const d = pSub(ch.polys[0]!, ch.polys[1]!);
    let n = 0;
    for (let x = 1; x <= 200; x += 1) {
      for (let y = 1; y <= 200; y += 1) {
        if (rzero(pEval(d, rat(x), rat(y)))) n += 1;
      }
    }
    expect(n, `순서쌍 개수 (${eq})`).toBe(firstNumber(p.answer));
    expect(n, "개수가 너무 적다").toBeGreaterThanOrEqual(2);
  },

  [`${SY}|03`]: (p) => {
    const a = p.facts.a!;
    const raw = mathBlocks(p.content).find(
      (b) => b.includes("a") && b.includes("x") && b.includes("y"),
    )!;
    const ch = parseChain(raw.replace(/a/g, `(${a})`));
    expect(ch.rels, raw).toEqual(["="]);
    const d = pSub(ch.polys[0]!, ch.polys[1]!);
    const x0 = p.facts.x0!;
    const y0 = p.facts.y0!;
    expect(p.content).toContain(`$x=${x0}$`);
    expect(p.content).toContain(`$y=${y0}$`);
    expect(rzero(pEval(d, rat(x0), rat(y0))), `해가 안 맞는다: ${raw}`).toBe(
      true,
    );
    expect(firstNumber(p.answer)).toBe(a);
  },

  [`${SY}|04`]: (p) => {
    const x0 = p.facts.x0!;
    const y0 = p.facts.y0!;
    expect(p.content).toContain(`$x=${x0}$`);
    expect(p.content).toContain(`$y=${y0}$`);
    const items = choiceLines(p.content);
    expect(items.length, p.content).toBe(5);
    const want: string[] = [];
    items.forEach((it, i) => {
      expect(it.letter).toBe(LETTERS[i]);
      expect(it.maths.length, `연립은 식 둘: ${it.letter}`).toBe(2);
      const ok = it.maths.every((eq) => {
        const ch = parseChain(eq);
        expect(ch.rels, eq).toEqual(["="]);
        return chainHolds(ch, rat(x0), rat(y0));
      });
      if (ok) want.push(it.letter);
    });
    expect(want.length, "정답 보기 수").toBeGreaterThanOrEqual(1);
    expect(want.length, "정답 보기 수").toBeLessThanOrEqual(3);
    expect(answerLetters(p.answer), p.content).toEqual(want);
  },

  [`${SY}|05`]: (p) => {
    const f = p.facts;
    const eqs = casesEquations(p.content);
    expect(eqs.length, p.content).toBe(2);
    const polys = eqs.map((eq) => {
      const ch = parseChain(
        eq.replace(/a/g, `(${f.a})`).replace(/b/g, `(${f.b})`),
      );
      expect(ch.rels, eq).toEqual(["="]);
      return pSub(ch.polys[0]!, ch.polys[1]!);
    });
    for (const d of polys) {
      expect(rzero(pEval(d, rat(f.x0!), rat(f.y0!))), p.content).toBe(true);
    }
    expect(rzero(solve2(polys[0]!, polys[1]!).det)).toBe(false);
    expect(p.content).toContain(`$x=${f.x0}$`);
    expect(p.content).toContain(`$y=${f.y0}$`);
    expect(firstNumber(p.answer)).toBe(f.a! + f.b!);
  },

  [`${SY}|06`]: (p) => checkSolvedSystem(p, casesPolys(p.content)),
  [`${SY}|07`]: (p) => checkSolvedSystem(p, casesPolys(p.content)),
  [`${SY}|08`]: (p) => checkSolvedSystem(p, casesPolys(p.content)),
  [`${SY}|09`]: (p) => checkSolvedSystem(p, casesPolys(p.content)),

  [`${SY}|10`]: (p) => {
    const eqs = casesEquations(p.content);
    expect(eqs.length, p.content).toBe(2);
    const first = parseChain(eqs[0]!);
    expect(first.rels, eqs[0]).toEqual(["="]);
    // 비례식 A:B = m:n ⇔ n·A = m·B (시험이 규칙을 다시 세운다)
    const toks = tokenize(eqs[1]!);
    const sides = splitTop(toks, (t) => t.t === "rel" && t.v === "=");
    expect(sides.length, eqs[1]).toBe(2);
    const left = splitTop(sides[0]!, (t) => t.t === "colon");
    const right = splitTop(sides[1]!, (t) => t.t === "colon");
    expect(left.length, "왼쪽 비").toBe(2);
    expect(right.length, "오른쪽 비").toBe(2);
    const A = new Parser(left[0]!, DEFAULT_VARS).parseAll();
    const B = new Parser(left[1]!, DEFAULT_VARS).parseAll();
    const m = new Parser(right[0]!, DEFAULT_VARS).parseAll();
    const n = new Parser(right[1]!, DEFAULT_VARS).parseAll();
    expect(pIsConst(m) && pIsConst(n), eqs[1]).toBe(true);
    const ratio = pSub(pMul(n, A), pMul(m, B));
    checkSolvedSystem(p, [pSub(first.polys[0]!, first.polys[1]!), ratio]);
    // 비가 성립하려면 두 항이 모두 0 이 아니어야 한다
    const sol = answerXY(p.answer);
    expect(rzero(pEval(A, rat(sol.x), rat(sol.y))), "앞 항이 0").toBe(false);
    expect(rzero(pEval(B, rat(sol.x), rat(sol.y))), "뒤 항이 0").toBe(false);
  },

  [`${SY}|11`]: (p) => {
    const block = mathBlocks(p.content).find(
      (b) => (b.match(/=/g) ?? []).length === 2,
    )!;
    const ch = parseChain(block);
    expect(ch.rels, block).toEqual(["=", "="]);
    const e1 = pSub(ch.polys[0]!, ch.polys[2]!);
    const e2 = pSub(ch.polys[1]!, ch.polys[2]!);
    checkSolvedSystem(p, [e1, e2]);
    // $A=B$ 도 성립해야 한다 (셋이 모두 같다)
    const sol = answerXY(p.answer);
    expect(
      rzero(pEval(pSub(ch.polys[0]!, ch.polys[1]!), rat(sol.x), rat(sol.y))),
      block,
    ).toBe(true);
  },

  [`${SY}|19`]: (p) => {
    expect(p.content, "순환소수가 없다").toContain("\\overline");
    checkSolvedSystem(p, casesPolys(p.content));
  },

  [`${SY}|20`]: (p) => {
    const blocks = mathBlocks(p.content);
    const mulEq = blocks.find((b) => b.includes("\\times"))!;
    const divEq = blocks.find((b) => b.includes("\\div"))!;
    const m1 = /^(\d+)\^\{x\}\\times(\d+)\^\{y\}=(\d+)$/.exec(mulEq);
    const m2 = /^(\d+)\^\{x\}\\div(\d+)\^\{y\}=(\d+)$/.exec(divEq);
    expect(m1, mulEq).not.toBeNull();
    expect(m2, divEq).not.toBeNull();
    expect(m1![1], "밑이 다르다").toBe(m1![2]);
    expect(m2![1], "밑이 다르다").toBe(m2![2]);
    const b1 = Number(m1![1]);
    const v1 = Number(m1![3]);
    const b2 = Number(m2![1]);
    const v2 = Number(m2![3]);
    const hits: [number, number][] = [];
    for (let x = 1; x <= 15; x += 1) {
      for (let y = 1; y <= 15; y += 1) {
        if (b1 ** (x + y) === v1 && b2 ** (x - y) === v2) hits.push([x, y]);
      }
    }
    expect(hits.length, `자연수 해가 유일하지 않다: ${p.content}`).toBe(1);
    const want = answerXY(p.answer);
    expect(hits[0], p.content).toEqual([want.x, want.y]);
  },

  // ── 연립일차방정식의 활용 ────────────────────────────
  [`${AP}|01`]: (p) => {
    const f = p.facts;
    expectPrinted(p.content, [f.S!, f.k!, f.r!]);
    const cands: [number, number][] = [];
    for (let big = 1; big < f.S!; big += 1) cands.push([big, f.S! - big]);
    const hit = uniqueBy(
      cands,
      ([big, small]) => big > small && big === f.k! * small - f.r!,
      "수에 대한 문제",
    );
    expect(firstNumber(p.answer)).toBe(hit[0]);
  },

  [`${AP}|02`]: (p) => {
    const f = p.facts;
    expectPrinted(p.content, [f.S!, f.D!]);
    const cands: number[] = [];
    for (let v = 10; v <= 99; v += 1) cands.push(v);
    const hit = uniqueBy(
      cands,
      (v) => {
        const a = Math.floor(v / 10);
        const b = v % 10;
        return a + b === f.S! && 10 * b + a - v === f.D!;
      },
      "자연수에 대한 문제",
    );
    expect(firstNumber(p.answer)).toBe(hit);
  },

  [`${AP}|03`]: (p) => {
    const f = p.facts;
    expectPrinted(p.content, [f.S!, f.k!, f.m!, f.r!]);
    const cands: number[] = [];
    for (let son = 1; son < f.S!; son += 1) cands.push(son);
    const hit = uniqueBy(
      cands,
      (son) => {
        const father = f.S! - son;
        return father > son && father + f.k! === f.m! * (son + f.k!) - f.r!;
      },
      "나이에 대한 문제",
    );
    expect(firstNumber(p.answer)).toBe(hit);
    expect(hit, "아들 나이가 자연수가 아니다").toBeGreaterThan(0);
  },

  [`${AP}|04`]: (p) => {
    const f = p.facts;
    expectPrinted(p.content, [f.p!, f.q!, f.N!, f.T!]);
    const cands: number[] = [];
    for (let na = 0; na <= f.N!; na += 1) cands.push(na);
    const hit = uniqueBy(
      cands,
      (na) => f.p! * na + f.q! * (f.N! - na) === f.T!,
      "가격 개수",
    );
    expect(firstNumber(p.answer)).toBe(hit);
    expect(hit, "사과 개수가 0 이하").toBeGreaterThan(0);
    expect(f.N! - hit, "배 개수가 0 이하").toBeGreaterThan(0);
  },

  [`${AP}|05`]: (p) => {
    const f = p.facts;
    expectPrinted(p.content, [f.L!, f.d!]);
    expect(f.L! % 2, "둘레가 홀수").toBe(0);
    const half = f.L! / 2;
    const cands: number[] = [];
    for (let w = 1; w < half; w += 1) cands.push(w);
    const hit = uniqueBy(cands, (w) => w - (half - w) === f.d!, "도형");
    expect(firstNumber(p.answer)).toBe(hit);
    expect(half - hit, "세로가 0 이하").toBeGreaterThan(0);
  },

  [`${AP}|06`]: (p) => {
    const f = p.facts;
    expectPrinted(p.content, [f.N!, f.p!, f.q!, f.T!]);
    const cands: number[] = [];
    for (let r = 0; r <= f.N!; r += 1) cands.push(r);
    const hit = uniqueBy(
      cands,
      (r) => f.p! * r - f.q! * (f.N! - r) === f.T!,
      "득점 감점",
    );
    expect(firstNumber(p.answer)).toBe(hit);
    expect(hit, "맞힌 문제가 0 이하").toBeGreaterThan(0);
    expect(f.N! - hit, "틀린 문제가 0 이하").toBeGreaterThan(0);
  },

  [`${AP}|07`]: (p) => {
    const f = p.facts;
    expectPrinted(p.content, [f.T!, f.a!, f.b!, Math.abs(f.d!)]);
    expect(p.content).toContain(f.d! > 0 ? "늘었다" : "줄었다");
    const cands: number[] = [];
    for (let m = 0; m <= f.T!; m += 1) cands.push(m);
    const hit = uniqueBy(
      cands,
      (m) => f.a! * m - f.b! * (f.T! - m) === 100 * f.d!,
      "증가 감소",
    );
    expect(hit, "작년 남학생이 0 이하").toBeGreaterThan(0);
    const now = hit + (f.a! * hit) / 100;
    expect(Number.isInteger(now), "올해 남학생이 정수가 아니다").toBe(true);
    expect(firstNumber(p.answer)).toBe(now);
  },

  [`${AP}|08`]: (p) => {
    const f = p.facts;
    expectPrinted(p.content, [f.T!, f.a!, f.b!, f.P!]);
    const cands: number[] = [];
    for (let x = 0; x <= f.T!; x += 100) cands.push(x);
    const hit = uniqueBy(
      cands,
      (x) => f.a! * x + f.b! * (f.T! - x) === 100 * f.P!,
      "원가 정가",
    );
    expect(firstNumber(p.answer)).toBe(hit);
    expect(hit, "A 의 원가가 0 이하").toBeGreaterThan(0);
    expect(f.T! - hit, "B 의 원가가 0 이하").toBeGreaterThan(0);
  },
};

// ════════════════════════════════════════════════════════
//  지면 냄새 — 값이 맞아도 흉한 글자
// ════════════════════════════════════════════════════════
const SMELLS: [string, RegExp][] = [
  ["+- 나 -- 가 붙었다", /\+-|--/],
  ["계수 1 을 적었다", /(?<![\d.])1(?:x|y|a|b)(?![a-zA-Z0-9])/],
  ["계수 0 을 적었다", /(?<![\d.])0(?:x|y|a|b)(?![a-zA-Z0-9])/],
  ["지수 1 을 적었다", /\^1(?!\d)|\^\{1\}/],
  ["지수 0 을 적었다", /\^0|\^\{0\}/],
  ["상수 0 을 더하거나 뺐다", /[+-]0(?![\d.])/],
  ["부등호에 글자가 붙었다", /\\(?:le|ge)[a-zA-Z]/],
  ["연산자가 붙어 있다", /[+\-*/]\s*[*/]/],
  ["빈 괄호", /\(\)/],
];

// ════════════════════════════════════════════════════════
type CatalogType = { minor: string; number: string; title: string };

describe("중2 부등식·연립방정식 기본 30유형", () => {
  it("30유형이 등록돼 있고 유형 번호가 색인 남은 목록과 같다", () => {
    expect(OWNED.length).toBe(30);
    const byMinor = new Map<string, string[]>();
    for (const e of OWNED) {
      const arr = byMinor.get(e.rpmMinor) ?? [];
      arr.push(e.rpmType);
      byMinor.set(e.rpmMinor, arr);
    }
    expect(byMinor.get(IQ)?.sort()).toEqual([
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
      "09",
    ]);
    expect(byMinor.get(SY)?.sort()).toEqual([
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
      "09",
      "10",
      "11",
      "19",
      "20",
    ]);
    expect(byMinor.get(AP)?.sort()).toEqual([
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
    ]);
  });

  it("RPM 유형 번호·제목이 색인 정본과 글자 그대로 같다", () => {
    const raw = readFileSync(
      resolve(__dirname, "../../../scripts/rpm/rpm-type-catalog.json"),
      "utf-8",
    );
    const catalog = JSON.parse(raw) as Record<string, { types: CatalogType[] }>;
    const book = catalog["2-1"]!.types;
    for (const e of OWNED) {
      const hit = book.find(
        (t) => t.minor === e.rpmMinor && t.number === e.rpmType,
      );
      expect(hit, `색인에 없는 유형: ${e.key}`).toBeDefined();
      expect(hit!.title, e.key).toBe(e.rpmTitle);
    }
  });

  it("우리 단원 7개에 실측 이름으로 붙는다", () => {
    const count = new Map<string, number>();
    for (const e of OWNED) {
      count.set(e.unitSection, (count.get(e.unitSection) ?? 0) + 1);
    }
    // prisma/seed-data/units.ts 실측 리터럴 (2026-08-24)
    expect(count).toEqual(
      new Map([
        ["부등식", 5],
        ["일차부등식의 풀이", 4],
        ["미지수가 2개인 연립일차방정식", 5],
        ["연립방정식의 풀이", 2],
        ["여러 가지 연립방정식의 풀이", 6],
        ["연립방정식의 활용(수, 평균, 나이)", 3],
        ["연립방정식의 활용(가격, 개수, 증감, 도형)", 5],
      ]),
    );
  });

  for (const e of OWNED) {
    const vkey = `${e.rpmMinor}|${e.rpmType}`;
    describe(`${e.rpmMinor} ${e.rpmType} ${e.rpmTitle}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        const a = generateMiddleProblem(e.key, 20260824);
        const b = generateMiddleProblem(e.key, 20260824);
        expect(a).toEqual(b);
      });

      it("지면에 인쇄된 식을 다시 파싱해 독립 검산한다", () => {
        const check = CHECKS[vkey];
        expect(check, `검산식 누락: ${vkey}`).toBeDefined();
        for (const seed of SEEDS) check!(generateMiddleProblem(e.key, seed));
        // 고정 씨앗이 못 밟는 갈래(소수/분수·상황 갈래)를 변형이 넓게 밟는다
        for (let v = 0; v < 14; v += 1) {
          check!(generateMiddleProblem(e.key, 20260824, v));
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
          let joined = "";
          for (const part of [p.content, p.answer, p.solution]) {
            const html = renderMathHtml(part);
            expect(/#cc0000/i.test(html), part).toBe(false);
            expect(html.includes("math-raw"), part).toBe(false);
            joined += html;
          }
          if (e.rpmType === "19" && e.rpmMinor === SY) {
            // 순환마디는 막대가 아니라 점 (CLAUDE.md 2026-08-14)
            expect(joined, "repeat-dot 없음").toContain("repeat-dot");
          }
        }
      });

      it("지면 냄새가 없다 (값이 맞아도 흉한 글자)", () => {
        for (let s = 0; s < 40; s += 1) {
          for (let v = 0; v < 3; v += 1) {
            const p = generateMiddleProblem(e.key, s * 977 + 13, v);
            for (const [label, text] of [
              ["발문", p.content],
              ["정답", p.answer],
              ["해설", p.solution],
            ] as const) {
              for (const [name, re] of SMELLS) {
                expect(re.test(text), `${name} — ${label}: ${text}`).toBe(
                  false,
                );
              }
              // ⚠️ 「수식 안 한글」은 정규식 하나로 못 센다 — `$…$ 한글 $…$` 의
              //    가운데 토막까지 걸린다. 짝지은 블록만 본다.
              for (const b of mathBlocks(text)) {
                expect(
                  /[가-힣]/.test(b),
                  `수식 안에 한글 — ${label}: $${b}$`,
                ).toBe(false);
              }
            }
          }
        }
      });
    });
  }

  it("보기 유형은 제품 파서가 보기 다섯으로 읽는다", () => {
    // 표식이 줄바꿈으로 읽히는 문자가 아니면 보기 다섯이 **한 줄로 이어진다** —
    // 값 검사로는 안 보인다 (m2Rational 이 2026-08-23 실렌더로 밟은 자리).
    const CHOICE_KEYS = [
      `2-1|${IQ}|01`,
      `2-1|${IQ}|04`,
      `2-1|${IQ}|06`,
      `2-1|${SY}|01`,
      `2-1|${SY}|04`,
    ];
    for (const key of CHOICE_KEYS) {
      for (const seed of SEEDS) {
        const parsed = parseProblemContent(
          generateMiddleProblem(key, seed).content,
        );
        expect(parsed.choices.length, `${key} seed=${seed}`).toBe(5);
        expect(parsed.question, key).not.toContain(LETTERS[1]);
      }
    }
    // 반대쪽 표본 — 목록이 아닌 유형이 보기로 읽히면 안 된다
    for (const key of [`2-1|${IQ}|07`, `2-1|${SY}|07`, `2-1|${AP}|04`]) {
      const parsed = parseProblemContent(
        generateMiddleProblem(key, 20260824).content,
      );
      expect(parsed.choices.length, key).toBe(0);
    }
  });

  it("한 유형에서 4문항을 뽑으면 발문이 전부 다르다", () => {
    for (const e of OWNED) {
      const set = generateMiddleSet(e.key, 20260824, 4);
      const contents = new Set(set.map((p: MidProblem) => p.content));
      expect(contents.size, e.key).toBe(4);
    }
  });

  it("파서 자체가 살아 있다 (양성·음성 대조군)", () => {
    // 판정기를 믿기 전에 「이 도구가 «아니오»를 낼 수 있는가」를 묻는다
    // (CLAUDE.md 2026-08-20·08-23).
    expect(rnum(pCoef(parseExprOnly("3x-2(x-4)"), 1, 0))).toBe(1);
    expect(rnum(pCoef(parseExprOnly("3x-2(x-4)"), 0, 0))).toBe(8);
    expect(rnum(pCoef(parseExprOnly("\\dfrac{1}{5}x"), 1, 0))).toBe(0.2);
    expect(rnum(pCoef(parseExprOnly("0.14x"), 1, 0))).toBe(0.14);
    expect(parseExprOnly("0.\\overline{3}").get("0,0")!.d).toBe(3);
    expect(parseExprOnly("1.\\overline{3}").get("0,0")!.n).toBe(4);
    expect(rnum(pCoef(parseExprOnly("x^2+xy"), 1, 1))).toBe(1);
    expect(rnum(pCoef(parseExprOnly("x^2+xy"), 2, 0))).toBe(1);
    // 부등호 방향이 뒤집히는가
    const neg = parseChain("-3x>6");
    expect(solveLinIneq(pSub(neg.polys[0]!, neg.polys[1]!), ">").rel).toBe("<");
    expect(rnum(solveLinIneq(pSub(neg.polys[0]!, neg.polys[1]!), ">").s)).toBe(
      -2,
    );
    // 음성 대조군 — 틀린 것을 틀렸다고 해야 한다
    const good = parseChain("2x+y=7");
    expect(chainHolds(good, rat(3), rat(1))).toBe(true);
    expect(chainHolds(good, rat(3), rat(2))).toBe(false);
    expect(() => parseExprOnly("\\notacommand{2}")).toThrow();
    expect(() =>
      solve2(
        pSub(parseChain("x+y=1").polys[0]!, parseChain("x+y=1").polys[1]!),
        pSub(parseChain("2x+2y=2").polys[0]!, parseChain("2x+2y=2").polys[1]!),
      ),
    ).toThrow();
  });
});
