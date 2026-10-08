export const exportHeaders = { "Cache-Control": "private, no-store" };
const fail = (status: number, error: string) =>
  Response.json({ error }, { status, headers: exportHeaders });

/** Local workroom stays usable without auth; production uses the app session. */
export async function authorizeExport(
  request: Request,
): Promise<Response | null> {
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;
  const origin = request.headers.get("origin");
  if (
    origin !== `${url.protocol}//${host}` ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return fail(403, "현재 작업 화면에서 다시 내보내 주세요.");
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return fail(415, "JSON 문서가 필요합니다.");
  const { getSessionUser } = await import("@/lib/session");
  const session = await getSessionUser();
  if (session)
    return session.menus?.includes("export") ||
      (request.method === "POST" &&
        ["/api/exports/pdf", "/api/exports/hwpx"].includes(url.pathname) &&
        session.menus?.includes("english-library"))
      ? null
      : fail(403, "시험지 · 내보내기 메뉴를 사용할 권한이 없습니다.");
  if (process.env.NODE_ENV === "development") {
    const local = (hostname: string) =>
      ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
    try {
      const incoming = new URL(`${url.protocol}//${host}`);
      if (
        local(url.hostname) &&
        local(incoming.hostname) &&
        incoming.host === host &&
        incoming.port === url.port
      )
        return null;
    } catch {
      return fail(403, "로컬 작업 화면에서 다시 내보내 주세요.");
    }
  }
  return fail(401, "로그인 후 내보낼 수 있습니다.");
}

export async function readExportBody(
  request: Request,
  limit = 3_500_000,
): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > limit)
    throw new Error("문서가 너무 큽니다. 나누어 내보내 주세요.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("내보낼 문서가 없습니다.");
  const decoder = new TextDecoder();
  let size = 0,
    text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error("문서가 너무 큽니다. 나누어 내보내 주세요.");
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally {
    reader.releaseLock();
  }
}
