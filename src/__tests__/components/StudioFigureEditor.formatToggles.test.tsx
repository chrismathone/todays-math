import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudioFigureEditor from "@/components/unified/figure-editor";
import { SVG_NS } from "@/components/unified/figure-editor/figureSvgEditing";

/**
 * 켜고 끄는 단추의 켜짐 표시 — 원장님 2026-09-19 «기울임이 적용이 되었는데도 된 건지 안 된 건지 시각적인 게 없어.
 * 적용되었으면 반전을 줘, 버튼에.» 상태의 근거는 그 글자 요소의 실제 속성이다.
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
const figure = `<svg xmlns="${SVG_NS}" viewBox="0 0 480 360"><text x="100" y="100" font-size="18" data-mj="A">A</text><text x="200" y="100" font-size="18" font-style="italic" font-weight="700" data-mj="B">B</text></svg>`;
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
  Object.defineProperty(SVGElement.prototype, "getScreenCTM", {
    configurable: true,
    value: () => identity,
  });
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value: () => ({ x: 20, y: 30, width: 60, height: 60 }),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const open = () =>
  render(
    <StudioFigureEditor
      image={crop}
      initialSvg={figure}
      index={0}
      onSave={vi.fn()}
      onClose={vi.fn()}
    />,
  );
const pickNumber = (n: number, additive = false) =>
  fireEvent.click(document.querySelector(`[data-figure-list-number="${n}"]`)!, {
    shiftKey: additive,
  });
const canvasText = (n: number) =>
  document.querySelectorAll("#figure-editor-canvas text")[n];
/** 켜짐 = 반전(편집기 주 색 바탕 · 흰 글자). */
const inverted = (button: HTMLElement) =>
  button.className.includes("bg-[var(--figure-primary)]") &&
  button.className.includes("text-white");

describe("기울임·굵게 — 글자 하나", () => {
  it("꺼져 있으면 aria-pressed=false 와 지금 모양, 누르면 켜짐 반전 · 요소 속성도 같이", () => {
    open();
    pickNumber(1);
    const italic = screen.getByRole("button", { name: "기울임" });
    expect(italic).toHaveAttribute("aria-pressed", "false");
    expect(inverted(italic)).toBe(false);
    fireEvent.click(italic);
    expect(canvasText(0)).toHaveAttribute("font-style", "italic");
    const on = screen.getByRole("button", { name: "기울임" });
    expect(on).toHaveAttribute("aria-pressed", "true");
    expect(inverted(on)).toBe(true);
    fireEvent.click(on);
    expect(canvasText(0)).toHaveAttribute("font-style", "normal");
    expect(screen.getByRole("button", { name: "기울임" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("요소가 이미 기울임·굵게(700)면 처음부터 켜짐으로 보인다", () => {
    open();
    pickNumber(2);
    for (const name of ["기울임", "굵게"]) {
      const button = screen.getByRole("button", { name });
      expect(button, name).toHaveAttribute("aria-pressed", "true");
      expect(inverted(button), name).toBe(true);
    }
    fireEvent.click(screen.getByRole("button", { name: "굵게" }));
    expect(canvasText(1)).toHaveAttribute("font-weight", "normal");
    expect(screen.getByRole("button", { name: "굵게" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});

describe("기울임·굵게 — 여러 글자 공통 서식", () => {
  it("섞여 있으면 aria-pressed=mixed(반전 아님), 누르면 모두 켠다", () => {
    open();
    pickNumber(1);
    pickNumber(2, true);
    const panel = within(
      screen.getByRole("region", { name: "글자 공통 서식" }),
    );
    const italic = panel.getByRole("button", { name: "기울임" });
    expect(italic).toHaveAttribute("aria-pressed", "mixed");
    expect(inverted(italic)).toBe(false);
    fireEvent.click(italic);
    expect(canvasText(0)).toHaveAttribute("font-style", "italic");
    expect(canvasText(1)).toHaveAttribute("font-style", "italic");
    const on = panel.getByRole("button", { name: "기울임" });
    expect(on).toHaveAttribute("aria-pressed", "true");
    expect(inverted(on)).toBe(true);
  });
});

describe("도구 줄 — 눌림 모양과 aria-pressed 가 같다", () => {
  it("«함수»를 누르면 함수가 눌린 모양, «선택·이동»은 풀린 모양", () => {
    open();
    const select = screen.getByRole("button", { name: "선택·이동" });
    const pressedLook = select.className;
    expect(select).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "함수" }));
    const fn = screen.getByRole("button", { name: "함수" });
    expect(fn).toHaveAttribute("aria-pressed", "true");
    expect(fn.className).toContain("ring-1");
    const after = screen.getByRole("button", { name: "선택·이동" });
    expect(after).toHaveAttribute("aria-pressed", "false");
    expect(after.className).not.toBe(pressedLook);
    expect(after.className).not.toContain("ring-1");
  });
});
