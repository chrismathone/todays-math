import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudioFigureEditor, {
  type StudioFigureSaveResult,
} from "@/components/unified/figure-editor";
import { SVG_NS } from "@/components/unified/figure-editor/figureSvgEditing";
import { svgFromImage } from "@/components/unified/figure-editor/figureDocument";
import { openFigureDetails } from "@/__tests__/helpers/figureEditorPanel";

/**
 * 글자 배경색 — 원장님 2026-09-19 «글자 배경색도 추가할 수 있도록».
 * 오른쪽 칸 «글자 색» 아래 «배경색 [■] / 배경 없애기» — 도형의 «채우기 / 채우기 없애기»와 같은 모양.
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
const figure = `<svg xmlns="${SVG_NS}" viewBox="0 0 480 360"><line x1="20" y1="30" x2="80" y2="90" stroke="#111111"/><text x="100" y="100" font-size="18" data-mj="A">A</text><text x="200" y="100" font-size="18" data-mj="B">B</text></svg>`;
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
const sourceText = (n: number) =>
  document.querySelectorAll("#figure-editor-canvas text")[n];
const bgInput = () => screen.getByLabelText("글자 배경색");

describe("글자 배경색 — 오른쪽 칸", () => {
  it("«글자 색» 아래 «배경색»과 «배경 없애기» — 기본은 배경 없음", () => {
    open();
    pickNumber(2);
    const color = screen.getByLabelText("도형 선 색");
    const bg = bgInput();
    expect(
      color.compareDocumentPosition(bg) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "배경 없애기" }),
    ).toBeInTheDocument();
    expect(sourceText(0).hasAttribute("data-text-bg")).toBe(false);
  });

  it("색을 고르면 그 글자에 배경이 붙고, 요소 번호 수는 그대로다", () => {
    open();
    const before = listCount();
    pickNumber(2);
    fireEvent.change(bgInput(), { target: { value: "#ffee00" } });
    expect(sourceText(0)).toHaveAttribute("data-text-bg", "#ffee00");
    expect(sourceText(1).hasAttribute("data-text-bg")).toBe(false);
    expect(listCount()).toBe(before);
    expect(bgInput()).toHaveValue("#ffee00");
  });

  it("«배경 없애기»로 지운다 · 되돌리기·다시 실행", () => {
    open();
    pickNumber(2);
    fireEvent.change(bgInput(), { target: { value: "#ffee00" } });
    fireEvent.click(screen.getByRole("button", { name: "배경 없애기" }));
    expect(sourceText(0).hasAttribute("data-text-bg")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /되돌리기/ }));
    expect(sourceText(0)).toHaveAttribute("data-text-bg", "#ffee00");
    fireEvent.click(screen.getByRole("button", { name: /다시 실행/ }));
    expect(sourceText(0).hasAttribute("data-text-bg")).toBe(false);
  });

  it("크기를 고정한 글자도 배경색은 바꿀 수 있다(서식)", () => {
    open();
    pickNumber(2);
    openFigureDetails();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "요소 크기 고정 (이동만 가능)" }),
    );
    fireEvent.change(bgInput(), { target: { value: "#ccffcc" } });
    expect(sourceText(0)).toHaveAttribute("data-text-bg", "#ccffcc");
  });

  it("저장하면 원문엔 속성, 저장 이미지엔 사각형 — 다시 열어도 그대로", async () => {
    const { view, onSave } = open();
    pickNumber(2);
    fireEvent.change(bgInput(), { target: { value: "#ffee00" } });
    fireEvent.click(screen.getByRole("button", { name: "도형 적용" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    const saved = onSave.mock.calls[0][0] as StudioFigureSaveResult;
    expect(saved.svg).toContain('data-text-bg="#ffee00"');
    const image = new DOMParser().parseFromString(
      svgFromImage(saved.dataUrl)!,
      "image/svg+xml",
    );
    expect(image.querySelector('rect[fill="#ffee00"]')).not.toBeNull();
    view.unmount();
    open(saved.svg);
    expect(listCount()).toBe(3);
    pickNumber(2);
    expect(bgInput()).toHaveValue("#ffee00");
  });
});

describe("글자 배경색 — 여러 글자 공통 서식", () => {
  it("값이 갈리면 «여러 값», 바꾸면 고른 글자 모두에", () => {
    open();
    pickNumber(2);
    fireEvent.change(bgInput(), { target: { value: "#ffee00" } });
    pickNumber(3, true);
    const panel = screen.getByRole("region", { name: "글자 공통 서식" });
    const row = within(panel)
      .getByLabelText("고른 글자 배경색")
      .closest("div")!;
    expect(within(row).getByText("여러 값")).toBeInTheDocument();
    fireEvent.change(within(panel).getByLabelText("고른 글자 배경색"), {
      target: { value: "#ddeeff" },
    });
    expect(sourceText(0)).toHaveAttribute("data-text-bg", "#ddeeff");
    expect(sourceText(1)).toHaveAttribute("data-text-bg", "#ddeeff");
    fireEvent.click(within(panel).getByRole("button", { name: "배경 없애기" }));
    expect(sourceText(0).hasAttribute("data-text-bg")).toBe(false);
    expect(sourceText(1).hasAttribute("data-text-bg")).toBe(false);
  });
});
