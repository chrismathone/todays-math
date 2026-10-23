import { DataFactory, Store } from "n3";
import {
  mathOntologyAssertionSchema,
  MATH_ONTOLOGY_VOCAB as TM,
} from "@/contracts/mathOntology.contract";
import type { MathOntologyRuntime } from "../runtime/artifact";
import { validateOntologyCore } from "./core";
/** Quarantine-only structural validation; never inserts the proposed relation in the trusted store. */
export async function actualCandidateValidation(
  raw: unknown,
  scope: string,
  runtime?: MathOntologyRuntime,
) {
  if (!runtime) throw new Error("CANDIDATE_SOURCE_CONTEXT_REQUIRED");
  const a = mathOntologyAssertionSchema.parse(raw);
  if (
    a.review !== "candidate" ||
    a.publication !== "unpublished" ||
    a.scope !== scope ||
    a.distribution !== "allowed"
  )
    throw new Error("CANDIDATE_STATE_OR_SCOPE");
  const { namedNode, literal } = DataFactory,
    { registry } = runtime.datasets();
  const sourcePredicate =
    TM +
    (a.sourceDigestKind === "authorized-projection"
      ? "sourceProjectionHash"
      : "sourceByteHash");
  if (
    !registry
      .getObjects(namedNode(a.sourceRevision), namedNode(sourcePredicate), null)
      .some((o) => o.value === a.sourceDigest)
  )
    throw new Error("CANDIDATE_SOURCE_NOT_IN_RELEASE");
  for (const id of [a.subject, a.object])
    if (!registry.countQuads(namedNode(id), null, null, null))
      throw new Error("CANDIDATE_ENTITY_NOT_IN_RELEASE");
  const graph = new Store(),
    id = namedNode(a.id),
    rdf = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
  for (const [p, o] of [
    [rdf + "type", TM + "CandidateAssertion"],
    [rdf + "subject", a.subject],
    [rdf + "predicate", a.predicate],
    [rdf + "object", a.object],
    [TM + "sourceRevision", a.sourceRevision],
  ])
    graph.addQuad(id, namedNode(p), namedNode(o));
  for (const [p, o] of [
    ["sourceDigest", a.sourceDigest],
    ["scope", a.scope],
    ["review", a.review],
    ["publication", a.publication],
  ])
    graph.addQuad(id, namedNode(TM + p), literal(o));
  const report = await validateOntologyCore(graph, runtime.shapes);
  if (!report.conforms || report.incomplete)
    throw new Error("CANDIDATE_SHACL_VIOLATION");
  return {
    ...report,
    graphVersion: runtime.identity.graphVersion,
    stage: "quarantined-structure-only" as const,
    educationalTruth: "unverified" as const,
    globalConstraints: "checked-by-publication-compiler" as const,
  };
}
