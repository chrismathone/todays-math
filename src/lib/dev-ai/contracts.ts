/** Shared, browser-safe contract for the local development AI bridge. */
export const DEV_AI_PROVIDERS = [
  "codex",
  "claude",
  "antigravity",
  "grok",
] as const;
export type DevAiProvider = (typeof DEV_AI_PROVIDERS)[number];
export type DevAiAction = "ocr" | "page-ocr" | "solution";
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
  grade: string;
}
export interface DevAiRecognizedProblem {
  content: string;
  answer: string;
  /** Coordinates in the source image, normalized to 0–1000. */
  bbox: { left: number; top: number; width: number; height: number };
}
export interface DevAiResult {
  content: string;
  answer: string;
  solution: string;
  warnings: string[];
  problems?: DevAiRecognizedProblem[];
}
export interface DevAiResponse {
  provider: DevAiProvider;
  action: DevAiAction;
  result: DevAiResult;
}
