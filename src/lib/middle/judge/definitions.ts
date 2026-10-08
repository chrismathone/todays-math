/**
 * 등록된 판정형 — 여기에 넣는 순간 적재기 · 미적재 검사 · 제자리 갱신이 그것을 센다(`registry.ts` 머리말).
 *
 * 🔴 **등록 = 적재까지가 완료 조건.** 넣고 적재를 안 하면 pre-push 의 `checkUnloadedTypes` 가 main 푸시를
 *    막는다(«늘어나면» 빨강). 그래서 이 파일을 바꾼 가지는 적재(리드)가 끝나기 전에는 main 에 밀지 않는다.
 *
 * | 단계 | 판정형 | 날짜 |
 * |---|---|---|
 * | 1 | ① 중1 유리수의 덧셈과 뺄셈 — 계산 판정 셋(`addSub.ts`) | 2026-10-08 |
 * | 2 | ① 중1 유리수의 곱셈 · 나눗셈 — 계산 판정 넷(`mulDiv.ts` — 곱셈 · 거듭제곱 · 나눗셈 · 혼합) | 2026-10-08 |
 * | 2 | ① 중1 문자의 사용과 식의 값 — 식의 값 판정 하나(`valueJudge.ts`) | 2026-10-08 |
 * | 2 | 비교형 여덟(`compare.ts`) — «나머지 넷과 다른 하나» 넷 · «가장 큰/작은 것» 넷 | 2026-10-08 |
 *
 * 🔴 차례를 바꾸지 않는다 — 앞의 것부터 실렸다. 새 등록은 **끝에** 붙인다.
 */
import { ADD_SUB_JUDGES } from "./addSub";
import { COMPARE_JUDGES } from "./compare";
import type { AnyJudgeDefinition } from "./contract";
import { MUL_DIV_JUDGES } from "./mulDiv";
import { VALUE_JUDGES } from "./valueJudge";

export const JUDGE_DEFINITIONS: readonly AnyJudgeDefinition[] = [
  ...ADD_SUB_JUDGES,
  ...MUL_DIV_JUDGES,
  ...VALUE_JUDGES,
  ...COMPARE_JUDGES,
];
