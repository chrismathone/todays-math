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
import { ROTATE_BLOCKED } from "@/components/unified/figure-editor/figureRotate";
import { SVG_NS } from "@/components/unified/figure-editor/figureSvgEditing";
import { openFigureDetails } from "@/__tests__/helpers/figureEditorPanel";

/**
 * 오른쪽 칸 «반시계 90°»·«시계 90°»·«180도 회전».
 * 선택한 요소·여러 요소·묶음 칸 모두에 선다. 되돌리기 한 걸음 = 한 번 회전, 돈 뒤에도 선택은 그대로.
 * 크기 고정 요소가 섞이면 단추가 꺼지고 짧은 이유를 단다.
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
const rotateRow = () => screen.queryByRole("region", { name: "회전" });
const cw = () => within(rotateRow()!).getByRole("button", { name: "시계 90°" });
const ccw = () =>
  within(rotateRow()!).getByRole("button", { name: "반시계 90°" });
const half = () =>
  within(rotateRow()!).getByRole("button", { name: "180도 회전" });
const undoButton = () => screen.getByRole("button", { name: /되돌리기/ });
const coords = (node: Element, names: string[]) =>
  names.map((name) => node.getAttribute(name));
const selectAll = () => {
  surface().focus();
  fireEvent.keyDown(surface(), { key: "a", ctrlKey: true });
};

describe("90° 회전 — 선택한 요소 칸", () => {
  it("요소 목록 단추에서 삭제해도 캔버스에 초점을 남겨 단축키로 복원한다", () => {
    open();
    pickNumber(1);
    const button = document.querySelector<HTMLButtonElement>('[data-figure-list-number="1"]')!;
    button.focus();
    fireEvent.keyDown(button, { key: "Delete" });
    expect(canvas().querySelector("line")).toBeNull();
    expect(surface()).toHaveFocus();
    fireEvent.keyDown(surface(), { key: "z", ctrlKey: true });
    expect(canvas().querySelector("line")).not.toBeNull();
  });

  it("회전 상세 단추에서 단축키로 되돌려도 초점을 유지해 곧바로 다시 실행한다", () => {
    open();
    pickNumber(1);
    const button = cw();
    button.focus();
    fireEvent.click(button);
    expect(button).toHaveFocus();
    fireEvent.keyDown(button, { key: "z", ctrlKey: true });
    expect(button).not.toBeInTheDocument();
    expect(surface()).toHaveFocus();
    expect(coords(canvas().querySelector("line")!, ["x1", "y1", "x2", "y2"])).toEqual(["20", "30", "80", "90"]);
    fireEvent.keyDown(surface(), { key: "y", ctrlKey: true });
    expect(surface()).toHaveFocus();
    expect(coords(canvas().querySelector("line")!, ["x1", "y1", "x2", "y2"])).toEqual(["80", "30", "20", "90"]);
  });

  it("아무것도 안 고르면 단추가 없다", () => {
    open();
    expect(rotateRow()).toBeNull();
  });

  it("선분을 고르면 세 단추가 서고, 시계 90° 는 선분을 제 가운데로 돌린다 — 선택은 그대로", () => {
    open();
    pickNumber(1);
    expect(ccw()).toBeEnabled();
    expect(cw()).toBeEnabled();
    expect(half()).toBeEnabled();
    fireEvent.click(cw());
    // 가운데 (50, 60): (x, y) → (110 − y, x + 10)
    const line = canvas().querySelector("line")!;
    expect(coords(line, ["x1", "y1", "x2", "y2"])).toEqual([
      "80",
      "30",
      "20",
      "90",
    ]);
    expect(line.getAttribute("transform")).toBeNull();
    expect(screen.getByText("1 · 선분 편집")).toBeInTheDocument();
    expect(rotateRow()).not.toBeNull();
  });

  it("반시계 90° 는 반대로 돈다", () => {
    open();
    pickNumber(1);
    fireEvent.click(ccw());
    // (x, y) → (y − 10, 110 − x)
    expect(
      coords(canvas().querySelector("line")!, ["x1", "y1", "x2", "y2"]),
    ).toEqual(["20", "90", "80", "30"]);
  });

  it("사각형은 폭·높이가 바뀌고, 정밀 수치 칸이 그 값을 보인다", () => {
    open();
    pickNumber(2);
    fireEvent.click(cw());
    const rect = canvas().querySelector("rect")!;
    expect(coords(rect, ["x", "y", "width", "height"])).toEqual([
      "115",
      "25",
      "30",
      "60",
    ]);
    openFigureDetails();
    expect(screen.getByRole("spinbutton", { name: "너비" })).toHaveValue(30);
    expect(screen.getByRole("spinbutton", { name: "높이" })).toHaveValue(60);
  });

  it("되돌리기 한 걸음 = 한 번 회전 — Ctrl+Z 도 같다", () => {
    open();
    pickNumber(1);
    fireEvent.click(cw());
    fireEvent.click(cw());
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

  it("글자 하나만 고르면 꺼진다 — 글자는 기울지 않는다", () => {
    open();
    pickNumber(3);
    expect(cw()).toBeDisabled();
    expect(ccw()).toBeDisabled();
    expect(half()).toBeDisabled();
    expect(cw()).toHaveAttribute("title", ROTATE_BLOCKED.text);
    expect(within(rotateRow()!).getByText(ROTATE_BLOCKED.text)).toBeVisible();
  });
});

describe("90° 회전 — 여러 요소·묶음 칸", () => {
  it("여럿을 고르면 한 덩어리로 돈다 — 글자는 회전각 없이 자리만 옮긴다", async () => {
    const onSave = open();
    selectAll();
    expect(screen.getByText("3개 요소 선택")).toBeInTheDocument();
    fireEvent.click(cw());
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
    expect(saved).not.toMatch(/rotate\(|matrix\(/);
  });

  it("묶음을 고르면 묶음 줄 아래에 단추가 서고, 묶음이 한 덩어리로 돈다", () => {
    open(graph);
    const list = within(screen.getByRole("region", { name: "도형 요소 목록" }));
    fireEvent.click(list.getByRole("button", { name: "눈금 2개" }));
    expect(screen.getByRole("region", { name: "묶음" })).toBeInTheDocument();
    fireEvent.click(ccw());
    // 두 눈금의 상자 가운데 (210, 250): (x, y) → (y − 40, 460 − x)
    const [first, second] = [
      ...canvas().querySelectorAll(
        'line[data-object-id="obj-4"], line[data-object-id="obj-5"]',
      ),
    ];
    expect(coords(first, ["x1", "y1", "x2", "y2"])).toEqual([
      "205",
      "300",
      "215",
      "300",
    ]);
    expect(coords(second, ["x1", "y1", "x2", "y2"])).toEqual([
      "205",
      "200",
      "215",
      "200",
    ]);
  });
});

// 원장님 2026-09-19 «틀을 넓혀 다 보이게» — 편집기는 그림 틀만 보여 준다. 돈 것이 틀 밖이면 넘친 쪽만 넓힌다.
describe("90° 회전 — 틀 넓히기", () => {
  const frame = () => canvas().querySelector("svg")!.getAttribute("viewBox");

  it("돈 것이 틀 밖으로 나가면 틀을 넓혀 다 보인다 — 되돌리기 한 걸음에 틀도 돌아온다", () => {
    open(
      `<svg xmlns="${SVG_NS}" viewBox="0 0 400 100"><line x1="20" y1="50" x2="380" y2="50" stroke="#111111"/></svg>`,
    );
    expect(frame()).toBe("0 0 400 100");
    pickNumber(1);
    fireEvent.click(cw());
    expect(frame()).toBe("0 -136 400 372");
    fireEvent.click(undoButton());
    expect(frame()).toBe("0 0 400 100");
    expect(
      coords(canvas().querySelector("line")!, ["x1", "y1", "x2", "y2"]),
    ).toEqual(["20", "50", "380", "50"]);
  });

  it("틀 안에서 돌면 틀은 그대로다", () => {
    open();
    pickNumber(1);
    fireEvent.click(cw());
    expect(frame()).toBe("0 0 480 360");
  });
});

describe("180도 회전", () => {
  const DIM =
    'fill="none" stroke="#111111" stroke-width="0.72" stroke-dasharray="5 3" stroke-linecap="round"';
  // 1·2 선분(꼭짓점 (40, 200)) · 3 치수 곡선 · 4 값 «10» · 5 각 표시 · 6 곧은 경로 · 7 꺾은선
  const dimension =
    `<svg xmlns="${SVG_NS}" viewBox="0 0 300 240">` +
    `<line x1="40" y1="200" x2="240" y2="200" stroke="#111111"/>` +
    `<line x1="40" y1="200" x2="140" y2="40" stroke="#111111"/>` +
    `<path d="M 40 150 Q 100 120 240 150" ${DIM}/>` +
    `<text x="140" y="129.376" font-size="16.8" text-anchor="middle" fill="#111111" data-mj="10">10</text>` +
    `<path d="M 62 200 A 22 22 0 0 0 51.66 181.34" fill="none" stroke="#111111" stroke-width="0.72"/>` +
    `<path d="M 20 20 L 60 20 L 100 20" fill="none" stroke="#111111"/>` +
    `<polyline points="160 230 200 215 240 230" fill="none" stroke="#111111"/>` +
    `</svg>`;
  const curve = () => canvas().querySelector('[data-object-id="obj-2"]')!;
  const value = () => canvas().querySelector('[data-object-id="obj-3"]')!;

  it("곡선·선분·여럿 선택에서 회전 줄에 선다 — 대칭 줄이나 뒤집기 줄에는 없다", () => {
    open(dimension);
    pickNumber(3);
    expect(half()).toBeEnabled();
    expect(
      within(screen.getByRole("region", { name: "대칭" })).queryByRole(
        "button",
        { name: "180도 회전" },
      ),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "반대쪽으로 뒤집기" }),
    ).toBeNull();
    expect(screen.queryByRole("region", { name: "뒤집기" })).toBeNull();
    expect(screen.getByRole("button", { name: /^배치/ })).toHaveTextContent(
      "회전 · 대칭 · 정렬 · 간격 · 순서",
    );
    pickNumber(1);
    expect(half()).toBeEnabled();
    pickNumber(4);
    expect(half()).toBeDisabled();
    selectAll();
    expect(half()).toBeEnabled();
  });

  it("곡선은 가운데로 180° 돈다 — 끝점도 돌고, 선택하지 않은 글자는 그대로", () => {
    open(dimension);
    pickNumber(3);
    fireEvent.click(half());
    expect(curve().getAttribute("d")).toBe("M 240 120 Q 180 150 40 120");
    expect(value().getAttribute("transform")).toBeNull();
    expect(screen.queryByText("2개 요소 선택")).toBeNull();
    fireEvent.click(half());
    expect(curve().getAttribute("d")).toBe("M 40 150 Q 100 120 240 150");
  });

  it("180° 회전은 되돌리기 한 걸음 — 다시 실행도 한 걸음", () => {
    open(dimension);
    pickNumber(3);
    fireEvent.click(half());
    expect(curve().getAttribute("d")).toBe("M 240 120 Q 180 150 40 120");
    fireEvent.click(undoButton());
    expect(curve().getAttribute("d")).toBe("M 40 150 Q 100 120 240 150");
    expect(value().getAttribute("transform")).toBeNull();
    expect(undoButton()).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /다시 실행/ }));
    expect(curve().getAttribute("d")).toBe("M 240 120 Q 180 150 40 120");
    fireEvent.click(undoButton());
    expect(undoButton()).toBeDisabled();
  });

  it("꺾은선도 가운데를 두고 돈다", () => {
    open(dimension);
    pickNumber(7);
    fireEvent.click(half());
    expect(
      canvas()
        .querySelector('[data-object-id="obj-6"]')!
        .getAttribute("points"),
    ).toBe("240 215 200 230 160 215");
  });

  it.each([5, 6])("%i번: 각 표시와 곧은 경로도 회전할 수 있다", (n) => {
    open(dimension);
    pickNumber(n);
    expect(half()).toBeEnabled();
    const path = () =>
      canvas().querySelector(`[data-object-id="obj-${n - 1}"]`)!;
    const before = path().getAttribute("d");
    fireEvent.click(half());
    expect(path().getAttribute("d")).not.toBe(before);
  });

  it("크기 고정한 곡선은 끈다", () => {
    open(dimension);
    pickNumber(3);
    openFigureDetails();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "요소 크기 고정 (이동만 가능)" }),
    );
    expect(half()).toBeDisabled();
    expect(half()).toHaveAttribute("title", ROTATE_BLOCKED.locked);
    expect(within(rotateRow()!).getByText(ROTATE_BLOCKED.locked)).toBeVisible();
  });

  it("묶음은 전체 가운데로 돈다 — 각 눈금의 제자리를 중심으로 돌지 않는다", () => {
    open(graph);
    const list = within(screen.getByRole("region", { name: "도형 요소 목록" }));
    fireEvent.click(list.getByRole("button", { name: "눈금 2개" }));
    fireEvent.click(half());
    expect(
      coords(canvas().querySelector('[data-object-id="obj-4"]')!, [
        "x1",
        "y1",
        "x2",
        "y2",
      ]),
    ).toEqual(["260", "255", "260", "245"]);
    expect(
      coords(canvas().querySelector('[data-object-id="obj-5"]')!, [
        "x1",
        "y1",
        "x2",
        "y2",
      ]),
    ).toEqual(["160", "255", "160", "245"]);
    expect(screen.getByRole("region", { name: "묶음" })).toBeInTheDocument();
  });
});

describe("90° 회전 — 크기 고정", () => {
  const lockBox = () => {
    openFigureDetails();
    return screen.getByRole("checkbox", {
      name: "요소 크기 고정 (이동만 가능)",
    });
  };

  it("고정한 요소를 고르면 단추가 꺼지고 이유가 보인다", () => {
    open();
    pickNumber(1);
    fireEvent.click(lockBox());
    expect(cw()).toBeDisabled();
    expect(ccw()).toBeDisabled();
    expect(half()).toBeDisabled();
    expect(cw()).toHaveAttribute("title", ROTATE_BLOCKED.locked);
    expect(within(rotateRow()!).getByText(ROTATE_BLOCKED.locked)).toBeVisible();
  });

  it("여럿 중 하나라도 고정이면 꺼진다 — 풀면 다시 켜진다", () => {
    open();
    pickNumber(1);
    fireEvent.click(lockBox());
    selectAll();
    expect(cw()).toBeDisabled();
    expect(half()).toBeDisabled();
    pickNumber(1);
    fireEvent.click(lockBox());
    selectAll();
    expect(cw()).toBeEnabled();
    expect(half()).toBeEnabled();
  });

  it("«전체 요소 크기 고정»을 켜면 어떤 선택이든 꺼진다", () => {
    open();
    fireEvent.click(
      screen.getByRole("button", { name: "전체 요소 크기 고정 (이동만 가능)" }),
    );
    pickNumber(2);
    expect(cw()).toBeDisabled();
    selectAll();
    expect(cw()).toBeDisabled();
    expect(ccw()).toBeDisabled();
    expect(half()).toBeDisabled();
  });
});
