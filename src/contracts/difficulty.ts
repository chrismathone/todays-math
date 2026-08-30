/**
 * 난이도 축 — **zod 를 안 쓰는 최소 모듈** (D-106, 원장님 확정 2026-08-25).
 *
 *   연산 < 기본 < 응용 < 심화
 *
 * ## 왜 `common.contract.ts` 안이 아니라 여기인가
 *
 * 출제 설정 화면(`useGenerateSetup`)이 사다리와 기본 배분을 **런타임 값으로** 써야
 * 하는데, `common.contract` 를 정적으로 끌어오면 zod + 계약 모듈(279KB)이 초기
 * 번들에 실린다 — 성능 수리 C-1 이 일부러 없앤 것이다. 그렇다고 화면이 갈래를
 * 손으로 네 개 적으면 그 순간 목록이 두 벌이 되고, 한쪽만 고쳐도 아무도 모른다.
 * 그래서 **값만 있는 모듈**을 따로 둔다. `common.contract` 는 이것을 읽어 zod enum 을
 * 만들고 그대로 다시 내보낸다 — 쓰는 쪽은 어느 쪽에서 가져와도 같은 것을 본다.
 *
 * ## 이름이 곧 값이다
 *
 * 초등 엔진의 `ElemTier`(D-71/72)와 **같은 낱말**이라 매핑이 없다. 예전에는 축이
 * 둘이어서 적재기가 `연산`과 `기본`을 둘 다 `easy` 로 접었고, 접힌 뒤에는 화면에서
 * 「이건 연산인가 기본인가」를 되물을 방법이 없었다.
 */

/**
 * ⚠️ **순서를 바꾸지 마라 — 순서가 곧 사다리다.**
 * `shiftDifficulty`(한 단계 올리기/내리기) · `balanceDifficulty` 의 인접 대체 ·
 * DB enum 정렬이 전부 이 순서를 뜻으로 쓴다.
 */
export const DIFFICULTY_LADDER = [
  "연산",
  "기본",
  "응용",
  "심화하",
  "심화중",
  "심화상",
] as const;

export type Difficulty = (typeof DIFFICULTY_LADDER)[number];

/**
 * **모든 소단원이 반드시 갖는 갈래.** 여기를 못 채우면 그 소단원은 등록이 안 된다.
 *
 * 🔴 위 여섯 중 `심화중`·`심화상` 은 **아직 채우는 중**이다(D-113, 2026-08-30).
 *    둘을 필수로 두면 230개 소단원이 **전부 컴파일 오류**가 되어 축 확대와 내용
 *    채우기를 나눌 수 없다. 그래서 축은 먼저 세우고 내용은 학년별로 채운다.
 *    다 차면 이 배열을 `DIFFICULTY_LADDER` 와 같게 만들고 아래 상수를 지운다.
 */
export const CORE_DIFFICULTIES = ["연산", "기본", "응용", "심화하"] as const;

/** 지금 채우는 중인 갈래. 등록 안 된 소단원에서는 출제에 **안 뽑힌다**. */
export const EXTENDING_DIFFICULTIES = ["심화중", "심화상"] as const;

export type CoreDifficulty = (typeof CORE_DIFFICULTIES)[number];
export type ExtendingDifficulty = (typeof EXTENDING_DIFFICULTIES)[number];

/** 난이도 배분 — 갈래마다 몇 문항. `Class.difficultyRatio`(jsonb)와 출제 요청이 공유한다. */
export type DifficultyRatio = Record<Difficulty, number>;

/**
 * 반의 공장 기본 배분 — 8문항. 초등 엔진 **중위반 프리셋**(D-71: 15/40/30/15 %)을
 * 최대잉여로 나눈 값이다(1.2 / 3.2 / 2.4 / 1.2 → 1 / 3 / 3 / 1).
 *
 * ⚠️ 마이그레이션 `20260825120000_difficulty_four_tier` 가 **같은 값**을 DB 의 기존
 *    63개 반에 넣었다. 한쪽만 고치면 새 반과 옛 반이 다른 기본값을 갖는다 —
 *    `src/__tests__/unit/contracts.smoke.test.ts` 가 둘을 대조한다.
 */
/**
 * ⚠️ **새 갈래 둘은 0 이다 — 지금은 그게 맞다.** 콘텐츠가 아직 없는데 비율을 주면
 *    출제가 그 자리를 못 채워 **시험지가 조용히 얇아진다.** 채워지는 대로 원장님이
 *    프리셋을 정하시면 그때 옮긴다(D-71: 숫자는 원장님이 언제든 조정).
 */
export const DEFAULT_DIFFICULTY_RATIO: DifficultyRatio = {
  연산: 1,
  기본: 3,
  응용: 3,
  심화하: 1,
  심화중: 0,
  심화상: 0,
};

/**
 * 배분의 합을 문항 수에 맞춘다 — **최대잉여법**. 비율은 그대로 두고 합만 맞춘다.
 *
 * ⚠️ **여기가 유일한 구현이다.** 예전에는 출제 설정 화면과 측정 스크립트 셋이 각자
 *    `Math.round` 로 적어 두었고, 갈래가 셋에서 넷이 되자 네 자리를 다 고쳐야 했다.
 *    한 자리만 빠뜨리면 합이 문항 수와 어긋나 시험지가 조용히 얇아진다
 *    (2026-08-18 「규칙이 옳아도 배선이 한쪽만 되면 그쪽 지표만 좋아진다」와 같은 자리).
 */
export function fitDifficultyRatio(
  ratio: DifficultyRatio,
  count: number,
): DifficultyRatio {
  const result = Object.fromEntries(
    DIFFICULTY_LADDER.map((tier) => [tier, 0]),
  ) as DifficultyRatio;
  const total = DIFFICULTY_LADDER.reduce((sum, tier) => sum + ratio[tier], 0);
  if (total <= 0 || count <= 0) {
    // 배분이 통째로 0이면 「기본」에 몰아준다 — 가운데가 아니라 **밑에서 둘째**다.
    // 근거가 없을 때 어려운 쪽으로 기울면 학생이 못 푸는 쪽으로 실패한다.
    if (count > 0) result.기본 = count;
    return result;
  }

  const scaled = DIFFICULTY_LADDER.map((tier) => ({
    tier,
    exact: (ratio[tier] * count) / total,
  }));
  for (const { tier, exact } of scaled) result[tier] = Math.floor(exact);
  let remaining =
    count - DIFFICULTY_LADDER.reduce((sum, tier) => sum + result[tier], 0);
  for (const { tier } of [...scaled].sort(
    (a, b) => (b.exact % 1) - (a.exact % 1),
  )) {
    if (remaining <= 0) break;
    result[tier] += 1;
    remaining -= 1;
  }
  return result;
}

/** 반 기본 배분(1·3·3·1)을 그대로 늘려 `count` 문항에 맞춘 배분. 측정 스크립트가 쓴다. */
export function defaultRatioFor(count: number): DifficultyRatio {
  return fitDifficultyRatio(DEFAULT_DIFFICULTY_RATIO, count);
}

/**
 * 폼에서 온 문자열을 난이도로 읽는다. 모르는 값이면 `fallback`.
 *
 * ⚠️ 예전에는 화면마다 `x === "hard" ? "hard" : x === "mid" ? "mid" : "easy"` 같은
 *    삼항 사다리를 손으로 적어 두었다. 갈래가 넷이 되면 그 사다리는 **새 값을 조용히
 *    맨 아래로 떨어뜨린다** — 「연산」을 골라도 「기본」이 저장된다. 에러가 안 난다.
 */
export function asDifficulty(
  value: unknown,
  fallback: Difficulty = "기본",
): Difficulty {
  return (DIFFICULTY_LADDER as readonly unknown[]).includes(value)
    ? (value as Difficulty)
    : fallback;
}
