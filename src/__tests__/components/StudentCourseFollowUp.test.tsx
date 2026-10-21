import {
  act,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import StudentCoursePractice from "@/components/math-srs/StudentCoursePractice";
import type {
  CoursePublicSession,
  CourseSummary,
} from "@/contracts/mathSrsCourse.contract";

vi.mock("@/components/math/ProblemContent", () => ({
  ProblemContent: ({ content }: { content: string }) => <p>{content}</p>,
}));
vi.mock("@/components/math/MathText", () => ({
  MathText: ({ text }: { text: string }) => <span data-math>{text}</span>,
}));

function session(
  state: "awaiting" | "correct" | "solution",
  done = false,
): CoursePublicSession {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    sectionId: "5-2-2-1",
    mode: "learn",
    startedAt: "2026-10-20T00:00:00Z",
    completedAt: null,
    retry: null,
    problems: Array.from({ length: 5 }, (_, i) => ({
      id: `problem-${i}`,
      sectionId: "5-2-2-1",
      tier: "기본",
      content: `문제 ${i + 1}: 1 + 1`,
      figureUrl: null,
      answerChoices: ["1", "2", "3", "4"],
      interactive: null,
      input: {
        mode: "number",
        label: "나의 답",
        placeholder: "답",
        help: "숫자",
      },
      hint:
        i === 0 && state === "solution"
          ? { answer: "2", solution: "1에 1을 더하면 2예요." }
          : null,
      feedback: i === 0 ? { correct: false } : null,
      followUp: i === 0 ? { state, done } : null,
    })),
    attempts: [
      {
        problemId: "problem-0",
        submittedAnswer: "3",
        correct: false,
        usedHint: false,
        selfAssessed: false,
        answeredAt: "2026-10-20T00:00:00Z",
      },
    ],
  } as CoursePublicSession;
}
function props(run = session("awaiting")) {
  return {
    session: run,
    summary: {} as CourseSummary,
    feedbackId: null,
    busy: false,
    onAnswer: vi.fn(),
    onFollowUp: vi.fn(),
    onHint: vi.fn(),
    onNext: vi.fn(),
    onContinue: vi.fn(),
    onExit: vi.fn(),
    onAuthFailure: vi.fn(),
  };
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("course immediate follow-up", () => {
  it("also opts the authenticated course figure read into the follow-up protocol", async () => {
    const run = session("solution");
    run.problems[0].figureUrl =
      "/api/learn/math-srs/course/figure?problemId=problem-0";
    const fetcher = vi.fn(
      async () =>
        new Response('<svg xmlns="http://www.w3.org/2000/svg"/>', {
          headers: { "content-type": "image/svg+xml" },
        }),
    );
    vi.stubGlobal("fetch", fetcher);
    render(<StudentCoursePractice {...props(run)} />);
    await waitFor(() =>
      expect(fetcher).toHaveBeenCalledWith(
        run.problems[0].figureUrl,
        expect.objectContaining({ headers: { "x-course-follow-up": "1" } }),
      ),
    );
  });
  it("uses the academy's existing board artwork for the paper band", async () => {
    const { container } = render(
      <StudentCoursePractice {...props()} journeyTheme="sea" />,
    );
    await screen.findByText("다시 해 볼까요");
    expect(
      (container.firstElementChild as HTMLElement).style.getPropertyValue(
        "--learn-course-theme",
      ),
    ).toBe('url("/images/journey/sea-board.webp")');
  });
  it("clears the first selected choice when its saved wrong answer opens the second try", async () => {
    const first = session("awaiting");
    // Already-studied sessions do not auto-open the section's preview card.
    first.relearn = true;
    first.attempts = [];
    first.problems[0].followUp = null;
    first.problems[0].feedback = null;
    const p = props(first);
    const { rerender } = render(<StudentCoursePractice {...p} />);
    const group = await screen.findByRole("group", { name: "답 고르기" });
    fireEvent.click(within(group).getAllByRole("button")[2]);
    expect(p.onAnswer).toHaveBeenCalledWith({
      sessionId: first.id,
      problemId: "problem-0",
      submittedAnswer: "3",
    });
    const saved = session("awaiting");
    rerender(
      <StudentCoursePractice {...p} session={saved} feedbackId="problem-0" />,
    );
    await screen.findByText("다시 해 볼까요");
    within(screen.getByRole("group", { name: "답 고르기" }))
      .getAllByRole("button")
      .forEach((button) =>
        expect(button).toHaveAttribute("aria-pressed", "false"),
      );
    expect(screen.getByText("앞에서 고른 답")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "2" });
    expect(p.onFollowUp).toHaveBeenCalledWith({
      sessionId: first.id,
      problemId: "problem-0",
      action: "answer",
      submittedAnswer: "3",
    });
    rerender(
      <StudentCoursePractice
        {...p}
        session={session("solution")}
        feedbackId={null}
      />,
    );
    expect(await screen.findByText("정답과 풀이")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("restores the same wrong question, rotates display values and clears selection; number keys submit the displayed value", async () => {
    const p = props();
    render(<StudentCoursePractice {...p} />);
    expect(await screen.findByText("다시 해 볼까요")).toBeInTheDocument();
    expect(screen.getByText("문제 1: 1 + 1")).toBeInTheDocument();
    const choices = within(
      screen.getByRole("group", { name: "답 고르기" }),
    ).getAllByRole("button");
    const values = choices.map(
      (node) => node.querySelector("[data-math]")!.textContent,
    );
    expect(values).not.toEqual(["1", "2", "3", "4"]);
    expect([...values].sort()).toEqual(["1", "2", "3", "4"]);
    choices.forEach((node) =>
      expect(node).toHaveAttribute("aria-pressed", "false"),
    );
    expect(screen.getByText("앞에서 고른 답")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "1" });
    expect(p.onFollowUp).toHaveBeenCalledWith({
      sessionId: p.session.id,
      problemId: "problem-0",
      action: "answer",
      submittedAnswer: values[0],
    });
    expect(p.onAnswer).not.toHaveBeenCalled();
  });
  it("sends second-round give-up through follow-up and never automatically advances", async () => {
    const p = props();
    render(<StudentCoursePractice {...p} />);
    await screen.findByText("다시 해 볼까요");
    vi.useFakeTimers();
    act(() => vi.advanceTimersByTime(10000));
    expect(p.onNext).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "아직 모르겠어요" }));
    expect(p.onFollowUp).toHaveBeenCalledWith({
      sessionId: p.session.id,
      problemId: "problem-0",
      action: "answer",
      giveUp: true,
    });
  });
  it.each(["correct", "solution"] as const)(
    "restores %s until explicitly acknowledged, then skips done",
    async (state) => {
      const p = props(session(state));
      const { rerender } = render(<StudentCoursePractice {...p} />);
      await screen.findByText(state === "correct" ? "맞았어요" : "정답과 풀이");
      if (state === "solution") {
        expect(screen.getByText("1에 1을 더하면 2예요.")).toBeInTheDocument();
        expect(
          screen.getByText("이 문제는 다음 복습에서 다시 만나요."),
        ).toBeInTheDocument();
      }
      vi.useFakeTimers();
      act(() => vi.advanceTimersByTime(10000));
      expect(p.onNext).not.toHaveBeenCalled();
      vi.useRealTimers();
      fireEvent.click(
        screen.getByRole("button", {
          name: state === "correct" ? "다음" : "알겠어요",
        }),
      );
      expect(p.onFollowUp).toHaveBeenCalledWith({
        sessionId: p.session.id,
        problemId: "problem-0",
        action: "done",
      });
      expect(p.onNext).not.toHaveBeenCalled();
      rerender(<StudentCoursePractice {...p} session={session(state, true)} />);
      expect(await screen.findByText("문제 2: 1 + 1")).toBeInTheDocument();
    },
  );
});
