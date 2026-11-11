import "server-only";
import { insightModelConfig } from "@/lib/math-insight/config";
/** Opt-in settings for this feature only; inherited behavior is byte-for-byte
 * the existing selector when neither override is present. Never mutates env. */
export function ontologyModelConfig(env: NodeJS.ProcessEnv = process.env) {
  const vendor = env.MATH_ONTOLOGY_VENDOR?.trim(),
    model = env.MATH_ONTOLOGY_MODEL?.trim();
  if (!vendor && !model) return insightModelConfig(env);
  // 물려받는 기본 공급자는 수학 인사이트와 같다 — Claude(원장님 2026-11-11 · `insightModelConfig`).
  const inheritedVendor = env.MATH_INSIGHT_VENDOR?.trim() || "anthropic";
  return insightModelConfig({
    ...env,
    MATH_INSIGHT_VENDOR: vendor || env.MATH_INSIGHT_VENDOR,
    MATH_INSIGHT_MODEL:
      model ||
      (vendor && vendor !== inheritedVendor
        ? undefined
        : env.MATH_INSIGHT_MODEL),
  });
}
