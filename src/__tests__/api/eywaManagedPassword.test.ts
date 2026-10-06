// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  target: vi.fn(),
  mapping: vi.fn(),
  update: vi.fn(),
  audit: vi.fn(),
}));
vi.mock("@/lib/accountAccess", () => ({
  authorizeAccount: async () => ({
    account: { id: "00000000-0000-4000-8000-000000000001" },
    response: null,
  }),
}));
vi.mock("@/lib/db", () => ({
  db: {
    $transaction: async (run: (tx: unknown) => Promise<unknown>) =>
      run({
        user: { findFirst: mocks.target, updateMany: mocks.update },
        eywaManagedAccount: { findUnique: mocks.mapping },
        accountAuditLog: { create: mocks.audit },
      }),
  },
}));
vi.mock("@/lib/audit", () => ({ auditData: (data: unknown) => data }));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_: string, fn: unknown) => fn,
}));
import { POST } from "@/app/api/admin/users/[id]/password/route";
const id = "00000000-0000-4000-8000-000000000002";
const updatedAt = "2026-10-01T00:00:00.000Z";
const call = (body: Record<string, unknown> = {}) =>
  POST(
    new Request(`http://localhost/api/admin/users/${id}/password`, {
      method: "POST",
      body: JSON.stringify({
        expectedUpdatedAt: updatedAt,
        expectedBranchId: null,
        ...body,
      }),
    }),
    { params: Promise.resolve({ id }) },
  );
beforeEach(() => {
  vi.clearAllMocks();
  mocks.target.mockResolvedValue({
    id,
    isSuperAdmin: false,
    authSource: "local",
    branchId: null,
    updatedAt: new Date(updatedAt),
  });
  mocks.mapping.mockResolvedValue(null);
  mocks.update.mockResolvedValue({ count: 1 });
});
describe("managed account recovery boundaries", () => {
  it("cannot turn integration-only authentication into a password account", async () => {
    mocks.target.mockResolvedValue({
      id,
      isSuperAdmin: false,
      authSource: "eywa",
      branchId: null,
      updatedAt: new Date(updatedAt),
    });
    expect((await call()).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("requires independent recovery evidence for managed local credentials", async () => {
    mocks.mapping.mockResolvedValue({ bindingId: id });
    expect((await call()).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
    const evidence =
      "Verified authentication ownership and historical account approval records.";
    expect((await call({ recoveryEvidence: evidence })).status).toBe(200);
    expect(mocks.update.mock.calls[0][0].data.sessionVersion).toEqual({
      increment: 1,
    });
    expect(mocks.audit.mock.calls[0][0].data.details.recoveryEvidence).toBe(
      evidence,
    );
  });
  it("preserves the prior nonmanaged password reset path", async () => {
    expect((await call()).status).toBe(200);
    expect(mocks.update).toHaveBeenCalledOnce();
  });
});
