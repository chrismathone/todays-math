import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Complete,
  Feedback,
  QuestionCard,
} from "@/components/math-srs/PracticeSession";
import { clearDraft } from "@/lib/math-srs/draft";
import type { Attempt, GeneratedProblem, Mission } from "@/lib/math-srs/types";

const problem: GeneratedProblem = {
  id: "practice-first",
  templateId: "fraction",
  conceptId: "fractions",
  conceptWeights: [{ conceptId: "fractions", weight: 1 }],
  difficulty: 1,
  kind: "warmup",
  prompt: "방정식의 해를 구하세요.",
  equation: "$2x = 1$",
  answer: 0.5,
  answerText: "$\\frac{1}{2}$",
  hint: "양변을 2로 나누세요.",
  solution: ["$2x = 1$의 양변을 2로 나누면 $x = \\frac{1}{2}$입니다."],
  expectedSeconds: 30,
};
const attempt: Attempt = {
  problemId: problem.id,
  conceptId: problem.conceptId,
  templateId: problem.templateId,
  kind: problem.kind,
  submittedAnswer: "1/2",
  correct: true,
  rating: "good",
  usedHint: false,
  elapsedSeconds: 24,
  answeredAt: "2026-09-23T03:00:00.000Z",
};

afterEach(() => {
  cleanup();
  clearDraft("practice-test");
});

describe("focused practice interactions", () => {
  it("announces invalid input, accepts keyboard submission and locks a recorded answer", async () => {
    const user = userEvent.setup();
    const submit = vi.fn(() => true);
    render(
      <QuestionCard
        learnerId="practice-test"
        problem={problem}
        onSubmit={submit}
        onExit={vi.fn()}
      />,
    );
    const input = screen.getByLabelText(/^나의 답/);
    expect(input).toHaveFocus();
    await user.type(input, "1/0{Enter}");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveFocus();
    expect(submit).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "힌트 보기" }));
    expect(
      screen.getByRole("button", { name: "힌트를 확인했어요" }),
    ).toHaveAttribute("aria-expanded", "true");
    await user.clear(input);
    await user.type(input, "1/2{Enter}");
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        correct: true,
        usedHint: true,
        rating: "hard",
        submittedAnswer: "1/2",
      }),
    );
    expect(input).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "정답 확인 →" }));
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("focuses the feedback heading and advances through the same primary action", async () => {
    const next = vi.fn();
    const user = userEvent.setup();
    render(<Feedback problem={problem} attempt={attempt} onNext={next} last />);
    expect(
      screen.getByRole("heading", { name: "잘 꺼냈어요, 이 생각!" }),
    ).toHaveFocus();
    expect(screen.getByText("24초 · 힌트 없이 도전")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "오늘의 결과 보기 →" }),
    );
    expect(next).toHaveBeenCalledOnce();
  });

  it("maps outcome marks to problem order and suggests only concepts actually missed", () => {
    const second = {
      ...problem,
      id: "practice-second",
      conceptId: "balance" as const,
    };
    const third = { ...problem, id: "practice-third" };
    const mission: Mission = {
      id: "practice-mission",
      date: "2026-09-23",
      seed: 1,
      startedAt: "2026-09-23T02:00:00.000Z",
      completedAt: "2026-09-23T03:00:00.000Z",
      problems: [problem, second, third],
      attempts: [
        { ...attempt, problemId: third.id, correct: false, rating: "again" },
        { ...attempt, problemId: second.id, conceptId: "balance" },
        { ...attempt, correct: false, rating: "again" },
      ],
    };
    render(<Complete mission={mission} today="2026-09-23" onHome={vi.fn()} />);
    expect(
      screen.getByRole("heading", { name: "오늘의 기억을 쌓았어요." }),
    ).toHaveFocus();
    const outcomes = within(
      screen.getByRole("list", { name: "문제별 풀이 결과" }),
    ).getAllByRole("listitem");
    expect(outcomes.map((item) => item.getAttribute("aria-label"))).toEqual([
      "1번 분수가 있는 식: 다시 익히기",
      "2번 등식의 성질: 정답",
      "3번 분수가 있는 식: 다시 익히기",
    ]);
    const review = screen.getByRole("heading", {
      name: "다음에 다시 만나볼 개념",
    }).parentElement!;
    expect(review).toHaveTextContent("분수가 있는 식");
    expect(review).not.toHaveTextContent("등식의 성질");
    expect(screen.getByText(/다음 미션: 내일/)).toBeInTheDocument();
  });
});
