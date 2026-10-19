import { describe, expect, it } from "vitest";
import { previewFetch } from "@/app/dev/workspace-alignment/previewData";
import {
  ARITHMETIC_CATALOG_VERSION,
  ARITHMETIC_ENGINE_VERSION,
} from "@/contracts/arithmetic.contract";
import {
  ARITHMETIC_V2_CATALOG_VERSION,
  ARITHMETIC_V2_ENGINE_VERSION,
} from "@/contracts/arithmeticV2.contract";

const fixtures = [
  {
    name: "basic",
    path: "/api/arithmetic",
    engineVersion: ARITHMETIC_ENGINE_VERSION,
    catalogVersion: ARITHMETIC_CATALOG_VERSION,
    round: {
      skills: [
        {
          skillId: "times-table",
          constraints: { dans: [3], multiplier: { min: 1, max: 9 } },
          count: 3,
        },
      ],
    },
  },
  {
    name: "grade",
    path: "/api/arithmetic/v2",
    engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
    catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
    round: { allocations: [{ typeId: "m1-fd-reflect-origin-y", count: 10 }] },
  },
];
const get = (path: string) => previewFetch(new URL(path, "http://localhost"));
const post = (path: string, body: unknown) =>
  previewFetch(new URL(path, "http://localhost"), {
    method: "POST",
    body: JSON.stringify(body),
  });

describe.each(fixtures)("$name workspace arithmetic preview", (fixture) => {
  it("uses current catalogs and deterministic generation/regeneration without enabling storage", async () => {
    const catalog = await get(`${fixture.path}/catalog`);
    expect(catalog.status).toBe(200);
    expect((await catalog.json()).data).toMatchObject({
      engineVersion: fixture.engineVersion,
      catalogVersion: fixture.catalogVersion,
      writerEnabled: false,
    });
    const response = await post(`${fixture.path}/generate`, {
      engineVersion: fixture.engineVersion,
      catalogVersion: fixture.catalogVersion,
      seed: "preview-original",
      rounds: [fixture.round],
    });
    expect(response.status).toBe(200);
    const { data: sheet } = await response.json();
    const regenerated = await post(`${fixture.path}/regenerate`, {
      sheet,
      target: { round: 1, orders: [1] },
      seed: "preview-replacement",
    });
    expect(regenerated.status).toBe(200);
    const { data: result } = await regenerated.json();
    expect(result.sheet.rounds[0].items.slice(1)).toEqual(
      sheet.rounds[0].items.slice(1),
    );
    expect([...result.changedOrders, ...result.unchangedOrders]).toEqual([1]);
    expect(
      (await post("/api/library/documents", { payload: sheet })).status,
    ).toBe(403);
  });

  it("still rejects invalid generation and regeneration requests", async () => {
    expect((await post(`${fixture.path}/generate`, {})).status).toBe(400);
    expect((await post(`${fixture.path}/regenerate`, {})).status).toBe(400);
  });
});
