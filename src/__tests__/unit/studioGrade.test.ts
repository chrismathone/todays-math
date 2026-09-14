import { describe, it, expect } from "vitest";
import { resolveStudioGrade } from "@/components/unified/studioGrade";
import type { StudioAiPageJob } from "@/components/unified/useStudioAi";
const page = (
  page: number,
  patch: Partial<StudioAiPageJob> = {},
): StudioAiPageJob => ({
  key: `file:${page}`,
  sourceId: "file",
  page,
  state: "complete",
  ...patch,
});
const cover = page(1, {
  state: "empty",
  detectedGrade: {
    grade: "고1",
    confidence: "high",
    evidence: "표지: 고등학교 1학년",
  },
});
describe("file grade reconciliation", () => {
  it("waits for the file queue then applies explicit grade evidence from an empty cover", () => {
    expect(
      resolveStudioGrade({ id: "file" }, [cover, page(2, { state: "running" })])
        .grade,
    ).toBeUndefined();
    expect(resolveStudioGrade({ id: "file" }, [cover, page(2)])).toMatchObject({
      grade: "고1",
      needsReview: false,
    });
  });
  it("does not apply conflicting, weak or other-file evidence", () => {
    expect(
      resolveStudioGrade({ id: "file" }, [
        cover,
        page(2, {
          detectedGrade: { grade: "고2", confidence: "high", evidence: "고2" },
        }),
      ]),
    ).toMatchObject({ grade: undefined, needsReview: true });
    expect(
      resolveStudioGrade({ id: "file" }, [
        page(1, {
          detectedGrade: {
            grade: "고1",
            confidence: "medium",
            evidence: "공통수학2",
          },
        }),
      ]),
    ).toMatchObject({ grade: undefined, needsReview: true });
    expect(resolveStudioGrade({ id: "other" }, [cover]).grade).toBeUndefined();
  });
  it("preserves a manual correction through retries and conflicts", () => {
    expect(
      resolveStudioGrade({ id: "file", grade: "중3", gradeManual: true }, [
        cover,
        page(2, { state: "running" }),
      ]),
    ).toMatchObject({ grade: "중3", needsReview: false });
  });
});
