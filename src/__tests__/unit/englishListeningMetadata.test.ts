import { describe, expect, it } from "vitest";
import { listeningQuestionMetadataSchema } from "@/contracts/englishListeningMetadata.contract";
import { englishListeningBankQuerySchema } from "@/contracts/englishBank.contract";
import { listeningQuestionMetadata } from "@/lib/english/listening/metadata";
import { listeningDraftPrintDocument } from "@/lib/english/listening/draftPrint";
import { englishListeningFixture } from "@/mocks/englishListeningFixture";

describe("listening question search metadata and origin", () => {
  it("records source facts without inventing a topic or source for teacher questions", () => {
    const metadata = listeningQuestionMetadata(
      { sourceNumber: 3 },
      { level: "중1" },
    );
    expect(metadata).toMatchObject({
      origin: "teacher_authored",
      level: "중1",
      sourceNumber: 3,
      year: null,
      provider: null,
      questionType: "unknown",
      topics: [],
      reconstruction: null,
    });
  });
  it("preserves original metadata when a question is assembled into another level or year", () => {
    const metadata = listeningQuestionMetadata(
      { sourceNumber: 1, image: {} },
      {
        level: "중3",
        source: {
          kind: "national_listening",
          provider: "교육청",
          year: 2020,
          round: 2,
          month: null,
          originalFilename: "questions.pdf",
        },
      },
    );
    expect(listeningQuestionMetadata({ metadata }, { level: "고1" })).toEqual(
      metadata,
    );
    expect(metadata.origin).toBe("official_original");
    expect(metadata.year).toBe(2020);
  });
  it("requires reconstruction provenance, and prints its distinction without search or answer data", () => {
    const document = englishListeningFixture();
    const metadata = listeningQuestionMetadata({}, { level: "중1" });
    expect(
      listeningQuestionMetadataSchema.safeParse({
        ...metadata,
        origin: "audio_reconstructed",
      }).success,
    ).toBe(false);
    const generated = listeningQuestionMetadataSchema.parse({
      ...metadata,
      origin: "audio_reconstructed",
      keywords: ["private-search-keyword"],
      sourceAudioSha256: "a".repeat(64),
      reconstruction: {
        model: "test-model",
        generatedAt: "2026-10-04T00:00:00Z",
        sourceAudioSha256: "a".repeat(64),
        verification: "needs_review",
      },
    });
    document.groups[0].questions[0].metadata = generated;
    const student = listeningDraftPrintDocument(document, "student");
    expect(student.groups[0].questions[0].reconstructionLabel).toBe(
      "원본 문제지 없음 · 음원 기반 재구성",
    );
    expect(JSON.stringify(student)).not.toContain("private-search-keyword");
    expect(JSON.stringify(student)).not.toContain("answerChoiceId");
    expect(student.groups[0].questions[0].answer).toBeUndefined();
    expect(
      listeningQuestionMetadataSchema.safeParse({
        ...generated,
        sourceAudioSha256: "b".repeat(64),
      }).success,
    ).toBe(false);
  });
  it("accepts registered-bank year, round and origin filters, rejecting invalid bounds", () => {
    expect(
      englishListeningBankQuerySchema.parse({
        year: "2018",
        round: "2",
        origin: "official_original",
      }),
    ).toMatchObject({ year: 2018, round: 2, origin: "official_original" });
    expect(
      englishListeningBankQuerySchema.safeParse({ round: "0" }).success,
    ).toBe(false);
  });
});
