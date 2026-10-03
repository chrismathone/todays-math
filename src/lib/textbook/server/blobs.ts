/**
 * 바이트 · 자산 · 올리기.
 *
 * 🔴 바이트의 열쇠는 내용 해시 하나다. 넣을 때 **DB 가 해시를 다시 계산한다**(트리거) — 주장한 해시를 믿지 않는다.
 * 🔴 해시를 안다고 읽을 수 없다. 읽는 길은 늘 주인의 손잡이(`textbook_asset`)나 판본의 색인
 *    (`textbook_edition_asset`) · 산출물 · 보관본을 지난다 — 이 파일에 «해시로 그냥 읽기»는 없다.
 * 형식(MIME)은 바이트가 정한다. 올린 쪽이 적어 보낸 형식은 견주기만 한다.
 */
import { randomUUID } from "node:crypto";

import type { TextbookActor } from "../access";
import {
  type FrozenAsset,
  type FrozenMimeType,
  freezeFigureBytes,
} from "../snapshotFromProblem";
import { TextbookError, conflict, invalid, notFound } from "./errors";
import { type TextbookDb, type TextbookSql, SQL_NOW } from "./sql";

export const BLOB_MAX_BYTES = 64 * 1024 * 1024;
export const CHUNK_MAX_BYTES = 1024 * 1024;
/** 원고에 넣는 그림 · 캐릭터 한 장의 상한 */
export const IMAGE_ASSET_MAX_BYTES = 8 * 1024 * 1024;
/** 끝맺지 않은 올리기를 계정마다 이만큼만 둔다 — 조각을 끝없이 쌓지 못하게 */
export const PENDING_UPLOAD_LIMIT = 8;
export const EDITION_MAX_ASSETS = 300;

export type AssetKind = "figure" | "image" | "portrait" | "font";
export type AssetMimeType =
  FrozenMimeType | "font/woff2" | "font/woff" | "font/ttf";

/** 바이트를 넣는다 — 이미 있으면 그대로 둔다(같은 해시는 같은 바이트다) */
export async function putBlob(
  tx: TextbookSql,
  sha256: string,
  bytes: Uint8Array,
): Promise<void> {
  await tx.execute(
    `INSERT INTO "textbook_blob" ("sha256", "size", "bytes") VALUES ($1::text, $2::int, $3::bytea) ON CONFLICT ("sha256") DO NOTHING`,
    [sha256, bytes.byteLength, bytes],
  );
}

/** 얼린 그림을 주인의 자산으로 올린다(바이트 + 손잡이). 이미 있으면 그대로 둔다 */
export async function putAsset(
  tx: TextbookSql,
  userId: string,
  asset: FrozenAsset,
  kind: AssetKind,
): Promise<void> {
  await putBlob(tx, asset.assetId, asset.bytes);
  await tx.execute(
    `INSERT INTO "textbook_asset" ("user_id", "id", "kind", "mime_type", "name", "width_px", "height_px")
     VALUES ($1::uuid, $2::text, $3::text, $4::text, $5::text, $6::int, $7::int) ON CONFLICT ("user_id", "id") DO NOTHING`,
    [
      userId,
      asset.assetId,
      kind,
      asset.mimeType,
      asset.name.slice(0, 255),
      asset.widthPx,
      asset.heightPx,
    ],
  );
}

/** 판본의 읽기 범위에 자산을 올린다. 자산 색인을 쓰는 문장이라 집계 revision 이 오른다(트리거) */
export async function linkEditionAssets(
  tx: TextbookSql,
  editionId: string,
  userId: string,
  assetIds: readonly string[],
): Promise<void> {
  if (!assetIds.length) return;
  const [{ total }] = await tx.query<{ total: number }>(
    `SELECT count(*)::int AS total FROM (
       SELECT "asset_id" FROM "textbook_edition_asset" WHERE "edition_id" = $1::uuid
       UNION SELECT value FROM jsonb_array_elements_text($2::jsonb)) a`,
    [editionId, JSON.stringify(assetIds)],
  );
  if (total > EDITION_MAX_ASSETS)
    throw invalid(`한 판본의 그림은 ${EDITION_MAX_ASSETS}종까지입니다.`);
  await tx.execute(
    `INSERT INTO "textbook_edition_asset" ("edition_id", "user_id", "asset_id")
     SELECT $1::uuid, $2::uuid, value FROM jsonb_array_elements_text($3::jsonb)
     ON CONFLICT DO NOTHING`,
    [editionId, userId, JSON.stringify(assetIds)],
  );
}

/** 바이트의 구간 — `start` 는 0부터. DB 가 그 조각만 꺼낸다(통째로 읽지 않는다) */
export async function readBlobRange(
  sql: TextbookSql,
  sha256: string,
  start: number,
  length: number,
): Promise<Uint8Array | null> {
  const [row] = await sql.query<{ part: Uint8Array }>(
    `SELECT substring("bytes" FROM $2::int FOR $3::int) AS part FROM "textbook_blob" WHERE "sha256" = $1::text`,
    [sha256, start + 1, length],
  );
  return row ? new Uint8Array(row.part) : null;
}

export async function blobSize(
  sql: TextbookSql,
  sha256: string,
): Promise<number | null> {
  const [row] = await sql.query<{ size: number }>(
    `SELECT "size" FROM "textbook_blob" WHERE "sha256" = $1::text`,
    [sha256],
  );
  return row?.size ?? null;
}

// ─────────────────────────────────────────────
// 올리기 — 1MB 조각
// ─────────────────────────────────────────────

const SHA256 = /^[a-f0-9]{64}$/;

/**
 * 조각 하나를 받는다. 같은 자리에 다시 오면 덮어쓴다(응답을 못 받은 재시도). 이미 끝난 올리기면 아무것도 하지 않는다.
 */
export async function putUploadChunk(
  db: TextbookDb,
  actor: TextbookActor,
  sha256: string,
  byteOffset: number,
  bytes: Uint8Array,
): Promise<{ uploadId: string; completed: boolean }> {
  if (!SHA256.test(sha256)) throw invalid("해시 모양이 올바르지 않습니다.");
  if (!Number.isSafeInteger(byteOffset) || byteOffset < 0)
    throw invalid("조각의 자리가 올바르지 않습니다.");
  if (bytes.byteLength < 1 || bytes.byteLength > CHUNK_MAX_BYTES)
    throw new TextbookError(
      413,
      "PAYLOAD_TOO_LARGE",
      "조각 하나는 1MB 까지입니다.",
    );
  if (byteOffset + bytes.byteLength > BLOB_MAX_BYTES)
    throw new TextbookError(
      413,
      "PAYLOAD_TOO_LARGE",
      "파일 하나는 64MB 까지입니다.",
    );
  return db.transaction(async (tx) => {
    const existing = await tx.query<{ id: string; completed: boolean }>(
      `SELECT "id", "completed_at" IS NOT NULL AS completed FROM "textbook_upload"
        WHERE "user_id" = $1::uuid AND "sha256" = $2::text FOR UPDATE`,
      [actor.id, sha256],
    );
    let upload = existing[0];
    if (!upload) {
      const [{ pending }] = await tx.query<{ pending: number }>(
        `SELECT count(*)::int AS pending FROM "textbook_upload" WHERE "user_id" = $1::uuid AND "completed_at" IS NULL`,
        [actor.id],
      );
      if (pending >= PENDING_UPLOAD_LIMIT)
        throw conflict(
          "끝나지 않은 올리기가 많습니다. 잠시 뒤 다시 시도해 주세요.",
        );
      upload = { id: randomUUID(), completed: false };
      await tx.execute(
        `INSERT INTO "textbook_upload" ("id", "user_id", "sha256") VALUES ($1::uuid, $2::uuid, $3::text)`,
        [upload.id, actor.id, sha256],
      );
    }
    if (upload.completed) return { uploadId: upload.id, completed: true };
    await tx.execute(
      `INSERT INTO "textbook_upload_chunk" ("upload_id", "byte_offset", "bytes") VALUES ($1::uuid, $2::int, $3::bytea)
       ON CONFLICT ("upload_id", "byte_offset") DO UPDATE SET "bytes" = EXCLUDED."bytes"`,
      [upload.id, byteOffset, bytes],
    );
    return { uploadId: upload.id, completed: false };
  });
}

export interface CompletedUpload {
  uploadId: string;
  sha256: string;
  byteLength: number;
}

/**
 * 올리기를 끝맺는다 — 조각이 빈틈 · 겹침 없이 이어지는지, 크기가 맞는지, **이어 붙인 바이트의 해시가 주소의 해시인지**를
 * DB 가 본다. 맞으면 바이트 표로 옮기고 조각을 지운다. 틀리면 올리던 것을 버린다(다시 올린다).
 */
export async function completeUpload(
  db: TextbookDb,
  actor: TextbookActor,
  sha256: string,
  input: { byteLength: number; fileName?: string | null },
): Promise<CompletedUpload> {
  if (!SHA256.test(sha256)) throw invalid("해시 모양이 올바르지 않습니다.");
  if (
    !Number.isSafeInteger(input.byteLength) ||
    input.byteLength < 1 ||
    input.byteLength > BLOB_MAX_BYTES
  )
    throw invalid("파일 크기가 올바르지 않습니다.");
  const outcome = await db.transaction(async (tx) => {
    const [upload] = await tx.query<{
      id: string;
      size: number | null;
      completed: boolean;
    }>(
      `SELECT "id", "size", "completed_at" IS NOT NULL AS completed FROM "textbook_upload"
        WHERE "user_id" = $1::uuid AND "sha256" = $2::text FOR UPDATE`,
      [actor.id, sha256],
    );
    if (!upload) return { kind: "missing" as const };
    if (upload.completed)
      return upload.size === input.byteLength
        ? { kind: "done" as const, uploadId: upload.id }
        : { kind: "size" as const };
    const [check] = await tx.query<{
      total: number | null;
      contiguous: boolean | null;
      hash: string | null;
    }>(
      `SELECT sum(len)::int AS total, bool_and("byte_offset" = before) AS contiguous,
              encode(sha256(string_agg("bytes", ''::bytea ORDER BY "byte_offset")), 'hex') AS hash
         FROM (SELECT "byte_offset", "bytes", octet_length("bytes") AS len,
                      COALESCE(sum(octet_length("bytes")) OVER (ORDER BY "byte_offset"
                               ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS before
                 FROM "textbook_upload_chunk" WHERE "upload_id" = $1::uuid) c`,
      [upload.id],
    );
    if (
      check?.total !== input.byteLength ||
      check.contiguous !== true ||
      check.hash !== sha256
    ) {
      // 맞지 않는 조각은 남기지 않는다 — 같은 해시로 처음부터 다시 올린다
      await tx.execute(`DELETE FROM "textbook_upload" WHERE "id" = $1::uuid`, [
        upload.id,
      ]);
      return { kind: "mismatch" as const };
    }
    await tx.execute(
      `INSERT INTO "textbook_blob" ("sha256", "size", "bytes")
       SELECT $2::text, $3::int, string_agg("bytes", ''::bytea ORDER BY "byte_offset")
         FROM "textbook_upload_chunk" WHERE "upload_id" = $1::uuid
       ON CONFLICT ("sha256") DO NOTHING`,
      [upload.id, sha256, input.byteLength],
    );
    await tx.execute(
      `DELETE FROM "textbook_upload_chunk" WHERE "upload_id" = $1::uuid`,
      [upload.id],
    );
    await tx.execute(
      `UPDATE "textbook_upload" SET "size" = $2::int, "file_name" = $3::text, "completed_at" = ${SQL_NOW} WHERE "id" = $1::uuid`,
      [upload.id, input.byteLength, input.fileName?.slice(0, 255) ?? null],
    );
    return { kind: "done" as const, uploadId: upload.id };
  });
  if (outcome.kind === "missing") throw notFound("올리던 파일");
  if (outcome.kind === "size")
    throw conflict("이미 끝난 올리기와 크기가 다릅니다.");
  if (outcome.kind === "mismatch")
    throw invalid("올린 바이트가 해시와 다릅니다. 처음부터 다시 올려 주세요.");
  return { uploadId: outcome.uploadId, sha256, byteLength: input.byteLength };
}

/** 끝난 올리기 — 주인의 것만 */
export async function requireCompletedUpload(
  sql: TextbookSql,
  actor: TextbookActor,
  uploadId: string,
): Promise<{
  uploadId: string;
  sha256: string;
  size: number;
  fileName: string | null;
}> {
  const [row] = await sql.query<{
    sha256: string;
    size: number | null;
    fileName: string | null;
    completed: boolean;
  }>(
    `SELECT "sha256", "size", "file_name" AS "fileName", "completed_at" IS NOT NULL AS completed
       FROM "textbook_upload" WHERE "id" = $1::uuid AND "user_id" = $2::uuid`,
    [uploadId, actor.id],
  );
  if (!row || !row.completed || row.size === null) throw notFound("올린 파일");
  return {
    uploadId,
    sha256: row.sha256,
    size: row.size,
    fileName: row.fileName,
  };
}

function sniffFont(bytes: Uint8Array): AssetMimeType | null {
  const head = Buffer.from(bytes.subarray(0, 4)).toString("latin1");
  if (head === "wOF2") return "font/woff2";
  if (head === "wOFF") return "font/woff";
  if (
    bytes[0] === 0x00 &&
    bytes[1] === 0x01 &&
    bytes[2] === 0x00 &&
    bytes[3] === 0x00
  )
    return "font/ttf";
  return null;
}

export interface RegisteredAsset {
  assetId: string;
  mimeType: AssetMimeType;
  widthPx: number | null;
  heightPx: number | null;
}

/**
 * 끝난 올리기를 원고의 자산(그림 · 캐릭터 · 글꼴)으로 올린다. 형식은 바이트에서 읽는다 —
 * 그림이나 글꼴이 아니면 거절한다(스크립트가 든 SVG 도 거절).
 */
export async function registerUploadedAsset(
  db: TextbookDb,
  actor: TextbookActor,
  uploadId: string,
  input: { kind: AssetKind; name: string },
): Promise<RegisteredAsset> {
  return db.transaction(async (tx) => {
    const upload = await requireCompletedUpload(tx, actor, uploadId);
    if (upload.size > IMAGE_ASSET_MAX_BYTES)
      throw new TextbookError(
        413,
        "PAYLOAD_TOO_LARGE",
        "원고에 넣는 그림은 8MB 까지입니다.",
      );
    const bytes = await readBlobRange(tx, upload.sha256, 0, upload.size);
    if (!bytes) throw notFound("올린 파일");
    let mimeType: AssetMimeType;
    let widthPx: number | null = null;
    let heightPx: number | null = null;
    const font = sniffFont(bytes);
    if (font) {
      if (input.kind !== "font")
        throw invalid("글꼴 파일은 글꼴로만 올릴 수 있습니다.");
      mimeType = font;
    } else {
      if (input.kind === "font") throw invalid("글꼴 파일이 아닙니다.");
      const looksSvg =
        /^\s*(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(
          Buffer.from(bytes.subarray(0, 2048)).toString("utf8"),
        );
      const frozen = freezeFigureBytes(bytes, input.name, looksSvg);
      if ("reason" in frozen) throw invalid(frozen.reason);
      mimeType = frozen.asset.mimeType;
      widthPx = frozen.asset.widthPx;
      heightPx = frozen.asset.heightPx;
    }
    await tx.execute(
      `INSERT INTO "textbook_asset" ("user_id", "id", "kind", "mime_type", "name", "width_px", "height_px")
       VALUES ($1::uuid, $2::text, $3::text, $4::text, $5::text, $6::int, $7::int) ON CONFLICT ("user_id", "id") DO NOTHING`,
      [
        actor.id,
        upload.sha256,
        input.kind,
        mimeType,
        input.name.slice(0, 255),
        widthPx,
        heightPx,
      ],
    );
    return { assetId: upload.sha256, mimeType, widthPx, heightPx };
  });
}
