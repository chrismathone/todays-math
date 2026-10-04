/** The submitted action, rather than an inferred grade, identifies recorded answers. */
export type LearningAnswerAction =
  | { type: "answer" | "supplement-answer"; choiceIds: readonly number[] }
  | { type: `lab-${string}` }
  | { type: "course"; selfCorrect?: boolean; giveUp?: boolean }
  | { type: "middle" | "replay"; submittedAnswer: string };

export function learningSoundCue(
  action: LearningAnswerAction,
  correct: boolean,
): "correct" | "soft" | null {
  if (action.type.startsWith("lab-")) return null;
  const recorded =
    ("choiceIds" in action && action.choiceIds.length === 0) ||
    ("selfCorrect" in action && action.selfCorrect !== undefined) ||
    ("giveUp" in action && action.giveUp === true) ||
    ("submittedAnswer" in action && action.submittedAnswer.trim() === "");
  return correct && !recorded ? "correct" : "soft";
}
