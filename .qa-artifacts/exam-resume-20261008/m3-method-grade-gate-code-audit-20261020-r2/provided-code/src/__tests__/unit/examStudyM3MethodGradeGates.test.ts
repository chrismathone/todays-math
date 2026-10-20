import { describe, expect, it, vi } from "vitest";
import type { ExamStudyFamily } from "@/contracts/examStudy.contract";
import { studyCurriculumHold } from "@/lib/examStudy/curriculumEligibility";
import { familyCoverage } from "@/lib/examStudy/evidence";
import { generateExamStudy } from "@/lib/examStudy/generate";
import { studyReleaseHold } from "@/lib/examStudy/releaseEligibility";
import { inverseCoefficientSum } from "@/lib/examStudy/families/middle/inverseCoefficient";
import { inverseRootTable } from "@/lib/examStudy/families/middle/inverseRootTable";
import { inverseMinimum } from "@/lib/examStudy/families/middle/inverseMinimum";
import { inverseTangentRectangle } from "@/lib/examStudy/families/middle/inverseTangentRectangle";
import { inverseEquationDegree } from "@/lib/examStudy/families/middle/inverseEquationDegree";

const methods = [
  inverseCoefficientSum,
  inverseRootTable,
  inverseMinimum,
  inverseTangentRectangle,
  inverseEquationDegree,
] as const;
const formats = ["혼합", "단답형", "객관식", "서술형"] as const;

describe("required M3 methods remain excluded below grade before release or factories", () => {
  it.each(["초3", "초4", "초5", "초6", "중1", "중2"] as const)(
    "%s cannot relabel a complete or component method as approved",
    async (course) => {
      for (const method of methods) {
        for (const level of ["full", "component"] as const) {
          const generate = vi.fn(method.generate);
          const family = {
            ...method,
            id: `renamed-${method.id}`,
            version: "future-approved-version",
            course,
            fulfills: [{ ...method.fulfills[0], level }],
            generate,
            gradeApproved: true,
            rightsApproved: true,
            nativeProvenanceApproved: true,
            confidence: 1,
          } satisfies ExamStudyFamily & Record<string, unknown>;
          const gradeHold = studyCurriculumHold(family);
          expect(gradeHold?.status).toBe("excluded-required-out-of-grade-method");
          expect(studyReleaseHold(family)?.status).toBe("review-only-template");
          expect(familyCoverage(family, method.fulfills[0].requirement)).toBe("unavailable");
          for (const format of formats) {
            const result = await generateExamStudy(
              { course, familyIds: [family.id], count: 1, maxPerFamily: 1, seed: 17, format },
              { families: [family] },
            );
            expect(result.status).toBe("unavailable");
            expect(result.questions).toEqual([]);
            expect(result.warnings).toContain(gradeHold?.message);
            expect(result.warnings).not.toContain(studyReleaseHold(family)?.message);
          }
          expect(generate).not.toHaveBeenCalled();
        }
      }
    },
  );

  it.each(methods)("keeps $id review-only at its reviewed M3 course", async (family) => {
    expect(studyCurriculumHold(family)).toBeNull();
    expect(studyReleaseHold(family)?.status).toBe("review-only-template");
    const generate = vi.fn(family.generate);
    const result = await generateExamStudy(
      { course: "중3", familyIds: [family.id], count: 1, maxPerFamily: 1, seed: 17, format: "혼합" },
      { families: [{ ...family, generate }] },
    );
    expect(result.questions).toEqual([]);
    expect(generate).not.toHaveBeenCalled();
  });

  it("retains the separately reviewed M1 geometry versions without approving unrelated methods", () => {
    for (const [id, requirement, version] of [
      ["study-middle-inverse-equal-legs", "coord.inverse-equal-legs", "2-m1-single-variable"],
      ["study-middle-inverse-area-ratio", "coord.inverse-area-ratio", "2-m1-elementary-area"],
    ] as const) {
      const family = { id, course: "중1" as const, version, fulfills: [{ requirement, level: "full" as const }] };
      expect(studyCurriculumHold(family)).toBeNull();
      expect(studyCurriculumHold({ ...family, version: "unreviewed" })?.status).toBe(
        "pending-reviewed-student-method-version",
      );
    }
  });
});
