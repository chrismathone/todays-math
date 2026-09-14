import { MAX_AI_BODY_BYTES } from "@/lib/dev-ai/tasks";
export const STUDIO_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
export async function readStudioAiBody(
  request: Request,
  signal = request.signal,
): Promise<unknown> {
  signal.throwIfAborted();
  if (Number(request.headers.get("content-length")) > MAX_AI_BODY_BYTES)
    throw new Error("Input too large");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener("abort", cancel, { once: true });
  let size = 0,
    raw = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_AI_BODY_BYTES) {
        await reader.cancel();
        throw new Error("Input too large");
      }
      raw += decoder.decode(value, { stream: true });
    }
    return JSON.parse(raw + decoder.decode());
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}
