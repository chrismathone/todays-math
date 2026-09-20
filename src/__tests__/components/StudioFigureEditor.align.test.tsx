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
import {
  ALIGN_BLOCKED,
  SPREAD_BLOCKED,
} from "@/components/unified/figure-editor/figureAlign";
import { SVG_NS } from "@/components/unified/figure-editor/figureSvgEditing";

/**
 * 오른쪽 칸 «정렬»·«간격» — 원장님 2026-09-21 «요소별 각종 정렬 기능 넣어줄 수 있으면 넣어줘.
 * 왼쪽 정렬, 가운데 정렬, 우측 정렬, 중앙 정렬 등등».
 * 회전·대칭 줄과 같은 자리·같은 꼴이다. 되돌리기 한 걸음 = 한 번 맞추기, 맞춘 뒤에도 선택은 그대로.
 * 하나만 골랐으면 흐리다.
 */
vi.mock(
  "@/components/unified/figure-editor/figureTypeset",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/components/unified/figure-editor/figureTypeset")
      >();
    // MathJax 는 이 시험의 관심이 아니다 — 원문 그대로 돌려준다.
    return { ...actual, typesetFigureSvg: async (source: string) => source };
  },
);

const crop = "data:image/png;base64,b3JpZ2luYWw=";
// 사각 셋 — A [10,10]~[50,30] · B [100,100]~[160,140] · C [300,200]~[340,240]
const figure =
  `<svg xmlns="${SVG_NS}" viewBox="0 0 480 360">` +
  `<rect x="10" y="10" width="40" height="20" stroke="#111" fill="none"/>` +
  `<rect x="100" y="100" width="60" height="40" stroke="#111" fill="none"/>` +
  `<rect x="300" y="200" width="40" height="40" stroke="#111" fill="none"/>` +
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
  Object.defineProperty(SVGElement.prototype, "getScreenCTM", {
    configurable: true,
    value: () => identity,
  });
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value: () => ({ x: 10, y: 10, width: 40, height: 20 }),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function open(initialSvg = figure, onSave = vi.fn()) {
  render(
    <StudioFigureEditor
      image={crop}
      initialSvg={initialSvg}
      index={0}
      onSave={onSave}
      onClose={vi.fn()}
    />,
  );
  return onSave;
}
const canvas = () => document.querySelector("#figure-editor-canvas")!;
const alignRow = () => screen.queryByRole("region", { name: "정렬" });
const spreadRow = () => screen.queryByRole("region", { name: "간격" });
const alignButton = (name: string) =>
  within(alignRow()!).getByRole("button", { name });
const spreadButton = (name: string) =>
  within(spreadRow()!).getByRole("button", { name });
const pickNumber = (n: number, shiftKey = false) =>
  fireEvent.click(document.querySelector(`[data-figure-list-number="${n}"]`)!, {
    shiftKey,
  });
const pick = (...list: number[]) =>
  list.forEach((n, i) => pickNumber(n, i > 0));
const rects = () =>
  [...canvas().querySelectorAll("rect")].map((r) =>
    ["x", "y"].map((n) => Number(r.getAttribute(n))),
  );

describe("정렬 줄 — 회전·대칭 줄 곁", () => {
  it("아무것도 안 고르면 줄이 없다", () => {
    open();
    expect(alignRow()).toBeNull();
    expect(spreadRow()).toBeNull();
  });
  it("하나만 고르면 여섯 단추가 다 흐리고 이유를 단다", () => {
    open();
    pickNumber(1);
    for (const name of [
      "왼쪽",
      "가로 가운데",
      "오른쪽",
      "위",
      "세로 가운데",
      "아래",
    ]) {
      expect(alignButton(name)).toBeDisabled();
      expect(alignButton(name)).toHaveAttribute("title", ALIGN_BLOCKED.few);
    }
    expect(within(alignRow()!).getByText(ALIGN_BLOCKED.few)).toBeVisible();
    expect(spreadButton("가로 고르게")).toBeDisabled();
    expect(within(spreadRow()!).getByText(SPREAD_BLOCKED.few)).toBeVisible();
  });
  it("둘을 고르면 왼쪽 맞추기가 좌표를 그 자리에 적는다 — 선택은 그대로", () => {
    open();
    pick(1, 2);
    expect(alignButton("왼쪽")).toBeEnabled();
    fireEvent.click(alignButton("왼쪽"));
    expect(rects()).toEqual([
      [10, 10],
      [10, 100],
      [300, 200],
    ]);
    expect(canvas().querySelectorAll("rect")[1].getAttribute("transform")).toBe(
      null,
    );
    expect(screen.getByText(/2개 선택/)).toBeInTheDocument();
  });
  it("여섯 방향이 저마다 다르게 맞춘다", () => {
    open();
    pick(1, 2);
    fireEvent.click(alignButton("아래"));
    // 바깥 상자의 밑은 140 — A 가 120 으로 내려온다
    expect(rects()[0]).toEqual([10, 120]);
    fireEvent.click(screen.getByRole("button", { name: /되돌리기/ }));
    // 되돌리면 선택이 풀린다 — 다시 고르고 다른 방향으로
    pick(1, 2);
    fireEvent.click(alignButton("가로 가운데"));
    // 바깥 상자 가운데 x 85 — A(가운데 30) 는 65, B(가운데 130) 는 55
    expect(rects().slice(0, 2)).toEqual([
      [65, 10],
      [55, 100],
    ]);
  });
  it("되돌리기 한 걸음 = 한 번 맞추기 · 이미 맞아 있으면 걸음이 안 생긴다", () => {
    open();
    pick(1, 2);
    fireEvent.click(alignButton("왼쪽"));
    fireEvent.click(alignButton("왼쪽"));
    fireEvent.click(screen.getByRole("button", { name: /되돌리기/ }));
    expect(rects()[1]).toEqual([100, 100]);
    expect(screen.getByRole("button", { name: /되돌리기/ })).toBeDisabled();
  });
  it("셋을 고르면 «간격»이 열리고 가운데만 옮겨 사이를 같게 한다", () => {
    open();
    pick(1, 2, 3);
    expect(spreadButton("가로 고르게")).toBeEnabled();
    fireEvent.click(spreadButton("가로 고르게"));
    // 첫 오른쪽 50 ~ 끝 왼쪽 300 사이 250, 가운데 폭 60 → 간격 95 → 가운데 왼쪽 145
    expect(rects()).toEqual([
      [10, 10],
      [145, 100],
      [300, 200],
    ]);
  });
  it("맞춘 자리가 적용본에 남는다", async () => {
    const onSave = open();
    pick(1, 2);
    fireEvent.click(alignButton("위"));
    fireEvent.click(screen.getByRole("button", { name: "도형 적용" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    const saved = onSave.mock.calls[0][0] as StudioFigureSaveResult;
    expect(saved.svg).toContain('y="10"');
  });
});

describe("정렬 — 크기 고정 · 면", () => {
  it("크기 고정 요소가 섞여도 흐려지지 않는다 — 고정은 «이동만 가능»이다", () => {
    open(
      `<svg xmlns="${SVG_NS}" viewBox="0 0 480 360">` +
        `<rect x="10" y="10" width="40" height="20" stroke="#111" fill="none"/>` +
        `<rect x="100" y="100" width="60" height="40" data-size-locked="true" stroke="#111" fill="none"/>` +
        `</svg>`,
    );
    pick(1, 2);
    expect(alignButton("왼쪽")).toBeEnabled();
    fireEvent.click(alignButton("왼쪽"));
    expect(rects()).toEqual([
      [10, 10],
      [10, 100],
    ]);
    // 크기는 그대로
    expect(canvas().querySelectorAll("rect")[1].getAttribute("width")).toBe(
      "60",
    );
  });
});
