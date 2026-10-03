/**
 * 학생에게 열린 강의 — **목록과 시청 기록이 같은 판정 하나를 쓴다** (D-125 ⑸ · 브리프 §2.4 · §6).
 *
 * 부르는 곳: `/api/learn/lectures`(목록) · `/api/learn/lectures/{id}`(하나) · `/api/learn/watch`(기록).
 * 셋이 판정을 각자 적으면 «목록에는 없는데 기록은 받는» 강의가 생긴다 — 남의 학년 강의 id 를 보내면
 * 기록이 쌓이고 원장님 화면의 n/m 이 거짓이 된다. 그래서 DB 조회는 차시로 **넓게** 하고, 거르는 것은
 * 전부 이 파일의 `lectureOpenToStudent` 가 한다(목록 조회에 `status` 조건을 따로 걸지 않는 까닭).
 *
 * «진도에 있던 차시»는 **기록된 차시의 집합**이다 — 진도보다 앞선 차시는 물론, 건너뛴 차시도 안 된다.
 * 반 진도는 그 학생의 **지금 반**의 반 전체 진도(studentId NULL), 개인 진도는 **그 학생의 행 전부**
 * (반을 옮기기 전에 적힌 개인 진도도 그 학생이 배운 것이다). `useIndividualProgress` 는 «현재 진도»를
 * 고르는 스위치(progressResolver.ts)라 여기서는 쓰지 않는다 — 둘 다 **있던** 진도다(보고서 «리드가 정할 것»).
 *
 * 학생 목록의 날짜 묶음(learn-screens 브리프 §1.1)도 **같은 셈**에서 나온다 — `progressDatesOf` 가 차시마다
 * 그 학생에게 기록된 가장 최근 날을 세고, 열린 차시의 집합(`progressUnitIdsOf`)은 그 열쇠다. 둘을 따로 세면
 * «목록에는 날짜가 있는데 열리지 않는» 차시가 생긴다.
 */
import type { ConceptLectureStatus } from "@/contracts/conceptLecture.contract";
import type { LearnUnit } from "@/contracts/studentAccount.contract";

export interface ProgressRowLike {
  classId: string;
  studentId: string | null;
  unitId: string;
  /** `Progress.recordedAt`(@db.Date) — Prisma 는 그 날의 UTC 자정으로 읽어 온다 */
  recordedAt: Date;
}

export interface StudentScope {
  id: string;
  classId: string;
  classIds?: readonly string[];
}

/** `@db.Date` → 그 날(YYYY-MM-DD). 날짜 칸이라 UTC 자정으로 오고, 시간대를 옮기지 않는다 */
function recordedDay(recordedAt: Date): string {
  return recordedAt.toISOString().slice(0, 10);
}

/**
 * 🔴 진도에 있던 차시 → 그 차시를 **가장 최근에** 수업한 날 — 내 반의 반 진도 ∪ 내 개인 진도.
 * 같은 차시를 반이 다시 나갔거나 나만 다시 배웠으면 늦은 날이다. 남의 진도의 날짜는 안 센다.
 */
export function progressDatesOf(
  rows: readonly ProgressRowLike[],
  student: StudentScope,
): Map<string, string> {
  const dates = new Map<string, string>();
  for (const row of rows) {
    const classProgress =
      row.studentId === null &&
      (student.classIds ?? [student.classId]).includes(row.classId);
    const ownProgress =
      row.studentId === student.id &&
      (!student.classIds || student.classIds.includes(row.classId));
    if (!(classProgress || ownProgress)) continue;
    const day = recordedDay(row.recordedAt);
    const seen = dates.get(row.unitId);
    if (seen === undefined || day > seen) dates.set(row.unitId, day);
  }
  return dates;
}

/** 진도에 있던 차시 — `progressDatesOf` 의 열쇠(같은 셈이라 목록과 기록이 갈라지지 않는다) */
export function progressUnitIdsOf(
  rows: readonly ProgressRowLike[],
  student: StudentScope,
): Set<string> {
  return new Set(progressDatesOf(rows, student).keys());
}

/** 🔴 이 강의가 이 학생에게 열렸나 — 게시 · 주소 있음 · 진도에 있던 차시 */
export function lectureOpenToStudent(
  lecture: {
    status: ConceptLectureStatus;
    unitId: string;
    videoUrl: string | null;
  },
  progressUnitIds: ReadonlySet<string>,
): boolean {
  return (
    lecture.status === "published" &&
    lecture.videoUrl !== null &&
    progressUnitIds.has(lecture.unitId)
  );
}

/** 목록 차례 — 교육과정 차례(orderIndex) → 강의 순서(sortOrder) → 제목 */
export function sortLecturesForStudent<
  T extends { unitId: string; sortOrder: number; title: string },
>(lectures: readonly T[], unitOrder: ReadonlyMap<string, number>): T[] {
  const orderOf = (id: string) => unitOrder.get(id) ?? Number.MAX_SAFE_INTEGER;
  return [...lectures].sort(
    (a, b) =>
      orderOf(a.unitId) - orderOf(b.unitId) ||
      a.sortOrder - b.sortOrder ||
      a.title.localeCompare(b.title, "ko"),
  );
}

/**
 * 차시 행 → 학생에게 가는 차시 머리(`learnUnitSchema`). 수업한 날(`progressDatesOf` 의 값)이 없는 차시는
 * **열린 차시가 아니다** — 부르는 쪽이 판정을 건너뛴 것이라 조용히 넘기지 않고 던진다.
 */
export function toLearnUnit(
  unit: {
    id: string;
    grade: string;
    chapter: string;
    section: string;
    orderIndex: number;
  },
  taughtOn: ReadonlyMap<string, string>,
): LearnUnit {
  const day = taughtOn.get(unit.id);
  if (day === undefined)
    throw new Error(
      `[lectureAccess] 진도에 없던 차시를 학생에게 보내려 한다 — ${unit.id}`,
    );
  return {
    id: unit.id,
    grade: unit.grade,
    chapter: unit.chapter,
    section: unit.section,
    orderIndex: unit.orderIndex,
    taughtOn: day,
  };
}
