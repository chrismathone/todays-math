// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { ALL_WORKSPACE_MENUS } from "@/contracts/accountAccess.contract";

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
  documentUpdateMany: vi.fn(),
  auditCreate: vi.fn(),
  transaction: vi.fn(),
  managedUpdate: vi.fn(),
  managed: null as null | { id?: string; blockReasons: string[] },
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
import { authorizeAccount } from "@/lib/accountAccess";

const id = "20000000-0000-4000-8000-000000000002";
const branchId = "30000000-0000-4000-8000-000000000003";
const otherBranchId = "40000000-0000-4000-8000-000000000004";
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
  state.managed = null;
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
  const withBranch = (account: Record<string, unknown> | null) =>
    account && {
      ...account,
      branch: account.branchId
        ? { name: "QA branch", disabledMenus: [], menuRevision: 1 }
        : null,
    };
  state.userFindFirst.mockImplementation(async () =>
    withBranch(state.previous),
  );
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
  state.userFindUniqueOrThrow.mockImplementation(async () =>
    withBranch(state.updated),
  );
  state.userCount.mockResolvedValue(1);
  state.documentUpdateMany.mockResolvedValue({ count: 0 });
  state.auditCreate.mockResolvedValue({});
  state.managedUpdate.mockResolvedValue({});
  state.transaction.mockImplementation(
    async (run: (tx: unknown) => Promise<unknown>) =>
      run({
        eywaManagedAccount: {
          findUnique: vi.fn(async () => state.managed),
          update: state.managedUpdate,
        },
        user: {
          findFirst: state.userFindFirst,
          updateMany: state.userUpdateMany,
          findUniqueOrThrow: state.userFindUniqueOrThrow,
          count: state.userCount,
        },
        branch: { findUnique: state.branchFindUnique },
        class: { count: state.classCount },
        workspaceDocument: { updateMany: state.documentUpdateMany },
        accountAuditLog: { create: state.auditCreate },
      }),
  );
});

describe("최고관리자의 기존 계정 지점 배정", () => {
  it("rejects a nested account mutation after the account leaves the displayed branch", async () => {
    state.previous = {
      ...state.previous,
      branchId: otherBranchId,
      branchRole: "teacher",
    };
    expect(
      (await patch({ name: "Stale edit", expectedBranchId: branchId }))!.status,
    ).toBe(409);
    expect(state.userUpdateMany).not.toHaveBeenCalled();
    expect(state.auditCreate).not.toHaveBeenCalled();
  });
  it("fences the conditional write by displayed branch and updatedAt", async () => {
    state.previous = { ...state.previous, branchId, branchRole: "teacher" };
    expect(
      (await patch({ name: "Current edit", expectedBranchId: branchId }))!
        .status,
    ).toBe(200);
    expect(state.userUpdateMany.mock.calls[0][0].where).toMatchObject({
      branchId,
      updatedAt: new Date(updatedAt),
    });
  });
  it("checks explicit unassigned scope and keeps old clients compatible", async () => {
    expect(
      (await patch({ name: "Unassigned", expectedBranchId: null }))!.status,
    ).toBe(200);
    expect(state.userUpdateMany.mock.calls[0][0].where.branchId).toBeNull();
    state.previous = { ...state.previous, branchId, branchRole: "teacher" };
    expect((await patch({ name: "Legacy caller" }))!.status).toBe(200);
    expect(
      (await patch({ name: "Stale unassigned", expectedBranchId: null }))!
        .status,
    ).toBe(409);
  });
  it.each(["configuredMenus", "branchMenus", "branchMenuRevision"])(
    "rejects read-only result field %s",
    async (key) => {
      expect((await patch({ name: "Strict", [key]: [] }))!.status).toBe(400);
      expect(state.transaction).not.toHaveBeenCalled();
    },
  );
  it("managed mappings prevent direct branch or administrator promotion", async () => {
    state.managed = { blockReasons: [] };
    expect(
      (await patch({ branchId: otherBranchId, branchRole: "teacher" }))!.status,
    ).toBe(403);
    expect((await patch({ isAdmin: true }))!.status).toBe(403);
    expect(state.userUpdateMany).not.toHaveBeenCalled();
  });
  it.each(["owner", "manager", "teacher"])(
    "persists a superadmin-managed role override %s without changing branch",
    async (branchRole) => {
      state.managed = { id: "mapping", blockReasons: [] };
      state.previous = { ...state.previous, branchId, branchRole: "teacher" };
      expect(
        (await patch({ branchRole, expectedBranchId: branchId }))!.status,
      ).toBe(200);
      expect(state.managedUpdate).toHaveBeenCalledWith({
        where: { id: "mapping" },
        data: { branchRoleOverride: branchRole },
      });
      expect(state.userUpdateMany.mock.calls[0][0].data).toMatchObject({
        branchRole,
        isAdmin: branchRole !== "teacher",
        sessionVersion: { increment: 1 },
      });
      expect(state.userUpdateMany.mock.calls[0][0].data).not.toHaveProperty(
        "branchId",
      );
    },
  );
  it("denies role overrides from branch managers before starting a transaction", async () => {
    state.superadmin = false;
    expect((await patch({ branchRole: "owner" }))!.status).toBe(403);
    expect(state.transaction).not.toHaveBeenCalled();
  });
  it("does not persist an override when demoting the last active managed owner", async () => {
    state.managed = { id: "mapping", blockReasons: [] };
    state.previous = {
      ...state.previous,
      branchId,
      branchRole: "owner",
      isAdmin: true,
    };
    expect((await patch({ branchRole: "teacher" }))!.status).toBe(403);
    expect(state.managedUpdate).not.toHaveBeenCalled();
  });
  it("rolls back the override by throwing when the optimistic user update fails", async () => {
    state.managed = { id: "mapping", blockReasons: [] };
    state.previous = { ...state.previous, branchId, branchRole: "teacher" };
    state.userUpdateMany.mockResolvedValueOnce({ count: 0 });
    expect((await patch({ branchRole: "manager" }))!.status).toBe(409);
    expect(state.auditCreate).not.toHaveBeenCalled();
  });
  it("clearing a manual suspension cannot clear a managed OFF suspension", async () => {
    const suspendedAt = new Date("2026-09-22T00:00:00Z");
    state.managed = { blockReasons: ["tenant_disabled"] };
    Object.assign(state.previous!, {
      branchId,
      branchRole: "teacher",
      suspendedAt,
    });
    expect((await patch({ suspended: false }))!.status).toBe(200);
    expect(state.userUpdateMany.mock.calls[0][0].data).toMatchObject({
      manualSuspendedAt: null,
      suspendedAt,
    });
  });
  it.each([null, otherBranchId])(
    "withdraws old sharing on transfer to %s and does not republish it on return",
    async (target) => {
      const docs = [
        {
          userId: id,
          visibility: "branch",
          sharedBranchId: branchId,
          revision: 3,
          title: "공유 자료",
        },
        {
          userId: id,
          visibility: "private",
          sharedBranchId: null,
          revision: 2,
          title: "개인 자료",
        },
        {
          userId: "another-owner",
          visibility: "branch",
          sharedBranchId: branchId,
          revision: 1,
          title: "동료 자료",
        },
      ];
      state.documentUpdateMany.mockImplementation(async ({ where, data }) => {
        const matched = docs.filter(
          (doc) =>
            doc.userId === where.userId && doc.visibility === where.visibility,
        );
        matched.forEach((doc) => {
          doc.visibility = data.visibility;
          doc.sharedBranchId = data.sharedBranchId;
          doc.revision += data.revision.increment;
        });
        return { count: matched.length };
      });
      state.previous = { ...state.previous, branchId, branchRole: "teacher" };
      expect(
        (await patch({
          branchId: target,
          ...(target ? { branchRole: "teacher" } : {}),
        }))!.status,
      ).toBe(200);
      expect(docs[0]).toMatchObject({
        visibility: "private",
        sharedBranchId: null,
        revision: 4,
        title: "공유 자료",
      });
      expect(docs[1]).toMatchObject({ visibility: "private", revision: 2 });
      expect(docs[2]).toMatchObject({
        visibility: "branch",
        sharedBranchId: branchId,
        revision: 1,
      });
      state.previous = { ...state.previous, branchId: target };
      expect((await patch({ branchId, branchRole: "teacher" }))!.status).toBe(
        200,
      );
      expect(docs[0]).toMatchObject({
        visibility: "private",
        sharedBranchId: null,
        revision: 4,
      });
    },
  );

  it("detaches a branch manager, clears branch privileges, and expires the old session", async () => {
    state.previous = {
      ...state.previous,
      branchId,
      branchRole: "manager",
      isAdmin: true,
    };
    const response = (await patch({ branchId: null }))!;
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({
      branchId: null,
      branchRole: null,
      isAdmin: false,
    });
    expect(state.userUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id,
          updatedAt: new Date(updatedAt),
          isSuperAdmin: false,
        }),
        data: expect.objectContaining({
          branchId: null,
          branchRole: null,
          isAdmin: false,
          sessionVersion: { increment: 1 },
        }),
      }),
    );
    expect(state.branchFindUnique).not.toHaveBeenCalled();
    expect(state.auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          details: expect.objectContaining({
            previousBranchId: branchId,
            branchId: null,
          }),
        }),
      }),
    );
  });

  it("moves A to B with a selected role and granular permissions in one revision", async () => {
    state.previous = {
      ...state.previous,
      branchId,
      branchRole: "manager",
      isAdmin: true,
    };
    const response = (await patch({
      branchId: otherBranchId,
      branchRole: "teacher",
      menus: ["english-maker"],
    }))!;
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({
      branchId: otherBranchId,
      branchRole: "teacher",
      isAdmin: false,
      menus: ["english-maker"],
    });
    expect(state.userUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          branchId: otherBranchId,
          disabledMenus: ALL_WORKSPACE_MENUS.filter(
            (menu) => menu !== "english-maker",
          ),
          sessionVersion: { increment: 1 },
        }),
      }),
    );
    expect(state.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
  });

  it.each([null, otherBranchId])(
    "blocks moving an account with classes to %s",
    async (target) => {
      state.previous = { ...state.previous, branchId, branchRole: "teacher" };
      state.classCount.mockResolvedValue(1);
      expect(
        (await patch({
          branchId: target,
          ...(target ? { branchRole: "teacher" } : {}),
        }))!.status,
      ).toBe(403);
      expect(state.userUpdateMany).not.toHaveBeenCalled();
    },
  );

  it.each([
    { branchId: null },
    { branchId: otherBranchId, branchRole: "owner" },
    { branchId, branchRole: "manager" },
  ])(
    "protects the last active owner from membership change %j",
    async (change) => {
      state.previous = {
        ...state.previous,
        branchId,
        branchRole: "owner",
        isAdmin: true,
      };
      expect((await patch(change))!.status).toBe(403);
      expect(state.userUpdateMany).not.toHaveBeenCalled();
    },
  );

  it("allows an owner to detach when another active owner remains", async () => {
    state.previous = {
      ...state.previous,
      branchId,
      branchRole: "owner",
      isAdmin: true,
    };
    state.userCount.mockResolvedValue(2);
    expect((await patch({ branchId: null }))!.status).toBe(200);
  });

  it("keeps role-only changes available to accounts with classes", async () => {
    state.previous = { ...state.previous, branchId, branchRole: "teacher" };
    state.classCount.mockResolvedValue(1);
    expect((await patch({ branchId, branchRole: "manager" }))!.status).toBe(
      200,
    );
    expect(state.classCount).not.toHaveBeenCalled();
    expect(state.documentUpdateMany).not.toHaveBeenCalled();
  });

  it("rejects stale membership changes and transaction write conflicts", async () => {
    state.previous = {
      ...state.previous,
      updatedAt: new Date("2026-09-24T00:00:00.000Z"),
    };
    expect((await patch({ branchId, branchRole: "teacher" }))!.status).toBe(
      409,
    );
    expect(state.userUpdateMany).not.toHaveBeenCalled();
    state.transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("write conflict", {
        code: "P2034",
        clientVersion: "6.19.3",
      }),
    );
    expect((await patch({ branchId, branchRole: "teacher" }))!.status).toBe(
      409,
    );
    expect(state.auditCreate).not.toHaveBeenCalled();
  });

  it("rejects a missing destination and conflicting independent branch roles", async () => {
    state.branchFindUnique.mockResolvedValue(null);
    expect((await patch({ branchId, branchRole: "teacher" }))!.status).toBe(
      404,
    );
    expect((await patch({ branchId: null, branchRole: "owner" }))!.status).toBe(
      403,
    );
    expect(state.userUpdateMany).not.toHaveBeenCalled();
  });

  it.each([null, otherBranchId])(
    "requires highest-admin authorization for transfer to %s",
    async (target) => {
      state.superadmin = false;
      state.previous = {
        ...state.previous,
        branchId,
        branchRole: "manager",
        isAdmin: true,
      };
      expect(
        (await patch({
          branchId: target,
          ...(target ? { branchRole: "owner" } : {}),
        }))!.status,
      ).toBe(403);
      expect(authorizeAccount).toHaveBeenCalledWith(
        expect.any(Request),
        true,
        true,
      );
      expect(state.transaction).not.toHaveBeenCalled();
    },
  );

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
