import { notFound } from "next/navigation";
import { connection } from "next/server";

import { collectAchievement } from "@/lib/achievement/collect";
import { loadAchievementInput } from "@/lib/achievement/load";
import {
  addDays,
  monthOf,
  monthPeriod,
  type Period,
} from "@/lib/achievement/period";
import { db } from "@/lib/db";
import { devPageVisible } from "@/lib/devPageAccess";
import { kstDateOf } from "@/lib/kstDate";

import { ReportHifiClient } from "./ReportHifiClient";

/**
 * **성취 리포트 Hi-fi 5안 (D-07)** — 2026-09-18, D-134 ⑻.
 *
 * 브리프: `docs/planning/tracks/briefs/achievement-hifi.md` · 합의: 23 §7.2.
 *
 * ## 🔴 기간은 달력 한 달이다
 *
 * 리포트는 월 1회 발행이다(23 §7 Q3). 기본은 **지난달**(오늘이 9월 18일이면 8월 1일 ~ 31일) — 달이
 * 끝나야 발행하기 때문이다. `?month=YYYY-MM` 으로 다른 달을 본다(가장 두꺼운 달로 A4 를 조여 볼 때).
 * 그 달에 진도가 하나도 없으면 진도가 있는 **가장 최근 달**로 옮기고 화면이 그 사실을 적는다.
 *
 * ## 🔴 실데이터는 «가장 두꺼운 학생»으로 세운다 (2026-08-19 교훈)
 *
 * 그 달에 적용되는 진도 행이 가장 많은 학생을 **세어서** 고른다 — id 를 손으로 박으면 그 행이
 * 사라진 날 시안이 조용히 빈 화면이 된다. 예쁜 픽스처는 A4 가 넘치는 조건을 지운다.
 *
 * ⚠️ 읽기 전용 — 이 화면은 공유 DB 에 아무것도 쓰지 않는다.
 * ⚠️ 원장 전용(`devPageVisible({ directorOnly: true })`) — `/dev/report-wire` 와 같은 규약.
 */
export const dynamic = "force-dynamic";

async function pickMonthAndStudent(requested: string | null): Promise<{
  period: Period;
  studentId: string | null;
  candidates: number;
  movedToLatest: boolean;
}> {
  const today = kstDateOf(new Date());
  const lastMonth = monthOf(addDays(`${monthOf(today)}-01`, -1));
  let month = requested ?? lastMonth;
  let movedToLatest = false;

  const [students, rows] = await Promise.all([
    db.student.findMany({
      select: { id: true, classId: true, useIndividualProgress: true },
    }),
    db.progress.findMany({
      select: { classId: true, studentId: true, recordedAt: true },
    }),
  ]);

  const monthRows = (m: string) =>
    rows.filter((r) => monthOf(r.recordedAt.toISOString().slice(0, 10)) === m);
  if (requested === null && monthRows(month).length === 0) {
    const latest = rows
      .map((r) => r.recordedAt.toISOString().slice(0, 10))
      .sort()
      .at(-1);
    if (latest) {
      month = monthOf(latest);
      movedToLatest = true;
    }
  }

  /**
   * ⚠️ 여기 셈은 **누구를 보여 줄까**를 고르는 어림이다. 실제 팩터는 `loadAchievementInput` 이
   * `applicableProgress`(진도 판정 한 곳)로 다시 센다.
   */
  const classCount = new Map<string, number>();
  const ownCount = new Map<string, number>();
  for (const r of monthRows(month)) {
    if (r.studentId === null)
      classCount.set(r.classId, (classCount.get(r.classId) ?? 0) + 1);
    else ownCount.set(r.studentId, (ownCount.get(r.studentId) ?? 0) + 1);
  }
  const ranked = students
    .map((s) => ({
      id: s.id,
      rows: s.useIndividualProgress
        ? (ownCount.get(s.id) ?? 0)
        : (classCount.get(s.classId) ?? 0),
    }))
    .sort((a, b) => b.rows - a.rows);

  const top = ranked[0];
  return {
    period: monthPeriod(month),
    studentId: top && top.rows > 0 ? top.id : null,
    candidates: ranked.filter((r) => r.rows > 0).length,
    movedToLatest,
  };
}

export default async function ReportHifiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  if (!(await devPageVisible({ directorOnly: true }))) notFound();

  const params = await searchParams;
  const raw = Array.isArray(params.month) ? params.month[0] : params.month;
  const requested = raw && /^\d{4}-\d{2}$/.test(raw) ? raw : null;

  const picked = await pickMonthAndStudent(requested);
  if (picked.studentId === null) {
    return (
      <main className="mx-auto max-w-[900px] px-6 py-10 text-ink">
        <h1 className="text-[22px] font-black">성취 리포트 Hi-fi</h1>
        <p className="mt-3 text-[13px] text-g-red-text">
          {picked.period.from}~{picked.period.to} 에 진도 기록이 있는 학생이
          공유 DB 에 없습니다 — 시안을 실데이터로 세울 수 없으므로 그리지
          않습니다.
        </p>
      </main>
    );
  }

  const input = await loadAchievementInput({
    studentId: picked.studentId,
    period: picked.period,
  });
  if (input === null) notFound();

  return (
    <ReportHifiClient
      real={collectAchievement(input)}
      candidates={picked.candidates}
      movedToLatest={picked.movedToLatest}
    />
  );
}
