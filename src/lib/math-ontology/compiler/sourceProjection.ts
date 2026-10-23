import type { MathOntologySourceDataset } from "@/contracts/mathOntologySource.contract";
import { MATH_ONTOLOGY_SOURCE_RELATION_POLICY } from "../sources/relationMatrix";
import { projectMathOntologyPublicSources } from "../sources/publicProjection";
import {
  mathOntologyCompileInputSchema,
  MATH_ONTOLOGY_VOCAB as TM,
  type MathOntologyAssertion,
} from "@/contracts/mathOntology.contract";
import { sourceQuadsToNQuads, toMathOntologySourceQuads } from "../sources/rdf";
import { canonicalOntologyJson, ontologyDigest } from "./canonical";
import sourceKinds from "../../../../ontology/model/source-kinds.json";

/** Every source predicate retains its own name and either a query policy or a review reason. */
export const SOURCE_RELATION_POLICIES = MATH_ONTOLOGY_SOURCE_RELATION_POLICY;
export interface SourceProjectionAuthority {
  /** The caller must resolve this decision and publisher capability from DB; not from a client body. */
  decisionId: string;
  expectedProjectionHash: string;
  scope: string;
  verify: () => Promise<{
    isSuperAdmin: boolean;
    active: boolean;
    approvedProjectionHash: string;
    decisionId: string;
  }>;
}
export async function prepareSourceProjectionCompileInput(
  dataset: MathOntologySourceDataset,
  authority: SourceProjectionAuthority,
) {
  const decision = await authority.verify();
  const eligibleEntities = dataset.entities.filter(
    (e) => e.scope === "global" && e.distribution !== "quarantine-reference",
  );
  const permitted = new Set(eligibleEntities.map((e) => e.iri));
  const globalDataset = {
    ...dataset,
    entities: eligibleEntities,
    assertions: dataset.assertions.filter(
      (a) => permitted.has(a.subjectIri) && permitted.has(a.objectIri),
    ),
  };
  const projection = projectMathOntologyPublicSources(globalDataset);
  if (
    !decision.isSuperAdmin ||
    !decision.active ||
    decision.decisionId !== authority.decisionId ||
    decision.approvedProjectionHash !== projection.projectionHash ||
    authority.expectedProjectionHash !== projection.projectionHash ||
    authority.scope !== "global"
  )
    throw new Error("SOURCE_RELEASE_AUTHORITY_DENIED");
  const eligible = new Set(
    projection.entities
      .filter(
        (e) =>
          e.distribution !== "quarantine-reference" && e.scope === "global",
      )
      .map((e) => e.iri),
  );
  const assertions: MathOntologyAssertion[] = projection.assertions
    .filter(
      (a) =>
        SOURCE_RELATION_POLICIES[a.predicate].queryLocation ===
          "approved-source-projection" &&
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
      sourceDigest: a.sourceProjectionHash,
      sourceDigestKind: "authorized-projection",
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
    toMathOntologySourceQuads(globalDataset),
  );
  for (const entity of projection.entities) {
    const mapping = sourceKinds[entity.kind as keyof typeof sourceKinds];
    if (!mapping) throw new Error("UNSUPPORTED_SOURCE_KIND");
    assertions.push({
      id: `urn:todaymath:assertion:source-type:${ontologyDigest(entity.iri).slice(7)}`,
      subject: entity.iri,
      predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
      object: mapping.classIri,
      scope: "global",
      sourceRevision: entity.iri,
      sourceDigest: entity.sourceProjectionHash,
      sourceDigestKind: "authorized-projection",
      locator: entity.origin.pointer,
      provenance:
        entity.sourceProvenance === "official-document"
          ? "official-document"
          : "native-product",
      origin: "source-projection",
      support: "direct",
      review: "approved",
      publication: "published",
      distribution: "allowed",
      revision: 1,
      approvalId: authority.decisionId,
    });
  }
  const sourceManifest = canonicalOntologyJson({
    policy: "native-source-projection-v1",
    projectionHash: projection.projectionHash,
    registryHash: ontologyDigest(registryNquads),
    authorityDecisionId: authority.decisionId,
    scope: "global",
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
