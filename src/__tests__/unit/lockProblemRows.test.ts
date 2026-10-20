import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { lockProblemRows } from "@/lib/problem/lockRows";

describe("lockProblemRows", () => {
  it("casts every id to uuid — problem.id is uuid and text params fail (2026-10-20 save 500)", async () => {
    const queryRaw = vi.fn().mockResolvedValue([]);
    await lockProblemRows(
      { $queryRaw: queryRaw } as unknown as Prisma.TransactionClient,
      ["b", "a", "b"],
    );
    const sql = queryRaw.mock.calls[0][0] as Prisma.Sql;
    expect(sql.sql).toBe(
      "SELECT id FROM public.problem WHERE id IN (?::uuid,?::uuid) ORDER BY id FOR SHARE",
    );
    expect(sql.values).toEqual(["a", "b"]);
  });
});
