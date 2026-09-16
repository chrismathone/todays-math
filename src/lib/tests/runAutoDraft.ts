/**
 * 아침 8시 **자동 초안 회차** — 계획이 있는 학생의 그날 확인테스트 초안을 세운다 (D-129 ⑶⑷).
 *
 * 브리프: docs/planning/tracks/briefs/daily-auto-test-backend.md §2 ③
 * SSOT: docs/planning/22-daily-auto-test.md · 계약: src/contracts/dailyAutoTest.contract.ts
 *
 * ## 무엇을 **다시 짜지 않았나**
 *
 * 대상 고르기·범위(D-63)·묶기·문항 수는 **화면이 쓰는 것과 같은 함수**다
 * (`planDailyReview` → `countEligibleProblems` → `generateDraftTest`). 여기서 새로 짜면
 * 「화면에서는 되는데 새벽에는 다른 시험지가 나오는」 상태가 된다 — 그때 어느 쪽이
 * 맞는지 아무도 못 가린다.
 *
 * ## 🔴 초안까지만 (D-129 ⑶)
 *
 * 확정(`confirm`)·인쇄(`print`)는 **부르지 않는다.** 잘못 나간 시험지가 그대로 학생에게
 * 가지 않게 사람 손을 한 번 거친다. 학생에게 무엇을 보내는 길도 여기 없다.
 *
 * ## 조용히 빠지는 학생을 안 만든다
 *
 * 건너뛴 학생은 **까닭과 함께** 회차 기록(`AutoDraftRun.skips`)에 남는다. 합계만 남기면
 * 「왜 이 학생은 시험지가 없나」를 나중에 셀 수 없다.
 */
import type {
  AutoDraftSkip,
  AutoDraftSummary,
} from "@/contracts/dailyAutoTest.contract";
import { db } from "@/lib/db";
import {
  planDailyReview,
  type DailyPlanRow,
} from "@/lib/daily/planDailyReview";
import { countEligibleProblems } from "@/lib/findEligibleProblems";
import type { SessionUser } from "@/lib/session";
import { generateDraftTest } from "@/lib/tests/generateDraftTest";

const isoDay = (value: Date): string => value.toISOString().slice(0, 10);

export async function runAutoDraft(args: {
  /** 기준일 YYYY-MM-DD (KST — 부르는 쪽이 정한다). */
  day: string;
  /** 시험지 소유자 — `resolveAutoDraftOwner` 가 정한 원장 계정. */
  owner: SessionUser;
}): Promise<AutoDraftSummary> {
  const { day, owner } = args;

  // 소유자의 반만 돈다 — 출제(`requireOwnedClass`)가 어차피 막지만, 남의 반을 **읽지도**
  // 않는 쪽이 맞다(2026-09-07 에 새 계정이 남의 학원 상태를 그대로 본 전례).
  const ownClasses = await db.class.findMany({
    where: { userId: owner.id },
    select: { id: true },
  });
  const ownClassIds = ownClasses.map((c) => c.id);

  const planRows = ownClassIds.length
    ? await db.progressPlan.findMany({
        where: { classId: { in: ownClassIds } },
        select: {
          classId: true,
          studentId: true,
          weekdays: true,
          unitsPerLesson: true,
          startUnitId: true,
          startDate: true,
          active: true,
        },
      })
    : [];

  // 계획이 있는 **반**의 학생만 본다. 계획이 하나도 없으면 여기서 0건으로 끝난다 —
  // 그리고 그 0 은 회차 기록에 남아 「안 돈 것」과 구별된다.
  const planClassIds = [...new Set(planRows.map((p) => p.classId))];
  const students = planClassIds.length
    ? await db.student.findMany({
        where: { classId: { in: planClassIds }, eywaWithdrawnAt: null },
        select: {
          id: true,
          name: true,
          classId: true,
          schoolLevel: true,
          schoolGrade: true,
          useIndividualProgress: true,
          eywaLastReportDate: true,
          eywaLastReportText: true,
          class: {
            select: { name: true, grade: true, defaultProblemCount: true },
          },
        },
      })
    : [];

  if (students.length === 0)
    return await record({ day, targets: 0, created: 0, skips: [] });

  const studentIds = students.map((s) => s.id);
  const testDate = new Date(`${day}T00:00:00.000Z`);

  // 반 진도(studentId=null)와 개별 진도를 **둘 다** 읽는다 — 어느 것이 적용되는지는
  // 제품 함수(`applicableProgress`)가 정한다. 여기서 미리 고르면 규칙이 두 벌이 된다.
  const [ownRows, classRows, units, reviews, todayTests] = await Promise.all([
    db.progress.findMany({
      where: { studentId: { in: studentIds } },
      select: {
        classId: true,
        studentId: true,
        unitId: true,
        recordedAt: true,
        createdAt: true,
      },
    }),
    db.progress.findMany({
      where: { classId: { in: planClassIds }, studentId: null },
      select: {
        classId: true,
        studentId: true,
        unitId: true,
        recordedAt: true,
        createdAt: true,
      },
    }),
    db.unit.findMany({
      select: {
        id: true,
        grade: true,
        chapter: true,
        section: true,
        orderIndex: true,
      },
    }),
    // 직전 확인테스트 — **실제로 낸 것만**(confirmed·printed, default-range 와 같은 규칙).
    db.test.findMany({
      where: {
        studentId: { in: studentIds },
        testType: "review",
        status: { in: ["confirmed", "printed"] },
      },
      orderBy: [{ testDate: "desc" }, { createdAt: "desc" }],
      select: { studentId: true, rangeEndUnitId: true },
    }),
    // 🔴 중복 금지 — 오늘 그 학생 확인테스트가 있으면(초안 포함) 만들지 않는다.
    db.test.findMany({
      where: { studentId: { in: studentIds }, testType: "review", testDate },
      select: { studentId: true },
    }),
  ]);

  const lastReviewByStudent = new Map<string, string | null>();
  for (const r of reviews)
    if (r.studentId && !lastReviewByStudent.has(r.studentId))
      lastReviewByStudent.set(r.studentId, r.rangeEndUnitId);
  const alreadyToday = new Set(
    todayTests
      .map((t) => t.studentId)
      .filter((id): id is string => id !== null),
  );

  const plan = planDailyReview({
    day,
    students: students.map((s) => ({
      id: s.id,
      name: s.name,
      classId: s.classId,
      className: s.class.name,
      classGrade: s.class.grade,
      defaultProblemCount: s.class.defaultProblemCount,
      schoolLevel: s.schoolLevel,
      schoolGrade: s.schoolGrade,
      useIndividualProgress: s.useIndividualProgress,
      lastReportDate: s.eywaLastReportDate
        ? isoDay(s.eywaLastReportDate)
        : null,
      lastReportText: s.eywaLastReportText,
    })),
    progressRows: [...ownRows, ...classRows].map((r) => ({
      classId: r.classId,
      studentId: r.studentId,
      unitId: r.unitId,
      recordedAt: isoDay(r.recordedAt),
      createdAt: r.createdAt.toISOString(),
    })),
    lastReviews: [...lastReviewByStudent].map(
      ([studentId, rangeEndUnitId]) => ({
        studentId,
        rangeEndUnitId,
      }),
    ),
    units,
    plans: planRows.map((p): DailyPlanRow => ({
      classId: p.classId,
      studentId: p.studentId,
      weekdays: p.weekdays,
      unitsPerLesson: p.unitsPerLesson,
      startUnitId: p.startUnitId,
      startDate: isoDay(p.startDate),
      active: p.active,
    })),
  });

  const skips: AutoDraftSkip[] = [
    // D-64 — 시험기간·미분류는 자동에서 빼고 표시만. 계획이 수업일이라 해도 그렇다.
    ...plan.examOrUnread.map((s): AutoDraftSkip => ({
      studentId: s.id,
      reason: "exam-or-unread",
    })),
    ...plan.noRange.map((s): AutoDraftSkip => ({
      studentId: s.id,
      reason: "no-range",
    })),
  ];
  let created = 0;

  for (const group of plan.groups) {
    // 출제 자격 문항 수 — 출제 조회와 **같은 where**(D-22·D-31 포함). 갈리면 화면의
    // 「부족 아님」이 출제에서 422 로 죽는다.
    const poolTotal = await countEligibleProblems({ unitIds: group.unitIds });
    const enough = poolTotal >= group.neededCount;

    for (const st of group.students) {
      if (alreadyToday.has(st.id)) {
        skips.push({ studentId: st.id, reason: "already" });
        continue;
      }
      if (!enough) {
        // 🔴 만들지 말고 **기록만** 남긴다 — 화면이 「직접 출제」로 안내한다(D-64 와 같은 결).
        skips.push({ studentId: st.id, reason: "lacking" });
        continue;
      }
      const response = await generateDraftTest(owner, {
        classId: st.classId,
        studentId: st.id,
        testType: "review",
        testDate: day,
        rangeStartUnitId: group.rangeStartUnitId,
        rangeEndUnitId: group.rangeEndUnitId,
      }).catch(() => null);

      if (response?.status === 201) {
        created += 1;
        // 한 회차 안에서도 두 번 만들지 않는다 — 같은 학생이 두 묶음에 들 일은 없지만,
        // 「이미 만들었나」의 답은 한 곳에서 나와야 한다.
        alreadyToday.add(st.id);
      } else {
        // 422(문항류 부족)·500 — 조용히 삼키지 않는다.
        skips.push({ studentId: st.id, reason: "failed" });
      }
    }
  }

  return await record({ day, targets: plan.attended, created, skips });
}

async function record(summary: {
  day: string;
  targets: number;
  created: number;
  skips: AutoDraftSkip[];
}): Promise<AutoDraftSummary> {
  const row = {
    day: summary.day,
    targets: summary.targets,
    created: summary.created,
    skipped: summary.skips.length,
    skips: summary.skips,
  };
  await db.autoDraftRun.create({
    data: {
      day: new Date(`${summary.day}T00:00:00.000Z`),
      targets: row.targets,
      created: row.created,
      skipped: row.skipped,
      skips: row.skips,
    },
  });
  return row;
}
