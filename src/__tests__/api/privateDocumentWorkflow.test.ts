// Database boundary is mocked; no shared database reads or writes.
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  authorize: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    $queryRaw: mocks.query,
    workspaceDocument: { findMany: mocks.findMany, count: mocks.count },
  },
}));
vi.mock("@/lib/privateWorkspace", () => ({
  authorizePrivate: mocks.authorize,
  documentDto: (item: unknown) => item,
  documentSummarySelect: { id: true, userId: true, kind: true, revision: true },
  privateHeaders: { "Cache-Control": "private, no-store" },
  readableDocumentWhere: () => ({
    OR: [{ userId: "owner-a" }, { sharedBranchId: "branch-a" }],
  }),
  privateDocumentKinds: () => [
    "draft",
    "extraction",
    "conceptBlank",
    "arithmeticSheet",
  ],
  privateError: (_: string, status: number) => new Response(null, { status }),
}));
import {
  listDocumentWorkflows,
  workflowDocumentKey,
} from "@/lib/privateDocumentWorkflow";
import { listDocuments } from "@/lib/privateDocumentList";
const mine = {
  userId: "10000000-0000-4000-8000-000000000001",
  id: "same-id",
  kind: "draft",
  revision: 2,
};
const shared = {
  ...mine,
  userId: "20000000-0000-4000-8000-000000000002",
  kind: "extraction",
  revision: 5,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.query.mockResolvedValue([]);
  mocks.authorize.mockResolvedValue({
    account: { id: mine.userId },
    ownerId: mine.userId,
  });
  mocks.findMany.mockResolvedValue([mine, shared]);
  mocks.count.mockResolvedValue(2);
});

describe("bounded authorized workflow projection", () => {
  it("projects only bounded JSON scalars for already authorized owner/id/revision tuples", async () => {
    mocks.query.mockResolvedValue([
      { ...mine, metadata: { workflow: { source: "bank", step: "review" } } },
      { ...shared, metadata: { data: { step: "crop" } } },
      {
        ...mine,
        userId: "unauthorized",
        metadata: { workflow: { source: "bank", step: "output" } },
      },
      {
        ...mine,
        revision: 99,
        metadata: { workflow: { source: "bank", step: "output" } },
      },
    ]);
    const result = await listDocumentWorkflows([mine, shared]);
    expect(result.size).toBe(2);
    expect(result.get(workflowDocumentKey(mine))).toEqual({
      source: "bank",
      step: "review",
    });
    expect(result.get(workflowDocumentKey(shared))).toEqual({
      source: "extraction",
      step: "crop",
    });
    const sql = mocks.query.mock.calls[0][0];
    expect(sql.values).toEqual([
      mine.userId,
      mine.id,
      mine.revision,
      shared.userId,
      shared.id,
      shared.revision,
    ]);
    expect(sql.text).toContain("FROM workspace_document");
    expect(sql.text).toContain("left(payload #>> '{workflow,step}', 16)");
    expect(sql.text).toContain(
      "left(payload #>> '{workflow,sourceDocumentId}', 101)",
    );
    expect(sql.text).not.toMatch(
      /SELECT\s+\*|SELECT\s+payload|workspace_asset|UPDATE|INSERT|DELETE/i,
    );
  });
  it("does not query for empty/unsupported lists and rejects unbounded input", async () => {
    expect((await listDocumentWorkflows([])).size).toBe(0);
    expect(
      (await listDocumentWorkflows([{ ...mine, kind: "conceptBlank" }])).size,
    ).toBe(0);
    await expect(
      listDocumentWorkflows(Array.from({ length: 101 }, () => mine)),
    ).rejects.toThrow("bounded");
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it("leaves malformed and legacy metadata unknown", async () => {
    mocks.query.mockResolvedValue([
      {
        ...mine,
        metadata: { workflow: { source: "bank", step: "completed" } },
      },
    ]);
    expect((await listDocumentWorkflows([mine])).size).toBe(0);
  });
  it("preserves authorization denial before either list or projection reads", async () => {
    mocks.authorize.mockResolvedValue({
      response: new Response(null, { status: 403 }),
    });
    expect(
      (
        await listDocuments(
          new Request("https://example.test/api/library/documents"),
        )
      ).status,
    ).toBe(403);
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it("adds optional progress to the list without selecting payloads or expanding its page", async () => {
    mocks.query.mockResolvedValue([
      { ...shared, metadata: { data: { step: "review" } } },
    ]);
    const response = await listDocuments(
      new Request(
        "https://example.test/api/library/documents?page=2&pageSize=20",
      ),
    );
    const body = await response.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0]).not.toHaveProperty("workflow");
    expect(body.data[1].workflow).toEqual({
      source: "extraction",
      step: "review",
    });
    expect(mocks.findMany.mock.calls[0][0]).toMatchObject({
      skip: 20,
      take: 20,
    });
    expect(mocks.findMany.mock.calls[0][0].select).not.toHaveProperty(
      "payload",
    );
    expect(mocks.query.mock.calls[0][0].values).toEqual([
      mine.userId,
      mine.id,
      2,
      shared.userId,
      shared.id,
      5,
    ]);
  });
  // 2026-10-16 외부 검토 P3 — 목록이 연산 쓰기 문의 상태를 같이 보내야 화면이 변경 단추를 미리 잠근다.
  it.each([
    ["on", true],
    ["off", false],
    [undefined, false],
  ])(
    "reports the arithmetic write gate (%s) in the list meta",
    async (gate, enabled) => {
      vi.stubEnv("ARITHMETIC_SHEET_WRITE", gate);
      try {
        const response = await listDocuments(
          new Request("https://example.test/api/library/documents"),
        );
        expect((await response.json()).meta).toMatchObject({
          total: 2,
          arithmeticWriteEnabled: enabled,
        });
      } finally {
        vi.unstubAllEnvs();
      }
    },
  );
});
