import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useMeasuredAnswerPages } from "@/components/unified/print/useMeasuredAnswerPages";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
  type ProblemReview,
} from "@/components/unified/print/types";

const problems: ProblemReview[] = Array.from({ length: 6 }, (_, index) => ({
  id: `unmeasured-${index}`,
  variant: {
    id: `unmeasured-${index}`,
    content: "1+1=",
    answer: "2",
    solution: "두 수를 더합니다.",
    grade: "초1",
    chapter: "덧셈",
    section: "덧셈",
    topic: "덧셈",
    difficulty: "",
    problemCode: "",
    figureUrls: [],
    figureDims: [],
    figureSourceMm: [],
    figureSvg: null,
    arithmetic: {
      round: index < 4 ? 1 : 2,
      number: index + 1,
      groupKey: "sum",
      groupTitle: "덧셈",
    },
  },
}));
const options = { ...DEFAULT_PRINT_OPTIONS, quickAnswerOnly: true };

describe("answer pages before browser geometry is available", () => {
  it("keeps an H2 answer page for each round without claiming export readiness", () => {
    const { result } = renderHook(() =>
      useMeasuredAnswerPages(problems, options, DEFAULT_PRINT_META),
    );
    expect(result.current.pages.map((page) => page.indices)).toEqual([
      [0, 1, 2, 3],
      [4, 5],
    ]);
    expect(result.current.pages.map((page) => page.groupStart)).toEqual([0, 4]);
    expect(
      result.current.pages.flatMap((page) =>
        page.keyRows.flatMap((row) => row.cells.map((cell) => cell.index)),
      ),
    ).toEqual([0, 1, 2, 3, 4, 5]);
    expect(
      result.current.pages.every((page) => page.solutionIndices.length === 0),
    ).toBe(true);
    expect(result.current.ready).toBe(false);
    expect(result.current.layoutError).toBe(false);
  });
  it("replaces the provisional content when the selected round changes", () => {
    const { result, rerender } = renderHook(
      ({ selected }) =>
        useMeasuredAnswerPages(selected, options, DEFAULT_PRINT_META),
      { initialProps: { selected: problems } },
    );
    rerender({ selected: problems.slice(4) });
    expect(result.current.pages.map((page) => page.indices)).toEqual([[0, 1]]);
    expect(result.current.ready).toBe(false);
  });
});
