/**
 * **「이번 주 예정」** — 계획을 날짜별 줄로 편다. 순수 함수 (매일 자동 출제 ④의 뒷단, D-129 ⑵).
 *
 * 브리프: docs/planning/tracks/briefs/daily-auto-test-plan-api.md §2 ⑵ · 시안 B(`wire-d129-daily-auto-test.html`)
 *
 * 날짜 펴기는 **다시 짜지 않는다** — 줄마다 `resolveDailyPlan` 을 부른다. 여기서 셈을 따로 두면
 * 「목록에는 u5 인데 아침 8시 초안은 u4」가 된다. 적용 이력도 제품 함수(`applicableProgress` ·
 * `findLatestProgress`)가 고른다 — `planDailyReview` 와 같은 판정이다.
 *
 * ## 며칠 치 — 이번 주 월요일부터 14일
 *
 * 화면은 요일을 **월요일부터** 그린다(22 §4 리드 결정 ⑶). 이번 주의 지난 수업일에는 «실제»가 붙어
 * 밀림이 보이고, 다음 주까지 담아야 금·토요일에 봐도 앞으로 나갈 수업이 남는다(시안 B 도 다음 주
 * 월요일 줄을 싣는다). 수업 요일이 주 1회인 반도 두 줄은 선다.
 *
 * ## 🔴 「예정」은 그날 **아침 기준**이다
 *
 * 그날의 예정은 **그 날짜 전에** 기록된 진도로 편다. 그날 기록된 진도까지 넣으면 `resolveDailyPlan` 이
 * 그 기록을 기준점으로 삼아 예정 = 실제가 되고, 밀림이 목록에서 사라진다. 아침 8시 초안이 보는 것도
 * 그날 아침까지의 기록이다(수업 뒤에 진도를 적는다). **다음 수업부터**는 그 기록에서 다시 편다.
 *
 * 밀림 일 수는 그 날짜**까지** 기록된 마지막 진도로 잰다 — 그날 기록이 있으면 그날의 밀림, 앞날에는
 * 지금까지의 밀림이 이어진다. 양수면 앞섬 · 음수면 밀림(`resolveDailyPlan` 과 같은 부호).
 *
 * 계약: src/contracts/dailyAutoTest.contract.ts (`planScheduleSchema`)
 */
import {
  addDays,
  diffDays,
  resolveDailyPlan,
  weekdayOf,
  type PlanUnit,
  type ProgressPlanRule,
} from "@/lib/daily/progressPlan";
import {
  applicableProgress,
  findLatestProgress,
  type ProgressRecordLike,
} from "@/lib/progressResolver";

/** 한 번에 보이는 날 수 — 이번 주 월요일 ~ 다음 주 일요일. */
export const PLAN_SCHEDULE_DAYS = 14;

export interface PlanScheduleRow {
  /** YYYY-MM-DD */
  date: string;
  /** 0=일 … 6=토 (계약 `lessonWeekdaySchema` 와 같은 번호) */
  weekday: number;
  /** 계획상 그날 수업인가(그날 아침 기준). 보강처럼 기록만 있는 날은 거짓. */
  lesson: boolean;
  /** 그날 아침까지의 기록으로 편 예정 차시(차례대로). 수업일이 아니면 빈 배열. */
  plannedUnitIds: string[];
  /** 그날 실제로 기록된 차시 — 기록 순서, 중복 없이. */
  actualUnitIds: string[];
  /** 그 날짜까지의 마지막 기록으로 잰 밀림(일). 양수 앞섬 · 음수 밀림 · 기록 없으면 0. */
  driftDays: number;
  /** 교육과정 끝에 닿아 끝 차시에 멈춰 있다. */
  atCurriculumEnd: boolean;
}

/** 기준일이 든 주의 월요일부터 `PLAN_SCHEDULE_DAYS` 일. 일요일은 그 주의 **끝**이다. */
export function planScheduleWindow(day: string): { from: string; to: string } {
  const sinceMonday = (weekdayOf(day) + 6) % 7;
  const from = addDays(day, -sinceMonday);
  return { from, to: addDays(from, PLAN_SCHEDULE_DAYS - 1) };
}

export function buildPlanSchedule(args: {
  rule: ProgressPlanRule;
  /** 전체 교육과정 — 차례는 `orderIndex` 가 정한다. */
  units: readonly PlanUnit[];
  /** 반 전체 진도(studentId=null). */
  classProgress: readonly ProgressRecordLike[];
  /** 그 학생의 개별 진도. 반 계획이면 비운다. */
  studentProgress?: readonly ProgressRecordLike[];
  useIndividualProgress?: boolean;
  /** YYYY-MM-DD, 양끝 포함 */
  from: string;
  to: string;
}): PlanScheduleRow[] {
  const { rule, units, from, to } = args;

  const applicable = applicableProgress({
    classProgress: [...args.classProgress],
    studentProgress: [...(args.studentProgress ?? [])],
    useIndividualProgress: args.useIndividualProgress ?? false,
  });
  const anchorOf = (record: ProgressRecordLike | null) =>
    record ? { unitId: record.unitId, recordedAt: record.recordedAt } : null;

  const rows: PlanScheduleRow[] = [];
  const total = diffDays(from, to) + 1;
  for (let i = 0; i < total; i += 1) {
    const date = addDays(from, i);

    // 🔴 그날 아침 기준 — 그날 기록은 넣지 않는다(머리말).
    const morning = resolveDailyPlan({
      rule,
      units,
      day: date,
      actual: anchorOf(
        findLatestProgress(applicable.filter((r) => r.recordedAt < date)),
      ),
    });

    const recordedToday = applicable
      .filter((r) => r.recordedAt === date)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const actualUnitIds = [...new Set(recordedToday.map((r) => r.unitId))];

    if (!morning.lessonToday && actualUnitIds.length === 0) continue;

    const upToDate = resolveDailyPlan({
      rule,
      units,
      day: date,
      actual: anchorOf(
        findLatestProgress(applicable.filter((r) => r.recordedAt <= date)),
      ),
    });

    rows.push({
      date,
      weekday: weekdayOf(date),
      lesson: morning.lessonToday,
      plannedUnitIds: morning.unitIds,
      actualUnitIds,
      driftDays: upToDate.driftDays,
      atCurriculumEnd: morning.atCurriculumEnd,
    });
  }
  return rows;
}
