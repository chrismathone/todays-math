/**
 * 오늘의 영어 모델 벤치 — 생성 후보와 채점관 (원장님 2026-09-30: grok · codex · claude + antigravity 의 gemini, 모델별).
 * 모델 이름은 각 CLI 가 2026-09-30 에 내놓은 목록(`codex` models_cache · `grok models` · `agy models` · claude 별칭).
 */
import type { Provider } from "./cli";

export interface BenchModel {
  id: string;
  provider: Provider;
  model: string;
  effort?: string;
}

export const GENERATORS: BenchModel[] = [
  ...[
    "gpt-6-astra",
    "gpt-6-sol",
    "gpt-6-luna",
    "gpt-5.6-sol",
    "gpt-5.6-terra",
    "gpt-5.6-luna",
    "gpt-5.5",
  ].map((model): BenchModel => ({
    id: `codex:${model}`,
    provider: "codex",
    model,
    effort: "high",
  })),
  ...["fable", "opus", "sonnet", "haiku"].map((model): BenchModel => ({
    id: `claude:${model}`,
    provider: "claude",
    model,
    effort: "high",
  })),
  ...["grok-4.7", "grok-4.7-build-fast", "grok-4.6", "grok-4.5"].map(
    (model): BenchModel => ({ id: `grok:${model}`, provider: "grok", model }),
  ),
  ...[
    "gemini-3.8-flash-high",
    "gemini-3.7-flash-high",
    "gemini-3.6-flash-high",
    "gemini-3.1-pro-high",
  ].map((model): BenchModel => ({
    id: `gemini:${model}`,
    provider: "gemini",
    model,
  })),
  // 제품 기본 모델(deepseek-v4-pro)과 같은 회사의 가벼운 모델 — 유료 API(원장님 2026-09-30)
  ...["deepseek-v4-pro", "deepseek-flash"].map((model): BenchModel => ({
    id: `deepseek:${model}`,
    provider: "deepseek",
    model,
  })),
  // flash 추론 강도 비교 — 기본(high)은 위 줄. `off` = 생각 끄기(원장님 2026-09-30 «딥시크 effort 별로도»)
  ...["low", "max", "off"].map((effort): BenchModel => ({
    id: `deepseek:deepseek-flash@${effort}`,
    provider: "deepseek",
    model: "deepseek-flash",
    effort,
  })),
];

/** 채점관 셋 — 각 AI 의 최상위 모델. 생성 모델 이름은 가린다 */
export const JUDGES: BenchModel[] = [
  {
    id: "judge:codex",
    provider: "codex",
    model: "gpt-6-astra",
    effort: "medium",
  },
  { id: "judge:claude", provider: "claude", model: "fable", effort: "medium" },
  { id: "judge:grok", provider: "grok", model: "grok-4.7", effort: "medium" },
];

/** 자기 계열 채점 — 생성 모델과 같은 회사 채점관(gemini 는 해당 없음) */
export function sameFamily(generator: BenchModel, judge: BenchModel): boolean {
  return generator.provider === judge.provider;
}
