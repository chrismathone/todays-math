import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StudentProgressBoard from "@/components/math-srs/StudentProgressBoard";
import CourseProgressBoard from "@/components/math-srs/CourseProgressBoard";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import type {
  CoursePublicSession,
  CourseSummary,
} from "@/contracts/mathSrsCourse.contract";

describe("StudentProgressBoard", () => {
  it.each([5, 10, 12, 15, 20])(
    "places exactly %i real problems around a square perimeter",
    (goal) => {
      const { container } = render(
        <StudentProgressBoard
          completed={3}
          goal={goal}
          title="약수와 배수"
          subtitle="초5 · 1학기"
          onNext={vi.fn()}
        />,
      );
      const steps = [...container.querySelectorAll<HTMLElement>("[data-step]")];
      expect(steps).toHaveLength(goal);
      expect(
        steps.filter((step) => step.dataset.state === "complete"),
      ).toHaveLength(3);
      const size = Math.max(
        ...steps.map((step) => Number(step.style.gridRow)),
        ...steps.map((step) => Number(step.style.gridColumn)),
      );
      const positions = new Set<string>();
      for (const step of steps) {
        const row = Number(step.style.gridRow);
        const column = Number(step.style.gridColumn);
        expect(
          row === 1 || row === size || column === 1 || column === size,
        ).toBe(true);
        positions.add(`${row}:${column}`);
      }
      expect(positions.size).toBe(goal);
      expect(
        screen.getByRole("heading", { name: "약수와 배수" }),
      ).toBeVisible();
      expect(
        screen.getByLabelText("내 말, 3번까지 완료").querySelector("svg"),
      ).toBeInTheDocument();
    },
  );

  it("only opens explicitly reviewable completed problems and leaves future tiles inert", () => {
    const onReviewStep = vi.fn();
    const onNext = vi.fn();
    render(
      <StudentProgressBoard
        completed={5}
        goal={10}
        title="분수"
        reviewableSteps={[2, 9]}
        onReviewStep={onReviewStep}
        onNext={onNext}
        nextAriaLabel="6번부터 다음 5문제 시작"
      />,
    );
    const review = screen.getByRole("button", { name: "2번 완료, 풀이 보기" });
    fireEvent.click(review);
    expect(onReviewStep).toHaveBeenCalledWith(2, review);
    expect(
      screen.queryByRole("button", { name: "9번 완료, 풀이 보기" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "6번부터 다음 5문제 시작" }),
    );
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("stops offering new problems at the actual daily goal", () => {
    render(
      <StudentProgressBoard
        completed={10}
        goal={10}
        title="약수와 배수"
        onNext={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("오늘의 목표 완료")).toBeVisible();
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "10");
  });

  it("blocks both next actions while a request is pending", () => {
    render(
      <StudentProgressBoard
        completed={0}
        goal={12}
        title="일차방정식"
        onNext={vi.fn()}
        busy
      />,
    );
    for (const button of screen.getAllByRole("button"))
      expect(button).toBeDisabled();
  });

  it.each([12, 20])(
    "moves from departure after the first of %i problems",
    (goal) => {
      const { rerender } = render(
        <StudentProgressBoard completed={0} goal={goal} title="복습" />,
      );
      expect(screen.getByLabelText("출발 칸")).toBeVisible();
      const departure = screen
        .getByLabelText("내 말, 출발 전")
        .getAttribute("style");
      rerender(<StudentProgressBoard completed={1} goal={goal} title="복습" />);
      expect(
        screen.getByLabelText("내 말, 1번까지 완료").getAttribute("style"),
      ).not.toBe(departure);
    },
  );
});

const summary: CourseSummary = {
  status: "ready",
  currentSectionId: "5-1-2-1",
  dueCount: 0,
  todayAnswered: 5,
  todayCorrect: 4,
  todayGoal: 10,
  completedSections: 0,
  lastPracticedAt: null,
  nextReviewAt: null,
  recommendation: {
    sectionId: "5-1-2-1",
    mode: "learn",
    reason: "이어서 학습",
  },
};
const session: CoursePublicSession = {
  id: "session-1",
  mode: "learn",
  startedAt: "2026-09-25T09:55:00.000Z",
  sectionId: "5-1-2-1",
  completedAt: "2026-09-25T10:00:00.000Z",
  problems: Array.from({ length: 5 }, (_, index) => ({
    id: `problem-${index}`,
    sectionId: "5-1-2-1",
    tier: "기본",
    content: "28의 약수를 구하시오.",
    figureUrl: null,
    answerChoices: ["2", "3", "5", "6"],
    interactive: null,
    input: { mode: "number", label: "나의 답", placeholder: "", help: "" },
    hint: null,
    feedback: null,
  })),
  attempts: Array.from({ length: 5 }, (_, index) => ({
    problemId: `problem-${index}`,
    submittedAnswer: "2",
    correct: index !== 1,
    usedHint: false,
    selfAssessed: false,
    answeredAt: "2026-09-25T10:00:00.000Z",
  })),
  retry: { completedAt: null, attempts: [], pendingProblemIds: ["problem-1"] },
};

describe("CourseProgressBoard adapter", () => {
  it("labels the next unit at home and the solved unit when reviewing a session", () => {
    const current = COURSE_SECTIONS[0];
    const next = COURSE_SECTIONS[1];
    const nextSummary = {
      ...summary,
      currentSectionId: current.id,
      recommendation: { ...summary.recommendation!, sectionId: next.id },
    };
    // Since 2026-09-26 (705544df6) this adapter draws the journey (StudentJourney), not the
    // square board: the unit is read as the name of today's tile, no longer as a heading.
    const today = (title: string) =>
      screen.getByLabelText(`1일차, ${title}, 오늘의 학습`);
    const { rerender } = render(<CourseProgressBoard summary={nextSummary} />);
    expect(today(next.title)).toBeVisible();
    rerender(
      <CourseProgressBoard
        summary={nextSummary}
        session={{ ...session, sectionId: current.id }}
      />,
    );
    expect(today(current.title)).toBeVisible();
  });

  it("offers neither explanations nor replays on the journey, before or after the wrong-answer round", () => {
    // The square board's per-problem «풀이 보기» · «다시 풀기» tiles left this adapter with the
    // journey; replay now starts from the explorer screens. They must not come back here unnoticed.
    const none = () => {
      expect(
        screen.queryByRole("button", { name: /풀이 보기/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /다시 풀기/ }),
      ).not.toBeInTheDocument();
    };
    const { rerender } = render(
      <CourseProgressBoard summary={summary} session={session} />,
    );
    none();
    rerender(
      <CourseProgressBoard
        summary={summary}
        session={{
          ...session,
          retry: { ...session.retry!, completedAt: "2026-09-25T10:10:00.000Z" },
        }}
      />,
    );
    none();
  });

  it("does not reveal explanations for an unfinished first round", () => {
    render(
      <CourseProgressBoard
        summary={{ ...summary, todayAnswered: 2 }}
        session={{ ...session, completedAt: null, retry: null }}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /풀이 보기/ }),
    ).not.toBeInTheDocument();
  });
});
