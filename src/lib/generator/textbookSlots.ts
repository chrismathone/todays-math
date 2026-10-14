/**
 * **교과서 원문의 지정 두 슬롯** — 오답 복습(`planRetry`) · 후보 조회(`retryCandidates`) · 준비 상태(0/2 · 1/2 · 2/2)가
 * 같이 쓰는 **유일한 술어** (문제은행 P0 · 2026-10-14 · `docs/planning/goal-bank-arithmetic-brand-20261014.md` «교과서 두 슬롯»).
 *
 * 슬롯 하나를 채우는 행은 다섯을 다 만족한다:
 *   1. 출처 `transformed`
 *   2. `originProblemId` = 원문 id
 *   3. `externalId` = `tb-retry-v1:{원문 id}:{1|2}` — 열쇠는 DB 에서 유일하다(자리마다 행은 많아야 하나)
 *   4. 원문과 같은 `unitId`
 *   5. 출제 자격(`problemEligibility.ts`) · 호출자가 뺀 id(`excludeIds` · 복습의 다른 오답)가 아님
 *
 * 🔴 화면마다 파서를 만들지 않는다 — 준비 상태가 복습과 다른 규칙을 쓰면 «2/2 인데 복습이 모자라다»가 난다.
 *    `textbookSlotReadiness` 의 2/2 ⇔ `planRetry` 부족 0 을 짝 시험이 잠근다(`textbookSlots.test.ts`).
 * 🔴 원문 fingerprint 를 여기서 보지 않는다 — `Problem` 에 저장 칸이 없고 복습도 안 본다. 원문이 바뀌거나 잠기면
 *    지정 변형을 잠그는 것은 적재 · 갱신 도구의 책임이다(`import/schoolTextbook/designatedSlotLocks.ts`).
 * 🔴 일반 유사문항(같은 갈래)은 슬롯이 아니다 — 모자란 슬롯을 유사문항으로 채워 2/2 로 세지 않는다.
 *
 * ⚠️ 이 모듈은 `@/lib/db` 를 import 하지 않는다 — 화면도 같은 술어를 쓸 수 있어야 한다.
 */
import type { Prisma } from "@prisma/client";

import type { ProblemSource } from "@/contracts/common.contract";
import {
  problemIneligibleCode,
  problemIneligibleReason,
  type ProblemIneligibleCode,
} from "@/lib/problemEligibility";
import { DEFAULT_PROBLEM_POOL } from "@/lib/problemPool";

export const TEXTBOOK_RETRY_SLOTS = [1, 2] as const;
export type TextbookRetrySlot = (typeof TEXTBOOK_RETRY_SLOTS)[number];
/** 원문마다 지정 슬롯 수 — 복습이 교과서 오답 하나에 요청하는 자리 수와 같다. */
export const TEXTBOOK_RETRY_REQUIRED = TEXTBOOK_RETRY_SLOTS.length;

const PREFIX = "tb-retry-v1:";

/** 슬롯 열쇠 — 적재기(`retryPairPlan.ts`)와 복습이 이 한 함수로 만든다. */
export function textbookSlotExternalId(
  originId: string,
  slot: TextbookRetrySlot,
): string {
  return `${PREFIX}${originId}:${slot}`;
}

/** 열쇠 → 원문 · 슬롯. 꼴이 아니면 `null`(과거 복구 자식 `textbook-recovery:…` 등). */
export function parseTextbookSlotExternalId(
  externalId: string | null | undefined,
): { originId: string; slot: TextbookRetrySlot } | null {
  if (!externalId?.startsWith(PREFIX)) return null;
  const at = externalId.lastIndexOf(":");
  const originId = externalId.slice(PREFIX.length, at);
  const slot = Number(externalId.slice(at + 1));
  if (!originId || (slot !== 1 && slot !== 2)) return null;
  return { originId, slot };
}

/**
 * 후보 조회의 신분 조건 — 출처 · 부모 · 열쇠. 자격은 부르는 쪽이 건다
 * (복습은 `problemEligibleWhere`, 준비 상태는 까닭을 보이려고 `problemVisibleWhere`).
 */
export function textbookSlotCandidateWhere(
  originIds: readonly string[],
): Prisma.ProblemWhereInput {
  return {
    source: "transformed",
    originProblemId: { in: [...originIds] },
    externalId: {
      in: originIds.flatMap((id) =>
        TEXTBOOK_RETRY_SLOTS.map((slot) => textbookSlotExternalId(id, slot)),
      ),
    },
  };
}

/** 슬롯을 판정하는 데 필요한 칸 — 복습 후보(`RetryCandidate`)의 부분집합이다. */
export interface TextbookSlotRow {
  id: string;
  unitId: string;
  source?: ProblemSource;
  originProblemId?: string | null;
  externalId?: string | null;
  directUseAllowed: boolean;
  /** 옛 일반 복습 호출자는 생략한다 — 생략하면 복습과 같은 기본값(공용 · 승인 · 빈 정답)으로 본다. */
  pool?: string;
  reviewStatus?: string;
  answer?: string;
}

/** 원문 — 슬롯은 원문의 id 와 차시에 묶인다. */
export interface TextbookSlotOrigin {
  id: string;
  unitId: string;
  source?: ProblemSource;
}

/**
 * 복습 후보의 출제 자격 열쇠. 생략된 칸은 `planRetry` 가 처음부터 쓰던 기본값으로 채운다 —
 * 그 기본값을 두 벌 두지 않으려고 여기 둔다(`planRetry` 의 일반 형제도 이것을 쓴다).
 */
export function retryCandidateIneligibleCode(
  row: Pick<
    TextbookSlotRow,
    "pool" | "reviewStatus" | "directUseAllowed" | "answer"
  >,
): ProblemIneligibleCode | null {
  return problemIneligibleCode(retryEligibilityInput(row));
}

function retryEligibilityInput(
  row: Pick<
    TextbookSlotRow,
    "pool" | "reviewStatus" | "directUseAllowed" | "answer"
  >,
) {
  return {
    pool: row.pool ?? DEFAULT_PROBLEM_POOL,
    reviewStatus: row.reviewStatus ?? "approved",
    directUseAllowed: row.directUseAllowed,
    answer: row.answer ?? "",
  };
}

export type TextbookSlotFit =
  /** 이 원문의 이 슬롯 행이 아니다(출처 · 부모 · 열쇠 중 하나가 다르다) */
  | { status: "notSlot" }
  | { status: "ready" }
  | { status: "ineligible"; code: ProblemIneligibleCode; reason: string }
  | { status: "unitMismatch" }
  | { status: "excluded" };

/**
 * 행 하나가 원문 `origin` 의 `slot` 자리를 채울 수 있나. 못 채우면 그 까닭 — 우선순위는 자격 → 차시 → 제외.
 * `blocked` 는 호출자가 뺀 id(`excludeIds`)와 복습의 다른 오답 id 다(둘 다 «이 자리에 쓰지 않는다»).
 */
export function textbookSlotFit(
  origin: Pick<TextbookSlotOrigin, "id" | "unitId">,
  slot: TextbookRetrySlot,
  row: TextbookSlotRow,
  blocked: ReadonlySet<string> = new Set(),
): TextbookSlotFit {
  if (
    row.source !== "transformed" ||
    row.originProblemId !== origin.id ||
    row.externalId !== textbookSlotExternalId(origin.id, slot)
  )
    return { status: "notSlot" };
  const code = retryCandidateIneligibleCode(row);
  if (code !== null)
    return {
      status: "ineligible",
      code,
      reason: problemIneligibleReason(retryEligibilityInput(row))!,
    };
  if (row.unitId !== origin.unitId) return { status: "unitMismatch" };
  if (blocked.has(row.id)) return { status: "excluded" };
  return { status: "ready" };
}

export type TextbookSlotStatus =
  "ready" | "missing" | "ineligible" | "unitMismatch" | "excluded";

export interface TextbookSlotState {
  slot: TextbookRetrySlot;
  status: TextbookSlotStatus;
  /** 그 자리를 주장하는 행 — 없으면(`missing`) `null` */
  problemId: string | null;
  code: ProblemIneligibleCode | null;
  reason: string | null;
}

export type TextbookSlotReadinessState =
  "ready" | "partial" | "none" | "notTextbook";

export interface TextbookSlotReadiness {
  originId: string;
  state: TextbookSlotReadinessState;
  /** 자격 있는 슬롯 수 — 0 · 1 · 2. 새로 보게 될 문항 수가 아니다(같은 학습지에 담긴 변형도 센다). */
  ready: number;
  required: typeof TEXTBOOK_RETRY_REQUIRED;
  slots: TextbookSlotState[];
}

/**
 * 원문 하나의 지정 슬롯 준비 상태. `rows` 는 그 원문의 슬롯 후보(출제 자격과 무관하게 **보이는** 행) —
 * 자격 없는 행을 넣어야 «하나 반려 → 1/2»의 까닭을 말할 수 있다. 다른 원문의 행이 섞여 있어도 된다.
 *
 * 출처가 교과서가 아닌 원문은 슬롯을 갖지 않는다(`notTextbook`) — 복습도 교과서 오답에만 두 자리를 연다.
 */
export function textbookSlotReadiness(
  origin: TextbookSlotOrigin,
  rows: readonly TextbookSlotRow[],
  options: { excludeIds?: readonly string[] } = {},
): TextbookSlotReadiness {
  const blocked = new Set(options.excludeIds ?? []);
  if (origin.source !== "school_textbook")
    return {
      originId: origin.id,
      state: "notTextbook",
      ready: 0,
      required: TEXTBOOK_RETRY_REQUIRED,
      slots: [],
    };
  const unique = [...new Map(rows.map((row) => [row.id, row])).values()];
  const slots = TEXTBOOK_RETRY_SLOTS.map((slot): TextbookSlotState => {
    const fits = unique
      .map((row) => ({ row, fit: textbookSlotFit(origin, slot, row, blocked) }))
      .filter(({ fit }) => fit.status !== "notSlot");
    const chosen = fits.find(({ fit }) => fit.status === "ready") ?? fits[0];
    if (!chosen)
      return {
        slot,
        status: "missing",
        problemId: null,
        code: null,
        reason: null,
      };
    const { row, fit } = chosen;
    return {
      slot,
      status: fit.status as Exclude<TextbookSlotFit["status"], "notSlot">,
      problemId: row.id,
      code: fit.status === "ineligible" ? fit.code : null,
      reason: fit.status === "ineligible" ? fit.reason : null,
    };
  });
  const ready = slots.filter((slot) => slot.status === "ready").length;
  return {
    originId: origin.id,
    state:
      ready === TEXTBOOK_RETRY_REQUIRED ? "ready" : ready ? "partial" : "none",
    ready,
    required: TEXTBOOK_RETRY_REQUIRED,
    slots,
  };
}
