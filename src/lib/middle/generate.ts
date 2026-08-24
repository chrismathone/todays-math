/**
 * 중학 유형 엔진 진입점 — RPM 유형 색인을 뼈대로 유형별 생성기를 등록한다.
 *
 * 초등 엔진(`src/lib/elementary/`)과 같은 성질: AI 아님 · 씨앗이 같으면 결과가
 * 같음 · 정답은 생성기가 같은 숫자로 계산. 다른 점: 초등은 «소단원» 단위,
 * 중학은 **RPM 유형** 단위다 — 원장님이 「이 유형으로 몇 문항」을 고를 수 있게.
 *
 * 커버리지는 `registeredTypes()` 로 묻는다 — 873유형 중 등록된 것만 나온다.
 * 미등록 유형을 부르면 던진다 (조용히 다른 유형을 내지 않는다).
 */
import { createRng } from "../elementary/rng";

import { M1_CALC } from "./m1Calc";
import { M1EXTRA_TYPES } from "./m1Extra";
import { M1_EXPR } from "./m1Expr";
import { M1_LINEAR_APPLY } from "./m1LinearApply";
import { M1_NUM } from "./m1Num";
import { M1_PROP } from "./m1Prop";
import { M1_REAL } from "./m1Real";
import { M1_STAT_TYPES } from "./m1Stat";
import { M1_STAT_FIG } from "./m1StatFig";
import { M2_TYPES } from "./m2";
import { M3_TYPES } from "./m3";
import type { MidProblem, TypeEntry } from "./types";

// 세션별 소유 모듈을 여기서만 합친다 — 병렬 세션은 자기 모듈 파일만 만지므로
// 이 파일에서 병합 충돌이 나지 않는다 (한 줄짜리 spread 는 이미 다 있다).
const ALL: TypeEntry[] = [
  ...M1_LINEAR_APPLY,
  ...M1EXTRA_TYPES,
  ...M1_NUM,
  ...M1_PROP,
  ...M1_CALC,
  ...M1_EXPR,
  ...M1_REAL,
  ...M1_STAT_TYPES,
  ...M1_STAT_FIG,
  ...M2_TYPES,
  ...M3_TYPES,
];

const BY_KEY = new Map<string, TypeEntry>();
for (const e of ALL) {
  if (BY_KEY.has(e.key)) {
    throw new Error(`유형 키가 겹칩니다: ${e.key}`);
  }
  BY_KEY.set(e.key, e);
}

export function registeredTypes(): TypeEntry[] {
  return ALL;
}

export function typesForSection(unitSection: string): TypeEntry[] {
  return ALL.filter((e) => e.unitSection === unitSection);
}

/** 유형 키마다 rng 흐름을 가르는 소금 — 키 문자열에서 결정적으로 만든다. */
function keySalt(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) {
    h = (Math.imul(h, 31) + key.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

export function generateMiddleProblem(
  key: string,
  seed: number,
  variant = 0,
): MidProblem {
  const entry = BY_KEY.get(key);
  if (!entry) {
    throw new Error(
      `등록되지 않은 유형입니다: ${key} — registeredTypes() 로 먼저 확인`,
    );
  }
  return entry.handler(createRng(seed + keySalt(key) + variant * 0x9e37));
}

/**
 * 한 유형에서 n 문항 — 발문이 같은 것은 버리고 다시 뽑는다.
 * 변형 공간이 좁아 n 을 못 채우면 던진다 (조용히 모자란 세트를 내지 않는다).
 */
export function generateMiddleSet(
  key: string,
  seed: number,
  n: number,
): MidProblem[] {
  const out: MidProblem[] = [];
  const seen = new Set<string>();
  let variant = 0;
  while (out.length < n) {
    if (variant > n * 30) {
      throw new Error(
        `유형 ${key} 의 변형 공간이 좁아 ${n}문항을 못 채웠습니다 (${out.length}까지)`,
      );
    }
    const p = generateMiddleProblem(key, seed, variant);
    variant += 1;
    if (seen.has(p.content)) continue;
    seen.add(p.content);
    out.push(p);
  }
  return out;
}
