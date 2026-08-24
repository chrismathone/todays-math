/**
 * 병렬 세션 소유 모듈 — 이 파일과 여기서 import 하는 파일은 **한 세션만** 만진다
 * (docs/planning/tracks/middle-engine-parallel-20260823.md 의 파일 소유권 규칙).
 *
 * 이 파일만은 예외로 여러 세션이 자기 줄 하나씩을 더한다 — 병합 때 충돌하면
 * **어느 쪽도 지우지 말고 전부 남긴다**(2026-08-23 물결 2 실제 충돌 3회).
 */
import { M2_CENTER } from "./m2Center";
import { M2_COUNTING } from "./m2Counting";
import { M2_FUNC } from "./m2Func";
import { M2_GEO_QUAD } from "./m2GeoQuad";
import { M2_GEO_SIM } from "./m2GeoSim";
import { M2_GEO_TRI } from "./m2GeoTri";
import { M2_INEQ_APPLY } from "./m2IneqApply";
import { M2_LINE } from "./m2Line";
import { M2_MONO } from "./m2Mono";
import { M2_PROB } from "./m2Prob";
import { M2_QUAD } from "./m2Quad";
import { M2_RATIONAL } from "./m2Rational";
import { M2_REAL } from "./m2Real";
import { M2_SYSTEM } from "./m2System";
import { M2_SYSTEM_APPLY } from "./m2SystemApply";
import type { TypeEntry } from "./types";

export const M2_TYPES: TypeEntry[] = [
  ...M2_INEQ_APPLY,
  ...M2_SYSTEM,
  ...M2_SYSTEM_APPLY,
  ...M2_RATIONAL,
  ...M2_COUNTING,
  ...M2_PROB,
  ...M2_FUNC,
  ...M2_LINE,
  ...M2_GEO_TRI,
  ...M2_GEO_SIM,
  ...M2_GEO_QUAD,
  ...M2_QUAD,
  ...M2_REAL,
  ...M2_MONO,
  ...M2_CENTER,
];
