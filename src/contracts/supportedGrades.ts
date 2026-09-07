/**
 * **지금 문항이 있는 학년** — 원장님 확정 2026-09-07: 「고등은 일단 패스, 초3~중3만으로」.
 *
 * 이것은 취향이 아니라 **측정된 경계**다. 같은 날 공유 DB 실측:
 *
 * ```
 * 초3 12,683 · 초4 13,597 · 초5 14,969 · 초6 14,533
 * 중1 17,339 · 중2 19,885 · 중3  7,822          합 100,828
 *
 * 초1 0 · 초2 0 · 공통수학1 0 · 공통수학2 0 · 대수 0 · 미적분1 0 · 미적분2 0 ·
 * 확률과 통계 0 · 기하 0                        ← 단원은 있는데 문항이 **하나도 없다**
 * ```
 *
 * 그래서 이 목록에 없는 학년을 **고르게 두면 반드시 막다른 길**이다 — 진도를 거기 찍고
 * 출제를 누르면 「문제가 부족합니다」가 나오고, 원장은 무엇이 잘못됐는지 알 수 없다.
 *
 * ## 🔴 «고르는 목록»만 좁힌다. «이름을 찾는 표»는 안 좁힌다.
 *
 * `GET /api/units` 는 지면·진도 패널이 **단원 이름을 되찾는** 데도 쓴다. 거기를 좁히면
 * 지원 밖 학년에 찍힌 옛 진도의 단원명이 조용히 「—」가 된다. 그래서 좁히는 자리는
 * 사람이 **고르는** 곳뿐이다: 온보딩 3단계 · 반 관리 진도 트리 · 출제 설정의 범위 피커.
 *
 * ⚠️ 이 목록은 **손으로 적은 것**이다. 고등 문항이 들어오는 날 여기를 같이 늘리지 않으면
 *    그 학년은 화면에서 구조적으로 안 보인다 — 그때 이 주석의 실측을 다시 내 볼 것.
 */
export const SUPPORTED_GRADES = [
  "초3",
  "초4",
  "초5",
  "초6",
  "중1",
  "중2",
  "중3",
] as const;

export type SupportedGrade = (typeof SUPPORTED_GRADES)[number];

const SUPPORTED = new Set<string>(SUPPORTED_GRADES);

export function isSupportedGrade(grade: string): boolean {
  return SUPPORTED.has(grade);
}

/**
 * 고르는 목록에서 지원 밖 학년을 뺀다.
 *
 * 🔴 **전부 빠지면 안 걸러진 것을 돌려준다.** 학년 이름이 바뀌거나(교육과정 개정) 오타가
 *    나면 이 함수가 목록을 **통째로 비우고**, 화면은 「고를 것이 없다」가 되어 원장이
 *    아무것도 못 한다. 그건 좁히기의 실패지 «지원 학년이 없다»가 아니다 —
 *    조용히 비우느니 넓은 목록을 주는 쪽이 낫다. `supportedGrades.test.ts` 가 이 갈래를 잠근다.
 */
export function onlySupportedGrades<T extends { grade: string }>(
  units: readonly T[],
): T[] {
  const kept = units.filter((u) => isSupportedGrade(u.grade));
  if (kept.length === 0) return [...units];
  return kept;
}
