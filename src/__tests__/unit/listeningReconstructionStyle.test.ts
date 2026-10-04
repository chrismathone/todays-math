import { describe, expect, it } from "vitest";
import {
  buildListeningStyleChecks,
  listeningStyleRevisionVerification,
  selectListeningStyleTemplates,
  validateListeningStyleRevision,
  listeningStyleRevisionAuditSchema,
  LISTENING_RECONSTRUCTION_STYLE_VERSION,
  readListeningStyleGroundingJudgment,
  readListeningStyleJudgment,
  listeningStyleSemanticWarnings,
  normalizeListeningStyleGeneration,
  type ListeningStyleTemplate,
} from "@/lib/english/listening/reconstructionStyle";

const template: ListeningStyleTemplate = {
  sourceRecordId: "synthetic-test-reference",
  level: "중3",
  sourceNumber: 10,
  questionType: "number",
  prompt: "대화를 듣고, 두 사람이 만날 시각을 고르시오.",
  choices: ["3:00", "3:30", "4:00", "4:30", "5:00"],
  choiceLanguage: "numeric",
  originalPreparedPath: "test-original.json",
  originalPreparedSha256: "a".repeat(64),
  nativePreparedPath: "test-native.json",
  nativePreparedSha256: "b".repeat(64),
  sourceQuestionPdfSha256: "c".repeat(64),
  sourcePage: 1,
};
const question = {
  sourceNumber: 1,
  sourceSegmentIds: [4],
  prompt: "대화를 듣고, 도착하기로 한 시각을 고르시오.",
  choices: ["4:30", "4:00", "5:00", "5:30", "3:30"],
  correctChoiceOneBased: 1,
  explanation: "4시 30분에 도착하자고 제안했다.",
  evidenceQuotes: ["Let's arrive at four thirty."],
  questionType: "number" as const,
  topics: ["교통"],
  keywords: ["기차"],
};
const segments = [
  {
    id: 4,
    text: "Our train leaves at five. Let's arrive at four thirty.",
    uncertain: false,
  },
];
const grounding = {
  choice: "1",
  confidence: 0.96,
  selectedProbability: 0.98,
  grounded: 0.97,
  explanationSupported: 0.99,
};
const style = {
  taskStyle: 0.98,
  choiceStyle: 0.99,
  gradeAppropriate: 0.96,
  parallelDistractors: 0.97,
};

describe("official Korean listening style revision", () => {
  it("recovers only explicit taxonomy aliases and exactly bound redundant identities", () => {
    const raw = {
      questions: [
        {
          ...question,
          sourceRecordId: "bound-record",
          level: "중3",
          questionType: "reason",
        },
      ],
    };
    const snapshot = structuredClone(raw);
    const normalized = normalizeListeningStyleGeneration(raw, {
      sourceRecordId: "bound-record",
      level: "중3",
    });
    expect(raw).toEqual(snapshot);
    expect(normalized.value).toEqual({
      questions: [{ ...question, questionType: "detail" }],
    });
    expect(normalized.generationNormalization).toEqual({
      version: "structural-metadata-v1",
      steps: [
        {
          sourceNumber: 1,
          field: "sourceRecordId",
          from: "bound-record",
          to: null,
        },
        { sourceNumber: 1, field: "level", from: "중3", to: null },
        {
          sourceNumber: 1,
          field: "questionType",
          from: "reason",
          to: "detail",
        },
      ],
    });
    const substantiveFields = [
      "prompt",
      "choices",
      "correctChoiceOneBased",
      "evidenceQuotes",
      "sourceSegmentIds",
      "explanation",
      "topics",
      "keywords",
    ];
    for (const field of substantiveFields)
      expect(
        (normalized.value as typeof raw).questions[0][
          field as keyof (typeof raw.questions)[0]
        ],
      ).toEqual(raw.questions[0][field as keyof (typeof raw.questions)[0]]);
  });
  it("rejects unknown normalization labels and mismatched redundant source identities", () => {
    for (const changes of [
      { sourceRecordId: "wrong" },
      { level: "중1" },
      { questionType: "unmapped" },
      { questionType: "action" },
    ])
      expect(() =>
        normalizeListeningStyleGeneration(
          { questions: [{ ...question, ...changes }] },
          { sourceRecordId: "bound-record", level: "중3" },
        ),
      ).toThrow();
    const normalized = normalizeListeningStyleGeneration(
      { questions: [{ ...question, inventedExtra: "do not drop" }] },
      { sourceRecordId: "bound-record", level: "중3" },
    );
    expect(() =>
      validateListeningStyleRevision(segments, [question], normalized.value),
    ).toThrow();
  });
  it("requires explicit v2 for the separately authorized action taxonomy alias", () => {
    const raw = { questions: [{ ...question, questionType: "action" }] };
    const binding = { sourceRecordId: "bound-record", level: "중3" };
    expect(() => normalizeListeningStyleGeneration(raw, binding)).toThrow();
    const normalized = normalizeListeningStyleGeneration(
      raw,
      binding,
      "structural-metadata-v2",
    );
    expect(normalized.value).toEqual({
      questions: [{ ...question, questionType: "detail" }],
    });
    expect(normalized.generationNormalization).toEqual({
      version: "structural-metadata-v2",
      steps: [
        {
          sourceNumber: 1,
          field: "questionType",
          from: "action",
          to: "detail",
        },
      ],
    });
    expect(raw.questions[0].questionType).toBe("action");
    expect(() =>
      normalizeListeningStyleGeneration(
        { questions: [{ ...question, questionType: "unmapped" }] },
        binding,
        "structural-metadata-v2",
      ),
    ).toThrow();
  });
  const meaning = (
    choice: string,
    prompt = "대화를 듣고, 시기를 고르시오.",
  ) => ({ ...question, prompt, choices: [choice, "a", "b", "c", "d"] });
  it("holds a dropped deadline even when both probabilistic judgments pass", () => {
    const warning = listeningStyleSemanticWarnings(
      meaning("By this Friday"),
      meaning("금요일"),
      "Send it by this Friday.",
    );
    expect(warning).toContain("dropped_deadline");
    expect(
      listeningStyleRevisionVerification(1, grounding, style, false, warning)
        .eligible,
    ).toBe(false);
    expect(
      listeningStyleSemanticWarnings(
        meaning("By this Friday"),
        meaning("이번 주 금요일까지"),
        "Send it by this Friday.",
      ),
    ).toEqual([]);
  });
  it("holds swapped temporal qualifiers and changed calendar anchors", () => {
    expect(
      listeningStyleSemanticWarnings(
        meaning("Before Friday"),
        meaning("금요일 이후"),
        "Before Friday.",
      ),
    ).toContain("before_changed_to_after");
    expect(
      listeningStyleSemanticWarnings(
        meaning("After Friday"),
        meaning("금요일 이전"),
        "After Friday.",
      ),
    ).toContain("after_changed_to_before");
    expect(
      listeningStyleSemanticWarnings(
        meaning("At 5:00 p.m."),
        meaning("오후 5시쯤"),
        "At 5:00 p.m.",
      ),
    ).toContain("added_approximate");
    expect(
      listeningStyleSemanticWarnings(
        meaning("Friday"),
        meaning("토요일"),
        "Friday.",
      ),
    ).toContain("weekday_changed_or_dropped");
  });
  it("holds changed amounts or units and permits exact unit conversion", () => {
    expect(
      listeningStyleSemanticWarnings(
        meaning("Thirty dollars"),
        meaning("40달러"),
        "Thirty dollars.",
      ),
    ).toContain("quantity_value_changed");
    expect(
      listeningStyleSemanticWarnings(
        meaning("30 dollars"),
        meaning("30원"),
        "Thirty dollars.",
      ),
    ).toContain("quantity_unit_changed_or_dropped");
    expect(
      listeningStyleSemanticWarnings(
        meaning("One hour"),
        meaning("1분"),
        "One hour.",
      ),
    ).toContain("quantity_value_changed");
    expect(
      listeningStyleSemanticWarnings(
        meaning("One hour"),
        meaning("60분"),
        "One hour.",
      ),
    ).toEqual([]);
    expect(
      listeningStyleSemanticWarnings(
        meaning("Twenty-five dollars"),
        meaning("25달러"),
        "Twenty-five dollars.",
      ),
    ).toEqual([]);
  });
  it("holds unsupported speaker labels and roles using only selected ASR", () => {
    expect(
      listeningStyleSemanticWarnings(
        meaning("Friday"),
        {
          ...meaning("금요일"),
          prompt: "대화를 듣고, 남자가 말한 내용을 고르시오.",
        },
        "It is Friday.",
      ),
    ).toContain("unbound_speaker_gender");
    expect(
      listeningStyleSemanticWarnings(
        meaning("Friday"),
        {
          ...meaning("금요일"),
          prompt: "대화를 듣고, 남자가 말한 내용을 고르시오.",
        },
        "Man: It is Friday.",
      ),
    ).toEqual([]);
    expect(
      listeningStyleSemanticWarnings(
        meaning("Friday"),
        { ...meaning("금요일"), explanation: "상담원이 금요일이라고 말했다." },
        "It is Friday.",
      ),
    ).toContain("unbound_speaker_role");
    expect(
      listeningStyleSemanticWarnings(
        meaning("Friday"),
        { ...meaning("금요일"), explanation: "작가가 금요일이라고 말했다." },
        "Your book is good.",
      ),
    ).toContain("unbound_speaker_role");
    expect(
      listeningStyleSemanticWarnings(
        meaning("Friday"),
        { ...meaning("금요일"), explanation: "작가가 금요일이라고 말했다." },
        "The writer says Friday.",
      ),
    ).toEqual([]);
  });
  it("binds only the same grade and rejects missing grade coverage", () => {
    expect(
      selectListeningStyleTemplates(
        [template, { ...template, level: "중1" }],
        "중3",
        question,
      ),
    ).toEqual([template]);
    expect(() =>
      selectListeningStyleTemplates([template], "중1", question),
    ).toThrow("same-grade");
  });
  it("keeps answer keys, explanations and reference answers out of blind style state", () => {
    const checks = buildListeningStyleChecks(
      [{ sourceNumber: 1, transcript: segments[0].text }],
      [question],
      "중3",
      { 1: [template] },
    );
    const serialized = JSON.stringify(checks);
    expect(serialized).not.toContain("correctChoiceOneBased");
    expect(serialized).not.toContain(question.explanation);
    expect(serialized).not.toContain("answerChoiceId");
    expect(Object.keys(checks.questions)).toHaveLength(4);
    expect(() =>
      buildListeningStyleChecks([], [question], "중1", { 1: [template] }),
    ).toThrow("same-grade");
  });
  it("requires full coverage, exact source binding and stable answer positions", () => {
    expect(
      validateListeningStyleRevision(segments, [question], {
        questions: [question],
      }).questions[0].prompt,
    ).toBe(question.prompt);
    for (const changed of [
      { ...question, correctChoiceOneBased: 2 },
      { ...question, sourceSegmentIds: [5] },
      { ...question, sourceNumber: 2 },
      { ...question, evidenceQuotes: ["Invented speech"] },
      { ...question, prompt: "다음 그림을 보고 적절한 것을 고르시오." },
      { ...question, prompt: "What time do they arrive?" },
    ])
      expect(() =>
        validateListeningStyleRevision(segments, [question], {
          questions: [changed],
        }),
      ).toThrow();
    expect(() =>
      validateListeningStyleRevision(
        segments,
        [question, { ...question, sourceNumber: 2 }],
        { questions: [question] },
      ),
    ).toThrow("every");
  });
  it("retains response-task English utterances instead of translating every choice", () => {
    const reply = {
      ...question,
      questionType: "reply" as const,
      prompt:
        "대화를 듣고, 마지막 말에 이어질 응답으로 가장 적절한 것을 고르시오.",
      choices: [
        "All right, let's meet then.",
        "I lost my wallet.",
        "It tastes sweet.",
        "The shoes are blue.",
        "My birthday is in May.",
      ],
    };
    expect(
      validateListeningStyleRevision(segments, [reply], { questions: [reply] })
        .questions[0].choices,
    ).toEqual(reply.choices);
  });
  it("requires every grounding and independent style probability at the existing conservative gate", () => {
    expect(
      listeningStyleRevisionVerification(1, grounding, style, false).eligible,
    ).toBe(true);
    expect(
      listeningStyleRevisionVerification(
        1,
        { ...grounding, confidence: 0.899 },
        style,
        false,
      ).eligible,
    ).toBe(false);
    expect(
      listeningStyleRevisionVerification(
        1,
        { ...grounding, choice: "2" },
        style,
        false,
      ).eligible,
    ).toBe(false);
    expect(
      listeningStyleRevisionVerification(
        1,
        grounding,
        { ...style, choiceStyle: 0.899 },
        false,
      ).eligible,
    ).toBe(false);
    expect(
      listeningStyleRevisionVerification(1, grounding, style, true).eligible,
    ).toBe(false);
    expect(
      listeningStyleRevisionVerification(1, null, style, false).eligible,
    ).toBe(false);
    expect(
      listeningStyleRevisionVerification(
        1,
        grounding,
        { ...style, taskStyle: NaN },
        false,
      ).eligible,
    ).toBe(false);
  });
  it("recomputes adoption eligibility from raw judgments and rejects tampered approval lists", () => {
    const questionId = "00000000-0000-4000-8000-000000000001",
      answerId = "00000000-0000-4000-8000-000000000002";
    const verdict = {
      questionId,
      generatedOrdinal: 1,
      originalAnswerChoiceId: answerId,
      revisedAnswerChoiceId: answerId,
      sourceSegmentIds: [4],
      evidenceQuotes: question.evidenceQuotes,
      asrUncertain: false,
      semanticWarnings: [],
      priorVerification: "needs_review",
      groundingJudgment: grounding,
      styleJudgment: style,
      correctChoiceOneBased: 1,
      ...listeningStyleRevisionVerification(1, grounding, style, false),
      verification: "needs_review",
      templateBindings: [template],
    };
    const receipts = [
      "generation",
      "answer_verification",
      "style_verification",
    ].map((kind) => ({
      kind,
      requestPath: "request.json",
      requestHash: "d".repeat(64),
      receiptPath: "receipt.json",
      receiptSha256: "e".repeat(64),
      actualModel: "test",
    }));
    const audit = {
      version: LISTENING_RECONSTRUCTION_STYLE_VERSION,
      draftOnly: true,
      humanReviewed: false,
      audioAlignmentVerified: false,
      baselinePath: "baseline.json",
      baselineSha256: "f".repeat(64),
      baselineEditableInputSha256: "1".repeat(64),
      asrPath: "asr.json",
      asrSha256: "2".repeat(64),
      sourceAudioSha256: "3".repeat(64),
      auditDirectory: "audit",
      generatedAt: "2026-10-04T00:00:00.000Z",
      originalQuestionNumbersRecovered: false,
      threshold: 0.9,
      judgmentVersion: "4",
      receipts,
      questionVerdicts: [verdict],
      eligibleQuestionIds: [questionId],
      needsReviewQuestionIds: [],
    };
    expect(
      listeningStyleRevisionAuditSchema.parse(audit).eligibleQuestionIds,
    ).toEqual([questionId]);
    const missingWarnings = Object.fromEntries(
      Object.entries(verdict).filter(([key]) => key !== "semanticWarnings"),
    );
    expect(() =>
      listeningStyleRevisionAuditSchema.parse({
        ...audit,
        questionVerdicts: [missingWarnings],
      }),
    ).toThrow("Version 4");
    expect(() =>
      listeningStyleRevisionAuditSchema.parse({
        ...audit,
        questionVerdicts: [
          { ...verdict, groundingJudgment: { ...grounding, confidence: 0.5 } },
        ],
      }),
    ).toThrow();
    expect(() =>
      listeningStyleRevisionAuditSchema.parse({
        ...audit,
        eligibleQuestionIds: [],
      }),
    ).toThrow();
  });
  it("fails closed on incomplete raw answer coverage and versioned style probabilities", () => {
    const answers = {
      answer_1: {
        type: "choice",
        choice: "1",
        confidence: 0.98,
        probabilities: {
          "1": 0.98,
          "2": 0.01,
          "3": 0.005,
          "4": 0.001,
          "5": 0.001,
          no_unique_supported_answer: 0.003,
        },
      },
      grounded_1: { type: "noul", noul: 0.98 },
      explanation_1: { type: "noul", noul: 0.97 },
      ...Object.fromEntries(
        [
          "taskStyle",
          "choiceStyle",
          "gradeAppropriate",
          "parallelDistractors",
        ].map((dimension) => [
          `style_${dimension}_1`,
          { type: "noul", noul: 0.95 },
        ]),
      ),
    };
    expect(
      readListeningStyleGroundingJudgment(answers, 1)?.selectedProbability,
    ).toBe(0.98);
    expect(
      readListeningStyleGroundingJudgment(
        {
          ...answers,
          answer_1: { ...answers.answer_1, probabilities: { "1": 1 } },
        },
        1,
      ),
    ).toBeNull();
    expect(readListeningStyleJudgment(answers, 1, "1")?.taskStyle).toBe(0.95);
    expect(readListeningStyleJudgment(answers, 1, "2")?.taskStyle).toBe(0.95);
    expect(readListeningStyleJudgment(answers, 2, "2")).toBeNull();
    const old = buildListeningStyleChecks(
      [{ sourceNumber: 1, transcript: "Bound source" }],
      [question],
      "중3",
      { 1: [template] },
      "1",
    );
    const current = buildListeningStyleChecks(
      [{ sourceNumber: 1, transcript: "Bound source" }],
      [question],
      "중3",
      { 1: [template] },
      "2",
    );
    expect(JSON.stringify(old.state)).toContain("Bound source");
    expect(JSON.stringify(current.state)).not.toContain("Bound source");
    expect(current.questions.style_taskStyle_1.criteria).toBeDefined();
  });
});
