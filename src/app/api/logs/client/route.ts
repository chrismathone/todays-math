/**
 * POST /api/logs/client — 브라우저가 본 오류를 받는다(원장님 2026-09-22 «브라우저 쪽 오류»).
 * 보내는 쪽: src/lib/errorLog/clientReporter.ts (루트 레이아웃이 설치 — error · unhandledrejection · 요청 실패)
 * 계약: src/contracts/errorLog.contract.ts (clientErrorBatchSchema)
 *
 * - 로그인 안 한 사람도 보낸다(랩실 `/lab` 은 로그인 없이 연다 — D-135 ⑻). 로그인했으면 그 계정을 적는다.
 *   학생 세션도 보낸다(원장님 2026-09-22 — 학생 관문 `studentRouteAccess.ts` 가 이 한 줄만 연다).
 * - 양 제한: 한 사람(계정, 없으면 IP)당 분당 사건 수 · 본문 크기 상한(`clientQuota.ts`). 넘치면 버린다.
 * - 🔴 **이 경로는 `withErrorLog` 를 거치지 않는다** — 받다가 실패한 것을 또 기록하면 되먹임 고리가 선다
 *   (가드 `errorLogRouteCoverage.test.ts` 의 EXEMPT 가 이 한 곳이다). 실패는 조용히 삼킨다.
 * - 본문 형식은 가리지 않는다 — `sendBeacon` 은 `text/plain` 으로 보낸다.
 */
import { clientErrorBatchSchema } from "@/contracts/errorLog.contract";
import { CLIENT_LOG_MAX_BODY_BYTES } from "@/contracts/errorLogValues";
import { auth } from "@/lib/auth";
import { takeClientLogQuota } from "@/lib/errorLog/clientQuota";
import { recordErrorLogs } from "@/lib/errorLog/record";

const done = (status: number) => new Response(null, { status });

/** 본문을 상한까지만 읽는다 — 넘으면 null */
async function readCapped(request: Request): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { done: finished, value } = await reader.read();
      if (finished) break;
      size += value.byteLength;
      if (size > CLIENT_LOG_MAX_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

function clientIp(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    undefined
  );
}

export async function POST(request: Request): Promise<Response> {
  try {
    if (request.headers.get("sec-fetch-site") === "cross-site")
      return done(403);
    if (
      Number(request.headers.get("content-length")) > CLIENT_LOG_MAX_BODY_BYTES
    )
      return done(413);
    const text = await readCapped(request);
    if (text === null) return done(413);
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return done(400);
    }
    const parsed = clientErrorBatchSchema.safeParse(json);
    if (!parsed.success) return done(400);

    const session = (await auth().catch(() => null)) as {
      user?: { id?: unknown };
      student?: { accountId?: unknown };
    } | null;
    const userId = session?.user?.id ?? null;
    // 학생 세션(원장님 2026-09-22 — 학생 화면 오류도 모은다)은 사용자 표의 행이 아니라 요약에 싣는다.
    // 양도 학생마다 센다 — IP 로 묶으면 한 교실이 한 사람 몫을 나눠 쓴다.
    const student = session?.student?.accountId;
    const key =
      typeof userId === "string"
        ? `user:${userId}`
        : typeof student === "string"
          ? `student:${student}`
          : `ip:${clientIp(request) ?? "unknown"}`;
    const allowed = takeClientLogQuota(key, parsed.data.events.length);
    if (!allowed) return done(429);

    const userAgent = request.headers.get("user-agent")?.slice(0, 300);
    await recordErrorLogs(
      parsed.data.events.slice(0, allowed).map((event) => ({
        source: "client" as const,
        kind: event.kind,
        route: event.page,
        method: event.request?.method ?? null,
        status: event.request?.status ?? null,
        message: event.message,
        detail: event.detail ?? null,
        userId: typeof userId === "string" ? userId : null,
        requestId: request.headers.get("x-vercel-id"),
        context: {
          count: event.count,
          ...(event.firstAt ? { firstAt: event.firstAt } : {}),
          ...(event.release ? { clientRelease: event.release } : {}),
          ...(event.request ? { request: event.request } : {}),
          ...(typeof student === "string" ? { student } : {}),
          ...(userAgent ? { userAgent } : {}),
        },
      })),
    );
    return done(allowed < parsed.data.events.length ? 429 : 204);
  } catch {
    // 보고 경로가 또 오류를 낳지 않게 — 브라우저에는 조용히
    return done(204);
  }
}
