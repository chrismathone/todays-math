import { z } from "zod";
import { dataResponseSchema, uuidSchema } from "@/contracts/common.contract";

/**
 * 월말평가 M1 — «내 시험지»에서 반에 내기 (`docs/planning/monthly-exam-plan-20261017.md` §9 · Hi-fi H3).
 *
 *   POST   /api/exam-publications                          반 여럿에 내기 — 발행본(고정본) 하나 + 반마다 반 시험 한 행
 *   GET    /api/exam-publications                          내가 낸 기록 — 원본 시험지마다 낸 반 · 반별 채점 진행
 *   DELETE /api/exam-publications/{id}/classes/{classId}   한 반에 낸 것 지우기 — 채점(결시 포함)을 시작하기 전만
 *
 * 🔴 낸 시험지는 고칠 수 없다 — 문항 · 차례 · 배점은 발행본에 낸 그대로 묶인다. 다시 내면 새 발행본이다.
 * 같은 요청 번호(`requestId`)의 재전송은 같은 답이고, 같은 번호에 다른 내용이면 409 다.
 */

/** 시험 종류 — 월말평가(기본) · 단원평가 · 내신 대비 · 기타. DB 는 글자 칸 + CHECK(`exam_publication_exam_type_check`). */
export const EXAM_PUBLICATION_TYPES = [
  "monthly",
  "unit",
  "school",
  "other",
] as const;
export const examPublicationTypeSchema = z.enum(EXAM_PUBLICATION_TYPES);
export type ExamPublicationType = z.infer<typeof examPublicationTypeSchema>;
export const EXAM_PUBLICATION_TYPE_LABELS: Record<ExamPublicationType, string> =
  {
    monthly: "월말평가",
    unit: "단원평가",
    school: "내신 대비",
    other: "기타",
  };

/** 한 번에 낼 수 있는 반 수. */
export const EXAM_PUBLICATION_CLASSES_MAX = 20;

const dateSchema = z.iso.date();
const count = z.number().int().min(0);

export const examPublicationInputSchema = z.strictObject({
  /** 원본 «내 시험지»(서버에 저장된 내 자료)의 id 와 지금 revision — 화면이 본 그 판이어야 낸다. */
  documentId: z.string().min(1).max(100),
  expectedRevision: z.number().int().min(1),
  classIds: z
    .array(uuidSchema)
    .min(1)
    .max(EXAM_PUBLICATION_CLASSES_MAX)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "같은 반이 두 번 있습니다.",
    ),
  examType: examPublicationTypeSchema.default("monthly"),
  /** 없으면 오늘(한국 날짜). */
  testDate: dateSchema.optional(),
  requestId: uuidSchema,
});
export type ExamPublicationInput = z.infer<typeof examPublicationInputSchema>;

export const examPublicationCreatedSchema = z.strictObject({
  publicationId: uuidSchema,
  tests: z.array(
    z.strictObject({
      classId: uuidSchema,
      className: z.string(),
      testId: uuidSchema,
    }),
  ),
  problemCount: count,
});
export const examPublicationCreatedResponseSchema = dataResponseSchema(
  examPublicationCreatedSchema,
);

/** 한 반에 낸 시험의 채점 진행 — 학생은 채점표와 같은 명단(지금 반 학생)이고, 결과는 학생마다 가장 최근 것 하나다. */
export const examPublicationClassSchema = z.strictObject({
  testId: uuidSchema,
  classId: uuidSchema,
  className: z.string(),
  students: count,
  graded: count,
  absent: count,
  /** 학생 − 채점 − 결시. 0 이면 채점이 끝났다. */
  remaining: count,
});
export const examPublicationSummarySchema = z.strictObject({
  id: uuidSchema,
  documentId: z.string(),
  title: z.string(),
  examType: examPublicationTypeSchema,
  testDate: dateSchema,
  createdAt: z.iso.datetime(),
  problemCount: count,
  classes: z.array(examPublicationClassSchema),
});
export type ExamPublicationSummary = z.infer<
  typeof examPublicationSummarySchema
>;
/** 내가 낼 수 있는 반(내기 API 가 받는 반과 같은 범위 — 내 반 · `test:write`)과 지금 학생 수. */
export const examPublicationClassChoiceSchema = z.strictObject({
  id: uuidSchema,
  name: z.string(),
  students: count,
});
export type ExamPublicationClassChoice = z.infer<
  typeof examPublicationClassChoiceSchema
>;
export const examPublicationListSchema = z.strictObject({
  publications: z.array(examPublicationSummarySchema),
  classes: z.array(examPublicationClassChoiceSchema),
});
export type ExamPublicationList = z.infer<typeof examPublicationListSchema>;
export const examPublicationListResponseSchema = dataResponseSchema(
  examPublicationListSchema,
);

export const examPublicationDeletedResponseSchema = dataResponseSchema(
  z.strictObject({ deleted: z.literal(true) }),
);
