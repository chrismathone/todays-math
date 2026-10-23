import { OntologyOperationError } from "./errors";

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
    throw new Error("body-invalid");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("body-required");
  const parts: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) throw new Error("body-budget");
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
