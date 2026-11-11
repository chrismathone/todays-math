/**
 * 앱 전체의 외부 AI 모델 — 원장님 2026-11-11 «gemini · deepseek 사용처를 전부 sonnet으로 전체 교체» ·
 * «문제 레벨이 초고난이도인 경우 opus 투입». 모든 AI 호출은 이 두 이름을 쓴다(사용처마다 따로 적지 않는다).
 *
 * - 기본: Claude Sonnet 5.5
 * - 초고난이도(난이도 사다리의 맨 위 «심화상»): Claude Opus 5.5
 *
 * 두 모델 모두 `temperature` 를 받지 않는다(보내면 400) — 깊이는 `output_config.effort` 로만 정한다.
 */
export const CLAUDE_DEFAULT_MODEL = "claude-sonnet-5-5";
export const CLAUDE_HARD_MODEL = "claude-opus-5-5";

/** 초고난이도 — 난이도 사다리(`contracts/difficulty.ts`)의 맨 위. */
export const HARD_DIFFICULTY = "심화상";

export const isHardDifficulty = (difficulty: string | null | undefined) =>
  difficulty?.trim() === HARD_DIFFICULTY;

/** 그 문항의 난이도에 맞는 모델 — 심화상이면 Opus, 아니면 Sonnet. */
export const claudeModelFor = (difficulty: string | null | undefined) =>
  isHardDifficulty(difficulty) ? CLAUDE_HARD_MODEL : CLAUDE_DEFAULT_MODEL;
