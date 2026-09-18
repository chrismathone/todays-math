import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  layoutFigureNumbers,
  retargetFigureNumbers,
} from "@/components/unified/figure-editor/figureObjectNumbers";
import { SVG_NS } from "@/components/unified/figure-editor/figureSvgEditing";

/**
 * 끄는 동안 번호를 걸음마다 요소 전부 다시 재고 있었다(요소마다 getBoundingClientRect·getTotalLength·getScreenCTM).
 * 끄는 동안은 번호 자리를 두고 **끄는 요소의 지시선 끝만** 옮긴다 — 바뀐 것이 없으면 같은 배열이라 번호 층이 다시 그려지지 않는다.
 */
const rect = (x: number, y: number, width: number, height: number) =>
  ({
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({}),
  }) as DOMRect;
const place = (
  node: Element,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  node.getBoundingClientRect = () => rect(x, y, width, height);
};

let root: SVGSVGElement;
beforeEach(() => {
  // jsdom 에는 SVGGeometryElement 가 없다 — 경계 상자로 가운데를 잡는 길을 탄다.
  vi.stubGlobal("SVGGeometryElement", class {});
  document.body.innerHTML = `<svg xmlns="${SVG_NS}" viewBox="0 0 480 360"><line data-object-id="a" x1="10" y1="10" x2="30" y2="10"/><circle data-object-id="b" cx="200" cy="200" r="5"/></svg>`;
  root = document.querySelector("svg") as SVGSVGElement;
  place(root, 0, 0, 480, 360);
  Object.defineProperty(root, "clientWidth", {
    configurable: true,
    value: 480,
  });
  Object.defineProperty(root, "clientHeight", {
    configurable: true,
    value: 360,
  });
  place(root.querySelector('[data-object-id="a"]')!, 10, 5, 20, 10);
  place(root.querySelector('[data-object-id="b"]')!, 195, 195, 10, 10);
});
afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("끄는 동안 번호 지시선만 옮긴다", () => {
  it("끄는 요소가 없거나 자리가 그대로면 같은 배열을 돌려준다", () => {
    const numbers = layoutFigureNumbers(root);
    expect(numbers.map((n) => [n.id, n.targetX, n.targetY])).toEqual([
      ["a", 20, 10],
      ["b", 200, 200],
    ]);
    expect(retargetFigureNumbers(root, numbers, [])).toBe(numbers);
    expect(retargetFigureNumbers(root, numbers, ["a"])).toBe(numbers);
  });
  it("끄는 요소의 지시선 끝만 옮기고 번호 자리와 다른 요소는 그대로 둔다", () => {
    const numbers = layoutFigureNumbers(root);
    place(root.querySelector('[data-object-id="a"]')!, 110, 45, 20, 10);
    const next = retargetFigureNumbers(root, numbers, ["a"]);
    expect(next).not.toBe(numbers);
    expect(next[0]).toMatchObject({
      id: "a",
      x: numbers[0].x,
      y: numbers[0].y,
      targetX: 120,
      targetY: 50,
    });
    expect(next[1]).toBe(numbers[1]);
    // 놓으면 다시 배치한다 — 옮긴 자리에서 가장 가까운 칸으로.
    expect(layoutFigureNumbers(root)[0]).toMatchObject({
      targetX: 120,
      targetY: 50,
    });
  });
  it("모르는 요소를 끌면 아무것도 바꾸지 않는다", () => {
    const numbers = layoutFigureNumbers(root);
    expect(retargetFigureNumbers(root, numbers, ["zzz"])).toBe(numbers);
  });
});
