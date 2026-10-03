/** Learner-only wire types. This module never imports teacher documents or server code. */
import { z } from "zod";
import { englishListeningStudentViewSchema } from "./englishListeningStudent.contract";
const revision = z.number().int().positive().max(2147483646);
const answer = z.strictObject({
  questionId: z.uuid(),
  choiceId: z.uuid(),
  savedAt: z.iso.datetime(),
  savedAfterRelease: z.boolean().optional(),
});
export const listeningStudentAttemptSchema = z.strictObject({
  id: z.uuid(),
  revision,
  status: z.enum([
    "ready",
    "in_progress",
    "submitted",
    "interrupted",
    "expired",
    "cancelled",
  ]),
  startedAt: z.iso.datetime().nullable(),
  deadlineAt: z.iso.datetime().nullable(),
  submittedAt: z.iso.datetime().nullable(),
  firstAnswers: z.array(answer),
  reviewAnswers: z.array(answer),
  draftAnswers: z.array(answer).optional(),
});
const command = {
  expectedRevision: revision,
  idempotencyKey: z.string().min(1).max(200),
};
export const listeningStudentCommandInputSchema = z.strictObject({
  attemptId: z.uuid(),
  command: z.discriminatedUnion("kind", [
    z.strictObject({ ...command, kind: z.literal("start") }),
    z.strictObject({
      ...command,
      kind: z.literal("answer"),
      phase: z.enum(["initial", "review"]),
      questionId: z.uuid(),
      choiceId: z.uuid(),
    }),
    z.strictObject({ ...command, kind: z.literal("submit") }),
    z.strictObject({
      ...command,
      kind: z.literal("interrupt"),
      reason: z.enum([
        "student_connection",
        "student_playback",
        "teacher_broadcast",
      ]),
    }),
  ]),
  soundChecked: z.boolean().optional(),
});
export const listeningStudentDetailSchema = z.strictObject({
  view: englishListeningStudentViewSchema,
  attempt: listeningStudentAttemptSchema.nullable(),
  mode: z.enum(["practice", "exam"]),
  serverNow: z.iso.datetime(),
  media: z
    .strictObject({
      urlsByAssetId: z.record(z.string(), z.string()),
      soundCheckUrl: z.string(),
      playbackPolicy: z.strictObject({
        canPlay: z.boolean(),
        canPause: z.boolean(),
        canSeek: z.boolean(),
        canRepeat: z.boolean(),
      }),
    })
    .optional(),
});
export const listeningStudentListItemSchema = z.strictObject({
  id: z.uuid(),
  title: z.string(),
  mode: z.enum(["practice", "exam"]),
  audioSource: z.enum(["student_device", "teacher_device"]),
  opensAt: z.iso.datetime(),
  closesAt: z.iso.datetime(),
  status: z.enum([
    "ready",
    "in_progress",
    "submitted",
    "interrupted",
    "expired",
    "cancelled",
  ]),
});
export type ListeningStudentDetail = z.infer<
  typeof listeningStudentDetailSchema
>;
export type ListeningStudentAttempt = z.infer<
  typeof listeningStudentAttemptSchema
>;
export type ListeningStudentListItem = z.infer<
  typeof listeningStudentListItemSchema
>;
export type ListeningStudentCommandInput = z.infer<
  typeof listeningStudentCommandInputSchema
>;
