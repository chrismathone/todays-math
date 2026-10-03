// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_path: string, handler: unknown) => handler,
}));
const gate = vi.hoisted(() => ({ allowed: true }));
vi.mock("@/lib/textbook/server/authorize", () => ({
  textbookHeaders: { "Cache-Control": "private, no-store" },
  authorizeTextbook: async () =>
    gate.allowed
      ? {
          actor: {
            id: "11111111-1111-4111-8111-111111111111",
            name: "교사",
            branchId: null,
          },
          response: null,
        }
      : {
          actor: null,
          response: Response.json(
            { error: { code: "FORBIDDEN" } },
            { status: 403 },
          ),
        },
}));
vi.mock("@/lib/textbook/server/prismaSql", () => ({ textbookDb: null }));
import { GET } from "@/app/api/textbook/concepts/targets/route";
import { textbookConceptTargetCatalogSchema } from "@/contracts/textbookConceptCatalog.contract";
const request = (query: string) =>
  new Request(`https://today.test/api/textbook/concepts/targets?${query}`);

describe("교재 연결 대상 검색 경로", () => {
  beforeEach(() => {
    gate.allowed = true;
  });
  it("인증 관문을 통과한 교사에게 엄격한 계약과 no-store로 실제 대상을 반환한다", async () => {
    const response = await GET(
      request("namespace=explorer-card&q=factorization"),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const result = textbookConceptTargetCatalogSchema.parse(
      (await response.json()).data,
    );
    expect(
      result.entries.some(
        (row) =>
          row.target.namespace === "explorer-card" &&
          row.target.cardId === "factorization",
      ),
    ).toBe(true);
  });
  it("관문 거절을 검색보다 먼저 적용한다", async () => {
    gate.allowed = false;
    const response = await GET(request("namespace=unknown"));
    expect(response.status).toBe(403);
    expect(await response.json()).not.toHaveProperty("data");
  });
  it.each([
    "namespace=unknown",
    "limit=201",
    "cursor=-1",
    "q=a&q=b",
    "confirmed=true",
  ])("잘못된 필터를 무시하지 않고 400으로 반환한다: %s", async (query) => {
    expect((await GET(request(query))).status).toBe(400);
  });
});
