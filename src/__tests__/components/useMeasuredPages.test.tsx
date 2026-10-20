import { render, waitFor } from "@testing-library/react";
import { useLayoutEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMeasuredPages } from "@/components/unified/print/useMeasuredPages";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
  type PrintTemplateProps,
} from "@/components/unified/print/types";

vi.mock("@/components/unified/print/loadFonts", () => ({
  loadPrintFonts: vi.fn(async () => {}),
}));

function Template({ measure }: PrintTemplateProps) {
  return measure ? (
    <div data-measure-items>
      <div data-measure-idx="0" />
    </div>
  ) : (
    <div className="measure-body" style={{ paddingBottom: 16 }} />
  );
}
afterEach(() => vi.restoreAllMocks());

describe("stable measured preview", () => {
  it("retains mounted pages during metadata remeasurement, then uses the changed header height", async () => {
    let available = 800;
    vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([
      {},
    ] as unknown as DOMRectList);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        return {
          height: this.matches(".measure-body") ? available : 400,
        } as DOMRect;
      },
    );
    const problems = [
      {
        id: "synthetic",
        variant: {
          id: "synthetic",
          content: "Synthetic",
          answer: "1",
          solution: "",
          topic: "",
          grade: "",
          chapter: "",
          section: "",
          difficulty: "",
          problemCode: "",
          figureUrls: [],
          figureSvg: null,
          figureDims: [],
          figureSourceMm: [],
        },
      },
    ];
    const options = {
      ...DEFAULT_PRINT_OPTIONS,
      spacing: 0,
      smartSpacing: false,
    };
    let current: ReturnType<typeof useMeasuredPages>;
    function Harness({
      title,
      replace = false,
    }: {
      title: string;
      replace?: boolean;
    }) {
      const currentProblems = replace
        ? problems.map((problem) => ({ ...problem, id: "replacement" }))
        : problems;
      const measured = useMeasuredPages(Template, currentProblems, options, {
        ...DEFAULT_PRINT_META,
        title,
      });
      useLayoutEffect(() => {
        current = measured;
      });
      return measured.measureNode;
    }
    const { rerender } = render(<Harness title="Before" />);
    await waitFor(() => expect(current.ready).toBe(true));
    expect(current!.pages).toHaveLength(1);
    available = 300;
    rerender(<Harness title="Changed header" />);
    expect(current!.ready).toBe(false);
    expect(current!.pages).toHaveLength(1);
    await waitFor(() => expect(current.ready).toBe(true));
    expect(current!.pages[0].scales[0]).toBeCloseTo((300 - 16 - 12) / 400);
    rerender(<Harness title="Another document" replace />);
    expect(current!.ready).toBe(false);
    expect(current!.pages).toEqual([]);
    await waitFor(() => expect(current.ready).toBe(true));
  });
});
