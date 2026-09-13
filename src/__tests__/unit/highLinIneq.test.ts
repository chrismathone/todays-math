/**
 * 공통수학1 「연립일차부등식」 12유형 — **독립 검산** (물결 1 세션 `h1-ineq`).
 *
 * facts 는 발문 부등식의 **정리형**(`m·x rel c`)과 원 수치다. 시험은 둘을 따로 본다:
 *
 *   ⑴ `SHOWN` — 지면의 부등식을 직접 읽어(`helpers/highIneq.parseChain`, 정확한 유리수) facts 의
 *      정리형과 **같은 부등식**인지 여러 점에서 맞댄다. 분모 없애기·괄호 풀기·문자 상수 자리가
 *      틀리면 여기서 걸린다.
 *   ⑵ `VERIFY` — 정리형으로 정수를 하나하나 대입하거나(`intsWhere`) 부호표를 따로 그려
 *      (`chartSolve`) 답을 다시 낸다. 범위를 묻는 꼴은 «그 조건을 만족시키는 값의 집합»을 끝점·
 *      끝점±ε·격자에서 대 본다(`ivVsProp`). 제품의 구간 셈(`ivMeet`·`intsIn`·`maxInt`)을 안 부른다.
 *
 * 지면(수는 수식 안 · 냄새 · 조사) · 난이도 · 형식은 `highRegistry.test.ts` 가 등록 유형 전부에 돈다.
 */
import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import {
  generateHighProblem,
  registeredHighHolds,
  registeredHighTypes,
} from "../../lib/high/generate";
import { H1_LIN_INEQ, H1_LIN_INEQ_HOLD } from "../../lib/high/h1LinIneq";
import type { HighProblem } from "../../lib/high/types";
import {
  and,
  chartSolve,
  checkAnswer,
  checkDistractors,
  checkShown,
  type Expect,
  type F,
  type Fact,
  fAbs,
  fAdd,
  fCmp,
  fDiv,
  fEq,
  fMul,
  fNeg,
  fNum,
  fr,
  fSub,
  intsWhere,
  num,
  only,
  type Pred,
  relHolds,
  relOf,
  type ShownSpec,
  type TIv,
  tivHas,
  tivText,
  type Want,
} from "../helpers/highIneq";
import { highCatalog } from "../helpers/highPage";

const BOOK = "공통수학1";
const MINOR = "연립일차부등식";
const SEEDS = [20260913, 1, 7777, 424242, 99991];
const VARIANTS = 14;

const catalogRows = highCatalog(BOOK).filter((t) => t.minor === MINOR);

/** facts 의 `m_i·x rel_i c_i` */
function lin(f: Fact, i: number): Pred {
  const m = fr(num(f, `m${i}`));
  const c = fr(num(f, `c${i}`));
  const r = relOf(num(f, `r${i}`));
  return (x) => relHolds(r, fMul(m, x), c);
}

const linCrit = (f: Fact, i: number): F => fr(num(f, `c${i}`), num(f, `m${i}`));

/** 두 일차부등식의 연립 — 부호표로 푼다. */
function sys2(f: Fact): { pred: Pred; crit: F[]; sol: TIv[] } {
  const pred = and(lin(f, 1), lin(f, 2));
  const crit = [linCrit(f, 1), linCrit(f, 2)];
  return { pred, crit, sol: chartSolve(pred, crit) };
}

const exists = (pred: Pred, crit: readonly F[]): boolean =>
  chartSolve(pred, crit).length > 0;

const sum = (ns: readonly number[]): number => ns.reduce((s, n) => s + n, 0);

/** 08 — `|px+q| rel cx+d` 와 참·거짓이 바뀔 수 있는 점(절댓값 안이 0 · 두 조각의 직선이 만나는 점). */
function absLin(f: Fact): { pred: Pred; crit: F[] } {
  const p = fr(num(f, "p"));
  const qq = fr(num(f, "q"));
  const c = fr(num(f, "c"));
  const d = fr(num(f, "d"));
  const r = relOf(num(f, "r"));
  const pred: Pred = (x) =>
    relHolds(r, fAbs(fAdd(fMul(p, x), qq)), fAdd(fMul(c, x), d));
  const crit = [fDiv(fNeg(qq), p)];
  if (!fEq(p, c)) crit.push(fDiv(fSub(d, qq), fSub(p, c)));
  if (!fEq(fNeg(p), c)) crit.push(fDiv(fAdd(d, qq), fNeg(fAdd(p, c))));
  return { pred, crit };
}

/** 09 — `s₁|p₁x+q₁|+s₂|p₂x+q₂| rel cx+d` 와 임계점(두 경계 · 네 부호 조합의 직선 근). */
function absSum(f: Fact): { pred: Pred; crit: F[] } {
  const T = [1, 2].map((i) => ({
    s: num(f, `s${i}`),
    p: num(f, `p${i}`),
    q: num(f, `q${i}`),
  }));
  const c = num(f, "c");
  const d = num(f, "d");
  const r = relOf(num(f, "r"));
  const pred: Pred = (x) =>
    relHolds(
      r,
      T.reduce(
        (acc, t) =>
          fAdd(acc, fMul(fr(t.s), fAbs(fAdd(fMul(fr(t.p), x), fr(t.q))))),
        fr(0),
      ),
      fAdd(fMul(fr(c), x), fr(d)),
    );
  const crit: F[] = T.map((t) => fr(-t.q, t.p));
  for (const s1 of [1, -1]) {
    for (const s2 of [1, -1]) {
      const m = s1 * T[0]!.s * T[0]!.p + s2 * T[1]!.s * T[1]!.p - c;
      if (m !== 0)
        crit.push(fr(d - s1 * T[0]!.s * T[0]!.q - s2 * T[1]!.s * T[1]!.q, m));
    }
  }
  return { pred, crit };
}

/** 10 — `|px+q|` 와 `|px+q| = 값` 이 되는 점 */
function absOf(f: Fact): { at: (x: F) => F; crit: (v: F) => F[] } {
  const p = fr(num(f, "p"));
  const qq = fr(num(f, "q"));
  return {
    at: (x) => fAbs(fAdd(fMul(p, x), qq)),
    crit: (v) => [
      fDiv(fSub(v, qq), p),
      fDiv(fSub(fNeg(v), qq), p),
      fDiv(fNeg(qq), p),
    ],
  };
}

/** 11 — a 가 주어졌을 때 연립부등식을 만족시키는 정수의 개수 */
function intCount(f: Fact, a: F): number {
  const m1 = fr(num(f, "m1"));
  const c1 = fAdd(a, fr(num(f, "kw")));
  const r1 = relOf(num(f, "r1"));
  return intsWhere(
    and((x) => relHolds(r1, fMul(m1, x), c1), lin(f, 2)),
    -60,
    60,
  ).length;
}

/** 정답 **값**을 facts 로 다시 세운다 — 수면 수, 범위면 «조건» 또는 정확한 구간. */
const VERIFY: Record<string, (f: Fact) => Expect> = {
  "01": (f) => {
    const { pred, sol } = sys2(f);
    if (f.mode === 0) {
      const ints = intsWhere(pred);
      if (f.ask === 0) {
        expect(ints[0], "해가 아래로 열려 있어야 한다").toBe(-300);
        return ints[ints.length - 1]!;
      }
      expect(ints[ints.length - 1], "해가 위로 열려 있어야 한다").toBe(300);
      return ints[0]!;
    }
    if (f.mode === 1) {
      const s = only(sol, "해는 한 구간");
      const a = fNum(s.lo!);
      const b = fNum(s.hi!);
      return [b - a, a + b, a * b][num(f, "exprId")]!;
    }
    const ints = intsWhere(pred);
    return f.kind === 0 ? ints.length : sum(ints);
  },

  "02": (f) => {
    const { pred, sol } = sys2(f);
    if (f.mode === 0) {
      const ints = intsWhere(pred);
      expect(ints.length, "해가 양쪽으로 막혀 있어야 한다").toBeLessThan(50);
      return f.kind === 0 ? sum(ints) : ints.length;
    }
    const s = only(sol, "해는 한 구간");
    if (f.mode === 1) {
      const a = fNum(s.lo!);
      const b = fNum(s.hi!);
      return [a + b, b - a][num(f, "exprId")]!;
    }
    const p = fr(num(f, "p"));
    const k = fr(num(f, "k"));
    // y 가 답의 구간에 있다 ⇔ y=px+k 인 x 가 해 안에 있다
    return { v: "y", prop: (y) => tivHas(s, fDiv(fSub(y, k), p)) };
  },

  "03": (f) => {
    const s = only(sys2(f).sol, "해는 한 점");
    expect(tivText(s), "해는 한 점").toBe(
      tivText({ lo: s.lo, loC: true, hi: s.lo, hiC: true }),
    );
    return { v: "x", exact: s };
  },

  "04": (f) => {
    const s = only(sys2(f).sol, "해는 한 구간");
    const a = num(f, "a");
    const b = num(f, "b");
    if (f.mode === 0) {
      expect(fNum(s.hi!), "b 는 해의 위 끝이다").toBe(b);
      return [a + b, a - b, a * b][num(f, "exprId")]!;
    }
    if (f.mode === 1) return [a - b, a + b, a * b][num(f, "exprId")]!;
    const t = num(f, "t");
    expect(tivText(s), "해는 한 점 x=t").toBe(
      tivText({ lo: fr(t), loC: true, hi: fr(t), hiC: true }),
    );
    return [a + b, a * b, a - b][num(f, "exprId")]!;
  },

  "05": (f) => {
    if (f.mode === 0) {
      const u = fr(num(f, "u"));
      const w = fr(num(f, "w"));
      const d = fr(num(f, "d"));
      const rho = relOf(num(f, "r1"));
      const has = (a: number): boolean => {
        const A = fr(a);
        // 지면 그대로 — (ux+w)/d ρ a
        const p1: Pred = (x) => relHolds(rho, fDiv(fAdd(fMul(u, x), w), d), A);
        return exists(and(p1, lin(f, 2)), [
          fDiv(fSub(fMul(d, A), w), u),
          linCrit(f, 2),
        ]);
      };
      const as: number[] = [];
      for (let a = -80; a <= 80; a += 1) if (has(a)) as.push(a);
      if (f.ask === 0) {
        expect(as[0], "해를 갖는 a 는 아래로 열려 있어야 한다").toBe(-80);
        return as[as.length - 1]!;
      }
      expect(as[as.length - 1], "해를 갖는 a 는 위로 열려 있어야 한다").toBe(
        80,
      );
      return as[0]!;
    }
    if (f.mode === 1) {
      const m2 = fr(num(f, "m2"));
      const s = fr(num(f, "s"));
      const w0 = fr(num(f, "w0"));
      const r2 = relOf(num(f, "r2"));
      return {
        v: "k",
        prop: (k) => {
          const c = fSub(fMul(s, k), w0);
          const p2: Pred = (x) => relHolds(r2, fMul(m2, x), c);
          return !exists(and(lin(f, 1), p2), [linCrit(f, 1), fDiv(c, m2)]);
        },
      };
    }
    const m1 = fr(num(f, "m1"));
    const b0 = fr(num(f, "b0"));
    const sg = fr(num(f, "sigma"));
    const r1 = relOf(num(f, "r1"));
    return {
      v: "a",
      prop: (a) => {
        const c = fSub(b0, fMul(sg, a));
        const p1: Pred = (x) => relHolds(r1, fMul(m1, x), c);
        return exists(and(p1, lin(f, 2)), [fDiv(c, m1), linCrit(f, 2)]);
      },
    };
  },

  "06": (f) => {
    if (f.mode === 0) {
      const W = fr(num(f, "W"));
      const salt = fr(num(f, "p") * num(f, "W"), 100);
      const lowP = fr(num(f, "lowP"));
      const highP = fr(num(f, "highP"));
      return {
        v: "x",
        prop: (x) => {
          const total = fAdd(W, x);
          if (fNum(total) <= 0) return false;
          // 농도(%) = 소금 × 100 ÷ 소금물
          const pct = fDiv(fMul(fAdd(salt, x), fr(100)), total);
          return relHolds("ge", pct, lowP) && relHolds("le", pct, highP);
        },
      };
    }
    if (f.mode === 1) {
      const step = num(f, "step");
      const kind = num(f, "kind");
      const S1 = num(f, "S1");
      const S2 = num(f, "S2");
      const hits: number[] = [];
      for (let x = 1; x <= 300; x += 1) {
        if (kind === 0 && x % 2 === 0) continue;
        if (kind === 1 && x % 2 !== 0) continue;
        if (x - step < 1) continue;
        const s = x - step + x + (x + step);
        if (f.form === 0 ? S1 <= s && s < S2 : S1 < s && s <= S2) hits.push(x);
      }
      expect(
        hits,
        "조건을 만족시키는 세 수가 하나로 정해져야 한다",
      ).toHaveLength(1);
      return f.ask === 0 ? hits[0]! + step : hits[0]! - step;
    }
    const [a1, a2, b1, b2, N, SP, SQ] = [
      "a1",
      "a2",
      "b1",
      "b2",
      "N",
      "SP",
      "SQ",
    ].map((k) => num(f, k)) as [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    const xs: number[] = [];
    for (let x = 0; x <= N; x += 1) {
      if (a1 * x + a2 * (N - x) <= SP && b1 * x + b2 * (N - x) <= SQ)
        xs.push(x);
    }
    expect(xs.length, "만들 수 있는 개수가 둘 이상").toBeGreaterThan(1);
    expect(xs[xs.length - 1]! - xs[0]! + 1, "가능한 개수가 이어져 있다").toBe(
      xs.length,
    );
    return xs[0]! + xs[xs.length - 1]!;
  },

  "07": (f) => {
    if (f.mode === 3) {
      const m = fr(num(f, "m"));
      const s = fr(num(f, "s"));
      const r1 = relOf(num(f, "r1"));
      const r2 = relOf(num(f, "r2"));
      const count = (a: number): number =>
        intsWhere(
          (x) => {
            const dist = fAbs(fSub(x, s));
            return relHolds(r1, m, dist) && relHolds(r2, dist, fr(a));
          },
          -200,
          200,
        ).length;
      const as: number[] = [];
      for (let a = 1; a <= 40; a += 1) if (count(a) === num(f, "N")) as.push(a);
      expect(as, "정수의 개수가 N 이 되는 자연수 a 는 하나").toHaveLength(1);
      return as[0]!;
    }
    const p = fr(num(f, "p"));
    const r = relOf(num(f, "r"));
    const c = fr(num(f, "c"));
    if (f.mode === 2) {
      const a = fr(num(f, "a"));
      const pred: Pred = (x) => relHolds(r, fAbs(fSub(fMul(p, x), a)), c);
      const sol = chartSolve(pred, [
        fDiv(fSub(a, c), p),
        fDiv(fAdd(a, c), p),
        fDiv(a, p),
      ]);
      expect(sol, "해는 두 반직선").toHaveLength(2);
      expect(fNum(sol[0]!.hi!), "b 는 왼쪽 반직선의 끝").toBe(num(f, "b"));
      expect(fNum(sol[1]!.lo!), "t 는 오른쪽 반직선의 끝").toBe(num(f, "t"));
      const A = num(f, "a");
      const B = num(f, "b");
      return [A + B, A * B, A - B][num(f, "exprId")]!;
    }
    const qq = fr(num(f, "q"));
    const pred: Pred = (x) => relHolds(r, fAbs(fAdd(fMul(p, x), qq)), c);
    if (f.mode === 1) return intsWhere(pred).length;
    const s = only(
      chartSolve(pred, [fDiv(fSub(fNeg(c), qq), p), fDiv(fSub(c, qq), p)]),
      "해는 한 구간",
    );
    const lo = fNum(s.lo!);
    const hi = fNum(s.hi!);
    return [hi - lo, lo + hi, lo * hi][num(f, "exprId")]!;
  },

  "08": (f) => {
    const { pred, crit } = absLin(f);
    const sol = chartSolve(pred, crit);
    if (f.mode === 0) {
      const s = only(sol, "해는 한 반직선");
      if (s.lo && !s.hi) {
        expect(s.loC, "최솟값이 있으려면 닫힌 끝").toBe(true);
        return fNum(s.lo);
      }
      expect(
        s.hi !== null && s.lo === null && s.hiC,
        "최댓값이 있으려면 닫힌 끝",
      ).toBe(true);
      return fNum(s.hi!);
    }
    if (f.mode === 1 || f.mode === 2) {
      let a: F;
      let b: F;
      if (f.mode === 1) {
        const s = only(sol, "해는 한 구간");
        a = s.lo!;
        b = s.hi!;
      } else {
        expect(sol, "해는 두 반직선").toHaveLength(2);
        a = sol[0]!.hi!;
        b = sol[1]!.lo!;
      }
      return [fNum(fAdd(a, b)), fNum(fSub(b, a))][num(f, "exprId")]!;
    }
    const s = only(sol, "해는 한 구간");
    // 해 전체가 x<k 안에 들어간다 — 해의 위 끝이 닫혔으면 k 가 그보다 커야 한다
    return {
      v: "k",
      prop: (k) => (s.hiC ? fCmp(s.hi!, k) < 0 : fCmp(s.hi!, k) <= 0),
    };
  },

  "09": (f) => {
    const { pred, crit } = absSum(f);
    if (f.mode === 1) {
      const s = only(chartSolve(pred, crit), "해는 한 구간");
      expect(s.loC && s.hiC, "양 끝이 닫혀 있어야 최댓·최솟값이 있다").toBe(
        true,
      );
      return fNum(fAdd(s.lo!, s.hi!));
    }
    const ints = intsWhere(pred);
    expect(ints.length, "해가 막혀 있어야 한다").toBeLessThan(50);
    return f.kind === 0 ? sum(ints) : ints.length;
  },

  "10": (f) => {
    const r = relOf(num(f, "r"));
    const abs = absOf(f);
    if (f.mode === 0) {
      const alpha = fr(num(f, "n"), num(f, "den"));
      const beta = fr(num(f, "beta"));
      const none = (k: number): boolean => {
        const rhs = fAdd(fMul(alpha, fr(k)), beta);
        return !exists((x) => relHolds(r, abs.at(x), rhs), abs.crit(rhs));
      };
      const ks: number[] = [];
      for (let k = 1; k <= 200; k += 1) if (none(k)) ks.push(k);
      expect(none(200), "큰 k 에서는 해가 있어야 한다").toBe(false);
      return ks.length;
    }
    if (f.mode === 1) {
      const c = fr(num(f, "c"));
      return {
        v: "a",
        prop: (a) => {
          const sol = chartSolve(
            (x) => relHolds(r, fAdd(abs.at(x), c), a),
            abs.crit(fSub(a, c)),
          );
          return sol.length === 1 && sol[0]!.lo === null && sol[0]!.hi === null;
        },
      };
    }
    const m = fr(num(f, "m"));
    return {
      v: "k",
      prop: (k) => {
        const rhs = fAdd(k, m);
        return exists((x) => relHolds(r, abs.at(x), rhs), abs.crit(rhs));
      },
    };
  },

  "11": (f) => {
    const N = num(f, "N");
    const prop: Pred = (a) => intCount(f, a) === N;
    if (f.mode !== 2) return { v: "a", prop };
    // 조건을 만족시키는 a 의 격자(1/4) 가운데 가장 작은(큰) 값 — 끝점이 격자에 걸리는지는 ±ε 로 본다
    const hits: F[] = [];
    for (let n = -200; n <= 200; n += 1) {
      const a = fr(n, 4);
      if (prop(a)) hits.push(a);
    }
    expect(hits.length, "조건을 만족시키는 a 가 있다").toBeGreaterThan(0);
    const eps = fr(1, 1000);
    if (f.ask === 0) {
      expect(prop(fSub(hits[0]!, eps)), "최솟값 바로 아래는 안 된다").toBe(
        false,
      );
      return fNum(hits[0]!);
    }
    const top = hits[hits.length - 1]!;
    expect(prop(fAdd(top, eps)), "최댓값 바로 위는 안 된다").toBe(false);
    return fNum(top);
  },

  "12": (f) => {
    const p = num(f, "p");
    const qq = num(f, "q");
    const r = num(f, "r");
    if (f.mode === 1) {
      const xs: number[] = [];
      for (let x = 1; x <= 200; x += 1) {
        // 앞의 x−1 명은 q 개씩, 마지막 한 명이 받는 개수
        const last = p * x + r - qq * (x - 1);
        if (last >= num(f, "m1") && last < num(f, "m2")) xs.push(x);
      }
      expect(xs, "학생 수가 하나로 정해져야 한다").toHaveLength(1);
      return p * xs[0]! + r;
    }
    const s = num(f, "s");
    const xs: number[] = [];
    for (let x = s + 1; x <= 300; x += 1) {
      // 쓴 의자(차)는 x−s 개 — 사람이 그 안에 다 앉되 마지막 것이 비지 않는다
      const people = p * x + r;
      const used = x - s;
      if (people > qq * (used - 1) && people <= qq * used) xs.push(x);
    }
    expect(xs.length, "가능한 개수가 있다").toBeGreaterThan(0);
    if (f.ask === 2) return xs[0]!;
    return f.ask === 0
      ? xs[0]! + xs[xs.length - 1]!
      : p * xs[xs.length - 1]! + r;
  },
};

/** 발문이 **보여 줘야 하는** 부등식 — facts 로 시험이 따로 만든다. 문자 상수는 `env` 로 매긴다. */
const SHOWN: Record<string, (f: Fact) => ShownSpec> = {
  "01": (f) => {
    const { pred, crit, sol } = sys2(f);
    const wants: Want[] = [
      { what: "첫 부등식", pred: lin(f, 1), crit },
      { what: "둘째 부등식", pred: lin(f, 2), crit },
    ];
    if (f.mode !== 1) return { env: {}, wants };
    const s = sol[0]!;
    return {
      env: { a: s.lo!, b: s.hi! },
      wants: [
        ...wants,
        { what: "해 a·b 의 등호", pred, crit, mustContain: "b" },
      ],
    };
  },
  "02": (f) => {
    const { pred, crit, sol } = sys2(f);
    const wants: Want[] = [{ what: "A<B<C", pred, crit }];
    if (f.mode !== 1) return { env: {}, wants };
    const s = sol[0]!;
    return {
      env: { a: s.lo!, b: s.hi! },
      wants: [
        ...wants,
        { what: "해 a·b 의 등호", pred, crit, mustContain: "b" },
      ],
    };
  },
  "03": (f) => {
    const { pred, crit } = sys2(f);
    if (f.mode === 1)
      return { env: {}, wants: [{ what: "A≤B≤C", pred, crit }] };
    return {
      env: {},
      wants: [
        { what: "첫 부등식", pred: lin(f, 1), crit },
        { what: "둘째 부등식", pred: lin(f, 2), crit },
      ],
    };
  },
  "04": (f) => {
    const { pred, crit } = sys2(f);
    const env = { a: fr(num(f, "a")), b: fr(num(f, "b")) };
    if (f.mode === 1)
      return { env, wants: [{ what: "A≤B≤C · 주어진 해", pred, crit }] };
    return {
      env,
      wants: [
        { what: "a 가 든 부등식", pred: lin(f, 1), crit },
        { what: "둘째 부등식", pred: lin(f, 2), crit },
        { what: "주어진 해", pred, crit },
      ],
    };
  },
  "05": (f) => {
    const two = fr(2);
    if (f.mode === 0) {
      const u = fr(num(f, "u"));
      const w = fr(num(f, "w"));
      const d = fr(num(f, "d"));
      const rho = relOf(num(f, "r1"));
      const crit = [fDiv(fSub(fMul(d, two), w), u), linCrit(f, 2)];
      return {
        env: { a: two },
        wants: [
          {
            what: "a 가 든 부등식",
            pred: (x) => relHolds(rho, fDiv(fAdd(fMul(u, x), w), d), two),
            crit,
          },
          { what: "둘째 부등식", pred: lin(f, 2), crit },
        ],
      };
    }
    if (f.mode === 1) {
      const m2 = fr(num(f, "m2"));
      const c = fSub(fMul(fr(num(f, "s")), two), fr(num(f, "w0")));
      const r2 = relOf(num(f, "r2"));
      const crit = [linCrit(f, 1), fDiv(c, m2)];
      return {
        env: { k: two },
        wants: [
          { what: "첫 부등식", pred: lin(f, 1), crit },
          {
            what: "k 가 든 부등식",
            pred: (x) => relHolds(r2, fMul(m2, x), c),
            crit,
          },
        ],
      };
    }
    const m1 = fr(num(f, "m1"));
    const c = fSub(fr(num(f, "b0")), fMul(fr(num(f, "sigma")), two));
    const r1 = relOf(num(f, "r1"));
    const crit = [fDiv(c, m1), linCrit(f, 2)];
    return {
      env: { a: two },
      wants: [
        {
          what: "A<B<C",
          pred: and((x) => relHolds(r1, fMul(m1, x), c), lin(f, 2)),
          crit,
        },
      ],
    };
  },
  "06": (f) => {
    const keys =
      f.mode === 0
        ? ["p", "W", "lowP", "highP"]
        : f.mode === 1
          ? ["S1", "S2"]
          : ["a1", "a2", "b1", "b2", "N", "SP", "SQ"];
    return { env: {}, wants: [], numbers: keys.map((k) => num(f, k)) };
  },
  "07": (f) => {
    if (f.mode === 3) {
      const m = fr(num(f, "m"));
      const s = fr(num(f, "s"));
      const r1 = relOf(num(f, "r1"));
      const r2 = relOf(num(f, "r2"));
      const a = fr(num(f, "a"));
      return {
        env: { a },
        wants: [
          {
            what: "m<|x−s|<a",
            pred: (x) => {
              const dist = fAbs(fSub(x, s));
              return relHolds(r1, m, dist) && relHolds(r2, dist, a);
            },
            crit: [fSub(s, a), fAdd(s, a), fSub(s, m), fAdd(s, m)],
          },
        ],
        numbers: [num(f, "N")],
      };
    }
    const r = relOf(num(f, "r"));
    const p = fr(num(f, "p"));
    const c = fr(num(f, "c"));
    if (f.mode === 2) {
      const a = fr(num(f, "a"));
      const pred: Pred = (x) => relHolds(r, fAbs(fSub(fMul(p, x), a)), c);
      const crit = [fDiv(fSub(a, c), p), fDiv(fAdd(a, c), p)];
      const sol = chartSolve(pred, crit);
      return {
        env: { a, b: fr(num(f, "b")) },
        wants: [
          { what: "절댓값 부등식", pred, crit, mustContain: "|" },
          {
            what: "해의 왼쪽 반직선",
            pred: (x) => tivHas(sol[0]!, x),
            crit,
            mustContain: "b",
          },
          { what: "해의 오른쪽 반직선", pred: (x) => tivHas(sol[1]!, x), crit },
        ],
      };
    }
    const qq = fr(num(f, "q"));
    const pred: Pred = (x) => relHolds(r, fAbs(fAdd(fMul(p, x), qq)), c);
    const crit = [fDiv(fSub(fNeg(c), qq), p), fDiv(fSub(c, qq), p)];
    const wants: Want[] = [
      { what: "절댓값 부등식", pred, crit, mustContain: "|" },
    ];
    if (f.mode === 1) return { env: {}, wants };
    const s = chartSolve(pred, crit)[0]!;
    return {
      env: { a: s.lo!, b: s.hi! },
      wants: [
        ...wants,
        { what: "해 a·b 의 등호", pred, crit, mustContain: "b" },
      ],
    };
  },
  "08": (f) => {
    const { pred, crit } = absLin(f);
    const wants: Want[] = [
      { what: "절댓값 부등식", pred, crit, mustContain: "|" },
    ];
    const sol = chartSolve(pred, crit);
    if (f.mode === 1) {
      const s = sol[0]!;
      return {
        env: { a: s.lo!, b: s.hi! },
        wants: [
          ...wants,
          { what: "해 a·b 의 등호", pred, crit, mustContain: "b" },
        ],
      };
    }
    if (f.mode === 2) {
      return {
        env: { a: sol[0]!.hi!, b: sol[1]!.lo! },
        wants: [
          ...wants,
          {
            what: "해의 왼쪽 반직선",
            pred: (x) => tivHas(sol[0]!, x),
            crit,
            mustContain: "a",
          },
          {
            what: "해의 오른쪽 반직선",
            pred: (x) => tivHas(sol[1]!, x),
            crit,
            mustContain: "b",
          },
        ],
      };
    }
    return { env: {}, wants };
  },
  "09": (f) => {
    const { pred, crit } = absSum(f);
    return {
      env: {},
      wants: [{ what: "절댓값 두 개 부등식", pred, crit, mustContain: "|" }],
    };
  },
  "10": (f) => {
    const r = relOf(num(f, "r"));
    const abs = absOf(f);
    const seven = fr(7);
    let rhs: F;
    let env: Record<string, F>;
    let pred: Pred;
    if (f.mode === 0) {
      env = { k: seven };
      rhs = fAdd(
        fMul(fr(num(f, "n"), num(f, "den")), seven),
        fr(num(f, "beta")),
      );
      pred = (x) => relHolds(r, abs.at(x), rhs);
    } else if (f.mode === 1) {
      env = { a: seven };
      const c = fr(num(f, "c"));
      rhs = fSub(seven, c);
      pred = (x) => relHolds(r, fAdd(abs.at(x), c), seven);
    } else {
      env = { k: seven };
      rhs = fAdd(seven, fr(num(f, "m")));
      pred = (x) => relHolds(r, abs.at(x), rhs);
    }
    return {
      env,
      wants: [
        { what: "절댓값 부등식", pred, crit: abs.crit(rhs), mustContain: "|" },
      ],
    };
  },
  "11": (f) => {
    const two = fr(2);
    const m1 = fr(num(f, "m1"));
    const c1 = fAdd(two, fr(num(f, "kw")));
    const r1 = relOf(num(f, "r1"));
    const crit = [fDiv(c1, m1), linCrit(f, 2)];
    const T = num(f, "T");
    return {
      env: { a: two },
      wants: [
        {
          what: "a 가 든 부등식",
          pred: (x) => relHolds(r1, fMul(m1, x), c1),
          crit,
          mustContain: "a",
        },
        { what: "둘째 부등식", pred: lin(f, 2), crit },
      ],
      numbers: f.mode === 1 ? [T - 1, T] : [num(f, "N")],
    };
  },
  "12": (f) => ({
    env: {},
    wants: [],
    numbers: (f.mode === 1
      ? ["p", "q", "r", "m1", "m2"]
      : ["p", "q", "r", "s"]
    ).map((k) => num(f, k)),
  }),
};

function eachProblem(
  fn: (p: HighProblem, key: string, number: string) => void,
): void {
  for (const entry of H1_LIN_INEQ) {
    for (const seed of SEEDS) {
      for (let v = 0; v < VARIANTS; v += 1) {
        fn(generateHighProblem(entry.key, seed, v), entry.key, entry.rpmType);
      }
    }
  }
}

describe("고등 공통수학1 연립일차부등식 — 등록", () => {
  it("색인 12유형을 등록 ∪ 보류로 덮고, 번호·제목·중단원이 색인 바이트와 같다", () => {
    expect(catalogRows.length, "색인 유형 수").toBe(12);
    const numbers = [
      ...H1_LIN_INEQ.map((e) => e.rpmType),
      ...H1_LIN_INEQ_HOLD.map((h) => h.key.split("|")[2]!),
    ];
    expect(numbers.sort()).toEqual(catalogRows.map((r) => r.number).sort());
    for (const e of H1_LIN_INEQ) {
      const row = catalogRows.find((r) => r.number === e.rpmType);
      expect(row, `${e.key}: 색인에 없다`).toBeDefined();
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
    for (const e of H1_LIN_INEQ) {
      expect(sections.has(e.unitSection), `${e.key} — ${e.unitSection}`).toBe(
        true,
      );
    }
  });

  it("등록부·보류 목록에 들어 있다", () => {
    const keys = new Set(registeredHighTypes().map((e) => e.key));
    for (const e of H1_LIN_INEQ) expect(keys.has(e.key), e.key).toBe(true);
    const holds = new Set(registeredHighHolds().map((h) => h.key));
    for (const h of H1_LIN_INEQ_HOLD)
      expect(holds.has(h.key), h.key).toBe(true);
  });
});

describe("고등 공통수학1 연립일차부등식 — 값", () => {
  it("정답을 facts 로 다시 세운 것과 같다", () => {
    eachProblem((p, key, number) => {
      const verify = VERIFY[number];
      expect(verify, `${number}: 검산식이 없다`).toBeDefined();
      checkAnswer(
        p.answer,
        verify!(p.facts),
        `${key} ${JSON.stringify(p.facts)} — ${p.answer}`,
      );
    });
  });

  it("발문이 facts 의 부등식을 그대로 보여 준다", () => {
    let checked = 0;
    eachProblem((p, key, number) => {
      const spec = SHOWN[number];
      expect(spec, `${number}: 지면 대조가 없다`).toBeDefined();
      checked += checkShown(p.content, spec!(p.facts), key);
    });
    expect(
      checked,
      "지면 대조가 하나도 안 돌면 이 검사는 장식이다",
    ).toBeGreaterThan(1000);
  });
});

describe("고등 공통수학1 연립일차부등식 — 오답", () => {
  it("생성기가 낸 오답 넷은 모두 읽히고, 정답과 다르다", () => {
    let seen = 0;
    eachProblem((p, key) => {
      if (!p.distractors) return;
      seen += 1;
      checkDistractors(p.answer, p.distractors, key);
    });
    expect(
      seen,
      "오답을 내는 꼴이 하나도 안 나오면 이 검사는 장식이다",
    ).toBeGreaterThan(0);
  });
});
