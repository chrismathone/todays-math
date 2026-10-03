import "server-only";
import type { TextbookConcept } from "@/contracts/textbookConcept.contract";
import { textbookStudentVideoSchema } from "@/contracts/textbookStudent.contract";
import {
  toStudentLecture,
  type LectureRowLike,
} from "@/lib/concept/studentLecture";
import { parseYouTubeId } from "@/lib/concept/youtube";
import type { StudentQrTarget } from "./studentAccess";
import type { TextbookSql } from "./server/sql";

/** Caller has checked this assignment and frozen concept. Preview access never fabricates watch progress. */
export async function studentConceptVideo(
  sql: TextbookSql,
  target: StudentQrTarget,
  concept: TextbookConcept,
) {
  const lectures = await sql.query<LectureRowLike>(
    `SELECT l."id", l."unit_id" AS "unitId", l."title", l."video_url" AS "videoUrl", l."seconds", l."sort_order" AS "sortOrder", l."status"
       FROM "textbook_edition" e
       CROSS JOIN LATERAL jsonb_array_elements(e."outline" -> 'units') AS u(value)
       CROSS JOIN LATERAL jsonb_array_elements(u.value -> 'conceptLectureRefs') WITH ORDINALITY AS r(value, position)
       JOIN "concept_lecture" l ON l."id"::text = r.value ->> 'lectureId'
      WHERE e."id" = $1::uuid AND u.value ->> 'unitKey' = $2::text
        AND r.value ->> 'conceptKey' = $3::text AND ($4::uuid IS NULL OR l."unit_id" = $4::uuid)
      ORDER BY r.position LIMIT 100`,
    [target.editionId, concept.unitKey, concept.conceptKey, concept.unitId],
  );
  // The manuscript's reference order chooses the first currently published preview.
  for (const row of lectures) {
    const shown = toStudentLecture(row, null);
    const providerVideoId = shown ? parseYouTubeId(shown.videoUrl) : null;
    if (providerVideoId)
      return textbookStudentVideoSchema.parse({
        state: "ready",
        providerVideoId,
        startSeconds: 0,
        endSeconds: null,
      });
  }
  return textbookStudentVideoSchema.parse({
    state: lectures.some((row) => row.status === "archived")
      ? "withdrawn"
      : "preparing",
    providerVideoId: null,
    startSeconds: 0,
    endSeconds: null,
  });
}
