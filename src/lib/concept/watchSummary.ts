/**
 * 「끝까지 본 학생 n/m」 — 원장님 화면의 시청 기록 모음 (D-124 ⑺) · 누르면 펼쳐지는
 * «아직 안 본 학생» (D-125 ⑹).
 *
 * 입력은 반 학생 목록 × 시청 기록(`ConceptLectureView`) 이고, 강의 하나에 대해 센다.
 * 문제 풀기·결과 보기는 여전히 밖이다(D-123 ⑵) — 여기서 세는 것은 **시청**뿐이다.
 *
 * 분모부터 검산한다(「분모를 검산하라」 — 2026-08-18 교훈):
 *  - **퇴원 학생**(`Student.eywaWithdrawnAt` 이 찍힌 학생)은 분모에서 뺀다. 그 행은 시험 이력
 *    때문에 지우지 않고 반에 남아 있다 — 빼지 않으면 «안 본 학생»으로 영영 남는다.
 *  - 분자는 **분모 안에서만** 센다 — 퇴원한 학생·다른 반 학생의 기록은 끝까지 봤어도 안 센다.
 *    그래야 n 이 m 을 넘지 않는다.
 *  - «끝까지 봤다» = 완료 시각이 찍혔다(95% — `watchRules.mergeWatchRecord`). 보다 만 것은 안 센다.
 *  - 다른 강의의 기록은 안 센다 — 부르는 쪽이 반 전체 기록을 통째로 넘겨도 되게 강의로 거른다.
 *
 * 비율(%)은 여기서 만들지 않는다 — 0/0 을 무엇으로 보일지는 화면이 정한다(D-07).
 */

/** 반 학생 한 명 — Prisma `Student` 행을 그대로 넘겨도 된다 */
export interface RosterStudent {
  id: string;
  eywaWithdrawnAt: Date | string | null;
}

/** 시청 기록 한 행 — Prisma `ConceptLectureView` 행을 그대로 넘겨도 된다 */
export interface LectureViewLike {
  studentId: string;
  lectureId: string;
  completedAt: Date | string | null;
}

export interface WatchedToEnd {
  /** 끝까지 본 학생 수 (n) */
  watched: number;
  /** 퇴원을 뺀 반 학생 수 (m) */
  total: number;
  /**
   * 아직 끝까지 안 본 학생 id — **반 목록 순서**(D-125 ⑹: n/m 을 누르면 안 본 학생 이름이
   * 펼쳐진다). 이름은 부르는 쪽이 반 목록에서 붙인다. 늘 `watched + pending.length === total`.
   */
  pending: string[];
}

export function countWatchedToEnd(
  roster: readonly RosterStudent[],
  views: readonly LectureViewLike[],
  lectureId: string,
): WatchedToEnd {
  const enrolled = new Set(
    roster.filter((s) => s.eywaWithdrawnAt == null).map((s) => s.id),
  );
  const watched = new Set(
    views
      .filter((v) => v.lectureId === lectureId)
      .filter((v) => v.completedAt != null)
      .filter((v) => enrolled.has(v.studentId))
      .map((v) => v.studentId),
  );
  // Set 은 넣은 순서를 지킨다 — 그래서 반 목록 순서 그대로, 겹친 학생은 한 번만.
  const pending = [...enrolled].filter((id) => !watched.has(id));
  return { watched: watched.size, total: enrolled.size, pending };
}
