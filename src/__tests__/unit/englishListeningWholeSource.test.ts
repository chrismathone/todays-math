// @vitest-environment node
import { describe, expect, it } from "vitest";
import { usesWholeSourceAssessmentAudio } from "@/lib/english/listening/wholeSource";

describe("national assessment whole-source audio policy", () => {
  it.each(["national_listening", "mock_exam"])(
    "recognizes %s at the set or question level",
    (kind) => {
      expect(usesWholeSourceAssessmentAudio({ source: { kind } })).toBe(true);
      expect(
        usesWholeSourceAssessmentAudio({
          groups: [{ questions: [{ metadata: { assessmentKind: kind } }] }],
        }),
      ).toBe(true);
    },
  );

  it.each(["ebs-middle-1-2026-1", "ebsi-high-1-2022-2"])(
    "retains %s provenance when an assembled set has no source",
    (sourceRecordId) => {
      expect(
        usesWholeSourceAssessmentAudio({
          groups: [
            { questions: [{ metadata: { assessmentKind: "other" } }] },
            { questions: [{ metadata: { sourceRecordId } }] },
          ],
        }),
      ).toBe(true);
    },
  );

  it.each([
    {},
    { source: null, groups: [] },
    { source: { kind: "other" }, groups: [{ questions: [{}] }] },
    { groups: [{ questions: [{ metadata: null }] }] },
    {
      groups: [{ questions: [{ metadata: { sourceRecordId: "teacher-1" } }] }],
    },
    {
      groups: [
        { questions: [{ metadata: { sourceRecordId: "my-ebs-middle-1" } }] },
      ],
    },
  ])("preserves custom teacher-authored behavior for %j", (document) => {
    expect(usesWholeSourceAssessmentAudio(document)).toBe(false);
  });
});
