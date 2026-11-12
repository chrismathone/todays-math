import {
  createEvent,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
// A distinct basename keeps this component separate from the model on case-insensitive volumes.
import StudioPageOrder from "@/components/unified/StudioPageOrderStep";
import {
  initialPageOrder,
  movePage,
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
    within(grid()).getByRole("button", { name: `${identity} 선택` }),
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
  it("카드 전체 선택 단추는 옆 미리보기만 바꾸며 확대·손잡이 단추가 없다", () => {
    const { onMove, onToggle } = setup();
    const second = within(grid()).getByRole("button", {
      name: "서술형 스캔.pdf 원본 1쪽 선택",
    });
    fireEvent.click(second);
    expect(within(panel()).getByRole("img")).toHaveAttribute(
      "alt",
      "서술형 스캔.pdf 원본 1쪽",
    );
    expect(second).toHaveAttribute("aria-pressed", "true");
    expect(second).toHaveAttribute("draggable", "true");
    expect(
      screen.queryByRole("button", { name: /크게 보기|끌어서 옮기기/ }),
    ).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onMove).not.toHaveBeenCalled();
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("끌기 뒤 발생한 포인터 클릭은 선택을 옮기지 않고 다음 클릭과 키보드 선택은 받는다", () => {
    setup();
    const first = within(grid()).getByRole("button", {
      name: "본문.pdf 원본 2쪽 선택",
    });
    const second = within(grid()).getByRole("button", {
      name: "서술형 스캔.pdf 원본 1쪽 선택",
    });
    const dataTransfer = { setData: vi.fn(), setDragImage: vi.fn() };
    fireEvent.dragStart(second, { dataTransfer });
    fireEvent.dragEnd(second, { dataTransfer });
    fireEvent.click(first, { detail: 1 });
    expect(second).toHaveAttribute("aria-pressed", "true");
    fireEvent.pointerDown(first);
    fireEvent.click(first, { detail: 1 });
    expect(first).toHaveAttribute("aria-pressed", "true");
    fireEvent.dragStart(first, { dataTransfer });
    fireEvent.dragEnd(first, { dataTransfer });
    fireEvent.click(second, { detail: 0 });
    expect(second).toHaveAttribute("aria-pressed", "true");
  });

  it("겹치는 파일명과 원본 쪽은 파일 번호로 구분하고 재배열·제외 뒤에도 원본 캡션을 유지한다", () => {
    const files = [
      { id: "a", name: "문제.pdf", pages: 2 },
      { id: "b", name: "문제.pdf", pages: 1 },
    ];
    const { props, rerender } = setup({ sources: files });
    const caption = (index: number) =>
      grid().querySelectorAll("figcaption")[index];
    expect(caption(0)).toHaveTextContent("원본 1쪽파일 1 · 뺀 쪽");
    expect(caption(2)).toHaveTextContent("원본 1쪽파일 2 · 새 2쪽");
    expect(caption(2)).not.toHaveTextContent("문제.pdf");
    select("문제.pdf (파일 2) 원본 1쪽");
    rerender(
      <StudioPageOrder
        {...props}
        order={[{ ...order[2], out: true }, order[1], order[0]]}
      />,
    );
    expect(caption(0)).toHaveTextContent("원본 1쪽파일 2 · 뺀 쪽");
    expect(caption(1)).toHaveTextContent("원본 2쪽파일 1 · 새 1쪽");
    expect(within(panel()).getByRole("img")).toHaveAttribute(
      "alt",
      "문제.pdf (파일 2) 원본 1쪽",
    );
  });

  it("단일 이미지에는 가짜 파일 쪽 번호 대신 원본 이미지를 표시하고 파일 출처를 남긴다", () => {
    setup({
      sources: [{ id: "b", name: "문제.jpg", pages: 1, kind: "image" }],
      order: [order[2]],
    });
    const caption = grid().querySelector("figcaption")!;
    expect(caption).toHaveTextContent("원본 이미지새 1쪽");
    expect(caption).not.toHaveTextContent(/파일 1|문제.jpg/);
    expect(
      within(grid()).getByRole("button", { name: "문제.jpg 원본 이미지 선택" }),
    ).toHaveAttribute("title", expect.stringContaining("문제.jpg"));
  });

  it("실패한 카드와 옆 미리보기의 다시 시도 단추만 정확한 원본 키를 보내고 카드 표면은 조작하지 않는다", () => {
    const onRetryPreview = vi.fn();
    const failed = {
      ...previews,
      [key(2)]: { url: "blob:unverified", error: "시간 초과" },
    };
    const { props, rerender, onMove, onToggle } = setup({
      previews: failed,
      onRetryPreview,
    });
    const card = [...grid().querySelectorAll("figure")][2];
    fireEvent.click(card);
    expect(onRetryPreview).not.toHaveBeenCalled();
    expect(within(panel()).getByRole("img")).toHaveAttribute(
      "alt",
      "본문.pdf 원본 2쪽",
    );
    const retry = within(card).getByRole("button", {
      name: "서술형 스캔.pdf 원본 1쪽 미리보기 다시 시도",
    });
    expect(retry).toHaveTextContent(/^다시 시도$/);
    expect(retry.closest("[role=button]")).toBeNull();
    fireEvent.click(retry);
    expect(onRetryPreview).toHaveBeenLastCalledWith(key(2));
    select("서술형 스캔.pdf 원본 1쪽");
    fireEvent.click(within(panel()).getByRole("button", { name: /다시 시도/ }));
    expect(onRetryPreview.mock.calls).toEqual([[key(2)], [key(2)]]);
    for (const region of [card, panel()]) {
      expect(within(region).getByRole("img")).toHaveAttribute(
        "src",
        "blob:unverified",
      );
      expect(within(region).getByRole("alert")).toHaveTextContent("시간 초과");
    }
    rerender(
      <StudioPageOrder
        {...props}
        previews={{ ...failed, [key(2)]: { ...failed[key(2)], loading: true } }}
      />,
    );
    for (const region of [card, panel()]) {
      const button = within(region).getByRole("button", { name: /다시 시도/ });
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }
    expect(onRetryPreview).toHaveBeenCalledTimes(2);
    expect(onMove).not.toHaveBeenCalled();
    expect(onToggle).not.toHaveBeenCalled();
  });

  it.each([
    { loading: true, status: "미리보기 준비 중" },
    { checking: true, status: "빈 쪽 확인 중" },
  ])(
    "$status에도 카드와 옆 그림을 유지하고 해당 쪽의 재시도만 잠근다",
    (pending) => {
      const onRetryPreview = vi.fn();
      setup({
        previews: {
          ...previews,
          [key(1)]: {
            ...previews[key(1)],
            ...pending,
            error: "확인 시간 초과",
          },
        },
        onRetryPreview,
      });
      const card = [...grid().querySelectorAll("figure")][1];
      for (const region of [card, panel()]) {
        expect(within(region).getByRole("img")).toHaveAttribute(
          "src",
          "blob:a-2",
        );
        expect(within(region).getByRole("status")).toHaveTextContent(
          pending.status,
        );
        expect(within(region).getByRole("alert")).toHaveTextContent(
          "확인 시간 초과",
        );
        const retry = within(region).getByRole("button", {
          name: /미리보기 다시 시도/,
        });
        expect(retry).toBeDisabled();
        fireEvent.click(retry);
      }
      expect(onRetryPreview).not.toHaveBeenCalled();
    },
  );

  it("확인 중인 새 URL도 즉시 카드와 옆 칸에 보여 준다", () => {
    setup({
      previews: {
        ...previews,
        [key(1)]: { url: "blob:early", loading: false, checking: true },
      },
    });
    const card = [...grid().querySelectorAll("figure")][1];
    for (const region of [card, panel()]) {
      expect(within(region).getByRole("img")).toHaveAttribute(
        "src",
        "blob:early",
      );
      expect(within(region).getByRole("status")).toHaveTextContent(
        "빈 쪽 확인 중",
      );
    }
  });

  it("다른 쪽의 대기와 전역 작업은 실패 쪽 재시도를 막지 않고 해당 쪽 작업 중에는 중복하지 않는다", () => {
    const onRetryPreview = vi.fn();
    const pending = {
      [key(0)]: { url: "", loading: true },
      [key(1)]: { url: "blob:early", checking: true },
      [key(2)]: { url: "", error: "그림 읽기 실패" },
    };
    const { props, rerender } = setup({ previews: pending, onRetryPreview });
    select("서술형 스캔.pdf 원본 1쪽");
    // Import/AI locking remains separate from retrying this failed preview.
    rerender(<StudioPageOrder {...props} busy />);
    const card = [...grid().querySelectorAll("figure")][2];
    for (const region of [card, panel()]) {
      const retry = within(region).getByRole("button", {
        name: /미리보기 다시 시도/,
      });
      expect(retry).toBeEnabled();
      fireEvent.click(retry);
    }
    expect(onRetryPreview.mock.calls).toEqual([[key(2)], [key(2)]]);
    for (const ownPending of [{ loading: true }, { checking: true }]) {
      rerender(
        <StudioPageOrder
          {...props}
          previews={{
            ...pending,
            [key(2)]: { ...pending[key(2)], ...ownPending },
          }}
        />,
      );
      for (const region of [card, panel()]) {
        const retry = within(region).getByRole("button", {
          name: /미리보기 다시 시도/,
        });
        expect(retry).toBeDisabled();
        fireEvent.click(retry);
      }
    }
    expect(onRetryPreview).toHaveBeenCalledTimes(2);
  });

  it("다른 쪽이 준비 중이어도 URL이 있는 확인 중 쪽의 단추·키보드·손잡이·놓기가 동작한다", () => {
    const { onMove, onToggle } = setup({
      previews: {
        ...previews,
        [key(0)]: { url: "", loading: true },
        [key(1)]: { url: "blob:early", checking: true },
      },
    });
    const cards = [...grid().querySelectorAll("figure")];
    const grip = within(cards[1]).getByRole("button", {
      name: /선택/,
    });
    expect(grip).toBeEnabled();
    expect(grip).toHaveAttribute("draggable", "true");
    fireEvent.click(within(panel()).getByRole("button", { name: "뒤로" }));
    fireEvent.keyDown(grip, { key: "ArrowRight", altKey: true });
    expect(onMove.mock.calls).toEqual([
      [key(1), "next"],
      [key(1), "next"],
    ]);
    fireEvent.click(
      within(cards[1]).getByRole("button", { name: "본문.pdf 원본 2쪽 빼기" }),
    );
    fireEvent.click(
      within(panel()).getByRole("button", { name: "이 쪽 빼기" }),
    );
    expect(onToggle.mock.calls).toEqual([[key(1)], [key(1)]]);
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
    fireEvent.dragStart(grip, { dataTransfer });
    dragAt("dragOver", cards[2], 230, dataTransfer);
    expect(cards[2]).toHaveAttribute("data-drop", "after");
    dragAt("drop", cards[2], 230, dataTransfer);
    expect(onMove).toHaveBeenLastCalledWith(key(1), { before: null });
    expect(
      within(panel()).getByRole("heading", { name: "새 1쪽" }),
    ).toBeVisible();
  });

  it.each([undefined, { url: "", loading: true }, { url: "", error: "실패" }])(
    "URL이 없는 쪽의 변경·키보드·끌기·놓기는 막고 선택은 유지한다 (%j)",
    (unready) => {
      const nextPreviews = { ...previews };
      if (unready) nextPreviews[key(1)] = unready;
      else delete nextPreviews[key(1)];
      const { onMove, onToggle } = setup({ previews: nextPreviews });
      const cards = [...grid().querySelectorAll("figure")];
      const grip = within(cards[1]).getByRole("button", {
        name: /선택/,
      });
      expect(grip).toBeEnabled();
      expect(grip).toHaveAttribute("draggable", "false");
      for (const button of [
        within(cards[1]).getByRole("button", {
          name: "본문.pdf 원본 2쪽 빼기",
        }),
        within(panel()).getByRole("button", { name: "이 쪽 빼기" }),
        within(panel()).getByRole("button", { name: "뒤로" }),
      ]) {
        expect(button).toBeDisabled();
        fireEvent.click(button);
      }
      fireEvent.keyDown(grip, { key: "ArrowRight", altKey: true });
      fireEvent.keyDown(screen.getByRole("region", { name: "쪽 순서 편집" }), {
        key: "ArrowRight",
        altKey: true,
      });
      const dataTransfer = {
        setData: vi.fn(),
        setDragImage: vi.fn(),
        effectAllowed: "",
        dropEffect: "",
      };
      fireEvent.dragStart(grip, { dataTransfer });
      expect(dataTransfer.setData).not.toHaveBeenCalled();
      const readyGrip = within(cards[2]).getByRole("button", {
        name: /선택/,
      });
      fireEvent.dragStart(readyGrip, { dataTransfer });
      dragAt("dragOver", cards[1], 0, dataTransfer);
      expect(cards[1]).not.toHaveAttribute("data-drop");
      dragAt("drop", cards[1], 0, dataTransfer);
      expect(onMove).not.toHaveBeenCalled();
      expect(onToggle).not.toHaveBeenCalled();
      select("본문.pdf 원본 2쪽");
      expect(
        within(panel()).getByText(unready?.error ?? "미리보기 준비 중"),
      ).toBeVisible();
    },
  );

  it("이미지 읽기 실패에도 다시 시도 단추가 있고 같은 URL의 새 미리보기는 실패 상태를 버린다", () => {
    const onRetryPreview = vi.fn();
    const { props, rerender } = setup({ onRetryPreview });
    const card = [...grid().querySelectorAll("figure")][1];
    fireEvent.error(within(card).getByRole("img"));
    fireEvent.error(within(panel()).getByRole("img"));
    for (const region of [card, panel()]) {
      expect(within(region).queryByRole("img")).toBeNull();
      expect(within(region).getByRole("alert")).toHaveTextContent(
        "미리보기를 불러오지 못했습니다.",
      );
      const retry = within(region).getByRole("button", {
        name: "본문.pdf 원본 2쪽 미리보기 다시 시도",
      });
      expect(retry).toHaveTextContent(/^다시 시도$/);
      fireEvent.click(retry);
    }
    expect(onRetryPreview.mock.calls).toEqual([[key(1)], [key(1)]]);
    rerender(
      <StudioPageOrder
        {...props}
        previews={{ ...previews, [key(2)]: { url: "", loading: true } }}
      />,
    );
    for (const region of [card, panel()]) {
      // Another page's update is not a fresh result for this failed URL.
      expect(within(region).queryByRole("img")).toBeNull();
      expect(
        within(region).getByRole("button", { name: /미리보기 다시 시도/ }),
      ).toBeEnabled();
    }
    rerender(
      <StudioPageOrder
        {...props}
        previews={{ ...previews, [key(1)]: { ...previews[key(1)] } }}
      />,
    );
    expect(within(card).getByRole("img")).toHaveAttribute("src", "blob:a-2");
    expect(within(panel()).getByRole("img")).toHaveAttribute("src", "blob:a-2");
  });

  it.each([
    ["ArrowRight", [1, 3, 2]],
    ["ArrowLeft", [2, 1, 3]],
  ] as const)(
    "Alt+%s moves the focused second handle instead of the previously selected first page",
    async (arrow, expected) => {
      const oneSource = [{ id: "a", name: "본문.pdf", pages: 3 }];
      const onMove = vi.fn();
      function Reorder() {
        const [pages, setPages] = useState(() => initialPageOrder(oneSource));
        return (
          <StudioPageOrder
            sources={oneSource}
            order={pages}
            previews={Object.fromEntries(
              pages.map((page) => [
                studioPageKey(page),
                { url: `blob:a-${page.page}` },
              ]),
            )}
            onToggle={() => {}}
            onMove={(key, direction) => {
              onMove(key, direction);
              setPages((current) => movePage(current, key, direction));
            }}
          />
        );
      }
      render(<Reorder />);
      const user = userEvent.setup();
      const secondHandle = screen.getByRole("button", {
        name: "본문.pdf 원본 2쪽 선택",
      });
      // Reach the actual handle by Tab without selecting the second page first.
      for (let i = 0; i < 12 && document.activeElement !== secondHandle; i++)
        await user.tab();
      expect(secondHandle).toHaveFocus();
      await user.keyboard(`{Alt>}{${arrow}}{/Alt}`);
      expect(
        [...grid().querySelectorAll("figure")].map(
          (card) => JSON.parse(card.dataset.stripKey!)[1],
        ),
      ).toEqual(expected);
      expect(secondHandle).toHaveFocus();
      expect(onMove).toHaveBeenCalledExactlyOnceWith(
        studioPageKey({ sourceId: "a", page: 2 }),
        arrow === "ArrowRight" ? "next" : "previous",
      );
    },
  );

  it("파일 딱지·활성 수·원본 신분을 표시하며 이전 작업에서 뺀 쪽을 제자리에 남긴다", () => {
    const { onToggle } = setup();
    expect(screen.getByText("시작할 쪽 2 · 뺀 쪽 1")).toBeVisible();
    expect(
      screen.getByText("본문.pdf 원본 1쪽은 이전 작업에서 뺀 쪽입니다."),
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

  it.each(["표지", "정답표"] as const)(
    "저장된 %s 제외는 이전 작업으로 알리고 새 판정 근거를 주장하지 않는다",
    (autoOut) => {
      const { onToggle } = setup({
        order: [{ ...order[0], autoOut }, ...order.slice(1)],
      });
      expect(
        screen.getByText("본문.pdf 원본 1쪽은 이전 작업에서 뺀 쪽입니다."),
      ).toBeVisible();
      expect(
        screen.getByRole("region", { name: "쪽 순서 편집" }),
      ).not.toHaveTextContent(
        /표지|정답표|문항 번호가 없습니다|보여 미리 뺐습니다/,
      );
      fireEvent.click(
        screen.getByRole("button", {
          name: "본문.pdf 원본 1쪽 이전 작업에서 뺀 쪽 되살리기",
        }),
      );
      expect(onToggle).toHaveBeenCalledExactlyOnceWith(key(0));
    },
  );

  it("새 자동 제외의 빈 쪽 표시와 이전 작업의 제외를 구분하며 되살린 쪽에는 안내를 남기지 않는다", () => {
    const pages: StudioOrderedPage[] = [
      { ...order[0], autoOut: "빈 쪽" },
      { ...order[1], out: true, autoOut: "정답표" },
      order[2],
    ];
    const { props, rerender, onToggle } = setup({ order: pages });
    expect(
      screen.getByText(
        "본문.pdf 원본 1쪽은 빈 쪽으로 보여 미리 뺐습니다 — 인쇄된 내용이 거의 없습니다.",
      ),
    ).toBeVisible();
    expect(
      screen.getByText("본문.pdf 원본 2쪽은 이전 작업에서 뺀 쪽입니다."),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", {
        name: "본문.pdf 원본 1쪽 미리 뺀 쪽 되살리기",
      }),
    );
    expect(onToggle).toHaveBeenCalledExactlyOnceWith(key(0));
    rerender(
      <StudioPageOrder
        {...props}
        order={pages.map((page) => ({ ...page, out: false }))}
      />,
    );
    expect(
      screen.queryByText(/미리 뺐습니다|이전 작업에서 뺀 쪽입니다/),
    ).toBeNull();
    expect(screen.getByText("시작할 쪽 3 · 뺀 쪽 0")).toBeVisible();
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

  it("카드의 선택 표면을 끌고 파란 놓일 자리를 표시해 파일 사이 이동을 요청한다", () => {
    const { onMove } = setup();
    const cards = [...grid().querySelectorAll("figure")];
    expect(cards.every((card) => !card.draggable)).toBe(true);
    const grip = within(cards[2]).getByRole("button", {
      name: "서술형 스캔.pdf 원본 1쪽 선택",
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
      name: "본문.pdf 원본 2쪽 선택",
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
