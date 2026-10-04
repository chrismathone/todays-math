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
  it("preserves imported assessment metadata and a full-question clip independently of answer evidence", () => {
    const document = englishListeningFixture();
    document.source = {
      kind: "national_listening",
      provider: "시·도교육청",
      year: 2026,
      round: 2,
      month: null,
      originalFilename: "questions.pdf",
    };
    document.provenance.kind = "uploaded_assessment";
    const question = document.groups[0].questions[0];
    question.sourceNumber = 7;
    question.image = {
      dataUrl: "data:image/png;base64,iVBORw0KGgo=",
      width: 320,
      height: 480,
    };
    question.audioRange = { startMs: 1000, endMs: 14000 };
    const parsed = englishListeningDocumentSchema.parse(document);
    expect(parsed.source).toEqual(document.source);
    expect(parsed.groups[0].questions[0]).toEqual(question);
    question.audioRange.endMs = document.groups[0].audio.durationMs + 1;
    expect(englishListeningDocumentSchema.safeParse(document).success).toBe(
      false,
    );
  });

  it.each([
    "https://example.test/answer.png",
    "data:image/svg+xml;base64,PHN2Zz4=",
    "data:image/png;base64,PHN2Zz4=",
  ])("rejects external images and non-PNG payloads: %s", (dataUrl) => {
    const document = englishListeningFixture();
    document.groups[0].questions[0].image = {
      dataUrl,
      width: 320,
      height: 480,
    };
    expect(englishListeningDocumentSchema.safeParse(document).success).toBe(
      false,
    );
  });

  it("preserves a standalone account's null branch without inventing a tenant", () => {
    const document = { ...englishListeningFixture(), branchId: null };
    expect(englishListeningDocumentSchema.parse(document).branchId).toBeNull();
    const assignment = {
      ...englishListeningAssignmentFixture(),
      branchId: null,
    };
    expect(
      englishListeningAssignmentSchema.parse(assignment).branchId,
    ).toBeNull();
  });
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
