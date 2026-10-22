import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudioFigureEditor from "@/components/unified/figure-editor";
import {
  ALIGN_BLOCKED,
  SPREAD_BLOCKED,
} from "@/components/unified/figure-editor/figureAlign";
import { SVG_NS } from "@/components/unified/figure-editor/figureSvgEditing";

/**
 * 오른쪽 칸 무리 짓기 — 원장님 2026-09-21 확정 «안 D — 접는 무리».
 * 머리글 셋 «배치»(회전·대칭·정렬·간격·순서) · «모양»(선 색·두께·점선·채우기) · «틀 · 세부»(다 보이게·크기 고정·정밀 수치).
 * 배치·모양은 펼쳐 두고 틀·세부만 처음부터 접는다. 접은 상태는 편집기를 연 동안 기억한다. 머리글 오른쪽에 속 항목 이름.
 * 시안 docs/design/mockups/wire-t43-figure-panel.html «① 오른쪽 설정 칸» D.
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
// 1 다각형(채움) · 2 글자 · 3 선분 · 4 사각형
const figure =
  `<svg xmlns="${SVG_NS}" viewBox="0 0 480 360">` +
  `<polygon points="40,40 140,40 90,120" stroke="#111" fill="#c8c8c8"/>` +
  `<text x="200" y="100" font-size="18" data-mj="A">A</text>` +
  `<line x1="20" y1="200" x2="160" y2="260" stroke="#111"/>` +
  `<rect x="300" y="200" width="60" height="40" stroke="#111" fill="none"/>` +
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
    value: () => ({ x: 10, y: 10, width: 40, height: 20 }),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const open = () =>
  render(
    <StudioFigureEditor
      image={crop}
      initialSvg={figure}
      index={0}
      onSave={vi.fn()}
      onClose={vi.fn()}
    />,
  );
const pickNumber = (n: number, shiftKey = false) =>
  fireEvent.click(document.querySelector(`[data-figure-list-number="${n}"]`)!, {
    shiftKey,
  });
const fold = (name: "배치" | "모양" | "틀 · 세부") =>
  screen.queryByRole("button", { name: new RegExp(`^${name}`) });
const bodyOf = (name: "배치" | "모양" | "틀 · 세부") =>
  document.getElementById(fold(name)!.getAttribute("aria-controls")!)!;
const LOCK = "요소 크기 고정 (이동만 가능)";
const MERGED = "정렬은 둘, 간격은 셋 이상 고르면 켜집니다.";
const before = (a: Node, b: Node) =>
  !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe("오른쪽 칸 — 접는 무리 셋", () => {
  it("요소 하나를 고르면 머리글 셋 — 배치·모양은 펼치고 틀·세부만 접는다 · 오른쪽에 속 항목 이름", () => {
    open();
    pickNumber(1);
    expect(fold("배치")).toHaveAttribute("aria-expanded", "true");
    expect(fold("모양")).toHaveAttribute("aria-expanded", "true");
    expect(fold("틀 · 세부")).toHaveAttribute("aria-expanded", "false");
    expect(fold("배치")).toHaveTextContent("회전 · 대칭 · 정렬 · 간격 · 순서");
    expect(fold("모양")).toHaveTextContent("선 색 · 두께 · 점선 · 채우기");
    expect(fold("틀 · 세부")).toHaveTextContent(
      "다 보이게 · 크기 고정 · 정밀 수치",
    );
    expect(
      screen.getByRole("button", { name: /반시계 90°/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "맨 뒤로" })).toBeInTheDocument();
    expect(screen.getByLabelText("도형 선 색")).toBeVisible();
    expect(screen.queryByRole("button", { name: "다 보이게" })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: LOCK })).toBeNull();
    expect(bodyOf("틀 · 세부")).not.toBeVisible();
  });

  it("차례 — 안내 → 배치 → 모양 → 틀·세부 (시안 D)", () => {
    open();
    pickNumber(1);
    const info = screen.getByText(/파란색 조절점/);
    expect(before(info, fold("배치")!)).toBe(true);
    expect(before(fold("배치")!, fold("모양")!)).toBe(true);
    expect(before(fold("모양")!, fold("틀 · 세부")!)).toBe(true);
    expect(before(bodyOf("모양"), fold("틀 · 세부")!)).toBe(true);
  });

  it("틀·세부를 펴면 «틀 [다 보이게] 짧은 안내» · 크기 고정 · 정밀 수치", () => {
    open();
    pickNumber(1);
    fireEvent.click(fold("틀 · 세부")!);
    expect(fold("틀 · 세부")).toHaveAttribute("aria-expanded", "true");
    const frame = screen.getByRole("region", { name: "틀" });
    expect(frame).toHaveTextContent(
      /틀다 보이게잘린 곳을 들이고 여백을 줄입니다/,
    );
    expect(
      within(frame).getByRole("button", { name: "다 보이게" }),
    ).toBeVisible();
    expect(within(frame).getByRole("spinbutton", { name: "틀 확장 여백" })).toHaveValue(20);
    for (const name of ["전체 넓히기", "가로 넓히기", "세로 넓히기"])
      expect(within(frame).getByRole("button", { name })).toBeVisible();
    expect(screen.getByRole("checkbox", { name: LOCK })).toBeVisible();
    expect(screen.getByText("정밀 수치 조정")).toBeVisible();
  });

  it("접은 상태는 편집기를 연 동안 기억한다 — 다른 요소를 골라도·선택을 풀어도, 다시 열면 처음대로", () => {
    const { unmount } = open();
    pickNumber(1);
    fireEvent.click(fold("배치")!);
    expect(fold("배치")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: /반시계 90°/ })).toBeNull();
    fireEvent.click(fold("틀 · 세부")!);
    pickNumber(4);
    expect(fold("배치")).toHaveAttribute("aria-expanded", "false");
    expect(fold("틀 · 세부")).toHaveAttribute("aria-expanded", "true");
    pickNumber(2);
    expect(fold("배치")).toHaveAttribute("aria-expanded", "false");
    // 선택을 풀면(Esc) 틀·세부만 남고, 다시 고르면 접은 그대로
    act(() => screen.getByLabelText("도형 편집 캔버스").focus());
    fireEvent.keyDown(screen.getByLabelText("도형 편집 캔버스"), {
      key: "Escape",
    });
    expect(fold("배치")).toBeNull();
    expect(fold("틀 · 세부")).toHaveAttribute("aria-expanded", "true");
    pickNumber(2);
    expect(fold("배치")).toHaveAttribute("aria-expanded", "false");
    expect(fold("틀 · 세부")).toHaveAttribute("aria-expanded", "true");
    unmount();
    open();
    pickNumber(1);
    expect(fold("배치")).toHaveAttribute("aria-expanded", "true");
    expect(fold("틀 · 세부")).toHaveAttribute("aria-expanded", "false");
  });

  it("정렬·간격이 둘 다 꺼지면 안내 한 줄 — 하나만 꺼지면 그 이유 한 줄", () => {
    open();
    pickNumber(1);
    expect(screen.getAllByText(MERGED)).toHaveLength(1);
    expect(screen.queryByText(ALIGN_BLOCKED.few)).toBeNull();
    expect(screen.queryByText(SPREAD_BLOCKED.few)).toBeNull();
    // 꺼진 단추의 title 은 그대로(마우스를 올리면 이유)
    expect(screen.getByRole("button", { name: "왼쪽" })).toHaveAttribute(
      "title",
      ALIGN_BLOCKED.few,
    );
    pickNumber(3, true);
    expect(screen.queryByText(MERGED)).toBeNull();
    expect(screen.getAllByText(SPREAD_BLOCKED.few)).toHaveLength(1);
    // 안내 줄은 간격 줄 밑, 순서 줄 위(시안 D 의 차례)
    const reason = screen.getByText(SPREAD_BLOCKED.few);
    expect(before(screen.getByRole("region", { name: "간격" }), reason)).toBe(
      true,
    );
    expect(before(reason, screen.getByRole("region", { name: "순서" }))).toBe(
      true,
    );
  });

  it("채우기는 한 줄 — «채우기 [없애기][색]» (시안 D)", () => {
    open();
    pickNumber(1);
    const clear = screen.getByRole("button", { name: "채우기 없애기" });
    expect(clear).toHaveTextContent(/^없애기$/);
    const row = clear.closest("[data-fill-row]")!;
    expect(row).toHaveTextContent(/^채우기/);
    expect(
      within(row as HTMLElement).getByLabelText("도형 채우기 색"),
    ).toBeInTheDocument();
    expect(bodyOf("모양")).toContainElement(clear);
  });

  it("글자 요소 — 글자 내용 칸은 무리 밖(모양을 접어도 보인다) · 배경색도 한 줄", () => {
    open();
    pickNumber(2);
    expect(fold("모양")).toHaveTextContent(
      "기울임 · 굵게 · 글자 색 · 배경색 · 글자 크기",
    );
    fireEvent.click(fold("모양")!);
    expect(
      screen.getByRole("textbox", { name: "선택한 도형 글자" }),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "기울임" })).toBeNull();
    fireEvent.click(fold("모양")!);
    const clear = screen.getByRole("button", { name: "배경 없애기" });
    expect(clear).toHaveTextContent(/^없애기$/);
    expect(
      within(clear.closest("[data-fill-row]") as HTMLElement).getByLabelText(
        "글자 배경색",
      ),
    ).toBeInTheDocument();
  });

  it("글자를 두 번 누르면 글자 칸으로 — 누를 때 포인터를 잡은 캔버스 겉으로 오는 dblclick 도 받는다", () => {
    // 브라우저는 누를 때 캔버스 겉(«도형 편집 캔버스»)이 포인터를 잡아(setPointerCapture) click·dblclick 을 **겉**에
    // 보낸다. 처리기가 안쪽 그림 칸에만 있으면 안 불린다(2026-09-21 크로미움 실측 — main 에서도 같았다).
    open();
    pickNumber(2);
    const surface = screen.getByLabelText("도형 편집 캔버스");
    act(() => surface.focus());
    fireEvent.doubleClick(surface);
    expect(document.activeElement).toBe(
      screen.getByRole("textbox", { name: "선택한 도형 글자" }),
    );
  });

  it("면은 «채우기 [면 지우기][색]» — 모양 머리글은 채우기 하나", () => {
    const faceFigure = figure.replace("<polygon ", '<polygon data-face="" ');
    render(
      <StudioFigureEditor
        image={crop}
        initialSvg={faceFigure}
        index={0}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    pickNumber(1);
    expect(fold("모양")).toHaveTextContent(/^▾\s*모양\s*채우기$/);
    const remove = screen.getByRole("button", { name: "면 지우기" });
    expect(
      within(remove.closest("[data-fill-row]") as HTMLElement).getByLabelText(
        "도형 채우기 색",
      ),
    ).toBeInTheDocument();
  });

  it("아무것도 안 고르면 틀·세부만 — 접혀 있고, 펴면 다 보이게", () => {
    open();
    expect(fold("배치")).toBeNull();
    expect(fold("모양")).toBeNull();
    expect(fold("틀 · 세부")).toHaveAttribute("aria-expanded", "false");
    expect(fold("틀 · 세부")).toHaveTextContent(/다 보이게$/);
    fireEvent.click(fold("틀 · 세부")!);
    expect(screen.getByRole("button", { name: "다 보이게" })).toBeVisible();
  });

  it("여럿을 고르면 모양 무리에 공통 서식 · 틀·세부는 다 보이게", () => {
    open();
    pickNumber(3);
    pickNumber(4, true);
    expect(bodyOf("모양")).toContainElement(
      screen.getByRole("region", { name: "선·도형 공통 서식" }),
    );
    expect(fold("모양")).toHaveTextContent("선 색 · 두께 · 점선 · 채우기");
    expect(fold("틀 · 세부")).toHaveTextContent(/틀 · 세부\s*다 보이게$/);
  });

  it("여럿을 고를 때도 채우기·배경색·안쪽 채우기는 «이름 … [없애기][색]» 한 줄 — 요소 하나일 때와 같은 꼴", () => {
    open();
    pickNumber(2);
    pickNumber(4, true);
    const rowWith = (label: string) =>
      screen.getByLabelText(label).closest("[data-fill-row]") as HTMLElement;
    const fill = rowWith("고른 채우기 색");
    expect(fill).toHaveTextContent(/^채우기/);
    expect(
      within(fill).getByRole("button", { name: "채우기 없애기" }),
    ).toHaveTextContent(/^없애기$/);
    const background = rowWith("고른 글자 배경색");
    expect(background).toHaveTextContent(/^배경색/);
    expect(
      within(background).getByRole("button", { name: "배경 없애기" }),
    ).toHaveTextContent(/^없애기$/);
    const inner = rowWith("고른 선 안쪽 채우기 색");
    expect(
      within(inner).getByRole("button", { name: "안쪽 채우기" }),
    ).toBeInTheDocument();
    expect(
      within(inner).getByRole("button", { name: "안쪽 채우기 없애기" }),
    ).toHaveTextContent(/^없애기$/);
    // 색 칸은 줄 끝 — [없애기][색] 차례
    for (const row of [fill, background, inner]) {
      const clear = within(row)
        .getAllByRole("button")
        .find((b) => b.textContent === "없애기")!;
      expect(
        clear.compareDocumentPosition(
          row.querySelector('input[type="color"]')!,
        ) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it("값이 갈리면 «채우기 여러 값»이 이름 곁에 붙는다 — 줄 가운데로 떨어지지 않는다", () => {
    open();
    pickNumber(1); // 채운 다각형
    pickNumber(4, true); // 안 채운 사각형
    const fill = screen
      .getByLabelText("고른 채우기 색")
      .closest("[data-fill-row]")!;
    // 한 줄은 두 칸 — 왼쪽 이름(여러 값 포함) · 오른쪽 [없애기][색]
    expect(fill.childNodes).toHaveLength(2);
    expect(fill.firstElementChild).toHaveTextContent("채우기 여러 값");
  });
});
