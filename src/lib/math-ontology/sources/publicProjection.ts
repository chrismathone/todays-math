import type {
  MathOntologySourceLocator,
  MathOntologySourceRecord,
  MathOntologySourceAssertion,
  MathOntologySourceDataset,
} from "@/contracts/mathOntologySource.contract";
import { sourceDigest, freezeSourceValue } from "./canonical";
/** Raw upstream byte hashes/array offsets are administrative. Public coordinates address the allowed immutable metadata slice. */
function coordinate(
  origin: MathOntologySourceLocator,
  projectedPointer: string,
) {
  return {
    repositoryPath: origin.repositoryPath,
    projectedPointer,
    extractorVersion: origin.extractorVersion,
    ...(origin.publicSourceIri
      ? { publicSourceIri: origin.publicSourceIri }
      : {}),
    ...(origin.publicSourceIri && origin.upstreamByteHash
      ? { publicOfficialByteHash: origin.upstreamByteHash }
      : {}),
  };
}
export function publicSourceRecordValue(record: MathOntologySourceRecord) {
  const pointer =
    "/entities/" +
    [record.namespace, record.scope, record.nativeId]
      .map(encodeURIComponent)
      .join("/");
  const metadata =
    record.namespace === "textbook-script-turn"
      ? Object.fromEntries(
          Object.entries(record.metadata).filter(([key]) => key !== "order"),
        )
      : record.metadata;
  return {
    namespace: record.namespace,
    scope: record.scope,
    nativeId: record.nativeId,
    kind: record.kind,
    sourceProvenance: record.sourceProvenance,
    distribution: record.distribution,
    edition: record.edition,
    metadata,
    origin: coordinate(record.origin, pointer),
    ...(record.labels
      ? {
          labels: record.labels.map((label, i) => ({
            ...label,
            origin: coordinate(label.origin, pointer + "/labels/" + i),
          })),
        }
      : {}),
    ...(record.nativeReferences
      ? {
          nativeReferences: record.nativeReferences.map((ref, i) => ({
            ...ref,
            origin: coordinate(ref.origin, pointer + "/references/" + i),
          })),
        }
      : {}),
  };
}
export function publicSourceAssertionValue(a: MathOntologySourceAssertion) {
  return {
    nativeId: a.nativeId,
    subject: a.subject,
    predicate: a.predicate,
    object: a.object,
    origin: coordinate(
      a.origin,
      "/assertions/" + encodeURIComponent(a.nativeId),
    ),
    originKind: a.originKind,
    supportKind: a.supportKind,
    evidenceKind: a.evidenceKind,
    reviewState: a.reviewState,
    publicationState: a.publicationState,
    partial: a.partial,
    ...(a.mappingReviewStatus
      ? { mappingReviewStatus: a.mappingReviewStatus }
      : {}),
  };
}
/** The only global source view suitable for a scoped query graph. Full dataset/census hashes never escape through it. */
export function projectMathOntologyPublicSources(
  dataset: MathOntologySourceDataset,
) {
  return projectMathOntologySourceScopeSelection(dataset, new Set(["global"]));
}
/** Selection only, not authorization. The server must derive exact scopes from the existing source policy; never accept this allowlist from a request/model. No implicit all-scope union. */
export function projectMathOntologySourceScopeSelection(
  dataset: MathOntologySourceDataset,
  allowedScopes: ReadonlySet<string>,
) {
  const entities = dataset.entities
    .filter(
      (e) =>
        allowedScopes.has(e.scope) && e.distribution !== "quarantine-reference",
    )
    .map((e) => ({
      ...publicSourceRecordValue(e),
      stableIri: e.stableIri,
      iri: e.iri,
      sourceVersion: e.sourceVersion,
      sourceVersionKind: "authorized-projection" as const,
      sourceProjectionHash: sourceDigest(publicSourceRecordValue(e)),
    }));
  const eligible = new Set(entities.map((e) => e.iri));
  const assertions = dataset.assertions
    .filter((a) => eligible.has(a.subjectIri) && eligible.has(a.objectIri))
    .map((a) => ({
      ...publicSourceAssertionValue(a),
      stableIri: a.stableIri,
      iri: a.iri,
      subjectIri: a.subjectIri,
      objectIri: a.objectIri,
      sourceVersion: a.sourceVersion,
      sourceVersionKind: "authorized-projection" as const,
      sourceProjectionHash: sourceDigest(publicSourceAssertionValue(a)),
    }));
  return freezeSourceValue({
    projectionHash: sourceDigest({
      format: "public-source-projection-2",
      entities,
      assertions,
    }),
    entities,
    assertions,
  });
}
export type MathOntologyPublicSourceProjection = ReturnType<
  typeof projectMathOntologyPublicSources
>;
