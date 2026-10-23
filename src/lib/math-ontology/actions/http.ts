import { OntologyOperationError } from "./errors";
export class OntologyBodyError extends Error { constructor(public status: 400 | 413) { super("INVALID_BODY"); } }

export async function ontologyJsonBody(
  request: Request,
  maxBytes = 72000,
): Promise<unknown> {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json") ||
    Number(request.headers.get("content-length")) > maxBytes
  )
    throw new OntologyBodyError(Number(request.headers.get("content-length")) > maxBytes ? 413 : 400);
  const reader = request.body?.getReader();
  if (!reader) throw new OntologyBodyError(400);
  const parts: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) throw new OntologyBodyError(413);
      parts.push(value);
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(parts).toString("utf8"));
}
export const ontologyResponse = (status: number, value: unknown) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
export function ontologyFailure(error: unknown) {
  if (error instanceof OntologyBodyError) return ontologyResponse(error.status, { error: { code: "VALIDATION_ERROR" } });
  if (error instanceof OntologyOperationError)
    return ontologyResponse(
      error.code === "FORBIDDEN"
        ? 403
        : error.code === "NOT_FOUND"
          ? 404
          : error.code === "UNAVAILABLE"
            ? 503
            : 409,
      { error: { code: error.code } },
    );
  return ontologyResponse(503, {
    error: { code: "ONTOLOGY_OPERATION_UNAVAILABLE" },
  });
}
