// @vitest-environment node
/**
 * `DELETE /api/admin/users/[id]/eywa-link` — 관리자가 남의 eywa 연결을 푼다 (D-139 ⑹ · 화면 없음, 원장님 «뒷단만»).
 *
 * 권한은 옆 라우트 `api/admin/users/[id]`(·`/password`)와 **같은 줄** `authorizeAccount(request, true, true)` —
 * 승인된 최고관리자 · 같은 사이트. 지점 관리자(`isAdmin` 만)는 못 한다. 최고관리자 계정은 여기서 건드리지 않는다
 * (옆 라우트와 같음 — 본인은 `DELETE /api/account/eywa-link` 로 푼다).
 * `auth()` 만 대역이고 `authorizeAccount`·`recordAudit` 는 진짜를 탄다.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => {
  process.env.AUTH_URL = "http://localhost:3000";
  return { origin: "http://localhost:3000" };
});

const state = vi.hoisted(() => ({
  session: null as unknown,
  findFirst: vi.fn(),
  updateMany: vi.fn(),
  audits: [] as Record<string, unknown>[],
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => state.session) }));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_path: string, handler: unknown) => handler,
}));
vi.mock("@/lib/db", () => ({
  db: {
    eywaManagedAccount: { findUnique: vi.fn(async () => null) },
    user: { findFirst: state.findFirst, updateMany: state.updateMany },
    accountAuditLog: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        state.audits.push(data);
        return data;
      }),
    },
  },
}));

import { DELETE } from "@/app/api/admin/users/[id]/eywa-link/route";
import { EYWA_LINK_MESSAGES } from "@/contracts/eywaLink.contract";

const ADMIN = "40000000-0000-4000-8000-000000000001";
const TARGET = "10000000-0000-4000-8000-000000000001";
const SUB = "5b1c7e9a-2d4f-4a6b-9c8d-0e1f2a3b4c5d";

const session = (over: Record<string, unknown> = {}) => ({
  user: {
    id: ADMIN,
    name: "관리자",
    email: "admin@example.test",
    role: "director",
    isAdmin: true,
    isSuperAdmin: true,
    approvalStatus: "approved",
    menus: [],
    ...over,
  },
  expires: "2099-01-01T00:00:00.000Z",
});

const call = (id = TARGET, origin = env.origin) =>
  DELETE(
    new Request(`${env.origin}/api/admin/users/${id}/eywa-link`, {
      method: "DELETE",
      headers: { origin, "sec-fetch-site": "same-origin" },
    }),
    { params: Promise.resolve({ id }) },
  );

let target: Record<string, unknown> | null;
beforeEach(() => {
  state.session = session();
  state.audits.length = 0;
  state.findFirst.mockReset();
  state.updateMany.mockReset();
  target = { id: TARGET, isSuperAdmin: false, eywaUserId: SUB };
  state.findFirst.mockImplementation(async () => target);
  state.updateMany.mockResolvedValue({ count: 1 });
});

describe("관리자 해제", () => {
  it("최고관리자가 연결된 계정을 풀면 두 칸이 비고 감사에 행위자가 남는다", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toStrictEqual({ data: { unlinked: true } });
    expect(state.updateMany).toHaveBeenCalledWith({
      where: { id: TARGET, isSuperAdmin: false, eywaUserId: SUB },
      data: { eywaUserId: null, eywaLinkedAt: null },
    });
    expect(state.audits).toStrictEqual([
      {
        userId: TARGET,
        actorId: ADMIN,
        action: "auth.eywa-unlink",
        outcome: "success",
        details: { eywaUserId: SUB, by: "admin" },
      },
    ]);
  });

  it.each([
    ["🔴 지점 관리자(isAdmin 만)", session({ isSuperAdmin: false }), 403],
    ["🔴 평원장", session({ isAdmin: false, isSuperAdmin: false }), 403],
    ["승인 대기 최고관리자", session({ approvalStatus: "pending" }), 403],
    ["로그인 안 함", null, 401],
    [
      "🔴 학생 세션",
      {
        student: {
          accountId: TARGET,
          studentId: TARGET,
          name: "이서준",
          mustChangePassword: false,
        },
        expires: "2099-01-01T00:00:00.000Z",
      },
      401,
    ],
  ] as const)("%s → %i · DB 안 건드림", async (_label, s, status) => {
    state.session = s;
    expect((await call()).status).toBe(status);
    expect(state.findFirst).not.toHaveBeenCalled();
    expect(state.updateMany).not.toHaveBeenCalled();
  });

  it("🔴 다른 사이트 요청 → 403", async () => {
    expect((await call(TARGET, "https://evil.example")).status).toBe(403);
    expect(state.updateMany).not.toHaveBeenCalled();
  });

  it("🔴 최고관리자 계정은 여기서 풀지 않는다 (옆 라우트와 같은 규칙)", async () => {
    target = { id: TARGET, isSuperAdmin: true, eywaUserId: SUB };
    expect((await call()).status).toBe(403);
    expect(state.updateMany).not.toHaveBeenCalled();
  });

  it.each([
    [
      "uuid 아님",
      "not-a-uuid",
      { id: TARGET, isSuperAdmin: false, eywaUserId: SUB },
    ],
    ["없는 계정", TARGET, null],
  ])("%s → 404", async (_label, id, row) => {
    target = row;
    expect((await call(id)).status).toBe(404);
    expect(state.updateMany).not.toHaveBeenCalled();
  });

  it("연결이 없으면 404 · 감사 없음", async () => {
    target = { id: TARGET, isSuperAdmin: false, eywaUserId: null };
    const res = await call();
    expect(res.status).toBe(404);
    expect((await res.json()).error.message).toBe(EYWA_LINK_MESSAGES.notLinked);
    expect(state.audits).toStrictEqual([]);
  });

  it("경주로 0행이면 409", async () => {
    state.updateMany.mockResolvedValue({ count: 0 });
    expect((await call()).status).toBe(409);
    expect(state.audits).toStrictEqual([]);
  });
});
