import { describe, expect, it, vi } from "vitest";
import {
  paintSourceFigure,
  sourceFigureWidth,
} from "@/components/math/editor/sourceFigurePresentation";
import { typesetFigureSvg } from "@/components/unified/figure-editor/figureTypeset";

vi.mock("@/components/unified/figure-editor/figureTypeset", () => ({
  typesetFigureSvg: vi.fn(),
}));

describe("source figure presentation", () => {
  it.each([
    ['<svg viewBox="0 0 240 360">', 240],
    ['<svg viewBox="-10 -20 100 800">', 45],
    ["<svg width='60' height='60' viewBox='0 0 60 60'>", 60],
    ['<svg width="120" viewBox="0 0 240 360">', 120],
    ['<svg height="180" viewBox="0 0 240 360">', 120],
    ['<svg stroke-width="2" viewBox="0 0 240 360">', 240],
    ['<svg width="100%" viewBox="0,0,600,300">', 360],
    ['<svg viewBox="0 0 -100 -200">', 360],
  ])("caps the viewport without letterboxing: %s", (svg, expected) => {
    expect(sourceFigureWidth(svg)).toBe(expected);
  });

  it("discards old typesetting when a figure is redrawn or unmounted", async () => {
    let finishOld!: (source: string) => void;
    let finishNew!: (source: string) => void;
    vi.mocked(typesetFigureSvg)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishOld = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishNew = resolve;
          }),
      );
    const element = document.createElement("span");
    const old = "<svg><text>$-2$</text></svg>";
    const next = "<svg><text>$-3$</text></svg>";
    const cancelOld = paintSourceFigure(element, old);
    cancelOld();
    const cancelNew = paintSourceFigure(element, next);
    finishOld('<svg data-old="true"/>');
    await Promise.resolve();
    expect(element.textContent).toBe("$-3$");
    finishNew('<svg data-new="true"><path/></svg>');
    await Promise.resolve();
    expect(element.querySelector("[data-new]")).not.toBeNull();
    expect(element.querySelector("[data-old]")).toBeNull();
    cancelNew();
    expect(typesetFigureSvg).toHaveBeenCalledWith(next, true);
  });

  it("does not re-typeset a figure that already consists of paths", () => {
    vi.mocked(typesetFigureSvg).mockClear();
    const source = '<svg viewBox="0 0 30 40"><path d="M0 0L30 40"/></svg>';
    const element = document.createElement("span");
    paintSourceFigure(element, source);
    expect(element.querySelector("svg")?.getAttribute("viewBox")).toBe(
      "0 0 30 40",
    );
    expect(element.querySelector("path")?.getAttribute("d")).toBe("M0 0L30 40");
    expect(typesetFigureSvg).not.toHaveBeenCalled();
  });
});
