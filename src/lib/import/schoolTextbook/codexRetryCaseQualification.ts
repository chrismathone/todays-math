/** Shared deterministic case checks, with no inference or database calls. */
import type { DbRetryCandidate } from "./dbRetry.types";
import type { TextbookVariantSource } from "./variants";
import type { CodexDbRetryPairReview } from "./codexRetry.types";
import { CODEX_RETRY_SEMANTIC_DIMENSIONS } from "./codexRetryReview";
import {
  dbRetryAnswersAgree,
  dbRetryUnknownAnswer,
} from "./dbRetryReviewBinding";
import { reviewDigest } from "./qualification";
const nonempty = (value: unknown): value is string =>
  typeof value === "string" && Boolean(value.trim());
const same = (left: unknown, right: unknown) =>
  reviewDigest(left) === reviewDigest(right);
export type CodexRetryCaseEvidence = Pick<
  CodexDbRetryPairReview,
  | "blindSolutions"
  | "blindSolutionsDigest"
  | "solutionReviews"
  | "semanticReviews"
>;
export function validateCodexRetryCaseQualification(
  parent: TextbookVariantSource,
  pair: readonly DbRetryCandidate[],
  review: CodexRetryCaseEvidence,
) {
  if (
    review.blindSolutions.length !== 3 ||
    !same(review.blindSolutionsDigest, reviewDigest(review.blindSolutions)) ||
    new Set(review.blindSolutions.map((s) => s.id)).size !== 3
  )
    throw new Error("고정 독립 풀이 변조/누락");
  const problems = [
    {
      id: "original",
      answer: parent.answer,
      content: parent.content,
      questionType: parent.question_type,
    },
    ...pair.map((c) => ({
      id: `slot-${c.slot}`,
      answer: c.answer,
      content: c.content,
      questionType: c.questionType,
    })),
  ];
  for (const problem of problems) {
    const solution = review.blindSolutions.find((s) => s.id === problem.id);
    if (
      !solution ||
      dbRetryUnknownAnswer(solution.answer) ||
      !nonempty(solution.solution) ||
      solution.ambiguous !== false ||
      solution.missingEvidence.length ||
      !dbRetryAnswersAgree(
        problem.answer,
        solution.answer,
        problem.questionType,
        problem.content,
      )
    )
      throw new Error("원문/변형 독립 정답 또는 조건 불일치");
  }
  if (
    review.solutionReviews.length !== 2 ||
    review.semanticReviews.length !== 2
  )
    throw new Error("두 변형의 해설/의미 검토 필요");
  for (const id of ["slot-1", "slot-2"] as const) {
    const solution = review.solutionReviews.find((s) => s.id === id),
      semantic = review.semanticReviews.find((s) => s.id === id);
    if (
      !solution ||
      solution.agreesWithBlindSolution !== true ||
      solution.allStepsValid !== true ||
      solution.complete !== true ||
      solution.missingEvidence.length ||
      solution.issues.length ||
      !solution.evidence.length ||
      !solution.evidence.every(nonempty)
    )
      throw new Error("제안 해설의 단계별 검토 실패");
    if (!semantic || semantic.missingEvidence.length || semantic.issues.length)
      throw new Error("의미 검토 누락 근거");
    for (const dimension of CODEX_RETRY_SEMANTIC_DIMENSIONS) {
      const judgment = semantic[dimension];
      if (
        !judgment ||
        judgment.passed !== true ||
        !nonempty(judgment.evidence?.original) ||
        !nonempty(judgment.evidence?.candidate) ||
        !nonempty(judgment.evidence?.reason)
      )
        throw new Error("구체적인 학습 목표/수준/완결성/변경 근거 실패");
    }
  }
}
