/**
 * 교과서 지정 두 슬롯의 **셈** — 읽기 전용 조사(`scripts/qa/bank/bank-readiness-census.ts`)와
 * 이미 어긋난 슬롯을 잠그는 도구(`scripts/import/textbook/lock-orphan-slots.ts`)가 같이 쓴다 (문제은행 P0 · 2026-10-14).
 *
 * 준비 상태는 화면 · 복습과 **같은 함수**(`textbookSlotReadiness`)로 센다 — 조사가 다른 규칙으로 세면
 * «조사는 2/2 인데 복습은 모자라다»가 다시 난다.
 */
import type { Prisma } from "@prisma/client";

import {
  parseTextbookSlotExternalId,
  textbookSlotReadiness,
  type TextbookSlotOrigin,
  type TextbookSlotRow,
} from "@/lib/generator/textbookSlots";
import {
  problemIneligibleCode,
  type ProblemEligibilityInput,
  type ProblemIneligibleCode,
} from "@/lib/problemEligibility";

export type SlotCensusOrigin = TextbookSlotOrigin & ProblemEligibilityInput;

/**
 * 원문 · 슬롯 행에서 읽는 칸 — 복습 후보(`RETRY_CANDIDATE_SELECT`)의 판정 칸과 같다.
 * 스크립트가 `retryCandidates.ts`(→ `@/lib/db` 클라이언트)를 끌어오지 않게 여기 따로 둔다.
 */
export const SLOT_CENSUS_SELECT = {
  id: true,
  unitId: true,
  source: true,
  originProblemId: true,
  externalId: true,
  pool: true,
  reviewStatus: true,
  directUseAllowed: true,
  answer: true,
} as const satisfies Prisma.ProblemSelect;

export interface SlotCensus {
  /** 공용 풀에서 보이는 교과서 원문 */
  origins: number;
  /** 그 가운데 출제 가능한 원문 */
  eligibleOrigins: number;
  /** 원문별 준비 상태 — 원문 전부 · 출제 가능한 원문만 */
  readiness: Record<"ready" | "partial" | "none", number>;
  readinessOfEligible: Record<"ready" | "partial" | "none", number>;
  /** 슬롯 행(신분이 맞는 행)의 상태 — 출제 불가는 까닭의 열쇠별 */
  slots: {
    total: number;
    ready: number;
    unitMismatch: number;
    ineligible: Partial<Record<ProblemIneligibleCode, number>>;
  };
  /**
   * 🔴 원문이 출제 불가인데 **열린** 지정 슬롯 — 원문이 잠기거나 검수가 내려간 뒤 슬롯이 따라 잠기지 않은 자리.
   * 복습은 원문의 지금 상태를 보지 않으므로(이미 낸 시험지의 오답이다) 이 슬롯은 계속 나간다.
   */
  openSlotsOfIneligibleOrigin: number;
}

/** 원문 · 슬롯 행 → 셈. 슬롯 행은 자격과 무관하게 보이는 것 전부를 넣는다. */
export function summarizeSlotCensus(
  origins: readonly SlotCensusOrigin[],
  rows: readonly TextbookSlotRow[],
): SlotCensus {
  const byOrigin = new Map<string, TextbookSlotRow[]>();
  for (const row of rows) {
    const key = parseTextbookSlotExternalId(row.externalId);
    if (!key || key.originId !== row.originProblemId) continue;
    byOrigin.set(key.originId, [...(byOrigin.get(key.originId) ?? []), row]);
  }
  const census: SlotCensus = {
    origins: 0,
    eligibleOrigins: 0,
    readiness: { ready: 0, partial: 0, none: 0 },
    readinessOfEligible: { ready: 0, partial: 0, none: 0 },
    slots: { total: 0, ready: 0, unitMismatch: 0, ineligible: {} },
    openSlotsOfIneligibleOrigin: 0,
  };
  for (const origin of origins) {
    if (origin.source !== "school_textbook") continue;
    const eligible = problemIneligibleCode(origin) === null;
    const readiness = textbookSlotReadiness(
      origin,
      byOrigin.get(origin.id) ?? [],
    );
    if (readiness.state === "notTextbook") continue;
    census.origins += 1;
    census.readiness[readiness.state] += 1;
    if (eligible) {
      census.eligibleOrigins += 1;
      census.readinessOfEligible[readiness.state] += 1;
    }
    for (const slot of readiness.slots) {
      if (slot.status === "missing") continue;
      census.slots.total += 1;
      if (slot.status === "ready") {
        census.slots.ready += 1;
        if (!eligible) census.openSlotsOfIneligibleOrigin += 1;
      } else if (slot.status === "unitMismatch") census.slots.unitMismatch += 1;
      else if (slot.status === "ineligible" && slot.code)
        census.slots.ineligible[slot.code] =
          (census.slots.ineligible[slot.code] ?? 0) + 1;
    }
  }
  return census;
}
