/**
 * 브라우저 보고기 — `src/lib/errorLog/clientReporter.ts` (루트 레이아웃의 `ClientErrorLog` 가 설치).
 *
 *  ⑴ 잡히지 않은 오류(`error` · `unhandledrejection`)를 보낸다 — 뜻 없는 것(교차 출처 «Script error.»·확장 프로그램·
 *     ResizeObserver 경고·사용자 취소)은 빼고.
 *  ⑵ `/api/…` 요청 실패 중 **서버가 기록하지 못한 것**만 보낸다 — 네트워크 끊김 · 플랫폼이 먼저 자른 413/504 ·
 *     기록 번호 머리(`x-error-log-id`)가 없는 거절. 머리가 있으면 서버가 이미 한 줄을 남겼다.
 *  ⑶ 같은 오류가 쏟아지면 **묶어서** 보낸다(수를 센다). 한 화면이 보내는 양에도 상한.
 *  ⑷ 🔴 되먹임 금지 — 보고 요청 자체는 감시하지 않고, 받는 곳이 막으면(403·404) 그 화면에서는 멈춘다.
 *  ⑸ 설치하지 않으면 아무것도 안 보낸다 — 컴포넌트 시험이 `readAiJson` 을 불러도 네트워크가 안 나간다.
 *  ⑹ 작업실 AI 응답(`readAiJson`) — 화면 문구를 아는 곳이 보낸다. JSON 이 아닌 200 도 실패다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readAiJson } from "@/components/unified/aiResponse";
import {
  CLIENT_LOG_ENDPOINT,
  ERROR_LOG_HEADER,
} from "@/contracts/errorLogValues";
import {
  CLIENT_REPORT_FLUSH_MS,
  CLIENT_REPORT_PAGE_LIMIT,
  installClientErrorLog,
  reportClientError,
} from "@/lib/errorLog/clientReporter";
import { STUDIO_AI_TOO_LARGE } from "@/lib/studio-ai/limits";

type Sent = { events: Record<string, unknown>[] };
let network: ReturnType<typeof vi.fn>;
let uninstall: (() => void) | undefined;
const originalFetch = window.fetch;

/** 보고기가 보낸 묶음들 */
const sent = (): Sent[] =>
  network.mock.calls
    .filter(([input]) => String(input).endsWith(CLIENT_LOG_ENDPOINT))
    .map(([, init]) => JSON.parse(String((init as RequestInit).body)) as Sent);
const events = () => sent().flatMap((batch) => batch.events);
async function flush() {
  await vi.advanceTimersByTimeAsync(CLIENT_REPORT_FLUSH_MS + 10);
}

beforeEach(() => {
  vi.useFakeTimers();
  window.history.replaceState(null, "", "/studio?token=secret");
  network = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith(CLIENT_LOG_ENDPOINT))
      return new Response(null, { status: 204 });
    if (url.includes("/api/boom"))
      return Response.json({ error: "x" }, { status: 500 });
    if (url.includes("/api/logged"))
      return Response.json(
        { error: "서버가 기록함" },
        { status: 422, headers: { [ERROR_LOG_HEADER]: "abc" } },
      );
    if (url.includes("/api/platform-413"))
      return new Response("Request Entity Too Large", {
        status: 413,
        headers: { "content-type": "text/plain" },
      });
    if (url.includes("/api/offline")) throw new TypeError("Failed to fetch");
    return Response.json({ ok: true });
  });
  window.fetch = network as unknown as typeof fetch;
  uninstall = installClientErrorLog();
});
afterEach(() => {
  uninstall?.();
  uninstall = undefined;
  window.fetch = originalFetch;
  vi.useRealTimers();
});

describe("⑴ 잡히지 않은 오류", () => {
  it("error 이벤트 — 문구·스택·화면 경로(질의 문자열은 뺀다)", async () => {
    const error = new TypeError(
      "Cannot read properties of undefined (reading 'svg')",
    );
    window.dispatchEvent(
      new ErrorEvent("error", {
        error,
        message: error.message,
        filename: "https://x/app.js",
      }),
    );
    await flush();
    expect(events()).toEqual([
      expect.objectContaining({
        kind: "client-exception",
        message:
          "TypeError: Cannot read properties of undefined (reading 'svg')",
        page: "/studio",
        count: 1,
      }),
    ]);
    expect(String(events()[0].detail)).toContain("TypeError");
    expect(JSON.stringify(sent())).not.toContain("secret");
  });

  it("unhandledrejection — 이유가 Error 가 아니어도", async () => {
    const event = new Event("unhandledrejection") as Event & {
      reason: unknown;
    };
    Object.assign(event, { reason: "도형 편집기 초기화 실패" });
    window.dispatchEvent(event);
    await flush();
    expect(events()[0]).toMatchObject({
      kind: "client-exception",
      message: "Unhandled rejection: 도형 편집기 초기화 실패",
    });
  });

  it.each([
    [
      "교차 출처 Script error.",
      new ErrorEvent("error", { message: "Script error." }),
    ],
    [
      "확장 프로그램",
      new ErrorEvent("error", {
        message: "boom",
        filename: "chrome-extension://abcdef/content.js",
      }),
    ],
    [
      "ResizeObserver 경고",
      new ErrorEvent("error", {
        message:
          "ResizeObserver loop completed with undelivered notifications.",
      }),
    ],
  ])("뜻 없는 것은 뺀다 — %s", async (_label, event) => {
    window.dispatchEvent(event);
    await flush();
    expect(events()).toEqual([]);
  });

  it("사용자 취소(AbortError)로 끝난 약속은 오류가 아니다", async () => {
    const event = new Event("unhandledrejection") as Event & {
      reason: unknown;
    };
    Object.assign(event, { reason: new DOMException("aborted", "AbortError") });
    window.dispatchEvent(event);
    await flush();
    expect(events()).toEqual([]);
  });
});

describe("⑵ 요청 실패 — 서버가 기록하지 못한 것만", () => {
  it("서버가 기록 번호를 붙인 거절은 다시 안 보낸다", async () => {
    await fetch("/api/logged", { method: "POST" });
    await flush();
    expect(events()).toEqual([]);
  });

  it("번호 없는 거절(플랫폼이 먼저 자른 413) — 상태·경로·메서드·본문 앞부분", async () => {
    const res = await fetch("/api/platform-413", { method: "POST" });
    // 부르는 쪽은 원래 응답을 그대로 읽는다
    expect(await res.text()).toBe("Request Entity Too Large");
    await flush();
    expect(events()).toEqual([
      expect.objectContaining({
        kind: "client-request-failed",
        page: "/studio",
        request: { method: "POST", path: "/api/platform-413", status: 413 },
        detail: "Request Entity Too Large",
      }),
    ]);
  });

  it("네트워크 끊김 — 상태 0 · 예외는 그대로 던진다", async () => {
    await expect(fetch("/api/offline")).rejects.toThrow("Failed to fetch");
    await flush();
    expect(events()[0]).toMatchObject({
      kind: "client-request-failed",
      message: "TypeError: Failed to fetch",
      request: { method: "GET", path: "/api/offline", status: 0 },
    });
  });

  it("사용자가 취소한 요청은 보내지 않는다", async () => {
    network.mockRejectedValueOnce(new DOMException("aborted", "AbortError"));
    await expect(fetch("/api/anything")).rejects.toThrow();
    await flush();
    expect(events()).toEqual([]);
  });

  it("우리 /api 밖(다른 주소·화면 요청)은 보지 않는다", async () => {
    network.mockResolvedValueOnce(new Response("no", { status: 500 }));
    await fetch("https://cdn.example.com/x.js");
    network.mockResolvedValueOnce(new Response("no", { status: 500 }));
    await fetch("/studio?_rsc=1");
    await flush();
    expect(events()).toEqual([]);
  });

  it("작업실 AI 의 거절 응답은 여기서 안 보낸다 — 화면 문구를 아는 readAiJson 이 보낸다", async () => {
    network.mockResolvedValueOnce(new Response("gateway", { status: 504 }));
    await fetch("/api/studio/ai", { method: "POST" });
    await flush();
    expect(events()).toEqual([]);
  });
});

describe("⑶ 묶어서 · 상한", () => {
  it("같은 오류 다섯 번 → 한 건, count 5", async () => {
    for (let i = 0; i < 5; i++)
      window.dispatchEvent(
        new ErrorEvent("error", {
          message: "같은 오류",
          error: new Error("같은 오류"),
        }),
      );
    await flush();
    expect(events()).toHaveLength(1);
    expect(events()[0]).toMatchObject({ count: 5 });
  });

  it(`한 화면이 보내는 사건은 ${CLIENT_REPORT_PAGE_LIMIT}건까지`, async () => {
    for (let i = 0; i < CLIENT_REPORT_PAGE_LIMIT + 20; i++) {
      reportClientError({ kind: "client-exception", message: `오류 ${i}` });
      await flush();
    }
    expect(events()).toHaveLength(CLIENT_REPORT_PAGE_LIMIT);
  });
});

describe("⑷ 되먹임 금지", () => {
  it("보고 요청이 실패해도 그것을 또 보고하지 않는다", async () => {
    network.mockImplementation(async (input: RequestInfo | URL) =>
      String(input).endsWith(CLIENT_LOG_ENDPOINT)
        ? new Response(null, { status: 500 })
        : Response.json({}),
    );
    reportClientError({ kind: "client-exception", message: "하나" });
    await flush();
    await flush();
    await flush();
    expect(sent()).toHaveLength(1);
    expect(events().map((e) => e.message)).toEqual(["하나"]);
  });

  it("받는 곳이 막으면(403 — 학생 세션 등) 그 화면에서는 멈춘다", async () => {
    network.mockImplementation(async (input: RequestInfo | URL) =>
      String(input).endsWith(CLIENT_LOG_ENDPOINT)
        ? new Response(null, { status: 403 })
        : Response.json({}),
    );
    reportClientError({ kind: "client-exception", message: "첫째" });
    await flush();
    reportClientError({ kind: "client-exception", message: "둘째" });
    await flush();
    expect(sent()).toHaveLength(1);
  });
});

describe("⑸ 설치하지 않으면 아무것도 안 보낸다", () => {
  it("설치를 풀면 fetch 도 원래대로, 보고도 멈춘다", async () => {
    uninstall?.();
    uninstall = undefined;
    expect(window.fetch).toBe(network);
    reportClientError({ kind: "client-exception", message: "안 감" });
    await flush();
    expect(sent()).toEqual([]);
  });

  it("두 번 설치해도 한 번만 감싼다", async () => {
    const again = installClientErrorLog();
    await fetch("/api/boom");
    await flush();
    expect(events()).toHaveLength(1);
    again();
  });
});

describe("⑹ 작업실 AI 응답(readAiJson)", () => {
  it("서버가 기록하지 못한 거절 — 화면에 나간 문구 그대로", async () => {
    const response = new Response("Request Entity Too Large", {
      status: 413,
      headers: { "content-type": "text/plain" },
    });
    Object.defineProperty(response, "url", {
      value: "http://localhost/api/studio/ai",
    });
    await expect(readAiJson(response)).rejects.toThrow();
    await flush();
    expect(events()).toEqual([
      expect.objectContaining({
        kind: "client-request-failed",
        request: expect.objectContaining({
          path: "/api/studio/ai",
          status: 413,
        }),
        detail: "Request Entity Too Large",
      }),
    ]);
    // 화면 문구(aiFailureMessage)가 message 로
    expect(events()[0].message).toBe(STUDIO_AI_TOO_LARGE);
  });

  it("서버가 기록한 거절은 다시 안 보낸다", async () => {
    const response = Response.json(
      { error: "도형을 다시 그리지 못했습니다. 원본은 유지됩니다." },
      { status: 422, headers: { [ERROR_LOG_HEADER]: "id-1" } },
    );
    await expect(readAiJson(response)).rejects.toThrow();
    await flush();
    expect(events()).toEqual([]);
  });

  it("JSON 이 아닌 200(로그인 화면 따위)도 실패로 보낸다", async () => {
    const response = new Response("<!doctype html><title>로그인</title>", {
      status: 200,
      headers: { "content-type": "text/html" },
    });
    Object.defineProperty(response, "url", {
      value: "http://localhost/api/studio/ai",
    });
    await expect(readAiJson(response)).rejects.toThrow(
      "AI 응답을 읽지 못했습니다",
    );
    await flush();
    expect(events()[0]).toMatchObject({
      kind: "client-request-failed",
      message: "AI 응답을 읽지 못했습니다. 다시 시도해 주세요.",
      request: expect.objectContaining({ status: 200 }),
    });
    expect(String(events()[0].detail)).toContain("<!doctype html>");
  });
});
