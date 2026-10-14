import type { PrintOptions } from "./types";

export interface PackedPage {
  indices: number[];
  splitIndex: number;
  scales: number[];
}
/** Mathgen's measured, column-major packing, with bounded oversized cards in every mode. */
export function packMeasured(
  heights: number[],
  avail: { first: number; cont: number },
  options: Pick<
    PrintOptions,
    "template" | "columns" | "layoutMode" | "problemsPerColumn" | "spacing"
  >,
  /** Explicit sheet boundaries (arithmetic rounds); each gets first-page header space. */
  sectionStarts: number[] = [],
): PackedPage[] {
  if (sectionStarts.length) {
    const boundaries = [
      0,
      ...[...new Set(sectionStarts)]
        .filter((index) => index > 0 && index < heights.length)
        .sort((a, b) => a - b),
      heights.length,
    ];
    return boundaries
      .slice(0, -1)
      .flatMap((start, index) =>
        packMeasured(
          heights.slice(start, boundaries[index + 1]),
          avail,
          options,
        ).map((page) => ({
          ...page,
          indices: page.indices.map((item) => item + start),
        })),
      );
  }
  const pages: PackedPage[] = [];
  let start = 0;
  const stretch =
    options.columns === 1 && ["workbook", "jaseup"].includes(options.template);
  const countMode = options.layoutMode === "count" || stretch;
  const maxRows =
    options.layoutMode === "count" ? options.problemsPerColumn : 4;
  while (start < heights.length) {
    const available = Math.max(
      1,
      (pages.length ? avail.cont : avail.first) - 12,
    );
    const page: PackedPage = { indices: [], splitIndex: 0, scales: [] };
    if (countMode) {
      let rows = 1;
      const limit = Math.min(
        maxRows,
        Math.ceil((heights.length - start) / options.columns),
      );
      const gap = options.layoutMode === "count" ? 12 : options.spacing;
      for (let candidate = 2; candidate <= limit; candidate++) {
        const slot = (available - (candidate - 1) * gap) / candidate;
        if (
          heights
            .slice(start, start + candidate * options.columns)
            .some((h) => h > slot)
        )
          break;
        rows = candidate;
      }
      const count = Math.min(rows * options.columns, heights.length - start);
      const slot = Math.max(1, (available - (rows - 1) * gap) / rows);
      for (let j = 0; j < count; j++) {
        page.indices.push(start + j);
        page.scales.push(Math.min(1, slot / Math.max(1, heights[start + j])));
      }
      page.splitIndex = Math.min(rows, count);
      start += count;
    } else {
      for (let column = 0; column < options.columns; column++) {
        let used = 0;
        let count = 0;
        while (start < heights.length) {
          const h = Math.max(1, heights[start]);
          const gap = count ? options.spacing : 0;
          if (count && used + gap + h > available) break;
          const scale = Math.min(1, available / h);
          page.indices.push(start++);
          page.scales.push(scale);
          used += gap + h * scale;
          count++;
        }
        if (column === 0) page.splitIndex = page.indices.length;
      }
    }
    pages.push(page);
  }
  return pages;
}
