import type {
  MathOntologySourceDataset,
  MathOntologySourceQuad,
  MathOntologySourceRdfTerm,
} from "@/contracts/mathOntologySource.contract";
import { compareSourceStrings } from "./canonical";
import { projectMathOntologyPublicSources } from "./publicProjection";
export const MATH_ONTOLOGY_SOURCE_VOCAB = "urn:todaymath:vocab:";
const rdf = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const xsd = "http://www.w3.org/2001/XMLSchema#";
const named = (value: string): { termType: "NamedNode"; value: string } => ({
  termType: "NamedNode",
  value,
});
const literal = (
  value: string | number | boolean,
): MathOntologySourceRdfTerm => ({
  termType: "Literal",
  value: String(value),
  language: "",
  datatype: named(
    xsd +
      (typeof value === "boolean"
        ? "boolean"
        : typeof value === "number"
          ? Number.isInteger(value)
            ? "integer"
            : "decimal"
          : "string"),
  ),
});
/** Only allowlisted metadata enters RDF. Quarantine remains visible in coverage, never as a public entity. */
export function toMathOntologySourceQuads(
  dataset: MathOntologySourceDataset,
  emit?: (quad: MathOntologySourceQuad) => void,
): readonly MathOntologySourceQuad[] {
  const projection = projectMathOntologyPublicSources(dataset);
  const graph = named(
      `urn:todaymath:math-source:graph:${projection.projectionHash.slice(7)}`,
    ),
    quads: MathOntologySourceQuad[] = [];
  const add = (
    subject: string,
    predicate: string,
    object: MathOntologySourceRdfTerm,
  ) => {
    const quad = {
      subject: named(subject),
      predicate: named(predicate),
      object,
      graph,
    };
    if (emit) emit(quad);
    else quads.push(quad);
  };
  const vocab = MATH_ONTOLOGY_SOURCE_VOCAB,
    eligible = new Set(
      projection.entities
        .filter((e) => e.distribution !== "quarantine-reference")
        .map((e) => e.iri),
    );
  for (const e of projection.entities) {
    if (!eligible.has(e.iri)) continue;
    add(e.iri, rdf + "type", named(vocab + "SourceEntity"));
    add(e.iri, vocab + "versionOf", named(e.stableIri));
    for (const [key, value] of Object.entries({
      nativeId: e.nativeId,
      nativeNamespace: e.namespace,
      sourceScope: e.scope,
      sourceVersion: e.sourceVersion,
      sourceKind: e.kind,
      sourceProvenance: e.sourceProvenance,
      distribution: e.distribution,
      curriculumEdition: e.edition,
      repositoryPath: e.origin.repositoryPath,
      sourcePointer: e.origin.pointer,
      sourceProjectionHash: e.sourceProjectionHash,
      extractorVersion: e.origin.extractorVersion,
      ...e.metadata,
    }))
      if (value !== null) add(e.iri, vocab + key, literal(value));
    if (e.origin.publicOfficialByteHash)
      add(
        e.iri,
        vocab + "upstreamByteHash",
        literal(e.origin.publicOfficialByteHash),
      );
    if (e.origin.publicSourceIri)
      add(e.iri, vocab + "publicSource", named(e.origin.publicSourceIri));
    for (const [index, label] of (e.labels ?? []).entries()) {
      const iri = `${e.iri}:label:${index}`;
      add(
        e.iri,
        "http://www.w3.org/2000/01/rdf-schema#label",
        literal(label.value),
      );
      add(e.iri, vocab + "labelEvidence", named(iri));
      for (const [key, value] of Object.entries({
        sourceField: label.sourceField,
        sourceTextHash: label.sourceTextHash,
        repositoryPath: label.origin.repositoryPath,
        sourcePointer: label.origin.pointer,
        sourceProjectionHash: e.sourceProjectionHash,
      }))
        add(iri, vocab + key, literal(value));
    }
    for (const [index, reference] of (e.nativeReferences ?? []).entries()) {
      const iri = `${e.iri}:declaredReference:${index}`;
      add(e.iri, vocab + "declaredNativeReference", named(iri));
      add(iri, rdf + "type", named(vocab + "DeclaredSourceReference"));
      for (const [key, value] of Object.entries({
        nativeNamespace: reference.namespace,
        nativeId: reference.nativeId,
        resolution: reference.resolution,
        repositoryPath: reference.origin.repositoryPath,
        sourcePointer: reference.origin.pointer,
        sourceProjectionHash: e.sourceProjectionHash,
      }))
        add(iri, vocab + key, literal(value));
    }
  }
  for (const a of projection.assertions) {
    if (!eligible.has(a.subjectIri) || !eligible.has(a.objectIri)) continue;
    add(a.iri, rdf + "type", named(vocab + "SourceAssertion"));
    add(a.iri, vocab + "versionOf", named(a.stableIri));
    add(a.iri, rdf + "subject", named(a.subjectIri));
    add(a.iri, rdf + "predicate", named(vocab + a.predicate));
    add(a.iri, rdf + "object", named(a.objectIri));
    for (const [key, value] of Object.entries({
      originKind: a.originKind,
      supportKind: a.supportKind,
      evidenceKind: a.evidenceKind,
      reviewState: a.reviewState,
      publicationState: a.publicationState,
      partial: a.partial,
      sourceVersion: a.sourceVersion,
      repositoryPath: a.origin.repositoryPath,
      sourcePointer: a.origin.pointer,
      sourceProjectionHash: a.sourceProjectionHash,
    }))
      add(a.iri, vocab + key, literal(value));
    if (a.mappingReviewStatus)
      add(a.iri, vocab + "mappingReviewStatus", literal(a.mappingReviewStatus));
    // Source-owned structural projection only. Educational/editorial claims stay reified and unapproved.
    if (
      a.originKind === "source-projection" &&
      a.supportKind === "direct-source-structure" &&
      a.evidenceKind === "observed"
    )
      add(a.subjectIri, vocab + a.predicate, named(a.objectIri));
  }
  return quads;
}
/** Administrative offline census only. Never merge this named graph into teacher/student query datasets. */
export function toMathOntologyAdminCensusQuads(
  dataset: MathOntologySourceDataset,
): readonly MathOntologySourceQuad[] {
  const graph = named(
    `urn:todaymath:math-source:admin-census:${dataset.payloadHash.slice(7)}`,
  );
  const quads: MathOntologySourceQuad[] = [];
  const vocab = MATH_ONTOLOGY_SOURCE_VOCAB;
  const add = (
    subject: string,
    predicate: string,
    object: MathOntologySourceRdfTerm,
  ) =>
    quads.push({
      subject: named(subject),
      predicate: named(predicate),
      object,
      graph,
    });
  for (const c of dataset.coverage) {
    const iri = `${graph.value}:coverage:${encodeURIComponent(c.namespace)}`;
    add(iri, rdf + "type", named(vocab + "SourceCoverage"));
    add(iri, vocab + "nativeNamespace", literal(c.namespace));
    for (const [key, value] of Object.entries(c)) {
      if (key === "namespace") continue;
      add(iri, vocab + key, literal(value === null ? "unknown" : value));
    }
  }
  return quads;
}
function term(term: MathOntologySourceRdfTerm): string {
  return term.termType === "NamedNode"
    ? `<${term.value}>`
    : `${JSON.stringify(term.value)}^^<${term.datatype.value}>`;
}
export function sourceQuadToNQuad(q: MathOntologySourceQuad): string {
  return `${term(q.subject)} ${term(q.predicate)} ${term(q.object)} ${term(q.graph)} .`;
}
/** Deterministic serialization of this blank-node-free source transport; formal worker owns RDF dataset canonicalization. */
export function sourceQuadsToNQuads(
  quads: readonly MathOntologySourceQuad[],
): string {
  return (
    [
      ...new Set(
        quads.map(
          (q) =>
            `${term(q.subject)} ${term(q.predicate)} ${term(q.object)} ${term(q.graph)} .`,
        ),
      ),
    ]
      .sort(compareSourceStrings)
      .join("\n") + "\n"
  );
}
