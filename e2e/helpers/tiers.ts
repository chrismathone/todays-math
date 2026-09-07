/**
 * E2E 시드가 쓰는 난이도 — **사다리를 옮겨 적지 않는다.**
 *
 * 2026-09-07: `seed.ts`·`bank.ts` 가 옛 3단(`easy`/`mid`/`hard`)을 손으로 나열하고 있었다.
 * D-106(4단)·D-113(6단)을 거치며 그 값들은 enum 에서 사라졌는데 여기만 남아, **시드가
 * 던져 어떤 spec 도 시작 전에 죽었다.** 초록도 빨강도 아니고 «안 돌았다»여서
 * 아무도 몰랐다.
 *
 * 그래서 사다리는 계약에서 가져오고, 여기서는 **몇 개씩** 만들지만 정한다.
 */
import { DIFFICULTY_LADDER } from "../../src/contracts/difficulty";

export { DIFFICULTY_LADDER };
export type Tier = (typeof DIFFICULTY_LADDER)[number];

/** 갈래별 개수 — 안 적은 갈래는 0이다. */
export type TierCounts = Partial<Record<Tier, number>>;

/** 반 기본 배분 — 합이 `defaultProblemCount`(8)와 같아야 출제가 통과한다. */
export const E2E_DIFFICULTY_RATIO: Record<Tier, number> = {
  연산: 1,
  기본: 3,
  응용: 3,
  심화하: 1,
  심화중: 0,
  심화상: 0,
};

/**
 * 일상 여정용 재고 — 8문항을 뽑고도 **교체할 여분**이 남아야 한다.
 * (여정 B 가 문 1 을 한 번 교체한다.)
 */
export const E2E_STOCK: TierCounts = {
  연산: 3,
  기본: 6,
  응용: 6,
  심화하: 3,
};

/** 「문제 부족」을 만드는 재고 — 가용 2 · 필요 8. */
export const E2E_SHORTFALL_STOCK: TierCounts = { 기본: 2 };

/** 합계 — 시드가 「몇 건 넣었는지」를 스스로 셀 때 쓴다. */
export function totalOf(counts: TierCounts): number {
  return DIFFICULTY_LADDER.reduce((sum, t) => sum + (counts[t] ?? 0), 0);
}
