import type { MathOntologyAssertion } from "@/contracts/mathOntology.contract";
/** Eligibility never upgrades support or establishes educational truth. The
 * current source/evidence authorizer is still required for every approval. */
export function ontologyRelationCanPublish(assertion: MathOntologyAssertion) {
  return (assertion.support === "direct" || assertion.support === "indirect") && assertion.distribution === "allowed";
}
