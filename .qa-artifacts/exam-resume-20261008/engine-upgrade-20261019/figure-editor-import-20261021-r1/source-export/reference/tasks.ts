import type { Effort } from "./claude";

/**
 * 작업별 모델·추론 강도 — 같은 모델을 다 쓰지 않는다(사용자 지시 2026-10-21 «작업에 따라 섬세하게 분리»).
 *
 * | 작업 | 하는 일 | 기본 | 강도 | 대체 |
 * |---|---|---|---|---|
 * | detect | 문제 그림에서 도형 영역 상자 찾기 — 좌표만 낸다 | Haiku 5.5 | low | Sonnet 5.5 |
 * | spec   | 원본 그림 → FigureSpec(엔진 계약을 지키는 정밀 작업) | Sonnet 5.5 | medium | Opus 5.5 |
 * | review | 원본|재작도 한 장 보고 통과/지적 — 짧은 판정 | Sonnet 5.5 | low | Opus 5.5 |
 * | edit   | 번호 붙은 요소 + 요청 → 수정 명령 | Sonnet 5.5 | medium | Opus 5.5 |
 *
 * 근거: todays-math 실측(2026-09-18) 명세 생성 기본 강도 101초 → medium 32초, 대조 medium 7~9초.
 * 위치 찾기는 판정이 단순하고 사람이 상자를 확인·조정하므로 가장 빠르고 싼 모델로 충분하다.
 *
 * 환경변수로 바꾼다: `AI_<작업>_MODEL` · `AI_<작업>_FALLBACK` · `AI_<작업>_EFFORT`
 * (예: AI_SPEC_EFFORT=high). 예전 이름 `AI_MODEL`·`AI_FALLBACK_MODEL` 은 spec·review·edit 의 기본값을 바꾼다.
 */
export type Task = "detect" | "spec" | "review" | "edit";

export interface TaskProfile {
  model: string;
  fallback: string;
  effort: Effort;
  maxTokens: number;
}

const SONNET = "claude-sonnet-5-5";
const OPUS = "claude-opus-5-5";
const HAIKU = "claude-haiku-5-5";

const BASE: Record<Task, TaskProfile> = {
  detect: { model: HAIKU, fallback: SONNET, effort: "low", maxTokens: 4000 },
  spec: { model: SONNET, fallback: OPUS, effort: "medium", maxTokens: 32000 },
  review: { model: SONNET, fallback: OPUS, effort: "low", maxTokens: 8000 },
  edit: { model: SONNET, fallback: OPUS, effort: "medium", maxTokens: 16000 },
};

const env = (name: string) => process.env[name]?.trim() || undefined;
const effortOf = (value: string | undefined): Effort | undefined =>
  value === "low" || value === "medium" || value === "high" ? value : undefined;

export function profile(task: Task): TaskProfile {
  const key = task.toUpperCase();
  const base = BASE[task];
  const general = task === "detect" ? {} : { model: env("AI_MODEL"), fallback: env("AI_FALLBACK_MODEL") };
  return {
    model: env(`AI_${key}_MODEL`) ?? general.model ?? base.model,
    fallback: env(`AI_${key}_FALLBACK`) ?? general.fallback ?? base.fallback,
    // 예전 이름 AI_EFFORT_<작업>(README 첫 판)도 받는다
    effort: effortOf(env(`AI_${key}_EFFORT`) ?? env(`AI_EFFORT_${key}`)) ?? base.effort,
    maxTokens: base.maxTokens,
  };
}

export const allProfiles = () =>
  Object.fromEntries((Object.keys(BASE) as Task[]).map((task) => [task, profile(task)])) as Record<Task, TaskProfile>;
