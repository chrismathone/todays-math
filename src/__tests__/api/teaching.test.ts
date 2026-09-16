import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/dev/unified/teaching/route";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { MOCK_UNITS } from "@/mocks/data";

vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { unit: { findMany: vi.fn() } } }));

const units = MOCK_UNITS.map(({ id, grade, chapter, section, orderIndex }) => ({
  id,
  grade,
  chapter,
  section,
  orderIndex,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "development");
  vi.mocked(getSessionUser).mockResolvedValue(null);
  vi.mocked(db.unit.findMany).mockResolvedValue(
    units as Awaited<ReturnType<typeof db.unit.findMany>>,
  );
});
afterEach(() => vi.unstubAllEnvs());

describe("teaching bootstrap boundary", () => {
  it("returns 404 in production before checking sessions or querying data", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = await GET();
    expect(response.status).toBe(404);
    expect(getSessionUser).not.toHaveBeenCalled();
    expect(db.unit.findMany).not.toHaveBeenCalled();
  });

  it("returns 401 to anonymous users without reading data", async () => {
    const response = await GET();
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(db.unit.findMany).not.toHaveBeenCalled();
  });

  it("returns the verified session identity and explicit curriculum fields only", async () => {
    const user = {
      id: "owner-id",
      email: "teacher@example.com",
      name: "선생님",
      isAdmin: false,
    };
    vi.mocked(getSessionUser).mockResolvedValue(user);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: { user, units },
    });
    expect(db.unit.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        grade: true,
        chapter: true,
        section: true,
        orderIndex: true,
      },
      orderBy: { orderIndex: "asc" },
    });
    expect(vi.mocked(getSessionUser).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(db.unit.findMany).mock.invocationCallOrder[0]!,
    );
  });

  it("returns a retryable error without leaking database details", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "owner-id",
      email: "",
      name: "",
      isAdmin: false,
    });
    vi.mocked(db.unit.findMany).mockRejectedValue(
      new Error("private database details"),
    );
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private database details");
  });
});
