import {
  createEvent,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
// A distinct basename keeps this component separate from the model on case-insensitive volumes.
import StudioPageOrder from "@/components/unified/StudioPageOrderStep";
import {
  studioPageKey,
  type StudioOrderedPage,
} from "@/components/unified/studioPageOrder";

const sources = [
  { id: "a", name: "본문.pdf", pages: 2 },
  { id: "b", name: "서술형 스캔.pdf", pages: 1 },
];
const order: StudioOrderedPage[] = [
  { sourceId: "a", page: 1, out: true, autoOut: "표지" },
  { sourceId: "a", page: 2, out: false },
  { sourceId: "b", page: 1, out: false },
];
const key = (index: number) => studioPageKey(order[index]);
const previews = Object.fromEntries(
  order.map((page) => [
    studioPageKey(page),
    { url: `blob:${page.sourceId}-${page.page}` },
  ]),
);
const setup = (
  extra: Partial<React.ComponentProps<typeof StudioPageOrder>> = {},
) => {
  const onMove = vi.fn(),
    onToggle = vi.fn();
  const props = { sources, order, previews, onMove, onToggle, ...extra };
  return { ...render(<StudioPageOrder {...props} />), props, onMove, onToggle };
};
const panel = () => screen.getByRole("complementary", { name: "선택한 쪽" });
const grid = () => screen.getByRole("region", { name: "쪽 카드" });
const select = (identity: string) =>
  fireEvent.click(
    within(grid()).getByRole("button", { name: `${identity} 크게 보기` }),
  );
// jsdom has no native DragEvent, so assign the pointer coordinate explicitly.
const dragAt = (
  type: "dragOver" | "drop",
  target: HTMLElement,
  clientX: number,
  dataTransfer: object,
) => {
  const event = createEvent[type](target, { dataTransfer });
  Object.defineProperty(event, "clientX", { value: clientX });
  fireEvent(target, event);
};

describe("H3-B 쪽 순서", () => {
  it("파일 딱지·활성 수·원본 신분을 표시하며 자동 제외 쪽을 제자리에 남긴다", () => {
    const { onToggle } = setup();
    expect(screen.getByText("시작할 쪽 2 · 뺀 쪽 1")).toBeVisible();
    expect(
      screen.getByText(
        "본문.pdf 원본 1쪽은 표지로 보여 미리 뺐습니다 — 문항 번호가 없습니다.",
      ),
    ).toBeVisible();
    const figures = [...grid().querySelectorAll("figure")];
    expect(figures.map((figure) => figure.dataset.stripKey)).toEqual(
      order.map(studioPageKey),
    );
    expect(figures[0]).toHaveAttribute("data-excluded", "true");
    expect(within(figures[0]).getByText("뺌")).toBeVisible();
    expect(within(figures[0]).getByRole("img")).toHaveAttribute(
      "alt",
      "본문.pdf 원본 1쪽",
    );
    fireEvent.click(
      within(figures[0]).getByRole("button", {
        name: "본문.pdf 원본 1쪽 되살리기",
      }),
    );
    expect(onToggle).toHaveBeenCalledExactlyOnceWith(key(0));
    expect(
      screen.queryByRole("button", {
        name: /이 순서로 시작|되돌리기|처음 차례로/,
      }),
    ).toBeNull();
  });

  it("단추 이동은 모델 키를 전달하고 경계는 막으며 재배열 뒤에도 선택한 원본을 유지한다", () => {
    const { props, rerender, onMove } = setup();
    expect(
      within(panel()).getByRole("button", { name: "맨 앞" }),
    ).toBeDisabled();
    expect(
      within(panel()).getByRole("button", { name: "앞으로" }),
    ).toBeDisabled();
    select("서술형 스캔.pdf 원본 1쪽");
    fireEvent.click(within(panel()).getByRole("button", { name: "맨 앞" }));
    expect(onMove).toHaveBeenLastCalledWith(key(2), "first");
    fireEvent.click(within(panel()).getByRole("button", { name: "앞으로" }));
    expect(onMove).toHaveBeenLastCalledWith(key(2), "previous");
    expect(
      within(panel()).getByRole("button", { name: "뒤로" }),
    ).toBeDisabled();
    rerender(
      <StudioPageOrder {...props} order={[order[2], order[0], order[1]]} />,
    );
    expect(within(panel()).getByRole("img")).toHaveAttribute(
      "alt",
      "서술형 스캔.pdf 원본 1쪽",
    );
    expect(
      within(panel()).getByRole("heading", { name: "새 1쪽" }),
    ).toBeVisible();
    fireEvent.click(within(panel()).getByRole("button", { name: "맨 뒤" }));
    expect(onMove).toHaveBeenLastCalledWith(key(2), "last");
    fireEvent.click(within(panel()).getByRole("button", { name: "뒤로" }));
    expect(onMove).toHaveBeenLastCalledWith(key(2), "next");
  });

  it("←→는 활성 쪽을 넘기고 Alt+←→는 이동하며 뺀 쪽도 선택하고 되살릴 수 있다", () => {
    const { onMove, onToggle } = setup();
    const root = screen.getByRole("region", { name: "쪽 순서 편집" });
    fireEvent.keyDown(root, { key: "ArrowLeft", altKey: true });
    expect(onMove).not.toHaveBeenCalled();
    fireEvent.keyDown(root, { key: "ArrowRight" });
    expect(within(panel()).getByRole("img")).toHaveAttribute(
      "alt",
      "서술형 스캔.pdf 원본 1쪽",
    );
    fireEvent.keyDown(root, { key: "ArrowLeft", altKey: true });
    expect(onMove).toHaveBeenCalledExactlyOnceWith(key(2), "previous");
    select("본문.pdf 원본 1쪽");
    expect(
      within(panel()).getByRole("heading", { name: "뺀 쪽" }),
    ).toBeVisible();
    fireEvent.keyDown(root, { key: "ArrowRight", altKey: true });
    expect(onMove).toHaveBeenCalledTimes(1);
    fireEvent.click(within(panel()).getByRole("button", { name: "되살리기" }));
    expect(onToggle).toHaveBeenLastCalledWith(key(0));
    fireEvent.keyDown(root, { key: "ArrowRight" });
    expect(within(panel()).getByRole("img")).toHaveAttribute(
      "alt",
      "본문.pdf 원본 2쪽",
    );
  });

  it("입력·선택·편집 중인 글과 IME 조합에는 방향키를 가로채지 않는다", () => {
    const { onMove } = setup();
    const root = screen.getByRole("region", { name: "쪽 순서 편집" });
    for (const tag of ["input", "select", "textarea", "div"]) {
      const field = document.createElement(tag);
      if (tag === "div") field.setAttribute("contenteditable", "true");
      root.append(field);
      fireEvent.keyDown(field, { key: "ArrowRight" });
      fireEvent.keyDown(field, { key: "ArrowRight", altKey: true });
      field.remove();
    }
    fireEvent.keyDown(root, { key: "ArrowRight", isComposing: true });
    fireEvent.keyDown(root, {
      key: "ArrowRight",
      altKey: true,
      isComposing: true,
    });
    expect(onMove).not.toHaveBeenCalled();
    expect(within(panel()).getByRole("img")).toHaveAttribute(
      "alt",
      "본문.pdf 원본 2쪽",
    );
  });

  it("손잡이로만 끌고 파란 놓일 자리를 표시해 파일 사이 이동을 요청한다", () => {
    const { onMove } = setup();
    const cards = [...grid().querySelectorAll("figure")];
    expect(cards.every((card) => !card.draggable)).toBe(true);
    const grip = within(cards[2]).getByRole("button", {
      name: "서술형 스캔.pdf 원본 1쪽 끌어서 옮기기",
    });
    const dataTransfer = {
      setData: vi.fn(),
      setDragImage: vi.fn(),
      effectAllowed: "",
      dropEffect: "",
    };
    vi.spyOn(cards[1], "getBoundingClientRect").mockReturnValue({
      left: 100,
      width: 140,
    } as DOMRect);
    fireEvent.dragStart(grip, { dataTransfer });
    expect(cards[2]).toHaveAttribute("data-dragging", "true");
    expect(dataTransfer.setDragImage).toHaveBeenCalled();
    dragAt("dragOver", cards[1], 110, dataTransfer);
    expect(cards[1]).toHaveAttribute("data-drop", "before");
    dragAt("drop", cards[1], 110, dataTransfer);
    expect(onMove).toHaveBeenCalledExactlyOnceWith(key(2), { before: key(1) });
    expect(cards[2]).not.toHaveAttribute("data-dragging", "true");
    expect(cards[1]).not.toHaveAttribute("data-drop");
  });

  it("전체 제외와 빈 미리보기·실패를 알리며 저장 중에는 변경을 막는다", () => {
    const { props, rerender, onMove, onToggle } = setup({ busy: true });
    select("서술형 스캔.pdf 원본 1쪽");
    fireEvent.keyDown(screen.getByRole("region", { name: "쪽 순서 편집" }), {
      key: "ArrowRight",
      altKey: true,
    });
    expect(
      within(panel()).getByRole("button", { name: "이 쪽 빼기" }),
    ).toBeDisabled();
    expect(onMove).not.toHaveBeenCalled();
    expect(onToggle).not.toHaveBeenCalled();
    rerender(
      <StudioPageOrder
        {...props}
        busy={false}
        order={order.map((p) => ({ ...p, out: true }))}
        previews={{}}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "시작할 쪽이 없습니다. 쪽을 되살려 주세요.",
    );
    expect(within(panel()).getByText("미리보기 준비 중")).toBeVisible();
    rerender(
      <StudioPageOrder
        {...props}
        busy={false}
        previews={{ [key(1)]: { url: "", error: "그림 읽기 실패" } }}
      />,
    );
    select("본문.pdf 원본 2쪽");
    expect(within(panel()).getByText("그림 읽기 실패")).toBeVisible();
  });

  it("선택한 쪽을 빼도 그 원본을 계속 보여 주며 되살리면 새 번호가 돌아온다", () => {
    const { props, rerender, onToggle } = setup();
    select("서술형 스캔.pdf 원본 1쪽");
    fireEvent.click(
      within(panel()).getByRole("button", { name: "이 쪽 빼기" }),
    );
    expect(onToggle).toHaveBeenLastCalledWith(key(2));
    rerender(
      <StudioPageOrder
        {...props}
        order={order.map((p, i) => (i === 2 ? { ...p, out: true } : p))}
      />,
    );
    expect(
      within(panel()).getByRole("heading", { name: "뺀 쪽" }),
    ).toBeVisible();
    expect(within(panel()).getByRole("img")).toHaveAttribute(
      "alt",
      "서술형 스캔.pdf 원본 1쪽",
    );
    expect(within(panel()).queryByRole("button", { name: "맨 앞" })).toBeNull();
    fireEvent.click(within(panel()).getByRole("button", { name: "되살리기" }));
    rerender(<StudioPageOrder {...props} />);
    expect(
      within(panel()).getByRole("heading", { name: "새 2쪽" }),
    ).toBeVisible();
  });

  it("외부 끌기와 제자리 놓기는 변경하지 않고 끌기를 취소하면 표시를 지운다", () => {
    const { onMove } = setup();
    const cards = [...grid().querySelectorAll("figure")];
    const dataTransfer = {
      setData: vi.fn(),
      setDragImage: vi.fn(),
      effectAllowed: "",
      dropEffect: "",
    };
    vi.spyOn(cards[2], "getBoundingClientRect").mockReturnValue({
      left: 100,
      width: 140,
    } as DOMRect);
    dragAt("drop", cards[2], 110, dataTransfer);
    expect(onMove).not.toHaveBeenCalled();
    const grip = within(cards[1]).getByRole("button", {
      name: "본문.pdf 원본 2쪽 끌어서 옮기기",
    });
    fireEvent.dragStart(grip, { dataTransfer });
    dragAt("dragOver", cards[2], 110, dataTransfer);
    expect(cards[2]).not.toHaveAttribute("data-drop");
    dragAt("drop", cards[2], 110, dataTransfer);
    expect(onMove).not.toHaveBeenCalled();
    fireEvent.dragStart(grip, { dataTransfer });
    dragAt("dragOver", cards[2], 230, dataTransfer);
    expect(cards[2]).toHaveAttribute("data-drop", "after");
    fireEvent.dragEnd(grip, { dataTransfer });
    expect(cards[2]).not.toHaveAttribute("data-drop");
    expect(cards[1]).not.toHaveAttribute("data-dragging", "true");
  });

  it("한 파일도 격자로 보여 주고 실제 그림 로드 실패는 빈 그림 대신 알린다", () => {
    setup({ sources: sources.slice(0, 1), order: order.slice(0, 2) });
    const image = within(panel()).getByRole("img", {
      name: "본문.pdf 원본 2쪽",
    });
    fireEvent.error(image);
    expect(
      within(panel()).getByText("미리보기를 불러오지 못했습니다."),
    ).toBeVisible();
    expect(grid().querySelectorAll("figure")).toHaveLength(2);
    expect(screen.getByText("시작할 쪽 1 · 뺀 쪽 1")).toBeVisible();
  });
});
