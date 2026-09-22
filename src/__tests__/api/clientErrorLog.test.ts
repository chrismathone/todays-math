// @vitest-environment node
/**
 * `POST /api/logs/client` — 브라우저가 본 오류를 받는 곳(원장님 2026-09-22 «브라우저 쪽 오류»).
 *
 *  ⑴ 로그인 안 한 사람도 보낸다(랩실 `/lab` 은 로그인 없이 연다 — D-135 ⑻). 로그인했으면 그 계정을 적는다.
 *  ⑵ **양 제한** — 한 사람(계정 또는 IP)당 분당 사건 수, 본문 크기 상한. 넘치면 버린다.
 *  ⑶ 🔴 이 경로는 **스스로를 기록하지 않는다** — 받다가 실패해도 오류 기록 줄을 만들지 않는다(되먹임 고리 금지).
 *  ⑷ 다른 사이트에서 온 것은 받지 않는다.
 *  ⑸ 기록이 실패해도 브라우저에는 조용히 — 보고 경로가 또 오류를 낳지 않게.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }));
import { POST } from "@/app/api/logs/client/route";
import {
  CLIENT_LOG_MAX_BODY_BYTES,
  CLIENT_LOG_MAX_EVENTS,
} from "@/contracts/errorLogValues";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  CLIENT_LOG_EVENTS_PER_MINUTE,
  resetClientLogQuota,
} from "@/lib/errorLog/clientQuota";
import { prismaTestDouble } from "@/mocks/prismaTestDouble";

const USER = "11111111-1111-4111-8111-111111111111";
const event = (over: Record<string, unknown> = {}) => ({
  kind: "client-exception",
  message: "TypeError: Cannot read properties of undefined (reading 'svg')",
  detail: "TypeError: …\n    at FigureEditor (figure.js:1:2)",
  page: "/studio",
  count: 3,
  firstAt: "2026-09-22T09:00:00.000Z",
  release: "abc1234",
  ...over,
});
function send(
  body: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return POST(
    new Request("https://math.example/api/logs/client", {
      method: "POST",
      body: text,
      headers: {
        "content-type": "text/plain;charset=UTF-8",
        "x-forwarded-for": "203.0.113.7, 10.0.0.1",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0) Chrome/140",
        "sec-fetch-site": "same-origin",
        ...headers,
      },
    }),
  );
}
const rows = () => db.errorLog.findMany();

beforeEach(() => {
  resetClientLogQuota();
  vi.mocked(auth as () => Promise<unknown>).mockResolvedValue(null);
});
afterEach(() => vi.restoreAllMocks());

describe("⑴ 받는다", () => {
  it("로그인 안 한 사람의 사건 — 화면 경로·종류·문구·스택·묶인 수·브라우저·화면의 배포가 한 줄씩", async () => {
    const res = await send({
      events: [
        event(),
        event({
          kind: "client-request-failed",
          message: "Failed to fetch",
          detail: undefined,
          page: "/lab/fractions",
          request: { method: "POST", path: "/api/studio/ai", status: 0 },
          count: 1,
        }),
      ],
    });
    expect(res.status).toBe(204);
    const [a, b] = await rows();
    expect(a).toMatchObject({
      source: "client",
      kind: "client-exception",
      route: "/studio",
      message: "TypeError: Cannot read properties of undefined (reading 'svg')",
      userId: null,
    });
    expect(a.detail).toContain("FigureEditor");
    expect(a.context).toMatchObject({
      count: 3,
      firstAt: "2026-09-22T09:00:00.000Z",
      clientRelease: "abc1234",
      userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/140",
    });
    expect(b).toMatchObject({
      kind: "client-request-failed",
      route: "/lab/fractions",
      method: "POST",
      status: 0,
      message: "Failed to fetch",
    });
    expect(b.context).toMatchObject({
      request: { method: "POST", path: "/api/studio/ai", status: 0 },
    });
  });

  it("로그인했으면 그 계정을 적는다", async () => {
    vi.mocked(auth as () => Promise<unknown>).mockResolvedValue({
      user: { id: USER },
    });
    await send({ events: [event()] });
    expect((await rows())[0].userId).toBe(USER);
  });

  it("세션을 못 읽어도(auth 가 던져도) 받는다 — 계정 칸만 빈다", async () => {
    vi.mocked(auth as () => Promise<unknown>).mockRejectedValue(
      new Error("JWTSessionError"),
    );
    expect((await send({ events: [event()] })).status).toBe(204);
    expect((await rows())[0].userId).toBeNull();
  });
});

describe("⑵ 양 제한", () => {
  it(`한 사람(IP)당 분당 ${CLIENT_LOG_EVENTS_PER_MINUTE}건 — 넘치는 것은 버리고 429`, async () => {
    const batch = {
      events: Array.from({ length: CLIENT_LOG_MAX_EVENTS }, () => event()),
    };
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) statuses.push((await send(batch)).status);
    expect(await prismaTestDouble.errorLog.count()).toBe(
      CLIENT_LOG_EVENTS_PER_MINUTE,
    );
    expect(statuses.at(-1)).toBe(429);
    // 다른 사람(IP)은 따로 센다
    expect(
      (await send({ events: [event()] }, { "x-forwarded-for": "198.51.100.2" }))
        .status,
    ).toBe(204);
  });

  it(`본문이 ${CLIENT_LOG_MAX_BODY_BYTES} 바이트를 넘으면 413 — 읽지도 않는다`, async () => {
    const res = await send("x".repeat(CLIENT_LOG_MAX_BODY_BYTES + 1));
    expect(res.status).toBe(413);
    expect(await rows()).toEqual([]);
  });

  it(`한 번에 ${CLIENT_LOG_MAX_EVENTS}건을 넘거나 모양이 틀리면 400`, async () => {
    expect(
      (
        await send({
          events: Array.from({ length: CLIENT_LOG_MAX_EVENTS + 1 }, () =>
            event(),
          ),
        })
      ).status,
    ).toBe(400);
    expect((await send({ events: [{ kind: "server-hack" }] })).status).toBe(
      400,
    );
    expect((await send("{not json")).status).toBe(400);
    expect(await rows()).toEqual([]);
  });
});

describe("⑶ 스스로를 기록하지 않는다", () => {
  it("거절(400·413·429·403)을 해도 오류 기록 줄은 생기지 않는다", async () => {
    await send("{not json");
    await send("x".repeat(CLIENT_LOG_MAX_BODY_BYTES + 1));
    await send({ events: [event()] }, { "sec-fetch-site": "cross-site" });
    expect(await rows()).toEqual([]);
  });
});

describe("⑷ 다른 사이트", () => {
  it("sec-fetch-site: cross-site 는 403", async () => {
    const res = await send(
      { events: [event()] },
      { "sec-fetch-site": "cross-site" },
    );
    expect(res.status).toBe(403);
  });
});

describe("⑸ 기록이 실패해도 조용히", () => {
  it("DB 가 던져도 204 — 브라우저에는 아무 일 없다", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(prismaTestDouble.errorLog, "createMany").mockRejectedValueOnce(
      Object.assign(new Error("relation does not exist"), { code: "P2021" }),
    );
    expect((await send({ events: [event()] })).status).toBe(204);
  });
});
