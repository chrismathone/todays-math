import type { PrintOptions } from "./types";

export interface PackedPage {
  indices: number[];
  splitIndex: number;
  scales: number[];
  /** Equal trailing work space per question in each column, including its last. */
  whitespace?: number[];
}
/** Mathgen's measured, column-major packing, with bounded oversized cards in every mode. */
export function packMeasured(
  heights: number[],
  avail: { first: number; cont: number },
  options: Pick<
    PrintOptions,
    | "template"
    | "columns"
    | "layoutMode"
    | "problemsPerColumn"
    | "spacing"
    | "smartSpacing"
  >,
  /** Explicit sheet boundaries (arithmetic rounds); each gets first-page header space. */
  sectionStarts: number[] = [],
  /** Answer keys keep natural fixed gaps and their historical pagination. */
  questionWhitespace = true,
): PackedPage[] {
  if (sectionStarts.length) {
    const boundaries = [
      0,
      ...[...new Set(sectionStarts)]
        .filter((index) => index > 0 && index < heights.length)
        .sort((a, b) => a - b),
      heights.length,
    ];
    return boundaries.slice(0, -1).flatMap((start, index) =>
      packMeasured(
        heights.slice(start, boundaries[index + 1]),
        avail,
        options,
        [],
        questionWhitespace,
      ).map((page) => ({
        ...page,
        indices: page.indices.map((item) => item + start),
      })),
    );
  }
  const pages: PackedPage[] = [];
  let start = 0;
  const countMode = options.layoutMode === "count";
  const gap = questionWhitespace && options.smartSpacing ? 16 : options.spacing;
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
          const before = questionWhitespace ? 0 : count ? gap : 0;
          const after = questionWhitespace ? gap : 0;
          if (count && used + before + h + after > available) break;
          const scale = Math.min(1, Math.max(1, available - after) / h);
          page.indices.push(start++);
          page.scales.push(scale);
          used += before + after + h * scale;
          count++;
        }
        if (column === 0) page.splitIndex = page.indices.length;
      }
    }
    pages.push(page);
  }
  const result =
    questionWhitespace && !countMode && options.smartSpacing
      ? balanceMeasured(heights, avail, options.columns, pages, gap)
      : pages;
  if (questionWhitespace && !countMode)
    for (const [index, page] of result.entries()) {
      const available = Math.max(1, (index ? avail.cont : avail.first) - 12);
      page.whitespace = [];
      for (const [from, to] of [
        [0, page.splitIndex],
        [page.splitIndex, page.indices.length],
      ]) {
        if (from === to) continue;
        const used = page.indices
          .slice(from, to)
          .reduce(
            (sum, item, i) =>
              sum + Math.max(1, heights[item]) * page.scales[from + i],
            0,
          );
        const share = Math.max(
          0,
          Math.min(Math.max(gap, 120), (available - used) / (to - from)),
        );
        page.whitespace.push(...Array<number>(to - from).fill(share));
      }
    }
  return result;
}

/** Fixed minimum page count first; minimize item-weighted squared deviation of
 * uncapped trailing space from the sheet-wide mean. Ordered contiguous segments,
 * O(columns * items * feasible segment length), deterministic earliest-cut ties.
 * The render cap is deliberately separate: sparse tails must not gain half a page.
 */
function balanceMeasured(
  heights: number[],
  avail: { first: number; cont: number },
  columns: number,
  greedy: PackedPage[],
  gap: number,
): PackedPage[] {
  const n = heights.length;
  if (!n) return greedy;
  const slots = Math.min(n, greedy.length * columns);
  const capacity = (slot: number) =>
    Math.max(1, (slot < columns ? avail.first : avail.cont) - 12);
  const totalCapacity = Array.from({ length: slots }, (_, i) =>
    capacity(i),
  ).reduce((a, b) => a + b, 0);
  // Oversized questions are bounded independently in each candidate column.
  const totalHeight = heights.reduce(
    (sum, h) =>
      sum + Math.min(Math.max(1, h), Math.max(1, capacity(columns) - gap)),
    0,
  );
  const target = (totalCapacity - totalHeight) / n;
  let previous = new Float64Array(n + 1).fill(Infinity);
  previous[0] = 0;
  const parents: Int32Array[] = [];
  for (let slot = 0; slot < slots; slot++) {
    const cap = capacity(slot);
    const next = new Float64Array(n + 1).fill(Infinity);
    const parent = new Int32Array(n + 1).fill(-1);
    for (let start = slot; start < n; start++) {
      if (!Number.isFinite(previous[start])) continue;
      let sum = 0;
      for (let end = start + 1; end <= n - (slots - slot - 1); end++) {
        const count = end - start;
        sum += Math.max(1, heights[end - 1]);
        if (count === 1) sum = Math.min(sum, Math.max(1, cap - gap));
        if (count > 1 && sum + count * gap > cap) break;
        const share = (cap - sum) / count;
        const score = previous[start] + count * (share - target) ** 2;
        if (score < next[end]) {
          next[end] = score;
          parent[end] = start;
        }
      }
    }
    parents.push(parent);
    previous = next;
  }
  if (!Number.isFinite(previous[n])) return greedy;
  const cuts = [n];
  for (let slot = slots - 1; slot >= 0; slot--)
    cuts.push(parents[slot][cuts.at(-1)!]);
  cuts.reverse();
  const result: PackedPage[] = [];
  for (let slot = 0; slot < slots; slot++) {
    if (slot % columns === 0)
      result.push({ indices: [], splitIndex: 0, scales: [] });
    const page = result.at(-1)!;
    for (let i = cuts[slot]; i < cuts[slot + 1]; i++) {
      page.indices.push(i);
      page.scales.push(
        Math.min(
          1,
          Math.max(1, capacity(slot) - gap) / Math.max(1, heights[i]),
        ),
      );
    }
    if (slot % columns === 0) page.splitIndex = page.indices.length;
  }
  return result;
}
