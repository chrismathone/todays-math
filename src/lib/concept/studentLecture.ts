/**
 * 저장된 강의 행 → **학생에게 가는 모양** (D-124 ⑵·⑹).
 *
 * 학생 화면(목록 → 재생)이 받는 것은 `conceptLectureForStudentSchema` 다. 그 계약에는
 * AI 고지(`disclosure`)·잡 ID(`sourceJobId`)·원장님 시청 확인(`reviewedAt`)이 **없다** —
 * 고지는 원장님 화면에만 둔다(D-124 ⑹ · 수맥 2026-08-04 결정). 저장은 그대로 한다.
 *
 * 계약만으로는 안 샌다는 보장이 없다 — 라우트가 행을 통째로 내보낸 날 계약 검사를 안 거치면
 * 그대로 나간다. 그래서 옮기는 길을 **이 함수 하나**로 두고 칸을 하나씩 적는다.
 * 학생에게 강의를 내보내는 경로는 이 함수를 불러야 한다.
 */
import type {
  ConceptLectureForStudent,
  ConceptLectureStatus,
} from "@/contracts/conceptLecture.contract";

/** 옮기는 데 필요한 칸만 — Prisma 행을 그대로 넘겨도 된다(칸이 더 있어도 옮기지 않는다). */
export interface LectureRowLike {
  id: string;
  unitId: string;
  title: string;
  videoUrl: string | null;
  seconds: number;
  sortOrder: number;
  status: ConceptLectureStatus;
}

/** 이 학생의 시청 기록(`ConceptLectureView`) — 없으면 null */
export interface ViewRowLike {
  maxSeconds: number;
  percent: number;
  completedAt: Date | string | null;
}

/**
 * 게시된 강의만 옮긴다(D-124 ⑵ — 목록에는 게시된 강의만). 초안·보관본은 null.
 * 게시본에는 주소가 반드시 있다(DB CHECK) — 그래도 없으면 학생에게 빈 카드를 내보내지 않는다.
 */
export function toStudentLecture(
  row: LectureRowLike,
  view: ViewRowLike | null,
): ConceptLectureForStudent | null {
  if (row.status !== "published" || row.videoUrl === null) return null;
  // 칸을 하나씩 적는다 — `...row` 로 펼치면 고지·잡 ID·시청 확인이 그대로 샌다.
  return {
    id: row.id,
    unitId: row.unitId,
    title: row.title,
    videoUrl: row.videoUrl,
    seconds: row.seconds,
    sortOrder: row.sortOrder,
    watch: view
      ? {
          maxSeconds: view.maxSeconds,
          percent: view.percent,
          completed: view.completedAt != null,
        }
      : null,
  };
}
