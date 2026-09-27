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
  it("uses a compact perimeter without a duplicate start and writes a planned unit in every future tile (D-142)", () => {
    const value = journey(2);
    const { container } = render(
      <DailyJourneyBoard journey={value} variant="map" onReviewDay={vi.fn()} />,
    );
    expect(
      container.querySelector('[data-journey-variant="map"]'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /1일차, 약수와 배수, 학습 완료/ }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /2일차, 약분과 통분, 학습 완료/ }),
    ).toBeVisible();
    expect(
      screen.getByLabelText("3일차, 약수와 배수, 오늘의 학습"),
    ).toBeVisible();
    const upcoming = [...container.querySelectorAll('[data-state="upcoming"]')];
    expect(upcoming).toHaveLength(9);
    upcoming.forEach((tile, index) => {
      const planned = value.upcoming[index + 1].title;
      expect(tile).toHaveTextContent(planned);
      expect(tile).not.toHaveTextContent("다음 여정");
      expect(tile.querySelector("[title]")).toHaveAttribute(
        "title",
        `초5 · 1학기 · ${planned}`,
      );
      expect(tile.querySelector("[aria-label]")).toHaveAttribute(
        "aria-label",
        `${index + 4}일차, ${planned}, 예정`,
      );
      expect(tile.querySelector("button")).toBeNull();
    });
    expect(container.querySelector("[data-journey-continue]")).toBeNull();
  });

  it("keeps «다음 여정» only beyond the planned horizon and marks the first tile of a new grade", () => {
    const value: DailyJourney = {
      ...journey(0),
      upcoming: [
        { title: "경우의 수와 확률", subtitle: "중학교 2학년" },
        { title: "제곱근과 실수", subtitle: "중학교 3학년", gradeStart: "중3" },
      ],
    };
    const { container } = render(
      <DailyJourneyBoard journey={value} variant="map" onReviewDay={vi.fn()} />,
    );
    const second = container.querySelector('[data-day-step="2"]')!;
    expect(second).toHaveTextContent("제곱근과 실수");
    expect(second.querySelector("[data-grade-start]")).toHaveTextContent("중3");
    expect(
      container.querySelector('[data-day-step="1"] [data-grade-start]'),
    ).toBeNull();
    for (const step of [3, 12])
      expect(
        container.querySelector(`[data-day-step="${step}"]`),
      ).toHaveTextContent("다음 여정");
  });

  it("offers line breaks inside long unit names without changing their letters", () => {
    const value: DailyJourney = {
      ...journey(0),
      upcoming: [{ title: "연립일차방정식", subtitle: "중학교 2학년" }],
    };
    const { container } = render(
      <DailyJourneyBoard journey={value} variant="map" onReviewDay={vi.fn()} />,
    );
    const title = container.querySelector(
      '[data-day-step="1"] [data-tile-title]',
    )!;
    expect(title.querySelectorAll("wbr")).toHaveLength(1);
    expect(title.textContent).toBe("연립일차방정식");
  });

  it("shows my current progress in the map centre as plain text, never as a control (D-30)", () => {
    const value: DailyJourney = {
      ...journey(2),
      position: {
        caption: "중2 · 7단원 중",
        ordinal: 3,
        title: "연립일차방정식",
        collected: 5,
        total: 35,
        due: 0,
      },
    };
    const { container } = render(
      <DailyJourneyBoard journey={value} variant="map" onReviewDay={vi.fn()} />,
    );
    const centre = container.querySelector("[data-journey-progress]")!;
    expect(centre).toHaveTextContent("중2 · 7단원 중");
    expect(centre).toHaveTextContent("3번째");
    expect(centre).toHaveTextContent("연립일차방정식");
    expect(centre).toHaveTextContent("모은 개념 5 / 35 · 기억 복습 0");
    expect(centre).not.toHaveTextContent("하루 한 칸");
    expect(
      centre.querySelector("button, a, [tabindex], [role=button]"),
    ).toBeNull();
    expect(centre).not.toHaveAttribute("tabindex");
  });

  it("names today's elementary lesson in the centre instead of the memory count", () => {
    const value: DailyJourney = {
      ...journey(0),
      position: {
        caption: "소단원 3개 중",
        ordinal: 1,
        title: "꺾은선그래프",
        note: "꺾은선그래프 알아보기",
        collected: 5,
        total: 30,
        due: 2,
      },
    };
    const { container } = render(
      <DailyJourneyBoard journey={value} variant="map" onReviewDay={vi.fn()} />,
    );
    const centre = container.querySelector("[data-journey-progress]")!;
    expect(centre).toHaveTextContent("소단원 3개 중");
    expect(centre).toHaveTextContent("1번째");
    expect(centre).toHaveTextContent(
      "꺾은선그래프 알아보기 · 모은 개념 5 / 30",
    );
    expect(centre).not.toHaveTextContent("기억 복습");
  });

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
