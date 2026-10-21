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
  // jsdom 에는 SVGGeometryElement 가 없고 상자도 늘 0 이다 — 그림 위 번호표가 서도록 캔버스 크기를 준다.
  vi.stubGlobal("SVGGeometryElement", class {});
  Object.defineProperty(SVGElement.prototype, "getBoundingClientRect", {
    configurable: true,
    value: () => ({ x: 0, y: 0, width: 480, height: 300, toJSON: () => ({}) }),
  });
  for (const [name, value] of [
    ["clientWidth", 480],
    ["clientHeight", 300],
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
/** 오른쪽 칸의 묶음 줄 — 한 묶음 전부를 골랐을 때만 선다(원장님 2026-09-19 «우측에서 그룹 이름과 해제 설정»). */
const groupRow = () => screen.queryByRole("region", { name: "묶음" });
const buttonCounts = () =>
  list()
    .getAllByRole("group")
    .map((g) => within(g).getAllByRole("button").length);

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
    const input = screen.getByRole("textbox", { name: "A 묶음 이름" });
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
    fireEvent.click(chip(8), { shiftKey: true });
    fireEvent.click(screen.getByRole("button", { name: "묶음 만들기" }));
    const input = screen.getByRole("textbox", { name: "A 묶음 이름" });
    fireEvent.change(input, { target: { value: "바꾸다 만 이름" } });
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.blur(input);
    expect(groupNames()[0]).toBe("A 묶음");
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
    fireEvent.click(
      within(groupRow()!).getByRole("button", { name: "눈금 묶음 해제" }),
    );
    expect(list().queryByRole("group", { name: "눈금 묶음" })).toBeNull();
    expect(groupNames().at(-1)).toBe("묶음 없음 묶음");
    expect(chipNumbers("묶음 없음")).toEqual(["5", "6"]);
    fireEvent.click(
      within(group("묶음 없음")).getByRole("button", { name: "묶음 없음 2개" }),
    );
    // «묶음 없음»을 통째로 고르면 이름 칸 없이 «자동 묶기»만
    expect(within(groupRow()!).queryByRole("textbox")).toBeNull();
    fireEvent.click(
      within(groupRow()!).getByRole("button", {
        name: "묶음 없는 요소 자동 묶기",
      }),
    );
    expect(chipNumbers("눈금")).toEqual(["5", "6"]);
    expect(list().queryByRole("group", { name: "묶음 없음 묶음" })).toBeNull();
  });
  it("묶음 이름도 바꿀 수 있다 — 역할 묶음이면 사용자 묶음이 된다", () => {
    open();
    fireEvent.click(
      within(group("그래프")).getByRole("button", { name: "그래프 2개" }),
    );
    const input = within(groupRow()!).getByRole("textbox", {
      name: "그래프 묶음 이름",
    });
    fireEvent.change(input, { target: { value: "속력" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(groupNames()[0]).toBe("속력 묶음");
    expect(chipNumbers("속력")).toEqual(["7", "8"]);
    fireEvent.click(screen.getByRole("button", { name: /되돌리기/ }));
    expect(groupNames()).toContain("그래프 묶음");
  });
  it("포커스가 빠지면 이름이 확정되고, 이름을 비우면 그대로 둔다", () => {
    open();
    fireEvent.click(
      within(group("그래프")).getByRole("button", { name: "그래프 2개" }),
    );
    const input = within(groupRow()!).getByRole("textbox", {
      name: "그래프 묶음 이름",
    });
    fireEvent.change(input, { target: { value: "  " } });
    fireEvent.blur(input);
    expect(groupNames()).toContain("그래프 묶음");
    fireEvent.change(
      within(groupRow()!).getByRole("textbox", { name: "그래프 묶음 이름" }),
      { target: { value: "속력" } },
    );
    fireEvent.blur(
      within(groupRow()!).getByRole("textbox", { name: "그래프 묶음 이름" }),
    );
    expect(groupNames()[0]).toBe("속력 묶음");
  });
});

describe("요소 목록 — 고를 때 줄바꿈이 바뀌지 않는다 (원장님 2026-09-19)", () => {
  it("묶음을 골라도 묶음 상자 안 단추 수가 그대로 — 이름·해제는 목록에 서지 않는다", () => {
    open();
    const before = buttonCounts();
    for (const [name, size] of [
      ["x축", 2],
      ["눈금", 2],
      ["그래프", 2],
      ["눈금 숫자", 1],
    ] as const) {
      fireEvent.click(
        within(group(name)).getByRole("button", { name: `${name} ${size}개` }),
      );
      expect(buttonCounts(), name).toEqual(before);
      expect(list().queryByRole("textbox")).toBeNull();
      expect(list().queryByText("해제")).toBeNull();
      expect(list().queryByText("이름")).toBeNull();
    }
  });

  it("한 묶음 전부를 고르면 오른쪽 칸에 «묶음 이름» 칸과 «묶음 해제»", () => {
    open();
    expect(groupRow()).toBeNull();
    fireEvent.click(
      within(group("눈금")).getByRole("button", { name: "눈금 2개" }),
    );
    const row = groupRow()!;
    expect(within(row).getByText("묶음 이름")).toBeInTheDocument();
    expect(
      within(row).getByRole("textbox", { name: "눈금 묶음 이름" }),
    ).toHaveValue("눈금");
    expect(
      within(row).getByRole("button", { name: "눈금 묶음 해제" }),
    ).toHaveTextContent("묶음 해제");
  });

  it("한 묶음의 일부나 여러 묶음에 걸치면 묶음 줄이 없다", () => {
    open();
    fireEvent.click(chip(7));
    expect(groupRow()).toBeNull();
    fireEvent.click(
      within(group("그래프")).getByRole("button", { name: "그래프 2개" }),
    );
    expect(groupRow()).not.toBeNull();
    fireEvent.click(
      within(group("눈금")).getByRole("button", { name: "눈금 2개" }),
      { shiftKey: true },
    );
    expect(groupRow()).toBeNull();
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

/**
 * 각 표시는 «각» 묶음, 요소 이름은 직각·예각·둔각 — 이름이 나오는 **모든 자리**에서 같다(원장님 2026-09-19
 * «기존의 각들은 다 각으로 묶어. 직각 둔각 예각.» · «항상 모든 화면이 일치하도록 맞춰야 사용자 경험이 상승함»).
 * 도형 엔진 v2 실출력: 삼각형 변 셋(1~3) · ∠A 예각 호(4) · ∠B 둔각 두 겹 호(5·6) · ∠C 예각 호(7) · ∠B 직각 아님.
 */
const angleFigure =
  `<svg viewBox="0 0 289.9 209.9" xmlns="${SVG_NS}">` +
  `<line x1="34.95" y1="174.95" x2="154.95" y2="174.95" stroke="#111111" stroke-width="1.9" />` +
  `<line x1="154.95" y1="174.95" x2="254.95" y2="34.95" stroke="#111111" stroke-width="1.9" />` +
  `<line x1="254.95" y1="34.95" x2="34.95" y2="174.95" stroke="#111111" stroke-width="1.9" />` +
  `<path d="M 57.0 174.9 A 22.0 22.0 0 0 0 53.5 163.1" fill="none" stroke="#111111" stroke-width="0.72" />` +
  `<path d="M 132.9 174.9 A 22.0 22.0 0 0 1 167.7 157.0" fill="none" stroke="#111111" stroke-width="0.72" />` +
  `<path d="M 135.9 174.9 A 19.0 19.0 0 0 1 166.0 159.5" fill="none" stroke="#111111" stroke-width="0.72" />` +
  `<path d="M 236.4 46.8 A 22.0 22.0 0 0 0 242.2 52.9" fill="none" stroke="#111111" stroke-width="0.72" />` +
  `<text x="88" y="165" font-size="16.8" data-mj="34°">34°</text>` +
  `<text x="24" y="180" font-size="16.8" data-mj="A">A</text>` +
  `</svg>`;
// 엔진 v2 직각삼각형(v2_example) — 4번이 직각 표시(ㄱ자)
const rightFigure =
  `<svg viewBox="0 0 305.997 241.186" xmlns="${SVG_NS}">` +
  `<line x1="37.208" y1="26.236" x2="37.208" y2="206.236" stroke="#111111" stroke-width="1.9" />` +
  `<line x1="37.208" y1="206.236" x2="277.208" y2="206.236" stroke="#111111" stroke-width="1.9" />` +
  `<line x1="277.208" y1="206.236" x2="37.208" y2="26.236" stroke="#111111" stroke-width="1.9" />` +
  `<path d="M 37.208 194.136 L 49.308 194.136 L 49.308 206.236" fill="none" stroke="#111111" stroke-width="0.72" />` +
  `<text x="29.6" y="24" font-size="16.8" data-mj="A">A</text>` +
  `</svg>`;
function openFigure(svg: string) {
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
const chipText = (n: number) => chip(n).textContent;
/** 오른쪽 칸 제목 — «n · 이름 편집» */
const heading = () =>
  screen.getByRole("heading", { name: /^\d+ · .+ 편집$/ }).textContent ?? "";

describe("각 표시 — «각» 묶음 · 직각/예각/둔각이 모든 자리에서 같다 (원장님 2026-09-19)", () => {
  it("요소 목록: 각 표시는 «각» 묶음, 단추에는 각의 종류", () => {
    openFigure(angleFigure);
    expect(groupNames()).toEqual(["선분 묶음", "각 묶음", "글자 묶음"]);
    expect(chipNumbers("각")).toEqual(["4", "5", "6", "7"]);
    expect([4, 5, 6, 7].map(chipText)).toEqual([
      "4예각",
      "5둔각",
      "6둔각",
      "7예각",
    ]);
    expect(chip(5)).toHaveAttribute("title", "둔각 · 끌어서 다른 묶음으로");
  });
  it("모두 직각이어도 단추에 «직각» — 묶음 이름 «각»은 종류를 말하지 않는다", () => {
    openFigure(rightFigure);
    expect(groupNames()).toEqual(["선분 묶음", "각 묶음", "글자 묶음"]);
    expect(chipText(4)).toBe("4직각");
    // 다른 묶음은 지금처럼 — 모두 같은 종류면 번호만
    expect(chipText(1)).toBe("1");
  });
  it("오른쪽 칸 제목도 같은 이름 — «5 · 둔각 편집»", () => {
    openFigure(angleFigure);
    fireEvent.click(chip(5));
    expect(heading()).toBe("5 · 둔각 편집");
    fireEvent.click(chip(4));
    expect(heading()).toBe("4 · 예각 편집");
    fireEvent.click(chip(1));
    expect(heading()).toBe("1 · 선분 편집");
    fireEvent.click(chip(8));
    expect(heading()).toBe("8 · 글자 편집");
  });
  it("수식 라벨도 목록과 제목이 같은 이름 — 전에는 목록 «수식», 제목 «글자 편집»이었다", () => {
    openFigure(
      rightFigure.replace(
        '<text x="29.6" y="24" font-size="16.8" data-mj="A">A</text>',
        '<text x="29.6" y="24" font-size="16.8" data-mj="$x^2$">x2</text>',
      ),
    );
    expect(chip(5)).toHaveAttribute("title", "수식 x^2 · 끌어서 다른 묶음으로");
    fireEvent.click(chip(5));
    expect(heading()).toBe("5 · 수식 편집");
  });
  it("«각» 묶음 전부를 고르면 오른쪽 칸 묶음 이름도 «각»", () => {
    openFigure(angleFigure);
    fireEvent.click(
      within(group("각")).getByRole("button", { name: "각 4개" }),
    );
    expect(
      within(groupRow()!).getByRole("textbox", { name: "각 묶음 이름" }),
    ).toHaveValue("각");
  });
});

/**
 * 원장님 2026-09-21 넷 — ⑴ «Ctrl+G 그룹화, Ctrl+Shift+G 그룹 해제 (ppt 명령어)»
 * ⑵ «그룹화되면 번호를 하나로 합치게» ⑶ «그룹 순서대로 A 그룹, B 그룹, C 그룹».
 */
const press = (key: string, init: KeyboardEventInit = {}) =>
  fireEvent.keyDown(document.activeElement ?? document.body, {
    key,
    ctrlKey: true,
    ...init,
  });
/** 그림 둘레의 번호표 — 묶음은 하나뿐이다. */
const tags = () =>
  [...document.querySelectorAll<SVGGElement>("[data-figure-number]")].map(
    (g) => [g.getAttribute("data-figure-number"), g.getAttribute("aria-label")],
  );
/** 한 번호표에서 나가는 지시선 수. */
const leaders = (number: number) =>
  document
    .querySelector(`[data-figure-number="${number}"]`)!
    .parentElement!.querySelectorAll("line").length;
/** 표의 «모양» — 클래스 이름이 아니라 실제로 그려진 도형 요소로 잰다(2026-09-16 교훈). */
const tagShape = (number: number) => {
  const tag = document.querySelector(`[data-figure-number="${number}"]`)!;
  if (tag.querySelector("rect")) return "네모";
  if (tag.querySelector("circle")) return "동그라미";
  return "없음";
};
const tagGlyph = (number: number) =>
  document.querySelector(`[data-figure-number="${number}"] text`)?.textContent;
const tagFace = (number: number) => {
  const tag = document.querySelector(`[data-figure-number="${number}"]`)!;
  const face = tag.querySelector("rect") ?? tag.querySelector("circle")!;
  const ink = tag.querySelector("text")!;
  return {
    fill: face.getAttribute("fill"),
    stroke: face.getAttribute("stroke"),
    font: (ink as SVGElement).style.font,
    ink: (ink as SVGElement).style.fill,
  };
};

describe("단축키 — Ctrl+G 묶기 · Ctrl+Shift+G 묶음 해제 (원장님 2026-09-21)", () => {
  it("Ctrl+G 로 묶고 Ctrl+Shift+G 로 푼다 — 되돌리기는 각각 한 걸음", () => {
    open();
    fireEvent.click(chip(7));
    fireEvent.click(chip(8), { shiftKey: true });
    press("g");
    expect(groupNames()[0]).toBe("A 묶음");
    expect(chipNumbers("A")).toEqual(["7", "8"]);
    press("g", { shiftKey: true });
    expect(list().queryByRole("group", { name: "A 묶음" })).toBeNull();
    expect(chipNumbers("그래프")).toEqual(["7", "8"]);
    fireEvent.click(screen.getByRole("button", { name: /되돌리기/ }));
    expect(chipNumbers("A")).toEqual(["7", "8"]);
    fireEvent.click(screen.getByRole("button", { name: /되돌리기/ }));
    expect(list().queryByRole("group", { name: "A 묶음" })).toBeNull();
    expect(chipNumbers("그래프")).toEqual(["7", "8"]);
  });
  it("Ctrl+G 뒤 초점이 캔버스로 온다 — 이어지는 단축키가 먹는다", () => {
    open();
    // 실제 브라우저에서는 요소 단추를 누르면 그 단추가 초점을 갖는다. 묶으면 목록이 다시 그려져
    // 그 단추가 사라지고 초점이 <body> 로 떨어져, 이어 누른 Ctrl+Shift+G 가 걸러졌다(2026-09-21 실측).
    chip(7).focus();
    fireEvent.click(chip(7));
    fireEvent.click(chip(8), { shiftKey: true });
    press("g");
    expect(document.activeElement).toBe(
      screen.getByLabelText("도형 편집 캔버스"),
    );
    expect(
      within(groupRow()!).getByRole("textbox", { name: "A 묶음 이름" }),
    ).not.toBe(document.activeElement);
    press("g", { shiftKey: true });
    expect(list().queryByRole("group", { name: "A 묶음" })).toBeNull();
  });
  it("고른 것이 하나뿐이거나 없으면 아무 일도 안 한다", () => {
    open();
    press("g");
    expect(groupNames()[0]).toBe("x축 묶음");
    fireEvent.click(chip(7));
    press("g");
    expect(list().queryByRole("group", { name: "A 묶음" })).toBeNull();
    expect(screen.getByRole("button", { name: "묶음 만들기" })).toBeDisabled();
    // 묶음에 안 든 요소를 풀어도 되돌릴 것이 생기지 않는다
    fireEvent.click(chip(8), { shiftKey: true });
    press("g", { shiftKey: true });
    expect(screen.getByRole("button", { name: /되돌리기/ })).toBeDisabled();
  });
  it("글자 칸에서는 안 먹는다 — 묶음 이름을 치는 중에 Ctrl+G 를 눌러도", () => {
    open();
    fireEvent.click(chip(7));
    fireEvent.click(chip(8), { shiftKey: true });
    fireEvent.click(screen.getByRole("button", { name: "묶음 만들기" }));
    const input = within(groupRow()!).getByRole("textbox", {
      name: "A 묶음 이름",
    });
    fireEvent.keyDown(input, { key: "g", ctrlKey: true, shiftKey: true });
    expect(chipNumbers("A")).toEqual(["7", "8"]);
  });
  it("브라우저 기본 동작(크롬 «찾기 다음»)을 막는다", () => {
    open();
    fireEvent.click(chip(7));
    fireEvent.click(chip(8), { shiftKey: true });
    const event = new KeyboardEvent("keydown", {
      key: "g",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});

describe("묶음 이름 A·B·C · 번호표 하나 (원장님 2026-09-21)", () => {
  const groupTwo = (a: number, b: number) => {
    fireEvent.click(chip(a));
    fireEvent.click(chip(b), { shiftKey: true });
    press("g");
  };
  const rename = (from: string, to: string) => {
    fireEvent.click(
      within(group(from)).getByRole("button", { name: `${from} 2개` }),
    );
    const input = within(groupRow()!).getByRole("textbox", {
      name: `${from} 묶음 이름`,
    });
    fireEvent.change(input, { target: { value: to } });
    fireEvent.keyDown(input, { key: "Enter" });
  };

  // 원장님 2026-09-21 «그렇게해» — 자동 이름은 **목록 차례**(위에서부터 A·B·C)를 따른다.
  it("나중에 묶어도 목록에서 위에 있으면 A 가 된다", () => {
    open();
    groupTwo(7, 8);
    expect(groupNames()[0]).toBe("A 묶음");
    // 5·6 은 목록에서 7·8 보다 위다 — 나중에 묶어도 이쪽이 A, 7·8 이 B 로 밀린다
    groupTwo(5, 6);
    expect(groupNames().slice(0, 2)).toEqual(["A 묶음", "B 묶음"]);
    expect(chipNumbers("A")).toEqual(["5", "6"]);
    expect(chipNumbers("B")).toEqual(["7", "8"]);
  });

  it("손수 지은 이름은 안 바뀌고 그 자리를 건너뛴다", () => {
    open();
    groupTwo(5, 6);
    groupTwo(7, 8);
    rename("A", "오르막");
    // 남은 자동 묶음(7·8)이 A 로 촘촘해지고, 손수 이름은 글자 차례에서 빠진다
    expect(groupNames().slice(0, 2)).toEqual(["오르막 묶음", "A 묶음"]);
    expect(chipNumbers("A")).toEqual(["7", "8"]);
    // 맨 위에 새 묶음을 만들어도 손수 이름은 그대로 — 새것이 A, 7·8 이 B
    groupTwo(1, 2);
    expect(groupNames().slice(0, 3)).toEqual([
      "A 묶음",
      "오르막 묶음",
      "B 묶음",
    ]);
    expect(chipNumbers("A")).toEqual(["1", "2"]);
    expect(chipNumbers("오르막")).toEqual(["5", "6"]);
    expect(chipNumbers("B")).toEqual(["7", "8"]);
  });

  it("묶음 하나를 풀면 남은 것들이 다시 A 부터 촘촘해진다", () => {
    open();
    groupTwo(1, 2);
    groupTwo(5, 6);
    groupTwo(7, 8);
    expect(groupNames().slice(0, 3)).toEqual(["A 묶음", "B 묶음", "C 묶음"]);
    // 가운데(B = 5·6)를 풀면 아랫것이 B 로 올라온다
    fireEvent.click(within(group("B")).getByRole("button", { name: "B 2개" }));
    press("g", { shiftKey: true });
    expect(groupNames().slice(0, 2)).toEqual(["A 묶음", "B 묶음"]);
    expect(chipNumbers("B")).toEqual(["7", "8"]);
    expect(chipNumbers("눈금")).toEqual(["5", "6"]);
    // 되돌리기는 한 걸음 — 이름 다시 매기기까지 같이 돌아온다
    fireEvent.click(screen.getByRole("button", { name: /되돌리기/ }));
    expect(groupNames().slice(0, 3)).toEqual(["A 묶음", "B 묶음", "C 묶음"]);
    expect(chipNumbers("B")).toEqual(["5", "6"]);
  });
  it("묶으면 번호표가 하나로 합쳐지고 묶음 지시선은 사라진다", async () => {
    open();
    await waitFor(() => expect(tags()).toHaveLength(9));

    expect(tags().length).toBe(9);
    fireEvent.click(chip(7));
    fireEvent.click(chip(8), { shiftKey: true });
    press("g");
    const after = tags();
    expect(after.length).toBe(8);
    expect(after.map(([n]) => n)).not.toContain("8");
    expect(after).toContainEqual(["7", "A 묶음 선택"]);
    expect(leaders(7)).toBe(0);
    expect(leaders(1)).toBe(1);
  });
  it("합친 번호표를 누르면 묶음 전체가 선택된다", async () => {
    open();
    await waitFor(() => expect(tags()).toHaveLength(9));

    fireEvent.click(chip(7));
    fireEvent.click(chip(8), { shiftKey: true });
    press("g");
    fireEvent.click(chip(1));
    expect(screen.getByText(/1개 선택/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "A 묶음 선택" }));
    expect(screen.getByText(/2개 선택/)).toBeInTheDocument();
    expect(within(groupRow()!).getByRole("textbox")).toHaveValue("A");
  });
});

/**
 * 묶음 표는 **네모**, 요소 표는 **동그라미** — 원장님 2026-09-21
 * «그룹은 요소와 차별성을 둬서 네모 A 로 하든지. 그게 나을지도.»
 * 모양만으로 갈리고, 크기·글자 크기·색은 기존 번호표 토큰을 그대로 쓴다(새 시안이 아니다, D-07).
 */
describe("묶음 표는 네모 · 요소 표는 동그라미 (원장님 2026-09-21)", () => {
  const groupTwo = (a: number, b: number) => {
    fireEvent.click(chip(a));
    fireEvent.click(chip(b), { shiftKey: true });
    press("g");
  };

  it("묶으면 그 표만 네모가 되고 글자는 묶음 이름이다", async () => {
    open();
    await waitFor(() => expect(tags()).toHaveLength(9));

    expect(tagShape(1)).toBe("동그라미");
    expect(tagGlyph(1)).toBe("1");
    groupTwo(7, 8);
    expect(tagShape(7)).toBe("네모");
    expect(tagGlyph(7)).toBe("A");
    // 요소 표는 그대로 동그라미에 숫자
    expect(tagShape(1)).toBe("동그라미");
    expect(tagGlyph(1)).toBe("1");
    // 묶음은 이동 사각형으로 표시하고 지시선은 그리지 않는다.
    expect(leaders(7)).toBe(0);
  });

  it("네모와 동그라미가 같은 색·같은 글자를 쓴다 — 모양만 다르다", async () => {
    open();
    await waitFor(() => expect(tags()).toHaveLength(9));

    groupTwo(7, 8);
    // 둘 다 안 고른 상태로 견준다(고르면 둘 다 진해진다 — 아래 시험)
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "Escape",
    });
    const box = tagFace(7),
      dot = tagFace(1);
    expect(box.fill).toBe(dot.fill);
    expect(box.stroke).toBe(dot.stroke);
    expect(box.font).toBe(dot.font);
    expect(box.ink).toBe(dot.ink);
    expect(box.font).toContain("11px");
  });

  it("고르면 네모도 동그라미와 같이 진해진다", async () => {
    open();
    await waitFor(() => expect(tags()).toHaveLength(9));

    groupTwo(7, 8);
    // 묶은 직후는 그 묶음이 골라져 있다 — 다른 것을 골라 풀고 나서 네모를 누른다
    fireEvent.click(chip(1));
    const off = tagFace(7).fill;
    expect(off).toBe("var(--figure-accent-soft)");
    fireEvent.click(screen.getByRole("button", { name: "A 묶음 선택" }));
    expect(tagFace(7).fill).not.toBe(off);
    expect(tagFace(7).fill).toBe("var(--figure-primary)");
  });

  it("손수 지은 긴 이름은 첫 글자만 — 전체 이름은 읽는 이름과 마우스 올림에", async () => {
    open();
    await waitFor(() => expect(tags()).toHaveLength(9));

    groupTwo(7, 8);
    fireEvent.click(within(group("A")).getByRole("button", { name: "A 2개" }));
    const input = within(groupRow()!).getByRole("textbox", {
      name: "A 묶음 이름",
    });
    fireEvent.change(input, { target: { value: "오르막" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(tagShape(7)).toBe("네모");
    expect(tagGlyph(7)).toBe("오");
    expect(
      screen.getByRole("button", { name: "오르막 묶음 선택" }),
    ).toBeInTheDocument();
    expect(
      document.querySelector(`[data-figure-number="7"] title`)?.textContent,
    ).toBe("오르막 묶음");
  });

  // Z 를 다 쓴 그림은 만들기 어렵다 — 이미 «AA» 로 저장된 옛 그림을 여는 자리로 같은 것을 본다
  // (여는 것만으로는 다시 매기지 않는다 — 묶음을 건드릴 때만 매긴다).
  it("두 글자 이름(AA)은 그대로 들어간다", async () => {
    openFigure(
      figure.replace(
        /<line x1="60" y1="250" x2="160" y2="160"([^/]*)\/>/,
        '<line x1="60" y1="250" x2="160" y2="160"$1 data-group="AA"/>',
      ),
    );

    await waitFor(() => expect(tags()).toHaveLength(9));
    expect(tagGlyph(7)).toBe("AA");
    expect(tagShape(7)).toBe("네모");
  });
});
