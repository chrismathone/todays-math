/**
 * 등록된 판정형 — 여기에 넣는 순간 적재기 · 미적재 검사 · 제자리 갱신이 그것을 센다(`registry.ts` 머리말).
 *
 * 🔴 **등록 = 적재까지가 완료 조건.** 넣고 적재를 안 하면 pre-push 의 `checkUnloadedTypes` 가 main 푸시를
 *    막는다(«늘어나면» 빨강). 0단계(배선)에서는 비어 있다.
 */
import type { JudgeDefinition } from "./contract";

export const JUDGE_DEFINITIONS: readonly JudgeDefinition[] = [];
