import { fadingDateOf, fadingDayOfDate } from "./schedule";

/**
 * 학생별 하루 분량 — 화면도 DB 도 모른다 (원장님 결정 2026-10-17 · `docs/planning/tracks/reports/fading-quota-consensus-20261017.md` §7).
 *
 * - 서비스 기본 **15칸**(그 전에는 20). 학생 지정은 10 · 15 · 20 가운데 하나이고, `null` 은 «서비스 기본»이다(기본이 바뀌면 따라간다).
 * - 바꾼 값은 **다음 한국 날짜부터**다 — 오늘의 계획이 하루 도중에 바뀌지 않게. 그래서 행은 «앞의 값 · 새 값 · 적용일» 셋을 든다.
 * - 저장은 학생 기록 JSON(`fading`) 밖의 표(`fading_student_policy`)다 — 학생이 풀 때마다 바뀌는 revision 과 부딪히지 않고,
 *   엄격한 학생 기록 계약의 되돌림 하한을 옮기지 않는다(합의 §3).
 */
export const FADING_SERVICE_QUOTA = 15;
export const FADING_QUOTA_CHOICES = [10, 15, 20] as const;
export type FadingQuotaChoice = (typeof FADING_QUOTA_CHOICES)[number];
/** `null` = 서비스 기본. */
export type FadingQuota = FadingQuotaChoice | null;

export type FadingQuotaRow = {
  quota: FadingQuota;
  previousQuota: FadingQuota;
  /** 새 값이 먹는 첫날(한국 날짜). */
  effectiveOn: string;
  revision: number;
};

export const fadingQuotaSlots = (quota: FadingQuota) =>
  quota ?? FADING_SERVICE_QUOTA;

/** 그날(한국 날짜) 먹는 값 — 행이 없으면 서비스 기본. */
export function fadingQuotaOn(
  row: FadingQuotaRow | null,
  date: string,
): FadingQuota {
  if (!row) return null;
  return date >= row.effectiveOn ? row.quota : row.previousQuota;
}

/** 오늘 바꾸면 저장할 값 — 내일 먹을 값과 같으면 `null`(바꿀 것이 없다). */
export function fadingQuotaChange(
  row: FadingQuotaRow | null,
  today: string,
  quota: FadingQuota,
): Omit<FadingQuotaRow, "revision"> | null {
  if (quota !== null && !FADING_QUOTA_CHOICES.includes(quota))
    throw new Error(`고를 수 없는 분량입니다: ${quota}`);
  const tomorrow = fadingDateOf(fadingDayOfDate(today) + 1);
  if (fadingQuotaOn(row, tomorrow) === quota) return null;
  return {
    quota,
    previousQuota: fadingQuotaOn(row, today),
    effectiveOn: tomorrow,
  };
}

/** 교사 화면의 꼴 — 오늘 먹는 값과, 앞으로 먹을 값이 다르면 그 예약. `slots` 는 칸 수(기본이면 15). */
export function fadingQuotaView(row: FadingQuotaRow | null, today: string) {
  const now = fadingQuotaOn(row, today);
  // 같은 날 되돌려 «내일도 오늘과 같은 값»이 됐으면 예약이 아니다.
  const pending =
    row && row.effectiveOn > today && row.quota !== now ? row : null;
  return {
    today: { quota: now, slots: fadingQuotaSlots(now) },
    next: pending
      ? {
          quota: pending.quota,
          slots: fadingQuotaSlots(pending.quota),
          on: pending.effectiveOn,
        }
      : null,
    revision: row?.revision ?? 0,
  };
}
