/**
 * 공용 고르기 창(`PickerDialog`, D-159) — 시험지 만들기의 «구성 조건»(W4)과 «문항 교체»(W3)를 위해 넓힌 것.
 *
 *   머리 단추 둘(취소 · 적용) · 적용을 끄기 · 바닥 줄 · 내용만큼의 높이 · 밝은 닫기 단추.
 *   넓히지 않은 쓰임(단원 고르기 · 출처 고르기)은 지금과 같아야 한다 — 단추 하나 · 초점 · Esc.
 */
import "@testing-library/jest-dom/vitest";
import { useRef } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PickerDialog } from "@/components/picker-dialog/PickerDialog";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(cleanup);

function Opened(props: Partial<React.ComponentProps<typeof PickerDialog>>) {
  const opener = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={opener}>열기</button>
      <PickerDialog
        title="구성 조건"
        onClose={vi.fn()}
        returnFocus={opener}
        {...props}
      >
        <p>내용</p>
      </PickerDialog>
    </>
  );
}

describe("PickerDialog", () => {
  it("keeps the one-button form for existing pickers (focus on done · Esc closes)", () => {
    const onClose = vi.fn();
    render(<Opened onClose={onClose} />);
    const dialog = screen.getByRole("dialog", { name: "구성 조건" });
    const buttons = dialog.querySelectorAll("header button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveTextContent("닫기");
    expect(buttons[0]).toHaveFocus();
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(dialog.querySelector("footer")).toBeNull();
    expect(dialog).toHaveAttribute("data-size", "fill");
  });

  it("puts a cancel button beside done that discards, and done can be turned off", () => {
    const onClose = vi.fn();
    const onCancel = vi.fn();
    render(
      <Opened
        doneLabel="적용"
        cancelLabel="취소"
        doneDisabled
        onClose={onClose}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(onCancel).toHaveBeenCalledOnce();
    const done = screen.getByRole("button", { name: "적용" });
    expect(done).toBeDisabled();
    fireEvent.click(done);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent(
      screen.getByRole("dialog"),
      new Event("cancel", { cancelable: true }),
    );
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("draws a footer line, a plain done button and a content-height size when asked", () => {
    render(
      <Opened doneTone="plain" size="fit" footer={<span>바닥 줄</span>} />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector("footer")).toHaveTextContent("바닥 줄");
    expect(screen.getByRole("button", { name: "닫기" })).toHaveAttribute(
      "data-tone",
      "plain",
    );
    expect(dialog).toHaveAttribute("data-size", "fit");
  });
});
