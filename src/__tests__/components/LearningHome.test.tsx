import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LearningHome } from "@/components/math-srs/LearningHome";
import { createStore } from "@/lib/math-srs/storage";

afterEach(cleanup);
const now = new Date("2026-09-23T00:00:00Z");

describe("concept memory exploration", () => {
  it("filters only measured concepts that are due and exposes their actual review record", async () => {
    const learner = createStore().learners[0];
    learner.memories[0] = {
      ...learner.memories[0],
      attempts: 2,
      successes: 1,
      mastery: 45,
      lastReviewedAt: "2026-09-20T00:00:00Z",
      nextReviewAt: "2026-09-22T00:00:00Z",
    };
    learner.memories[1] = {
      ...learner.memories[1],
      attempts: 1,
      lastReviewedAt: "2026-09-22T00:00:00Z",
      nextReviewAt: "2026-09-25T00:00:00Z",
    };
    const user = userEvent.setup();
    render(<LearningHome learner={learner} now={now} onStart={() => {}} />);
    await user.click(screen.getByRole("button", { name: "복습할 개념 1" }));
    expect(
      screen.queryByRole("heading", { name: "두 단계 방정식" }),
    ).not.toBeInTheDocument();
    const heading = screen.getByRole("heading", { name: "등식의 성질" });
    await user.click(heading);
    expect(heading.closest("details")).toHaveAttribute("open");
    expect(screen.getByText("9월 20일")).toBeInTheDocument();
    expect(screen.getByText("지금 복습해요")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "전체 개념 6" }));
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(6);
  });

  it("lets a new learner return from the empty due filter without inventing activity", async () => {
    const user = userEvent.setup();
    render(
      <LearningHome
        learner={createStore().learners[0]}
        now={now}
        onStart={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: "복습할 개념 0" }));
    expect(screen.getByText("지금 예정된 복습은 없어요.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "전체 개념 보기 →" }));
    expect(screen.getAllByText("측정 전")).toHaveLength(6);
    expect(
      screen.getByLabelText("2026-09-23, 0문제, 오늘"),
    ).toBeInTheDocument();
  });
});
