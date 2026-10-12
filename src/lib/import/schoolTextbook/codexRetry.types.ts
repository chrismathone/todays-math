/** Local subscription review only. These booleans are not calibrated probabilities or human signoff. */
import type {
  DbRetryBlindSolution,
  DbRetryPairReview,
  DbRetrySolutionReview,
} from "./dbRetry.types";

export type CodexRetryPhase =
  "blind-solve" | "solution-review" | "semantic-review";
export interface CodexRetryJsonRequest {
  phase: CodexRetryPhase;
  prompt: string;
  schema: Record<string, unknown>;
  /** Validated raster data URLs, in the exact order described in prompt. */
  images?: readonly string[];
  outDir: string;
  cwd?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}
/** Structural adapter to A's runCodexJson; no default transport or model selection. */
export type RunCodexJson = (request: CodexRetryJsonRequest) => Promise<{
  value: unknown;
  auth: "chatgpt";
  threadId: string;
  model: string | null;
  usage: unknown;
  elapsedMs: number;
  receipt: unknown;
}>;
export interface CodexRetryReviewOptions {
  runCodexJson?: RunCodexJson;
  outDir?: string;
  cwd?: string;
  timeoutMs?: number;
  /** Forwarded to the runner so cancellation also terminates its CLI child. */
  signal?: AbortSignal;
}
export interface CodexRetryReceipt {
  version: "codex-chatgpt-json-v1";
  phase: string;
  auth: "chatgpt";
  cliVersion: string;
  requestedModel: "codex-account-default";
  model: string | null;
  modelObserved: boolean;
  threadId: string;
  exitCode: 0;
  signal: null;
  status: "succeeded";
  reason: null;
  turnCompleted: true;
  schemaValid: true;
  promptSha256: string;
  schemaSha256: string;
  images: { sha256: string; bytes: number; width: number; height: number }[];
  outputSha256: string;
  receiptPath: string;
  outputPath: string;
}
export interface CodexRetryJudgment {
  passed: boolean;
  evidence: {
    original: string;
    candidate: string;
    reason: string;
  };
}
export interface CodexRetrySemanticReview {
  id: "slot-1" | "slot-2";
  sameLearningGoal: CodexRetryJudgment;
  comparableMethod: CodexRetryJudgment;
  comparableGrade: CodexRetryJudgment;
  complete: CodexRetryJudgment;
  actualChange: CodexRetryJudgment;
  missingEvidence: string[];
  issues: string[];
}
export interface CodexRetrySolutionReview extends DbRetrySolutionReview {
  /** Specific equalities, domains, roots/subparts and inferences checked. */
  evidence: string[];
}
export interface CodexRetryCommunication {
  phase: CodexRetryPhase;
  status: "succeeded" | "failed";
  auth: "chatgpt" | null;
  threadId: string | null;
  model: string | null;
  usage: unknown;
  elapsedMs: number;
  inputDigest: string;
  schemaDigest: string;
  imageSha256s: string[];
  outputDigest: string | null;
  /** Binds the runner's durable receipt without copying arbitrary transport data. */
  receiptDigest: string | null;
  /** Validated, whitelisted receipt metadata; full receipt remains in A's artifact file. */
  receipt: CodexRetryReceipt | null;
}
export interface CodexDbRetryPairReview extends Pick<
  DbRetryPairReview,
  | "sourceId"
  | "sourceDigest"
  | "candidatePayloadDigest"
  | "sourceFigureDigest"
  | "candidateFigureDigests"
  | "bindingDigest"
> {
  version: string;
  kind: "machine-codex-blind-review";
  passed: boolean;
  /** Digest of the frozen independent answers, never replaced during later review. */
  blindSolutionsDigest: string | null;
  blindSolutions: DbRetryBlindSolution[];
  solutionReviews: CodexRetrySolutionReview[];
  semanticReviews: CodexRetrySemanticReview[];
  communications: CodexRetryCommunication[];
  issues: string[];
}
