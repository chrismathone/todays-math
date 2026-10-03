/**
 * 목차의 개념 강의 참조(`conceptLectureRefs`) — «이 개념의 준비 영상은 이 강의»라는 원고의 주장을 서버가 확인한다.
 *
 * 강의는 «오늘의 개념»의 것이다(교재가 영상을 따로 등록하지 않는다 — 문항 풀이 영상의 연결과 다른 길이다).
 * 참조가 성립하려면 넷이 다 참이어야 한다:
 *   ⑴ 그 강의가 있다 ⑵ **지금 게시돼 있다**(초안 · 내린 강의를 원고가 가리키지 못한다)
 *   ⑶ 그 개념이 이 판본에 있다 ⑷ 개념에 단원이 적혀 있으면 강의의 단원과 같다
 * (학생 화면이 영상을 찾을 때 같은 조건으로 찾는다 — 여기서 받아 놓고 거기서 못 찾으면 «준비 중»만 뜬다.)
 *
 * 쓰는 자리 셋: 목차 저장(새로 더한 참조만 — 전부터 있던 참조가 저장을 막지 않게) · 발행 사전 검사(전부) ·
 * 패키지 복사(성립하지 않는 참조는 빼고 사유를 남긴다).
 */
import type { TextbookSql } from "./sql";
import { uuidList } from "./sql";

export interface LectureRef {
  unitKey: string;
  lectureId: string;
  conceptKey: string;
}
export interface LectureRefFault extends LectureRef {
  reason: string;
}

/** 판본에 지금 있는 개념과 그 단원 */
export async function editionConceptUnits(
  sql: TextbookSql,
  editionId: string,
): Promise<Map<string, string | null>> {
  const rows = await sql.query<{ conceptKey: string; unitId: string | null }>(
    `SELECT "concept_key" AS "conceptKey", "unit_id" AS "unitId" FROM "textbook_concept" WHERE "edition_id" = $1::uuid`,
    [editionId],
  );
  return new Map(rows.map((row) => [row.conceptKey, row.unitId]));
}

export const lectureRefsOf = (
  units: ReadonlyArray<{
    unitKey: string;
    conceptLectureRefs: ReadonlyArray<{
      lectureId: string;
      conceptKey: string;
    }>;
  }>,
): LectureRef[] =>
  units.flatMap((unit) =>
    unit.conceptLectureRefs.map((ref) => ({ unitKey: unit.unitKey, ...ref })),
  );

/** 성립하지 않는 참조와 그 사유. `concepts` 는 개념 열쇠 → 단원(없으면 null) */
export async function lectureRefFaults(
  sql: TextbookSql,
  refs: readonly LectureRef[],
  concepts: ReadonlyMap<string, string | null>,
): Promise<LectureRefFault[]> {
  if (!refs.length) return [];
  const lectures = new Map(
    (
      await sql.query<{ id: string; unitId: string; status: string }>(
        `SELECT "id", "unit_id" AS "unitId", "status"::text AS "status" FROM "concept_lecture" WHERE "id" IN ${uuidList("$1")}`,
        [JSON.stringify([...new Set(refs.map((ref) => ref.lectureId))])],
      )
    ).map((row) => [row.id, row]),
  );
  const faults: LectureRefFault[] = [];
  for (const ref of refs) {
    const lecture = lectures.get(ref.lectureId);
    const conceptUnit = concepts.get(ref.conceptKey);
    const reason = !lecture
      ? "없는 개념 강의를 가리킵니다."
      : lecture.status !== "published"
        ? "게시되지 않은 개념 강의를 가리킵니다."
        : conceptUnit === undefined
          ? "이 판본에 없는 개념을 가리킵니다."
          : conceptUnit !== null && conceptUnit !== lecture.unitId
            ? "개념의 단원과 강의의 단원이 다릅니다."
            : null;
    if (reason) faults.push({ ...ref, reason });
  }
  return faults;
}

export interface ReferableLecture {
  lectureId: string;
  unitId: string;
  title: string;
  seconds: number;
}

/** 원고가 가리킬 수 있는 강의 — 그 단원의 **게시된** 강의만, 차시 순 */
export async function referableLectures(
  sql: TextbookSql,
  unitId: string,
): Promise<ReferableLecture[]> {
  return sql.query<ReferableLecture>(
    `SELECT "id" AS "lectureId", "unit_id" AS "unitId", "title", "seconds"
       FROM "concept_lecture"
      WHERE "unit_id" = $1::uuid AND "status" = 'published'
      ORDER BY "sort_order", "created_at", "id" LIMIT 200`,
    [unitId],
  );
}
