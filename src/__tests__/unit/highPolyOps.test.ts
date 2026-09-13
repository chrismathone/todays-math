/**
 * 공통수학1 「다항식의 연산」 14유형 — **독립 검산** (물결 1 세션 `h1-poly`).
 *
 * 본보기 `highIdentity.test.ts` 를 따른다. 생성기의 답을 믿지 않고 `facts` 로 **다른 식**을 세운다 —
 * 실제 근을 구해 목표식에 바로 넣기(복소수 · Durand–Kerner) · 두 문자 다항식을 직접 곱하기 ·
 * 긴 나눗셈 · 조립제법을 시험 쪽에서 다시 · BigInt 거듭제곱. 다항식 셈과 지면 읽기는 제품
 * (`src/lib/high/poly.ts`)을 안 부른다.
 *
 * 지면(수식 밖 수 · 냄새 · 조사) · 난이도 · 형식(변형 셋 · 객관식) · 해설 끝 답은 `highRegistry.test.ts`
 * 가 등록 유형 전부에 돈다 — 여기 옮겨 적지 않는다. 여기는 ⑴ 등록 ⑵ VERIFY ⑶ SHOWN ⑷ 꼴이 다 도나
 * ⑸ 식 정답의 오답이 **값이 다른** 식인가.
 *
 * 공용 후보(리드에게 — 세션은 `helpers/` 를 못 고친다): `parseMono`(여러 문자 다항식 읽기) ·
 * `Shown`(발문이 facts 의 수치를 보여 주나 — 다항식·등식·문자열 셋) · `allRoots`(복소 근).
 */
import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import {
  generateHighProblem,
  registeredHighHolds,
  registeredHighTypes,
} from "../../lib/high/generate";
import { H1_POLY_OPS, H1_POLY_OPS_HOLD } from "../../lib/high/h1PolyOps";
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
  pscale,
  ptrim,
  pval,
  readAnswer,
  type P,
} from "../helpers/highPage";

const BOOK = "공통수학1";
const MINOR = "다항식의 연산";
const SEEDS = [20260913, 1, 7777, 424242, 99991];
const VARIANTS = 14;

const catalogRows = highCatalog(BOOK).filter((t) => t.minor === MINOR);
const rowOf = (number: string) => {
  const row = catalogRows.find((t) => t.number === number);
  if (!row) throw new Error(`색인에 없는 번호: ${number}`);
  return row;
};

type Fact = Record<string, number>;

// ───────────────────────────── 복소수 ─────────────────────────────

type C = { re: number; im: number };
const cx = (re: number, im = 0): C => ({ re, im });
const cadd = (a: C, b: C): C => cx(a.re + b.re, a.im + b.im);
const csub = (a: C, b: C): C => cx(a.re - b.re, a.im - b.im);
const cmul = (a: C, b: C): C =>
  cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);

function cdiv(a: C, b: C): C {
  const n = b.re * b.re + b.im * b.im;
  return cx((a.re * b.re + a.im * b.im) / n, (a.im * b.re - a.re * b.im) / n);
}

function cpow(z: C, n: number): C {
  let out = cx(1);
  for (let i = 0; i < n; i += 1) out = cmul(out, z);
  return out;
}

/** $ax^2+bx+c=0$ 의 한 근 — 판별식이 음수면 허근. */
function quadRoot(a: number, b: number, c: number): C {
  const D = b * b - 4 * a * c;
  const sq = D >= 0 ? cx(Math.sqrt(D)) : cx(0, Math.sqrt(-D));
  return cdiv(cadd(cx(-b), sq), cx(2 * a));
}

/** 최고차항 1 인 다항식(높은 차수부터 `[1, c1, …]`)의 모든 근 — Durand–Kerner. */
function allRoots(coefs: readonly number[]): C[] {
  const n = coefs.length - 1;
  const f = (z: C): C =>
    coefs.reduce<C>((acc, c) => cadd(cmul(acc, z), cx(c)), cx(0));
  let zs = Array.from({ length: n }, (_, k) => cpow(cx(0.4, 0.9), k));
  for (let it = 0; it < 3000; it += 1) {
    const prev = zs;
    zs = prev.map((z, i) => {
      let den = cx(1);
      prev.forEach((w, j) => {
        if (j !== i) den = cmul(den, csub(z, w));
      });
      return csub(z, cdiv(f(z), den));
    });
  }
  return zs;
}

/** 허수부가 사실상 0 인 복소수 → 실수. */
function real(z: C, what: string): number {
  expect(Math.abs(z.im), `${what}: 허수부가 남았다`).toBeLessThan(
    1e-6 * Math.max(1, Math.abs(z.re)),
  );
  return z.re;
}

// ───────────────────────────── 다항식 ─────────────────────────────

/** 나머지까지 — 나누는 식의 최고차항이 ±1 이 아니어도 된다(값은 부동소수). */
function pdiv(num: readonly number[], den: readonly number[]): { q: P; r: P } {
  const d = ptrim(den);
  const lead = d[d.length - 1]!;
  const r = [...ptrim(num)];
  const q = new Array<number>(Math.max(1, r.length - d.length + 1)).fill(0);
  for (let i = r.length - d.length; i >= 0; i -= 1) {
    const k = r[i + d.length - 1]! / lead;
    q[i] = k;
    for (let j = 0; j < d.length; j += 1) r[i + j]! -= k * d[j]!;
  }
  return { q: ptrim(q), r: ptrim(r.slice(0, Math.max(1, d.length - 1))) };
}

/** 두 문자 다항식 — `"i,j"` 가 $x^iy^j$ 의 계수. */
type B2 = Map<string, number>;

function b2(terms: readonly (readonly [number, number, number])[]): B2 {
  const m: B2 = new Map();
  for (const [c, i, j] of terms) {
    if (c !== 0) m.set(`${i},${j}`, (m.get(`${i},${j}`) ?? 0) + c);
  }
  return m;
}

function bmul(a: B2, b: B2): B2 {
  const out: B2 = new Map();
  for (const [ka, va] of a) {
    const [i1, j1] = ka.split(",").map(Number) as [number, number];
    for (const [kb, vb] of b) {
      const [i2, j2] = kb.split(",").map(Number) as [number, number];
      const k = `${i1 + i2},${j1 + j2}`;
      out.set(k, (out.get(k) ?? 0) + va * vb);
    }
  }
  for (const [k, v] of out) if (v === 0) out.delete(k);
  return out;
}

function bsub(a: B2, b: B2): B2 {
  const out: B2 = new Map(a);
  for (const [k, v] of b) out.set(k, (out.get(k) ?? 0) - v);
  for (const [k, v] of out) if (v === 0) out.delete(k);
  return out;
}

const bco = (m: B2, i: number, j: number): number => m.get(`${i},${j}`) ?? 0;

// ───────────────────────────── 지면 읽기 ─────────────────────────────

/** 여러 문자 다항식의 항 지도 — 열쇠는 `x2y1`(문자 순) · 상수항은 `""`. */
type Mono = Map<string, number>;

/**
 * 여러 문자 다항식 한 조각을 읽는다 — `2x^{2}+3xy-5y^{2}` · `a^{2}+5a-1`.
 * 괄호·분수·근호·대문자가 있으면 `null`(판정하지 않는다).
 */
function parseMono(s: string): Mono | null {
  const body = s.replace(/\s+/g, "");
  if (body === "" || !/^[-+0-9a-z^{}]+$/.test(body)) return null;
  const terms = body.match(/[+-]?[^+-]+/g);
  if (!terms) return null;
  const out: Mono = new Map();
  for (const t of terms) {
    const m = /^([+-]?)(\d*)((?:[a-z](?:\^\{\d+\})?)*)$/.exec(t);
    if (!m || (m[2] === "" && m[3] === "")) return null;
    const coef = (m[1] === "-" ? -1 : 1) * (m[2] === "" ? 1 : Number(m[2]));
    const vars = new Map<string, number>();
    for (const v of m[3]!.matchAll(/([a-z])(?:\^\{(\d+)\})?/g)) {
      vars.set(v[1]!, (vars.get(v[1]!) ?? 0) + (v[2] ? Number(v[2]) : 1));
    }
    const key = [...vars.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([v, e]) => `${v}${e}`)
      .join("");
    out.set(key, (out.get(key) ?? 0) + coef);
  }
  for (const [k, v] of out) if (v === 0) out.delete(k);
  return out;
}

function mono(terms: readonly (readonly [number, string])[]): Mono {
  const out: Mono = new Map();
  for (const [c, k] of terms) if (c !== 0) out.set(k, (out.get(k) ?? 0) + c);
  return out;
}

function monoKey(m: Mono): string {
  return JSON.stringify(
    [...m.entries()].sort(([a], [b]) => a.localeCompare(b)),
  );
}

/**
 * 발문이 facts 의 수치를 **실제로** 보여 주나 — 세 가지로 대조한다.
 *   · `poly` — $x$ 다항식(등식의 변 · 괄호 속 인수)
 *   · `mono` — 여러 문자 다항식(같은 자리)
 *   · `eq`   — `왼쪽=수` 꼴의 등식(오른쪽은 근호·분수까지 값으로 읽는다)
 *   · `has`  — 고정된 틀의 조각(문자열)
 */
class Shown {
  checked = 0;
  private readonly polys = new Set<string>();
  private readonly monos = new Set<string>();
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
        const m = parseMono(piece);
        if (m) this.monos.add(monoKey(m));
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

  poly(p: readonly number[]): void {
    this.checked += 1;
    expect(
      this.polys.has(pkey(p)),
      `${this.where}: 발문에 다항식 ${pkey(p)} 가 없다`,
    ).toBe(true);
  }

  mono(m: Mono): void {
    this.checked += 1;
    expect(
      this.monos.has(monoKey(m)),
      `${this.where}: 발문에 ${monoKey(m)} 가 없다`,
    ).toBe(true);
  }

  eq(lhs: string, v: number): void {
    this.checked += 1;
    const got = this.eqs.get(lhs) ?? [];
    // 1e-6 — 07 은 기대값을 Durand–Kerner 근에서 다시 내는데, 중근 근처에서는 1e-8 까지 흔들린다
    expect(
      got.some((g) => Math.abs(g - v) < 1e-6 * Math.max(1, Math.abs(v))),
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

// ───────────────────────────── 정답 읽기 ─────────────────────────────

type Expect = { num: number } | { poly: readonly number[] } | { qcoef: number };

/** `$\dfrac{1}{3}Q(x)$` · `$-2Q(x)$` 의 계수. */
function qCoefOf(tex: string): number {
  const m = /^\$(-)?(?:\\dfrac\{1\}\{(\d+)\}|(\d+))?Q\(x\)\$$/.exec(tex.trim());
  if (!m) throw new Error(`몫 꼴을 못 읽는다: ${tex}`);
  const sign = m[1] ? -1 : 1;
  if (m[2]) return sign / Number(m[2]);
  if (m[3]) return sign * Number(m[3]);
  return sign;
}

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
  if ("poly" in want) {
    const got = readAnswer(p.answer);
    expect(
      typeof got === "number" ? pkey([got]) : pkey(got),
      `${where}: 지면 ${p.answer}`,
    ).toBe(pkey(want.poly));
    return;
  }
  expect(
    Math.abs(qCoefOf(p.answer) - want.qcoef),
    `${where}: 지면 ${p.answer}`,
  ).toBeLessThan(1e-12);
}

// ───────────────────────────── VERIFY ─────────────────────────────

type Fn2 = (u: C, v: C) => C;

const VERIFY: Record<string, (f: Fact) => Expect> = {
  "01": (f) => {
    if (f.mode === 0) {
      const A = [f.A0!, f.A1!, f.A2!];
      const B = [f.B0!, f.B1!, f.B2!];
      const Cc = [f.C0!, f.C1!, f.C2!];
      const neg = (p: readonly number[]) => pscale(p, -1);
      if (f.tpl === 0) {
        // A - k1(A - k2B) + C
        return {
          poly: padd(padd(A, pscale(padd(A, pscale(B, -f.k2!)), -f.k1!)), Cc),
        };
      }
      if (f.tpl === 1) {
        // k1(A + B) - k2(B - C)
        return {
          poly: padd(
            pscale(padd(A, B), f.k1!),
            pscale(padd(B, neg(Cc)), -f.k2!),
          ),
        };
      }
      // k1A - {B - k2(A - C)} + C
      return {
        poly: padd(
          padd(
            pscale(A, f.k1!),
            neg(padd(B, pscale(padd(A, neg(Cc)), -f.k2!))),
          ),
          Cc,
        ),
      };
    }
    if (f.mode === 1) {
      const det = f.a1! * f.b2! - f.a2! * f.b1!;
      const Pv = [f.P0!, f.P1!, f.P2!];
      const Qv = [f.Q0!, f.Q1!, f.Q2!];
      const A = Pv.map((p, i) => (p * f.b2! - Qv[i]! * f.b1!) / det);
      const B = Pv.map((p, i) => (f.a1! * Qv[i]! - f.a2! * p) / det);
      for (const v of [...A, ...B]) {
        expect(Number.isInteger(v), "A, B 가 정수 계수가 아니다").toBe(true);
      }
      const T = A.map((a, i) => f.r1! * a + f.r2! * B[i]!);
      const [a, b, c] = T as [number, number, number];
      return { num: [a + b + c, a - b + c, a * b * c][f.exprId!]! };
    }
    const A = ptrim([f.A0!, f.A1!, f.A2!, f.A3!]);
    const B = [f.B0!, f.B1!, f.B2!];
    // A - k(X - B) = sA  →  kX = A + kB - sA
    const kX = padd(padd(A, pscale(B, f.k!)), pscale(A, -f.s!));
    for (const c of kX) {
      expect(Number.isInteger(c / f.k!), "X 가 정수 계수가 아니다").toBe(true);
    }
    return { poly: kX.map((c) => c / f.k!) };
  },

  "02": (f) => {
    if (f.mode === 0) {
      const prod = pmul(
        [f.p0!, f.p1!, f.p2!, f.p3!],
        [f.q0!, f.q1!, f.q2!, f.q3!],
      );
      return { num: prod[f.k!] ?? 0 };
    }
    if (f.mode === 1) {
      const F = (x: number, y: number) =>
        (f.a1! * x + f.b1! * y + f.c1!) * (f.a2! * x + f.b2! * y + f.c2!);
      // 이차 이하 두 문자 식에서 계수를 차분으로 뽑는다(전개하지 않고)
      const v =
        f.tgt === 0
          ? (F(1, 1) - F(1, -1) - F(-1, 1) + F(-1, -1)) / 4
          : f.tgt === 1
            ? (F(1, 0) - F(-1, 0)) / 2
            : (F(0, 1) - F(0, -1)) / 2;
      return { num: v };
    }
    if (f.mode === 2) {
      const at = (k: number) =>
        pmul([f.r!, f.p!, 1], [k, f.s!, 1])[f.tgt === 0 ? 2 : 1] ?? 0;
      const slope = at(1) - at(0);
      expect(slope, "k 의 계수가 0 이라 k 가 안 정해진다").not.toBe(0);
      return { num: (f.G! - at(0)) / slope };
    }
    const base = Array.from({ length: f.n! + 1 }, (_, i) => i);
    return { num: pmul(base, base)[f.m!] ?? 0 };
  },

  "03": (f) => {
    if (f.mode === 0) {
      if (f.fam === 0) {
        const L = b2([
          [f.p!, 1, 0],
          [f.q!, 0, 1],
        ]);
        const cube = bmul(bmul(L, L), L);
        return { num: f.tgt === 0 ? bco(cube, 2, 1) : bco(cube, 1, 2) };
      }
      const L = b2([
        [f.p!, 1, 0],
        [f.q!, 0, 1],
        [f.r!, 0, 0],
      ]);
      const sq = bmul(L, L);
      return {
        num:
          f.tgt === 0
            ? bco(sq, 1, 1)
            : f.tgt === 1
              ? bco(sq, 1, 0)
              : bco(sq, 0, 1),
      };
    }
    if (f.mode === 1) {
      const part = (u: number, v: number) =>
        bmul(
          b2([
            [u, 1, 0],
            [v, 0, 1],
          ]),
          b2([
            [u * u, 2, 0],
            [-u * v, 1, 1],
            [v * v, 0, 2],
          ]),
        );
      const E = bsub(part(f.p!, f.q!), part(f.r!, f.s!));
      for (const k of E.keys()) {
        expect(["3,0", "0,3"], `항등식이 아니다 — x^iy^j ${k}`).toContain(k);
      }
      const a = bco(E, 3, 0);
      const b = bco(E, 0, 3);
      return { num: [a - b, a + b, a * b][f.exprId!]! };
    }
    const k = f.k!;
    if (f.fam === 0) {
      const x = f.N! ** (1 / 6);
      return {
        num:
          (x * x - k * k) * (x * x + k * x + k * k) * (x * x - k * x + k * k),
      };
    }
    const x = f.N! ** (1 / 4);
    return { num: (x - k) * (x + k) * (x * x + k * k) };
  },

  "04": (f) => {
    if (f.mode === 0) {
      const full = pmul([f.p!, f.m!, 1], [f.q!, f.m!, 1]);
      const [d, c, b, a] = [full[0]!, full[1]!, full[2]!, full[3]!];
      return { num: [a + b + c + d, a - b + c, a + b - c - d][f.exprId!]! };
    }
    if (f.mode === 1) {
      return {
        poly: [f.r1!, f.r2!, f.r3!, f.r4!].reduce<P>(
          (acc, r) => pmul(acc, [r, 1]),
          [1],
        ),
      };
    }
    const a = quadRoot(1, f.s!, -f.c!);
    const prod = [f.u!, f.v!, f.w!, f.z!].reduce<C>(
      (acc, k) => cmul(acc, cadd(a, cx(k))),
      cx(1),
    );
    return { num: real(prod, "04 곱") };
  },

  "05": (f) => {
    let x: C;
    let y: C;
    let target: Fn2;
    const sq2: Fn2 = (u, v) => cadd(cmul(u, u), cmul(v, v));
    if (f.mode === 0) {
      if (f.fam === 0) {
        x = quadRoot(1, -f.s!, f.p!);
        y = csub(cx(f.s!), x);
      } else {
        x = quadRoot(1, -f.d!, -f.p!);
        y = csub(x, cx(f.d!));
      }
      const t1: Fn2 =
        f.fam === 0
          ? (u, v) => cpow(csub(u, v), 2)
          : (u, v) => cpow(cadd(u, v), 2);
      const t2: Fn2 =
        f.fam === 0
          ? (u, v) => cadd(cpow(u, 3), cpow(v, 3))
          : (u, v) => csub(cpow(u, 3), cpow(v, 3));
      target = [sq2, t1, t2][f.tgt!]!;
    } else if (f.mode === 1) {
      if (f.fam === 0) {
        x = quadRoot(2, -2 * f.s!, f.s! * f.s! - f.m!);
        y = csub(cx(f.s!), x);
        target = (u, v) => cadd(cpow(u, 3), cpow(v, 3));
      } else if (f.fam === 1) {
        x = quadRoot(2, -2 * f.d!, f.d! * f.d! - f.m!);
        y = csub(x, cx(f.d!));
        target = (u, v) => csub(cpow(u, 3), cpow(v, 3));
      } else {
        x = quadRoot(3 * f.s!, -3 * f.s! * f.s!, f.s! ** 3 - f.c!);
        y = csub(cx(f.s!), x);
        target = (u, v) => cadd(sq2(u, v), cmul(u, v));
      }
    } else {
      x = cx(f.m! + Math.sqrt(f.r!));
      y = cx(f.m! - Math.sqrt(f.r!));
      const fns: Fn2[] = [
        sq2,
        (u, v) => cadd(cpow(u, 3), cpow(v, 3)),
        (u, v) => cadd(cmul(cmul(u, u), v), cmul(u, cmul(v, v))),
        (u, v) => cadd(cdiv(v, u), cdiv(u, v)),
      ];
      target = fns[f.tgt!]!;
    }
    return { num: real(target(x, y), "05") };
  },

  "06": (f) => {
    const inv = (z: C) => cdiv(cx(1), z);
    const both = (z: C, n: number, sign: number) =>
      cadd(cpow(z, n), cmul(cx(sign), inv(cpow(z, n))));
    if (f.mode === 1 && f.fam === 0) {
      const m = f.m!;
      const x = cx(m + Math.sqrt(m * m - 1));
      return { num: real(both(x, f.tgt === 0 ? 2 : 3, 1), "06") };
    }
    // x² - kx + (±1) = 0 ⇔ x ± 1/x = k
    const x = quadRoot(1, -f.k!, f.plus!);
    if (f.mode === 0) {
      return {
        num: real(f.tgt === 0 ? both(x, 2, 1) : both(x, 3, f.plus!), "06"),
      };
    }
    if (f.mode === 1) return { num: real(both(x, 4, 1), "06") };
    const sg = f.plus!;
    const terms: [number, C][] = [
      [f.al!, cpow(x, 3)],
      [f.be!, cpow(x, 2)],
      [f.gm!, x],
      [sg * f.gm!, inv(x)],
      [f.be!, inv(cpow(x, 2))],
      [sg * f.al!, inv(cpow(x, 3))],
    ];
    const E = terms.reduce<C>(
      (acc, [c, z]) => cadd(acc, cmul(cx(c), z)),
      cx(0),
    );
    return { num: real(E, "06") };
  },

  "07": (f) => {
    const [a, b, c] = allRoots([1, -f.s!, f.e2!, -f.e3!]) as [C, C, C];
    const sq = (z: C) => cmul(z, z);
    if (f.mode === 0) {
      return f.v === 0
        ? { num: real(cadd(cadd(sq(a), sq(b)), sq(c)), "07") }
        : {
            num: real(cadd(cadd(cmul(a, b), cmul(b, c)), cmul(c, a)), "07"),
          };
    }
    if (f.mode === 1) {
      return {
        num: real(cmul(cmul(cadd(a, b), cadd(b, c)), cadd(c, a)), "07"),
      };
    }
    if (f.v === 1) {
      return {
        num: real(cadd(cadd(cpow(a, 4), cpow(b, 4)), cpow(c, 4)), "07"),
      };
    }
    return {
      num: real(
        cadd(cadd(sq(cmul(a, b)), sq(cmul(b, c))), sq(cmul(c, a))),
        "07",
      ),
    };
  },

  "08": (f) => {
    if (f.mode === 1) {
      const A = f.A!;
      const r = Math.sqrt(f.B!);
      return { num: ((A + r) ** 3 + (A - r) ** 3) / (2 * A) };
    }
    const one = BigInt(1);
    const b = BigInt(f.b!);
    let prod = one;
    for (let j = 0; j <= f.k!; j += 1) prod *= b ** BigInt(2 ** j) + one;
    for (let n = 1; n <= 64; n += 1) {
      const bn = b ** BigInt(n);
      if (f.fam === 0 && bn - one === prod) return { num: n };
      if (f.fam === 1 && bn - one === BigInt(9) * prod) return { num: n };
      if (f.fam === 2 && bn - one === (b - one) * prod) return { num: n };
    }
    throw new Error("08: 지수를 못 찾았다");
  },

  "09": (f) => {
    const D = [f.d0!, f.d1!, 1];
    if (f.mode === 0) {
      const F = padd(pmul(D, [f.q0!, 1]), [f.r0!, f.r1!]);
      const { q, r } = plongDivide(F, D);
      return { num: pval(q, f.s!) + pval(r, f.t!) };
    }
    if (f.mode === 1) {
      const F = padd(pmul(D, [f.b!, f.a!]), [f.d!, f.c!]);
      const { q, r } = plongDivide(F, D);
      const [b, a] = [q[0] ?? 0, q[1] ?? 0];
      const [d, c] = [r[0] ?? 0, r[1] ?? 0];
      return { num: [a * b - c * d, a + b + c + d, a * b + c * d][f.exprId!]! };
    }
    const F = padd(pmul(D, [f.q0!, f.q1!, f.q2!]), [f.r0!, f.r1!]);
    return { poly: plongDivide(F, D).r };
  },

  "10": (f) => {
    if (f.mode === 0) {
      const A = [f.a0!, f.a1!, 1];
      const Qv = [f.q0!, f.q1!, f.q2!];
      const R = [f.r0!, f.r1!];
      const F = padd(pmul(A, Qv), R);
      const { q, r } = pdiv(padd(F, pscale(R, -1)), Qv);
      expect(pkey(r), "나머지를 빼면 나누어떨어져야 한다").toBe("[0]");
      return { poly: q };
    }
    if (f.mode === 1) {
      const F = padd(pmul([-f.a!, 1], [f.n!, f.m!]), [f.r!]);
      const { q, r } = plongDivide(F, [-f.b!, 1]);
      return { num: pval(q, f.t!) + (r[0] ?? 0) };
    }
    const Pp = pmul([f.a!, 1], [f.w0!, f.w1!, 1]);
    const { q, r } = plongDivide(Pp, [f.a!, 1]);
    expect(pkey(r), "넓이가 가로로 나누어떨어지지 않는다").toBe("[0]");
    return { poly: q };
  },

  "11": (f) => {
    if (f.mode === 0) return { qcoef: f.dir === 0 ? 1 / f.a! : f.a! };
    const beta = f.b! / f.a!;
    if (f.mode === 1) {
      const F = padd(pmul([-f.b!, f.a!], [f.q0!, f.q1!, f.q2!]), [f.R!]);
      // 나머지정리로 나머지 · 그 나머지를 빼고 나눈 몫
      const R = pval(F, beta);
      const { q, r } = pdiv(padd(F, [-R]), [-f.b!, f.a!]);
      expect(Math.abs(r[0] ?? 0)).toBeLessThan(1e-9);
      return { num: pval(q, f.t!) + R };
    }
    // 몫이 무엇이든 나머지는 같다 — 아무 몫(x²+1)으로 f 를 세워 xf(x) 에 x=b/a 를 넣는다
    const fx = (x: number) => (x - beta) * (x * x + 1) + f.R!;
    return { num: beta * fx(beta) };
  },

  "12": (f) => {
    if (f.mode === 0) {
      const out: number[] = [];
      let carry = 0;
      for (const v of [f.f3!, f.f2!, f.f1!, f.f0!]) {
        carry = carry * f.al! + v;
        out.push(carry);
      }
      const [, q1, q0, R] = out as [number, number, number, number];
      return { num: q1 + q0 + R };
    }
    return { poly: [f.q0!, f.q1!, f.q2!] };
  },

  "13": (f) => {
    if (f.mode === 0) {
      const a = 0;
      const b = -f.p!;
      const c = f.v === 0 ? -f.r! : b - f.r!;
      return { num: a * a + b * b + c * c - a * b - b * c - c * a };
    }
    if (f.mode === 1) {
      const S1 = f.m! + Math.sqrt(f.rr!);
      const S2 = f.m! - Math.sqrt(f.rr!);
      const S3 = f.k!;
      const a = (S1 - S2 + S3) / 2;
      const b = (S1 + S2 - S3) / 2;
      const c = (S2 + S3 - S1) / 2;
      return { num: a * a + b * b + c * c + a * b + b * c + c * a };
    }
    const t = f.t!;
    const [a, b, c] = [t, t, t];
    expect(a * a + b * b + c * c, "조건식이 성립하지 않는다").toBe(
      a * b + b * c + c * a,
    );
    return {
      num: [a * b * c, a * a + b * b + c * c, a + 2 * b + 3 * c][f.tgt!]!,
    };
  },

  "14": (f) => {
    if (f.mode === 0) return { num: Math.hypot(f.a!, f.b!, f.c!) };
    if (f.mode === 1) return { num: f.x! * f.y! };
    return { num: (f.a! + f.b!) * (f.a! + f.c!) - f.a! * f.a! };
  },
};

// ───────────────────────────── SHOWN ─────────────────────────────

const lin = (a: number, b: number, c: number): Mono =>
  mono([
    [a, "x1"],
    [b, "y1"],
    [c, ""],
  ]);

const hq = (a: number, b: number, c: number): Mono =>
  mono([
    [a, "x2"],
    [b, "x1y1"],
    [c, "y2"],
  ]);

const powB = (b: number, e: number): string =>
  e === 1 ? String(b) : `${b}^{${e}}`;

const SHOWN: Record<string, (f: Fact, sh: Shown) => void> = {
  "01": (f, sh) => {
    if (f.mode === 0) {
      sh.poly([f.A0!, f.A1!, f.A2!]);
      sh.poly([f.B0!, f.B1!, f.B2!]);
      sh.poly([f.C0!, f.C1!, f.C2!]);
      return;
    }
    if (f.mode === 1) {
      sh.mono(hq(f.P0!, f.P1!, f.P2!));
      sh.mono(hq(f.Q0!, f.Q1!, f.Q2!));
      return;
    }
    sh.poly(ptrim([f.A0!, f.A1!, f.A2!, f.A3!]));
    sh.poly([f.B0!, f.B1!, f.B2!]);
  },
  "02": (f, sh) => {
    if (f.mode === 0) {
      sh.poly(ptrim([f.p0!, f.p1!, f.p2!, f.p3!]));
      sh.poly(ptrim([f.q0!, f.q1!, f.q2!, f.q3!]));
    } else if (f.mode === 1) {
      sh.mono(lin(f.a1!, f.b1!, f.c1!));
      sh.mono(lin(f.a2!, f.b2!, f.c2!));
    } else if (f.mode === 2) {
      sh.poly([f.r!, f.p!, 1]);
      sh.has(`$${f.G}$`);
    } else {
      sh.has(`${f.n}x^{${f.n}}`);
    }
  },
  "03": (f, sh) => {
    if (f.mode === 0) {
      sh.mono(lin(f.p!, f.q!, f.r!));
      return;
    }
    if (f.mode === 1) {
      for (const [u, v] of [
        [f.p!, f.q!],
        [f.r!, f.s!],
      ] as const) {
        sh.mono(lin(u, v, 0));
        sh.mono(hq(u * u, -u * v, v * v));
      }
      return;
    }
    const k = f.k!;
    if (f.fam === 0) {
      sh.eq("x^{6}", f.N!);
      sh.poly([-k * k, 0, 1]);
      sh.poly([k * k, k, 1]);
      sh.poly([k * k, -k, 1]);
    } else {
      sh.eq("x^{4}", f.N!);
      sh.poly([-k, 1]);
      sh.poly([k, 1]);
      sh.poly([k * k, 0, 1]);
    }
  },
  "04": (f, sh) => {
    if (f.mode === 0) {
      sh.poly([f.p!, f.m!, 1]);
      sh.poly([f.q!, f.m!, 1]);
    } else if (f.mode === 1) {
      for (const r of [f.r1!, f.r2!, f.r3!, f.r4!]) sh.poly([r, 1]);
    } else {
      sh.mono(
        mono([
          [1, "a2"],
          [f.s!, "a1"],
          [-f.c!, ""],
        ]),
      );
      for (const k of [f.u!, f.v!, f.w!, f.z!]) {
        sh.mono(
          mono([
            [1, "a1"],
            [k, ""],
          ]),
        );
      }
    }
  },
  "05": (f, sh) => {
    if (f.mode === 0) {
      if (f.fam === 0) sh.eq("x+y", f.s!);
      else sh.eq("x-y", f.d!);
      sh.eq("xy", f.p!);
    } else if (f.mode === 1) {
      if (f.fam === 0) {
        sh.eq("x+y", f.s!);
        sh.eq("x^{2}+y^{2}", f.m!);
      } else if (f.fam === 1) {
        sh.eq("x-y", f.d!);
        sh.eq("x^{2}+y^{2}", f.m!);
      } else {
        sh.eq("x+y", f.s!);
        sh.eq("x^{3}+y^{3}", f.c!);
      }
    } else {
      sh.eq("x", f.m! + Math.sqrt(f.r!));
      sh.eq("y", f.m! - Math.sqrt(f.r!));
    }
  },
  "06": (f, sh) => {
    if (f.mode === 1 && f.fam === 0) {
      sh.eq("x", f.m! + Math.sqrt(f.m! * f.m! - 1));
      return;
    }
    if (f.mode === 1) {
      sh.eq(f.plus === 1 ? "x+\\dfrac{1}{x}" : "x-\\dfrac{1}{x}", f.k!);
      return;
    }
    sh.poly([f.plus!, -f.k!, 1]);
    if (f.mode === 2) sh.has(`\\dfrac{${Math.abs(f.al!)}}{x^{3}}`);
  },
  "07": (f, sh) => {
    const [a, b, c] = allRoots([1, -f.s!, f.e2!, -f.e3!]) as [C, C, C];
    const q = real(
      cadd(cadd(cmul(a, a), cmul(b, b)), cmul(c, c)),
      "07 제곱의 합",
    );
    sh.eq("a+b+c", f.s!);
    if (f.mode === 0) {
      if (f.v === 0) sh.eq("ab+bc+ca", f.e2!);
      else sh.eq("a^{2}+b^{2}+c^{2}", q);
      return;
    }
    if (f.mode === 1) {
      if (f.v === 0) sh.eq("ab+bc+ca", f.e2!);
      else sh.eq("a^{2}+b^{2}+c^{2}", q);
      sh.eq("abc", f.e3!);
      return;
    }
    sh.eq("a^{2}+b^{2}+c^{2}", q);
    if (f.v === 0) sh.eq("abc", f.e3!);
  },
  "08": (f, sh) => {
    if (f.mode === 1) {
      sh.has(`(${f.A}+\\sqrt{${f.B}})^{3}`);
      sh.has(`{${2 * f.A!}}`);
      return;
    }
    if (f.fam === 1) {
      const nums = [9];
      for (let j = 0; j <= f.k!; j += 1) nums.push(10 ** (2 ** j) + 1);
      sh.has(nums.join("\\times "));
      return;
    }
    for (let j = 0; j <= f.k!; j += 1) sh.has(`(${powB(f.b!, 2 ** j)}+1)`);
    if (f.fam === 2) sh.has(`\\dfrac{${f.b}^{n}-1}{${f.b! - 1}}`);
  },
  "09": (f, sh) => {
    const D = [f.d0!, f.d1!, 1];
    sh.poly(D);
    if (f.mode === 0) sh.poly(padd(pmul(D, [f.q0!, 1]), [f.r0!, f.r1!]));
    else if (f.mode === 1) sh.poly(padd(pmul(D, [f.b!, f.a!]), [f.d!, f.c!]));
    else sh.poly(padd(pmul(D, [f.q0!, f.q1!, f.q2!]), [f.r0!, f.r1!]));
  },
  "10": (f, sh) => {
    if (f.mode === 0) {
      const Qv = [f.q0!, f.q1!, f.q2!];
      const R = ptrim([f.r0!, f.r1!]);
      sh.poly(padd(pmul([f.a0!, f.a1!, 1], Qv), R));
      sh.poly(Qv);
      sh.poly(R);
    } else if (f.mode === 1) {
      sh.poly([-f.a!, 1]);
      sh.poly([f.n!, f.m!]);
      sh.poly([-f.b!, 1]);
      sh.has(`$${f.r}$`);
    } else {
      sh.poly(pmul([f.a!, 1], [f.w0!, f.w1!, 1]));
      sh.poly([f.a!, 1]);
    }
  },
  "11": (f, sh) => {
    sh.poly([-f.b!, f.a!]);
    const frac = `x${f.b! > 0 ? "-" : "+"}\\dfrac{${Math.abs(f.b!)}}{${f.a}}`;
    if (f.mode === 0) {
      sh.has(frac);
    } else if (f.mode === 1) {
      sh.poly(padd(pmul([-f.b!, f.a!], [f.q0!, f.q1!, f.q2!]), [f.R!]));
    } else {
      sh.has(frac);
      sh.has(`$${f.R}$`);
    }
  },
  "12": (f, sh) => {
    if (f.mode === 0) {
      sh.poly(ptrim([f.f0!, f.f1!, f.f2!, f.f3!]));
      sh.poly([-f.al!, 1]);
    } else {
      sh.poly(padd(pmul([f.b!, f.a!], [f.q0!, f.q1!, f.q2!]), [f.R!]));
      sh.poly([f.b!, f.a!]);
    }
  },
  "13": (f, sh) => {
    if (f.mode === 0) {
      sh.eq("a-b", f.p!);
      sh.eq(f.v === 0 ? "a-c" : "b-c", f.r!);
    } else if (f.mode === 1) {
      sh.eq("a+b", f.m! + Math.sqrt(f.rr!));
      sh.eq("b+c", f.m! - Math.sqrt(f.rr!));
      sh.eq("c+a", f.k!);
    } else {
      sh.eq("a+b+c", 3 * f.t!);
    }
  },
  "14": (f, sh) => {
    if (f.mode === 0) {
      sh.has(`$${2 * (f.a! * f.b! + f.b! * f.c! + f.c! * f.a!)}$`);
      sh.has(`$${4 * (f.a! + f.b! + f.c!)}$`);
    } else if (f.mode === 1) {
      sh.has(`$${Math.hypot(f.x!, f.y!)}$`);
      sh.has(`$${2 * (f.x! + f.y!)}$`);
    } else {
      sh.has(`$${f.a! ** 2 + f.b! ** 2 + f.c! ** 2}$`);
      sh.has(`$${4 * (f.a! + f.b! + f.c!)}$`);
    }
  },
};

/** 유형마다 꼴의 수 — 씨앗을 다 돌렸을 때 모든 꼴이 한 번은 검산돼야 한다. */
const MODES: Record<string, number> = {
  "01": 3,
  "02": 4,
  "03": 3,
  "04": 3,
  "05": 3,
  "06": 3,
  "07": 3,
  "08": 3,
  "09": 3,
  "10": 3,
  "11": 3,
  "12": 2,
  "13": 3,
  "14": 3,
};

function eachProblem(
  fn: (p: HighProblem, key: string, number: string) => void,
) {
  for (const entry of H1_POLY_OPS) {
    for (const seed of SEEDS) {
      for (let v = 0; v < VARIANTS; v += 1) {
        fn(generateHighProblem(entry.key, seed, v), entry.key, entry.rpmType);
      }
    }
  }
}

describe("고등 공통수학1 다항식의 연산 — 등록", () => {
  it("색인 14유형을 전부 등록했고 번호·제목·중단원이 색인 바이트와 같다", () => {
    expect(catalogRows.length, "색인 유형 수").toBe(14);
    expect(H1_POLY_OPS.length + H1_POLY_OPS_HOLD.length).toBe(
      catalogRows.length,
    );
    for (const e of H1_POLY_OPS) {
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
    for (const e of H1_POLY_OPS) {
      expect(sections.has(e.unitSection), `${e.key} — ${e.unitSection}`).toBe(
        true,
      );
    }
  });

  it("등록부에 들어 있고, 보류와 겹치지 않는다", () => {
    const keys = new Set(registeredHighTypes().map((e) => e.key));
    for (const e of H1_POLY_OPS) expect(keys.has(e.key)).toBe(true);
    const held = new Set(registeredHighHolds().map((h) => h.key));
    for (const e of H1_POLY_OPS) expect(held.has(e.key)).toBe(false);
  });
});

describe("고등 공통수학1 다항식의 연산 — 값", () => {
  it("정답을 facts 로 다시 세운 것과 같다", () => {
    eachProblem((p, key, number) => {
      const want = VERIFY[number]!(p.facts);
      checkAnswer(p, want, `${key} (${JSON.stringify(p.facts)})`);
    });
  });

  it("발문이 facts 가 말하는 수치를 그대로 보여 준다", () => {
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

describe("고등 공통수학1 다항식의 연산 — 오답", () => {
  it("생성기가 낸 오답은 정답과 **값이 다른** 식이다", () => {
    let withDistractors = 0;
    eachProblem((p, key) => {
      if (!p.distractors) return;
      withDistractors += 1;
      expect(p.distractors, key).toHaveLength(4);
      const body = /^\$(.+)\$$/.exec(p.answer.trim())![1]!;
      const ansPoly = parsePolyTex(body);
      for (const d of p.distractors) {
        const inner = /^\$(.+)\$$/.exec(d.trim())![1]!;
        if (ansPoly) {
          const dp = parsePolyTex(inner);
          expect(dp, `${key} 오답을 못 읽는다: ${d}`).not.toBeNull();
          expect(pkey(dp!), `${key} 오답이 정답과 같은 식: ${d}`).not.toBe(
            pkey(ansPoly),
          );
        } else {
          expect(qCoefOf(d), `${key} 오답이 정답과 같은 값: ${d}`).not.toBe(
            qCoefOf(p.answer),
          );
        }
      }
    });
    expect(
      withDistractors,
      "오답을 내는 꼴이 하나도 안 나오면 이 검사는 장식이다",
    ).toBeGreaterThan(50);
  });
});
