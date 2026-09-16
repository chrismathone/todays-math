/**
 * 수업 계획 칸의 **입력 중인 값** — 반 관리 카드와 반 만들기가 같이 쓴다 (D-131).
 *
 * 규칙(날짜 펴기)은 여기 없다 — 서버 `planSchedule.ts` 한 곳. 여기는 칸 값 ↔ 요청 본문만.
 * 요일은 저장 번호(0=일 … 6=토)로 든다 — 월요일부터 그리는 것은 화면이다(22 §4 리드 결정 ⑶).
 */
import type {
  ProgressPlanEntity,
  ProgressPlanWriteRequest,
} from "@/contracts/dailyAutoTest.contract";

export interface PlanDraft {
  weekdays: number[];
  /** 아직 안 골랐으면 null — 조용히 첫 차시를 넣지 않는다. */
  startUnitId: string | null;
  unitsPerLesson: number;
  /** YYYY-MM-DD (입력 중이면 빈 값일 수 있다) */
  startDate: string;
  active: boolean;
}

/** 한 수업 차시 수 고르기의 끝 — 계약 `MAX_UNITS_PER_LESSON`(오타 울타리)과 같다. */
export const PLAN_UNITS_CHOICES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export function emptyPlanDraft(today: string): PlanDraft {
  return {
    weekdays: [],
    startUnitId: null,
    unitsPerLesson: 1,
    startDate: today,
    active: true,
  };
}

export function planDraftFrom(plan: ProgressPlanEntity): PlanDraft {
  return {
    weekdays: [...plan.weekdays],
    startUnitId: plan.startUnitId,
    unitsPerLesson: plan.unitsPerLesson,
    startDate: plan.startDate,
    active: plan.active,
  };
}

export function toggleWeekday(draft: PlanDraft, weekday: number): PlanDraft {
  return {
    ...draft,
    weekdays: draft.weekdays.includes(weekday)
      ? draft.weekdays.filter((d) => d !== weekday)
      : [...draft.weekdays, weekday],
  };
}

/**
 * 요청 본문 — 요일은 겹침 없이 차례대로(서버 저장 모양과 같다). 시작 차시를 안 골랐으면 칸을 빼고
 * 보낸다 — 거절 문구는 서버가 정한다(화면이 따로 짓지 않는다).
 */
export function planDraftBody(
  draft: PlanDraft,
): ProgressPlanWriteRequest | Omit<ProgressPlanWriteRequest, "startUnitId"> {
  const base = {
    weekdays: [...new Set(draft.weekdays)].sort((a, b) => a - b),
    unitsPerLesson: draft.unitsPerLesson,
    startDate: draft.startDate,
    active: draft.active,
  };
  return draft.startUnitId ? { ...base, startUnitId: draft.startUnitId } : base;
}

/** 미리보기를 부를 만큼 찼나 — 요일 하나 이상 · 시작 차시 · 날짜 모양. */
export function planDraftReady(draft: PlanDraft): boolean {
  return (
    draft.weekdays.length > 0 &&
    draft.startUnitId !== null &&
    /^\d{4}-\d{2}-\d{2}$/.test(draft.startDate)
  );
}

/** 같은 규칙인가 — 요일 차례가 달라도 같다. */
export function planDraftKey(draft: PlanDraft): string {
  const body = planDraftBody(draft);
  return JSON.stringify([
    body.weekdays,
    body.unitsPerLesson,
    "startUnitId" in body ? body.startUnitId : null,
    body.startDate,
    body.active,
  ]);
}
