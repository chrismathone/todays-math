import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ remove: vi.fn(), owned: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: { student: { delete: mocks.remove }, class: { delete: mocks.remove } },
}));
vi.mock("@/lib/session", () => ({
  getSessionUser: async () => ({ id: "teacher", isAdmin: true }),
}));
vi.mock("@/lib/ownerScope", () => ({ canManageRoster: () => true }));
vi.mock("@/lib/ownership", () => ({
  requireOwnedStudent: mocks.owned,
  requireOwnedClass: mocks.owned,
}));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_path: string, handler: unknown) => handler,
}));
import { DELETE as deleteStudent } from "@/app/api/students/[id]/route";
import { DELETE as deleteClass } from "@/app/api/classes/[id]/route";

const id = "30000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.owned.mockResolvedValue({ ok: true });
});
for (const [name, handler] of [
  ["students", deleteStudent],
  ["classes", deleteClass],
] as const) {
  it(`${name}: retained learning history returns 409 without deleting related records`, async () => {
    mocks.remove.mockRejectedValue({ code: "P2003" });
    const response = await handler(
      new NextRequest(`http://localhost/api/${name}/${id}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("RECORDS_RETAINED");
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith({ where: { id } });
  });
  it(`${name}: unexpected database errors still reach error logging`, async () => {
    const error = new Error("database unavailable");
    mocks.remove.mockRejectedValue(error);
    await expect(
      handler(
        new NextRequest(`http://localhost/api/${name}/${id}`, {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id }) },
      ),
    ).rejects.toBe(error);
  });
  it(`${name}: PostgreSQL RESTRICT also preserves history with a clear 409`, async () => {
    mocks.remove.mockRejectedValue(
      new Prisma.PrismaClientUnknownRequestError(
        'PostgresError { code: "23001", message: "update or delete violates RESTRICT setting of foreign key constraint" }',
        { clientVersion: "6.19.3" },
      ),
    );
    const response = await handler(
      new NextRequest(`http://localhost/api/${name}/${id}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(409);
  });
}
