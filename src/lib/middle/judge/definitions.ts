/**
 * 등록된 판정형 — 여기에 넣는 순간 적재기 · 미적재 검사 · 제자리 갱신이 그것을 센다(`registry.ts` 머리말).
 *
 * 🔴 **등록 = 적재까지가 완료 조건.** 넣고 적재를 안 하면 pre-push 의 `checkUnloadedTypes` 가 main 푸시를
 *    막는다(«늘어나면» 빨강). 그래서 이 파일을 바꾼 가지는 적재(리드)가 끝나기 전에는 main 에 밀지 않는다.
 *
 * | 단계 | 판정형 | 날짜 |
 * |---|---|---|
 * | 1 | ① 중1 유리수의 덧셈과 뺄셈 — 계산 판정 셋(`addSub.ts`) | 2026-10-08 |
 * | 2 | ① 중1 유리수의 곱셈 · 나눗셈 — 계산 판정 셋(`mulDiv.ts` — 곱셈 · 나눗셈 · 혼합) | 2026-10-08 |
 * | 2 | ① 중1 문자의 사용과 식의 값 — 식의 값 판정 하나(`valueJudge.ts`) | 2026-10-08 |
 * | 2 | 비교형 여덟(`compare.ts`) — «나머지 넷과 다른 하나» 넷 · «가장 큰/작은 것» 넷 | 2026-10-08 |
 *
 * 🔴 차례를 바꾸지 않는다 — 앞의 것부터 실렸다. 새 등록은 **끝에** 붙인다.
 *
 * ## 보류 — 만들었지만 등록하지 않은 것
 *
 * `HELD_JUDGE_DEFINITIONS` 는 생성기 · 시험이 다 있는데 **지면 때문에** 등록부에 안 올린 문항류다. 등록부에
 * 없으므로 적재 대상이 아니고 미적재 빚도 아니다. «안 나가는 유형»이 조용히 생기지 않게 여기 한 곳에 적고
 * 시험(`judgeStep2.test.ts`)이 목록을 못 박는다 — 풀 때는 까닭(`paperExempt`)을 떼고 위 목록의 **끝**으로 옮긴다.
 *
 * | 보류 | 까닭 | 푸는 조건 |
 * |---|---|---|
 * | `calc-pow` 거듭제곱이 든 곱셈의 계산 판정(`mulDiv.ts`) | 제품의 자동 보기 배치가 2열로 보내 식이 접힌다 | 인쇄 쪽 폭 계산이 고쳐진 뒤 |
 */
import { ADD_SUB_JUDGES } from "./addSub";
import { COMPARE_JUDGES } from "./compare";
import type { AnyJudgeDefinition } from "./contract";
import { HELD_CALC_POW, MUL_DIV_JUDGES } from "./mulDiv";
import { VALUE_JUDGES } from "./valueJudge";

export const JUDGE_DEFINITIONS: readonly AnyJudgeDefinition[] = [
  ...ADD_SUB_JUDGES,
  ...MUL_DIV_JUDGES,
  ...VALUE_JUDGES,
  ...COMPARE_JUDGES,
];

/** 보류한 판정형 — 등록부에 올리지 않는다(머리말). 시험은 이것으로 따로 등록부를 지어 생성기를 잰다. */
export const HELD_JUDGE_DEFINITIONS: readonly AnyJudgeDefinition[] = [
  HELD_CALC_POW,
];
