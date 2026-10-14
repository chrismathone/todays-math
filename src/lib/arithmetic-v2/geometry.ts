import { inflateSync, strFromU8 } from "fflate";
import assets from "./families/geometry-angle-assets-v1.json";
import { figureSvgAngleDrillWidthMm } from "@/lib/figure/figureSvgFrame";
import { EXTRA_GEOMETRY_FIGURE_MAPS } from "./extraGeometry";
import {
  createArithmeticGeometryPackStore,
  type ArithmeticGeometrySubsetSnapshot,
} from "./geometryPack";
import type { ArithmeticV2Prompt } from "./types";

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

export function isArithmeticAngleSnapshot(value: {
  version: number;
  svgPack: string;
}): boolean {
  return value.version === 1 && value.svgPack === assets.svgPack;
}

let decoded: Readonly<Record<string, string>> | undefined;
/** Equality is checked BEFORE inflate: arbitrary compressed SVG is never accepted.
 * The self-contained saved pack includes the actual SVG, not a URL or a seed.
 * Decoding is lossless, cached and has no geometry renderer / network dependency.
 */
export function arithmeticAngleSvg(
  id: string,
  snapshot: { version: number; svgPack: string },
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

export type ArithmeticGeometrySnapshot =
  ArithmeticAngleSnapshot | ArithmeticGeometrySubsetSnapshot;

export const arithmeticGeometryAssetIds = new Set([
  ...arithmeticAngleAssetIds,
  ...EXTRA_GEOMETRY_FIGURE_MAPS.flatMap((map) => Object.keys(map)),
]);

export function arithmeticGeometryCatalogSvg(id: string): string {
  if (arithmeticAngleAssetIds.has(id))
    return arithmeticAngleSvg(id, arithmeticAngleSnapshot);
  for (const map of EXTRA_GEOMETRY_FIGURE_MAPS)
    if (Object.hasOwn(map, id)) return map[id];
  throw new Error("등록되지 않은 연산 도형입니다");
}

const geometryPacks = createArithmeticGeometryPackStore((id) =>
  arithmeticGeometryAssetIds.has(id)
    ? arithmeticGeometryCatalogSvg(id)
    : undefined,
);
export const isArithmeticGeometrySubsetSnapshot = geometryPacks.valid;

export function arithmeticGeometrySnapshotForPrompts(
  prompts: readonly ArithmeticV2Prompt[],
): ArithmeticGeometrySnapshot | undefined {
  const ids = prompts.flatMap((prompt) =>
    prompt.layout === "math" && prompt.figureId ? [prompt.figureId] : [],
  );
  if (!ids.length) return undefined;
  // Preserve the original frozen snapshot and its exact bytes for old sheets.
  return ids.every((id) => arithmeticAngleAssetIds.has(id))
    ? arithmeticAngleSnapshot
    : geometryPacks.create(ids);
}

export function arithmeticGeometrySvg(
  id: string,
  snapshot: ArithmeticGeometrySnapshot,
): string {
  return snapshot.version === 1
    ? arithmeticAngleSvg(id, snapshot)
    : geometryPacks.read(id, snapshot);
}

export function arithmeticGeometrySnapshotContains(
  snapshot: ArithmeticGeometrySnapshot,
  id: string,
): boolean {
  return snapshot.version === 1
    ? arithmeticAngleAssetIds.has(id)
    : snapshot.ids.includes(id);
}

export function arithmeticGeometryAnswerUnit(
  prompt: ArithmeticV2Prompt,
): string {
  if (prompt.layout !== "math") return "";
  return (
    prompt.answerUnit ??
    (prompt.figureId && arithmeticAngleAssetIds.has(prompt.figureId) ? "°" : "")
  );
}

/** New geometry families may put givens in prose as well as in the diagram.
 * The initial angle figures already contain every given and retain their form.
 */
export function arithmeticGeometryPromptLines(
  prompt: ArithmeticV2Prompt,
): string[] {
  if (prompt.layout !== "math" || !prompt.figureId) return [];
  return [
    ...new Set(
      [
        arithmeticAngleAssetIds.has(prompt.figureId) ? "" : prompt.text,
        prompt.instruction ?? "",
      ].filter(Boolean),
    ),
  ];
}
