/**
 * 구획 — 원고 블록의 읽기 · 저장 · 지우기. 구획마다 CAS 다(`revision`).
 *
 * 🔴 **배치의 자리는 블록 순서 하나가 정한다.** 구획을 저장하면 그 구획의 문제 블록 차례대로 배치의
 *    `section_id` · `order_index` 를 맞춘다. 블록에서 빠진 배치는 구획 밖으로 나간다(지우지 않는다 — 되돌리기가 살고,
 *    QR 을 예약한 배치는 지울 수도 없다). 한 배치는 한 구획의 한 블록에만 놓인다.
 * 🔴 판본 집계 revision 은 여기서 올리지 않는다 — 구획 · 배치 · 개념을 쓰는 문장마다 **DB 트리거가** 올린다.
 */
import type {
  TextbookEditionDetail,
  TextbookSectionRecord,
} from "@/contracts/textbook.contract";
import type {
  ManuscriptBlock,
  Section,
} from "@/contracts/textbookExchange.contract";
import type { TextbookIssue } from "@/contracts/textbookPrimitives.contract";
import { semanticFragmentAssetIds } from "../semanticAssets";

import {
  type TextbookActor,
  requireOwnedDraft,
  requireReadableEdition,
} from "../access";
import {
  aggregateRevision,
  bumpStructure,
  editionStructure,
  getEditionDetail,
} from "./editions";
import {
  TextbookError,
  conflict,
  invalid,
  issue,
  notFound,
  revisionMismatch,
} from "./errors";
import { type RequestKey, runOnce } from "./requests";
import { type TextbookDb, type TextbookSql, SQL_NOW, isoColumn } from "./sql";

export const SECTION_MAX_BYTES = 262_144;
export const EDITION_MAX_SECTIONS = 150;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA256 = /^[a-f0-9]{64}$/;

/** `textbook_section.content` 의 모양 — 블록과, 있을 때만 구획 정답 메모 */
export interface SectionContent {
  blocks: ManuscriptBlock[];
  teacherAnswer?: string;
}

/**
 * 구획 원고를 저장 칸의 모양으로. 구획 정답 메모는 **글이 있을 때만** 칸을 둔다 —
 * 빈 값을 적으면 판본 해시가 달라져 이미 발행한 판본의 검증이 깨진다.
 */
export function sectionContent(
  section: Pick<Section, "blocks" | "teacherAnswer">,
  blocks: ManuscriptBlock[] = section.blocks,
): SectionContent {
  return section.teacherAnswer === undefined
    ? { blocks }
    : { blocks, teacherAnswer: section.teacherAnswer };
}

/** 저장 칸에서 구획 정답 메모만 — 글이 아닌 값이나 빈 글은 «없음»이다(칸을 지어내지 않는다) */
export function storedTeacherAnswer(
  content: SectionContent,
): Pick<Section, "teacherAnswer"> {
  const value: unknown = content.teacherAnswer;
  return typeof value === "string" && value.trim().length > 0
    ? { teacherAnswer: value }
    : {};
}

interface SectionRow {
  id: string;
  unitKey: string;
  revision: number;
  sectionKey: string;
  title: string;
  templateKey: string;
  startPolicy: Section["startPolicy"];
  content: SectionContent;
  updatedAt: string;
}

const SECTION_SQL = `
  SELECT "id", "unit_key" AS "unitKey", "revision", "section_key" AS "sectionKey", "title",
         "template_key" AS "templateKey", "start_policy" AS "startPolicy", "content",
         ${isoColumn(`"updated_at"`)} AS "updatedAt"
    FROM "textbook_section" WHERE "id" = $1::uuid AND "edition_id" = $2::uuid`;

const toRecord = (row: SectionRow): TextbookSectionRecord => ({
  id: row.id,
  unitKey: row.unitKey,
  revision: row.revision,
  section: {
    sectionKey: row.sectionKey,
    title: row.title,
    templateKey: row.templateKey,
    startPolicy: row.startPolicy,
    blocks: row.content.blocks,
    ...storedTeacherAnswer(row.content),
  },
  updatedAt: row.updatedAt,
});

async function loadSection(
  sql: TextbookSql,
  editionId: string,
  sectionId: string,
): Promise<SectionRow | null> {
  const rows = await sql.query<SectionRow>(SECTION_SQL, [sectionId, editionId]);
  return rows[0] ?? null;
}

export async function getSection(
  sql: TextbookSql,
  actor: TextbookActor,
  editionId: string,
  sectionId: string,
): Promise<TextbookSectionRecord> {
  await requireReadableEdition(sql, actor, editionId);
  const row = await loadSection(sql, editionId, sectionId);
  if (!row) throw notFound("구획");
  return toRecord(row);
}

/** 블록이 가리키는 것 — 배치(차례대로) · 놓이는 개념 · 참조만 하는 개념 · 자산 */
export function blockReferences(blocks: readonly ManuscriptBlock[]): {
  itemIds: string[];
  placedConcepts: string[];
  referencedConcepts: string[];
  assetIds: string[];
} {
  const itemIds: string[] = [];
  const placedConcepts: string[] = [];
  const referencedConcepts: string[] = [];
  const assetIds: string[] = [];
  for (const block of blocks) {
    assetIds.push(...semanticFragmentAssetIds(block.semantic));
    if (block.kind === "problem") itemIds.push(block.itemId);
    else if (block.kind === "concept") placedConcepts.push(block.conceptKey);
    else if (block.kind === "concept-recall") {
      if (block.conceptKey) referencedConcepts.push(block.conceptKey);
    } else if (block.kind === "image") assetIds.push(block.assetId);
    else if (block.kind === "dialogue")
      for (const turn of block.turns) assetIds.push(turn.portraitAssetId);
  }
  return {
    itemIds,
    placedConcepts,
    referencedConcepts,
    assetIds: [...new Set(assetIds)],
  };
}

const duplicates = (values: readonly string[]): string[] => [
  ...new Set(values.filter((value, index) => values.indexOf(value) !== index)),
];

/**
 * 블록의 참조가 이 판본 · 이 주인의 것인지 본다. 없는 것을 건너뛰지 않는다 — 전부 사유와 함께 거절한다.
 */
async function checkReferences(
  tx: TextbookSql,
  actor: TextbookActor,
  editionId: string,
  sectionId: string,
  blocks: readonly ManuscriptBlock[],
): Promise<ReturnType<typeof blockReferences>> {
  const issues: TextbookIssue[] = [];
  const blockIds = blocks.map((block) => block.blockId);
  for (const blockId of duplicates(blockIds))
    issues.push(
      issue("duplicate-block", `블록 번호가 겹칩니다: ${blockId}`, {
        sectionId,
      }),
    );
  const refs = blockReferences(blocks);

  for (const itemId of duplicates(refs.itemIds))
    issues.push(
      issue("duplicate-item", "같은 배치가 한 구획에 두 번 놓였습니다.", {
        itemId,
        sectionId,
      }),
    );
  const liveItemIds = refs.itemIds.filter((id) => UUID.test(id));
  for (const itemId of refs.itemIds.filter((id) => !UUID.test(id)))
    issues.push(
      issue("item-not-found", "이 판본에 없는 배치입니다.", {
        itemId,
        sectionId,
      }),
    );
  const items = liveItemIds.length
    ? await tx.query<{ id: string; sectionId: string | null }>(
        `SELECT "id", "section_id" AS "sectionId" FROM "textbook_item"
          WHERE "edition_id" = $1::uuid AND "id" IN (SELECT value::uuid FROM jsonb_array_elements_text($2::jsonb))`,
        [editionId, JSON.stringify(liveItemIds)],
      )
    : [];
  const itemById = new Map(items.map((item) => [item.id, item]));
  for (const itemId of new Set(liveItemIds)) {
    const item = itemById.get(itemId);
    if (!item)
      issues.push(
        issue("item-not-found", "이 판본에 없는 배치입니다.", {
          itemId,
          sectionId,
        }),
      );
    else if (item.sectionId !== null && item.sectionId !== sectionId)
      issues.push(
        issue(
          "item-in-other-section",
          "다른 구획에 놓인 배치입니다. 그 구획에서 먼저 빼 주세요.",
          {
            itemId,
            sectionId,
          },
        ),
      );
  }

  for (const conceptKey of duplicates(refs.placedConcepts))
    issues.push(
      issue(
        "duplicate-concept",
        `같은 개념이 한 구획에 두 번 놓였습니다: ${conceptKey}`,
        { sectionId },
      ),
    );
  const conceptKeys = [
    ...new Set([...refs.placedConcepts, ...refs.referencedConcepts]),
  ];
  const concepts = conceptKeys.length
    ? await tx.query<{ conceptKey: string; sectionId: string | null }>(
        `SELECT "concept_key" AS "conceptKey", "section_id" AS "sectionId" FROM "textbook_concept"
          WHERE "edition_id" = $1::uuid AND "concept_key" IN (SELECT value FROM jsonb_array_elements_text($2::jsonb))`,
        [editionId, JSON.stringify(conceptKeys)],
      )
    : [];
  const conceptByKey = new Map(
    concepts.map((concept) => [concept.conceptKey, concept]),
  );
  for (const conceptKey of conceptKeys) {
    const concept = conceptByKey.get(conceptKey);
    if (!concept)
      issues.push(
        issue("concept-not-found", `이 판본에 없는 개념입니다: ${conceptKey}`, {
          sectionId,
        }),
      );
    else if (
      refs.placedConcepts.includes(conceptKey) &&
      concept.sectionId !== null &&
      concept.sectionId !== sectionId
    )
      issues.push(
        issue(
          "concept-in-other-section",
          `다른 구획에 놓인 개념입니다: ${conceptKey}`,
          { sectionId },
        ),
      );
  }

  const validAssets = refs.assetIds.filter((id) => SHA256.test(id));
  const owned = validAssets.length
    ? await tx.query<{ id: string }>(
        `SELECT "id" FROM "textbook_asset"
          WHERE "user_id" = $1::uuid AND "id" IN (SELECT value FROM jsonb_array_elements_text($2::jsonb))`,
        [actor.id, JSON.stringify(validAssets)],
      )
    : [];
  const ownedIds = new Set(owned.map((asset) => asset.id));
  for (const assetId of refs.assetIds)
    if (!ownedIds.has(assetId))
      issues.push(
        issue(
          "asset-not-found",
          `올리지 않은 그림입니다: ${assetId.slice(0, 12)}`,
          { sectionId },
        ),
      );

  if (issues.length) throw invalid("구획의 참조가 올바르지 않습니다.", issues);
  return refs;
}

/** 블록 순서대로 배치 · 개념의 자리를 맞추고, 원고가 쓰는 자산을 판본의 읽기 범위에 올린다 */
async function syncPlacements(
  tx: TextbookSql,
  actor: TextbookActor,
  editionId: string,
  sectionId: string,
  unitKey: string,
  refs: ReturnType<typeof blockReferences>,
): Promise<void> {
  const itemIds = JSON.stringify(refs.itemIds);
  await tx.execute(
    `UPDATE "textbook_item" SET "section_id" = NULL, "updated_at" = ${SQL_NOW}
      WHERE "edition_id" = $1::uuid AND "section_id" = $2::uuid
        AND "id" NOT IN (SELECT value::uuid FROM jsonb_array_elements_text($3::jsonb))`,
    [editionId, sectionId, itemIds],
  );
  if (refs.itemIds.length)
    await tx.execute(
      `UPDATE "textbook_item" i SET "section_id" = $2::uuid, "unit_key" = $3::text, "order_index" = v.ord, "updated_at" = ${SQL_NOW}
         FROM (SELECT value::uuid AS id, (ordinality - 1)::int AS ord
                 FROM jsonb_array_elements_text($4::jsonb) WITH ORDINALITY) v
        WHERE i."id" = v.id AND i."edition_id" = $1::uuid
          AND (i."section_id" IS DISTINCT FROM $2::uuid OR i."order_index" <> v.ord OR i."unit_key" <> $3::text)`,
      [editionId, sectionId, unitKey, itemIds],
    );
  const placed = JSON.stringify(refs.placedConcepts);
  await tx.execute(
    `UPDATE "textbook_concept" SET "section_id" = NULL, "updated_at" = ${SQL_NOW}
      WHERE "edition_id" = $1::uuid AND "section_id" = $2::uuid
        AND "concept_key" NOT IN (SELECT value FROM jsonb_array_elements_text($3::jsonb))`,
    [editionId, sectionId, placed],
  );
  if (refs.placedConcepts.length)
    await tx.execute(
      `UPDATE "textbook_concept" SET "section_id" = $2::uuid, "unit_key" = $3::text, "updated_at" = ${SQL_NOW}
        WHERE "edition_id" = $1::uuid AND "concept_key" IN (SELECT value FROM jsonb_array_elements_text($4::jsonb))
          AND ("section_id" IS DISTINCT FROM $2::uuid OR "unit_key" <> $3::text)`,
      [editionId, sectionId, unitKey, placed],
    );
  if (refs.assetIds.length)
    await tx.execute(
      `INSERT INTO "textbook_edition_asset" ("edition_id", "user_id", "asset_id")
       SELECT $1::uuid, $2::uuid, value FROM jsonb_array_elements_text($3::jsonb)
       ON CONFLICT DO NOTHING`,
      [editionId, actor.id, JSON.stringify(refs.assetIds)],
    );
}

export interface SaveSectionInput {
  /** 0 = 새 구획(주소의 id 로 만든다) */
  expectedRevision: number;
  unitKey: string;
  section: Section;
}

export interface SaveSectionResult {
  section: TextbookSectionRecord;
  aggregateRevision: number;
}

export async function saveSection(
  db: TextbookDb,
  actor: TextbookActor,
  editionId: string,
  sectionId: string,
  key: RequestKey,
  input: SaveSectionInput,
): Promise<SaveSectionResult & { replayed: boolean }> {
  const content = JSON.stringify(sectionContent(input.section));
  if (Buffer.byteLength(content) > SECTION_MAX_BYTES)
    throw new TextbookError(
      413,
      "PAYLOAD_TOO_LARGE",
      "구획 하나의 원고가 너무 큽니다. 구획을 나눠 주세요.",
    );
  return db.transaction(async (tx) => {
    const { result, replayed } = await runOnce<SaveSectionResult>(
      tx,
      key,
      async () => {
        await requireOwnedDraft(tx, actor, editionId);
        const current = await loadSection(tx, editionId, sectionId);
        const siblings = await tx.query<{
          id: string;
          unitKey: string;
          sectionKey: string;
        }>(
          `SELECT "id", "unit_key" AS "unitKey", "section_key" AS "sectionKey" FROM "textbook_section"
          WHERE "edition_id" = $1::uuid`,
          [editionId],
        );
        const keyTaken = siblings.some(
          (sibling) =>
            sibling.id !== sectionId &&
            sibling.unitKey === input.unitKey &&
            sibling.sectionKey === input.section.sectionKey,
        );

        if (input.expectedRevision === 0) {
          if (current)
            throw revisionMismatch("구획", current.revision, {
              serverSection: toRecord(current),
            });
          const [elsewhere] = await tx.query<{ id: string }>(
            `SELECT "id" FROM "textbook_section" WHERE "id" = $1::uuid`,
            [sectionId],
          );
          if (elsewhere)
            throw conflict(
              "이미 쓰인 구획 번호입니다. 새 번호로 다시 만들어 주세요.",
            );
          const { outline } = await editionStructure(tx, editionId);
          if (!outline.units.some((unit) => unit.unitKey === input.unitKey))
            throw invalid("목차에 없는 단원입니다. 단원을 먼저 만들어 주세요.");
          if (siblings.length >= EDITION_MAX_SECTIONS)
            throw invalid(
              `한 판본의 구획은 ${EDITION_MAX_SECTIONS}개까지입니다.`,
            );
          if (keyTaken)
            throw conflict("이 단원에 같은 구획 열쇠가 이미 있습니다.");
        } else {
          if (!current) throw notFound("구획");
          if (current.revision !== input.expectedRevision)
            throw revisionMismatch("구획", current.revision, {
              serverSection: toRecord(current),
            });
          if (current.unitKey !== input.unitKey)
            throw invalid("구획의 단원은 목차에서 옮깁니다.");
          if (keyTaken)
            throw conflict("이 단원에 같은 구획 열쇠가 이미 있습니다.");
        }

        const refs = await checkReferences(
          tx,
          actor,
          editionId,
          sectionId,
          input.section.blocks,
        );

        if (input.expectedRevision === 0) {
          await tx.execute(
            `INSERT INTO "textbook_section" ("id", "edition_id", "unit_key", "section_key", "order_index", "title",
                                           "template_key", "start_policy", "content", "updated_at")
           SELECT $1::uuid, $2::uuid, $3::text, $4::text, COALESCE(MAX("order_index") + 1, 0), $5::text, $6::text, $7::text, $8::jsonb, ${SQL_NOW}
             FROM "textbook_section" WHERE "edition_id" = $2::uuid AND "unit_key" = $3::text`,
            [
              sectionId,
              editionId,
              input.unitKey,
              input.section.sectionKey,
              input.section.title,
              input.section.templateKey,
              input.section.startPolicy,
              content,
            ],
          );
          await bumpStructure(tx, editionId);
        } else {
          const updated = await tx.execute(
            `UPDATE "textbook_section" SET "section_key" = $4::text, "title" = $5::text, "template_key" = $6::text, "start_policy" = $7::text,
                  "content" = $8::jsonb, "revision" = "revision" + 1, "updated_at" = ${SQL_NOW}
            WHERE "id" = $1::uuid AND "edition_id" = $2::uuid AND "revision" = $3::int`,
            [
              sectionId,
              editionId,
              input.expectedRevision,
              input.section.sectionKey,
              input.section.title,
              input.section.templateKey,
              input.section.startPolicy,
              content,
            ],
          );
          if (updated !== 1) throw revisionMismatch("구획", current!.revision);
        }
        await syncPlacements(
          tx,
          actor,
          editionId,
          sectionId,
          input.unitKey,
          refs,
        );

        const saved = await loadSection(tx, editionId, sectionId);
        return {
          section: toRecord(saved!),
          aggregateRevision: await aggregateRevision(tx, editionId),
        };
      },
    );
    return { ...result, replayed };
  });
}

/**
 * 구획 지우기 — 그 구획의 배치 · 개념은 구획 밖으로 나간다(같이 지우지 않는다).
 */
export async function deleteSection(
  db: TextbookDb,
  actor: TextbookActor,
  editionId: string,
  sectionId: string,
  key: RequestKey,
  input: { expectedRevision: number },
): Promise<{ edition: TextbookEditionDetail; replayed: boolean }> {
  return db.transaction(async (tx) => {
    const { replayed } = await runOnce(tx, key, async () => {
      await requireOwnedDraft(tx, actor, editionId);
      const current = await loadSection(tx, editionId, sectionId);
      if (!current) throw notFound("구획");
      if (current.revision !== input.expectedRevision)
        throw revisionMismatch("구획", current.revision, {
          serverSection: toRecord(current),
        });
      for (const table of ["textbook_item", "textbook_concept"])
        await tx.execute(
          `UPDATE "${table}" SET "section_id" = NULL, "updated_at" = ${SQL_NOW}
            WHERE "edition_id" = $1::uuid AND "section_id" = $2::uuid`,
          [editionId, sectionId],
        );
      await tx.execute(
        `DELETE FROM "textbook_section" WHERE "id" = $1::uuid AND "edition_id" = $2::uuid`,
        [sectionId, editionId],
      );
      await bumpStructure(tx, editionId);
      return { sectionId };
    });
    return { edition: await getEditionDetail(tx, actor, editionId), replayed };
  });
}
