import "server-only";
import { CLAUDE_DEFAULT_MODEL } from "@/lib/ai/claudeModels";
import { API_KEY_NAMES, API_MODELS } from "@/lib/studio-ai/routing";

/**
 * Explicit per-feature selection. Never mutates global model defaults or falls back.
 *
 * 기본은 Claude Sonnet 5.5(원장님 2026-11-11 «gemini · deepseek 사용처를 전부 sonnet 으로»). 이 기능은 문항
 * 난이도를 다루지 않으므로 Opus 로 올라가는 일이 없다. 문제 추출의 `STUDIO_AI_ANTHROPIC_MODEL` 은 따르지 않는다
 * (그 변수가 바뀌어도 이 기능의 모델이 같이 끌려가지 않게). 되돌리기: `MATH_INSIGHT_VENDOR=gemini`
 * (모델은 전처럼 `MATH_INSIGHT_MODEL` → `STUDIO_AI_GEMINI_MODEL` → Gemini 목록의 맨 앞).
 */
export function insightModelConfig(
  env: NodeJS.ProcessEnv = process.env,
): { vendor: "gemini" | "anthropic"; model: string } | null {
  const vendor = env.MATH_INSIGHT_VENDOR?.trim() || "anthropic";
  if (vendor !== "gemini" && vendor !== "anthropic") return null;
  const model =
    env.MATH_INSIGHT_MODEL?.trim() ||
    (vendor === "anthropic"
      ? CLAUDE_DEFAULT_MODEL
      : env.STUDIO_AI_GEMINI_MODEL?.trim() || API_MODELS.gemini[0]);
  if (
    !(API_MODELS[vendor] as readonly string[]).includes(model) ||
    !env[API_KEY_NAMES[vendor]]?.trim()
  )
    return null;
  return { vendor, model };
}

/**
 * 모델 응답의 출력 한도. Claude Sonnet 5.5 · Opus 5.5 는 생각을 끌 수 없고 생각도 이 한도를 같이 쓴다 — Gemini 때의
 * 한도(답 글 몫)를 그대로 주면 생각만으로 바닥나 `max_tokens` 로 잘린다. 그래서 Claude 에는 생각 몫을 더 얹는다.
 * 한도는 상한일 뿐 실제로 쓴 토큰만 과금된다.
 */
export function insightMaxOutputTokens(
  vendor: "gemini" | "anthropic",
  answerTokens: number,
): number {
  return vendor === "anthropic" ? answerTokens + 6000 : answerTokens;
}
