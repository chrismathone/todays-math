/**
 * 진도판 테마(원장님 2026-09-30) — 판 그림 위에 칸 글자 받침, 탈것은 가는 쪽을 본다(4방향).
 * 지금 판(classic)은 아무것도 안 바뀐다(손 그린 말 SVG · 테마 그림 없음).
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DailyJourneyBoard, {
  riderHeading,
  type DailyJourney,
} from "@/components/math-srs/DailyJourneyBoard";
import { JOURNEY_THEMES } from "@/lib/math-explorers/journeyThemes";

function journey(completedDays: number): DailyJourney {
  return {
    completedDays,
    todayComplete: false,
    todayAnswered: 0,
    todayGoal: 10,
    days: Array.from({ length: completedDays }, (_, index) => ({
      id: `elementary:2026-09-${String(index + 1).padStart(2, "0")}`,
      date: `2026-09-${String(index + 1).padStart(2, "0")}`,
      completedAt: "2026-09-26T09:00:00.000Z",
      title: "약수와 배수",
      subtitle: "초5 · 1학기",
      reviewCount: 0,
    })),
    upcoming: Array.from({ length: 12 }, () => ({
      title: "약분과 통분",
      subtitle: "초5 · 1학기",
    })),
  };
}

describe("rider heading — the rider faces the way it goes next", () => {
  it("goes left along the bottom, up the left side, right along the top, down the right side", () => {
    expect([...Array(13).keys()].map(riderHeading)).toEqual([
      "left", "left", "left", "left",
      "up", "up", "up",
      "right", "right", "right",
      "down", "down",
      // 12 = 다음 쪽 첫 칸 앞(오른쪽 아래 모서리)으로 — 다음 쪽 1일차 칸은 다시 왼쪽
      "left",
    ]);
  });
});

describe("themed board", () => {
  it("keeps the classic board untouched", () => {
    const { container } = render(
      <DailyJourneyBoard journey={journey(2)} variant="map" onReviewDay={vi.fn()} />,
    );
    expect(container.querySelector("[data-journey-theme]")).toHaveAttribute(
      "data-journey-theme",
      "classic",
    );
    expect(container.querySelector("[data-pawn-figure] svg")).toBeInTheDocument();
    expect(container.querySelector("[data-pawn-figure] img")).toBeNull();
    expect(screen.getByLabelText("내 말, 2일 학습 완료")).toBeInTheDocument();
  });

  it("lays the board art and shows the rider facing its next move", () => {
    const { container } = render(
      <DailyJourneyBoard journey={journey(5)} variant="map" theme="sky" onReviewDay={vi.fn()} />,
    );
    const board = container.querySelector<HTMLElement>("[data-journey-page]")!;
    expect(board.style.getPropertyValue("--journey-board")).toBe(
      `url(${JOURNEY_THEMES.sky.boardImage})`,
    );
    const rider = screen.getByLabelText("내 열기구, 5일 학습 완료");
    // 5일차(왼쪽 줄 아래에서 둘째) — 다음은 위로
    expect(rider).toHaveAttribute("data-heading", "up");
    expect(rider).toHaveAttribute("data-motion", "sway");
    const views = [...rider.querySelectorAll("img")].map((img) => img.getAttribute("src"));
    expect(views).toEqual([
      "/images/journey/sky-left.webp",
      "/images/journey/sky-up.webp",
      "/images/journey/sky-down.webp",
    ]);
  });

  it("draws a wheeled rider as body plus separate wheels", () => {
    const { container } = render(
      <DailyJourneyBoard journey={journey(1)} variant="map" theme="forest" onReviewDay={vi.fn()} />,
    );
    const rider = screen.getByLabelText("내 탐험 수레, 1일 학습 완료");
    expect(rider).toHaveAttribute("data-heading", "left");
    const images = JOURNEY_THEMES.forest.riderImages!;
    const wheels = container.querySelectorAll("[data-wheel]");
    expect(wheels.length).toBe(images.wheels?.length ?? 0);
    expect(wheels.length).toBeGreaterThan(0);
    expect(container.querySelector(`img[src="${images.body}"]`)).toBeInTheDocument();
  });

  it("keeps every stop label and the reviewable days pressable on a themed board", () => {
    render(
      <DailyJourneyBoard
        journey={{ ...journey(2), days: journey(2).days.map((d) => ({ ...d, reviewCount: 3 })) }}
        variant="map"
        theme="shapes"
        onReviewDay={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /1일차, 약수와 배수, 학습 완료/ })).toBeVisible();
    expect(screen.getByLabelText("3일차, 약분과 통분, 오늘의 학습")).toBeVisible();
  });
});
