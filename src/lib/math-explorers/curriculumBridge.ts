import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";

/**
 * Authored curriculum relationships, not title similarity or evidence of mastery.
 * The bank cursor remains the actual section ID; a five-card concept unit can
 * cover several bank chapters. Database stock is checked by the existing bank
 * selector at runtime, so these mappings do not promise an approved DB question.
 */
const elementaryChapters: Readonly<Record<string, readonly string[]>> = {
  "g3-add": ["3-1-1"],
  "g3-multiply": ["3-1-3", "3-1-4", "3-2-1", "3-2-2"],
  "g3-fraction": ["3-1-6", "3-2-4"],
  "g3-shapes": ["3-1-2", "3-2-3"],
  "g3-measure": ["3-1-5", "3-2-5"],
  "g3-data": ["3-2-6"],
  "g4-numbers": ["4-1-1", "4-1-3"],
  "g4-fractions": ["4-2-1", "4-2-3"],
  "g4-angles": ["4-1-2", "4-2-2"],
  "g4-polygons": ["4-2-4", "4-2-6"],
  "g4-movement": ["4-1-4"],
  "g4-data": ["4-1-5", "4-1-6", "4-2-5"],
  "g5-divisors": ["5-1-1", "5-1-2"],
  "g5-fractions": ["5-1-4", "5-1-5", "5-2-2"],
  "g5-estimate": ["5-2-1", "5-2-4"],
  "g5-relations": ["5-1-3", "5-2-6"],
  "g5-solid": ["5-2-3", "5-2-5"],
  "g5-area": ["5-1-6"],
  "g6-division": ["6-1-1", "6-1-3", "6-2-1", "6-2-2"],
  "g6-ratio": ["6-1-4"],
  "g6-proportion": [],
  "g6-solids": ["6-1-2", "6-2-3"],
  "g6-circle": ["6-2-5", "6-2-6"],
  "g6-data-volume": ["6-1-5", "6-1-6"],
};

// This bank chapter crosses two concept units. Keep its real lesson boundary.
const elementarySectionOverrides: Readonly<Record<string, string>> = {
  "6-2-4-1": "g6-ratio",
  "6-2-4-2": "g6-ratio",
  "6-2-4-3": "g6-proportion",
  "6-2-4-4": "g6-proportion",
  "6-2-4-5": "g6-proportion",
};

const elementarySectionUnits = new Map<string, string>();
const elementaryUnitSections = new Map<string, readonly string[]>();
for (const [unitId, chapterIds] of Object.entries(elementaryChapters)) {
  const sections = COURSE_SECTIONS.filter((section) =>
    elementarySectionOverrides[section.id]
      ? elementarySectionOverrides[section.id] === unitId
      : chapterIds.includes(section.chapterId),
  );
  elementaryUnitSections.set(unitId, Object.freeze(sections.map((s) => s.id)));
  for (const section of sections) {
    if (elementarySectionUnits.has(section.id))
      throw new Error(`중복된 개념 교육과정 연결입니다: ${section.id}`);
    elementarySectionUnits.set(section.id, unitId);
  }
}

/** Only these section labels are included in the existing middle SRS engine. */
export const middleEquationBankSections = Object.freeze([
  "방정식과 그 해",
  "등식의 성질",
  "일차방정식의 풀이",
  "일차방정식의 활용(해의 응용)",
  "일차방정식의 활용(수)",
  "일차방정식의 활용(나이, 과부족, 예금)",
  "일차방정식의 활용(증가와 감소, 원가와 정가)",
  "일차방정식의 활용(거리, 속력, 시간)",
  "일차방정식의 활용(도형, 농도, 일)",
  "일차방정식의 활용(비율, 시계, 규칙)",
]);
const middleSections = new Set<string>(middleEquationBankSections);
const emptySections: readonly string[] = Object.freeze([]);

/** Elementary returns stable section IDs; middle returns existing unitSection labels. */
export function bankSectionsForExplorerUnit(unitId: string): readonly string[] {
  return (
    elementaryUnitSections.get(unitId) ??
    (unitId === "g7-equation" ? middleEquationBankSections : emptySections)
  );
}

/** Unknown/unsupported sections deliberately have no default grade or unit. */
export function explorerUnitForSection(sectionId: string): string | null {
  return (
    elementarySectionUnits.get(sectionId) ??
    (middleSections.has(sectionId) ? "g7-equation" : null)
  );
}

export function bankKindForExplorerUnit(
  unitId: string,
): "elementary" | "middle" | null {
  if (elementaryUnitSections.has(unitId)) return "elementary";
  return unitId === "g7-equation" ? "middle" : null;
}

// A precise, authored card association is optional. Ambiguous or broader lessons
// remain null, rather than inventing a prerequisite diagnosis from the title.
const sectionCards: Readonly<Record<string, string>> = {
  "3-1-1-2": "g3-carry",
  "3-1-1-4": "g3-borrow",
  "3-1-2-1": "g3-segment",
  "3-1-2-2": "g3-right-angle",
  "3-1-3-1": "g3-division",
  "3-1-3-3": "g3-quotient",
  "3-1-3-4": "g3-quotient",
  "3-1-5-1": "g3-length",
  "3-1-5-2": "g3-kilometer",
  "3-1-5-4": "g3-time",
  "3-1-6-2": "g3-fraction",
  "3-1-6-3": "g3-fraction",
  "3-1-6-5": "g3-unit-fraction",
  "3-1-6-6": "g3-decimal",
  "3-2-2-3": "g3-remainder",
  "3-2-4-1": "g3-fraction",
  "3-2-5-1": "g3-capacity",
  "3-2-5-2": "g3-capacity",
  "3-2-5-5": "g3-mass",
  "3-2-6-1": "g3-picture-graph",
  "3-2-6-2": "g3-picture-graph",
  "4-1-1-1": "g4-ten-thousand",
  "4-1-1-2": "g4-large-place",
  "4-1-1-4": "g4-hundred-million",
  "4-1-2-2": "g4-angle",
  "4-1-2-5": "g4-triangle-sum",
  "4-1-3-7": "g4-estimate-quotient",
  "4-1-4-2": "g4-slide",
  "4-1-4-3": "g4-flip",
  "4-1-4-4": "g4-turn",
  "4-1-5-1": "g4-bar-graph",
  "4-1-5-2": "g4-bar-graph",
  "4-1-6-1": "g4-number-rule",
  "4-2-1-1": "g4-same-denominator",
  "4-2-1-3": "g4-same-denominator",
  "4-2-2-2": "g4-isosceles",
  "4-2-3-4": "g4-decimal-add",
  "4-2-3-6": "g4-decimal-add",
  "4-2-4-2": "g4-parallel",
  "4-2-4-5": "g4-parallelogram",
  "4-2-4-6": "g4-rhombus",
  "4-2-5-1": "g4-line-graph",
  "4-2-6-1": "g4-polygon",
  "4-2-6-3": "g4-diagonal",
  "5-1-1-1": "g5-operation-order",
  "5-1-1-2": "g5-operation-order",
  "5-1-1-3": "g5-operation-order",
  "5-1-2-3": "g5-gcd",
  "5-1-2-4": "g5-gcd",
  "5-1-2-5": "g5-lcm",
  "5-1-2-6": "g5-lcm",
  "5-1-3-1": "g5-correspondence",
  "5-1-3-2": "g5-rule-expression",
  "5-1-3-3": "g5-rule-expression",
  "5-1-4-1": "g5-equivalent",
  "5-1-4-2": "g5-reduce",
  "5-1-4-3": "g5-common-denominator",
  "5-1-6-1": "g5-perimeter",
  "5-1-6-2": "g5-rectangle-area",
  "5-2-1-1": "g5-at-least",
  "5-2-1-2": "g5-more-than",
  "5-2-1-4": "g5-round-up",
  "5-2-1-5": "g5-round-up",
  "5-2-1-6": "g5-round",
  "5-2-2-3": "g5-fraction-multiply",
  "5-2-2-4": "g5-fraction-multiply",
  "5-2-3-1": "g5-congruence",
  "5-2-3-2": "g5-congruence",
  "5-2-3-3": "g5-line-symmetry",
  "5-2-3-4": "g5-point-symmetry",
  "5-2-4-5": "g5-decimal-multiply",
  "5-2-4-6": "g5-decimal-multiply",
  "5-2-5-1": "g5-cuboid",
  "5-2-5-2": "g5-cube",
  "5-2-6-1": "g5-average",
  "5-2-6-2": "g5-average",
  "6-1-1-2": "g6-fraction-divide",
  "6-1-1-3": "g6-fraction-divide",
  "6-1-2-1": "g6-prism",
  "6-1-2-3": "g6-net",
  "6-1-2-4": "g6-pyramid",
  "6-1-3-1": "g6-decimal-divide",
  "6-1-4-2": "g6-ratio",
  "6-1-4-3": "g6-rate",
  "6-1-4-5": "g6-percent",
  "6-1-5-1": "g6-band-graph",
  "6-1-5-2": "g6-band-graph",
  "6-1-5-3": "g6-pie-graph",
  "6-1-5-4": "g6-pie-graph",
  "6-1-6-1": "g6-surface-area",
  "6-1-6-2": "g6-cuboid-volume",
  "6-2-1-1": "g6-fraction-divide",
  "6-2-1-2": "g6-fraction-divide",
  "6-2-1-3": "g6-fraction-divide",
  "6-2-2-1": "g6-decimal-divide",
  "6-2-2-2": "g6-decimal-divide",
  "6-2-2-3": "g6-decimal-divide",
  "6-2-3-2": "g6-cube-stack",
  "6-2-3-3": "g6-cube-stack",
  "6-2-3-4": "g6-cube-stack",
  "6-2-3-5": "g6-cube-stack",
  "6-2-4-1": "g6-ratio-simplify",
  "6-2-4-2": "g6-ratio-simplify",
  "6-2-4-3": "g6-proportion",
  "6-2-4-4": "g6-cross-product",
  "6-2-4-5": "g6-distribute",
  "6-2-5-2": "g6-circumference",
  "6-2-5-3": "g6-circle-area",
  "6-2-5-4": "g6-circle-area",
  "6-2-6-1": "g6-cylinder",
  "6-2-6-3": "g6-cone-sphere",
  "6-2-6-4": "g6-cone-sphere",
  "방정식과 그 해": "g7-equation",
  "일차방정식의 풀이": "g7-linear-equation",
};

export function explorerCardForSection(sectionId: string): string | null {
  return explorerUnitForSection(sectionId)
    ? (sectionCards[sectionId] ?? null)
    : null;
}
