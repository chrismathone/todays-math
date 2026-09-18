/**
 * 저장한 시험지 카드의 삭제 확인 — **카드 안에 펼치지 않고 겹쳐 뜨는 창으로** (2026-09-19 원장님
 * «내 시험지 삭제 시에 카드가 늘어나지 말고 덧씌우기 같은 이중창 같은 형식으로»).
 *
 * jsdom 은 `showModal()` 을 구현하지 않는다 — 다른 작업실 시험(`UnifiedWorkspace.access`)과 같은
 * 대역을 쓴다. 그래서 **초점 가두기·배경 무력화는 여기서 못 본다**(브라우저가 하는 일). 여기서 지키는
 * 것은 «모달로 열었는가 · 무엇으로 닫히는가 · 초점이 어디로 가는가 · 문구가 어디에 있는가»다.
 */
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SavedWorksheetActions from "@/components/unified/SavedWorksheetActions";

const showModal = vi.fn(function (this: HTMLDialogElement) {
  this.setAttribute("open", "");
});
beforeEach(() => {
  showModal.mockClear();
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: showModal },
    close: {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.removeAttribute("open");
      },
    },
  });
});
afterEach(() => {
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});

function setup({
  current = false,
  error = null,
  onDelete = vi.fn(() => true),
}: {
  current?: boolean;
  error?: string | null;
  onDelete?: () => boolean;
} = {}) {
  const view = render(
    <article>
      <h2>1학기 중간</h2>
      <SavedWorksheetActions
        title="1학기 중간"
        current={current}
        error={error}
        onRename={vi.fn(() => true)}
        onDelete={onDelete}
      />
    </article>,
  );
  const card = view.container.querySelector("article")!;
  const trigger = within(card).getByRole("button", { name: "1학기 중간 삭제" });
  const open = () => {
    trigger.focus();
    fireEvent.click(trigger);
    return screen.getByRole("dialog", {
      name: "‘1학기 중간’ 시험지를 삭제할까요?",
    });
  };
  return { card, trigger, open, onDelete };
}

describe("저장한 시험지 삭제 확인 창", () => {
  it("삭제를 누르면 모달 창으로 열리고 카드 안에는 확인 문구가 펼쳐지지 않는다", () => {
    const { card, open } = setup();
    const dialog = open();
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(dialog).toHaveAttribute("open");
    expect(card.contains(dialog)).toBe(false);
    expect(within(card).queryByText(/삭제할까요/)).not.toBeInTheDocument();
    expect(
      within(card).queryByRole("button", { name: "삭제 확인" }),
    ).not.toBeInTheDocument();
    expect(dialog).toHaveAccessibleDescription(
      "저장된 시험지와 담은 문제가 삭제됩니다.",
    );
    expect(within(dialog).getByRole("button", { name: "취소" })).toHaveFocus();
  });

  it("현재 작업을 지울 때는 지금 문구 그대로 «빈 시험지로 돌아갑니다»를 덧붙인다", () => {
    const dialog = setup({ current: true }).open();
    expect(dialog).toHaveAccessibleDescription(
      "현재 작업을 닫고 빈 시험지로 돌아갑니다.",
    );
  });

  it("취소를 누르면 닫히고 초점이 누른 삭제 단추로 돌아간다", () => {
    const { trigger, open, onDelete } = setup();
    const dialog = open();
    fireEvent.click(within(dialog).getByRole("button", { name: "취소" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("Esc(취소 사건)로 닫히고 초점이 돌아간다", () => {
    const { trigger, open, onDelete } = setup();
    const dialog = open();
    const cancel = new Event("cancel", { cancelable: true });
    fireEvent(dialog, cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("창 바깥(배경)을 누르면 닫히고, 창 안의 여백을 누르면 닫히지 않는다", () => {
    const { trigger, open } = setup();
    const dialog = open();
    vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue({
      x: 100,
      y: 100,
      left: 100,
      top: 100,
      right: 670,
      bottom: 300,
      width: 570,
      height: 200,
      toJSON: () => ({}),
    });
    // 창 안 여백 — 대상은 dialog 자신이지만 좌표가 창 안이다.
    fireEvent.pointerDown(dialog, { clientX: 110, clientY: 110 });
    fireEvent.click(dialog, { clientX: 110, clientY: 110 });
    expect(screen.getByRole("dialog")).toBe(dialog);
    // 글자를 긁다가 바깥에서 뗀 것 — 누른 곳이 창 안이면 닫지 않는다.
    fireEvent.pointerDown(within(dialog).getByRole("heading", { level: 2 }), {
      clientX: 200,
      clientY: 150,
    });
    fireEvent.click(dialog, { clientX: 20, clientY: 20 });
    expect(screen.getByRole("dialog")).toBe(dialog);
    // 배경 — 누른 곳과 뗀 곳이 모두 창 밖.
    fireEvent.pointerDown(dialog, { clientX: 20, clientY: 20 });
    fireEvent.click(dialog, { clientX: 20, clientY: 20 });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("삭제 확인은 기존 삭제 호출을 부르고 성공하면 창을 닫는다", () => {
    const { open, onDelete } = setup();
    const dialog = open();
    fireEvent.click(within(dialog).getByRole("button", { name: "삭제 확인" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("삭제가 실패하면 오류를 창 안에 보이고 창은 열린 채로 둔다", () => {
    const onDelete = vi.fn(() => false);
    const { card, open } = setup({
      onDelete,
      error: "브라우저 저장 공간에 쓰지 못했습니다.",
    });
    const dialog = open();
    fireEvent.click(within(dialog).getByRole("button", { name: "삭제 확인" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "브라우저 저장 공간에 쓰지 못했습니다.",
    );
    expect(within(card).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("이름 변경은 지금처럼 카드 안에 입력칸을 펼친다(원장님이 말씀하신 것은 삭제뿐)", () => {
    const { card } = setup();
    fireEvent.click(
      within(card).getByRole("button", { name: "1학기 중간 이름 변경" }),
    );
    expect(
      within(card).getByRole("textbox", { name: "새 시험지 이름" }),
    ).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
