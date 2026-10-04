/** Listening domain contract. Parse strictly; never downgrade an unknown schema. */
import { z } from "zod";
import { englishV2RightsSchema } from "./englishV2.contract";
import {
  listeningAssessmentSourceSchema,
  listeningQuestionImageSchema,
} from "./englishListeningSource.contract";

export const ENGLISH_LISTENING_SCHEMA_VERSION = 1;
const id = z.uuid();
const revision = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
const time = z.iso.datetime();
const text = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((value) => value.trim().length > 0);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const ms = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);

export const listeningAudioRefSchema = z.strictObject({
  assetId: id,
  sha256: hash,
  durationMs: ms.min(1),
});
export type ListeningAudioRef = z.infer<typeof listeningAudioRefSchema>;
export const listeningEvidenceSchema = z
  .strictObject({ startMs: ms, endMs: ms })
  .refine((range) => range.startMs < range.endMs);
export const listeningChoiceSchema = z.strictObject({ id, text: text(2000) });
export const listeningQuestionSchema = z.strictObject({
  id,
  prompt: text(2000),
  image: listeningQuestionImageSchema.optional(),
  sourceNumber: z.number().int().min(1).max(100).optional(),
  audioRange: listeningEvidenceSchema.optional(),
  choices: z.array(listeningChoiceSchema).min(2).max(5),
  answerChoiceId: id,
  explanation: text(10000),
  evidence: z.array(listeningEvidenceSchema).min(1).max(50),
});
export type ListeningQuestion = z.infer<typeof listeningQuestionSchema>;

const reviewFields = {
  reviewerId: id,
  reviewedAt: time,
  revision,
  contentHash: hash,
};
export const listeningContentReviewSchema = z.strictObject(reviewFields);
export const listeningAudioReviewSchema = z.strictObject({
  ...reviewFields,
  assetId: id,
  sha256: hash,
  transcriptRevision: revision,
});
export const listeningGroupSchema = z.strictObject({
  id,
  audio: listeningAudioRefSchema,
  transcript: z.strictObject({
    revision,
    text: text(40000),
    spokenText: text(40000),
    translation: text(40000).nullable(),
  }),
  questions: z.array(listeningQuestionSchema).min(1).max(30),
  reviews: z.strictObject({
    content: listeningContentReviewSchema.nullable(),
    audio: listeningAudioReviewSchema.nullable(),
    alignment: listeningAudioReviewSchema.nullable(),
  }),
});

export const englishListeningDocumentSchema = z
  .strictObject({
    schemaVersion: z.literal(ENGLISH_LISTENING_SCHEMA_VERSION),
    id,
    ownerId: id,
    branchId: id.nullable(),
    revision,
    title: text(200),
    level: text(80).nullable(),
    examId: id.nullable(),
    source: listeningAssessmentSourceSchema.optional(),
    provenance: z.strictObject({
      kind: z.enum(["teacher_authored", "uploaded_assessment", "assembled"]),
      recordedBy: id,
      recordedAt: time,
      basis: text(1000),
    }),
    rights: englishV2RightsSchema,
    rightsReview: z
      .strictObject({ confirmedBy: id, confirmedAt: time, basis: text(1000) })
      .nullable(),
    groups: z.array(listeningGroupSchema).min(1).max(30),
  })
  .superRefine((document, ctx) => {
    const ids = new Set<string>([document.id]);
    const assets = new Set<string>();
    const hashes = new Set<string>();
    const transcripts = new Set<string>();
    const unique = (value: string) => {
      if (ids.has(value))
        ctx.addIssue({ code: "custom", message: "Duplicate stable ID" });
      ids.add(value);
    };
    for (const group of document.groups) {
      unique(group.id);
      // One shared audio/transcript is one release unit. Do not leak sibling answers.
      if (
        assets.has(group.audio.assetId) ||
        hashes.has(group.audio.sha256) ||
        transcripts.has(group.transcript.text)
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Shared audio or transcript must belong to one group",
        });
      }
      assets.add(group.audio.assetId);
      hashes.add(group.audio.sha256);
      transcripts.add(group.transcript.text);
      for (const question of group.questions) {
        unique(question.id);
        question.choices.forEach((choice) => unique(choice.id));
        if (
          !question.choices.some(
            (choice) => choice.id === question.answerChoiceId,
          )
        )
          ctx.addIssue({
            code: "custom",
            message: "Answer is outside question choices",
          });
        if (
          (question.audioRange &&
            question.audioRange.endMs > group.audio.durationMs) ||
          question.evidence.some(
            (range) => range.endMs > group.audio.durationMs,
          )
        )
          ctx.addIssue({
            code: "custom",
            message: "Evidence exceeds audio duration",
          });
      }
    }
  });
export type EnglishListeningDocument = z.infer<
  typeof englishListeningDocumentSchema
>;

export const englishListeningPublicationSchema = z.strictObject({
  schemaVersion: z.literal(1),
  id,
  publishedAt: time,
  contentHash: hash,
  document: englishListeningDocumentSchema,
});
export type EnglishListeningPublication = z.infer<
  typeof englishListeningPublicationSchema
>;

export const listeningReleasePolicySchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("after_unit_answer") }),
  z.strictObject({ kind: z.literal("after_submit") }),
  z.strictObject({ kind: z.literal("at_time"), at: time }),
  z.strictObject({ kind: z.literal("manual") }),
  z.strictObject({ kind: z.literal("never") }),
]);
export type ListeningReleasePolicy = z.infer<
  typeof listeningReleasePolicySchema
>;
export const englishListeningAssignmentSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    id,
    revision,
    publicationId: id,
    ownerId: id,
    branchId: id.nullable(),
    createdAt: time,
    targetStudentIds: z.array(id).min(1).max(1000),
    mode: z.enum(["practice", "exam"]),
    audioSource: z.enum(["student_device", "teacher_device"]),
    opensAt: time,
    closesAt: time,
    timeLimitSeconds: z.number().int().min(1).max(86400).nullable(),
    releasePolicy: listeningReleasePolicySchema,
    cancelledAt: time.nullable(),
  })
  .superRefine((assignment, ctx) => {
    if (Date.parse(assignment.closesAt) <= Date.parse(assignment.opensAt))
      ctx.addIssue({ code: "custom", message: "Invalid assignment window" });
    if (Date.parse(assignment.createdAt) > Date.parse(assignment.opensAt))
      ctx.addIssue({
        code: "custom",
        message: "Assignment opens before creation",
      });
    if (
      new Set(assignment.targetStudentIds).size !==
      assignment.targetStudentIds.length
    )
      ctx.addIssue({ code: "custom", message: "Duplicate recipient" });
    if (
      (assignment.mode === "practice") !==
      (assignment.releasePolicy.kind === "after_unit_answer")
    )
      ctx.addIssue({
        code: "custom",
        message: "Release policy does not match mode",
      });
  });
export type EnglishListeningAssignment = z.infer<
  typeof englishListeningAssignmentSchema
>;

/** Trusted server broadcast snapshot: every participant uses the same clock and publication. */
export const englishListeningBroadcastSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    id,
    assignmentId: id,
    publicationId: id,
    participantStudentIds: z.array(id).min(1).max(1000),
    startedAt: time,
    deadlineAt: time,
  })
  .refine(
    (value) =>
      Date.parse(value.startedAt) < Date.parse(value.deadlineAt) &&
      new Set(value.participantStudentIds).size ===
        value.participantStudentIds.length,
  );
export type EnglishListeningBroadcast = z.infer<
  typeof englishListeningBroadcastSchema
>;

export const listeningAnswerSchema = z.strictObject({
  questionId: id,
  choiceId: id,
  savedAt: time,
  /** Server-computed disclosure in this assignment at save time; absent older data is unknown.
   * False does not prove the student has never encountered this material elsewhere. */
  savedAfterRelease: z.boolean().optional(),
});
export type ListeningAnswer = z.infer<typeof listeningAnswerSchema>;
export const listeningInterruptionReasonSchema = z.enum([
  "student_connection",
  "student_playback",
  "teacher_broadcast",
]);
export const englishListeningAttemptSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    id,
    assignmentId: id,
    assignmentRevision: revision,
    publicationId: id,
    studentId: id,
    status: z.enum([
      "ready",
      "in_progress",
      "submitted",
      "interrupted",
      "expired",
      "cancelled",
    ]),
    revision,
    createdAt: time,
    updatedAt: time,
    startedAt: time.nullable(),
    deadlineAt: time.nullable(),
    submittedAt: time.nullable(),
    broadcastSessionId: id.nullable(),
    firstAnswers: z.array(listeningAnswerSchema).max(900),
    // Exam selections remain editable until submission; practice first answers do not.
    draftAnswers: z.array(listeningAnswerSchema).max(900).optional(),
    reviewAnswers: z.array(listeningAnswerSchema).max(900),
    interruption: z
      .strictObject({ reason: listeningInterruptionReasonSchema, at: time })
      .nullable(),
    retry: z
      .strictObject({
        previousAttemptId: id,
        authorizedBy: id,
        reason: text(1000),
      })
      .nullable(),
    receipts: z
      .array(
        z.strictObject({
          key: text(200),
          commandHash: hash,
          acceptedRevision: revision,
        }),
      )
      .max(10000),
  })
  .superRefine((attempt, ctx) => {
    const issue = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    if (
      new Set(attempt.firstAnswers.map((answer) => answer.questionId)).size !==
      attempt.firstAnswers.length
    )
      issue("Duplicate first answer");
    if (
      new Set((attempt.draftAnswers ?? []).map((answer) => answer.questionId))
        .size !== (attempt.draftAnswers ?? []).length
    )
      issue("Duplicate draft answer");
    if (
      new Set(attempt.reviewAnswers.map((answer) => answer.questionId)).size !==
      attempt.reviewAnswers.length
    )
      issue("Duplicate review answer");
    if (
      new Set(attempt.receipts.map((receipt) => receipt.key)).size !==
      attempt.receipts.length
    )
      issue("Duplicate idempotency key");
    if ((attempt.startedAt === null) !== (attempt.deadlineAt === null))
      issue("Missing start or deadline");
    if (attempt.status === "ready" && attempt.startedAt !== null)
      issue("Ready attempt already started");
    if (
      ["in_progress", "submitted", "interrupted", "expired"].includes(
        attempt.status,
      ) &&
      attempt.startedAt === null
    )
      issue("Attempt has not started");
    if ((attempt.status === "submitted") !== (attempt.submittedAt !== null))
      issue("Invalid submission state");
    if ((attempt.status === "interrupted") !== (attempt.interruption !== null))
      issue("Invalid interruption state");
    if (
      attempt.startedAt &&
      attempt.deadlineAt &&
      Date.parse(attempt.startedAt) >= Date.parse(attempt.deadlineAt)
    )
      issue("Invalid attempt deadline");
    if (Date.parse(attempt.createdAt) > Date.parse(attempt.updatedAt))
      issue("Invalid attempt clock");
    if (
      attempt.startedAt &&
      Date.parse(attempt.startedAt) > Date.parse(attempt.updatedAt)
    )
      issue("Start is in the future");
    if (
      attempt.submittedAt &&
      attempt.startedAt &&
      attempt.deadlineAt &&
      (Date.parse(attempt.submittedAt) < Date.parse(attempt.startedAt) ||
        Date.parse(attempt.submittedAt) >= Date.parse(attempt.deadlineAt) ||
        Date.parse(attempt.submittedAt) > Date.parse(attempt.updatedAt))
    )
      issue("Invalid submission clock");
    for (const answer of [
      ...attempt.firstAnswers,
      ...(attempt.draftAnswers ?? []),
      ...attempt.reviewAnswers,
    ]) {
      if (
        !attempt.startedAt ||
        Date.parse(answer.savedAt) < Date.parse(attempt.startedAt) ||
        Date.parse(answer.savedAt) > Date.parse(attempt.updatedAt)
      )
        issue("Invalid saved answer clock");
    }
    if (
      [...attempt.firstAnswers, ...(attempt.draftAnswers ?? [])].some(
        (answer) =>
          !attempt.deadlineAt ||
          Date.parse(answer.savedAt) >= Date.parse(attempt.deadlineAt),
      )
    )
      issue("First answer after deadline");
    if (
      attempt.reviewAnswers.some(
        (answer) =>
          !attempt.firstAnswers.some(
            (first) =>
              first.questionId === answer.questionId &&
              Date.parse(first.savedAt) <= Date.parse(answer.savedAt),
          ),
      )
    )
      issue("Review precedes first answer");
    if (
      attempt.receipts.some(
        (receipt) => receipt.acceptedRevision > attempt.revision,
      )
    )
      issue("Receipt revision exceeds current revision");
  });
export type EnglishListeningAttempt = z.infer<
  typeof englishListeningAttemptSchema
>;

const commandFields = { expectedRevision: revision, idempotencyKey: text(200) };
export const listeningAttemptCommandSchema = z.discriminatedUnion("kind", [
  z.strictObject({ ...commandFields, kind: z.literal("start") }),
  z.strictObject({
    ...commandFields,
    kind: z.literal("answer"),
    phase: z.enum(["initial", "review"]),
    questionId: id,
    choiceId: id,
  }),
  z.strictObject({ ...commandFields, kind: z.literal("submit") }),
  z.strictObject({
    ...commandFields,
    kind: z.literal("interrupt"),
    reason: listeningInterruptionReasonSchema,
  }),
  z.strictObject({ ...commandFields, kind: z.literal("expire") }),
  z.strictObject({ ...commandFields, kind: z.literal("cancel") }),
]);
export type ListeningAttemptCommand = z.infer<
  typeof listeningAttemptCommandSchema
>;
