import { ArithmeticEngineError } from "./errors";

/** Decimal bytes. Leave 250KB for save/response metadata below the existing
 * 3.5MB application envelope, itself below Vercel's 4.5MB request/response cap. */
export const ARITHMETIC_SHEET_MAX_BYTES = 3_250_000;
export const ARITHMETIC_BODY_MAX_BYTES = 3_500_000;
export const ARITHMETIC_GENERATE_JSON_LIMITS = {
  maxBytes: 512 * 1024,
  maxDepth: 12,
  maxTokens: 100_000,
  maxStringLength: 128,
} as const;
export const ARITHMETIC_SHEET_JSON_LIMITS = {
  maxBytes: ARITHMETIC_BODY_MAX_BYTES,
  maxDepth: 16,
  maxTokens: 1_000_000,
  maxStringLength: 1_000_000,
} as const;

/** Browser-safe preflight; use the canonical sheet, before wrapping it for save.
 * Do not use in historical readers: reading must not rewrite or migrate bytes. */
export function arithmeticSheetByteIssue(payload: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload)).byteLength;
  return bytes > ARITHMETIC_SHEET_MAX_BYTES
    ? {
        code: "payload-size" as const,
        message: new ArithmeticEngineError("payload-size").message,
        bytes,
        max: ARITHMETIC_SHEET_MAX_BYTES,
      }
    : null;
}

export function assertArithmeticSheetByteBudget(payload: unknown): void {
  if (arithmeticSheetByteIssue(payload))
    throw new ArithmeticEngineError("payload-size");
}

/** The shared saved-library endpoint has always had this 3.5MB envelope.
 * Enforce it while reading, including chunked requests with no Content-Length. */
export async function readArithmeticLibraryBody(
  request: Pick<Request, "body">,
): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > ARITHMETIC_BODY_MAX_BYTES) {
        await reader.cancel();
        throw new ArithmeticEngineError("payload-size");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(bytes);
}
