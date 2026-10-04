import { z } from "zod";
import { listeningStyleSemanticWarnings as literalSemanticWarnings } from "./reconstructionStyleSemantics";
import {
  groundListeningReconstructionSegments,
  listeningReconstructionVerification,
  listeningSegmentReconstructionSchema,
  type ListeningReconstructionJudgment,
  type ListeningReconstructionQuestion,
} from "./reconstruction";

export const LISTENING_RECONSTRUCTION_STYLE_VERSION =
  "korean-official-style-v4-20261005";
export const LISTENING_RECONSTRUCTION_STYLE_THRESHOLD = 0.9;
export const listeningStyleGenerationNormalizationSchema = z.strictObject({
  version: z.literal("structural-metadata-v1"),
  steps: z.array(
    z.strictObject({
      sourceNumber: z.number().int().positive(),
      field: z.enum(["questionType", "sourceRecordId", "level"]),
      from: z.string(),
      to: z.string().nullable(),
    }),
  ),
});
/** Explicit structural recovery only. Raw receipt and all substantive item fields stay unchanged. */
export function normalizeListeningStyleGeneration(
  raw: unknown,
  binding: { sourceRecordId: string; level: string },
) {
  const value = structuredClone(raw);
  if (
    !value ||
    typeof value !== "object" ||
    !Array.isArray((value as { questions?: unknown }).questions)
  )
    throw new Error("Generation normalization requires a questions array");
  const steps: z.infer<
    typeof listeningStyleGenerationNormalizationSchema
  >["steps"] = [];
  for (const item of (value as { questions: unknown[] }).questions) {
    if (!item || typeof item !== "object")
      throw new Error("Generation normalization requires question objects");
    const question = item as Record<string, unknown>;
    const sourceNumber = z
      .number()
      .int()
      .positive()
      .parse(question.sourceNumber);
    for (const field of ["sourceRecordId", "level"] as const) {
      if (!(field in question)) continue;
      if (question[field] !== binding[field])
        throw new Error(
          `Redundant ${field} does not match immutable source binding`,
        );
      steps.push({ sourceNumber, field, from: binding[field], to: null });
      delete question[field];
    }
    if (question.questionType === "reason") {
      steps.push({
        sourceNumber,
        field: "questionType",
        from: question.questionType,
        to: "detail",
      });
      question.questionType = "detail";
    }
    listeningSegmentReconstructionSchema.shape.questions.element.shape.questionType.parse(
      question.questionType,
    );
  }
  return {
    value,
    generationNormalization: listeningStyleGenerationNormalizationSchema.parse({
      version: "structural-metadata-v1",
      steps,
    }),
  };
}
/** A new independent verifier may reuse a prior generation, never rewrite its raw version. */
export function listeningStyleGenerationVersionAllowed(
  auditVersion: string,
  generationVersion: unknown,
) {
  const catalog: Record<string, readonly string[]> = {
    "korean-official-style-v1-20261005": ["korean-official-style-v1-20261005"],
    "korean-official-style-v2-20261005": ["korean-official-style-v2-20261005"],
    "korean-official-style-v3-20261005": [
      "korean-official-style-v2-20261005",
      "korean-official-style-v3-20261005",
    ],
    "korean-official-style-v4-20261005": [
      "korean-official-style-v2-20261005",
      "korean-official-style-v3-20261005",
      "korean-official-style-v4-20261005",
    ],
  };
  return (
    typeof generationVersion === "string" &&
    !!catalog[auditVersion]?.includes(generationVersion)
  );
}
export const listeningStyleTemplateSchema = z.strictObject({
  sourceRecordId: z.string(),
  level: z.string(),
  sourceNumber: z.number().int().positive(),
  questionType:
    listeningSegmentReconstructionSchema.shape.questions.element.shape
      .questionType,
  prompt: z.string().min(1),
  choices: z.array(z.string().min(1)).length(5),
  choiceLanguage: z.enum(["korean", "english", "numeric", "mixed"]),
  originalPreparedPath: z.string(),
  originalPreparedSha256: z.string().regex(/^[a-f0-9]{64}$/),
  nativePreparedPath: z.string(),
  nativePreparedSha256: z.string().regex(/^[a-f0-9]{64}$/),
  sourceQuestionPdfSha256: z.string().regex(/^[a-f0-9]{64}$/),
  sourcePage: z.number().int().positive(),
});
export type ListeningStyleTemplate = z.infer<
  typeof listeningStyleTemplateSchema
>;

/** Explicit task words only; this does not infer a recovered official question. */
export function listeningStyleTaskType(
  prompt: string,
  fallback: ListeningReconstructionQuestion["questionType"],
) {
  if (/응답|할 말|이어질|response|reply/i.test(prompt)) return "reply" as const;
  if (
    /금액|지불|비용|시각|몇 시|요일|날짜|how much|total cost|what time|how often|registration fee|when.*(?:receive|closed|used)/i.test(
      prompt,
    )
  )
    return "number" as const;
  if (/목적|purpose/i.test(prompt)) return "purpose" as const;
  if (/주제|요지|무엇에 관한|어떤.*설명|main topic|main idea/i.test(prompt))
    return "gist" as const;
  if (/의견|주장|opinion/i.test(prompt)) return "opinion" as const;
  if (/관계|relationship/i.test(prompt)) return "relationship" as const;
  if (/장소|어디에서|location|where.*(?:talk|conversation)/i.test(prompt))
    return "location" as const;
  if (/심정|기분|emotion|feel/i.test(prompt)) return "emotion" as const;
  return fallback === "unknown" ? ("detail" as const) : fallback;
}

export function selectListeningStyleTemplates(
  templates: ListeningStyleTemplate[],
  level: string,
  question: Pick<
    ListeningReconstructionQuestion,
    "prompt" | "questionType" | "choices"
  >,
) {
  const task = listeningStyleTaskType(question.prompt, question.questionType);
  const sameGrade = templates.filter(
    (template) =>
      template.level === level && template.questionType !== "visual",
  );
  const exact = sameGrade.filter((template) => template.questionType === task);
  const candidates = exact.length
    ? exact
    : sameGrade.filter((template) => template.questionType === "detail");
  if (!candidates.length)
    throw new Error(`No actual same-grade text template for ${level}/${task}`);
  const numeric =
    task === "number" ||
    question.choices.every((choice) =>
      /^(?:\$?\s*\d|(?:on |by )?(?:mon|tues|wednes|thurs|fri|satur|sun)day)/i.test(
        choice,
      ),
    );
  const desired = task === "reply" ? "english" : numeric ? "numeric" : "korean";
  return [...candidates]
    .sort(
      (a, b) =>
        Number(b.choiceLanguage === desired) -
          Number(a.choiceLanguage === desired) ||
        a.sourceRecordId.localeCompare(b.sourceRecordId) ||
        a.sourceNumber - b.sourceNumber,
    )
    .slice(0, 2);
}

export const LISTENING_KOREAN_STYLE_INSTRUCTIONS = [
  "Write newly reconstructed listening items in the same-grade Korean nationwide listening-exam style shown by the bound actual official examples, not generic English reading-comprehension questions.",
  "All task instructions/prompts must be natural Korean 발문, usually 대화를 듣고, ... 고르시오 or 다음을 듣고, ... 고르시오. Keep the exact evidence-supported listening focus and target grade; do not add tasks just to mimic the official distribution.",
  "Choose choice language by the task and actual examples: content, purpose, detail, reason, action, emotion, relationship and location normally use concise Korean phrases; reply/next-utterance tasks use parallel English utterances. Numeric/time/date choices may use numerals, currency or conventional date forms. Do not blindly translate reply choices or assume every choice must contain Hangul.",
  "Use five plausible, parallel distractors within the same semantic category and grammatical form, comparable in length and complexity. The correct choice must not stand out by detail, wording, length, or overlap with the prompt. Distractors are invented alternatives, never claims that they were spoken.",
  "Preserve the evidence-supported focus and correct answer meaning. Avoid multiple equally defensible answers, arbitrary trivia, outside knowledge, repetitive tasks, invented speaker identities, and translation of an already stated correct answer into the prompt.",
  "Use only the selected exact original ASR speech. Missing/uncertain speech and nearby recorded Korean instructions are context, not recovered official sheet or answer evidence. Never infer a missing utterance, change transcript quotes, invent an audio range, or claim human/audio-alignment verification.",
  "Never create a visual/diagram/table/map question without the actual supplied visual. For an originally visual recording retain an evidence-supported text-only listening focus; the templates supply style, never facts or answers for this recording.",
  "Keep explanations concise Korean and supported only by exact selected speech. Topics/keywords describe the task without answer phrases. Return strict JSON only.",
].join(" ");

/** Full candidate coverage and immutable evidence/answer position are enforced in code. */
export function validateListeningStyleRevision(
  segments: unknown,
  baseline: Array<
    ListeningReconstructionQuestion & { sourceSegmentIds: number[] }
  >,
  generated: unknown,
) {
  const revised = listeningSegmentReconstructionSchema.parse(generated);
  if (revised.questions.length !== baseline.length)
    throw new Error(
      "Style revision must cover every existing question exactly once",
    );
  for (let index = 0; index < baseline.length; index++) {
    const previous = baseline[index];
    const next = revised.questions[index];
    if (previous.sourceNumber !== next.sourceNumber)
      throw new Error(
        "Style revision cannot reorder or renumber existing questions",
      );
    if (
      JSON.stringify(previous.sourceSegmentIds) !==
      JSON.stringify(next.sourceSegmentIds)
    )
      throw new Error("Style revision cannot change source segment bindings");
    if (previous.correctChoiceOneBased !== next.correctChoiceOneBased)
      throw new Error(
        "Style revision cannot change the stable answer reference",
      );
    if (
      next.questionType === "visual" ||
      /(?:다음|아래)\s*(?:그림|도표|표를|지도)/.test(next.prompt)
    )
      throw new Error("Style revision has no supplied visual");
    if (
      !/[가-힣]/.test(next.prompt) ||
      !/고르(?:시오|세요)|적절한.*것/.test(next.prompt)
    )
      throw new Error(
        "Style revision requires a Korean listening-exam instruction",
      );
  }
  return groundListeningReconstructionSegments(segments, revised);
}

export const LISTENING_STYLE_DIMENSIONS = [
  "taskStyle",
  "choiceStyle",
  "gradeAppropriate",
  "parallelDistractors",
] as const;
export type ListeningStyleJudgment = Record<
  (typeof LISTENING_STYLE_DIMENSIONS)[number],
  number
>;

/** Shared receipt parsers fail closed on missing/invalid probabilities or candidate coverage. */
export function readListeningStyleGroundingJudgment(
  answers: Record<string, unknown>,
  id: number,
): ListeningReconstructionJudgment | null {
  const answer = z
    .object({
      type: z.literal("choice"),
      choice: z.string(),
      confidence: z.number().min(0).max(1),
      probabilities: z.record(z.string(), z.number().min(0).max(1)),
    })
    .safeParse(answers[`answer_${id}`]);
  const noul = z.object({
    type: z.literal("noul"),
    noul: z.number().min(0).max(1),
  });
  const grounded = noul.safeParse(answers[`grounded_${id}`]),
    explanation = noul.safeParse(answers[`explanation_${id}`]);
  if (!answer.success || !grounded.success || !explanation.success) return null;
  const expected = ["1", "2", "3", "4", "5", "no_unique_supported_answer"];
  const probabilities = answer.data.probabilities,
    selected = probabilities[answer.data.choice];
  if (
    Object.keys(probabilities).length !== expected.length ||
    expected.some((key) => !(key in probabilities)) ||
    selected === undefined ||
    Math.abs(Object.values(probabilities).reduce((a, b) => a + b, 0) - 1) >
      0.01 ||
    Object.values(probabilities).some((value) => value > selected)
  )
    return null;
  return {
    choice: answer.data.choice,
    confidence: answer.data.confidence,
    selectedProbability: selected,
    grounded: grounded.data.noul,
    explanationSupported: explanation.data.noul,
  };
}
export function readListeningStyleJudgment(
  answers: Record<string, unknown>,
  id: number,
  judgmentVersion: "1" | "2" | "3" | "4" = "4",
): ListeningStyleJudgment | null {
  if (judgmentVersion === "4") {
    const shape = z.object({
      type: z.literal("choice"),
      choice: z.enum(["pass", "fail"]),
      confidence: z.number().min(0).max(1),
      probabilities: z.strictObject({
        pass: z.number().min(0).max(1),
        fail: z.number().min(0).max(1),
      }),
    });
    const scores = LISTENING_STYLE_DIMENSIONS.map((dimension) =>
      shape.safeParse(answers[`style_${dimension}_${id}`]),
    );
    if (
      scores.some(
        (score) =>
          !score.success ||
          Math.abs(
            score.data.probabilities.pass + score.data.probabilities.fail - 1,
          ) > 0.01 ||
          score.data.probabilities[score.data.choice] <
            Math.max(...Object.values(score.data.probabilities)),
      )
    )
      return null;
    // Conservative gate minimum, not a claim that confidence itself measures correctness.
    return Object.fromEntries(
      scores.map((score, index) => [
        LISTENING_STYLE_DIMENSIONS[index],
        score.success
          ? Math.min(score.data.confidence, score.data.probabilities.pass)
          : 0,
      ]),
    ) as ListeningStyleJudgment;
  }
  const noul = z.object({
    type: z.literal("noul"),
    noul: z.number().min(0).max(1),
  });
  const values = LISTENING_STYLE_DIMENSIONS.map((dimension) =>
    noul.safeParse(answers[`style_${dimension}_${id}`]),
  );
  if (values.some((value) => !value.success)) return null;
  return Object.fromEntries(
    values.map((value, index) => [
      LISTENING_STYLE_DIMENSIONS[index],
      value.success
        ? judgmentVersion === "3"
          ? 1 - value.data.noul
          : value.data.noul
        : 0,
    ]),
  ) as ListeningStyleJudgment;
}

/** No proposed keys, explanations, evidence highlights or reference answers enter this state. */
export function buildListeningStyleChecks(
  items: Array<{ sourceNumber: number; transcript: string }>,
  candidates: ListeningReconstructionQuestion[],
  level: string,
  bindings: Record<number, ListeningStyleTemplate[]>,
  judgmentVersion: "1" | "2" | "3" | "4" = "4",
) {
  const state = Object.fromEntries(
    candidates.map((candidate) => {
      const templates = bindings[candidate.sourceNumber];
      if (
        !templates?.length ||
        templates.some((template) => template.level !== level)
      )
        throw new Error(
          "Style verification requires actual same-grade templates",
        );
      return [
        `style_question_${candidate.sourceNumber}`,
        {
          level,
          ...(judgmentVersion === "1"
            ? {
                transcript: items.find(
                  (item) => item.sourceNumber === candidate.sourceNumber,
                )?.transcript,
              }
            : {}),
          prompt: candidate.prompt,
          choices: candidate.choices,
          questionType: candidate.questionType,
          actualOfficialExamples: templates.map(
            ({ prompt, choices, questionType, choiceLanguage }) => ({
              prompt,
              choices,
              questionType,
              choiceLanguage,
            }),
          ),
        },
      ];
    }),
  );
  const questions: Record<
    string,
    {
      type: "noul";
      instructions: string;
      criteria?: { true: string; false: string };
    }
  > = {};
  for (const candidate of candidates) {
    const id = candidate.sourceNumber;
    const target = `style_question_${id}`;
    const prefix = `Judge only \`${target}\`; other named records concern separate questions. Actual official examples are same-grade style references, not answers or evidence for the candidate. `;
    if (judgmentVersion === "3") {
      const focus = `Evaluate \`${target}\` only, comparing its prompt/choices to its same-grade official examples. Answer correctness is checked separately. `;
      questions[`style_taskStyle_${id}`] = {
        type: "noul",
        instructions:
          focus +
          "Does the prompt contain a listening-task instruction defect?",
        criteria: {
          true: "Generic English comprehension prompt, unnatural/malformed Korean direction, declared task/type mismatch, answer stated in the prompt, or reliance on an unavailable picture/table/map.",
          false:
            "Natural Korean 발문 requesting the declared listening task. Proper names and a following English speaker blank are normal. Standard concise exam wording is sufficient.",
        },
      };
      questions[`style_choiceStyle_${id}`] = {
        type: "noul",
        instructions:
          focus +
          "Do the choices use the wrong language or written option form for this listening task?",
        criteria: {
          true: "English comprehension/content phrases where the Korean content task needs Korean options; Korean translations instead of English response utterances; incompatible grammatical or date/number notation forms in the same set.",
          false:
            "Korean content/reason/action/purpose phrases, English response utterances, or conventional amounts/times/dates for number tasks. Proper nouns and conventional English dates are allowed. Moderate variation in phrase length or wording is normal.",
        },
      };
      questions[`style_gradeAppropriate_${id}`] = {
        type: "noul",
        instructions:
          focus +
          "Does the written task require vocabulary or reading skills beyond the ordinary range of this grade's official listening questions?",
        criteria: {
          true: "Unusually advanced academic/specialist vocabulary, extensive reading or outside specialist knowledge beyond the target grade, compared to the actual same-grade examples.",
          false:
            "Everyday vocabulary and short exam phrases within the same-grade range. Simple detail or number items are valid at this grade. The original recording's grade and speech evidence are bound and checked separately.",
        },
      };
      questions[`style_parallelDistractors_${id}`] = {
        type: "noul",
        instructions:
          focus +
          "Does the option set have a concrete defect that makes its distractors nonparallel or gives away one option?",
        criteria: {
          true: "Mixes incompatible conceptual answer categories; absurd alternatives; duplicate/overlapping competing answers; or one option conspicuously more specific/detailed or uniquely copying the prompt wording. For example morning/afternoon mixed with weekday/weekend/anytime in one set is defective.",
          false:
            "Five plausible alternatives of the conceptual kind requested: reasons, actions, objects, descriptions, amounts, times or utterances. Response alternatives may be different topics. Wrong alternatives need not have been spoken. Moderate length variation seen in official options is normal.",
        },
      };
      continue;
    }
    if (judgmentVersion === "2" || judgmentVersion === "4") {
      const focus = `Evaluate \`${target}\` only. Source answer correctness is checked separately; do not solve the question here. `;
      questions[`style_taskStyle_${id}`] = {
        type: "noul",
        instructions:
          focus +
          "Does the candidate prompt follow the Korean 발문 convention for its declared listening task, as illustrated by the same-grade official examples?",
        criteria: {
          true: "Natural Korean exam direction requesting this task, such as 대화를 듣고 ... 고르시오 or 다음을 듣고 ... 고르시오, matching its declared question type. Proper names and a following English speaker blank are normal.",
          false:
            "English comprehension prompt, awkward translation, task/type mismatch, question that reveals the answer, or direction requiring an unavailable picture/table/map.",
        },
      };
      questions[`style_choiceStyle_${id}`] = {
        type: "noul",
        instructions:
          focus +
          "Do the choices use the conventional language and written form for this task, comparable to the official examples?",
        criteria: {
          true: "Korean content/reason/purpose/action phrases; English utterances for response tasks; consistent numeric/currency/date notation for number tasks. Proper nouns and conventional English dates are allowed. Judge the candidate's own task rather than requiring the exact example wording.",
          false:
            "Generic English comprehension phrases on a Korean content task; Korean translation of response utterances; or inconsistent grammatical/notation forms within the alternatives.",
        },
      };
      questions[`style_gradeAppropriate_${id}`] = {
        type: "noul",
        instructions:
          focus +
          "Is the vocabulary and reading demand of the prompt and choices within the ordinary range of this grade's official listening questions?",
        criteria: {
          true: "Comparable everyday vocabulary, phrase length and task demand to the bound same-grade examples. Simple detail/numeric items also occur at this grade and are acceptable; evaluate written task accessibility, while the original same-grade recording and evidence are checked separately.",
          false:
            "Requires unusually advanced academic vocabulary, extensive reading, outside specialist knowledge or comprehension skills beyond this grade's official tasks.",
        },
      };
      questions[`style_parallelDistractors_${id}`] = {
        type: "noul",
        instructions:
          focus +
          "Are all five choices plausible alternatives of the same conceptual kind requested by the prompt, with comparable specificity?",
        criteria: {
          true: "Five competing reasons, actions, purposes, objects, story descriptions, amounts, times or response utterances in a parallel set. Response alternatives may concern different topics; all must function as possible utterances. Wrong distractors need not be spoken. Moderate length variation is normal in official examples.",
          false:
            "Mixes incompatible categories such as times of day with weekday/weekend preferences; one alternative is conspicuously more detailed or uniquely matches the prompt wording; nonsensical alternatives; or options duplicate or overlap so they are not distinct competing answers.",
        },
      };
      continue;
    }
    questions[`style_taskStyle_${id}`] = {
      type: "noul",
      instructions:
        prefix +
        `Does \`${target}.prompt\` use a natural Korean listening-exam instruction and request a coherent listening task matching \`${target}.questionType\`, comparable to the official examples? Reject English comprehension prompts, malformed/translated phrasing, answer-revealing prompts, and unavailable visuals.`,
    };
    questions[`style_choiceStyle_${id}`] = {
      type: "noul",
      instructions:
        prefix +
        `Do \`${target}.choices\` use the appropriate language and form for this listening task, comparable to the official examples? Content/purpose/detail/reason/action usually use concise Korean phrases; reply tasks use English utterances; numeric/time/date choices may use conventional numeric or date forms. Proper nouns or currency need not be translated. Reject generic English comprehension choices for a Korean content task.`,
    };
    questions[`style_gradeAppropriate_${id}`] = {
      type: "noul",
      instructions:
        prefix +
        `Is the linguistic demand and listening-task complexity of this candidate appropriate for \`${target}.level\`, compared with its actual official examples and the supplied spoken evidence? Reject needlessly complex reading, outside knowledge or a trivial/unusual question that fails to assess the evident listening content.`,
    };
    questions[`style_parallelDistractors_${id}`] = {
      type: "noul",
      instructions:
        prefix +
        `Do the five choices form a plausible, parallel set of alternatives for this prompt, with consistent semantic category, grammatical form and comparable length/detail, without an obvious correct-choice wording/length cue or a duplicate/overlapping distractor? Judge the choices as exam alternatives, not as claims that all were spoken.`,
    };
  }
  if (judgmentVersion === "4")
    return {
      state,
      questions: Object.fromEntries(
        Object.entries(questions).map(([id, check]) => {
          if (!check.criteria)
            throw new Error(
              "Choice style check requires explicit pass/fail definitions",
            );
          return [
            id,
            {
              type: "choice" as const,
              instructions: check.instructions.replace(
                "Source answer correctness is checked separately; do not solve the question here.",
                "Classify this one style property. Answer correctness is checked separately.",
              ),
              criteria: {
                pass: check.criteria.true,
                fail: check.criteria.false,
              },
            },
          ];
        }),
      ),
    };
  return { state, questions };
}

type MeaningQuestion = Pick<
  ListeningReconstructionQuestion,
  "prompt" | "choices" | "correctChoiceOneBased" | "questionType"
> &
  Partial<Pick<ListeningReconstructionQuestion, "explanation">>;
/** Literal invariants only; unknown translation meaning still needs the independent Jev checks. */
export function listeningStyleSemanticWarnings(
  baseline: MeaningQuestion,
  candidate: MeaningQuestion,
  sourceTranscript: string,
) {
  const warnings = new Set<string>(
    literalSemanticWarnings(baseline, candidate),
  );
  const wording = `${candidate.prompt} ${candidate.explanation ?? ""}`;
  if (
    (/남자|남성/.test(wording) &&
      !/\b(?:man|male|boy)\s*:|남자\s*:|남성\s*:/i.test(sourceTranscript)) ||
    (/여자|여성/.test(wording) &&
      !/\b(?:woman|female|girl)\s*:|여자\s*:|여성\s*:/i.test(sourceTranscript))
  )
    warnings.add("unbound_speaker_gender");
  const roles = [
    {
      candidate: /상담원/,
      source:
        /\b(?:counselor|consultant|customer service (?:agent|representative))\b/i,
    },
    {
      candidate: /작가/,
      source: /\b(?:author|writer|writing a book|write books)\b/i,
    },
    { candidate: /손님|고객/, source: /\bcustomer\b/i },
    { candidate: /점원/, source: /\b(?:clerk|salesperson|shop assistant)\b/i },
  ];
  for (const role of roles)
    if (role.candidate.test(wording) && !role.source.test(sourceTranscript))
      warnings.add("unbound_speaker_role");
  return [...warnings];
}

export function listeningStyleRevisionVerification(
  correctChoiceOneBased: number,
  grounding: ListeningReconstructionJudgment | null,
  style: ListeningStyleJudgment | null,
  uncertainAsr: boolean,
  semanticWarnings: readonly string[] = [],
) {
  const answerVerified =
    listeningReconstructionVerification(correctChoiceOneBased, grounding) ===
    "ai_verified";
  const styleVerified =
    !!style &&
    LISTENING_STYLE_DIMENSIONS.every(
      (dimension) =>
        Number.isFinite(style[dimension]) &&
        style[dimension] >= LISTENING_RECONSTRUCTION_STYLE_THRESHOLD &&
        style[dimension] <= 1,
    );
  return {
    answerVerified,
    styleVerified,
    eligible:
      answerVerified &&
      styleVerified &&
      !uncertainAsr &&
      !semanticWarnings.length,
    verification:
      answerVerified &&
      styleVerified &&
      !uncertainAsr &&
      !semanticWarnings.length
        ? ("ai_verified" as const)
        : ("needs_review" as const),
  };
}

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const probability = z.number().min(0).max(1);
export const listeningStyleReceiptReferenceSchema = z.strictObject({
  kind: z.enum(["generation", "answer_verification", "style_verification"]),
  requestPath: z.string().min(1),
  requestHash: hash,
  receiptPath: z.string().min(1),
  receiptSha256: hash,
  actualModel: z.string().min(1),
});
export const listeningStyleRevisionAuditSchema = z
  .strictObject({
    version: z.enum([
      "korean-official-style-v1-20261005",
      "korean-official-style-v2-20261005",
      "korean-official-style-v3-20261005",
      LISTENING_RECONSTRUCTION_STYLE_VERSION,
    ]),
    draftOnly: z.literal(true),
    humanReviewed: z.literal(false),
    audioAlignmentVerified: z.literal(false),
    baselinePath: z.string().min(1),
    baselineSha256: hash,
    baselineEditableInputSha256: hash,
    asrPath: z.string().min(1),
    asrSha256: hash,
    sourceAudioSha256: hash,
    auditDirectory: z.string().min(1),
    generatedAt: z.iso.datetime(),
    originalQuestionNumbersRecovered: z.literal(false),
    threshold: z.literal(LISTENING_RECONSTRUCTION_STYLE_THRESHOLD),
    judgmentVersion: z.enum(["1", "2", "4"]).default("1"),
    generationNormalization:
      listeningStyleGenerationNormalizationSchema.optional(),
    receipts: z.array(listeningStyleReceiptReferenceSchema).min(3),
    questionVerdicts: z
      .array(
        z.strictObject({
          questionId: z.uuid(),
          generatedOrdinal: z.number().int().positive(),
          originalAnswerChoiceId: z.uuid(),
          revisedAnswerChoiceId: z.uuid(),
          sourceSegmentIds: z.array(z.number().int().positive()).min(1),
          evidenceQuotes: z.array(z.string().min(1)).min(1).max(8),
          asrUncertain: z.boolean(),
          semanticWarnings: z.array(z.string().min(1)).optional(),
          priorVerification: z.enum(["ai_verified", "needs_review"]),
          groundingJudgment: z
            .strictObject({
              choice: z.string(),
              confidence: probability,
              selectedProbability: probability,
              grounded: probability,
              explanationSupported: probability,
            })
            .nullable(),
          styleJudgment: z
            .strictObject({
              taskStyle: probability,
              choiceStyle: probability,
              gradeAppropriate: probability,
              parallelDistractors: probability,
            })
            .nullable(),
          correctChoiceOneBased: z.number().int().min(1).max(5),
          answerVerified: z.boolean(),
          styleVerified: z.boolean(),
          eligible: z.boolean(),
          verification: z.enum(["ai_verified", "needs_review"]),
          templateBindings: z.array(listeningStyleTemplateSchema).min(1),
        }),
      )
      .min(1)
      .max(30),
    eligibleQuestionIds: z.array(z.uuid()).max(30),
    needsReviewQuestionIds: z.array(z.uuid()).max(30),
  })
  .superRefine((audit, context) => {
    if (
      audit.generationNormalization &&
      audit.version !== LISTENING_RECONSTRUCTION_STYLE_VERSION
    )
      context.addIssue({
        code: "custom",
        message:
          "Structural metadata recovery requires current guarded audit version",
      });
    if (
      (audit.version === "korean-official-style-v1-20261005" &&
        audit.judgmentVersion !== "1") ||
      (audit.version === "korean-official-style-v2-20261005" &&
        audit.judgmentVersion !== "2") ||
      (audit.version === "korean-official-style-v3-20261005" &&
        audit.judgmentVersion !== "4") ||
      (audit.version === LISTENING_RECONSTRUCTION_STYLE_VERSION &&
        audit.judgmentVersion !== "4")
    )
      context.addIssue({
        code: "custom",
        message:
          "Audit version must bind the exact production style judgment semantics",
      });
    if (
      audit.version === LISTENING_RECONSTRUCTION_STYLE_VERSION &&
      audit.questionVerdicts.some((item) => item.semanticWarnings === undefined)
    )
      context.addIssue({
        code: "custom",
        message: "Version 4 requires explicit semantic warnings on every item",
      });
    const expectedEligible: string[] = [],
      expectedReview: string[] = [];
    const seen = new Set<string>();
    for (const verdict of audit.questionVerdicts) {
      const computed = listeningStyleRevisionVerification(
        verdict.correctChoiceOneBased,
        verdict.groundingJudgment,
        verdict.styleJudgment,
        verdict.asrUncertain,
        verdict.semanticWarnings ?? [],
      );
      if (
        seen.has(verdict.questionId) ||
        verdict.originalAnswerChoiceId !== verdict.revisedAnswerChoiceId ||
        computed.eligible !== verdict.eligible ||
        computed.answerVerified !== verdict.answerVerified ||
        computed.styleVerified !== verdict.styleVerified ||
        (verdict.priorVerification === "needs_review"
          ? "needs_review"
          : computed.verification) !== verdict.verification
      )
        context.addIssue({
          code: "custom",
          message:
            "Style revision verdict differs from immutable references or conservative raw-judgment gate",
        });
      seen.add(verdict.questionId);
      (computed.eligible ? expectedEligible : expectedReview).push(
        verdict.questionId,
      );
    }
    if (
      JSON.stringify(expectedEligible) !==
        JSON.stringify(audit.eligibleQuestionIds) ||
      JSON.stringify(expectedReview) !==
        JSON.stringify(audit.needsReviewQuestionIds)
    )
      context.addIssue({
        code: "custom",
        message:
          "Style revision eligible/review IDs must exactly equal recomputed verdicts",
      });
  })
  .transform((audit) => ({
    ...audit,
    questionVerdicts: audit.questionVerdicts.map((verdict) => ({
      ...verdict,
      semanticWarnings: verdict.semanticWarnings ?? [],
    })),
  }));
export type ListeningStyleRevisionAudit = z.infer<
  typeof listeningStyleRevisionAuditSchema
>;
