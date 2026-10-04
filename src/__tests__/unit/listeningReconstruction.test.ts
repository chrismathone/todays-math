import { describe, expect, it } from "vitest";
import {
  validateListeningReconstruction,
  listeningReconstructionVerification,
  groundListeningReconstructionSegments,
  buildListeningReconstructionChecks,
  reorderListeningReconstructionChoices,
  listeningReconstructionDisposition,
  readListeningReconstructionGeneration,
  addListeningReconstructionFifthChoices,
  normalizeListeningReconstructionEvidenceQuotes,
} from "@/lib/english/listening/reconstruction";

const source = {
  items: [
    {
      sourceNumber: 1,
      transcript:
        "Woman: Our train leaves at five. Man: Let's arrive at four thirty.",
      uncertain: false,
    },
  ],
};
const question = {
  sourceNumber: 1,
  prompt: "What time do they plan to arrive?",
  choices: ["4:30", "4:00", "5:00", "5:30", "3:30"],
  correctChoiceOneBased: 1,
  explanation: "The man suggests arriving at four thirty.",
  evidenceQuotes: ["Let's arrive at four thirty."],
  questionType: "number" as const,
  topics: ["교통"],
  keywords: ["기차", "도착 시간"],
};

describe("audio-grounded listening reconstruction", () => {
  it("checks every raw quote before bounded staging and keeps the original candidate unchanged", () => {
    const evidenceQuotes = [
      "Woman:",
      "Our",
      "train",
      "leaves",
      "at five.",
      "Man:",
      "Let's",
      "arrive",
      "four thirty.",
    ];
    const raw = {
      questions: [{ ...question, sourceSegmentIds: [4], evidenceQuotes }],
    };
    const segments = [
      { id: 4, text: source.items[0].transcript, uncertain: false },
    ];
    const normalized = normalizeListeningReconstructionEvidenceQuotes(
      segments,
      raw,
    );
    expect(normalized.questions[0].evidenceQuotes).toEqual(
      evidenceQuotes.slice(0, 8),
    );
    expect(raw.questions[0].evidenceQuotes).toHaveLength(9);
    expect(() =>
      normalizeListeningReconstructionEvidenceQuotes(segments, {
        questions: [
          {
            ...raw.questions[0],
            evidenceQuotes: [
              ...evidenceQuotes.slice(0, 8),
              "Words never spoken",
            ],
          },
        ],
      }),
    ).toThrow("근거");
  });
  it("repairs only a missing fifth distractor while preserving the generated answer and source evidence", () => {
    const four = {
      ...question,
      choices: question.choices.slice(0, 4),
      sourceSegmentIds: [4, 7],
    };
    const repaired = addListeningReconstructionFifthChoices(
      { questions: [four] },
      { choices: [{ sourceNumber: 1, fifthChoice: "3:30" }] },
    );
    expect(repaired.questions[0]).toEqual({
      ...four,
      choices: question.choices,
    });
    expect(() =>
      addListeningReconstructionFifthChoices(
        { questions: [four] },
        { choices: [] },
      ),
    ).toThrow();
    expect(() =>
      addListeningReconstructionFifthChoices(
        { questions: [four] },
        { choices: [{ sourceNumber: 1, fifthChoice: "4:30" }] },
      ),
    ).toThrow();
    expect(() =>
      addListeningReconstructionFifthChoices(
        { questions: [{ ...four, correctChoiceOneBased: 5 }] },
        { choices: [{ sourceNumber: 1, fifthChoice: "3:30" }] },
      ),
    ).toThrow();
    expect(() =>
      addListeningReconstructionFifthChoices(
        { questions: [four] },
        { choices: [{ sourceNumber: 2, fifthChoice: "3:30" }] },
      ),
    ).toThrow();
  });
  it("accepts a filled schema wrapper only after validating actual questions and spoken evidence", () => {
    const actual = { ...question, sourceSegmentIds: [4] };
    const wrapped = { schema: { questions: [actual] }, source: { year: 9999 } };
    expect(readListeningReconstructionGeneration(wrapped).questions).toEqual([
      actual,
    ]);
    expect(
      normalizeListeningReconstructionEvidenceQuotes(
        [{ id: 4, text: source.items[0].transcript, uncertain: false }],
        wrapped,
      ).questions,
    ).toEqual([actual]);
    expect(() =>
      normalizeListeningReconstructionEvidenceQuotes(
        [{ id: 4, text: source.items[0].transcript, uncertain: false }],
        {
          schema: {
            questions: [{ ...actual, evidenceQuotes: ["exact source quote"] }],
          },
        },
      ),
    ).toThrow("근거");
  });
  it("preserves grounded text and rejects a quote invented by generation", () => {
    expect(
      validateListeningReconstruction(source, { questions: [question] })
        .questions[0],
    ).toEqual(question);
    expect(() =>
      validateListeningReconstruction(source, {
        questions: [{ ...question, evidenceQuotes: ["We arrive at four."] }],
      }),
    ).toThrow("근거");
  });
  it("rejects invented segment numbers and retains uncertain transcription for review", () => {
    expect(() =>
      validateListeningReconstruction(source, {
        questions: [{ ...question, sourceNumber: 2 }],
      }),
    ).toThrow("음원");
    expect(
      validateListeningReconstruction(
        { items: [{ ...source.items[0], uncertain: true }] },
        { questions: [question] },
      ).uncertainSourceNumbers,
    ).toEqual([1]);
  });
  it("keeps several exact evidence quotes bounded without regenerating a grounded question", () => {
    const evidenceQuotes = [
      "Our train",
      "leaves at five.",
      "Let's",
      "arrive at",
      "four thirty.",
    ];
    expect(
      validateListeningReconstruction(source, {
        questions: [{ ...question, evidenceQuotes }],
      }).questions[0].evidenceQuotes,
    ).toEqual(evidenceQuotes);
    expect(() =>
      validateListeningReconstruction(source, {
        questions: [
          {
            ...question,
            evidenceQuotes: [...evidenceQuotes, "Unspoken words"],
          },
        ],
      }),
    ).toThrow("근거");
    expect(() =>
      validateListeningReconstruction(source, {
        questions: [
          { ...question, evidenceQuotes: Array(9).fill("Our train") },
        ],
      }),
    ).toThrow();
  });
  it("rejects repeated questions and duplicate choices", () => {
    expect(() =>
      validateListeningReconstruction(source, {
        questions: [question, question],
      }),
    ).toThrow();
    expect(() =>
      validateListeningReconstruction(source, {
        questions: [
          { ...question, choices: ["4:30", " 4:30 ", "5:00", "5:30", "3:30"] },
        ],
      }),
    ).toThrow();
  });
  it("requires the independent answer and each narrow semantic check to pass", () => {
    const passed = {
      choice: "1",
      confidence: 0.96,
      selectedProbability: 0.98,
      grounded: 0.97,
      explanationSupported: 0.99,
    };
    expect(listeningReconstructionVerification(1, passed)).toBe("ai_verified");
    expect(
      listeningReconstructionVerification(1, { ...passed, choice: "2" }),
    ).toBe("needs_review");
    expect(
      listeningReconstructionVerification(1, { ...passed, grounded: 0.4 }),
    ).toBe("needs_review");
    expect(
      listeningReconstructionVerification(1, {
        ...passed,
        explanationSupported: 0.4,
      }),
    ).toBe("needs_review");
    expect(
      listeningReconstructionVerification(1, {
        ...passed,
        selectedProbability: 0.6,
      }),
    ).toBe("needs_review");
    expect(listeningReconstructionVerification(1, null)).toBe("needs_review");
  });
  it("rejects malformed probability values instead of treating them as verification", () => {
    expect(
      listeningReconstructionVerification(1, {
        choice: "1",
        confidence: NaN,
        selectedProbability: 1,
        grounded: 1,
        explanationSupported: 1,
      }),
    ).toBe("needs_review");
    expect(
      listeningReconstructionVerification(1, {
        choice: "1",
        confidence: 1,
        selectedProbability: 1,
        grounded: 1.1,
        explanationSupported: 1,
      }),
    ).toBe("needs_review");
  });
  it("grounds new question ordinals in actual ASR segments without inventing source numbers or timestamps", () => {
    const segments = [
      { id: 4, text: "Woman: Our train leaves at five.", uncertain: false },
      { id: 7, text: "Man: Let's arrive at four thirty.", uncertain: false },
    ];
    const result = groundListeningReconstructionSegments(segments, {
      questions: [{ ...question, sourceSegmentIds: [4, 7] }],
    });
    expect(result.items[0].transcript).toBe(source.items[0].transcript);
    expect(result.questions[0]).toEqual(question);
    expect(result.items[0]).not.toHaveProperty("audioRange");
    expect(() =>
      groundListeningReconstructionSegments(segments, {
        questions: [{ ...question, sourceSegmentIds: [4, 999] }],
      }),
    ).toThrow("구간");
    expect(() =>
      groundListeningReconstructionSegments(segments, {
        questions: [{ ...question, sourceSegmentIds: [7, 4] }],
      }),
    ).toThrow("순서");
    expect(
      groundListeningReconstructionSegments(
        [{ ...segments[0], uncertain: true }, segments[1]],
        { questions: [{ ...question, sourceSegmentIds: [4, 7] }] },
      ).items[0].uncertain,
    ).toBe(true);
  });
  it("keeps the proposed answer and explanation out of independent answer-selection state", () => {
    const checks = buildListeningReconstructionChecks(source.items, [question]);
    expect(JSON.stringify(checks.state)).not.toContain("correctChoiceOneBased");
    expect(JSON.stringify(checks.state)).not.toContain(question.explanation);
    expect(checks.questions.answer_1).toMatchObject({
      criteria: expect.objectContaining({
        no_unique_supported_answer: expect.any(String),
      }),
    });
    expect(checks.questions.explanation_1.instructions).toContain(
      question.explanation,
    );
    expect(checks.questions.answer_1.instructions).not.toContain(
      question.explanation,
    );
  });
  it("preserves the correct choice through a deterministic permutation", () => {
    const reordered = reorderListeningReconstructionChoices(
      question,
      [2, 0, 4, 1, 3],
    );
    expect(reordered.correctChoiceOneBased).toBe(2);
    expect(reordered.choices[reordered.correctChoiceOneBased - 1]).toBe("4:30");
    expect(reordered.prompt).toBe(question.prompt);
    expect(() =>
      reorderListeningReconstructionChoices(question, [0, 0, 2, 3, 4]),
    ).toThrow("순열");
  });
  it("ignores untrusted model source echoes without replacing actual provenance", () => {
    const candidate = { ...question, sourceSegmentIds: [4, 7] };
    expect(
      readListeningReconstructionGeneration({
        questions: [candidate],
        source: { year: 2001, rightsReviewed: true, audioSha256: "fabricated" },
      }),
    ).toEqual({ questions: [candidate] });
    expect(() =>
      readListeningReconstructionGeneration({
        source: { questions: [candidate] },
      }),
    ).toThrow();
  });
  it("excludes answer disagreement and absent grounding while keeping uncertainty explicit", () => {
    const good = {
      choice: "1",
      confidence: 0.99,
      selectedProbability: 0.99,
      grounded: 0.99,
      explanationSupported: 0.99,
    };
    expect(
      listeningReconstructionDisposition(1, { ...good, choice: "2" }, false)
        .include,
    ).toBe(false);
    expect(
      listeningReconstructionDisposition(1, { ...good, grounded: 0.2 }, false)
        .include,
    ).toBe(false);
    expect(listeningReconstructionDisposition(1, good, true)).toMatchObject({
      include: true,
      verification: "needs_review",
    });
    expect(
      listeningReconstructionDisposition(
        1,
        { ...good, explanationSupported: 0.4 },
        false,
      ),
    ).toMatchObject({
      include: true,
      clearExplanation: true,
      verification: "needs_review",
    });
    expect(listeningReconstructionDisposition(1, good, false)).toMatchObject({
      include: true,
      clearExplanation: false,
      verification: "ai_verified",
    });
  });
});
