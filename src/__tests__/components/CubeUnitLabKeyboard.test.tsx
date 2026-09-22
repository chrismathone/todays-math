import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CubeUnitLab from "@/components/lab/cube31/CubeUnitLab";

vi.mock("next/dynamic", () => ({ default: () => () => <p>3D 수 모형</p> }));

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

describe("CubeUnitLab keyboard learning flow", () => {
  it("checks an answer and continues on a separate Enter press without a mouse", async () => {
    const user = userEvent.setup();
    render(<CubeUnitLab practice={[]} />);
    expect(screen.getByRole("textbox", { name: "답" })).toHaveFocus();

    await user.keyboard("2{Enter}");
    expect(screen.getByText("모두 맞았어요!")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음 활동 →" })).toHaveFocus();
    expect(
      screen.getByRole("heading", { name: "312를 분해해요" }),
    ).toBeInTheDocument();

    await user.keyboard("{Enter}");
    expect(screen.getByRole("radio", { name: "낱개 1개" })).toHaveFocus();
    await user.keyboard("{ArrowDown}{Enter}");
    expect(screen.getByRole("button", { name: "다음 활동 →" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("heading", { name: "백 묶음을 풀어 봐요" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "답" })).toHaveFocus();
  });

  it("keeps an incorrect answer editable instead of continuing", async () => {
    const user = userEvent.setup();
    render(<CubeUnitLab practice={[]} />);
    await user.keyboard("3{Enter}{Enter}");
    expect(
      screen.queryByRole("button", { name: "다음 활동 →" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "답" })).toHaveFocus();
    await user.keyboard("{Backspace}2{Enter}");
    expect(screen.getByText("모두 맞았어요!")).toBeInTheDocument();
  });

  it("cancels held or IME-confirming Enter before native form/button actions", async () => {
    const user = userEvent.setup();
    render(<CubeUnitLab practice={[]} />);
    await user.keyboard("2");
    const input = screen.getByRole("textbox", { name: "답" });
    for (const extra of [
      { repeat: true },
      { isComposing: true },
      { keyCode: 229 },
    ]) {
      expect(fireEvent.keyDown(input, { key: "Enter", ...extra })).toBe(false);
    }
    expect(
      screen.queryByRole("button", { name: "다음 활동 →" }),
    ).not.toBeInTheDocument();
    await user.keyboard("{Enter}");
    const next = screen.getByRole("button", { name: "다음 활동 →" });
    expect(fireEvent.keyDown(next, { key: "Enter", repeat: true })).toBe(false);
    expect(next).toHaveFocus();
  });
});
