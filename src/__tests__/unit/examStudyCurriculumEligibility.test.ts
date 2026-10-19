import { describe, expect, it, vi } from "vitest";
import { coprimeSymbolicSum } from "@/lib/examStudy/families/middle/remaining";
import { equalLegs } from "@/lib/examStudy/families/middle/algebra";
import { inverseArea } from "@/lib/examStudy/families/middle/graphs";
import { familyCoverage } from "@/lib/examStudy/evidence";
import { generateExamStudy } from "@/lib/examStudy/generate";
import {
  examStudyFamilies,
  getExamStudyCatalog,
} from "@/lib/examStudy/registry";
import { studyCurriculumHold } from "@/lib/examStudy/curriculumEligibility";

const demand = "number.coprime-symbolic-sum" as const;

describe("grade eligibility precedes mathematical proof and profile completion", () => {
  it("keeps all fourteen mathematical proofs inspectable without offering the out-of-grade M1 task", () => {
    expect(coprimeSymbolicSum.paramDomain.kind).toBe("finite");
    for (let n = 0; n < 14; n++) {
      const item = coprimeSymbolicSum.generate(0, n);
      expect(item.content).toContain("다항식");
      expect(coprimeSymbolicSum.verify(item).valid).toBe(true);
      expect(
        familyCoverage(
          coprimeSymbolicSum,
          demand,
          coprimeSymbolicSum.verify(item),
          item,
        ),
      ).toBe("unavailable");
    }
    expect(studyCurriculumHold(coprimeSymbolicSum)?.status).toBe(
      "excluded-required-out-of-grade-method",
    );
  });

  it.each(["혼합", "단답형", "객관식", "서술형"] as const)(
    "never generates a held item or calls its factory when format is %s",
    async (format) => {
      const generate = vi.fn(coprimeSymbolicSum.generate);
      const family = { ...coprimeSymbolicSum, generate };
      for (const profileId of [undefined, "daeryun-m1"]) {
        const data = await generateExamStudy(
          {
            course: "중1",
            profileId,
            familyIds: [family.id],
            requirementIds: [demand],
            count: 1,
            maxPerFamily: 1,
            seed: 71,
            format,
          },
          { families: [family] },
        );
        expect(data.status).toBe("unavailable");
        expect(data.questions).toEqual([]);
        expect(data.requirements[0]).toMatchObject({
          id: demand,
          delivered: 0,
          status: "unavailable",
        });
        expect(data.warnings.some((s) => s.includes("중1 범위"))).toBe(true);
      }
      expect(generate).not.toHaveBeenCalled();
    },
  );

  it("a renamed family, new version or claimed confidence cannot bypass the same forbidden requirement", async () => {
    const renamed = {
      ...coprimeSymbolicSum,
      id: "renamed-coprime-task",
      version: "999",
      confidence: 1,
      gradeApproved: true,
    };
    expect(studyCurriculumHold(renamed)).not.toBeNull();
    const data = await generateExamStudy(
      {
        course: "중1",
        familyIds: [renamed.id],
        count: 1,
        seed: 71,
        format: "혼합",
        maxPerFamily: 1,
      },
      { families: [renamed] },
    );
    expect(data.deliveredCount).toBe(0);
    expect(data.status).toBe("unavailable");
  });

  it("hides the held template from selectable catalogs and retains its definition for internal review", () => {
    expect(
      examStudyFamilies().some((f) => f.id === coprimeSymbolicSum.id),
    ).toBe(true);
    for (const course of [undefined, "중1"] as const) {
      expect(
        getExamStudyCatalog(course).families.some(
          (f) => f.id === coprimeSymbolicSum.id,
        ),
      ).toBe(false);
    }
    expect(
      getExamStudyCatalog("중1").requirements.some((r) => r.id === demand),
    ).toBe(true);
    // The demand stays visible as missing; a different grade is never substituted.
  }, 40_000);

  it("a null restriction result is not a blanket symbol screen or another template's curriculum certificate", () => {
    expect(
      studyCurriculumHold({
        course: "중1",
        fulfills: [
          { requirement: "model.circle-revolution-percentage", level: "full" },
        ],
      }),
    ).toBeNull();
  });

  it.each([equalLegs, inverseArea])(
    "only the reviewed full student-method version may generate for $id",
    async (current) => {
      expect(studyCurriculumHold(current)).toBeNull();
      for (const change of [
        { version: "1" },
        { version: "999", confidence: 1, gradeApproved: true },
        { id: `renamed-${current.id}` },
      ]) {
        const generate = vi.fn(current.generate);
        const stale = { ...current, ...change, generate };
        expect(studyCurriculumHold(stale)?.status).toBe(
          "pending-reviewed-student-method-version",
        );
        expect(familyCoverage(stale, current.fulfills[0].requirement)).toBe(
          "unavailable",
        );
        const result = await generateExamStudy(
          {
            course: "중1",
            familyIds: [stale.id],
            count: 1,
            seed: 5,
            format: "혼합",
            maxPerFamily: 1,
          },
          { families: [stale] },
        );
        expect(result.status).toBe("unavailable");
        expect(result.questions).toEqual([]);
        expect(generate).not.toHaveBeenCalled();
      }
    },
  );
});
