import type { MathgenProblemData } from "@/lib/mathgen/contracts";
import type {
  FigureEditCommand,
  FigureEditFigure,
} from "./figure-edit-contract";
/** Shared, browser-safe contract for the local development AI bridge. */
export const DEV_AI_PROVIDERS = [
  "codex",
  "claude",
  "antigravity",
  "grok",
] as const;
export type DevAiProvider = (typeof DEV_AI_PROVIDERS)[number];
/** 구독 CLI 모델 이름 — 셸 없이 인자로만 넘기지만 형식은 좁힌다(첫 글자 영숫자 · `opus[1m]` 허용). */
export const CLI_MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._[\]-]{0,63}$/;
export const STUDIO_API_PROVIDERS = [
  "auto",
  "gemini",
  "deepseek",
  "anthropic",
  "openai",
] as const;
export type StudioApiProvider = (typeof STUDIO_API_PROVIDERS)[number];
export type StudioAiProvider = DevAiProvider | StudioApiProvider;
export type StudioAiMode = "subscription-cli" | "model-api";
export type DevAiAction =
  "ocr" | "page-ocr" | "figures" | "figure-redraw" | "figure-edit" | "solution";
export type DevAiQuestionType =
  "multiple-choice" | "short-answer" | "descriptive";
export interface DevAiProviderStatus {
  id: StudioAiProvider;
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
  /** 구독 CLI(Codex·Claude)만: 고를 수 있는 모델. */
  models?: string[];
  /** 구독 CLI 만: 원장님 CLI 설정의 모델(«CLI 설정» 칸이 쓰는 값) — 없으면 CLI 자체 기본. */
  defaultModel?: string;
}
export interface DevAiStatus {
  enabled: boolean;
  mode: StudioAiMode;
  defaultProvider: StudioAiProvider;
  providers: DevAiProviderStatus[];
}
export interface DevAiRequest {
  provider: DevAiProvider;
  /** 구독 CLI 모델 — 없으면 원장님 CLI 설정. 서버 모델 API 경로는 쓰지 않는다. */
  model?: string;
  action: DevAiAction;
  imageDataUrl?: string;
  content?: string;
  /** Source-native OCR; used for topic and answer-choice checks. */
  ocr?: MathgenProblemData;
  /** Optional existing figure for figure-redraw; untrusted input, at most 500000 characters. */
  svg?: string;
  /** figure-edit 만: 편집기 번호가 붙은 지금 그림의 요소 목록(figure-edit-contract.ts). */
  figure?: FigureEditFigure;
  /** Untrusted source filename; trimmed, 1–255 characters, no control characters. */
  sourceName?: string;
  grade: string;
  /** 해설만: 문항 인식이 판정한 난이도 — «심화상»이면 서버가 Opus 로 푼다(원장님 2026-11-11). */
  difficulty?: import("@/contracts/difficulty").Difficulty;
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
  /** Crop OCR only: AI 가 판정한 난이도(사다리 안의 값만) — 해설 모델을 고르는 데 쓴다. */
  difficulty?: import("@/contracts/difficulty").Difficulty;
  /** Figure redraw only; must still be sanitized by the browser before applying. */
  svg?: string;
  /** Figure redraw only: validated input to the local deterministic Python renderer. */
  spec?: DevAiFigureSpec;
  /** figure-edit 만: 형식을 검사한 수정 명령 — 편집기가 번호·좌표를 다시 검사한 뒤 지금 그림에 적용한다. */
  edits?: FigureEditCommand[];
  engine?: "todays-math-python";
  figureReview?: {
    /** Original image versus validated spec/SVG, not a second raster image. */
    mode: "source-image-and-spec" | "source-and-rendered-images";
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
  provider: StudioAiProvider;
  model?: string;
  action: DevAiAction;
  result: DevAiResult;
}
