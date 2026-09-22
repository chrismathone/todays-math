import { afterEach, describe, expect, it, vi } from "vitest";
import { figureGroupBounds } from "@/components/unified/figure-editor/figureGroupSelection";
import {
  applyPoint,
  invert,
  multiply,
  type Affine,
} from "@/components/unified/figure-editor/figureEditGeometry";

// jsdom has no SVG geometry; provide browser CTMs with the existing affine engine.
const matrix = (values: Affine): DOMMatrix =>
  ({
    a: values[0],
    b: values[1],
    c: values[2],
    d: values[3],
    e: values[4],
    f: values[5],
    inverse: () => matrix(invert(values)!),
    multiply: (other: DOMMatrix) =>
      matrix(
        multiply(values, [
          other.a,
          other.b,
          other.c,
          other.d,
          other.e,
          other.f,
        ]),
      ),
  }) as DOMMatrix;

afterEach(() => vi.unstubAllGlobals());

describe("group bounds in the canvas coordinate system", () => {
  it("encloses rotated members and a typeset label at a nonzero viewport origin and zoom", () => {
    vi.stubGlobal(
      "DOMPoint",
      class {
        constructor(
          public x = 0,
          public y = 0,
        ) {}
        matrixTransform(m: DOMMatrix) {
          const [x, y] = applyPoint(
            [m.a, m.b, m.c, m.d, m.e, m.f],
            [this.x, this.y],
          );
          return { x, y };
        }
      },
    );
    const doc = new DOMParser().parseFromString(
      '<svg xmlns="http://www.w3.org/2000/svg"><rect data-object-id="box"/><g data-object-id="math" data-typeset=""><path/></g><circle data-object-id="loose"/></svg>',
      "image/svg+xml",
    );
    const root = doc.documentElement as unknown as SVGSVGElement;
    // Root canvas is zoomed 2x and offset on screen; neither should inflate its SVG bounds.
    root.getScreenCTM = () => matrix([2, 0, 0, 2, 100, 200]);
    const box = root.querySelector<SVGGraphicsElement>("rect")!;
    box.getBBox = () => ({ x: 0, y: 0, width: 20, height: 10 }) as DOMRect;
    // A 90-degree rotation at (30, 40) gives root bounds (20, 40) to (30, 60).
    box.getScreenCTM = () => matrix([0, 2, -2, 0, 160, 280]);
    const math = root.querySelector<SVGGraphicsElement>("g")!;
    math.getBBox = () => ({ x: -5, y: -10, width: 30, height: 20 }) as DOMRect;
    math.getScreenCTM = () => matrix([2, 0, 0, 2, 180, 300]);
    expect(figureGroupBounds(root, ["box", "math"])).toEqual({
      x: 16,
      y: 36,
      width: 53,
      height: 28,
      scale: 2,
    });
  });

  it("does not draw a rectangle for missing or unmeasurable objects", () => {
    const root = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    expect(figureGroupBounds(root, ["missing"])).toBeNull();
    root.getScreenCTM = () => matrix([1, 0, 0, 1, 0, 0]);
    expect(figureGroupBounds(root, ["missing"])).toBeNull();
    expect(figureGroupBounds(root, [])).toBeNull();
  });
});
