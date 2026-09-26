import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Feedback, QuestionCard } from "@/components/math-srs/PracticeSession";
import { clearDraft } from "@/lib/math-srs/draft";
import type { Attempt, GeneratedProblem } from "@/lib/math-srs/types";

// 연구실(로컬) 풀이 화면에 보기형 문항이 들어와도 같은 채점 함수를 탄다.
const problem: GeneratedProblem = {
  id: "practice-choice",
  templateId: "quick-distribute",
  conceptId: "distribute",
  conceptWeights: [{ conceptId: "distribute", weight: 1 }],
  difficulty: 1,
  kind: "quick",
  prompt: "$4x-(x-3)$ 을 간단히 하면?",
  equation: "",
  answer: 1,
  choices: ["$3x-3$", "$3x+3$", "$5x-3$", "$5x+3$"],
  hint: "괄호 앞의 − 는 괄호 안 모든 항에 곱해져요.",
  solution: ["$4x-(x-3)=4x-x+3=3x+3$"],
  expectedSeconds: 12,
};

afterEach(() => {
  cleanup();
  clearDraft("practice-choice-test");
});

function renderCard() {
  const submit = vi.fn(() => true);
  render(
    <QuestionCard
      learnerId="practice-choice-test"
      problem={problem}
      onSubmit={submit}
      onExit={vi.fn()}
    />,
  );
  return { submit, input: screen.getByLabelText(/^나의 답/) };
}

describe("연구실 풀이 화면의 보기형 문항", () => {
  it("정답 보기 글자를 내면 숫자 형식 안내 없이 정답으로 기록한다", async () => {
    const user = userEvent.setup();
    const { submit, input } = renderCard();
    await user.type(input, "$3x+3$ {Enter}");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({ correct: true, submittedAnswer: "$3x+3$" }),
    );
  });

  it("정답 번호를 숫자로 내면 오답이다", async () => {
    const user = userEvent.setup();
    const { submit, input } = renderCard();
    await user.type(input, "1{Enter}");
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({ correct: false, submittedAnswer: "1" }),
    );
  });

  it("풀이 뒤 정답 칸에 정답 보기 글자를 보여 준다", () => {
    const attempt: Attempt = {
      problemId: problem.id,
      conceptId: problem.conceptId,
      templateId: problem.templateId,
      kind: problem.kind,
      submittedAnswer: "$5x+3$",
      correct: false,
      rating: "again",
      usedHint: false,
      elapsedSeconds: 8,
      answeredAt: "2026-09-26T03:00:00.000Z",
    };
    render(
      <Feedback problem={problem} attempt={attempt} onNext={vi.fn()} last />,
    );
    const value = screen.getByText("정답").nextElementSibling!;
    expect(value.querySelector(".katex")).not.toBeNull();
    expect(value.textContent).toContain("3x+3");
    expect(value.textContent).not.toMatch(/^1$/);
  });
});
