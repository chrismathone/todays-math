// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { listConceptTargetCatalog } from "@/lib/textbook/conceptTargetCatalog";
import { resolveConceptTarget } from "@/lib/textbook/concepts";
import {
  textbookConceptTargetCatalogSchema,
  textbookConceptTargetQuerySchema,
} from "@/contracts/textbookConceptCatalog.contract";

describe("교재 개념의 명시적 연결 대상", () => {
  it("소인수분해를 기존 탐험의 정확한 카드로 찾되 확인 상태를 만들지 않는다", () => {
    const result = listConceptTargetCatalog({
      namespace: "explorer-card",
      q: "소인수분해",
    });
    const entry = result.entries.find(
      (row) =>
        row.target.namespace === "explorer-card" &&
        row.target.cardId === "factorization",
    );
    expect(entry).toMatchObject({
      title: "소인수분해",
      description: "1보다 큰 자연수를 소수들만의 곱으로 나타내는 것.",
    });
    expect(entry).not.toHaveProperty("review");
    expect(entry).not.toHaveProperty("relation");
  });

  it("페이지를 모두 읽으면 서로 다른 이름공간의 실제 정본만 중복 없이 해석된다", () => {
    const keys: string[] = [];
    let cursor: string | undefined;
    do {
      const result = textbookConceptTargetCatalogSchema.parse(
        listConceptTargetCatalog({ cursor, limit: "200" }),
      );
      for (const entry of result.entries) {
        expect(resolveConceptTarget(entry.target)).toBeDefined();
        keys.push(JSON.stringify(entry.target));
      }
      cursor = result.nextCursor ?? undefined;
    } while (cursor);
    expect(keys.length).toBeGreaterThan(200);
    expect(new Set(keys).size).toBe(keys.length);
    expect(
      listConceptTargetCatalog({ namespace: "graph-unit", limit: "200" })
        .entries,
    ).toHaveLength(100);
  });

  it("다른 이름공간과 없는 이름을 대체하지 않는다", () => {
    expect(
      listConceptTargetCatalog({ namespace: "graph-unit", q: "M1-N01" })
        .entries[0]?.target,
    ).toEqual({ namespace: "graph-unit", graphUnitId: "M1-N01" });
    expect(
      listConceptTargetCatalog({
        namespace: "course-section",
        q: "factorization",
      }).entries,
    ).toEqual([]);
    expect(
      listConceptTargetCatalog({ q: "없는개념-exact-91827" }).entries,
    ).toEqual([]);
  });

  it.each([
    { limit: "0" },
    { limit: "201" },
    { limit: "NaN" },
    { cursor: "-1" },
    { cursor: "1.5" },
    { namespace: "problem" },
    { q: "x".repeat(201) },
    { confirmed: "true" },
  ])("잘못된 검색 조건은 거부한다: %j", (input) => {
    expect(textbookConceptTargetQuerySchema.safeParse(input).success).toBe(
      false,
    );
  });
});
