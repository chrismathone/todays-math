// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountAccess } from "@/contracts/accountAccess.contract";

const state = vi.hoisted(() => ({
  findBinding: vi.fn(),
  count: vi.fn(),
  transaction: vi.fn(),
  lock: vi.fn(),
  fetchControl: vi.fn(),
  fetchSnapshot: vi.fn(),
  validate: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  db: {
    eywaBinding: { findUnique: state.findBinding },
    eywaManagedAccount: { count: state.count },
    $transaction: state.transaction,
  },
}));
vi.mock("@/lib/eywa/managedAccounts", () => ({ lockBinding: state.lock }));
vi.mock("@/lib/eywa/managedTransport", () => ({
  bindingConfig: () => ({
    bindingId: "60000000-0000-4000-8000-000000000001",
    tenantId: "70000000-0000-4000-8000-000000000001",
    targetBranchId: "50000000-0000-4000-8000-000000000001",
    provision: "manual",
  }),
  bindingConfigs: () => [],
  fetchControl: state.fetchControl,
  fetchSnapshot: state.fetchSnapshot,
}));
vi.mock("@/lib/eywa/sync-contract", async () => {
  const actual = await vi.importActual<typeof import("@/lib/eywa/sync-contract")>(
    "@/lib/eywa/sync-contract",
  );
  return { ...actual, validateCompleteSnapshot: state.validate };
});
import { configureManagedBinding } from "@/lib/eywa/managedAdministration";

const bindingId = "60000000-0000-4000-8000-000000000001";
const tenantId = "70000000-0000-4000-8000-000000000001";
const branchId = "50000000-0000-4000-8000-000000000001";
const epoch = "11111111-1111-4111-8111-111111111111";
const actor: AccountAccess = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "최고관리자",
  email: "root@example.com",
  role: "director",
  isAdmin: true,
  isSuperAdmin: true,
  approvalStatus: "approved",
  menus: [],
};
const control = {
  enabled: true,
  healthy: true,
  sourceEpoch: epoch,
  validatedAt: "2026-10-04T00:00:00.000Z",
  nextEffectiveAt: null,
};
const binding = {
  id: bindingId,
  tenantId,
  targetBranchId: branchId,
  retiredAt: null,
  sourceEpoch: epoch,
  archiveOwnerUserId: null as string | null,
  mode: "shadow",
};

beforeEach(() => {
  vi.clearAllMocks();
  state.findBinding.mockResolvedValue(binding);
  state.fetchControl.mockResolvedValue({ control, started: Date.parse(control.validatedAt) });
  state.fetchSnapshot.mockResolvedValue({
    manifest: { snapshotId: "snap-1", control },
    pages: [],
  });
  state.validate.mockReturnValue({});
  state.lock.mockResolvedValue(binding);
  state.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn({}));
});

describe("managed activation gate", () => {
  it("rejects enabled false before writing", async () => {
    state.fetchControl.mockResolvedValue({
      control: { ...control, enabled: false },
      started: Date.parse(control.validatedAt),
    });
    await expect(
      configureManagedBinding(actor, { bindingId, action: "activate" }),
    ).rejects.toMatchObject({ code: "activation_requires_enabled" });
    expect(state.transaction).not.toHaveBeenCalled();
    expect(state.fetchSnapshot).not.toHaveBeenCalled();
  });

  it("rejects an unhealthy epoch or retired binding without a transaction", async () => {
    state.fetchControl.mockResolvedValue({
      control: { ...control, healthy: false },
      started: Date.parse(control.validatedAt),
    });
    await expect(
      configureManagedBinding(actor, { bindingId, action: "activate" }),
    ).rejects.toMatchObject({ code: "activation_requires_healthy_binding" });
    state.fetchControl.mockResolvedValue({
      control: { ...control, sourceEpoch: "22222222-2222-4222-8222-222222222222" },
      started: Date.parse(control.validatedAt),
    });
    await expect(
      configureManagedBinding(actor, { bindingId, action: "activate" }),
    ).rejects.toMatchObject({ code: "activation_requires_healthy_binding" });
    state.findBinding.mockResolvedValue({ ...binding, retiredAt: new Date() });
    state.fetchControl.mockResolvedValue({
      control,
      started: Date.parse(control.validatedAt),
    });
    await expect(
      configureManagedBinding(actor, { bindingId, action: "activate" }),
    ).rejects.toMatchObject({ code: "activation_requires_healthy_binding" });
    expect(state.transaction).not.toHaveBeenCalled();
  });

  it("does not mutate when the snapshot cannot be applied", async () => {
    state.fetchSnapshot.mockRejectedValue(new Error("source down"));
    await expect(
      configureManagedBinding(actor, { bindingId, action: "activate" }),
    ).rejects.toMatchObject({ code: "snapshot_not_applied" });
    expect(state.transaction).not.toHaveBeenCalled();
  });

  it("restores only integration stops and does not call restoration complete for the mode step", async () => {
    const integrationId = "20000000-0000-4000-8000-000000000001";
    const manualId = "20000000-0000-4000-8000-000000000002";
    const deletedId = "20000000-0000-4000-8000-000000000003";
    const blockedId = "20000000-0000-4000-8000-000000000004";
    const users = [
      { id: integrationId, deletedAt: null, manualSuspendedAt: null, suspendedAt: new Date() },
      { id: manualId, deletedAt: null, manualSuspendedAt: new Date(), suspendedAt: new Date() },
      { id: deletedId, deletedAt: new Date(), manualSuspendedAt: null, suspendedAt: new Date() },
      { id: blockedId, deletedAt: null, manualSuspendedAt: null, suspendedAt: new Date() },
    ];
    const updateMany = vi.fn(async ({ where }: { where: { id: string } }) => ({
      count: where.id === integrationId ? 1 : 0,
    }));
    const classUpdate = vi.fn();
    const audit = vi.fn();
    const tx = {
      eywaBinding: { update: vi.fn() },
      accountAuditLog: {
        findFirst: vi.fn(async () => ({
          details: { userIds: users.map((user) => user.id) },
        })),
        create: audit,
      },
      user: { findMany: vi.fn(async () => users), updateMany },
      eywaManagedAccount: {
        findFirst: vi.fn(async ({ where }: { where: { currentUserId: string } }) => ({
          id: `account-${where.currentUserId}`,
          blockReasons:
            where.currentUserId === blockedId
              ? ["binding_inactive", "local_account_blocked"]
              : ["binding_inactive"],
        })),
        update: vi.fn(),
      },
      eywaInbox: { create: vi.fn(), updateMany: vi.fn() },
      class: { update: classUpdate },
    };
    state.transaction.mockImplementation(async (fn: (value: typeof tx) => unknown) => fn(tx));
    const result = await configureManagedBinding(actor, {
      bindingId,
      action: "activate",
    });
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(updateMany.mock.calls[0][0].where).toMatchObject({
      id: integrationId,
      deletedAt: null,
      manualSuspendedAt: null,
    });
    expect(classUpdate).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      changed: true,
      restored: 1,
      steps: [
        { step: "source", restored: false },
        { step: "mode", restored: false },
        { step: "snapshot", restored: false },
        { step: "accounts", restored: true, count: 1 },
        { step: "relogin", restored: false, count: 1 },
      ],
    });
    expect(audit.mock.calls[0][0].data.details).toMatchObject({
      restored: 1,
      userIds: [integrationId],
      snapshotId: "snap-1",
    });
    expect(JSON.stringify(audit.mock.calls)).not.toMatch(/password|phone|@/);
  });

});
