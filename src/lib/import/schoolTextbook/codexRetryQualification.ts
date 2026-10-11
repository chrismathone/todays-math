/** Subscription evidence has its own approval policy; it never impersonates a probability model. */
import type { CodexDbRetryPairReview } from "./codexRetry.types";
import {
  CODEX_RETRY_REVIEW_VERSION,
  CODEX_RETRY_SEMANTIC_DIMENSIONS,
} from "./codexRetryReview";
import {
  dbRetryAnswersAgree,
  dbRetryUnknownAnswer,
} from "./dbRetryReviewBinding";
import { reviewDigest } from "./qualification";
import {
  validateDbRetryQualificationRows,
  uniqueDbRetryQualification,
  type DbRetryQualificationBinding,
  type DbRetryQualificationRowsInput,
} from "./dbRetryQualificationRows";

export interface CodexRetryQualificationInput extends DbRetryQualificationRowsInput {
  reviews: readonly CodexDbRetryPairReview[];
  bindings: readonly DbRetryQualificationBinding[];
}
const nonempty = (value: unknown): value is string =>
  typeof value === "string" && Boolean(value.trim());
const digest = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const same = (left: unknown, right: unknown) =>
  reviewDigest(left) === reviewDigest(right);

export function prepareCodexRetryQualification(
  input: CodexRetryQualificationInput,
) {
  const base = validateDbRetryQualificationRows(input);
  const reviewById = uniqueDbRetryQualification(
    input.reviews,
    (r) => r.sourceId,
  );
  const bindingById = uniqueDbRetryQualification(
    input.bindings,
    (r) => r.sourceId,
  );
  if (
    input.reviews.length !== base.pairs ||
    input.bindings.length !== base.pairs
  )
    throw new Error("Codex 검토 모집단 불일치");
  for (const [sourceId, group] of base.groups) {
    const pair = [...group].sort((a, b) => a.slot - b.slot);
    const parent = base.originalById.get(sourceId)!.problem;
    const review = reviewById.get(sourceId),
      binding = bindingById.get(sourceId);
    if (
      !review ||
      !binding ||
      review.version !== CODEX_RETRY_REVIEW_VERSION ||
      review.kind !== "machine-codex-blind-review" ||
      review.passed !== true ||
      review.issues.length
    )
      throw new Error("Codex 독립 검산 통과 근거 누락");
    if (
      binding.sourceDigest !== reviewDigest(parent) ||
      binding.candidatePayloadDigest !== reviewDigest(pair)
    )
      throw new Error("현재 원문/후보 지문 불일치");
    for (const field of [
      "sourceDigest",
      "candidatePayloadDigest",
      "sourceFigureDigest",
      "candidateFigureDigests",
      "bindingDigest",
    ] as const)
      if (!same(review[field], binding[field]))
        throw new Error("현재 실제 그림/문안과 Codex 검토 불일치");
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
      if (
        !semantic ||
        semantic.missingEvidence.length ||
        semantic.issues.length
      )
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
    const outputs = [
      { solutions: review.blindSolutions },
      { reviews: review.solutionReviews },
      { reviews: review.semanticReviews },
    ];
    const phases = [
      "blind-solve",
      "solution-review",
      "semantic-review",
    ] as const;
    if (
      review.communications.length !== 3 ||
      new Set(review.communications.map((c) => c.threadId)).size !== 3
    )
      throw new Error("독립 Codex 세션 세 개 필요");
    review.communications.forEach((communication, index) => {
      const receipt = communication.receipt;
      if (
        communication.phase !== phases[index] ||
        communication.status !== "succeeded" ||
        communication.auth !== "chatgpt" ||
        !nonempty(communication.threadId) ||
        !digest(communication.inputDigest) ||
        !digest(communication.schemaDigest) ||
        !digest(communication.receiptDigest) ||
        communication.outputDigest !== reviewDigest(outputs[index]) ||
        !Number.isFinite(communication.elapsedMs) ||
        communication.elapsedMs < 0 ||
        !receipt ||
        receipt.version !== "codex-chatgpt-json-v1" ||
        receipt.phase !== phases[index] ||
        receipt.auth !== "chatgpt" ||
        receipt.requestedModel !== "codex-account-default" ||
        receipt.status !== "succeeded" ||
        receipt.exitCode !== 0 ||
        receipt.signal !== null ||
        receipt.reason !== null ||
        receipt.turnCompleted !== true ||
        receipt.schemaValid !== true ||
        receipt.threadId !== communication.threadId ||
        receipt.model !== communication.model ||
        receipt.modelObserved !== (receipt.model !== null) ||
        !nonempty(receipt.cliVersion) ||
        !digest(receipt.promptSha256) ||
        !digest(receipt.schemaSha256) ||
        !digest(receipt.outputSha256) ||
        !nonempty(receipt.receiptPath) ||
        !nonempty(receipt.outputPath) ||
        !same(
          receipt.images.map((i) => i.sha256),
          communication.imageSha256s,
        ) ||
        receipt.images.some(
          (i) =>
            !digest(i.sha256) ||
            !Number.isSafeInteger(i.bytes) ||
            i.bytes <= 0 ||
            !Number.isSafeInteger(i.width) ||
            i.width <= 0 ||
            !Number.isSafeInteger(i.height) ||
            i.height <= 0,
        )
      )
        throw new Error("실제 Codex 구독 실행 영수증 불일치");
    });
  }
  return {
    ids: base.ids,
    before: base.before,
    origins: base.origins,
    pairs: base.pairs,
    candidatePayloadDigest: base.candidatePayloadDigest,
    renderDigest: base.renderDigest,
    proofKind: "machine-codex-blind-review" as const,
    reviewDigest: reviewDigest(input.reviews),
  };
}
