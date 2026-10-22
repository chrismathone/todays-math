import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudioFigureEditor, {
  type StudioFigureSaveResult,
} from "@/components/unified/figure-editor";
import { SVG_NS } from "@/components/unified/figure-editor/figureSvgEditing";
import { openFigureDetails } from "@/__tests__/helpers/figureEditorPanel";

/**
 * 오른쪽 칸 «다 보이게» — 원장님 2026-09-20. 그림을 손으로 끌어 틀 밖으로 내보내면 편집 화면에서만 잘린다
 * (점 C 와 선 끝이 잘림). 끌 때마다 자동으로 넓히지 않고(그러면 그림이 야금야금 작아진다) **단추 하나**로 한다.
 *
 * 못 박을 성질: 누른 뒤의 틀 = **저장한 틀**(`renderFittedFigure` 한 함수) · 되돌리기 한 걸음 ·
 * 이미 맞으면 아무 일도 안 함(되돌리기 자리도 안 생김) · 요소는 그대로(글자 크기·선 굵기가 안 바뀐다).
 */
vi.mock(
  "@/components/unified/figure-editor/figureTypeset",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/components/unified/figure-editor/figureTypeset")
      >();
    // MathJax 는 이 시험의 관심이 아니다 — 틀은 아래 getBBox 가 정한다.
    return { ...actual, typesetFigureSvg: async (source: string) => source };
  },
);

const crop = "data:image/png;base64,b3JpZ2luYWw=";
const figure =
  `<svg xmlns="${SVG_NS}" viewBox="0 0 480 360" width="480" height="360">` +
  `<line x1="20" y1="30" x2="80" y2="90" stroke="#111111" stroke-width="2"/>` +
  `<rect x="100" y="40" width="60" height="30" stroke="#111111" fill="none"/>` +
  `<text x="400" y="100" font-size="18" data-mj="C">C</text>` +
  `</svg>`;
/** 점 하나를 끌어 밖으로 내보낸 모습 — 화면이 재는 실제 경계가 틀 밖이다. */
const outside = { x: -30, y: -10, width: 540, height: 400 };
let box = outside;

beforeEach(() => {
  box = outside;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value: () => box,
  });
});

it("줄인 틀을 여백으로 다시 넓혀도 도형 좌표와 굵기는 그대로다", async () => {
  open();
  openFigureDetails();
  const before = canvas().querySelector("line")!.outerHTML;
  fireEvent.click(screen.getByRole("button", { name: "전체 넓히기" }));
  await waitFor(() => expect(canvas().querySelector("svg")).toHaveAttribute("viewBox", "-20 -20 520 400"));
  expect(canvas().querySelector("line")!.outerHTML).toBe(before);
  fireEvent.click(screen.getByRole("button", { name: "가로 넓히기" }));
  await waitFor(() => expect(canvas().querySelector("svg")).toHaveAttribute("viewBox", "-40 -20 560 400"));
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
const canvasSvg = () => canvas().querySelector("svg")!;
const viewBoxOf = () =>
  canvasSvg()
    .getAttribute("viewBox")!
    .trim()
    .split(/[\s,]+/)
    .map(Number);
// «다 보이게»는 오른쪽 칸 «틀 · 세부» 무리에 있고, 그 무리는 처음에 접혀 있다(원장님 2026-09-21 «안 D»).
const fitButton = () => {
  openFigureDetails();
  return screen.getByRole("button", { name: "다 보이게" });
};
const undoButton = () => screen.getByRole("button", { name: /되돌리기/ });
const press = async () => {
  fireEvent.click(fitButton());
  await waitFor(() => expect(fitButton()).toBeEnabled());
};
/** 요소의 서식 — 틀만 바뀌었는지 본다. */
const formats = () =>
  [...canvasSvg().querySelectorAll("line,rect,text")].map((node) =>
    ["stroke-width", "font-size", "x1", "x", "width"]
      .map((name) => `${name}=${node.getAttribute(name)}`)
      .join(" "),
  );

describe("오른쪽 칸 «다 보이게»", () => {
  it("고른 것이 없어도 선다 — 틀은 선택과 무관하다", () => {
    open();
    expect(fitButton()).toBeEnabled();
    expect(screen.getByRole("region", { name: "틀" })).toBeInTheDocument();
  });

  it("누르면 틀 밖으로 나간 것이 다 들어온다 — 여백은 저장할 때와 같은 규칙", async () => {
    open();
    expect(viewBoxOf()).toEqual([0, 0, 480, 360]);
    await press();
    // 여백 = max(10, 큰 변 540*0.04 = 21.6) = 21.6
    const [x, y, w, h] = viewBoxOf();
    expect(x).toBeCloseTo(-51.6, 6);
    expect(y).toBeCloseTo(-31.6, 6);
    expect(w).toBeCloseTo(583.2, 6);
    expect(h).toBeCloseTo(443.2, 6);
    // 그림 전체가 틀 안이다
    expect(x).toBeLessThanOrEqual(box.x);
    expect(y).toBeLessThanOrEqual(box.y);
    expect(x + w).toBeGreaterThanOrEqual(box.x + box.width);
    expect(y + h).toBeGreaterThanOrEqual(box.y + box.height);
  });

  it("누른 뒤의 틀 = 저장한 틀 — «눌러 본 모습»과 «저장한 모습»이 같다", async () => {
    const onSave = open();
    await press();
    const shown = canvasSvg().getAttribute("viewBox");
    fireEvent.click(screen.getByRole("button", { name: "이미지 저장" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    const saved = (onSave.mock.calls[0][0] as StudioFigureSaveResult).svg;
    expect(
      new DOMParser()
        .parseFromString(saved, "image/svg+xml")
        .documentElement.getAttribute("viewBox"),
    ).toBe(shown);
  });

  it("되돌리기 한 걸음이면 원래 틀로 — 두 번 눌러도 걸음은 하나", async () => {
    open();
    expect(undoButton()).toBeDisabled();
    await press();
    expect(undoButton()).toBeEnabled();
    // 이미 맞았으니 두 번째 누름은 아무 일도 안 한다 — 되돌리기 자리도 안 만든다
    const fitted = canvasSvg().getAttribute("viewBox");
    await press();
    expect(canvasSvg().getAttribute("viewBox")).toBe(fitted);
    fireEvent.click(undoButton());
    expect(viewBoxOf()).toEqual([0, 0, 480, 360]);
    expect(undoButton()).toBeDisabled();
  });

  it("틀만 바뀐다 — 글자 크기·선 굵기·요소 값은 그대로", async () => {
    open();
    const before = formats();
    await press();
    expect(formats()).toEqual(before);
    expect(canvas().querySelectorAll("line,rect,text")).toHaveLength(3);
  });

  it("크기 고정 요소가 있어도 맞춘다 — 틀만 바꾸니 막을 이유가 없다", async () => {
    open(figure.replace("<line ", `<line data-size-locked="true" `));
    await press();
    expect(viewBoxOf()[0]).toBeCloseTo(-51.6, 6);
    expect(canvasSvg().querySelector("line")).toHaveAttribute(
      "data-size-locked",
      "true",
    );
  });
});
