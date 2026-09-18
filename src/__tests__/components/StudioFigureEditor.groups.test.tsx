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

/**
 * 요소 목록 — 역할로 묶고, 사용자가 묶음을 만들 수 있다(원장님 2026-09-18
 * «요소목록을 스마트하게 그룹화» → «역할별로 묶고 사용자 커스텀도 가능하게»).
 */
const crop = "data:image/png;base64,b3JpZ2luYWw=";
// x축(선+화살촉) · y축(선+화살촉) · 눈금 둘 · 그래프 선 둘 · 눈금 숫자 하나
const figure =
  `<svg xmlns="${SVG_NS}" viewBox="0 0 480 300">` +
  `<line x1="60" y1="250" x2="430" y2="250" stroke="#111"/>` +
  `<polygon points="430,246 439,250 430,254" fill="#111"/>` +
  `<line x1="60" y1="250" x2="60" y2="40" stroke="#111"/>` +
  `<polygon points="56,40 60,31 64,40" fill="#111"/>` +
  `<line x1="160" y1="245" x2="160" y2="255" stroke="#111"/>` +
  `<line x1="260" y1="245" x2="260" y2="255" stroke="#111"/>` +
  `<line x1="60" y1="250" x2="160" y2="160" stroke="#111"/>` +
  `<line x1="160" y1="160" x2="260" y2="100" stroke="#111"/>` +
  `<text x="150" y="276" data-mj="30">30</text>` +
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
    value: () => ({ x: 20, y: 30, width: 60, height: 60 }),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function open(onSave = vi.fn()) {
  render(
    <StudioFigureEditor
      image={crop}
      initialSvg={figure}
      index={0}
      onSave={onSave}
      onClose={vi.fn()}
    />,
  );
  return onSave;
}
const list = () =>
  within(screen.getByRole("region", { name: "도형 요소 목록" }));
const groupNames = () =>
  list()
    .getAllByRole("group")
    .map((g) => g.getAttribute("aria-label"));
const group = (name: string) =>
  list().getByRole("group", { name: `${name} 묶음` });
const chipNumbers = (name: string) =>
  within(group(name))
    .queryAllByRole("button")
    .flatMap((b) => b.getAttribute("data-figure-list-number") ?? []);
const chip = (n: number) =>
  document.querySelector<HTMLElement>(`[data-figure-list-number="${n}"]`)!;

describe("요소 목록 — 역할 묶음", () => {
  it("축·눈금·그래프·눈금 숫자로 묶어 보인다", () => {
    open();
    expect(groupNames()).toEqual([
      "x축 묶음",
      "y축 묶음",
      "눈금 묶음",
      "그래프 묶음",
      "눈금 숫자 묶음",
    ]);
    expect(chipNumbers("x축")).toEqual(["1", "2"]);
    expect(chipNumbers("그래프")).toEqual(["7", "8"]);
  });
  it("묶음 이름을 누르면 그 요소가 모두 선택되고, Shift 로 다른 묶음을 더한다", () => {
    open();
    fireEvent.click(
      within(group("눈금")).getByRole("button", { name: "눈금 2개" }),
    );
    expect(chip(5)).toHaveAttribute("aria-pressed", "true");
    expect(chip(6)).toHaveAttribute("aria-pressed", "true");
    expect(chip(7)).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(
      within(group("그래프")).getByRole("button", { name: "그래프 2개" }),
      { shiftKey: true },
    );
    expect(screen.getByText(/4개 선택/)).toBeInTheDocument();
  });
  it("묶음을 접으면 요소 단추가 숨는다", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "눈금 접기" }));
    expect(chipNumbers("눈금")).toEqual([]);
    expect(screen.getByRole("button", { name: "눈금 펼치기" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});

describe("요소 목록 — 사용자 묶음", () => {
  it("선택을 묶음으로 만들고 이름을 붙이면 적용본에 남는다 · 되돌리기로 없어진다", async () => {
    const onSave = open();
    expect(screen.getByRole("button", { name: "묶음 만들기" })).toBeDisabled();
    fireEvent.click(chip(7));
    fireEvent.click(chip(8), { shiftKey: true });
    fireEvent.click(screen.getByRole("button", { name: "묶음 만들기" }));
    const input = screen.getByRole("textbox", { name: "묶음 1 묶음 이름" });
    fireEvent.change(input, { target: { value: "오르막" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(groupNames()[0]).toBe("오르막 묶음");
    expect(chipNumbers("오르막")).toEqual(["7", "8"]);
    expect(screen.queryByRole("group", { name: "그래프 묶음" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /되돌리기/ }));
    expect(screen.queryByRole("group", { name: "오르막 묶음" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /다시 실행/ }));
    fireEvent.click(screen.getByRole("button", { name: "도형 적용" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    const saved = onSave.mock.calls[0][0] as StudioFigureSaveResult;
    expect(saved.svg.match(/data-group="오르막"/g)).toHaveLength(2);
  });
  it("이름 바꾸기에서 Esc 는 이름만 그대로 두고 편집기를 닫지 않는다", () => {
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
    fireEvent.click(chip(7));
    fireEvent.click(screen.getByRole("button", { name: "묶음 만들기" }));
    const input = screen.getByRole("textbox", { name: "묶음 1 묶음 이름" });
    fireEvent.change(input, { target: { value: "바꾸다 만 이름" } });
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.blur(input);
    expect(groupNames()[0]).toBe("묶음 1 묶음");
    expect(onClose).not.toHaveBeenCalled();
  });
  it("선택한 요소를 사용자 묶음에 넣고, 묶음을 풀면 역할 묶음으로 돌아간다", () => {
    open();
    fireEvent.click(chip(7));
    fireEvent.click(screen.getByRole("button", { name: "묶음 만들기" }));
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    fireEvent.click(chip(9));
    fireEvent.click(
      screen.getByRole("button", { name: "선택한 요소를 묶음 1에 넣기" }),
    );
    expect(chipNumbers("묶음 1")).toEqual(["7", "9"]);
    fireEvent.click(screen.getByRole("button", { name: "묶음 1 묶음 풀기" }));
    expect(screen.queryByRole("group", { name: "묶음 1 묶음" })).toBeNull();
    expect(chipNumbers("그래프")).toEqual(["7", "8"]);
    expect(chipNumbers("눈금 숫자")).toEqual(["9"]);
  });
});
