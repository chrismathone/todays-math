// Database boundary is mocked; no shared database reads or writes.
/** 내 시험지 목록의 태그(W8) — 허락한 행의 짧은 글 하나만, 시험지 · 연산 연습지만, 모르는 값은 «태그 없음». */
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const query = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ db: { $queryRaw: query } }));
import { listDocumentTags } from "@/lib/privateDocumentTags";
import { workflowDocumentKey } from "@/lib/privateDocumentWorkflow";

const draft = {
  userId: "10000000-0000-4000-8000-000000000001",
  id: "d1",
  kind: "draft",
  revision: 2,
};
const sheet = { ...draft, id: "a1", kind: "arithmeticSheet", revision: 4 };
beforeEach(() => query.mockReset());

describe("bounded tag projection", () => {
  it("reads only authorized owner/id/revision tuples and validates the value", async () => {
    query.mockResolvedValue([
      { ...draft, tag: "일일TEST" },
      { ...sheet, tag: "숙제" },
      { ...draft, revision: 9, tag: "오답" },
      { ...draft, userId: "someone-else", tag: "오답" },
      { ...draft, id: "d2", tag: "기말" },
    ]);
    const tags = await listDocumentTags([draft, sheet, { ...draft, id: "d2" }]);
    expect([...tags]).toEqual([
      [workflowDocumentKey(draft), "일일TEST"],
      [workflowDocumentKey(sheet), "숙제"],
    ]);
    const sql = query.mock.calls[0][0];
    expect(sql.text).toContain("left(payload #>> '{tag}', 16)");
    expect(sql.text).toContain("left(payload #>> '{presentation,tag}', 16)");
    expect(sql.text).not.toMatch(
      /SELECT\s+\*|SELECT\s+payload\b|workspace_asset|UPDATE|INSERT|DELETE/i,
    );
  });

  it("does not query for kinds without tags and rejects unbounded input", async () => {
    expect(
      (await listDocumentTags([{ ...draft, kind: "extraction" }])).size,
    ).toBe(0);
    expect(
      (await listDocumentTags([{ ...draft, kind: "conceptBlank" }])).size,
    ).toBe(0);
    await expect(
      listDocumentTags(Array.from({ length: 101 }, () => draft)),
    ).rejects.toThrow("bounded");
    expect(query).not.toHaveBeenCalled();
  });
});
