// @vitest-environment node
import { describe, expect, it } from "vitest";
import { englishListeningFixture } from "@/mocks/englishListeningFixture";
import { listeningQuestionMetadata } from "@/lib/english/listening/metadata";
import { prepareListeningStyleAdoption } from "@/lib/english/listening/reconstructionStyleAdoption";
import { listeningDraftSchema } from "@/contracts/englishListeningHttp.contract";

function fixture() {
  const document = englishListeningFixture();
  document.level = "중3";
  for (const group of document.groups) {
    group.reviews = { content: null, audio: null, alignment: null };
    group.questions.forEach((question, index) => {
      question.sourceNumber = index + 1;
      question.metadata = {
        ...listeningQuestionMetadata(question, { level: document.level }),
        origin: "audio_reconstructed",
        sourceRecordId: "ebs-middle-3-2017-2",
        sourceNumber: null,
        sourceAudioSha256: group.audio.sha256,
        reconstruction: {
          model: "test-generator",
          generatedAt: "2026-10-04T01:00:00.000Z",
          sourceAudioSha256: group.audio.sha256,
          verification: "ai_verified",
        },
      };
    });
  }
  const current = listeningDraftSchema.parse(document);
  current.groups[0].questions[0].prompt = "When does the library open?";
  const baseline = {
    title: current.title,
    level: current.level,
    examId: current.examId,
    rights: { rightsStatus: "unknown" as const, allowedUses: [] },
    basis: "The staged original has no operating rights stamp",
    groups: current.groups.map(({ id, transcript, questions }) => ({
      id,
      audio: null,
      transcript: structuredClone(transcript),
      questions: structuredClone(questions),
    })),
  };
  const proposed = structuredClone(baseline);
  proposed.groups[0].questions[0].prompt =
    "대화를 듣고, 도서관이 여는 시각을 고르시오.";
  return {
    current,
    expected: structuredClone(current),
    baseline,
    proposed,
    eligibleQuestionIds: [current.groups[0].questions[0].id],
    publicationCount: 0,
  };
}

describe("qualified listening style adoption", () => {
  it("preserves operating rights, original audio, transcript, identities, answers and unrelated questions", () => {
    const input = fixture();
    const result = prepareListeningStyleAdoption(input);
    expect(result.alreadyApplied).toBe(false);
    expect(result.update.groups[0].questions[0].prompt).toBe(
      input.proposed.groups[0].questions[0].prompt,
    );
    expect(result.update.groups[0].questions[0].answerChoiceId).toBe(
      input.current.groups[0].questions[0].answerChoiceId,
    );
    expect(result.update.groups[0].audio).toEqual(
      input.current.groups[0].audio,
    );
    expect(result.update.groups[0].transcript).toEqual(
      input.current.groups[0].transcript,
    );
    expect(result.update.groups[0].questions[1]).toEqual(
      input.current.groups[0].questions[1],
    );
    expect(result.update.groups[1]).toEqual({
      ...input.baseline.groups[1],
      audio: input.current.groups[1].audio,
    });
    // The staged original has no audio attached; the operating draft does.
    expect(result.update.groups[1].audio).toEqual(
      input.current.groups[1].audio,
    );
    expect(result.update.rights).toEqual(input.current.rights);
    expect(result.update.basis).toBe(input.current.provenance.basis);
    expect(input.current.groups[0].questions[0].prompt).toBe(
      "When does the library open?",
    );
  });
  it("recognizes a completed identical edit without overwriting a newer unrelated edit", () => {
    const input = fixture();
    const result = prepareListeningStyleAdoption(input);
    input.current.groups = result.update.groups.map((group) => ({
      ...group,
      reviews: { content: null, audio: null, alignment: null },
    }));
    input.current.revision++;
    expect(prepareListeningStyleAdoption(input).alreadyApplied).toBe(true);
    input.current.groups[0].questions[1].explanation = "Teacher edit";
    expect(() => prepareListeningStyleAdoption(input)).toThrow("live snapshot");
  });
  it("rejects any live question edit or revision change since the snapshot", () => {
    for (const mutation of [
      (input: ReturnType<typeof fixture>) => input.current.revision++,
      (input: ReturnType<typeof fixture>) => {
        input.current.groups[0].questions[0].prompt = "Teacher's prompt";
      },
    ]) {
      const input = fixture();
      mutation(input);
      expect(() => prepareListeningStyleAdoption(input)).toThrow(
        "live snapshot",
      );
    }
  });
  it("rejects changed ownership, rights, media, transcript and set metadata", () => {
    const mutations = [
      (input: ReturnType<typeof fixture>) => {
        input.current.branchId = null;
      },
      (input: ReturnType<typeof fixture>) => {
        input.current.title = "Teacher title";
      },
      (input: ReturnType<typeof fixture>) => {
        input.current.groups[0].audio!.sha256 = "c".repeat(64);
      },
      (input: ReturnType<typeof fixture>) => {
        input.current.groups[0].transcript.text += " Changed";
      },
      (input: ReturnType<typeof fixture>) => {
        input.current.rights.allowedUses = ["teacher_review"];
      },
    ];
    for (const mutation of mutations) {
      const input = fixture();
      mutation(input);
      expect(() => prepareListeningStyleAdoption(input)).toThrow(
        "snapshot ownership",
      );
    }
  });
  it("preserves published and human reviewed documents", () => {
    const published = fixture();
    published.publicationCount = 1;
    expect(() => prepareListeningStyleAdoption(published)).toThrow(
      "published or human reviewed",
    );
    const reviewed = fixture();
    reviewed.current.groups[0].reviews.content =
      englishListeningFixture().groups[0].reviews.content;
    expect(() => prepareListeningStyleAdoption(reviewed)).toThrow(
      "published or human reviewed",
    );
  });
  it("rejects changed stable identities, answers, order, source hashes and reconstructed provenance", () => {
    const mutations = [
      (input: ReturnType<typeof fixture>) => {
        input.proposed.groups[0].questions[0].answerChoiceId =
          input.proposed.groups[0].questions[0].choices[1].id;
      },
      (input: ReturnType<typeof fixture>) => {
        input.proposed.groups[0].questions[0].choices.reverse();
      },
      (input: ReturnType<typeof fixture>) => {
        input.proposed.groups[0].questions.reverse();
      },
      (input: ReturnType<typeof fixture>) => {
        input.proposed.groups[0].questions[0].metadata!.sourceNumber = 1;
      },
      (input: ReturnType<typeof fixture>) => {
        input.proposed.groups[0].questions[0].metadata!.sourceAudioSha256 =
          "c".repeat(64);
        input.proposed.groups[0].questions[0].metadata!.reconstruction!.sourceAudioSha256 =
          "c".repeat(64);
      },
      (input: ReturnType<typeof fixture>) => {
        input.proposed.groups[0].questions[0].evidence = [];
      },
    ];
    for (const mutation of mutations) {
      const input = fixture();
      mutation(input);
      expect(() => prepareListeningStyleAdoption(input)).toThrow(
        "identities, answers or source provenance",
      );
    }
  });
  it("rejects missing/duplicate qualification, lost questions and edits to unqualified questions", () => {
    const missing = fixture();
    missing.eligibleQuestionIds = [];
    expect(() => prepareListeningStyleAdoption(missing)).toThrow("unqualified");
    const duplicate = fixture();
    duplicate.eligibleQuestionIds.push(duplicate.eligibleQuestionIds[0]);
    expect(() => prepareListeningStyleAdoption(duplicate)).toThrow(
      "duplicate qualified",
    );
    const unknown = fixture();
    unknown.proposed = structuredClone(unknown.baseline);
    unknown.eligibleQuestionIds = [unknown.current.id];
    expect(() => prepareListeningStyleAdoption(unknown)).toThrow(
      "qualified IDs",
    );
    const lost = fixture();
    lost.proposed.groups[0].questions.pop();
    expect(() => prepareListeningStyleAdoption(lost)).toThrow(
      "baseline questions",
    );
  });
  it("rejects attempted review promotion and keeps prior uncertain questions marked for review", () => {
    const input = fixture();
    for (const document of [input.current, input.expected])
      document.groups[0].questions[0].metadata!.reconstruction!.verification =
        "needs_review";
    input.baseline.groups[0].questions[0].metadata!.reconstruction!.verification =
      "needs_review";
    expect(() => prepareListeningStyleAdoption(input)).toThrow(
      "promote prior review",
    );
    input.proposed.groups[0].questions[0].metadata!.reconstruction!.verification =
      "needs_review";
    expect(
      prepareListeningStyleAdoption(input).update.groups[0].questions[0]
        .metadata!.reconstruction!.verification,
    ).toBe("needs_review");
  });
  it("rejects English task instructions and visual tasks without an actual image", () => {
    const english = fixture();
    english.proposed.groups[0].questions[0].prompt =
      "Choose the time they arrive.";
    expect(() => prepareListeningStyleAdoption(english)).toThrow("style edit");
    const visual = fixture();
    visual.proposed.groups[0].questions[0].metadata!.questionType = "visual";
    expect(() => prepareListeningStyleAdoption(visual)).toThrow("style edit");
  });
});
