import type {
  MathOntologySourceDataset,
  MathOntologySourcePredicate,
} from "@/contracts/mathOntologySource.contract";
/** Measured actual source projections, including quarantined references. They are not counts of distinct questions or approved educational facts. */
export const EXPECTED_MATH_ONTOLOGY_SOURCE_RELATION_COVERAGE: Readonly<
  Record<MathOntologySourcePredicate, number>
> = {
  assessesDefinition: 9119,
  partOf: 29356,
  representativeCard: 114,
  coversSourceSection: 240,
  authoredPrerequisiteRecommendation: 369,
  cardInUnit: 230,
  projectsSourceSection: 230,
  generatesForSection: 4190,
  courseSequence: 3,
  courseAlternativeTrack: 1,
  courseRecommendedFoundation: 1,
  courseRecommendedBeforeOrConcurrent: 1,
  editorialPrerequisite: 186,
  editorialSupport: 2,
  editorialContains: 356,
  containsProposition: 9119,
  referencesSource: 3988,
  partialCourseMapping: 4,
  scriptUsesDefinition: 1657,
  orderedBefore: 734,
};
/** Exact source-owned routes only. Similar labels, unknown mappings and educational judgments cannot satisfy a structural witness. */
export function verifySourceCatalogStructure(
  dataset: MathOntologySourceDataset,
  expected?: Partial<Record<MathOntologySourcePredicate, number>>,
) {
  const counts: Partial<Record<MathOntologySourcePredicate, number>> = {};
  const links = new Map<string, (typeof dataset.assertions)[number][]>();
  for (const a of dataset.assertions) {
    counts[a.predicate] = (counts[a.predicate] ?? 0) + 1;
    const key = a.subjectIri + "|" + a.predicate;
    const list = links.get(key) ?? [];
    list.push(a);
    links.set(key, list);
  }
  if (expected)
    for (const [p, n] of Object.entries(expected))
      if ((counts[p as MathOntologySourcePredicate] ?? 0) !== n)
        throw new Error("Source relation coverage mismatch: " + p);
  const entities = new Map(dataset.entities.map((e) => [e.iri, e]));
  const one = (
    subject: string,
    predicate: MathOntologySourcePredicate,
    namespace: string,
  ) => {
    const values = links.get(subject + "|" + predicate) ?? [];
    if (values.length !== 1)
      throw new Error(
        "Missing or ambiguous source-owned structural correspondence",
      );
    const a = values[0],
      target = entities.get(a.objectIri);
    if (
      a.originKind !== "source-projection" ||
      a.supportKind !== "direct-source-structure" ||
      a.evidenceKind !== "observed" ||
      target?.namespace !== namespace
    )
      throw new Error("Invalid source-owned correspondence witness");
    return target;
  };
  let assessmentDefinitionSectionChapterPaths = 0;
  const sample = [];
  for (const e of dataset.entities.filter(
    (e) => e.namespace === "bank-assessment",
  )) {
    const definition = one(e.iri, "assessesDefinition", "bank-definition");
    if (definition.nativeId !== e.nativeId || definition.scope !== e.scope)
      throw new Error("Assessment native ID correspondence mismatch");
    const section = one(definition.iri, "partOf", "curriculum-section"),
      chapter = one(section.iri, "partOf", "curriculum-chapter");
    assessmentDefinitionSectionChapterPaths++;
    if (sample.length < 3)
      sample.push({
        assessment: e.iri,
        definition: definition.iri,
        section: section.iri,
        chapter: chapter.iri,
      });
  }
  for (const e of dataset.entities) {
    if (e.namespace === "course-section")
      one(e.iri, "projectsSourceSection", "curriculum-section");
    if (e.namespace === "explorer-card")
      one(e.iri, "cardInUnit", "explorer-unit");
  }
  return {
    relationCoverage: counts,
    assessmentDefinitionSectionChapterPaths,
    sample,
    meaning:
      "native-source-structure-only-not-official-standard-or-educational-validation",
  };
}
