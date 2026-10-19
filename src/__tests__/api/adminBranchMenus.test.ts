// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { ALL_WORKSPACE_MENUS } from "@/contracts/accountAccess.contract";

vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({
  session: null as unknown,
  branch: {} as Record<string, unknown>,
  audits: [] as Record<string, unknown>[],
  findMany: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  count: vi.fn(),
  groupBy: vi.fn(),
  audit: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: async () => state.session }));
vi.mock("@/lib/db", () => ({
  db: {
    branch: { findMany: state.findMany, findUnique: state.findUnique },
    user: { count: state.count, groupBy: state.groupBy },
    $transaction: state.transaction,
  },
}));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_: string, fn: unknown) => fn,
}));
import { GET as list } from "@/app/api/admin/branches/route";
import { GET as detail, PATCH } from "@/app/api/admin/branches/[id]/route";

const id = "20000000-0000-4000-8000-000000000002";
const actor = "10000000-0000-4000-8000-000000000001";
const context = (value = id) => ({ params: Promise.resolve({ id: value }) });
const request = (body?: unknown, origin = "http://localhost") =>
  new Request(`http://localhost/api/admin/branches/${id}`, {
    method: body === undefined ? "GET" : "PATCH",
    headers: { origin },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
beforeEach(() => {
  vi.resetAllMocks();
  process.env.AUTH_URL = "http://localhost";
  state.session = {
    user: {
      id: actor,
      isAdmin: true,
      isSuperAdmin: true,
      approvalStatus: "approved",
      menus: [],
    },
  };
  state.branch = {
    id,
    name: "A",
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    disabledMenus: [],
    ownerDisabledMenus: [],
    menuRevision: 1,
    _count: { users: 4 },
    users: [
      {
        id: actor,
        name: "Owner",
        email: "owner@example.test",
        suspendedAt: null,
      },
    ],
  };
  state.audits = [];
  state.findUnique.mockImplementation(async () => state.branch);
  state.findMany.mockImplementation(async () => [state.branch]);
  state.groupBy.mockResolvedValue([{ branchId: id, _count: 2 }]);
  state.count.mockImplementation(async ({ where }) =>
    where.branchId === null ? (where.approvalStatus ? 1 : 3) : 2,
  );
  state.updateMany.mockImplementation(async ({ where, data }) => {
    if (
      where.menuRevision !== undefined &&
      where.menuRevision !== state.branch.menuRevision
    )
      return { count: 0 };
    state.branch = {
      ...state.branch,
      ...data,
      menuRevision: data.menuRevision
        ? Number(state.branch.menuRevision) + data.menuRevision.increment
        : state.branch.menuRevision,
    };
    return { count: 1 };
  });
  state.audit.mockImplementation(async ({ data }) => {
    state.audits.push(data);
    return data;
  });
  state.transaction.mockImplementation(async (run) => {
    const previous = structuredClone(state.branch);
    const audits = structuredClone(state.audits);
    try {
      return await run({
        branch: { findUnique: state.findUnique, updateMany: state.updateMany },
        user: { count: state.count },
        accountAuditLog: { create: state.audit },
      });
    } catch (error) {
      state.branch = previous;
      state.audits = audits;
      throw error;
    }
  });
});

describe("highest-admin branch summaries and menu revisions", () => {
  it("lists active account and pending counts with the separate unassigned entry", async () => {
    const response = await list(request());
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      data: [
        {
          id,
          menus: ALL_WORKSPACE_MENUS,
          menuRevision: 1,
          pendingCount: 2,
          _count: { users: 4 },
          createdAt: "2026-10-01T00:00:00.000Z",
        },
      ],
      meta: { unassigned: { count: 3, pendingCount: 1 } },
    });
    expect(state.findMany.mock.calls[0][0].select._count.select.users).toEqual({
      where: { deletedAt: null },
    });
    expect(state.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          approvalStatus: "pending",
        }),
      }),
    );
  });
  it("returns exact English choices even when the first three English menus are disabled", async () => {
    state.branch.disabledMenus = [
      "english-school",
      "english-maker",
      "english-library",
    ];
    const response = await detail(request(), context());
    expect((await response.json()).data.menus).toEqual(
      ALL_WORKSPACE_MENUS.filter(
        (menu) => !(state.branch.disabledMenus as string[]).includes(menu),
      ),
    );
    expect(state.count).toHaveBeenCalledWith({
      where: { branchId: id, deletedAt: null, approvalStatus: "pending" },
    });
  });
  it("saves menus and name together with actor and previous/next revision audits", async () => {
    const response = await PATCH(
      request({
        name: "Renamed",
        menus: ["english-listening", "english-bank"],
        expectedMenuRevision: 1,
      }),
      context(),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({
      name: "Renamed",
      menus: ["english-listening", "english-bank"],
      menuRevision: 2,
    });
    expect(state.updateMany.mock.calls[0][0].where).toEqual({
      id,
      menuRevision: 1,
    });
    expect(state.audits).toContainEqual(
      expect.objectContaining({
        actorId: actor,
        action: "admin.branch_menus_changed",
        outcome: "success",
        details: expect.objectContaining({
          branchId: id,
          previousMenuRevision: 1,
          menuRevision: 2,
          previousMenus: ALL_WORKSPACE_MENUS,
          menus: ["english-listening", "english-bank"],
        }),
      }),
    );
    expect(state.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
  });
  it("keeps name-only saves and menu no-ops from increasing the menu revision", async () => {
    expect((await PATCH(request({ name: "Renamed" }), context())).status).toBe(
      200,
    );
    expect(state.branch.menuRevision).toBe(1);
    state.updateMany.mockClear();
    state.audit.mockClear();
    expect(
      (
        await PATCH(
          request({ menus: ALL_WORKSPACE_MENUS, expectedMenuRevision: 1 }),
          context(),
        )
      ).status,
    ).toBe(200);
    expect(state.updateMany).not.toHaveBeenCalled();
    expect(state.audit).not.toHaveBeenCalled();
  });
  it("rejects stale revision before changing either menus or name", async () => {
    expect(
      (
        await PATCH(
          request({ name: "Stale", menus: [], expectedMenuRevision: 2 }),
          context(),
        )
      ).status,
    ).toBe(409);
    expect(state.branch.name).toBe("A");
    expect(state.updateMany).not.toHaveBeenCalled();
    expect(state.audit).not.toHaveBeenCalled();
  });
  it("a zero-row CAS leaves the name and success audit untouched", async () => {
    state.updateMany.mockResolvedValueOnce({ count: 0 });
    expect(
      (
        await PATCH(
          request({ name: "Stale", menus: [], expectedMenuRevision: 1 }),
          context(),
        )
      ).status,
    ).toBe(409);
    expect(state.branch.name).toBe("A");
    expect(state.audit).not.toHaveBeenCalled();
  });
  it("audit failure rolls back name, menus, revision and earlier audit rows", async () => {
    state.audit
      .mockImplementationOnce(async ({ data }) => {
        state.audits.push(data);
        return data;
      })
      .mockRejectedValueOnce(new Error("audit unavailable"));
    await expect(
      PATCH(
        request({ name: "Failed", menus: [], expectedMenuRevision: 1 }),
        context(),
      ),
    ).rejects.toThrow("audit unavailable");
    expect(state.branch).toMatchObject({
      name: "A",
      disabledMenus: [],
      menuRevision: 1,
    });
    expect(state.audits).toEqual([]);
  });
  it.each([
    { menus: [] },
    { menus: ["english"], expectedMenuRevision: 1 },
    { menus: ["home", "home"], expectedMenuRevision: 1 },
    { menus: ["unknown"], expectedMenuRevision: 1 },
    { menus: [], expectedMenuRevision: 1, branchMenus: [] },
  ])("strictly rejects %j", async (input) => {
    expect((await PATCH(request(input), context())).status).toBe(400);
    expect(state.transaction).not.toHaveBeenCalled();
  });
  it("returns 404 for malformed and absent branch identifiers", async () => {
    expect((await detail(request(), context("unassigned"))).status).toBe(404);
    state.findUnique.mockResolvedValue(null);
    expect((await detail(request(), context())).status).toBe(404);
    expect((await PATCH(request({ name: "Absent" }), context())).status).toBe(
      404,
    );
  });
  it("denies branch managers and foreign-origin mutations before accessing the database", async () => {
    state.session = {
      user: {
        id: actor,
        isAdmin: true,
        isSuperAdmin: false,
        approvalStatus: "approved",
      },
    };
    expect((await list(request())).status).toBe(403);
    expect((await detail(request(), context())).status).toBe(403);
    expect(
      (await PATCH(request({ menus: [], expectedMenuRevision: 1 }), context()))
        .status,
    ).toBe(403);
    state.session = {
      user: {
        id: actor,
        isAdmin: true,
        isSuperAdmin: true,
        approvalStatus: "approved",
      },
    };
    expect(
      (
        await PATCH(
          request({ name: "Foreign" }, "https://foreign.test"),
          context(),
        )
      ).status,
    ).toBe(403);
    expect(state.transaction).not.toHaveBeenCalled();
    expect(state.findMany).not.toHaveBeenCalled();
  });
  it("reports serializable write conflicts as 409", async () => {
    state.transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("conflict", {
        code: "P2034",
        clientVersion: "6.19.3",
      }),
    );
    expect(
      (await PATCH(request({ menus: [], expectedMenuRevision: 1 }), context()))
        .status,
    ).toBe(409);
  });
});
