import "server-only";
import type {
  CourseRosterStudent,
  CourseStudentDetail,
  CourseStudentState,
} from "@/contracts/mathSrsCourse.contract";
import { db } from "@/lib/db";
import { dailyJourneyDto } from "./dailyJourney";
import {
  ownedRowsWhere,
  ownedStudentsWhere,
  type ScopeViewer,
} from "@/lib/ownerScope";
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
  studentAccount: { select: { id: true, disabledAt: true } },
} as const;
type StudentRow = {
  id: string;
  name: string;
  classId: string;
  class: { id: string; name: string };
  studentAccount: { id: string; disabledAt: Date | null } | null;
};
type Saved = { revision: number; state: StoredSrsState };

export async function loadCourseStudent(studentId: string) {
  const student = await db.student.findUnique({
    where: { id: studentId },
    include: studentInclude,
  });
  return student && !student.eywaWithdrawnAt ? student : null;
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
  return {
    journey: dailyJourneyDto(saved.state, "elementary", now),
    student: {
      id: student.id,
      name: student.name,
      classId: student.classId,
      className: student.class.name,
    },
    revision: saved.revision,
    plan: course.plan,
    summary: courseSummary(course, now),
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

export async function loadCourseDashboard(viewer: ScopeViewer, now: Date) {
  const [students, classes] = await Promise.all([
    db.student.findMany({
      where: { ...ownedStudentsWhere(viewer), eywaWithdrawnAt: null },
      include: studentInclude,
      orderBy: [{ classId: "asc" }, { name: "asc" }],
    }),
    db.class.findMany({
      where: ownedRowsWhere(viewer),
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
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
