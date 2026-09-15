/**
 * 학생 API 가 강의를 고를 때 읽는 것 — 학생 한 줄과 «진도에 있던 차시» (D-125 ⑸).
 * 판정은 `lectureAccess.ts` 한 곳이다. 여기는 DB 에서 **넓게** 읽어 그 판정에 넘기기만 한다.
 */
import "server-only";

import type { LearnUnit } from "@/contracts/studentAccount.contract";
import { db } from "@/lib/db";

import { progressUnitIdsOf, type StudentScope } from "./lectureAccess";

export interface StudentLectureScope {
  student: StudentScope;
  progressUnitIds: Set<string>;
}

/** 학생이 없으면(지워졌으면) null */
export async function loadStudentLectureScope(
  studentId: string,
): Promise<StudentLectureScope | null> {
  const student = await db.student.findUnique({ where: { id: studentId } });
  if (!student) return null;
  const scope = { id: student.id, classId: student.classId };
  const select = { classId: true, studentId: true, unitId: true } as const;
  const [classRows, ownRows] = await Promise.all([
    db.progress.findMany({
      where: { classId: scope.classId, studentId: null },
      select,
    }),
    db.progress.findMany({ where: { studentId: scope.id }, select }),
  ]);
  return {
    student: scope,
    progressUnitIds: progressUnitIdsOf([...classRows, ...ownRows], scope),
  };
}

export function toLearnUnit(unit: {
  id: string;
  grade: string;
  chapter: string;
  section: string;
  orderIndex: number;
}): LearnUnit {
  return {
    id: unit.id,
    grade: unit.grade,
    chapter: unit.chapter,
    section: unit.section,
    orderIndex: unit.orderIndex,
  };
}
