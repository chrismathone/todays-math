/**
 * 학생 API 가 강의를 고를 때 읽는 것 — 학생 한 줄과 «진도에 있던 차시» (D-125 ⑸).
 * 판정은 `lectureAccess.ts` 한 곳이다. 여기는 DB 에서 **넓게** 읽어 그 판정에 넘기기만 한다.
 *
 * 학생 목록의 날짜 묶음(learn-screens 브리프 §1.1)에 쓰는 «그 차시를 수업한 날»도 **여기 한 곳**에서
 * 같은 진도 행으로 센다(`progressDatesOf`) — 목록과 기록의 판정이 갈라지지 않게(student-auth §2.5).
 */
import "server-only";

import type { LearnStudent } from "@/contracts/studentAccount.contract";
import { db } from "@/lib/db";
import { activeStudentClassIds } from "@/lib/classAccess";

import { progressDatesOf, type StudentScope } from "./lectureAccess";

export interface StudentLectureScope {
  student: StudentScope;
  /** 학생 화면 윗줄 — 이름 · 반 */
  head: LearnStudent;
  /** 진도에 있던 차시 — 목록·하나·기록이 같이 부르는 판정(`lectureOpenToStudent`)에 넘긴다 */
  progressUnitIds: Set<string>;
  /** 차시 → 그 학생에게 기록된 가장 최근 날(YYYY-MM-DD) — `progressUnitIds` 와 같은 셈 */
  taughtOn: ReadonlyMap<string, string>;
}

/** 학생이 없으면(지워졌으면) null */
export async function loadStudentLectureScope(
  studentId: string,
): Promise<StudentLectureScope | null> {
  const student = await db.student.findUnique({
    where: { id: studentId },
    include: { class: true },
  });
  if (!student) return null;
  const classIds = student.eywaBindingId
    ? await activeStudentClassIds(student.id)
    : undefined;
  if (classIds && !classIds.length) return null;
  const scope = {
    id: student.id,
    classId: classIds?.[0] ?? student.classId,
    ...(classIds ? { classIds } : {}),
  };
  const contextClass =
    scope.classId === student.classId
      ? student.class
      : await db.class.findUnique({ where: { id: scope.classId } });
  if (!contextClass) return null;
  const select = {
    classId: true,
    studentId: true,
    unitId: true,
    recordedAt: true,
  } as const;
  const [classRows, ownRows] = await Promise.all([
    db.progress.findMany({
      where: {
        retiredAt: null,
        classId: classIds ? { in: classIds } : scope.classId,
        studentId: null,
      },
      select,
    }),
    db.progress.findMany({
      where: {
        retiredAt: null,
        studentId: scope.id,
        ...(classIds ? { classId: { in: classIds } } : {}),
      },
      select,
    }),
  ]);
  const taughtOn = progressDatesOf([...classRows, ...ownRows], scope);
  return {
    student: scope,
    head: { name: student.name, className: contextClass.name },
    progressUnitIds: new Set(taughtOn.keys()),
    taughtOn,
  };
}

/** 차시 머리 옮기기는 순수 모듈에 있다 — 개발용 시안 페이지의 픽스처도 같은 것을 부른다 */
export { toLearnUnit } from "./lectureAccess";
