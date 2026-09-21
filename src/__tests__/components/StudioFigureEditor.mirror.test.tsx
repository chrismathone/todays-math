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
import { MIRROR_BLOCKED } from "@/components/unified/figure-editor/figureMirror";
import { SVG_NS } from "@/components/unified/figure-editor/figureSvgEditing";
import { openFigureDetails } from "@/__tests__/helpers/figureEditorPanel";

/**
 * 오른쪽 칸 «좌우 대칭»·«상하 대칭» — 원장님 2026-09-20 «대칭(편집기 단추도)».
 * 회전 줄 바로 밑, 선택한 요소·여러 요소·묶음 칸 모두에 선다. 고른 것 전체가 한 덩어리로 비친다.
 * 되돌리기 한 걸음 = 한 번 대칭, 비춘 뒤에도 선택은 그대로. 크기 고정이 섞이면 꺼지고 이유를 단다.
 * («반대쪽으로 뒤집기»는 곡선 하나를 제 현에 대해 비추는 다른 기능이다 — 줄이 따로 선다.)
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
const figure = `<svg xmlns="${SVG_NS}" viewBox="0 0 480 360"><line x1="20" y1="30" x2="80" y2="90" stroke="#111111"/><rect x="100" y="40" width="60" height="30" stroke="#111111" fill="none"/><text x="400" y="100" font-size="18" data-mj="A">A</text></svg>`;
// 눈금 두 개가 «눈금» 묶음으로 선다(요소 목록 역할 묶음)
const graph =
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
const surface = () => screen.getByLabelText("도형 편집 캔버스");
const pickNumber = (n: number) =>
  fireEvent.click(document.querySelector(`[data-figure-list-number="${n}"]`)!);
const mirrorRow = () => screen.queryByRole("region", { name: "대칭" });
const leftRight = () =>
  within(mirrorRow()!).getByRole("button", { name: "좌우 대칭" });
const upDown = () =>
  within(mirrorRow()!).getByRole("button", { name: "상하 대칭" });
const undoButton = () => screen.getByRole("button", { name: /되돌리기/ });
const coords = (node: Element, names: string[]) =>
  names.map((name) => node.getAttribute(name));
const selectAll = () => {
  surface().focus();
  fireEvent.keyDown(surface(), { key: "a", ctrlKey: true });
};

describe("대칭 — 선택한 요소 칸", () => {
  it("아무것도 안 고르면 단추가 없다", () => {
    open();
    expect(mirrorRow()).toBeNull();
  });

  it("선분을 고르면 두 단추가 서고, 좌우 대칭은 제 가운데 세로선에 비춘다 — 선택은 그대로", () => {
    open();
    pickNumber(1);
    expect(leftRight()).toBeEnabled();
    expect(upDown()).toBeEnabled();
    fireEvent.click(leftRight());
    // 가운데 x = 50 → x′ = 100 − x
    const line = canvas().querySelector("line")!;
    expect(coords(line, ["x1", "y1", "x2", "y2"])).toEqual([
      "80",
      "30",
      "20",
      "90",
    ]);
    expect(line.getAttribute("transform")).toBeNull();
    expect(screen.getByText("1 · 선분 편집")).toBeInTheDocument();
    expect(mirrorRow()).not.toBeNull();
  });

  it("상하 대칭은 가로선에 비춘다", () => {
    open();
    pickNumber(1);
    fireEvent.click(upDown());
    // 가운데 y = 60 → y′ = 120 − y
    expect(
      coords(canvas().querySelector("line")!, ["x1", "y1", "x2", "y2"]),
    ).toEqual(["20", "90", "80", "30"]);
  });

  it("두 번 누르면 제자리로 온다", () => {
    open();
    pickNumber(1);
    fireEvent.click(leftRight());
    fireEvent.click(leftRight());
    expect(
      coords(canvas().querySelector("line")!, ["x1", "y1", "x2", "y2"]),
    ).toEqual(["20", "30", "80", "90"]);
  });

  it("사각형은 폭·높이가 그대로고 정밀 수치 칸도 그대로다", () => {
    open();
    pickNumber(2);
    fireEvent.click(leftRight());
    const rect = canvas().querySelector("rect")!;
    expect(coords(rect, ["x", "y", "width", "height"])).toEqual([
      "100",
      "40",
      "60",
      "30",
    ]);
    openFigureDetails();
    expect(screen.getByRole("spinbutton", { name: "너비" })).toHaveValue(60);
    expect(screen.getByRole("spinbutton", { name: "높이" })).toHaveValue(30);
  });

  it("되돌리기 한 걸음 = 한 번 대칭 — Ctrl+Z 도 같다", () => {
    open();
    pickNumber(1);
    fireEvent.click(leftRight());
    fireEvent.click(upDown());
    const line = () => canvas().querySelector("line")!;
    expect(coords(line(), ["x1", "y1", "x2", "y2"])).toEqual([
      "80",
      "90",
      "20",
      "30",
    ]);
    surface().focus();
    fireEvent.keyDown(surface(), { key: "z", ctrlKey: true });
    expect(coords(line(), ["x1", "y1", "x2", "y2"])).toEqual([
      "80",
      "30",
      "20",
      "90",
    ]);
    fireEvent.click(undoButton());
    expect(coords(line(), ["x1", "y1", "x2", "y2"])).toEqual([
      "20",
      "30",
      "80",
      "90",
    ]);
    expect(undoButton()).toBeDisabled();
  });

  it("글자 하나만 고르면 꺼진다 — 축이 그 글자를 지나 옮길 것이 없다", () => {
    open();
    pickNumber(3);
    expect(leftRight()).toBeDisabled();
    expect(upDown()).toBeDisabled();
    expect(leftRight()).toHaveAttribute("title", MIRROR_BLOCKED.text);
    expect(within(mirrorRow()!).getByText(MIRROR_BLOCKED.text)).toBeVisible();
  });
});

describe("대칭 — 여러 요소·묶음 칸", () => {
  it("여럿을 고르면 한 덩어리로 비친다 — 글자는 회전 없이 자리만 옮긴다", async () => {
    const onSave = open();
    selectAll();
    expect(screen.getByText("3개 요소 선택")).toBeInTheDocument();
    fireEvent.click(leftRight());
    const text = canvas().querySelector("text")!;
    expect(text.getAttribute("transform")).toMatch(
      /^translate\([-\d.]+ [-\d.]+\)$/,
    );
    expect(text.getAttribute("x")).toBe("400");
    // 선택은 그대로
    expect(screen.getByText("3개 요소 선택")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "도형 적용" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    const saved = (onSave.mock.calls[0][0] as StudioFigureSaveResult).svg;
    expect(saved).not.toMatch(/rotate\(|matrix\(|scale\(/);
  });

  it("묶음을 고르면 묶음 줄 아래에 단추가 서고, 묶음이 한 덩어리로 비친다", () => {
    open(graph);
    const list = within(screen.getByRole("region", { name: "도형 요소 목록" }));
    fireEvent.click(list.getByRole("button", { name: "눈금 2개" }));
    expect(screen.getByRole("region", { name: "묶음" })).toBeInTheDocument();
    fireEvent.click(leftRight());
    // 두 눈금의 상자 가운데 x = 210 → x′ = 420 − x (세로 눈금이라 서로 자리를 바꾼다)
    const [first, second] = [
      ...canvas().querySelectorAll(
        'line[data-object-id="obj-4"], line[data-object-id="obj-5"]',
      ),
    ];
    expect(coords(first, ["x1", "y1", "x2", "y2"])).toEqual([
      "260",
      "245",
      "260",
      "255",
    ]);
    expect(coords(second, ["x1", "y1", "x2", "y2"])).toEqual([
      "160",
      "245",
      "160",
      "255",
    ]);
  });

  it("회전 줄 바로 밑에 선다 — «반대쪽으로 뒤집기»와는 다른 줄이다", () => {
    open();
    pickNumber(1);
    const rows = [...document.querySelectorAll("section[aria-label]")].map(
      (node) => node.getAttribute("aria-label"),
    );
    expect(rows.indexOf("대칭")).toBe(rows.indexOf("회전") + 1);
    expect(
      screen.queryByRole("button", { name: "반대쪽으로 뒤집기" }),
    ).toBeNull();
  });
});

describe("대칭 — 크기 고정", () => {
  const locked = `<svg xmlns="${SVG_NS}" viewBox="0 0 480 360"><line x1="20" y1="30" x2="80" y2="90" stroke="#111111"/><rect x="100" y="40" width="60" height="30" stroke="#111111" fill="none" data-size-locked="true"/></svg>`;

  it("크기 고정한 요소를 고르면 꺼지고 이유가 붙는다", () => {
    open(locked);
    pickNumber(2);
    expect(leftRight()).toBeDisabled();
    expect(leftRight()).toHaveAttribute("title", MIRROR_BLOCKED.locked);
    expect(within(mirrorRow()!).getByText(MIRROR_BLOCKED.locked)).toBeVisible();
  });

  it("고정이 섞인 여럿도 꺼진다", () => {
    open(locked);
    selectAll();
    expect(leftRight()).toBeDisabled();
    expect(upDown()).toBeDisabled();
  });
});

// 원장님 2026-09-19 «틀을 넓혀 다 보이게» — 회전과 같은 한 함수(figureFrame.ts)를 대칭도 쓴다.
describe("대칭 — 틀 넓히기", () => {
  const frame = () => canvas().querySelector("svg")!.getAttribute("viewBox");

  it("도형만 고르면 틀은 그대로다 — 제 상자 안에서 비치니 넘칠 것이 없다", () => {
    open();
    pickNumber(1);
    fireEvent.click(leftRight());
    expect(frame()).toBe("0 0 480 360");
    fireEvent.click(upDown());
    expect(frame()).toBe("0 0 480 360");
  });

  it("도형에서 멀리 떨어진 글자는 비추면 틀 밖으로 나간다 — 조판한 상자로 넓히고 되돌리기 한 걸음에 돌아온다", () => {
    // 글자 상자는 화면에서 잰다 — 요소마다 제 x·y 둘레로 잰 상자를 돌려준다
    Object.defineProperty(SVGElement.prototype, "getBBox", {
      configurable: true,
      value(this: SVGElement) {
        const at = (name: string) => Number(this.getAttribute(name) ?? 0);
        return { x: at("x") - 6, y: at("y") - 12, width: 12, height: 16 };
      },
    });
    open(
      `<svg xmlns="${SVG_NS}" viewBox="0 0 480 360"><line x1="20" y1="50" x2="80" y2="50" stroke="#111111"/><text x="400" y="100" font-size="18" data-mj="A">A</text></svg>`,
    );
    expect(frame()).toBe("0 0 480 360");
    selectAll();
    fireEvent.click(leftRight());
    // 도형 상자 x 20…80(가운데 50) → x′ = 100 − x. 글자 가운데 400 → −300, 반폭 6, 여백 6
    expect(frame()).toBe("-312 0 792 360");
    fireEvent.click(undoButton());
    expect(frame()).toBe("0 0 480 360");
  });
});
