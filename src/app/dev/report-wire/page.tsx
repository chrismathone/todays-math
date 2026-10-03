import { notFound } from "next/navigation";
import { connection } from "next/server";

import { collectAchievement } from "@/lib/achievement/collect";
import { loadAchievementInput } from "@/lib/achievement/load";
import { type Period, recentWeeks } from "@/lib/achievement/period";
import { db } from "@/lib/db";
import { devPageVisible } from "@/lib/devPageAccess";
import { kstDateOf } from "@/lib/kstDate";

import { ReportWireClient } from "./ReportWireClient";

/**
 * **성취 리포트 시안 — Wire 4안 (D-07)** — 2026-09-18, D-134 트랙 2.
 *
 * ## 이 시안이 정말 묻는 것
 *
 * 그림보다 먼저 답해야 하는 물음이 있다: **팩터 넷 중 지금 숫자를 댈 수 있는 것은 «진도» 하나**다
 * (23 §1.1 — `test_result`·`analysis_report`·`concept_lecture_view`·`progress_plan` 이 전부 0행).
 * 그러니 네 안이 **전부** 답해야 하는 것은 셋이다:
 *
 *   ㉠ **비어 있는 영역을 어떻게 다루나** — 빈칸을 0으로 그리면 거짓말이다(23 §4 ③)
 *   ㉡ **한 장인가 두 장인가** — 원장님이 보는 화면과 학부모가 보는 지면은 담는 깊이가 다르다
 *   ㉢ **난이도 4단을 어떻게 말하나** — 「기본까지는 되는데 응용에서 무너진다」는
 *      **우리만 댈 수 있는 문장**이다(경쟁사에 이 축이 없다 — 23 §5). 그림인가 문장인가
 *
 * ## 🔴 두 가지 상태를 나란히 보여 준다
 *
 * ⓐ **지금 실데이터**(진도만 있고 나머지가 비어 있다) · ⓑ **채점과 영상이 다 찬 뒤**.
 * ⓑ 만 보여 드리면 「이미 되는 것」으로 읽히므로 화면이 **«예시 데이터»라고 적는다.**
 *
 * ## 🔴 실데이터는 «가장 두꺼운 학생»으로 세운다 (2026-08-19 교훈)
 *
 * 확인테스트 범위 UI 시안이 작은 픽스처로 서는 바람에 실제 데이터에서 화면이 밀렸고, 원장님이
 * 스크린샷으로 잡아 주셨다. 여기서는 공유 DB 에서 **그 기간 진도가 가장 두꺼운 학생**을
 * **세어서** 고른다 — id 를 손으로 박으면 그 행이 사라진 날 시안이 조용히 빈 화면이 된다.
 *
 * ⚠️ **아무것도 안 바꾼다** — 이 화면은 읽기 전용이다.
 */
export const dynamic = "force-dynamic";

/** 기본 기간 — 최근 4주. 학부모 리포트의 현실적인 주기다(23 §2.1 매쓰플랫은 월 1회 + 주간 집계). */
const WEEKS = 4;

async function pickPeriodAndStudent(): Promise<{
  period: Period;
  studentId: string | null;
  /** 기간을 오늘이 아니라 마지막 진도에 걸었나 — 화면이 그 사실을 적는다. */
  anchoredOnLastProgress: boolean;
  candidates: number;
}> {
  const today = kstDateOf(new Date());
  const last = await db.progress.aggregate({ _max: { recordedAt: true } });
  const lastDay = last._max.recordedAt
    ? last._max.recordedAt.toISOString().slice(0, 10)
    : null;

  // 오늘 기준 최근 4주에 진도가 하나도 없으면(개발 기계·옛 덤프) 마지막 진도에 건다.
  let period = recentWeeks(today, WEEKS);
  let anchoredOnLastProgress = false;
  if (lastDay !== null && lastDay < period.from) {
    period = recentWeeks(lastDay, WEEKS);
    anchoredOnLastProgress = true;
  }

  const [students, rows] = await Promise.all([
    db.student.findMany({
      select: { id: true, classId: true, useIndividualProgress: true },
    }),
    db.progress.findMany({
      where: {
        retiredAt: null,
        recordedAt: {
          gte: new Date(`${period.from}T00:00:00.000Z`),
          lte: new Date(`${period.to}T00:00:00.000Z`),
        },
      },
      select: { classId: true, studentId: true },
    }),
  ]);

  const classCount = new Map<string, number>();
  const ownCount = new Map<string, number>();
  for (const r of rows) {
    if (r.studentId === null)
      classCount.set(r.classId, (classCount.get(r.classId) ?? 0) + 1);
    else ownCount.set(r.studentId, (ownCount.get(r.studentId) ?? 0) + 1);
  }

  /**
   * ⚠️ 여기 셈은 **누구를 보여 줄까**를 고르는 어림이다. 실제 팩터는
   * `loadAchievementInput` 이 `applicableProgress`(진도 판정 한 곳)로 다시 센다.
   */
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
    period,
    studentId: top && top.rows > 0 ? top.id : null,
    anchoredOnLastProgress,
    candidates: ranked.filter((r) => r.rows > 0).length,
  };
}

export default async function ReportWirePage() {
  await connection();
  if (!(await devPageVisible({ directorOnly: true }))) notFound();

  const picked = await pickPeriodAndStudent();

  if (picked.studentId === null) {
    return (
      <main className="mx-auto max-w-[900px] px-6 py-10 text-ink">
        <h1 className="text-[22px] font-black">성취 리포트 시안</h1>
        <p className="mt-3 text-[13px] text-g-red-text">
          {picked.period.from}~{picked.period.to} 에 진도 기록이 있는 학생이
          공유 DB 에 없습니다 — 시안을 실데이터로 세울 수 없으므로 아무것도
          그리지 않습니다. 지어낸 픽스처로 그리면 「실제 이름과 단원이 이 자리에
          들어가나」라는 물음이 사라집니다.
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
    <ReportWireClient
      real={collectAchievement(input)}
      candidates={picked.candidates}
      anchoredOnLastProgress={picked.anchoredOnLastProgress}
      weeks={WEEKS}
    />
  );
}
