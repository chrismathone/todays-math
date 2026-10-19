import {
  accessibleClassesWhere,
  loadOperationalRoster,
} from "@/lib/classAccess";
/**
 * GET /api/tests/daily-review — 오늘의 학생별 확인테스트 (2단계 화면, D-63·D-64 · D-129 ⑷).
 *
 * 대응 계약: src/contracts/test.contract.ts (dailyReviewResponseSchema)
 * 계획 자체는 순수 함수 `planDailyReview` 한 곳에 있다 — 여기서는 조회와 풀 세기만.
 *
 * 무엇을 주나: 오늘(KST) **수업하는 학생**을 「자동 / 문항 부족 / 시험기간·미분류 / 범위
 * 못 냄」으로 갈라 준다. 문항 수는 출제 조회와 **같은 where**(`eligibleProblemsWhere`)로
 * 센다 — 갈리면 화면의 「부족 아님」이 출제에서 422 로 죽는다.
 *
 * ## 「오늘 수업하는 학생」의 출처가 **둘**이다 (2026-09-16 에 넓혔다 — D-129 ⑷)
 *
 *   ⑴ **진도 계획**(`progress_plan`) 이 그날을 수업일로 적은 학생 — 손으로 등록한 학생과
 *      고등이 이 길로 들어온다(고등은 eywa 차시 체계에 아예 없다). 보고서를 안 기다린다.
 *   ⑵ **eywa 보고서 날짜** — 계획이 아직 없는 반의 기존 축. 그대로 둔다. 계획을 넣기
 *      전까지 이 화면이 비면 원장님의 오늘 일이 그날로 멈춘다.
 *
 * ## 소유권이 갈래마다 다르다 — 섞지 말 것
 *
 * eywa 갈래는 **계정 구분이 없다**(연계 학생·마지막 동기화는 학원 하나의 것). 그래서
 * `isEywaOwner` 가 아니면 그 갈래를 통째로 안 읽는다 — 2026-09-07 에 새 계정이 원장님
 * 학원의 동기화 상태를 그대로 봤다. 계획 갈래는 반대다: **반의 소유 범위로 좁힌다**
 * (`ownerScope.ts` — 관리자는 모든 반, 아니면 `Class.userId` 가 나인 반, D-130). 계획은 누구나
 * 만들 수 있으므로 여기서 안 좁히면 남의 반이 섞인다. eywa 갈래는 관리자라도 그대로다(D-130 ⑸).
 * 출제(POST /api/tests/generate)는 기존 소유권 규칙 그대로다.
 */
import { GENERAL_TESTS } from "@/lib/tests/generalTests";
import type { NextRequest } from "next/server";

import { dailyReviewResponseSchema } from "@/contracts/test.contract";
import { jsonOk, unauthorizedError } from "@/lib/apiResponse";
import {
  CLASS_OWNER_NAME,
  showsClassOwner,
  toClassOwner,
} from "@/lib/class/classOwner";
import {
  planDailyReview,
  type DailyPlanRow,
} from "@/lib/daily/planDailyReview";
import { db } from "@/lib/db";
import { isEywaOwner } from "@/lib/eywa/owner";
import { kstDateOf } from "@/lib/kstDate";
import { getSessionUser } from "@/lib/session";
import { draftCapacityOf, loadCapacityRows } from "@/lib/tests/draftCapacity";
import { loadLastTeachableUnitId } from "@/lib/daily/teachableBoundary";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

const PROGRESS_SELECT = {
  classId: true,
  studentId: true,
  unitId: true,
  recordedAt: true,
  createdAt: true,
} as const;

const isoDay = (value: Date): string => value.toISOString().slice(0, 10);

async function handleGet(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  // ?day=YYYY-MM-DD — 지난 날을 되짚어 볼 때(검증·시연). 기본은 오늘(KST).
  // 「오늘」은 학원 시간이다 — 서버 시계의 UTC 자정이 아니다(`kstDate.ts` 한 곳).
  const dayParam = new URL(request.url).searchParams.get("day");
  const day =
    dayParam && /^\d{4}-\d{2}-\d{2}$/.test(dayParam)
      ? dayParam
      : kstDateOf(new Date());

  const eywaOwner = isEywaOwner(session.email);

  // ── 계획 갈래 — 이 계정의 소유 범위 안의 반만 ─────────────────────────────
  const ownClasses = await db.class.findMany({
    where: await accessibleClassesWhere(session),
    select: { id: true, name: true, grade: true },
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
  const planClassIds = [...new Set(planRows.map((p) => p.classId))];

  const [eywaStudents, planStudents] = await Promise.all([
    eywaOwner ? loadOperationalRoster(ownClassIds) : Promise.resolve([]),
    loadOperationalRoster(planClassIds),
  ]);
  // 두 갈래에 같이 든 학생은 **한 번만** 센다.
  const studentById = new Map(
    [...eywaStudents, ...planStudents].map((s) => [`${s.classId}/${s.id}`, s]),
  );
  const students = [...studentById.values()];
  const studentIds = students.map((s) => s.id);
  const classIds = [...new Set(students.map((s) => s.classId))];

  // 담당(D-132) — 관리자에게만. 학생들의 반을 한 번에 읽는다(반마다 따로 안 읽는다).
  // 관리자가 아니면 조회도 싣기도 없다 — 응답이 넓히기 전과 같다.
  const ownerByClass =
    showsClassOwner(session) && classIds.length
      ? new Map(
          (
            await db.class.findMany({
              where: { id: { in: classIds } },
              select: { id: true, userId: true, ...CLASS_OWNER_NAME },
            })
          ).map((c) => [c.id, toClassOwner(session, c)]),
        )
      : null;

  const [syncRun, ownProgress, classProgress, units, reviews] =
    await Promise.all([
      eywaOwner
        ? db.eywaSyncRun.findFirst({ orderBy: { ranAt: "desc" } })
        : Promise.resolve(null),
      db.progress.findMany({
        where: {
          retiredAt: null,
          classId: { in: ownClassIds },
          studentId: { in: studentIds },
        },
        select: PROGRESS_SELECT,
      }),
      // 반 전체 진도(studentId=null) — 개별 진도를 안 쓰는 학생이 이것을 본다.
      // 어느 쪽이 적용되는지는 제품 함수(`applicableProgress`)가 정한다.
      db.progress.findMany({
        where: { retiredAt: null, classId: { in: classIds }, studentId: null },
        select: PROGRESS_SELECT,
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
      // 직전 확인테스트 — **실제로 낸 것만**(confirmed·printed, default-range 와 같은
      // 규칙). 학생별 최신 한 건이면 된다.
      db.test.findMany({
        where: {
          classId: { in: ownClassIds },
          predictionRunId: null,
          ...GENERAL_TESTS,
          studentId: { in: studentIds },
          testType: "review",
          status: { in: ["confirmed", "printed"] },
        },
        orderBy: [{ testDate: "desc" }, { createdAt: "desc" }],
        select: { classId: true, studentId: true, rangeEndUnitId: true },
      }),
    ]);

  // 오늘 이미 만든 학생별 시험 — 「모두 출제」 재클릭이 중복 초안을 만들지 않게
  // 화면이 이 학생을 건너뛴다. draft 포함(초안도 «이미 출제됨»이다).
  const todayTestRows = await db.test.findMany({
    where: {
      classId: { in: ownClassIds },
      predictionRunId: null,
      ...GENERAL_TESTS,
      studentId: { in: studentIds },
      testType: "review",
      testDate: new Date(`${day}T00:00:00Z`),
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      classId: true,
      studentId: true,
      status: true,
      autoDraftRunId: true,
    },
  });
  const todayTestByStudent = new Map<
    string,
    {
      studentId: string;
      studentName: string;
      testId: string;
      status: "draft" | "confirmed" | "printed";
      autoDraft: boolean;
    }
  >();
  for (const t of todayTestRows)
    if (t.studentId && !todayTestByStudent.has(`${t.classId}/${t.studentId}`))
      todayTestByStudent.set(`${t.classId}/${t.studentId}`, {
        studentId: t.studentId,
        // 조회가 `studentIds`(두 갈래 학생) 안에서만 돌아 이름은 늘 있다
        studentName: studentById.get(`${t.classId}/${t.studentId}`)?.name ?? "",
        testId: t.id,
        status: t.status as "draft" | "confirmed" | "printed",
        // «자동 출제» 표지(D-133 ⑵) — 아침 회차가 세운 시험지만. 근거는 이 칸 하나다.
        autoDraft: t.autoDraftRunId !== null,
      });
  const lastReviewByStudent = new Map<string, string | null>();
  for (const r of reviews)
    if (r.studentId && !lastReviewByStudent.has(`${r.classId}/${r.studentId}`))
      lastReviewByStudent.set(`${r.classId}/${r.studentId}`, r.rangeEndUnitId);

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
      ...(ownerByClass?.has(s.classId)
        ? { classOwner: ownerByClass.get(s.classId)! }
        : {}),
    })),
    progressRows: [...ownProgress, ...classProgress].map((r) => ({
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
    // 🔴 아침 회차와 **같은 경계** — 계획이 출제할 문항이 있는 마지막 차시를 넘지 않는다
    //    (2026-09-18 시뮬레이션 ⑵). 계획이 없으면 경계가 쓸 데가 없어 묻지 않는다.
    lastTeachableUnitId: planRows.length
      ? await loadLastTeachableUnitId(units)
      : null,
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

  // 묶음마다 **낼 수 있는 문항 수**(갈래) — 출제와 같은 where(D-22·D-31 포함). 행으로 세면
  // 「부족 아님」이라 해 놓고 출제가 422 로 죽는다(2026-09-18 시뮬레이션 ⑴).
  const counted = await Promise.all(
    plan.groups.map(async (g) => ({
      key: g.key,
      rangeStartUnitId: g.rangeStartUnitId,
      rangeEndUnitId: g.rangeEndUnitId,
      startedFrom: g.startedFrom,
      unitCount: g.unitIds.length,
      neededCount: g.neededCount,
      capacity: draftCapacityOf(await loadCapacityRows(g.unitIds)),
      students: g.students,
    })),
  );

  return jsonOk(dailyReviewResponseSchema, {
    data: {
      day,
      eywaOwner,
      sync: syncRun
        ? {
            ranAt: syncRun.ranAt.toISOString(),
            students: syncRun.students,
            classes: syncRun.classes,
            progressRows: syncRun.progressRows,
            unresolvedLines: syncRun.unresolvedLines,
            ambiguous: syncRun.ambiguous,
          }
        : null,
      attended: plan.attended,
      auto: counted.filter((g) => g.capacity >= g.neededCount),
      lacking: counted.filter((g) => g.capacity < g.neededCount),
      examOrUnread: plan.examOrUnread,
      noRange: plan.noRange,
      // ── 화면 칸 셋(D-131) ──
      // 섹션 문지기 — 소유 범위 안에 계획이 하나라도 있나(꺼 둔 계획도 계획이다).
      hasPlan: planRows.length > 0,
      delayed: plan.delayed,
      // 오늘 대상이 한 명도 없는 **소유 범위의** 반 — 「오늘 수업 계획이 없습니다.」
      noLessonClasses: ownClasses
        .filter((c) => !plan.attendedClassIds.includes(c.id))
        .map((c) => ({ id: c.id, name: c.name, grade: c.grade }))
        .sort((a, b) => a.name.localeCompare(b.name, "ko")),
      todayTests: [...todayTestByStudent.values()],
    },
  });
}

export const GET = withErrorLog("/api/tests/daily-review", handleGet);
