import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudioFigureEditor from "@/components/unified/figure-editor";
import { SVG_NS } from "@/components/unified/figure-editor/figureSvgEditing";

/**
 * 도형 편집기 — 요소 순서(맨 앞으로 · 앞으로 · 뒤로 · 맨 뒤로). 원장님 2026-09-21:
 *
 * > «요소 순서 조절 할 수 있어야겠어. ppt나 다른 곳을 보면 맨 뒤로 맨 앞으로, 뒤로, 앞으로 같은
 * >  순서를 이용해서 조절하는게 있는데, 우리 도형 편집기에는 그 기능이 없어서 지금 y축이 가려져버렸어.»
 *
 * 시험은 «단추가 있다»가 아니라 **캔버스의 실제 그리는 차례**(`[data-object-id]` 의 DOM 차례)를 본다.
 * 단축키는 ppt 그대로 — Ctrl+Shift+] 맨 앞으로 · Ctrl+] 앞으로 · Ctrl+[ 뒤로 · Ctrl+Shift+[ 맨 뒤로.
 */
const crop = "data:image/png;base64,b3JpZ2luYWw=";
/**
 * 원장님 화면 그대로 — 포물선 · x축 · y축 · (멀리 떨어진 점 하나) · 포물선에 내접한 삼각형 ABC(회색 채움,
 * 독립 다각형). 삼각형이 y축 **뒤에 적혀** y축을 덮는다. 점은 아무것과도 안 겹친다.
 */
const figure =
  `<svg xmlns="${SVG_NS}" viewBox="0 0 480 360">` +
  `<path d="M 60 40 Q 240 560 420 40" stroke="#111" fill="none"/>` +
  `<line x1="20" y1="300" x2="460" y2="300" stroke="#111"/>` +
  `<line x1="240" y1="340" x2="240" y2="20" stroke="#111"/>` +
  `<circle cx="16" cy="16" r="4" stroke="#111" fill="none"/>` +
  `<polygon points="120,160 360,160 240,300" fill="#d9d9d9" stroke="#111"/>` +
  `</svg>`;
/** 요소마다 화면에서 차지하는 상자 — 여느 브라우저처럼 선 굵기는 뺀 모양 상자. */
const BOXES: Record<string, [number, number, number, number]> = {
  "obj-0": [60, 40, 420, 300], // 포물선
  "obj-1": [20, 300, 460, 300], // x축
  "obj-2": [240, 20, 240, 340], // y축
  "obj-3": [12, 12, 20, 20], // 멀리 떨어진 점
  "obj-4": [120, 160, 360, 300], // 삼각형
};
const identity = {
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  e: 0,
  f: 0,
  inverse() {
    return this;
  },
  multiply() {
    return this;
  },
};
class Point {
  constructor(
    public x = 0,
    public y = 0,
  ) {}
  matrixTransform() {
    return new Point(this.x, this.y);
  }
}
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("DOMPoint", Point);
  vi.stubGlobal("PointerEvent", MouseEvent);
  vi.stubGlobal("SVGGeometryElement", class {});
  Object.defineProperty(SVGElement.prototype, "getBoundingClientRect", {
    configurable: true,
    value(this: SVGElement) {
      const box = BOXES[this.getAttribute("data-object-id") ?? ""] ?? [
        0, 0, 480, 360,
      ];
      const [left, top, right, bottom] = box;
      return {
        x: left,
        y: top,
        left,
        top,
        right,
        bottom,
        width: right - left,
        height: bottom - top,
        toJSON: () => ({}),
      };
    },
  });
  for (const [name, value] of [
    ["clientWidth", 480],
    ["clientHeight", 360],
  ] as const)
    Object.defineProperty(SVGElement.prototype, name, {
      configurable: true,
      value,
    });
  Object.defineProperty(SVGElement.prototype, "getScreenCTM", {
    configurable: true,
    value: () => identity,
  });
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value: () => ({ x: 20, y: 30, width: 60, height: 60 }),
  });
  Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
    configurable: true,
    value: () => {},
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function open(svg = figure) {
  render(
    <StudioFigureEditor
      image={crop}
      initialSvg={svg}
      index={0}
      onSave={vi.fn()}
      onClose={vi.fn()}
    />,
  );
}
const canvas = () => document.querySelector("#figure-editor-canvas")!;
/** 캔버스에 **실제로 그려지는 차례** — 뒤에 적힌 것이 위에 그려진다. */
const painted = () =>
  [...canvas().querySelectorAll("[data-object-id]")].map((node) =>
    node.localName === "line"
      ? Number(node.getAttribute("y1")) === 300
        ? "x축"
        : "y축"
      : ({ path: "포물선", circle: "점", polygon: "삼각형" } as const)[
          node.localName as "path" | "circle" | "polygon"
        ],
  );
const ORIGINAL = ["포물선", "x축", "y축", "점", "삼각형"];
const chip = (n: number) =>
  document.querySelector<HTMLElement>(`[data-figure-list-number="${n}"]`)!;
const orderRow = () => within(screen.getByRole("region", { name: "순서" }));
const orderButton = (name: string) => orderRow().getByRole("button", { name });
const press = (key: string, code: string, init: KeyboardEventInit = {}) =>
  fireEvent.keyDown(document.activeElement ?? document.body, {
    key,
    code,
    ctrlKey: true,
    ...init,
  });
const undo = () => screen.getByRole("button", { name: /되돌리기/ });
const title = () =>
  screen.getByRole("heading", { level: 3, name: /편집$/ }).textContent;

describe("원장님 화면 — 채운 삼각형이 y축을 덮었다", () => {
  it("삼각형을 골라 «맨 뒤로» — 캔버스에서 삼각형이 맨 먼저 그려져 y축이 위로 온다", () => {
    open();
    expect(painted()).toEqual(ORIGINAL);
    fireEvent.click(chip(5));
    fireEvent.click(orderButton("맨 뒤로"));
    expect(painted()).toEqual(["삼각형", "포물선", "x축", "y축", "점"]);
  });
  it("번호는 그리는 차례라 바뀐다 — 오른쪽 칸 제목과 알림에 새 번호가 선다", () => {
    open();
    fireEvent.click(chip(5));
    expect(title()).toBe("5 · 다각형 편집");
    fireEvent.click(orderButton("맨 뒤로"));
    expect(title()).toBe("1 · 다각형 편집");
    expect(
      screen.getByText("맨 뒤로 보냈습니다. 5번이 1번이 되었습니다."),
    ).toBeInTheDocument();
  });
  it("되돌리기 한 걸음이면 원래 차례", () => {
    open();
    fireEvent.click(chip(5));
    fireEvent.click(orderButton("맨 뒤로"));
    fireEvent.click(undo());
    expect(painted()).toEqual(ORIGINAL);
    expect(undo()).toBeDisabled();
  });
  it("«뒤로» 한 칸은 겹치는 것 하나 아래 — 안 겹치는 점은 건너뛰고 y축 밑으로", () => {
    open();
    fireEvent.click(chip(5));
    fireEvent.click(orderButton("뒤로"));
    expect(painted()).toEqual(["포물선", "x축", "삼각형", "y축", "점"]);
  });
  it("겹치는 것이 없으면 차례를 안 바꾸고 알린다(되돌리기 자리도 안 생긴다)", () => {
    open();
    fireEvent.click(chip(4)); // 멀리 떨어진 점 — 위의 삼각형과 안 겹친다
    fireEvent.click(orderButton("앞으로"));
    expect(painted()).toEqual(ORIGINAL);
    expect(screen.getByText("앞에 겹친 요소가 없습니다.")).toBeInTheDocument();
    expect(undo()).toBeDisabled();
  });
  it("맨 위 요소는 «맨 앞으로»·«앞으로»가 꺼지고, 맨 아래 요소는 «뒤로»·«맨 뒤로»가 꺼진다", () => {
    open();
    fireEvent.click(chip(5));
    expect(orderButton("맨 앞으로")).toBeDisabled();
    expect(orderButton("앞으로")).toBeDisabled();
    expect(orderButton("뒤로")).toBeEnabled();
    expect(orderButton("맨 뒤로")).toBeEnabled();
    fireEvent.click(chip(1));
    expect(orderButton("뒤로")).toBeDisabled();
    expect(orderButton("맨 뒤로")).toBeDisabled();
    expect(orderButton("앞으로")).toBeEnabled();
  });
  it("아무것도 안 골랐으면 순서 줄이 없다", () => {
    open();
    expect(screen.queryByRole("region", { name: "순서" })).toBeNull();
  });
});

describe("단축키 — ppt 와 같다", () => {
  it("Ctrl+Shift+[ 맨 뒤로 · Ctrl+Shift+] 맨 앞으로", () => {
    open();
    fireEvent.click(chip(5));
    press("{", "BracketLeft", { shiftKey: true });
    expect(painted()).toEqual(["삼각형", "포물선", "x축", "y축", "점"]);
    press("}", "BracketRight", { shiftKey: true });
    expect(painted()).toEqual(["포물선", "x축", "y축", "점", "삼각형"]);
  });
  it("Ctrl+[ 뒤로 · Ctrl+] 앞으로 — 겹치는 것 사이의 한 칸", () => {
    open();
    fireEvent.click(chip(5));
    press("[", "BracketLeft");
    expect(painted()).toEqual(["포물선", "x축", "삼각형", "y축", "점"]);
    press("]", "BracketRight");
    expect(painted()).toEqual(["포물선", "x축", "y축", "삼각형", "점"]);
  });
  it("되돌리기는 누른 만큼 한 걸음씩", () => {
    open();
    fireEvent.click(chip(5));
    press("[", "BracketLeft");
    press("{", "BracketLeft", { shiftKey: true });
    press("z", "KeyZ");
    expect(painted()).toEqual(["포물선", "x축", "삼각형", "y축", "점"]);
    press("z", "KeyZ");
    expect(painted()).toEqual(ORIGINAL);
  });
  it("글자 칸(입력 칸)에서는 안 먹는다", () => {
    open();
    fireEvent.click(chip(5));
    fireEvent.keyDown(screen.getByLabelText("도형 채우기 색"), {
      key: "{",
      code: "BracketLeft",
      ctrlKey: true,
      shiftKey: true,
    });
    expect(painted()).toEqual(ORIGINAL);
  });
  it("누른 뒤 초점이 캔버스로 온다 — 이어지는 단축키가 먹는다", () => {
    open();
    chip(5).focus();
    fireEvent.click(chip(5));
    press("[", "BracketLeft");
    expect(document.activeElement).toBe(
      screen.getByLabelText("도형 편집 캔버스"),
    );
  });
  it("브라우저 기본 동작(맥의 Cmd+[ 뒤로 가기 등)을 막는다", () => {
    open();
    fireEvent.click(chip(5));
    const event = new KeyboardEvent("keydown", {
      key: "[",
      code: "BracketLeft",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});

describe("묶음은 한 덩어리로 — 캔버스에서 누르면 묶음 전부", () => {
  // 사각 + 사각 안 선분이 묶음 A — 사이에 원이 끼어 떨어져 적혀 있다
  const grouped =
    `<svg xmlns="${SVG_NS}" viewBox="0 0 480 360">` +
    `<rect x="20" y="30" width="60" height="40" stroke="#111" fill="#eee" data-group="A"/>` +
    `<circle cx="300" cy="60" r="20" stroke="#111" fill="none"/>` +
    `<line x1="24" y1="50" x2="76" y2="50" stroke="#111" data-group="A"/>` +
    `<polygon points="200,200 260,200 230,250" fill="#ccc" stroke="#111"/>` +
    `</svg>`;
  const kinds = () =>
    [...canvas().querySelectorAll("[data-object-id]")].map((n) => n.localName);
  it("묶음을 «맨 앞으로» — 둘이 붙어서 맨 위, 사각이 선 아래 그대로", () => {
    open(grouped);
    fireEvent.pointerDown(canvas().querySelector("rect")!, {
      button: 0,
      clientX: 40,
      clientY: 50,
    });
    fireEvent.pointerUp(screen.getByLabelText("도형 편집 캔버스"));
    expect(
      screen.getByRole("heading", { level: 3, name: "2개 요소 선택" }),
    ).toBeInTheDocument();
    fireEvent.click(orderButton("맨 앞으로"));
    expect(kinds()).toEqual(["circle", "polygon", "rect", "line"]);
    expect(
      screen.getByText("2개 요소를 맨 앞으로 가져왔습니다."),
    ).toBeInTheDocument();
  });
  it("묶음 이름은 그대로 — 옮겨도 묶음이 안 풀린다", () => {
    open(grouped);
    fireEvent.pointerDown(canvas().querySelector("rect")!, {
      button: 0,
      clientX: 40,
      clientY: 50,
    });
    fireEvent.pointerUp(screen.getByLabelText("도형 편집 캔버스"));
    fireEvent.click(orderButton("맨 뒤로"));
    expect(
      [...canvas().querySelectorAll("[data-group]")].map((n) =>
        n.getAttribute("data-group"),
      ),
    ).toEqual(["A", "A"]);
    expect(kinds()).toEqual(["rect", "line", "circle", "polygon"]);
  });
});
