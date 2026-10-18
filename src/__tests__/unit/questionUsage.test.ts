import { describe, expect, it } from "vitest";
import { questionUses } from "@/lib/usageLabels/questionUses";
import type { UsageProblemRecord } from "@/lib/usageLabels/assemble";

describe("question usage counts", () => {
  const record = (id: string, questionId: string): UsageProblemRecord => ({
    id,
    questionId,
    visible: true,
    eligible: true,
    ineligibleCode: null,
    unit: { id: "unit", grade: "중1", chapter: "정수", section: "계산" },
  });
  it("takes the union of test IDs across formats, keeping other numerical tasks independent", () => {
    const result = questionUses(
      [record("sa", "q1"), record("mc", "q1"), record("other", "q2")],
      [
        { testId: "t1", problemId: "sa" },
        { testId: "t1", problemId: "mc" },
        { testId: "t2", problemId: "mc" },
        { testId: "t3", problemId: "other" },
      ],
    );
    expect(result).toEqual([
      { problemId: "sa", testCount: 2 },
      { problemId: "mc", testCount: 2 },
      { problemId: "other", testCount: 1 },
    ]);
  });
  it("preserves the eligibility of each requested expression", () => {
    const locked = { ...record("mc", "q1"), eligible: false };
    expect(
      questionUses(
        [record("sa", "q1"), locked],
        [{ testId: "t1", problemId: "mc" }],
      ),
    ).toEqual([{ problemId: "sa", testCount: 1 }]);
  });
});
