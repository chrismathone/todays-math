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

function projectionDigest(sheets: ReturnType<typeof makeSheets>) {
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
  return createHash("sha256").update(JSON.stringify(projection)).digest("hex");
}

it("prepares in the browser exactly the seeded projection the Node reader prints, and reuses warm packs", async () => {
  // 전환 시점(c065d613d)의 737유형 해시 0f476b4a… 와 같았다 — 보고서 p1b-arithmetic.md.
  // 엔진을 고치면 출력은 바뀐다; 여기서는 두 경로가 서로 같은지만 본다.
  const node = projectionDigest(makeSheets());
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
    expect(projectionDigest(sheets)).toBe(node);
    fetch.mockClear();
    await prepareArithmeticPacks(packs);
    expect(fetch).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
    installArithmeticPackReader(readNodeArithmeticPack);
  }
});
