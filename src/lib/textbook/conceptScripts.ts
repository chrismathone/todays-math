import {
  BLANK_SECTIONS,
  CONCEPT_BLANK_GRADES,
} from "@/lib/concept-blank/sections";
import e3 from "./scripts/e3.json";
import e4 from "./scripts/e4.json";
import e5 from "./scripts/e5.json";
import e6 from "./scripts/e6.json";
import m1 from "./scripts/m1.json";
import m2 from "./scripts/m2.json";
import m3 from "./scripts/m3.json";
import type {
  ConceptTeachingScript,
  ConceptScriptCoverage,
} from "./scripts/types";

export type {
  ConceptTeachingScript,
  ConceptScriptCoverage,
  ConceptScriptGrade,
  ConceptScriptRole,
  ConceptScriptExpression,
  ConceptScriptPurpose,
  ConceptScriptSource,
  ConceptScriptTurn,
} from "./scripts/types";

/** Committed, editable teaching manuscripts. No authoring, bank assembly or AI at runtime. */
const scripts = [e3, e4, e5, e6, m1, m2, m3].flat() as ConceptTeachingScript[];
const bySection = new Map(scripts.map((script) => [script.sectionKey, script]));
if (bySection.size !== scripts.length)
  throw new Error("개념 수업 대본의 소단원 열쇠가 중복되었습니다.");

/** A detached manuscript; callers may adapt it without modifying the shared source. */
export function conceptScriptFor(
  sectionKey: string,
): ConceptTeachingScript | undefined {
  const script = bySection.get(sectionKey);
  return script ? structuredClone(script) : undefined;
}

/** The denominator is the supported curriculum, including sections with no examples in the bank. */
export function conceptScriptCoverage(): ConceptScriptCoverage {
  const sections = BLANK_SECTIONS.filter((section) =>
    (CONCEPT_BLANK_GRADES as readonly string[]).includes(section.grade),
  );
  const missingSectionKeys = sections
    .filter((section) => !bySection.has(section.key))
    .map((section) => section.key);
  const coveredSections = sections.length - missingSectionKeys.length;
  return {
    totalSections: sections.length,
    coveredSections,
    coveragePercent: sections.length
      ? (coveredSections / sections.length) * 100
      : 0,
    missingSectionKeys,
    grades: CONCEPT_BLANK_GRADES.map((grade) => {
      const gradeSections = sections.filter(
        (section) => section.grade === grade,
      );
      return {
        grade,
        totalSections: gradeSections.length,
        coveredSections: gradeSections.filter((section) =>
          bySection.has(section.key),
        ).length,
      };
    }),
  };
}
