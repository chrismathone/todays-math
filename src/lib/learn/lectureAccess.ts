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
 */
import type { ConceptLectureStatus } from "@/contracts/conceptLecture.contract";

export interface ProgressRowLike {
  classId: string;
  studentId: string | null;
  unitId: string;
}

export interface StudentScope {
  id: string;
  classId: string;
}

/** 진도에 있던 차시 — 내 반의 반 진도 ∪ 내 개인 진도 */
export function progressUnitIdsOf(
  rows: readonly ProgressRowLike[],
  student: StudentScope,
): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    const classProgress =
      row.studentId === null && row.classId === student.classId;
    const ownProgress = row.studentId === student.id;
    if (classProgress || ownProgress) ids.add(row.unitId);
  }
  return ids;
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
