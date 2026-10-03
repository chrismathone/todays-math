/**
 * 문제 해설영상과 확정본 연결 — 등록 · 검수 · 게시 · 중지.
 *
 * 연결은 **확정본**에 건다(배치가 아니라). 같은 문항을 두 책에 실어도 확정본이 같으면 같은 연결을 쓰고,
 * 원문이 바뀌어 새 확정본이 생기면 연결은 따라오지 않는다 — 발문이 같아 보여도 다시 검수한다.
 * 🔴 게시는 검수 화면을 지난 것만: 검수자가 본 내용의 해시(`expectedContentHash`)가 지금 확정본의 내용 해시와
 *    같아야 하고, 그 해시가 `reviewed_against_hash` 로 적힌다. DB 트리거가 같은 것을 다시 본다 —
 *    «게시됨»이라는 상태 값만 보내서는 게시되지 않는다.
 * 교체는 한 트랜잭션: 옛 연결을 중지하고 새 연결을 게시한다. 줄은 남는다 — 그것이 변경 기록이다.
 * 영상 주소를 통째로 받지 않는다. 공급자와 영상 id 만 받는다.
 */
import { randomUUID } from "node:crypto";

import type { TextbookVideo } from "@/contracts/textbook.contract";
import type { ProblemVideoBinding } from "@/contracts/textbookExchange.contract";

import type { TextbookActor } from "../access";
import { conflict, invalid, notFound } from "./errors";
import { type RequestKey, runOnce } from "./requests";
import { type TextbookDb, type TextbookSql, SQL_NOW, isoColumn } from "./sql";

const VIDEO_SQL = `
  SELECT v."id", v."title", v."provider", v."provider_video_id" AS "providerVideoId",
         ${isoColumn(`v."created_at"`)} AS "createdAt"
    FROM "textbook_video" v`;

const BINDING_SQL = `
  SELECT b."id" AS "bindingId", b."snapshot_id" AS "snapshotId", b."video_id" AS "videoId", b."status",
         b."start_seconds" AS "startSeconds", b."end_seconds" AS "endSeconds",
         b."reviewed_against_hash" AS "reviewedAgainstHash"
    FROM "textbook_video_binding" b`;

export async function listVideos(
  sql: TextbookSql,
  actor: TextbookActor,
): Promise<TextbookVideo[]> {
  return sql.query<TextbookVideo>(
    `${VIDEO_SQL} WHERE v."user_id" = $1::uuid ORDER BY v."created_at" DESC, v."id" LIMIT 2000`,
    [actor.id],
  );
}

/** 내 연결들 — 판본을 주면 그 판본에 놓인 문항의 것만 */
export async function listBindings(
  sql: TextbookSql,
  actor: TextbookActor,
  editionId?: string,
): Promise<ProblemVideoBinding[]> {
  return sql.query<ProblemVideoBinding>(
    `${BINDING_SQL} WHERE b."user_id" = $1::uuid
       ${
         editionId
           ? `AND b."snapshot_id" IN (SELECT i."snapshot_id" FROM "textbook_item" i
                                       WHERE i."edition_id" = $2::uuid AND i."user_id" = $1::uuid)`
           : ""
       }
      ORDER BY b."snapshot_id", b."created_at", b."id" LIMIT 5000`,
    editionId ? [actor.id, editionId] : [actor.id],
  );
}

/** 같은 영상을 다시 등록하면 있던 줄을 돌려준다 — (계정, 공급자, 영상 id)가 열쇠다 */
export async function createVideo(
  db: TextbookDb,
  actor: TextbookActor,
  key: RequestKey,
  input: { title: string; provider: "youtube"; providerVideoId: string },
): Promise<{ video: TextbookVideo; replayed: boolean }> {
  return db.transaction(async (tx) => {
    const { result, replayed } = await runOnce(tx, key, async () => {
      await tx.execute(
        `INSERT INTO "textbook_video" ("id", "user_id", "provider", "provider_video_id", "title", "updated_at")
         VALUES ($1::uuid, $2::uuid, $3::text, $4::text, $5::text, ${SQL_NOW})
         ON CONFLICT ("user_id", "provider", "provider_video_id") DO NOTHING`,
        [
          randomUUID(),
          actor.id,
          input.provider,
          input.providerVideoId,
          input.title,
        ],
      );
      const [video] = await tx.query<TextbookVideo>(
        `${VIDEO_SQL} WHERE v."user_id" = $1::uuid AND v."provider" = $2::text AND v."provider_video_id" = $3::text`,
        [actor.id, input.provider, input.providerVideoId],
      );
      return video!;
    });
    return { video: result, replayed };
  });
}

export interface BindingWrite {
  videoId: string;
  startSeconds: number;
  endSeconds: number | null;
  status: ProblemVideoBinding["status"];
  /** 검수자가 본 확정본의 내용 해시 */
  expectedContentHash: string;
}

async function ownSnapshotHash(
  sql: TextbookSql,
  actor: TextbookActor,
  snapshotId: string,
): Promise<string> {
  const [row] = await sql.query<{ contentHash: string }>(
    `SELECT "content_hash" AS "contentHash" FROM "textbook_problem_snapshot"
      WHERE "id" = $1::uuid AND "user_id" = $2::uuid`,
    [snapshotId, actor.id],
  );
  if (!row) throw notFound("문항");
  return row.contentHash;
}

const stale = () =>
  conflict(
    "검수한 뒤에 문항 내용이 바뀌었습니다. 다시 확인한 뒤 게시해 주세요.",
  );

/** 새 연결 — 초안 또는 검수 대기로만 만든다. 게시는 검수를 지난 뒤에 한다 */
export async function createBinding(
  db: TextbookDb,
  actor: TextbookActor,
  snapshotId: string,
  key: RequestKey,
  input: BindingWrite,
): Promise<{ binding: ProblemVideoBinding; replayed: boolean }> {
  if (input.status !== "draft" && input.status !== "review")
    throw invalid("새 연결은 초안이나 검수 대기로 만듭니다.");
  return db.transaction(async (tx) => {
    const { result, replayed } = await runOnce(tx, key, async () => {
      if (
        (await ownSnapshotHash(tx, actor, snapshotId)) !==
        input.expectedContentHash
      )
        throw stale();
      const [video] = await tx.query<{ id: string }>(
        `SELECT "id" FROM "textbook_video" WHERE "id" = $1::uuid AND "user_id" = $2::uuid`,
        [input.videoId, actor.id],
      );
      if (!video) throw notFound("영상");
      const id = randomUUID();
      await tx.execute(
        `INSERT INTO "textbook_video_binding" ("id", "user_id", "snapshot_id", "video_id", "start_seconds", "end_seconds")
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::float8, $6::float8)`,
        [
          id,
          actor.id,
          snapshotId,
          input.videoId,
          input.startSeconds,
          input.endSeconds,
        ],
      );
      if (input.status === "review")
        await tx.execute(
          `UPDATE "textbook_video_binding" SET "status" = 'review' WHERE "id" = $1::uuid`,
          [id],
        );
      const [binding] = await tx.query<ProblemVideoBinding>(
        `${BINDING_SQL} WHERE b."id" = $1::uuid`,
        [id],
      );
      return binding!;
    });
    return { binding: result, replayed };
  });
}

/**
 * 연결의 상태를 옮긴다 — 초안 ↔ 검수 대기 → 게시 → 중지.
 * 게시하려면 검수 대기여야 하고, 검수자가 본 해시가 지금 확정본의 내용 해시와 같아야 한다.
 */
export async function updateBinding(
  db: TextbookDb,
  actor: TextbookActor,
  bindingId: string,
  key: RequestKey,
  input: BindingWrite,
): Promise<{ binding: ProblemVideoBinding; replayed: boolean }> {
  return db.transaction(async (tx) => {
    const { result, replayed } = await runOnce(tx, key, async () => {
      const [current] = await tx.query<{
        status: ProblemVideoBinding["status"];
        snapshotId: string;
        videoId: string;
      }>(
        `SELECT "status", "snapshot_id" AS "snapshotId", "video_id" AS "videoId" FROM "textbook_video_binding"
          WHERE "id" = $1::uuid AND "user_id" = $2::uuid FOR UPDATE`,
        [bindingId, actor.id],
      );
      if (!current) throw notFound("영상 연결");
      if (input.videoId !== current.videoId)
        throw invalid("다른 영상은 새 연결로 만듭니다.");
      const contentHash = await ownSnapshotHash(tx, actor, current.snapshotId);

      if (input.status === "withdrawn") {
        if (current.status === "withdrawn")
          throw conflict("이미 중지한 연결입니다.");
        await tx.execute(
          `UPDATE "textbook_video_binding" SET "status" = 'withdrawn', "withdrawn_at" = ${SQL_NOW} WHERE "id" = $1::uuid`,
          [bindingId],
        );
      } else if (input.status === "published") {
        if (current.status !== "review")
          throw conflict("검수 대기인 연결만 게시할 수 있습니다.");
        if (input.expectedContentHash !== contentHash) throw stale();
        // 확정본마다 게시 영상은 하나다 — 있던 게시 연결을 먼저 중지한다(같은 트랜잭션)
        await tx.execute(
          `UPDATE "textbook_video_binding" SET "status" = 'withdrawn', "withdrawn_at" = ${SQL_NOW}
            WHERE "snapshot_id" = $1::uuid AND "status" = 'published' AND "id" <> $2::uuid`,
          [current.snapshotId, bindingId],
        );
        await tx.execute(
          `UPDATE "textbook_video_binding" SET "status" = 'published', "reviewed_against_hash" = $2::text,
                  "reviewed_by" = $3::uuid, "reviewed_at" = ${SQL_NOW}, "published_at" = ${SQL_NOW}
            WHERE "id" = $1::uuid`,
          [bindingId, contentHash, actor.id],
        );
      } else {
        if (current.status !== "draft" && current.status !== "review")
          throw conflict(
            "게시했거나 중지한 연결은 고치지 못합니다. 새 연결을 만들어 주세요.",
          );
        if (input.expectedContentHash !== contentHash) throw stale();
        await tx.execute(
          `UPDATE "textbook_video_binding" SET "status" = $2::text, "start_seconds" = $3::float8, "end_seconds" = $4::float8
            WHERE "id" = $1::uuid`,
          [bindingId, input.status, input.startSeconds, input.endSeconds],
        );
      }
      const [binding] = await tx.query<ProblemVideoBinding>(
        `${BINDING_SQL} WHERE b."id" = $1::uuid`,
        [bindingId],
      );
      return binding!;
    });
    return { binding: result, replayed };
  });
}
