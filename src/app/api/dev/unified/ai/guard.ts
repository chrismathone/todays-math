import { MAX_AI_BODY_BYTES } from "@/lib/dev-ai/tasks";

export const DEV_AI_HEADERS = { "Cache-Control": "private, no-store" };
export function rejectDevAiRequest(request: Request): Response | null {
  if (process.env.NODE_ENV !== "development")
    return new Response(null, { status: 404, headers: DEV_AI_HEADERS });
  const url = new URL(request.url);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    return new Response(null, { status: 403, headers: DEV_AI_HEADERS });
  // Next normalizes a loopback request URL to localhost. Validate the actual
  // Host independently, then compare browser Origin with that exact host.
  const host = request.headers.get("host") ?? url.host;
  let incoming: URL;
  try {
    incoming = new URL(`${url.protocol}//${host}`);
  } catch {
    return new Response(null, { status: 403, headers: DEV_AI_HEADERS });
  }
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(incoming.hostname) ||
    incoming.host !== host ||
    incoming.port !== url.port
  )
    return new Response(null, { status: 403, headers: DEV_AI_HEADERS });
  const origin = request.headers.get("origin");
  if (
    (origin && origin !== incoming.origin) ||
    request.headers.get("sec-fetch-site") === "cross-site" ||
    (request.method === "POST" && !origin)
  )
    return new Response(null, { status: 403, headers: DEV_AI_HEADERS });
  return null;
}
export async function readDevAiBody(request: Request): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > MAX_AI_BODY_BYTES)
    throw new Error("원본 이미지가 너무 큽니다. 더 작은 영역으로 잘라 주세요.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("처리할 문제가 없습니다.");
  const decoder = new TextDecoder();
  let size = 0;
  let result = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_AI_BODY_BYTES) {
        await reader.cancel();
        throw new Error(
          "원본 이미지가 너무 큽니다. 더 작은 영역으로 잘라 주세요.",
        );
      }
      result += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(result + decoder.decode());
  } finally {
    reader.releaseLock();
  }
}
