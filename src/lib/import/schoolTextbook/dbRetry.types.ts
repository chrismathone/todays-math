/** DB originals are the source of truth; generation, blind review and figures stay separate. */
import type { TextbookVariantSource } from "./variants";

export interface DbRetryOrigin {
  problem: TextbookVariantSource;
  grade: string;
  chapter: string;
  section: string;
}
export interface DbRetryCandidate {
  sourceId: string;
  sourceDigest: string;
  originProblemId: string;
  sourceMaterialId: string | null;
  unitId: string;
  sourceExternalId: string | null;
  sourceFile: string | null;
  familyKey: string;
  externalId: string;
  source: "transformed";
  questionType: "객관식" | "단답형" | "서술형";
  slot: 1 | 2;
  recipe: "ai-db-numbers-v1" | "ai-db-conditions-v1";
  method: string;
  content: string;
  answer: string;
  solution: string;
  figureSvg: string | null;
  figureUrls: string[];
  figureDims: number[];
  figureSourceMm: number[];
  choiceFigureIndex: number[];
  validation: {
    version: string;
    originalAnswerRecomputed: string;
    checks: string[];
  };
}
export interface DbRetryImage {
  dataUrl: string;
  sha256: string;
  /** Optional fetched SVG/raster source-byte hash; distinct from rendered solver-image bytes. */
  sourceSha256?: string;
  choiceIndex: number;
  origin: "database-raster" | "database-svg" | "generated-svg";
}
export interface DbRetryFigures {
  images: DbRetryImage[];
  digest: string;
}
export interface DbRetryBlindProblem {
  id: "original" | "slot-1" | "slot-2";
  content: string;
  questionType: string;
  figures: DbRetryFigures;
}
export interface DbRetryBlindSolution {
  id: DbRetryBlindProblem["id"];
  answer: string;
  solution: string;
  missingEvidence: string[];
  ambiguous: boolean;
}
/** A second reasoning request checks every proposed step, after blind answers are fixed. */
export interface DbRetrySolutionReview {
  id: "slot-1" | "slot-2";
  agreesWithBlindSolution: boolean;
  allStepsValid: boolean;
  complete: boolean;
  missingEvidence: string[];
  issues: string[];
}
export interface DbRetryReviewCommunication {
  phase: "blind-solve" | "solution-review" | "semantic-review";
  requestedModel: string;
  returnedModel: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
  status: "succeeded" | "failed";
}
export interface DbRetryPairReview {
  version: string;
  sourceId: string;
  sourceDigest: string;
  candidatePayloadDigest: string;
  sourceFigureDigest: string;
  candidateFigureDigests: [string, string];
  /** Complete origin (including unit labels), full pair and actual figure bytes. */
  bindingDigest: string;
  passed: boolean;
  kind: "machine-blind-reasoning-review";
  solverModel: string;
  semanticModel: string;
  solutionReviewerModel: string;
  semanticThresholds: {
    sameLearningGoal: number;
    sameLevel: number;
    complete: number;
  };
  semanticProbabilities: Record<string, number>;
  blindSolutions: DbRetryBlindSolution[];
  solutionReviews: DbRetrySolutionReview[];
  communications: DbRetryReviewCommunication[];
  issues: string[];
}
