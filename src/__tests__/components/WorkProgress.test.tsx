import { StrictMode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WorkProgress from "@/components/unified/WorkProgress";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-14T00:00:00Z"));
});

afterEach(() => vi.useRealTimers());

describe("WorkProgress", () => {
  it("keeps unknown work indeterminate even after a long wait", () => {
    render(
      <WorkProgress label="자료 확인 중" detail="서버 응답을 기다립니다." />,
    );
    const status = screen.getByRole("status");
    const bar = screen.getByRole("progressbar", { name: "자료 확인 중" });
    expect(bar).not.toHaveAttribute("aria-valuenow");
    act(() => vi.advanceTimersByTime(44_000));
    expect(screen.queryByText("응답 대기 중")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(21_000));
    expect(screen.getByText("응답 대기 중")).toHaveTextContent(
      "완료 시간은 아직 알 수 없습니다.",
    );
    expect(screen.getByRole("timer")).toHaveTextContent("1분 5초 경과");
    expect(screen.getByRole("timer")).toHaveAttribute("aria-live", "off");
    expect(status).toHaveTextContent("자료 확인 중서버 응답을 기다립니다.");
    expect(status).not.toHaveTextContent("초 경과");
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(bar.textContent).not.toContain("%");
  });

  it("updates only from real counts without resetting elapsed time", () => {
    const { rerender } = render(
      <WorkProgress label="변환 중" completed={0} total={8} unit="문항" />,
    );
    expect(screen.getByText("0 / 8 문항")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
    act(() => vi.advanceTimersByTime(5_000));
    rerender(
      <WorkProgress label="검증 중" completed={3} total={8} unit="문항" />,
    );
    expect(screen.getByText("3 / 8 문항")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "3",
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuemax",
      "8",
    );
    expect(screen.getByRole("progressbar").firstElementChild).toHaveStyle({
      width: "37.5%",
    });
    expect(screen.getByRole("timer")).toHaveTextContent("5초 경과");
  });

  it.each([
    { completed: 3 },
    { total: 8 },
    { completed: 0, total: 0 },
    { completed: -1, total: 8 },
    { completed: Number.NaN, total: 8 },
    { completed: 3, total: Infinity },
    { completed: 9, total: 8 },
  ])(
    "does not infer a percent from missing or inconsistent counts: %j",
    (counts) => {
      render(<WorkProgress label="작업 중" {...counts} />);
      expect(screen.getByRole("progressbar")).not.toHaveAttribute(
        "aria-valuenow",
      );
    },
  );

  it("uses an external start time, resets for a new operation, and cleans up in StrictMode", () => {
    const start = Date.now() - 61_000;
    const { rerender, unmount } = render(
      <StrictMode>
        <WorkProgress label="작업 중" startedAt={start} />
      </StrictMode>,
    );
    act(() => vi.advanceTimersByTime(0));
    expect(screen.getByRole("timer")).toHaveTextContent("1분 1초 경과");
    expect(vi.getTimerCount()).toBe(1);
    rerender(
      <StrictMode>
        <WorkProgress label="새 작업" startedAt={Date.now()} />
      </StrictMode>,
    );
    act(() => vi.advanceTimersByTime(0));
    expect(screen.getByRole("timer")).toHaveTextContent("0초 경과");
    expect(screen.queryByText("응답 대기 중")).not.toBeInTheDocument();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("shows a waiting message without a ticking clock when elapsed display is disabled", () => {
    const { unmount } = render(
      <WorkProgress label="작업 중" showElapsed={false} />,
    );
    act(() => vi.advanceTimersByTime(45_000));
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
    expect(screen.getByText("응답 대기 중")).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
    unmount();
  });

  it("cancels without submitting a surrounding form", () => {
    const cancel = vi.fn();
    const submit = vi.fn();
    render(
      <form onSubmit={submit}>
        <WorkProgress
          label="작업 중"
          onCancel={cancel}
          cancelLabel="작업 중단"
        />
      </form>,
    );
    fireEvent.click(screen.getByRole("button", { name: "작업 중단" }));
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(submit).not.toHaveBeenCalled();
  });

  it("renders inline inside a disabled button without block elements or a timer", () => {
    render(
      <button disabled>
        <WorkProgress label="인쇄 준비 중…" variant="inline" />
      </button>,
    );
    const button = screen.getByRole("button", { name: "인쇄 준비 중…" });
    expect(button).toBeDisabled();
    expect(button.querySelector("div, button, progress")).toBeNull();
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });
});
