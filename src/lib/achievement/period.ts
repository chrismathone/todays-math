/**
 * 성취 리포트의 **기간 경계** — 이 셈은 여기 한 벌뿐이다 (D-134 트랙 2, 브리프 §1.1).
 *
 * 🔴 **주 시작은 월요일 00:00 (KST)** 이다. 업계 1위(매쓰플랫)도 이번 주 집계를 월요일 00:00 에
 *    리셋한다(23 §2.1). 경계를 화면마다 다시 적으면 「이번 주」가 두 벌이 되고, 한쪽만 고쳐도
 *    아무도 모른다 — `src/lib/kstDate.ts` 가 「오늘」에 대해 먼저 겪은 일이다.
 *
 * ⚠️ 여기 있는 셈은 **달력 날짜 문자열끼리의 셈**(요일·일 수)이고, 「지금이 며칠인가」를 묻는
 *    시간대 변환은 `kstDate.ts` 한 곳에만 둔다. 시각에서 주를 물을 때만 `kstWeekOf` 가
 *    그 변환을 빌려 쓴다.
 *
 * ⚠️ **달력 셈(`addDays`·`diffDays`·`weekdayOf`)을 여기서 다시 적지 않는다** — 진도 계획이
 *    이미 같은 셈을 갖고 있다(`daily/progressPlan.ts`). 두 벌이 되면 한쪽만 고쳐도 아무도
 *    안 운다. 빌려 쓰고 **그대로 다시 내보낸다** — 쓰는 쪽은 어느 쪽에서 가져와도 같은 것을 본다.
 */
import { addDays, diffDays, weekdayOf } from "@/lib/daily/progressPlan";
import { kstDateOf } from "@/lib/kstDate";

export { addDays, diffDays, weekdayOf };

/** 주의 첫 요일 — 0=일 … 6=토. **월요일**. (`Date.getUTCDay()` 와 같은 번호) */
export const WEEK_START_WEEKDAY = 1;

/** 그 날짜가 속한 주의 **월요일**(YYYY-MM-DD). */
export function startOfWeek(day: string): string {
  const back = (weekdayOf(day) - WEEK_START_WEEKDAY + 7) % 7;
  return addDays(day, -back);
}

/**
 * 그 **시각**이 속한 주의 월요일 — 시각을 먼저 **학원 시간(KST)** 으로 읽는다.
 *
 * 🔴 일요일 23:59(KST)와 월요일 00:00(KST)는 **다른 주**다. UTC 로 읽으면 둘 다 일요일 14:59/15:00 이라
 *    같은 주로 뭉개진다 — 채점 시각(`TestResult.takenAt`)이 timestamp 라 실제로 걸리는 자리다.
 */
export function kstWeekOf(at: Date): string {
  return startOfWeek(kstDateOf(at));
}

/** 집계 기간 — 양끝을 **포함**한다. */
export interface Period {
  /** YYYY-MM-DD */
  from: string;
  /** YYYY-MM-DD */
  to: string;
}

/** 기간의 날 수(양끝 포함). */
export function periodDays(period: Period): number {
  return diffDays(period.from, period.to) + 1;
}

/** 그 날짜가 기간 안인가(양끝 포함). */
export function withinPeriod(period: Period, day: string): boolean {
  return day >= period.from && day <= period.to;
}

/**
 * **같은 길이의 직전 기간** — 비교군 ①(본인의 지난 같은 길이 기간)이 쓴다.
 * 이번 기간의 시작 **바로 앞날**에서 끝난다.
 */
export function previousPeriod(period: Period): Period {
  const len = periodDays(period);
  const to = addDays(period.from, -1);
  return { from: addDays(to, -(len - 1)), to };
}

/** 최근 `weeks` 주 — 그 날짜가 속한 주의 월요일에서 거꾸로 센다. 끝은 `day` 그대로. */
export function recentWeeks(day: string, weeks: number): Period {
  const thisWeek = startOfWeek(day);
  return { from: addDays(thisWeek, -7 * (weeks - 1)), to: day };
}
