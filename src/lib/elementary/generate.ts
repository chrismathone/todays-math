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
import { assertChooseAllAnswerCount } from "../problem/chooseAllRule";
import {
  assertChoiceCount,
  assertChoiceMarks,
} from "../problem/choiceCountRule";
import { wrapDanClause } from "../problemText";

export {
  elementaryComboDefinitions,
  generateElementaryComboProblem,
  supportedCombos,
  validateElementaryComboDefinition,
} from "./combo";
export type { ElemComboDefinition } from "./combo";
export {
  coreForms,
  elemProblemType,
  expectedFormCount,
  generateElementaryForm,
  listedForms,
  PILOT_FORM_KEYS,
  pilotFamilyKey,
} from "./forms";
export type { ElemForm } from "./forms";

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

/**
 * 이 소단원이 **실제로 낼 수 있는** 난이도 갈래.
 *
 * 핵심 넷(`연산·기본·응용·심화하`)은 등록되면 반드시 있다 — 타입이 강제한다.
 * 🔴 `심화중`·`심화상` 은 채우는 중이라 **소단원마다 있을 수도 없을 수도 있다**
 *    (D-113). 그래서 「등록됐으면 여섯 전부」로 답하면 안 된다 — 출제가 없는 갈래를
 *    뽑으려다 던지거나, 더 나쁘게는 **「심화중을 냈다」는 시험지가 거짓말**이 된다.
 *    등록된 것만 세어서 돌려준다.
 */
export function supportedTiers(unit: UnitSeed): readonly ElemTier[] {
  const variants = TIERS[tierKey(unit)];
  if (!variants) return [];
  return ELEM_TIERS.filter((tier) => variants[tier] !== undefined);
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
    // 🔴 **그 갈래가 실제로 등록됐는지 따로 묻는다** (D-113). 소단원이 등록됐다는
    //    것과 `심화중`·`심화상` 이 채워졌다는 것은 다른 말이다. 여기를 안 막으면
    //    `variants[tier]` 가 `undefined` 라 「is not a function」으로 죽는데, 그
    //    메시지로는 **무엇이 없는지**를 알 수 없다.
    const make = variants[tier];
    if (!make) {
      throw new Error(
        `아직 채우지 않은 갈래입니다: ${unit.grade} ${unit.section} — «${tier}» (supportedTiers 로 먼저 확인)`,
      );
    }
    return tidy(
      make(unit, createRng(seed + unit.orderIndex * 17 + TIER_SALT[tier])),
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
  // 「모두 고르시오」의 정답은 정확히 2개 (원장님 2026-08-25). 초등 엔진은 오늘
  // 그 부류를 **한 건도 내지 않지만**(실측: `census-choose-all.ts --elem` 0건),
  // 관문을 여기 걸어 두어야 나중에 생기는 유형이 조용히 규칙 밖으로 못 나간다.
  // 「가장 큰 것을 고르시오」류는 「모두」가 없어 대상이 아니다.
  assertChooseAllAnswerCount(content, p.answer, `초등 ${p.grade} ${p.section}`);
  assertChoiceCount(content, `초등 ${p.grade} ${p.section}`);
  assertChoiceMarks(content, `초등 ${p.grade} ${p.section}`);
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
