import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ExplorerPractice from "@/components/math-explorers/ExplorerPractice";
import type {
  ExplorerActivity,
  ExplorerSolution,
} from "@/contracts/mathExplorers.contract";

const solution: ExplorerSolution = {
  cardId: "divisor",
  name: "약수",
  definition: "어떤 수를 나누어떨어지게 하는 자연수입니다.",
  explanation: "나누었을 때 나머지가 없는지 확인해요.",
  note: "",
  examples: [
    { label: "약수인 수", correct: true },
    { label: "약수가 아닌 수", correct: false },
  ],
  statement: "이 수는 약수입니다.",
  truth: false,
};
function activity(kind: "assemble" | "examples" | "truth"): ExplorerActivity {
  return {
    questionId: `question-${kind}`,
    cardId: "divisor",
    cardName: "약수",
    unitId: "unit",
    unitTitle: "약수와 배수",
    kind,
    prompt: kind === "truth" ? solution.statement : "약수의 예를 골라요.",
    ...(kind === "assemble"
      ? { pieces: ["어떤 수를 ", " 하는 ", "입니다."] }
      : {}),
    choices:
      kind === "truth"
        ? [
            { id: 1, label: "맞아요" },
            { id: 0, label: "아니에요" },
          ]
        : [
            { id: 2, label: "자연수" },
            { id: 0, label: "나누어떨어지게" },
            { id: 3, label: "소수" },
            { id: 1, label: "남김없이" },
          ],
  };
}
function props(value: ExplorerActivity) {
  return {
    activity: value,
    session: {
      title: "약수와 배수",
      index: 0,
      total: 15,
      round: 0,
      reviewOnly: false,
    },
    busy: false,
    correct: null,
    eventKey: "",
    onAction: vi.fn(),
    onHome: vi.fn(),
  };
}
describe("explorer card immediate follow-ups", () => {
  it.each(["assemble", "examples", "truth"] as const)(
    "resets %s selection and rotates only display order, preserving choice IDs and number keys",
    async (kind) => {
      const original = activity(kind);
      const p = props(original);
      const { rerender } = render(<ExplorerPractice {...p} />);
      fireEvent.keyDown(document, { key: "1" });
      const again = {
        ...original,
        followUp: {
          state: "again" as const,
          firstChoiceIds: [original.choices[0].id],
        },
      };
      rerender(<ExplorerPractice {...p} activity={again} />);
      expect(screen.getByText("다시 해 볼까요")).toBeInTheDocument();
      const buttons = within(
        screen.getByRole("group", { name: "답 고르기" }),
      ).getAllByRole("button");
      expect(buttons[0]).toHaveAccessibleName(
        expect.stringContaining(original.choices[1].label),
      );
      buttons.forEach((button) =>
        expect(button).toHaveAttribute("aria-pressed", "false"),
      );
      expect(screen.getAllByText("앞에서 고른 답")).toHaveLength(1);
      p.onAction.mockClear();
      fireEvent.keyDown(document, { key: "1" });
      if (kind === "assemble") {
        fireEvent.keyDown(document, { key: "2" });
        fireEvent.click(
          screen.getByRole("button", { name: "완성한 문장 확인하기" }),
        );
      } else if (kind === "examples")
        fireEvent.click(
          screen.getByRole("button", { name: "선택한 예 확인하기" }),
        );
      expect(p.onAction).toHaveBeenLastCalledWith({
        type: "answer",
        questionId: original.questionId,
        choiceIds:
          kind === "assemble"
            ? [original.choices[1].id, original.choices[2].id]
            : [original.choices[1].id],
      });
    },
  );
  it.each(["assemble", "examples", "truth"] as const)(
    "restores the %s solution from server content and requires understood",
    async (kind) => {
      const value = {
        ...activity(kind),
        followUp: { state: "solution" as const, firstChoiceIds: [2] },
        solution,
      };
      const p = props(value);
      render(<ExplorerPractice {...p} />);
      expect(
        screen.getByRole("heading", { name: "정답과 풀이" }),
      ).toBeInTheDocument();
      expect(screen.getByText(solution.definition)).toBeInTheDocument();
      expect(await screen.findByText(solution.explanation)).toBeInTheDocument();
      if (kind === "examples") {
        expect(
          screen.getByText(solution.examples[0].label),
        ).toBeInTheDocument();
        expect(screen.getByText("맞음")).toBeInTheDocument();
        expect(screen.getByText("아님")).toBeInTheDocument();
      }
      if (kind === "truth")
        expect(screen.getByText("이 문장은 아니에요")).toBeInTheDocument();
      expect(screen.queryByRole("group", { name: "답 고르기" })).toBeNull();
      expect(
        screen.getByText("이 개념은 다음 복습에서 다시 만나요."),
      ).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "알겠어요" }));
      expect(p.onAction).toHaveBeenCalledExactlyOnceWith({
        type: "understood",
        questionId: value.questionId,
      });
    },
  );
  it("keeps give-up as an empty answer on the same question", () => {
    const value = {
      ...activity("examples"),
      followUp: { state: "again" as const, firstChoiceIds: [2, 3] },
    };
    const p = props(value);
    render(<ExplorerPractice {...p} />);
    expect(screen.getAllByText("앞에서 고른 답")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "아직 모르겠어요" }));
    expect(p.onAction).toHaveBeenCalledWith({
      type: "answer",
      questionId: value.questionId,
      choiceIds: [],
    });
  });
});
