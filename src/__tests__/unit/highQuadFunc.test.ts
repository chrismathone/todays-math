/**
 * 공통수학1 「이차방정식과 이차함수」 11유형 — **독립 검산** (물결 1 세션 `h1-equation`).
 *
 * 생성기의 답을 믿지 않는다. `facts`(발문의 원 수치)로 유형마다 **다른 길**을 걸어 답을 다시 낸다 —
 * 근의 공식으로 실제 근을 구해 대입 · 판별식을 정수 전수로 훑기 · 세 점 보간으로 이차식 복원 ·
 * 원 위를 촘촘히 돌며 최대·최소 · 판매량을 하나씩 늘려 가며 최대. 지면의 답은
 * `helpers/highAnswer.readAnswerValues` 로 읽는다(제품 `numbers.ts` 를 안 부른다).
 *
 * `VERIFY` 는 `facts` 만 본다 — 발문에 딴 수를 찍는 결함은 못 본다. 그 축은 `SHOWN` 이 맡는다:
 * 발문 수식의 각 변을 **다변수 다항식**으로 읽어(`parseMulti` — 이 파일에 따로 적었다) facts 로
 * 시험이 지은 다항식과 맞댄다.
 *
 * 지면(수는 수식 안 · 냄새 · 조사) · 난이도 · 형식 · 해설 끝 답은 `highRegistry.test.ts` 가 돈다.
 */
import { describe, expect, it } from "vitest";
import { expectedHighTitle } from "../helpers/highTitles";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import {
  generateHighProblem,
  registeredHighTypes,
} from "../../lib/high/generate";
import { H1_QUAD_FUNC, H1_QUAD_FUNC_HOLD } from "../../lib/high/h1QuadFunc";
import type { HighProblem } from "../../lib/high/types";
import { readAnswerValues } from "../helpers/highAnswer";
import { highCatalog, mathSpans } from "../helpers/highPage";

const BOOK = "공통수학1";
const MINOR = "이차방정식과 이차함수";
const SEEDS = [20260913, 1, 7777, 424242, 99991];
const VARIANTS = 14;

const catalogRows = highCatalog(BOOK).filter((t) => t.minor === MINOR);

type Fact = Record<string, number>;

// ───────────────────────────── 지면 읽기 ─────────────────────────────
// 공용 후보 — `highPage.parsePolyTex` 는 `x` 한 문자만 읽는다. 이 중단원 발문은 `k`·`a`·`b`·`t` 가
// 섞인 식이 대부분이라 다변수 읽개를 따로 적었다(`highEquations.test.ts` 에도 같은 것이 있다 — 리드가
// 병합 때 `highPage` 로 올릴 것).

/** 한 변을 다변수 다항식으로 — `x^{2}-2kx+k^{2}+3` → {x2:1, k1x1:-2, k2:1, "":3}. 못 읽으면 `null`. */
function parseMulti(side: string): Map<string, number> | null {
  const s = side.replace(/\s+/g, "");
  if (s === "" || !/^[-+0-9a-z^{}]+$/.test(s)) return null;
  const terms = s.match(/[+-]?[^+-]+/g);
  if (!terms) return null;
  const out = new Map<string, number>();
  for (const t of terms) {
    const m = /^([+-]?)(\d*)((?:[a-z](?:\^\{\d+\})?)*)$/.exec(t);
    if (!m || (m[2] === "" && m[3] === "")) return null;
    const coef = (m[1] === "-" ? -1 : 1) * (m[2] === "" ? 1 : Number(m[2]));
    const pw: Record<string, number> = {};
    for (const f of m[3]!.matchAll(/([a-z])(?:\^\{(\d+)\})?/g)) {
      pw[f[1]!] = (pw[f[1]!] ?? 0) + (f[2] ? Number(f[2]) : 1);
    }
    const key = Object.keys(pw)
      .sort()
      .map((v) => `${v}${pw[v]}`)
      .join("");
    out.set(key, (out.get(key) ?? 0) + coef);
  }
  for (const [k, v] of [...out]) if (v === 0) out.delete(k);
  return out;
}

function mkey(m: Map<string, number>): string {
  return JSON.stringify(
    [...m].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
}

/** 시험이 facts 로 짓는 다항식 — `M([2, "x2"], [1, "a1x1"], [-3, ""])`. */
function M(...terms: [number, string][]): string {
  const out = new Map<string, number>();
  for (const [c, k] of terms) out.set(k, (out.get(k) ?? 0) + c);
  for (const [k, v] of [...out]) if (v === 0) out.delete(k);
  return mkey(out);
}

/** 발문 수식의 각 변(`=`·부등호로 가른 조각)과 괄호 안 조각을 다항식으로 읽은 열쇠들. */
function shownMulti(content: string): Set<string> {
  const out = new Set<string>();
  for (const span of mathSpans(content)) {
    const pieces = [
      ...span.split(/=|\\le|\\ge|<|>/),
      ...[...span.matchAll(/\(([^()]*)\)/g)].map((m) => m[1]!),
    ];
    for (const piece of pieces) {
      const p = parseMulti(piece);
      if (p) out.add(mkey(p));
    }
  }
  return out;
}

// ───────────────────────────── 셈 ─────────────────────────────

/** 실근 둘(작은 것 먼저) — 근의 공식. 허근이면 던진다. */
function realRoots(A: number, B: number, C: number): [number, number] {
  const D = B * B - 4 * A * C;
  if (D < 0) throw new Error(`실근이 없다: ${A}x²+${B}x+${C}`);
  const r1 = (-B - Math.sqrt(D)) / (2 * A);
  const r2 = (-B + Math.sqrt(D)) / (2 * A);
  return r1 < r2 ? [r1, r2] : [r2, r1];
}

/** 세 점 값으로 이차식 계수 [c0, c1, c2] 를 되살린다(f(0), f(1), f(-1)). */
function quadFrom(f: (x: number) => number): [number, number, number] {
  const f0 = f(0);
  const f1 = f(1);
  const fm = f(-1);
  return [f0, (f1 - fm) / 2, (f1 + fm) / 2 - f0];
}

/** 이차식 f 의 [lo, hi] 최댓값·최솟값 — 계수를 되살려 꼭짓점과 끝점만 본다. */
function extremesOf(
  f: (x: number) => number,
  lo: number,
  hi: number,
): [number, number] {
  const [, c1, c2] = quadFrom(f);
  const xs = [lo, hi];
  if (c2 !== 0) {
    const v = -c1 / (2 * c2);
    if (v > lo && v < hi) xs.push(v);
  }
  const ys = xs.map(f);
  return [Math.max(...ys), Math.min(...ys)];
}

// ───────────────────────────── 값 검산 ─────────────────────────────

const VERIFY: Record<string, (f: Fact) => number> = {
  "01": (f) => {
    if (f.mode === 0) {
      for (const x of [f.p!, f.r!]) {
        expect(f.k! * x * x + f.a! * x + f.b!, "교점이 그래프 위에 없다").toBe(
          0,
        );
      }
      return [f.a! + f.b!, f.a! * f.b!, f.a! - f.b!][f.exprId!]!;
    }
    if (f.mode === 1) {
      const [al, be] = realRoots(f.k!, f.B!, f.C!);
      expect(al).not.toBe(be);
      return [al ** 2 + be ** 2, al ** 3 + be ** 3, (al - be) ** 2][f.exprId!]!;
    }
    const [al, be] = realRoots(1, f.b!, f.a!);
    expect(be - al, "두 교점 사이의 거리가 발문과 다르다").toBeCloseTo(f.d!, 9);
    return (f.b! * f.b! - f.d! * f.d!) / 4;
  },

  "02": (f) => {
    if (f.mode === 0) {
      for (const x of [f.p!, f.r!]) {
        expect(f.k! * x * x + f.a! * x, "교점에서 두 식의 값이 다르다").toBe(
          f.m! * x + f.b!,
        );
      }
      return [f.a! * f.b!, f.a! + f.b!, f.a! - f.b!][f.exprId!]!;
    }
    if (f.mode === 1) {
      const k = f.L! * f.t! ** 2 + f.p! * f.t! + f.c! - f.m! * f.t!;
      expect(k, "직선의 상수").toBe(f.k!);
      const roots = realRoots(f.L!, f.p! - f.m!, f.c! - k);
      const other = roots.find((x) => Math.abs(x - f.t!) > 1e-9)!;
      return f.m! * other + k;
    }
    const x1 = f.p! + Math.sqrt(f.r!);
    const x2 = f.p! - Math.sqrt(f.r!);
    const g = (x: number): number => x * x + f.u! * x + f.c0!;
    const a = (g(x1) - g(x2)) / (x1 - x2);
    const b = g(x1) - a * x1;
    expect(a).toBeCloseTo(f.a!, 9);
    expect(b).toBeCloseTo(f.b!, 9);
    return [a + b, a * b, a - b][f.exprId!]!;
  },

  "03": (f) => {
    if (f.mode === 0) {
      const ks: number[] = [];
      for (let k = -60; k <= 60; k += 1) {
        const D = (2 * k) ** 2 - 4 * (k * k + f.c! * k + f.d!);
        if (f.cond === 0 ? D > 0 : D < 0) ks.push(k);
      }
      expect(ks.length, "조건을 만족시키는 k 가 없다").toBeGreaterThan(0);
      return ks.includes(60) ? Math.min(...ks) : Math.max(...ks);
    }
    if (f.mode === 1) {
      let n = 0;
      for (let a = 1; a <= 20; a += 1)
        for (let b = 1; b <= 20; b += 1)
          if ((2 * a) ** 2 - 4 * (f.N! - f.w! * b * b) < 0) n += 1;
      return n;
    }
    const got: number[] = [];
    for (let k = -30; k <= 30; k += 1) {
      const C = (f.k1! + f.k2!) * k - f.k1! * f.k2!;
      const D1 = (2 * k) ** 2 - 4 * C;
      const D2 = (2 * f.h!) ** 2 + 4 * (k + f.e!);
      if (D1 === 0 && (f.cond2 === 0 ? D2 < 0 : D2 > 0)) got.push(k);
    }
    expect(got, "두 조건을 함께 만족시키는 k 가 하나가 아니다").toHaveLength(1);
    return got[0]!;
  },

  "04": (f) => {
    if (f.mode === 0) {
      let n = 0;
      for (let a = 1; a <= 200; a += 1)
        if ((f.q! - f.m!) ** 2 - 4 * f.p! * a > 0) n += 1;
      return n;
    }
    if (f.mode === 1) return Math.sqrt(-4 * f.p! * f.e!);
    const D4 = (a: number): number => (a - f.m!) ** 2 - (a * a + f.g! - f.c!);
    const f0 = D4(0);
    const f1 = D4(1);
    return -f0 / (f1 - f0);
  },

  "05": (f) => {
    if (f.mode === 0) {
      expect(
        (f.p! - f.m!) ** 2 - 4 * f.k! * (f.c! - f.b!),
        "접하지 않는다",
      ).toBe(0);
      return [f.m! + f.b!, f.m! * f.b!, f.m! - f.b!][f.exprId!]!;
    }
    if (f.mode === 1) {
      const D = (s: number): number =>
        (f.p! - s) ** 2 - 4 * f.k! * (f.c! + s * f.x0! - f.y0!);
      const [c0, c1, c2] = quadFrom(D);
      expect(c1 * c1 - 4 * c2 * c0, "접선이 둘이 아니다").toBeGreaterThan(0);
      return f.kind === 0 ? c0 / c2 : -c1 / c2;
    }
    for (const a of [-3, 0, 2, 5]) {
      const B = -(2 * a + f.p!);
      const C = a * a + 2 * f.j! * a + f.c! - f.q!;
      expect(B * B - 4 * C, `a=${a} 에서 접하지 않는다`).toBe(0);
    }
    return [f.p! + f.q!, f.p! * f.q!, f.p! - f.q!][f.exprId!]!;
  },

  "06": (f) => {
    if (f.mode === 0) {
      const g = (x: number): number =>
        f.a! * x * x - 2 * f.a! * f.h! * x + f.a! * f.h! ** 2 + f.k!;
      const [Mx, mn] = extremesOf(g, f.lo!, f.hi!);
      return Mx + mn;
    }
    if (f.mode === 1) {
      const k = (f.t! - f.a! * f.s! ** 2 - f.c0!) / f.s!;
      const g = (x: number): number => f.a! * x * x + k * x + f.c0!;
      const [Mx, mn] = extremesOf(g, f.lo!, f.hi!);
      return f.kind === 0 ? Mx * mn : Mx + mn;
    }
    const minOf = (a: number): number => {
      const b = -2 * f.p! * a;
      const c = f.qa! * a + f.r!;
      return c - (b * b) / 4;
    };
    const [Mx, mn] = extremesOf(minOf, f.lo!, f.hi!);
    return f.kind === 0 ? Mx - mn : Mx + mn;
  },

  "07": (f) => {
    if (f.mode === 0) {
      const g = (x: number): number => f.a! * x * x - 2 * f.a! * f.h! * x;
      const [gM, gm] = extremesOf(g, f.lo!, f.hi!);
      return f.kind === 0 ? gm + (f.V! - gM) : gM + (f.V! - gm);
    }
    if (f.mode === 1) {
      const g = (x: number): number =>
        f.a! * x * x - 2 * f.h! * f.a! * x + f.b!;
      const [gM, gm] = extremesOf(g, f.lo!, f.hi!);
      expect([gM, gm], "주어진 최댓값·최솟값과 다르다").toEqual([f.M!, f.m!]);
      return [f.a! + f.b!, f.a! - f.b!, f.a! * f.b!][f.exprId!]!;
    }
    if (f.variant === 0) {
      const cands = [Math.sqrt(f.V!), -Math.sqrt(f.V!)].filter(
        (k) => k >= f.c!,
      );
      const other = (f.V! + f.c! ** 2) / (2 * f.c!);
      if (other < f.c!) cands.push(other);
      expect(cands, "조건을 만족시키는 k 가 하나가 아니다").toHaveLength(1);
      return cands[0]!;
    }
    const cands = realRoots(1, -2 * f.p!, f.q! - f.V!).filter((a) => {
      if (a <= 0) return false;
      const [, mn] = extremesOf((x) => x * x - 2 * f.p! * x + f.q!, 0, a);
      return Math.abs(mn - f.V!) < 1e-9;
    });
    expect(cands, "조건을 만족시키는 a 가 하나가 아니다").toHaveLength(1);
    return cands[0]!;
  },

  "08": (f) => {
    if (f.mode === 0) {
      const t = (x: number): number => x * x + 2 * f.h! * x;
      const y = (x: number): number => t(x) ** 2 + 2 * f.B! * t(x) + f.c!;
      const xs = [f.lo!, f.hi!, -f.h!];
      const disc = f.h! ** 2 - f.B!;
      if (disc >= 0) xs.push(-f.h! + Math.sqrt(disc), -f.h! - Math.sqrt(disc));
      const ys = xs.filter((x) => x >= f.lo! && x <= f.hi!).map(y);
      return f.kind === 0 ? Math.max(...ys) : Math.min(...ys);
    }
    const t0 = f.qq! - f.p! ** 2 / 4;
    const s = -f.C! / (2 * f.A!);
    if (f.mode === 1) {
      const tStar = s >= t0 ? s : t0;
      return f.V! - (f.A! * tStar ** 2 + f.C! * tStar);
    }
    expect(s, "꼭짓점이 치환 범위 안이면 x 가 둘이다").toBeLessThan(t0);
    const b = f.A! * t0 ** 2 + f.C! * (t0 + f.d!) + f.r!;
    return -f.p! / 2 + b;
  },

  "09": (f) => {
    const A = f.al!;
    const Bx = -2 * f.al! * f.m!;
    const Cy = f.be!;
    const Dy = -2 * f.be! * f.n!;
    const E0 = f.al! * f.m! ** 2 + f.be! * f.n! ** 2 + f.k!;
    expect(Math.sign(A), "두 제곱의 부호가 다르면 최대·최소가 없다").toBe(
      Math.sign(Cy),
    );
    const ext = E0 - (Bx * Bx) / (4 * A) - (Dy * Dy) / (4 * Cy);
    if (f.mode === 0) return ext;
    return -Bx / (2 * A) + -Dy / (2 * Cy) + ext;
  },

  "10": (f) => {
    if (f.mode === 0) {
      const E = (x: number): number => {
        const y = f.v! - f.u! * x;
        return f.kindE === 0 ? x * x + f.w! * y * y : x * y;
      };
      const [Mx, mn] = extremesOf(E, f.lo!, f.hi!);
      return f.ask === 0 ? Mx + mn : Mx - mn;
    }
    if (f.mode === 1) {
      const E = (a: number): number => {
        const [al, be] =
          a === 0 ? [0, 0] : realRoots(1, -2 * f.s! * a, -f.w! * a * a);
        return (al + f.c!) * (be + f.c!);
      };
      const [Mx, mn] = extremesOf(E, f.lo!, f.hi!);
      return f.kind === 0 ? mn : Mx;
    }
    const rho = Math.sqrt(f.R!);
    let Mx = -Infinity;
    let mn = Infinity;
    const N = 20000;
    for (let i = 0; i <= N; i += 1) {
      const th = (2 * Math.PI * i) / N;
      const x = rho * Math.cos(th);
      const y = rho * Math.sin(th);
      const E = f.al! * x * x + f.be! * y * y + f.u! * x;
      Mx = Math.max(Mx, E);
      mn = Math.min(mn, E);
    }
    Mx = Math.round(Mx);
    mn = Math.round(mn);
    return f.ask === 0 ? Mx + mn : Mx - mn;
  },

  "11": (f) => {
    if (f.mode === 0) {
      const t = f.a! / 10;
      return -5 * t * t + f.a! * t + f.b!;
    }
    if (f.mode === 1) {
      let best = -1;
      let price = 0;
      for (let x = 0; f.N! - f.d! * x > 0; x += 1) {
        const rev = (f.P! + f.D! * x) * (f.N! - f.d! * x);
        expect(rev, "판매 금액 최댓값이 하나로 안 정해진다").not.toBe(best);
        if (rev > best) {
          best = rev;
          price = f.P! + f.D! * x;
        }
      }
      return price;
    }
    if (f.mode === 2) {
      let best = -1;
      let who = 0;
      for (let x = 1; x <= f.Cap!; x += 1) {
        const fee = x <= f.K! ? f.P! : f.P! - f.D! * (x - f.K!);
        expect(fee, "참가비가 0 이하로 내려간다").toBeGreaterThan(0);
        if (fee * x > best) {
          best = fee * x;
          who = x;
        }
      }
      return who;
    }
    let best = -Infinity;
    const N = 20000;
    for (let i = 1; i < N; i += 1) {
      const a = (Math.sqrt(f.k!) * i) / N;
      best = Math.max(best, 2 * (2 * a + (f.k! - a * a)));
    }
    return Math.round(best);
  },
};

// ───────────────────────────── 지면 대조 ─────────────────────────────

/** 발문이 보여 줘야 하는 것 — 다항식 열쇠(`M(...)`) 또는 글자 그대로의 조각(`@` 로 시작). */
const SHOWN: Record<string, (f: Fact) => string[]> = {
  "01": (f) =>
    f.mode === 0
      ? [
          M([f.k!, "x2"], [1, "a1x1"], [1, "b1"]),
          `@(${f.p}, 0)`,
          `@(${f.r}, 0)`,
        ]
      : f.mode === 1
        ? [M([f.k!, "x2"], [f.B!, "x1"], [f.C!, ""])]
        : [M([1, "x2"], [f.b!, "x1"], [1, "a1"]), `@=${f.d}$`],
  "02": (f) =>
    f.mode === 0
      ? [M([f.k!, "x2"], [1, "a1x1"]), M([f.m!, "x1"], [1, "b1"])]
      : f.mode === 1
        ? [
            M([f.L!, "x2"], [f.p!, "x1"], [f.c!, ""]),
            M([f.m!, "x1"], [1, "k1"]),
          ]
        : [M([1, "x2"], [f.u!, "x1"], [f.c0!, ""]), `@\\sqrt{${f.r}}`],
  "03": (f) =>
    f.mode === 0
      ? [M([1, "x2"], [-2, "k1x1"], [1, "k2"], [f.c!, "k1"], [f.d!, ""])]
      : f.mode === 1
        ? [M([1, "x2"], [2, "a1x1"], [-f.w!, "b2"], [f.N!, ""])]
        : [
            M(
              [1, "x2"],
              [-2, "k1x1"],
              [f.k1! + f.k2!, "k1"],
              [-f.k1! * f.k2!, ""],
            ),
            M([-1, "x2"], [2 * f.h!, "x1"], [1, "k1"], [f.e!, ""]),
          ],
  "04": (f) =>
    f.mode === 0
      ? [M([f.p!, "x2"], [f.q!, "x1"]), M([f.m!, "x1"], [-1, "a1"])]
      : f.mode === 1
        ? [M([f.p!, "x2"]), M([1, "k1x1"], [f.e!, ""])]
        : [
            M([1, "x2"], [2, "a1x1"], [1, "a2"], [f.g!, ""]),
            M([2 * f.m!, "x1"], [f.c!, ""]),
          ],
  "05": (f) =>
    f.mode === 0
      ? [M([f.k!, "x2"], [f.p!, "x1"], [f.c!, ""]), M([f.m!, "x1"], [f.n!, ""])]
      : f.mode === 1
        ? [M([f.k!, "x2"], [f.p!, "x1"], [f.c!, ""]), `@(${f.x0}, ${f.y0})`]
        : [M([1, "x2"], [-2, "a1x1"], [1, "a2"], [2 * f.j!, "a1"], [f.c!, ""])],
  "06": (f) =>
    f.mode === 0
      ? [
          M(
            [f.a!, "x2"],
            [-2 * f.a! * f.h!, "x1"],
            [f.a! * f.h! ** 2 + f.k!, ""],
          ),
          `@${f.lo}\\le x\\le ${f.hi}`,
        ]
      : f.mode === 1
        ? [
            M([f.a!, "x2"], [1, "k1x1"], [f.c0!, ""]),
            `@(${f.s}, ${f.t})`,
            `@${f.lo}\\le x\\le ${f.hi}`,
          ]
        : [
            M([1, "x2"], [-2 * f.p!, "a1x1"], [f.qa!, "a1"], [f.r!, ""]),
            `@${f.lo}\\le a\\le ${f.hi}`,
          ],
  "07": (f) =>
    f.mode === 0
      ? [
          M([f.a!, "x2"], [-2 * f.a! * f.h!, "x1"], [1, "k1"]),
          `@${f.lo}\\le x\\le ${f.hi}`,
          `@$${f.V}$`,
        ]
      : f.mode === 1
        ? [
            M([1, "a1x2"], [-2 * f.h!, "a1x1"], [1, "b1"]),
            `@${f.lo}\\le x\\le ${f.hi}`,
            `@$${f.M}$`,
            `@$${f.m}$`,
          ]
        : f.variant === 0
          ? [`@x\\ge ${f.c}`, `@$${f.V}$`]
          : [M([1, "x2"], [-2 * f.p!, "x1"], [f.q!, ""]), `@$${f.V}$`],
  "08": (f) =>
    f.mode === 0
      ? [M([1, "x2"], [2 * f.h!, "x1"]), `@${f.lo}\\le x\\le ${f.hi}`]
      : f.mode === 1
        ? [M([1, "x2"], [f.p!, "x1"], [f.qq!, ""]), `@$${f.V}$`]
        : [
            M([1, "x2"], [f.p!, "x1"], [f.qq!, ""]),
            M([1, "x2"], [f.p!, "x1"], [f.qq! + f.d!, ""]),
          ],
  "09": (f) => [
    M(
      [f.al!, "x2"],
      [-2 * f.al! * f.m!, "x1"],
      [f.be!, "y2"],
      [-2 * f.be! * f.n!, "y1"],
      [f.al! * f.m! ** 2 + f.be! * f.n! ** 2 + f.k!, ""],
    ),
  ],
  "10": (f) =>
    f.mode === 0
      ? [
          M([f.u!, "x1"], [1, "y1"]),
          f.kindE === 0 ? M([1, "x2"], [f.w!, "y2"]) : M([1, "x1y1"]),
          `@${f.lo}\\le x\\le ${f.hi}`,
        ]
      : f.mode === 1
        ? [
            M([1, "x2"], [-2 * f.s!, "a1x1"], [-f.w!, "a2"]),
            `@${f.lo}\\le a\\le ${f.hi}`,
          ]
        : [
            M([1, "x2"], [1, "y2"]),
            M([f.al!, "x2"], [f.be!, "y2"], [f.u!, "x1"]),
            `@=${f.R}$`,
          ],
  "11": (f) =>
    f.mode === 0
      ? [M([-5, "t2"], [f.a!, "t1"], [f.b!, ""])]
      : f.mode === 1
        ? [`@$${f.P}$`, `@$${f.N}$`, `@$${f.D}$`, `@$${f.d}$`]
        : f.mode === 2
          ? [`@$${f.Cap}$`, `@$${f.K}$`, `@$${f.P}$`, `@$${f.D}$`]
          : [M([-1, "x2"], [f.k!, ""])],
};

function eachProblem(
  fn: (p: HighProblem, key: string, number: string) => void,
) {
  for (const entry of H1_QUAD_FUNC) {
    for (const seed of SEEDS) {
      for (let v = 0; v < VARIANTS; v += 1) {
        fn(generateHighProblem(entry.key, seed, v), entry.key, entry.rpmType);
      }
    }
  }
}

describe("고등 공통수학1 이차방정식과 이차함수 — 등록", () => {
  it("색인 11유형을 전부 등록했고 번호·제목·중단원이 색인 바이트와 같다", () => {
    expect(catalogRows.length, "색인 유형 수").toBe(11);
    expect(H1_QUAD_FUNC.length + H1_QUAD_FUNC_HOLD.length).toBe(
      catalogRows.length,
    );
    expect(H1_QUAD_FUNC_HOLD, "보류 없이 전부 등록했다").toEqual([]);
    for (const e of H1_QUAD_FUNC) {
      const row = catalogRows.find((t) => t.number === e.rpmType);
      expect(row, `${e.key}: 색인에 없는 번호`).toBeDefined();
      expect(e.rpmTitle, `${e.key} 제목`).toBe(
        expectedHighTitle(e.key, row!.title),
      );
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
    for (const e of H1_QUAD_FUNC) {
      expect(sections.has(e.unitSection), `${e.key} — ${e.unitSection}`).toBe(
        true,
      );
      expect(keys.has(e.key)).toBe(true);
    }
  });
});

describe("고등 공통수학1 이차방정식과 이차함수 — 값", () => {
  it("정답을 facts 로 다른 길을 걸어 다시 낸 것과 같다", () => {
    const modes = new Map<string, Set<number>>();
    eachProblem((p, key, number) => {
      const expected = VERIFY[number]!(p.facts);
      const got = readAnswerValues(p.answer);
      expect(got, `${key} 정답은 값 하나`).toHaveLength(1);
      // 음수 답은 읽개가 부호를 곱해 허수부가 `-0` 이 된다 — 값으로 본다.
      expect(Math.abs(got[0]!.im), `${key} 정답은 실수`).toBe(0);
      expect(
        Math.abs(got[0]!.re - expected),
        `${key} ${p.answer} ≠ ${expected} (${JSON.stringify(p.facts)})`,
      ).toBeLessThan(1e-9);
      if (!modes.has(key)) modes.set(key, new Set());
      modes.get(key)!.add(p.facts.mode!);
    });
    // 꼴이 여럿인 유형은 모든 꼴이 실제로 돌아야 검산이 장식이 아니다.
    for (const [key, seen] of modes) {
      expect(seen.size, `${key}: 검산이 밟은 꼴`).toBeGreaterThanOrEqual(2);
    }
  });

  it("발문이 facts 가 말하는 식과 수치를 그대로 보여 준다", () => {
    let checked = 0;
    eachProblem((p, key, number) => {
      const shown = shownMulti(p.content);
      for (const want of SHOWN[number]!(p.facts)) {
        if (want.startsWith("@")) {
          expect(
            p.content.includes(want.slice(1)),
            `${key}: 발문에 «${want.slice(1)}» 가 없다 — ${p.content}`,
          ).toBe(true);
        } else {
          expect(
            shown.has(want),
            `${key}: 발문에 ${want} 가 없다 — ${p.content}`,
          ).toBe(true);
        }
        checked += 1;
      }
    });
    expect(
      checked,
      "지면 대조가 하나도 안 돌면 이 검사는 장식이다",
    ).toBeGreaterThan(1000);
  });

  // 2026-10-08 적재 전 관문(`scripts/qa/highLoadGate.ts`)이 찾은 것 — 값은 맞는데 답이 발문의 수 그대로인 판.
  it("08 꼴 1: 답 $k$ 가 발문에 적힌 극값과 같지 않다 — 같으면 발문의 수를 옮겨 적어 맞는다", () => {
    const key = H1_QUAD_FUNC.find((e) => e.rpmType === "08")!.key;
    let runs = 0;
    for (let seed = 1; seed <= 300; seed += 1) {
      const p = generateHighProblem(key, seed, 0);
      if (p.facts.mode !== 1) continue;
      runs += 1;
      const k = readAnswerValues(p.answer)[0]!.re;
      expect(k, `${p.content} → ${p.answer}`).not.toBe(p.facts.V);
    }
    expect(runs, "08 꼴 1 이 돈 판").toBeGreaterThan(50);
  });
});
