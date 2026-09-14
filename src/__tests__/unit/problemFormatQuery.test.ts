import { describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { findProblemIdsByFormat } from "@/lib/problem/formatQuery";
vi.mock("@/lib/db", () => ({ db: { problem: { findMany: vi.fn() } } }));
vi.mock("@/lib/problem/provenance", () => ({
  FORMAT_SUPERSET_WHERE: { short_answer: { problemType: "계산" } },
  formatWithoutContent: () => null,
  classifyFormat: ({ content }: { content: string }) =>
    content === "keep" ? "short_answer" : "unknown",
}));

describe("large derived-format corpus transport", () => {
  it("batches undecided contents below database bind limits and retains ordered IDs above that limit", async () => {
    const candidates = Array.from({ length: 66010 }, (_, i) => ({
      id: String(i),
      answer: "7",
      questionType: null,
      problemType: "계산",
      familyKey: null,
    }));
    const reads: number[] = [];
    vi.mocked(db.problem.findMany).mockImplementation((async (
      args: Parameters<typeof db.problem.findMany>[0],
    ) => {
      const ids = (args?.where?.id as { in?: string[] } | undefined)?.in;
      if (!ids) return candidates as never;
      reads.push(ids.length);
      if (ids.length > 32767) throw Error("too many bind variables");
      return ids
        .filter((id) => id !== "4")
        .map((id) => ({
          id,
          content: Number(id) % 2 === 0 ? "keep" : "drop",
        })) as never;
    }) as typeof db.problem.findMany);
    const ids = await findProblemIdsByFormat(
      "short_answer",
      { pool: "shared" },
      [{ id: "asc" }],
    );
    expect(ids).toHaveLength(33004);
    expect(ids!.slice(0, 4)).toEqual(["0", "2", "6", "8"]);
    expect(ids!.at(-1)).toBe("66008");
    expect(Math.max(...reads)).toBeLessThanOrEqual(5000);
    expect(reads.reduce((a, b) => a + b, 0)).toBe(candidates.length);
  });
});
