/**
 * 책과 판본 만들기 — 목록 · 새 책 · 목록 제목/공유/보관 · 새 판본(빈 초안 또는 기존판 복제).
 * 범위 판정은 `../access.ts` 한 곳에서 온다.
 */
import { randomUUID } from "node:crypto";

import type {
  TextbookBookSummary,
  TextbookEditionDetail,
} from "@/contracts/textbook.contract";
import type {
  ManuscriptBlock,
  TextbookConfig,
} from "@/contracts/textbookExchange.contract";
import {
  textbookCanonicalizationVersion,
  textbookVersion,
} from "@/contracts/textbookPrimitives.contract";

import {
  type TextbookActor,
  READABLE_BOOKS_WHERE,
  requireOwnedBook,
} from "../access";
import { remapSemanticRefs } from "../semanticRefs";
import { getEditionDetail } from "./editions";
import { conflict, invalid, notFound } from "./errors";
import { type RequestKey, runOnce } from "./requests";
import { type TextbookDb, type TextbookSql, SQL_NOW, isoColumn } from "./sql";

/** 초안이 처음 갖는 렌더러 · 템플릿 판 — 발행 예약 때 실제 조판기의 판으로 다시 적는다 */
export const DRAFT_RENDERER_VERSION = "injaewon.textbook.renderer.v1";
export const DRAFT_TEMPLATE_VERSION = "injaewon.textbook.template.v1";

const BOOK_SUMMARY_SQL = `
  SELECT t."id", t."user_id" AS "ownerId", o."name" AS "ownerName", t."title", t."visibility",
         t."shared_branch_id" AS "sharedBranchId", ${isoColumn(`t."archived_at"`)} AS "archivedAt",
         ${isoColumn(`t."created_at"`)} AS "createdAt", ${isoColumn(`t."updated_at"`)} AS "updatedAt",
         (SELECT d."id" FROM "textbook_edition" d WHERE d."textbook_id" = t."id" AND d."status" = 'draft') AS "draftEditionId",
         (SELECT p."id" FROM "textbook_edition" p WHERE p."textbook_id" = t."id" AND p."status" = 'published'
           ORDER BY p."ordinal" DESC LIMIT 1) AS "latestPublishedEditionId"
    FROM "textbook" t JOIN "user" o ON o."id" = t."user_id"`;

type BookSummaryRow = Omit<TextbookBookSummary, "isOwner">;

/** 남의 책이면 초안의 존재를 알리지 않는다 — 공유되는 것은 발행본뿐이다 */
function toSummary(
  row: BookSummaryRow,
  actor: TextbookActor,
): TextbookBookSummary {
  const isOwner = row.ownerId === actor.id;
  return {
    ...row,
    isOwner,
    draftEditionId: isOwner ? row.draftEditionId : null,
  };
}

export async function listBooks(
  sql: TextbookSql,
  actor: TextbookActor,
): Promise<TextbookBookSummary[]> {
  const rows = await sql.query<BookSummaryRow>(
    `${BOOK_SUMMARY_SQL} WHERE ${READABLE_BOOKS_WHERE} ORDER BY t."updated_at" DESC, t."id" LIMIT 1000`,
    [actor.id, actor.branchId],
  );
  return rows.map((row) => toSummary(row, actor));
}

export async function bookSummary(
  sql: TextbookSql,
  actor: TextbookActor,
  bookId: string,
): Promise<TextbookBookSummary> {
  const rows = await sql.query<BookSummaryRow>(
    `${BOOK_SUMMARY_SQL} WHERE t."id" = $3::uuid AND ${READABLE_BOOKS_WHERE}`,
    [actor.id, actor.branchId, bookId],
  );
  if (!rows[0]) throw notFound("교재");
  return toSummary(rows[0], actor);
}

async function insertEdition(
  tx: TextbookSql,
  input: {
    editionId: string;
    bookId: string;
    userId: string;
    ordinal: number;
    label: string;
    config: TextbookConfig;
    outline: unknown;
    derivedFromEditionId: string | null;
  },
): Promise<void> {
  await tx.execute(
    `INSERT INTO "textbook_edition" ("id", "textbook_id", "user_id", "ordinal", "label", "schema_version", "c14n_version",
        "config", "outline", "renderer_version", "template_version", "derived_from_edition_id", "updated_at")
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4::int, $5::text, $6::text, $7::text, $8::jsonb, $9::jsonb, $10::text, $11::text, $12::uuid, ${SQL_NOW})`,
    [
      input.editionId,
      input.bookId,
      input.userId,
      input.ordinal,
      input.label,
      textbookVersion,
      textbookCanonicalizationVersion,
      JSON.stringify(input.config),
      JSON.stringify(input.outline),
      DRAFT_RENDERER_VERSION,
      DRAFT_TEMPLATE_VERSION,
      input.derivedFromEditionId,
    ],
  );
}

/**
 * 새 책 — 책과 1판 초안을 한 번에 만든다.
 * `config.bookId` 는 서버가 지은 책 id 로 **바꿔 적는다**(화면이 보낸 값은 자리 표시다 — id 는 서버가 짓는다).
 */
export async function createBook(
  db: TextbookDb,
  actor: TextbookActor,
  key: RequestKey,
  input: { config: TextbookConfig },
): Promise<{ book: TextbookBookSummary; replayed: boolean }> {
  return db.transaction(async (tx) => {
    const { result, replayed } = await runOnce(tx, key, async () => {
      const bookId = randomUUID();
      const config: TextbookConfig = { ...input.config, bookId };
      await tx.execute(
        `INSERT INTO "textbook" ("id", "user_id", "school_level", "grade", "semester", "volume", "volume_count",
                                 "display_code", "title", "updated_at")
         VALUES ($1::uuid, $2::uuid, $3::text, $4::int, $5::int, $6::int, $7::int, $8::text, $9::text, ${SQL_NOW})`,
        [
          bookId,
          actor.id,
          config.schoolLevel,
          config.grade,
          config.semester,
          config.volume,
          config.volumeCount,
          config.displayCode,
          config.title,
        ],
      );
      await insertEdition(tx, {
        editionId: randomUUID(),
        bookId,
        userId: actor.id,
        ordinal: 1,
        label: "1판",
        config,
        outline: { units: [] },
        derivedFromEditionId: null,
      });
      return { bookId };
    });
    return { book: await bookSummary(tx, actor, result.bookId), replayed };
  });
}

export interface UpdateBookInput {
  title?: string;
  archived?: boolean;
  visibility?: "private" | "branch";
  sharedBranchId?: string | null;
}

/**
 * 목록 제목 · 공유 · 보관. 공유는 **지금 내 지점**에만 켤 수 있다 — 다른 지점 id 를 적어 보내도 거절한다.
 * 원고의 제목은 판본 config 에 있고 여기서 바뀌지 않는다.
 */
export async function updateBook(
  db: TextbookDb,
  actor: TextbookActor,
  bookId: string,
  key: RequestKey,
  input: UpdateBookInput,
): Promise<{ book: TextbookBookSummary; replayed: boolean }> {
  return db.transaction(async (tx) => {
    const { replayed } = await runOnce(tx, key, async () => {
      const book = await requireOwnedBook(tx, actor, bookId, { lock: true });
      let visibility = book.visibility;
      let sharedBranchId = book.sharedBranchId;
      if (input.visibility === "private") {
        visibility = "private";
        sharedBranchId = null;
      } else if (input.visibility === "branch") {
        const target =
          input.sharedBranchId === undefined
            ? actor.branchId
            : input.sharedBranchId;
        if (!actor.branchId || target !== actor.branchId)
          throw invalid("지금 소속된 지점에만 공유할 수 있습니다.");
        visibility = "branch";
        sharedBranchId = actor.branchId;
      } else if (input.sharedBranchId !== undefined) {
        throw invalid("공유 지점은 공개 범위와 함께 지정합니다.");
      }
      await tx.execute(
        `UPDATE "textbook" SET "title" = COALESCE($2::text, "title"), "visibility" = $3::text, "shared_branch_id" = $4::uuid,
                "archived_at" = CASE WHEN $5::boolean IS NULL THEN "archived_at"
                                     WHEN $5::boolean THEN COALESCE("archived_at", ${SQL_NOW}) ELSE NULL END,
                "updated_at" = ${SQL_NOW}
          WHERE "id" = $1::uuid`,
        [
          bookId,
          input.title ?? null,
          visibility,
          sharedBranchId,
          input.archived ?? null,
        ],
      );
      return { bookId };
    });
    return { book: await bookSummary(tx, actor, bookId), replayed };
  });
}

/**
 * 새 판본 — 책마다 초안은 하나다. 원본을 주면 그 **발행본**을 복제한다:
 * 구획 · 배치 · 개념 · 자산 색인은 새 줄로, 확정본은 **같은 행**을 가리킨다. 배치 id 가 바뀌므로 원고의 문제 블록도
 * 새 id 로 고쳐 적는다. QR · 쪽 · 굳은 개념 내용은 따라오지 않는다 — 새 판본은 발행할 때 새로 받는다.
 */
export async function createEdition(
  db: TextbookDb,
  actor: TextbookActor,
  bookId: string,
  key: RequestKey,
  input: { sourceEditionId?: string; label: string },
): Promise<{ edition: TextbookEditionDetail; replayed: boolean }> {
  return db.transaction(async (tx) => {
    const { result, replayed } = await runOnce(tx, key, async () => {
      await requireOwnedBook(tx, actor, bookId, { lock: true });
      const editions = await tx.query<{
        id: string;
        status: string;
        ordinal: number;
        config: TextbookConfig;
        outline: unknown;
      }>(
        `SELECT "id", "status", "ordinal", "config", "outline" FROM "textbook_edition"
          WHERE "textbook_id" = $1::uuid ORDER BY "ordinal"`,
        [bookId],
      );
      const draft = editions.find((edition) => edition.status === "draft");
      if (draft)
        throw conflict("이 교재에는 이미 초안이 있습니다.", {
          draftEditionId: draft.id,
        });
      const latest = editions.at(-1);
      if (!latest) throw notFound("판본");
      const source = input.sourceEditionId
        ? editions.find((edition) => edition.id === input.sourceEditionId)
        : null;
      if (input.sourceEditionId && !source) throw notFound("원본 판본");
      const editionId = randomUUID();
      await insertEdition(tx, {
        editionId,
        bookId,
        userId: actor.id,
        ordinal: latest.ordinal + 1,
        label: input.label,
        config: (source ?? latest).config,
        outline: source ? source.outline : { units: [] },
        derivedFromEditionId: source?.id ?? null,
      });
      if (source) await copyEditionChildren(tx, actor, source.id, editionId);
      return { editionId };
    });
    return {
      edition: await getEditionDetail(tx, actor, result.editionId),
      replayed,
    };
  });
}

async function copyEditionChildren(
  tx: TextbookSql,
  actor: TextbookActor,
  sourceId: string,
  targetId: string,
): Promise<void> {
  const sections = await tx.query<{
    id: string;
    unitKey: string;
    sectionKey: string;
    orderIndex: number;
    title: string;
    templateKey: string;
    startPolicy: string;
    content: { blocks: ManuscriptBlock[] };
  }>(
    `SELECT "id", "unit_key" AS "unitKey", "section_key" AS "sectionKey", "order_index" AS "orderIndex", "title",
            "template_key" AS "templateKey", "start_policy" AS "startPolicy", "content"
       FROM "textbook_section" WHERE "edition_id" = $1::uuid`,
    [sourceId],
  );
  const items = await tx.query<{ id: string; sectionId: string | null }>(
    `SELECT "id", "section_id" AS "sectionId" FROM "textbook_item"
      WHERE "edition_id" = $1::uuid AND "section_id" IS NOT NULL`,
    [sourceId],
  );
  const sectionIds = new Map(sections.map((s) => [s.id, randomUUID()]));
  const itemIds = new Map(items.map((i) => [i.id, randomUUID()]));

  // 구획 — 문제 블록의 배치 id 를 새 id 로
  const sectionRows = sections.map((section) => ({
    id: sectionIds.get(section.id)!,
    unit_key: section.unitKey,
    section_key: section.sectionKey,
    order_index: section.orderIndex,
    title: section.title,
    template_key: section.templateKey,
    start_policy: section.startPolicy,
    content: {
      ...section.content,
      blocks: section.content.blocks.map((block) => {
        const placed =
          block.kind === "problem" && itemIds.has(block.itemId)
            ? { ...block, itemId: itemIds.get(block.itemId)! }
            : block;
        // 구조 메타(예제 묶음 · 참조 항목)도 같은 새 id 를 가리켜야 역할 · 참조가 따라온다
        const semantic = remapSemanticRefs(placed.semantic, { itemIds });
        return semantic === placed.semantic ? placed : { ...placed, semantic };
      }),
    },
  }));
  if (sectionRows.length)
    await tx.execute(
      `INSERT INTO "textbook_section" ("id", "edition_id", "unit_key", "section_key", "order_index", "title",
                                       "template_key", "start_policy", "content", "updated_at")
       SELECT r."id", $1::uuid, r."unit_key", r."section_key", r."order_index", r."title", r."template_key",
              r."start_policy", r."content", ${SQL_NOW}
         FROM jsonb_to_recordset($2::jsonb) AS r("id" uuid, "unit_key" text, "section_key" text, "order_index" int,
              "title" text, "template_key" text, "start_policy" text, "content" jsonb)`,
      [targetId, JSON.stringify(sectionRows)],
    );
  // 배치 — 확정본은 같은 행. 쪽 · QR 은 따라오지 않는다
  const itemMap = [...itemIds].map(([from, to]) => ({
    from,
    to,
    section: sectionIds.get(items.find((i) => i.id === from)!.sectionId!)!,
  }));
  if (itemMap.length)
    await tx.execute(
      `INSERT INTO "textbook_item" ("id", "edition_id", "user_id", "snapshot_id", "link_status", "link_candidates",
            "source_test_id", "source_test_problem_id", "unit_key", "section_id", "learning_stage", "order_index",
            "layout", "video_required", "concept_keys", "derived_from_item_id", "display_number", "updated_at")
       SELECT m."to", $1::uuid, $2::uuid, i."snapshot_id", i."link_status", i."link_candidates", i."source_test_id",
              i."source_test_problem_id", i."unit_key", m."section", i."learning_stage", i."order_index", i."layout",
              i."video_required", i."concept_keys", i."id", i."display_number", ${SQL_NOW}
         FROM jsonb_to_recordset($3::jsonb) AS m("from" uuid, "to" uuid, "section" uuid)
         JOIN "textbook_item" i ON i."id" = m."from"`,
      [targetId, actor.id, JSON.stringify(itemMap)],
    );
  // 개념 — 연결과 원고는 따라오고 굳은 내용은 비운다(새 판본은 발행할 때 다시 굳는다).
  // 판본의 출처는 derived_from_edition_id 에 있다. 개념 열쇠는 바뀌지 않으므로
  // 판본 안의 파생 관계만 보존한다 — 자기 열쇠를 쓰면 자기 자신에서 파생된 개념이 된다.
  // 🔴 고른 백지 형식(`blank_forms`)도 **그대로** 따라온다 — 고른 것은 고른 대로, 고르지 않은 것(NULL)은 고르지 않은 채로.
  //    빠뜨리면 새 판본이 «형식을 고르지 않은 개념»이 되어 발행 때 다른 백지가 굳는다(2026-10-03 실제 API 검수에서 발견)
  const sectionMap = [...sectionIds].map(([from, to]) => ({ from, to }));
  await tx.execute(
    `INSERT INTO "textbook_concept" ("edition_id", "concept_key", "unit_key", "section_id", "title", "kind", "unit_id",
          "body", "blank_items", "blank_forms", "links", "mapping_version", "derived_from_concept_key", "updated_at")
     SELECT $1::uuid, c."concept_key", c."unit_key", m."to", c."title", c."kind", c."unit_id", c."body", c."blank_items",
            c."blank_forms", c."links", c."mapping_version", c."derived_from_concept_key", ${SQL_NOW}
       FROM "textbook_concept" c
       LEFT JOIN jsonb_to_recordset($3::jsonb) AS m("from" uuid, "to" uuid) ON m."from" = c."section_id"
      WHERE c."edition_id" = $2::uuid`,
    [targetId, sourceId, JSON.stringify(sectionMap)],
  );
  await tx.execute(
    `INSERT INTO "textbook_edition_asset" ("edition_id", "user_id", "asset_id")
     SELECT $1::uuid, a."user_id", a."asset_id" FROM "textbook_edition_asset" a WHERE a."edition_id" = $2::uuid`,
    [targetId, sourceId],
  );
}
