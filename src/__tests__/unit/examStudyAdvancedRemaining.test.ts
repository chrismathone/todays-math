import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  ExamStudyDraft,
  ExamStudyFamily,
} from "@/contracts/examStudy.contract";
import {
  quadraticCoefficientReuseFamily as reuse,
  radicalInverseCircleFamily as radical,
  readQuadraticReuse,
  solveQuadraticReuse,
  readRadicalInverseCircle,
  solveRadicalInverseCircle,
  radicalDeletionWitnesses,
  radicalLineDeletionWitness,
  onRadical,
  onInverse,
} from "@/lib/examStudy/families/advanced/remaining";
import {
  Q,
  q,
  type ExactPoint,
  norm,
  determinant,
  interval,
  polynomial,
} from "@/lib/examStudy/families/advanced/remainingExact";

const families = [reuse, radical];
function all(f: ExamStudyFamily): ExamStudyDraft[] {
  if (f.paramDomain.kind !== "finite")
    throw new Error("finite authored domain required");
  return f.paramDomain.enumerate().map((_, i) => f.generate(0, i));
}
function bad(
  f: ExamStudyFamily,
  item: ExamStudyDraft,
  patch: Partial<ExamStudyDraft>,
) {
  const verification = f.verify({ ...item, ...patch });
  expect(verification.valid).toBe(false);
  expect(verification.checks).toEqual([]);
  expect(verification.errors.length).toBeGreaterThan(0);
}
const equal = (a: Q, b: Q) => expect(a.toString()).toBe(b.toString());
const squaredDistance = (a: ExactPoint, b: ExactPoint) =>
  a[0].sub(b[0]).sq().add(a[1].sub(b[1]).sq());

describe("two remaining advanced demands: whole finite domains", () => {
  for (const [f, count] of [
    [reuse, 25],
    [radical, 7],
  ] as const) {
    it(`${f.id}: ${count} independent tuples, correct evidence and deterministic reachability`, () => {
      expect(f.paramDomain.kind === "finite" && f.paramDomain.size).toBe(count);
      expect(f.evidence?.sampleCount).toBe(count);
      expect(f.evidence?.testFile).toBe(
        "src/__tests__/unit/examStudyAdvancedRemaining.test.ts",
      );
      expect(f.evidence?.checks).toEqual([
        "independent-solution",
        "essential-conditions",
      ]);
      expect(f.formats).toEqual(["단답형"]);
      expect(f.representation).toBe("text");
      expect(f.figureKinds).toEqual([]);
      const printed = new Set<string>(),
        canonical = new Set<string>();
      all(f).forEach((item, i) => {
        const verified = f.verify(item);
        expect(verified.errors, `${i}: ${item.content}`).toEqual([]);
        expect(verified.valid).toBe(true);
        expect(verified.checks).toEqual(f.evidence!.checks);
        expect(f.generate(0, i)).toEqual(item);
        expect(f.generate(count, i)).toEqual(item);
        expect(f.generate(-count, i)).toEqual(item);
        expect(item.figureSpec).toBeNull();
        expect(item.questionType).toBe("단답형");
        const textKey = item.content,
          logicalKey = JSON.stringify(f.canonicalParams(item));
        expect(printed.has(textKey)).toBe(false);
        expect(canonical.has(logicalKey)).toBe(false);
        printed.add(textKey);
        canonical.add(logicalKey);
        bad(f, item, { answer: "틀린 답" });
        bad(f, item, {
          solution:
            "주어진 조건을 이용하여 계산하면 위 정답을 얻는다. 이것으로 충분히 확인하였으며 계산은 생략한다.",
        });
        bad(f, item, { solution: item.solution.replace("이다.", "아니다.") });
        bad(f, item, {
          solution: item.solution + " 따라서 정답은 다른 값이다.",
        });
        bad(f, item, { parameters: { ...item.parameters, a: 999 } });
        bad(f, item, { questionType: "객관식" });
        bad(f, item, {
          figureSpec: { version: "graph-1", points: [[999, 999]] },
        });
      });
      expect(printed.size).toBe(count);
      expect(canonical.size).toBe(count);
      expect(() => f.generate(0, -1)).toThrow();
      expect(() => f.generate(Number.NaN, 0)).toThrow();
    });
  }
});

describe("M3: printed vertex/point → interpolation → a different quadratic", () => {
  it("independently recovers every first polynomial and checks the second by completing its square", () => {
    const mathematical = new Set<string>(),
      signs = new Set<number>();
    all(reuse).forEach((item) => {
      // This test oracle reads ONLY the printed numbers, never parameters,
      // generator facts, its answer or solveQuadraticReuse's interpolation.
      const m = item.content.match(
        /V\((-?\d+), (-?\d+)\).*P\((-?\d+), (-?\d+)\)/,
      )!;
      const [h, k, px, py] = m.slice(1).map(Number) as [
        number,
        number,
        number,
        number,
      ];
      const a = (py - k) / (px - h) ** 2,
        b = -2 * a * h,
        c = k + a * h * h;
      expect(a * h * h + b * h + c).toBe(k);
      expect(a * px * px + b * px + c).toBe(py);
      expect(a * (2 * h - px) ** 2 + b * (2 * h - px) + c).toBe(py);
      expect(new Set([a, b, c]).size).toBe(3);
      expect(a).not.toBe(0);
      expect(c).not.toBe(0);
      const vx = q(-a, 2 * c),
        vy = q(4 * b * c - a * a, 4 * c);
      expect(item.answer).toBe(`(${vx}, ${vy})`);
      for (const x of [-5, -1, 0, 2, 7]) {
        equal(q(c * x * x + a * x + b), q(c).mul(q(x).sub(vx).sq()).add(vy));
      }
      const s = solveQuadraticReuse(readQuadraticReuse(item));
      equal(s.a, q(a));
      equal(s.b, q(b));
      equal(s.c, q(c));
      equal(s.vertex[0], vx);
      equal(s.vertex[1], vy);
      mathematical.add(`${a},${b},${c}`);
      signs.add(Math.sign(c));
    });
    expect(mathematical.size).toBe(25);
    expect([...signs].sort()).toEqual([-1, 1]);
  });
  it("rejects deleted givens/reordering and proves each stage carries information", () => {
    all(reuse).forEach((item) => {
      const p = readQuadraticReuse(item),
        s = solveQuadraticReuse(p);
      for (const content of [
        item.content.replace(/꼭짓점 V\([^)]*\)와 /, ""),
        item.content.replace(/그래프 위의 점 P\([^)]*\)/, "다른 점"),
        item.content.replace("g(x)=cx²+ax+b", "g(x)=ax²+bx+c"),
        item.content.replace("꼭짓점 좌표를", "축의 방정식을"),
      ])
        bad(reuse, item, { content });
      bad(reuse, item, {
        solution: item.solution.replace(
          "전개하면 (a,b,c)=",
          "전개하면 (c,a,b)=",
        ),
      });
      bad(reuse, item, { answer: `(${p.h}, ${p.k})` });
      // Delete P: a free nonzero A still has the same printed vertex; the
      // requested second vertex changes. k≠0 ensures a/(a h²+k) is nonconstant.
      const alternateA = [-5, -4, 3, 4]
        .map((n) => q(n))
        .find((a) => !a.eq(s.a) && !a.mul(p.h.sq()).add(p.k).eq(q(0)))!;
      const alternateC = alternateA.mul(p.h.sq()).add(p.k);
      const alternativeAxis = alternateA.neg().div(alternateC.mul(q(2)));
      expect(alternativeAxis.eq(s.vertex[0])).toBe(false);
      // Delete V: b changes and c compensates to preserve f(P); at least one
      // nondegenerate polynomial has a different second vertex.
      const outputs = [1, 2, 3, 4]
        .map((delta) => {
          const c = s.c.sub(q(delta).mul(p.px));
          return c.eq(q(0))
            ? null
            : [
                s.a.neg().div(c.mul(q(2))),
                s.b.add(q(delta)).sub(s.a.sq().div(c.mul(q(4)))),
              ];
        })
        .filter(Boolean) as Q[][];
      expect(
        outputs.some((v) => !v[0]!.eq(s.vertex[0]) || !v[1]!.eq(s.vertex[1])),
      ).toBe(true);
    });
  });
});

/** Separate integer-coordinate oracle. The monic z polynomial is factored
 * exactly after finding its two integer roots, proving the list complete over
 * the reals; this is not an arbitrary finite sampling of continuous points. */
function coordinateOracle(item: ExamStudyDraft) {
  const m = item.content.match(
    /f\(x\)=√\(\((-?\d+)\)x\+\((-?\d+)\)\).*정의역은 \[([^,]+), (-?\d+)\].*C\((-?\d+), (-?\d+)\)/,
  )!;
  const a = Number(m[1]),
    k = Number(m[2]),
    upper = Number(m[4]),
    cx = Number(m[5]),
    cy = Number(m[6]);
  const lower = -k / a,
    cap = a * upper + k,
    N = cx * cx + cy * cy;
  const bz = a * a - 2 * k,
    dz = k * k - a * a * N;
  const roots = Array.from({ length: 401 }, (_, i) => i - 200).filter(
    (z) => z * z + bz * z + dz === 0,
  );
  expect(roots).toHaveLength(2);
  expect(-(roots[0]! + roots[1]!)).toBe(bz);
  expect(roots[0]! * roots[1]!).toBe(dz);
  const candidates = roots
    .filter((z) => z >= 0)
    .flatMap((z) => (z === 0 ? [0] : [-Math.sqrt(z), Math.sqrt(z)]));
  const accepted = candidates.flatMap((t) => {
    expect(Number.isInteger(t)).toBe(true);
    const x = (t * t - k) / a,
      ax = x,
      ay = t,
      bx = t,
      by = x;
    if (
      t < 0 ||
      ax < lower ||
      ax > upper ||
      bx < 0 ||
      bx * bx > cap ||
      ax === bx
    )
      return [];
    if (a * ax + k !== ay * ay || a * by + k !== bx * bx) return [];
    const det = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (!det) return [];
    const an = ax * ax + ay * ay,
      bn = bx * bx + by * by;
    const centerXNumerator = (bn - an) * (cy - ay) - (by - ay) * (N - an);
    const centerYNumerator = (bx - ax) * (N - an) - (bn - an) * (cx - ax);
    if (centerXNumerator !== 0) return [];
    expect(centerYNumerator).toBe(0);
    expect(an).toBe(N);
    expect(bn).toBe(N);
    return [{ t, x, b: x + t, det }];
  });
  expect(accepted).toHaveLength(1);
  expect(item.answer).toBe(String(accepted[0]!.b));
  return { a, k, upper, N, roots, candidates, accepted: accepted[0]! };
}

describe("common2: real radical/inverse/slanted-line/circumcircle branches", () => {
  it("factors every printed circle polynomial, tests every sign and domain branch in the original equations", () => {
    const expected = [
      { roots: [1, 4], t: 1, b: -1 },
      { roots: [1, 16], t: 1, b: -7 },
      { roots: [1, 9], t: 1, b: -2 },
      { roots: [1, 16], t: 1, b: -3 },
      { roots: [-8, 9], t: 3, b: 11 },
      { roots: [-20, 16], t: 4, b: 12 },
      { roots: [0, 9], t: 0, b: -5 },
    ];
    const mathKeys = new Set<string>(),
      rejected = new Set<string>();
    all(radical).forEach((item, i) => {
      const oracle = coordinateOracle(item),
        p = readRadicalInverseCircle(item),
        s = solveRadicalInverseCircle(p);
      expect(oracle.roots).toEqual(expected[i]!.roots);
      expect(oracle.accepted.t).toBe(expected[i]!.t);
      expect(oracle.accepted.b).toBe(expected[i]!.b);
      expect(s.zs.map(String)).toEqual(oracle.roots.map(String));
      equal(s.accepted.t!, q(oracle.accepted.t));
      equal(s.accepted.b!, q(oracle.accepted.b));
      equal(s.accepted.det!, q(oracle.accepted.det));
      s.branches
        .filter((b) => b.reason !== "허용")
        .forEach((b) => rejected.add(b.reason));
      mathKeys.add(`${oracle.a},${oracle.k},${oracle.upper},${oracle.N}`);
    });
    expect(mathKeys.size).toBe(7);
    expect(rejected).toContain("z<0이므로 실수 t가 없다");
    expect(rejected).toContain("제곱 전 t≥0 조건 위반");
    expect(rejected).toContain("원함수 또는 역함수의 명시된 정의역 밖");
  });
  it("rejects missing/changed inverse, radical, line, circle, domains and a vacuous existence condition", () => {
    all(radical).forEach((item) => {
      const changed = [
        item.content.replace("g는 f의 역함수이며 ", ""),
        item.content.replace("g는 f의 역함수", "g는 f와 같은 함수"),
        item.content.replace(
          "점 B는 y=g(x)의 그래프 위에",
          "점 B는 좌표평면 위에",
        ),
        item.content.replace("점 B는 y=g(x)", "점 B는 y=f(x)"),
        item.content.replace(
          "점 A는 y=f(x)의 그래프 위에",
          "점 A는 좌표평면 위에",
        ),
        item.content.replace("y=-x+b", "y=-2x+b"),
        item.content.replace("직선 ℓ: y=-x+b 위의", "좌표평면 위의"),
        item.content.replace("의 중심은 y축 위에 있다", "은 존재한다"),
        item.content.replace(
          "의 중심은 y축 위에 있다",
          "의 중심은 x축 위에 있다",
        ),
        item.content.replace(/C\((-?\d+), (-?\d+)\)/, "C(999, 998)"),
        item.content.replace("서로 다른 점", "같은 점"),
        item.content.replace("한 직선 위에 있지 않다", "한 직선 위에 있다"),
        item.content.replace(
          /g의 정의역은 \[0, √\(\d+\)\]/,
          "g의 정의역은 모든 실수",
        ),
        item.content.replace(
          /g의 정의역은 \[0, √\(\d+\)\]/,
          "g의 정의역은 [0, √(999)]",
        ),
        item.content.replace(/의 정의역은 \[[^\]]+\]/, "의 정의역은 모든 실수"),
      ];
      changed.forEach((content) => {
        expect(content).not.toBe(item.content);
        bad(radical, item, { content });
      });
      for (const [before, after] of [
        ["t=u이다", "t=-u이다"],
        ["H=J를 만족한다", "H=-J를 만족한다"],
        ["외심은 (0,0)이다", "외심은 (1,0)이다"],
        ["y≥0을 먼저 보존", "y≤0을 먼저 보존"],
      ]) {
        const solution = item.solution.replace(before!, after!);
        expect(solution).not.toBe(item.solution);
        bad(radical, item, { solution });
      }
    });
  });
  it("rejects the actual positive branch outside the domain and proves the upper bound selects the unique answer", () => {
    all(radical).forEach((item) => {
      const p = readRadicalInverseCircle(item),
        s = solveRadicalInverseCircle(p);
      const excluded = s.branches.filter(
        (b) => b.t && b.t.cmp(q(0)) >= 0 && b.reason.includes("정의역 밖"),
      );
      for (const branch of excluded) {
        const t = branch.t!,
          x = t.sq().sub(p.k).div(p.a),
          wrong = x.add(t);
        expect(wrong.eq(s.accepted.b!)).toBe(false);
        bad(radical, item, { answer: wrong.toString() });
        const enlarged = { ...p, upper: x, cap: t.sq() };
        expect(() => solveRadicalInverseCircle(enlarged)).toThrow("유일하지");
      }
      // Negative t from the squared equation cannot satisfy y=sqrt(...), even
      // when its square and resulting x lie in the allowed radicand interval.
      const negative = s.branches.find(
        (b) => b.t && b.t.cmp(q(0)) < 0 && b.t.sq().cmp(p.cap) <= 0,
      );
      if (negative) {
        const t = negative.t!,
          x = t.sq().sub(p.k).div(p.a);
        expect(onRadical(p, [x, t])).toBe(false);
        expect(onInverse(p, [t, x])).toBe(false);
        bad(radical, item, { answer: x.add(t).toString() });
      }
    });
  });
  it("constructs exact counterexamples showing each graph incidence and the nontrivial circle constraint matter", () => {
    all(radical).forEach((item) => {
      const p = readRadicalInverseCircle(item),
        answer = Q.read(item.answer);
      const witnesses = radicalDeletionWitnesses(p, answer);
      expect(witnesses.map((w) => w.omitted)).toEqual([
        "radical",
        "inverse",
        "circle",
      ]);
      for (const w of witnesses) {
        expect(w.b.eq(answer)).toBe(false);
        equal(w.A[0].add(w.A[1]), w.b);
        equal(w.B[0].add(w.B[1]), w.b);
        expect(determinant(w.A, w.B, p.C).eq(q(0))).toBe(false);
        equal(squaredDistance(w.A, w.center), squaredDistance(w.B, w.center));
        equal(squaredDistance(w.A, w.center), squaredDistance(p.C, w.center));
        expect(onRadical(p, w.A)).toBe(w.omitted !== "radical");
        expect(onInverse(p, w.B)).toBe(w.omitted !== "inverse");
        expect(w.center[0].eq(q(0))).toBe(w.omitted !== "circle");
      }
    });
  });
  it("certifies a different negative slope/intercept on a real circle if slope -1 is removed", () => {
    all(radical).forEach((item) => {
      const p = readRadicalInverseCircle(item),
        s = solveRadicalInverseCircle(p),
        w = radicalLineDeletionWitness(p, s);
      const J = w.center[1],
        a2 = p.a.sq(),
        N = norm(p.C),
        B = a2.sub(p.k.mul(q(2)));
      const D = p.k
        .sq()
        .sub(a2.mul(N))
        .add(a2.mul(J).mul(p.C[1]).mul(q(2)));
      const ca = [q(1), q(0), B, a2.mul(J).mul(q(-2)), D];
      const cb = [
        q(1),
        q(0),
        B.sub(p.a.mul(J).mul(q(2))),
        q(0),
        D.add(p.a.mul(J).mul(p.k).mul(q(2))),
      ];
      for (const [cs, r] of [
        [ca, w.radicalParameter],
        [cb, w.inverseParameter],
      ] as const) {
        expect(
          polynomial(cs, r[0]).mul(polynomial(cs, r[1])).cmp(q(0)),
        ).toBeLessThanOrEqual(0);
        expect(r[0].cmp(q(0))).toBeGreaterThanOrEqual(0);
        expect(r[1].sq().cmp(p.cap)).toBeLessThanOrEqual(0);
        // Direct derivative enclosure (independent of isolateRoot's Horner
        // monotonicity check) proves exactly one root in the saved brackets.
        const lo = r[0],
          hi = r[1],
          twoB = cs[2]!.mul(q(2));
        const lowerD = lo
          .sq()
          .mul(lo)
          .mul(q(4))
          .add(twoB.mul(twoB.cmp(q(0)) < 0 ? hi : lo))
          .add(cs[3]!);
        const upperD = hi
          .sq()
          .mul(hi)
          .mul(q(4))
          .add(twoB.mul(twoB.cmp(q(0)) < 0 ? lo : hi))
          .add(cs[3]!);
        expect(lowerD.cmp(q(0)) > 0 || upperD.cmp(q(0)) < 0).toBe(true);
      }
      equal(w.center[0], q(0));
      equal(J, q(1, 100));
      const excludes = (r: readonly [Q, Q], value: Q) =>
        r[0].cmp(value) > 0 || r[1].cmp(value) < 0;
      expect(excludes(w.slope, q(-1))).toBe(true);
      expect(w.slope[1].cmp(q(0))).toBeLessThan(0);
      expect(excludes(w.intercept, Q.read(item.answer))).toBe(true);
      expect(excludes(w.determinant, q(0))).toBe(true);
      // C does not lie on AB; no coincident or collinear "triangle" is used.
      const atC = interval.sub(
        interval.add(interval.mul(w.slope, [p.C[0], p.C[0]]), w.intercept),
        [p.C[1], p.C[1]],
      );
      expect(excludes(atC, q(0))).toBe(true);
    });
  });
  it("rejects coincident and collinear candidate designs instead of asserting an always-existing circle", () => {
    const p = readRadicalInverseCircle(all(radical)[0]!);
    expect(() =>
      solveRadicalInverseCircle({
        ...p,
        k: q(0),
        lower: q(0),
        upper: q(4),
        cap: q(4),
        C: [q(-1), q(1)],
      }),
    ).toThrow();
    expect(() =>
      solveRadicalInverseCircle({ ...p, C: [q(-2), q(1)] }),
    ).toThrow();
  });
});

it("preserves raw printed tasks, independent branches and exact condition-deletion evidence", () => {
  const out = path.join(
    process.cwd(),
    ".qa-artifacts/math-exam-engine-completion-20261019/advanced",
  );
  mkdirSync(out, { recursive: true });
  const data = families.map((f) => ({
    id: f.id,
    requirement: f.fulfills[0]!.requirement,
    course: f.course,
    canonicalCount: all(f).length,
    items: all(f).map((item) => {
      const common = {
        item,
        verified: f.verify(item),
        printDigest: createHash("sha256").update(item.content).digest("hex"),
      };
      if (f !== radical)
        return {
          ...common,
          independent: solveQuadraticReuse(readQuadraticReuse(item)),
        };
      const p = readRadicalInverseCircle(item),
        independent = solveRadicalInverseCircle(p);
      return {
        ...common,
        independent,
        deletions: radicalDeletionWitnesses(p, independent.accepted.b!),
        lineDeletion: radicalLineDeletionWitness(p, independent),
      };
    }),
  }));
  writeFileSync(
    path.join(out, "printed-proof-evidence.json"),
    JSON.stringify(
      data,
      (_key, value) => (value instanceof Q ? value.toString() : value),
      2,
    ) + "\n",
  );
  expect(data.reduce((count, f) => count + f.canonicalCount, 0)).toBe(32);
});
