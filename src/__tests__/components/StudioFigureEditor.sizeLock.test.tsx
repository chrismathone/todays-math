import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudioFigureEditor, {
  type StudioFigureSaveResult,
} from "@/components/unified/figure-editor";
import {
  cleanFigureForSave,
  prepareFigureSvg,
  SVG_NS,
} from "@/components/unified/figure-editor/figureSvgEditing";
import { openFigureDetails } from "@/__tests__/helpers/figureEditorPanel";

/**
 * 요소 크기 고정 (이동만 가능) — 원장님 2026-09-19 «고정된 도형은 이동만 가능하고 수정 불가능»
 * → «요소 크기 고정 (이동만 가능)» → «상단에 전체 요소 크기 고정 토글 추가».
 * 고정한 요소는 통째로 옮기기만 된다. 서식(선 색·두께·점선·채우기)은 바꿀 수 있다. 저장해도 남는다.
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
const figure = `<svg xmlns="${SVG_NS}" viewBox="0 0 480 360"><line x1="20" y1="30" x2="80" y2="90" stroke="#111111"/><rect x="100" y="40" width="60" height="30" stroke="#111111" fill="none"/><circle cx="300" cy="200" r="25" stroke="#111111" fill="none"/><path d="M 200 300 Q 240 260 280 300" stroke="#111111" fill="none"/><text x="400" y="100" font-size="18" data-mj="A">A</text></svg>`;
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
  Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
    configurable: true,
    value: () => {},
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const LOCK = "요소 크기 고정 (이동만 가능)";
const LOCK_ALL = "전체 요소 크기 고정 (이동만 가능)";
const canvas = () => document.querySelector("#figure-editor-canvas")!;
const surface = () => screen.getByLabelText("도형 편집 캔버스");
// 요소 크기 고정은 오른쪽 칸 «틀 · 세부» 무리에 있고, 그 무리는 처음에 접혀 있다(원장님 2026-09-21 «안 D»).
const lockBox = () => {
  openFigureDetails();
  return screen.getByRole("checkbox", { name: LOCK });
};
const lockAll = () => screen.getByRole("button", { name: LOCK_ALL });
const handleKeys = () =>
  [...document.querySelectorAll("[data-figure-handle]")].map((node) =>
    node.getAttribute("data-figure-handle"),
  );
const pickNumber = (n: number) =>
  fireEvent.click(document.querySelector(`[data-figure-list-number="${n}"]`)!);
const lockedIn = (root: ParentNode) =>
  [...root.querySelectorAll('[data-size-locked="true"]')].map(
    (node) => node.localName,
  );
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
async function save(onSave: ReturnType<typeof vi.fn>) {
  fireEvent.click(screen.getByRole("button", { name: "도형 적용" }));
  await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
  return onSave.mock.calls[0][0] as StudioFigureSaveResult;
}

describe("요소 크기 고정 — 오른쪽 칸의 요소별 토글", () => {
  it("요소를 고르면 토글이 꺼진 채 보이고, 켜면 그 요소에만 고정 표시가 붙는다", () => {
    open();
    pickNumber(1);
    expect(lockBox()).not.toBeChecked();
    fireEvent.click(lockBox());
    expect(lockBox()).toBeChecked();
    expect(lockedIn(canvas())).toEqual(["line"]);
  });

  it("고정한 선분은 끝점 조절점이 없고, 끝점 수치 칸도 막혀 값이 안 바뀐다", () => {
    open();
    pickNumber(1);
    expect(handleKeys()).toEqual(["start", "end"]);
    fireEvent.click(lockBox());
    expect(handleKeys()).toEqual([]);
    const endX = screen.getByRole("spinbutton", { name: "끝 X" });
    expect(endX).toBeDisabled();
    // 막힌 칸에 값이 들어와도(자동 입력 등) 모양은 그대로다.
    fireEvent.change(endX, { target: { value: "142" } });
    expect(canvas().querySelector("line")).toHaveAttribute("x2", "80");
  });

  it("고정한 사각형은 너비·높이가 막히고 자리(가로·세로 위치)는 바뀐다", () => {
    open();
    pickNumber(2);
    fireEvent.click(lockBox());
    expect(handleKeys()).toEqual([]);
    expect(screen.getByRole("spinbutton", { name: "너비" })).toBeDisabled();
    expect(screen.getByRole("spinbutton", { name: "높이" })).toBeDisabled();
    const x = screen.getByRole("spinbutton", { name: "가로 위치" });
    expect(x).toBeEnabled();
    fireEvent.change(x, { target: { value: "110" } });
    const rect = canvas().querySelector("rect")!;
    expect(rect).toHaveAttribute("x", "110");
    expect(rect).toHaveAttribute("width", "60");
  });

  it("고정한 원은 중심 이동 점만 남고 반지름 칸이 막힌다", () => {
    open();
    pickNumber(3);
    expect(handleKeys()).toEqual([
      "center",
      "radius-0",
      "radius-1",
      "radius-2",
      "radius-3",
    ]);
    fireEvent.click(lockBox());
    expect(handleKeys()).toEqual(["center"]);
    expect(screen.getByRole("spinbutton", { name: "반지름" })).toBeDisabled();
    expect(screen.getByRole("spinbutton", { name: "중심 X" })).toBeEnabled();
  });

  it("고정한 곡선은 휘어짐 조절점과 좌표 칸이 막힌다", () => {
    open();
    pickNumber(4);
    expect(handleKeys().length).toBeGreaterThan(0);
    fireEvent.click(lockBox());
    expect(handleKeys()).toEqual([]);
    const bend = screen.getByRole("spinbutton", { name: "휘어짐 X" });
    expect(bend).toBeDisabled();
    fireEvent.change(bend, { target: { value: "10" } });
    expect(canvas().querySelector("path")).toHaveAttribute(
      "d",
      "M 200 300 Q 240 260 280 300",
    );
  });

  it("조절점이 없다는 안내로 바뀐다 — 고정한 요소에 «파란색 조절점을 끌어» 라고 하지 않는다", () => {
    open();
    pickNumber(1);
    expect(screen.getByText(/파란색 조절점을 끌어/)).toBeInTheDocument();
    fireEvent.click(lockBox());
    expect(screen.queryByText(/파란색 조절점을 끌어/)).toBeNull();
    expect(screen.getByText(/통째로 이동합니다/)).toBeInTheDocument();
  });

  it("고정한 요소도 몸통을 끌면 통째로 옮겨진다", () => {
    open();
    pickNumber(1);
    fireEvent.click(lockBox());
    const line = canvas().querySelector("line")!;
    fireEvent.pointerDown(line, { button: 0, clientX: 50, clientY: 60 });
    fireEvent.pointerMove(surface(), { clientX: 70, clientY: 75 });
    fireEvent.pointerUp(surface(), { clientX: 70, clientY: 75 });
    const moved = canvas().querySelector("line")!;
    expect(moved.getAttribute("transform")).toMatch(/translate\(20 15\)/);
    expect(moved).toHaveAttribute("x1", "20");
    expect(moved).toHaveAttribute("x2", "80");
    expect(moved).toHaveAttribute("data-size-locked", "true");
  });

  it("고정한 요소도 방향키·미세 이동 단추로 옮겨진다", () => {
    open();
    pickNumber(1);
    fireEvent.click(lockBox());
    fireEvent.click(screen.getByRole("button", { name: "도형 → 미세 이동" }));
    expect(canvas().querySelector("line")!.getAttribute("transform")).toMatch(
      /translate\(1 0\)/,
    );
    surface().focus();
    fireEvent.keyDown(surface(), { key: "ArrowDown" });
    expect(canvas().querySelector("line")!.getAttribute("transform")).toMatch(
      /translate\(0 1\)/,
    );
  });

  it("서식은 고정과 상관없이 바뀐다 — 선 색·두께·점선·채우기", () => {
    open();
    pickNumber(2);
    fireEvent.click(lockBox());
    fireEvent.change(screen.getByLabelText("도형 선 색"), {
      target: { value: "#cc0000" },
    });
    fireEvent.change(
      screen.getByRole("slider", { name: "도형 선 두께 또는 글자 크기" }),
      { target: { value: "3" } },
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "점선" }));
    fireEvent.change(screen.getByLabelText("도형 채우기 색"), {
      target: { value: "#eeeeee" },
    });
    const rect = canvas().querySelector("rect")!;
    expect(rect).toHaveAttribute("stroke", "#cc0000");
    expect(rect).toHaveAttribute("stroke-width", "3");
    expect(rect).toHaveAttribute("stroke-dasharray", "5 4");
    expect(rect).toHaveAttribute("fill", "#eeeeee");
    expect(rect).toHaveAttribute("width", "60");
  });

  it("고정한 글자도 글자 크기·내용은 서식으로 바뀐다", () => {
    open();
    pickNumber(5);
    fireEvent.click(lockBox());
    const size = screen.getByRole("slider", {
      name: "도형 선 두께 또는 글자 크기",
    });
    expect(size).toBeEnabled();
    fireEvent.change(size, { target: { value: "24" } });
    expect(canvas().querySelector("text")).toHaveAttribute("font-size", "24");
  });

  it("고정한 요소도 지울 수 있다", () => {
    open();
    pickNumber(1);
    fireEvent.click(lockBox());
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    expect(canvas().querySelector("line")).toBeNull();
  });

  it("고정한 함수 그래프는 함수식을 다시 적용할 수 없다", () => {
    render(
      <StudioFigureEditor
        image={crop}
        index={0}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "함수" }));
    fireEvent.click(screen.getByRole("button", { name: "그림에 함수 추가" }));
    expect(screen.getByRole("button", { name: "함수식 적용" })).toBeEnabled();
    fireEvent.click(lockBox());
    expect(screen.getByRole("button", { name: "함수식 적용" })).toBeDisabled();
  });

  it("되돌리기·다시 실행이 토글도 되돌린다", () => {
    open();
    pickNumber(1);
    fireEvent.click(lockBox());
    expect(lockedIn(canvas())).toEqual(["line"]);
    fireEvent.click(screen.getByRole("button", { name: /되돌리기/ }));
    expect(lockedIn(canvas())).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: /다시 실행/ }));
    expect(lockedIn(canvas())).toEqual(["line"]);
  });
});

describe("전체 요소 크기 고정 — 위 도구 줄의 토글", () => {
  it("도구 줄에 있고, 켜면 모든 요소가 고정되고 끄면 모두 풀린다", () => {
    open();
    const toolbar = screen.getByRole("toolbar", { name: "도형 편집 도구" });
    expect(toolbar).toContainElement(lockAll());
    expect(lockAll()).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(lockAll());
    expect(lockAll()).toHaveAttribute("aria-pressed", "true");
    expect(lockedIn(canvas())).toEqual([
      "line",
      "rect",
      "circle",
      "path",
      "text",
    ]);
    fireEvent.click(lockAll());
    expect(lockAll()).toHaveAttribute("aria-pressed", "false");
    expect(lockedIn(canvas())).toEqual([]);
  });

  it("일부만 고정이면 «mixed» 이고, 누르면 전부 고정한다", () => {
    open();
    pickNumber(2);
    fireEvent.click(lockBox());
    expect(lockAll()).toHaveAttribute("aria-pressed", "mixed");
    fireEvent.click(lockAll());
    expect(lockAll()).toHaveAttribute("aria-pressed", "true");
    expect(lockedIn(canvas())).toHaveLength(5);
  });

  it("전체 토글이 요소 칸의 토글과 같은 표시를 쓴다", () => {
    open();
    fireEvent.click(lockAll());
    pickNumber(3);
    expect(lockBox()).toBeChecked();
    expect(handleKeys()).toEqual(["center"]);
  });

  it("되돌리기 한 번에 전체 토글이 돌아간다", () => {
    open();
    fireEvent.click(lockAll());
    fireEvent.click(screen.getByRole("button", { name: /되돌리기/ }));
    expect(lockAll()).toHaveAttribute("aria-pressed", "false");
    expect(lockedIn(canvas())).toEqual([]);
  });

  it("요소가 없으면 누를 수 없다", () => {
    render(
      <StudioFigureEditor
        image={crop}
        index={0}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(lockAll()).toBeDisabled();
  });

  it("전체를 고정한 뒤 새로 그린 요소는 풀린 채 생긴다 — 표시는 «mixed»", () => {
    open();
    fireEvent.click(lockAll());
    fireEvent.click(screen.getByRole("button", { name: "선분" }));
    fireEvent.pointerDown(canvas(), { button: 0, clientX: 25, clientY: 35 });
    fireEvent.pointerMove(surface(), { clientX: 145, clientY: 165 });
    fireEvent.pointerUp(surface(), { clientX: 145, clientY: 165 });
    expect(canvas().querySelectorAll("line")).toHaveLength(2);
    expect(lockedIn(canvas())).toHaveLength(5);
    expect(lockAll()).toHaveAttribute("aria-pressed", "mixed");
  });
});

describe("요소 크기 고정 — 저장해도 남는다", () => {
  it("저장한 SVG 에 고정 표시가 남고, 다시 열면 그대로 고정이다", async () => {
    const { view, onSave } = open();
    pickNumber(1);
    fireEvent.click(lockBox());
    const saved = await save(onSave);
    const doc = new DOMParser().parseFromString(saved.svg, "image/svg+xml");
    expect(lockedIn(doc)).toEqual(["line"]);
    expect(saved.svg).not.toContain("data-object-id");
    view.unmount();
    open(saved.svg);
    pickNumber(1);
    expect(lockBox()).toBeChecked();
    expect(handleKeys()).toEqual([]);
    expect(lockAll()).toHaveAttribute("aria-pressed", "mixed");
  });

  it("편집기의 정리기(prepare·clean)가 고정 표시를 지우지 않는다", () => {
    const source = `<svg xmlns="${SVG_NS}" viewBox="0 0 10 10"><line x1="0" y1="0" x2="5" y2="5" data-size-locked="true"/></svg>`;
    expect(prepareFigureSvg(source)).toContain('data-size-locked="true"');
    expect(cleanFigureForSave(source)).toContain('data-size-locked="true"');
  });
});
