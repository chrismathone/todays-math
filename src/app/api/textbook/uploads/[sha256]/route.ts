/**
 * PUT /api/textbook/uploads/{sha256}?offset={바이트 자리} — 조각 하나(≤ 1MB)를 올린다. 본문은 날 바이트다.
 * 같은 자리에 다시 오면 덮어쓴다(응답을 못 받은 재시도). 끝맺기는 `POST …/complete`.
 */
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { CHUNK_MAX_BYTES, putUploadChunk } from "@/lib/textbook/server/blobs";
import { TextbookError, invalid } from "@/lib/textbook/server/errors";
import { plain, textbookRoute } from "@/lib/textbook/server/http";

export const runtime = "nodejs";

type Context = { params: Promise<{ sha256: string }> };

const tooLarge = () =>
  new TextbookError(413, "PAYLOAD_TOO_LARGE", "조각 하나는 1MB 까지입니다.");

/** 상한을 넘으면 다 읽지 않고 끊는다 */
async function readChunk(request: Request): Promise<Uint8Array> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > CHUNK_MAX_BYTES) throw tooLarge();
  const reader = request.body?.getReader();
  if (!reader) throw invalid("조각이 비어 있습니다.");
  const parts: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > CHUNK_MAX_BYTES) {
        await reader.cancel();
        throw tooLarge();
      }
      parts.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return bytes;
}

export const PUT = withErrorLog(
  "/api/textbook/uploads/[sha256]",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const { sha256 } = await context.params;
      const offset = new URL(request.url).searchParams.get("offset") ?? "0";
      if (!/^\d{1,9}$/.test(offset))
        throw invalid("조각의 자리가 올바르지 않습니다.");
      return plain(
        await putUploadChunk(
          db,
          actor,
          sha256,
          Number(offset),
          await readChunk(request),
        ),
      );
    }),
);
