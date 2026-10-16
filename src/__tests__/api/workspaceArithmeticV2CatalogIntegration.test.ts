// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), database: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({
  db: new Proxy(
    {},
    {
      get: (_target, key) => {
        mocks.database(key);
        throw new Error(
          "Arithmetic generation must not read or write the database",
        );
      },
    },
  ),
}));
vi.mock("@/lib/errorLog/record", () => ({ recordErrorLog: vi.fn() }));

import { GET } from "@/app/api/arithmetic/v2/catalog/route";
import { POST } from "@/app/api/arithmetic/v2/generate/route";
import {
  ARITHMETIC_V2_ENGINE_VERSION,
  ARITHMETIC_V2_CATALOG_VERSION,
  listArithmeticV2Types,
  reopenArithmeticV2Sheet,
} from "@/lib/arithmetic-v2";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AUTH_URL", "");
  vi.stubEnv("NEXTAUTH_URL", "");
  vi.stubEnv("ARITHMETIC_SHEET_WRITE", undefined);
  mocks.auth.mockResolvedValue({
    user: {
      id: "10000000-0000-4000-8000-000000000001",
      name: "Teacher",
      email: "teacher@example.test",
      role: "director",
      isAdmin: false,
      approvalStatus: "approved",
      menus: ["bank"],
    },
  });
});
afterEach(() => {
  expect(mocks.database).not.toHaveBeenCalled();
  vi.unstubAllEnvs();
});

describe("web generation with the actual expanded catalog", () => {
  // 98f39e8b6: at most 10 rounds (200 items each); 200 items in total here.
  it.each([
    [100, 2],
    [20, 10],
  ])(
    "generates and reopens %i x %i while saving is disabled",
    async (count, rounds) => {
      const response = await POST(
        new Request("http://localhost/api/arithmetic/v2/generate", {
          method: "POST",
          headers: {
            origin: "http://localhost",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
            catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
            seed: "two-full-rounds",
            rounds: Array.from({ length: rounds }, () => ({
              allocations: [{ typeId: "m2-polynomial-add", count }],
            })),
          }),
        }),
      );
      expect(response.status).toBe(200);
      const { data: sheet } = await response.json();
      expect(sheet.rounds).toHaveLength(rounds);
      expect(
        sheet.rounds.flatMap((round: { items: unknown[] }) => round.items),
      ).toHaveLength(200);
      expect(reopenArithmeticV2Sheet(sheet)).toEqual(sheet);
    },
  );

  it("exposes every implemented family and generates its exact readable snapshot while saving is disabled", async () => {
    const catalogResponse = await GET(
      new Request("http://localhost/api/arithmetic/v2/catalog"),
    );
    expect(catalogResponse.status).toBe(200);
    const { data: catalog } = await catalogResponse.json();
    const types = listArithmeticV2Types();
    expect(catalog.types).toEqual(types);
    expect(catalog.writerEnabled).toBe(false);
    // Respect the same total limit as a teacher request, even if the catalog grows.
    for (let start = 0; start < types.length; start += 100) {
      const batch = types.slice(start, start + 100);
      const response = await POST(
        new Request("http://localhost/api/arithmetic/v2/generate", {
          method: "POST",
          headers: {
            origin: "http://localhost",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
            catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
            seed: `actual-catalog-${start}`,
            rounds: [
              {
                allocations: batch.map((type) => ({
                  typeId: type.id,
                  count: 1,
                })),
              },
            ],
          }),
        }),
      );
      expect(response.status).toBe(200);
      const { data: sheet } = await response.json();
      expect(reopenArithmeticV2Sheet(sheet)).toEqual(sheet);
      expect(
        sheet.rounds[0].items.map((item: { typeId: string }) => item.typeId),
      ).toEqual(batch.map((type) => type.id));
    }
  });
});
