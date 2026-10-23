import { DataFactory, type Store } from "n3";
import {
  COURSE_SECTIONS,
  getCourseSection,
} from "@/lib/math-srs/elementary/catalog";
import {
  MATH_ONTOLOGY_VOCAB as TM,
  type MathOntologyProof,
} from "@/contracts/mathOntology.contract";
const nn = DataFactory.namedNode;
export function ontologyCourseSectionLabel(nativeId: string) {
  const section = getCourseSection(nativeId);
  return section
    ? `초${section.grade} ${section.semester}학기 · ${section.chapterTitle} · ${section.title}`
    : "단원 표기 미확인";
}
/** Only call with a hash/proof/SHACL-checked public registry slice. The current
 * native action identity must agree with its versioned RDF metadata and source link. */
export function ontologyPlanSection(
  registry: Store,
  proofs: readonly MathOntologyProof[],
  iri: string,
) {
  const one = (entity: string, predicate: string) => {
    const values = registry.getObjects(nn(entity), nn(predicate), null);
    return values.length === 1 ? values[0].value : undefined;
  };
  const nativeId = one(iri, TM + "nativeId");
  if (
    !nativeId ||
    one(iri, TM + "nativeNamespace") !== "course-section" ||
    one(iri, TM + "sourceScope") !== "global"
  )
    return null;
  const section = getCourseSection(nativeId);
  if (
    !section ||
    one(iri, TM + "grade") !== String(section.grade) ||
    one(iri, TM + "semester") !== String(section.semester) ||
    one(iri, "http://www.w3.org/2000/01/rdf-schema#label") !== section.title
  )
    return null;
  const sourceKey = [
    section.unit.grade,
    section.unit.chapter,
    section.unit.section,
  ].join("::");
  const binding = proofs.some(
    (p) =>
      p.scope === "global" &&
      p.conclusion[0] === iri &&
      p.conclusion[1] === TM + "projectsSourceSection" &&
      one(p.conclusion[2], TM + "nativeNamespace") === "curriculum-section" &&
      one(p.conclusion[2], TM + "nativeId") === sourceKey,
  );
  if (!binding) return null;
  return Object.freeze({
    iri,
    nativeId,
    label: section.title,
    grade: section.grade,
    semester: section.semester,
    path: ontologyCourseSectionLabel(nativeId),
  });
}
/** Same-title ambiguity is checked against the complete native course catalog,
 * not just a truncated query page. Never use the selected student's class grade
 * as an unstated requested starting point. */
export function ontologyPlanChoiceIsExplicit(
  choice: NonNullable<ReturnType<typeof ontologyPlanSection>>,
  question: string,
) {
  const grades = [
    ...question.matchAll(/(?:초(?:등(?:학교)?)?\s*([3-6])|([3-6])\s*학년)/gu),
  ].map((m) => Number(m[1] ?? m[2]));
  const semesters = [...question.matchAll(/([12])\s*학기/gu)].map((m) =>
    Number(m[1]),
  );
  if (new Set(grades).size > 1 || new Set(semesters).size > 1) return false;
  const candidates = COURSE_SECTIONS.filter(
    (s) =>
      s.title === choice.label &&
      (!grades.length || s.grade === grades[0]) &&
      (!semesters.length || s.semester === semesters[0]),
  );
  return candidates.length === 1 && candidates[0].id === choice.nativeId;
}
