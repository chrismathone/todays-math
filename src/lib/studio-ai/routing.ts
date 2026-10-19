import type { DevAiAction, StudioApiProvider } from "@/lib/dev-ai/contracts";

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
  anthropic: [
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
 * 자동 배정에서 도형 사양 생성을 맡을 제공자. 2026-09-18 실측(그림 3장, 사양 생성 한 번):
 * Gemini 3.8 Flash LOW 4~7초 · Claude Opus 5 medium 8~40초 · Codex 10~72초 — 그림 품질은 견줄 만했다.
 * `STUDIO_AI_FIGURE_VENDOR` 로 코드 없이 되돌린다. 이미지를 못 보는 DeepSeek 는 받지 않는다.
 */
const FIGURE_VENDORS: readonly ApiVendor[] = ["gemini", "anthropic", "openai"];
function figureVendor(env: NodeJS.ProcessEnv): ApiVendor {
  const chosen = env.STUDIO_AI_FIGURE_VENDOR?.trim();
  if (!chosen) return "gemini";
  if (!(FIGURE_VENDORS as readonly string[]).includes(chosen))
    throw new Error("서버의 AI 모델 설정을 확인해 주세요.");
  return chosen as ApiVendor;
}
/** 도형 모델을 쓰는 작업 — «요청대로 고치기»(figure-edit)도 재작도와 같은 모델·추론 강도를 따른다(2026-09-19). */
const FIGURE_ACTIONS: readonly DevAiAction[] = ["figure-redraw", "figure-edit"];
export function resolveApiModel(
  provider: StudioApiProvider,
  action: DevAiAction,
  env: NodeJS.ProcessEnv,
) {
  const vendor: ApiVendor =
    provider === "auto"
      ? action === "solution"
        ? "deepseek"
        : FIGURE_ACTIONS.includes(action)
          ? figureVendor(env)
          : "gemini"
      : provider;
  if (vendor === "deepseek" && action !== "solution")
    throw new Error(
      "DeepSeek는 해설 생성에만 사용할 수 있습니다. 이미지 인식 모델을 선택해 주세요.",
    );
  const model =
    env[`STUDIO_AI_${vendor.toUpperCase()}_MODEL`] || API_MODELS[vendor][0];
  if (!(API_MODELS[vendor] as readonly string[]).includes(model))
    throw new Error("서버의 AI 모델 설정을 확인해 주세요.");
  return { vendor, model };
}
/** 자동 배정의 도형 재작도는 그린 뒤 Gemini 가 한 번 더 본다 — 실행(`execute.ts`)과 화면 설명이 같이 쓴다 */
export function autoFigureReviewModel(env: NodeJS.ProcessEnv) {
  return resolveApiModel("gemini", "figure-redraw", env);
}

const WORD_LABELS: Record<string, string> = {
  gemini: "Gemini",
  deepseek: "DeepSeek",
  claude: "Claude",
};
/** `gemini-3.8-flash` → `Gemini 3.8 Flash` · `gpt-5.5-pro` → `GPT-5.5 Pro` */
export function modelLabel(model: string) {
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
