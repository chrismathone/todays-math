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
  it.each(["todo", "done"] as const)(
    "shows the unit once in C order for %s",
    (status) => {
      render(
        <ExplorerStudyBook
          grade="초등 5학년"
          unit="소수의 곱셈"
          journey={<p>진도판</p>}
          study={
            <DailyStudy
              plan={{
                ...plan,
                status,
                activities:
                  status === "done"
                    ? ([
                        {
                          ...later,
                          state: "done",
                          source: { title: "소수의 곱셈", subtitle: "" },
                        },
                      ] as FadingDailyPlan["activities"])
                    : plan.activities,
              }}
              busy={false}
              onStart={vi.fn()}
              startId="start"
            />
          }
        />,
      );
      const grade = screen.getByText("초등 5학년");
      const heading = screen.getByRole("heading", {
        name:
          status === "done" ? "오늘 공부를 마쳤어요" : "오늘도 한 칸씩 배워요",
      });
      const units = screen.getAllByText("소수의 곱셈");
      expect(units).toHaveLength(1);
      expect(
        grade.compareDocumentPosition(heading) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        heading.compareDocumentPosition(units[0]) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      if (status === "todo") {
        const invitation = screen.getByText(
          "배운 것을 떠올리고, 새 내용을 배워요.",
        );
        expect(
          units[0].compareDocumentPosition(invitation) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
      }
    },
  );
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
      name: /^나의 수학 여정$/,
    });
    fireEvent.click(journey);
    expect(journey).toHaveAttribute("aria-pressed", "true");
    const spread = screen.getByTestId("study-spread");
    fireEvent.touchStart(spread, { touches: [{ clientX: 50, clientY: 100 }] });
    fireEvent.touchEnd(spread, {
      changedTouches: [{ clientX: 200, clientY: 105 }],
    });
    expect(screen.getByRole("button", { name: /^오늘 공부$/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "나의 수학 여정 보기" }),
    );
    expect(journey).toHaveAttribute("aria-pressed", "true");
  });
});
