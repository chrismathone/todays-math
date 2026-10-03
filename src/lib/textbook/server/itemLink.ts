/**
 * 연결 후보의 확정 — 가져온 원고의 문항을 실제 은행 문항과 잇는다. **확정은 사람이 한다**(후보 하나를 골라 보낸다).
 *
 * 🔴 후보의 주장을 믿지 않는다. 고른 은행 문항을 **지금 다시 캡처해 내용 해시가 배치의 확정본과 같을 때만** 잇는다.
 *    다르면 잇지 않고 사유를 낸다 — «비슷해 보인다»로 은행 문항의 정체를 주지 않는다(재출제 · 채점이 그 정체를 믿는다).
 *    이으면 배치는 새 확정본(출처 = 그 은행 문항)을 가리키고, 가져올 때의 확정본은 그대로 남는다.
 * 새 문항으로 등록하기(`register`)는 여기 없다 — 은행에 문항을 만드는 일은 기존 등록 · 검수 정책을 지나야 하고,
 *    검수 전의 문항은 출제 자격이 없어 «연결됨»이 될 수 없다.
 */
import type { TextbookItemDetail } from "@/contracts/textbookServer.contract";
import type { TextbookItem } from "@/contracts/textbookExchange.contract";
import { problemIneligibleReason } from "@/lib/problemEligibility";

import {
  type TextbookActor,
  requireOwnedDraft,
  requireOwnedEdition,
  requireReadableEdition,
} from "../access";
import {
  type FigureLoader,
  captureProblemSnapshot,
} from "../snapshotFromProblem";
import { linkEditionAssets, putAsset } from "./blobs";
import { aggregateRevision } from "./editions";
import { conflict, notFound, revisionMismatch } from "./errors";
import { insertSnapshots, loadProblemRows, placedItems } from "./items";
import { type RequestKey, runOnce } from "./requests";
import { type TextbookDb, type TextbookSql, SQL_NOW } from "./sql";

type Candidate = TextbookItemDetail["linkCandidates"][number];

async function loadLinkState(
  sql: TextbookSql,
  editionId: string,
  itemId: string,
): Promise<{
  linkStatus: TextbookItem["linkStatus"];
  linkCandidates: Candidate[];
  contentHash: string;
}> {
  const [row] = await sql.query<{
    linkStatus: TextbookItem["linkStatus"];
    linkCandidates: Candidate[];
    contentHash: string;
  }>(
    `SELECT i."link_status" AS "linkStatus", i."link_candidates" AS "linkCandidates", s."content_hash" AS "contentHash"
       FROM "textbook_item" i JOIN "textbook_problem_snapshot" s ON s."id" = i."snapshot_id"
      WHERE i."id" = $1::uuid AND i."edition_id" = $2::uuid AND i."section_id" IS NOT NULL`,
    [itemId, editionId],
  );
  if (!row) throw notFound("배치");
  return row;
}

/** 배치 하나와 그 연결 후보 — 후보는 교환 형식의 배치에 싣지 않으므로 여기서 따로 낸다 */
export async function getItemDetail(
  sql: TextbookSql,
  actor: TextbookActor,
  editionId: string,
  itemId: string,
): Promise<TextbookItemDetail> {
  const access = await requireReadableEdition(sql, actor, editionId);
  const state = await loadLinkState(sql, editionId, itemId);
  const [item] = await placedItems(sql, editionId, [itemId]);
  return {
    item: item!,
    // 후보는 주인의 검수 자료다 — 공유본을 읽는 동료에게는 내지 않는다
    linkCandidates: access.scope === "owner" ? state.linkCandidates : [],
  };
}

export async function linkItem(
  db: TextbookDb,
  actor: TextbookActor,
  editionId: string,
  itemId: string,
  key: RequestKey,
  input: { expectedRevision: number; problemId: string },
  loadFigure: FigureLoader,
): Promise<{
  item: TextbookItem;
  aggregateRevision: number;
  replayed: boolean;
}> {
  // 느린 일(그림 얼리기)은 잠금 밖에서 한다
  await requireOwnedEdition(db, actor, editionId);
  const before = await loadLinkState(db, editionId, itemId);
  if (before.linkStatus === "linked") throw conflict("이미 연결된 문항입니다.");
  const row = (await loadProblemRows(db, [input.problemId])).get(
    input.problemId,
  );
  if (!row) throw notFound("은행 문항");
  const ineligible = problemIneligibleReason(row);
  if (ineligible) throw conflict(ineligible);
  const captured = await captureProblemSnapshot(row, loadFigure);
  if (!captured.ok) throw conflict(captured.reason);
  if (captured.snapshot.contentHash !== before.contentHash)
    throw conflict(
      "은행 문항의 내용이 이 문항과 다릅니다. 연결하지 않았습니다.",
    );

  return db.transaction(async (tx) => {
    const { result, replayed } = await runOnce(tx, key, async () => {
      const access = await requireOwnedDraft(tx, actor, editionId);
      if (access.revision !== input.expectedRevision)
        throw revisionMismatch("판본", access.revision);
      const state = await loadLinkState(tx, editionId, itemId);
      // 준비하는 사이에 배치가 다른 확정본으로 바뀌었으면 견준 것이 낡았다
      if (
        state.linkStatus === "linked" ||
        state.contentHash !== before.contentHash
      )
        throw conflict(
          "그사이 문항이 바뀌었습니다. 다시 불러온 뒤 시도해 주세요.",
        );
      for (const asset of captured.snapshot.assets)
        await putAsset(tx, actor.id, asset, "figure");
      await linkEditionAssets(
        tx,
        editionId,
        actor.id,
        captured.snapshot.assets.map((asset) => asset.assetId),
      );
      const ids = await insertSnapshots(tx, actor.id, [captured.snapshot]);
      await tx.execute(
        `UPDATE "textbook_item" SET "snapshot_id" = $3::uuid, "link_status" = 'linked', "link_candidates" = '[]'::jsonb,
                "revision" = "revision" + 1, "updated_at" = ${SQL_NOW}
          WHERE "id" = $1::uuid AND "edition_id" = $2::uuid`,
        [itemId, editionId, ids.get(captured.snapshot.snapshotHash)!],
      );
      const [item] = await placedItems(tx, editionId, [itemId]);
      return {
        item: item!,
        aggregateRevision: await aggregateRevision(tx, editionId),
      };
    });
    return { ...result, replayed };
  });
}
