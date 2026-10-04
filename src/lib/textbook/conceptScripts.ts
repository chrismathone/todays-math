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
import { applyRoleMentions } from "./scripts/roleMentions";
import type {
  ConceptTeachingScript,
  ConceptScriptCoverage,
  ConceptScriptSemesterCoverage,
} from "./scripts/types";

export type {
  ConceptTeachingScript,
  ConceptScriptBoardProvenance,
  ConceptScriptCoverage,
  ConceptScriptGrade,
  ConceptScriptRole,
  ConceptScriptExpression,
  ConceptScriptParticle,
  ConceptScriptPresentation,
  ConceptScriptPurpose,
  ConceptScriptRoleMention,
  ConceptScriptSemesterCoverage,
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

/** The chosen students' given names. A missing name keeps the one written in the manuscript. */
export type ConceptScriptCastNames = { student1?: string; student2?: string };

/**
 * The manuscript for a newly generated book: where the manuscript addresses a student
 * by name, the chosen name and its particle are written into that anchored span.
 * Names are never searched for as text, math is untouched, and "선생님" stays a role word.
 * Do not apply this to dialogue that is already stored in a book.
 */
export function conceptScriptForCast(
  sectionKey: string,
  names: ConceptScriptCastNames,
): ConceptTeachingScript | undefined {
  const script = conceptScriptFor(sectionKey);
  if (!script) return undefined;
  for (const turn of script.dialogue) {
    if (!turn.roleMentions) continue;
    const cast = applyRoleMentions(turn.markdown, turn.roleMentions, names);
    turn.markdown = cast.markdown;
    turn.roleMentions = cast.roleMentions;
  }
  return script;
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

/** Manuscripts per grade and semester: seven grades × two semesters. */
export function conceptScriptSemesterCoverage(): ConceptScriptSemesterCoverage {
  return CONCEPT_BLANK_GRADES.flatMap((grade) =>
    ([1, 2] as const).map((semester) => {
      const found = scripts.filter(
        (script) => script.grade === grade && script.semester === semester,
      );
      return {
        grade,
        semester,
        sections: found.length,
        concepts: found.reduce((n, script) => n + script.conceptIds.length, 0),
      };
    }),
  );
}

/** Section keys of one grade and semester, in manuscript order. */
export function conceptScriptSectionKeys(
  grade: string,
  semester: 1 | 2,
): string[] {
  return scripts
    .filter((script) => script.grade === grade && script.semester === semester)
    .map((script) => script.sectionKey);
}
