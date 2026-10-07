import "server-only";

import type { z } from "zod";

export const ENGLISH_BANK_JSON_CHUNK_BYTES = 64 * 1024;

/** Validate and serialize before constructing a stream: failures cannot follow a 200 prefix. */
export function bankJsonResponse<T extends z.ZodType>(
  schema: T,
  payload: z.infer<T>,
): Response {
  const json = JSON.stringify(schema.parse(payload));
  if (json === undefined)
    throw new TypeError("English bank response is not JSON serializable");
  // Encode once before slicing bytes, so a UTF-16 surrogate pair is never encoded separately.
  let bytes: Uint8Array | null = new TextEncoder().encode(json);
  let offset = 0;
  const stream = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        if (!bytes) return controller.close();
        const end = Math.min(
          offset + ENGLISH_BANK_JSON_CHUNK_BYTES,
          bytes.length,
        );
        controller.enqueue(bytes.subarray(offset, end));
        offset = end;
        if (offset === bytes.length) {
          bytes = null;
          controller.close();
        }
      },
      cancel() {
        bytes = null;
      },
    },
    // No eager buffering: each consumer read requests at most one bounded byte chunk.
    { highWaterMark: 0 },
  );
  return new Response(stream, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
