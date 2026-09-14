import type { MathgenProblemData } from "@/lib/mathgen/contracts";
/** Shared, browser-safe contract for the local development AI bridge. */
export const DEV_AI_PROVIDERS = [
  "codex",
  "claude",
  "antigravity",
  "grok",
] as const;
export type DevAiProvider = (typeof DEV_AI_PROVIDERS)[number];
export type DevAiAction =
  "ocr" | "page-ocr" | "figures" | "figure-redraw" | "solution";
export type DevAiQuestionType =
  "multiple-choice" | "short-answer" | "descriptive";
export interface DevAiProviderStatus {
  id: DevAiProvider;
  label: string;
  status:
    | "ready"
    | "unverified"
    | "login-required"
    | "not-installed"
    | "unsupported"
    | "error";
  detail: string;
  image: boolean;
}
export interface DevAiStatus {
  enabled: boolean;
  mode: "subscription-cli";
  defaultProvider: DevAiProvider;
  providers: DevAiProviderStatus[];
}
export interface DevAiRequest {
  provider: DevAiProvider;
  action: DevAiAction;
  imageDataUrl?: string;
  content?: string;
  /** Source-native OCR; used for topic and answer-choice checks. */
  ocr?: MathgenProblemData;
  /** Optional existing figure for figure-redraw; untrusted input, at most 500000 characters. */
  svg?: string;
  /** Untrusted source filename; trimmed, 1–255 characters, no control characters. */
  sourceName?: string;
  grade: string;
}
export interface DevAiDetectedGrade {
  grade:
    | "초1"
    | "초2"
    | "초3"
    | "초4"
    | "초5"
    | "초6"
    | "중1"
    | "중2"
    | "중3"
    | "고1"
    | "고2"
    | "고3";
  /** High requires explicit, conflict-free source evidence. */
  confidence: "high" | "medium" | "low";
  evidence: string;
}
export interface DevAiFigure {
  /** Coordinates in the INPUT image, normalized to 0–1000. */
  bbox: { left: number; top: number; width: number; height: number };
}
export interface DevAiRecognizedProblem {
  number?: number;
  ocr?: MathgenProblemData;
  content: string;
  answer: string;
  /** Printed type/answer-choice evidence only; omitted when ambiguous. */
  questionType?: DevAiQuestionType;
  /** Coordinates in the source image, normalized to 0–1000. */
  bbox: { left: number; top: number; width: number; height: number };
  /** Source PAGE coordinates, never relative to this problem's bbox. */
  figures?: DevAiFigure[];
}
export interface DevAiResult {
  ocr?: MathgenProblemData;
  /** Page detection only: isolated OCR is queued after these crops are inserted. */
  detectionOnly?: boolean;
  upsideDown?: boolean;
  content: string;
  answer: string;
  solution: string;
  warnings: string[];
  /** Crop OCR only; omitted when the source does not establish a type. */
  questionType?: DevAiQuestionType;
  /** Figure redraw only; must still be sanitized by the browser before applying. */
  svg?: string;
  /** Figure redraw only: validated input to the local deterministic Python renderer. */
  spec?: DevAiFigureSpec;
  engine?: "todays-math-python";
  figureReview?: {
    /** Original image versus validated spec/SVG, not a second raster image. */
    mode: "source-image-and-spec";
    passed: boolean;
    issues: string[];
  };
  /** Page OCR only; independent of the user's requested target grade. */
  detectedGrade?: DevAiDetectedGrade;
  problems?: DevAiRecognizedProblem[];
  /** Figure detection or crop OCR, in the supplied INPUT image coordinates. */
  figures?: DevAiFigure[];
}
export interface DevAiFigureSpec extends Record<string, unknown> {
  version: 2 | "elem-1" | "graph-1";
}
export interface DevAiResponse {
  provider: DevAiProvider;
  action: DevAiAction;
  result: DevAiResult;
}
