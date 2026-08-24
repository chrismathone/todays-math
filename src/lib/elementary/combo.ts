/**
 * 초등 결합형 문항 등록부.
 *
 * 이것은 임의의 소단원 둘을 붙이는 조합기가 아니다. 개별 재료가 모두 선행이어도
 * 그 결합 결과가 다음 학년의 정식 개념일 수 있다(원기둥의 겉넓이 반례). 따라서
 * 원장님이 문형과 교육과정 경계를 승인한 조합만 이 등록부에 들어온다.
 */
import {
  CURRICULUM_UNITS,
  type UnitSeed,
} from "../../../prisma/seed-data/units";

import { tierKey } from "./difficulty";
import { expr, josa, unitNum } from "./format";
import { make } from "./make";
import { gcd } from "./math";
import { createRng, intBetween, pick } from "./rng";
import type { ElemComboProblem, ElemProblem, Rng } from "./types";

type ComboFamily = {
  id: string;
  generate: (anchor: UnitSeed, rng: Rng) => ElemProblem;
};

type InternalComboDefinition = {
  id: string;
  anchorKey: string;
  prerequisiteKeys: readonly [string, ...string[]];
  /** 승인 때 확인한 교과서/units.ts 근거. orderIndex만으로는 의미 경계를 못 지킨다. */
  curriculumBasis: string;
  /** units.ts 전 학년에서 같은 결합 이름이 더 뒤에 정식 단원으로 있는지 본 기록. */
  laterConceptReview: string;
  salt: number;
  families: readonly [ComboFamily, ComboFamily, ...ComboFamily[]];
};

export type ElemComboDefinition = {
  id: string;
  anchorKey: string;
  prerequisiteKeys: readonly [string, ...string[]];
  curriculumBasis: string;
  laterConceptReview: string;
  familyIds: readonly [string, string, ...string[]];
};

const AREA_FRACTION_ID = "초5|2-2-3::초5|1-6-2";

function properNumerator(rng: Rng, denominator: number): number {
  const candidates: number[] = [];
  for (let numerator = 1; numerator < denominator; numerator += 1) {
    if (gcd(numerator, denominator) === 1) candidates.push(numerator);
  }
  return pick(rng, candidates);
}

function fraction(numerator: number, denominator: number): string {
  return expr(`\\frac{${numerator}}{${denominator}}`);
}

function squareMetres(value: number): string {
  return `$${value}\\,\\mathrm{m}^2$`;
}

function rectangleDimensions(
  rng: Rng,
  firstDenominator: number,
  secondDenominator: number,
): readonly [number, number] {
  let width = firstDenominator * intBetween(rng, 3, 6);
  const height = secondDenominator * intBetween(rng, 2, 5);
  if (width === height) width += firstDenominator;
  return [width, height];
}

const NESTED_THEMES = [
  { place: "밭", first: "채소", second: "토마토" },
  { place: "텃밭", first: "감자", second: "고구마" },
  { place: "화단", first: "상추", second: "배추" },
] as const;

/** 한 부분 안의 다시 한 부분 — `전체 → 첫 부분 → 둘째 부분`. */
function nestedAreaFraction(anchor: UnitSeed, rng: Rng): ElemProblem {
  const firstDenominator = pick(rng, [3, 4, 5] as const);
  const secondDenominator = pick(rng, [2, 3, 4, 5] as const);
  const firstNumerator = properNumerator(rng, firstDenominator);
  const secondNumerator = properNumerator(rng, secondDenominator);
  const [width, height] = rectangleDimensions(
    rng,
    firstDenominator,
    secondDenominator,
  );
  const theme = pick(rng, NESTED_THEMES);
  const area = width * height;
  const firstArea = (area * firstNumerator) / firstDenominator;
  const answer = (firstArea * secondNumerator) / secondDenominator;

  return make(
    anchor,
    `가로가 ${unitNum(width, "m")}, 세로가 ${unitNum(height, "m")}인 직사각형 모양의 ${theme.place}${josa(theme.place, "이", "가")} 있습니다. 전체 넓이의 ${fraction(firstNumerator, firstDenominator)}만큼에 ${theme.first}${josa(theme.first, "을", "를")} 심었고, 그 넓이의 ${fraction(secondNumerator, secondDenominator)}만큼에 ${theme.second}${josa(theme.second, "을", "를")} 심었습니다. ${theme.second}${josa(theme.second, "을", "를")} 심은 넓이는 몇 ${expr("\\mathrm{m}^2")}입니까?`,
    squareMetres(answer),
    `먼저 ${theme.place}의 넓이는 ${expr(`${width}\\times${height}=${area}`)}이므로 ${squareMetres(area)}입니다. ${theme.first}${josa(theme.first, "을", "를")} 심은 넓이는 ${expr(`${area}\\times\\frac{${firstNumerator}}{${firstDenominator}}=${firstArea}`)}이므로 ${squareMetres(firstArea)}입니다. 따라서 ${theme.second}${josa(theme.second, "을", "를")} 심은 넓이는 ${expr(`${firstArea}\\times\\frac{${secondNumerator}}{${secondDenominator}}=${answer}`)}이므로 ${squareMetres(answer)}입니다.`,
  );
}

const REMAINDER_THEMES = [
  { material: "천", first: "깃발", second: "띠" },
  { material: "방수 천", first: "가방", second: "덮개" },
  { material: "돗자리 천", first: "방석", second: "끈" },
] as const;

/** 전체의 일부를 먼저 쓰고, `남은 부분 → 둘째 용도`로 간다. */
function remainderAreaFraction(anchor: UnitSeed, rng: Rng): ElemProblem {
  const usedDenominator = pick(rng, [3, 4, 5] as const);
  const secondDenominator = pick(rng, [2, 3, 4, 5] as const);
  const usedNumerator = properNumerator(rng, usedDenominator);
  const secondNumerator = properNumerator(rng, secondDenominator);
  const [width, height] = rectangleDimensions(
    rng,
    usedDenominator,
    secondDenominator,
  );
  const theme = pick(rng, REMAINDER_THEMES);
  const area = width * height;
  const usedArea = (area * usedNumerator) / usedDenominator;
  const remainingArea = area - usedArea;
  const answer = (remainingArea * secondNumerator) / secondDenominator;

  return make(
    anchor,
    `가로가 ${unitNum(width, "m")}, 세로가 ${unitNum(height, "m")}인 직사각형 모양의 ${theme.material}${josa(theme.material, "이", "가")} 있습니다. 전체 넓이의 ${fraction(usedNumerator, usedDenominator)}만큼으로 ${theme.first}${josa(theme.first, "을", "를")} 만들고, 남은 ${theme.material}의 ${fraction(secondNumerator, secondDenominator)}만큼으로 ${theme.second}${josa(theme.second, "을", "를")} 만들었습니다. ${theme.second}${josa(theme.second, "을", "를")} 만드는 데 쓴 ${theme.material}의 넓이는 몇 ${expr("\\mathrm{m}^2")}입니까?`,
    squareMetres(answer),
    `전체 ${theme.material}의 넓이는 ${expr(`${width}\\times${height}=${area}`)}이므로 ${squareMetres(area)}입니다. ${theme.first}${josa(theme.first, "을", "를")} 만드는 데 쓴 넓이는 ${expr(`${area}\\times\\frac{${usedNumerator}}{${usedDenominator}}=${usedArea}`)}이므로 남은 넓이는 ${expr(`${area}-${usedArea}=${remainingArea}`)}입니다. 따라서 ${theme.second}${josa(theme.second, "을", "를")} 만드는 데 쓴 넓이는 ${expr(`${remainingArea}\\times\\frac{${secondNumerator}}{${secondDenominator}}=${answer}`)}이므로 ${squareMetres(answer)}입니다.`,
  );
}

const COMBOS: readonly InternalComboDefinition[] = [
  {
    id: AREA_FRACTION_ID,
    anchorKey: "초5|2-2-3",
    prerequisiteKeys: ["초5|1-6-2"],
    curriculumBasis:
      "2026-08-24 원장님 승인. 큐브 카탈로그: 분수의 곱을 이용하여 도형의 넓이 구하기·넓이를 이용한 세 분수의 곱셈 활용.",
    laterConceptReview:
      "units.ts 전 학년 소단원명 대조: 직사각형 넓이에 진분수를 곱하는 결합을 후속 학년의 독립 정식 개념으로 등록한 단원은 없음.",
    salt: 0x51_223_162,
    families: [
      { id: "nested-part", generate: nestedAreaFraction },
      { id: "remainder-part", generate: remainderAreaFraction },
    ],
  },
];

const UNIT_BY_KEY = new Map(
  CURRICULUM_UNITS.map((unit) => [tierKey(unit), unit] as const),
);
const COMBO_BY_ID = new Map(
  COMBOS.map((definition) => [definition.id, definition]),
);

function publicDefinition(
  definition: InternalComboDefinition,
): ElemComboDefinition {
  return {
    id: definition.id,
    anchorKey: definition.anchorKey,
    prerequisiteKeys: definition.prerequisiteKeys,
    curriculumBasis: definition.curriculumBasis,
    laterConceptReview: definition.laterConceptReview,
    familyIds: definition.families.map((family) => family.id) as [
      string,
      string,
      ...string[],
    ],
  };
}

/** 등록 전에 순서·분모·문형 수를 검사한다. 음성 대조 시험도 이 함수를 직접 부른다. */
export function validateElementaryComboDefinition(
  definition: ElemComboDefinition,
): void {
  const anchor = UNIT_BY_KEY.get(definition.anchorKey);
  if (!anchor) {
    throw new Error(
      `결합형 anchor가 units.ts에 없습니다: ${definition.anchorKey}`,
    );
  }
  if (definition.curriculumBasis.trim().length === 0) {
    throw new Error(`결합형 교육과정 근거가 비었습니다: ${definition.id}`);
  }
  if (!definition.laterConceptReview?.includes("units.ts")) {
    throw new Error(
      `결합형 후속 정식 개념의 units.ts 대조 기록이 없습니다: ${definition.id}`,
    );
  }
  if (definition.prerequisiteKeys.length === 0) {
    throw new Error(`결합형 선수 소단원이 비었습니다: ${definition.id}`);
  }
  if (
    new Set(definition.prerequisiteKeys).size !==
    definition.prerequisiteKeys.length
  ) {
    throw new Error(`결합형 선수 소단원이 겹칩니다: ${definition.id}`);
  }
  if (definition.prerequisiteKeys.includes(definition.anchorKey)) {
    throw new Error(`결합형 anchor를 선수로 다시 적었습니다: ${definition.id}`);
  }
  if (definition.familyIds.length < 2) {
    throw new Error(`결합형 문형은 둘 이상이어야 합니다: ${definition.id}`);
  }
  if (new Set(definition.familyIds).size !== definition.familyIds.length) {
    throw new Error(`결합형 family id가 겹칩니다: ${definition.id}`);
  }
  for (const key of definition.prerequisiteKeys) {
    const prerequisite = UNIT_BY_KEY.get(key);
    if (!prerequisite) {
      throw new Error(`결합형 선수 소단원이 units.ts에 없습니다: ${key}`);
    }
    if (prerequisite.orderIndex >= anchor.orderIndex) {
      throw new Error(
        `결합형 선수 순서가 뒤집혔습니다: ${key} → ${definition.anchorKey}`,
      );
    }
  }
}

function validateRegistry(): void {
  if (COMBO_BY_ID.size !== COMBOS.length) {
    throw new Error("결합형 id가 겹칩니다");
  }
  const salts = new Set<number>();
  for (const definition of COMBOS) {
    validateElementaryComboDefinition(publicDefinition(definition));
    if (salts.has(definition.salt))
      throw new Error(`결합형 salt가 겹칩니다: ${definition.salt}`);
    salts.add(definition.salt);
  }
}

validateRegistry();

export function elementaryComboDefinitions(): readonly ElemComboDefinition[] {
  return COMBOS.map(publicDefinition);
}

export function supportedCombos(anchor: UnitSeed): readonly string[] {
  const key = tierKey(anchor);
  return COMBOS.filter((definition) => definition.anchorKey === key).map(
    (definition) => definition.id,
  );
}

export function generateElementaryComboProblem(
  comboId: string,
  seed = 20260824,
): ElemComboProblem {
  const definition = COMBO_BY_ID.get(comboId);
  if (!definition) {
    throw new Error(`등록되지 않은 결합형입니다: ${comboId}`);
  }
  const anchor = UNIT_BY_KEY.get(definition.anchorKey)!;
  const rng = createRng(seed + anchor.orderIndex * 17 + definition.salt);
  const family = pick(rng, definition.families);
  const problem = family.generate(anchor, rng);
  return {
    ...problem,
    kind: "combo",
    comboId: definition.id,
    anchorKey: definition.anchorKey,
    conceptKeys: [definition.anchorKey, ...definition.prerequisiteKeys],
    familyId: family.id,
  };
}
