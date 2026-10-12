/** A grouped machine review is not a per-pair receipt, probability, or human approval. */
import type {
  DbRetryBlindSolution,
  DbRetryCandidate,
  DbRetryFigures,
  DbRetryOrigin,
} from "./dbRetry.types";
import type {
  CodexDbRetryPairReview,
  CodexRetryPhase,
  CodexRetryReceipt,
  CodexRetryReviewOptions,
  CodexRetrySemanticReview,
  CodexRetrySolutionReview,
} from "./codexRetry.types";

export interface CodexRetryBatchInput {
  origin: DbRetryOrigin;
  /** Slot order is explicit: slot 1, then slot 2; figures follow the same order. */
  candidates: readonly DbRetryCandidate[];
  sourceFigures: DbRetryFigures;
  candidateFigures: readonly DbRetryFigures[];
}
export type CodexRetryBatchOptions = CodexRetryReviewOptions;
export interface CodexRetryBatchBinding extends Pick<
  CodexDbRetryPairReview,
  | "sourceId"
  | "sourceDigest"
  | "candidatePayloadDigest"
  | "sourceFigureDigest"
  | "candidateFigureDigests"
  | "bindingDigest"
> {
  caseId: string;
  /** One-based position in the original batch, never renumbered after a hold. */
  questionIndex: number;
  /** Raw ordered input, in addition to the compatible per-pair binding. */
  inputDigest: string;
}
export interface CodexRetryBatchReceipt extends CodexRetryReceipt {
  id: string;
  usage: {
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
  } | null;
  startedAt: string;
  elapsedMs: number;
  stdoutSha256: string;
  stderrSha256: string;
}
export interface CodexRetryBatchCommunication {
  phase: CodexRetryPhase;
  caseIds: string[];
  status: "succeeded" | "failed";
  /** Exact actual grouped prompt/schema; never a fabricated single-case prompt. */
  prompt: string;
  schema: Record<string, unknown>;
  inputDigest: string;
  promptSha256: string;
  schemaSha256: string;
  images: { sha256: string; bytes: number }[];
  auth: "chatgpt" | null;
  threadId: string | null;
  model: string | null;
  /** Shared usage appears once here, never in the per-case results. */
  usage: CodexRetryBatchReceipt["usage"];
  elapsedMs: number;
  receipt: CodexRetryBatchReceipt | null;
  receiptDigest: string | null;
  /** SHA of exact durable output bytes differs from canonical outputDigest. */
  outputSha256: string | null;
  outputDigest: string | null;
  /** Full actual CLI output object, including every returned case in its actual order. */
  rawOutput: unknown;
}
export interface CodexRetryBatchCase extends CodexRetryBatchBinding {
  passed: boolean;
  issues: string[];
  blindSolutions: DbRetryBlindSolution[];
  blindSolutionsDigest: string | null;
  solutionReviews: CodexRetrySolutionReview[];
  semanticReviews: CodexRetrySemanticReview[];
}
export interface CodexDbRetryBatchReview {
  version: "codex-db-retry-batch-blind-review-v1";
  kind: "machine-codex-batch-blind-review";
  inputBindings: CodexRetryBatchBinding[];
  batchDigest: string;
  passed: boolean;
  /** Batch integrity/transport failures. Mathematical holds live on the individual case. */
  issues: string[];
  cases: CodexRetryBatchCase[];
  communications: CodexRetryBatchCommunication[];
}
