import "server-only";
import { db } from "@/lib/db";
import { fadingDateOf, fadingDayOfDate } from "./schedule";
import {
  FADING_QUOTA_CHOICES,
  fadingQuotaOn,
  type FadingQuota,
  type FadingQuotaRow,
} from "./quota";

/**
 * 하루 분량 · 상한에 닿은 날의 표를 읽고 쓰는 곳 — 규칙은 `quota.ts` · `relearn.ts` 에 있고 여기는 행의 꼴만 바꾼다.
 * 🔴 표(`fading_student_policy` · `fading_relearn_cap_day`)는 학생 기록 JSON 밖이다. DB 먼저 · 코드 나중.
 */

type Client = Pick<typeof db, "fadingStudentPolicy" | "fadingRelearnCapDay">;

/** DATE 칸은 UTC 0시의 시각으로 온다 — 한국 날짜 글자 그대로다. */
const dateText = (at: Date) => at.toISOString().slice(0, 10);
const dateValue = (date: string) => new Date(`${date}T00:00:00.000Z`);

const choice = (value: number | null): FadingQuota =>
  value !== null && (FADING_QUOTA_CHOICES as readonly number[]).includes(value)
    ? (value as FadingQuota)
    : null;

export function fadingQuotaRowOf(
  row: {
    quota: number | null;
    previousQuota: number | null;
    effectiveOn: Date;
    revision: number;
  } | null,
): FadingQuotaRow | null {
  if (!row) return null;
  return {
    quota: choice(row.quota),
    previousQuota: choice(row.previousQuota),
    effectiveOn: dateText(row.effectiveOn),
    revision: row.revision,
  };
}

export async function readFadingQuotaRow(
  studentId: string,
  client: Client = db,
): Promise<FadingQuotaRow | null> {
  return fadingQuotaRowOf(
    await client.fadingStudentPolicy.findUnique({ where: { studentId } }),
  );
}

/** 그날 학생 라우트가 계획 · 홈에 줄 분량 — 서비스 기본이면 `undefined`(계획에 «대신 값»으로 적힌다). */
export async function fadingQuotaForStudent(
  studentId: string,
  today: string,
): Promise<number | undefined> {
  return fadingQuotaOn(await readFadingQuotaRow(studentId), today) ?? undefined;
}

/** 상한에 닿은 날을 적는다 — 같은 날 두 번 적어도 한 행이다. */
export async function recordFadingCapDay(
  studentId: string,
  on: string,
  client: Client = db,
): Promise<void> {
  await client.fadingRelearnCapDay.upsert({
    where: { studentId_on: { studentId, on: dateValue(on) } },
    create: { studentId, on: dateValue(on) },
    update: {},
  });
}

/** 학생마다 최근 `days` 일(오늘 포함) 가운데 상한에 닿은 날 수. */
export async function fadingCapDayCounts(
  studentIds: readonly string[],
  today: string,
  days: number,
  client: Client = db,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!studentIds.length) return counts;
  const from = fadingDateOf(fadingDayOfDate(today) - (days - 1));
  const rows = await client.fadingRelearnCapDay.findMany({
    where: {
      studentId: { in: [...new Set(studentIds)] },
      on: { gte: dateValue(from), lte: dateValue(today) },
    },
    select: { studentId: true },
  });
  for (const row of rows)
    counts.set(row.studentId, (counts.get(row.studentId) ?? 0) + 1);
  return counts;
}

export { dateValue as fadingDateValue };
