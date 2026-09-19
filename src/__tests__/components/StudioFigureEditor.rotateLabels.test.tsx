import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudioFigureEditor from "@/components/unified/figure-editor";
import { SVG_NS } from "@/components/unified/figure-editor/figureSvgEditing";

/**
 * 돌린 직후의 라벨 — 회전은 엔진 라벨의 임자 꼭짓점(`data-px`·`data-py`)을 같이 돌린다. 조판에 안 쓰이는 표지만 바뀐
 * 라벨은 앞 조판본을 새 자리로 옮겨 써야 한다. 안 그러면 조판(350ms 뒤)이 따라올 때까지 라벨이 날것 글자로 깜빡이고,
 * 그 사이 다시 누르면 날것 글자의 상자로 가운데를 재어 네 번 돌아도 제자리로 안 온다(브라우저 실측 2026-09-19).
 */
vi.mock(
  "@/components/unified/figure-editor/figureTypeset",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/components/unified/figure-editor/figureTypeset")
      >();
    // 조판본 흉내 — 글자를 `<g>` 묶음(자리는 transform)으로 바꾼다. 앞 조판본을 이어 쓰는지만 본다.
    const typesetFigureSvg = async (source: string, preserveIds = false) => {
      const doc = new DOMParser().parseFromString(source, "image/svg+xml");
      for (const text of [...doc.querySelectorAll("text")]) {
        const wrapper = doc.createElementNS("http://www.w3.org/2000/svg", "g");
        for (const name of ["data-object-id", "transform"]) {
          const value = text.getAttribute(name);
          if (value !== null && (name === "transform" || preserveIds))
            wrapper.setAttribute(name, value);
        }
        const glyphs = doc.createElementNS("http://www.w3.org/2000/svg", "g");
        glyphs.setAttribute("data-label", text.textContent ?? "");
        wrapper.append(glyphs);
        text.replaceWith(wrapper);
      }
      return new XMLSerializer().serializeToString(doc.documentElement);
    };
    return { ...actual, typesetFigureSvg };
  },
);

const crop = "data:image/png;base64,b3JpZ2luYWw=";
// 엔진 라벨 A 의 임자 꼭짓점은 선분의 끝점 (20, 30)
const figure = `<svg xmlns="${SVG_NS}" viewBox="0 0 480 360"><line x1="20" y1="30" x2="80" y2="90" stroke="#111111"/><text x="20" y="20" font-size="18" text-anchor="middle" data-px="20" data-py="30">A</text></svg>`;
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
    value: () => ({ x: 14, y: 8, width: 12, height: 14 }),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const canvas = () => document.querySelector("#figure-editor-canvas")!;
const surface = () => screen.getByLabelText("도형 편집 캔버스");

describe("90° 회전 — 돌린 직후의 라벨", () => {
  it("임자 꼭짓점만 바뀐 엔진 라벨은 날것 글자로 깜빡이지 않고 조판본 그대로 옮겨 보인다", async () => {
    render(
      <StudioFigureEditor
        image={crop}
        initialSvg={figure}
        index={0}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    await waitFor(() => expect(canvas().querySelector("text")).toBeNull());
    surface().focus();
    fireEvent.keyDown(surface(), { key: "a", ctrlKey: true });
    fireEvent.click(
      within(screen.getByRole("region", { name: "회전" })).getByRole("button", {
        name: "시계 90°",
      }),
    );
    // 돌린 바로 그 화면 — 조판(350ms 뒤)을 기다리지 않는다
    expect(canvas().querySelector("text")).toBeNull();
    expect(canvas().querySelector('g[data-object-id="obj-1"]')).toHaveAttribute(
      "transform",
      expect.stringMatching(/^translate\(/),
    );
    expect(canvas().querySelector("[data-label]")).toHaveTextContent("");
  });
});
