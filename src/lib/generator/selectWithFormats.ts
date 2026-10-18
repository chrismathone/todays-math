import type { FormatIntent } from "@/contracts/formatIntent.contract";
import { DIFFICULTY_LADDER } from "@/contracts/difficulty";
import { classifyFormat, type FormatInput } from "@/lib/problem/provenance";
import { questionIdOf } from "@/lib/problem/questionIdentity";
import { solveQuestionSelection } from "@/lib/problem/questionSelectionSolver";
import { familyIdOf } from "./familyKey";
import { createSeededRandom } from "./seededRandom";
import {
  selectProblems,
  type SelectProblemsArgs,
  type SelectableProblem,
} from "./selectProblems";

/** Formats are hard requirements. Difficulty keeps the existing exact-first/substitution policy. */
export function selectWithFormats<T extends SelectableProblem & FormatInput>(
  args: SelectProblemsArgs<T> & { formats: FormatIntent },
) {
  const recent = new Set(args.recentProblemIds);
  const blocked = new Set(
    args.pool.filter((p) => recent.has(p.id)).map(questionIdOf),
  );
  const candidates = args.pool.flatMap((row) => {
    if (
      !row.directUseAllowed ||
      recent.has(row.id) ||
      blocked.has(questionIdOf(row))
    )
      return [];
    const format = classifyFormat(row);
    return format === "unknown"
      ? []
      : [
          {
            ...row,
            questionId: questionIdOf(row),
            familyId: familyIdOf(row),
            format,
          },
        ];
  });
  const base = {
    candidates,
    count: args.count,
    formats: args.formats,
    distinctFamilies: true,
  };
  const exactRatio =
    DIFFICULTY_LADDER.reduce(
      (sum, tier) => sum + args.difficultyRatio[tier],
      0,
    ) === args.count;
  const exact = exactRatio
    ? solveQuestionSelection({
        ...base,
        difficulty: args.difficultyRatio,
        random: createSeededRandom(`${args.seed}:formats:exact`),
      })
    : null;
  // All candidates remain available for this second pass; it cannot substitute an unwanted format.
  const plan =
    exact?.status === "complete"
      ? exact
      : solveQuestionSelection({
          ...base,
          random: createSeededRandom(`${args.seed}:formats:substitute`),
        });
  if (plan.status !== "complete")
    return { status: plan.status, result: null, witness: plan.witness };
  const byId = new Map(args.pool.map((row) => [row.id, row]));
  return {
    status: "complete" as const,
    result: selectProblems({
      ...args,
      pool: plan.selected.map((row) => byId.get(row.id)!),
    }),
    witness: plan.witness,
  };
}
