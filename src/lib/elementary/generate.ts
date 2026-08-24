import {
  CURRICULUM_UNITS,
  type UnitSeed,
} from "../../../prisma/seed-data/units";

import {
  ELEM_TIERS,
  TIER_SALT,
  tierKey,
  type ElemTier,
  type ElemTierMap,
} from "./difficulty";
import { G3, G3_TIERS } from "./g3";
import { G4, G4_TIERS } from "./g4";
import { G5, G5_TIERS } from "./g5";
import { G6, G6_TIERS } from "./g6";
import { createRng } from "./rng";
import { ELEM_GRADES, type ElemProblem } from "./types";
import { wrapDanClause } from "../problemText";

export {
  elementaryComboDefinitions,
  generateElementaryComboProblem,
  supportedCombos,
  validateElementaryComboDefinition,
} from "./combo";
export type { ElemComboDefinition } from "./combo";

const HANDLERS = { ...G3, ...G4, ...G5, ...G6 };

// 난이도 갈래 (D-71 축 · D-72 확대). 파일럿 g3·g5 에 이어 g6 은 `1-1` 부터,
// g4 는 **셋째 파일럿**(1-5-3, 자료형 변주 검증용)으로 얹었다.
const TIERS: ElemTierMap = {
  ...G3_TIERS,
  ...G4_TIERS,
  ...G5_TIERS,
  ...G6_TIERS,
};

export function elementaryUnits(): UnitSeed[] {
  return CURRICULUM_UNITS.filter((unit) =>
    (ELEM_GRADES as readonly string[]).includes(unit.grade),
  );
}

export function elementaryChapters(): { grade: string; chapter: string }[] {
  const seen = new Set<string>();
  const out: { grade: string; chapter: string }[] = [];
  for (const unit of elementaryUnits()) {
    const key = `${unit.grade}|${unit.chapter}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ grade: unit.grade, chapter: unit.chapter });
  }
  return out;
}

/** 이 소단원이 낼 수 있는 난이도 갈래. 등록은 넷 전부이거나 없거나 — 타입이 강제한다. */
export function supportedTiers(unit: UnitSeed): readonly ElemTier[] {
  return TIERS[tierKey(unit)] ? ELEM_TIERS : [];
}

export function generateElementaryProblem(
  unit: UnitSeed,
  seed = 20260821,
  tier?: ElemTier,
): ElemProblem {
  const key = `${unit.grade}|${unit.chapter}`;
  const handler = HANDLERS[key];
  if (!handler) {
    throw new Error(`초등 생성기가 없습니다: ${key}`);
  }
  if (tier !== undefined) {
    // 미등록 소단원에 갈래를 물으면 던진다 — 조용히 기본 문항을 돌려주면
    // 「심화를 냈다」는 시험지가 거짓말이 된다. 부르기 전에 supportedTiers 로 물을 것.
    const variants = TIERS[tierKey(unit)];
    if (!variants) {
      throw new Error(
        `난이도 갈래가 없는 소단원입니다: ${unit.grade} ${unit.section} — «${tier}» (supportedTiers 로 먼저 확인)`,
      );
    }
    return tidy(
      variants[tier](
        unit,
        createRng(seed + unit.orderIndex * 17 + TIER_SALT[tier]),
      ),
    );
  }
  // tier 를 안 주면 예전 그대로다 — 기존 관문(230 소단원 × 씨앗 1,260)이 이 경로를 지킨다.
  return tidy(handler(unit, createRng(seed + unit.orderIndex * 17)));
}

/**
 * 발문 다듬기를 **나가는 자리 한 곳**에서 건다 — 갈래 handler 가 920개라
 * 각자 고치면 반드시 몇 개를 빠뜨린다(이 저장소가 「손 목록은 샌다」로 여러 번 데인 자리).
 * 규칙 자체는 `src/lib/problemText.ts` 에 있고 중등 엔진도 같은 것을 부른다.
 */
function tidy(p: ElemProblem): ElemProblem {
  const content = wrapDanClause(p.content);
  return content === p.content ? p : { ...p, content };
}

export function generateElementaryChapter(
  grade: string,
  chapter: string,
  seed = 20260821,
): ElemProblem[] {
  return elementaryUnits()
    .filter((unit) => unit.grade === grade && unit.chapter === chapter)
    .map((unit) => generateElementaryProblem(unit, seed));
}

export function handlerKeys(): string[] {
  return Object.keys(HANDLERS);
}
