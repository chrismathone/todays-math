// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const state = vi.hoisted(() => ({
  superadmin: true,
  previous: null as Record<string, unknown> | null,
  updated: null as Record<string, unknown> | null,
  branchFindUnique: vi.fn(),
  classCount: vi.fn(),
  userFindFirst: vi.fn(),
  userUpdateMany: vi.fn(),
  userFindUniqueOrThrow: vi.fn(),
  userCount: vi.fn(),
  auditCreate: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("@/lib/accountAccess", () => ({
  authorizeAccount: vi.fn(async () =>
    state.superadmin
      ? {
          account: { id: "10000000-0000-4000-8000-000000000001" },
          response: null,
        }
      : {
          account: null,
          response: Response.json(
            { error: { code: "FORBIDDEN" } },
            { status: 403 },
          ),
        },
  ),
}));
vi.mock("@/lib/db", () => ({ db: { $transaction: state.transaction } }));
vi.mock("@/lib/audit", () => ({
  recordAudit: vi.fn(),
  auditData: (entry: unknown) => entry,
}));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_: string, handler: unknown) => handler,
}));

import { PATCH } from "@/app/api/admin/users/[id]/route";

const id = "20000000-0000-4000-8000-000000000002";
const branchId = "30000000-0000-4000-8000-000000000003";
const updatedAt = "2026-09-23T00:00:00.000Z";
const patch = (data: Record<string, unknown>) =>
  PATCH(
    new Request(`http://localhost/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { origin: "http://localhost" },
      body: JSON.stringify({ expectedUpdatedAt: updatedAt, ...data }),
    }),
    { params: Promise.resolve({ id }) },
  );

beforeEach(() => {
  vi.clearAllMocks();
  state.superadmin = true;
  state.previous = {
    id,
    name: "새 강사",
    email: "teacher@example.com",
    role: "director",
    isAdmin: false,
    isSuperAdmin: false,
    branchId: null,
    branchRole: null,
    approvalStatus: "approved",
    disabledMenus: [],
    createdAt: new Date(updatedAt),
    updatedAt: new Date(updatedAt),
    suspendedAt: null,
    deletedAt: null,
  };
  state.updated = null;
  state.branchFindUnique.mockResolvedValue({ id: branchId });
  state.classCount.mockResolvedValue(0);
  state.userFindFirst.mockImplementation(async () => state.previous);
  state.userUpdateMany.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => {
      state.updated = {
        ...state.previous,
        ...data,
        updatedAt: new Date("2026-09-23T00:00:01.000Z"),
      };
      return { count: 1 };
    },
  );
  state.userFindUniqueOrThrow.mockImplementation(async () => state.updated);
  state.userCount.mockResolvedValue(1);
  state.auditCreate.mockResolvedValue({});
  state.transaction.mockImplementation(
    async (run: (tx: unknown) => Promise<unknown>) =>
      run({
        user: {
          findFirst: state.userFindFirst,
          updateMany: state.userUpdateMany,
          findUniqueOrThrow: state.userFindUniqueOrThrow,
          count: state.userCount,
        },
        branch: { findUnique: state.branchFindUnique },
        class: { count: state.classCount },
        accountAuditLog: { create: state.auditCreate },
      }),
  );
});

describe("최고관리자의 기존 계정 지점 배정", () => {
  it("반이 없는 독립 계정을 지점 강사로 소속시키고 세션을 갱신한다", async () => {
    const response = (await patch({ branchId, branchRole: "teacher" }))!;
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data).toMatchObject({
      branchId,
      branchRole: "teacher",
      isAdmin: false,
    });
    expect(state.userUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          branchId,
          branchRole: "teacher",
          isAdmin: false,
          sessionVersion: { increment: 1 },
        }),
      }),
    );
  });

  it("운영 중인 반을 가진 계정의 이동은 막는다", async () => {
    state.classCount.mockResolvedValueOnce(1);
    expect((await patch({ branchId, branchRole: "manager" }))!.status).toBe(
      403,
    );
    expect(state.userUpdateMany).not.toHaveBeenCalled();
  });

  it("마지막 활성 원장 계정은 정지할 수 없다", async () => {
    state.previous = {
      ...state.previous,
      branchId,
      branchRole: "owner",
      isAdmin: true,
    };
    expect((await patch({ suspended: true }))!.status).toBe(403);
    expect(state.userUpdateMany).not.toHaveBeenCalled();
  });

  it("마지막 활성 원장은 승인 취소로도 접속을 막을 수 없다", async () => {
    state.previous = {
      ...state.previous,
      branchId,
      branchRole: "owner",
      isAdmin: true,
    };
    expect((await patch({ approvalStatus: "rejected" }))!.status).toBe(403);
    expect(state.userUpdateMany).not.toHaveBeenCalled();
  });

  it("지점 관리자는 상위 계정 배정을 할 수 없다", async () => {
    state.superadmin = false;
    expect((await patch({ branchId, branchRole: "owner" }))!.status).toBe(403);
    expect(state.transaction).not.toHaveBeenCalled();
  });
});
