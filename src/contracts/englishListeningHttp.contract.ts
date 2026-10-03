/** HTTP inputs deliberately omit server-owned identity, provenance and review stamps. */
import { z } from "zod";
import {
  englishListeningDocumentSchema,
  listeningGroupSchema,
  listeningReleasePolicySchema,
  type EnglishListeningPublication,
  type EnglishListeningAssignment,
  type EnglishListeningAttempt,
  type EnglishListeningBroadcast,
} from "./englishListening.contract";
import { englishV2RightsSchema } from "./englishV2.contract";

const revision = z.number().int().positive().max(2147483646);
const text = (max: number) => z.string().trim().min(1).max(max);
export const listeningRevisionInputSchema = z.strictObject({
  expectedRevision: revision,
});
export const listeningDraftQuestionSchema = z.strictObject({
  id: z.uuid(),
  prompt: z.string().max(2000),
  choices: z
    .array(z.strictObject({ id: z.uuid(), text: z.string().max(2000) }))
    .max(5),
  answerChoiceId: z.uuid().nullable(),
  explanation: z.string().max(10000),
  evidence: listeningGroupSchema.shape.questions.element.shape.evidence.min(0),
});
export const listeningDraftGroupSchema = listeningGroupSchema.extend({
  audio: listeningGroupSchema.shape.audio.nullable(),
  transcript: listeningGroupSchema.shape.transcript.extend({
    text: z.string().max(40000),
    spokenText: z.string().max(40000),
  }),
  questions: z.array(listeningDraftQuestionSchema).max(30),
});
export const listeningDraftSchema = z.strictObject({
  ...englishListeningDocumentSchema.shape,
  title: z.string().max(200),
  provenance: englishListeningDocumentSchema.shape.provenance.extend({
    basis: z.string().max(1000),
  }),
  groups: z.array(listeningDraftGroupSchema).max(30),
});
export type ListeningDraft = z.infer<typeof listeningDraftSchema>;
const editable = {
  title: z.string().max(200),
  level: text(80).nullable(),
  examId: z.uuid().nullable(),
  rights: englishV2RightsSchema,
  basis: z.string().max(1000),
};
export const listeningCreateSetSchema = z.strictObject({
  ...editable,
  level: editable.level.optional(),
  examId: editable.examId.optional(),
});
export const listeningUpdateSetSchema = z.strictObject({
  ...editable,
  expectedRevision: revision,
  groups: z.array(listeningDraftGroupSchema.omit({ reviews: true })).max(30),
});
export const listeningReviewSetSchema = z.strictObject({
  expectedRevision: revision,
  kind: z.enum(["rights", "content", "audio", "alignment"]),
  groupId: z.uuid().optional(),
  basis: text(1000).optional(),
});
export const listeningCreateAssignmentSchema = z.strictObject({
  publicationId: z.uuid(),
  classId: z.uuid(),
  targetStudentIds: z.array(z.uuid()).min(1).max(1000),
  mode: z.enum(["practice", "exam"]),
  audioSource: z.enum(["student_device", "teacher_device"]),
  opensAt: z.iso.datetime(),
  closesAt: z.iso.datetime(),
  timeLimitSeconds: z.number().int().min(1).max(86400).nullable(),
  releasePolicy: listeningReleasePolicySchema,
});
export const listeningAddTargetsSchema = z.strictObject({
  expectedRevision: revision,
  addedStudentIds: z.array(z.uuid()).min(1).max(1000),
  reason: text(1000),
});
export const listeningRetrySchema = z.strictObject({
  expectedRevision: revision,
  studentId: z.uuid(),
  previousAttemptId: z.uuid(),
  reason: text(1000),
});
export const listeningBroadcastInputSchema = z.strictObject({
  expectedRevision: revision,
  action: z.enum(["start", "interrupt", "end"]).default("start"),
});
export interface ListeningSetDetail {
  id: string;
  revision: number;
  document: ListeningDraft;
  publications: EnglishListeningPublication[];
  mediaUrlsByAssetId: Record<string, string>;
}
export interface ListeningSetSummary {
  id: string;
  revision: number;
  title: string;
  level: string | null;
  groupCount: number;
  publicationCount: number;
  updatedAt: string;
}
export interface ListeningClassOption {
  id: string;
  name: string;
  students: { id: string; name: string }[];
}
export interface ListeningAssignmentSummary {
  id: string;
  revision: number;
  title: string;
  classId: string;
  mode: "practice" | "exam";
  audioSource: "student_device" | "teacher_device";
  opensAt: string;
  closesAt: string;
  cancelledAt: string | null;
  targetCount: number;
}
export interface ListeningAssignmentDetail {
  assignment: EnglishListeningAssignment;
  classId: string;
  publication: EnglishListeningPublication;
  broadcast: EnglishListeningBroadcast | null;
  broadcastStatus: "idle" | "active" | "ended" | "interrupted";
  mediaUrlsByAssetId: Record<string, string>;
  results: {
    studentId: string;
    name: string;
    attempt: EnglishListeningAttempt | null;
    grade: {
      total: number;
      correct: number;
      incorrect: number;
      unanswered: number;
      savedAfterRelease: number;
      releaseStatusUnknown: number;
      items: {
        questionId: string;
        result: "correct" | "incorrect" | "unanswered";
      }[];
    } | null;
  }[];
}
