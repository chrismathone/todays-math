/**
 * 반 진도가 없을 때 **어디서부터 보여 줄지** 제안한다 (원장님 지적 2026-08-25).
 *
 * 원장님: *「차시이동이 작동하지 않음.」* — MS2A 는 반 진도가 없어(학생 10명이 단원
 * 4개로 갈린다) 차시이동 화살표의 **시작점이 없다**. `adjacentUnitIds` 는 현재
 * 단원이 null 이면 앞·뒤를 둘 다 null 로 돌려주므로 화살표가 둘 다 죽는다.
 *
 * 그렇다고 학년 첫 단원에서 시작하면 원하는 자리까지 화살표를 백 번 눌러야 한다.
 * 그래서 **그 반 학생들이 실제로 서 있는 자리**를 제안한다.
 *
 * 🔴 **제안은 진도가 아니다.** 아무것도 저장하지 않는다 — 원장님이 「이 차시로 진도
 *    기록」을 눌러야 그때 반 진도가 된다. 이 구분을 흐리면(제안을 진도처럼 저장하면)
 *    `deriveClassProgress` 가 일부러 안 만든 것을 옆문으로 만드는 셈이 된다.
 */

export interface LatestRow {
  studentId: string | null;
  unitId: string;
}

export interface UnitOrder {
  id: string;
  orderIndex: number;
}

export interface Suggestion {
  unitId: string | null;
  /** 몇 명이 그 자리에 있나 / 전체 몇 명인가 — 화면이 근거를 같이 보여 줄 수 있게. */
  agree: number;
  students: number;
}

/**
 * 학생별 **최신** 진도에서 가장 많은 단원을 고른다.
 *
 * 같은 수면 **더 뒤처진 쪽**(orderIndex 가 작은 쪽)을 고른다 — 앞선 자리를 제안하면
 * 원장님이 그대로 기록했을 때 뒤처진 학생이 못 푸는 시험지가 된다. 되돌리기 쉬운
 * 쪽으로 기운다.
 *
 * `rows` 는 **최신순으로 정렬돼 있어야 한다**(recordedAt desc, createdAt desc) —
 * 학생마다 처음 만나는 행을 그 학생의 최신으로 본다. `/api/progress` 의 정렬과 같다.
 */
export function suggestStartUnit(
  rows: readonly LatestRow[],
  units: readonly UnitOrder[],
): Suggestion {
  const latest = new Map<string, string>();
  for (const row of rows) {
    if (row.studentId === null) continue;
    if (!latest.has(row.studentId)) latest.set(row.studentId, row.unitId);
  }
  if (latest.size === 0) return { unitId: null, agree: 0, students: 0 };

  const count = new Map<string, number>();
  for (const unitId of latest.values())
    count.set(unitId, (count.get(unitId) ?? 0) + 1);

  const orderOf = new Map(units.map((u) => [u.id, u.orderIndex] as const));
  let best: string | null = null;
  for (const [unitId, n] of count) {
    if (best === null) {
      best = unitId;
      continue;
    }
    const bestN = count.get(best)!;
    if (n > bestN) {
      best = unitId;
      continue;
    }
    if (n === bestN) {
      // 순서를 모르는 단원은 뒤로 민다 — 모르는 것을 «앞선다»고 단정하지 않는다.
      const a = orderOf.get(unitId) ?? Number.POSITIVE_INFINITY;
      const b = orderOf.get(best) ?? Number.POSITIVE_INFINITY;
      if (a < b) best = unitId;
    }
  }
  return {
    unitId: best,
    agree: best === null ? 0 : (count.get(best) ?? 0),
    students: latest.size,
  };
}
