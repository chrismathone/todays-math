import { describe, expect, it } from "vitest";
import {
  examStudyGenerateRequestSchema,
  examStudyResolveRequestSchema,
  STUDY_REQUIREMENT_IDS,
} from "@/contracts/examStudy.contract";

const request = { course: "중1", count: 10, seed: 17 };

describe("original exam-study request boundary", () => {
  it("accepts bounded generation without a stored original or a school", () => {
    expect(examStudyGenerateRequestSchema.parse(request)).toMatchObject({
      ...request,
      format: "혼합",
      maxPerFamily: 1,
    });
  });

  it.each([
    { original: "원문" },
    { content: "본문" },
    { svg: "<svg/>" },
    { count: 0 },
    { count: 31 },
    { count: 1.5 },
    { seed: -1 },
    { seed: Number.MAX_SAFE_INTEGER },
    { course: "미상" },
    { format: "계산을 서술형으로" },
    { maxPerFamily: 0 },
    { familyIds: ["a", "a"] },
    { requirementIds: ["학교이름으로추측"] },
    { requirementIds: [STUDY_REQUIREMENT_IDS[0], STUDY_REQUIREMENT_IDS[0]] },
  ])("rejects unsafe, unbounded or ambiguous input: %j", (patch) => {
    expect(
      examStudyGenerateRequestSchema.safeParse({ ...request, ...patch })
        .success,
    ).toBe(false);
  });

  it("has a unique school-independent demand vocabulary", () => {
    expect(new Set(STUDY_REQUIREMENT_IDS).size).toBe(
      STUDY_REQUIREMENT_IDS.length,
    );
    expect(
      STUDY_REQUIREMENT_IDS.every((id) => /^[a-z]+\.[a-z-]+$/.test(id)),
    ).toBe(true);
  });

  it("output recheck requires a pinned digest and forbids client-authored questions", () => {
    const resolve = { recipe: request, expectedDigest: "a".repeat(64) };
    expect(examStudyResolveRequestSchema.safeParse(resolve).success).toBe(true);
    expect(
      examStudyResolveRequestSchema.safeParse({ ...resolve, questions: [] })
        .success,
    ).toBe(false);
    expect(
      examStudyResolveRequestSchema.safeParse({
        ...resolve,
        expectedDigest: "old",
      }).success,
    ).toBe(false);
  });
});
