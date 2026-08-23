/**
 * 병렬 세션 소유 모듈 — 이 파일과 여기서 import 하는 파일은 **한 세션만** 만진다
 * (docs/planning/tracks/middle-engine-parallel-20260823.md 의 파일 소유권 규칙).
 */
import { M2_FUNC } from "./m2Func";
import { M2_INEQ_APPLY } from "./m2IneqApply";
import { M2_SYSTEM_APPLY } from "./m2SystemApply";
import type { TypeEntry } from "./types";

export const M2_TYPES: TypeEntry[] = [
  ...M2_INEQ_APPLY,
  ...M2_SYSTEM_APPLY,
  ...M2_FUNC,
];
