/**
 * 문제은행 P0 — **출력 직전 재검증**과 **교과서 지정 두 슬롯 준비 상태**의 계약 (2026-10-14).
 *
 *   POST …/problems/check          담긴 문항 id → 지금도 낼 수 있나 · 못 내면 그 까닭(필터와 무관, id 만)
 *   POST …/problems/textbook-slots 교과서 원문 id → 지정 슬롯 0/2 · 1/2 · 2/2 와 슬롯마다의 상태
 *
 * 둘 다 **읽기만** 한다. 규칙은 서버 한 곳에 있다 — 자격은 `problemEligibility.ts`, 슬롯은 `generator/textbookSlots.ts`
 * (오답 복습 `planRetry` 와 같은 술어). 화면은 이 응답을 그대로 보여 주고 규칙을 다시 짓지 않는다.
 *
 * ⚠️ `directUseAllowed = false` 는 법적 권리만이 아니라 그림 유실 · 재검토 · 원문 갱신 등 여러 잠금이 같이 쓰고
 *    까닭을 저장하지 않는다 — 열쇠 `locked` 는 «출제 잠금(사유 미기록)»으로 읽는다. 까닭을 지어내지 않는다.
 */
import { z } from "zod";

import { uuidSchema } from "./common.contract";
import { questionSelectionSchema } from "./questionFormats.contract";

/** 출제 못 하는 까닭의 열쇠 — `problemEligibility.ts` 의 `PROBLEM_INELIGIBLE_CODES` 와 같은 목록(시험이 지킨다). */
export const BANK_INELIGIBLE_CODES = [
  "notShared",
  "notApproved",
  "locked",
  "noAnswer",
] as const;
export const bankIneligibleCodeSchema = z.enum(BANK_INELIGIBLE_CODES);
export type BankIneligibleCode = z.infer<typeof bankIneligibleCodeSchema>;

/**
 * 열쇠의 화면 문구 — 확인되는 사실만 말한다(goal-bank-arithmetic-brand §수량). 검수 상태는 응답의 `reviewStatus` 를 함께 본다.
 * (`reason` 은 서버의 422 사유와 같은 문장 — 이 표는 짧은 칩 · 줄에 쓰는 이름이다.)
 */
export const BANK_INELIGIBLE_LABEL: Record<BankIneligibleCode, string> = {
  notShared: "공용 풀 아님",
  notApproved: "검수 미통과",
  locked: "출제 잠금(사유 미기록)",
  noAnswer: "정답 없음",
};

/** 한 번에 묻는 id 의 상한 — 학습지 상한(100문항)과 같다. */
export const BANK_CHECK_LIMIT = 100;

/**
 * 두 문이 읽는 본문의 상한(바이트) — 앱이 만드는 가장 큰 요청이 들어가야 한다.
 * 재검증은 문항마다 `selections`(신분 · 실제 형식 · 판)를 같이 싣는다: 100문항 · 가장 긴 값
 * (`q:v1:` 신분 · `multiple_choice` · 서버가 만든 `qr:v1:` 판)이면 28,824바이트다. 16KB 였을 때는 64문항부터
 * 읽기 전에 400 이 났다(2026-10-21 운영 — 교과서 75문항 · 19,341바이트). `bankCheckBodyLimit.test.ts` 가 지킨다.
 * ⚠️ 계약의 `revision` 은 길이를 묶지 않는다 — 판의 꼴을 바꾸면 이 상한을 다시 잰다(그 시험이 실제 판으로 잰다).
 */
export const BANK_READINESS_BODY_BYTES = 32 * 1024;

const idArray = (min: number) =>
  z
    .array(uuidSchema)
    .min(min)
    .max(BANK_CHECK_LIMIT, {
      error: `한 번에 ${BANK_CHECK_LIMIT}개까지 확인할 수 있습니다.`,
    });

// ── 출력 직전 재검증 (`POST …/problems/check`) ─────────────────────────────

export const bankCheckRequestSchema = z
  .strictObject({
    ids: idArray(1),
    selections: z
      .array(questionSelectionSchema)
      .min(1)
      .max(BANK_CHECK_LIMIT)
      .optional(),
  })
  .superRefine(({ ids, selections }, ctx) => {
    if (!selections) return;
    const expected = new Set(ids);
    if (
      selections.length !== expected.size ||
      new Set(selections.map((s) => s.problemId)).size !== selections.length ||
      selections.some((s) => !expected.has(s.problemId))
    )
      ctx.addIssue({
        code: "custom",
        message: "선택한 실제 문항과 확인할 문항이 같아야 합니다.",
      });
  });
export type BankCheckRequest = z.infer<typeof bankCheckRequestSchema>;

export const BANK_CHECK_STATES = ["eligible", "ineligible", "missing"] as const;

export const bankCheckItemSchema = z.strictObject({
  id: uuidSchema,
  /** `missing` = 지워졌거나 공용 풀에 없다(풀 밖 행이 있다는 사실도 드러내지 않는다). */
  state: z.enum(BANK_CHECK_STATES),
  code: bankIneligibleCodeSchema.nullable(),
  reason: z.string().min(1).nullable(),
  reviewStatus: z.string().min(1).nullable(),
  /** 지금의 차시 · 출처 — 담을 때와 다르면 화면이 «조건이 바뀐 문항»으로 알린다. */
  unitId: uuidSchema.nullable(),
  source: z.string().min(1).nullable(),
});
export type BankCheckItem = z.infer<typeof bankCheckItemSchema>;

export const bankCheckResponseSchema = z.strictObject({
  /** 요청한 차례 그대로(겹친 id 는 한 번). */
  items: z.array(bankCheckItemSchema),
  counts: z.strictObject({
    requested: z.number().int().min(0),
    eligible: z.number().int().min(0),
    ineligible: z.number().int().min(0),
    missing: z.number().int().min(0),
  }),
});
export type BankCheckResponse = z.infer<typeof bankCheckResponseSchema>;

// ── 교과서 지정 두 슬롯 (`POST …/problems/textbook-slots`) ─────────────────

export const bankTextbookSlotsRequestSchema = z.strictObject({
  /** 교과서 원문 id. 교과서가 아닌 id 는 `notTextbook` 으로 답한다. */
  sourceIds: idArray(1),
  /** 복습과 같은 제외 조건 — 이미 쓴 변형을 빼고 다시 센다(조용히 다른 문항으로 채우지 않는다). */
  excludeIds: idArray(0).default([]),
});
export type BankTextbookSlotsRequest = z.input<
  typeof bankTextbookSlotsRequestSchema
>;

export const BANK_SLOT_STATUSES = [
  "ready",
  "missing",
  "ineligible",
  "unitMismatch",
  "excluded",
] as const;

export const bankTextbookSlotSchema = z.strictObject({
  slot: z.union([z.literal(1), z.literal(2)]),
  status: z.enum(BANK_SLOT_STATUSES),
  /** 그 자리를 주장하는 변형 — 없으면(`missing`) null */
  problemId: uuidSchema.nullable(),
  code: bankIneligibleCodeSchema.nullable(),
  reason: z.string().min(1).nullable(),
});

export const BANK_SLOT_READINESS_STATES = [
  "ready",
  "partial",
  "none",
  "notTextbook",
  "missing",
] as const;

export const bankTextbookSlotReadinessSchema = z.strictObject({
  sourceId: uuidSchema,
  /** `ready` 2/2 · `partial` 1/2 · `none` 0/2 · `notTextbook` 교과서 원문 아님 · `missing` 원문이 없다(공용 풀 밖) */
  state: z.enum(BANK_SLOT_READINESS_STATES),
  /** 자격 있는 지정 슬롯 수. 새로 보게 될 문항 수가 아니다 — 같은 학습지에 담긴 변형도 센다. */
  ready: z.number().int().min(0).max(2),
  required: z.literal(2),
  /** 슬롯 1 · 2 차례. `notTextbook` · `missing` 이면 빈 배열. */
  slots: z.array(bankTextbookSlotSchema).max(2),
});
export type BankTextbookSlotReadiness = z.infer<
  typeof bankTextbookSlotReadinessSchema
>;

export const bankTextbookSlotsResponseSchema = z.strictObject({
  /** 요청한 차례 그대로(겹친 id 는 한 번). */
  items: z.array(bankTextbookSlotReadinessSchema),
});
export type BankTextbookSlotsResponse = z.infer<
  typeof bankTextbookSlotsResponseSchema
>;
