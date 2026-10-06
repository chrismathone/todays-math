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
    // 705544df6 — 판은 «하루 한 칸» 여정이다. 단원 이름은 제목이 아니라 «지금 배우는 단원» 글과 오늘 칸의 이름이다.
    const { rerender } = render(<CourseProgressBoard summary={nextSummary} />);
    expect(
      screen.getByRole("heading", { name: "전체 학습 진도" }),
    ).toBeVisible();
    expect(screen.getByText("지금 배우는 단원")).toBeVisible();
    expect(screen.getByText(next.title)).toBeVisible();
    expect(
      screen.getByLabelText(`1일차, ${next.title}, 오늘의 학습`),
    ).toBeInTheDocument();
    rerender(
      <CourseProgressBoard
        summary={nextSummary}
        session={{ ...session, sectionId: current.id }}
      />,
    );
    expect(screen.getByText(current.title)).toBeVisible();
    expect(
      screen.getByLabelText(`1일차, ${current.title}, 오늘의 학습`),
    ).toBeInTheDocument();
    expect(screen.queryByText(next.title)).not.toBeInTheDocument();
  });

  it("offers replay only for a completed day of the journey, never from the session itself", () => {
    const replay = { name: /풀이 보기|다시 풀기/ };
    const retried = {
      ...session,
      retry: { ...session.retry!, completedAt: "2026-09-25T10:10:00.000Z" },
    };
    const { rerender } = render(
      <CourseProgressBoard summary={summary} session={session} />,
    );
    expect(screen.queryByRole("button", replay)).not.toBeInTheDocument();
    // 오답 한 바퀴를 마친 것만으로는 칸이 열리지 않는다 — 완료한 «날»은 서버 원장이 정한다(dailyJourney.ts collect).
    rerender(<CourseProgressBoard summary={summary} session={retried} />);
    expect(screen.queryByRole("button", replay)).not.toBeInTheDocument();
    rerender(
      <CourseProgressBoard
        summary={summary}
        session={retried}
        journey={{
          completedDays: 1,
          todayComplete: true,
          todayAnswered: 10,
          todayGoal: 10,
          days: [
            {
              id: "elementary:2026-09-25",
              date: "2026-09-25",
              completedAt: "2026-09-25T10:10:00.000Z",
              title: "약수와 배수",
              subtitle: "초5 · 1학기",
              reviewCount: 10,
            },
          ],
          upcoming: [{ title: "다음 단원", subtitle: "초등 수학" }],
        }}
      />,
    );
    expect(
      screen.getByRole("button", { name: /^1일차, 약수와 배수.*다시 풀기$/ }),
    ).toBeEnabled();
    expect(screen.getAllByRole("button", replay)).toHaveLength(1);
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
