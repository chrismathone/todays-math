import { describe, expect, it } from "vitest";
import { ADVANCED_STUDY_FAMILIES as REGISTERED_ADVANCED_FAMILIES } from "@/lib/examStudy/families/advanced";

// Keep the original eleven-family oracle and its 1,121-tuple evidence intact.
// The two remaining demands are independently tested in AdvancedRemaining.
const originalRequirements = new Set([
  "logic.truth-set-inclusion-param",
  "logic.intermediate-truth-set-count",
  "function.restricted-quadratic-bijection",
  "function.radical-area-maximum",
  "function.absolute-rational-level-count",
  "function.finite-bijection-chain",
  "function.iterated-finite-range",
  "graph.parabola-line-chain",
  "geometry.split-incenters",
  "geometry.two-centers-angle",
  "geometry.incircle-shaded-area",
]);
const ADVANCED_STUDY_FAMILIES = REGISTERED_ADVANCED_FAMILIES.filter((f) =>
  f.fulfills.some((r) => originalRequirements.has(r.requirement)),
);
import {
  inclusionHolds,
  readInclusion,
  readIntermediate,
  solveIntermediate,
} from "@/lib/examStudy/families/advanced/logic";
import {
  levelRoots,
  levelTailBound,
  readLevels,
  readQuadratic,
  readRadicalArea,
} from "@/lib/examStudy/families/advanced/continuous";
import {
  readChain,
  solveChain,
  readIterate,
  solveIterate,
} from "@/lib/examStudy/families/advanced/finite";
import type {
  ExamStudyDraft,
  ExamStudyFamily,
} from "@/contracts/examStudy.contract";
import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const getFamily = (name: string) =>
  ADVANCED_STUDY_FAMILIES.find((f) => f.id.endsWith(name))!;
const eachDraft = (
  family: ExamStudyFamily,
  visit: (item: ExamStudyDraft, index: number) => void,
) => {
  if (family.paramDomain.kind !== "finite")
    throw new Error("bounded domain required");
  family.paramDomain
    .enumerate()
    .forEach((_, index) => visit(family.generate(0, index), index));
};

describe("advanced family executable evidence (B4/B5)", () => {
  it("publishes seven distinct common2 demands without format/count/rank clones", () => {
    const common2 = ADVANCED_STUDY_FAMILIES.filter(
      (f) => f.course === "공통수학2",
    );
    expect(common2).toHaveLength(7);
    expect(new Set(common2.map((f) => f.fulfills[0]!.requirement)).size).toBe(
      7,
    );
    expect(
      common2.every((f) => f.source === "authored" && f.version === "1.0.0"),
    ).toBe(true);
    expect(
      common2.some((f) =>
        f.fulfills.some(
          (x) => x.requirement === "function.radical-inverse-circle",
        ),
      ),
    ).toBe(false);
  });

  for (const family of ADVANCED_STUDY_FAMILIES) {
    it(`${family.id}: exhausts every canonical tuple, checks evidence and rejects corrupt answers`, () => {
      const identities = new Set<string>(),
        stems = new Set<string>();
      eachDraft(family, (item, index) => {
        const result = family.verify(item);
        expect(result.errors, `tuple ${index}: ${item.content}`).toEqual([]);
        expect(result.valid).toBe(true);
        expect(result.checks).toContain("independent-solution");
        expect(result.checks).toContain("essential-conditions");
        expect(family.verify({ ...item, answer: "CORRUPTED" }).valid).toBe(
          false,
        );
        const identity = JSON.stringify(family.canonicalParams(item));
        expect(identities.has(identity)).toBe(false);
        const printedTask = JSON.stringify([item.content, item.figureSpec]);
        expect(stems.has(printedTask)).toBe(false);
        identities.add(identity);
        stems.add(printedTask);
        expect(family.generate(0, index)).toEqual(item);
      });
      expect(
        family.paramDomain.kind === "finite" && family.paramDomain.size,
      ).toBe(identities.size);
      expect(family.evidence?.sampleCount).toBe(identities.size);
      expect(family.evidence?.testFile).toBe(
        "src/__tests__/unit/examStudyAdvanced.test.ts",
      );
    });
  }
  it("records the actual finite inventory and original authored examples", () => {
    const dir = path.join(
      process.cwd(),
      ".qa-artifacts/math-exam-engine-upgrade-20261018/advanced-evidence",
    );
    mkdirSync(dir, { recursive: true });
    const inventory = ADVANCED_STUDY_FAMILIES.map((f) => {
      if (f.paramDomain.kind !== "finite")
        throw new Error("finite domain required");
      const all = f.paramDomain.enumerate().map((_, i) => f.generate(0, i));
      return {
        id: f.id,
        requirement: f.fulfills[0]!.requirement,
        canonicalCount: all.length,
        uniquePrintedTasks: new Set(
          all.map((item) => JSON.stringify([item.content, item.figureSpec])),
        ).size,
        checks: f.evidence!.checks,
        boundaries: f.evidence!.boundaryCases,
        printDigests: all.map((item) =>
          createHash("sha256")
            .update(JSON.stringify([item.content, item.figureSpec]))
            .digest("hex"),
        ),
      };
    });
    expect(
      inventory.every((f) => f.canonicalCount === f.uniquePrintedTasks),
    ).toBe(true);
    expect(inventory.reduce((n, f) => n + f.canonicalCount, 0)).toBe(1121);
    writeFileSync(
      path.join(dir, "finite-inventory.json"),
      JSON.stringify(inventory, null, 2),
    );
    writeFileSync(
      path.join(dir, "original-examples.json"),
      JSON.stringify(
        ADVANCED_STUDY_FAMILIES.map((f) => ({
          family: f.id,
          item: f.generate(0, 0),
        })),
        null,
        2,
      ),
    );
  });
});

describe("truth sets and interval boundary behavior", () => {
  it("distinguishes all four strictness combinations at the actual endpoint", () => {
    const truth = (pClosed: boolean, qClosed: boolean, a: number) =>
      inclusionHolds({ left: -3, right: 5, radius: 2, pClosed, qClosed }, a);
    for (const pClosed of [true, false])
      for (const qClosed of [true, false]) {
        expect(truth(pClosed, qClosed, -1)).toBe(!pClosed || qClosed);
        expect(truth(pClosed, qClosed, 3)).toBe(!pClosed || qClosed);
        expect(truth(pClosed, qClosed, 0)).toBe(true);
        expect(truth(pClosed, qClosed, -2)).toBe(false);
        expect(truth(pClosed, qClosed, 4)).toBe(false);
      }
  });
  it("re-solves printed interval tasks by direct predicate truth over endpoints and midpoints", () => {
    const family = getFamily("truth-set-inclusion");
    eachDraft(family, (item) => {
      const p = readInclusion(item.content),
        answer: number[] = [];
      for (let a = p.left - 2; a <= p.right + 2; a++) {
        // Direct original formula evaluation at all piecewise truth boundaries.
        const cuts = [p.left, p.right, a - p.radius, a + p.radius].sort(
          (a, b) => a - b,
        );
        const tests = [
          ...cuts,
          cuts[0]! - 1,
          cuts[3]! + 1,
          ...cuts.slice(1).map((x, i) => (x + cuts[i]!) / 2),
        ];
        if (
          tests.every((x) => {
            const antecedent = p.pClosed
              ? Math.abs(x - a) <= p.radius
              : Math.abs(x - a) < p.radius;
            const consequent = p.qClosed
              ? (x - p.left) * (x - p.right) <= 0
              : (x - p.left) * (x - p.right) < 0;
            return !antecedent || consequent;
          })
        )
          answer.push(a);
      }
      expect(item.answer).toBe(`{${answer.join(", ")}}`);
      for (const pattern of [
        /p_a\(x\):[^\n]+\n/,
        /q\(x\):[^\n]+\n/,
        /p_a\(x\) ⇒ q\(x\)가 참/,
      ])
        expect(
          family.verify({ ...item, content: item.content.replace(pattern, "") })
            .valid,
        ).toBe(false);
    });
  });
  it("enumerates actual intermediate truth sets, with each implication essential", () => {
    const family = getFamily("intermediate-truth-sets");
    eachDraft(family, (item) => {
      const p = readIntermediate(item.content),
        candidates = solveIntermediate(p);
      expect(item.answer).toBe(String(candidates.length));
      for (const r of candidates) {
        expect(
          p.p.filter((x) => p.q.includes(x)).every((x) => r.includes(x)),
        ).toBe(true);
        expect(r.every((x) => p.p.includes(x) || p.q.includes(x))).toBe(true);
      }
      expect(solveIntermediate(p, "lower").length).toBeGreaterThan(
        candidates.length,
      );
      expect(solveIntermediate(p, "upper").length).toBeGreaterThan(
        candidates.length,
      );
      for (const clause of ["(p∧q) ⇒ r", "r ⇒ (p∨q)"])
        expect(
          family.verify({ ...item, content: item.content.replace(clause, "") })
            .valid,
        ).toBe(false);
    });
  });
});

describe("continuous branches, onto and algebraic extrema", () => {
  it("checks actual quadratic inputs at/inside/outside the domain; onto alone is insufficient", () => {
    const family = getFamily("restricted-quadratic-bijection");
    eachDraft(family, (item) => {
      const p = readQuadratic(item.content),
        d = p.endpoint,
        s = p.distance;
      const f = (x: number, a: number, b: number) =>
        p.sign * x * x - 2 * p.sign * a * x + b;
      const optimum = p.bound + p.sign * s * s;
      const attained: number[] = [];
      // Re-derive endpoint b from the PRINTED bound. Inspect actual values for
      // feasible and forbidden axes on both half-lines, including equality.
      for (let shift = -4; shift <= 4; shift += 0.5) {
        const a = d + p.side * shift;
        const b = p.bound - p.sign * d * d + 2 * p.sign * a * d;
        const inputs = Array.from(
          { length: 19 },
          (_, i) => d + (p.side * i) / 2,
        );
        const values = inputs.map((x) => f(x, a, b));
        if (shift <= 0) {
          expect(new Set(values).size).toBe(values.length);
          expect(values.every((y) => p.sign * (y - p.bound) >= 0)).toBe(true);
          attained.push(f(d + p.side * s, a, b));
        } else {
          expect(f(a - 0.25, a, b)).toBe(f(a + 0.25, a, b));
          expect(values.some((y) => p.sign * (y - p.bound) < 0)).toBe(true);
        }
      }
      expect(p.sign === 1 ? Math.min(...attained) : Math.max(...attained)).toBe(
        optimum,
      );
      const ontoNoninjectiveA = d + p.side * s,
        ontoNoninjectiveB = p.bound + p.sign * ontoNoninjectiveA ** 2;
      expect(f(ontoNoninjectiveA, ontoNoninjectiveA, ontoNoninjectiveB)).toBe(
        p.bound,
      );
      expect(p.bound).not.toBe(optimum);
      for (const condition of [
        /D=\{[^}]+\}/,
        /E=\{[^}]+\}/,
        /일대일대응/,
        /일대일성과 E 전체로의 대응을 각각 정당화/,
      ])
        expect(
          family.verify({
            ...item,
            content: item.content.replace(condition, ""),
          }).valid,
        ).toBe(false);
      expect(family.verify({ ...item, rubric: undefined }).valid).toBe(false);
      const r = structuredClone(item.rubric!);
      r.criteria[0]!.points++;
      expect(family.verify({ ...item, rubric: r }).valid).toBe(false);
      expect(
        family.verify({ ...item, solution: "정답만 적은 답안입니다." }).valid,
      ).toBe(false);
    });
  });
  it("re-solves radical area using triangle determinants over the whole admissible branch", () => {
    const family = getFamily("radical-triangle-area");
    eachDraft(family, (item) => {
      const p = readRadicalArea(item.content),
        [num, den = 1] = item.answer.split("/").map(Number),
        expected = num! / den;
      // Area = |det(P-A,B-A)|/2. This path never uses generated coefficients/facts.
      const areaAt = (y: number) => {
        const x = p.intercept - y * y;
        return Math.abs((x - p.intercept) * p.height - y * -p.intercept) / 2;
      };
      const candidateY = p.intercept / (2 * p.height);
      expect(areaAt(candidateY)).toBe(expected);
      for (let i = 0; i <= 120; i++)
        expect(areaAt((Math.sqrt(p.intercept) * i) / 120)).toBeLessThanOrEqual(
          expected + 1e-8,
        );
      expect(p.intercept - candidateY ** 2).toBeGreaterThan(0);
      expect(areaAt(Math.sqrt(p.intercept))).toBeLessThan(expected + 1e-8);
      expect(areaAt(-candidateY)).toBeGreaterThan(expected);
      expect(areaAt(p.intercept + p.height)).toBeGreaterThan(expected);
      for (const condition of [
        /y=√\(\d+-x\)/,
        /x≥0을 만족하는 점/,
        /B=\(0,\d+\)/,
      ])
        expect(
          family.verify({
            ...item,
            content: item.content.replace(condition, ""),
          }).valid,
        ).toBe(false);
    });
  });
  it("checks every rational integer boundary, excluded point, absolute branch and the infinite tail", () => {
    const family = getFamily("absolute-rational-levels"),
      seen = new Set<string>();
    eachDraft(family, (item) => {
      const p = readLevels(item.content),
        bound = levelTailBound(p),
        one: number[] = [];
      for (let k = -2; k <= bound + 5; k++) {
        // Independent signed linear-equation roots, kept as pairs until endpoint tests.
        const roots: number[] = [];
        if (k >= 0)
          for (const sign of k === 0 ? [1] : [1, -1]) {
            const denominator = 1 - sign * k;
            if (!denominator) continue;
            const x = (p.zero - sign * k * p.pole) / denominator;
            if (x === p.pole || x === p.hole) continue;
            if (
              (p.leftClosed ? x >= p.left : x > p.left) &&
              (p.rightClosed ? x <= p.right : x < p.right)
            )
              roots.push(x);
          }
        const exact = levelRoots(p, k);
        expect(exact).toHaveLength(roots.length);
        for (const [n, d] of exact) {
          const x = n / d;
          expect(Math.abs((x - p.zero) / (x - p.pole))).toBeCloseTo(k, 10);
          expect(x).not.toBe(p.hole);
          expect(x).not.toBe(p.pole);
        }
        if (k >= 0 && roots.length === 1) one.push(k);
        if (k > bound) expect(roots).toHaveLength(2);
        seen.add(
          `${k === 0 ? "zero" : k === 1 ? "one" : k < 0 ? "negative" : "positive"}:${p.leftClosed}:${p.rightClosed}`,
        );
      }
      expect(item.answer).toBe(`{${one.join(", ")}}`);
      for (const clause of [/D=[^。]+?이다\./, /교점이 정확히 1개/])
        expect(
          family.verify({ ...item, content: item.content.replace(clause, "") })
            .valid,
        ).toBe(false);
    });
    expect(seen.size).toBe(16);
  });
});

describe("finite mappings: exhaustive candidate functions and essential conditions", () => {
  it("recovers both bijections from printed direct/inverse/composition values", () => {
    const family = getFamily("finite-bijection-chain");
    eachDraft(family, (item) => {
      const p = readChain(item.content),
        candidates = solveChain(p);
      expect(candidates).toHaveLength(1);
      const { f, g } = candidates[0]!;
      expect(new Set(f).size).toBe(3);
      expect(new Set(g).size).toBe(3);
      expect(f[p.x.indexOf(p.direct[0])]).toBe(p.direct[1]);
      expect(p.y[g.indexOf(p.inverse[0])]).toBe(p.inverse[1]);
      expect(g[p.y.indexOf(f[p.x.indexOf(p.composition[0])]!)]).toBe(
        p.composition[1],
      );
      for (const condition of [
        "direct",
        "inverse",
        "composition",
        "bijective",
      ] as const)
        expect(solveChain(p, condition).length).toBeGreaterThan(1);
      for (const clause of [
        /f\(-?\d+\)=-?\d+/,
        /g⁻¹\(-?\d+\)=-?\d+/,
        /\(g∘f\)\(-?\d+\)=-?\d+/,
        /모두 일대일대응/,
      ])
        expect(
          family.verify({ ...item, content: item.content.replace(clause, "") })
            .valid,
        ).toBe(false);
    });
  });
  it("does not assume injectivity or a unique function when only the output is unique", () => {
    const family = getFamily("iterated-finite-range"),
      counts = new Set<number>();
    eachDraft(family, (item) => {
      const p = readIterate(item.content),
        candidates = solveIterate(p);
      counts.add(candidates.length);
      expect(
        new Set(candidates.map((f) => f.reduce((a, b) => a + b, 0))),
      ).toEqual(new Set([Number(item.answer)]));
      for (const f of candidates) {
        expect(new Set(f)).toEqual(new Set(p.image));
        for (const x of p.x) {
          const y = f[p.x.indexOf(x)]!,
            yy = f[p.x.indexOf(y)]!;
          expect(p.direction === "≥" ? yy >= x : yy <= x).toBe(true);
        }
      }
      for (const condition of ["range", "fixed", "iterate"] as const)
        expect(
          new Set(
            solveIterate(p, condition).map((f) => f.reduce((a, b) => a + b, 0)),
          ).size,
        ).toBeGreaterThan(1);
      for (const clause of [
        /치역은 정확히 \{[^}]+\}/,
        /f\(-?\d+\)=-?\d+/,
        /모든 x∈X에 대해 f\(f\(x\)\) [≥≤] x/,
      ])
        expect(
          family.verify({ ...item, content: item.content.replace(clause, "") })
            .valid,
        ).toBe(false);
    });
    expect(counts).toEqual(new Set([1, 2, 3, 4]));
  });
});
