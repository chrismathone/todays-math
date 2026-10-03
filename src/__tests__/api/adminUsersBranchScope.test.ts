// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({
  session: null as unknown,
  branch: vi.fn(),
  list: vi.fn(),
  count: vi.fn(),
  group: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: async () => state.session }));
vi.mock("@/lib/db", () => ({
  db: {
    branch: { findUnique: state.branch },
    user: { findMany: state.list, count: state.count, groupBy: state.group },
  },
}));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_: string, fn: unknown) => fn,
}));
import { GET } from "@/app/api/admin/users/route";
const a = "10000000-0000-4000-8000-000000000001";
const b = "20000000-0000-4000-8000-000000000002";
const call = (query = "") =>
  GET(new Request(`http://localhost/api/admin/users${query}`));
beforeEach(() => {
  vi.resetAllMocks();
  state.session = {
    user: {
      id: a,
      isAdmin: true,
      isSuperAdmin: true,
      approvalStatus: "approved",
      menus: [],
    },
  };
  state.branch.mockResolvedValue({ id: a });
  state.list.mockResolvedValue([]);
  state.count.mockResolvedValue(1);
  state.group.mockResolvedValue([
    { approvalStatus: "approved", _count: 2 },
    { approvalStatus: "pending", _count: 1 },
  ]);
});
describe("branch-scoped admin accounts and every count", () => {
  it.each([a, b, "unassigned"])(
    "scopes all five queries to %s",
    async (filter) => {
      const response = await call(
        `?branchId=${filter}&status=pending&lifecycle=suspended&q=teacher&page=2&pageSize=5`,
      );
      expect(response.status).toBe(200);
      const branchId = filter === "unassigned" ? null : filter;
      expect(state.list.mock.calls[0][0]).toMatchObject({
        where: {
          branchId,
          deletedAt: null,
          suspendedAt: { not: null },
          approvalStatus: "pending",
          OR: expect.any(Array),
        },
        skip: 5,
        take: 5,
      });
      for (const [{ where }] of state.count.mock.calls)
        expect(where).toMatchObject({ branchId });
      expect(state.group).toHaveBeenCalledWith({
        by: ["approvalStatus"],
        where: { branchId, deletedAt: null },
        _count: true,
      });
      expect(await response.json()).toMatchObject({
        meta: {
          total: 1,
          counts: { all: 3, approved: 2, pending: 1, rejected: 0 },
          lifecycleCounts: { suspended: 1, deleted: 1 },
        },
      });
      if (filter === "unassigned") expect(state.branch).not.toHaveBeenCalled();
      else
        expect(state.branch).toHaveBeenCalledWith({
          where: { id: filter },
          select: { id: true },
        });
    },
  );
  it("keeps deleted list/count filters inside the selected branch", async () => {
    expect((await call(`?branchId=${a}&lifecycle=deleted`)).status).toBe(200);
    expect(state.list.mock.calls[0][0].where).toEqual({
      branchId: a,
      deletedAt: { not: null },
    });
    expect(state.count.mock.calls[0][0].where).toEqual({
      branchId: a,
      deletedAt: { not: null },
    });
  });
  it.each([
    "",
    "?branchId=",
    "?branchId=bad",
    "?branchId=all",
    "?branchId=%20",
    `?branchId=${a}&branchId=${b}`,
  ])(
    "rejects missing/invalid/ambiguous scope %s without global queries",
    async (query) => {
      expect((await call(query)).status).toBe(400);
      expect(state.list).not.toHaveBeenCalled();
      expect(state.count).not.toHaveBeenCalled();
      expect(state.group).not.toHaveBeenCalled();
    },
  );
  it("returns 404 for a valid UUID that does not name a branch", async () => {
    state.branch.mockResolvedValue(null);
    expect((await call(`?branchId=${a}`)).status).toBe(404);
    expect(state.list).not.toHaveBeenCalled();
    expect(state.count).not.toHaveBeenCalled();
  });
  it("denies branch managers before validation or DB queries", async () => {
    state.session = {
      user: {
        id: a,
        isAdmin: true,
        isSuperAdmin: false,
        approvalStatus: "approved",
      },
    };
    expect((await call(`?branchId=${a}`)).status).toBe(403);
    expect(state.branch).not.toHaveBeenCalled();
    expect(state.list).not.toHaveBeenCalled();
  });
});
