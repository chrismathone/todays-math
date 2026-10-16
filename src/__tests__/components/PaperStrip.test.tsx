/**
 * 지면 띠 — 여러 쪽을 옆으로 넘겨 보고, 쪽을 누르면 크게 보는 공용 부품.
 * 개념 백지 미리보기에서 떼어 냈고 교재 제작의 완성 보기가 같이 쓴다. 실제 스크롤 · 초점 잠금은 브라우저 시험이 본다(jsdom 에는 배치가 없다).
 */
import { fireEvent, render, screen, within } from "@testing-library/react";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  PaperStrip,
  type PaperStripPage,
} from "@/components/paper-strip/PaperStrip";
import { A4_DIMENSIONS } from "@/components/print/tokens";

// jsdom 에는 모달 API 가 없다.
const dialogMethods = ["showModal", "close"] as const;
const originalDialogMethods = dialogMethods.map((name) =>
  Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, name),
);
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    },
  });
});
afterAll(() =>
  dialogMethods.forEach((name, i) => {
    const original = originalDialogMethods[i];
    if (original)
      Object.defineProperty(HTMLDialogElement.prototype, name, original);
    else
      delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>)[name];
  }),
);
afterEach(() => vi.restoreAllMocks());

const page = (n: number, enlarge = true): PaperStripPage => ({
  key: `p${n}`,
  node: <div data-testid={`paper-${n}`}>지면 {n}</div>,
  caption: <strong>{n}</strong>,
  ...(enlarge ? { enlargeLabel: `${n}쪽 확대` } : {}),
});

/**
 * 띠 안에서 쪽이 놓인 자리(띠의 맨 앞에서 잰 왼쪽 좌표)를 정해 준다 — jsdom 은 배치를 하지 않는다.
 * 브라우저처럼 띠를 넘기면(scrollLeft) 쪽의 좌표가 같이 움직인다. `lefts` 를 고치면 쪽이 옮겨 간다.
 */
function placeItems(desk: HTMLElement, lefts: Record<string, number>) {
  const original = HTMLElement.prototype.getBoundingClientRect;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      const key = this.dataset.stripKey;
      if (this !== desk && !key) return original.call(this);
      const left = key ? lefts[key]! - desk.scrollLeft : 0;
      const width = key ? 100 : 400;
      return {
        left,
        right: left + width,
        top: 0,
        bottom: 140,
        width,
        height: 140,
        x: left,
        y: 0,
        toJSON: () => ({}),
      };
    },
  );
}

describe("지면 띠", () => {
  it("쪽마다 지면과 그 아래 글을 차례로 놓고, 안내 한 줄과 이름 있는 영역을 둔다", () => {
    render(
      <PaperStrip
        pages={[page(1), page(2), page(3)]}
        hint="옆으로 넘겨 봅니다."
        label="교재 미리보기"
      />,
    );
    expect(screen.getByText("옆으로 넘겨 봅니다.")).toBeVisible();
    const strip = screen.getByRole("region", { name: "교재 미리보기" });
    expect(
      [...strip.querySelectorAll("figure")].map(
        (figure) => figure.querySelector("figcaption")!.textContent,
      ),
    ).toEqual(["1", "2", "3"]);
    expect(within(strip).getByTestId("paper-2")).toBeVisible();
  });

  it("배율을 CSS 변수로 내려 준다 — 부르는 쪽이 이름을 더할 수 있다(개념 백지의 지면이 읽는 이름)", () => {
    render(
      <PaperStrip pages={[page(1)]} hint="" scaleVars={["--cb-paper-scale"]} />,
    );
    const strip = screen.getByRole("region", { name: "지면 미리보기" });
    // jsdom has no layout, so the strip keeps its ceiling: thumbnails are
    // sized by the available viewport height (2026-10-16), not a fixed 0.46.
    expect(strip.style.getPropertyValue("--paper-strip-scale")).toBe("1");
    expect(strip.style.getPropertyValue("--cb-paper-scale")).toBe("1");
  });

  it("쪽을 누르면 크게 보는 창이 그 쪽에서 열리고, ← → 로 넘기고, 닫으면 누른 단추로 돌아온다", () => {
    render(<PaperStrip pages={[page(1), page(2), page(3)]} hint="" />);
    const opener = screen.getByRole("button", { name: "2쪽 확대" });
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: "지면 확대 보기" });
    expect(within(dialog).getByText("2 / 3쪽")).toBeVisible();
    expect(within(dialog).getAllByText(/^지면 \d$/)).toHaveLength(3);
    fireEvent.click(
      within(dialog).getByRole("button", { name: "다음 페이지" }),
    );
    expect(within(dialog).getByText("3 / 3쪽")).toBeVisible();
    expect(
      within(dialog).getByRole("button", { name: "다음 페이지" }),
    ).toBeDisabled();
    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    expect(within(dialog).getByText("1 / 3쪽")).toBeVisible();
    expect(
      within(dialog).getByRole("button", { name: "이전 페이지" }),
    ).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(opener).toHaveFocus();
  });

  it("크게 볼 수 없는 자리(조판 중 · 조판하지 못한 구획)는 단추가 없고, 크게 보는 창의 쪽 수에도 들지 않는다", () => {
    render(<PaperStrip pages={[page(1), page(2, false), page(3)]} hint="" />);
    expect(screen.queryByRole("button", { name: "2쪽 확대" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "3쪽 확대" }));
    const dialog = screen.getByRole("dialog", { name: "지면 확대 보기" });
    expect(within(dialog).getByText("2 / 2쪽")).toBeVisible();
    expect(within(dialog).queryByText("지면 2")).toBeNull();
  });

  it("fits whole overview pages to the available height and resizes to a narrow container", () => {
    let width = 1200;
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
      () => width,
    );
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: 300,
      height: 24,
    } as DOMRect);
    render(
      <PaperStrip pages={[page(1), page(2)]} hint="" id="worksheet-preview" />,
    );
    const strip = screen.getByRole("region", { name: "지면 미리보기" });
    const scale = () =>
      Number(strip.style.getPropertyValue("--paper-strip-scale"));
    expect(strip).toHaveAttribute("id", "worksheet-preview");
    expect(scale() * A4_DIMENSIONS.heightPx + 32 + 24 + 16).toBeLessThanOrEqual(
      window.innerHeight - 300 - 16,
    );
    width = 280;
    fireEvent(window, new Event("resize"));
    expect(scale() * A4_DIMENSIONS.widthPx).toBeLessThanOrEqual(248);
  });

  it("defaults enlarged pages to whole-page fit and preserves width/percent zoom and the current page", () => {
    let width = 900;
    let height = 500;
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
      () => width,
    );
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(
      () => height,
    );
    render(<PaperStrip pages={[page(1), page(2)]} hint="" />);
    fireEvent.click(screen.getByRole("button", { name: "2쪽 확대" }));
    const dialog = screen.getByRole("dialog");
    const expanded = within(dialog).getByRole("region", {
      name: "확대한 지면",
    });
    const zoom = within(dialog).getByRole("combobox", {
      name: "미리보기 확대",
    });
    const scale = () =>
      Number(expanded.style.getPropertyValue("--paper-strip-scale"));
    expect(zoom).toHaveValue("page");
    expect(scale() * A4_DIMENSIONS.heightPx).toBeLessThanOrEqual(height - 32);
    expect(scale() * A4_DIMENSIONS.widthPx).toBeLessThanOrEqual(width - 32);
    fireEvent.change(zoom, { target: { value: "width" } });
    expect(scale()).toBe(1);
    fireEvent.keyDown(zoom, { key: "ArrowLeft" });
    expect(within(dialog).getByText("2 / 2쪽")).toBeVisible();
    fireEvent.change(zoom, { target: { value: "1.25" } });
    width = 300;
    height = 360;
    fireEvent(window, new Event("resize"));
    expect(scale()).toBe(1.25);
    expect(within(dialog).getByText("2 / 2쪽")).toBeVisible();
    fireEvent.change(zoom, { target: { value: "page" } });
    expect(scale() * A4_DIMENSIONS.widthPx).toBeLessThanOrEqual(width - 32);
    expect(scale() * A4_DIMENSIONS.heightPx).toBeLessThanOrEqual(height - 32);
  });

  it("가리킨 쪽으로 띠를 옮긴다 — 같은 쪽을 다시 가리켜도 옮긴다", () => {
    const { rerender } = render(
      <PaperStrip pages={[page(1), page(2), page(3)]} hint="" />,
    );
    const strip = screen.getByRole("region", { name: "지면 미리보기" });
    placeItems(strip, { p1: 16, p2: 140, p3: 264 });
    rerender(
      <PaperStrip
        pages={[page(1), page(2), page(3)]}
        hint=""
        scrollTo={{ key: "p3", nonce: 1 }}
      />,
    );
    expect(strip.scrollLeft).toBe(248);
    // 다른 데로 넘긴 뒤 같은 쪽을 다시 가리킨다.
    strip.scrollLeft = 0;
    fireEvent.scroll(strip);
    rerender(
      <PaperStrip
        pages={[page(1), page(2), page(3)]}
        hint=""
        scrollTo={{ key: "p3", nonce: 2 }}
      />,
    );
    expect(strip.scrollLeft).toBe(248);
  });

  it("넘길 때마다 맨 앞에 보이는 쪽을 알린다", () => {
    const onVisible = vi.fn();
    render(
      <PaperStrip
        pages={[page(1), page(2), page(3)]}
        hint=""
        onVisible={onVisible}
      />,
    );
    const strip = screen.getByRole("region", { name: "지면 미리보기" });
    strip.scrollLeft = 150;
    placeItems(strip, { p1: 16, p2: 140, p3: 264 });
    fireEvent.scroll(strip);
    // p1 은 왼쪽으로 다 넘어갔고(오른쪽 끝 116 − 150 < 0) p2 가 맨 앞이다.
    expect(onVisible).toHaveBeenLastCalledWith("p2");
  });

  it("보고 있는 쪽의 앞에 쪽이 끼어들어도 보던 쪽이 제자리에 남는다 — 뒤늦게 조판된 앞 구획이 화면을 밀지 않는다", () => {
    const { rerender } = render(
      <PaperStrip pages={[page(1), page(3)]} hint="" />,
    );
    const strip = screen.getByRole("region", { name: "지면 미리보기" });
    strip.scrollLeft = 130;
    const lefts: Record<string, number> = { p1: 16, p3: 140 };
    placeItems(strip, lefts);
    fireEvent.scroll(strip); // 보던 쪽은 p3 — 띠의 맨 앞에서 10px 자리.
    // 앞에 p2 가 끼어든다: p3 이 124px 밀린다.
    Object.assign(lefts, { p2: 140, p3: 264 });
    rerender(<PaperStrip pages={[page(1), page(2), page(3)]} hint="" />);
    expect(strip.scrollLeft).toBe(254);
  });
});
