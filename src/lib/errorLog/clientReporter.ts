/**
 * 브라우저 보고기 — 화면에서 난 오류를 `POST /api/logs/client` 로 보낸다(원장님 2026-09-22 «브라우저 쪽 오류»).
 * 설치는 루트 레이아웃의 `ClientErrorLog` 가 한 번 한다. **설치하지 않으면 아무것도 안 보낸다** — 컴포넌트 시험이
 * `readAiJson` 을 불러도 네트워크가 안 나간다.
 *
 * 무엇을 보내나:
 *  - 잡히지 않은 오류 — `error` · `unhandledrejection`. 뜻 없는 것(교차 출처 «Script error.» · 확장 프로그램 ·
 *    ResizeObserver 경고 · 사용자 취소)은 뺀다.
 *  - `/api/…` 요청 실패 중 **서버가 기록하지 못한 것** — 네트워크 끊김, 플랫폼이 먼저 자른 413·504, 기록 번호 머리
 *    (`x-error-log-id`)가 없는 거절. 머리가 있으면 서버가 이미 한 줄을 남겼다. 15개 화면의 `fetch("/api/…")` 를
 *    하나하나 고치지 않고 `window.fetch` 를 한 번 감싼다 — 부르는 쪽이 받는 응답·예외는 **그대로**다.
 *  - 작업실 AI 응답은 여기서 안 보낸다 — 화면 문구를 아는 `readAiJson`(aiResponse.ts)이 보낸다. 네트워크 끊김만 여기서.
 *
 * 되먹임 금지: 보고 요청 자체는 감시하지 않는다. 받는 곳이 막으면(403·404 — 학생 세션 등) 그 화면에서는 멈추고,
 * 보고가 실패해도 그것을 또 보고하지 않는다. 같은 오류는 묶어 수를 센다. 한 화면이 보내는 양에도 상한이 있다.
 */
import {
  CLIENT_LOG_DETAIL_MAX,
  CLIENT_LOG_ENDPOINT,
  CLIENT_LOG_MAX_EVENTS,
  CLIENT_LOG_MESSAGE_MAX,
  CLIENT_LOG_PATH_MAX,
  ERROR_LOG_HEADER,
  type ClientErrorKind,
} from "@/contracts/errorLogValues";

/** 모았다가 보내는 간격 — 같은 오류가 쏟아지면 이 사이에 묶인다 */
export const CLIENT_REPORT_FLUSH_MS = 2000;
/** 한 화면(설치 한 번)이 보내는 사건 수 상한 */
export const CLIENT_REPORT_PAGE_LIMIT = 50;
/** 작업실 AI — 거절 응답은 readAiJson 이 화면 문구와 함께 보낸다 */
const AI_ENDPOINTS = new Set(["/api/studio/ai", "/api/dev/unified/ai"]);

export type ClientReport = {
  kind: ClientErrorKind;
  message: string;
  detail?: string;
  request?: { method?: string; path: string; status: number };
};
type Queued = {
  kind: ClientErrorKind;
  message: string;
  detail?: string;
  page: string;
  request?: { method?: string; path: string; status: number };
  count: number;
  firstAt: string;
  release?: string;
};

type State = {
  send: typeof fetch;
  queue: Map<string, Queued>;
  timer?: ReturnType<typeof setTimeout>;
  sent: number;
  stopped: boolean;
  release?: string;
};
let state: State | undefined;

const clip = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;
const pagePath = () =>
  clip(
    typeof location === "undefined" ? "" : location.pathname,
    CLIENT_LOG_PATH_MAX,
  );

// Match the development-only page gate. Check at use time: the root logger
// survives navigation and can capture fetch before the preview replaces it.
const isWorkspacePreview = () =>
  process.env.NODE_ENV === "development" &&
  typeof location !== "undefined" &&
  location.pathname === "/dev/workspace-alignment";

/** 사건 하나를 줄에 세운다 — 설치 전이면 버린다. 같은 것은 묶는다. */
export function reportClientError(report: ClientReport): void {
  const current = state;
  if (!current || current.stopped || isWorkspacePreview()) return;
  const event: Queued = {
    kind: report.kind,
    message: clip(report.message || "(문구 없음)", CLIENT_LOG_MESSAGE_MAX),
    ...(report.detail
      ? { detail: clip(report.detail, CLIENT_LOG_DETAIL_MAX) }
      : {}),
    page: pagePath(),
    ...(report.request
      ? {
          request: {
            ...(report.request.method
              ? { method: report.request.method.slice(0, 10) }
              : {}),
            path: clip(report.request.path, CLIENT_LOG_PATH_MAX),
            status: report.request.status,
          },
        }
      : {}),
    count: 1,
    firstAt: new Date().toISOString(),
    ...(current.release ? { release: current.release.slice(0, 64) } : {}),
  };
  const key = [
    event.kind,
    event.page,
    event.message,
    event.request?.method ?? "",
    event.request?.path ?? "",
    event.request?.status ?? "",
  ].join("|");
  const same = current.queue.get(key);
  if (same) same.count++;
  else if (current.queue.size < CLIENT_REPORT_PAGE_LIMIT)
    current.queue.set(key, event);
  schedule(current);
}

function schedule(current: State) {
  if (current.timer) return;
  current.timer = setTimeout(() => {
    current.timer = undefined;
    void flush(current);
  }, CLIENT_REPORT_FLUSH_MS);
}

function takeBatch(current: State): Queued[] {
  const room = Math.min(
    CLIENT_LOG_MAX_EVENTS,
    CLIENT_REPORT_PAGE_LIMIT - current.sent,
  );
  if (room <= 0) {
    current.queue.clear();
    return [];
  }
  const batch = [...current.queue.entries()].slice(0, room);
  for (const [key] of batch) current.queue.delete(key);
  current.sent += batch.length;
  return batch.map(([, event]) => event);
}

async function flush(current: State) {
  // Keep real-page events queued during preview; do not stop later reporting.
  if (current.stopped || isWorkspacePreview()) return;
  const events = takeBatch(current);
  if (!events.length) return;
  try {
    const response = await current.send(CLIENT_LOG_ENDPOINT, {
      method: "POST",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ events }),
    });
    // 받는 곳이 막았다(학생 세션 403 · 경로 없음 404) — 이 화면에서는 더 보내지 않는다
    if (response.status === 403 || response.status === 404)
      current.stopped = true;
  } catch {
    // 보고가 실패해도 또 보고하지 않는다
  }
  if (current.queue.size && !current.stopped) schedule(current);
}

/** 화면을 떠날 때 — 남은 것을 sendBeacon 으로(없으면 keepalive fetch) */
function flushOnLeave(current: State) {
  if (current.stopped || !current.queue.size || isWorkspacePreview()) return;
  if (current.timer) {
    clearTimeout(current.timer);
    current.timer = undefined;
  }
  const events = takeBatch(current);
  if (!events.length) return;
  const body = JSON.stringify({ events });
  try {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.sendBeacon === "function"
    )
      if (navigator.sendBeacon(CLIENT_LOG_ENDPOINT, body)) return;
    void current
      .send(CLIENT_LOG_ENDPOINT, { method: "POST", keepalive: true, body })
      .catch(() => undefined);
  } catch {
    // 떠나는 중 — 조용히
  }
}

const isAbort = (value: unknown) =>
  !!value &&
  typeof value === "object" &&
  "name" in value &&
  ((value as { name?: unknown }).name === "AbortError" ||
    (value as { name?: unknown }).name === "TimeoutError");

function describe(value: unknown): { message: string; detail?: string } {
  if (value instanceof Error)
    return { message: `${value.name}: ${value.message}`, detail: value.stack };
  if (typeof value === "string") return { message: value };
  try {
    return { message: JSON.stringify(value) ?? String(value) };
  } catch {
    return { message: String(value) };
  }
}

const IGNORED_MESSAGES = [/^Script error\.?$/i, /ResizeObserver loop/i];
const IGNORED_FILES = /^(chrome|moz|safari|safari-web)-extension:\/\//;

function onError(event: ErrorEvent) {
  const text =
    event.message || (event.error instanceof Error ? event.error.message : "");
  if (IGNORED_MESSAGES.some((pattern) => pattern.test(text))) return;
  if (event.filename && IGNORED_FILES.test(event.filename)) return;
  if (isAbort(event.error)) return;
  const described =
    event.error !== undefined ? describe(event.error) : { message: text };
  const where = event.filename
    ? `\n@ ${event.filename}:${event.lineno ?? 0}:${event.colno ?? 0}`
    : "";
  reportClientError({
    kind: "client-exception",
    message: described.message,
    detail: `${described.detail ?? ""}${where}`.trim() || undefined,
  });
}

function onRejection(event: PromiseRejectionEvent) {
  if (isAbort(event.reason)) return;
  const described = describe(event.reason);
  reportClientError({
    kind: "client-exception",
    message: `Unhandled rejection: ${described.message}`,
    detail: described.detail,
  });
}

function watchedPath(input: RequestInfo | URL): string | undefined {
  try {
    const raw =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const url = new URL(raw, location.href);
    if (url.origin !== location.origin) return undefined;
    if (
      !url.pathname.startsWith("/api/") ||
      url.pathname === CLIENT_LOG_ENDPOINT
    )
      return undefined;
    return url.pathname;
  } catch {
    return undefined;
  }
}

async function bodyHead(response: Response): Promise<string | undefined> {
  const type = response.headers.get("content-type") ?? "";
  if (type && !/json|text|html|xml/i.test(type)) return `(${type})`;
  try {
    return (await response.text()).slice(0, 500) || undefined;
  } catch {
    return undefined;
  }
}

/** 서버가 기록하지 못한 거절인가 — 기록 번호 머리가 없으면 그렇다 */
export const serverLogged = (response: Response) =>
  !!response.headers.get(ERROR_LOG_HEADER);

/**
 * 보고기를 설치한다 — 한 번만(두 번 불러도 한 번 감싼다). 돌려받은 함수로 푼다.
 */
export function installClientErrorLog(): () => void {
  if (typeof window === "undefined") return () => {};
  if (state) return () => {};
  const original = window.fetch;
  const current: State = {
    send: original.bind(window),
    queue: new Map(),
    sent: 0,
    stopped: false,
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  };
  state = current;

  const patched: typeof fetch = async (input, init) => {
    const path = watchedPath(input);
    if (!path) return original.call(window, input, init);
    const method = (
      init?.method ?? (input instanceof Request ? input.method : "GET")
    ).toUpperCase();
    let response: Response;
    try {
      response = await original.call(window, input, init);
    } catch (error) {
      if (!isAbort(error) && !init?.signal?.aborted) {
        const described = describe(error);
        reportClientError({
          kind: "client-request-failed",
          message: described.message,
          request: { method, path, status: 0 },
        });
      }
      throw error;
    }
    if (!response.ok && !serverLogged(response) && !AI_ENDPOINTS.has(path)) {
      let copy: Response | undefined;
      try {
        copy = response.clone();
      } catch {
        copy = undefined;
      }
      void (async () => {
        reportClientError({
          kind: "client-request-failed",
          message: `HTTP ${response.status}`,
          detail: copy ? await bodyHead(copy) : undefined,
          request: { method, path, status: response.status },
        });
      })();
    }
    return response;
  };
  window.fetch = patched;

  const leave = () => flushOnLeave(current);
  const hidden = () => {
    if (document.visibilityState === "hidden") leave();
  };
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  window.addEventListener("pagehide", leave);
  document.addEventListener("visibilitychange", hidden);

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    window.removeEventListener("pagehide", leave);
    document.removeEventListener("visibilitychange", hidden);
    if (window.fetch === patched) window.fetch = original;
    if (current.timer) clearTimeout(current.timer);
    if (state === current) state = undefined;
  };
}
