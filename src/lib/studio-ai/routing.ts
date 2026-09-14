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
          ? "anthropic"
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
