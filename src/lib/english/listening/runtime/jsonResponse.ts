/** Stream JSON so publication history with original question images can exceed a buffered response limit. */
export function listeningJsonResponse(
  data: unknown,
  status: number,
  headers: Record<string, string>,
) {
  const serialized = JSON.stringify({ data });
  let offset = 0;
  const body = new ReadableStream<string>({
    pull(controller) {
      if (offset === serialized.length) {
        controller.close();
        return;
      }
      const next = Math.min(offset + 16384, serialized.length);
      controller.enqueue(serialized.slice(offset, next));
      offset = next;
    },
    cancel() {
      offset = serialized.length;
    },
  });
  // TextEncoderStream keeps a split surrogate pair intact across chunks.
  return new Response(body.pipeThrough(new TextEncoderStream()), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
  });
}
