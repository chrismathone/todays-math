import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudioFigureEditor from "@/components/unified/figure-editor";
import { SVG_NS } from "@/components/unified/figure-editor/figureSvgEditing";

/**
 * 치수선 가운데 글자 — 원장님 2026-09-22 «치수선 위에 라벨을 넣으려고 하는데 … 스마트하게 치수선 위에 글자 넣을 방법
 * 없을까» → «곡선에서 바로 글자». 곡선·선을 고르면 «모양» 칸에 [가운데 글자 내용][가운데 글자].
 */
vi.mock(
  "@/components/unified/figure-editor/figureTypeset",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/components/unified/figure-editor/figureTypeset")
      >();
    // 화면 조판(아이디 보존)은 원문 그대로 — 캔버스에서 원문 속성을 본다. 저장 이미지 조판은 실제로.
    return {
      ...actual,
      typesetFigureSvg: async (source: string, preserveObjectIds = false) =>
        preserveObjectIds ? source : actual.typesetFigureSvg(source),
    };
  },
);

const crop = "data:image/png;base64,b3JpZ2luYWw=";
const figure = `<svg xmlns="${SVG_NS}" viewBox="0 0 480 360"><path d="M 100 200 Q 200 120 300 200" stroke="#111111" fill="none"/><circle cx="60" cy="60" r="20" stroke="#111111" fill="none"/><text x="100" y="100" font-size="18" data-mj="A">A</text></svg>`;
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
    value: () => ({ x: 20, y: 30, width: 60, height: 60 }),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function open(initialSvg = figure, onSave = vi.fn()) {
  const view = render(
    <StudioFigureEditor
      image={crop}
      initialSvg={initialSvg}
      index={0}
      onSave={onSave}
      onClose={vi.fn()}
    />,
  );
  return { view, onSave };
}
const pickNumber = (n: number, additive = false) =>
  fireEvent.click(document.querySelector(`[data-figure-list-number="${n}"]`)!, {
    shiftKey: additive,
  });
const listCount = () =>
  document.querySelectorAll("[data-figure-list-number]").length;
const texts = () =>
  [...document.querySelectorAll("#figure-editor-canvas text")].map((node) => ({
    text: node.getAttribute("data-mj"),
    x: node.getAttribute("x"),
    y: node.getAttribute("y"),
    gap: node.getAttribute("data-line-gap"),
    bg: node.getAttribute("data-text-bg"),
  }));

describe("가운데 글자 — 오른쪽 칸", () => {
  it("곡선을 고르고 글자를 치면 곡선 한가운데에 «뒤 선 끊기» 글자가 서고, 새 글자가 골라진다", () => {
    open();
    const before = listCount();
    pickNumber(1);
    const add = screen.getByRole("button", { name: "가운데 글자" });
    expect(add).toBeDisabled();
    fireEvent.change(screen.getByLabelText("가운데 글자 내용"), {
      target: { value: "9 cm" },
    });
    fireEvent.click(add);
    expect(listCount()).toBe(before + 1);
    expect(texts()).toContainEqual({
      text: "9 cm",
      x: "200",
      y: "160",
      gap: "1",
      bg: null,
    });
    // 새 글자가 골라졌다 — 글자 칸(배경색)이 보이고 가운데 글자 칸은 사라진다
    expect(screen.getByLabelText("글자 배경색")).toBeInTheDocument();
    expect(screen.queryByLabelText("가운데 글자 내용")).toBeNull();
  });

  it("Enter 로도 넣는다 · 되돌리기 한 번에 사라진다", () => {
    open();
    pickNumber(1);
    const input = screen.getByLabelText("가운데 글자 내용");
    fireEvent.change(input, { target: { value: "x" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(texts().some((t) => t.text === "x" && t.gap === "1")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /되돌리기/ }));
    expect(texts().some((t) => t.text === "x")).toBe(false);
  });

  it("원·글자를 고르면 가운데 글자 칸이 없다", () => {
    open();
    pickNumber(2);
    expect(screen.queryByLabelText("가운데 글자 내용")).toBeNull();
    pickNumber(3);
    expect(screen.queryByLabelText("가운데 글자 내용")).toBeNull();
  });
});
