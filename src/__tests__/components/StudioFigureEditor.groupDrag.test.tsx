import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudioFigureEditor from "@/components/unified/figure-editor";
import { SVG_NS } from "@/components/unified/figure-editor/figureSvgEditing";

/**
 * **묶으면 캔버스에서도 같이 움직인다** — 원장님 2026-09-21:
 *
 * > «그룹을 만들었는데 별개로 움직이네. 내가 생각한 그룹이면 같이 움직일 줄 알았는데.»
 *
 * 묶음 전체 선택은 번호표(네모 A)와 오른쪽 칸의 묶음 줄에만 있었고 **캔버스 클릭은 요소 하나**였다.
 * 묶어도 끌면 따로 갔다 — 「묶음」이라는 말이 화면에서 거짓말을 하고 있었다.
 *
 * ppt 와 같이 나눈다: **캔버스는 묶음 단위**, 속 요소 하나는 **오른쪽 요소 목록**에서 고른다.
 * 그 둘을 여기서 같이 잠근다 — 한쪽만 잠그면 다른 쪽이 조용히 사라진다.
 */
vi.mock(
  "@/components/unified/figure-editor/figureTypeset",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/components/unified/figure-editor/figureTypeset")
      >();
    const typesetFigureSvg = async (source: string) => {
      const doc = new DOMParser().parseFromString(source, "image/svg+xml");
      for (const node of [...doc.querySelectorAll("text")]) {
        const wrapper = doc.createElementNS(SVG_NS, "g");
        wrapper.setAttribute("data-typeset", "");
        for (const name of ["data-object-id", "transform", "data-group"])
          if (node.hasAttribute(name))
            wrapper.setAttribute(name, node.getAttribute(name)!);
        wrapper.append(doc.createElementNS(SVG_NS, "path"));
        return new XMLSerializer().serializeToString(doc.documentElement);
      }
      return new XMLSerializer().serializeToString(doc.documentElement);
    };
    return { ...actual, typesetFigureSvg };
  },
);

/**
 * 원장님 화면과 같은 짜임 — 사각형 관계도의 상자 하나는 «사각 + 이름 글자» 둘이다.
 * 그 둘이 묶음 A 이고, 세 번째 원은 묶음 밖이다(이름이 겹치지 않아야 목록에서 한 줄만 집힌다)(회귀 가드의 반대쪽 표본).
 */
const figure =
  `<svg xmlns="${SVG_NS}" viewBox="0 0 480 360">` +
  `<rect x="20" y="30" width="60" height="40" stroke="#111111" fill="none" data-group="A"/>` +
  `<line x1="24" y1="50" x2="76" y2="50" stroke="#111111" data-group="A"/>` +
  `<circle cx="300" cy="60" r="20" stroke="#111111" fill="none"/>` +
  `</svg>`;
const crop = "data:image/png;base64,b3JpZ2luYWw=";

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
    value: () => ({ x: 20, y: 30, width: 60, height: 40 }),
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
const box = () => canvas().querySelector("rect")!;
const boxLine = () => canvas().querySelector("line")!;
const loose = () => canvas().querySelector("circle")!;
/**
 * 오른쪽 요소 목록의 **요소 줄** — 종류 이름은 `title` 에 있고 본문에는 번호뿐이다
 * (본문으로 찾으면 도구 막대의 «사각형» 단추가 잡힌다).
 */
const rowFor = (kind: string) =>
  screen.getByTitle(new RegExp(`^${kind} · 끌어서`));
/** 끈 거리 — `transform="translate(x y)"` 에서 x 만. 안 움직였으면 0. */
const moved = (node: Element) => {
  const shift = /translate\(\s*(-?[\d.]+)/.exec(
    node.getAttribute("transform") ?? "",
  );
  return shift ? Number(shift[1]) : 0;
};

async function open() {
  render(
    <StudioFigureEditor
      image={crop}
      initialSvg={figure}
      index={0}
      onSave={vi.fn()}
      onClose={vi.fn()}
    />,
  );
  await waitFor(() => expect(canvas().querySelector("rect")).not.toBeNull());
}

/** 누르고 끈다 — **한 동작**이다(먼저 골라 두지 않는다). */
function dragFrom(node: Element, to: number) {
  fireEvent.pointerDown(node, { button: 0, clientX: 40, clientY: 50 });
  fireEvent.pointerMove(surface(), { clientX: to, clientY: 50 });
}

describe("묶음은 캔버스에서도 한 덩어리다", () => {
  it("묶음 속 하나를 누르고 끌면 묶음 동무도 같은 만큼 간다 — 한 동작으로", async () => {
    await open();
    dragFrom(box(), 70);
    await waitFor(() => expect(moved(box())).toBe(30));
    expect(moved(boxLine())).toBe(30);
  });

  it("묶음 밖 요소는 그것만 간다 — 묶음이 온 그림을 끌고 가지 않는다", async () => {
    await open();
    dragFrom(loose(), 70);
    await waitFor(() => expect(moved(loose())).toBe(30));
    expect(moved(box())).toBe(0);
    expect(moved(boxLine())).toBe(0);
  });

  it("묶음 속 하나를 누르면 묶음 **전부**가 골라진다 — 오른쪽 목록이 둘 다 눌린 것으로 보인다", async () => {
    await open();
    fireEvent.pointerDown(box(), { button: 0, clientX: 40, clientY: 50 });
    await waitFor(() =>
      expect(rowFor("사각형").getAttribute("aria-pressed")).toBe("true"),
    );
    // 동무(묶음 속 선분)도 같이 눌려 있어야 한다 — 여기가 «별개로 움직인다»의 뿌리였다.
    expect(rowFor("선분").getAttribute("aria-pressed")).toBe("true");
  });

  it("오른쪽 요소 목록에서 묶음 속 하나만 고른 뜻은 캔버스 클릭이 안 덮는다", async () => {
    await open();
    fireEvent.click(rowFor("사각형"));
    await waitFor(() =>
      expect(rowFor("선분").getAttribute("aria-pressed")).toBe("false"),
    );
    // 고른 그 요소를 캔버스에서 끈다 — 동무는 제자리여야 한다.
    dragFrom(box(), 70);
    await waitFor(() => expect(moved(box())).toBe(30));
    expect(moved(boxLine())).toBe(0);
  });
});
