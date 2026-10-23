import { MATH_ONTOLOGY_SOURCE_PREDICATES } from "@/contracts/mathOntologySource.contract";
type Predicate = (typeof MATH_ONTOLOGY_SOURCE_PREDICATES)[number];
export interface MathOntologySourceRelationPolicy {
  predicate: Predicate;
  iri: `urn:todaymath:vocab:${Predicate}`;
  semanticRole:
    | "hierarchy"
    | "service-order"
    | "representation"
    | "authored-education"
    | "authored-mapping"
    | "course-advice"
    | "source-reference";
  queryLocation: "approved-source-projection" | "candidate-review";
  publicationGate:
    | "eligible-endpoints-and-projection-release-approval"
    | "independent-relation-review";
  proofRule:
    "source-byte-projection-witness" | "approved-assertion-witness-only";
  transitive: false;
  officialEducationalMeaning: false;
}
const structural = (
  predicate: Predicate,
  semanticRole: MathOntologySourceRelationPolicy["semanticRole"],
): MathOntologySourceRelationPolicy => ({
  predicate,
  iri: `urn:todaymath:vocab:${predicate}`,
  semanticRole,
  queryLocation: "approved-source-projection",
  publicationGate: "eligible-endpoints-and-projection-release-approval",
  proofRule: "source-byte-projection-witness",
  transitive: false,
  officialEducationalMeaning: false,
});
const candidate = (
  predicate: Predicate,
  semanticRole: MathOntologySourceRelationPolicy["semanticRole"],
): MathOntologySourceRelationPolicy => ({
  ...structural(predicate, semanticRole),
  queryLocation: "candidate-review",
  publicationGate: "independent-relation-review",
  proofRule: "approved-assertion-witness-only",
});
/** Exhaustive source→formal vocabulary/query/review/proof matrix. Quarantined endpoints never reach either public graph. */
export const MATH_ONTOLOGY_SOURCE_RELATION_POLICY: Readonly<
  Record<Predicate, MathOntologySourceRelationPolicy>
> = {
  partOf: structural("partOf", "hierarchy"),
  orderedBefore: structural("orderedBefore", "service-order"),
  assessesDefinition: structural("assessesDefinition", "representation"),
  containsProposition: structural("containsProposition", "representation"),
  cardInUnit: structural("cardInUnit", "hierarchy"),
  authoredPrerequisiteRecommendation: candidate(
    "authoredPrerequisiteRecommendation",
    "authored-education",
  ),
  editorialPrerequisite: candidate(
    "editorialPrerequisite",
    "authored-education",
  ),
  editorialSupport: candidate("editorialSupport", "authored-education"),
  editorialContains: structural("editorialContains", "hierarchy"),
  courseSequence: candidate("courseSequence", "course-advice"),
  courseAlternativeTrack: candidate("courseAlternativeTrack", "course-advice"),
  courseRecommendedFoundation: candidate(
    "courseRecommendedFoundation",
    "course-advice",
  ),
  courseRecommendedBeforeOrConcurrent: candidate(
    "courseRecommendedBeforeOrConcurrent",
    "course-advice",
  ),
  projectsSourceSection: structural("projectsSourceSection", "representation"),
  coversSourceSection: candidate("coversSourceSection", "authored-mapping"),
  representativeCard: candidate("representativeCard", "authored-mapping"),
  scriptUsesDefinition: structural("scriptUsesDefinition", "representation"),
  referencesSource: structural("referencesSource", "source-reference"),
  partialCourseMapping: candidate("partialCourseMapping", "authored-mapping"),
  generatesForSection: structural("generatesForSection", "representation"),
};
