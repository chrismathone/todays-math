import type { HeightMap } from "./types";

export function voxelCount(heights: HeightMap): number {
  return heights.reduce((sum, row) => sum + row.reduce((n, h) => n + h, 0), 0);
}

/** Front is row 0. Front silhouette is the max height in each column. */
export function frontHeights(heights: HeightMap): number[] {
  const width = heights[0]?.length ?? 0;
  const out = Array.from({ length: width }, () => 0);
  for (const row of heights) {
    row.forEach((h, x) => {
      out[x] = Math.max(out[x], h);
    });
  }
  return out;
}

/** Right side, front-to-back: max height in each row. */
export function rightHeights(heights: HeightMap): number[] {
  return heights.map((row) => row.reduce((n, h) => Math.max(n, h), 0));
}

export function topOccupied(heights: HeightMap): boolean[][] {
  return heights.map((row) => row.map((h) => h > 0));
}

function heightAt(heights: HeightMap, z: number, x: number): number {
  return heights[z]?.[x] ?? 0;
}

/** Cubes visible from the front (looking toward +z, row 0 is nearest). */
export function visibleFromFront(heights: HeightMap): number {
  const width = heights[0]?.length ?? 0;
  const depth = heights.length;
  let n = 0;
  for (let x = 0; x < width; x++) {
    const maxH = frontHeights(heights)[x] ?? 0;
    for (let y = 0; y < maxH; y++) {
      for (let z = 0; z < depth; z++) {
        if (heightAt(heights, z, x) > y) {
          n++;
          break;
        }
      }
    }
  }
  return n;
}

export function hiddenFromFront(heights: HeightMap): number {
  return voxelCount(heights) - visibleFromFront(heights);
}

export function heightMapsEqual(a: HeightMap, b: HeightMap): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (row, z) =>
      row.length === (b[z]?.length ?? -1) && row.every((h, x) => h === b[z][x]),
  );
}

export const STACK_BUILD_MAX = 3;

export function nudgeStackHeight(
  height: number,
  delta: number,
  max = STACK_BUILD_MAX,
): number {
  const n = Number.isFinite(height) ? height : 0;
  const next = n + delta;
  if (next < 0) return 0;
  if (next > max) return max;
  return next;
}

export const DEMO_STACK: HeightMap = [
  [1, 1, 0],
  [2, 3, 1],
  [1, 2, 1],
];
