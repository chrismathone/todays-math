/**
 * 등록된 판정형 — 여기에 넣는 순간 적재기 · 미적재 검사 · 제자리 갱신이 그것을 센다(`registry.ts` 머리말).
 *
 * 🔴 **등록 = 적재까지가 완료 조건.** 넣고 적재를 안 하면 pre-push 의 `checkUnloadedTypes` 가 main 푸시를
 *    막는다(«늘어나면» 빨강). 그래서 이 파일을 바꾼 가지는 적재(리드)가 끝나기 전에는 main 에 밀지 않는다.
 *
 * | 단계 | 판정형 | 날짜 |
 * |---|---|---|
 * | 1 | ① 중1 유리수의 덧셈과 뺄셈 — 계산 판정 셋(`addSub.ts`) | 2026-10-08 |
 */
import { ADD_SUB_JUDGES } from "./addSub";
import type { JudgeDefinition } from "./contract";

export const JUDGE_DEFINITIONS: readonly JudgeDefinition[] = [
  ...ADD_SUB_JUDGES,
];
