import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ModalShell } from "@/components/unified/figure-editor/editorUi";

it("opens the figure editor as a modal and restores focus after cancel", () => {
  const oldShowModal = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    "showModal",
  );
  const oldClose = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    "close",
  );
  const showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  const close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: showModal },
    close: { configurable: true, value: close },
  });
  const opener = document.createElement("button");
  document.body.append(opener);
  opener.focus();
  try {
    const onClose = vi.fn();
    const view = render(
      <ModalShell onClose={onClose} aria-label="도형 편집기">
        <button type="button">저장</button>
      </ModalShell>,
    );
    const dialog = screen.getByRole("dialog", { name: "도형 편집기" });
    expect(showModal).toHaveBeenCalledOnce();
    expect(dialog).toHaveAttribute("open");
    fireEvent(dialog, new Event("cancel", { bubbles: true, cancelable: true }));
    expect(onClose).toHaveBeenCalledOnce();
    view.unmount();
    expect(close).toHaveBeenCalledOnce();
    expect(opener).toHaveFocus();
  } finally {
    opener.remove();
    if (oldShowModal)
      Object.defineProperty(
        HTMLDialogElement.prototype,
        "showModal",
        oldShowModal,
      );
    else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
    if (oldClose)
      Object.defineProperty(HTMLDialogElement.prototype, "close", oldClose);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
  }
});
