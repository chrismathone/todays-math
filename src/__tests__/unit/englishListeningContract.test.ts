// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  englishListeningDocumentSchema,
  englishListeningAssignmentSchema,
} from "@/contracts/englishListening.contract";
import {
  englishListeningFixture,
  englishListeningAssignmentFixture,
} from "@/mocks/englishListeningFixture";

describe("listening strict contract", () => {
  it("keeps schema version separate from edit revision without normalization", () => {
    const document = englishListeningFixture();
    document.revision = 28;
    expect(englishListeningDocumentSchema.parse(document)).toEqual(document);
    expect(
      englishListeningDocumentSchema.safeParse({
        ...document,
        schemaVersion: 28,
      }).success,
    ).toBe(false);
  });

  it.each(["root", "group", "choice", "audio"])(
    "rejects unknown fields at %s",
    (location) => {
      const document = englishListeningFixture();
      const target = {
        root: document,
        group: document.groups[0],
        choice: document.groups[0].questions[0].choices[0],
        audio: document.groups[0].audio,
      }[location]!;
      Object.assign(target, { internalNote: "do not silently discard" });
      expect(englishListeningDocumentSchema.safeParse(document).success).toBe(
        false,
      );
    },
  );

  it.each(["group", "question", "choice"])(
    "rejects duplicate stable %s IDs",
    (kind) => {
      const document = englishListeningFixture();
      if (kind === "group") document.groups[1].id = document.groups[0].id;
      if (kind === "question")
        document.groups[1].questions[0].id = document.groups[0].questions[0].id;
      if (kind === "choice")
        document.groups[0].questions[0].choices[1].id =
          document.groups[0].questions[0].choices[0].id;
      expect(englishListeningDocumentSchema.safeParse(document).success).toBe(
        false,
      );
    },
  );

  it("rejects dangling answers, unsafe ranges, and same asset split across release groups", () => {
    const document = englishListeningFixture();
    document.groups[0].questions[0].answerChoiceId =
      document.groups[1].questions[0].choices[0].id;
    expect(englishListeningDocumentSchema.safeParse(document).success).toBe(
      false,
    );
    const range = englishListeningFixture();
    range.groups[0].questions[0].evidence[0].endMs =
      range.groups[0].audio.durationMs + 1;
    expect(englishListeningDocumentSchema.safeParse(range).success).toBe(false);
    const shared = englishListeningFixture();
    shared.groups[1].audio = shared.groups[0].audio;
    expect(englishListeningDocumentSchema.safeParse(shared).success).toBe(
      false,
    );
  });

  it("refuses inconsistent assignment modes, dates and duplicate recipients", () => {
    const assignment = englishListeningAssignmentFixture();
    expect(englishListeningAssignmentSchema.safeParse(assignment).success).toBe(
      true,
    );
    expect(
      englishListeningAssignmentSchema.safeParse({
        ...assignment,
        mode: "exam",
      }).success,
    ).toBe(false);
    expect(
      englishListeningAssignmentSchema.safeParse({
        ...assignment,
        closesAt: assignment.opensAt,
      }).success,
    ).toBe(false);
    expect(
      englishListeningAssignmentSchema.safeParse({
        ...assignment,
        targetStudentIds: [
          ...assignment.targetStudentIds,
          assignment.targetStudentIds[0],
        ],
      }).success,
    ).toBe(false);
  });
});
