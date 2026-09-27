/**
 * 통합 탐험 별 경제 (D-144 · 05 §8.20) — 서버 규칙과 화면이 같이 읽는 한 곳. 다른 모듈을 끌어오지 않는다(화면 묶음이 가볍게).
 *
 * - **한 칸 보장**: 오늘의 칸을 얻는 순간, 그 미션이 이미 준 카드 레벨 별이 3보다 적으면 3까지 채운다
 *   (은행 날 3 · 기억 복습 날 최소 3 · 개념 날은 그대로). 칸은 한국 날짜당 하나라서 보장도 하루 한 번이다.
 * - **끝없는 기지**: 처음 세 단계 3 · 6 · 12 는 그대로, 그 뒤로는 한 단계마다 12. 끝이 없어 모은 별이 늘 쓸 곳이 있다.
 */
export const TILE_STAR_FLOOR = 3;

/** 칸 보장이 채워 주는 별 — `missionStars` 는 그 미션이 이미 준 카드 레벨 별(은행 미션은 0). */
export function tileStarBonus(missionStars: number): number {
  return Math.max(0, TILE_STAR_FLOOR - missionStars);
}

export const BASE_STAGE_COSTS = [3, 6, 12] as const;
export const BASE_STAGE_COST_AFTER = 12;

/** `level` 단계에서 다음 단계로 키우는 값. */
export function baseUpgradeCost(level: number): number {
  return BASE_STAGE_COSTS[level] ?? BASE_STAGE_COST_AFTER;
}

export const BASE_STAGE_NAMES = [
  "작은 배움터",
  "수학 탐험소",
  "기억 연구소",
  "빛나는 수학 기지",
] as const;

/** 3단계 뒤로는 이름은 그대로 두고 단계 수만 는다. */
export function baseStageName(level: number): string {
  return BASE_STAGE_NAMES[Math.min(level, BASE_STAGE_NAMES.length - 1)]!;
}
