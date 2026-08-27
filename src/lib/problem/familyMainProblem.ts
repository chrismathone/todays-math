/**
 * **문항류의 대표 문항(`-001`)을 찾는다** — 변형은 언제나 대표에서 한다.
 *
 * 원장님 지시 2026-08-27: 「변형된 문제는 재변형 불가능하게. 항상 001(문항류의 가장
 * 메인 문항)만 변형 가능하게.」 그리고 「002~ 에서 변형 누르면 001이 변형되는 걸로 배선.」
 *
 * ## 왜 대표에서만 변형하나
 *
 * 변형본을 또 변형하면 **원본에서 두 걸음 멀어진 것**이 생긴다. AI 는 매번 값을
 * 새로 짓는데, 그 값이 맞는지 대 볼 기준은 «바로 앞 것»이 아니라 **사람이 검수한
 * 원본**이어야 한다. 변형의 변형은 그 기준을 잃는다 — 틀린 값이 두 번 굴절되면
 * 원본과 비교해도 어디서 어긋났는지 못 짚는다.
 *
 * 그리고 실무적으로도 같은 문항류가 계속 옆으로 번진다. 「한 시험지에 한 문항류」
 * (D-105)로 출제는 막히지만 은행은 부푼다.
 *
 * ## 어떻게 찾나 — 코드가 아니라 **문항류**로 묶는다
 *
 * ⚠️ `problemCode` 의 `-001` 을 **문자열로 만들어 조회하면 안 된다.** 코드는 저장된
 *    값이지 파생이 아니다(D-53) — `A07-001` 이 지워졌거나 애초에 없을 수 있고,
 *    그러면 「없는 코드」를 찾다가 조용히 원본 없이 진행한다.
 *    대신 **같은 `(unitId, familyKey)` 안에서 가장 먼저 만들어진 행**을 고른다.
 *    그 행이 곧 그 류의 `-001` 이다(트리거가 `next_seq` 를 1부터 뗀다).
 *
 * ⚠️ **`solo:` 접두사를 «혼자»로 읽지 마라.** D-105 가 「키가 **없으면** 혼자」라고
 *    정한 것이지 「`solo:` 로 시작하면 혼자」가 아니다. 두 문항이 **같은 `solo:` 키**를
 *    들고 있으면 그 둘은 한 류다 — 실제로 그렇게 된다: 변형본은 원본의 키를 물려받고,
 *    원본이 AI 생성이면 그 키가 `solo:<uuid>` 다(2026-08-27 실측, `A07-001`~`A07-006`).
 *    처음엔 `solo:` 를 일찍 끊었는데, **변이 시험이 그 자리를 잡아냈다** — 그 판으로는
 *    `A07-003` 에서 변형해도 `A07-001` 로 안 옮겨진다. 원장님 지시가 안 지켜진다.
 *
 *    묶는 기준은 `familyIdOf`(generator/familyKey.ts)와 **같다**: 키 문자열이 같고
 *    단원이 같으면 한 류. 서로 다른 `solo:` 는 uuid 가 달라 저절로 갈린다.
 */

export type FamilyMainCandidate = {
  id: string;
  unitId: string;
  familyKey: string | null;
  createdAt: Date;
};

/**
 * 이 문항이 속한 류의 **대표**를 고른다.
 *
 * @param self 지금 문항
 * @param siblings 같은 `(unitId, familyKey)` 인 행들 — 호출부가 조회해서 넘긴다.
 *                 비었으면 `self` 가 대표다.
 */
export function pickFamilyMain<T extends FamilyMainCandidate>(
  self: T,
  siblings: readonly T[],
): T {
  const key = self.familyKey?.trim();
  // 키가 **없으면** 혼자다(D-105). `solo:` 접두사 자체는 혼자라는 뜻이 아니다 —
  // 같은 `solo:` 키를 든 형제가 실제로 있다(위 주석).
  if (!key) return self;

  const family = siblings.filter(
    (s) => s.unitId === self.unitId && s.familyKey?.trim() === key,
  );
  if (family.length === 0) return self;

  // 가장 먼저 만들어진 행이 `-001` 이다. 같은 시각이면 id 로 갈라 **결정적**으로 만든다
  // (안 그러면 같은 입력에 다른 답이 나와 재현이 안 된다).
  return [...family, self].reduce((best, row) => {
    const a = best.createdAt.getTime();
    const b = row.createdAt.getTime();
    if (b < a) return row;
    if (b > a) return best;
    return row.id < best.id ? row : best;
  });
}

/** 대표가 자기 자신이 아니면 «다른 문항으로 옮겨 변형한다»는 뜻이다. */
export function isRedirected(
  self: { id: string },
  main: { id: string },
): boolean {
  return self.id !== main.id;
}
