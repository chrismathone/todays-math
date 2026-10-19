import {
  accessibleClassesWhere,
  loadOperationalRoster,
} from "@/lib/classAccess";
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
 *
 * ## 🔴 회차 행이 **먼저** 선다 (D-133 ⑴)
 *
 * 시험지가 «어느 아침이 만들었나»를 알려면(`test.auto_draft_run_id` — 메인 «자동 출제» 표지) 초안을 세울 때
 * 회차 id 가 있어야 한다. 그래서 회차 행을 합계 0 으로 **먼저** 만들고, 그 id 로 초안을 세운 뒤, 끝에서 합계
 * (`targets` · `created` · `skipped` · `skips`)를 **고쳐 쓴다.** 대상이 0 인 날도 지금처럼 한 줄이 남는다.
 * 끝난 회차는 늘 `created + skipped = targets` 다(대상은 시험기간·범위 없음·묶음 중 한 곳에만 들고, 묶음 학생은
 * 만들거나 건너뛴다).
 *
 * **중간에 던지면**(읽기·풀 세기·합계 쓰기 — 초안 하나의 실패는 «failed» 로 삼킨다) cron 은 지금처럼 500 이고:
 *   · 이은 시험지가 **없으면** 회차 행을 지운다 — 합계 0 인 줄이 남으면 «그날 대상이 없었다»로 읽힌다.
 *   · 이은 시험지가 **있으면** 행을 남기고 거기까지의 합계를 적는다 — 지우면 SET NULL 로 표지가 사라진다.
 *     그 행은 `created + skipped < targets` 라 끝난 회차와 갈린다.
 * 정리마저 실패하면(DB 가 아예 끊긴 경우) 행이 합계 0 으로 남을 수 있다 — 보고서 plan-screen-followup ⑤-B.
 */
import { GENERAL_TESTS } from "@/lib/tests/generalTests";
import type {
  AutoDraftSkip,
  AutoDraftSummary,
} from "@/contracts/dailyAutoTest.contract";
import { db } from "@/lib/db";
import {
  planDailyReview,
  type DailyPlanRow,
} from "@/lib/daily/planDailyReview";
import { loadLastTeachableUnitId } from "@/lib/daily/teachableBoundary";
import type { SessionUser } from "@/lib/session";
import { draftCapacityOf, loadCapacityRows } from "@/lib/tests/draftCapacity";
import { generateDraftTest } from "@/lib/tests/generateDraftTest";
import { loadRecentProblemIds } from "@/lib/tests/recentProblemIds";
import { autoDraftBindingAllowed } from "./autoDraftScope";

const isoDay = (value: Date): string => value.toISOString().slice(0, 10);
const dayDate = (day: string): Date => new Date(`${day}T00:00:00.000Z`);

/** 한 회차가 지금까지 한 일 — 끝에서(또는 끊긴 자리에서) 회차 행에 그대로 적는다. */
interface Tally {
  targets: number;
  created: number;
  skips: AutoDraftSkip[];
}

export async function runAutoDraft(args: {
  /** 기준일 YYYY-MM-DD (KST — 부르는 쪽이 정한다). */
  day: string;
  /** 시험지 소유자 — `resolveAutoDraftOwner` 가 정한 원장 계정. */
  owner: SessionUser;
}): Promise<AutoDraftSummary> {
  const { day } = args;
  // 🔴 회차 행을 **먼저** — 합계 0. 이 id 가 초안마다 실린다(D-133 ⑴).
  const run = await db.autoDraftRun.create({
    data: { day: dayDate(day), targets: 0, created: 0, skipped: 0, skips: [] },
  });
  const tally: Tally = { targets: 0, created: 0, skips: [] };
  try {
    await draftAll({ ...args, runId: run.id, tally });
    return await settle(run.id, day, tally);
  } catch (error) {
    await settleInterrupted(run.id, tally).catch((cleanup: unknown) => {
      console.error("[runAutoDraft] 끊긴 회차를 정리하지 못했다", cleanup);
    });
    throw error;
  }
}

/** 대상을 고르고 초안을 세운다 — 한 일은 `tally` 에 쌓는다(던져도 거기까지는 남는다). */
async function draftAll(args: {
  day: string;
  owner: SessionUser;
  runId: string;
  tally: Tally;
}): Promise<void> {
  const { day, owner, runId, tally } = args;

  // 소유자의 **소유 범위** 안의 반만 돈다 — 출제(`requireOwnedClass`)가 어차피 막지만, 범위 밖 반을
  // **읽지도** 않는 쪽이 맞다(2026-09-07 에 새 계정이 남의 학원 상태를 그대로 본 전례).
  // 소유자가 관리자면 전 반을 돈다(D-130 ⑸) — 시험지는 각 반 소유자의 것으로 선다(generateDraftTest).
  const ownClasses = await db.class.findMany({
    where: await accessibleClassesWhere(owner),
    select: {
      id: true,
      eywaClassId: true,
      eywaBindingId: true,
      active: true,
      closedAt: true,
    },
  });
  const ownClassIds: string[] = [];
  for (const cls of ownClasses)
    if (await autoDraftBindingAllowed(cls)) ownClassIds.push(cls.id);

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
  const students = await loadOperationalRoster(planClassIds);

  // 계획이 있는 학생이 없으면 합계 0 으로 끝난다 — 회차 행은 이미 서 있다(«안 돈 것»과 구별).
  if (students.length === 0) return;

  const studentIds = students.map((s) => s.id);
  const testDate = dayDate(day);

  // 반 진도(studentId=null)와 개별 진도를 **둘 다** 읽는다 — 어느 것이 적용되는지는
  // 제품 함수(`applicableProgress`)가 정한다. 여기서 미리 고르면 규칙이 두 벌이 된다.
  const [ownRows, classRows, units, reviews, todayTests] = await Promise.all([
    db.progress.findMany({
      where: {
        retiredAt: null,
        classId: { in: planClassIds },
        studentId: { in: studentIds },
      },
      select: {
        classId: true,
        studentId: true,
        unitId: true,
        recordedAt: true,
        createdAt: true,
      },
    }),
    db.progress.findMany({
      where: {
        retiredAt: null,
        classId: { in: planClassIds },
        studentId: null,
      },
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
        classId: { in: planClassIds },
        predictionRunId: null,
        ...GENERAL_TESTS,
        studentId: { in: studentIds },
        testType: "review",
        status: { in: ["confirmed", "printed"] },
      },
      orderBy: [{ testDate: "desc" }, { createdAt: "desc" }],
      select: { classId: true, studentId: true, rangeEndUnitId: true },
    }),
    // 🔴 중복 금지 — 오늘 그 학생 확인테스트가 있으면(초안 포함) 만들지 않는다.
    db.test.findMany({
      where: {
        classId: { in: planClassIds },
        predictionRunId: null,
        ...GENERAL_TESTS,
        studentId: { in: studentIds },
        testType: "review",
        testDate,
      },
      select: { classId: true, studentId: true },
    }),
  ]);

  // 🔴 계획이 **출제할 문항이 있는 마지막 차시**를 넘지 않게 한다(2026-09-18 시뮬레이션 ⑵) —
  //    없으면 중3 반이 고등(문항 0건)으로 걸어 들어가 영구히 「문항 부족」이 된다.
  const lastTeachableUnitId = await loadLastTeachableUnitId(units);

  const lastReviewByStudent = new Map<string, string | null>();
  for (const r of reviews)
    if (r.studentId && !lastReviewByStudent.has(`${r.classId}/${r.studentId}`))
      lastReviewByStudent.set(`${r.classId}/${r.studentId}`, r.rangeEndUnitId);
  const alreadyToday = new Set(
    todayTests
      .map((t) => (t.studentId ? `${t.classId}/${t.studentId}` : null))
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
    lastReviews: [...lastReviewByStudent].map(([key, rangeEndUnitId]) => ({
      classId: key.split("/")[0],
      studentId: key.split("/")[1],
      rangeEndUnitId,
    })),
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
    lastTeachableUnitId,
  });

  tally.targets = plan.attended;
  tally.skips.push(
    // D-64 — 시험기간·미분류는 자동에서 빼고 표시만. 계획이 수업일이라 해도 그렇다.
    ...plan.examOrUnread.map((s): AutoDraftSkip => ({
      studentId: s.id,
      reason: "exam-or-unread",
    })),
    ...plan.noRange.map((s): AutoDraftSkip => ({
      studentId: s.id,
      reason: "no-range",
    })),
  );

  const classOfStudent = new Map(
    students.map((s) => [`${s.classId}/${s.id}`, s.class]),
  );

  for (const group of plan.groups) {
    // 출제 자격 후보 — 출제 조회와 **같은 where**(D-22·D-31 포함). 묶음마다 한 번 읽는다.
    const capacityRows = await loadCapacityRows(group.unitIds);

    for (const st of group.students) {
      if (alreadyToday.has(`${st.classId}/${st.id}`)) {
        tally.skips.push({ studentId: st.id, reason: "already" });
        continue;
      }
      // 🔴 부족은 **행이 아니라 갈래**로, 그리고 **그때까지의 최근 출제를 빼고** 가른다
      //    (2026-09-18 시뮬레이션 ⑴). 예전의 행 수 문지기는 「부족 아님」이라 해 놓고 출제가
      //    422 를 내 `failed` 로만 남았다. 최근 출제는 출제와 같은 함수·같은 열쇠(반 소유자)로
      //    학생마다 다시 읽는다 — 같은 회차에서 앞 학생이 쓴 문항이 이미 DB 에 있다.
      const cls = classOfStudent.get(`${st.classId}/${st.id}`)!;
      const recent = await loadRecentProblemIds(cls.userId, day);
      if (draftCapacityOf(capacityRows, recent) < cls.defaultProblemCount) {
        // 만들지 말고 **기록만** 남긴다 — 화면이 「직접 출제」로 안내한다(D-64 와 같은 결).
        tally.skips.push({ studentId: st.id, reason: "lacking" });
        continue;
      }
      const response = await generateDraftTest(
        owner,
        {
          classId: st.classId,
          studentId: st.id,
          testType: "review",
          testDate: day,
          rangeStartUnitId: group.rangeStartUnitId,
          rangeEndUnitId: group.rangeEndUnitId,
        },
        // 🔴 이 회차가 세운 시험지라는 표시 — 서버 안 인자로만(요청 계약에는 칸이 없다)
        { autoDraftRunId: runId },
      ).catch(() => null);

      if (response?.status === 201) {
        tally.created += 1;
        // 한 회차 안에서도 두 번 만들지 않는다 — 같은 학생이 두 묶음에 들 일은 없지만,
        // 「이미 만들었나」의 답은 한 곳에서 나와야 한다.
        alreadyToday.add(`${st.classId}/${st.id}`);
      } else {
        // 422(문항류 부족)·500 — 조용히 삼키지 않는다.
        tally.skips.push({ studentId: st.id, reason: "failed" });
      }
    }
  }
}

/** 회차 행에 적을 합계 — `skipped` 는 늘 까닭 목록의 길이다(DB CHECK `auto_draft_run_skips_match`). */
const totalsOf = (tally: Tally) => ({
  targets: tally.targets,
  created: tally.created,
  skipped: tally.skips.length,
  skips: tally.skips,
});

/** 끝 — 먼저 세운 회차 행의 합계를 고쳐 쓴다. */
async function settle(
  runId: string,
  day: string,
  tally: Tally,
): Promise<AutoDraftSummary> {
  const totals = totalsOf(tally);
  await db.autoDraftRun.update({ where: { id: runId }, data: totals });
  return { day, ...totals };
}

/**
 * 끊긴 회차 — 이은 시험지가 없으면 행을 지우고(«대상 0» 으로 읽히지 않게), 있으면 거기까지의 합계를 적는다
 * (지우면 SET NULL 로 «자동 출제» 표지가 사라진다). 이은 수는 `tally.created` 가 아니라 **시험지 칸**으로 센다 —
 * 시험지는 섰는데 응답을 못 받은 초안(«failed»)도 칸은 이어져 있다.
 */
async function settleInterrupted(runId: string, tally: Tally): Promise<void> {
  const linked = await db.test.count({ where: { autoDraftRunId: runId } });
  if (linked === 0) {
    await db.autoDraftRun.delete({ where: { id: runId } });
    return;
  }
  await db.autoDraftRun.update({ where: { id: runId }, data: totalsOf(tally) });
}
