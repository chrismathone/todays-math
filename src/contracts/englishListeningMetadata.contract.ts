import { z } from "zod";

export const listeningQuestionTypeSchema = z.enum([
  "gist",
  "purpose",
  "opinion",
  "detail",
  "inference",
  "number",
  "relationship",
  "location",
  "emotion",
  "sequence",
  "reply",
  "visual",
  "unknown",
]);
export const listeningQuestionOriginSchema = z.enum([
  "official_original",
  "audio_reconstructed",
  "teacher_authored",
]);
const label = z.string().trim().min(1).max(100);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
/** Search fields describe the question. They never contain answers or transcript excerpts. */
export const listeningQuestionMetadataSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    origin: listeningQuestionOriginSchema,
    sourceRecordId: z.string().trim().min(1).max(200).nullable(),
    assessmentKind: z
      .enum(["national_listening", "mock_exam", "other"])
      .nullable(),
    provider: z.string().trim().min(1).max(200).nullable(),
    year: z.number().int().min(1900).max(2200).nullable(),
    round: z.number().int().min(1).max(10).nullable(),
    month: z.number().int().min(1).max(12).nullable(),
    level: z.string().trim().min(1).max(80).nullable(),
    sourceNumber: z.number().int().min(1).max(100).nullable(),
    sourceAudioSha256: hash.nullable(),
    sourceQuestionSha256: hash.nullable(),
    questionType: listeningQuestionTypeSchema,
    topics: z.array(label).max(12),
    keywords: z.array(label).max(30),
    classification: z.strictObject({
      method: z.enum(["unclassified", "source_label", "ai", "teacher"]),
      model: z.string().trim().min(1).max(100).nullable(),
      confidence: z.number().min(0).max(1).nullable(),
    }),
    reconstruction: z
      .strictObject({
        model: z.string().trim().min(1).max(100),
        generatedAt: z.iso.datetime(),
        sourceAudioSha256: hash,
        verification: z.enum(["ai_verified", "needs_review"]),
      })
      .nullable(),
  })
  .superRefine((value, ctx) => {
    if (
      (value.origin === "audio_reconstructed") !==
      Boolean(value.reconstruction)
    )
      ctx.addIssue({
        code: "custom",
        message: "재구성 문항에는 생성 근거가 필요합니다.",
      });
    if (
      value.reconstruction &&
      value.sourceAudioSha256 !== value.reconstruction.sourceAudioSha256
    )
      ctx.addIssue({
        code: "custom",
        message: "재구성 근거와 문항의 원본 음원이 일치해야 합니다.",
      });
  });
export type ListeningQuestionMetadata = z.infer<
  typeof listeningQuestionMetadataSchema
>;
export const LISTENING_QUESTION_ORIGIN_LABELS = {
  official_original: "공식 원본",
  audio_reconstructed: "원본 문제지 없음 · 음원 기반 재구성",
  teacher_authored: "교사 작성",
} as const;
export const LISTENING_QUESTION_TYPE_LABELS = {
  gist: "주제·요지",
  purpose: "목적",
  opinion: "의견",
  detail: "세부 내용",
  inference: "추론",
  number: "수·계산",
  relationship: "관계",
  location: "장소",
  emotion: "감정",
  sequence: "순서",
  reply: "적절한 응답",
  visual: "그림·도표",
  unknown: "유형 미분류",
} as const;
