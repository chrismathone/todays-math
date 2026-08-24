/**
 * 문제 풀 조회 조건 (D-31 → D-78).
 *
 * **문항에는 소유자가 없다** (원장님 확정 2026-08-24: 「소유자 필요없고 전체 공유」).
 * 예전에는 `pool = 'shared'` 이거나 **본인 소유**면 보였는데, 확정 시점에 문항 47,014개가
 * 이미 전부 `shared` 라 그 «본인 소유» 갈래는 아무것도 더 보여 주지 않고 있었다.
 * 그래서 갈래를 지우고 조건을 하나로 만든다 — 읽는 사람이 «내 것만 보이나?» 를
 * 다시 묻지 않아도 되게.
 *
 * ⚠️ 소유자가 없어졌으므로 `private` 는 이제 «누구의 것도 아닌, 풀에서 빠진 것» 이다.
 *    「나만 보인다」가 아니다 — **아무에게도 안 보인다.** 그런 문항을 만들 생각이면
 *    `directUseAllowed` 로 잠그는 쪽이 뜻이 분명하다(그림 유실 잠금이 그 방식이다).
 */
export const DEFAULT_PROBLEM_POOL = "shared" as const;

/** 출제·은행이 보는 문항의 조건. 소유자를 묻지 않는다. */
export function problemVisibleWhere() {
  return { pool: DEFAULT_PROBLEM_POOL };
}

export function isProblemAccessible(problem: { pool: string }): boolean {
  return problem.pool === DEFAULT_PROBLEM_POOL;
}
