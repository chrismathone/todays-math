import katex from "katex";
import { describe, expect, it, vi } from "vitest";
import {
  inverseCoefficientSum,
  inverseCoefficientStudyMetadata,
} from "@/lib/examStudy/families/middle/inverseCoefficient";
import { familyCoverage } from "@/lib/examStudy/evidence";
import { generateExamStudy } from "@/lib/examStudy/generate";
import {
  examStudyFamilies,
  getExamStudyCatalog,
} from "@/lib/examStudy/registry";
import { studyReleaseHold } from "@/lib/examStudy/releaseEligibility";

const demand = "algebra.inverse-coefficient-sum" as const;
const family = inverseCoefficientSum;

function printed(item: ReturnType<typeof family.generate>) {
  const terms = /\$\((\d+)x\+ky\)\((\d+)x-(\d+)y\)\$/u.exec(item.content)!;
  const sum = /계수의 합이 \$(-?\d+)\$일/u.exec(item.content)!;
  const a = Number(terms[1]),
    c = Number(terms[2]),
    d = -Number(terms[3]),
    s = Number(sum[1]);
  // At (1,1), subtracting P(1,0) leaves precisely the xy and y² coefficients.
  // This oracle uses original printed factors, not generator parameters/answer.
  const k = (s + a * c) / (c + d) - a;
  return {
    a,
    c,
    d,
    s,
    k,
    evaluate: (x: number, y: number) => (a * x + k * y) * (c * x + d * y),
  };
}

describe("finite inverse coefficient implementation remains review-only", () => {
  it("independently solves every one of32printed tasks, including absent y² terms and negative constants", () => {
    expect(family.paramDomain.kind).toBe("finite");
    const seen = new Set<string>(),
      answers = new Set<number>(),
      slopes = new Set<number>();
    for (let n = 0; n < 32; n++) {
      const item = family.generate(0, n),
        p = printed(item);
      expect(p.c + p.d).not.toBe(0);
      expect(p.evaluate(1, 1) - p.evaluate(1, 0)).toBe(p.s);
      expect(item.answer).toBe(String(p.k));
      expect(family.verify(item).valid).toBe(true);
      for (const text of [item.content, item.solution])
        for (const math of text.matchAll(/\$([^$]+)\$/gu))
          expect(() =>
            katex.renderToString(math[1], {
              throwOnError: true,
              strict: "error",
            }),
          ).not.toThrow();
      for (const x of [-2, 0, 3])
        for (const y of [-1, 0, 2]) {
          const expanded =
            p.a * p.c * x * x +
            (p.a * p.d + p.c * p.k) * x * y +
            p.d * p.k * y * y;
          // Exact numeric equality identifies signed zeros without a tolerance.
          expect(p.evaluate(x, y) === expanded).toBe(true);
        }
      expect(familyCoverage(family, demand, family.verify(item), item)).toBe(
        "unavailable",
      );
      seen.add(item.content);
      answers.add(p.k);
      slopes.add(p.c + p.d);
    }
    expect(seen.size).toBe(32);
    expect([...answers].sort((a, b) => a - b)).toEqual([-2, 0, 3, 8]);
    expect([...slopes].sort((a, b) => a - b)).toEqual([-3, -1, 1]);
  });

  it("rejects both inconsistent and nonunique zero-slope equations before division", () => {
    const q = family.generate(0, 4); // Printed second factor2x-3y.
    expect(q.content).toContain("(2x-3y)");
    const content = q.content.replace("(2x-3y)", "(3x-3y)");
    for (const invalid of [
      content,
      content.replace(/합이 \$-?\d+\$/u, "합이 $-6$"),
    ]) {
      const result = family.verify({ ...q, content: invalid });
      expect(result.valid).toBe(false);
      expect(result.errors.join(" ")).toContain("역산 계수가 0");
    }
  });

  it("rejects wrong answers, hidden-condition/solution appendices and false format/rubric claims", () => {
    for (let n = 0; n < 32; n++) {
      const q = family.generate(0, n);
      for (const bad of [
        { ...q, answer: "999" },
        { ...q, content: q.content + " 추가 조건도 만족시켜야 한다." },
        {
          ...q,
          content: q.content.replace(/합이 \$-?\d+\$/u, () => "합이 $999$"),
        },
        { ...q, solution: q.solution + " 하지만 $k=999$이다." },
        { ...q, parameters: { ...q.parameters, k: 999 } },
        { ...q, questionType: "객관식" as const },
        { ...q, questionType: "서술형" as const },
        { ...q, distractors: ["1", "2", "3", "4"] },
        { ...q, difficulty: "기본" as const },
      ])
        expect(family.verify(bad).valid).toBe(false);
    }
  });

  it("keeps the mathematical domain independent of seed/format and returns isolated parameter copies", () => {
    if (family.paramDomain.kind !== "finite") throw new Error("finite");
    expect(family.paramDomain.size).toBe(32);
    const params = family.paramDomain.enumerate();
    expect(new Set(params.map((p) => JSON.stringify(p))).size).toBe(32);
    for (let seed = 0; seed < 100; seed++) {
      const q = family.generate(seed, seed % 32);
      expect(q).toEqual(family.generate(seed, seed % 32));
      expect(family.verify(q).valid).toBe(true);
    }
    (params[0] as { a: number }).a = 999;
    expect(printed(family.generate(0, 0)).a).toBe(2);
    expect(() => family.generate(NaN, 0)).toThrow();
    expect(() => family.generate(0, -1)).toThrow();
  });

  it.each(["혼합", "단답형", "객관식", "서술형"] as const)(
    "cannot offer an unreleased implementation in %s, even with renamed/native/approval flags",
    async (format) => {
      for (const change of [
        {},
        {
          id: "renamed",
          version: "999",
          gradeApproved: true,
          rightsApproved: true,
          confidence: 1,
        },
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
            seed: 11,
            format,
          },
          { families: [f] },
        );
        expect(result.status).toBe("unavailable");
        expect(result.questions).toEqual([]);
        expect(result.requirements[0].status).toBe("unavailable");
        expect(generate).not.toHaveBeenCalled();
        expect(studyReleaseHold(f)?.status).toBe("review-only-template");
      }
    },
  );

  it("keeps the explicit grade exclusion ahead of the template release hold", async () => {
    const generate = vi.fn(family.generate),
      f = {
        ...family,
        course: "중1" as const,
        generate,
        fulfills: [
          ...family.fulfills,
          {
            requirement: "number.coprime-symbolic-sum" as const,
            level: "full" as const,
          },
        ],
      };
    const result = await generateExamStudy(
      {
        course: "중1",
        familyIds: [f.id],
        count: 1,
        maxPerFamily: 1,
        seed: 11,
        format: "혼합",
      },
      { families: [f] },
    );
    expect(generate).not.toHaveBeenCalled();
    expect(result.warnings.some((s) => s.includes("중1 범위를 벗어나는"))).toBe(
      true,
    );
    expect(result.warnings.some((s) => s.includes("계수 합 역산 유형"))).toBe(
      false,
    );
  });

  it("retains the internal implementation but excludes it from selectable catalogs without inventing a live family", () => {
    expect(examStudyFamilies().some((f) => f.id === family.id)).toBe(true);
    const catalog = getExamStudyCatalog("중3");
    expect(catalog.families.some((f) => f.id === family.id)).toBe(false);
    expect(catalog.requirements.some((r) => r.id === demand)).toBe(true);
    expect(inverseCoefficientStudyMetadata.liveFamilyKey).toBeNull();
    expect(inverseCoefficientStudyMetadata.registrationStatus).toBe("pending");
    expect(inverseCoefficientStudyMetadata.unitId).toBe(
      "e63d61c6-2b41-4c83-a74b-a605fd343c42",
    );
    expect(inverseCoefficientStudyMetadata.rightsApproved).toBe(false);
    expect(inverseCoefficientStudyMetadata.loadable).toBe(false);
    expect(
      inverseCoefficientStudyMetadata.proposedCurriculumScope,
    ).toMatchObject({
      sourceStudyAcademicYear: 2025,
      sourceStudyEdition: "2015",
      practiceAcademicYear: 2026,
      practiceEdition: "2015",
      m3From2027: "requires-2022-grade-placement-review",
      proposalIsNotApproval: true,
    });
  }, 40000);
});
