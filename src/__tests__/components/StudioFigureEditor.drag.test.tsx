import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudioFigureEditor from "@/components/unified/figure-editor";
import { SVG_NS } from "@/components/unified/figure-editor/figureSvgEditing";

/**
 * 끄는 동안 그림 전체를 다시 넣지 않는다. 전에는 한 걸음마다 SVG 를 innerHTML 로 통째로 갈고(조판이 풀려
 * 라벨이 원문으로 바뀌었다) 번호·목록까지 새로 그려, dev 에서 한 걸음에 110ms 가 걸렸다
 * (원장님 2026-09-18 «부드럽게 움직여지지않고 프레임이 엄청 끊기네»).
 */
vi.mock(
  "@/components/unified/figure-editor/figureTypeset",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/components/unified/figure-editor/figureTypeset")
      >();
    // MathJax 대신 — 글을 조판본처럼 <g> 로 바꾼다(아이디·transform 은 실제와 같이 옮긴다).
    const typesetFigureSvg = async (source: string) => {
      const doc = new DOMParser().parseFromString(source, "image/svg+xml");
      for (const node of [...doc.querySelectorAll("text")]) {
        const wrapper = doc.createElementNS(SVG_NS, "g");
        wrapper.setAttribute("data-typeset", "");
        for (const name of ["data-object-id", "transform"])
          if (node.hasAttribute(name))
            wrapper.setAttribute(name, node.getAttribute(name)!);
        wrapper.append(doc.createElementNS(SVG_NS, "path"));
        node.replaceWith(wrapper);
      }
      return new XMLSerializer().serializeToString(doc.documentElement);
    };
    return { ...actual, typesetFigureSvg };
  },
);

// 번호 배치를 세려고 — 끄는 동안은 전부 재배치(layoutFigureNumbers)하지 않고 끄는 요소의 지시선만(retargetFigureNumbers) 옮긴다.
vi.mock(
  "@/components/unified/figure-editor/figureObjectNumbers",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/components/unified/figure-editor/figureObjectNumbers")
      >();
    return {
      ...actual,
      layoutFigureNumbers: vi.fn(actual.layoutFigureNumbers),
      retargetFigureNumbers: vi.fn(actual.retargetFigureNumbers),
    };
  },
);
import * as figureNumbers from "@/components/unified/figure-editor/figureObjectNumbers";

const crop = "data:image/png;base64,b3JpZ2luYWw=";
const figure = `<svg xmlns="${SVG_NS}" viewBox="0 0 480 360"><line x1="20" y1="30" x2="80" y2="90" stroke="#111111"/><line x1="100" y1="30" x2="160" y2="90" stroke="#111111"/><text x="200" y="100" font-size="18" data-mj="$y(\\mathrm{m/sec})$">y(\\mathrm{m/sec})</text></svg>`;
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

const canvas = () => document.querySelector("#figure-editor-canvas")!;
const surface = () => screen.getByLabelText("도형 편집 캔버스");
async function openTypeset(onSave = vi.fn()) {
  render(
    <StudioFigureEditor
      image={crop}
      initialSvg={figure}
      index={0}
      onSave={onSave}
      onClose={vi.fn()}
    />,
  );
  await waitFor(() =>
    expect(canvas().querySelector("[data-typeset]")).not.toBeNull(),
  );
  return onSave;
}
function dragFirstLine(steps: number[]) {
  const [first, second] = canvas().querySelectorAll("line");
  fireEvent.pointerDown(first, { button: 0, clientX: 50, clientY: 60 });
  for (const x of steps)
    fireEvent.pointerMove(surface(), { clientX: x, clientY: 60 });
  return { first, second };
}

describe("도형 편집기 — 그림을 다시 넣지 않는다", () => {
  it("요소를 고르거나 AI 요청을 적는 것으로는 그림을 다시 넣지 않는다", async () => {
    render(
      <StudioFigureEditor
        image={crop}
        originalImage={crop}
        initialSvg={figure}
        index={0}
        onSave={vi.fn()}
        onClose={vi.fn()}
        onRedraw={vi.fn()}
      />,
    );
    await waitFor(() =>
      expect(canvas().querySelector("[data-typeset]")).not.toBeNull(),
    );
    const line = canvas().querySelector("line")!;
    fireEvent.click(document.querySelector('[data-figure-list-number="2"]')!);
    fireEvent.change(screen.getByLabelText("도형 AI 수정 요청"), {
      target: { value: "눈금을 지워 주세요" },
    });
    expect(line.isConnected).toBe(true);
  });
});

describe("도형 편집기 — 끄는 동안", () => {
  it("끄는 요소만 고치고 다른 요소는 그대로 둔다", async () => {
    await openTypeset();
    const { first, second } = dragFirstLine([60, 70, 80]);
    expect(second.isConnected).toBe(true);
    expect(first.isConnected).toBe(true);
    expect(first.getAttribute("transform")).toMatch(/^translate\(30 0\)/);
  });
  it("조판한 라벨이 끄는 동안에도, 놓은 직후에도 원문으로 돌아가지 않는다", async () => {
    await openTypeset();
    dragFirstLine([60, 70, 80]);
    expect(canvas().querySelectorAll("text")).toHaveLength(0);
    fireEvent.pointerUp(surface());
    expect(canvas().querySelectorAll("text")).toHaveLength(0);
    expect(canvas().querySelector("line")!.getAttribute("transform")).toMatch(
      /^translate\(30 0\)/,
    );
  });
  it("놓은 자리가 적용본에 남는다", async () => {
    const onSave = await openTypeset();
    dragFirstLine([60, 90]);
    fireEvent.pointerUp(surface());
    fireEvent.click(screen.getByRole("button", { name: "도형 적용" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0][0].svg).toContain("translate(40 0)");
  });
  it("끌기가 취소되면 화면도 제자리로 돌아온다", async () => {
    await openTypeset();
    dragFirstLine([60, 70]);
    fireEvent.pointerCancel(surface());
    expect(canvas().querySelector("line")!.hasAttribute("transform")).toBe(
      false,
    );
  });
  it("번호는 끄는 요소의 지시선만 옮기고, 놓은 뒤 한 번 다시 배치한다", async () => {
    await openTypeset();
    const layout = vi.mocked(figureNumbers.layoutFigureNumbers);
    const retarget = vi.mocked(figureNumbers.retargetFigureNumbers);
    layout.mockClear();
    retarget.mockClear();
    dragFirstLine([60, 70, 80]);
    expect(layout).not.toHaveBeenCalled();
    expect(retarget).toHaveBeenCalledTimes(3);
    for (const call of retarget.mock.calls) expect(call[2]).toEqual(["obj-0"]);
    fireEvent.pointerUp(surface());
    expect(layout).toHaveBeenCalledTimes(1);
  });
  it("새로 그리는 선은 한 개만 보인다 — 걸음마다 쌓이지 않는다", async () => {
    await openTypeset();
    fireEvent.click(screen.getByRole("button", { name: "선분" }));
    fireEvent.pointerDown(canvas(), { button: 0, clientX: 25, clientY: 35 });
    for (const x of [60, 90, 120])
      fireEvent.pointerMove(surface(), { clientX: x, clientY: 165 });
    expect(canvas().querySelectorAll("line")).toHaveLength(3);
    fireEvent.pointerUp(surface());
    expect(canvas().querySelectorAll("line")).toHaveLength(3);
    expect(canvas().querySelectorAll("line")[2].getAttribute("x2")).toBe("120");
  });
});
