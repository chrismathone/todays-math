/**
 * 라우트 틀 — `src/app/api/**\/route.ts` 의 **모든** 내보낸 처리기를 이것으로 감싼다
 * (원장님 2026-09-22 «모든 곳에 로그를 붙여서 오류 로그 수집»).
 *
 *   export const GET = withErrorLog("/api/tests/[id]", handleGet);
 *
 * 🔴 빠뜨림은 시험이 잡는다 — `src/__tests__/unit/errorLogRouteCoverage.test.ts` 가 모든 route.ts 의 모든
 *    내보낸 메서드가 이 틀을 지나는지, 첫 인자가 그 파일의 경로와 같은지 센다. 예외는 브라우저 오류를 받는
 *    `/api/logs/client` 하나(되먹임 고리 금지 — 그 시험의 EXEMPT).
 *
 * 하는 일:
 *  - 성공(< 400)은 **손대지 않는다** — 같은 응답 객체를 그대로 돌려준다.
 *  - 4xx·5xx — 본문을 **복제해서** 읽고(원래 응답은 부르는 쪽이 그대로 읽는다) 한 줄을 남긴다.
 *    응답 머리 `x-error-log-id` 에 그 줄 id 를 붙인다 — 브라우저는 이것이 붙은 실패를 다시 안 보낸다.
 *  - 던진 예외 — 한 줄을 남기고 **같은 예외를 다시 던진다**(Next 의 500 을 바꾸지 않는다).
 *    Next 의 흐름 신호(redirect·notFound — digest `NEXT_…`)는 오류가 아니다.
 *  - 깊은 곳의 메모(`noteErrorLog` — zod 칸·엔진 사유·AI 시도 기록·크롭 이미지)를 그 줄에 싣는다.
 *  - 쓰기는 `after()` — 응답을 붙잡지 않는다. 요청 밖(시험·스크립트)에서는 바로 쓰되 기다리지 않는다.
 *
 * 🔴 화면 문구는 바꾸지 않는다(D-08) — 응답 본문은 한 글자도 안 건드린다. 로그에만 더 싣는다.
 * 요청 본문은 싣지 않는다 — 경로·질의(비밀 걸러서)·형식·크기·참조 화면·브라우저만.
 */
import { randomUUID } from "node:crypto";

import { after } from "next/server";

import { ERROR_LOG_HEADER } from "@/contracts/errorLogValues";

import { recordErrorLog, type ErrorLogEntry } from "./record";
import { redactSecrets } from "./sanitize";
import { admitServerLog } from "./serverQuota";
import {
  createErrorLogNotes,
  runWithErrorLogNotes,
  type ErrorLogNotes,
} from "./scope";

/** 감싼 처리기가 들고 있는 표지 — 값은 라우트 틀. 가드와 조회가 «이 처리기는 틀을 지났다»를 행동으로 확인한다. */
export const ERROR_LOG_ROUTE = Symbol.for("todays-math.errorLog.route");

const BODY_READ_MAX = 16 * 1024;

const pending = new Set<Promise<unknown>>();

/** 응답 뒤에 쓴다. `after()` 는 요청 안에서만 된다 — 밖이면 바로 돌리고 기다리지 않는다. */
function schedule(task: () => Promise<unknown>) {
  const run = () => task().catch(() => undefined);
  try {
    after(run);
    return;
  } catch {
    // 요청 범위 밖 — 시험·스크립트가 처리기를 함수로 직접 부를 때
  }
  const promise = run();
  pending.add(promise);
  void promise.finally(() => pending.delete(promise));
}

/** 시험용 — 요청 밖에서 바로 돌린 쓰기가 다 끝나기를 기다린다. */
export async function settleErrorLogWrites(): Promise<void> {
  while (pending.size) await Promise.all([...pending]);
}

function isFrameworkSignal(error: unknown): boolean {
  const digest =
    error && typeof error === "object" && "digest" in error
      ? (error as { digest?: unknown }).digest
      : undefined;
  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_") ||
      digest === "DYNAMIC_SERVER_USAGE" ||
      digest.startsWith("BAILOUT_TO_CLIENT_SIDE_RENDERING"))
  );
}

export function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const head = `${error.name}: ${error.message}`;
  const stack = error.stack?.includes(error.message)
    ? error.stack
    : `${head}\n${error.stack ?? ""}`;
  const cause =
    error.cause instanceof Error
      ? `\n[cause] ${error.cause.name}: ${error.cause.message}`
      : "";
  return `${stack}${cause}`;
}

type RequestSummary = {
  path: string;
  query?: Record<string, string>;
  contentType?: string;
  contentLength?: number;
  referer?: string;
  userAgent?: string;
};

function summarize(request: Request): RequestSummary {
  const url = new URL(request.url);
  // 비밀 질의(token 따위)는 여기서 가린다 — 기록기보다 먼저, 틀을 떠나는 값부터 깨끗하게
  const query = redactSecrets(
    Object.fromEntries(
      [...url.searchParams].map(([key, value]) => [key, value.slice(0, 200)]),
    ),
  ) as Record<string, string>;
  const length = Number(request.headers.get("content-length"));
  let referer: string | undefined;
  try {
    const raw = request.headers.get("referer");
    // 경로만 — 질의 문자열에는 토큰이 실릴 수 있다
    if (raw) referer = new URL(raw).pathname;
  } catch {
    referer = undefined;
  }
  return {
    path: url.pathname,
    ...(Object.keys(query).length ? { query } : {}),
    ...(request.headers.get("content-type")
      ? { contentType: request.headers.get("content-type")!.slice(0, 100) }
      : {}),
    ...(Number.isFinite(length) && length > 0 ? { contentLength: length } : {}),
    ...(referer ? { referer } : {}),
    ...(request.headers.get("user-agent")
      ? { userAgent: request.headers.get("user-agent")!.slice(0, 300) }
      : {}),
  };
}

/**
 * 요청 요약 — 부른 쪽이 요청을 안 넘길 수도 있다(인자 없는 처리기 `GET()` 를 시험이 그렇게 부른다).
 * 요약이 실패해도 기록은 남는다.
 */
function describeRequest(value: unknown): {
  method: string | null;
  request: RequestSummary | Record<string, never>;
  requestId: string | null;
} {
  try {
    if (value instanceof Request)
      return {
        method: value.method,
        request: summarize(value),
        requestId: value.headers.get("x-vercel-id"),
      };
  } catch {
    // 요청 모양이 아니다 — 아래로
  }
  return { method: null, request: {}, requestId: null };
}

/** 양 제한의 «사람» — 세션 계정, 없으면 IP(열쇠로만 쓰고 기록에는 안 싣는다). */
function whoOf(notes: ErrorLogNotes, request: unknown): string {
  if (notes.userId) return `user:${notes.userId}`;
  if (request instanceof Request) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip")?.trim();
    if (ip) return `ip:${ip}`;
  }
  return "anon";
}

/** 같은 경로·상태·사람의 폭주를 묶는다(serverQuota.ts). 남긴다면 앞 창에서 버린 수를 메모에 싣는다. */
function admit(
  info: { route: string; status: number },
  notes: ErrorLogNotes,
  request: unknown,
): boolean {
  const { record, suppressedBefore } = admitServerLog(
    `${info.route}|${info.status}|${whoOf(notes, request)}`,
  );
  if (record && suppressedBefore)
    notes.context.suppressedBefore = suppressedBefore;
  return record;
}

async function routeParams(context: unknown) {
  try {
    const params =
      context && typeof context === "object" && "params" in context
        ? await (context as { params: unknown }).params
        : undefined;
    return params && typeof params === "object"
      ? redactSecrets(params)
      : undefined;
  } catch {
    return undefined;
  }
}

async function readCapped(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let text = "";
  try {
    while (text.length < BODY_READ_MAX) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return text.slice(0, BODY_READ_MAX);
}

function formatDetails(details: unknown): string | undefined {
  if (details === undefined || details === null) return undefined;
  if (typeof details === "string") return details;
  if (Array.isArray(details))
    return details
      .map((item) =>
        item && typeof item === "object" && "message" in item
          ? `${String((item as { field?: unknown; path?: unknown }).field ?? (item as { path?: unknown }).path ?? "(root)")}: ${String((item as { message: unknown }).message)}`
          : JSON.stringify(item),
      )
      .join("\n");
  return JSON.stringify(details);
}

/** 거절 응답의 본문 — `{ error: 문구, detail? }`(작업실) 과 `{ error: { code, message, details } }`(jsonError) 둘 다. */
async function readRejection(response: Response | undefined): Promise<{
  message?: string;
  detail?: string;
  code?: string;
  contentType?: string;
}> {
  if (!response) return {};
  const contentType = response.headers.get("content-type") ?? undefined;
  let text: string;
  try {
    text = await readCapped(response);
  } catch {
    return { contentType };
  }
  if (!text.trim()) return { contentType };
  if (/json/i.test(contentType ?? "") || /^\s*[{[]/.test(text)) {
    try {
      const body = JSON.parse(text) as Record<string, unknown>;
      const error = body?.error;
      if (typeof error === "string")
        return {
          contentType,
          message: error,
          detail: typeof body.detail === "string" ? body.detail : undefined,
        };
      if (error && typeof error === "object") {
        const e = error as Record<string, unknown>;
        return {
          contentType,
          message: typeof e.message === "string" ? e.message : undefined,
          code: typeof e.code === "string" ? e.code : undefined,
          detail:
            formatDetails(e.details) ??
            (typeof body.detail === "string" ? body.detail : undefined),
        };
      }
      return {
        contentType,
        message: typeof body.message === "string" ? body.message : undefined,
        detail:
          typeof body.detail === "string" ? body.detail : text.slice(0, 2000),
      };
    } catch {
      // JSON 인 척한 본문 — 앞부분을 원문으로
    }
  }
  if (/^text\/|json|xml|html/i.test(contentType ?? "text/plain"))
    return { contentType, detail: text.slice(0, 2000) };
  return { contentType, detail: `(${contentType} 본문)` };
}

function entryFrom(
  base: {
    id?: string;
    route: string;
    method: string | null;
    status: number;
    request: RequestSummary | Record<string, never>;
    requestId: string | null;
    durationMs: number;
  },
  notes: ErrorLogNotes,
  params: unknown,
  rejection: Awaited<ReturnType<typeof readRejection>>,
  thrown?: unknown,
): ErrorLogEntry {
  const detail = [
    ...notes.details,
    ...(rejection.detail ? [rejection.detail] : []),
    ...(thrown !== undefined ? [describeError(thrown)] : []),
  ].join("\n---\n");
  return {
    id: base.id,
    source: "server",
    kind: notes.kind ?? (base.status >= 500 ? "api-error" : "api-rejected"),
    route: base.route,
    method: base.method,
    status: base.status,
    action: notes.action ?? null,
    message: rejection.message ?? null,
    detail: detail || null,
    context: {
      request: { ...base.request, ...(params ? { params } : {}) },
      ...(rejection.code || rejection.contentType
        ? {
            response: {
              ...(rejection.code ? { code: rejection.code } : {}),
              ...(rejection.contentType
                ? { contentType: rejection.contentType }
                : {}),
            },
          }
        : {}),
      ...(thrown !== undefined ? { thrown: true } : {}),
      ...notes.context,
    },
    userId: notes.userId ?? null,
    requestId: base.requestId,
    durationMs: base.durationMs,
    image: notes.image ?? null,
  };
}

type RouteHandler = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 처리기의 모양(Request·NextRequest, params 유무)을 그대로 보존한다
  ...args: any[]
) => Response | void | Promise<Response | undefined | void>;

export function withErrorLog<H extends RouteHandler>(
  route: string,
  handler: H,
  options: { metadataOnly?: boolean } = {},
): ((...args: Parameters<H>) => Promise<Awaited<ReturnType<H>>>) & {
  readonly [ERROR_LOG_ROUTE]: string;
} {
  const wrapped = async (
    ...args: Parameters<H>
  ): Promise<Awaited<ReturnType<H>>> => {
    const started = Date.now();
    const notes = createErrorLogNotes();
    const base = () => ({
      route,
      ...(options.metadataOnly
        ? {
            method: args[0] instanceof Request ? args[0].method : null,
            request: { path: route },
            requestId: null,
          }
        : describeRequest(args[0])),
      durationMs: Date.now() - started,
    });
    let response: Awaited<ReturnType<H>>;
    try {
      response = (await runWithErrorLogNotes(notes, () =>
        handler(...args),
      )) as Awaited<ReturnType<H>>;
    } catch (error) {
      if (error instanceof Error && error.name === "ClassAccessDenied") {
        return Response.json(
          { error: { code: "FORBIDDEN", message: error.message } },
          { status: 403 },
        ) as Awaited<ReturnType<H>>;
      }
      const info = { ...base(), status: 500 };
      if (!isFrameworkSignal(error) && admit(info, notes, args[0])) {
        schedule(async () =>
          recordErrorLog(
            entryFrom(
              info,
              options.metadataOnly ? metadataNotes(notes) : notes,
              options.metadataOnly ? undefined : await routeParams(args[1]),
              {},
              options.metadataOnly ? new Error("요청 처리 오류") : error,
            ),
          ),
        );
      }
      throw error;
    }
    // 처리기가 아무것도 안 돌려준 것(형으로만 가능 — Next 가 500 으로 바꾼다)은 여기서 판정하지 않는다
    if (response instanceof Response && response.status >= 400)
      logRejection(
        response,
        { ...base(), status: response.status },
        notes,
        () => routeParams(args[1]),
        args[0],
        options.metadataOnly,
      );
    return response;
  };
  return Object.assign(wrapped, { [ERROR_LOG_ROUTE]: route });
}

/** 거절 응답 하나를 기록한다 — 본문은 복제해서 읽고, 머리에 줄 id 를 붙인다. */
function logRejection(
  response: Response,
  info: Omit<Parameters<typeof entryFrom>[0], "id">,
  notes: ErrorLogNotes,
  params: () => Promise<unknown>,
  request: unknown,
  metadataOnly = false,
) {
  if (!admit(info, notes, request)) {
    // 넘친 것 — 줄은 안 남기지만 머리는 붙인다(브라우저가 같은 실패를 다시 보내지 않게). 버린 수는 serverQuota 가 센다
    try {
      response.headers.set(ERROR_LOG_HEADER, "suppressed");
    } catch {
      // 머리가 잠긴 응답
    }
    return;
  }
  const id = randomUUID();
  let copy: Response | undefined;
  try {
    copy = metadataOnly ? undefined : response.clone();
  } catch {
    copy = undefined; // 이미 읽힌 본문 — 머리와 상태만 남긴다
  }
  try {
    response.headers.set(ERROR_LOG_HEADER, id);
  } catch {
    // 머리가 잠긴 응답(fetch 로 받아 넘긴 것 등) — 기록은 그대로 남긴다
  }
  schedule(async () =>
    recordErrorLog(
      entryFrom(
        { ...info, id },
        metadataOnly ? metadataNotes(notes) : notes,
        metadataOnly ? undefined : await params(),
        metadataOnly
          ? { message: "요청을 처리하지 못했습니다." }
          : await readRejection(copy),
      ),
    ),
  );
}

/**
 * 라우트 틀 **밖**에서 낸 거절 응답을 기록한다 — 관문(`src/proxy.ts`)의 API 403 이 그것이다.
 * 틀은 관문 뒤에 있어 그 거절을 못 본다(원장님 2026-09-22 «거절되었을 때 로그를 전부»). 응답은 그대로 돌려준다.
 */
function metadataNotes(notes: ErrorLogNotes): ErrorLogNotes {
  return { action: notes.action, kind: notes.kind, details: [], context: {} };
}

export function logRejectedResponse<R extends Response>(options: {
  route: string;
  request: Request;
  response: R;
  userId?: string | null;
  context?: Record<string, unknown>;
  metadataOnly?: boolean;
}): R {
  if (options.response.status < 400) return options.response;
  const notes = createErrorLogNotes();
  if (options.userId) notes.userId = options.userId;
  Object.assign(notes.context, options.context ?? {});
  logRejection(
    options.response,
    {
      route: options.route,
      ...(options.metadataOnly
        ? {
            method: options.request.method,
            request: { path: options.route },
            requestId: null,
          }
        : describeRequest(options.request)),
      status: options.response.status,
      durationMs: 0,
    },
    notes,
    async () => undefined,
    options.request,
    options.metadataOnly,
  );
  return options.response;
}
