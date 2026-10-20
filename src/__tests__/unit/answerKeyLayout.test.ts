import { describe, expect, it } from "vitest";
import {
  answerSpan,
  packAnswerRows,
  paginateAnswerPages,
  type AnswerMetrics,
} from "@/components/unified/print/answerKeyLayout";

function metrics(single: boolean, fitting: number, height = 48): AnswerMetrics {
  return {
    naturalHeight: 22,
    lineHeight: 22,
    candidates: ([1, 2, 3, 5] as const).map((span) => ({
      span,
      height,
      answerHeight: span >= fitting ? 22 : 66,
      overflow: span === 1 ? !single : false,
    })),
  };
}
const config = {
  available: 100,
  headingHeight: 20,
  gap: 10,
  columns: 1 as const,
};

describe("H2 measured answers", () => {
  it("uses one cell for a short answer, including a naturally tall fraction", () => {
    expect(answerSpan(metrics(true, 1))).toBe(1);
    const fraction = metrics(true, 1);
    fraction.naturalHeight = 40;
    fraction.candidates.forEach((candidate) => {
      candidate.answerHeight = 40;
    });
    expect(answerSpan(fraction)).toBe(1);
  });
  it("gives long answers at least two cells, then tries three and five", () => {
    expect(answerSpan(metrics(false, 2))).toBe(2);
    expect(answerSpan(metrics(false, 3))).toBe(3);
    expect(answerSpan(metrics(false, 5))).toBe(5);
    const wraps = metrics(true, 1);
    wraps.candidates[0].answerHeight = 44;
    expect(answerSpan(wraps)).toBe(2);
  });
  it("does not silently print an unbreakable formula wider than the whole grid", () => {
    const tooWide = metrics(false, 5);
    tooWide.candidates.forEach((candidate) => {
      candidate.overflow = true;
    });
    expect(() => answerSpan(tooWide)).toThrow();
  });
  it("preserves order and moves a merged answer to the next row when needed", () => {
    const rows = packAnswerRows([
      metrics(true, 1),
      metrics(true, 1),
      metrics(true, 1),
      metrics(true, 1),
      metrics(false, 2),
      metrics(false, 3),
      metrics(false, 5),
      metrics(true, 1),
    ]);
    expect(
      rows.map((row) => row.cells.map((cell) => [cell.index, cell.span])),
    ).toEqual([
      [
        [0, 1],
        [1, 1],
        [2, 1],
        [3, 1],
      ],
      [
        [4, 2],
        [5, 3],
      ],
      [[6, 5]],
      [[7, 1]],
    ]);
    expect(
      rows.every(
        (row) => row.cells.reduce((sum, cell) => sum + cell.span, 0) <= 5,
      ),
    ).toBe(true);
  });
  it("uses the tallest selected cell as the row height", () => {
    expect(
      packAnswerRows([metrics(true, 1, 48), metrics(false, 2, 72)])[0].height,
    ).toBe(72);
  });
});

describe("answer row and solution pagination", () => {
  it("never splits a grid row and repeats the key on continuation pages", () => {
    const rows = packAnswerRows(
      Array.from({ length: 25 }, () => metrics(true, 1, 45)),
    );
    const pages = paginateAnswerPages(rows, [], config);
    expect(pages.map((page) => page.keyRows.length)).toEqual([2, 2, 1]);
    expect(
      pages.flatMap((page) =>
        page.keyRows.flatMap((row) => row.cells.map((cell) => cell.index)),
      ),
    ).toEqual(Array.from({ length: 25 }, (_, i) => i));
  });
  it("puts all answers first, then uses the last key page's remaining space for solutions", () => {
    const rows = packAnswerRows(
      Array.from({ length: 5 }, () => metrics(true, 1, 40)),
    );
    const pages = paginateAnswerPages(
      rows,
      [
        { index: 0, height: 30 },
        { index: 1, height: 60 },
      ],
      config,
    );
    expect(
      pages.map((page) => [page.keyRows.length, page.solutionIndices]),
    ).toEqual([
      [1, [0]],
      [0, [1]],
    ]);
  });
  it("moves a whole solution rather than shrinking it into a key page's remainder", () => {
    const rows = packAnswerRows([metrics(true, 1, 80)]);
    const pages = paginateAnswerPages(rows, [{ index: 0, height: 60 }], config);
    expect(pages.map((page) => page.solutionIndices)).toEqual([[], [0]]);
    expect(pages[1].scales).toEqual([1]);
  });
  it("packs solutions down the left column before the right", () => {
    const pages = paginateAnswerPages(
      [],
      Array.from({ length: 5 }, (_, index) => ({ index, height: 40 })),
      { ...config, columns: 2 },
    );
    expect(
      pages.map((page) => [page.solutionIndices, page.splitIndex]),
    ).toEqual([
      [[0, 1, 2, 3], 2],
      [[4], 1],
    ]);
  });
  it("bounds a single oversized solution exactly as the existing answer flow does", () => {
    const [page] = paginateAnswerPages([], [{ index: 0, height: 200 }], config);
    expect(page.scales).toEqual([0.5]);
  });
  it("returns no phantom page for empty answers and refuses a row taller than paper", () => {
    expect(paginateAnswerPages([], [], config)).toEqual([]);
    expect(() =>
      paginateAnswerPages(packAnswerRows([metrics(true, 1, 120)]), [], config),
    ).toThrow();
  });
});
