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
      classId: student.classId,
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
      classId: student.classId,
      className: student.class.name,
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

/** A single roster/progress/state batch, using real Student IDs and the existing Class owner gate upstream. */
export async function loadSrsClassDashboard(
  cls: { id: string; name: string },
  now: Date,
): Promise<MathSrsClassDashboard> {
  const [students, progress] = await Promise.all([
    db.student.findMany({
      where: { classId: cls.id, eywaWithdrawnAt: null },
      orderBy: { createdAt: "asc" },
      include: { studentAccount: { select: { id: true, disabledAt: true } } },
    }),
    db.progress.findMany({
      where: {
        classId: cls.id,
        recordedAt: { lte: new Date(`${kstDateOf(now)}T00:00:00.000Z`) },
      },
      select: progressSelect,
    }),
  ]);
  const ids = students.map((s) => s.id);
  const unitIds = [...new Set(progress.map((p) => p.unitId))];
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
  const units = unitIds.length
    ? await db.unit.findMany({ where: { id: { in: unitIds } } })
    : [];
  const sections = new Map(units.map((u) => [u.id, u.section]));
  const shaped = progress.map(shapeProgress);
  const states = new Map(
    stored.map((row) => [row.studentId, parseSrsState(row.payload)]),
  );
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
