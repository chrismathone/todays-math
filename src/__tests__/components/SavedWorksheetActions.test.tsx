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
  onRename = vi.fn((_name: string) => true),
}: {
  current?: boolean;
  error?: string | null;
  onDelete?: () => boolean;
  onRename?: (name: string) => boolean;
} = {}) {
  const view = render(
    <article>
      <h2>1학기 중간</h2>
      <SavedWorksheetActions
        title="1학기 중간"
        current={current}
        error={error}
        onRename={onRename}
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
  const renameTrigger = within(card).getByRole("button", {
    name: "1학기 중간 이름 변경",
  });
  const openRename = () => {
    renameTrigger.focus();
    fireEvent.click(renameTrigger);
    return screen.getByRole("dialog", { name: "이름 변경" });
  };
  return { card, trigger, open, onDelete, renameTrigger, openRename, onRename };
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
});

/**
 * 2026-09-19 원장님 결정(리드 추가 지시) — «이름 변경»도 삭제와 같은 겹쳐 뜨는 창으로.
 * 창 안에 지금의 입력칸(라벨 «새 시험지 이름», maxLength 80)과 [취소][이름 저장].
 */
describe("저장한 시험지 이름 변경 창", () => {
  it("이름 변경을 누르면 모달 창이 열리고 카드 안에는 입력칸이 펼쳐지지 않는다", () => {
    const { card, openRename } = setup();
    const dialog = openRename();
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(card.contains(dialog)).toBe(false);
    expect(within(card).queryByRole("textbox")).not.toBeInTheDocument();
    const input = within(dialog).getByRole("textbox", {
      name: "새 시험지 이름",
    }) as HTMLInputElement;
    expect(input).toHaveValue("1학기 중간");
    expect(input).toHaveAttribute("maxLength", "80");
    // 처음 초점은 입력칸 — 글자 전체가 선택돼 바로 새 이름을 칠 수 있다.
    expect(input).toHaveFocus();
    expect([input.selectionStart, input.selectionEnd]).toEqual([
      0,
      "1학기 중간".length,
    ]);
    const buttons = within(dialog).getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual([
      "취소",
      "이름 저장",
    ]);
  });

  it("빈 이름이면 이름 저장이 잠긴다", () => {
    const { openRename, onRename } = setup();
    const dialog = openRename();
    fireEvent.change(within(dialog).getByRole("textbox"), {
      target: { value: "   " },
    });
    expect(
      within(dialog).getByRole("button", { name: "이름 저장" }),
    ).toBeDisabled();
    fireEvent.submit(within(dialog).getByRole("textbox"));
    expect(onRename).not.toHaveBeenCalled();
  });

  it("Enter(제출)로 저장하고 성공하면 닫히며 초점이 이름 변경 단추로 돌아간다", () => {
    const { renameTrigger, openRename, onRename } = setup();
    const dialog = openRename();
    const input = within(dialog).getByRole("textbox");
    fireEvent.change(input, { target: { value: "1학기 기말" } });
    fireEvent.submit(input);
    expect(onRename).toHaveBeenCalledWith("1학기 기말");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(renameTrigger).toHaveFocus();
  });

  it("이름 저장 단추로도 저장한다", () => {
    const { openRename, onRename } = setup();
    const dialog = openRename();
    fireEvent.change(within(dialog).getByRole("textbox"), {
      target: { value: "2학기 중간" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "이름 저장" }));
    expect(onRename).toHaveBeenCalledWith("2학기 중간");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("저장이 실패하면 오류를 창 안에 보이고 창은 열린 채로 둔다", () => {
    const onRename = vi.fn((_name: string) => false);
    const { card, openRename } = setup({
      onRename,
      error: "브라우저 저장 공간에 쓰지 못했습니다.",
    });
    const dialog = openRename();
    fireEvent.submit(within(dialog).getByRole("textbox"));
    expect(onRename).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "브라우저 저장 공간에 쓰지 못했습니다.",
    );
    expect(within(card).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("취소·Esc·배경으로 닫히고 초점이 이름 변경 단추로 돌아간다", () => {
    const { renameTrigger, openRename, onRename } = setup();
    fireEvent.click(within(openRename()).getByRole("button", { name: "취소" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(renameTrigger).toHaveFocus();

    const escape = new Event("cancel", { cancelable: true });
    fireEvent(openRename(), escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(renameTrigger).toHaveFocus();

    const dialog = openRename();
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
    fireEvent.pointerDown(dialog, { clientX: 20, clientY: 20 });
    fireEvent.click(dialog, { clientX: 20, clientY: 20 });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(renameTrigger).toHaveFocus();
    expect(onRename).not.toHaveBeenCalled();
  });

  it("다시 열면 지금 이름으로 새로 채운다", () => {
    const { openRename } = setup();
    let dialog = openRename();
    fireEvent.change(within(dialog).getByRole("textbox"), {
      target: { value: "쓰다 만 이름" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "취소" }));
    dialog = openRename();
    expect(within(dialog).getByRole("textbox")).toHaveValue("1학기 중간");
  });
});
