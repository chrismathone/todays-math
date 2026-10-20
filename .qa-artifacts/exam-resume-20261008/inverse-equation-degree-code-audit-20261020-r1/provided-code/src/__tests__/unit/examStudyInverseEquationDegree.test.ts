import katex from "katex";
import { describe, expect, it, vi } from "vitest";
import {
  inverseEquationDegree as family,
  inverseEquationDegreeStudyMetadata as metadata,
} from "@/lib/examStudy/families/middle/inverseEquationDegree";
import { generateExamStudy } from "@/lib/examStudy/generate";
import {
  examStudyFamilies,
  getExamStudyCatalog,
} from "@/lib/examStudy/registry";
import { studyReleaseHold } from "@/lib/examStudy/releaseEligibility";
import { studyCurriculumHold } from "@/lib/examStudy/curriculumEligibility";

const demand = "algebra.inverse-equation-degree" as const;
function printed(item: ReturnType<typeof family.generate>) {
  const m = /\$\(ax-(\d+)\)\(x\+(\d+)\)=ax\+(\d+)x\^2(-\d+|\+)x\+(\d+)\$/u.exec(
    item.content,
  )!;
  const [p, q, r, s, t] = [
    Number(m[1]),
    Number(m[2]),
    Number(m[3]),
    m[4] === "+" ? 1 : Number(m[4]),
    Number(m[5]),
  ];
  // Test oracle evaluates the printed equality, without producer parameters,
  // solution or its coefficient-subtraction implementation.
  const residual = (a: number, x: number) =>
    (a * x - p) * (x + q) - (a * x + r * x * x + s * x + t);
  const coefficients = (a: number) => ({
    quadratic: (residual(a, 1) + residual(a, -1) - 2 * residual(a, 0)) / 2,
    linear: (residual(a, 1) - residual(a, -1)) / 2,
  });
  return { residual, coefficients };
}

describe("degree-to-input study factory remains internal and held", () => {
  it("solves all26 printed models, rejecting every zero remaining-linear case", () => {
    expect(family.paramDomain.kind).toBe("finite");
    const seen = new Set<string>(),
      signs = new Set<number>();
    for (let n = 0; n < 26; n++) {
      const item = family.generate(0, n),
        oracle = printed(item),
        answer = Number(item.answer);
      seen.add(item.content);
      const admissible = [];
      for (let a = -8; a <= 8; a++) {
        const c = oracle.coefficients(a);
        if (c.quadratic === 0 && c.linear !== 0) admissible.push(a);
      }
      expect(admissible).toEqual([answer]);
      const c = oracle.coefficients(answer);
      expect(c.quadratic).toBe(0);
      expect(c.linear).not.toBe(0);
      signs.add(Math.sign(c.linear));
      expect(family.verify(item).valid).toBe(true);
      for (const text of [item.content, item.solution])
        for (const math of text.matchAll(/\$([^$]+)\$/gu))
          expect(() =>
            katex.renderToString(math[1], {
              throwOnError: true,
              strict: "error",
            }),
          ).not.toThrow();
      expect(item.solution).not.toMatch(
        /판별식|근의 공식|근과 계수|미분|행렬/u,
      );
    }
    expect(seen.size).toBe(26);
    expect([...signs].sort()).toEqual([-1, 1]);
    if (family.paramDomain.kind !== "finite") throw Error("finite required");
    expect(family.paramDomain.size).toBe(26);
    expect(family.paramDomain.enumerate()).toHaveLength(26);
  });

  it("checks coefficients from the printed task and refuses altered answers, methods, roles and unsupported output", () => {
    const item = family.generate(0, 0);
    for (const change of [
      { content: item.content.replace("일차방정식", "이차방정식") },
      { content: item.content.replace("=ax+", "=2ax+") },
      { answer: "0" },
      { solution: item.solution + " 판별식을 이용한다." },
      { parameters: { ...item.parameters, r: 9 } },
      { parameters: { ...item.parameters, extra: 1 } },
      { difficulty: "응용" as const },
      { questionType: "객관식" as const },
      { figureSpec: {} as never },
      { difficultyBasis: [] },
    ])
      expect(family.verify({ ...item, ...change }).valid).toBe(false);
    const degenerate = {
      ...item,
      content:
        "다음 등식이 $x$에 대한 일차방정식이 되도록 하는 상수 $a$의 값을 구하시오.\n\n$(ax-2)(x+1)=ax+2x^2-2x+1$",
    };
    expect(printed(degenerate).coefficients(2)).toEqual({
      quadratic: 0,
      linear: 0,
    });
    expect(family.verify(degenerate).valid).toBe(false);
  });

  it("reproduces bounded seeds and returns independent parameter copies", () => {
    for (const seed of [
      0,
      1,
      -1,
      Number.MAX_SAFE_INTEGER,
      Number.MIN_SAFE_INTEGER,
    ])
      for (const variant of [0, 25, 26, Number.MAX_SAFE_INTEGER])
        expect(family.generate(seed, variant)).toEqual(
          family.generate(seed, variant),
        );
    for (const seed of [NaN, Infinity, 1.5])
      expect(() => family.generate(seed, 0)).toThrow();
    for (const v of [-1, NaN, 1.5])
      expect(() => family.generate(0, v)).toThrow();
    const item = family.generate(0, 0),
      p = family.canonicalParams(item);
    Object.assign(p, { r: 99 });
    expect(item.parameters.r).not.toBe(99);
    if (family.paramDomain.kind !== "finite") throw Error("finite required");
    const before = family.paramDomain.enumerate(),
      after = family.paramDomain.enumerate();
    expect(before).toEqual(after);
    expect(before[0]).not.toBe(after[0]);
  });

  it("keeps public generation unavailable even for renamed or supposedly approved callers", async () => {
    for (const change of [
      {},
      { id: "renamed", version: "approved" },
      { source: "native" as const },
      { fulfills: [{ requirement: demand, level: "component" as const }] },
    ]) {
      const generate = vi.fn(family.generate),
        f = { ...family, ...change, generate };
      const result = await generateExamStudy(
        {
          course: "중3",
          familyIds: [f.id],
          requirementIds: [demand],
          count: 1,
          maxPerFamily: 1,
          seed: 3,
          format: "혼합",
        },
        { families: [f] },
      );
      expect(result.status).toBe("unavailable");
      expect(result.questions).toEqual([]);
      expect(generate).not.toHaveBeenCalled();
      expect(studyReleaseHold(f)?.status).toBe("review-only-template");
    }
  });

  it.each(["초3", "초4", "초5", "초6", "중1", "중2"] as const)(
    "places the %s hard grade hold before review-only release",
    async (course) => {
      const generate = vi.fn(family.generate),
        f = { ...family, course, generate };
      expect(studyCurriculumHold(f)?.status).toBe(
        "excluded-required-out-of-grade-method",
      );
      const result = await generateExamStudy(
        {
          course,
          familyIds: [f.id],
          count: 1,
          maxPerFamily: 1,
          seed: 1,
          format: "혼합",
        },
        { families: [f] },
      );
      expect(generate).not.toHaveBeenCalled();
      expect(result.questions).toEqual([]);
      expect(result.warnings.some((s) => s.includes("중1·중2"))).toBe(true);
      expect(
        result.warnings.some((s) => s.includes("차수 조건 역산 유형")),
      ).toBe(false);
    },
  );

  it("registers internal support without inventing live family or exposing selection", () => {
    expect(examStudyFamilies().some((f) => f.id === family.id)).toBe(true);
    expect(
      getExamStudyCatalog("중3").families.some((f) => f.id === family.id),
    ).toBe(false);
    expect(metadata.liveFamilyKey).toBeNull();
    expect(metadata.registrationStatus).toBe("pending");
    expect(metadata.loadable).toBe(false);
    expect(metadata.rightsApproved).toBe(false);
    expect(metadata.proposedCurriculumScope.m3From2027).toBe(
      "requires-separate-2022-placement-review",
    );
  });
});
