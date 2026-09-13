/**
 * 공통수학1 「여러 가지 방정식」 18유형 — **독립 검산** (물결 1 세션 `h1-equation`).
 *
 * 생성기의 답을 믿지 않는다. `facts` 로 유형마다 **다른 길**을 걸어 답을 다시 낸다:
 * 방정식의 근을 수치로 모두 구해(Durand–Kerner) 식에 직접 넣기 · 삼차식의 판별식으로 중근·허근을
 * 가르기 · 정수 격자를 전부 훑어 부정방정식·연립방정식의 해를 세기 · 이분법 · ω 를 복소수로 두고
 * 거듭제곱. 지면의 답은 `helpers/highAnswer.readAnswerValues` 로 읽는다(제품 `numbers.ts` 를 안 부른다).
 *
 * `SHOWN` 은 발문의 수식을 **괄호·붙여 쓴 곱까지 읽는 다항식 읽개**(`parsePoly`, 이 파일에 적었다)로
 * 전개해 facts 로 시험이 지은 다항식과 맞댄다 — 「발문에 딴 식을 찍는」 결함을 잡는다.
 *
 * 지면(수는 수식 안 · 냄새 · 조사) · 난이도 · 형식 · 해설 끝 답은 `highRegistry.test.ts` 가 돈다.
 */
import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import {
  generateHighProblem,
  registeredHighTypes,
} from "../../lib/high/generate";
import { H1_EQUATIONS, H1_EQUATIONS_HOLD } from "../../lib/high/h1Equations";
import type { HighProblem } from "../../lib/high/types";
import { readAnswerValues } from "../helpers/highAnswer";
import {
  highCatalog,
  mathSpans,
  padd,
  pmul,
  proots,
  pval,
  plongDivide,
} from "../helpers/highPage";

const BOOK = "공통수학1";
const MINOR = "여러 가지 방정식";
const SEEDS = [20260913, 1, 7777, 424242, 99991];
const VARIANTS = 14;

const catalogRows = highCatalog(BOOK).filter((t) => t.minor === MINOR);

type Fact = Record<string, number>;

// ───────────────────────────── 다변수 다항식 ─────────────────────────────
// 공용 후보 — `highPage.parsePolyTex` 는 `x` 한 문자, 괄호 없는 식만 읽는다. 이 중단원 발문은
// `-(a-3)x^{2}` · `(x-1)(x-3)(x+5)+63` 처럼 괄호가 든 식이 흔하다(리드가 병합 때 `highPage` 로 올릴 것).

type MP = Map<string, number>;

function monoOf(key: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of key.matchAll(/([a-z])(\d+)/g)) out[m[1]!] = Number(m[2]);
  return out;
}

function keyOf(pw: Record<string, number>): string {
  return Object.keys(pw)
    .filter((v) => pw[v] !== 0)
    .sort()
    .map((v) => `${v}${pw[v]}`)
    .join("");
}

function mClean(p: MP): MP {
  for (const [k, v] of [...p]) if (Math.abs(v) < 1e-12) p.delete(k);
  return p;
}

function mAdd(...ps: MP[]): MP {
  const out: MP = new Map();
  for (const p of ps) for (const [k, v] of p) out.set(k, (out.get(k) ?? 0) + v);
  return mClean(out);
}

function mScale(p: MP, c: number): MP {
  return mClean(
    new Map([...p].map(([k, v]) => [k, v * c] as [string, number])),
  );
}

function mMul(a: MP, b: MP): MP {
  const out: MP = new Map();
  for (const [ka, va] of a) {
    for (const [kb, vb] of b) {
      const pw = monoOf(ka);
      for (const [v, e] of Object.entries(monoOf(kb))) pw[v] = (pw[v] ?? 0) + e;
      const k = keyOf(pw);
      out.set(k, (out.get(k) ?? 0) + va * vb);
    }
  }
  return mClean(out);
}

function mPow(p: MP, n: number): MP {
  let out: MP = new Map([["", 1]]);
  for (let i = 0; i < n; i += 1) out = mMul(out, p);
  return out;
}

const K = (c: number): MP => mClean(new Map([["", c]]));

/** Σ c·(단항식) — `L([2, "x2"], [-1, "a1x1"], [3, ""])`. */
function L(...ts: [number, string][]): MP {
  return mAdd(...ts.map(([c, k]) => mClean(new Map([[k, c]]))));
}

/** (v - r) */
const lin = (r: number, v = "x"): MP => L([1, `${v}1`], [-r, ""]);
const mRoots = (rs: readonly number[]): MP =>
  rs.reduce<MP>((acc, r) => mMul(acc, lin(r)), K(1));

function mkey(p: MP): string {
  return JSON.stringify(
    [...p].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
}

/** 수식 한 변을 다변수 다항식으로 — 괄호·붙여 쓴 곱·`^{n}` 을 읽는다. 못 읽으면 `null`. */
function parsePoly(src: string): MP | null {
  const s = src.replace(/\\left|\\right/g, "").replace(/\s+/g, "");
  if (s === "" || !/^[-+0-9a-z^{}()]+$/.test(s)) return null;
  let i = 0;
  const factor = (): MP | null => {
    const ch = s[i];
    let base: MP;
    if (ch !== undefined && /[0-9]/.test(ch)) {
      const m = /^\d+/.exec(s.slice(i))!;
      i += m[0].length;
      base = K(Number(m[0]));
    } else if (ch !== undefined && /[a-z]/.test(ch)) {
      i += 1;
      base = L([1, `${ch}1`]);
    } else if (ch === "(") {
      i += 1;
      const e = expr();
      if (!e || s[i] !== ")") return null;
      i += 1;
      base = e;
    } else {
      return null;
    }
    if (s[i] === "^") {
      const m = /^\^\{(\d+)\}/.exec(s.slice(i));
      if (!m) return null;
      i += m[0].length;
      base = mPow(base, Number(m[1]));
    }
    return base;
  };
  const term = (): MP | null => {
    let acc: MP | null = null;
    while (i < s.length && /[0-9a-z(]/.test(s[i]!)) {
      const f = factor();
      if (!f) return null;
      acc = acc ? mMul(acc, f) : f;
    }
    return acc;
  };
  const expr = (): MP | null => {
    let sign = 1;
    if (s[i] === "+" || s[i] === "-") {
      sign = s[i] === "-" ? -1 : 1;
      i += 1;
    }
    const t = term();
    if (!t) return null;
    let acc = mScale(t, sign);
    while (s[i] === "+" || s[i] === "-") {
      const sg = s[i] === "-" ? -1 : 1;
      i += 1;
      const u = term();
      if (!u) return null;
      acc = mAdd(acc, mScale(u, sg));
    }
    return acc;
  };
  const out = expr();
  return out && i === s.length ? out : null;
}

/** 발문 수식의 각 변(`=`·부등호·쉼표·연립 줄바꿈으로 가른 조각)을 다항식으로 읽은 열쇠들. */
function shownSides(content: string): Set<string> {
  const out = new Set<string>();
  for (const span0 of mathSpans(content)) {
    const span = span0
      .replace(/\\begin\{cases\}|\\end\{cases\}/g, "")
      .replace(/\\\\/g, "=");
    for (const side of span.split(/=|\\le|\\ge|<|>|,/)) {
      const p = parsePoly(side);
      if (p) out.add(mkey(p));
    }
  }
  return out;
}

// ───────────────────────────── 복소수 · 근 ─────────────────────────────

type C = { re: number; im: number };
const cc = (re: number, im = 0): C => ({ re, im });
const cadd = (a: C, b: C): C => cc(a.re + b.re, a.im + b.im);
const csub = (a: C, b: C): C => cc(a.re - b.re, a.im - b.im);
const cmul = (a: C, b: C): C =>
  cc(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
function cdiv(a: C, b: C): C {
  const n = b.re * b.re + b.im * b.im;
  return cc((a.re * b.re + a.im * b.im) / n, (a.im * b.re - a.re * b.im) / n);
}
const dist = (a: C, b: C): number => Math.hypot(a.re - b.re, a.im - b.im);
const isReal = (z: C): boolean => Math.abs(z.im) < 1e-7;

function cEval(coefs: readonly number[], z: C): C {
  let v = cc(0);
  for (let i = coefs.length - 1; i >= 0; i -= 1)
    v = cadd(cmul(v, z), cc(coefs[i]!));
  return v;
}

/** 다항식(낮은 차수부터)의 근 전부 — Durand–Kerner. 생성기의 인수분해를 쓰지 않는다. */
function roots(coefs: readonly number[]): C[] {
  const n = coefs.length - 1;
  const lead = coefs[n]!;
  const a = coefs.map((c) => c / lead);
  let z: C[] = [];
  let w = cc(1);
  for (let k = 0; k < n; k += 1) {
    z.push(w);
    w = cmul(w, cc(0.4, 0.9));
  }
  for (let it = 0; it < 1000; it += 1) {
    z = z.map((zi, i) => {
      let den = cc(1);
      z.forEach((zj, j) => {
        if (j !== i) den = cmul(den, csub(zi, zj));
      });
      return csub(zi, cdiv(cEval(a, zi), den));
    });
  }
  return z;
}

/** 이차방정식의 두 근(복소수까지). */
function croots(A: number, B: number, Cc: number): [C, C] {
  const D = B * B - 4 * A * Cc;
  if (D >= 0) {
    return [
      cc((-B - Math.sqrt(D)) / (2 * A)),
      cc((-B + Math.sqrt(D)) / (2 * A)),
    ];
  }
  return [
    cc(-B / (2 * A), -Math.sqrt(-D) / (2 * A)),
    cc(-B / (2 * A), Math.sqrt(-D) / (2 * A)),
  ];
}

function realRoots(A: number, B: number, Cc: number): number[] {
  const D = B * B - 4 * A * Cc;
  if (D < 0) return [];
  return [(-B - Math.sqrt(D)) / (2 * A), (-B + Math.sqrt(D)) / (2 * A)];
}

/** 삼차식(낮은 차수부터 [d, c, b, a])의 판별식 — 0 이면 중근, 음수면 허근 둘. */
function disc3(p: readonly number[]): number {
  const [d, c, b, a] = [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0, p[3] ?? 0];
  return (
    18 * a * b * c * d -
    4 * b ** 3 * d +
    b * b * c * c -
    4 * a * c ** 3 -
    27 * a * a * d * d
  );
}

function isTriple(p: readonly number[]): boolean {
  const [d, c, b, a] = [p[0]!, p[1]!, p[2]!, p[3]!];
  const t = -b / (3 * a);
  return Math.abs(c - 3 * a * t * t) < 1e-9 && Math.abs(d + a * t ** 3) < 1e-9;
}

function bisect(g: (x: number) => number, lo0: number, hi0: number): number {
  let lo = lo0;
  let hi = hi0;
  const up = g(hi) > 0;
  for (let i = 0; i < 200; i += 1) {
    const mid = (lo + hi) / 2;
    if (g(mid) > 0 === up) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

/** 세 점 값으로 이차식 계수 [c0, c1, c2] 를 되살린다. */
function quadFrom(f: (x: number) => number): [number, number, number] {
  const f0 = f(0);
  const f1 = f(1);
  const fm = f(-1);
  return [f0, (f1 - fm) / 2, (f1 + fm) / 2 - f0];
}

const coefOf = (p: MP, key: string): number => p.get(key) ?? 0;

// ───────────────────────────── 값 검산 ─────────────────────────────

type Want = number | C;

const VERIFY: Record<string, (f: Fact) => Want> = {
  "01": (f) => {
    if (f.mode === 0) {
      const poly = proots([f.u!, f.v!, f.w!]);
      const rs: number[] = [];
      for (let x = -12; x <= 12; x += 1) if (pval(poly, x) === 0) rs.push(x);
      expect(rs, "정수근이 셋이 아니다").toHaveLength(3);
      const lo = Math.min(...rs);
      const hi = Math.max(...rs);
      return f.kind === 0 ? lo * hi : lo + hi;
    }
    if (f.mode === 1) {
      const zs = roots(pmul([-f.r!, 1], [f.q!, f.p!, 1]));
      const real = zs.filter(isReal);
      expect(real, "실근이 하나가 아니다").toHaveLength(1);
      const up = zs.find((z) => z.im > 1e-7)!;
      // x = (b ± √c i)/2 — b = 2·실수부, c = (2·허수부)²
      return real[0]!.re + 2 * up.re + (2 * up.im) ** 2;
    }
    if (f.mode === 2) {
      const zs = roots(pmul(proots([f.u!, f.v!]), [f.q!, f.p!, 1]));
      const real = zs.filter(isReal);
      expect(real, "실근이 둘이 아니다").toHaveLength(2);
      if (f.kind === 0) return real.reduce((s, z) => s + z.re, 0);
      const [al, be] = zs.filter((z) => !isReal(z)) as [C, C];
      return cadd(cmul(al, al), cmul(be, be));
    }
    const al = (f.s! + f.d!) / 2;
    const be = (f.s! - f.d!) / 2;
    expect(al * be, "αβ≠0").not.toBe(0);
    const a = al * be;
    expect(Math.abs(pval([0, a, -f.s!, 1], al))).toBeLessThan(1e-9);
    return a;
  },

  "02": (f) => {
    if (f.mode === 0) {
      const inner = [0, f.p!, 1];
      const quartic = padd(
        padd(
          pmul(inner, inner),
          inner.map((c) => c * -(f.t1! + f.t2!)),
        ),
        [f.t1! * f.t2!],
      );
      const real = roots(quartic)
        .filter(isReal)
        .map((z) => z.re);
      return f.ask === 0
        ? real.reduce((a, b) => a + b, 0)
        : real.reduce((a, b) => a * b, 1);
    }
    if (f.mode === 1) {
      const quartic = padd(pmul([f.c1!, f.p!, 1], [f.c2!, f.p!, 1]), [f.d!]);
      const zs = roots(quartic);
      if (f.kind === 0) return zs.reduce((a, z) => cmul(a, z), cc(1));
      return zs.filter(isReal).reduce((a, z) => a + z.re, 0);
    }
    const u2 = -f.p! - f.u1!;
    const v2 = -f.p! - f.v1!;
    const quartic = padd(proots([f.u1!, u2, f.v1!, v2]), [f.k!]);
    return roots(quartic)
      .filter(isReal)
      .reduce((a, z) => a + z.re, 0);
  },

  "03": (f) => {
    if (f.mode === 0) {
      const quartic = [f.t1! * f.t2!, 0, -(f.t1! + f.t2!), 0, 1];
      return roots(quartic)
        .filter(isReal)
        .reduce((a, z) => a * z.re, 1);
    }
    const quartic = [f.m! ** 2, 0, -(2 * f.m! + f.k! ** 2), 0, 1];
    const pos = roots(quartic)
      .filter((z) => isReal(z) && z.re > 0)
      .map((z) => z.re);
    expect(pos, "양수인 근이 둘이 아니다").toHaveLength(2);
    return f.mode === 1 ? pos[0]! * pos[1]! : pos[0]! + pos[1]!;
  },

  "04": (f) => {
    if (f.mode === 0) {
      const a = -(f.r! ** 3 + f.P! * f.r! ** 2 + f.K!) / f.r!;
      const { q, r } = plongDivide([f.K!, a, f.P!, 1], [-f.r!, 1]);
      expect(r, "주어진 근으로 나누어떨어지지 않는다").toEqual([0]);
      const sum = -(q[1] ?? 0);
      const prod = q[0]!;
      return [a + sum, a * prod, sum * sum - 2 * prod][f.exprId!]!;
    }
    if (f.mode === 1) {
      const [u, v, Kc] = [f.u!, f.v!, f.K!];
      const det = u * u * v - u * v * v;
      const r1 = -(u ** 3 + Kc);
      const r2 = -(v ** 3 + Kc);
      const a = (r1 * v - r2 * u) / det;
      const b = (u * u * r2 - v * v * r1) / det;
      const others: number[] = [];
      for (let x = -12; x <= 12; x += 1) {
        if (x !== u && x !== v && Math.abs(pval([Kc, b, a, 1], x)) < 1e-9) {
          others.push(x);
        }
      }
      expect(others, "나머지 정수근이 하나가 아니다").toHaveLength(1);
      return others[0]!;
    }
    const [u, v] = [f.u!, f.v!];
    const rest = (x: number): number => x ** 4 + f.c3! * x ** 3 + f.c2! * x * x;
    const a = (rest(v) - rest(u)) / (u - v);
    const b = -rest(u) - a * u;
    const zs = roots([b, a, f.c2!, f.c3!, 1]).filter(
      (z) =>
        !(
          isReal(z) &&
          (Math.abs(z.re - u) < 1e-6 || Math.abs(z.re - v) < 1e-6)
        ),
    );
    expect(zs, "다른 두 근이 둘이 아니다").toHaveLength(2);
    const [al, be] = zs as [C, C];
    return f.exprId === 0
      ? cadd(cmul(al, al), cmul(be, be))
      : cmul(cadd(al, cc(1)), cadd(be, cc(1)));
  },

  "05": (f) => {
    if (f.mode === 0) {
      let sum = 0;
      let cnt = 0;
      for (let a = -80; a <= 80; a += 1) {
        const cub = pmul([-f.r!, 1], [f.c!, f.m! * a + f.n!, 1]);
        if (disc3(cub) === 0) {
          sum += a;
          cnt += 1;
        }
      }
      expect(cnt, "중근을 주는 a 가 셋이 아니다").toBe(3);
      return sum;
    }
    if (f.mode === 1) {
      const ks: number[] = [];
      for (let k = 1; k <= 60; k += 1) {
        const D = disc3(pmul([-f.r!, 1], [k, -2 * f.h!, 1]));
        if (f.kind === 0 ? D >= 0 : D < 0) ks.push(k);
      }
      return f.kind === 0 ? ks.length : Math.min(...ks);
    }
    const ok: number[] = [];
    for (let a = -80; a <= 80; a += 1) {
      const cub = pmul([-f.r!, 1], [-a, -2 * f.p! * f.r!, f.p!]);
      const D = disc3(cub);
      if (D < 0 || (D === 0 && isTriple(cub))) ok.push(a);
    }
    return Math.max(...ok);
  },

  "06": (f) => {
    if (f.mode === 2) {
      const t = -f.P! / (1 + f.k! + f.l!);
      const e = proots([t, f.k! * t, f.l! * t]);
      expect(e[2], "x² 의 계수").toBe(f.P!);
      return e[1]! + e[0]!;
    }
    const [al, be, ga] = roots([-f.s3!, f.s2!, -f.s1!, 1]) as [C, C, C];
    const one = cc(1);
    const inv = (z: C): C => cdiv(one, z);
    const sq = (z: C): C => cmul(z, z);
    const vals =
      f.mode === 0
        ? [
            () => cadd(cadd(sq(al), sq(be)), sq(ga)),
            () => cmul(cmul(csub(one, al), csub(one, be)), csub(one, ga)),
            () => cmul(cmul(cadd(one, al), cadd(one, be)), cadd(one, ga)),
            () => cmul(cmul(cadd(al, be), cadd(be, ga)), cadd(ga, al)),
          ]
        : [
            () => cadd(cadd(inv(al), inv(be)), inv(ga)),
            () => cadd(cadd(inv(sq(al)), inv(sq(be))), inv(sq(ga))),
            () =>
              cadd(
                cadd(cdiv(cadd(be, ga), al), cdiv(cadd(ga, al), be)),
                cdiv(cadd(al, be), ga),
              ),
          ];
    return vals[f.exprId!]!();
  },

  "07": (f) => {
    if (f.mode === 2) {
      const cub = padd(proots([f.u!, f.v!, f.w!]), [f.K!]);
      return roots(cub).reduce((a, z) => cmul(a, z), cc(1));
    }
    const [al, be, ga] = roots([-f.s3!, f.s2!, -f.s1!, 1]) as [C, C, C];
    const nr =
      f.mode === 0
        ? [cadd(al, be), cadd(be, ga), cadd(ga, al)]
        : f.kind === 0
          ? [al, be, ga].map((z) => cdiv(cc(1), z))
          : [al, be, ga].map((z) => cmul(cc(f.k!), z));
    const [n1, n2, n3] = nr as [C, C, C];
    const e1 = cadd(cadd(n1, n2), n3);
    const e2 = cadd(cadd(cmul(n1, n2), cmul(n2, n3)), cmul(n3, n1));
    const e3 = cmul(cmul(n1, n2), n3);
    const [a, b, c] = [-e1.re, e2.re, -e3.re];
    return f.exprId === 0 ? a + b + c : a * b * c;
  },

  "08": (f) => {
    if (f.mode === 0) {
      const r1 = f.p! + Math.sqrt(f.r!);
      const r2 = f.p! - Math.sqrt(f.r!);
      const w = f.w!;
      const a = -(r1 + r2 + w);
      const b = r1 * r2 + w * (r1 + r2);
      return f.exprId === 0 ? a * b : a + b;
    }
    if (f.mode === 1) {
      const z = cc(f.p!, f.sg! * Math.sqrt(f.s!));
      const zs = roots(pmul([-f.w!, 1], [f.p! ** 2 + f.s!, -2 * f.p!, 1]));
      let idx = 0;
      zs.forEach((q, i) => {
        if (dist(q, z) < dist(zs[idx]!, z)) idx = i;
      });
      expect(
        dist(zs[idx]!, z),
        "주어진 근이 방정식의 근이 아니다",
      ).toBeLessThan(1e-6);
      return zs.filter((_, i) => i !== idx).reduce(cadd, cc(0));
    }
    const s = Math.sqrt(f.r!);
    const F = (x: number): number =>
      (x - f.u!) * (x - (f.p! - s)) * (x - (f.p! + s));
    return F(f.k!);
  },

  "09": (f) => {
    if (f.mode === 0) {
      return bisect((x) => x * (x + f.p!) * (x + f.q!) - f.V!, 0, 50);
    }
    if (f.mode === 1) {
      const x = bisect(
        (t) => (f.r! + t) ** 2 * (f.h! - t) - f.r! ** 2 * f.h!,
        1e-9,
        f.h! - 1e-9,
      );
      return f.r! + x;
    }
    return bisect(
      (x) => x ** 3 - f.a! * f.b! * x - f.V!,
      Math.max(f.a!, f.b!),
      100,
    );
  },

  "10": (f) => {
    if (f.mode === 0) {
      const xs = realRoots(2, -2 * f.p!, f.p! ** 2 - f.q!);
      const sols = xs.map((x) => [x, f.lt === 0 ? x - f.p! : f.p! - x]);
      const vals = sols.map(([x, y]) =>
        f.kind === 0 ? x! * y! : f.lt === 0 ? x! + y! : x! - y!,
      );
      if (f.kind === 0) {
        expect(
          Math.abs(vals[0]! - vals[1]!),
          "두 해의 ab 가 다르다",
        ).toBeLessThan(1e-9);
        return vals[0]!;
      }
      return Math.max(...vals);
    }
    if (f.mode === 1) {
      const [m, k, n, c] = [f.m!, f.k!, f.n!, f.c!];
      const ys = realRoots(m * m - k * m, k * n - 2 * m * n, n * n - c);
      expect(ys, "실수인 해가 둘이 아니다").toHaveLength(2);
      const vals = ys.map((y) => {
        const x = n - m * y;
        return [x - y, x + y, x * y][f.exprId!]!;
      });
      return f.askMax === 1 ? Math.max(...vals) : Math.min(...vals);
    }
    const sols = realRoots(2, -2 * f.p!, f.p! ** 2 - f.q!)
      .map((x) => [x, x - f.p!] as const)
      .filter(([x, y]) => x + y > 0);
    expect(sols, "a>0 인 해가 하나가 아니다").toHaveLength(1);
    const [x, y] = sols[0]!;
    return x + y + (f.n! - x) / y;
  },

  "11": (f) => {
    const E1 = (x: number, y: number): number =>
      (x - f.p! * y) * (x - f.q! * y);
    if (f.mode === 0) {
      const xy = new Set<number>();
      for (let x = -20; x <= 20; x += 1)
        for (let y = -20; y <= 20; y += 1)
          if (E1(x, y) === 0 && x * x + y * y === f.c!) xy.add(x * y);
      expect([...xy], "정수해의 xy 가 하나로 정해지지 않는다").toHaveLength(1);
      return [...xy][0]!;
    }
    if (f.mode === 1) {
      const E2 = (x: number, y: number): number =>
        (x - f.p! * y) * (x - f.r! * y);
      const got = new Set<number>();
      for (let x = -20; x <= 20; x += 1)
        for (let y = -20; y <= 20; y += 1)
          if (E1(x, y) === 0 && E2(x, y) === f.c!) got.add(x * x + y * y);
      expect([...got], "해의 a²+b² 가 하나로 정해지지 않는다").toHaveLength(1);
      return [...got][0]!;
    }
    // 원 위를 돌며 첫 식의 부호가 바뀌는 자리마다 xy — 갈래 풀이를 쓰지 않는다
    const rho = Math.sqrt(f.c!);
    const at = (t: number): number => E1(rho * Math.cos(t), rho * Math.sin(t));
    const vals: number[] = [];
    const N = 20000;
    for (let i = 0; i < N; i += 1) {
      const t0 = (2 * Math.PI * i) / N;
      const t1 = (2 * Math.PI * (i + 1)) / N;
      if (at(t0) === 0 || at(t0) * at(t1) < 0) {
        const t = at(t0) === 0 ? t0 : bisect(at, t0, t1);
        vals.push(rho * Math.cos(t) * rho * Math.sin(t));
      }
    }
    expect(vals.length, "해가 넷이 아니다").toBe(4);
    return f.askMin === 1 ? Math.min(...vals) : Math.max(...vals);
  },

  "12": (f) => {
    if (f.mode === 0) {
      const cubes: number[] = [];
      const diffs: number[] = [];
      for (let x = -12; x <= 12; x += 1)
        for (let y = -12; y <= 12; y += 1)
          if (x * x + y * y === f.S! && x * y === f.P!) {
            cubes.push(x ** 3 + y ** 3);
            diffs.push(x ** 3 - y ** 3);
          }
      expect(cubes, "해가 넷이 아니다").toHaveLength(4);
      return f.kind === 0
        ? Math.max(...cubes)
        : Math.max(...diffs) - Math.min(...diffs);
    }
    const ds: number[] = [];
    for (let x = -20; x <= 20; x += 1)
      for (let y = -20; y <= 20; y += 1)
        if (x * y + x + y === f.A! && x * x + x * y + y * y === f.B!)
          ds.push(Math.abs(x - y));
    expect(ds.length, "정수 격자에 해가 없다").toBeGreaterThan(0);
    return Math.max(...ds);
  },

  "13": (f) => {
    if (f.mode === 0) {
      const w = 1 + f.m! * f.m!;
      const as: number[] = [];
      for (let a = 1; a <= 200; a += 1) {
        if ((2 * a * f.m!) ** 2 - 4 * w * (a * a - f.r!) === 0) as.push(a);
      }
      expect(as, "해가 한 쌍인 양수 a 가 하나가 아니다").toHaveLength(1);
      return as[0]!;
    }
    if (f.mode === 1) {
      const D4 = (a: number): number => (a - f.m!) ** 2 - (a * a + f.c!);
      const f0 = D4(0);
      return -f0 / (D4(1) - f0);
    }
    const ks: number[] = [];
    for (let k = -60; k <= 60; k += 1) {
      const B = f.u! - f.v! * f.p!;
      if (B * B - 4 * f.v! * k < 0) ks.push(k);
    }
    return Math.min(...ks);
  },

  "14": (f) => {
    const common = (c1: number, b1: number, c2: number, b2: number): C[] => {
      const r1 = croots(1, b1, c1);
      const r2 = croots(1, b2, c2);
      const hit = r1.filter((z) => r2.some((w) => dist(z, w) < 1e-9));
      return hit.filter(
        (z, i) => hit.findIndex((w) => dist(z, w) < 1e-9) === i,
      );
    };
    if (f.mode === 0) {
      const hits: [number, C][] = [];
      for (let k = -30; k <= 30; k += 1) {
        if (k === f.c!) continue;
        for (const z of common(f.c!, k, k, f.c!)) hits.push([k, z]);
      }
      expect(hits, "공통인 근을 주는 k 가 하나가 아니다").toHaveLength(1);
      const [k, z] = hits[0]!;
      return [k + z.re, k * z.re, k - z.re][f.exprId!]!;
    }
    if (f.mode === 1) {
      const hits: [number, C][] = [];
      for (let m = -30; m <= 30; m += 1) {
        for (const z of common(f.q1!, m + f.p1!, f.q2!, m + f.p2!)) {
          hits.push([m, z]);
        }
      }
      expect(hits, "공통인 근을 주는 m 이 하나가 아니다").toHaveLength(1);
      return hits[0]![0] + hits[0]![1].re;
    }
    const [w, P, Q, R] = [f.w!, f.P!, f.Q!, f.R!];
    const hits: number[] = [];
    for (let k = -30; k <= 30; k += 1) {
      const S = -k * k + (P - w + R) * k + Q + R * w;
      const same = k === R;
      if (!same && common(P * k + Q, k, S, R).length === 1) hits.push(k);
    }
    expect(hits, "공통인 근이 오직 하나인 k 가 하나가 아니다").toHaveLength(1);
    return hits[0]!;
  },

  "15": (f) => {
    if (f.mode === 0) {
      const s = f.P! / 2;
      const [x1, x2] = realRoots(2, -2 * s, s * s - f.d! ** 2) as [
        number,
        number,
      ];
      return f.longSide === 1 ? Math.max(x1, x2) : Math.min(x1, x2);
    }
    if (f.mode === 1) {
      const got: number[] = [];
      for (let x = 1; x <= 9; x += 1)
        for (let y = 0; y <= 9; y += 1)
          if (
            x * x + y * y === f.S! &&
            10 * x + y + (10 * y + x) === f.T! &&
            (f.big === 1 ? x > y : x < y)
          )
            got.push(10 * x + y);
      expect(got, "조건에 맞는 두 자리 수가 하나가 아니다").toHaveLength(1);
      return got[0]!;
    }
    const got: number[] = [];
    for (let r1 = 1; r1 <= 30; r1 += 1)
      for (let r2 = r1 + 1; r2 <= 30; r2 += 1)
        if (r1 + r2 === f.s! && r1 * r1 + r2 * r2 === f.A!) got.push(r2 - r1);
    expect(got, "두 원이 하나로 정해지지 않는다").toHaveLength(1);
    return got[0]!;
  },

  "16": (f) => {
    const th = f.sg === 1 ? (2 * Math.PI) / 3 : Math.PI / 3;
    const wp = (n: number): C => cc(Math.cos(n * th), Math.sin(n * th));
    if (f.mode === 0) {
      if (f.tmpl === 0) {
        let s = cc(0);
        for (let i = 0; i < f.L!; i += 1) s = cadd(s, wp(f.N! - i));
        return s;
      }
      return cadd(wp(f.n!), wp(-f.n!));
    }
    if (f.mode === 1) {
      const lin2 = (a: number, b: number, z: C): C =>
        cadd(cmul(cc(a), z), cc(b));
      const [w, wb] = [wp(1), wp(-1)];
      return cdiv(
        cmul(lin2(f.p!, f.q!, w), lin2(f.p!, f.q!, wb)),
        cmul(lin2(f.r!, f.s!, w), lin2(f.r!, f.s!, wb)),
      );
    }
    let s = cc(0);
    for (let n = 1; n <= f.N!; n += 1) s = cadd(s, wp(f.a! * n + f.b!));
    return s;
  },

  "17": (f) => {
    const pick = (
      sols: [number, number][],
      kinds: ((s: [number, number][]) => number)[],
    ) => kinds[f.kind!]!(sols);
    const maxSum = (s: [number, number][]): number =>
      Math.max(...s.map(([x, y]) => x + y));
    const minSum = (s: [number, number][]): number =>
      Math.min(...s.map(([x, y]) => x + y));
    const maxProd = (s: [number, number][]): number =>
      Math.max(...s.map(([x, y]) => x * y));
    if (f.mode === 0) {
      const sols: [number, number][] = [];
      for (let x = 1; x <= 80; x += 1)
        for (let y = 1; y <= 80; y += 1)
          if (x * y - f.q! * x - f.p! * y + f.p! * f.q! - f.N! === 0)
            sols.push([x, y]);
      return pick(sols, [maxSum, minSum, (s) => s.length, maxProd]);
    }
    if (f.mode === 1) {
      const sols: [number, number][] = [];
      for (let x = -40; x <= 40; x += 1)
        for (let y = -60; y <= 60; y += 1)
          if (x * x - x * y + (f.c! + 1) * x - y === f.M! - f.c!)
            sols.push([x, y]);
      return pick(sols, [maxProd, maxSum, minSum]);
    }
    const n = f.n!;
    let count = 0;
    for (let x = n + 1; x <= n + n * n; x += 1)
      if ((n * x) % (x - n) === 0) count += 1;
    return count;
  },

  "18": (f) => {
    const Kc = f.al! * f.x0! + f.be! * f.y0!;
    const poly = mAdd(
      mPow(L([f.al!, "x1"], [f.be!, "y1"], [-Kc, ""]), 2),
      mScale(mPow(L([1, "y1"], [-f.y0!, ""]), 2), f.de! ** 2),
    );
    // 판별식으로 푼다 — x 에 대한 이차방정식이 실근을 가질 y 는 한 점뿐이어야 한다
    const [A, B, Cq, D, E, F] = ["x2", "x1y1", "y2", "x1", "y1", ""].map((k) =>
      coefOf(poly, k),
    ) as [number, number, number, number, number, number];
    const disc = (y: number): number =>
      (B * y + D) ** 2 - 4 * A * (Cq * y * y + E * y + F);
    const [, d1, d2] = quadFrom(disc);
    expect(d2, "판별식이 위로 볼록해야 해가 한 점이다").toBeLessThan(0);
    const y = -d1 / (2 * d2);
    expect(Math.abs(disc(y)), "판별식의 최댓값이 0 이 아니다").toBeLessThan(
      1e-6,
    );
    const x = -(B * y + D) / (2 * A);
    return [x + y, x - y, x * y][f.exprId!]!;
  },
};

// ───────────────────────────── 지면 대조 ─────────────────────────────

/** 발문이 보여 줘야 하는 것 — 다항식(`MP`) 또는 글자 그대로의 조각(`@…`). */
type Shown = MP | string;

const x2y2 = (): MP => L([1, "x2"], [1, "y2"]);

const SHOWN: Record<string, (f: Fact) => Shown[]> = {
  "01": (f) =>
    f.mode === 0
      ? [mRoots([f.u!, f.v!, f.w!])]
      : f.mode === 1
        ? [mMul(lin(f.r!), L([1, "x2"], [f.p!, "x1"], [f.q!, ""]))]
        : f.mode === 2
          ? [mMul(mRoots([f.u!, f.v!]), L([1, "x2"], [f.p!, "x1"], [f.q!, ""]))]
          : [L([1, "x3"], [-f.s!, "x2"], [1, "a1x1"]), `@=${f.d}$`],
  "02": (f) => {
    if (f.mode === 0) {
      const inner = L([1, "x2"], [f.p!, "x1"]);
      return [
        mAdd(mPow(inner, 2), mScale(inner, -(f.t1! + f.t2!)), K(f.t1! * f.t2!)),
      ];
    }
    if (f.mode === 1) {
      return [
        mAdd(
          mMul(
            L([1, "x2"], [f.p!, "x1"], [f.c1!, ""]),
            L([1, "x2"], [f.p!, "x1"], [f.c2!, ""]),
          ),
          K(f.d!),
        ),
      ];
    }
    return [
      mAdd(mRoots([f.u1!, -f.p! - f.u1!, f.v1!, -f.p! - f.v1!]), K(f.k!)),
    ];
  },
  "03": (f) =>
    f.mode === 0
      ? [L([1, "x4"], [-(f.t1! + f.t2!), "x2"], [f.t1! * f.t2!, ""])]
      : [L([1, "x4"], [-(2 * f.m! + f.k! ** 2), "x2"], [f.m! ** 2, ""])],
  "04": (f) =>
    f.mode === 0
      ? [
          L([1, "x3"], [f.P!, "x2"], [1, "a1x1"], [f.K!, ""]),
          `@한 근이 $${f.r}$`,
        ]
      : f.mode === 1
        ? [
            L([1, "x3"], [1, "a1x2"], [1, "b1x1"], [f.K!, ""]),
            `@두 근이 $${f.u}$, $${f.v}$`,
          ]
        : [
            L([1, "x4"], [f.c3!, "x3"], [f.c2!, "x2"], [1, "a1x1"], [1, "b1"]),
            `@두 근이 $${f.u}$, $${f.v}$`,
          ],
  "05": (f) =>
    f.mode === 0
      ? [
          mMul(
            lin(f.r!),
            mAdd(
              L([1, "x2"], [f.c!, ""]),
              mMul(L([f.m!, "a1"], [f.n!, ""]), L([1, "x1"])),
            ),
          ),
        ]
      : f.mode === 1
        ? [mMul(lin(f.r!), L([1, "x2"], [-2 * f.h!, "x1"], [1, "k1"]))]
        : [
            mMul(
              lin(f.r!),
              L([f.p!, "x2"], [-2 * f.p! * f.r!, "x1"], [-1, "a1"]),
            ),
          ],
  "06": (f) =>
    f.mode === 2
      ? [L([1, "x3"], [f.P!, "x2"], [1, "a1x1"], [1, "b1"]), `@1:${f.k}:${f.l}`]
      : [L([1, "x3"], [-f.s1!, "x2"], [f.s2!, "x1"], [-f.s3!, ""])],
  "07": (f) =>
    f.mode === 2
      ? [`@f(${f.u})=f(${f.v})=f(${f.w})=${f.K}`]
      : [L([1, "x3"], [-f.s1!, "x2"], [f.s2!, "x1"], [-f.s3!, ""])],
  "08": (f) =>
    f.mode === 0
      ? [
          L(
            [1, "x3"],
            [1, "a1x2"],
            [1, "b1x1"],
            [-f.w! * (f.p! ** 2 - f.r!), ""],
          ),
          `@\\sqrt{${f.r}}`,
        ]
      : f.mode === 1
        ? [
            L(
              [1, "x3"],
              [1, "a1x2"],
              [1, "b1x1"],
              [-f.w! * (f.p! ** 2 + f.s!), ""],
            ),
          ]
        : [`@두 근이 $${f.u}$`, `@\\sqrt{${f.r}}`, `@f(${f.k})`],
  "09": (f) =>
    f.mode === 0
      ? [L([1, "x1"], [f.p!, ""]), L([1, "x1"], [f.q!, ""]), K(f.V!)]
      : f.mode === 1
        ? [K(f.r!), K(f.h!)]
        : [K(f.a!), K(f.b!), K(f.V!)],
  "10": (f) =>
    f.mode === 0
      ? [L([1, "x1"], [f.lt === 0 ? -1 : 1, "y1"]), K(f.p!), x2y2(), K(f.q!)]
      : f.mode === 1
        ? [
            L([1, "x1"], [f.m!, "y1"]),
            K(f.n!),
            L([1, "x2"], [f.k!, "x1y1"]),
            K(f.c!),
          ]
        : [
            L([1, "x1"], [-1, "y1"]),
            K(f.p!),
            x2y2(),
            K(f.q!),
            L([1, "x1"], [1, "b1y1"]),
          ],
  "11": (f) => {
    const E1 = mMul(L([1, "x1"], [-f.p!, "y1"]), L([1, "x1"], [-f.q!, "y1"]));
    if (f.mode === 1) {
      return [
        E1,
        mMul(L([1, "x1"], [-f.p!, "y1"]), L([1, "x1"], [-f.r!, "y1"])),
        K(f.c!),
      ];
    }
    return [E1, x2y2(), K(f.c!)];
  },
  "12": (f) =>
    f.mode === 0
      ? [x2y2(), K(f.S!), L([1, "x1y1"]), K(f.P!)]
      : [
          L([1, "x1y1"], [1, "x1"], [1, "y1"]),
          K(f.A!),
          L([1, "x2"], [1, "x1y1"], [1, "y2"]),
          K(f.B!),
        ],
  "13": (f) =>
    f.mode === 0
      ? [L([f.m!, "x1"], [-1, "y1"]), x2y2(), K(f.r!)]
      : f.mode === 1
        ? [
            L([1, "x1"], [1, "y1"]),
            L([2, "a1"], [-2 * f.m!, ""]),
            L([1, "x1y1"]),
            L([1, "a2"], [f.c!, ""]),
          ]
        : [
            L([f.p!, "x1"], [-1, "y1"]),
            L([1, "x2"], [f.u!, "x1"], [-f.v!, "y1"]),
          ],
  "14": (f) =>
    f.mode === 0
      ? [
          L([1, "x2"], [1, "k1x1"], [f.c!, ""]),
          L([1, "x2"], [f.c!, "x1"], [1, "k1"]),
        ]
      : f.mode === 1
        ? [
            L([1, "x2"], [1, "m1x1"], [f.p1!, "x1"], [f.q1!, ""]),
            L([1, "x2"], [1, "m1x1"], [f.p2!, "x1"], [f.q2!, ""]),
          ]
        : [
            L([1, "x2"], [1, "k1x1"], [f.P!, "k1"], [f.Q!, ""]),
            L(
              [1, "x2"],
              [f.R!, "x1"],
              [-1, "k2"],
              [f.P! - f.w! + f.R!, "k1"],
              [f.Q! + f.R! * f.w!, ""],
            ),
          ],
  "15": (f) =>
    f.mode === 0
      ? [K(f.P!), K(f.d!)]
      : f.mode === 1
        ? [K(f.S!), K(f.T!)]
        : [`@$${2 * f.s!}\\pi$`, `@$${f.A}\\pi$`],
  "16": (f) => {
    const head = `@x^{3}=${f.sg}$`;
    if (f.mode === 0) {
      return [head, f.tmpl === 0 ? `@\\omega^{${f.N}}` : `@\\omega^{${f.n}}`];
    }
    if (f.mode === 1) {
      const fmt = (a: number, b: number, w: string): string =>
        `${a === 1 ? "" : a === -1 ? "-" : a}${w}${b > 0 ? `+${b}` : b}`;
      return [
        head,
        `@(${fmt(f.p!, f.q!, "\\omega")})(${fmt(f.p!, f.q!, "\\overline{\\omega}")})`,
        `@(${fmt(f.r!, f.s!, "\\omega")})(${fmt(f.r!, f.s!, "\\overline{\\omega}")})`,
      ];
    }
    return [head, `@f(${f.N})`];
  },
  "17": (f) =>
    f.mode === 0
      ? [L([1, "x1y1"], [-f.q!, "x1"], [-f.p!, "y1"], [f.p! * f.q! - f.N!, ""])]
      : f.mode === 1
        ? [
            L([1, "x2"], [-1, "x1y1"], [f.c! + 1, "x1"], [-1, "y1"]),
            K(f.M! - f.c!),
          ]
        : [`@=\\dfrac{1}{${f.n}}$`],
  "18": (f) => {
    const Kc = f.al! * f.x0! + f.be! * f.y0!;
    return [
      mAdd(
        mPow(L([f.al!, "x1"], [f.be!, "y1"], [-Kc, ""]), 2),
        mScale(mPow(L([1, "y1"], [-f.y0!, ""]), 2), f.de! ** 2),
      ),
    ];
  },
};

function eachProblem(
  fn: (p: HighProblem, key: string, number: string) => void,
) {
  for (const entry of H1_EQUATIONS) {
    for (const seed of SEEDS) {
      for (let v = 0; v < VARIANTS; v += 1) {
        fn(generateHighProblem(entry.key, seed, v), entry.key, entry.rpmType);
      }
    }
  }
}

function asC(w: Want): C {
  return typeof w === "number" ? cc(w) : w;
}

describe("고등 공통수학1 여러 가지 방정식 — 등록", () => {
  it("색인 18유형을 전부 등록했고 번호·제목·중단원이 색인 바이트와 같다", () => {
    expect(catalogRows.length, "색인 유형 수").toBe(18);
    expect(H1_EQUATIONS.length + H1_EQUATIONS_HOLD.length).toBe(
      catalogRows.length,
    );
    expect(H1_EQUATIONS_HOLD, "보류 없이 전부 등록했다").toEqual([]);
    for (const e of H1_EQUATIONS) {
      const row = catalogRows.find((t) => t.number === e.rpmType);
      expect(row, `${e.key}: 색인에 없는 번호`).toBeDefined();
      expect(e.rpmTitle, `${e.key} 제목`).toBe(row!.title);
      expect(e.rpmMinor).toBe(MINOR);
      expect(e.rpmBook).toBe(BOOK);
      expect(e.key).toBe(`${BOOK}|${MINOR}|${e.rpmType}`);
    }
  });

  it("유형의 단원은 교육과정 시드에 실제로 있는 이름이고, 등록부에 들어 있다", () => {
    const sections = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === BOOK).map((u) => u.section),
    );
    const keys = new Set(registeredHighTypes().map((e) => e.key));
    for (const e of H1_EQUATIONS) {
      expect(sections.has(e.unitSection), `${e.key} — ${e.unitSection}`).toBe(
        true,
      );
      expect(keys.has(e.key)).toBe(true);
    }
  });
});

describe("고등 공통수학1 여러 가지 방정식 — 값", () => {
  it("정답을 facts 로 다른 길을 걸어 다시 낸 것과 같다", () => {
    const modes = new Map<string, Set<number>>();
    eachProblem((p, key, number) => {
      const want = asC(VERIFY[number]!(p.facts));
      const got = readAnswerValues(p.answer);
      expect(got, `${key} 정답은 값 하나`).toHaveLength(1);
      const err =
        Math.abs(got[0]!.re - want.re) + Math.abs(got[0]!.im - want.im);
      expect(
        err,
        `${key} ${p.answer} ≠ ${want.re}${want.im ? `+${want.im}i` : ""} (${JSON.stringify(p.facts)})`,
      ).toBeLessThan(1e-6 * Math.max(1, Math.abs(want.re) + Math.abs(want.im)));
      if (!modes.has(key)) modes.set(key, new Set());
      modes.get(key)!.add(p.facts.mode!);
    });
    for (const [key, seen] of modes) {
      expect(seen.size, `${key}: 검산이 밟은 꼴`).toBeGreaterThanOrEqual(2);
    }
  });

  // 변이 「17 대표 — 음의 약수 짝을 버림」이 처음엔 초록이었다(2026-09-13). 산출물은 바뀌었는데
  // 값 검산이 못 봤다 — 곱이 음수인 판이 통째로 사라질 뿐 남은 판의 답은 대부분 맞기 때문이다.
  // 그래서 ⑴ 해설이 말하는 해의 목록을 격자 전수와 맞대고 ⑵ 음의 인수에서 나오는 해를 표본이
  // 실제로 밟는지 센다(밟지 않으면 그 풀이 갈래는 검산 밖이다).
  it("부정방정식(17)의 해설이 말하는 순서쌍은 격자 전수와 같고, 음의 약수 짝에서 나오는 해도 표본에 있다", () => {
    let negFactor = 0;
    let checked = 0;
    for (const seed of SEEDS) {
      for (let v = 0; v < VARIANTS; v += 1) {
        const p = generateHighProblem(`${BOOK}|${MINOR}|17`, seed, v);
        const f = p.facts;
        if (f.mode === 2) continue;
        const brute: [number, number][] = [];
        if (f.mode === 0) {
          for (let x = 1; x <= 80; x += 1)
            for (let y = 1; y <= 80; y += 1)
              if (x * y - f.q! * x - f.p! * y + f.p! * f.q! - f.N! === 0)
                brute.push([x, y]);
          if (brute.some(([x, y]) => x - f.p! < 0 || y - f.q! < 0))
            negFactor += 1;
        } else {
          for (let x = -40; x <= 40; x += 1)
            for (let y = -60; y <= 60; y += 1)
              if (x * x - x * y + (f.c! + 1) * x - y === f.M! - f.c!)
                brute.push([x, y]);
        }
        const line = p.solution
          .split("\n")
          .find((l) => l.startsWith("즉 순서쌍 $(x, y)$"));
        expect(
          line,
          `17 해설에 순서쌍 목록이 없다: ${p.solution}`,
        ).toBeDefined();
        const listed = [...line!.matchAll(/\$\((-?\d+), (-?\d+)\)\$/g)]
          .map((m) => `${m[1]},${m[2]}`)
          .sort();
        expect(listed, `17 해설의 해 목록 (${JSON.stringify(f)})`).toEqual(
          brute.map(([x, y]) => `${x},${y}`).sort(),
        );
        checked += 1;
      }
    }
    expect(
      checked,
      "해 목록 대조가 하나도 안 돌면 이 검사는 장식이다",
    ).toBeGreaterThan(20);
    expect(
      negFactor,
      "음의 약수 짝에서 나오는 자연수 해가 표본에 한 번도 없다",
    ).toBeGreaterThan(0);
  });

  it("생성기가 낸 오답은 정답과 값이 다르다 — 모양만 다르고 같은 값인 보기가 없다", () => {
    let checked = 0;
    eachProblem((p, key) => {
      if (!p.distractors) return;
      const ans = readAnswerValues(p.answer)[0]!;
      for (const d of p.distractors) {
        const v = readAnswerValues(d)[0]!;
        expect(
          Math.abs(v.re - ans.re) + Math.abs(v.im - ans.im),
          `${key}: 오답 ${d} 가 정답 ${p.answer} 과 같은 값이다`,
        ).toBeGreaterThan(1e-9);
        checked += 1;
      }
    });
    expect(
      checked,
      "오답을 내는 꼴이 하나도 안 돌면 이 검사는 장식이다",
    ).toBeGreaterThan(40);
  });

  it("발문이 facts 가 말하는 식과 수치를 그대로 보여 준다", () => {
    let checked = 0;
    eachProblem((p, key, number) => {
      const shown = shownSides(p.content);
      for (const want of SHOWN[number]!(p.facts)) {
        if (typeof want === "string") {
          expect(
            p.content.includes(want.slice(1)),
            `${key}: 발문에 «${want.slice(1)}» 가 없다 — ${p.content}`,
          ).toBe(true);
        } else {
          expect(
            shown.has(mkey(want)),
            `${key}: 발문에 ${mkey(want)} 가 없다 — ${p.content}`,
          ).toBe(true);
        }
        checked += 1;
      }
    });
    expect(
      checked,
      "지면 대조가 하나도 안 돌면 이 검사는 장식이다",
    ).toBeGreaterThan(1500);
  });
});
