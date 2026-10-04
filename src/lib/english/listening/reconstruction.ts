import { z } from "zod";
import { listeningQuestionTypeSchema } from "@/contracts/englishListeningMetadata.contract";

const sourceNumber = z.number().int().min(1).max(30);
export const listeningAsrSegmentsSchema = z
  .array(
    z.strictObject({
      id: z.number().int().positive().max(10000),
      text: z.string().trim().min(1).max(4000),
      uncertain: z.boolean(),
    }),
  )
  .min(1)
  .max(2000)
  .superRefine((segments, context) => {
    if (new Set(segments.map((segment) => segment.id)).size !== segments.length)
      context.addIssue({
        code: "custom",
        message: "음원 전사 구간 ID가 중복됩니다.",
      });
  });
export const listeningReconstructionTranscriptSchema = z
  .strictObject({
    items: z
      .array(
        z.strictObject({
          sourceNumber,
          transcript: z.string().trim().min(1).max(12000),
          uncertain: z.boolean(),
        }),
      )
      .min(1)
      .max(30),
  })
  .superRefine((value, context) => {
    if (
      new Set(value.items.map((item) => item.sourceNumber)).size !==
      value.items.length
    )
      context.addIssue({
        code: "custom",
        message: "음원 구간 번호가 중복됩니다.",
      });
  });
export const listeningReconstructionQuestionsSchema = z
  .strictObject({
    questions: z
      .array(
        z.strictObject({
          sourceNumber,
          prompt: z.string().trim().min(1).max(2000),
          choices: z.array(z.string().trim().min(1).max(2000)).length(5),
          correctChoiceOneBased: z.number().int().min(1).max(5),
          explanation: z.string().trim().min(1).max(10000),
          evidenceQuotes: z.array(z.string().min(1).max(2000)).min(1).max(8),
          questionType: listeningQuestionTypeSchema,
          topics: z.array(z.string().trim().min(1).max(100)).max(12),
          keywords: z.array(z.string().trim().min(1).max(100)).max(20),
        }),
      )
      .min(1)
      .max(30),
  })
  .superRefine((value, context) => {
    if (
      new Set(value.questions.map((item) => item.sourceNumber)).size !==
      value.questions.length
    )
      context.addIssue({
        code: "custom",
        message: "재구성 문항 번호가 중복됩니다.",
      });
    for (const item of value.questions)
      if (
        new Set(
          item.choices.map((choice) => choice.normalize("NFKC").toLowerCase()),
        ).size !== 5
      )
        context.addIssue({
          code: "custom",
          message: "동일한 선지가 중복됩니다.",
        });
  });
export type ListeningReconstructionQuestion = z.infer<
  typeof listeningReconstructionQuestionsSchema
>["questions"][number];
export function reorderListeningReconstructionChoices(
  question: ListeningReconstructionQuestion,
  order: number[],
) {
  if (
    order.length !== 5 ||
    new Set(order).size !== 5 ||
    order.some((index) => !Number.isInteger(index) || index < 0 || index > 4)
  )
    throw new Error("선지 순서에는 0~4의 순열이 필요합니다.");
  return {
    ...question,
    choices: order.map((index) => question.choices[index]),
    correctChoiceOneBased:
      order.indexOf(question.correctChoiceOneBased - 1) + 1,
  };
}
export const listeningSegmentReconstructionSchema = z.strictObject({
  questions: z
    .array(
      listeningReconstructionQuestionsSchema.shape.questions.element.extend({
        sourceSegmentIds: z
          .array(z.number().int().positive().max(10000))
          .min(1)
          .max(60),
      }),
    )
    .min(1)
    .max(30),
});
/** Model echo fields carry no authority; provenance always comes from the verified source files. */
export function readListeningReconstructionGeneration(value: unknown) {
  const envelope = z
    .object({ questions: listeningSegmentReconstructionSchema.shape.questions })
    .parse(value);
  return listeningSegmentReconstructionSchema.parse(envelope);
}

/** Check all raw evidence before staging a bounded subset; raw receipts stay intact. */
export function normalizeListeningReconstructionEvidenceQuotes(
  segmentsInput: unknown,
  value: unknown,
) {
  const segments = listeningAsrSegmentsSchema.parse(segmentsInput);
  const draft = z
    .object({
      questions: z
        .array(
          listeningSegmentReconstructionSchema.shape.questions.element.extend({
            choices: z.array(z.string().trim().min(1).max(2000)).min(4).max(5),
            evidenceQuotes: z.array(z.string().min(1).max(2000)).min(1).max(32),
          }),
        )
        .min(1)
        .max(30),
    })
    .parse(value);
  return {
    questions: draft.questions.map((question) => {
      let previous = -1;
      const transcript = question.sourceSegmentIds
        .map((id) => {
          const position = segments.findIndex((segment) => segment.id === id);
          if (position <= previous || position < 0)
            throw new Error(
              "음원 전사 구간은 실제 순서로만 사용할 수 있습니다.",
            );
          previous = position;
          return segments[position].text;
        })
        .join(" ");
      if (question.evidenceQuotes.some((quote) => !transcript.includes(quote)))
        throw new Error(
          "문항 근거의 모든 원문 인용이 실제 전사와 일치해야 합니다.",
        );
      return {
        ...question,
        evidenceQuotes: question.evidenceQuotes.slice(0, 8),
      };
    }),
  };
}

/** A bounded format repair cannot rewrite an answer, prompt or source evidence. */
export function listeningReconstructionFifthChoiceTargets(value: unknown) {
  const draft = z
    .object({
      questions: z
        .array(
          listeningSegmentReconstructionSchema.shape.questions.element.extend({
            choices: z.array(z.string().trim().min(1).max(2000)).min(4).max(5),
          }),
        )
        .min(1)
        .max(30),
    })
    .parse(value);
  if (
    new Set(draft.questions.map((question) => question.sourceNumber)).size !==
    draft.questions.length
  )
    throw new Error("재구성 문항 번호가 중복됩니다.");
  if (
    draft.questions.some(
      (question) => question.correctChoiceOneBased > question.choices.length,
    )
  )
    throw new Error("생성 정답이 기존 선지에 없습니다.");
  return draft;
}
export function addListeningReconstructionFifthChoices(
  generated: unknown,
  additions: unknown,
) {
  const draft = listeningReconstructionFifthChoiceTargets(generated);
  const repairs = z
    .strictObject({
      choices: z
        .array(
          z.strictObject({
            sourceNumber,
            fifthChoice: z.string().trim().min(1).max(2000),
          }),
        )
        .min(1)
        .max(30),
    })
    .parse(additions);
  const needed = draft.questions.filter(
    (question) => question.choices.length === 4,
  );
  if (
    repairs.choices.length !== needed.length ||
    new Set(repairs.choices.map((repair) => repair.sourceNumber)).size !==
      needed.length ||
    repairs.choices.some(
      (repair) =>
        !needed.some(
          (question) => question.sourceNumber === repair.sourceNumber,
        ),
    )
  )
    throw new Error("추가 오답은 선지가 누락된 문항에만 하나씩 필요합니다.");
  const questions = draft.questions.map((question) =>
    question.choices.length === 5
      ? question
      : {
          ...question,
          choices: [
            ...question.choices,
            repairs.choices.find(
              (repair) => repair.sourceNumber === question.sourceNumber,
            )!.fifthChoice,
          ],
        },
  );
  const result = readListeningReconstructionGeneration({ questions });
  // Cross-question/duplicate-choice refinements live on the complete schema.
  listeningReconstructionQuestionsSchema.parse({
    questions: result.questions.map(({ sourceSegmentIds, ...question }) => {
      void sourceSegmentIds;
      return question;
    }),
  });
  return result;
}

/** sourceNumber here is the newly generated ordinal, never a recovered official number. */
export function groundListeningReconstructionSegments(
  segmentsInput: unknown,
  generated: unknown,
) {
  const segments = listeningAsrSegmentsSchema.parse(segmentsInput);
  const draft = listeningSegmentReconstructionSchema.parse(generated);
  const items = draft.questions.map((question) => {
    let previousPosition = -1;
    const chosen = question.sourceSegmentIds.map((id) => {
      const position = segments.findIndex((segment) => segment.id === id);
      if (position < 0) throw new Error("실제 음원 전사에 없는 구간 ID입니다.");
      if (position <= previousPosition)
        throw new Error("음원 구간은 중복 없이 실제 순서를 유지해야 합니다.");
      previousPosition = position;
      return segments[position];
    });
    return {
      sourceNumber: question.sourceNumber,
      transcript: chosen.map((segment) => segment.text).join(" "),
      uncertain: chosen.some((segment) => segment.uncertain),
    };
  });
  const questions = draft.questions.map((question) => {
    return listeningReconstructionQuestionsSchema.shape.questions.element.parse(
      {
        sourceNumber: question.sourceNumber,
        prompt: question.prompt,
        choices: question.choices,
        correctChoiceOneBased: question.correctChoiceOneBased,
        explanation: question.explanation,
        evidenceQuotes: question.evidenceQuotes,
        questionType: question.questionType,
        topics: question.topics,
        keywords: question.keywords,
      },
    );
  });
  validateListeningReconstruction({ items }, { questions });
  return {
    items,
    questions,
    sourceSegmentIds: draft.questions.map(
      (question) => question.sourceSegmentIds,
    ),
  };
}

/** These are source-presence checks; semantic answer verification is a separate Jev step. */
export function validateListeningReconstruction(
  source: unknown,
  generated: unknown,
) {
  const transcript = listeningReconstructionTranscriptSchema.parse(source);
  const draft = listeningReconstructionQuestionsSchema.parse(generated);
  for (const question of draft.questions) {
    const segment = transcript.items.find(
      (item) => item.sourceNumber === question.sourceNumber,
    );
    if (!segment) throw new Error("문항에 해당하는 실제 음원 전사가 없습니다.");
    if (
      question.evidenceQuotes.some(
        (quote) => !segment.transcript.includes(quote),
      )
    )
      throw new Error(
        "문항 근거가 실제 음원 전사의 원문 인용과 일치하지 않습니다.",
      );
  }
  return {
    ...draft,
    uncertainSourceNumbers: transcript.items
      .filter((item) => item.uncertain)
      .map((item) => item.sourceNumber),
  };
}
export interface ListeningReconstructionJudgment {
  choice: string;
  confidence: number;
  selectedProbability: number;
  grounded: number;
  explanationSupported: number;
}
export function listeningReconstructionDisposition(
  correctChoiceOneBased: number,
  judgment: ListeningReconstructionJudgment | null,
  uncertainAsr: boolean,
) {
  const malformed =
    !judgment ||
    [
      judgment.confidence,
      judgment.selectedProbability,
      judgment.grounded,
      judgment.explanationSupported,
    ].some((value) => !Number.isFinite(value) || value < 0 || value > 1);
  const include =
    !malformed &&
    judgment!.choice === String(correctChoiceOneBased) &&
    judgment!.grounded >= 0.5;
  const clearExplanation = !!judgment && judgment.explanationSupported < 0.9;
  return {
    include,
    clearExplanation,
    verification: (!include || uncertainAsr || clearExplanation
      ? "needs_review"
      : listeningReconstructionVerification(
          correctChoiceOneBased,
          judgment,
        )) as "ai_verified" | "needs_review",
  };
}
type SemanticQuestion =
  | { type: "choice"; instructions: string; criteria: Record<string, string> }
  | { type: "noul"; instructions: string };
/** Shared state omits the proposed key; independent questions cannot see sibling instructions. */
export function buildListeningReconstructionChecks(
  items: z.infer<typeof listeningReconstructionTranscriptSchema>["items"],
  questionsInput: ListeningReconstructionQuestion[],
) {
  validateListeningReconstruction({ items }, { questions: questionsInput });
  const state = Object.fromEntries(
    questionsInput.map((question) => [
      `question_${question.sourceNumber}`,
      {
        sourceNumber: question.sourceNumber,
        transcript: items.find(
          (item) => item.sourceNumber === question.sourceNumber,
        )!.transcript,
        prompt: question.prompt,
        choices: question.choices,
      },
    ]),
  );
  const questions: Record<string, SemanticQuestion> = {};
  questionsInput.forEach((question) => {
    const path = `question_${question.sourceNumber}`;
    questions[`answer_${question.sourceNumber}`] = {
      type: "choice",
      instructions: `Independently solve the named listening question \`${path}\` using only \`${path}.transcript\`, \`${path}.prompt\` and \`${path}.choices\`. Other named records are separate questions. Which single choice is supported? If evidence is missing, multiple choices fit equally, or the question requires an unseen diagram, select no_unique_supported_answer.`,
      criteria: {
        ...Object.fromEntries(
          question.choices.map((choice, choiceIndex) => [
            String(choiceIndex + 1),
            choice,
          ]),
        ),
        no_unique_supported_answer:
          "The transcript does not support exactly one listed choice.",
      },
    };
    questions[`grounded_${question.sourceNumber}`] = {
      type: "noul",
      instructions: `Can the named listening question \`${path}.prompt\` be answered using the actual spoken information in \`${path}.transcript\` and its listed choices, without unavailable images, invented dialogue or outside facts? Other named records are separate questions.`,
    };
    questions[`explanation_${question.sourceNumber}`] = {
      type: "noul",
      instructions: `Are all factual claims in this proposed explanation supported by the named transcript \`${path}.transcript\`? Other named records are separate questions. Proposed explanation: ${JSON.stringify(question.explanation)}`,
    };
  });
  return { state, questions };
}
/** Initial conservative gate; raw judgments remain in the audit for later calibration. */
export function listeningReconstructionVerification(
  correctChoiceOneBased: number,
  judgment: ListeningReconstructionJudgment | null,
): "ai_verified" | "needs_review" {
  if (!judgment || judgment.choice !== String(correctChoiceOneBased))
    return "needs_review";
  const values = [
    judgment.confidence,
    judgment.selectedProbability,
    judgment.grounded,
    judgment.explanationSupported,
  ];
  return values.every(
    (value) => Number.isFinite(value) && value >= 0.9 && value <= 1,
  )
    ? "ai_verified"
    : "needs_review";
}
