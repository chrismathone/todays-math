// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as teaching } from "@/app/api/studio/teaching/route";
import { GET as development } from "@/app/api/dev/unified/teaching/route";
import { GET as classList } from "@/app/api/classes/route";
import { MOCK_CLASS_A } from "@/mocks/data/classes";
import { MOCK_UNITS } from "@/mocks/data/units";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  auth: vi.fn(),
  units: vi.fn(),
  rows: vi.fn(),
  count: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ getSessionUser: mocks.session }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/eywa/managedAccounts", () => ({
  getManagedClassGrants: async () => null,
}));
vi.mock("@/lib/db", () => ({
  db: {
    unit: { findMany: mocks.units },
    class: { findMany: mocks.rows, count: mocks.count },
  },
}));

const user = {
  id: MOCK_CLASS_A.userId,
  name: "예시 선생님",
  email: "fixture@example.invalid",
  isAdmin: false,
};
const row = {
  ...MOCK_CLASS_A,
  createdAt: new Date(MOCK_CLASS_A.createdAt),
  updatedAt: new Date(MOCK_CLASS_A.updatedAt),
  user: { name: "예시 선생님" },
};
const units = MOCK_UNITS.map(({ id, grade, chapter, section, orderIndex }) => ({
  id,
  grade,
  chapter,
  section,
  orderIndex,
}));
const request = (path = "/api/studio/teaching?classes=1") =>
  new NextRequest(`http://localhost${path}`);
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NODE_ENV", "development");
  mocks.session.mockResolvedValue(user);
  mocks.auth.mockResolvedValue({ user: { id: user.id, role: "director" } });
  mocks.units.mockResolvedValue(units);
  mocks.rows.mockResolvedValue([row]);
  mocks.count.mockImplementation(async ({ where }) =>
    where.AND?.[0]?.userId?.not ? 0 : 1,
  );
});
afterEach(() => vi.unstubAllEnvs());

describe("authorized teaching initial class page", () => {
  it.each([
    { isAdmin: false },
    { isAdmin: true, branchId: "branch-a" },
    { isAdmin: true, isSuperAdmin: true },
    { isAdmin: false, branchId: "branch-a", branchRole: "teacher" },
  ])(
    "returns exactly the existing class API rows, pagination and owner scope for %j",
    async (scope) => {
      mocks.session.mockResolvedValue({ ...user, ...scope });
      const existing = await (
        await classList(request("/api/classes?page=1&pageSize=100"))
      ).json();
      const queries = {
        rows: [...mocks.rows.mock.calls],
        count: [...mocks.count.mock.calls],
      };
      mocks.rows.mockClear();
      mocks.count.mockClear();
      for (const get of [teaching, development]) {
        const response = await get(request());
        expect(response.status).toBe(200);
        expect(response.headers.get("cache-control")).toBe("private, no-store");
        expect(await response.json()).toEqual({
          data: {
            user: { ...user, ...scope },
            units,
            classes: { status: "ready", page: existing },
          },
        });
        expect(mocks.rows.mock.calls).toEqual(queries.rows);
        expect(mocks.count.mock.calls).toEqual(queries.count);
        mocks.rows.mockClear();
        mocks.count.mockClear();
      }
    },
  );

  it("starts the authorized class read while the independent curriculum read is still pending", async () => {
    const pending = deferred<typeof units>();
    mocks.units.mockReturnValue(pending.promise);
    const response = teaching(request());
    await vi.waitFor(() => expect(mocks.rows).toHaveBeenCalled());
    expect(mocks.session.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.rows.mock.invocationCallOrder[0]!,
    );
    expect(mocks.auth.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.units.mock.invocationCallOrder[0]!,
    );
    pending.resolve(units);
    expect((await response).status).toBe(200);
  });

  it("also starts the curriculum before the class list has completed", async () => {
    const pending = deferred<(typeof row)[]>();
    mocks.rows.mockReturnValue(pending.promise);
    const response = teaching(request());
    await vi.waitFor(() => expect(mocks.units).toHaveBeenCalled());
    pending.resolve([row]);
    expect((await response).status).toBe(200);
  });

  it("keeps a class-list failure local, without discarding the authenticated teaching screen or leaking details", async () => {
    mocks.rows.mockRejectedValue(new Error("private database connection"));
    const response = await teaching(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: { user, units, classes: { status: "error" } },
    });
  });

  it("keeps the original response and does no class read without the opt-in query", async () => {
    const response = await teaching(request("/api/studio/teaching"));
    expect(await response.json()).toEqual({ data: { user, units } });
    expect(mocks.rows).not.toHaveBeenCalled();
    expect(mocks.count).not.toHaveBeenCalled();
  });

  it.each(["anonymous", "reviewer", "development closed"])(
    "does no curriculum or class read when %s",
    async (mode) => {
      if (mode === "anonymous") mocks.session.mockResolvedValue(null);
      if (mode === "reviewer")
        mocks.auth.mockResolvedValue({
          user: { id: user.id, role: "reviewer" },
        });
      if (mode === "development closed") vi.stubEnv("NODE_ENV", "production");
      const response = await (
        mode === "development closed" ? development : teaching
      )(request());
      expect(response.status).toBe(
        mode === "anonymous" ? 401 : mode === "reviewer" ? 403 : 404,
      );
      expect(mocks.units).not.toHaveBeenCalled();
      expect(mocks.rows).not.toHaveBeenCalled();
      expect(mocks.count).not.toHaveBeenCalled();
    },
  );
});
