import type { CoursePublicSession } from "@/contracts/mathSrsCourse.contract";
import type { ExplorerState } from "@/contracts/mathExplorers.contract";
import { createExplorerState, explorerView } from "@/lib/math-explorers/engine";

// Memory-only replies for the real screens. No account, API or database writes.
export const now = "2026-10-21T00:00:00Z";
export function courseSession(): CoursePublicSession {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    sectionId: "5-2-1-1",
    mode: "review",
    startedAt: now,
    completedAt: null,
    retry: null,
    attempts: [],
    problems: [1, 2, 3].map((index) => ({
      id: `problem-${index}`,
      sectionId: "5-2-1-1",
      tier: "기본",
      content: `문제 ${index}: 12 이상인 수를 고르세요.`,
      figureUrl: null,
      answerChoices: ["10", "11", "12", "9"],
      interactive: null,
      input: {
        mode: "number",
        label: "나의 답",
        placeholder: "답",
        help: "숫자로 적어 주세요.",
      },
      hint: null,
      feedback: null,
      followUp: null,
    })),
  };
}

export function explorerState(
  stage: "first" | "again" | "solution" | "next" = "first",
): ExplorerState {
  const base = explorerView(
    createExplorerState("motion-fixture", 5),
    "2026-10-21",
  );
  const unit = base.units.find((item) => item.grade === 5)!;
  return {
    ...base,
    student: { id: "motion-fixture", name: "로컬 검증", className: "초5" },
    revision: stage === "first" ? 0 : 1,
    feedback: null,
    session: {
      id: "motion-session",
      route: "unit",
      title: "약수와 배수",
      unitId: unit.id,
      cardIds: unit.cards.map((card) => card.id),
      index: stage === "next" ? 1 : 0,
      total: 15,
      round: 0,
      continuation: 0,
      done: false,
      first: 0,
      stars: 0,
      unresolved: [],
      reviewOnly: false,
    },
    currentActivity: {
      questionId: stage === "next" ? "question-next" : "question-current",
      cardId: "g5-divisor",
      cardName: "약수",
      unitId: unit.id,
      unitTitle: "약수와 배수",
      kind: "truth",
      prompt: stage === "next" ? "다음 문항이에요." : "3은 12의 약수예요.",
      choices: [
        { id: 1, label: "맞아요" },
        { id: 0, label: "아니에요" },
      ],
      ...(stage === "again" || stage === "solution"
        ? { followUp: { state: stage, firstChoiceIds: [0] } }
        : {}),
      ...(stage === "solution"
        ? {
            solution: {
              cardId: "g5-divisor",
              name: "약수",
              definition: "나누어떨어지게 하는 수예요.",
              explanation: "나머지가 없는지 확인해요.",
              note: "",
              examples: [],
              statement: "3은 12의 약수예요.",
              truth: true,
            },
          }
        : {}),
    },
  };
}
