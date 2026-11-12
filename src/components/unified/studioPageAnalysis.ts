import type { StudioAutoOut } from "./studioPageOrder";

/** RGBA pixel proportion after compositing onto white; invalid rasters are unknown. */
export function measurePageInk(data: Uint8ClampedArray): number {
  if (!data.length || data.length % 4 !== 0) return NaN;
  let ink = 0;
  for (let i = 0; i < data.length; i += 4) {
    const opacity = data[i + 3] / 255;
    const darkestChannel = Math.min(data[i], data[i + 1], data[i + 2]);
    const onWhite = 255 - (255 - darkestChannel) * opacity;
    // Preserve even a single faint/colored pixel; raster noise keeps a page too.
    if (onWhite < 255) ink += 1;
  }
  return ink / (data.length / 4);
}

/** A white thumbnail is only a candidate; confirmation must also be ink-free. */
export function analyzeStudioPage({
  inkRatio,
  confirmedInkRatio,
}: {
  inkRatio: number;
  confirmedInkRatio?: number;
}): StudioAutoOut | undefined {
  return inkRatio === 0 && confirmedInkRatio === 0 ? "빈 쪽" : undefined;
}
