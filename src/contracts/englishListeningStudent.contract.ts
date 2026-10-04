/** Student-only wire contract. Deliberately imports no teacher contract or server library. */
import { z } from "zod";
import { listeningQuestionImageSchema } from "./englishListeningSource.contract";
import { listeningQuestionOriginSchema } from "./englishListeningMetadata.contract";

const id = z.uuid();
const text = z.string().min(1);
const choice = z.strictObject({ id, text });
const questionFields = {
  id,
  prompt: text,
  origin: listeningQuestionOriginSchema.optional(),
  image: listeningQuestionImageSchema.optional(),
  choices: z.array(choice).min(2).max(5),
};
const lockedQuestion = z.strictObject(questionFields);
const reviewQuestion = z.strictObject({
  ...questionFields,
  answerChoiceId: id,
  explanation: text,
});
const evidence = z.strictObject({
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().positive(),
});
const audioReviewQuestion = z.strictObject({
  ...reviewQuestion.shape,
  evidence: z.array(evidence).min(1),
});
const transcript = z.strictObject({ text, translation: text.nullable() });
// This is an opaque identifier for a later authorized proxy request, never a storage path/URL.
const audio = z.strictObject({
  assetId: id,
  durationMs: z.number().int().positive(),
});
const teacherGroup = z.discriminatedUnion("state", [
  z.strictObject({
    state: z.literal("locked"),
    id,
    questions: z.array(lockedQuestion).min(1),
  }),
  z.strictObject({
    state: z.literal("review"),
    id,
    questions: z.array(reviewQuestion).min(1),
    transcript,
  }),
]);
const studentGroup = z.discriminatedUnion("state", [
  z.strictObject({
    state: z.literal("locked"),
    id,
    questions: z.array(lockedQuestion).min(1),
    audio,
  }),
  z.strictObject({
    state: z.literal("review"),
    id,
    questions: z.array(audioReviewQuestion).min(1),
    transcript,
    audio,
  }),
]);
const viewFields = {
  schemaVersion: z.literal(1),
  publicationId: id,
  assignmentId: id,
  title: text,
};
export const englishListeningStudentViewSchema = z.discriminatedUnion(
  "audioSource",
  [
    z.strictObject({
      ...viewFields,
      audioSource: z.literal("teacher_device"),
      groups: z.array(teacherGroup).min(1),
    }),
    z.strictObject({
      ...viewFields,
      audioSource: z.literal("student_device"),
      groups: z.array(studentGroup).min(1),
    }),
  ],
);
export type EnglishListeningStudentView = z.infer<
  typeof englishListeningStudentViewSchema
>;
