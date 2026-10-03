/**
 * 판본의 자산 · 산출물 바이트를 내는 길 — 늘 **관계를 지나서** 읽는다.
 * 자산은 판본의 색인(`textbook_edition_asset`)에 있어야 하고, 산출물은 그 판본의 줄이어야 한다.
 * 해시를 안다고 읽히지 않는다 — 이 파일에 해시만으로 읽는 함수는 없다.
 *
 * 큰 파일(견본 PDF 는 40MB 를 넘는다)은 구간으로 낸다. DB 가 그 조각만 꺼낸다(`substring`).
 * 구간 없이 온 요청에 창 하나(4MB)보다 큰 파일이면 첫 창을 206 으로 낸다 — 한 응답에 통째로 싣지 않는다.
 */
import { type TextbookActor, requireReadableEdition } from "../access";
import { readBlobRange } from "./blobs";
import { TextbookError, notFound } from "./errors";
import type { TextbookSql } from "./sql";

/** 한 응답에 싣는 바이트의 상한 */
export const RANGE_WINDOW_BYTES = 4 * 1024 * 1024;

export interface ByteSource {
  sha256: string;
  size: number;
  mimeType: string;
  /** 내려받을 때의 이름(없으면 화면에 바로 연다) */
  downloadName?: string;
}

/** 판본이 가리키는 자산 — 읽는 사람이 그 판본을 읽을 수 있어야 한다 */
export async function editionAssetSource(
  sql: TextbookSql,
  actor: TextbookActor,
  editionId: string,
  assetId: string,
): Promise<ByteSource> {
  await requireReadableEdition(sql, actor, editionId);
  const [row] = await sql.query<{ size: number; mimeType: string }>(
    `SELECT b."size", a."mime_type" AS "mimeType"
       FROM "textbook_edition_asset" ea
       JOIN "textbook_asset" a ON a."user_id" = ea."user_id" AND a."id" = ea."asset_id"
       JOIN "textbook_blob" b ON b."sha256" = ea."asset_id"
      WHERE ea."edition_id" = $1::uuid AND ea."asset_id" = $2::text`,
    [editionId, assetId],
  );
  if (!row) throw notFound("자산");
  return { sha256: assetId, size: row.size, mimeType: row.mimeType };
}

/** 발행 산출물 — 그 판본의 것만 */
export async function artifactSource(
  sql: TextbookSql,
  actor: TextbookActor,
  editionId: string,
  artifactId: string,
): Promise<ByteSource> {
  await requireReadableEdition(sql, actor, editionId);
  const [row] = await sql.query<{
    sha256: string;
    size: number;
    mimeType: string;
    kind: string;
  }>(
    `SELECT a."sha256", a."byte_size" AS "size", a."mime_type" AS "mimeType", a."kind"
       FROM "textbook_artifact" a WHERE a."edition_id" = $1::uuid AND a."id" = $2::uuid`,
    [editionId, artifactId],
  );
  if (!row) throw notFound("산출물");
  const extension =
    (
      [
        ["application/pdf", "pdf"],
        ["application/json", "json"],
        ["text/csv", "csv"],
        ["text/html", "html"],
        ["application/zip", "zip"],
      ] as const
    ).find(([mime]) => row.mimeType.startsWith(mime))?.[1] ?? "bin";
  return {
    sha256: row.sha256,
    size: row.size,
    mimeType: row.mimeType,
    downloadName: `${row.kind}.${extension}`,
  };
}

/** `Range: bytes=a-b` 하나만 읽는다. 없으면 null, 모양이 틀리면 던진다 */
export function parseRange(
  header: string | null,
  size: number,
): { start: number; end: number } | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === "" && match[2] === ""))
    throw new TextbookError(
      416,
      "VALIDATION_ERROR",
      "읽을 구간이 올바르지 않습니다.",
    );
  let start: number;
  let end: number;
  if (match[1] === "") {
    // 끝에서 n 바이트
    start = Math.max(0, size - Number(match[2]));
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
  }
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start > end ||
    start >= size
  )
    throw new TextbookError(
      416,
      "VALIDATION_ERROR",
      "읽을 구간이 올바르지 않습니다.",
    );
  return { start, end: Math.min(end, start + RANGE_WINDOW_BYTES - 1) };
}

export async function serveBytes(
  sql: TextbookSql,
  request: Request,
  source: ByteSource,
): Promise<Response> {
  const range = parseRange(request.headers.get("range"), source.size);
  const whole = !range && source.size <= RANGE_WINDOW_BYTES;
  const start = range?.start ?? 0;
  const end = range?.end ?? Math.min(source.size, RANGE_WINDOW_BYTES) - 1;
  const bytes = await readBlobRange(sql, source.sha256, start, end - start + 1);
  if (!bytes || bytes.byteLength !== end - start + 1) throw notFound("파일");
  // 문서로 열릴 수 있는 것(SVG · HTML)은 이 출처의 권한으로 스크립트가 돌지 않게 가둔다
  const svg =
    source.mimeType === "image/svg+xml" ||
    source.mimeType.startsWith("text/html");
  return new Response(Buffer.from(bytes), {
    status: whole ? 200 : 206,
    headers: {
      "Content-Type": source.mimeType,
      "Content-Length": String(bytes.byteLength),
      "Accept-Ranges": "bytes",
      ...(whole
        ? {}
        : { "Content-Range": `bytes ${start}-${end}/${source.size}` }),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      // 문서로 열어도 스크립트가 돌지 않게 — 그림 · 내려받는 파일로만 쓰인다
      ...(svg
        ? {
            "Content-Security-Policy":
              "default-src 'none'; style-src 'unsafe-inline'; sandbox",
          }
        : {}),
      ...(source.downloadName
        ? {
            "Content-Disposition": `attachment; filename="${source.downloadName}"`,
          }
        : {}),
    },
  });
}
