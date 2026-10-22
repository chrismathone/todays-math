import "server-only";
import { API_KEY_NAMES, API_MODELS } from "@/lib/studio-ai/routing";
/** Explicit per-feature selection. Never mutates global model defaults or falls back. */
export function insightModelConfig(
  env: NodeJS.ProcessEnv = process.env,
): { vendor: "gemini" | "anthropic"; model: string } | null {
  const vendor = env.MATH_INSIGHT_VENDOR?.trim() || "gemini";
  if (vendor !== "gemini" && vendor !== "anthropic") return null;
  const model =
    env.MATH_INSIGHT_MODEL?.trim() ||
    env[`STUDIO_AI_${vendor.toUpperCase()}_MODEL`]?.trim() ||
    API_MODELS[vendor][0];
  if (
    !(API_MODELS[vendor] as readonly string[]).includes(model) ||
    !env[API_KEY_NAMES[vendor]]?.trim()
  )
    return null;
  return { vendor, model };
}
