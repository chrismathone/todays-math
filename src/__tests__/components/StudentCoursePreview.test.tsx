import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StudentCoursePractice from "@/components/math-srs/StudentCoursePractice";
import {
  previewCardFor,
  previewFigureSvg,
  previewMeaning,
} from "@/lib/math-srs/preview";
import type {
  CoursePublicSession,
  CourseSummary,
} from "@/contracts/mathSrsCourse.contract";

vi.mock("@/components/math-explorers/ExplorerMath", () => ({
  ExplorerMath: ({ text }: { text: string }) => <span>{text}</span>,
}));
vi.mock("@/components/math/ProblemContent", () => ({
  ProblemContent: ({ content }: { content: string }) => <p>{content}</p>,
}));
vi.mock("@/components/math/MathText", () => ({
  MathText: ({ text }: { text: string }) => <span>{text}</span>,
}));

function session(sectionId = "5-2-1-1", answered = 0): CoursePublicSession {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    sectionId,
    mode: "learn",
    startedAt: "2026-10-20T00:00:00Z",
    completedAt: null,
    retry: null,
    problems: [0, 1].map((i) => ({
      id: `problem-${i}`,
      sectionId,
      tier: "기본",
      content: `첫 문제와 다음 문제 ${i}`,
      figureUrl: null,
      answerChoices: ["1", "2"],
      interactive: null,
      input: {
        mode: "number",
        label: "나의 답",
        placeholder: "답",
        help: "숫자",
      },
      hint: null,
      feedback: i < answered ? { correct: true } : null,
      followUp: null,
    })),
    attempts: answered
      ? [
          {
            problemId: "problem-0",
            submittedAnswer: "2",
            correct: true,
            usedHint: false,
            selfAssessed: false,
            answeredAt: "2026-10-20T00:00:00Z",
          },
        ]
      : [],
  };
}
function props(run = session()) {
  return {
    session: run,
    summary: {} as CourseSummary,
    feedbackId: null,
    busy: false,
    journeyTheme: "sea" as const,
    onAnswer: vi.fn(),
    onFollowUp: vi.fn(),
    onHint: vi.fn(),
    onNext: vi.fn(),
    onContinue: vi.fn(),
    onExit: vi.fn(),
    onAuthFailure: vi.fn(),
  };
}

describe("course learn preview", () => {
  it.each(["5-2-1-1", "5-2-1-6"])(
    "shows the authored two-page card before the first question of %s without writing",
    async (sectionId) => {
      const p = props(session(sectionId)),
        card = previewCardFor(sectionId)!;
      const { rerender } = render(<StudentCoursePractice {...p} />);
      expect(
        await screen.findByRole("heading", { name: card.title }),
      ).toBeInTheDocument();
      expect(screen.getByText(previewMeaning(card))).toBeInTheDocument();
      expect(screen.getByText(card.figureCaption)).toBeInTheDocument();
      expect(
        screen.getByRole("img", { name: card.figure.title }),
      ).toBeInTheDocument();
      const expectedSvg = new DOMParser().parseFromString(
        previewFigureSvg(card),
        "image/svg+xml",
      ).documentElement;
      expect(
        screen
          .getByRole("img", { name: card.figure.title })
          .isEqualNode(expectedSvg),
      ).toBe(true);
      expect(screen.queryByText("첫 문제와 다음 문제 0")).toBeNull();
      expect(screen.queryByText(sectionId)).toBeNull();
      fireEvent.click(
        screen.getByRole("button", { name: "문제 풀기" }),
      );
      expect(
        await screen.findByText("첫 문제와 다음 문제 0"),
      ).toBeInTheDocument();
      expect(p.onAnswer).not.toHaveBeenCalled();
      expect(p.onNext).not.toHaveBeenCalled();
      rerender(<StudentCoursePractice {...p} session={{ ...p.session }} />);
      expect(screen.queryByRole("heading", { name: card.title })).toBeNull();
      rerender(
        <StudentCoursePractice
          {...p}
          session={{ ...p.session, id: "new-session" }}
        />,
      );
      expect(
        await screen.findByRole("heading", { name: card.title }),
      ).toBeInTheDocument();
    },
  );
  it.each(["review", "answered", "no-card"])(
    "goes straight to the problem for %s",
    async (reason) => {
      const run = session(
        reason === "no-card" ? "5-2-2-1" : "5-2-1-1",
        reason === "answered" ? 1 : 0,
      );
      if (reason === "review") run.mode = "review";
      render(<StudentCoursePractice {...props(run)} />);
      expect(
        await screen.findByText(
          `첫 문제와 다음 문제 ${reason === "answered" ? 1 : 0}`,
        ),
      ).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: /을 배워요/ })).toBeNull();
    },
  );
  it("lets the student retry with the authored hint and confirms through the supplied checker", async () => {
    const p = props(),
      card = previewCardFor(p.session.sectionId)!;
    render(<StudentCoursePractice {...p} />);
    const input = await screen.findByRole("textbox", {
      name: card.practice.prompt,
    });
    const check = screen.getByRole("button", { name: "확인" });
    expect(check).toHaveAttribute("aria-keyshortcuts", "Enter");
    fireEvent.change(input, { target: { value: "999" } });
    fireEvent.click(check);
    expect(screen.getByRole("status")).toHaveTextContent(card.practice.hint);
    expect(screen.queryByText(card.practice.explanation)).toBeNull();
    expect(
      screen.getByRole("button", { name: "문제 풀기" }),
    ).toBeEnabled();
    fireEvent.change(input, {
      target: { value: ` ${card.practice.answer}${card.practice.unit} ` },
    });
    fireEvent.submit(input.closest("form")!);
    expect(screen.getByRole("status")).toHaveTextContent("맞았어요");
    expect(screen.getByRole("status")).toHaveTextContent(
      card.practice.explanation,
    );
    expect(p.onAnswer).not.toHaveBeenCalled();
    expect(p.onFollowUp).not.toHaveBeenCalled();
  });
  it("uses the shared phone tabs, end-of-page turn and horizontal swipe", async () => {
    render(<StudentCoursePractice {...props()} />);
    const tabs = await screen.findByRole("group", { name: "책의 두 면" });
    const first = within(tabs).getByRole("button", { name: "뜻과 그림" });
    const second = within(tabs).getByRole("button", { name: "예와 연습" });
    expect(first).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "예와 연습 보기" }));
    expect(second).toHaveAttribute("aria-pressed", "true");
    const spread = screen.getByTestId("study-spread");
    fireEvent.touchStart(spread, { touches: [{ clientX: 60, clientY: 150 }] });
    fireEvent.touchEnd(spread, {
      changedTouches: [{ clientX: 200, clientY: 155 }],
    });
    expect(first).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(second);
    expect(second).toHaveAttribute("aria-pressed", "true");
  });
});
