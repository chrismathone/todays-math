import "server-only";
import { textbookConceptSchema } from "@/contracts/textbookConcept.contract";
import { composeFrozenTextbookBlank } from "@/lib/concept-blank/textbookPrint";
import { type TextbookActor, requireReadableEdition } from "./access";
import { conceptContentHash } from "./hash.server";
import { getConcept } from "./server/conceptRows";
import { conflict } from "./server/errors";
import type { TextbookSql } from "./server/sql";

/** Print the reviewed edition's exact entries, never a newly expanded live section. */
export async function loadFrozenBlank(
  sql: TextbookSql,
  actor: TextbookActor,
  editionId: string,
  conceptKey: string,
) {
  const edition = await requireReadableEdition(sql, actor, editionId);
  const record = await getConcept(sql, actor, editionId, conceptKey);
  const concept = textbookConceptSchema.parse(record.concept);
  if (!concept.frozen || edition.status === "draft")
    throw conflict(
      "발행한 교재의 개념백지만 인쇄할 수 있습니다. 초안은 교재 제작에서 확인해 주세요.",
    );
  if (conceptContentHash(concept) !== concept.frozen.contentHash)
    throw new Error("발행 개념의 내용 해시가 일치하지 않습니다.");
  return { edition, concept, ...composeFrozenTextbookBlank(concept.frozen) };
}
