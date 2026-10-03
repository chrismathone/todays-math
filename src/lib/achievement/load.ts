/**
 * 성취 팩터의 **DB 조회 한 묶음** — 순수 함수(`collect.ts`)에 먹일 행을 모은다 (D-134 트랙 2).
 *
 * 🔴 **읽기만 한다.** 이 트랙은 공유 DB 에 아무것도 쓰지 않고 마이그레이션도 없다(브리프 §1.2).
 *
 * ## 판정을 여기서 다시 적지 않는다
 *
 *   · 반/개별 진도 — `applicableProgress`(`progressResolver.ts`) 한 곳
 *   · 어느 계획을 쓰나 — `pickProgressPlan`(`daily/progressPlan.ts`) 한 곳
 *   · 기간 경계 — `period.ts` 한 곳
 *   · 만점 세기 — `maxScore.ts` 한 곳(채점기와 대조하는 시험이 붙어 있다)
 *   · 결시를 읽는 법 · 채점 조회의 select — `resultSelect.ts` 한 곳(덫 시험이 붙어 있다)
 *
 * 이 파일이 **스스로 정하는 것**은 «기간 끝에서 무엇을 자르나»뿐이다 — 강의 대상(아래 `loadLectures`).
 */
import "server-only";

import type { Difficulty } from "@/contracts/difficulty";
import { db } from "@/lib/db";
import { studentsInClassWhere } from "@/lib/classAccess";
import {
  pickProgressPlan,
  type ProgressPlanRule,
} from "@/lib/daily/progressPlan";
import { applicableProgress } from "@/lib/progressResolver";
import { metadataOf } from "@/lib/tests/testProblemContent";

import {
  type AchievementInput,
  type AchievementUnitRow,
  type ComparisonRequest,
  type ProgressRow,
  type ResultRow,
} from "./collect";
import { testMaxScore } from "./maxScore";
import { type Period, periodEndExclusive, previousMonth } from "./period";
import { RESULT_SELECT } from "./resultSelect";

/** 어떤 비교군을 붙이나 — 기본은 «미사용». */
export type CompareMode = "none" | "previous" | "class";

const dateOf = (value: Date): string => value.toISOString().slice(0, 10);

/** 이 학생에게 **적용되는** 진도 이력(반/개별 이중 구조). */
async function loadProgress(
  classId: string,
  studentId: string,
  useIndividualProgress: boolean,
  until: string,
): Promise<ProgressRow[]> {
  // 기간 뒤엣 행은 셈에 안 들어가므로 아예 안 읽는다. 앞엣 행은 **다 읽는다** —
  // 「개별 진도 이력이 한 건이라도 있나」가 반/개별 판정의 입력이기 때문이다.
  const rows = await db.progress.findMany({
    where: {
      retiredAt: null,
      classId,
      recordedAt: { lte: new Date(`${until}T00:00:00.000Z`) },
      OR: [{ studentId: null }, { studentId }],
    },
    select: {
      id: true,
      classId: true,
      studentId: true,
      unitId: true,
      recordedAt: true,
      createdAt: true,
    },
  });

  const shaped = rows.map((r) => ({
    id: r.id,
    classId: r.classId,
    studentId: r.studentId,
    unitId: r.unitId,
    recordedAt: dateOf(r.recordedAt),
    createdAt: r.createdAt.toISOString(),
  }));

  return applicableProgress({
    classProgress: shaped.filter((r) => r.studentId === null),
    studentProgress: shaped.filter((r) => r.studentId === studentId),
    useIndividualProgress,
  }).map((r) => ({ unitId: r.unitId, recordedAt: r.recordedAt }));
}

/** 이 학생의 채점 회차 — 문항 단위 기록과 «복습 추천»까지 한 묶음으로. */
async function loadResults(
  studentId: string,
  period: Period,
  classId: string,
): Promise<ResultRow[]> {
  const rows = await db.testResult.findMany({
    where: {
      studentId,
      test: {
        classId,
        predictionRunId: null,
        testDate: {
          gte: new Date(`${period.from}T00:00:00.000Z`),
          lte: new Date(`${period.to}T00:00:00.000Z`),
        },
      },
    },
    // 🔴 **결시는 select 에 적어야 온다** — 상수에 `absent` 가 있고, 빠지면 덫 시험이 빨개진다.
    select: RESULT_SELECT,
  });
  if (rows.length === 0) return [];

  // 만점은 저장돼 있지 않다 — 시험지의 문항 배점에서 다시 센다(`maxScore.ts`).
  const testIds = [...new Set(rows.map((r) => r.testId))];
  const testProblems = await db.testProblem.findMany({
    where: { testId: { in: testIds } },
    select: {
      testId: true,
      problemId: true,
      snapshotId: true,
      snapshot: true,
      score: true,
      problem: { select: { score: true, unitId: true, difficulty: true } },
    },
  });
  const pointsByTest = new Map<
    string,
    { adjustedScore: number | null; score: number | null }[]
  >();
  const frozenMetadata = new Map<string, ReturnType<typeof metadataOf>>();
  for (const tp of testProblems) {
    const frozen = tp.snapshotId ? metadataOf(tp) : null;
    if (frozen) frozenMetadata.set(`${tp.testId}:${tp.problemId}`, frozen);
    const list = pointsByTest.get(tp.testId) ?? [];
    list.push({
      adjustedScore: tp.score,
      score: frozen ? frozen.score : tp.problem.score,
    });
    pointsByTest.set(tp.testId, list);
  }

  return rows.map((r) => {
    return {
      testId: r.testId,
      testDate: dateOf(r.test.testDate),
      takenAt: r.takenAt.toISOString(),
      /**
       * 🔴 **`Float?` 그대로** — 결시면 트랙 1 이 NULL 로 쓴다. `?? 0` 을 적으면 결시가 0점짜리
       *    응시자가 된다(트랙 1 보고서 ⑤-D). «잰 것»인지는 `rollupScores` 한 곳이 가른다.
       */
      score: r.score,
      maxScore: testMaxScore(pointsByTest.get(r.testId) ?? []),
      absent: r.absent,
      items: r.answers.map((a) => {
        const frozen = frozenMetadata.get(`${r.testId}:${a.problemId}`);
        return {
          unitId: frozen ? frozen.unitId : a.problem.unitId,
          difficulty: frozen
            ? frozen.difficulty
            : (a.problem.difficulty as Difficulty),
          isCorrect: a.isCorrect,
          ...(frozen?.unitLabel
            ? {
                frozenUnitLabel: {
                  unitId: frozen.unitId,
                  grade: frozen.unitLabel.grade ?? "",
                  chapter: frozen.unitLabel.chapter ?? "",
                  section: frozen.unitLabel.section ?? "",
                },
              }
            : {}),
        };
      }),
      // 🔴 리포트가 없으면 `null` — 빈 배열이 아니다.
      recommendedUnitIds: r.analysisReport?.recommendedUnits ?? null,
    };
  });
}

/** 이 학생에게 적용되는 진도 계획(D-129 ⑴). */
async function loadPlan(
  classId: string,
  studentId: string,
  useIndividualProgress: boolean,
): Promise<ProgressPlanRule | null> {
  const plans = await db.progressPlan.findMany({
    where: { classId, OR: [{ studentId: null }, { studentId }] },
    select: {
      studentId: true,
      weekdays: true,
      unitsPerLesson: true,
      startUnitId: true,
      startDate: true,
      active: true,
    },
  });
  const ruleOf = (p: (typeof plans)[number]): ProgressPlanRule => ({
    weekdays: p.weekdays,
    unitsPerLesson: p.unitsPerLesson,
    startUnitId: p.startUnitId,
    startDate: dateOf(p.startDate),
    active: p.active,
  });
  const classPlan = plans.find((p) => p.studentId === null) ?? null;
  const studentPlan = plans.find((p) => p.studentId === studentId) ?? null;
  const picked = pickProgressPlan({
    classPlan,
    studentPlan,
    useIndividualProgress,
  });
  return picked === null ? null : ruleOf(picked);
}

/**
 * 이 기간에 나간 차시에 붙은 개념 강의 중 **기간 끝 전에 게시된 것**과 그 학생의 시청 기록.
 *
 * 🔴 **대상을 «지금» 게시 상태로 고르지 않는다**(Hi-fi 브리프 §1 #8). 그러면 9월에 게시한 강의가
 *    8월 리포트의 분모에 들어가 과거 달이 **뒤의 일로 바뀐다.** 대상 = 게시 시각
 *    `publishedAt < 기간 끝 다음날 00:00 KST`.
 *
 * ⚠️ **남는 구멍 둘 — 이력이 없어서 못 막는다**(보고서 잔여 · 트랙 3 «발행한 리포트를 스냅숏으로»가 막는다):
 *    ⑴ **보관 이력이 없다.** 지금 보관(`archived`)된 강의는 과거 달에서도 빠진다 — 보관 **전** 달에는
 *       대상이었어도. 반대로 넣으면 오래전에 내린 강의를 «안 봤다»로 세게 된다(학생 탓이 되는 쪽이 더 나쁘다).
 *    ⑵ `publishedAt` 은 **마지막** 게시 시각이다(`lectureTransition.ts`) — 내렸다 다시 올리면 앞으로 밀려
 *       그 사이 달에서 빠진다.
 * 셈(완료 시각 < 기간 끝)은 순수 함수(`collect.ts`)가 한다 — 여기서는 시청 기록을 자르지 않고 넘긴다.
 */
async function loadLectures(
  studentId: string,
  coveredUnitIds: string[],
  period: Period,
): Promise<AchievementInput["lectures"]> {
  if (coveredUnitIds.length === 0) return { targets: [], views: [] };
  const lectures = await db.conceptLecture.findMany({
    where: {
      unitId: { in: coveredUnitIds },
      status: "published",
      publishedAt: { lt: periodEndExclusive(period) },
    },
    select: { id: true },
  });
  if (lectures.length === 0) return { targets: [], views: [] };

  const lectureIds = lectures.map((l) => l.id);
  const views = await db.conceptLectureView.findMany({
    where: { studentId, lectureId: { in: lectureIds } },
    select: { lectureId: true, percent: true, completedAt: true },
  });
  return {
    targets: lectureIds.map((lectureId) => ({ lectureId })),
    views: views.map((v) => ({
      lectureId: v.lectureId,
      percent: v.percent,
      completedAt: v.completedAt?.toISOString() ?? null,
    })),
  };
}

async function loadComparison(
  mode: CompareMode,
  student: { id: string; classId: string; useIndividualProgress: boolean },
  period: Period,
): Promise<ComparisonRequest> {
  if (mode === "none") return { kind: "미사용" };

  if (mode === "previous") {
    // 🔴 **달력의 지난달** — 같은 일수만큼 거슬러 가지 않는다(Hi-fi 브리프 §1 #7).
    const prev = previousMonth(period);
    return {
      kind: "지난달",
      progress: await loadProgress(
        student.classId,
        student.id,
        student.useIndividualProgress,
        prev.to,
      ),
      results: await loadResults(student.id, prev, student.classId),
    };
  }

  // 🔴 반 평균 — **표본 수를 같이 내려면 반 전원을 세야 한다**(성적이 있는 사람만 세면 분모가 거짓말이다).
  const classmates = await db.student.findMany({
    where: studentsInClassWhere(student.classId),
    select: { id: true, useIndividualProgress: true },
    orderBy: { name: "asc" },
  });
  const students = [];
  for (const mate of classmates) {
    students.push({
      id: mate.id,
      progress: await loadProgress(
        student.classId,
        mate.id,
        mate.useIndividualProgress,
        period.to,
      ),
      results: await loadResults(mate.id, period, student.classId),
    });
  }
  return { kind: "반평균", students };
}

/**
 * 한 학생 × 한 기간의 팩터 입력을 모은다. 학생이 없으면 `null`
 * (소유 판정은 부르는 쪽이 `requireOwnedStudent` 로 이미 끝냈다 — D-130).
 */
export async function loadAchievementInput(args: {
  studentId: string;
  classId?: string;
  period: Period;
  compare?: CompareMode;
}): Promise<AchievementInput | null> {
  const { studentId, period, compare = "none" } = args;

  // 소속 반은 **조인 한 번으로** 같이 온다 — 이름·학년이 리포트 머리에 들어간다.
  const original = await db.student.findUnique({
    where: { id: studentId },
    include: { class: true },
  });
  if (!original?.class) return null;
  const cls =
    args.classId && args.classId !== original.classId
      ? await db.class.findUnique({ where: { id: args.classId } })
      : original.class;
  if (!cls) return null;
  const student = { ...original, classId: cls.id, class: cls };

  const progress = await loadProgress(
    student.classId,
    student.id,
    student.useIndividualProgress,
    period.to,
  );
  const results = await loadResults(student.id, period, student.classId);
  const plan = await loadPlan(
    student.classId,
    student.id,
    student.useIndividualProgress,
  );

  const coveredUnitIds = [
    ...new Set(
      progress
        .filter((r) => r.recordedAt >= period.from && r.recordedAt <= period.to)
        .map((r) => r.unitId),
    ),
  ];

  /**
   * 이름을 붙일 차시만 `in` 으로 한 번에 읽는다. **계획이 있을 때만** 교육과정 전량을 읽는다 —
   * 밀림을 재려면 차례를 끝까지 걸어야 하기 때문이다(`resolveDailyPlan`). 계획이 없으면
   * 735행을 읽을 이유가 없다.
   */
  const namedIds = [
    ...new Set([
      ...coveredUnitIds,
      ...results.flatMap((r) => [
        ...r.items.map((i) => i.unitId),
        ...(r.recommendedUnitIds ?? []),
      ]),
    ]),
  ];
  const unitRows = await db.unit.findMany({
    where: plan === null ? { id: { in: namedIds } } : {},
    select: {
      id: true,
      grade: true,
      chapter: true,
      section: true,
      orderIndex: true,
    },
  });
  const units: AchievementUnitRow[] = unitRows.map((u) => ({
    unitId: u.id,
    grade: u.grade,
    chapter: u.chapter,
    section: u.section,
    orderIndex: u.orderIndex,
  }));

  return {
    student: {
      id: student.id,
      name: student.name,
      className: student.class.name,
      classGrade: student.class.grade,
    },
    period,
    progress,
    units,
    plan,
    results,
    lectures: await loadLectures(student.id, coveredUnitIds, period),
    // 🔴 숙제 표는 아직 없다(트랙 4) — `null` 은 «기록 없음»이다. 빈 배열로 넘기지 않는다.
    homework: null,
    comparison: await loadComparison(compare, student, period),
  };
}
