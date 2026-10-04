import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { MOCK_PROBLEMS, MOCK_UNITS } from "@/mocks/data";
import { GET } from "@/app/api/studio/problems/[id]/route";

const { guard } = vi.hoisted(() => ({ guard: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/studio-ai/guard", () => ({
  authorizeStudio: guard,
  STUDIO_HEADERS: { "cache-control": "no-store" },
}));
const row = {
  ...MOCK_PROBLEMS[0],
  unit: {
    grade: MOCK_UNITS[0].grade,
    chapter: MOCK_UNITS[0].chapter,
    section: MOCK_UNITS[0].section,
  },
  pool: "shared",
  directUseAllowed: true,
  familyKey: null,
  originProblemId: null,
  questionType: "단답형",
  reviewStatus: "approved",
};
const read = (id = row.id) =>
  GET(new Request(`http://localhost/api/studio/problems/${id}`), {
    params: Promise.resolve({ id }),
  });
beforeEach(() => {
  guard.mockReset();
  guard.mockResolvedValue({ user: { id: "teacher" }, response: null });
});
afterEach(() => vi.restoreAllMocks());

describe("single bank row refresh", () => {
  it("keeps the studio guard and makes no DB read after denial", async () => {
    const find = vi.spyOn(db.problem, "findFirst");
    guard.mockResolvedValue({
      response: Response.json({ error: "권한 없음" }, { status: 403 }),
    });
    expect((await read()).status).toBe(403);
    expect(find).not.toHaveBeenCalled();
  });
  it("rejects an invalid identifier before any read", async () => {
    const find = vi.spyOn(db.problem, "findFirst");
    expect((await read("not-an-id")).status).toBe(400);
    expect(find).not.toHaveBeenCalled();
  });
  it.each([true, false])(
    "returns server-derived eligibility when direct use is %s",
    async (directUseAllowed) => {
      const find = vi
        .spyOn(db.problem, "findFirst")
        .mockResolvedValue({ ...row, directUseAllowed } as never);
      const response = await read();
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      const body = await response.json();
      expect(body.data.eligible).toBe(directUseAllowed);
      expect(body.data.ineligibleReason).toBe(
        directUseAllowed ? null : "출제가 잠긴 문항입니다.",
      );
      expect(find.mock.calls[0][0]?.where).toEqual({
        AND: [{ id: row.id }, { pool: "shared" }],
      });
    },
  );
  it("does not return a missing or invisible row", async () => {
    vi.spyOn(db.problem, "findFirst").mockResolvedValue(null);
    expect((await read()).status).toBe(404);
  });
});
