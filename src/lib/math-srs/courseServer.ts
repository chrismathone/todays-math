import {
  accessibleClassesWhere,
  loadOperationalRoster,
} from "@/lib/classAccess";
import "server-only";
import type {
  CourseRosterStudent,
  CourseStudentDetail,
  CourseStudentState,
} from "@/contracts/mathSrsCourse.contract";
import { db } from "@/lib/db";
import { dailyJourneyDto, visibleExpeditionMission } from "./dailyJourney";
import {
  expeditionCourseRecommendation,
  expeditionCoursePrerequisiteDecision,
} from "@/lib/math-explorers/expedition";
import {
  coursePrerequisiteContext,
  teacherPrerequisiteEvidence,
} from "@/lib/math-prerequisite/display";
import { mathPrerequisiteEnabled } from "@/lib/math-prerequisite/enabled";
import { type ScopeViewer } from "@/lib/ownerScope";
import {
  courseSummary,
  emptyCourseState,
  estimatedCourseRecall,
  findStoredCourseSession,
  publicCourseSession,
} from "./courseAutomation";
import {
  emptySrsState,
  parseSrsState,
  SrsUnavailable,
  type StoredSrsState,
} from "./serverState";
import {
  isMissingSrsStorage,
  readSrsState,
  srsStateTable,
} from "./serverStore";

const studentInclude = {
  class: true,
  // `createdAt` — 탐험 교사 보기의 «시작 전»이 계정을 만든 날부터 센다(27번 문서 §4.2)
  studentAccount: { select: { id: true, disabledAt: true, createdAt: true } },
} as const;
type StudentRow = {
  id: string;
  name: string;
  classId: string;
  class: { id: string; name: string; grade?: string | null };
  studentAccount: { id: string; disabledAt: Date | null } | null;
};
type Saved = { revision: number; state: StoredSrsState };

export async function loadCourseStudent(studentId: string, classId?: string) {
  const student = await db.student.findUnique({
    where: { id: studentId },
    include: studentInclude,
  });
  if (!student || student.eywaWithdrawnAt) return null;
  if (classId && classId !== student.classId) {
    const cls = await db.class.findUnique({ where: { id: classId } });
    return cls ? { ...student, classId: cls.id, class: cls } : null;
  }
  return student;
}

export function courseStudentDto(
  student: StudentRow,
  saved: Saved,
  now: Date,
  requestedSessionId?: string,
): CourseStudentState {
  const course = saved.state.course ?? emptyCourseState();
  const session = requestedSessionId
    ? findStoredCourseSession(course, requestedSessionId)
    : course.learner.session;
  const mission = visibleExpeditionMission(saved.state, now);
  const prerequisiteContext = coursePrerequisiteContext(
    course,
    now,
    expeditionCoursePrerequisiteDecision(saved.state, now),
  );
  return {
    ...(prerequisiteContext &&
    (!requestedSessionId || requestedSessionId === course.learner.session?.id)
      ? { prerequisiteContext }
      : {}),
    journey: dailyJourneyDto(saved.state, "elementary", now),
    student: {
      id: student.id,
      name: student.name,
      classId: student.classId,
      className: student.class.name,
    },
    revision: saved.revision,
    plan: course.plan,
    summary: {
      ...courseSummary(course, now),
      recommendation: expeditionCourseRecommendation(saved.state, now),
      ...(mission?.kind === "elementary"
        ? { todayAnswered: mission.answered, todayGoal: 10 as const }
        : {}),
    },
    session: session ? publicCourseSession(session) : null,
  };
}

export function courseRosterDto(
  student: StudentRow,
  saved: Saved,
  now: Date,
): CourseRosterStudent {
  const course = saved.state.course ?? emptyCourseState();
  return {
    id: student.id,
    name: student.name,
    classId: student.classId,
    className: student.class.name,
    hasAccount: !!student.studentAccount && !student.studentAccount.disabledAt,
    classGrade: student.class.grade ?? null,
    revision: saved.revision,
    plan: course.plan,
    summary: courseSummary(course, now),
  };
}

export function courseDetailDto(
  student: StudentRow,
  saved: Saved,
  now: Date,
): CourseStudentDetail {
  const course = saved.state.course ?? emptyCourseState();
  return {
    student: courseRosterDto(student, saved, now),
    ...(mathPrerequisiteEnabled()
      ? {
          prerequisite: teacherPrerequisiteEvidence(
            course,
            now,
            expeditionCoursePrerequisiteDecision(saved.state, now),
          ),
        }
      : {}),
    sections: Object.values(course.memories)
      .map((m) => ({ ...m, estimatedRecall: estimatedCourseRecall(m, now) }))
      .sort(
        (a, b) =>
          a.estimatedRecall - b.estimatedRecall ||
          a.nextReviewAt.localeCompare(b.nextReviewAt),
      ),
    activity: course.activity,
    recentSessions: [
      ...course.history.map((h) => h.session),
      ...(course.learner.session ? [course.learner.session] : []),
    ]
      .slice(-30)
      .reverse()
      .map((s) => ({
        id: s.id,
        sectionId: s.sectionId,
        mode: s.mode,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        answered: s.attempts.length,
        correct: s.attempts.filter((a) => a.correct).length,
        hinted: s.attempts.filter((a) => a.usedHint).length,
      })),
    recentAttempts: [...course.recentAttempts].reverse(),
  };
}

export async function loadCourseDashboard(
  viewer: ScopeViewer & { menus?: readonly string[]; role?: string },
  now: Date,
  branchId?: string,
) {
  const accessible = await accessibleClassesWhere(viewer);
  const classes = await db.class.findMany({
    where: branchId ? { AND: [accessible, { branchId }] } : accessible,
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const students = await loadOperationalRoster(
    classes.map((c) => c.id),
    true,
  );
  try {
    const table = srsStateTable();
    if (!table)
      throw new SrsUnavailable("학생 학습 기록 저장소를 준비 중입니다.");
    const rows = await table.findMany({
      where: { studentId: { in: students.map((s) => s.id) } },
    });
    const states = new Map(
      rows.map((row) => [
        row.studentId,
        { revision: row.revision, state: parseSrsState(row.payload) },
      ]),
    );
    return {
      management: {
        canOpen:
          viewer.menus?.includes("teaching") === true &&
          viewer.role !== "reviewer",
        isSuperAdmin: viewer.isSuperAdmin === true,
        branchId: viewer.branchId ?? null,
        branchRole: viewer.branchRole ?? null,
      },
      classes,
      students: students.map((s) =>
        courseRosterDto(
          s,
          states.get(s.id) ?? { revision: 0, state: emptySrsState() },
          now,
        ),
      ),
    };
  } catch (error) {
    if (isMissingSrsStorage(error))
      throw new SrsUnavailable("학생 학습 기록 저장소를 준비 중입니다.");
    throw error;
  }
}

export async function loadCourseStudentDetail(student: StudentRow, now: Date) {
  return courseDetailDto(student, await readSrsState(student.id), now);
}
