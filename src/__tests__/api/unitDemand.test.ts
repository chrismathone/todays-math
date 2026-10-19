import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GET } from "@/app/api/units/route";
import { db } from "@/lib/db";
import { MOCK_UNITS, USER_TEACHER_ID } from "@/mocks/data";

const session = vi.hoisted(() => vi.fn());
vi.mock("@/lib/session", () => ({ getSessionUser: session }));
beforeEach(() => {
  session.mockResolvedValue({ id: USER_TEACHER_ID });
  // The common unit delegate predates SELECT support. Mirror Prisma's requested
  // projection, while keeping the real mock predicates and catalogue ordering.
  const find = db.unit.findMany.bind(db.unit);
  vi.spyOn(db.unit, "findMany").mockImplementation((async (
    args: Parameters<typeof db.unit.findMany>[0],
  ) => {
    const rows = await find(args);
    if (!args?.select) return rows;
    const fields = Object.entries(args.select).filter(([, selected]) => selected === true).map(([name]) => name);
    return rows.map((row) => Object.fromEntries(fields.map((name) => [name, (row as unknown as Record<string, unknown>)[name]])));
  }) as typeof db.unit.findMany);
});
afterEach(() => vi.restoreAllMocks());
const request = (suffix = "") => new Request(`http://localhost/api/units${suffix}`);
const fields = ({ id, grade, chapter, section, orderIndex }: typeof MOCK_UNITS[number]) => ({ id, grade, chapter, section, orderIndex });

it("keeps the original full catalogue response bytes for existing consumers", async () => {
  const response = await GET(request());
  expect(response.status).toBe(200);
  expect(await response.text()).toBe(JSON.stringify({ data: [...MOCK_UNITS].sort((a, b) => a.orderIndex - b.orderIndex).map(fields) }));
});

it("queries only explicit visible unit IDs, deduplicates input, and preserves catalogue order", async () => {
  const read = vi.spyOn(db.unit, "findMany");
  const ids = [MOCK_UNITS[1].id, MOCK_UNITS[0].id, MOCK_UNITS[1].id];
  const response = await GET(request(`?ids=${ids.join(",")}`));
  expect(response.status).toBe(200);
  expect((await response.json()).data).toEqual(MOCK_UNITS.filter((unit) => ids.includes(unit.id)).sort((a, b) => a.orderIndex - b.orderIndex).map(fields));
  expect(read).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: [...new Set(ids)] } } }));
});

it("rejects malformed IDs before querying the catalogue", async () => {
  const read = vi.spyOn(db.unit, "findMany");
  expect((await GET(request("?ids=invalid"))).status).toBe(400);
  expect(read).not.toHaveBeenCalled();
});

it("retains authentication for the smaller labels read", async () => {
  session.mockResolvedValue(null);
  const read = vi.spyOn(db.unit, "findMany");
  expect((await GET(request(`?ids=${MOCK_UNITS[0].id}`))).status).toBe(401);
  expect(read).not.toHaveBeenCalled();
});
