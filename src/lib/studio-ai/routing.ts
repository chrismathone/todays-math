import type { DevAiAction, StudioApiProvider } from "@/lib/dev-ai/contracts";
import { CLAUDE_HARD_MODEL, isHardDifficulty } from "@/lib/ai/claudeModels";

// Current Mathgen hooks/services, not their older descriptive comments.
export const API_MODELS = {
  gemini: [
    "gemini-3.8-flash",
    "gemini-3.5-flash",
    "gemini-3.1-pro-preview",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
  ],
  // 해설 기본은 V4.1 Flash(원장님 2026-10-19 — 50문항 50/50 · v4-pro 48/50). `STUDIO_AI_DEEPSEEK_MODEL=deepseek-v4-pro` 로 되돌린다.
  deepseek: ["deepseek-flash", "deepseek-v4-pro"],
  // 자동 배정의 기본(원장님 2026-11-11) — 맨 앞이 기본이다.
  anthropic: [
    "claude-sonnet-5-5",
    "claude-opus-5-5",
    "claude-opus-5",
    "claude-opus-4-7",
    "claude-sonnet-4-6",
    "claude-haiku-4-5",
  ],
  openai: [
    "gpt-5.5",
    "gpt-5.5-pro",
    "gpt-5.2",
    "gpt-5",
    "gpt-5-mini",
    "gpt-5-nano",
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4o",
    "gpt-4o-mini",
    "o3",
    "o4-mini",
  ],
} as const;
export type ApiVendor = Exclude<StudioApiProvider, "auto">;
export const API_KEY_NAMES: Record<ApiVendor, string> = {
  gemini: "GEMINI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
};
/**
 * 자동 배정 — 처음부터 끝까지 Claude Sonnet 5.5(원장님 2026-11-11 «처음부터 끝까지 전부 sonnet으로»).
 * 그 전에는 문항 인식 · 도형이 Gemini 3.8 Flash, 해설이 DeepSeek V4.1 Flash 였다 — DeepSeek 는 그림을 못 받아
 * 그림 문항(경명여고 12번)의 해설이 «그림 자료 누락»으로 답을 못 냈다.
 * 작업 무리마다 코드 없이 되돌린다: `STUDIO_AI_OCR_VENDOR`(문항 인식 · 쪽 인식 · 도형 찾기) ·
 * `STUDIO_AI_FIGURE_VENDOR`(도형 다시 그리기 · 고치기) · `STUDIO_AI_SOLUTION_VENDOR`(해설) — 예: `gemini` · `deepseek`.
 * 이미지를 못 보는 DeepSeek 는 해설에만 받는다.
 */
const IMAGE_VENDORS: readonly ApiVendor[] = ["anthropic", "gemini", "openai"];
const SOLUTION_VENDORS: readonly ApiVendor[] = [...IMAGE_VENDORS, "deepseek"];
/** 도형 모델을 쓰는 작업 — «요청대로 고치기»(figure-edit)도 재작도와 같은 모델·추론 강도를 따른다(2026-09-19). */
const FIGURE_ACTIONS: readonly DevAiAction[] = ["figure-redraw", "figure-edit"];
function autoVendor(action: DevAiAction, env: NodeJS.ProcessEnv): ApiVendor {
  const [name, allowed] =
    action === "solution"
      ? (["STUDIO_AI_SOLUTION_VENDOR", SOLUTION_VENDORS] as const)
      : FIGURE_ACTIONS.includes(action)
        ? (["STUDIO_AI_FIGURE_VENDOR", IMAGE_VENDORS] as const)
        : (["STUDIO_AI_OCR_VENDOR", IMAGE_VENDORS] as const);
  const chosen = env[name]?.trim();
  if (!chosen) return "anthropic";
  if (!(allowed as readonly string[]).includes(chosen))
    throw new Error("서버의 AI 모델 설정을 확인해 주세요.");
  return chosen as ApiVendor;
}
export function resolveApiModel(
  provider: StudioApiProvider,
  action: DevAiAction,
  env: NodeJS.ProcessEnv,
  /** 해설의 난이도 — 자동 배정이 Claude 로 풀 때 «심화상»이면 Opus 5.5(원장님 2026-11-11 «초고난이도면 opus»). */
  difficulty?: string,
) {
  const vendor: ApiVendor =
    provider === "auto" ? autoVendor(action, env) : provider;
  if (vendor === "deepseek" && action !== "solution")
    throw new Error(
      "DeepSeek는 해설 생성에만 사용할 수 있습니다. 이미지 인식 모델을 선택해 주세요.",
    );
  const model =
    provider === "auto" &&
    vendor === "anthropic" &&
    action === "solution" &&
    isHardDifficulty(difficulty)
      ? CLAUDE_HARD_MODEL
      : env[`STUDIO_AI_${vendor.toUpperCase()}_MODEL`] || API_MODELS[vendor][0];
  if (!(API_MODELS[vendor] as readonly string[]).includes(model))
    throw new Error("서버의 AI 모델 설정을 확인해 주세요.");
  return { vendor, model };
}
/**
 * 자동 배정의 도형 재작도는 그린 뒤 한 번 더 본다 — 그리는 모델과 같은 것으로(Gemini 로 그리던 때는 Gemini 가 봤다).
 * 실행(`execute.ts`)과 화면 설명이 같이 쓴다.
 */
export function autoFigureReviewModel(env: NodeJS.ProcessEnv) {
  return resolveApiModel("auto", "figure-redraw", env);
}

const WORD_LABELS: Record<string, string> = {
  gemini: "Gemini",
  deepseek: "DeepSeek",
  claude: "Claude",
};
/** `gemini-3.8-flash` → `Gemini 3.8 Flash` · `gpt-5.5-pro` → `GPT-5.5 Pro` */
export function modelLabel(model: string) {
  // `claude-sonnet-5-5` → `Claude Sonnet 5.5` (판 번호의 두 토막은 점으로 잇는다)
  const claude = /^claude-([a-z]+)-(\d+)(?:-(\d+))?$/.exec(model);
  if (claude)
    return `Claude ${claude[1][0].toUpperCase()}${claude[1].slice(1)} ${claude[2]}${claude[3] ? `.${claude[3]}` : ""}`;
  const gpt = /^gpt-([\d.]+)(?:-(.+))?$/.exec(model);
  if (gpt)
    return [`GPT-${gpt[1]}`, ...(gpt[2]?.split("-") ?? [])]
      .map((word, i) => (i ? word[0].toUpperCase() + word.slice(1) : word))
      .join(" ");
  return model
    .split("-")
    .map(
      (word) =>
        WORD_LABELS[word] ??
        (/^[a-z]/.test(word) && !/^o\d/.test(word)
          ? word[0].toUpperCase() + word.slice(1)
          : word),
    )
    .join(" ");
}

/**
 * 작업실 «원본 기본 모델» 설명 — 손으로 적지 않고 **지금 배선**에서 뽑는다. 2026-09-26 설명은 «도형 Opus 5»
 * 였는데 도형 기본은 9-18 에 이미 Gemini 로 바뀌어 있었다(원장님 신고). 설정이 틀렸으면 그 문구를 낸다.
 */
export function describeAutoRoutes(env: NodeJS.ProcessEnv) {
  try {
    const label = (action: DevAiAction) =>
      modelLabel(resolveApiModel("auto", action, env).model);
    const figure = resolveApiModel("auto", "figure-redraw", env);
    const review = autoFigureReviewModel(env);
    const figureText =
      review.vendor === figure.vendor && review.model === figure.model
        ? modelLabel(figure.model)
        : `${modelLabel(figure.model)} · 검토 ${modelLabel(review.model)}`;
    return `문항 인식 ${label("page-ocr")} · 해설 ${label("solution")} · 도형 ${figureText} (작업별 서버 키 필요)`;
  } catch (error) {
    return error instanceof Error
      ? error.message
      : "서버의 AI 모델 설정을 확인해 주세요.";
  }
}
export const usesCompletionTokens = (model: string) =>
  /^(?:gpt-5(?:[.-]|$)|o[134](?:-|$))/.test(model);
export const requiresResponsesApi = (model: string) => model === "gpt-5.5-pro";
export const geminiSampling = (model: string) =>
  model === "gemini-3.8-flash"
    ? { thinkingConfig: { thinkingLevel: "LOW" } }
    : { temperature: 0 };
