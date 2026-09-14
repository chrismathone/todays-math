/** Shared, browser-safe contract for the local development AI bridge. */
export const DEV_AI_PROVIDERS = [
  "codex",
  "claude",
  "antigravity",
  "grok",
] as const;
export type DevAiProvider = (typeof DEV_AI_PROVIDERS)[number];
export type DevAiAction = "ocr" | "page-ocr" | "figures" | "solution";
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
  content: string;
  answer: string;
  /** Coordinates in the source image, normalized to 0–1000. */
  bbox: { left: number; top: number; width: number; height: number };
  /** Source PAGE coordinates, never relative to this problem's bbox. */
  figures?: DevAiFigure[];
}
export interface DevAiResult {
  content: string;
  answer: string;
  solution: string;
  warnings: string[];
  /** Page OCR only; independent of the user's requested target grade. */
  detectedGrade?: DevAiDetectedGrade;
  problems?: DevAiRecognizedProblem[];
  /** Independent figure detection in the supplied input image. */
  figures?: DevAiFigure[];
}
export interface DevAiResponse {
  provider: DevAiProvider;
  action: DevAiAction;
  result: DevAiResult;
}
