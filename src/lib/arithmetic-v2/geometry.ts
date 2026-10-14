import { inflateSync, strFromU8 } from "fflate";
import assets from "./families/geometry-angle-assets-v1.json";
import { figureSvgAngleDrillWidthMm } from "@/lib/figure/figureSvgFrame";

/** Frozen, engine-rendered assets. Never change v1 after snapshots are released. */
export const arithmeticAngleAssets = assets.entries;
export const arithmeticAngleAssetIds = new Set(
  assets.entries.map((entry) => entry.id),
);
export const arithmeticAngleSnapshot = Object.freeze({
  version: 1 as const,
  svgPack: assets.svgPack,
});
export type ArithmeticAngleSnapshot = typeof arithmeticAngleSnapshot;

export function isArithmeticAngleSnapshot(
  value: ArithmeticAngleSnapshot,
): boolean {
  return value.version === 1 && value.svgPack === assets.svgPack;
}

let decoded: Readonly<Record<string, string>> | undefined;
/** Equality is checked BEFORE inflate: arbitrary compressed SVG is never accepted.
 * The self-contained saved pack includes the actual SVG, not a URL or a seed.
 * Decoding is lossless, cached and has no geometry renderer / network dependency.
 */
export function arithmeticAngleSvg(
  id: string,
  snapshot: ArithmeticAngleSnapshot,
): string {
  if (!arithmeticAngleAssetIds.has(id) || !isArithmeticAngleSnapshot(snapshot))
    throw new Error("저장된 각도 도형을 확인할 수 없습니다");
  if (!decoded) {
    const bytes = Uint8Array.from(atob(snapshot.svgPack), (char) =>
      char.charCodeAt(0),
    );
    decoded = Object.freeze(
      JSON.parse(strFromU8(inflateSync(bytes))) as Record<string, string>,
    );
  }
  return decoded[id];
}

/** Match the legibility-tested square by its LONGEST extent; no stretching. */
export function arithmeticAngleWidthMm(svg: string): number {
  const width = figureSvgAngleDrillWidthMm(svg);
  if (width === null) throw new Error("각도 도형의 출력 크기가 없습니다");
  return width;
}
