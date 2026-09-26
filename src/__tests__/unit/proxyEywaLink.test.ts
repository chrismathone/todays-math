/**
 * 관문(`src/proxy.ts`) — eywa 연결 확인 화면·API (D-139 ⑹).
 *
 * 연결은 **로그인한 계정 주인**이 한다 — 승인 대기 계정도 SSO 로 들어오므로(토큰이 «대기»를 싣는다) 연결도
 * 승인 전에 열린다. 학생 세션은 학생 허용 목록 밖이라 막힌다(`proxyStudentGate.test.ts` 의 «지나가는 집합»은
 * 그대로다 — 이 두 경로가 거기 안 들어간다는 것도 그 시험이 모집단째 잠근다).
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { session } = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  auth: (handler: (req: unknown) => unknown) => (request: NextRequest) =>
    handler(Object.assign(request, { auth: session() })),
}));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn() }));

import { normalizeCallbackUrl } from "@/lib/callbackUrl";
import { STUDENT_FORBIDDEN_MESSAGE } from "@/lib/studentRouteAccess";
import { proxy } from "@/proxy";

const run = (method: string, path: string) =>
  (proxy as unknown as (r: NextRequest) => Promise<Response>)(
    new NextRequest(`http://localhost${path}`, { method }),
  );
const passed = (res: Response) =>
  res.status === 200 && res.headers.get("location") === null;

const user = (over: Record<string, unknown> = {}) => ({
  user: {
    id: "u1",
    role: "director",
    approvalStatus: "approved",
    menus: [],
    ...over,
  },
});

const ROUTES = [
  ["GET", "/account/eywa-link"],
  ["POST", "/api/account/eywa-link"],
  ["DELETE", "/api/account/eywa-link"],
] as const;

beforeEach(() => session.mockReset());

describe("eywa 연결 — 누구에게 열리나", () => {
  it.each([
    ["승인된 원장", user()],
    ["🔴 승인 대기 원장", user({ approvalStatus: "pending" })],
    ["메뉴를 다 끈 원장", user({ menus: [] })],
  ])("%s → 확인 화면·연결 API 가 지나간다", async (_label, s) => {
    session.mockReturnValue(s);
    for (const [method, path] of ROUTES)
      expect(passed(await run(method, path)), `${method} ${path}`).toBe(true);
  });

  it("🔴 학생 세션 → 화면은 /learn 으로, API 는 403 JSON", async () => {
    session.mockReturnValue({
      student: {
        accountId: "a1",
        studentId: "s1",
        name: "이서준",
        mustChangePassword: false,
      },
      expires: "2099-01-01T00:00:00.000Z",
    });
    const page = await run("GET", "/account/eywa-link");
    expect(page.status).toBe(307);
    expect(new URL(page.headers.get("location")!).pathname).toBe("/learn");
    for (const method of ["POST", "DELETE"]) {
      const api = await run(method, "/api/account/eywa-link");
      expect(api.status).toBe(403);
      expect(await api.json()).toStrictEqual({
        error: { code: "FORBIDDEN", message: STUDENT_FORBIDDEN_MESSAGE },
      });
    }
  });

  it("로그인 안 함 → 확인 화면은 로그인으로(돌아올 곳 = 이 화면) · API 는 라우트가 401", async () => {
    session.mockReturnValue(null);
    const page = await run("GET", "/account/eywa-link");
    expect(page.status).toBe(307);
    const to = new URL(page.headers.get("location")!);
    expect(to.pathname).toBe("/login");
    expect(to.searchParams.get("callbackUrl")).toBe("/account/eywa-link");
    expect(passed(await run("POST", "/api/account/eywa-link"))).toBe(true);
  });

  it("🔴 관리자 해제 API 는 최고관리자만 — 지점 관리자·원장은 관문에서 403", async () => {
    const path =
      "/api/admin/users/10000000-0000-4000-8000-000000000001/eywa-link";
    session.mockReturnValue(user({ isAdmin: true, isSuperAdmin: false }));
    expect((await run("DELETE", path)).status).toBe(403);
    session.mockReturnValue(user());
    expect((await run("DELETE", path)).status).toBe(403);
    session.mockReturnValue(user({ isAdmin: true, isSuperAdmin: true }));
    expect(passed(await run("DELETE", path))).toBe(true);
  });

  it("로그인 화면의 callbackUrl 로 확인 화면이 살아남는다 (normalizeCallbackUrl)", () => {
    expect(normalizeCallbackUrl("/account/eywa-link")).toBe(
      "/account/eywa-link",
    );
  });
});
