/**
 * 배치 — 문항 담기(확정본 캡처) · 고치기 · 원문과 견주기 · 다시 캡처.
 *
 * 담기의 차례:
 *   ⑴ (트랜잭션 밖) 권한 · 문항 읽기 · **문항마다 출제 자격** · 그림 바이트 얼리기 — 느린 일은 잠금 없이 한다
 *   ⑵ (짧은 트랜잭션) 판본을 잠그고 집계 revision 을 견준 뒤 바이트 · 자산 · 확정본 · 배치를 넣고 구획에 문제 블록을 붙인다
 * 🔴 문제은행의 문항에는 주인이 없다(공용 풀) — `Problem.userId` 로 거르지 않는다. 거르는 것은 **출제 자격**이다
 *    (`problemIneligibleReason` — 자동 출제 · 담기 바구니와 같은 규칙). 걸린 문항은 사유와 함께 빼고, 임의로 풀지 않는다.
 * 🔴 시험지 표는 읽기만 한다. 내용 · 배점 · 순서를 건드리지 않는다.
 * 🔴 시험지 문항에 **확정본이 달려 있으면**(`test_problem.snapshot_id` — 교재에서 다시 출제한 시험지) 그 확정본을 싣는다.
 *    살아 있는 은행 문항의 내용 · 그림을 다시 읽지 않는다 — 그 시험지가 학생에게 나간 내용이 교재에 실려야 한다.
 *    은행 문항은 **자격과 정체**만 본다. 같은 주인이면 같은 확정본 줄을 쓰고, 다른 주인의 것이면 내 것으로 복제한다
 *    (내용 · 해시는 그대로 — 남의 확정본을 내 판본이 직접 가리키지 못한다: 같은 주인 복합 FK).
 * 🔴 `expectedRevision` 은 **판본 집계 revision** 이다(배치의 계약 모양에는 배치 자신의 revision 이 없다).
 */
import { randomUUID } from "node:crypto";

import type {
  ManuscriptBlock,
  TextbookItem,
} from "@/contracts/textbookExchange.contract";
import { textbookCanonicalizationVersion } from "@/contracts/textbookPrimitives.contract";
import { problemIneligibleReason } from "@/lib/problemEligibility";

import {
  type TextbookActor,
  requireOwnedDraft,
  requireOwnedEdition,
} from "../access";
import {
  type CapturedSnapshot,
  type FigureLoader,
  type ProblemSourceRow,
  captureProblemSnapshot,
} from "../snapshotFromProblem";
import { linkEditionAssets, putAsset } from "./blobs";
import { aggregateRevision } from "./editions";
import {
  TextbookError,
  conflict,
  invalid,
  notFound,
  revisionMismatch,
} from "./errors";
import { type RequestKey, runOnce } from "./requests";
import { SECTION_MAX_BYTES } from "./sections";
import {
  type TextbookDb,
  type TextbookSql,
  SQL_NOW,
  isoColumn,
  uuidList,
} from "./sql";

/** 한 번에 담는 문항 수 · 그림 바이트의 상한(한 요청이 서버리스 한도 안에서 끝나게) */
export const CAPTURE_MAX_PROBLEMS = 300;
export const CAPTURE_MAX_FIGURE_BYTES = 64 * 1024 * 1024;
export const EDITION_MAX_ITEMS = 2000;

export const DEFAULT_ITEM_LAYOUT: TextbookItem["layout"] = {
  columnSpan: 1,
  minWorkLines: 0,
  preferredWorkLines: 0,
  maxWorkLines: 0,
  keepTogether: true,
};
export const DEFAULT_LEARNING_STAGE: TextbookItem["learningStage"] = "basic";

export type CaptureSource =
  { kind: "test"; testId: string } | { kind: "problems"; problemIds: string[] };

export interface CaptureInput {
  expectedRevision: number;
  sectionId: string;
  source: CaptureSource;
}

export interface CaptureResult {
  items: TextbookItem[];
  excluded: Array<{ problemId: string; reason: string }>;
  aggregateRevision: number;
}

type ProblemRow = ProblemSourceRow & {
  pool: string;
  reviewStatus: string;
  directUseAllowed: boolean;
};

const PROBLEM_SQL = `
  SELECT p."id", p."problem_code" AS "problemCode", p."unit_id" AS "unitId", p."family_key" AS "familyKey",
         p."difficulty"::text AS "difficulty", p."problem_type" AS "problemType", p."question_type" AS "questionType",
         p."content", p."answer", p."solution", p."figure_svg" AS "figureSvg",
         to_jsonb(p."figure_urls") AS "figureUrls", to_jsonb(p."figure_dims") AS "figureDims",
         to_jsonb(p."figure_source_mm") AS "figureSourceMm", to_jsonb(p."choice_figure_index") AS "choiceFigureIndex",
         p."score", ${isoColumn(`p."updated_at"`)} AS "updatedAt",
         p."pool"::text AS "pool", p."review_status"::text AS "reviewStatus", p."direct_use_allowed" AS "directUseAllowed",
         u."grade" AS "unitGrade", u."chapter" AS "unitChapter", u."section" AS "unitSection"
    FROM "problem" p JOIN "unit" u ON u."id" = p."unit_id"`;

export async function loadProblemRows(
  sql: TextbookSql,
  problemIds: readonly string[],
): Promise<Map<string, ProblemRow>> {
  if (!problemIds.length) return new Map();
  const rows = await sql.query<ProblemRow>(
    `${PROBLEM_SQL} WHERE p."id" IN ${uuidList("$1")}`,
    [JSON.stringify([...new Set(problemIds)])],
  );
  return new Map(rows.map((row) => [row.id, row]));
}

interface SourceEntry {
  problemId: string;
  testId: string | null;
  testProblemId: string | null;
  /** 시험지 문항에 달린 확정본 — 있으면 살아 있는 문항 대신 이것을 싣는다 */
  frozenSnapshotId: string | null;
}

/** 담을 문항의 차례 — 시험지면 그 시험지의 문항 번호 순, 목록이면 받은 순서 그대로(겹쳐도 그대로) */
async function resolveSource(
  sql: TextbookSql,
  actor: TextbookActor,
  source: CaptureSource,
): Promise<SourceEntry[]> {
  if (source.kind === "problems")
    return source.problemIds.map((problemId) => ({
      problemId,
      testId: null,
      testProblemId: null,
      frozenSnapshotId: null,
    }));
  const [test] = await sql.query<{ userId: string }>(
    `SELECT "user_id" AS "userId" FROM "test" WHERE "id" = $1::uuid`,
    [source.testId],
  );
  // 내 시험지만 — 없는 것과 남의 것은 같은 404 다
  if (!test || test.userId !== actor.id) throw notFound("시험지");
  const rows = await sql.query<{
    id: string;
    problemId: string;
    frozenSnapshotId: string | null;
  }>(
    `SELECT "id", "problem_id" AS "problemId", "snapshot_id" AS "frozenSnapshotId" FROM "test_problem"
      WHERE "test_id" = $1::uuid ORDER BY "order_index", "id"`,
    [source.testId],
  );
  return rows.map((row) => ({
    problemId: row.problemId,
    testId: source.testId,
    testProblemId: row.id,
    frozenSnapshotId: row.frozenSnapshotId,
  }));
}

/** 이미 있는 확정본 한 줄 — 싣는 데 필요한 것만(주인 · 그 확정본이 쓰는 그림) */
interface FrozenSource {
  snapshotId: string;
  userId: string;
  assetIds: string[];
}

async function loadFrozenSources(
  sql: TextbookSql,
  snapshotIds: readonly string[],
): Promise<Map<string, FrozenSource>> {
  if (!snapshotIds.length) return new Map();
  const rows = await sql.query<FrozenSource>(
    `SELECT s."id" AS "snapshotId", s."user_id" AS "userId",
            COALESCE((SELECT jsonb_agg(DISTINCT f ->> 'assetId') FROM jsonb_array_elements(s."payload" -> 'figures') f),
                     '[]'::jsonb) AS "assetIds"
       FROM "textbook_problem_snapshot" s WHERE s."id" IN ${uuidList("$1")}`,
    [JSON.stringify([...new Set(snapshotIds)])],
  );
  return new Map(rows.map((row) => [row.snapshotId, row]));
}

/**
 * 남의 확정본을 내 것으로 복제한다 — 내용 · 원문 · 메타데이터 · 해시 · 캡처 시각까지 그대로, 주인만 나다.
 * 그림은 바이트를 다시 넣지 않는다(바이트 표는 내용 주소다) — 내 손잡이만 만든다.
 * 돌려주는 것: 원래 확정본 id → 내 확정본 id.
 */
async function cloneFrozenSnapshots(
  tx: TextbookSql,
  userId: string,
  sources: readonly FrozenSource[],
): Promise<Map<string, string>> {
  if (!sources.length) return new Map();
  for (const source of sources)
    await tx.execute(
      `INSERT INTO "textbook_asset" ("user_id", "id", "kind", "mime_type", "name", "width_px", "height_px")
       SELECT $1::uuid, a."id", a."kind", a."mime_type", a."name", a."width_px", a."height_px"
         FROM "textbook_asset" a
        WHERE a."user_id" = $2::uuid AND a."id" IN (SELECT value FROM jsonb_array_elements_text($3::jsonb))
       ON CONFLICT ("user_id", "id") DO NOTHING`,
      [userId, source.userId, JSON.stringify(source.assetIds)],
    );
  const ids = JSON.stringify(
    sources.map((source) => ({
      id: randomUUID(),
      sourceId: source.snapshotId,
    })),
  );
  await tx.execute(
    `INSERT INTO "textbook_problem_snapshot" ("id", "user_id", "source_system", "source_key", "source_ref", "problem_id",
        "source_updated_at", "captured_at", "unit_id", "family_key", "difficulty", "problem_type", "payload", "raw_source",
        "source_metadata", "content_hash", "snapshot_hash", "c14n_version")
     SELECT r."id", $1::uuid, s."source_system", s."source_key", s."source_ref", s."problem_id", s."source_updated_at",
            s."captured_at", s."unit_id", s."family_key", s."difficulty", s."problem_type", s."payload", s."raw_source",
            s."source_metadata", s."content_hash", s."snapshot_hash", s."c14n_version"
       FROM jsonb_to_recordset($2::jsonb) AS r("id" uuid, "sourceId" uuid)
       JOIN "textbook_problem_snapshot" s ON s."id" = r."sourceId"
     ON CONFLICT ("user_id", "source_key", "snapshot_hash") DO NOTHING`,
    [userId, ids],
  );
  // 방금 넣었든 전에 복제해 두었든, (나, 출처, 해시)가 같은 내 줄을 쓴다
  const rows = await tx.query<{ sourceId: string; id: string }>(
    `SELECT r."sourceId", mine."id"
       FROM jsonb_to_recordset($2::jsonb) AS r("sourceId" uuid)
       JOIN "textbook_problem_snapshot" s ON s."id" = r."sourceId"
       JOIN "textbook_problem_snapshot" mine
         ON mine."user_id" = $1::uuid AND mine."source_key" = s."source_key" AND mine."snapshot_hash" = s."snapshot_hash"`,
    [userId, ids],
  );
  return new Map(rows.map((row) => [row.sourceId, row.id]));
}

/**
 * 🔴 교환 형식의 `orderIndex` 는 **원고 전체에서의 차례**다(0부터, 목차의 단원 순 → 구획 순 → 구획 안의 차례).
 *    표의 `order_index` 는 구획 안의 차례라, 그대로 내면 구획이 둘일 때 0 이 둘이 된다 — 검증기가 «순서가 다르다»로 막고
 *    대응표의 줄 차례도 섞인다. 여기서 판본 전체에 번호를 매겨 낸다(`assembleExchange` 와 같은 차례).
 *    `$1` 은 판본 id 다.
 */
const ITEM_SQL = `
  SELECT i."id" AS "itemId", i."edition_id" AS "editionId", i."snapshot_id" AS "snapshotId", i."link_status" AS "linkStatus",
         i."source_test_id" AS "sourceTestId", i."source_test_problem_id" AS "sourceTestProblemId", i."unit_key" AS "unitKey",
         s."section_key" AS "sectionKey", i."learning_stage" AS "learningStage", i."display_number" AS "displayNumber",
         o."globalIndex" AS "orderIndex", i."order_index" AS "sectionOrder", i."layout", i."concept_keys" AS "conceptKeys",
         i."video_required" AS "videoRequired", q."id" AS "qrTargetId"
    FROM "textbook_item" i
    JOIN "textbook_section" s ON s."id" = i."section_id"
    JOIN (SELECT gi."id",
                 (row_number() OVER (ORDER BY COALESCE(u."ord", 2147483647), gs."order_index", gs."id",
                                              gi."order_index", gi."id") - 1)::int AS "globalIndex"
            FROM "textbook_item" gi
            JOIN "textbook_section" gs ON gs."id" = gi."section_id"
            JOIN "textbook_edition" ge ON ge."id" = gi."edition_id"
            LEFT JOIN LATERAL (SELECT x."ord" FROM jsonb_array_elements(ge."outline" -> 'units') WITH ORDINALITY AS x("value", "ord")
                                WHERE x."value" ->> 'unitKey' = gi."unit_key" LIMIT 1) u ON TRUE
           WHERE gi."edition_id" = $1::uuid) o ON o."id" = i."id"
    LEFT JOIN "textbook_qr_target" q ON q."edition_id" = i."edition_id" AND q."item_id" = i."id"
                                    AND q."kind" = 'item' AND q."state" = 'active'`;

type ItemRow = Omit<TextbookItem, "videoRequired" | "conceptKeys"> & {
  conceptKeys: string[];
  videoRequired: boolean | null;
  /** 구획 안의 차례 — 표시 번호가 비었을 때의 기본값에만 쓴다 */
  sectionOrder: number;
};

/** 표의 줄 → 교환 형식의 배치. `videoRequired` 는 덮어쓴 값이 있을 때만 싣는다(없는 칸을 기본값으로 채우지 않는다) */
export const toExchangeItem = (row: ItemRow): TextbookItem => {
  const { videoRequired, displayNumber, sectionOrder, ...rest } = row;
  return {
    ...rest,
    displayNumber: displayNumber ?? String(sectionOrder + 1),
    ...(videoRequired === null ? {} : { videoRequired }),
  };
};

/** 놓인 배치 전부 — 구획 밖으로 나간 배치는 교환 형식에 없다 */
export async function placedItems(
  sql: TextbookSql,
  editionId: string,
  itemIds?: readonly string[],
): Promise<TextbookItem[]> {
  const rows = await sql.query<ItemRow>(
    `${ITEM_SQL} WHERE i."edition_id" = $1::uuid${itemIds ? ` AND i."id" IN ${uuidList("$2")}` : ""}
      ORDER BY o."globalIndex"`,
    itemIds ? [editionId, JSON.stringify(itemIds)] : [editionId],
  );
  return rows.map(toExchangeItem);
}

export async function insertSnapshots(
  tx: TextbookSql,
  userId: string,
  snapshots: readonly CapturedSnapshot[],
): Promise<Map<string, string>> {
  const unique = [
    ...new Map(snapshots.map((s) => [s.snapshotHash, s])).values(),
  ];
  await tx.execute(
    `INSERT INTO "textbook_problem_snapshot" ("id", "user_id", "source_system", "source_key", "source_ref", "problem_id",
        "source_updated_at", "captured_at", "unit_id", "family_key", "difficulty", "problem_type", "payload", "raw_source",
        "source_metadata", "content_hash", "snapshot_hash", "c14n_version")
     SELECT r."id", $1::uuid, 'todays-math', r."sourceKey", r."sourceRef", r."problemId", r."sourceUpdatedAt"::timestamp,
            ${SQL_NOW}, r."unitId", r."familyKey", r."difficulty", r."problemType", r."payload", r."rawSource",
            r."sourceMetadata", r."contentHash", r."snapshotHash", $3::text
       FROM jsonb_to_recordset($2::jsonb) AS r("id" uuid, "sourceKey" text, "sourceRef" jsonb, "problemId" uuid,
            "sourceUpdatedAt" text, "unitId" uuid, "familyKey" text, "difficulty" text, "problemType" text,
            "payload" jsonb, "rawSource" jsonb, "sourceMetadata" jsonb, "contentHash" text, "snapshotHash" text)
     ON CONFLICT ("user_id", "source_key", "snapshot_hash") DO NOTHING`,
    [
      userId,
      JSON.stringify(
        unique.map((snapshot) => ({
          id: randomUUID(),
          sourceKey: `tm:${snapshot.source.problemId}`,
          sourceRef: snapshot.source,
          problemId: snapshot.source.problemId,
          sourceUpdatedAt: snapshot.sourceUpdatedAt,
          unitId: snapshot.unitId,
          familyKey: snapshot.familyKey,
          difficulty: snapshot.difficulty,
          problemType: snapshot.problemType,
          payload: snapshot.payload,
          rawSource: snapshot.rawSource,
          sourceMetadata: snapshot.sourceMetadata,
          contentHash: snapshot.contentHash,
          snapshotHash: snapshot.snapshotHash,
        })),
      ),
      textbookCanonicalizationVersion,
    ],
  );
  // 방금 넣었든 전에 있었든, (주인, 출처, 해시)가 같은 줄을 쓴다
  const rows = await tx.query<{ id: string; snapshotHash: string }>(
    `SELECT s."id", s."snapshot_hash" AS "snapshotHash" FROM "textbook_problem_snapshot" s
       JOIN jsonb_to_recordset($2::jsonb) AS r("sourceKey" text, "snapshotHash" text)
         ON r."sourceKey" = s."source_key" AND r."snapshotHash" = s."snapshot_hash"
      WHERE s."user_id" = $1::uuid`,
    [
      userId,
      JSON.stringify(
        unique.map((snapshot) => ({
          sourceKey: `tm:${snapshot.source.problemId}`,
          snapshotHash: snapshot.snapshotHash,
        })),
      ),
    ],
  );
  return new Map(rows.map((row) => [row.snapshotHash, row.id]));
}

/** 준비된 한 줄 — 새로 캡처한 것(`snapshot`)이거나 이미 있는 확정본(`frozen`)이다 */
type Prepared = Omit<SourceEntry, "frozenSnapshotId"> &
  ({ snapshot: CapturedSnapshot } | { frozen: FrozenSource });

/** ⑴ 잠금 밖의 준비 — 읽고 · 자격을 묻고 · 그림을 얼린다 */
async function prepareCapture(
  sql: TextbookSql,
  actor: TextbookActor,
  source: CaptureSource,
  loadFigure: FigureLoader,
): Promise<{ prepared: Prepared[]; excluded: CaptureResult["excluded"] }> {
  const ordered = await resolveSource(sql, actor, source);
  if (ordered.length === 0) throw invalid("담을 문항이 없습니다.");
  if (ordered.length > CAPTURE_MAX_PROBLEMS)
    throw invalid(
      `한 번에 담는 문항은 ${CAPTURE_MAX_PROBLEMS}개까지입니다. 나눠 담아 주세요.`,
    );
  const rows = await loadProblemRows(
    sql,
    ordered.map((entry) => entry.problemId),
  );
  const frozenSources = await loadFrozenSources(
    sql,
    ordered.flatMap((entry) =>
      entry.frozenSnapshotId ? [entry.frozenSnapshotId] : [],
    ),
  );
  const prepared: Prepared[] = [];
  const excluded: CaptureResult["excluded"] = [];
  const captured = new Map<
    string,
    Awaited<ReturnType<typeof captureProblemSnapshot>>
  >();
  let figureBytes = 0;
  for (const entry of ordered) {
    const row = rows.get(entry.problemId);
    if (!row) {
      excluded.push({
        problemId: entry.problemId,
        reason: "문항을 찾을 수 없습니다.",
      });
      continue;
    }
    // 시험지에 딸려 온 문항이라고 자격을 지나치지 않는다 — 문항마다 직접 묻는다
    const ineligible = problemIneligibleReason(row);
    if (ineligible) {
      excluded.push({ problemId: entry.problemId, reason: ineligible });
      continue;
    }
    const { frozenSnapshotId, ...place } = entry;
    if (frozenSnapshotId) {
      // 확정본이 달린 시험지 문항 — 은행 문항에서는 위의 자격만 보았다. 내용 · 그림은 확정본의 것이다
      const frozen = frozenSources.get(frozenSnapshotId);
      if (!frozen) {
        excluded.push({
          problemId: entry.problemId,
          reason: "시험지에 실린 확정본을 찾을 수 없습니다.",
        });
        continue;
      }
      prepared.push({ ...place, frozen });
      continue;
    }
    let outcome = captured.get(entry.problemId);
    if (!outcome) {
      outcome = await captureProblemSnapshot(row, loadFigure);
      captured.set(entry.problemId, outcome);
      if (outcome.ok)
        figureBytes += outcome.snapshot.assets.reduce(
          (sum, asset) => sum + asset.bytes.byteLength,
          0,
        );
      if (figureBytes > CAPTURE_MAX_FIGURE_BYTES)
        throw new TextbookError(
          413,
          "PAYLOAD_TOO_LARGE",
          "한 번에 담는 그림이 너무 큽니다. 나눠 담아 주세요.",
        );
    }
    if (!outcome.ok) {
      excluded.push({ problemId: entry.problemId, reason: outcome.reason });
      continue;
    }
    prepared.push({ ...place, snapshot: outcome.snapshot });
  }
  return { prepared, excluded };
}

export async function captureItems(
  db: TextbookDb,
  actor: TextbookActor,
  editionId: string,
  key: RequestKey,
  input: CaptureInput,
  loadFigure: FigureLoader,
): Promise<CaptureResult & { replayed: boolean }> {
  // 느린 준비 전에 가볍게 한 번 본다(권한 · 초안). 진짜 판정은 트랜잭션 안에서 잠그고 다시 한다
  const preview = await requireOwnedEdition(db, actor, editionId);
  if (preview.status !== "draft")
    throw conflict("발행한 판본은 고칠 수 없습니다. 새 판본을 만들어 주세요.");
  const { prepared, excluded } = await prepareCapture(
    db,
    actor,
    input.source,
    loadFigure,
  );

  return db.transaction(async (tx) => {
    const { result, replayed } = await runOnce<CaptureResult>(
      tx,
      key,
      async () => {
        const access = await requireOwnedDraft(tx, actor, editionId);
        if (access.revision !== input.expectedRevision)
          throw revisionMismatch("판본", access.revision);
        const [section] = await tx.query<{
          unitKey: string;
          content: { blocks: ManuscriptBlock[] };
        }>(
          `SELECT "unit_key" AS "unitKey", "content" FROM "textbook_section" WHERE "id" = $1::uuid AND "edition_id" = $2::uuid`,
          [input.sectionId, editionId],
        );
        if (!section) throw notFound("구획");
        if (!prepared.length)
          return { items: [], excluded, aggregateRevision: access.revision };

        // 새 배치는 구획의 **끝**에 선다 — 세어서가 아니라 지금의 마지막 차례 다음에(가져온 구획은 차례가 0부터가 아닐 수 있다)
        const [{ total, inSection, nextOrder }] = await tx.query<{
          total: number;
          inSection: number;
          nextOrder: number;
        }>(
          `SELECT count(*)::int AS total, count(*) FILTER (WHERE "section_id" = $2::uuid)::int AS "inSection",
                  COALESCE(MAX("order_index") FILTER (WHERE "section_id" = $2::uuid) + 1, 0)::int AS "nextOrder"
           FROM "textbook_item" WHERE "edition_id" = $1::uuid`,
          [editionId, input.sectionId],
        );
        if (total + prepared.length > EDITION_MAX_ITEMS)
          throw invalid(`한 판본의 문항은 ${EDITION_MAX_ITEMS}개까지입니다.`);

        const fresh = prepared.flatMap((entry) =>
          "snapshot" in entry ? [entry.snapshot] : [],
        );
        const frozen = [
          ...new Map(
            prepared.flatMap((entry) =>
              "frozen" in entry
                ? [[entry.frozen.snapshotId, entry.frozen] as const]
                : [],
            ),
          ).values(),
        ];
        const assets = new Map(
          fresh.flatMap((snapshot) =>
            snapshot.assets.map((asset) => [asset.assetId, asset] as const),
          ),
        );
        for (const asset of assets.values())
          await putAsset(tx, actor.id, asset, "figure");
        // 남의 확정본은 내 것으로 복제하고(그림 손잡이까지), 내 것은 그 줄을 그대로 쓴다
        const cloned = await cloneFrozenSnapshots(
          tx,
          actor.id,
          frozen.filter((source) => source.userId !== actor.id),
        );
        await linkEditionAssets(tx, editionId, actor.id, [
          ...new Set([
            ...assets.keys(),
            ...frozen.flatMap((source) => source.assetIds),
          ]),
        ]);
        const snapshotIds = await insertSnapshots(tx, actor.id, fresh);
        const snapshotIdOf = (entry: Prepared): string =>
          "snapshot" in entry
            ? snapshotIds.get(entry.snapshot.snapshotHash)!
            : entry.frozen.userId === actor.id
              ? entry.frozen.snapshotId
              : cloned.get(entry.frozen.snapshotId)!;

        const rows = prepared.map((entry, index) => ({
          id: randomUUID(),
          snapshotId: snapshotIdOf(entry),
          testId: entry.testId,
          testProblemId: entry.testProblemId,
          orderIndex: nextOrder + index,
          displayNumber: String(inSection + index + 1),
        }));
        await tx.execute(
          `INSERT INTO "textbook_item" ("id", "edition_id", "user_id", "snapshot_id", "link_status", "source_test_id",
              "source_test_problem_id", "unit_key", "section_id", "learning_stage", "order_index", "layout",
              "display_number", "updated_at")
         SELECT r."id", $1::uuid, $2::uuid, r."snapshotId", 'linked', r."testId", r."testProblemId", $3::text, $4::uuid, $5::text,
                r."orderIndex", $6::jsonb, r."displayNumber", ${SQL_NOW}
           FROM jsonb_to_recordset($7::jsonb) AS r("id" uuid, "snapshotId" uuid, "testId" uuid, "testProblemId" uuid,
                "orderIndex" int, "displayNumber" text)`,
          [
            editionId,
            actor.id,
            section.unitKey,
            input.sectionId,
            DEFAULT_LEARNING_STAGE,
            JSON.stringify(DEFAULT_ITEM_LAYOUT),
            JSON.stringify(rows),
          ],
        );

        // 자리의 원천은 블록 순서다 — 담은 차례대로 구획 끝에 문제 블록을 붙인다
        const blocks: ManuscriptBlock[] = [
          ...section.content.blocks,
          ...rows.map((row) => ({
            blockId: randomUUID(),
            kind: "problem" as const,
            itemId: row.id,
          })),
        ];
        const content = JSON.stringify({ ...section.content, blocks });
        if (Buffer.byteLength(content) > SECTION_MAX_BYTES)
          throw new TextbookError(
            413,
            "PAYLOAD_TOO_LARGE",
            "구획 하나의 원고가 너무 큽니다. 구획을 나눠 담아 주세요.",
          );
        await tx.execute(
          `UPDATE "textbook_section" SET "content" = $2::jsonb, "revision" = "revision" + 1, "updated_at" = ${SQL_NOW}
          WHERE "id" = $1::uuid`,
          [input.sectionId, content],
        );

        return {
          items: await placedItems(
            tx,
            editionId,
            rows.map((row) => row.id),
          ),
          excluded,
          aggregateRevision: await aggregateRevision(tx, editionId),
        };
      },
    );
    return { ...result, replayed };
  });
}

export interface UpdateItemInput {
  expectedRevision: number;
  learningStage?: TextbookItem["learningStage"];
  displayNumber?: string;
  layout?: TextbookItem["layout"];
  conceptKeys?: string[];
  videoRequired?: boolean;
}

/** 배치 고치기 — 단계 · 표시 번호 · 풀이선 · 영상 정책 · 개념 열쇠. 자리는 구획 저장이 정한다 */
export async function updateItem(
  db: TextbookDb,
  actor: TextbookActor,
  editionId: string,
  itemId: string,
  key: RequestKey,
  input: UpdateItemInput,
): Promise<{
  item: TextbookItem;
  aggregateRevision: number;
  replayed: boolean;
}> {
  return db.transaction(async (tx) => {
    const { result, replayed } = await runOnce(tx, key, async () => {
      const access = await requireOwnedDraft(tx, actor, editionId);
      if (access.revision !== input.expectedRevision)
        throw revisionMismatch("판본", access.revision);
      if (input.conceptKeys?.length) {
        if (new Set(input.conceptKeys).size !== input.conceptKeys.length)
          throw invalid("개념 열쇠가 겹칩니다.");
        const known = await tx.query<{ conceptKey: string }>(
          `SELECT "concept_key" AS "conceptKey" FROM "textbook_concept"
            WHERE "edition_id" = $1::uuid AND "concept_key" IN (SELECT value FROM jsonb_array_elements_text($2::jsonb))`,
          [editionId, JSON.stringify(input.conceptKeys)],
        );
        // 없는 열쇠를 조용히 빼지 않는다
        if (known.length !== input.conceptKeys.length)
          throw invalid("이 판본에 없는 개념을 가리킵니다.");
      }
      const updated = await tx.execute(
        `UPDATE "textbook_item" SET
                "learning_stage" = COALESCE($3::text, "learning_stage"),
                "display_number" = COALESCE($4::text, "display_number"),
                "layout" = COALESCE($5::jsonb, "layout"),
                "concept_keys" = COALESCE($6::jsonb, "concept_keys"),
                "video_required" = COALESCE($7::boolean, "video_required"),
                "revision" = "revision" + 1, "updated_at" = ${SQL_NOW}
          WHERE "id" = $1::uuid AND "edition_id" = $2::uuid AND "section_id" IS NOT NULL`,
        [
          itemId,
          editionId,
          input.learningStage ?? null,
          input.displayNumber ?? null,
          input.layout ? JSON.stringify(input.layout) : null,
          input.conceptKeys ? JSON.stringify(input.conceptKeys) : null,
          input.videoRequired ?? null,
        ],
      );
      if (updated !== 1) throw notFound("배치");
      const [item] = await placedItems(tx, editionId, [itemId]);
      return {
        item: item!,
        aggregateRevision: await aggregateRevision(tx, editionId),
      };
    });
    return { ...result, replayed };
  });
}

export type ItemDiffField =
  "content" | "answer" | "solution" | "questionType" | "figures";

export interface ItemDiff {
  itemId: string;
  /** 지금 은행 문항이 확정본과 다른가 */
  changed: boolean;
  /** 본문 · 정답 · 해설 · 그림이 다르다 */
  contentChanged: boolean;
  /** 내용은 같고 출처 메타데이터(단원 · 난도 · 배점 · 원본 그림 칸)만 다르다 */
  metadataChanged: boolean;
  /** 지금 문항을 다시 담을 수 없는 사유. 담을 수 있으면 null */
  blocked: string | null;
  fields: ItemDiffField[];
  summary: string;
}

interface ItemSnapshotRow {
  snapshotId: string;
  problemId: string | null;
  sourceSystem: string;
  contentHash: string;
  snapshotHash: string;
  payload: CapturedSnapshot["payload"];
}

async function loadItemSnapshot(
  sql: TextbookSql,
  editionId: string,
  itemId: string,
): Promise<ItemSnapshotRow> {
  const [row] = await sql.query<ItemSnapshotRow>(
    `SELECT s."id" AS "snapshotId", s."problem_id" AS "problemId", s."source_system" AS "sourceSystem",
            s."content_hash" AS "contentHash", s."snapshot_hash" AS "snapshotHash", s."payload"
       FROM "textbook_item" i JOIN "textbook_problem_snapshot" s ON s."id" = i."snapshot_id"
      WHERE i."id" = $1::uuid AND i."edition_id" = $2::uuid`,
    [itemId, editionId],
  );
  if (!row) throw notFound("배치");
  return row;
}

async function recaptured(
  sql: TextbookSql,
  current: ItemSnapshotRow,
  loadFigure: FigureLoader,
): Promise<{ blocked: string } | { snapshot: CapturedSnapshot }> {
  if (current.sourceSystem !== "todays-math")
    return { blocked: "은행 문항과 연결되지 않은 배치입니다." };
  if (!current.problemId) return { blocked: "원본 문항이 지워졌습니다." };
  const row = (await loadProblemRows(sql, [current.problemId])).get(
    current.problemId,
  );
  if (!row) return { blocked: "원본 문항을 찾을 수 없습니다." };
  const ineligible = problemIneligibleReason(row);
  if (ineligible) return { blocked: ineligible };
  const outcome = await captureProblemSnapshot(row, loadFigure);
  return outcome.ok
    ? { snapshot: outcome.snapshot }
    : { blocked: outcome.reason };
}

/** 확정본 ↔ 지금 은행 문항. 읽기만 한다 — 확정본도 은행도 바꾸지 않는다 */
export async function diffItem(
  sql: TextbookSql,
  actor: TextbookActor,
  editionId: string,
  itemId: string,
  loadFigure: FigureLoader,
): Promise<ItemDiff> {
  await requireOwnedEdition(sql, actor, editionId);
  const current = await loadItemSnapshot(sql, editionId, itemId);
  const next = await recaptured(sql, current, loadFigure);
  if ("blocked" in next)
    return {
      itemId,
      changed: false,
      contentChanged: false,
      metadataChanged: false,
      blocked: next.blocked,
      fields: [],
      summary: next.blocked,
    };
  const contentChanged = next.snapshot.contentHash !== current.contentHash;
  const metadataChanged =
    !contentChanged && next.snapshot.snapshotHash !== current.snapshotHash;
  const fields: ItemDiffField[] = (
    ["content", "answer", "solution", "questionType"] as const
  ).filter((field) => next.snapshot.payload[field] !== current.payload[field]);
  if (
    JSON.stringify(next.snapshot.payload.figures) !==
    JSON.stringify(current.payload.figures)
  )
    fields.push("figures");
  const label: Record<ItemDiffField, string> = {
    content: "본문",
    answer: "정답",
    solution: "해설",
    questionType: "문제 형식",
    figures: "그림",
  };
  return {
    itemId,
    changed: contentChanged || metadataChanged,
    contentChanged,
    metadataChanged,
    blocked: null,
    fields,
    summary: contentChanged
      ? `은행 문항이 바뀌었습니다: ${fields.map((field) => label[field]).join(" · ")}`
      : metadataChanged
        ? "내용은 같고 출처 정보(단원 · 난도 · 배점 · 원본 그림 칸)가 바뀌었습니다."
        : "은행 문항과 같습니다.",
  };
}

/**
 * 다시 캡처 — 지금 은행 문항으로 **새 확정본**을 만들고 배치가 그것을 가리키게 한다. 옛 확정본은 그대로 남는다
 * (다른 판본 · 발행본 · 시험지가 가리킬 수 있다). 영상 연결은 따라오지 않는다 — 내용이 바뀌었으면 다시 검수한다.
 */
export async function recaptureItem(
  db: TextbookDb,
  actor: TextbookActor,
  editionId: string,
  itemId: string,
  key: RequestKey,
  input: { expectedRevision: number },
  loadFigure: FigureLoader,
): Promise<{
  item: TextbookItem;
  aggregateRevision: number;
  replayed: boolean;
}> {
  const preview = await requireOwnedEdition(db, actor, editionId);
  if (preview.status !== "draft")
    throw conflict("발행한 판본은 고칠 수 없습니다. 새 판본을 만들어 주세요.");
  const next = await recaptured(
    db,
    await loadItemSnapshot(db, editionId, itemId),
    loadFigure,
  );
  if ("blocked" in next) throw conflict(next.blocked);
  return db.transaction(async (tx) => {
    const { result, replayed } = await runOnce(tx, key, async () => {
      const access = await requireOwnedDraft(tx, actor, editionId);
      if (access.revision !== input.expectedRevision)
        throw revisionMismatch("판본", access.revision);
      for (const asset of next.snapshot.assets)
        await putAsset(tx, actor.id, asset, "figure");
      await linkEditionAssets(
        tx,
        editionId,
        actor.id,
        next.snapshot.assets.map((asset) => asset.assetId),
      );
      const ids = await insertSnapshots(tx, actor.id, [next.snapshot]);
      const updated = await tx.execute(
        `UPDATE "textbook_item" SET "snapshot_id" = $3::uuid, "link_status" = 'linked', "revision" = "revision" + 1,
                "updated_at" = ${SQL_NOW}
          WHERE "id" = $1::uuid AND "edition_id" = $2::uuid AND "section_id" IS NOT NULL`,
        [itemId, editionId, ids.get(next.snapshot.snapshotHash)!],
      );
      if (updated !== 1) throw notFound("배치");
      const [item] = await placedItems(tx, editionId, [itemId]);
      return {
        item: item!,
        aggregateRevision: await aggregateRevision(tx, editionId),
      };
    });
    return { ...result, replayed };
  });
}
