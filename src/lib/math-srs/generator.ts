import { createRng, pick } from "../elementary/rng";
import { tidySolution } from "../middle/solutionText";
import { resolveMiddleTier } from "../middle/tier";
import {
  assertChooseAllAnswerCount,
  answerShape,
} from "../problem/chooseAllRule";
import {
  assertChoiceCount,
  assertChoiceMarks,
  hasChoices,
} from "../problem/choiceCountRule";
import { wrapDanClause } from "../problemText";
import { CONCEPTS } from "./concepts";
import { ENGINE_CATALOG, engineHandler, srsDifficulty } from "./engineCatalog";
import { readEngineAnswer } from "./sharedAnswers";
import type {
  ConceptId,
  Difficulty,
  GeneratedProblem,
  MissionKind,
} from "./types";

export { CONCEPTS } from "./concepts";
export { checkAnswer } from "./sharedAnswers";
export {
  ENGINE_CATALOG,
  ENGINE_CONCEPT_COUNTS,
  ENGINE_EXCLUSIONS,
  TEMPLATE_COUNT,
} from "./engineCatalog";

const PREREQUISITES: Record<ConceptId, ConceptId[]> = {
  balance: [],
  "two-step": ["balance"],
  distribute: ["two-step", "balance"],
  "both-sides": ["two-step", "balance"],
  fractions: ["balance", "two-step"],
  word: ["two-step", "balance"],
};

const HINTS: Record<ConceptId, string> = {
  balance:
    "양변에 같은 연산을 했는지 살펴보세요. 항상 참인 등식과 특정한 수에서만 참인 등식을 구분해요.",
  "two-step":
    "주어진 해가 있다면 먼저 대입하세요. 상수항을 정리한 뒤 구하려는 문자의 계수로 나눠요.",
  distribute:
    "괄호 앞의 수나 부호를 괄호 안의 모든 항에 적용하세요. 양변의 같은 종류의 항끼리 모아 봐요.",
  "both-sides":
    "문자가 있는 항과 상수항을 각각 모아 보세요. 문제에서 묻는 것이 해인지, 상수의 값인지 확인해요.",
  fractions:
    "모든 분모의 공배수를 양변의 모든 항에 곱하세요. 비례식은 외항의 곱과 내항의 곱이 같아요.",
  word: "구하려는 양을 문자로 놓고 같은 양을 나타내는 두 식을 찾아보세요. 마지막에는 문제에서 묻는 양과 단위를 확인해요.",
};

export type SrsEngineProblem = GeneratedProblem & {
  answerText: string;
  source: {
    engine: "middle";
    typeKey: string;
    title: string;
    tier: (typeof ENGINE_CATALOG)[number]["tier"];
    seed: number;
    requestedDifficulty: Difficulty;
  };
};

/** Adapts a genuine existing handler without changing its question or inventing a new solution. */
export function generateProblem({
  conceptId,
  difficulty,
  seed,
  kind = "training",
  typeKey,
}: {
  conceptId: ConceptId;
  difficulty: Difficulty;
  seed: number;
  kind?: MissionKind;
  /** Explicit replay/QA of a catalogue entry; unsupported keys throw rather than substitute. */
  typeKey?: string;
}): SrsEngineProblem {
  if (
    !CONCEPTS.some((concept) => concept.id === conceptId) ||
    !Number.isInteger(difficulty) ||
    difficulty < 1 ||
    difficulty > 5 ||
    !Number.isFinite(seed)
  ) {
    throw new Error("문제 생성 조건이 올바르지 않아요.");
  }
  const available = ENGINE_CATALOG.filter(
    (entry) => entry.conceptId === conceptId,
  );
  const nearestDistance = Math.min(
    ...available.map((entry) => Math.abs(entry.difficulty - difficulty)),
  );
  const selected =
    typeKey === undefined
      ? pick(
          createRng(seed),
          available.filter(
            (entry) =>
              Math.abs(entry.difficulty - difficulty) === nearestDistance,
          ),
        )
      : available.find((entry) => entry.key === typeKey);
  if (!selected)
    throw new Error(`해당 개념에서 지원하지 않는 기존 유형: ${typeKey}`);
  const original = engineHandler(selected.key).handler(createRng(seed));
  const prompt = wrapDanClause(original.content);
  assertChooseAllAnswerCount(prompt, original.answer, selected.key);
  assertChoiceCount(prompt, selected.key);
  assertChoiceMarks(prompt, selected.key);
  if (
    original.figureSpec ||
    hasChoices(prompt) ||
    answerShape(original.answer.replace(/\\,/g, " ")).kind !== "단일"
  ) {
    throw new Error(
      `숫자 단답형 화면으로 표시할 수 없는 기존 유형: ${selected.key}`,
    );
  }
  const answer = readEngineAnswer(original.answer);
  const tier = resolveMiddleTier(original.difficulty, prompt, false);
  const actualDifficulty = srsDifficulty(tier);
  if (tier !== selected.tier)
    throw new Error(`씨앗에 따라 난이도가 바뀌는 유형: ${selected.key}`);
  return {
    id: `middle-${selected.key}-${seed >>> 0}-${kind}`,
    templateId: selected.key,
    conceptId,
    conceptWeights: [
      { conceptId, weight: 1 },
      ...PREREQUISITES[conceptId].map((id) => ({
        conceptId: id,
        weight: 0.15,
      })),
    ],
    difficulty: actualDifficulty,
    kind,
    prompt,
    // The statement includes its equations. Word problems must not reveal the model equation.
    equation: "",
    answer: answer.value,
    answerText: original.answer,
    ...(answer.unit ? { answerUnit: answer.unit } : {}),
    hint: HINTS[conceptId],
    solution: tidySolution(original.solution)
      .split("\n")
      .filter((line) => line.trim()),
    expectedSeconds:
      18 +
      actualDifficulty * 9 +
      (conceptId === "word" || conceptId === "fractions" ? 18 : 0),
    source: {
      engine: "middle",
      typeKey: selected.key,
      title: selected.title,
      tier,
      seed: seed >>> 0,
      requestedDifficulty: difficulty,
    },
  };
}
