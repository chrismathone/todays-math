/**
 * 지정 두 슬롯의 조사 셈(`slotCensus.ts`) — 준비 상태는 화면 · 복습과 같은 `textbookSlotReadiness` 로 센다.
 * 🔴 «출제 불가 원문의 열린 슬롯»은 원문이 잠긴 뒤 슬롯이 따라 잠기지 않은 자리다 — 복습은 그 슬롯을 계속 낸다.
 */
import { describe, expect, it } from "vitest";

import { MISSING_ANSWER } from "@/lib/missingAnswer";
import { textbookSlotExternalId } from "@/lib/generator/textbookSlots";
import {
  summarizeSlotCensus,
  type SlotCensusOrigin,
} from "@/lib/import/schoolTextbook/slotCensus";

const origin = (
  id: string,
  patch: Partial<SlotCensusOrigin> = {},
): SlotCensusOrigin => ({
  id,
  unitId: "U1",
  source: "school_textbook",
  pool: "shared",
  reviewStatus: "approved",
  directUseAllowed: true,
  answer: "3",
  ...patch,
});
const slot = (
  parent: string,
  n: 1 | 2,
  patch: Record<string, unknown> = {},
) => ({
  id: `${parent}-${n}`,
  unitId: "U1",
  source: "transformed" as const,
  originProblemId: parent,
  externalId: textbookSlotExternalId(parent, n),
  pool: "shared",
  reviewStatus: "approved",
  directUseAllowed: true,
  answer: "5",
  ...patch,
});

describe("지정 슬롯 조사의 셈", () => {
  it("원문별 0/2 · 1/2 · 2/2 와 슬롯 상태 · 출제 불가 원문의 열린 슬롯", () => {
    const census = summarizeSlotCensus(
      [
        origin("full"),
        origin("half"),
        origin("none"),
        origin("locked", { directUseAllowed: false }),
        origin("engine", { source: "manual" }),
      ],
      [
        slot("full", 1),
        slot("full", 2),
        slot("half", 1, { reviewStatus: "rejected" }),
        slot("half", 2),
        slot("locked", 1),
        slot("locked", 2, { unitId: "U2" }),
        slot("none", 1, { answer: MISSING_ANSWER, directUseAllowed: false }),
        slot("engine", 1),
        // 다른 원문의 열쇠를 단 행 — 어느 원문의 슬롯으로도 세지 않는다
        slot("full", 1, { id: "stray", originProblemId: "half" }),
      ],
    );
    expect(census).toEqual({
      origins: 4,
      eligibleOrigins: 3,
      readiness: { ready: 1, partial: 2, none: 1 },
      readinessOfEligible: { ready: 1, partial: 1, none: 1 },
      slots: {
        total: 7,
        ready: 4,
        unitMismatch: 1,
        ineligible: { notApproved: 1, locked: 1 },
      },
      openSlotsOfIneligibleOrigin: 1,
    });
  });
});
