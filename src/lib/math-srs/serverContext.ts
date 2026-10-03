import { studentsInClassWhere } from "@/lib/classAccess";
import "server-only";
import type {
  MathSrsClassDashboard,
  MathSrsProgress,
} from "@/contracts/mathSrs.contract";
import { db } from "@/lib/db";
import { kstDateOf } from "@/lib/kstDate";
import {
  lectureOpenToStudent,
  sortLecturesForStudent,
} from "@/lib/learn/lectureAccess";
import { loadStudentLectureScope } from "@/lib/learn/studentLectures";
import {
  getCurrentProgress,
  type ProgressRecordLike,
} from "@/lib/progressResolver";
import { createMemories } from "./memory";
import { ENGINE_CATALOG } from "./engineCatalog";
import { type SrsStudentContext, srsMissionSummary } from "./serverDto";
import { parseSrsState, SrsUnavailable } from "./serverState";
import { isMissingSrsStorage, srsStateTable } from "./serverStore";

const progressSelect = {
  id: true,
  classId: true,
  studentId: true,
  unitId: true,
  recordedAt: true,
  createdAt: true,
} as const;
const practiceSections = new Set(
  ENGINE_CATALOG.map((entry) => entry.unitSection),
);
type ProgressDbRow = {
  id: string;
  classId: string;
  studentId: string | null;
  unitId: string;
  recordedAt: Date;
  createdAt: Date;
};
const shapeProgress = (row: ProgressDbRow): ProgressRecordLike => ({
  ...row,
  recordedAt: row.recordedAt.toISOString().slice(0, 10),
  createdAt: row.createdAt.toISOString(),
});

/** The same class/individual fallback and tie-break as the established progress API. */
export function srsCurrentProgress(
  rows: ProgressRecordLike[],
  student: { id: string; useIndividualProgress: boolean },
  sections: ReadonlyMap<string, string>,
): MathSrsProgress | null {
  const current = getCurrentProgress({
    classProgress: rows.filter((r) => r.studentId === null),
    studentProgress: rows.filter((r) => r.studentId === student.id),
    useIndividualProgress: student.useIndividualProgress,
  });
  if (!current) return null;
  return {
    unitId: current.unitId,
    section: sections.get(current.unitId) ?? "단원",
    recordedAt: current.recordedAt,
    source: current.studentId === null ? "class" : "individual",
  };
}

export async function loadSrsStudentContext(
  studentId: string,
  now: Date,
): Promise<SrsStudentContext | null> {
  const [student, lectureScope] = await Promise.all([
    db.student.findUnique({
      where: { id: studentId },
      include: { class: true },
    }),
    loadStudentLectureScope(studentId),
  ]);
  if (!student || student.eywaWithdrawnAt || !lectureScope) return null;
  const progress = await db.progress.findMany({
    where: {
      retiredAt: null,
      classId: lectureScope.student.classId,
      OR: [{ studentId: null }, { studentId }],
      recordedAt: { lte: new Date(`${kstDateOf(now)}T00:00:00.000Z`) },
    },
    select: progressSelect,
  });
  const unitIds = [
    ...new Set([
      ...progress.map((p) => p.unitId),
      ...lectureScope.progressUnitIds,
    ]),
  ];
  const units = unitIds.length
    ? await db.unit.findMany({ where: { id: { in: unitIds } } })
    : [];
  const relevantIds = units
    .filter((u) => u.grade === "중1" && practiceSections.has(u.section))
    .map((u) => u.id);
  const lectures = relevantIds.length
    ? await db.conceptLecture.findMany({
        where: { unitId: { in: relevantIds } },
      })
    : [];
  const sections = new Map(units.map((u) => [u.id, u.section]));
  return {
    student: {
      id: student.id,
      name: student.name,
      classId: lectureScope.student.classId,
      className: lectureScope.head.className,
    },
    currentProgress: srsCurrentProgress(
      progress.map(shapeProgress),
      student,
      sections,
    ),
    lectures: sortLecturesForStudent(
      lectures.filter((l) =>
        lectureOpenToStudent(l, lectureScope.progressUnitIds),
      ),
      new Map(units.map((u) => [u.id, u.orderIndex])),
    ).map((l) => ({
      id: l.id,
      title: l.title,
      unitId: l.unitId,
      section: sections.get(l.unitId) ?? "단원",
      href: `/learn/watch/${l.id}`,
    })),
  };
}

/**
 * 반 명단(탈퇴 제외 · 만든 날 순)과 그 학생들의 저장된 기록 — 반 복습 현황과 탐험 교사 보기
 * (`math-explorers/teacherRoutes.ts`)가 **같은 길**로 읽는다. 반 소유 검사는 부르는 쪽이 먼저 한다.
 */
export async function loadSrsClassRoster(classId: string) {
  const students = await db.student.findMany({
    where: { ...studentsInClassWhere(classId), eywaWithdrawnAt: null },
    orderBy: { createdAt: "asc" },
    include: {
      // `createdAt` — 탐험 교사 보기의 «시작 전»이 계정을 만든 날부터 센다(27번 문서 §4.2)
      studentAccount: {
        select: { id: true, disabledAt: true, createdAt: true },
      },
    },
  });
  const ids = students.map((s) => s.id);
  let stored;
  try {
    const table = srsStateTable();
    if (!table)
      throw new SrsUnavailable("학생 학습 기록 저장소를 준비 중입니다.");
    stored = ids.length
      ? await table.findMany({ where: { studentId: { in: ids } } })
      : [];
  } catch (error) {
    if (isMissingSrsStorage(error))
      throw new SrsUnavailable("학생 학습 기록 저장소를 준비 중입니다.");
    throw error;
  }
  return {
    students,
    states: new Map(
      stored.map((row) => [row.studentId, parseSrsState(row.payload)]),
    ),
  };
}

/** A single roster/progress/state batch, using real Student IDs and the existing Class owner gate upstream. */
export async function loadSrsClassDashboard(
  cls: { id: string; name: string },
  now: Date,
): Promise<MathSrsClassDashboard> {
  const [{ students, states }, progress] = await Promise.all([
    loadSrsClassRoster(cls.id),
    db.progress.findMany({
      where: {
        retiredAt: null,
        classId: cls.id,
        recordedAt: { lte: new Date(`${kstDateOf(now)}T00:00:00.000Z`) },
      },
      select: progressSelect,
    }),
  ]);
  const unitIds = [...new Set(progress.map((p) => p.unitId))];
  const units = unitIds.length
    ? await db.unit.findMany({ where: { id: { in: unitIds } } })
    : [];
  const sections = new Map(units.map((u) => [u.id, u.section]));
  const shaped = progress.map(shapeProgress);
  return {
    class: { id: cls.id, name: cls.name },
    available: true,
    students: students.map((student) => {
      const state = states.get(student.id);
      const today = state?.missions.find((m) => m.date === kstDateOf(now));
      const attempts = state?.missions.flatMap((m) => m.attempts) ?? [];
      const lastPracticedAt = attempts.reduce<string | null>(
        (last, a) =>
          last === null || a.answeredAt > last ? a.answeredAt : last,
        null,
      );
      return {
        id: student.id,
        name: student.name,
        hasAccount: Boolean(
          student.studentAccount && !student.studentAccount.disabledAt,
        ),
        memories: state?.memories ?? createMemories(),
        today: today ? srsMissionSummary(today) : null,
        lastPracticedAt,
        currentProgress: srsCurrentProgress(shaped, student, sections),
      };
    }),
  };
}
