// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { compare } from "bcryptjs";
import { Prisma } from "@prisma/client";
vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({
  session: null as unknown,
  target: {} as Record<string, unknown>,
  audits: [] as unknown[],
  find: vi.fn(),
  mapping: vi.fn(),
  update: vi.fn(),
  audit: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: async () => state.session }));
vi.mock("@/lib/db", () => ({
  db: { user: { findFirst: state.find }, $transaction: state.transaction },
}));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_: string, fn: unknown) => fn,
}));
import { POST } from "@/app/api/admin/users/[id]/password/route";
const id = "20000000-0000-4000-8000-000000000002";
const branchId = "30000000-0000-4000-8000-000000000003";
const actor = "10000000-0000-4000-8000-000000000001";
const updatedAt = "2026-10-01T00:00:00.000Z";
const body = { expectedUpdatedAt: updatedAt, expectedBranchId: branchId };
const call = (
  input: unknown = body,
  origin = "http://localhost",
  targetId = id,
) =>
  POST(
    new Request(`http://localhost/api/admin/users/${targetId}/password`, {
      method: "POST",
      headers: { origin },
      body: JSON.stringify(input),
    }),
    { params: Promise.resolve({ id: targetId }) },
  );
beforeEach(() => {
  vi.resetAllMocks();
  process.env.AUTH_URL = "http://localhost";
  state.session = {
    user: {
      id: actor,
      isAdmin: true,
      isSuperAdmin: true,
      approvalStatus: "approved",
    },
  };
  state.target = {
    id,
    branchId,
    updatedAt: new Date(updatedAt),
    isSuperAdmin: false,
    authSource: "local",
    deletedAt: null,
    suspendedAt: null,
    passwordHash: "old",
    sessionVersion: 7,
  };
  state.audits = [];
  state.find.mockImplementation(async () => state.target);
  state.mapping.mockResolvedValue(null);
  state.update.mockImplementation(async ({ where, data }) => {
    if (
      where.branchId !== state.target.branchId ||
      where.updatedAt.getTime() !== (state.target.updatedAt as Date).getTime()
    )
      return { count: 0 };
    state.target = {
      ...state.target,
      passwordHash: data.passwordHash,
      sessionVersion:
        Number(state.target.sessionVersion) + data.sessionVersion.increment,
      updatedAt: data.updatedAt ?? new Date(),
    };
    return { count: 1 };
  });
  state.audit.mockImplementation(async ({ data }) => {
    state.audits.push(data);
    return data;
  });
  state.transaction.mockImplementation(async (run) => {
    const previous = structuredClone(state.target),
      audits = structuredClone(state.audits);
    try {
      return await run({
        user: { findFirst: state.find, updateMany: state.update },
        eywaManagedAccount: { findUnique: state.mapping },
        accountAuditLog: { create: state.audit },
      });
    } catch (error) {
      state.target = previous;
      state.audits = audits;
      throw error;
    }
  });
});
describe("password reset account and branch CAS with transactional audit", () => {
  it("reissues a hashed password and invalidates the previous session in one transaction", async () => {
    const response = await call();
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(
      await compare(data.initialPassword, state.target.passwordHash as string),
    ).toBe(true);
    expect(state.target.sessionVersion).toBe(8);
    expect((state.target.updatedAt as Date).getTime()).toBeGreaterThan(
      new Date(updatedAt).getTime(),
    );
    expect(state.update.mock.calls[0][0].where).toMatchObject({
      id,
      branchId,
      updatedAt: new Date(updatedAt),
      deletedAt: null,
      isSuperAdmin: false,
      authSource: "local",
    });
    expect(state.audits).toEqual([
      expect.objectContaining({
        userId: id,
        actorId: actor,
        action: "account.password_reissued",
        outcome: "success",
      }),
    ]);
    expect(JSON.stringify(state.audits)).not.toContain(data.initialPassword);
    expect(state.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
  });
  it.each([
    { ...body, expectedUpdatedAt: "2026-09-30T00:00:00.000Z" },
    { ...body, expectedBranchId: null },
    { ...body, expectedBranchId: actor },
  ])("rejects stale account or branch %j", async (input) => {
    expect((await call(input)).status).toBe(409);
    expect(state.update).not.toHaveBeenCalled();
    expect(state.audit).not.toHaveBeenCalled();
  });
  it("supports explicitly unassigned accounts", async () => {
    state.target.branchId = null;
    expect((await call({ ...body, expectedBranchId: null })).status).toBe(200);
    expect(state.update.mock.calls[0][0].where.branchId).toBeNull();
  });
  it("losing the CAS after a concurrent move changes no password or audit", async () => {
    state.update.mockResolvedValueOnce({ count: 0 });
    expect((await call()).status).toBe(409);
    expect(state.target.passwordHash).toBe("old");
    expect(state.target.sessionVersion).toBe(7);
    expect(state.audit).not.toHaveBeenCalled();
  });
  it("audit failure rolls back the credential, updatedAt and sessionVersion", async () => {
    state.audit.mockRejectedValueOnce(new Error("audit unavailable"));
    await expect(call()).rejects.toThrow("audit unavailable");
    expect(state.target).toMatchObject({
      passwordHash: "old",
      updatedAt: new Date(updatedAt),
      sessionVersion: 7,
    });
    expect(state.audits).toEqual([]);
  });
  it.each([
    { expectedUpdatedAt: updatedAt },
    { expectedBranchId: branchId },
    { ...body, branchMenus: [] },
    { ...body, expectedBranchId: "bad" },
    { ...body, expectedUpdatedAt: "bad" },
  ])("requires strict revision inputs %j", async (input) => {
    expect((await call(input)).status).toBe(400);
    expect(state.transaction).not.toHaveBeenCalled();
  });
  it("keeps managed local recovery evidence in the transaction and denies missing evidence", async () => {
    state.mapping.mockResolvedValue({ bindingId: branchId });
    expect((await call()).status).toBe(403);
    expect((await call({ ...body, recoveryEvidence: "short" })).status).toBe(
      403,
    );
    expect(state.update).not.toHaveBeenCalled();
    const recoveryEvidence =
      "Verified independent ownership using historical account approval records.";
    expect((await call({ ...body, recoveryEvidence })).status).toBe(200);
    expect(state.audits).toEqual([
      expect.objectContaining({
        details: expect.objectContaining({
          recoveryEvidence,
          bindingId: branchId,
        }),
      }),
    ]);
  });
  it.each([{ authSource: "eywa" }, { isSuperAdmin: true }])(
    "preserves protected account restrictions %j",
    async (change) => {
      Object.assign(state.target, change);
      expect((await call()).status).toBe(403);
      expect(state.update).not.toHaveBeenCalled();
    },
  );
  it("denies branch managers and cross-origin resets before DB access", async () => {
    state.session = {
      user: {
        id: actor,
        isAdmin: true,
        isSuperAdmin: false,
        approvalStatus: "approved",
      },
    };
    expect((await call()).status).toBe(403);
    state.session = {
      user: {
        id: actor,
        isAdmin: true,
        isSuperAdmin: true,
        approvalStatus: "approved",
      },
    };
    expect((await call(body, "https://foreign.test")).status).toBe(403);
    expect(state.transaction).not.toHaveBeenCalled();
  });
  it("handles malformed IDs, unavailable accounts and serializable conflicts", async () => {
    expect((await call(body, "http://localhost", "bad")).status).toBe(404);
    state.find.mockResolvedValueOnce(null);
    expect((await call()).status).toBe(403);
    state.transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("conflict", {
        code: "P2034",
        clientVersion: "6.19.3",
      }),
    );
    expect((await call()).status).toBe(409);
  });
});
