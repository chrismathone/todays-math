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

// ─────────────────────────────────────────────
// 달력 한 달 — 리포트는 월 1회 발행이다(23 §7 Q3)
// ─────────────────────────────────────────────

/**
 * 🔴 **리포트의 기간은 달력 한 달(KST 1일 ~ 말일)이고, 비교는 «지난달»이다** (Hi-fi 브리프 §2 규칙 8).
 *
 * 예전에는 «같은 일수만큼 거슬러 간 직전 기간»을 썼다 — 2026년 3월의 비교가 2월이 아니라
 * **1/29~2/28** 이 되어 1월 사흘이 «지난달»에 섞였다(§1 #7). 월 1회 발행과 «최근 4주»도
 * 다르다 — 4주 창은 1년에 13번이라 달과 어긋나 누락·중복이 난다. 그래서 같은 일수 비교는
 * **아예 두지 않는다**(시험이 그 이름이 없음을 잠근다).
 */

/** `YYYY-MM` 의 달력 한 달. */
export function monthPeriod(month: string): Period {
  const from = `${month}-01`;
  const [y, m] = month.split("-").map(Number) as [number, number];
  const next =
    m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return { from, to: addDays(next, -1) };
}

/** 그 날짜가 속한 달(`YYYY-MM`). */
export function monthOf(day: string): string {
  return day.slice(0, 7);
}

/** 기간이 **달력 한 달 그대로**인가 — 문장이 «이번 달»·«월말»이라고 말해도 되나. */
export function isCalendarMonth(period: Period): boolean {
  const month = monthPeriod(monthOf(period.from));
  return month.from === period.from && month.to === period.to;
}

/**
 * **지난달** — 기간 시작일이 속한 달의 **바로 앞 달력 한 달**. 일수를 세지 않는다.
 * 비교군 ①(본인의 지난달)이 쓴다.
 */
export function previousMonth(period: Period): Period {
  return monthPeriod(monthOf(addDays(`${monthOf(period.from)}-01`, -1)));
}

/**
 * 🔴 **기간 끝의 다음 순간** — 기간 끝 **다음날 00:00 KST** (배타 경계).
 *
 * 영상 완료(`completedAt`)·강의 게시(`publishedAt`)는 날짜가 아니라 **시각**이라, 기간 밖의 일을
 * 자르려면 학원 시간으로 선을 그어야 한다(§1 #6 · #8). 8월이면 9월 1일 00:00 KST = 8/31 15:00Z.
 */
export function periodEndExclusive(period: Period): Date {
  return new Date(`${addDays(period.to, 1)}T00:00:00+09:00`);
}

/** 최근 `weeks` 주 — 그 날짜가 속한 주의 월요일에서 거꾸로 센다. 끝은 `day` 그대로. */
export function recentWeeks(day: string, weeks: number): Period {
  const thisWeek = startOfWeek(day);
  return { from: addDays(thisWeek, -7 * (weeks - 1)), to: day };
}
