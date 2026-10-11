/** Subscription evidence has its own approval policy; it never impersonates a probability model. */
import type { CodexDbRetryPairReview } from "./codexRetry.types";
import { CODEX_RETRY_REVIEW_VERSION } from "./codexRetryReview";
import { validateCodexRetryCaseQualification } from "./codexRetryCaseQualification";
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
    validateCodexRetryCaseQualification(parent, pair, review);
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
