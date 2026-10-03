import "server-only";
import { textbookBlankResultSchema } from "@/contracts/textbookBlank.contract";
import {
  textbookConceptSchema,
  type TextbookConcept,
} from "@/contracts/textbookConcept.contract";
import { composeFrozenTextbookBlank } from "@/lib/concept-blank/textbookPrint";
import { type TextbookActor, requireReadableEdition } from "./access";
import { conceptContentHash } from "./hash.server";
import { readConceptContent } from "./server/conceptRows";
import { conflict, issue, notFound } from "./server/errors";
import type { TextbookSql } from "./server/sql";

async function readBlankSource(
  sql: TextbookSql,
  actor: TextbookActor,
  editionId: string,
  conceptKey: string,
) {
  const edition = await requireReadableEdition(sql, actor, editionId);
  const record = await readConceptContent(sql, editionId, conceptKey);
  if (!record) throw notFound("개념");
  const concept = textbookConceptSchema.parse(record);
  if (concept.conceptKey !== conceptKey)
    throw new Error("요청한 개념과 저장된 개념의 출처가 다릅니다.");
  return { edition, concept };
}

function verifiedBlank(concept: TextbookConcept) {
  if (!concept.frozen)
    throw conflict(
      "발행한 개념의 고정 백지가 없습니다. 새 판본에서 연결을 확인해 주세요.",
    );
  if (conceptContentHash(concept) !== concept.frozen.contentHash)
    throw new Error("발행 개념의 내용 해시가 일치하지 않습니다.");
  return composeFrozenTextbookBlank(concept.frozen);
}

/** Print the reviewed edition's exact entries, never a newly expanded live section. */
export async function loadFrozenBlank(
  sql: TextbookSql,
  actor: TextbookActor,
  editionId: string,
  conceptKey: string,
) {
  const { edition, concept } = await readBlankSource(
    sql,
    actor,
    editionId,
    conceptKey,
  );
  if (!concept.frozen || edition.status === "draft")
    throw conflict(
      "발행한 교재의 개념백지만 인쇄할 수 있습니다. 초안은 교재 제작에서 확인해 주세요.",
    );
  return { edition, concept, ...verifiedBlank(concept) };
}

/** Owner draft preview or an authorized frozen edition; this GET adapter never stores its composition. */
export async function loadTeacherBlank(
  sql: TextbookSql,
  actor: TextbookActor,
  editionId: string,
  conceptKey: string,
) {
  const { edition, concept } = await readBlankSource(
    sql,
    actor,
    editionId,
    conceptKey,
  );
  const current = edition.status === "draft";
  let prepared: TextbookConcept;
  let composed: ReturnType<typeof verifiedBlank>;
  try {
    // Keep the live bank out of the published path, including its initialization.
    prepared = current
      ? (await import("./concepts")).freezeTextbookConcept(concept)
      : concept;
    composed = verifiedBlank(prepared);
  } catch (error) {
    const reason =
      error instanceof Error
        ? error.message
        : "개념백지 구성을 확인할 수 없습니다.";
    const action = current
      ? "연결 항목과 백지 형식을 확인하고, 바뀐 항목을 다시 확인하거나 제외해 주세요."
      : "고정된 원문과 버전을 확인한 뒤 새 판본에서 다시 발행해 주세요.";
    throw conflict(`개념백지를 만들 수 없습니다. ${action}`, {
      issues: [
        issue("CONCEPT_BLANK_UNAVAILABLE", reason.slice(0, 2000), {
          path: ["concepts", conceptKey],
        }),
      ],
    });
  }
  // A response-shape bug is a server error, not a request to re-confirm valid refs.
  return textbookBlankResultSchema.parse({
    editionId: edition.editionId,
    conceptKey: concept.conceptKey,
    ...composed,
    source: current ? "current" : "frozen",
    contentHash: prepared.frozen!.contentHash,
  });
}
