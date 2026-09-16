/**
 * «이번 주 예정» **계기판 관** — 계획 API 가 준 줄을 칸으로 옮긴다 (D-131 · 05 §8.10). 순수 함수.
 *
 * 🔴 **날짜를 다시 펴지 않는다.** 어느 날이 수업일인지 · 무슨 차시인지 · 며칠 밀렸는지는 서버의
 *    `planSchedule.ts`(→ `resolveDailyPlan`) 한 곳이 정한다. 여기서 하는 일은 «오늘보다 앞인가 뒤인가»로
 *    칸 색을 고르고 글자를 다듬는 것뿐이다 — 규칙을 여기 다시 두면 미리보기·아침 초안과 칸이 갈린다.
 *
 * 칸 색(05 §8.10 표 — 흑백으로 복사해도 순서가 남는 명도 계단):
 *   done  지난 수업일 — 초록 `#08492E`
 *   now   오늘       — 파랑 `#2064B3`
 *   late  지난 수업일인데 그 날짜까지의 기록이 계획보다 늦다(driftDays < 0) — 노랑 `#D1A847`
 *   empty 앞날       — 빈 칸 `#E1E1DE`
 */
import type {
  PlanScheduleEntity,
  PlanUnitRef,
} from "@/contracts/dailyAutoTest.contract";

export type GaugeState = "done" | "now" | "late" | "empty";

/** 요일 이름 — 인덱스가 저장 번호(0=일 … 6=토, 계약 `lessonWeekdaySchema`). */
export const WEEKDAY_LABELS = [
  "일",
  "월",
  "화",
  "수",
  "목",
  "금",
  "토",
] as const;

/** 화면에 그리는 차례 — **월요일부터**. 값은 저장 번호(22 §4 리드 결정 ⑶ · 화면이 옮겨 그린다). */
export const WEEKDAYS_MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0] as const;

export interface GaugeCell {
  /** YYYY-MM-DD */
  date: string;
  state: GaugeState;
  /** 「9/16 수」 */
  dateLabel: string;
  /** 차시 이름(소단원) — 밀린 칸은 「밀림」 */
  unitLabel: string;
}

const names = (units: readonly PlanUnitRef[]): string =>
  units.length ? units.map((u) => u.section).join(" · ") : "—";

function dateLabel(date: string, weekday: number): string {
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)} ${WEEKDAY_LABELS[weekday] ?? ""}`;
}

export function gaugeCells(
  schedule: PlanScheduleEntity,
  today: string,
): GaugeCell[] {
  return schedule.rows.map((row) => {
    const state: GaugeState =
      row.date === today
        ? "now"
        : row.date > today
          ? "empty"
          : row.driftDays < 0
            ? "late"
            : "done";
    // 지난 칸은 실제가 이긴다(D-129 ⑵) — 기록이 없으면 계획대로 나간 것으로 본다(서버 셈과 같은 전제).
    const shown =
      state === "done"
        ? row.actual.length
          ? row.actual
          : row.planned
        : row.planned.length
          ? row.planned
          : row.actual;
    return {
      date: row.date,
      state,
      dateLabel: dateLabel(row.date, row.weekday),
      unitLabel: state === "late" ? "밀림" : names(shown),
    };
  });
}

/**
 * 아래 한 줄 「N일 밀림」의 N — 오늘까지의 **마지막 줄**의 밀림(그 날짜까지의 기록으로 서버가 잰 값).
 * 오늘 전 줄이 없으면 첫 줄(앞날 줄은 지금까지의 기록으로 잰다). 밀리지 않았으면 0.
 */
export function currentDelayDays(
  schedule: PlanScheduleEntity,
  today: string,
): number {
  const upToToday = schedule.rows.filter((r) => r.date <= today);
  const row = upToToday[upToToday.length - 1] ?? schedule.rows[0];
  return row && row.driftDays < 0 ? -row.driftDays : 0;
}
