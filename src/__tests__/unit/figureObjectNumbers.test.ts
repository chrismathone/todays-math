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

/** 번호 = 그리는 차례 + 1 — 순서를 안 바꾼 그림(옛 그림을 처음 연 것)과 같다. */
const inOrder = () =>
  new Map(
    [...root.querySelectorAll("[data-object-id]")].map((node, index) => [
      node.getAttribute("data-object-id")!,
      index + 1,
    ]),
  );

describe("끄는 동안 번호 지시선만 옮긴다", () => {
  it("끄는 요소가 없거나 자리가 그대로면 같은 배열을 돌려준다", () => {
    const numbers = layoutFigureNumbers(root, inOrder());
    expect(numbers.map((n) => [n.id, n.targetX, n.targetY])).toEqual([
      ["a", 20, 10],
      ["b", 200, 200],
    ]);
    expect(retargetFigureNumbers(root, numbers, [])).toBe(numbers);
    expect(retargetFigureNumbers(root, numbers, ["a"])).toBe(numbers);
  });
  it("끄는 요소의 지시선 끝만 옮기고 번호 자리와 다른 요소는 그대로 둔다", () => {
    const numbers = layoutFigureNumbers(root, inOrder());
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
    expect(layoutFigureNumbers(root, inOrder())[0]).toMatchObject({
      targetX: 120,
      targetY: 50,
    });
  });
  it("모르는 요소를 끌면 아무것도 바꾸지 않는다", () => {
    const numbers = layoutFigureNumbers(root, inOrder());
    expect(retargetFigureNumbers(root, numbers, ["zzz"])).toBe(numbers);
  });
});

/**
 * 묶음은 **번호표 하나** — 원장님 2026-09-21 «그룹화되면 번호를 하나로 합치게 할 것»
 * (사다리꼴 상자 하나에 ⑯ ⑰ 둘이 붙어 있었다).
 * 번호 매기기 자체는 그대로다(요소 차례 + 1) — AI «요청대로 고치기»가 그 번호로 요소를 가리키고,
 * AI 에게 보내는 그림(figureEditSnapshot)은 묶음을 주지 않고 불러 **요소마다** 번호를 그대로 단다.
 */
describe("묶음은 번호표 하나", () => {
  const third = () => {
    const node = document.createElementNS(SVG_NS, "rect");
    node.setAttribute("data-object-id", "c");
    root.appendChild(node);
    place(node, 300, 100, 20, 20);
    return node;
  };
  it("묶음을 안 주면 요소마다 번호 — AI 그림이 타는 길", () => {
    third();
    expect(
      layoutFigureNumbers(root, inOrder()).map((n) => [n.number, n.ids]),
    ).toEqual([
      [1, ["a"]],
      [2, ["b"]],
      [3, ["c"]],
    ]);
  });
  it("같은 묶음의 요소는 번호표 하나 — 번호는 가장 작은 번호, 지시선은 속 요소마다", () => {
    third();
    const groups = new Map([
      ["b", "A"],
      ["c", "A"],
    ]);
    const numbers = layoutFigureNumbers(root, inOrder(), groups);
    expect(numbers.map((n) => n.number)).toEqual([1, 2]);
    expect(numbers[1]).toMatchObject({
      id: "b",
      ids: ["b", "c"],
      group: "A",
      // 속 요소 가운데(200,200)·(310,110) 의 한가운데
      targetX: 255,
      targetY: 155,
    });
    expect(numbers[1].targets).toEqual([
      { x: 200, y: 200 },
      { x: 310, y: 110 },
    ]);
    expect(numbers[0].targets).toBeUndefined();
  });
  it("묶음 이름이 다르면 따로 — 번호는 요소 차례를 그대로 쓴다", () => {
    third();
    const numbers = layoutFigureNumbers(
      root,
      inOrder(),
      new Map([
        ["a", "A"],
        ["c", "B"],
      ]),
    );
    expect(numbers.map((n) => [n.number, n.group])).toEqual([
      [1, "A"],
      [2, undefined],
      [3, "B"],
    ]);
  });
  it("묶음 속 요소를 끌면 그 묶음 번호표의 지시선만 다시 잰다", () => {
    third();
    const groups = new Map([
      ["b", "A"],
      ["c", "A"],
    ]);
    const numbers = layoutFigureNumbers(root, inOrder(), groups);
    expect(retargetFigureNumbers(root, numbers, ["a"])).toBe(numbers);
    place(root.querySelector('[data-object-id="c"]')!, 300, 300, 20, 20);
    const next = retargetFigureNumbers(root, numbers, ["c"]);
    expect(next).not.toBe(numbers);
    expect(next[1]).toMatchObject({ targetX: 255, targetY: 255 });
    expect(next[1].targets).toEqual([
      { x: 200, y: 200 },
      { x: 310, y: 310 },
    ]);
    expect(next[0]).toBe(numbers[0]);
  });
});

/**
 * 원장님 2026-09-21 «순서를 바꿔도 요소 번호가 안바뀌게 고정시켜» — 번호는 그리는 차례가 아니라 요소에 붙은 값이다.
 * 맨 뒤로 보낸 요소는 문서 맨 앞에 서지만 번호는 그대로. 번호표 자리도 번호 차례로 잡아 제자리에 선다.
 */
describe("번호는 그리는 차례와 떨어져 있다", () => {
  const moveToBack = (id: string) =>
    root.insertBefore(
      root.querySelector(`[data-object-id="${id}"]`)!,
      root.firstChild,
    );
  it("맨 뒤로 보낸 요소도 제 번호 — 번호표 번호·자리가 전과 같다", () => {
    const fixed = new Map([
      ["a", 1],
      ["b", 2],
    ]);
    const before = layoutFigureNumbers(root, fixed);
    moveToBack("b");
    const after = layoutFigureNumbers(root, fixed);
    expect(after.map((n) => [n.id, n.number])).toEqual([
      ["a", 1],
      ["b", 2],
    ]);
    expect(after).toEqual(before);
  });
  it("묶음 번호표는 속 요소 가운데 가장 작은 **번호** — 문서 차례가 앞선 요소가 아니다", () => {
    const third = document.createElementNS(SVG_NS, "rect");
    third.setAttribute("data-object-id", "c");
    root.insertBefore(third, root.firstChild);
    place(third, 300, 100, 20, 20);
    const numbers = layoutFigureNumbers(
      root,
      new Map([
        ["c", 9],
        ["a", 1],
        ["b", 2],
      ]),
      new Map([
        ["c", "A"],
        ["b", "A"],
      ]),
    );
    expect(numbers.map((n) => [n.number, n.id, n.ids])).toEqual([
      [1, "a", ["a"]],
      [2, "b", ["c", "b"]],
    ]);
  });
});
