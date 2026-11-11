import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudioFigureEditor, {
  type StudioFigureSaveResult,
} from "@/components/unified/figure-editor";
import { SVG_NS } from "@/components/unified/figure-editor/figureSvgEditing";
import {
  openFigureDetails,
  pickFigureTool,
} from "@/__tests__/helpers/figureEditorPanel";

/**
 * 도형 편집기 «면 만들기»(트랙 4) 2단계 — 도구 줄 «삼각형»·«다각형»·«채우기», 노란 조절점, 오른쪽 칸 «안쪽 채우기».
 * 원장님 2026-09-19 «사각형 자체를 각을 기울여서 평행사변형» · «노란 점 이동시키면 도형 변화» · «면을 쉽게 만들 수 있어야
 * 색칠을 할 수가 있음» · «삼각형도 추가해 주고» · «그룹화했을 때 내부에 색을 넣을 수 있는».
 * 화면 좌표 = 도형 좌표(getScreenCTM 을 단위 행렬로 흉내) — 누른 자리가 곧 SVG 의 자리다.
 */
vi.mock(
  "@/components/unified/figure-editor/figureTypeset",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/components/unified/figure-editor/figureTypeset")
      >();
    return { ...actual, typesetFigureSvg: async (source: string) => source };
  },
);

const crop = "data:image/png;base64,b3JpZ2luYWw=";
const line = (x1: number, y1: number, x2: number, y2: number) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#111111" stroke-width="1.8"/>`;
// △ABC 세 선분 + 떨어진 사각형
const figure = `<svg xmlns="${SVG_NS}" viewBox="0 0 480 360">${line(120, 20, 20, 200)}${line(20, 200, 260, 200)}${line(260, 200, 120, 20)}<rect x="300" y="40" width="100" height="50" stroke="#111111" fill="none"/></svg>`;
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
// 선·도형 무리 속 도구는 겉에 없으면 ▾ 메뉴에서 고른다(원장님 2026-09-21 «안 A»)
const tool = (name: string) => pickFigureTool(name);
const click = (x: number, y: number) =>
  fireEvent.pointerDown(canvas(), { button: 0, clientX: x, clientY: y });
const dragHandle = (key: string, x: number, y: number) => {
  const handle = document.querySelector(`[data-figure-handle="${key}"]`)!;
  const cx = Number(handle.getAttribute("cx")),
    cy = Number(handle.getAttribute("cy"));
  fireEvent.pointerDown(handle, { button: 0, clientX: cx, clientY: cy });
  fireEvent.pointerMove(surface(), { clientX: x, clientY: y });
  fireEvent.pointerUp(surface());
};
const pickNumber = (n: number, shiftKey = false) =>
  fireEvent.click(document.querySelector(`[data-figure-list-number="${n}"]`)!, {
    shiftKey,
  });
const faces = () => [...canvas().querySelectorAll("[data-face]")];
const handleKeys = () =>
  [...document.querySelectorAll("[data-figure-handle]")].map((node) =>
    node.getAttribute("data-figure-handle"),
  );
const listNames = () =>
  [...document.querySelectorAll("[data-figure-list-number]")].map(
    (node) => node.getAttribute("title")?.split(" · ")[0],
  );
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

describe("도구 줄 — 삼각형 · 다각형 · 채우기", () => {
  it("세 도구가 도구 줄에 있고 누르면 눌림으로 보인다", () => {
    open();
    for (const name of ["삼각형", "다각형", "채우기"]) {
      tool(name);
      expect(screen.getByRole("button", { name })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    }
  });

  it("삼각형 — 끌어서 그리면 상자 안의 이등변삼각형, 고르면 노란 점(꼭짓점)이 있다", () => {
    open();
    tool("삼각형");
    click(10, 220);
    fireEvent.pointerMove(surface(), { clientX: 110, clientY: 300 });
    fireEvent.pointerUp(surface());
    const triangle = canvas().querySelector('[data-shape="triangle"]')!;
    expect(triangle.getAttribute("points")).toBe("60 220 110 300 10 300");
    expect(listNames().at(-1)).toBe("삼각형");
    expect(handleKeys()).toEqual([
      "corner-0",
      "corner-1",
      "corner-2",
      "corner-3",
      "adjust",
    ]);
    const adjust = document.querySelector('[data-figure-handle="adjust"]')!;
    expect(adjust.getAttribute("fill")).toBe("#ffd400");
    dragHandle("adjust", 10, 250);
    expect(
      canvas().querySelector('[data-shape="triangle"]')!.getAttribute("points"),
    ).toBe("10 220 110 300 10 300");
  });
});

describe("노란 조절점 — 사각형을 평행사변형으로", () => {
  it("사각형을 고르면 모서리 넷 + 노란 점, 노란 점을 끌면 기울고 되돌리기로 돌아온다", () => {
    open();
    pickNumber(4);
    expect(handleKeys()).toEqual([
      "corner-0",
      "corner-1",
      "corner-2",
      "corner-3",
      "adjust",
    ]);
    dragHandle("adjust", 380, 40);
    expect(canvas().querySelector("rect")).toBeNull();
    const shape = canvas().querySelector('[data-shape="parallelogram"]')!;
    expect(shape.getAttribute("points")).toBe("330 40 430 40 400 90 300 90");
    expect(listNames()[3]).toBe("평행사변형");
    fireEvent.click(screen.getByRole("button", { name: /되돌리기/ }));
    expect(canvas().querySelector("rect")).toHaveAttribute("width", "100");
  });

  it("크기를 고정한 사각형에는 노란 점이 없다", () => {
    open();
    pickNumber(4);
    openFigureDetails();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "요소 크기 고정 (이동만 가능)" }),
    );
    expect(handleKeys()).not.toContain("adjust");
  });
});

describe("채우기 통", () => {
  it("선이 두른 칸을 누르면 선 뒤에 면이 생기고 목록에 «면»으로 새 번호(5번)가 된다 — 선 번호는 안 밀린다", () => {
    open();
    tool("채우기");
    click(120, 150);
    expect(faces()).toHaveLength(1);
    expect(faces()[0].getAttribute("fill")).toBe("#d9d9d9");
    // 면은 선 뒤(문서 맨 앞)에 그려지지만 번호는 마지막 번호 다음 — 번호 고정(원장님 2026-09-21).
    // 전에는 면이 1번이 되고 선이 2·3·4 로 밀렸다(원장님이 부르던 «요소 2»가 딴 것을 가리켰다).
    expect(
      canvas().querySelector("[data-object-id]")!.hasAttribute("data-face"),
    ).toBe(true);
    expect(listNames()).toEqual(["선분", "선분", "선분", "사각형", "면"]);
    // 되돌리기로 사라진다
    fireEvent.click(screen.getByRole("button", { name: /되돌리기/ }));
    expect(faces()).toHaveLength(0);
  });

  it("바깥을 누르면 아무것도 안 만들고 «닫힌 영역이 아닙니다»", () => {
    open();
    tool("채우기");
    click(5, 350);
    expect(faces()).toHaveLength(0);
    expect(screen.getByText("닫힌 영역이 아닙니다")).toBeInTheDocument();
  });

  it("오른쪽 칸의 채우기 색으로 칠하고, 칠한 면을 다시 누르면 색만 바뀐다", () => {
    open();
    tool("채우기");
    fireEvent.change(screen.getByLabelText("면 채우기 색"), {
      target: { value: "#f5e6b8" },
    });
    click(120, 150);
    expect(faces()[0].getAttribute("fill")).toBe("#f5e6b8");
    fireEvent.change(screen.getByLabelText("면 채우기 색"), {
      target: { value: "#d5e8f0" },
    });
    click(120, 150);
    expect(faces()).toHaveLength(1);
    expect(faces()[0].getAttribute("fill")).toBe("#d5e8f0");
  });

  it("빗금을 켜고 누르면 빗금 면, 다시 끄고 누르면 옛 빗금을 걷고 보통 색 — 패턴이 남지 않는다", () => {
    // 원장님 2026-11-11 «여긴 빗금 선택 없네» — 채우기 통 칸에도 빗금 · 방향 · 간격
    open();
    tool("채우기");
    fireEvent.click(screen.getByRole("button", { name: "빗금" }));
    fireEvent.click(screen.getByRole("button", { name: "＼" }));
    fireEvent.click(screen.getByRole("button", { name: "성김" }));
    fireEvent.change(screen.getByLabelText("빗금 색"), {
      target: { value: "#2255aa" },
    });
    click(120, 150);
    const fill = faces()[0].getAttribute("fill")!;
    expect(fill).toMatch(/^url\(#hatch-/);
    const pattern = canvas().querySelector("pattern")!;
    expect(pattern.getAttribute("data-hatch")).toBe("left");
    expect(pattern.getAttribute("data-hatch-gap")).toBe("wide");
    expect(pattern.querySelector("line")!.getAttribute("stroke")).toBe(
      "#2255aa",
    );
    // 같은 면을 다시 누르면 그 패턴을 고친다(새로 쌓지 않는다)
    fireEvent.click(screen.getByRole("button", { name: "×" }));
    click(120, 150);
    expect(canvas().querySelectorAll("pattern")).toHaveLength(1);
    expect(faces()[0].getAttribute("fill")).toBe(fill);
    // 빗금을 끄고 누르면 보통 색 · 패턴은 걷힌다
    fireEvent.click(screen.getByRole("button", { name: "빗금" }));
    expect(screen.queryByRole("group", { name: "빗금 방향" })).toBeNull();
    click(120, 150);
    expect(faces()).toHaveLength(1);
    expect(faces()[0].getAttribute("fill")).toBe("#d9d9d9");
    expect(canvas().querySelector("pattern")).toBeNull();
  });

  it("면은 선을 따라간다 — 선을 옮기면(정밀 수치) 면 경로가 바뀐다", () => {
    open();
    tool("채우기");
    click(120, 150);
    const before = faces()[0].getAttribute("d");
    tool("선택·이동");
    // 1번 = 선분 AB(면이 생겨도 번호 그대로). 두 끝을 모두 옮기면 고리가 끊긴다 — 방향키 미세 이동으로 셋을 함께.
    pickNumber(1);
    pickNumber(2, true);
    pickNumber(3, true);
    fireEvent.keyDown(surface(), { key: "ArrowRight", shiftKey: true });
    const after = faces()[0].getAttribute("d")!;
    expect(after).not.toBe(before);
    const xs = after
      .match(/-?[\d.]+/g)!
      .map(Number)
      .filter((_, i) => i % 2 === 0);
    // B(20,200) 가 10 옮겨 가장 왼쪽이 30
    expect(Math.min(...xs)).toBe(30);
  });

  it("면을 고르면 오른쪽 칸에 채우기 색과 «면 지우기» — 선 서식 칸은 없다", () => {
    open();
    tool("채우기");
    click(120, 150);
    tool("선택·이동");
    pickNumber(5);
    expect(
      screen.getByRole("heading", { name: "5 · 면 편집" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("도형 선 색")).toBeNull();
    fireEvent.change(screen.getByLabelText("도형 채우기 색"), {
      target: { value: "#ffe08a" },
    });
    expect(faces()[0].getAttribute("fill")).toBe("#ffe08a");
    fireEvent.click(screen.getByRole("button", { name: "면 지우기" }));
    expect(faces()).toHaveLength(0);
  });
});

describe("다각형(면) 도구", () => {
  it("점을 찍고 첫 점을 다시 누르면 면이 닫힌다 — 가까운 선 끝점에 달라붙는다", () => {
    open();
    tool("다각형");
    click(123, 22); // A(120,20) 에 붙는다
    click(300, 250);
    click(200, 320);
    expect(faces()).toHaveLength(0);
    expect(
      document.querySelector('[aria-label="그리는 다각형"]'),
    ).not.toBeNull();
    click(121, 21); // 첫 점 근처 → 닫기
    expect(faces()).toHaveLength(1);
    expect(faces()[0].localName).toBe("polygon");
    expect(faces()[0].getAttribute("data-face")).toBe("");
    expect(faces()[0].getAttribute("points")).toBe("120 20 300 250 200 320");
    expect(document.querySelector('[aria-label="그리는 다각형"]')).toBeNull();
  });

  it("Enter 로 닫고, Esc 로 그리던 것을 버린다", () => {
    open();
    tool("다각형");
    click(400, 200);
    click(460, 200);
    click(430, 260);
    fireEvent.keyDown(surface(), { key: "Escape" });
    expect(document.querySelector('[aria-label="그리는 다각형"]')).toBeNull();
    expect(faces()).toHaveLength(0);
    click(400, 200);
    click(460, 200);
    click(430, 260);
    fireEvent.keyDown(surface(), { key: "Enter" });
    expect(faces()).toHaveLength(1);
  });

  it("두 번 누르기로 닫는다(두 번째 누름의 겹친 점은 하나로)", () => {
    open();
    tool("다각형");
    click(400, 200);
    click(460, 200);
    click(430, 260);
    click(430, 260);
    fireEvent.doubleClick(canvas());
    expect(faces()[0].getAttribute("points")).toBe("400 200 460 200 430 260");
  });
});

describe("묶음 안쪽 채우기", () => {
  it("닫힌 선 셋을 고르면 «안쪽 채우기» — 켜면 면, 선을 따라가고, «채우기 없애기»로 지운다", () => {
    open();
    pickNumber(1);
    pickNumber(2, true);
    pickNumber(3, true);
    const on = screen.getByRole("button", { name: "안쪽 채우기" });
    expect(on).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(on);
    expect(faces()).toHaveLength(1);
    expect(faces()[0].hasAttribute("data-face-seed")).toBe(false);
    // 면은 새 번호를 받고 선은 1·2·3 그대로 — 고른 선도 그대로
    expect(screen.getByRole("button", { name: "안쪽 채우기" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.change(screen.getByLabelText("고른 선 안쪽 채우기 색"), {
      target: { value: "#d5e8f0" },
    });
    expect(faces()[0].getAttribute("fill")).toBe("#d5e8f0");
    fireEvent.click(screen.getByRole("button", { name: "안쪽 채우기 없애기" }));
    expect(faces()).toHaveLength(0);
  });

  it("닫히지 않은 선 묶음은 흐리게 두고 이유를 적는다", () => {
    open();
    pickNumber(1);
    pickNumber(2, true);
    expect(screen.getByRole("button", { name: "안쪽 채우기" })).toBeDisabled();
    expect(screen.getByText("닫힌 영역이 아닙니다")).toBeInTheDocument();
  });
});

describe("저장 · 다시 열기", () => {
  it("면·삼각형·평행사변형 표지가 저장되고 다시 열어도 이름이 같다", async () => {
    const onSave = open();
    tool("채우기");
    click(120, 150);
    tool("선택·이동");
    // 사각형은 면이 생겨도 4번 그대로
    pickNumber(4);
    dragHandle("adjust", 380, 40);
    fireEvent.click(screen.getByRole("button", { name: "도형 적용" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    const saved = onSave.mock.calls[0][0] as StudioFigureSaveResult;
    expect(saved.svg).toContain("data-face=");
    expect(saved.svg).toContain('data-shape="parallelogram"');
    cleanup();
    open(saved.svg);
    // 다시 열어도 같은 번호 — 평행사변형은 사각형의 4번을 이어받고 면은 5번
    expect(listNames()).toEqual(["선분", "선분", "선분", "평행사변형", "면"]);
  });
});
