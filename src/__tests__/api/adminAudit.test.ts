// @vitest-environment node
// Real authorization + route + query builder; all persistence stays in memory.
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  user: vi.fn(),
  list: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_path: string, handler: unknown) => handler,
}));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findFirst: mocks.user },
    accountAuditLog: {
      findMany: mocks.list,
      count: mocks.count,
      create: mocks.create,
    },
  },
}));

import { GET } from "@/app/api/admin/users/[id]/audit/route";

const TARGET = "10000000-0000-4000-8000-000000000001";
const ADMIN = "20000000-0000-4000-8000-000000000002";
const accessActions = [
  "admin.account_view",
  "admin.private_material_view",
  "admin.material_view",
];
const activityActions = [
  "account.settings_changed",
  "account.approved",
  "account.updated",
  "account.password_reissued",
  "admin.bootstrap",
  "admin.branch_renamed",
  "admin.journey_theme_changed",
  "material.saved",
  "future.action",
];
const actions = [...accessActions, ...activityActions];
const records = Array.from({ length: 96 }, (_, index) => ({
  id: `audit-${String(index).padStart(3, "0")}`,
  userId: index >= 84 ? ADMIN : TARGET,
  action: actions[index % actions.length],
  outcome:
    index % 3 === 0 ? "requested" : index % 3 === 1 ? "success" : "failed",
  details: { index },
  createdAt: new Date("2026-10-02T00:00:00Z"),
  actor: index % 2 === 0 ? { name: "관리자" } : null,
}));
type Where = { userId: string; action?: { in?: string[]; notIn?: string[] } };
function filtered(where: Where) {
  return records
    .filter(
      (item) =>
        item.userId === where.userId &&
        (!where.action?.in || where.action.in.includes(item.action)) &&
        (!where.action?.notIn || !where.action.notIn.includes(item.action)),
    )
    .sort(
      (a, b) =>
        b.createdAt.getTime() - a.createdAt.getTime() ||
        b.id.localeCompare(a.id),
    );
}
const call = (query = "", id = TARGET) =>
  GET(new Request(`http://localhost/api/admin/users/${id}/audit${query}`), {
    params: Promise.resolve({ id }),
  });
function login(overrides: Record<string, unknown> = {}) {
  mocks.auth.mockResolvedValue({
    user: {
      id: ADMIN,
      name: "최고관리자",
      role: "director",
      isAdmin: true,
      isSuperAdmin: true,
      approvalStatus: "approved",
      menus: [],
      ...overrides,
    },
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  login();
  mocks.user.mockResolvedValue({ id: TARGET, branchId: null });
  mocks.create.mockResolvedValue({});
  mocks.list.mockImplementation(
    async ({
      where,
      skip,
      take,
    }: {
      where: Where;
      skip: number;
      take: number;
    }) => filtered(where).slice(skip, skip + take),
  );
  mocks.count.mockImplementation(
    async ({ where }: { where: Where }) => filtered(where).length,
  );
});

describe("administrator audit categories", () => {
  it.each(["activity", "admin-access"])(
    "filters %s before pagination and uses the same scope for the count",
    async (category) => {
      const expected = records
        .filter(
          (item) =>
            item.userId === TARGET &&
            (category === "admin-access"
              ? accessActions.includes(item.action)
              : !accessActions.includes(item.action)),
        )
        .sort((a, b) => b.id.localeCompare(a.id));
      for (const page of [1, 2, 3]) {
        const response = await call(
          `?category=${category}&page=${page}&pageSize=7`,
        );
        expect(response.status).toBe(200);
        expect(response.headers.get("cache-control")).toContain("no-store");
        const result = await response.json();
        expect(result.meta).toEqual({
          page,
          pageSize: 7,
          total: expected.length,
        });
        expect(result.data.map((item: { id: string }) => item.id)).toEqual(
          expected.slice((page - 1) * 7, page * 7).map((item) => item.id),
        );
        expect(result.data).toHaveLength(7);
        expect(mocks.count.mock.lastCall?.[0].where).toEqual(
          mocks.list.mock.lastCall?.[0].where,
        );
        expect(mocks.list.mock.lastCall?.[0].orderBy).toEqual([
          { createdAt: "desc" },
          { id: "desc" },
        ]);
        expect(result.data[0].createdAt).toBe("2026-10-02T00:00:00.000Z");
        expect(result.data[0].actorName).toBe(
          expected[(page - 1) * 7].actor?.name ?? "시스템",
        );
      }
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: TARGET,
            actorId: ADMIN,
            action: "admin.private_material_view",
          }),
        }),
      );
    },
  );

  it("keeps approvals, settings, permissions and administrator mutations in activity", async () => {
    const result = await (await call("?category=activity&pageSize=100")).json();
    expect(
      [
        ...new Set(result.data.map((item: { action: string }) => item.action)),
      ].sort(),
    ).toEqual([...activityActions].sort());
  });

  it.each(["", "?category=all"])(
    "preserves unfiltered compatibility for %s",
    async (query) => {
      const result = await (await call(query)).json();
      expect(mocks.list.mock.lastCall?.[0].where).toEqual({ userId: TARGET });
      expect(result.meta).toEqual({ page: 1, pageSize: 30, total: 84 });
      expect(result.data.map((item: { id: string }) => item.id)).toEqual(
        filtered({ userId: TARGET })
          .slice(0, 30)
          .map((item) => item.id),
      );
    },
  );

  it.each(["unknown", "", "ACTIVITY"])(
    "rejects an invalid category %s instead of silently returning all records",
    async (category) => {
      const response = await call(`?category=${category}`);
      expect(response.status).toBe(400);
      expect(mocks.list).not.toHaveBeenCalled();
      expect(mocks.count).not.toHaveBeenCalled();
    },
  );

  it("keeps a filtered total on an empty later page", async () => {
    const result = await (
      await call("?category=admin-access&page=20&pageSize=7")
    ).json();
    expect(result).toEqual({
      data: [],
      meta: { page: 20, pageSize: 7, total: 21 },
    });
  });

  it.each([
    [null, 401],
    [{ isAdmin: false, isSuperAdmin: false }, 403],
    [{ isAdmin: true, isSuperAdmin: false }, 403],
    [{ approvalStatus: "pending" }, 403],
  ])(
    "preserves authentication and highest-admin access checks (%j)",
    async (overrides, status) => {
      if (overrides) login(overrides);
      else mocks.auth.mockResolvedValue(null);
      expect((await call("?category=admin-access")).status).toBe(status);
      expect(mocks.list).not.toHaveBeenCalled();
      expect(mocks.count).not.toHaveBeenCalled();
    },
  );

  it("rejects a missing target before querying its audit records", async () => {
    mocks.user.mockResolvedValue(null);
    expect((await call("?category=activity")).status).toBe(404);
    expect(mocks.list).not.toHaveBeenCalled();
  });
});
