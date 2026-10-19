/**
 * 관문(`src/proxy.ts`)과 오류 기록.
 *
 *  ⑴ 브라우저 오류를 받는 곳(`POST /api/logs/client`)은 **로그인 안 한 사람 · 메뉴가 없는 계정 · 승인 대기 ·
 *     검수 계정** 모두 지난다 — 누가 보든 그 화면의 오류가 와야 한다. (학생 세션은 열지 않았다 — D-124 허용 목록은
 *     원장님 결정이라 이 트랙이 넓히지 않는다. proxyStudentGate.test.ts 가 그대로 잠근다.)
 *  ⑵ 그 경로는 **감사 기록에 줄을 쌓지 않는다** — 오류 한 번 보낼 때마다 «request» 한 줄이 생기면 안 된다.
 *  ⑶ 관문이 직접 낸 **API 거절(403)** 도 오류 기록에 남는다 — «거절되었을 때 로그를 전부»(원장님 2026-09-22).
 *     라우트 틀(`withErrorLog`)은 관문 뒤에 있어 이 거절을 못 본다. 응답(문구·상태)은 그대로다.
 *  ⑷ 🔴 로그 받는 곳에 대한 거절은 기록하지 않는다 — 되먹임 고리 금지.
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { session } = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  auth: (handler: (req: unknown) => unknown) => (request: NextRequest) =>
    handler(Object.assign(request, { auth: session() })),
}));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/lib/errorLog/record", () => ({
  recordErrorLog: vi.fn(async () => true),
}));

import { ERROR_LOG_HEADER } from "@/contracts/errorLogValues";
import { recordAudit } from "@/lib/audit";
import { recordErrorLog } from "@/lib/errorLog/record";
import { settleErrorLogWrites } from "@/lib/errorLog/withErrorLog";
import { proxy } from "@/proxy";

const run = async (method: string, path: string): Promise<Response> => {
  const call = proxy as unknown as (r: NextRequest) => Promise<Response>;
  return call(new NextRequest(`http://localhost${path}`, { method }));
};
const passed = (res: Response) =>
  res.status === 200 && res.headers.get("location") === null;
const account = (over: Record<string, unknown> = {}) => ({
  user: {
    id: "11111111-1111-4111-8111-111111111111",
    role: "director",
    approvalStatus: "approved",
    menus: [],
    ...over,
  },
});
async function logged() {
  await settleErrorLogWrites();
  return vi.mocked(recordErrorLog).mock.calls.map(([entry]) => entry);
}

beforeEach(() => {
  session.mockReset();
  vi.mocked(recordAudit).mockClear();
  vi.mocked(recordErrorLog).mockClear();
});

describe("⑴ 브라우저 오류 받는 곳은 누구나 지난다", () => {
  it.each([
    ["로그인 안 한 사람", null],
    ["메뉴가 하나도 없는 원장", account()],
    ["승인 대기", account({ approvalStatus: "pending" })],
    ["검수 계정", account({ role: "reviewer", menus: ["bank"] })],
    ["관리자", account({ isAdmin: true })],
  ])("%s", async (_label, identity) => {
    session.mockReturnValue(identity);
    expect(passed(await run("POST", "/api/logs/client"))).toBe(true);
  });

  it("그 옆 경로까지 열지는 않는다 — 한 경로 · POST 만", async () => {
    session.mockReturnValue(account());
    expect(passed(await run("GET", "/api/logs/client"))).toBe(false);
    expect(passed(await run("POST", "/api/logs/purge/cron"))).toBe(false);
    session.mockReturnValue(account({ role: "reviewer", menus: ["bank"] }));
    expect(passed(await run("GET", "/api/logs/client"))).toBe(false);
  });
});

describe("⑵ 감사 기록에 줄을 쌓지 않는다", () => {
  it("로그인한 계정이 보내도 «request» 한 줄이 생기지 않는다", async () => {
    session.mockReturnValue(account({ menus: ["studio"] }));
    await run("POST", "/api/logs/client");
    expect(recordAudit).not.toHaveBeenCalled();
    // 대조 — 다른 API 는 여전히 남는다
    await run("GET", "/api/units");
    expect(recordAudit).toHaveBeenCalled();
  });
});

describe("⑶ 관문의 API 거절도 오류 기록에", () => {
  it("메뉴가 없는 원장의 API — 403 문구·상태는 그대로, 한 줄이 남고 머리에 번호", async () => {
    session.mockReturnValue(account());
    const res = await run("POST", "/api/tests/generate");
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: { code: "FORBIDDEN", message: "사용 권한이 없는 메뉴입니다." },
    });
    const id = res.headers.get(ERROR_LOG_HEADER);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    const [entry] = await logged();
    expect(entry).toMatchObject({
      id,
      source: "server",
      kind: "api-rejected",
      route: "/api/tests/generate",
      method: "POST",
      status: 403,
      message: "사용 권한이 없는 메뉴입니다.",
      userId: "11111111-1111-4111-8111-111111111111",
      context: expect.objectContaining({ stage: "proxy" }),
    });
  });

  it.each([
    "bank",
    "arithmetic",
    "studio",
    "library",
    "textbook",
    "conceptBlank",
  ])(
    "%s의 공용 출력은 proxy를 지나며 거절 오류를 남기지 않는다",
    async (source) => {
      session.mockReturnValue(account({ menus: [source] }));
      expect(passed(await run("POST", "/api/exports/pdf"))).toBe(true);
      expect(passed(await run("GET", "/api/studio/print-presets"))).toBe(true);
      expect(await logged()).toEqual([]);
      expect(recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: "requested" }),
      );
    },
  );

  it("승인 대기 계정 · 검수 계정의 막힌 API · 학생 세션의 API 도", async () => {
    session.mockReturnValue(account({ approvalStatus: "pending" }));
    await run("GET", "/api/classes");
    session.mockReturnValue(account({ role: "reviewer", menus: ["bank"] }));
    await run("POST", "/api/tests/generate");
    session.mockReturnValue({
      student: {
        accountId: "4a000000-0000-4000-8000-000000000001",
        studentId: "30000000-0000-4000-8000-000000000001",
        name: "이서준",
        mustChangePassword: false,
      },
      expires: "2099-01-01T00:00:00.000Z",
    });
    await run("GET", "/api/classes");
    const entries = await logged();
    expect(entries.map((e) => [e.route, e.status])).toEqual([
      ["/api/classes", 403],
      ["/api/tests/generate", 403],
      ["/api/classes", 403],
    ]);
    expect(entries[2].context).toMatchObject({
      stage: "proxy",
      student: "4a000000-0000-4000-8000-000000000001",
    });
  });

  it("화면 되돌림(307)은 거절 기록이 아니다", async () => {
    session.mockReturnValue(null);
    await run("GET", "/studio");
    expect(await logged()).toEqual([]);
  });
});

describe("⑷ 로그 받는 곳에 대한 거절은 기록하지 않는다", () => {
  it("학생 세션 — 오류 보고(POST)는 지나가고(원장님 2026-09-22), 막힌 메서드로 두드려도 줄이 생기지 않는다", async () => {
    session.mockReturnValue({
      student: {
        accountId: "4a000000-0000-4000-8000-000000000001",
        studentId: "30000000-0000-4000-8000-000000000001",
        name: "이서준",
        mustChangePassword: false,
      },
      expires: "2099-01-01T00:00:00.000Z",
    });
    expect(passed(await run("POST", "/api/logs/client"))).toBe(true);
    const res = await run("GET", "/api/logs/client");
    expect(res.status).toBe(403);
    expect(await logged()).toEqual([]);
    // 같은 학생이 옆 경로를 두드린 거절은 여느 거절처럼 남는다 — 빼는 것은 받는 곳 한 경로뿐
    expect((await run("GET", "/api/logs/purge/cron")).status).toBe(403);
    expect((await logged()).map((r) => r.route)).toEqual([
      "/api/logs/purge/cron",
    ]);
  });
});
