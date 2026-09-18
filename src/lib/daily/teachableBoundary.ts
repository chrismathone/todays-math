/**
 * **출제할 문항이 있는 마지막 차시** — 진도 계획이 그 너머로 걷지 않게 하는 경계.
 *
 * ## 왜 (2026-09-18 시뮬레이션)
 *
 * 차례(`orderIndex`)는 전역 연속값이라(D-27) 학년 사이에 울타리가 없다. 공유 DB 는 초3~중3 에만
 * 문항이 있고(고등 245차시 0건), 중3 은 22차시뿐이다. 그래서 주2회 중3 반은 11주면 계획이
 * 공통수학1 로 걸어 들어갔고, 직전 확인테스트의 끝이 중3 마지막 차시라 그 뒤 범위는 언제나
 * «고등 안» — **영구히 「문항 부족」** 이었다(실측 19 수업일 연속 0장).
 * 보고서: docs/planning/tracks/reports/daily-auto-test-simulation.md §3 ⑵
 *
 * 이 차시를 `resolveDailyPlan` 에 넘기면 계획이 거기서 멈추고 `atCurriculumEnd` 를 낸다
 * (D-129 리드 결정 ⑵ «끝에 닿으면 표시만»의 연장). 범위는 `current-only` 로 그 차시 하나가 되어
 * 시험이 계속 선다.
 *
 * ⚠️ 찾는 것은 **끝** 하나다. 앞쪽 빈 구간(초1·초2)이나 가운데 빈 차시는 여기서 다루지 않는다 —
 *    그 자리는 「문항 부족」으로 정직하게 보인다(`draftCapacity.ts`).
 * ⚠️ 고등 엔진이 문항을 채우면 경계가 저절로 뒤로 밀린다 — 상수로 박지 않는 까닭이다.
 */
import { db } from "@/lib/db";
import { eligibleProblemsWhere } from "@/lib/findEligibleProblems";

export interface BoundaryUnit {
  id: string;
  orderIndex: number;
}

/**
 * `units[i..]`(차례대로) 안에 문항이 하나라도 있나를 **이분 탐색**으로 물어 끝을 찾는다.
 * 735차시면 열 번 남짓 묻는다 — 차시마다 세면 DB 왕복이 수백 번이다.
 *
 * 문항이 한 건도 없으면 `null` — 경계를 모른다(계획은 예전처럼 걷는다).
 */
export async function findLastTeachableUnitId(
  units: readonly BoundaryUnit[],
  hasProblems: (unitIds: string[]) => Promise<boolean>,
): Promise<string | null> {
  const sorted = [...units].sort((a, b) => a.orderIndex - b.orderIndex);
  if (sorted.length === 0) return null;
  const suffix = (i: number) => sorted.slice(i).map((u) => u.id);

  if (!(await hasProblems(suffix(0)))) return null;
  // 불변식: suffix(lo) 에는 문항이 있다. 그런 lo 중 가장 큰 것이 마지막 차시다.
  let lo = 0;
  let hi = sorted.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (await hasProblems(suffix(mid))) lo = mid;
    else hi = mid - 1;
  }
  return sorted[lo]!.id;
}

/** DB 판 — 출제와 **같은 자격**(`eligibleProblemsWhere`)으로 «있나»만 묻는다(한 행만 읽는다). */
export async function loadLastTeachableUnitId(
  units: readonly BoundaryUnit[],
): Promise<string | null> {
  return findLastTeachableUnitId(units, async (unitIds) => {
    const hit = await db.problem.findMany({
      where: eligibleProblemsWhere({ unitIds }),
      select: { id: true },
      take: 1,
    });
    return hit.length > 0;
  });
}
