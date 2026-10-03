// @vitest-environment node
/** Opt-in real PostgreSQL API/constraint verification. Root applies the migration.
 * Refuses every target except the dedicated coordinator-prepared loopback DB.
 * Seeds UUID-scoped fixtures only and removes them; never reads a dotenv file. */
import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { ALL_WORKSPACE_MENUS } from "@/contracts/accountAccess.contract";

const state = vi.hoisted(() => ({
  client: null as PrismaClient | null,
  session: null as unknown,
  failAudit: false,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: async () => state.session }));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_: string, fn: unknown) => fn,
}));
vi.mock("@/lib/db", () => ({
  db: new Proxy(
    {},
    {
      get(_target, key) {
        if (key === "$transaction")
          return (
            run: (tx: Prisma.TransactionClient) => Promise<unknown>,
            options: object,
          ) =>
            state.client!.$transaction(async (tx) => {
              if (!state.failAudit) return run(tx);
              return run(
                new Proxy(tx, {
                  get(target, prop) {
                    if (prop === "accountAuditLog")
                      return {
                        create: async (
                          args: Prisma.AccountAuditLogCreateArgs,
                        ) => {
                          if (args.data.action === "admin.branch_renamed")
                            return tx.accountAuditLog.create(args);
                          throw new Error("injected audit failure");
                        },
                      };
                    return Reflect.get(target, prop);
                  },
                }),
              );
            }, options);
        const value = Reflect.get(state.client!, key);
        return typeof value === "function" ? value.bind(state.client) : value;
      },
    },
  ),
}));
import {
  PATCH as branchPatch,
  GET as branchGet,
} from "@/app/api/admin/branches/[id]/route";
import { GET as branchesGet } from "@/app/api/admin/branches/route";
import { PATCH as accountPatch } from "@/app/api/admin/users/[id]/route";
import { GET as usersGet } from "@/app/api/admin/users/route";
import { POST as passwordPost } from "@/app/api/admin/users/[id]/password/route";

const dsn = process.env.BRANCH_ADMIN_TEST_DATABASE_URL;
const ids = {
  a: randomUUID(),
  b: randomUUID(),
  actor: randomUUID(),
  owner: randomUUID(),
  teacher: randomUUID(),
  pending: randomUUID(),
  deleted: randomUUID(),
  other: randomUUID(),
  unassigned: randomUUID(),
};
const userIds = [
  ids.actor,
  ids.owner,
  ids.teacher,
  ids.pending,
  ids.deleted,
  ids.other,
  ids.unassigned,
];
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (path: string, method = "GET", body?: unknown) =>
  new Request(`http://localhost${path}`, {
    method,
    headers: { origin: "http://localhost" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const menus = (input: object) =>
  branchPatch(req(`/api/admin/branches/${ids.a}`, "PATCH", input), ctx(ids.a));
const scopedUsers = (branch: string) =>
  usersGet(req(`/api/admin/users?branchId=${branch}`));
const reset = (input: object) =>
  passwordPost(
    req(`/api/admin/users/${ids.teacher}/password`, "POST", input),
    ctx(ids.teacher),
  );

describe.skipIf(!dsn)(
  "real branch admin migration and API transactions",
  () => {
    beforeAll(() => {
      const url = new URL(dsn!);
      if (
        !["postgres:", "postgresql:"].includes(url.protocol) ||
        url.hostname !== "127.0.0.1" ||
        url.port !== "55441" ||
        url.pathname !== "/branch_admin"
      )
        throw new Error(
          "BRANCH_ADMIN_TEST_DATABASE_URL must target 127.0.0.1:55441/branch_admin",
        );
      state.client = new PrismaClient({ datasources: { db: { url: dsn! } } });
      process.env.AUTH_URL = "http://localhost";
    });
    beforeEach(async () => {
      state.failAudit = false;
      state.session = {
        user: {
          id: ids.actor,
          isAdmin: true,
          isSuperAdmin: true,
          approvalStatus: "approved",
          menus: [],
        },
      };
      await state.client!.branch.createMany({
        data: [
          { id: ids.a, name: "QA A" },
          { id: ids.b, name: "QA B" },
        ],
      });
      await state.client!.user.createMany({
        data: [
          {
            id: ids.actor,
            branchId: null,
            isAdmin: true,
            isSuperAdmin: true,
            approvalStatus: "approved",
          },
          {
            id: ids.owner,
            branchId: ids.a,
            branchRole: "owner",
            isAdmin: true,
            approvalStatus: "approved",
          },
          {
            id: ids.teacher,
            branchId: ids.a,
            branchRole: "teacher",
            approvalStatus: "approved",
            disabledMenus: ["studio"],
            passwordHash: "old",
            sessionVersion: 7,
          },
          {
            id: ids.pending,
            branchId: ids.a,
            approvalStatus: "pending",
            suspendedAt: new Date(),
          },
          {
            id: ids.deleted,
            branchId: ids.a,
            approvalStatus: "pending",
            deletedAt: new Date(),
          },
          { id: ids.other, branchId: ids.b, approvalStatus: "pending" },
          { id: ids.unassigned, branchId: null, approvalStatus: "pending" },
        ].map((user) => ({
          ...user,
          email: `${user.id}@branch-admin-test.invalid`,
          name: "QA account",
          updatedAt: new Date("2026-10-01T00:00:00Z"),
        })) as Prisma.UserCreateManyInput[],
      });
    });
    afterEach(async () => {
      if (!state.client) return;
      await state.client.accountAuditLog.deleteMany({
        where: { OR: [{ userId: { in: userIds } }, { actorId: ids.actor }] },
      });
      await state.client.user.deleteMany({ where: { id: { in: userIds } } });
      await state.client.branch.deleteMany({
        where: { id: { in: [ids.a, ids.b] } },
      });
    });
    afterAll(async () => {
      await state.client?.$disconnect();
    });
    it("adds safe defaults while preserving individual account settings", async () => {
      expect(
        await state.client!.branch.findUnique({ where: { id: ids.a } }),
      ).toMatchObject({ disabledMenus: [], menuRevision: 1 });
      expect(
        await state.client!.user.findUnique({ where: { id: ids.teacher } }),
      ).toMatchObject({ disabledMenus: ["studio"] });
    });
    it("allows disabling every current menu including independently added textbook", async () => {
      const row = await state.client!.branch.update({
        where: { id: ids.a },
        data: { disabledMenus: ALL_WORKSPACE_MENUS },
      });
      expect(row.disabledMenus).toContain("textbook");
      expect(row.disabledMenus).toEqual(ALL_WORKSPACE_MENUS);
    });
    it.each(["english", "unknown"])(
      "DB CHECK rejects noncurrent branch menu %s",
      async (menu) => {
        await expect(
          state.client!
            .$executeRaw`UPDATE "branch" SET "disabled_menus" = ARRAY[${menu}]::text[] WHERE "id" = ${ids.a}::uuid`,
        ).rejects.toMatchObject({
          code: "P2010",
          meta: expect.objectContaining({ code: "23514" }),
        });
      },
    );
    it("DB CHECK rejects null array members and nonpositive revisions", async () => {
      await expect(
        state.client!
          .$executeRaw`UPDATE "branch" SET "disabled_menus" = ARRAY[NULL]::text[] WHERE "id" = ${ids.a}::uuid`,
      ).rejects.toMatchObject({
        meta: expect.objectContaining({ code: "23514" }),
      });
      for (const revision of [0, -1])
        await expect(
          state.client!.branch.update({
            where: { id: ids.a },
            data: { menuRevision: revision },
          }),
        ).rejects.toThrow();
    });
    it("enables RLS without FORCE and revokes PUBLIC/anon/authenticated table privileges", async () => {
      const tables = await state.client!.$queryRaw<
        {
          relname: string;
          relrowsecurity: boolean;
          relforcerowsecurity: boolean;
        }[]
      >`SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE oid IN ('public.branch'::regclass, 'public.user'::regclass)`;
      expect(tables).toHaveLength(2);
      for (const table of tables)
        expect(table).toMatchObject({
          relrowsecurity: true,
          relforcerowsecurity: false,
        });
      const grants = await state.client!.$queryRaw<
        { grantee: string }[]
      >`SELECT grantee FROM information_schema.table_privileges WHERE table_schema = 'public' AND table_name IN ('branch','user') AND grantee IN ('PUBLIC','anon','authenticated')`;
      expect(grants).toEqual([]);
    });
    it("existing anon/authenticated roles cannot read or mutate Branch/User", async () => {
      const roles = await state.client!.$queryRaw<
        { rolname: string }[]
      >`SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated')`;
      for (const { rolname } of roles)
        for (const table of ["branch", "user"])
          for (const verb of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
            await expect(
              state.client!.$transaction(async (tx) => {
                await tx.$executeRawUnsafe(`SET LOCAL ROLE "${rolname}"`);
                const sql =
                  verb === "SELECT"
                    ? `SELECT id FROM "${table}" LIMIT 1`
                    : verb === "INSERT"
                      ? table === "branch"
                        ? `INSERT INTO "branch" (id,name) VALUES ('${randomUUID()}', 'Denied')`
                        : `INSERT INTO "user" (id,name,email,updated_at) VALUES ('${randomUUID()}', 'Denied', '${randomUUID()}@test.invalid', NOW())`
                      : verb === "UPDATE"
                        ? `UPDATE "${table}" SET name = 'Denied' WHERE id = '${table === "branch" ? ids.a : ids.teacher}'`
                        : `DELETE FROM "${table}" WHERE id = '${table === "branch" ? ids.a : ids.teacher}'`;
                await tx.$executeRawUnsafe(sql);
              }),
            ).rejects.toMatchObject({
              meta: expect.objectContaining({ code: "42501" }),
            });
          }
    });
    it("scopes persisted summaries and all account counts to A/B/unassigned", async () => {
      const list = await branchesGet(req("/api/admin/branches"));
      const json = await list.json();
      expect(
        json.data.find((branch: { id: string }) => branch.id === ids.a),
      ).toMatchObject({ _count: { users: 3 }, pendingCount: 1 });
      expect(
        json.data.find((branch: { id: string }) => branch.id === ids.b),
      ).toMatchObject({ _count: { users: 1 }, pendingCount: 1 });
      for (const [filter, total, pending, suspended, deleted] of [
        [ids.a, 3, 1, 1, 1],
        [ids.b, 1, 1, 0, 0],
      ] as const) {
        const result = await (await scopedUsers(filter)).json();
        expect(result.meta).toMatchObject({
          total,
          counts: { all: total, pending },
          lifecycleCounts: { suspended, deleted },
        });
      }
      const result = await (await scopedUsers("unassigned")).json();
      expect(
        result.data.some((user: { id: string }) => user.id === ids.unassigned),
      ).toBe(true);
      expect(
        result.data.some((user: { id: string }) => user.id === ids.teacher),
      ).toBe(false);
    });
    it("concurrent revision saves have one winner and one conflict without mixed names", async () => {
      const results = await Promise.all([
        menus({
          name: "First",
          menus: ["english-listening"],
          expectedMenuRevision: 1,
        }),
        menus({
          name: "Second",
          menus: ["english-bank"],
          expectedMenuRevision: 1,
        }),
      ]);
      expect(results.map((response) => response.status).sort()).toEqual([
        200, 409,
      ]);
      const result = await (
        await branchGet(req(`/api/admin/branches/${ids.a}`), ctx(ids.a))
      ).json();
      expect(result.data.menuRevision).toBe(2);
      expect(result.data.menus).toEqual([
        result.data.name === "First" ? "english-listening" : "english-bank",
      ]);
      expect(
        await state.client!.accountAuditLog.count({
          where: { actorId: ids.actor, action: "admin.branch_menus_changed" },
        }),
      ).toBe(1);
    });
    it("real transaction rolls back branch/account/password changes when audit fails", async () => {
      state.failAudit = true;
      await expect(
        menus({ name: "Failed", menus: [], expectedMenuRevision: 1 }),
      ).rejects.toThrow("injected audit failure");
      const expectedUpdatedAt = (
        await state.client!.user.findUniqueOrThrow({
          where: { id: ids.teacher },
        })
      ).updatedAt.toISOString();
      await expect(
        accountPatch(
          req(`/api/admin/users/${ids.teacher}`, "PATCH", {
            name: "Failed",
            expectedBranchId: ids.a,
            expectedUpdatedAt,
          }),
          ctx(ids.teacher),
        ),
      ).rejects.toThrow("injected audit failure");
      await expect(
        reset({ expectedUpdatedAt, expectedBranchId: ids.a }),
      ).rejects.toThrow("injected audit failure");
      expect(
        await state.client!.branch.findUnique({ where: { id: ids.a } }),
      ).toMatchObject({ name: "QA A", disabledMenus: [], menuRevision: 1 });
      expect(
        await state.client!.user.findUnique({ where: { id: ids.teacher } }),
      ).toMatchObject({
        name: "QA account",
        passwordHash: "old",
        sessionVersion: 7,
        disabledMenus: ["studio"],
        updatedAt: new Date(expectedUpdatedAt),
      });
      expect(
        await state.client!.accountAuditLog.count({
          where: { actorId: ids.actor },
        }),
      ).toBe(0);
    });
    it("a completed password reset rejects its stale account revision and later moved scope", async () => {
      const expectedUpdatedAt = (
        await state.client!.user.findUniqueOrThrow({
          where: { id: ids.teacher },
        })
      ).updatedAt.toISOString();
      expect(
        (await reset({ expectedUpdatedAt, expectedBranchId: ids.a })).status,
      ).toBe(200);
      expect(
        (await reset({ expectedUpdatedAt, expectedBranchId: ids.a })).status,
      ).toBe(409);
      const target = await state.client!.user.update({
        where: { id: ids.teacher },
        data: { branchId: ids.b },
      });
      expect(
        (
          await reset({
            expectedUpdatedAt: target.updatedAt.toISOString(),
            expectedBranchId: ids.a,
          })
        ).status,
      ).toBe(409);
      expect(
        await state.client!.accountAuditLog.count({
          where: { actorId: ids.actor, action: "account.password_reissued" },
        }),
      ).toBe(1);
    });
    it("branch edits preserve B and all personal menu settings", async () => {
      expect(
        (
          await menus({
            menus: ["english-listening", "english-bank"],
            expectedMenuRevision: 1,
          })
        ).status,
      ).toBe(200);
      expect(
        await state.client!.branch.findUnique({ where: { id: ids.b } }),
      ).toMatchObject({ disabledMenus: [], menuRevision: 1 });
      expect(
        await state.client!.user.findUnique({ where: { id: ids.teacher } }),
      ).toMatchObject({ disabledMenus: ["studio"] });
      expect(
        (
          await (
            await branchGet(req(`/api/admin/branches/${ids.a}`), ctx(ids.a))
          ).json()
        ).data.menus,
      ).toEqual(["english-listening", "english-bank"]);
      expect(ALL_WORKSPACE_MENUS).toContain("english-bank");
    });
  },
);
