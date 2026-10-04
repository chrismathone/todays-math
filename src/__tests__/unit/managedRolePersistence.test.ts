// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/eywa/managedProvisioning", () => ({
  syncAutomaticBranchName: vi.fn(),
}));
import { applyManagedControl } from "@/lib/eywa/managedAccounts";
import { accountUsable } from "@/lib/eywa/managedPolicy";
import { controlSchema } from "@/lib/eywa/sync-contract";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const now = Date.now();
const binding = {
  id: id(1),
  targetBranchId: id(2),
  sourceEpoch: id(3),
  securityRevision: 12n,
  tenantRevocationGeneration: 7n,
  mode: "active",
  enabled: true,
  healthy: true,
  retiredAt: null,
  leaseExpiresAt: new Date(now + 60_000),
} as Parameters<typeof applyManagedControl>[1];
const user = {
  id: id(4),
  branchId: id(2),
  branchRole: "manager",
  isAdmin: true,
  isSuperAdmin: false,
  approvalStatus: "approved",
  deletedAt: null,
  manualSuspendedAt: null,
  suspendedAt: null,
} as Parameters<typeof accountUsable>[0];
const mapping = {
  id: id(5),
  currentUserId: id(4),
  userId: id(4),
  sourceUserId: id(6),
  branchRoleOverride: "manager",
  status: "confirmed",
  blockReasons: [],
  sourceEpoch: id(3),
  accountRevocationGeneration: 9n,
  tenantRevocationGeneration: 7n,
  leaseExpiresAt: new Date(now + 60_000),
  user,
} as Parameters<typeof accountUsable>[1] & { user: typeof user };
const control = controlSchema.parse({
  schemaVersion: 2,
  bindingId: id(1),
  tenantId: id(7),
  targetBranchId: id(2),
  sourceEpoch: id(3),
  securityRevision: "12",
  tenantRevocationGeneration: "7",
  enabled: true,
  mode: "active",
  validatedAt: new Date(now).toISOString(),
  nextEffectiveAt: null,
  healthy: true,
  users: [
    {
      id: id(6),
      email: "teacher@example.test",
      name: "Teacher",
      status: "active",
      role: "teacher",
      subjects: ["math"],
      eligible: true,
      blockReasons: [],
      accountRevocationGeneration: "9",
      classListRevision: "11",
      classes: [],
    },
  ],
});

describe("managed local role persistence and source access", () => {
  it("keeps an explicit manager role through a source refresh", async () => {
    const update = vi.fn().mockResolvedValue({});
    const tx = {
      eywaBinding: { update: vi.fn().mockResolvedValue(binding) },
      eywaManagedAccount: {
        findMany: vi.fn().mockResolvedValue([mapping]),
        update: vi.fn(),
      },
      user: { update },
    } as unknown as Parameters<typeof applyManagedControl>[0];
    expect(await applyManagedControl(tx, binding, control, now)).toBeNull();
    expect(update).toHaveBeenCalledWith({
      where: { id: id(4) },
      data: { branchRole: "manager", isAdmin: true, suspendedAt: null },
    });
    expect(accountUsable(user, mapping, binding, now)).toBe(true);
  });
  it("requires an explicit matching override and the immutable binding branch", () => {
    expect(
      accountUsable(
        user,
        { ...mapping, branchRoleOverride: null },
        binding,
        now,
      ),
    ).toBe(false);
    expect(
      accountUsable({ ...user, branchId: id(99) }, mapping, binding, now),
    ).toBe(false);
    expect(
      accountUsable({ ...user, branchRole: "owner" }, mapping, binding, now),
    ).toBe(false);
    expect(
      accountUsable({ ...user, isSuperAdmin: true }, mapping, binding, now),
    ).toBe(false);
  });
  it("revokes a promoted user's session when the source becomes ineligible", async () => {
    const update = vi.fn().mockResolvedValue({});
    const managedUpdate = vi.fn();
    const tx = {
      eywaBinding: { update: vi.fn().mockResolvedValue(binding) },
      eywaManagedAccount: {
        findMany: vi.fn().mockResolvedValue([mapping]),
        update: managedUpdate,
      },
      user: { update },
    } as unknown as Parameters<typeof applyManagedControl>[0];
    await applyManagedControl(
      tx,
      binding,
      {
        ...control,
        users: [
          {
            ...control.users[0],
            eligible: false,
            blockReasons: ["staff_inactive"],
          },
        ],
      },
      now,
    );
    expect(managedUpdate.mock.calls[0][0].data).toMatchObject({
      blockReasons: ["staff_inactive"],
    });
    expect(update.mock.calls[0][0].data).toMatchObject({
      branchRole: "manager",
      isAdmin: true,
      suspendedAt: expect.any(Date),
      sessionVersion: { increment: 1 },
    });
  });
  it("source disable, removal, and manual suspension still deny a promoted account", () => {
    expect(
      accountUsable(user, mapping, { ...binding, enabled: false }, now),
    ).toBe(false);
    expect(
      accountUsable(
        user,
        { ...mapping, blockReasons: ["source_removed"] },
        binding,
        now,
      ),
    ).toBe(false);
    expect(
      accountUsable(
        { ...user, manualSuspendedAt: new Date(now) },
        mapping,
        binding,
        now,
      ),
    ).toBe(false);
    expect(accountUsable(user, mapping, binding, now + 60_000)).toBe(false);
  });
});

describe("managed role migration database guards", () => {
  let pg: PGlite;
  beforeAll(async () => {
    pg = new PGlite();
    await pg.exec(`
      CREATE TYPE branch_role AS ENUM ('owner','manager','teacher');
      CREATE TABLE eywa_binding (id uuid PRIMARY KEY, target_branch_id uuid, enabled boolean,
        healthy boolean, mode text, retired_at timestamptz);
      CREATE TABLE eywa_managed_account (id uuid PRIMARY KEY, binding_id uuid,
        current_user_id uuid, source_user_id uuid, block_reasons text[]);
      CREATE TABLE "user" (id uuid PRIMARY KEY, branch_id uuid, branch_role branch_role,
        is_admin boolean, is_super_admin boolean, eywa_user_id uuid, auth_source text,
        manual_suspended_at timestamptz, suspended_at timestamptz);
    `);
    await pg.exec(
      readFileSync(
        new URL(
          "../../../prisma/migrations/20261004064000_managed_account_role_override/migration.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await pg.exec(
      'CREATE TRIGGER eywa_user_guard BEFORE UPDATE ON "user" FOR EACH ROW EXECUTE FUNCTION eywa_user_guard();',
    );
  });
  beforeEach(async () => {
    await pg.exec(`TRUNCATE "user", eywa_managed_account, eywa_binding;
      INSERT INTO eywa_binding VALUES ('${id(1)}','${id(2)}',true,true,'active',null);
      INSERT INTO "user" VALUES ('${id(4)}','${id(2)}','teacher',false,false,'${id(6)}','eywa',null,null);
      INSERT INTO eywa_managed_account (id,binding_id,current_user_id,source_user_id,block_reasons)
        VALUES ('${id(5)}','${id(1)}','${id(4)}','${id(6)}',ARRAY[]::text[]);`);
  });
  afterAll(async () => {
    await pg?.close();
  });
  it("allows only a persisted matching local role and keeps it after profile refresh", async () => {
    await pg.transaction(async (tx) => {
      await tx.exec(
        "UPDATE eywa_managed_account SET branch_role_override='manager';",
      );
      await tx.exec("UPDATE \"user\" SET branch_role='manager',is_admin=true;");
    });
    await pg.exec('UPDATE "user" SET suspended_at=null;');
    expect(
      (await pg.query('SELECT branch_role,is_admin FROM "user"')).rows,
    ).toEqual([{ branch_role: "manager", is_admin: true }]);
    await expect(
      pg.exec("UPDATE \"user\" SET branch_role='owner';"),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      pg.exec('UPDATE "user" SET is_admin=false;'),
    ).rejects.toMatchObject({ code: "23514" });
  });
  it("rejects implicit promotion, source branch edits, unlink, and superadmin elevation", async () => {
    for (const sql of [
      "UPDATE \"user\" SET branch_role='manager',is_admin=true;",
      `UPDATE "user" SET branch_id='${id(99)}';`,
      'UPDATE "user" SET eywa_user_id=null;',
      'UPDATE "user" SET is_super_admin=true;',
      "UPDATE \"user\" SET auth_source='local';",
    ])
      await expect(pg.exec(sql)).rejects.toMatchObject({ code: "23514" });
  });
  it("a role override cannot clear a source suspension", async () => {
    await pg.exec(
      "UPDATE eywa_managed_account SET branch_role_override='owner',block_reasons=ARRAY['source_removed'];",
    );
    await pg.exec(
      "UPDATE \"user\" SET branch_role='owner',is_admin=true,suspended_at=null;",
    );
    expect(
      (
        await pg.query<{ suspended_at: Date }>(
          'SELECT suspended_at FROM "user"',
        )
      ).rows[0].suspended_at,
    ).not.toBeNull();
  });
  it("rolls back an override if the following guarded account write fails", async () => {
    await expect(
      pg.transaction(async (tx) => {
        await tx.exec(
          "UPDATE eywa_managed_account SET branch_role_override='manager';",
        );
        await tx.exec(
          `UPDATE "user" SET branch_role='manager',is_admin=true,branch_id='${id(99)}';`,
        );
      }),
    ).rejects.toMatchObject({ code: "23514" });
    expect(
      (await pg.query("SELECT branch_role_override FROM eywa_managed_account"))
        .rows,
    ).toEqual([{ branch_role_override: null }]);
  });
});
