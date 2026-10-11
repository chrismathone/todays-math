import type { DbRetryPairReview } from "./dbRetry.types";
import { reviewDigest } from "./qualification";
import {
  DB_RETRY_SEMANTIC_THRESHOLDS,
  dbRetryAnswersAgree,
} from "./dbRetryReview";
import {
  validateDbRetryQualificationRows,
  uniqueDbRetryQualification,
  type DbRetryQualificationBinding,
  type DbRetryQualificationRowsInput,
} from "./dbRetryQualificationRows";
export type {
  DbRetryQualificationBinding,
  DbRetryProductionRender,
} from "./dbRetryQualificationRows";
export interface DbRetryQualificationInput extends DbRetryQualificationRowsInput {
  reviews: readonly DbRetryPairReview[];
  bindings: readonly DbRetryQualificationBinding[];
}
/** Legacy Noul policy remains explicit and unchanged; Codex booleans use a separate gate. */
export function prepareDbRetryQualification(input: DbRetryQualificationInput) {
  const base = validateDbRetryQualificationRows(input);
  const { reviews, bindings } = input;
  const reviewById = uniqueDbRetryQualification(
    reviews,
    (review) => review.sourceId,
  );
  const bindingById = uniqueDbRetryQualification(
    bindings,
    (binding) => binding.sourceId,
  );
  if (reviews.length !== base.pairs || bindings.length !== base.pairs)
    throw new Error("검토/그림 모집단 불일치");
  for (const [sourceId, group] of base.groups) {
    const pair = [...group].sort((a, b) => a.slot - b.slot);
    const parent = base.originalById.get(sourceId)!.problem;
    const review = reviewById.get(sourceId),
      binding = bindingById.get(sourceId);
    if (!review || !binding) throw new Error("검토/그림 근거 누락");
    if (
      review.kind !== "machine-blind-reasoning-review" ||
      review.passed !== true ||
      review.issues.length ||
      !review.solverModel ||
      !review.solutionReviewerModel ||
      !review.semanticModel
    )
      throw new Error("독립 풀이 검토가 통과되지 않았다");
    const thresholds = Object.values(review.semanticThresholds);
    const probabilities = Object.values(review.semanticProbabilities);
    if (
      thresholds.length !== 3 ||
      thresholds.some(
        (value) => !Number.isFinite(value) || value < 0.9 || value > 1,
      ) ||
      probabilities.length < 6 ||
      probabilities.some(
        (value) => !Number.isFinite(value) || value < 0.9 || value > 1,
      )
    )
      throw new Error("의미 검토 정책/근거 불일치");
    for (const slot of [1, 2])
      for (const dimension of [
        "sameLearningGoal",
        "sameLevel",
        "complete",
      ] as const) {
        const value = review.semanticProbabilities[`slot-${slot}.${dimension}`];
        if (
          review.semanticThresholds[dimension] <
            DB_RETRY_SEMANTIC_THRESHOLDS[dimension] ||
          !Number.isFinite(value) ||
          value! < review.semanticThresholds[dimension]
        )
          throw new Error("의미 검토의 개별 임계값 미달");
      }
    if (
      review.blindSolutions.length !== 3 ||
      new Set(review.blindSolutions.map((answer) => answer.id)).size !== 3 ||
      !["original", "slot-1", "slot-2"].every((id) =>
        review.blindSolutions.some(
          (answer) =>
            answer.id === id &&
            answer.answer.trim() &&
            answer.solution.trim() &&
            !answer.ambiguous &&
            !answer.missingEvidence.length,
        ),
      )
    )
      throw new Error("원문과 두 변형의 독립 풀이가 완전하지 않다");
    const answerTargets = [
      {
        id: "original",
        content: parent.content,
        answer: parent.answer,
        questionType: parent.question_type,
      },
      ...pair.map((candidate) => ({
        id: `slot-${candidate.slot}`,
        content: candidate.content,
        answer: candidate.answer,
        questionType: candidate.questionType,
      })),
    ];
    for (const problem of answerTargets) {
      const blind = review.blindSolutions.find(
        (solution) => solution.id === problem.id,
      );
      if (
        !blind ||
        !dbRetryAnswersAgree(
          problem.answer,
          blind.answer,
          problem.questionType,
          problem.content,
        )
      )
        throw new Error("독립 풀이와 저장 정답 불일치");
    }
    if (
      review.solutionReviews.length !== 2 ||
      !["slot-1", "slot-2"].every((id) =>
        review.solutionReviews.some(
          (solution) =>
            solution.id === id &&
            solution.agreesWithBlindSolution &&
            solution.allStepsValid &&
            solution.complete &&
            !solution.missingEvidence.length &&
            !solution.issues.length,
        ),
      )
    )
      throw new Error("제안 해설의 독립 검토가 통과되지 않았다");
    if (
      binding.sourceDigest !== reviewDigest(parent) ||
      binding.candidatePayloadDigest !== reviewDigest(pair)
    )
      throw new Error("현재 원문/후보 검토 지문 불일치");
    for (const field of [
      "sourceDigest",
      "candidatePayloadDigest",
      "sourceFigureDigest",
      "candidateFigureDigests",
      "bindingDigest",
    ] as const)
      if (reviewDigest(review[field]) !== reviewDigest(binding[field]))
        throw new Error("현재 실제 그림/문안과 검토 근거 불일치");
  }
  return {
    ids: base.ids,
    before: base.before,
    origins: base.origins,
    pairs: base.pairs,
    candidatePayloadDigest: base.candidatePayloadDigest,
    renderDigest: base.renderDigest,
    proofKind: "machine-blind-reasoning-review" as const,
    reviewDigest: reviewDigest(reviews),
  };
}
