/**
 * 라우트 틀 `withErrorLog` — `src/app/api/**\/route.ts` 의 모든 처리기가 이것을 지난다(가드: errorLogRouteCoverage.test.ts).
 *
 * 지키는 것:
 *  ⑴ 성공 응답은 **손대지 않는다** — 같은 객체, 머리도 그대로, 기록 없음.
 *  ⑵ 4xx·5xx 는 한 줄 — 본문을 **복제해서** 읽는다(부르는 쪽은 원래 본문을 그대로 읽는다).
 *  ⑶ 던진 예외는 기록하고 **그대로 다시 던진다**(Next 의 500 을 바꾸지 않는다).
 *  ⑷ 깊은 곳의 메모(zod 칸·엔진 사유·시도 기록·이미지)가 그 줄에 실린다.
 *  ⑸ 🔴 화면 문구는 바꾸지 않는다(D-08) — 응답 본문은 한 글자도 안 바뀐다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/errorLog/record", () => ({
  recordErrorLog: vi.fn(async () => true),
}));

import { ERROR_LOG_HEADER } from "@/contracts/errorLogValues";
import { recordErrorLog } from "@/lib/errorLog/record";
import { noteErrorLog } from "@/lib/errorLog/scope";
import {
  resetServerLogQuota,
  SERVER_LOG_PER_KEY_PER_MINUTE,
} from "@/lib/errorLog/serverQuota";
import {
  ERROR_LOG_ROUTE,
  settleErrorLogWrites,
  withErrorLog,
} from "@/lib/errorLog/withErrorLog";

const record = vi.mocked(recordErrorLog);
/** 부르는 쪽이 요청을 넘기는 처리기의 모양 — 본문은 요청을 안 봐도 된다 */
type Handler = (request: Request) => Promise<Response>;
type WithParams = (
  request: Request,
  context: { params: Promise<{ id: string }> },
) => Promise<Response>;

function req(
  url = "http://localhost/api/tests/abc?page=2",
  init?: RequestInit,
) {
  return new Request(url, init);
}
async function entries() {
  await settleErrorLogWrites();
  return record.mock.calls.map(([entry]) => entry);
}

beforeEach(() => {
  record.mockClear();
  resetServerLogQuota();
});
afterEach(() => vi.unstubAllEnvs());

describe("⑴ 성공은 손대지 않는다", () => {
  it("같은 응답 객체 · 머리 그대로 · 기록 없음", async () => {
    const original = Response.json({ data: 1 });
    const GET = withErrorLog<Handler>("/api/tests/[id]", async () => original);
    const res = await GET(req());
    expect(res).toBe(original);
    expect(res.headers.get(ERROR_LOG_HEADER)).toBeNull();
    expect(await entries()).toEqual([]);
  });

  it("성공한 요청에 남긴 메모는 버린다", async () => {
    const POST = withErrorLog<Handler>("/api/studio/ai", async () => {
      noteErrorLog({
        detail: "안 쓰일 메모",
        image: "data:image/png;base64,AA==",
      });
      return Response.json({ ok: true });
    });
    await POST(req("http://localhost/api/studio/ai", { method: "POST" }));
    expect(await entries()).toEqual([]);
  });
});

describe("⑵ 거절·실패는 한 줄", () => {
  it("400 계약 실패 — 어느 칸이 왜 틀렸는지(details)가 원문에 · 본문은 부르는 쪽이 그대로 읽는다", async () => {
    const body = {
      error: {
        code: "VALIDATION_ERROR",
        message: "요청 값이 올바르지 않습니다.",
        details: [
          { field: "classId", message: "올바른 UUID 가 아닙니다" },
          { field: "range.end", message: "필수 입력입니다" },
        ],
      },
    };
    const POST = withErrorLog<Handler>("/api/tests/generate", async () =>
      Response.json(body, { status: 400 }),
    );
    const res = await POST(
      req("http://localhost/api/tests/generate", { method: "POST" }),
    );
    // 부르는 쪽(브라우저)이 받는 본문은 그대로다
    expect(await res.json()).toEqual(body);
    const [entry] = await entries();
    expect(entry).toMatchObject({
      source: "server",
      kind: "api-rejected",
      route: "/api/tests/generate",
      method: "POST",
      status: 400,
      message: "요청 값이 올바르지 않습니다.",
    });
    expect(entry.detail).toContain("classId: 올바른 UUID 가 아닙니다");
    expect(entry.detail).toContain("range.end: 필수 입력입니다");
    expect(entry.context).toMatchObject({
      response: { code: "VALIDATION_ERROR" },
    });
  });

  it("작업실 모양의 본문({ error: 문구, detail: 원문 })도 읽는다", async () => {
    const POST = withErrorLog<Handler>("/api/studio/ai", async () =>
      Response.json(
        { error: "화면 문구", detail: "엔진 원문" },
        { status: 422 },
      ),
    );
    await POST(req("http://localhost/api/studio/ai", { method: "POST" }));
    const [entry] = await entries();
    expect(entry).toMatchObject({
      kind: "api-rejected",
      status: 422,
      message: "화면 문구",
      detail: "엔진 원문",
    });
  });

  it("5xx 는 api-error", async () => {
    const GET = withErrorLog<Handler>("/api/metrics", async () =>
      Response.json({ error: "x" }, { status: 503 }),
    );
    await GET(req("http://localhost/api/metrics"));
    expect((await entries())[0]).toMatchObject({
      kind: "api-error",
      status: 503,
    });
  });

  it("본문이 JSON 이 아니면 앞부분을 원문으로", async () => {
    const GET = withErrorLog<Handler>(
      "/api/exports/pdf",
      async () =>
        new Response("Request Entity Too Large", {
          status: 413,
          headers: { "content-type": "text/plain" },
        }),
    );
    await GET(req("http://localhost/api/exports/pdf"));
    expect((await entries())[0]).toMatchObject({
      status: 413,
      detail: "Request Entity Too Large",
    });
  });

  it("응답 머리에 기록 번호를 붙인다 — 그 번호가 곧 줄 id(브라우저가 같은 실패를 다시 안 보낸다)", async () => {
    const GET = withErrorLog<Handler>("/api/units", async () =>
      Response.json({ error: "x" }, { status: 404 }),
    );
    const res = await GET(req("http://localhost/api/units"));
    const id = res.headers.get(ERROR_LOG_HEADER);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect((await entries())[0].id).toBe(id);
  });

  it("머리가 잠긴 응답(fetch 로 받아 넘긴 것 등)이어도 기록은 남고 응답은 그대로다", async () => {
    const locked = new Response("x", { status: 409 });
    vi.spyOn(locked.headers, "set").mockImplementation(() => {
      throw new TypeError("immutable");
    });
    const GET = withErrorLog<Handler>("/api/basket", async () => locked);
    const res = await GET(req("http://localhost/api/basket"));
    expect(res).toBe(locked);
    expect(res.status).toBe(409);
    expect(await entries()).toHaveLength(1);
  });

  it("요청 요약 — 경로·질의·본문 형식·크기·요청 번호·걸린 시간 · 🔴 비밀 질의는 걸러서 · 쿠키·Authorization 은 안 싣는다", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "deadbeef");
    const GET = withErrorLog<WithParams>("/api/tests/[id]", async () =>
      Response.json({ error: "x" }, { status: 404 }),
    );
    await GET(
      req("http://localhost/api/tests/abc?page=2&token=SECRET", {
        headers: {
          cookie: "authjs.session-token=zzz",
          authorization: "Bearer qqq",
          "content-type": "application/json",
          "content-length": "17",
          "x-vercel-id": "icn1::xyz",
          referer: "http://localhost/tests/abc?tab=print",
          "user-agent": "Mozilla/5.0 test",
        },
      }),
      { params: Promise.resolve({ id: "abc" }) },
    );
    const [entry] = await entries();
    expect(entry.requestId).toBe("icn1::xyz");
    expect(entry.durationMs).toBeGreaterThanOrEqual(0);
    expect(entry.context).toMatchObject({
      request: {
        path: "/api/tests/abc",
        query: { page: "2", token: "[걸러냄]" },
        params: { id: "abc" },
        contentType: "application/json",
        contentLength: 17,
        referer: "/tests/abc",
        userAgent: "Mozilla/5.0 test",
      },
    });
    const text = JSON.stringify(entry);
    expect(text).not.toContain("zzz");
    expect(text).not.toContain("qqq");
    expect(text).not.toContain("SECRET");
  });
});

describe("⑶ 던진 예외", () => {
  it("기록하고 같은 예외를 다시 던진다", async () => {
    const boom = new TypeError(
      "Cannot read properties of undefined (reading 'id')",
    );
    const GET = withErrorLog<Handler>("/api/classes", async () => {
      throw boom;
    });
    await expect(GET(req("http://localhost/api/classes"))).rejects.toBe(boom);
    const [entry] = await entries();
    expect(entry).toMatchObject({
      kind: "api-error",
      status: 500,
      route: "/api/classes",
      method: "GET",
    });
    expect(entry.detail).toContain(
      "TypeError: Cannot read properties of undefined",
    );
    expect(entry.detail).toContain("withErrorLog.test.ts"); // 스택
  });

  it("Next 의 흐름 신호(redirect·notFound — digest NEXT_…)는 오류가 아니다 — 기록 없이 그대로 던진다", async () => {
    const signal = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT;replace;/login;307;",
    });
    const GET = withErrorLog<Handler>("/api/classes", async () => {
      throw signal;
    });
    await expect(GET(req("http://localhost/api/classes"))).rejects.toBe(signal);
    expect(await entries()).toEqual([]);
  });
});

describe("⑷ 깊은 곳의 메모가 실린다", () => {
  it("작업 이름·종류·원문·시도 기록·이미지·사용자", async () => {
    const POST = withErrorLog<Handler>("/api/studio/ai", async () => {
      noteErrorLog({ userId: "u-1" });
      await Promise.resolve();
      noteErrorLog({
        action: "figure-redraw",
        kind: "ai-rejected",
        detail:
          "도형을 그리지 못했습니다: labels.val30.point conflicts with its key",
        context: { figureTrail: [{ attempt: 0, engineErrors: ["…"] }] },
        image: "data:image/png;base64,AA==",
      });
      return Response.json(
        { error: "화면 문구", detail: "엔진 원문" },
        { status: 422 },
      );
    });
    await POST(req("http://localhost/api/studio/ai", { method: "POST" }));
    const [entry] = await entries();
    expect(entry).toMatchObject({
      kind: "ai-rejected",
      action: "figure-redraw",
      userId: "u-1",
      message: "화면 문구",
      image: "data:image/png;base64,AA==",
      context: { figureTrail: [{ attempt: 0 }] },
    });
    // 메모의 원문이 먼저, 응답 본문의 원문이 뒤에 — 둘 다 남는다
    expect(entry.detail).toMatch(/labels\.val30[\s\S]*엔진 원문/);
  });
});

describe("⑸ 기록이 실패해도 응답은 그대로", () => {
  it("요청 없이 불러도 죽지 않는다 — 인자 없는 처리기(`GET()`)를 시험이 그렇게 부른다", async () => {
    const GET = withErrorLog("/api/units", async () =>
      Response.json({ error: "x" }, { status: 401 }),
    );
    const res = await GET();
    expect(res.status).toBe(401);
    expect((await entries())[0]).toMatchObject({
      route: "/api/units",
      method: null,
      status: 401,
    });
  });

  it("쓰기가 던져도 부르는 쪽은 모른다", async () => {
    record.mockRejectedValueOnce(new Error("db down"));
    const GET = withErrorLog<Handler>("/api/units", async () =>
      Response.json({ error: "x" }, { status: 400 }),
    );
    const res = await GET(req("http://localhost/api/units"));
    expect(res.status).toBe(400);
    await expect(settleErrorLogWrites()).resolves.toBeUndefined();
  });
});

describe("표지", () => {
  it("감싼 처리기는 라우트 틀을 들고 있다 — 가드가 행동으로 세는 근거", () => {
    const GET = withErrorLog<Handler>("/api/units", async () => new Response());
    expect((GET as unknown as Record<symbol, unknown>)[ERROR_LOG_ROUTE]).toBe(
      "/api/units",
    );
  });
});

describe("양 제한 — 봇이 두드려도 표가 부풀지 않게", () => {
  it(`같은 경로·상태·사람은 1분에 ${SERVER_LOG_PER_KEY_PER_MINUTE}줄까지 — 넘친 수는 창이 지난 뒤 다음 줄에`, async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-09-22T12:00:00.000Z"));
      const GET = withErrorLog<Handler>("/api/classes", async () =>
        Response.json({ error: "로그인이 필요합니다." }, { status: 401 }),
      );
      const bot = () =>
        GET(
          req("http://localhost/api/classes", {
            headers: { "x-forwarded-for": "203.0.113.9" },
          }),
        );
      for (let i = 0; i < SERVER_LOG_PER_KEY_PER_MINUTE + 5; i++) {
        const res = await bot();
        // 응답은 늘 그대로 · 머리도 늘 붙는다(브라우저가 다시 보내지 않게)
        expect(res.status).toBe(401);
        expect(res.headers.get(ERROR_LOG_HEADER)).toBeTruthy();
      }
      expect(await entries()).toHaveLength(SERVER_LOG_PER_KEY_PER_MINUTE);
      // 다른 사람(IP)은 따로 센다
      await GET(
        req("http://localhost/api/classes", {
          headers: { "x-forwarded-for": "198.51.100.1" },
        }),
      );
      expect(await entries()).toHaveLength(SERVER_LOG_PER_KEY_PER_MINUTE + 1);
      // 창이 지나면 다시 남고, 버린 5건이 그 줄에 적힌다
      vi.setSystemTime(new Date("2026-09-22T12:01:01.000Z"));
      await bot();
      const last = (await entries()).at(-1)!;
      expect(last.context).toMatchObject({ suppressedBefore: 5 });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("opt-in metadata-only privacy", () => {
  it.each([400, 401, 403, 429, 502, 503, 504])(
    "records only template/status/duration for %i, stripping request/notes/response identity",
    async (status) => {
      const sentinel = "PRIVATE-STUDENT-QUERY@example.test";
      const path = "/api/students/[id]/math-srs/insight";
      const handler = withErrorLog<WithParams>(
        path,
        async () => {
          noteErrorLog({
            userId: sentinel,
            detail: sentinel,
            context: { identity: sentinel },
            image: sentinel,
            action: "selection",
          });
          return Response.json(
            {
              error: {
                code: "INTERNAL_ERROR",
                message: sentinel,
                details: sentinel,
              },
            },
            { status },
          );
        },
        { metadataOnly: true },
      );
      await handler(
        req(
          `http://localhost/api/students/${sentinel}/math-srs/insight?arbitrary=${sentinel}`,
          {
            headers: {
              referer: `http://localhost/${sentinel}`,
              "user-agent": sentinel,
            },
          },
        ),
        { params: Promise.resolve({ id: sentinel }) },
      );
      const [entry] = await entries();
      expect(JSON.stringify(entry)).not.toContain(sentinel);
      expect(entry).toMatchObject({
        route: path,
        status,
        action: "selection",
        userId: null,
      });
      expect(entry.durationMs).toBeGreaterThanOrEqual(0);
      expect(entry.context).toMatchObject({ request: { path } });
    },
  );
  it("sanitizes thrown errors while rethrowing the original error", async () => {
    const error = new Error("private-student-sentinel");
    const handler = withErrorLog<Handler>(
      "/api/students/[id]/math-srs/insight",
      async () => {
        throw error;
      },
      { metadataOnly: true },
    );
    await expect(handler(req())).rejects.toBe(error);
    expect(JSON.stringify(await entries())).not.toContain(
      "private-student-sentinel",
    );
  });
});
