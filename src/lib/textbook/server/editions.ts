/**
 * 판본의 설정 · 목차 — 읽기와 `structureRevision` CAS 저장.
 *
 * 목차가 정하는 것은 **단원의 머리말과 차례, 그리고 구획의 차례**다. 구획의 제목 · 내용은 구획 저장이 정한다 —
 * 목차에 실려 온 구획의 `title` · `sectionKey` · `revision` 은 화면이 보던 값일 뿐 여기서 쓰지 않는다
 * (낡은 목차가 구획 제목을 되돌리지 않게).
 */
import type {
  TextbookEditionDetail,
  TextbookOutlineUnit,
} from "@/contracts/textbook.contract";
import type { TextbookConfig } from "@/contracts/textbookExchange.contract";

import {
  type EditionAccessRow,
  type TextbookActor,
  requireOwnedDraft,
  requireReadableEdition,
} from "../access";
import { bookSummary } from "./books";
import { invalid, issue, revisionMismatch } from "./errors";
import { type RequestKey, runOnce } from "./requests";
import { type TextbookDb, type TextbookSql, SQL_NOW } from "./sql";

/** 판본 `outline` 칸의 모양 — 단원의 머리말만 든다. 구획은 구획 표에 있다 */
export type OutlineUnitMeta = Omit<TextbookOutlineUnit, "sections">;
export interface StoredOutline {
  units: OutlineUnitMeta[];
}

export interface SectionSummaryRow {
  id: string;
  unitKey: string;
  sectionKey: string;
  title: string;
  revision: number;
  orderIndex: number;
}

export async function sectionSummaries(
  sql: TextbookSql,
  editionId: string,
): Promise<SectionSummaryRow[]> {
  return sql.query<SectionSummaryRow>(
    `SELECT "id", "unit_key" AS "unitKey", "section_key" AS "sectionKey", "title", "revision", "order_index" AS "orderIndex"
       FROM "textbook_section" WHERE "edition_id" = $1::uuid ORDER BY "unit_key", "order_index", "id"`,
    [editionId],
  );
}

export async function editionStructure(
  sql: TextbookSql,
  editionId: string,
): Promise<{ config: TextbookConfig; outline: StoredOutline }> {
  const [row] = await sql.query<{
    config: TextbookConfig;
    outline: StoredOutline;
  }>(
    `SELECT "config", "outline" FROM "textbook_edition" WHERE "id" = $1::uuid`,
    [editionId],
  );
  return row!;
}

function detail(
  access: EditionAccessRow,
  book: TextbookEditionDetail["book"],
  config: TextbookConfig,
  outline: StoredOutline,
  sections: SectionSummaryRow[],
): TextbookEditionDetail {
  const known = new Set(outline.units.map((unit) => unit.unitKey));
  return {
    book,
    edition: {
      editionId: access.editionId,
      label: access.label,
      status: access.status,
      revision: access.revision,
      publishedAt: access.publishedAt,
      manifestHash: access.manifestHash,
    },
    structureRevision: access.structureRevision,
    config,
    outline: outline.units.map((unit) => ({
      ...unit,
      sections: sections
        .filter((section) => section.unitKey === unit.unitKey)
        .map(({ id, sectionKey, title, revision }) => ({
          id,
          sectionKey,
          title,
          revision,
        })),
    })),
    // 목차에 없는 단원에 매달린 구획은 화면에 안 보인다 — 숨기지 않고 알린다
    issues: sections
      .filter((section) => !known.has(section.unitKey))
      .map((section) =>
        issue(
          "section-without-unit",
          `구획 «${section.title}»의 단원(${section.unitKey})이 목차에 없습니다.`,
          { sectionId: section.id, path: ["outline"] },
        ),
      ),
  };
}

export async function getEditionDetail(
  sql: TextbookSql,
  actor: TextbookActor,
  editionId: string,
): Promise<TextbookEditionDetail> {
  const access = await requireReadableEdition(sql, actor, editionId);
  const [book, structure, sections] = [
    await bookSummary(sql, actor, access.bookId),
    await editionStructure(sql, editionId),
    await sectionSummaries(sql, editionId),
  ];
  return detail(access, book, structure.config, structure.outline, sections);
}

export interface SaveStructureInput {
  expectedRevision: number;
  config: TextbookConfig;
  outline: TextbookOutlineUnit[];
}

/**
 * 설정 · 목차 저장. 구획을 만들거나 지우지 않는다(구획 저장 · 삭제가 한다) — 목차의 구획 목록은 지금 있는 구획과
 * **정확히 같은 집합**이어야 한다. 빠지거나 모르는 id 가 있으면 낡은 화면이므로 거절한다.
 * 구획은 단원 안에서도, 단원 사이로도 옮길 수 있다. 옮기면 그 구획의 배치 · 개념이 단원 열쇠를 따라간다.
 */
export async function saveStructure(
  db: TextbookDb,
  actor: TextbookActor,
  editionId: string,
  key: RequestKey,
  input: SaveStructureInput,
): Promise<{ edition: TextbookEditionDetail; replayed: boolean }> {
  return db.transaction(async (tx) => {
    const { replayed } = await runOnce(tx, key, async () => {
      const access = await requireOwnedDraft(tx, actor, editionId);
      if (access.structureRevision !== input.expectedRevision)
        throw revisionMismatch("목차", access.structureRevision);
      if (input.config.bookId !== access.bookId)
        throw invalid("설정의 교재 번호가 이 교재와 다릅니다.");

      const unitKeys = input.outline.map((unit) => unit.unitKey);
      if (new Set(unitKeys).size !== unitKeys.length)
        throw invalid("단원 열쇠가 겹칩니다.");
      const existing = await sectionSummaries(tx, editionId);
      const placed = input.outline.flatMap((unit) =>
        unit.sections.map((section, orderIndex) => ({
          id: section.id,
          unitKey: unit.unitKey,
          orderIndex,
        })),
      );
      const placedIds = new Set(placed.map((section) => section.id));
      if (
        placedIds.size !== placed.length ||
        placedIds.size !== existing.length ||
        existing.some((section) => !placedIds.has(section.id))
      )
        throw invalid(
          "목차의 구획 목록이 지금의 구획과 다릅니다. 다시 불러온 뒤 저장해 주세요.",
        );
      const byId = new Map(existing.map((section) => [section.id, section]));
      const finalKeys = placed.map(
        // 열쇠 글자에 `/` 는 없다(계약 `textbookKeySchema`)
        (section) => `${section.unitKey}/${byId.get(section.id)!.sectionKey}`,
      );
      if (new Set(finalKeys).size !== finalKeys.length)
        throw invalid("한 단원에 같은 구획 열쇠가 둘이 됩니다.");

      const moved = placed.filter(
        (section) => byId.get(section.id)!.unitKey !== section.unitKey,
      );
      if (moved.length) {
        // 두 구획이 단원을 맞바꾸면 (판본, 단원, 구획) 유일 색인에 잠깐 걸린다 — 임시 열쇠를 거쳐 옮긴다
        await tx.execute(
          `UPDATE "textbook_section" SET "unit_key" = '~moving:' || "id"::text
            WHERE "edition_id" = $1::uuid AND "id" IN (SELECT value::uuid FROM jsonb_array_elements_text($2::jsonb))`,
          [editionId, JSON.stringify(moved.map((section) => section.id))],
        );
      }
      await tx.execute(
        `UPDATE "textbook_section" s SET "unit_key" = r."unitKey", "order_index" = r."orderIndex", "updated_at" = ${SQL_NOW}
           FROM jsonb_to_recordset($2::jsonb) AS r("id" uuid, "unitKey" text, "orderIndex" int)
          WHERE s."id" = r."id" AND s."edition_id" = $1::uuid
            AND (s."unit_key" <> r."unitKey" OR s."order_index" <> r."orderIndex")`,
        [editionId, JSON.stringify(placed)],
      );
      if (moved.length) {
        for (const table of ["textbook_item", "textbook_concept"])
          await tx.execute(
            `UPDATE "${table}" c SET "unit_key" = s."unit_key", "updated_at" = ${SQL_NOW}
               FROM "textbook_section" s
              WHERE c."edition_id" = $1::uuid AND s."id" = c."section_id" AND c."unit_key" <> s."unit_key"`,
            [editionId],
          );
      }

      const outline: StoredOutline = {
        units: input.outline.map((unit) => ({
          unitKey: unit.unitKey,
          title: unit.title,
          sourceUnitIds: unit.sourceUnitIds,
          prerequisites: unit.prerequisites,
          goals: unit.goals,
          conceptLectureRefs: unit.conceptLectureRefs,
        })),
      };
      // 판본 행을 직접 고치는 문장이라 트리거가 올려 주지 않는다 — 집계 revision 을 여기서 같이 올린다
      await tx.execute(
        `UPDATE "textbook_edition" SET "config" = $2::jsonb, "outline" = $3::jsonb,
                "structure_revision" = "structure_revision" + 1, "revision" = "revision" + 1, "updated_at" = ${SQL_NOW}
          WHERE "id" = $1::uuid AND "status" = 'draft'`,
        [editionId, JSON.stringify(input.config), JSON.stringify(outline)],
      );
      // 목록이 보여 주는 권 · 학기는 지금 초안의 설정을 따른다(목록 제목은 따로다)
      await tx.execute(
        `UPDATE "textbook" SET "school_level" = $2::text, "grade" = $3::int, "semester" = $4::int, "volume" = $5::int,
                "volume_count" = $6::int, "display_code" = $7::text, "updated_at" = ${SQL_NOW} WHERE "id" = $1::uuid`,
        [
          access.bookId,
          input.config.schoolLevel,
          input.config.grade,
          input.config.semester,
          input.config.volume,
          input.config.volumeCount,
          input.config.displayCode,
        ],
      );
      return { editionId };
    });
    return { edition: await getEditionDetail(tx, actor, editionId), replayed };
  });
}

/** 구획을 만들거나 지울 때 — 목차의 CAS 값을 올린다(구획 목록이 바뀌었다) */
export async function bumpStructure(
  tx: TextbookSql,
  editionId: string,
): Promise<void> {
  await tx.execute(
    `UPDATE "textbook_edition" SET "structure_revision" = "structure_revision" + 1, "updated_at" = ${SQL_NOW}
      WHERE "id" = $1::uuid AND "status" = 'draft'`,
    [editionId],
  );
}

export async function aggregateRevision(
  sql: TextbookSql,
  editionId: string,
): Promise<number> {
  const [row] = await sql.query<{ revision: number }>(
    `SELECT "revision" FROM "textbook_edition" WHERE "id" = $1::uuid`,
    [editionId],
  );
  return row!.revision;
}
