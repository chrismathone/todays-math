import type { UnitSeed } from "../../../prisma/seed-data/units";

import type { ElemProblem } from "./types";
import { attachMathWords, mathJosa } from "./format";

export function make(
  unit: UnitSeed,
  content: string,
  answer: string,
  solution: string,
  figureSpec: Record<string, unknown> | null = null,
): ElemProblem {
  return {
    grade: unit.grade,
    chapter: unit.chapter,
    section: unit.section,
    orderIndex: unit.orderIndex,
    content: mathJosa(attachMathWords(content)),
    answer,
    solution: mathJosa(attachMathWords(solution)),
    figureSpec,
  };
}

export function fig(
  kind: string,
  rest: Record<string, unknown>,
): Record<string, unknown> {
  return { version: "elem-1", kind, ...rest };
}

/**
 * **계산이 든 걸음**을 가려내는 자 — 「$…$ 안에 연산자와 등호가 같이 있다」.
 *
 * ⚠️ `$` **밖**의 등호는 안 센다. 「(비율)=(비교하는 양)÷(기준량)입니다」 같은 **공식 문장**은
 *    계산이 아니라 규칙을 옮겨 적은 것이라, 이것을 세면 한 걸음짜리가 공식 한 줄을 얹어
 *    두 걸음처럼 보인다. 실제로 고치기 전 `rateDeep` 이 정확히 그 모양이었다.
 */
const 계산걸음 = /\$[^$]*\d[^$]*(?:\\div|\\times|\\frac|[+\-])[^$]*=[^$]*\$/;

/**
 * 글 한 덩이에 **계산이 든 자리**가 몇 곳인가. `makeDeep` 의 잣대를 밖에서도 쓴다 —
 * `scripts/qa/census-elem-deep-steps.ts` 가 이것으로 전 갈래를 훑는다.
 * 두 벌을 두면 한쪽만 고쳐도 아무도 모른다.
 */
export function countCalcSteps(text: string): number {
  return (text.match(new RegExp(계산걸음.source, "g")) ?? []).length;
}

/**
 * **4단(심화) 뼈대 — D-72.** 4단은 «되짚기 또는 조건 겹침» **그리고** «적어도 두 걸음»이다.
 * 한쪽만으로는 3단이다.
 *
 * 2026-08-25 에 초등 심화 230갈래를 네 갈래씩 나란히 놓고 보니 **35갈래**가 한쪽만 갖고
 * 있었다(`docs/planning/tracks/reports/tier4-ladder.md` §3.3). 대개는 되짚기는 맞는데
 * **한 번**이라 같은 소단원의 응용(두 걸음)보다 쉬웠다 — 사다리가 뒤집힌 것이다.
 *
 * 그래서 심화는 해설을 **「걸음」으로 쪼개어** 만든다. 계산이 든 걸음이 **둘 미만이면
 * 만들 때 죽는다** — 한 걸음짜리 심화가 지면까지 갈 수 없다.
 *
 * ⚠️ **이 가드가 못 막는 것**(천장이 아니라 바닥이다):
 *    ㉠ 한 걸음을 두 문장으로 쪼개면 통과한다. 자가 세는 것은 「계산을 두 번 **적었나**」이지
 *       「생각이 두 번 **필요한가**」가 아니다.
 *    ㉡ 두 걸음이어도 같은 소단원 응용보다 쉬울 수 있다(§3.3 ㉢ 부류가 그랬다).
 *    둘 다 **사람이 네 갈래를 나란히 봐야** 보인다(`scripts/qa/dump-elem-tiers.ts`).
 *    그 판정은 `scripts/qa/reports/tier4-review.json` 에 남고, 판정도 표지도 없는 갈래는
 *    `probe-elem-tier-4dan.ts` 가 **미검토**로 관문을 빨갛게 만든다.
 */
export function makeDeep(
  unit: UnitSeed,
  content: string,
  answer: string,
  걸음: readonly string[],
  figureSpec: Record<string, unknown> | null = null,
): ElemProblem {
  // **둘을 같이 요구한다.**
  //   ⑴ 걸음이 둘 이상 — 되짚기·조건 정리처럼 **셈이 없는 걸음**도 걸음이다
  //      (「약수 중 가장 큰 수가 어떤 수 자신이다」가 그렇다. 이걸 안 세면
  //       멀쩡한 두 걸음짜리가 막힌다 — 실제로 초5 1-2-1 에서 그렇게 걸렸다).
  //   ⑵ 계산식이 둘 이상 — 한 걸음에 몰려 있어도 좋다. 셈을 두 번 **적었는가**를 본다.
  const 셈 = countCalcSteps(걸음.join(" "));
  if (걸음.length < 2 || 셈 < 2) {
    throw new Error(
      `심화는 걸음이 둘 이상이고 계산식도 둘 이상이어야 한다 (D-72 4단) — ` +
        `${unit.grade} ${unit.section}: 걸음 ${걸음.length}개 · 계산식 ${셈}개\n` +
        걸음.map((s, i) => `  ${i + 1}. ${s}`).join("\n"),
    );
  }
  return make(unit, content, answer, 걸음.join(" "), figureSpec);
}
