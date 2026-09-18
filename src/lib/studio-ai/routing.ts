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
  deepseek: ["deepseek-v4-pro"],
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
export function resolveApiModel(
  provider: StudioApiProvider,
  action: DevAiAction,
  env: NodeJS.ProcessEnv,
) {
  const vendor: ApiVendor =
    provider === "auto"
      ? action === "solution"
        ? "deepseek"
        : action === "figure-redraw"
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
export const usesCompletionTokens = (model: string) =>
  /^(?:gpt-5(?:[.-]|$)|o[134](?:-|$))/.test(model);
export const requiresResponsesApi = (model: string) => model === "gpt-5.5-pro";
export const geminiSampling = (model: string) =>
  model === "gemini-3.8-flash"
    ? { thinkingConfig: { thinkingLevel: "LOW" } }
    : { temperature: 0 };
