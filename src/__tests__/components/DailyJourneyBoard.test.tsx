import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DailyJourneyBoard, {
  type DailyJourney,
} from "@/components/math-srs/DailyJourneyBoard";

function journey(completedDays = 0): DailyJourney {
  return {
    completedDays,
    todayComplete: false,
    todayAnswered: 0,
    todayGoal: 10,
    days: Array.from({ length: completedDays }, (_, index) => ({
      id: `elementary:2026-09-${String(index + 1).padStart(2, "0")}`,
      date: `2026-09-${String(index + 1).padStart(2, "0")}`,
      completedAt: "2026-09-26T09:00:00.000Z",
      title: index % 2 ? "약분과 통분" : "약수와 배수",
      subtitle: "초5 · 1학기",
      reviewCount: 10,
    })),
    upcoming: Array.from({ length: 12 }, (_, index) => ({
      title: index % 2 ? "분수의 덧셈과 뺄셈" : "약수와 배수",
      subtitle: "초5 · 1학기",
    })),
  };
}

describe("DailyJourneyBoard", () => {
  it("keeps the pawn in place while individual problems and retries are answered", () => {
    const initial = journey(2);
    const { rerender } = render(
      <DailyJourneyBoard journey={initial} onReviewDay={vi.fn()} />,
    );
    const before = screen
      .getByLabelText("내 말, 2일 학습 완료")
      .getAttribute("style");
    for (const todayAnswered of [1, 5, 10]) {
      rerender(
        <DailyJourneyBoard
          journey={{ ...initial, todayAnswered }}
          onReviewDay={vi.fn()}
        />,
      );
      expect(
        screen.getByLabelText("내 말, 2일 학습 완료").getAttribute("style"),
      ).toBe(before);
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "value",
        String(todayAnswered),
      );
    }
    expect(screen.getByText("오답 복습을 마치면 전진해요")).toBeVisible();
    expect(screen.queryByText("오늘의 한 칸 완료!")).not.toBeInTheDocument();
  });

  it("moves exactly one day when the whole daily workload is completed", () => {
    const { rerender, container } = render(
      <DailyJourneyBoard
        journey={{ ...journey(2), todayAnswered: 10 }}
        onReviewDay={vi.fn()}
      />,
    );
    const before = screen
      .getByLabelText("내 말, 2일 학습 완료")
      .getAttribute("style");
    rerender(
      <DailyJourneyBoard
        journey={{ ...journey(3), todayAnswered: 10, todayComplete: true }}
        onNext={vi.fn()}
        onReviewDay={vi.fn()}
      />,
    );
    expect(
      screen.getByLabelText("내 말, 3일 학습 완료").getAttribute("style"),
    ).not.toBe(before);
    expect(container.querySelectorAll('[data-state="complete"]')).toHaveLength(
      3,
    );
    expect(screen.getByText("오늘의 한 칸 완료!")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /이어서 학습하기/ }),
    ).not.toBeInTheDocument();
  });

  it("preserves the accumulated position when a new day's counter resets", () => {
    const { rerender } = render(
      <DailyJourneyBoard
        journey={{ ...journey(5), todayAnswered: 10, todayComplete: true }}
        onReviewDay={vi.fn()}
      />,
    );
    const before = screen
      .getByLabelText("내 말, 5일 학습 완료")
      .getAttribute("style");
    rerender(
      <DailyJourneyBoard
        journey={journey(5)}
        onNext={vi.fn()}
        onReviewDay={vi.fn()}
      />,
    );
    expect(
      screen.getByLabelText("내 말, 5일 학습 완료").getAttribute("style"),
    ).toBe(before);
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "0");
    expect(
      screen.getByRole("button", { name: "6일차, 약수와 배수, 오늘의 학습" }),
    ).toHaveAttribute("aria-current", "step");
  });

  it("keeps daily stages at readable fixed board size and allows returning to past days", () => {
    const value = journey(17);
    const onReviewDay = vi.fn();
    const { container } = render(
      <DailyJourneyBoard journey={value} onReviewDay={onReviewDay} />,
    );
    expect(container.querySelector("[data-journey-page]")).toHaveAttribute(
      "data-journey-page",
      "2",
    );
    expect(container.querySelectorAll("[data-day-step]")).toHaveLength(12);
    expect(screen.getByLabelText("내 말, 17일 학습 완료")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "이전 진도판" }));
    expect(container.querySelector("[data-journey-page]")).toHaveAttribute(
      "data-journey-page",
      "1",
    );
    const tile = screen.getByRole("button", {
      name: "1일차, 약수와 배수, 학습 완료, 다시 풀기",
    });
    fireEvent.click(tile);
    expect(onReviewDay).toHaveBeenCalledWith(value.days[0], tile);
    expect(
      screen.queryByLabelText("내 말, 17일 학습 완료"),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "현재 위치로" }));
    expect(screen.getByLabelText("내 말, 17일 학습 완료")).toBeVisible();
  });

  it("shows a new board after twelve completed learning days without advancing the pawn", () => {
    const { rerender, container } = render(
      <DailyJourneyBoard
        journey={{ ...journey(12), todayComplete: true }}
        onReviewDay={vi.fn()}
      />,
    );
    expect(container.querySelector("[data-journey-page]")).toHaveAttribute(
      "data-journey-page",
      "1",
    );
    rerender(
      <DailyJourneyBoard
        journey={journey(12)}
        onNext={vi.fn()}
        onReviewDay={vi.fn()}
      />,
    );
    expect(container.querySelector("[data-journey-page]")).toHaveAttribute(
      "data-journey-page",
      "2",
    );
    expect(screen.getByLabelText("내 말, 12일 학습 완료")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "13일차, 약수와 배수, 오늘의 학습" }),
    ).toBeVisible();
  });

  it("only enables completed days with available saved problems and today's stage", () => {
    const value = journey(2);
    value.days = value.days.map((day, index) => ({
      ...day,
      reviewCount: index ? 0 : 10,
    }));
    const onNext = vi.fn();
    render(
      <DailyJourneyBoard
        journey={value}
        onNext={onNext}
        onReviewDay={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /1일차, .*다시 풀기/ }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: /^2일차,/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^4일차,/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "3일차, 약수와 배수, 오늘의 학습" }),
    );
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("never lets review taps or page navigation advance the pawn", () => {
    const value = journey(4);
    render(<DailyJourneyBoard journey={value} onReviewDay={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /1일차, .*다시 풀기/ }));
    fireEvent.click(screen.getByRole("button", { name: "다음 진도판" }));
    fireEvent.click(screen.getByRole("button", { name: "현재 위치로" }));
    expect(screen.getByLabelText("내 말, 4일 학습 완료")).toBeVisible();
  });

  it("blocks all interactions during a pending request", () => {
    render(
      <DailyJourneyBoard
        journey={journey(4)}
        onNext={vi.fn()}
        onReviewDay={vi.fn()}
        busy
      />,
    );
    for (const button of screen.getAllByRole("button"))
      expect(button).toBeDisabled();
  });
});
