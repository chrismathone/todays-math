import { createHash } from "node:crypto";
import { expect, it, vi } from "vitest";
import {
  ARITHMETIC_MAX_ITEMS_PER_ROUND,
  ARITHMETIC_V2_ENGINE_VERSION,
  ARITHMETIC_V2_CATALOG_VERSION,
  buildArithmeticV2Sheet,
  listArithmeticV2Types,
} from "@/lib/arithmetic-v2";
import { arithmeticToStudioProblems } from "@/lib/arithmeticOutput";
import {
  installArithmeticPackReader,
  isPackName,
} from "@/lib/arithmetic-v2/presentation/packAssets";
import { readNodeArithmeticPack } from "@/lib/arithmetic-v2/presentation/packAssets.node";
import {
  arithmeticSheetPacks,
  prepareArithmeticPacks,
} from "@/lib/arithmetic-v2/presentation/preparePacks";

function makeSheets() {
  const catalog = listArithmeticV2Types();
  const limit = ARITHMETIC_MAX_ITEMS_PER_ROUND;
  return Array.from({ length: Math.ceil(catalog.length / limit) }, (_, batch) =>
    buildArithmeticV2Sheet({
      engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
      catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
      seed: "grade-arithmetic-paper-20261014",
      rounds: [
        {
          allocations: catalog
            .slice(batch * limit, (batch + 1) * limit)
            .map(({ id }) => ({
              typeId: id,
              count: 1,
            })),
        },
      ],
    }),
  );
}

function expectBaseline(sheets: ReturnType<typeof makeSheets>) {
  const problems = sheets.flatMap(arithmeticToStudioProblems);
  const projection = problems.map(
    ({
      id,
      content,
      answer,
      figureSvg,
      figureDims,
      figureSourceMm,
      arithmetic,
      source,
    }) => [
      id,
      content,
      answer,
      figureSvg,
      figureDims,
      figureSourceMm,
      arithmetic,
      source,
    ],
  );
  const digest = createHash("sha256")
    .update(JSON.stringify(projection))
    .digest("hex");
  expect(digest).toBe(
    "0f476b4a116324c070e44b1363233aca6a4c73c92df69d00c1e9ab933d9fc1e9",
  );
}

it("preserves every seeded projection after browser family preparation and reuses warm packs", async () => {
  installArithmeticPackReader(undefined);
  const fetch = vi.fn(async (url: string) => {
    const query = new URL(url, "http://localhost").searchParams;
    const pack = query.get("pack") ?? "";
    const family = query.get("family") ?? "";
    if (!isPackName(pack)) throw new Error("Unexpected pack request");
    return Response.json({
      pack,
      family,
      data: readNodeArithmeticPack(pack, family),
    });
  });
  vi.stubGlobal("fetch", fetch);
  try {
    const sheets = makeSheets();
    const packs = sheets.flatMap(arithmeticSheetPacks);
    expect(new Set(packs.map(({ pack }) => pack)).size).toBe(6);
    await Promise.all([
      prepareArithmeticPacks(packs),
      prepareArithmeticPacks(packs),
    ]);
    expect(fetch).toHaveBeenCalledTimes(
      new Set(packs.map(({ pack, family }) => `${pack}/${family}`)).size,
    );
    expectBaseline(sheets);
    fetch.mockClear();
    await prepareArithmeticPacks(packs);
    expect(fetch).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
    installArithmeticPackReader(readNodeArithmeticPack);
  }
});

it("preserves the complete seeded print projection for every catalog type", () => {
  expectBaseline(makeSheets());
});
