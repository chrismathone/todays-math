/**
 * 학생 강의 목록의 **조립** — DB 에서 읽은 행 → 학생에게 가는 모양(`learnLectureListResponseSchema`의 data).
 *
 * 부르는 곳: `GET /api/learn/lectures`(제품) · `src/app/dev/learn-hifi/fixture.ts`(개발용 시안 페이지 · 화면 시험).
 * 둘이 **같은 조립**을 부른다 — 캡처와 시험이 제품과 다른 목록을 보일 수 없다(concept-admin-ui 의
 * `assembleConceptBoard` 와 같은 까닭).
 *
 * 열렸는지(`lectureOpenToStudent`)는 여기서 다시 보지 않는다 — 부르는 쪽이 그 판정 **하나**로 거른 강의만
 * 넘긴다(목록과 기록이 같은 판정 — student-auth §2.5). 여기서 하는 일은 셋: 차례 · 학생 모양 · 수업한 날.
 */
import type { LearnStudent } from "@/contracts/studentAccount.contract";
import type { LearnLectureList } from "@/contracts/studentAccount.contract";
import {
  toStudentLecture,
  type LectureRowLike,
  type ViewRowLike,
} from "@/lib/concept/studentLecture";

import { sortLecturesForStudent, toLearnUnit } from "./lectureAccess";

export interface LearnUnitRowLike {
  id: string;
  grade: string;
  chapter: string;
  section: string;
  orderIndex: number;
}

export function assembleLearnList(input: {
  head: LearnStudent;
  /** 차시 → 그 학생에게 기록된 가장 최근 날(`progressDatesOf`) */
  taughtOn: ReadonlyMap<string, string>;
  /** 🔴 이미 `lectureOpenToStudent` 로 거른 강의 */
  open: readonly (LectureRowLike & { sortOrder: number })[];
  /** 열린 강의의 차시 */
  units: readonly LearnUnitRowLike[];
  /** 강의 id → 이 학생의 시청 기록 */
  viewOf: ReadonlyMap<string, ViewRowLike>;
}): LearnLectureList {
  const units = [...input.units].sort((a, b) => a.orderIndex - b.orderIndex);
  const order = new Map(units.map((u) => [u.id, u.orderIndex]));
  const lectures = sortLecturesForStudent(input.open, order).flatMap((l) => {
    const dto = toStudentLecture(l, input.viewOf.get(l.id) ?? null);
    return dto ? [dto] : [];
  });
  return {
    student: input.head,
    units: units.map((u) => toLearnUnit(u, input.taughtOn)),
    lectures,
  };
}
