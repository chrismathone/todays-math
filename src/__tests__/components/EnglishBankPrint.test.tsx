import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EnglishBankPrint from "@/components/english/print/EnglishBankPrint";
import { EnglishRequestError } from "@/components/english/englishClient";
import { bankUiItem } from "../fixtures/englishBankUi";

vi.mock("@/components/english/print/useEnglishPages", () => ({
  useEnglishPages: () => ({
    pages: undefined,
    ready: true,
    layoutError: false,
    oversized: [],
    measureNode: null,
  }),
}));
beforeEach(() => {
  window.print = vi.fn();
});
afterEach(() => vi.restoreAllMocks());

describe("English composition printing", () => {
  it("verifies the current source before printing and excludes answers from the student paper", async () => {
    const items = [bankUiItem(2)],
      onVerify = vi.fn().mockResolvedValue(items);
    render(
      <EnglishBankPrint items={items} onClose={vi.fn()} onVerify={onVerify} />,
    );
    expect(document.querySelector("[data-english-teacher-box]")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "현재 묶음 인쇄" }));
    await waitFor(() => expect(window.print).toHaveBeenCalledOnce());
    expect(onVerify).toHaveBeenCalledOnce();
  });
  it("blocks stale originals instead of printing the old preview", async () => {
    render(
      <EnglishBankPrint
        items={[bankUiItem(2)]}
        onClose={vi.fn()}
        onVerify={vi
          .fn()
          .mockRejectedValue(new EnglishRequestError("changed", 409))}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "현재 묶음 인쇄" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "원본이 수정되었습니다",
    );
    expect(window.print).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "현재 묶음 인쇄" }),
    ).toBeDisabled();
  });
  it("allows a retry after a temporary verification failure", async () => {
    const items = [bankUiItem(2)];
    const verify = vi
      .fn()
      .mockRejectedValueOnce(new EnglishRequestError("연결 실패", 503))
      .mockResolvedValue(items);
    render(
      <EnglishBankPrint items={items} onClose={vi.fn()} onVerify={verify} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "현재 묶음 인쇄" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("연결 실패");
    fireEvent.click(screen.getByRole("button", { name: "현재 묶음 인쇄" }));
    await waitFor(() => expect(window.print).toHaveBeenCalledOnce());
    expect(verify).toHaveBeenCalledTimes(2);
  });
  it("blocks student printing for malformed underline questions but still offers teacher review", () => {
    render(
      <EnglishBankPrint
        items={[
          bankUiItem(1, {
            question: {
              ...bankUiItem(1).question,
              prompt:
                "다음 밑줄 친 부분 중 어법상 틀린 것은? Students ① read ② quietly.",
            },
          }),
        ]}
        onClose={vi.fn()}
        onVerify={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "현재 묶음 인쇄" }),
    ).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("밑줄 구간이 없습니다");
    fireEvent.change(screen.getByRole("combobox", { name: "인쇄할 묶음" }), {
      target: { value: "1" },
    });
    expect(document.querySelector("[data-english-teacher-box]")).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "현재 묶음 인쇄" }),
    ).toBeEnabled();
  });
  it("requires acknowledgement of draft state and closes with Escape", () => {
    const close = vi.fn();
    render(
      <EnglishBankPrint
        items={[bankUiItem(2, { status: "초안" })]}
        onClose={close}
        onVerify={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "현재 묶음 인쇄" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(
      screen.getByRole("button", { name: "현재 묶음 인쇄" }),
    ).toBeEnabled();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(close).toHaveBeenCalledOnce();
  });
});
