import { z } from "zod";
import { DIFFICULTY_LADDER } from "./difficulty";
import { bankSourceGroupSchema } from "./bankSource.contract";

/**
 * 시험지 만들기의 «이름 붙인 출제 조건»(W5 · Hi-fi 1안 + 4안의 한 줄 — 원장님 2026-10-16).
 *
 * 담는 것은 **조건뿐**이다 — 출처 고르기 · 범위 행(차시 · 수 · 고정) · 총 문항 · 난이도 의도 · 최근 출제 빼기 · 같은 문항류 규칙.
 * 문항 · 지면 양식은 담지 않는다(적용하면 문항은 [문항 검토 →]으로 새로 고른다).
 *
 * 저장 자리는 `workspace_document`(kind `examCondition` — 늘 비공개 · 주인만)이고 자료 목록에는 나오지 않는다.
 * 판(`v`)을 올릴 때는 옛 판을 읽는 길을 같이 둔다 — 모르는 판은 버리지 않고 거절한다(strict).
 */

export const EXAM_CONDITION_VERSION = 1 as const;
/** 한 사람이 둘 수 있는 조건 수 — 목록이 양식 모음이 되지 않게. */
export const EXAM_CONDITION_LIMIT = 50;
export const EXAM_CONDITION_NAME_MAX = 40;
/** 시험지 만들기의 최대 문항(`MATH_EXAM_MAX_QUESTIONS`)과 같다. */
export const EXAM_CONDITION_MAX_QUESTIONS = 100;
const MAX_ROWS = 200;

export const examConditionNameSchema = z
  .string()
  .trim()
  .min(1, "조건 이름을 적어 주세요.")
  .max(
    EXAM_CONDITION_NAME_MAX,
    `조건 이름은 ${EXAM_CONDITION_NAME_MAX}자까지입니다.`,
  );

const shortId = z.string().min(1).max(100);

/**
 * 출처 고르기 — 시험지 만들기가 출처 칸 · 자료 고르기로 거는 것 그대로(`SourcePick` + 자료 id).
 * `label` 은 저장할 때의 출처 칸 글(목록에 보일 뿐 — 적용은 id 로 한다).
 */
export const examConditionSourceSchema = z.strictObject({
  group: z.union([bankSourceGroupSchema, z.literal("")]),
  books: z.array(shortId).max(100),
  kinds: z.array(z.string().min(1).max(60)).max(30),
  materials: z.array(shortId).max(200),
  label: z.string().max(200),
});
export type ExamConditionSource = z.infer<typeof examConditionSourceSchema>;

/** 범위 행 — 차시 id · 수 · 고정. `label` 은 저장할 때의 차시 이름(차시가 사라져도 «무엇이 빠졌나»를 말하려고). */
export const examConditionRowSchema = z.strictObject({
  unitId: shortId,
  label: z.string().max(200),
  count: z.number().int().min(0).max(EXAM_CONDITION_MAX_QUESTIONS),
  fixed: z.boolean(),
});
export type ExamConditionRow = z.infer<typeof examConditionRowSchema>;

/** 난이도 의도 — 사다리 칸마다. null 은 «지정 없음»이고 0 은 «한 문항도 내지 않음»이다(둘은 다르다). */
export const examConditionLadderSchema = z.strictObject(
  Object.fromEntries(
    DIFFICULTY_LADDER.map((tier) => [
      tier,
      z.number().int().min(0).max(EXAM_CONDITION_MAX_QUESTIONS).nullable(),
    ]),
  ) as Record<(typeof DIFFICULTY_LADDER)[number], z.ZodNullable<z.ZodNumber>>,
);
export type ExamConditionLadder = z.infer<typeof examConditionLadderSchema>;

const conditionFields = {
  v: z.literal(EXAM_CONDITION_VERSION),
  name: examConditionNameSchema,
  source: examConditionSourceSchema,
  rows: z.array(examConditionRowSchema).min(1).max(MAX_ROWS),
  /** null = 지정 없음(행의 합). */
  total: z.number().int().min(1).max(EXAM_CONDITION_MAX_QUESTIONS).nullable(),
  ladder: examConditionLadderSchema,
  /** 최근 출제 빼기(D-20). */
  recent: z.boolean(),
  /** «같은 문항류는 1문항만»(D-111). */
  familyRule: z.boolean(),
};
const distinctRows = (value: { rows: { unitId: string }[] }) =>
  new Set(value.rows.map((row) => row.unitId)).size === value.rows.length;
const distinctRowsMessage = {
  message: "같은 범위가 두 번 들어 있습니다.",
  path: ["rows"],
};

/** 화면이 보내는 조건 — 이름과 담는 것. 마지막 사용은 서버가 정한다. */
export const examConditionInputSchema = z
  .strictObject(conditionFields)
  .refine(distinctRows, distinctRowsMessage);
export type ExamConditionInput = z.infer<typeof examConditionInputSchema>;

/** 저장된 꼴(`workspace_document.payload`) — 입력 + 마지막 사용. */
export const examConditionPayloadSchema = z
  .strictObject({ ...conditionFields, lastUsedAt: z.iso.datetime() })
  .refine(distinctRows, distinctRowsMessage);
export type ExamConditionPayload = z.infer<typeof examConditionPayloadSchema>;

export const examConditionIdSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/);

/** 목록 · 저장 응답의 한 줄. */
export const examConditionSchema = z.strictObject({
  id: examConditionIdSchema,
  revision: z.number().int().min(1),
  condition: examConditionPayloadSchema,
});
export type ExamCondition = z.infer<typeof examConditionSchema>;

/** 저장(새로 · 같은 이름을 바꿔 저장). `replace` 는 화면이 «바꿀까요?»를 물은 뒤에만 싣는다. */
export const saveExamConditionSchema = z.strictObject({
  condition: examConditionInputSchema,
  replace: z
    .strictObject({
      id: examConditionIdSchema,
      expectedRevision: z.number().int().min(1),
    })
    .optional(),
});
export type SaveExamConditionRequest = z.infer<typeof saveExamConditionSchema>;

/** 이름 바꾸기 · 적용(마지막 사용을 오늘로). */
export const patchExamConditionSchema = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("rename"),
    name: examConditionNameSchema,
    expectedRevision: z.number().int().min(1),
  }),
  z.strictObject({ action: z.literal("touch") }),
]);
export type PatchExamConditionRequest = z.infer<
  typeof patchExamConditionSchema
>;

export const examConditionListResponseSchema = z.object({
  data: z.array(examConditionSchema),
  meta: z.object({ limit: z.number().int() }),
});

export const EXAM_CONDITION_ERROR = {
  NAME_TAKEN: "EXAM_CONDITION_NAME_TAKEN",
  LIMIT: "EXAM_CONDITION_LIMIT",
  CONFLICT: "CONFLICT",
} as const;
