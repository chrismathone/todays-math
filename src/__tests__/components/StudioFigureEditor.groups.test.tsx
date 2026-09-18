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
});

// jsdom 에는 DataTransfer 가 없다 — 끌기에서 쓰는 만큼만.
const transfer = () => ({
  setData: vi.fn(),
  getData: vi.fn(),
  effectAllowed: "",
  dropEffect: "",
});
function dragTo(from: HTMLElement, to: HTMLElement) {
  const dataTransfer = transfer();
  fireEvent.dragStart(from, { dataTransfer });
  fireEvent.dragOver(to, { dataTransfer });
  fireEvent.drop(to, { dataTransfer });
  fireEvent.dragEnd(from, { dataTransfer });
}

describe("요소 목록 — 끌어 옮기기 · 해제 (원장님 2026-09-18)", () => {
  it("요소를 다른 묶음 위로 끌어 놓으면 옮겨지고, 고른 요소는 함께 간다", () => {
    open();
    dragTo(chip(9), group("그래프"));
    expect(chipNumbers("그래프")).toEqual(["7", "8", "9"]);
    expect(list().queryByRole("group", { name: "눈금 숫자 묶음" })).toBeNull();
    fireEvent.click(chip(5));
    fireEvent.click(chip(6), { shiftKey: true });
    dragTo(chip(5), group("x축"));
    expect(chipNumbers("x축")).toEqual(["1", "2", "5", "6"]);
    fireEvent.click(screen.getByRole("button", { name: /되돌리기/ }));
    expect(chipNumbers("눈금")).toEqual(["5", "6"]);
  });
  it("끄는 동안 «묶음 없음» 칸이 서고, 거기 놓으면 묶음 밖으로 간다", () => {
    open();
    const dataTransfer = transfer();
    fireEvent.dragStart(chip(7), { dataTransfer });
    const loose = group("묶음 없음");
    expect(
      within(loose).getByText("여기에 놓으면 묶음 밖으로"),
    ).toBeInTheDocument();
    fireEvent.dragOver(loose, { dataTransfer });
    fireEvent.drop(loose, { dataTransfer });
    expect(chipNumbers("묶음 없음")).toEqual(["7"]);
    expect(chipNumbers("그래프")).toEqual(["8"]);
  });
  it("어느 묶음이든 고르면 해제할 수 있고, 해제하면 전부 묶음 밖으로 — «자동 묶기»로 돌아온다", () => {
    open();
    expect(screen.queryByRole("button", { name: "눈금 묶음 해제" })).toBeNull();
    fireEvent.click(
      within(group("눈금")).getByRole("button", { name: "눈금 2개" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "눈금 묶음 해제" }));
    expect(list().queryByRole("group", { name: "눈금 묶음" })).toBeNull();
    expect(groupNames().at(-1)).toBe("묶음 없음 묶음");
    expect(chipNumbers("묶음 없음")).toEqual(["5", "6"]);
    fireEvent.click(
      within(group("묶음 없음")).getByRole("button", { name: "묶음 없음 2개" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "묶음 없는 요소 자동 묶기" }),
    );
    expect(chipNumbers("눈금")).toEqual(["5", "6"]);
    expect(list().queryByRole("group", { name: "묶음 없음 묶음" })).toBeNull();
  });
  it("묶음 이름도 바꿀 수 있다 — 역할 묶음이면 사용자 묶음이 된다", () => {
    open();
    fireEvent.click(
      within(group("그래프")).getByRole("button", { name: "그래프 2개" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "그래프 이름 바꾸기" }));
    const input = screen.getByRole("textbox", { name: "그래프 묶음 이름" });
    fireEvent.change(input, { target: { value: "속력" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(groupNames()[0]).toBe("속력 묶음");
    expect(chipNumbers("속력")).toEqual(["7", "8"]);
  });
});

describe("요소 목록 — 묶음을 고르면 공통 서식 (원장님 2026-09-18)", () => {
  it("선 두께·점선을 고른 요소 모두에 한 번에 — 되돌리기 한 번에 돌아온다", () => {
    open();
    fireEvent.click(
      within(group("그래프")).getByRole("button", { name: "그래프 2개" }),
    );
    const panel = screen.getByRole("region", { name: "선·도형 공통 서식" });
    fireEvent.change(within(panel).getByLabelText("고른 선 두께"), {
      target: { value: "4" },
    });
    const lines = () =>
      [...document.querySelectorAll("#figure-editor-canvas line")].slice(4, 6);
    expect(lines().map((l) => l.getAttribute("stroke-width"))).toEqual([
      "4",
      "4",
    ]);
    fireEvent.click(within(panel).getByLabelText("고른 선 점선"));
    expect(lines().map((l) => l.getAttribute("stroke-dasharray"))).toEqual([
      "5 4",
      "5 4",
    ]);
    fireEvent.click(screen.getByRole("button", { name: /되돌리기/ }));
    fireEvent.click(screen.getByRole("button", { name: /되돌리기/ }));
    expect(lines().map((l) => l.getAttribute("stroke-width"))).toEqual([
      null,
      null,
    ]);
  });
  it("글자를 고르면 글자 칸 — 크기가 갈리면 «여러 값»", () => {
    open();
    fireEvent.click(chip(9));
    fireEvent.click(chip(7), { shiftKey: true });
    expect(
      screen.getByRole("region", { name: "선·도형 공통 서식" }),
    ).toBeInTheDocument();
    const text = screen.getByRole("region", { name: "글자 공통 서식" });
    fireEvent.change(within(text).getByLabelText("고른 글자 크기"), {
      target: { value: "24" },
    });
    expect(
      document
        .querySelector("#figure-editor-canvas text")
        ?.getAttribute("font-size"),
    ).toBe("24");
  });
});
