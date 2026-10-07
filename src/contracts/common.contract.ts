/**
 * 공통 계약 — 모든 API가 공유하는 응답 래퍼 · 에러 코드 · 페이지네이션 · DB Enum 재정의.
 *
 * 대응 API 경로: 전용 경로 없음 (다른 모든 계약 파일이 이 파일을 import해서 사용하는 SSOT 기반 모듈).
 *
 * 참조: docs/planning/02-trd.md §8.2 (응답 형식: {data, meta} / {error:{code,message,details}})
 *       docs/planning/04-database-design.md (Enum 5종), prisma/schema.prisma
 *       docs/planning/07-coding-convention.md §2.3 (도메인 용어 SSOT)
 *
 * 정책 (파일 전체 공통):
 * - 모든 object 스키마는 z.strictObject()로 정의해 정의되지 않은 필드를 거부한다(초과 필드 거부 일관 정책).
 * - 에러 메시지는 Zod 공식 한국어 로케일(zod/locales)을 전역 기본값으로 적용하고,
 *   사용자에게 직접 노출되는 핵심 입력(이메일/비밀번호/이름 등)만 D-08 톤(간결·사무적)에 맞춰
 *   각 계약 파일에서 개별 오버라이드한다.
 */
import { z } from "zod";

import {
  DIFFICULTY_LADDER as DIFFICULTY_LADDER_VALUES,
  type Difficulty,
} from "./difficulty";
import { ko } from "zod/locales";

// 전역 에러 메시지 로케일 — 이 모듈이 최초 import되는 시점에 1회 적용된다(모듈 캐시로 멱등).
z.config(ko());

// ─────────────────────────────────────────────
// DB Enum 재정의
// ⚠️ Prisma Client에서 직접 import하지 않는다 — 계약(src/contracts)은 Zod가 SSOT이며,
//    Prisma 스키마(enum) 변경 시 아래 값도 반드시 함께 수동 갱신해야 한다(불일치 방지).
//    아래 6종은 prisma/schema.prisma의 ProblemSource/Difficulty/ReviewStatus/TestType/TestStatus/ProblemPool과
//    문자열이 정확히 일치해야 한다.
// ─────────────────────────────────────────────

/**
 * 난이도 — **하나뿐인 축** (D-106, 원장님 확정 2026-08-25). 값·순서의 SSOT 는
 * `src/contracts/difficulty.ts` 다(화면이 zod 없이 읽어야 해서 따로 뺐다).
 * 여기서는 그것으로 zod enum 을 만들고 **그대로 다시 내보낸다.**
 */
export {
  DIFFICULTY_LADDER,
  DEFAULT_DIFFICULTY_RATIO,
  // 확대 중인 갈래를 가르는 둘 (D-113) — 엔진이 「필수 넷 + 선택 둘」을 이걸로 쓴다.
  CORE_DIFFICULTIES,
  EXTENDING_DIFFICULTIES,
  type CoreDifficulty,
  type Difficulty,
  type DifficultyRatio,
  type ExtendingDifficulty,
} from "./difficulty";

export const difficultySchema = z.enum(DIFFICULTY_LADDER_VALUES, {
  error: "난이도 값이 올바르지 않습니다.",
});

export const problemSourceSchema = z.enum(
  ["manual", "past_exam", "transformed", "ai_generated", "school_textbook"],
  { error: "문제 출처 값이 올바르지 않습니다." },
);
export type ProblemSource = z.infer<typeof problemSourceSchema>;

export const reviewStatusSchema = z.enum(["pending", "approved", "rejected"], {
  error: "검수 상태 값이 올바르지 않습니다.",
});
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

/** 문제 풀 — D-31. 지시가 없으면 shared. private는 소유자만 조회. */
export const problemPoolSchema = z.enum(["shared", "private"], {
  error: "문제 풀 값이 올바르지 않습니다.",
});
export type ProblemPool = z.infer<typeof problemPoolSchema>;

export const testTypeSchema = z.enum(["daily", "review"], {
  error: "테스트 유형은 일일테스트 또는 확인테스트여야 합니다.",
});
export type TestType = z.infer<typeof testTypeSchema>;

export const testStatusSchema = z.enum(["draft", "confirmed", "printed"], {
  error: "테스트 상태 값이 올바르지 않습니다.",
});
export type TestStatus = z.infer<typeof testStatusSchema>;

// ─────────────────────────────────────────────
// 공용 원자 스키마
// ─────────────────────────────────────────────

export const uuidSchema = z.uuid({ error: "올바른 식별자 형식이 아닙니다." });

/** 날짜만(YYYY-MM-DD) — Progress.recordedAt, Test.testDate 등 @db.Date 컬럼용 */
export const isoDateSchema = z.iso.date({
  error: "날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)",
});

/** 시각 포함 ISO 8601 — createdAt/updatedAt/printedAt 등 @db.Timestamp 컬럼용 */
export const isoDateTimeSchema = z.iso.datetime({
  error: "일시 형식이 올바르지 않습니다.",
  offset: true,
});

/** 경로 파라미터 {id} 공통 형태 — GET/PATCH/DELETE /api/{resource}/{id} */
export const idParamSchema = z.strictObject({ id: uuidSchema });

/**
 * 난이도 배분 — Class.difficultyRatio(jsonb) 기본값 및 출제 요청의 배분 오버라이드가 공유하는 형태.
 * 예: {연산:1, 기본:3, 응용:3, 심화하:1, 심화중:0, 심화상:0}
 * (04-database-design.md §2.6 · D-106 · 축 확대는 D-113)
 *
 * ⚠️ 갈래를 **손으로 적지 않는다.** 사다리에서 만들어야 갈래가 늘 때 여기가 저절로 따라온다.
 */
export const difficultyRatioSchema = z.strictObject(
  Object.fromEntries(
    DIFFICULTY_LADDER_VALUES.map((tier) => [tier, z.number().int().min(0)]),
  ) as Record<Difficulty, z.ZodNumber>,
);

// ─────────────────────────────────────────────
// 에러 응답 (02-trd.md §8.2)
// ─────────────────────────────────────────────

export const errorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "INSUFFICIENT_PROBLEMS",
  "AI_GENERATION_FAILED",
  // eywa 동기화(「지금 가져오기」) 실패 — eywa 쪽 장애·전송 미설정. 화면이 사유를 그대로 보여 준다.
  "EYWA_SYNC_FAILED",
  "CONFLICT",
  "INTERNAL_ERROR",
  // 학생 로그인 연속 5회 실패 잠금(D-125 ⑶) — 429. 문구는 studentAccount.contract.ts STUDENT_LOGIN_MESSAGES.locked
  "TOO_MANY_ATTEMPTS",
  // 오늘의 영어(D-148, 25 §3~§4) — 세트 저장·생성의 검증기 거절(422/502, details 에 issues) ·
  // 세트 고치기의 revision 불일치(409) · 자료 파일 10MB 초과(413 — 사유가 JSON 으로 가게)
  "ENGLISH_DRAFT_REJECTED",
  "REVISION_MISMATCH",
  "PAYLOAD_TOO_LARGE",
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

/** VALIDATION_ERROR 등 필드 단위 상세가 있는 범용 에러의 details 배열 원소 형태. */
export const fieldErrorDetailSchema = z.strictObject({
  field: z.string(),
  message: z.string(),
});
export type FieldErrorDetail = z.infer<typeof fieldErrorDetailSchema>;

/**
 * 에러 응답 공통 형태. details는 에러 코드마다 형태가 달라 여기서는 unknown으로 열어두고,
 * 코드별 정확한 details 스키마는 해당 도메인 계약 파일에서 좁혀서(narrowing) 재정의한다.
 * (예: INSUFFICIENT_PROBLEMS 전용 details → test.contract.ts의 insufficientProblemsDetailSchema)
 */
export const errorResponseSchema = z.strictObject({
  error: z.strictObject({
    code: errorCodeSchema,
    message: z.string().min(1, { error: "에러 메시지가 비어 있습니다." }),
    details: z.unknown().optional(),
  }),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

// ─────────────────────────────────────────────
// 성공 응답 래퍼 (02-trd.md §8.2)
// ─────────────────────────────────────────────

export const paginationParamsSchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationParams = z.infer<typeof paginationParamsSchema>;

export const paginationMetaSchema = z.strictObject({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
});
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

/** data 전용 성공 응답 (meta 없음) — 단건 조회/생성/수정/삭제 응답에 사용. */
export function dataResponseSchema<T extends z.ZodType>(dataSchema: T) {
  return z.strictObject({ data: dataSchema });
}

/** data + meta 성공 응답 — 페이지네이션이 필요한 목록 조회에 사용. */
export function listResponseSchema<T extends z.ZodType>(itemSchema: T) {
  return z.strictObject({
    data: z.array(itemSchema),
    meta: paginationMetaSchema,
  });
}

/** DELETE 요청 공통 응답 — 삭제된 리소스의 id만 반환. */
export const deleteResponseSchema = dataResponseSchema(
  z.strictObject({ id: uuidSchema }),
);
