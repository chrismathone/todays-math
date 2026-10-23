import type { MathOntologySourceDataset } from "@/contracts/mathOntologySource.contract";
import { MATH_ONTOLOGY_SOURCE_PREDICATES } from "@/contracts/mathOntologySource.contract";
import {
  mathOntologyCompileInputSchema,
  MATH_ONTOLOGY_VOCAB as TM,
  type MathOntologyAssertion,
} from "@/contracts/mathOntology.contract";
import { sourceQuadsToNQuads, toMathOntologySourceQuads } from "../sources/rdf";
import { canonicalOntologyJson, ontologyDigest } from "./canonical";

const native = new Set([
  "partOf",
  "orderedBefore",
  "assessesDefinition",
  "containsProposition",
  "cardInUnit",
  "projectsSourceSection",
  "editorialContains",
  "generatesForSection",
  "referencesSource",
  "scriptUsesDefinition",
]);
/** Every source predicate retains its own name and either a query policy or a review reason. */
export const SOURCE_RELATION_POLICIES = Object.freeze(
  Object.fromEntries(
    MATH_ONTOLOGY_SOURCE_PREDICATES.map((p) => [
      p,
      {
        predicate: TM + p,
        queryableAfter: native.has(p)
          ? "manifest-bound-source-release"
          : "human-relation-review",
        inference: p === "partOf" ? "structural-transitivity" : "none",
      },
    ]),
  ),
);
export interface SourceProjectionAuthority {
  /** The caller must resolve this decision and publisher capability from DB; not from a client body. */
  decisionId: string;
  expectedPayloadHash: string;
  scope: string;
  verify: () => Promise<{
    isSuperAdmin: boolean;
    active: boolean;
    approvedPayloadHash: string;
    decisionId: string;
  }>;
}
export async function prepareSourceProjectionCompileInput(
  dataset: MathOntologySourceDataset,
  authority: SourceProjectionAuthority,
) {
  const decision = await authority.verify();
  if (
    !decision.isSuperAdmin ||
    !decision.active ||
    decision.decisionId !== authority.decisionId ||
    decision.approvedPayloadHash !== dataset.payloadHash ||
    authority.expectedPayloadHash !== dataset.payloadHash ||
    authority.scope !== "global"
  )
    throw new Error("SOURCE_RELEASE_AUTHORITY_DENIED");
  const eligible = new Set(
    dataset.entities
      .filter(
        (e) =>
          e.distribution !== "quarantine-reference" && e.scope === "global",
      )
      .map((e) => e.iri),
  );
  const assertions: MathOntologyAssertion[] = dataset.assertions
    .filter(
      (a) =>
        native.has(a.predicate) &&
        a.originKind === "source-projection" &&
        a.supportKind === "direct-source-structure" &&
        a.evidenceKind === "observed" &&
        !a.partial &&
        eligible.has(a.subjectIri) &&
        eligible.has(a.objectIri),
    )
    .map((a) => ({
      id: `urn:todaymath:assertion:source:${ontologyDigest(a.iri).slice(7)}`,
      subject: a.subjectIri,
      predicate: TM + a.predicate,
      object: a.objectIri,
      scope: "global",
      sourceRevision: a.iri,
      sourceDigest: a.origin.byteHash,
      locator: a.origin.pointer,
      provenance: "native-product",
      origin: "source-projection",
      support: "direct",
      review: "approved",
      publication: "published",
      distribution: "allowed",
      revision: 1,
      approvalId: authority.decisionId,
    }));
  const registryNquads = sourceQuadsToNQuads(
    toMathOntologySourceQuads(dataset),
  );
  const sourceManifest = canonicalOntologyJson({
    policy: "native-source-projection-v1",
    payloadHash: dataset.payloadHash,
    registryHash: ontologyDigest(registryNquads),
    authorityDecisionId: authority.decisionId,
    scope: "global",
    inputs: dataset.inputManifest,
  });
  return mathOntologyCompileInputSchema.parse({
    schemaVersion: 1,
    profile: "tm-owlrl-1",
    scope: "global",
    registryNquads,
    assertions,
    sourceManifest,
  });
}
