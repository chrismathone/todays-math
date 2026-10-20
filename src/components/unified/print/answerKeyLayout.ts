/** H2 geometry decisions consume measured DOM sizes, never source-string length. */
export const ANSWER_SPANS = [1, 2, 3, 5] as const;
export type AnswerSpan = (typeof ANSWER_SPANS)[number];
export interface AnswerMetrics {
  naturalHeight: number;
  lineHeight: number;
  candidates: {
    span: AnswerSpan;
    height: number;
    answerHeight: number;
    overflow: boolean;
  }[];
}
export interface AnswerKeyRow {
  cells: { index: number; span: AnswerSpan }[];
  height: number;
}
export interface AnswerPageLayout {
  keyRows: AnswerKeyRow[];
  solutionIndices: number[];
  /** Scales apply only to legacy-compatible, individually oversized solutions. */
  scales: number[];
  splitIndex: number;
  indices: number[];
  groupStart: number;
}
export function answerSpan(metrics: AnswerMetrics): AnswerSpan {
  const one = metrics.candidates.find((candidate) => candidate.span === 1);
  const long =
    !one || one.overflow || one.answerHeight > metrics.naturalHeight + 1;
  const fit = metrics.candidates.find(
    (candidate) =>
      (!long || candidate.span >= 2) &&
      !candidate.overflow &&
      candidate.answerHeight <= metrics.naturalHeight + metrics.lineHeight + 1,
  );
  if (fit) return fit.span;
  // Keep very long prose complete at full width, even when it needs >2 lines.
  const full = metrics.candidates.find((candidate) => candidate.span === 5);
  if (full && !full.overflow) return 5;
  throw new Error(
    "정답의 수식이 지면 너비보다 깁니다. 정답의 줄 구성을 확인해 주세요.",
  );
}
export function packAnswerRows(
  metrics: AnswerMetrics[],
  startIndex = 0,
): AnswerKeyRow[] {
  const rows: AnswerKeyRow[] = [];
  let row: AnswerKeyRow = { cells: [], height: 0 };
  let used = 0;
  metrics.forEach((item, index) => {
    const span = answerSpan(item);
    if (used + span > 5) {
      rows.push(row);
      row = { cells: [], height: 0 };
      used = 0;
    }
    row.cells.push({ index: startIndex + index, span });
    row.height = Math.max(
      row.height,
      item.candidates.find((candidate) => candidate.span === span)!.height,
    );
    used += span;
  });
  if (row.cells.length) rows.push(row);
  return rows;
}
export function paginateAnswerPages(
  rows: AnswerKeyRow[],
  solutions: { index: number; height: number }[],
  config: {
    available: number;
    headingHeight: number;
    gap: number;
    columns: 1 | 2;
    groupStart?: number;
  },
): AnswerPageLayout[] {
  if (config.available < 1) throw new Error("정답지 머리가 한 쪽보다 깁니다.");
  const pages: AnswerPageLayout[] = [];
  const create = () => {
    const page: AnswerPageLayout = {
      keyRows: [],
      solutionIndices: [],
      scales: [],
      splitIndex: 0,
      indices: [],
      groupStart: config.groupStart ?? 0,
    };
    pages.push(page);
    return page;
  };
  let page: AnswerPageLayout | undefined;
  let used = 0;
  for (const row of rows) {
    if (row.height > config.available)
      throw new Error(
        "한 정답 행이 한 쪽보다 깁니다. 정답의 줄 구성을 확인해 주세요.",
      );
    if (!page || used + row.height > config.available) {
      page = create();
      used = 0;
    }
    page.keyRows.push(row);
    page.indices.push(...row.cells.map((cell) => cell.index));
    used += row.height;
  }
  let next = 0;
  while (next < solutions.length) {
    if (!page) {
      page = create();
      used = 0;
    }
    const budget =
      config.available -
      used -
      (page.keyRows.length ? config.headingHeight : 0);
    // A normal solution moves intact; it is never shrunk into the key's remainder.
    if (page.keyRows.length && solutions[next].height > budget) {
      page = undefined;
      continue;
    }
    for (
      let column = 0;
      column < config.columns && next < solutions.length;
      column++
    ) {
      let columnUsed = 0;
      let count = 0;
      while (next < solutions.length) {
        const item = solutions[next];
        if (page.keyRows.length && item.height > budget) break;
        const gap = count ? config.gap : 0;
        if (count && columnUsed + gap + item.height > budget) break;
        const scale = Math.min(1, budget / Math.max(1, item.height));
        page.solutionIndices.push(item.index);
        if (!page.indices.includes(item.index)) page.indices.push(item.index);
        page.scales.push(scale);
        columnUsed += gap + item.height * scale;
        count++;
        next++;
      }
      if (column === 0) page.splitIndex = page.solutionIndices.length;
    }
    page = undefined;
  }
  return pages;
}
