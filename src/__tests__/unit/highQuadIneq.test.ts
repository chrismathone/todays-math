/**
 * 공통수학1 「이차부등식과 연립이차부등식」 21유형 — **독립 검산** (물결 1 세션 `h1-ineq`).
 *
 * facts 는 발문 이차식의 **계수**다. 시험은 그 계수로 이차식을 다시 세워
 *
 *   ⑴ `SHOWN` — 지면의 부등식을 직접 읽어(`helpers/highIneq.parseChain`, 정확한 유리수) 같은 부등식인지
 *   ⑵ `VERIFY` — 정수를 하나하나 대입하거나(`intsWhere`) 부호표를 따로 그려(`chartSolve`, 임계점은
 *      시험 쪽 `ratRoots`) 답을 다시 내는지
 *
 * 본다. 제품의 풀이 경로(`quadSol`·`factoredTex`·`h1LinIneq` 구간 셈)를 안 부른다.
 * 지면 · 난이도 · 형식은 `highRegistry.test.ts` 가 등록 유형 전부에 돈다.
 */
import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import {
  generateHighProblem,
  registeredHighHolds,
  registeredHighTypes,
} from "../../lib/high/generate";
import { H1_QUAD_INEQ, H1_QUAD_INEQ_HOLD } from "../../lib/high/h1QuadIneq";
import type { HighProblem } from "../../lib/high/types";
import {
  and,
  chartSolve,
  checkAnswer,
  checkDistractors,
  checkShown,
  type Env,
  evalTex,
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
  probePoints,
  ratRoots,
  relHolds,
  relOf,
  type ShownSpec,
  type TIv,
  tivEq,
  tivHas,
} from "../helpers/highIneq";
import { highCatalog, mathSpans } from "../helpers/highPage";

const BOOK = "공통수학1";
const MINOR = "이차부등식과 연립이차부등식";
const SEEDS = [20260913, 1, 7777, 424242, 99991];
const VARIANTS = 14;

const catalogRows = highCatalog(BOOK).filter((t) => t.minor === MINOR);

/** `ax²+bx+c` 의 값 */
function qv(a: number, b: number, c: number): (x: F) => F {
  const [A, B, C] = [fr(a), fr(b), fr(c)];
  return (x) => fAdd(fAdd(fMul(A, fMul(x, x)), fMul(B, x)), C);
}

/** `ax²+bx+c rel 0` */
function qPred(a: number, b: number, c: number, code: number): Pred {
  const f = qv(a, b, c);
  const r = relOf(code);
  return (x) => relHolds(r, f(x), fr(0));
}

/** 유리근(없으면 빈 배열) — 부호표의 임계점 */
const roots = (a: number, b: number, c: number): F[] => ratRoots(a, b, c) ?? [];

const sum = (ns: readonly number[]): number => ns.reduce((s, n) => s + n, 0);

/** 해의 모양에서 |x−p| rel q 의 p, q 를 **다시** 읽는다 — 한 구간이면 가운데와 반지름, 두 반직선이면 그 틈. */
function centerRadius(sol: readonly TIv[]): [F, F] {
  const [lo, hi] =
    sol.length === 1 ? [sol[0]!.lo!, sol[0]!.hi!] : [sol[0]!.hi!, sol[1]!.lo!];
  return [fDiv(fAdd(lo, hi), fr(2)), fDiv(fSub(hi, lo), fr(2))];
}

/**
 * 꼭짓점의 값 `C − B²/4A` — 이차식의 최솟값(A>0)·최댓값(A<0). «항상 성립 / 해를 갖는다» 를 제품처럼
 * 판별식으로 따지지 않고 **이 값의 부호**로 본다(다른 길).
 */
function vtx(A: number | F, B: number | F, C: number | F): F {
  const [a, b, c] = [A, B, C].map((v) =>
    typeof v === "number" ? fr(v) : v,
  ) as [F, F, F];
  return fSub(c, fDiv(fMul(b, b), fMul(fr(4), a)));
}

/** `lo..hi` 의 정수 가운데 조건을 만족시키는 것 */
function intsIn(lo: number, hi: number, ok: (n: number) => boolean): number[] {
  const out: number[] = [];
  for (let n = lo; n <= hi; n += 1) if (ok(n)) out.push(n);
  return out;
}

/**
 * 범위 [p, q] 의 두 끝에서의 값. 이 유형들이 묻는 것은 «위로 볼록한 식의 최솟값» 또는 «아래로 볼록한
 * 식의 최댓값»이라 늘 두 끝 가운데 하나다(꼭짓점은 반대쪽 극값이다).
 * ⚠️ 처음엔 꼭짓점도 넣었다가 끝점±1/1000 에서 분모가 제곱으로 불어 정확한 유리수가 넘쳤다.
 */
function rangeValues(A: F, B: F, C: F, p: number, qE: number): F[] {
  const g = (x: F): F => fAdd(fAdd(fMul(A, fMul(x, x)), fMul(B, x)), C);
  return [g(fr(p)), g(fr(qE))];
}

const minF = (vs: readonly F[]): F =>
  vs.reduce((m, v) => (fCmp(v, m) < 0 ? v : m));
const maxF = (vs: readonly F[]): F =>
  vs.reduce((m, v) => (fCmp(v, m) > 0 ? v : m));

/** 두 줄 이차부등식(`a_i x² + b_i x + c_i rel_i 0`) — facts 의 1·2 */
function qPair(f: Fact): { p1: Pred; p2: Pred; crit: F[] } {
  const [a1, b1, c1, a2, b2, c2] = ["a1", "b1", "c1", "a2", "b2", "c2"].map(
    (k) => num(f, k),
  ) as [number, number, number, number, number, number];
  return {
    p1: qPred(a1, b1, c1, num(f, "r1")),
    p2: qPred(a2, b2, c2, num(f, "r2")),
    crit: [...roots(a1, b1, c1), ...roots(a2, b2, c2)],
  };
}

const VERIFY: Record<string, (f: Fact) => Expect> = {
  "14": (f) => {
    if (f.mode === 1) {
      const lm = num(f, "lm");
      const lc = num(f, "lc");
      const lin: Pred = (x) =>
        relHolds(relOf(num(f, "lr")), fMul(fr(lm), x), fr(lc));
      const [a, b, c] = [num(f, "a"), num(f, "b"), num(f, "c")];
      const sol = chartSolve(and(lin, qPred(a, b, c, num(f, "r"))), [
        fr(lc, lm),
        ...roots(a, b, c),
      ]);
      return { v: "x", exact: only(sol, "해는 한 구간") };
    }
    const { p1, p2 } = qPair(f);
    const ints = intsWhere(and(p1, p2));
    expect(ints.length, "해가 막혀 있다").toBeLessThan(50);
    return f.kind === 0 ? ints.length : sum(ints);
  },

  "15": (f) => {
    const [a, b, c] = [num(f, "a"), num(f, "b"), num(f, "c")];
    const quad = qPred(a, b, c, num(f, "r"));
    if (f.mode === 2) {
      const K = fr(num(f, "K"));
      const absP: Pred = (x) =>
        fCmp(fSub(fMul(x, x), fMul(K, fAbs(x))), fr(0)) < 0;
      return intsWhere(and(absP, quad)).length;
    }
    const s0 = fr(num(f, "s0"));
    const t = fr(num(f, "t"));
    const absP: Pred = (x) =>
      relHolds(relOf(num(f, "ra")), fAbs(fSub(x, s0)), t);
    if (f.mode === 1) return intsWhere(and(absP, quad)).length;
    const s = only(
      chartSolve(and(absP, quad), [
        fSub(s0, t),
        fAdd(s0, t),
        ...roots(a, b, c),
      ]),
      "해는 한 구간",
    );
    const [lo, hi] = [fNum(s.lo!), fNum(s.hi!)];
    return [hi - lo, lo + hi][num(f, "exprId")]!;
  },

  "16": (f) => {
    if (f.mode === 0) {
      const [u, v, w, e, side] = ["u", "v", "w", "e", "side"].map((k) =>
        num(f, k),
      ) as [number, number, number, number, number];
      const first = qPred(1, -(u + v), u * v, 2);
      const given: TIv =
        side > 0
          ? { lo: fr(w), loC: false, hi: fr(v), hiC: true }
          : { lo: fr(u), loC: true, hi: fr(w), hiC: false };
      return {
        v: "k",
        prop: (k) => {
          // 지면 둘째 부등식을 전개하지 않은 값으로 — x²+(k+e−w)x−wk−we
          const B = fAdd(k, fr(e - w));
          const C = fSub(fMul(fr(-w), k), fr(w * e));
          const second: Pred = (x) =>
            fCmp(fAdd(fAdd(fMul(x, x), fMul(B, x)), C), fr(0)) < 0;
          const rho = fSub(fNeg(k), fr(e));
          const sol = chartSolve(and(first, second), [
            fr(u),
            fr(v),
            fr(w),
            rho,
          ]);
          return sol.length === 1 && tivEq(sol[0]!, given);
        },
      };
    }
    if (f.mode === 1) {
      const [a, b] = [num(f, "a"), num(f, "b")];
      return [a + b, a * b, a - b][num(f, "exprId")]!;
    }
    const [u, v, al, be] = [
      num(f, "u"),
      num(f, "v"),
      num(f, "al"),
      num(f, "be"),
    ];
    const first = qPred(1, -(u + v), u * v, 2);
    const ks = intsIn(-60, 60, (k) => {
      // 지면 그대로 — x² − (2k+α+β)x + (k+α)(k+β) > 0
      const second = qPred(1, -(2 * k + al + be), (k + al) * (k + be), 1);
      return (
        chartSolve(and(first, second), [fr(u), fr(v), fr(k + al), fr(k + be)])
          .length === 0
      );
    });
    return ks[ks.length - 1]! - ks[0]!;
  },

  "17": (f) => {
    if (f.mode === 0) {
      const d = num(f, "d");
      return intsIn(
        1,
        300,
        (n) =>
          n - d > 0 &&
          n + d < n - d + n &&
          (n + d) ** 2 > n ** 2 + (n - d) ** 2,
      ).length;
    }
    if (f.mode === 1) {
      const [W, H, S1, S2] = [
        num(f, "W"),
        num(f, "H"),
        num(f, "S1"),
        num(f, "S2"),
      ];
      const area = (x: F): F =>
        fSub(
          fMul(fAdd(fr(W), fMul(fr(2), x)), fAdd(fr(H), fMul(fr(2), x))),
          fr(W * H),
        );
      const pred: Pred = (x) =>
        fCmp(x, fr(0)) > 0 &&
        fCmp(area(x), fr(S1)) >= 0 &&
        fCmp(area(x), fr(S2)) <= 0;
      const s = only(
        chartSolve(pred, [
          fr(0),
          ...roots(4, 2 * (W + H), -S1),
          ...roots(4, 2 * (W + H), -S2),
        ]),
        "폭은 한 구간",
      );
      return fNum(fAdd(s.lo!, s.hi!));
    }
    const [d, P, S] = [num(f, "d"), num(f, "P"), num(f, "S")];
    const pred: Pred = (x) =>
      fCmp(x, fr(0)) > 0 &&
      fCmp(fMul(fr(2), fAdd(fMul(fr(2), x), fr(d))), fr(P)) >= 0 &&
      fCmp(fMul(x, fAdd(x, fr(d))), fr(S)) <= 0;
    const s = only(
      chartSolve(pred, [fr(0), fr(P - 2 * d, 4), ...roots(1, d, -S)]),
      "세로는 한 구간",
    );
    return fNum(fAdd(s.lo!, s.hi!));
  },

  "10": (f) => {
    const [p, qE] = [num(f, "p"), num(f, "q")];
    if (f.mode === 0) {
      const [h, e, s] = [num(f, "h"), num(f, "e"), num(f, "s")];
      const r = relOf(num(f, "r"));
      const ks = intsIn(-100, 100, (k) =>
        relHolds(
          r,
          minF(rangeValues(fr(-1), fr(2 * h), fr(e + s * k), p, qE)),
          fr(0),
        ),
      );
      expect(ks[ks.length - 1], "k 가 클수록 성립").toBe(100);
      return ks[0]!;
    }
    if (f.mode === 1) {
      const [A, c] = [num(f, "A"), num(f, "c")];
      const r = relOf(num(f, "r"));
      return {
        v: "a",
        prop: (a) =>
          relHolds(
            r,
            maxF(rangeValues(fr(A), a, fNeg(fMul(fr(c), a)), p, qE)),
            fr(0),
          ),
      };
    }
    const [b1, c1, b2, c2] = [
      num(f, "b1"),
      num(f, "c1"),
      num(f, "b2"),
      num(f, "c2"),
    ];
    const as = intsIn(
      -200,
      200,
      (a) =>
        fCmp(
          minF(rangeValues(fr(-2), fr(b2 - b1), fr(a + c2 - c1), p, qE)),
          fr(0),
        ) >= 0,
    );
    expect(as[as.length - 1], "a 가 클수록 성립").toBe(200);
    return as[0]!;
  },

  "11": (f) => {
    if (f.mode === 0) {
      const [a, b, c0, m, n] = ["a", "b", "c0", "m", "n"].map((k) =>
        num(f, k),
      ) as [number, number, number, number, number];
      const pred: Pred = (x) =>
        relHolds(">", qv(1, -a, c0)(x), fAdd(fMul(fr(m), x), fr(n)));
      const sol = chartSolve(pred, roots(1, -(a + m), c0 - n));
      expect(sol, "해는 두 반직선").toHaveLength(2);
      expect(fNum(sol[1]!.lo!), "b 는 오른쪽 반직선의 끝").toBe(b);
      return a + b;
    }
    if (f.mode === 1) {
      const [A1, b1, c1, A2, b2, c2] = ["A1", "b1", "c1", "A2", "b2", "c2"].map(
        (k) => num(f, k),
      ) as [number, number, number, number, number, number];
      const pred: Pred = (x) =>
        relHolds("<", qv(A1, b1, c1)(x), qv(A2, b2, c2)(x));
      return {
        v: "x",
        exact: only(
          chartSolve(pred, roots(A1 - A2, b1 - b2, c1 - c2)),
          "해는 한 구간",
        ),
      };
    }
    const [a, b] = [num(f, "a"), num(f, "b")];
    return [b - a, a + b, a * b][num(f, "exprId")]!;
  },

  "12": (f) => {
    if (f.mode === 0) {
      const [p, q0, s, t] = [
        num(f, "p"),
        num(f, "q0"),
        num(f, "s"),
        num(f, "t"),
      ];
      // m 이 조건을 만족 ⇔ x²+(m−p)x+(t−ms−q0) 의 최솟값(꼭짓점)이 양수 — 두 경계는 이분법으로
      const ok = (m: number): boolean => {
        const B = m - p;
        return t - m * s - q0 - (B * B) / 4 > 0;
      };
      let mid: number | null = null;
      for (let m = -60; m <= 60; m += 0.25) {
        if (ok(m)) {
          mid = m;
          break;
        }
      }
      expect(mid, "조건을 만족시키는 m 이 있다").not.toBeNull();
      const edge = (inside: number, outside: number): number => {
        let [lo, hi] = [inside, outside];
        for (let i = 0; i < 90; i += 1) {
          const c = (lo + hi) / 2;
          if (ok(c)) lo = c;
          else hi = c;
        }
        return (lo + hi) / 2;
      };
      return edge(mid!, -1000) * edge(mid!, 1000);
    }
    const [m, n, c1] = [num(f, "m"), num(f, "n"), num(f, "c1")];
    if (f.mode === 1) {
      const beta = num(f, "beta");
      return intsIn(
        -60,
        60,
        (k) => fCmp(vtx(1, k + beta - m, c1 - n), fr(0)) > 0,
      ).length;
    }
    const b1 = num(f, "b1");
    // 차 kx²+(b1−m)x+(2k+c1)−(k+n) 이 늘 음수 — 위로 볼록이고 최댓값이 음수
    return {
      v: "k",
      prop: (k) =>
        k.n < 0 && fCmp(vtx(k, fr(b1 - m), fAdd(k, fr(c1 - n))), fr(0)) < 0,
    };
  },

  "13": (f) => {
    if (f.mode === 0) {
      const half = num(f, "L") / 2;
      const S = num(f, "S");
      const sol = only(
        chartSolve(
          (x) => relHolds("ge", fMul(x, fSub(fr(half), x)), fr(S)),
          roots(1, -half, S),
        ),
        "가로의 길이는 한 구간",
      );
      return fNum(fSub(sol.hi!, sol.lo!));
    }
    if (f.mode === 1) {
      const [v, h0, H] = [num(f, "v"), num(f, "h0"), num(f, "H")];
      const sol = only(
        chartSolve(
          (t) => relHolds("ge", qv(-5, v, h0)(t), fr(H)),
          roots(-5, v, h0 - H),
        ),
        "시간은 한 구간",
      );
      return fNum(fSub(sol.hi!, sol.lo!));
    }
    const [P, N, d, R] = [num(f, "P"), num(f, "N"), num(f, "d"), num(f, "R")];
    const revenue = (x: F): F =>
      fMul(fSub(fr(P), fMul(fr(100), x)), fAdd(fr(N), fMul(fr(d), x)));
    const sol = only(
      chartSolve(
        (x) => relHolds("ge", revenue(x), fr(R)),
        roots(-100 * d, P * d - 100 * N, P * N - R),
      ),
      "내리는 폭은 한 구간",
    );
    return P - 100 * fNum(sol.hi!);
  },

  "05": (f) => {
    if (f.mode === 2) {
      const u = num(f, "u");
      const v = num(f, "v");
      const s = fr(num(f, "s"));
      const sg = fr(num(f, "sigma"));
      const r = relOf(num(f, "rel"));
      const g = qv(1, -(u + v), u * v);
      // 지면 그대로 — a(x∓s)² ± b(x∓s) + c 는 f(σ(x−s))
      return sum(intsWhere((x) => relHolds(r, g(fMul(sg, fSub(x, s))), fr(0))));
    }
    const sgn = num(f, "sgn");
    const u = num(f, "u");
    const v = num(f, "v");
    const p = num(f, "p");
    const qq = num(f, "q");
    const g = qv(sgn, -sgn * (u + v), sgn * u * v);
    const r2 = relOf(num(f, "rel2"));
    const pred: Pred = (x) =>
      relHolds(r2, g(fAdd(fMul(fr(p), x), fr(qq))), fr(0));
    const s = only(
      chartSolve(pred, [fr(u - qq, p), fr(v - qq, p)]),
      "해는 한 구간",
    );
    if (f.mode === 1) return fNum(fAdd(s.lo!, s.hi!));
    return { v: "x", exact: s };
  },

  "06": (f) => {
    if (f.mode === 0) {
      const [A, sg, be, gm, de] = ["A", "sigma", "beta", "gamma", "delta"].map(
        (k) => num(f, k),
      ) as [number, number, number, number, number];
      // D(k) 를 세 점에서 **값으로** 매겨 이차식을 다시 짓는다(제품은 근과 계수의 관계로 바로 쓴다)
      const Dk = (k: number): number => {
        const B = sg * (k + be);
        return B * B - 4 * A * (gm * k + de);
      };
      const [d0, d1, dm] = [Dk(0), Dk(1), Dk(-1)];
      const a2 = (d1 + dm) / 2 - d0;
      const a1 = (d1 - dm) / 2;
      expect(a2, "D(k) 는 k 의 이차식").toBe(1);
      const disc = a1 * a1 - 4 * d0;
      expect(disc > 0, "해가 한 개가 되는 k 가 둘").toBe(true);
      const k1 = (-a1 + Math.sqrt(disc)) / 2;
      const k2 = (-a1 - Math.sqrt(disc)) / 2;
      return f.kind === 0 ? k1 + k2 : k1 * k2;
    }
    const m = num(f, "m");
    const c = num(f, "c");
    const hits = intsIn(-40, 40, (k) => {
      if (k === 0) return false;
      const rs = ratRoots(k, 2 * m, k + c);
      // 무리근이면 해가 넓이 있는 구간이라 한 점일 수 없다
      if (rs === null) return false;
      const sol = chartSolve(qPred(k, 2 * m, k + c, num(f, "r")), rs);
      return (
        sol.length === 1 &&
        sol[0]!.lo !== null &&
        sol[0]!.hi !== null &&
        fEq(sol[0]!.lo, sol[0]!.hi)
      );
    });
    expect(hits, "해가 한 개인 k 는 하나").toHaveLength(1);
    return hits[0]!;
  },

  "07": (f) => {
    if (f.mode === 0) {
      const [A, B, sg] = [num(f, "A"), num(f, "B"), num(f, "sigma")];
      const r = relOf(num(f, "r"));
      // 해가 있다 ⇔ 최솟값(꼭짓점의 값)이 부등호를 만족시킨다
      const as = intsIn(-300, 300, (a) =>
        relHolds(r, vtx(A, B, sg * a), fr(0)),
      );
      if (sg > 0) {
        expect(as[0], "해를 갖는 a 는 아래로 열려 있다").toBe(-300);
        return as[as.length - 1]!;
      }
      expect(as[as.length - 1], "해를 갖는 a 는 위로 열려 있다").toBe(300);
      return as[0]!;
    }
    const [m, b, c] = [num(f, "m"), num(f, "b"), num(f, "c")];
    const has = (a: F): boolean => {
      const t = fSub(a, fr(m));
      if (t.n === 0) return c > 0;
      if (t.n > 0) return true;
      return fCmp(vtx(t, fMul(fr(2 * b), t), fr(c)), fr(0)) > 0;
    };
    // 해가 없는 a 의 모임 [p, q] 를 격자(1/8)에서 찾고, 경계 바로 바깥은 해가 있는지 본다
    const fails: F[] = [];
    for (let n = -200; n <= 200; n += 1)
      if (!has(fr(n, 8))) fails.push(fr(n, 8));
    expect(fails.length, "해가 없는 a 가 있다").toBeGreaterThan(0);
    const p = fails[0]!;
    const q = fails[fails.length - 1]!;
    const eps = fr(1, 1000);
    expect(
      has(fSub(p, eps)) && has(fAdd(q, eps)),
      "경계 바로 바깥은 해가 있다",
    ).toBe(true);
    return fNum(fAdd(p, q));
  },

  "08": (f) => {
    if (f.mode === 0) {
      const [B, C] = [num(f, "B"), num(f, "C")];
      const r = relOf(num(f, "r"));
      // 모든 x 에서 ax²+Bx+(a−C) rel 0 — 볼록한 쪽이 맞고 꼭짓점의 값이 부등호를 만족
      const as = intsIn(
        -100,
        100,
        (a) =>
          a !== 0 &&
          (r === "le" ? a < 0 : a > 0) &&
          relHolds(r, vtx(a, B, a - C), fr(0)),
      );
      return r === "le" ? as[as.length - 1]! : as[0]!;
    }
    if (f.mode === 1) {
      const [A, be, gm] = [num(f, "A"), num(f, "beta"), num(f, "gamma")];
      const r = relOf(num(f, "r"));
      return intsIn(-60, 60, (k) =>
        relHolds(r, vtx(A, -2 * (k + be), gm * (k + be)), fr(0)),
      ).length;
    }
    if (f.mode === 2) {
      const [u, w] = [num(f, "u"), num(f, "w")];
      const r = relOf(num(f, "r"));
      return {
        v: "a",
        prop: (a) =>
          a.n < 0 &&
          relHolds(
            r,
            vtx(a, fMul(fr(-2), fAdd(a, fr(u))), fAdd(fMul(fr(2), a), fr(w))),
            fr(0),
          ),
      };
    }
    const [m, c] = [num(f, "m"), num(f, "c")];
    const ks = intsIn(-60, 60, (k) => {
      const t = k - m;
      if (t === 0) return c > 0;
      return t > 0 && fCmp(vtx(t, -2 * t, c), fr(0)) > 0;
    });
    return ks[0]! + ks[ks.length - 1]!;
  },

  "09": (f) => {
    if (f.mode === 0) {
      const [p, c] = [num(f, "p"), num(f, "c")];
      // 해가 없다 ⇔ 최솟값이 0 이상
      return intsIn(
        -60,
        60,
        (n) => fCmp(vtx(1, 2 * (n + p), c * (n + p)), fr(0)) >= 0,
      ).length;
    }
    if (f.mode === 1) {
      const b = num(f, "b");
      const as = intsIn(
        -30,
        30,
        (a) => a < 0 && fCmp(vtx(a, b - a, -b), fr(0)) <= 0,
      );
      expect(as, "해가 없는 a 는 하나").toHaveLength(1);
      return as[0]!;
    }
    const [m, c] = [num(f, "m"), num(f, "c")];
    const ks = intsIn(-60, 60, (k) => {
      const t = k - m;
      if (t === 0) return true;
      return t < 0 && fCmp(vtx(t, 2 * t, -c), fr(0)) < 0;
    });
    return ks[0]! + ks[ks.length - 1]!;
  },

  "02": (f) => {
    if (f.mode === 0) {
      const ints = intsWhere(
        qPred(num(f, "a"), num(f, "b"), num(f, "c"), num(f, "r")),
      );
      expect(ints.length, "해가 양쪽으로 막혀 있어야 한다").toBeLessThan(50);
      return f.kind === 0 ? ints.length : sum(ints);
    }
    if (f.mode === 1) {
      // 두 근을 근의 공식으로 **따로** 구해 뺀다(제품의 근호 정리를 안 거친다)
      const b = num(f, "b");
      const c = num(f, "c");
      const D = b * b - 4 * c;
      return (-b + Math.sqrt(D)) / 2 - (-b - Math.sqrt(D)) / 2;
    }
    const [A, B, C] = [num(f, "A"), num(f, "B"), num(f, "C")];
    const sol = chartSolve(qPred(A, B, C, num(f, "r")), roots(A, B, C));
    const [p, q] = centerRadius(sol);
    return [fNum(fAdd(p, q)), fNum(fMul(p, q))][num(f, "exprId")]!;
  },

  "03": (f) => {
    const r = relOf(num(f, "r"));
    if (f.mode === 0) {
      const g = qv(1, num(f, "b"), num(f, "c"));
      const p = fr(num(f, "p"));
      const q = fr(num(f, "q"));
      return intsWhere((x) => relHolds(r, g(x), fAbs(fAdd(fMul(p, x), q))))
        .length;
    }
    if (f.mode === 1) {
      const p = num(f, "p");
      const q = num(f, "q");
      const pred: Pred = (x) =>
        relHolds(r, fAdd(fAdd(fMul(x, x), fMul(fr(p), fAbs(x))), fr(q)), fr(0));
      const crit = [fr(0), ...roots(1, p, q), ...roots(1, -p, q)];
      return { v: "x", exact: only(chartSolve(pred, crit), "해는 한 구간") };
    }
    const b = num(f, "b");
    const c = fr(num(f, "c"));
    const g = qv(1, b, num(f, "d"));
    const ints = intsWhere((x) => relHolds(r, fAbs(g(x)), c));
    return f.kind === 0 ? ints.length : sum(ints);
  },

  "04": (f) => {
    if (f.mode === 0) {
      const a = num(f, "a");
      const b = num(f, "b");
      return [a + b, a * b, a - b][num(f, "exprId")]!;
    }
    if (f.mode === 1) {
      const a = num(f, "a");
      const b = num(f, "b");
      const B2 = num(f, "s") * a;
      const C2 = num(f, "t") * b;
      const sol = chartSolve(qPred(1, B2, C2, num(f, "r2")), roots(1, B2, C2));
      return { v: "x", exact: only(sol, "둘째 부등식의 해는 한 구간") };
    }
    // a<0 인 한 벌(k=1)로 세운다 — 답은 k 에 기대지 않는다
    const [p1, p2] = [num(f, "p1"), num(f, "p2")];
    const [a, b, c] = [-p1 * p2, p1 + p2, -1];
    const first = only(
      chartSolve(qPred(a, b, c, 1), roots(a, b, c)),
      "첫 부등식의 해는 한 구간",
    );
    expect(fNum(first.lo!), "첫 해의 왼쪽 끝 1/p2").toBeCloseTo(1 / p2, 12);
    expect(fNum(first.hi!), "첫 해의 오른쪽 끝 1/p1").toBeCloseTo(1 / p1, 12);
    return sum(intsWhere(qPred(c, b, a, 1)));
  },
};

/** 문자 하나를 값에 매긴 이차부등식 `A x² + B x + C rel 0` 한 줄 */
function want(
  what: string,
  A: number,
  B: number,
  C: number,
  code: number,
): ShownSpec["wants"][number] {
  return { what, pred: qPred(A, B, C, code), crit: roots(A, B, C) };
}

const REL_GT = 1;
const REL_GE = 3;
const REL_LT = 0;

const SHOWN: Record<string, (f: Fact) => ShownSpec> = {
  "14": (f): ShownSpec => {
    if (f.mode === 1) {
      const [lm, lc] = [num(f, "lm"), num(f, "lc")];
      const [a, b, c] = [num(f, "a"), num(f, "b"), num(f, "c")];
      const crit = [fr(lc, lm), ...roots(a, b, c)];
      return {
        env: {},
        wants: [
          {
            what: "일차부등식",
            pred: (x) => relHolds(relOf(num(f, "lr")), fMul(fr(lm), x), fr(lc)),
            crit,
          },
          { what: "이차부등식", pred: qPred(a, b, c, num(f, "r")), crit },
        ],
      };
    }
    const { p1, p2, crit } = qPair(f);
    if (f.mode === 2)
      return { env: {}, wants: [{ what: "A<B<C", pred: and(p1, p2), crit }] };
    return {
      env: {},
      wants: [
        { what: "첫 이차부등식", pred: p1, crit },
        { what: "둘째 이차부등식", pred: p2, crit },
      ],
    };
  },
  "15": (f): ShownSpec => {
    const [a, b, c] = [num(f, "a"), num(f, "b"), num(f, "c")];
    const quad = qPred(a, b, c, num(f, "r"));
    const qc = roots(a, b, c);
    if (f.mode === 2) {
      const K = num(f, "K");
      const absP: Pred = (x) =>
        fCmp(fSub(fMul(x, x), fMul(fr(K), fAbs(x))), fr(0)) < 0;
      const crit = [fr(0), fr(K), fr(-K), ...qc];
      return {
        env: {},
        wants: [
          { what: "x²−K|x|<0", pred: absP, crit, mustContain: "|" },
          { what: "이차부등식", pred: quad, crit: qc },
        ],
      };
    }
    const s0 = fr(num(f, "s0"));
    const t = fr(num(f, "t"));
    const absP: Pred = (x) =>
      relHolds(relOf(num(f, "ra")), fAbs(fSub(x, s0)), t);
    const crit = [fSub(s0, t), fAdd(s0, t), ...qc];
    const wants = [
      { what: "절댓값 부등식", pred: absP, crit, mustContain: "|" },
      { what: "이차부등식", pred: quad, crit },
    ];
    if (f.mode !== 0) return { env: {}, wants };
    const s = chartSolve(and(absP, quad), crit)[0]!;
    return {
      env: { a: s.lo!, b: s.hi! },
      wants: [
        ...wants,
        {
          what: "해 a·b 의 등호",
          pred: and(absP, quad),
          crit,
          mustContain: "b",
        },
      ],
    };
  },
  "16": (f): ShownSpec => {
    if (f.mode === 0) {
      const [u, v, w, e, side] = ["u", "v", "w", "e", "side"].map((k) =>
        num(f, k),
      ) as [number, number, number, number, number];
      const k = 2;
      const first = qPred(1, -(u + v), u * v, 2);
      const given =
        side > 0
          ? { lo: w, hi: v, lc: false, hc: true }
          : { lo: u, hi: w, lc: true, hc: false };
      return {
        env: { k: fr(k) },
        wants: [
          { what: "첫 이차부등식", pred: first, crit: [fr(u), fr(v)] },
          {
            what: "k 가 든 이차부등식",
            pred: qPred(1, k + e - w, -w * k - w * e, 0),
            crit: roots(1, k + e - w, -w * k - w * e),
          },
          {
            what: "주어진 해",
            pred: (x) =>
              tivHas(
                {
                  lo: fr(given.lo),
                  loC: given.lc,
                  hi: fr(given.hi),
                  hiC: given.hc,
                },
                x,
              ),
            crit: [fr(given.lo), fr(given.hi)],
            mustContain: side > 0 ? "<x\\le" : "\\le x<",
          },
        ],
      };
    }
    if (f.mode === 1) {
      const [beta, a, b] = [num(f, "beta"), num(f, "a"), num(f, "b")];
      const p1 = qPred(1, beta, -a, 0);
      const p2 = qPred(1, beta, b, 3);
      const crit = [...roots(1, beta, -a), ...roots(1, beta, b)];
      const sol = chartSolve(and(p1, p2), crit);
      return {
        env: { a: fr(a), b: fr(b) },
        wants: [
          { what: "a 가 든 부등식", pred: p1, crit, mustContain: "a" },
          { what: "b 가 든 부등식", pred: p2, crit, mustContain: "b" },
          ...sol.map((s, i) => ({
            what: `주어진 해 ${i + 1}`,
            pred: (x: F) => tivHas(s, x),
            crit,
          })),
        ],
      };
    }
    const [u, v, al, be] = [
      num(f, "u"),
      num(f, "v"),
      num(f, "al"),
      num(f, "be"),
    ];
    const k = 1;
    return {
      env: { k: fr(k) },
      wants: [
        {
          what: "첫 이차부등식",
          pred: qPred(1, -(u + v), u * v, 2),
          crit: [fr(u), fr(v)],
        },
        {
          what: "k 가 든 이차부등식",
          pred: qPred(1, -(2 * k + al + be), (k + al) * (k + be), 1),
          crit: [fr(k + al), fr(k + be)],
        },
      ],
    };
  },
  "17": (f): ShownSpec => ({
    env: {},
    wants: [],
    numbers:
      f.mode === 0
        ? [num(f, "d")]
        : f.mode === 1
          ? [num(f, "W"), num(f, "H"), num(f, "S1"), num(f, "S2")]
          : [num(f, "d"), num(f, "P"), num(f, "S")],
  }),
  "10": (f): ShownSpec => {
    const [p, qE] = [num(f, "p"), num(f, "q")];
    const range = {
      what: "범위 p≤x≤q",
      pred: (x: F) => fCmp(x, fr(p)) >= 0 && fCmp(x, fr(qE)) <= 0,
      crit: [fr(p), fr(qE)],
      mustContain: "\\le x\\le",
    };
    if (f.mode === 0) {
      const k = 5;
      const [h, e, s] = [num(f, "h"), num(f, "e"), num(f, "s")];
      return {
        env: { k: fr(k) },
        wants: [range, want("−x²+2hx+e+sk", -1, 2 * h, e + s * k, num(f, "r"))],
      };
    }
    if (f.mode === 1) {
      const a = 3;
      const [A, c] = [num(f, "A"), num(f, "c")];
      return {
        env: { a: fr(a) },
        wants: [range, want("Ax²+ax−ca", A, a, -c * a, num(f, "r"))],
      };
    }
    return { env: {}, wants: [range] };
  },
  "11": (f): ShownSpec => {
    if (f.mode === 0) {
      const [a, b, c0, m, n] = ["a", "b", "c0", "m", "n"].map((k) =>
        num(f, k),
      ) as [number, number, number, number, number];
      const pred: Pred = (x) =>
        relHolds(">", qv(1, -a, c0)(x), fAdd(fMul(fr(m), x), fr(n)));
      const crit = roots(1, -(a + m), c0 - n);
      const sol = chartSolve(pred, crit);
      return {
        env: { b: fr(b) },
        wants: sol.map((s, i) => ({
          what: `주어진 범위 ${i + 1}`,
          pred: (x: F) => tivHas(s, x),
          crit,
          ...(i === 1 ? { mustContain: "b" } : {}),
        })),
      };
    }
    if (f.mode === 2) {
      const [a, b, c0] = [num(f, "a"), num(f, "b"), num(f, "c0")];
      const pred: Pred = (x) => relHolds(">", qv(-1, a, c0)(x), fr(b));
      return {
        env: {},
        wants: [{ what: "주어진 범위", pred, crit: roots(1, -a, b - c0) }],
      };
    }
    return { env: {}, wants: [] };
  },
  "12": (): ShownSpec => ({ env: {}, wants: [] }),
  "13": (f): ShownSpec => ({
    env: {},
    wants: [],
    numbers:
      f.mode === 0
        ? [num(f, "L"), num(f, "S")]
        : f.mode === 1
          ? [num(f, "v"), num(f, "H")]
          : [num(f, "P"), num(f, "N"), num(f, "d"), num(f, "R")],
  }),
  "05": (f): ShownSpec => {
    if (f.mode === 2) {
      const [u, v, s, sg] = [
        num(f, "u"),
        num(f, "v"),
        num(f, "s"),
        num(f, "sigma"),
      ];
      const r = relOf(num(f, "rel"));
      const g = qv(1, -(u + v), u * v);
      const first = qPred(1, -(u + v), u * v, 2);
      const crit = [fr(u), fr(v)];
      return {
        env: { a: fr(1), b: fr(-(u + v)), c: fr(u * v) },
        wants: [
          { what: "ax²+bx+c≤0", pred: first, crit, mustContain: "ax^{2}" },
          { what: "주어진 해", pred: first, crit, mustContain: "\\le x" },
          {
            what: "a(x−s)²±b(x−s)+c",
            pred: (x) => relHolds(r, g(fMul(fr(sg), fSub(x, fr(s)))), fr(0)),
            crit: [fr(s + u), fr(s + v), fr(s - u), fr(s - v)],
          },
        ],
      };
    }
    const [sgn, u, v] = [num(f, "sgn"), num(f, "u"), num(f, "v")];
    const pred1 = qPred(sgn, -sgn * (u + v), sgn * u * v, num(f, "rel1"));
    const crit = [fr(u), fr(v)];
    const sol1 = chartSolve(pred1, crit);
    const wants = sol1.map((s, i) => ({
      what: `주어진 해 ${i + 1}`,
      pred: sol1.length === 1 ? pred1 : (x: F) => tivHas(s, x),
      crit,
    }));
    if (f.mode !== 1) return { env: {}, wants };
    const [p, qq] = [num(f, "p"), num(f, "q")];
    const g = qv(sgn, -sgn * (u + v), sgn * u * v);
    const r2 = relOf(num(f, "rel2"));
    const crit2 = [fr(u - qq, p), fr(v - qq, p)];
    const s2 = chartSolve(
      (x) => relHolds(r2, g(fAdd(fMul(fr(p), x), fr(qq))), fr(0)),
      crit2,
    )[0]!;
    return {
      env: { m: s2.lo!, n: s2.hi! },
      wants: [
        ...wants,
        {
          what: "해 m·n 의 등호",
          pred: (x) => tivHas(s2, x),
          crit: crit2,
          mustContain: "n",
        },
      ],
    };
  },
  "06": (f): ShownSpec => {
    const k = 3;
    if (f.mode === 0) {
      const [A, sg, be, gm, de] = ["A", "sigma", "beta", "gamma", "delta"].map(
        (key) => num(f, key),
      ) as [number, number, number, number, number];
      return {
        env: { k: fr(k) },
        wants: [
          want(
            "k 가 든 이차부등식",
            A,
            sg * (k + be),
            gm * k + de,
            num(f, "r"),
          ),
        ],
      };
    }
    const [m, c] = [num(f, "m"), num(f, "c")];
    return {
      env: { k: fr(k) },
      wants: [want("kx²+2mx+k+c", k, 2 * m, k + c, num(f, "r"))],
    };
  },
  "07": (f): ShownSpec => {
    if (f.mode === 0) {
      const a = 5;
      const [A, B, sg] = [num(f, "A"), num(f, "B"), num(f, "sigma")];
      return {
        env: { a: fr(a) },
        wants: [want("Ax²+Bx±a", A, B, sg * a, num(f, "r"))],
      };
    }
    const a = 7;
    const [m, b, c] = [num(f, "m"), num(f, "b"), num(f, "c")];
    const t = a - m;
    return {
      env: { a: fr(a) },
      wants: [want("(a−m)x²+2b(a−m)x+c", t, 2 * b * t, c, REL_GT)],
    };
  },
  "08": (f): ShownSpec => {
    if (f.mode === 0) {
      const a = -2;
      const [B, C] = [num(f, "B"), num(f, "C")];
      return {
        env: { a: fr(a) },
        wants: [want("ax²+Bx rel C−a", a, B, a - C, num(f, "r"))],
      };
    }
    if (f.mode === 1) {
      const k = 2;
      const [A, be, gm] = [num(f, "A"), num(f, "beta"), num(f, "gamma")];
      return {
        env: { k: fr(k) },
        wants: [
          want(
            "Ax²−2(k+β)x+γ(k+β)",
            A,
            -2 * (k + be),
            gm * (k + be),
            num(f, "r"),
          ),
        ],
      };
    }
    if (f.mode === 2) {
      const a = -3;
      const [u, w] = [num(f, "u"), num(f, "w")];
      return {
        env: { a: fr(a) },
        wants: [
          want("ax²−2(a+u)x+2a+w", a, -2 * (a + u), 2 * a + w, num(f, "r")),
        ],
      };
    }
    const k = 9;
    const [m, c] = [num(f, "m"), num(f, "c")];
    return {
      env: { k: fr(k) },
      wants: [want("(k−m)x²−2(k−m)x+c", k - m, -2 * (k - m), c, REL_GT)],
    };
  },
  "09": (f): ShownSpec => {
    if (f.mode === 0) {
      const n = 2;
      const [p, c] = [num(f, "p"), num(f, "c")];
      return {
        env: { n: fr(n) },
        wants: [want("x²+2(n+p)x+c(n+p)", 1, 2 * (n + p), c * (n + p), REL_LT)],
      };
    }
    if (f.mode === 1) {
      const a = -2;
      const b = num(f, "b");
      // 지면 `ax²+bx>ax+b` — 한쪽으로 모으면 ax²+(b−a)x−b>0
      return {
        env: { a: fr(a) },
        wants: [want("ax²+bx>ax+b", a, b - a, -b, REL_GT)],
      };
    }
    const k = 9;
    const [m, c] = [num(f, "m"), num(f, "c")];
    return {
      env: { k: fr(k) },
      wants: [want("(k−m)x²+2(k−m)x−c≥0", k - m, 2 * (k - m), -c, REL_GE)],
    };
  },

  "02": (f) => {
    if (f.mode === 0) {
      const [a, b, c] = [num(f, "a"), num(f, "b"), num(f, "c")];
      return {
        env: {},
        wants: [
          {
            what: "이차부등식",
            pred: qPred(a, b, c, num(f, "r")),
            crit: roots(a, b, c),
          },
        ],
      };
    }
    if (f.mode === 1) {
      return {
        env: {},
        wants: [
          {
            what: "이차부등식",
            pred: qPred(1, num(f, "b"), num(f, "c"), num(f, "r")),
            crit: [],
          },
        ],
      };
    }
    const [A, B, C] = [num(f, "A"), num(f, "B"), num(f, "C")];
    const pred = qPred(A, B, C, num(f, "r"));
    const crit = roots(A, B, C);
    const [p, q] = centerRadius(chartSolve(pred, crit));
    return {
      env: { p, q },
      wants: [
        { what: "이차부등식", pred, crit, mustContain: "x^{2}" },
        { what: "|x−p| rel q", pred, crit, mustContain: "|" },
      ],
    };
  },
  "03": (f) => {
    const r = relOf(num(f, "r"));
    if (f.mode === 0) {
      const [b, c, p, q] = [num(f, "b"), num(f, "c"), num(f, "p"), num(f, "q")];
      const g = qv(1, b, c);
      const pred: Pred = (x) =>
        relHolds(r, g(x), fAbs(fAdd(fMul(fr(p), x), fr(q))));
      return {
        env: {},
        wants: [
          {
            what: "절댓값 이차부등식",
            pred,
            crit: [
              fr(-q, p),
              ...roots(1, b - p, c - q),
              ...roots(1, b + p, c + q),
            ],
          },
        ],
      };
    }
    if (f.mode === 1) {
      const [p, q] = [num(f, "p"), num(f, "q")];
      const pred: Pred = (x) =>
        relHolds(r, fAdd(fAdd(fMul(x, x), fMul(fr(p), fAbs(x))), fr(q)), fr(0));
      return {
        env: {},
        wants: [
          {
            what: "x²+p|x|+q",
            pred,
            crit: [fr(0), ...roots(1, p, q), ...roots(1, -p, q)],
          },
        ],
      };
    }
    const [b, c] = [num(f, "b"), num(f, "c")];
    const g = qv(1, b, num(f, "d"));
    return {
      env: {},
      wants: [
        {
          what: "|x²+bx| rel c",
          pred: (x) => relHolds(r, fAbs(g(x)), fr(c)),
          crit: [
            ...roots(1, b, num(f, "d") - c),
            ...roots(1, b, num(f, "d") + c),
          ],
        },
      ],
    };
  },
  "04": (f) => {
    if (f.mode === 0) {
      const [a, b] = [num(f, "a"), num(f, "b")];
      const pred = qPred(1, a, b, num(f, "r"));
      const crit = roots(1, a, b);
      const sol = chartSolve(pred, crit);
      return {
        env: { a: fr(a), b: fr(b) },
        wants: [
          { what: "x²+ax+b", pred, crit, mustContain: "a" },
          ...sol.map((s, i) => ({
            what: `주어진 해 ${i + 1}`,
            pred: sol.length === 1 ? pred : (x: F) => tivHas(s, x),
            crit,
          })),
        ],
      };
    }
    if (f.mode === 1) {
      const [a, b, c0] = [num(f, "a"), num(f, "b"), num(f, "c0")];
      const pred1 = qPred(a, b, c0, num(f, "r1"));
      const crit1 = roots(a, b, c0);
      const sol1 = chartSolve(pred1, crit1);
      const B2 = num(f, "s") * a;
      const C2 = num(f, "t") * b;
      return {
        env: { a: fr(a), b: fr(b) },
        wants: [
          {
            what: "첫 이차부등식",
            pred: pred1,
            crit: crit1,
            mustContain: "ax^{2}",
          },
          ...sol1.map((s, i) => ({
            what: `주어진 해 ${i + 1}`,
            pred: (x: F) => tivHas(s, x),
            crit: crit1,
          })),
          {
            what: "둘째 이차부등식",
            pred: qPred(1, B2, C2, num(f, "r2")),
            crit: roots(1, B2, C2),
          },
        ],
      };
    }
    const [p1, p2] = [num(f, "p1"), num(f, "p2")];
    const [a, b, c] = [-p1 * p2, p1 + p2, -1];
    return {
      env: {},
      wants: [
        {
          what: "주어진 해 1/p2<x<1/p1",
          pred: qPred(a, b, c, 1),
          crit: roots(a, b, c),
          mustContain: "dfrac",
        },
      ],
    };
  },
};

/** 발문의 `y=…`·`f(x)=…` 식 하나 — 문자는 env 로 매기고 x 에 값을 넣어 facts 의 함수와 맞댄다. */
type Curve = { what: string; prefix: string; fn: (x: F) => F };

function hasCurve(content: string, env: Env, c: Curve): boolean {
  const pts = probePoints([]).slice(0, 40);
  return mathSpans(content)
    .filter((s) => s.startsWith(c.prefix))
    .some((s) => {
      try {
        const body = s.slice(c.prefix.length);
        return pts.every((x) => fEq(evalTex(body, { ...env, x }), c.fn(x)));
      } catch {
        return false;
      }
    });
}

const line =
  (m: number, n: number) =>
  (x: F): F =>
    fAdd(fMul(fr(m), x), fr(n));

/** 그래프를 말로 주는 유형 — 발문의 식이 facts 의 함수와 같은가 */
const CURVES: Record<string, (f: Fact) => { env: Env; curves: Curve[] }> = {
  "10": (f) => {
    if (f.mode !== 2) return { env: {}, curves: [] };
    const a = 4;
    const [b1, c1, b2, c2] = [
      num(f, "b1"),
      num(f, "c1"),
      num(f, "b2"),
      num(f, "c2"),
    ];
    return {
      env: { a: fr(a) },
      curves: [
        { what: "f(x)", prefix: "f(x)=", fn: qv(1, b1, c1) },
        { what: "g(x)", prefix: "g(x)=", fn: qv(-1, b2, a + c2) },
      ],
    };
  },
  "11": (f) => {
    if (f.mode === 0) {
      const [a, c0, m, n] = [
        num(f, "a"),
        num(f, "c0"),
        num(f, "m"),
        num(f, "n"),
      ];
      return {
        env: { a: fr(a) },
        curves: [
          { what: "포물선", prefix: "y=", fn: qv(1, -a, c0) },
          { what: "직선", prefix: "y=", fn: line(m, n) },
        ],
      };
    }
    if (f.mode === 1) {
      const [A1, b1, c1, A2, b2, c2] = ["A1", "b1", "c1", "A2", "b2", "c2"].map(
        (k) => num(f, k),
      ) as [number, number, number, number, number, number];
      return {
        env: {},
        curves: [
          { what: "첫 포물선", prefix: "y=", fn: qv(A1, b1, c1) },
          { what: "둘째 포물선", prefix: "y=", fn: qv(A2, b2, c2) },
        ],
      };
    }
    const [a, b, c0] = [num(f, "a"), num(f, "b"), num(f, "c0")];
    return {
      env: { a: fr(a), b: fr(b) },
      curves: [
        { what: "포물선", prefix: "y=", fn: qv(-1, a, c0) },
        { what: "직선 y=b", prefix: "y=", fn: () => fr(b) },
      ],
    };
  },
  "12": (f) => {
    if (f.mode === 0) {
      const m = 2;
      const [p, q0, s, t] = [
        num(f, "p"),
        num(f, "q0"),
        num(f, "s"),
        num(f, "t"),
      ];
      return {
        env: { m: fr(m) },
        curves: [
          { what: "포물선", prefix: "y=", fn: qv(-1, p, q0) },
          { what: "직선 m(x−s)+t", prefix: "y=", fn: line(m, t - m * s) },
        ],
      };
    }
    const [m, n, c1] = [num(f, "m"), num(f, "n"), num(f, "c1")];
    if (f.mode === 1) {
      const k = 2;
      return {
        env: { k: fr(k) },
        curves: [
          { what: "포물선", prefix: "y=", fn: qv(1, k + num(f, "beta"), c1) },
          { what: "직선", prefix: "y=", fn: line(m, n) },
        ],
      };
    }
    const k = -3;
    return {
      env: { k: fr(k) },
      curves: [
        { what: "포물선", prefix: "y=", fn: qv(k, num(f, "b1"), 2 * k + c1) },
        { what: "직선", prefix: "y=", fn: line(m, k + n) },
      ],
    };
  },
};

describe("고등 공통수학1 이차부등식과 연립이차부등식 — 그래프 식", () => {
  it("발문의 함수식이 facts 의 이차함수·직선과 같다", () => {
    let checked = 0;
    eachProblem((p, key, number) => {
      const spec = CURVES[number];
      if (!spec) return;
      const { env, curves } = spec(p.facts);
      for (const c of curves) {
        expect(
          hasCurve(p.content, env, c),
          `${key}: 발문에 ${c.what} 식이 없다 — ${p.content}`,
        ).toBe(true);
        checked += 1;
      }
    });
    expect(
      checked,
      "그래프 식 대조가 하나도 안 돌면 이 검사는 장식이다",
    ).toBeGreaterThan(100);
  });
});

function eachProblem(
  fn: (p: HighProblem, key: string, number: string) => void,
): void {
  for (const entry of H1_QUAD_INEQ) {
    for (const seed of SEEDS) {
      for (let v = 0; v < VARIANTS; v += 1) {
        fn(generateHighProblem(entry.key, seed, v), entry.key, entry.rpmType);
      }
    }
  }
}

describe("고등 공통수학1 이차부등식과 연립이차부등식 — 등록", () => {
  it("색인 21유형을 등록 ∪ 보류로 덮고, 번호·제목·중단원이 색인 바이트와 같다", () => {
    expect(catalogRows.length, "색인 유형 수").toBe(21);
    const numbers = [
      ...H1_QUAD_INEQ.map((e) => e.rpmType),
      ...H1_QUAD_INEQ_HOLD.map((h) => h.key.split("|")[2]!),
    ];
    expect(numbers.sort()).toEqual(catalogRows.map((r) => r.number).sort());
    for (const e of H1_QUAD_INEQ) {
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
    for (const e of H1_QUAD_INEQ) {
      expect(sections.has(e.unitSection), `${e.key} — ${e.unitSection}`).toBe(
        true,
      );
    }
  });

  it("등록부·보류 목록에 들어 있다", () => {
    const keys = new Set(registeredHighTypes().map((e) => e.key));
    for (const e of H1_QUAD_INEQ) expect(keys.has(e.key), e.key).toBe(true);
    const holds = new Set(registeredHighHolds().map((h) => h.key));
    for (const h of H1_QUAD_INEQ_HOLD)
      expect(holds.has(h.key), h.key).toBe(true);
  });

  it("그래프가 있어야 하는 01 은 보류이고, 까닭이 물결 2 를 가리킨다", () => {
    const h = H1_QUAD_INEQ_HOLD.find((x) => x.key.endsWith("|01"));
    expect(h, "01 보류").toBeDefined();
    expect(h!.reason).toMatch(/funcGraph/);
  });
});

describe("고등 공통수학1 이차부등식과 연립이차부등식 — 값", () => {
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
    ).toBeGreaterThan(200);
  });
});

describe("고등 공통수학1 이차부등식과 연립이차부등식 — 오답", () => {
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
