import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudioFigureEditor from "@/components/unified/figure-editor";
import { SVG_NS } from "@/components/unified/figure-editor/figureSvgEditing";

/**
 * 상단 도구 묶기 — 원장님 2026-09-21 확정 «안 A — 마지막에 쓴 도구가 겉에(ppt 식 나눈 단추)».
 * 묶는 것은 둘뿐: 선(선분·화살표·곡선) · 도형(원·타원·삼각형·사각형·다각형). 겉을 누르면 마지막 도구로 바로 그리고,
 * ▾ 를 누르면 무리의 도구가 펼쳐진다. 키보드: 겉 = Tab·Enter, ▾ = 메뉴(↓ 열기 · ↑↓ · Enter · Esc).
 * 시안 docs/design/mockups/wire-t43-figure-panel.html «② 상단 도구» A.
 *
 * 도구 한 글자 단축키 — 같은 날 «두다». 묶인 도구를 글자로 고르면 그 도구가 무리의 겉에 선다.
 */
vi.mock(
  "@/components/unified/figure-editor/figureTypeset",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/components/unified/figure-editor/figureTypeset")
      >();
    return { ...actual, typesetFigureSvg: async (source: string) => source };
  },
);

const crop = "data:image/png;base64,b3JpZ2luYWw=";
const figure =
  `<svg xmlns="${SVG_NS}" viewBox="0 0 480 360">` +
  `<rect x="10" y="10" width="40" height="20" stroke="#111" fill="none"/>` +
  `</svg>`;
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
  Object.defineProperty(SVGElement.prototype, "getScreenCTM", {
    configurable: true,
    value: () => identity,
  });
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value: () => ({ x: 10, y: 10, width: 40, height: 20 }),
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

function open() {
  const onClose = vi.fn();
  render(
    <StudioFigureEditor
      image={crop}
      initialSvg={figure}
      index={0}
      onSave={vi.fn()}
      onClose={onClose}
    />,
  );
  return onClose;
}
const toolbar = () => screen.getByRole("toolbar", { name: "도형 편집 도구" });
const canvas = () => document.querySelector("#figure-editor-canvas")!;
const surface = () => screen.getByLabelText("도형 편집 캔버스");
const button = (name: string) =>
  within(toolbar()).getByRole("button", { name });
const toggle = (group: "선" | "도형") => button(`${group} 도구 고르기`);
const menu = () => screen.queryByRole("menu");
const item = (name: string) => screen.getByRole("menuitemradio", { name });
const focused = () => document.activeElement;
const key = (target: Element, init: KeyboardEventInit) =>
  fireEvent.keyDown(target, init);
const drag = () => {
  fireEvent.pointerDown(canvas(), { button: 0, clientX: 125, clientY: 135 });
  fireEvent.pointerMove(surface(), { clientX: 245, clientY: 265 });
  fireEvent.pointerUp(surface());
};

describe("도구 줄 — 선·도형 무리, 마지막에 쓴 도구가 겉에", () => {
  it("겉에는 선분·원 — 무리 안의 다른 도구는 ▾ 를 눌러야 보인다", () => {
    open();
    const names = within(toolbar())
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-label") ?? b.textContent);
    expect(names.slice(0, 9)).toEqual([
      "선택·이동",
      "화면 이동",
      "선분",
      "선 도구 고르기",
      "원",
      "도형 도구 고르기",
      "글자",
      "채우기",
      "함수",
    ]);
    for (const hidden of [
      "화살표",
      "곡선",
      "타원",
      "사각형",
      "삼각형",
      "다각형",
    ])
      expect(
        within(toolbar()).queryByRole("button", { name: hidden }),
      ).toBeNull();
    expect(toggle("선")).toHaveAttribute("aria-haspopup", "menu");
    expect(toggle("선")).toHaveAttribute("aria-expanded", "false");
    expect(menu()).toBeNull();
  });

  it("▾ 를 누르면 무리의 도구가 펼쳐지고, 고른 도구가 겉에 서서 바로 그린다", () => {
    open();
    fireEvent.click(toggle("도형"));
    expect(toggle("도형")).toHaveAttribute("aria-expanded", "true");
    expect(
      within(menu()!)
        .getAllByRole("menuitemradio")
        .map((node) => node.textContent?.replace("✓", "").trim()),
    ).toEqual(["○원", "⬭타원", "□사각형", "△삼각형", "⬠다각형"]);
    fireEvent.click(item("사각형"));
    expect(menu()).toBeNull();
    expect(button("사각형")).toHaveAttribute("aria-pressed", "true");
    expect(within(toolbar()).queryByRole("button", { name: "원" })).toBeNull();
    // 겉이 켜지면 ▾ 도 같은 눌림 모양(시안 .split[data-on])
    expect(toggle("도형").className).toContain("ring-1");
    expect(toggle("선").className).not.toContain("ring-1");
    const before = canvas().querySelectorAll("rect[data-object-id]").length;
    drag();
    expect(canvas().querySelectorAll("rect[data-object-id]")).toHaveLength(
      before + 1,
    );
  });

  it("그린 뒤 선택으로 돌아와도 겉은 마지막 도구 — 겉을 누르면 그 도구로 다시 그린다", () => {
    open();
    fireEvent.click(toggle("선"));
    fireEvent.click(item("화살표"));
    drag();
    expect(button("선택·이동")).toHaveAttribute("aria-pressed", "true");
    expect(button("화살표")).toHaveAttribute("aria-pressed", "false");
    expect(toggle("선").className).not.toContain("ring-1");
    fireEvent.click(button("화살표"));
    expect(button("화살표")).toHaveAttribute("aria-pressed", "true");
    drag();
    expect(canvas().querySelectorAll("line[marker-end]")).toHaveLength(2);
  });

  it("메뉴는 켜진 도구에 ✓(aria-checked) — 켜진 도구가 없으면 아무것도 안 걸린다", () => {
    open();
    fireEvent.click(toggle("도형"));
    for (const name of ["원", "타원", "사각형", "삼각형", "다각형"])
      expect(item(name)).toHaveAttribute("aria-checked", "false");
    fireEvent.click(item("삼각형"));
    fireEvent.click(toggle("도형"));
    expect(item("삼각형")).toHaveAttribute("aria-checked", "true");
    expect(item("원")).toHaveAttribute("aria-checked", "false");
  });

  it("메뉴가 열린 채 겉을 누르면 메뉴가 닫히고 겉 도구가 켜진다", () => {
    open();
    fireEvent.click(toggle("선"));
    fireEvent.pointerDown(button("선분"));
    fireEvent.click(button("선분"));
    expect(menu()).toBeNull();
    expect(button("선분")).toHaveAttribute("aria-pressed", "true");
  });

  it("마우스로 고르면 초점은 겉 단추로 — 메뉴가 사라져 초점이 <body> 로 떨어지지 않는다", () => {
    open();
    fireEvent.click(toggle("선"));
    const arrow = item("화살표");
    act(() => arrow.focus());
    fireEvent.click(arrow);
    expect(focused()).toBe(button("화살표"));
  });
});

describe("▾ 메뉴 키보드 — ↓ 열기 · ↑↓ · Enter · Esc · Tab 종료", () => {
  it("▾ 에서 ↓ 로 열면 겉 도구에 초점, ↑↓ 는 돌고, Enter 로 고르면 겉 단추로 돌아온다", () => {
    open();
    const opener = toggle("선");
    act(() => opener.focus());
    key(opener, { key: "ArrowDown" });
    expect(menu()).not.toBeNull();
    expect(focused()).toBe(item("선분"));
    key(focused()!, { key: "ArrowDown" });
    expect(focused()).toBe(item("화살표"));
    key(focused()!, { key: "ArrowDown" });
    key(focused()!, { key: "ArrowDown" });
    expect(focused()).toBe(item("선분"));
    key(focused()!, { key: "ArrowUp" });
    expect(focused()).toBe(item("곡선"));
    key(focused()!, { key: "Enter" });
    expect(menu()).toBeNull();
    expect(button("곡선")).toHaveAttribute("aria-pressed", "true");
    expect(focused()).toBe(button("곡선"));
  });

  it("↑ 로 열면 끝 도구부터 · Home·End", () => {
    open();
    const opener = toggle("도형");
    act(() => opener.focus());
    key(opener, { key: "ArrowUp" });
    expect(focused()).toBe(item("다각형"));
    key(focused()!, { key: "Home" });
    expect(focused()).toBe(item("원"));
    key(focused()!, { key: "End" });
    expect(focused()).toBe(item("다각형"));
    key(focused()!, { key: " " });
    expect(button("다각형")).toHaveAttribute("aria-pressed", "true");
  });

  it.each([false, true])(
    "Tab 은 메뉴를 닫고 기본 초점 이동을 허용한다 (shift=%s)",
    (shiftKey) => {
      open();
      const opener = toggle("선");
      act(() => opener.focus());
      key(opener, { key: "ArrowDown" });
      expect(key(focused()!, { key: "Tab", shiftKey })).toBe(true);
      expect(menu()).toBeNull();
      // jsdom has no native Tab action; the browser harness asserts its actual target.
      expect(focused()).toBe(opener);
    },
  );

  it("Esc 는 메뉴만 닫고 ▾ 로 돌아온다 — 편집기도 안 닫히고 고른 요소도 그대로, ↓ 가 요소를 옮기지도 않는다", () => {
    const onClose = open();
    fireEvent.click(document.querySelector('[data-figure-list-number="1"]')!);
    const source = canvas().innerHTML;
    const opener = toggle("선");
    act(() => opener.focus());
    key(opener, { key: "ArrowDown" });
    key(focused()!, { key: "ArrowDown" });
    expect(canvas().innerHTML).toBe(source);
    key(focused()!, { key: "Escape" });
    expect(menu()).toBeNull();
    expect(focused()).toBe(opener);
    expect(onClose).not.toHaveBeenCalled();
    expect(
      document.querySelector('[data-figure-list-number="1"]'),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("바깥을 누르면 닫힌다 · 다른 무리의 ▾ 를 누르면 그 무리만 열린다", () => {
    open();
    fireEvent.click(toggle("선"));
    fireEvent.pointerDown(canvas(), { button: 0, clientX: 400, clientY: 300 });
    expect(menu()).toBeNull();
    fireEvent.click(toggle("선"));
    fireEvent.pointerDown(toggle("도형"));
    fireEvent.click(toggle("도형"));
    expect(screen.getAllByRole("menu")).toHaveLength(1);
    expect(item("원")).toBeInTheDocument();
  });
});

describe("도구 한 글자 단축키", () => {
  const press = (init: KeyboardEventInit) => key(surface(), init);
  const pressed = (name: string) => button(name).getAttribute("aria-pressed");

  it("O 원 · P 다각형 — 묶인 도구를 글자로 고르면 그 도구가 무리의 겉에 선다", () => {
    open();
    act(() => surface().focus());
    press({ key: "o", code: "KeyO" });
    expect(pressed("원")).toBe("true");
    press({ key: "p", code: "KeyP" });
    expect(pressed("다각형")).toBe("true");
    expect(within(toolbar()).queryByRole("button", { name: "원" })).toBeNull();
    press({ key: "l", code: "KeyL" });
    expect(pressed("선분")).toBe("true");
    expect(pressed("다각형")).toBe("false");
    press({ key: "v", code: "KeyV" });
    expect(pressed("선택·이동")).toBe("true");
    press({ key: "h", code: "KeyH" });
    expect(pressed("화면 이동")).toBe("true");
    press({ key: "x", code: "KeyX" });
    expect(pressed("함수")).toBe("true");
    press({ key: "t", code: "KeyT" });
    expect(pressed("글자")).toBe("true");
    expect(pressed("함수")).toBe("false");
  });

  it("한글 입력 상태도 자판 자리로 — ㅔ(P 자리) 다각형", () => {
    open();
    act(() => surface().focus());
    press({ key: "ㅔ", code: "KeyP" });
    expect(pressed("다각형")).toBe("true");
  });

  it("Ctrl·Alt·Shift 가 붙으면 도구를 안 바꾼다", () => {
    open();
    act(() => surface().focus());
    press({ key: "l", code: "KeyL", ctrlKey: true });
    press({ key: "l", code: "KeyL", altKey: true });
    press({ key: "L", code: "KeyL", shiftKey: true });
    expect(pressed("선택·이동")).toBe("true");
    expect(pressed("선분")).toBe("false");
  });

  it("글자 칸 안에서는 글자가 들어간다 — 도구가 안 바뀐다", () => {
    open();
    act(() => surface().focus());
    press({ key: "t", code: "KeyT" });
    const input = screen.getByLabelText("추가할 도형 글자");
    act(() => input.focus());
    key(input, { key: "l", code: "KeyL" });
    expect(pressed("글자")).toBe("true");
    expect(pressed("선분")).toBe("false");
  });

  it("도구 단추·메뉴 항목의 title 에 글자 — 단축키 표와 같은 글자", () => {
    open();
    expect(button("선택·이동")).toHaveAttribute("title", "선택·이동 (V)");
    expect(button("선분")).toHaveAttribute("title", "선분 (L)");
    expect(button("함수")).toHaveAttribute("title", "함수 (X)");
    fireEvent.click(toggle("도형"));
    expect(item("사각형")).toHaveAttribute("title", "사각형 (R)");
  });

  it("단축키 목록 맨 위에 «도구» 무리", () => {
    open();
    const sheet = screen.getByLabelText("단축키 목록");
    expect(sheet.textContent).toMatch(/^도구/);
    expect(sheet.textContent).toContain("L 선분");
    expect(sheet.textContent).toContain("O 원");
    expect(sheet.textContent).toContain("Y 삼각형");
  });
});
