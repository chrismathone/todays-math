import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  DailyStudy,
  ExplorerStudyBook,
} from "@/components/math-explorers/ExplorerStudyBook";
import type { FadingDailyPlan } from "@/contracts/fadingDaily.contract";

const later = {
  key: "later",
  kind: "practice",
  start: "start",
  source: { title: "소수의 곱셈" },
};
const first = { key: "first", kind: "recall", start: "open", terms: ["곱셈"] };
const plan = {
  status: "todo",
  next: "later",
  activities: [first, later],
  units: { recall: { done: 2 }, question: { done: 4 }, task: { done: 0 } },
} as unknown as FadingDailyPlan;

describe("§8.25 오늘 공부", () => {
  it("starts exactly plan.next, even when it is not the first activity", () => {
    const start = vi.fn();
    render(
      <DailyStudy plan={plan} busy={false} onStart={start} startId="start" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "오늘 공부 시작" }));
    expect(start).toHaveBeenCalledWith(later);
    expect(
      screen.queryByText(/배정|기본 분량|오늘 학습 순서|배울 개념/),
    ).toBeNull();
  });
  it.each(["done", "short"] as const)(
    "shows a truthful day ending for %s",
    (status) => {
      render(
        <DailyStudy
          plan={{ ...plan, status, next: null }}
          busy={false}
          onStart={vi.fn()}
          startId="start"
        />,
      );
      expect(screen.getByText("오늘 공부를 마쳤어요")).toBeInTheDocument();
      expect(
        screen.getByText("개념 2개 · 문제 4개 · 활동 0개"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("기억 복습과 다음 공부를 이어 가요."),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "오늘 공부 시작" }),
      ).toBeNull();
    },
  );
  it("turns the phone pages with the controls and horizontal swipes", () => {
    render(
      <ExplorerStudyBook
        grade="초등 5학년"
        unit="소수의 곱셈"
        study={<p>공부 면</p>}
        journey={<p>진도판</p>}
      />,
    );
    const journey = screen.getByRole("button", {
      name: "나의 수학 여정",
      exact: true,
    });
    fireEvent.click(journey);
    expect(journey).toHaveAttribute("aria-pressed", "true");
    const spread = screen.getByTestId("study-spread");
    fireEvent.touchStart(spread, { touches: [{ clientX: 50, clientY: 100 }] });
    fireEvent.touchEnd(spread, {
      changedTouches: [{ clientX: 200, clientY: 105 }],
    });
    expect(
      screen.getByRole("button", { name: "오늘 공부", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(
      screen.getByRole("button", { name: "나의 수학 여정 보기" }),
    );
    expect(journey).toHaveAttribute("aria-pressed", "true");
  });
});
