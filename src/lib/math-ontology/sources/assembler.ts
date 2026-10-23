import {
  MATH_ONTOLOGY_SOURCE_NAMESPACES,
  mathOntologySourcePayloadSchema,
  mathOntologySourceEnvelopeSchema,
  type MathOntologySourcePayload,
  type MathOntologySourceEnvelope,
  type MathOntologySourceDataset,
  type MathOntologySourceCoverage,
  type MathOntologySourceRef,
  type MathOntologySourceDigest,
} from "@/contracts/mathOntologySource.contract";
import {
  sourceEntityIri,
  sourceEntityVersionIri,
  sourceAssertionIri,
  sourceAssertionVersionIri,
} from "../ids";
import {
  canonicalSourceJson,
  compareSourceStrings,
  sourceDigest,
  sourceByteDigest,
  freezeSourceValue,
} from "./canonical";
type UnversionedPayload = Omit<MathOntologySourcePayload, "versions">;
const recordKey = (ref: MathOntologySourceRef) =>
  canonicalSourceJson([ref.namespace, ref.scope, ref.nativeId]);
function canonicalPayload(
  input: UnversionedPayload,
): MathOntologySourcePayload {
  const inputs = [...input.inputs].sort((a, b) =>
    compareSourceStrings(a.path, b.path),
  );
  const records = [...input.records].sort((a, b) =>
    compareSourceStrings(recordKey(a), recordKey(b)),
  );
  const assertions = [...input.assertions].sort((a, b) =>
    compareSourceStrings(a.nativeId, b.nativeId),
  );
  const expectedCoverage = [...input.expectedCoverage].sort((a, b) =>
    compareSourceStrings(a.namespace, b.namespace),
  );
  const inputHash = sourceDigest(inputs);
  const versions = MATH_ONTOLOGY_SOURCE_NAMESPACES.map((namespace) => ({
    namespace,
    sourceVersion: sourceDigest({
      adapterVersion: input.adapterVersion,
      namespace,
      inputHash,
      records: records.filter((r) => r.namespace === namespace),
    }),
  }));
  return mathOntologySourcePayloadSchema.parse({
    ...input,
    inputs,
    records,
    assertions,
    expectedCoverage,
    versions,
  });
}
function assertIntegrity(payload: MathOntologySourcePayload): void {
  const paths = new Map<string, string>();
  for (const input of payload.inputs) {
    if (paths.has(input.path))
      throw new Error(`Duplicate input path: ${input.path}`);
    paths.set(input.path, input.byteHash);
  }
  const ids = new Set<string>();
  for (const record of payload.records) {
    const key = recordKey(record);
    if (ids.has(key)) throw new Error(`Duplicate source entity: ${key}`);
    ids.add(key);
    if (paths.get(record.origin.repositoryPath) !== record.origin.byteHash)
      throw new Error(`Source byte hash/coordinate mismatch: ${key}`);
    if (
      record.distribution === "public-official-metadata" &&
      (record.sourceProvenance !== "official-document" ||
        !record.origin.upstreamByteHash ||
        !record.origin.publicSourceIri)
    )
      throw new Error(
        "Official metadata requires verified upstream byte provenance",
      );
    if (
      record.sourceProvenance === "imported-source" &&
      record.distribution !== "quarantine-reference"
    )
      throw new Error(
        "Imported source cannot be published by the metadata adapter",
      );
    if (record.distribution === "quarantine-reference" && record.labels?.length)
      throw new Error(
        "Quarantined imported labels cannot enter the source package",
      );
    for (const label of record.labels ?? []) {
      if (
        sourceByteDigest(label.value) !== label.sourceTextHash ||
        paths.get(label.origin.repositoryPath) !== label.origin.byteHash
      )
        throw new Error("Label/source text hash correspondence mismatch");
    }
  }
  const assertionIds = new Set<string>();
  for (const a of payload.assertions) {
    if (assertionIds.has(a.nativeId))
      throw new Error(`Duplicate source assertion: ${a.nativeId}`);
    assertionIds.add(a.nativeId);
    if (!ids.has(recordKey(a.subject)) || !ids.has(recordKey(a.object)))
      throw new Error(`Dangling source assertion: ${a.nativeId}`);
    if (paths.get(a.origin.repositoryPath) !== a.origin.byteHash)
      throw new Error("Assertion source hash mismatch");
  }
  const expected = new Map(
    payload.expectedCoverage.map((x) => [x.namespace, x.expected]),
  );
  const versions = new Map(
    payload.versions.map((x) => [x.namespace, x.sourceVersion]),
  );
  if (
    expected.size !== MATH_ONTOLOGY_SOURCE_NAMESPACES.length ||
    expected.size !== payload.expectedCoverage.length ||
    versions.size !== MATH_ONTOLOGY_SOURCE_NAMESPACES.length ||
    versions.size !== payload.versions.length
  )
    throw new Error("Omitted or duplicate whole source family");
  for (const namespace of MATH_ONTOLOGY_SOURCE_NAMESPACES) {
    if (
      !expected.has(namespace) ||
      !versions.has(namespace) ||
      payload.records.filter((r) => r.namespace === namespace).length !==
        expected.get(namespace)
    )
      throw new Error(`Source population mismatch: ${namespace}`);
  }
  const canonical = canonicalPayload(payload);
  if (
    canonicalSourceJson(canonical.versions) !==
    canonicalSourceJson(payload.versions)
  )
    throw new Error("Source version/input hash mismatch");
}
/** Offline import seals actual read metadata. Runtime additionally requires an independent release-bound hash. */
export function sealMathOntologySourcePayload(
  input: UnversionedPayload,
): MathOntologySourceEnvelope {
  const payload = canonicalPayload(input);
  assertIntegrity(payload);
  return { payloadHash: sourceDigest(payload), payload };
}
export function assembleMathOntologySources(
  value: unknown,
  options: { expectedPayloadHash: MathOntologySourceDigest | string },
): MathOntologySourceDataset {
  const envelope = mathOntologySourceEnvelopeSchema.parse(value);
  if (
    envelope.payloadHash !== options.expectedPayloadHash ||
    sourceDigest(envelope.payload) !== options.expectedPayloadHash
  )
    throw new Error("Source payload hash does not match pinned release");
  assertIntegrity(envelope.payload);
  const versions = new Map(
    envelope.payload.versions.map((v) => [v.namespace, v.sourceVersion]),
  );
  const entities = envelope.payload.records.map((record) => ({
    ...record,
    stableIri: sourceEntityIri(record),
    iri: sourceEntityVersionIri(record, versions.get(record.namespace)!),
    sourceVersion: versions.get(record.namespace)!,
  }));
  const byRef = new Map(entities.map((e) => [recordKey(e), e]));
  const inputVersion = sourceDigest(envelope.payload.inputs);
  const assertions = envelope.payload.assertions.map((a) => {
    const scope = a.origin.repositoryPath;
    const sourceVersion = sourceDigest({
      assertion: a,
      inputVersion,
      subjectVersion: versions.get(a.subject.namespace),
      objectVersion: versions.get(a.object.namespace),
    });
    return {
      ...a,
      stableIri: sourceAssertionIri({ nativeId: a.nativeId, scope }),
      iri: sourceAssertionVersionIri(
        { nativeId: a.nativeId, scope },
        sourceVersion,
      ),
      sourceVersion,
      subjectIri: byRef.get(recordKey(a.subject))!.iri,
      objectIri: byRef.get(recordKey(a.object))!.iri,
    };
  });
  const coverage: MathOntologySourceCoverage[] =
    envelope.payload.expectedCoverage.map(({ namespace, expected }) => {
      const rows = entities.filter((e) => e.namespace === namespace);
      return {
        namespace,
        expected,
        registered: rows.length,
        rdfEligible: rows.filter(
          (e) => e.distribution !== "quarantine-reference",
        ).length,
        quarantined: rows.filter(
          (e) => e.distribution === "quarantine-reference",
        ).length,
        sourceLinked: rows.length,
        reviewedEducationalRelations: 0,
        officialStandardMappings: 0,
        actualInstances: null,
        populationKind: rows[0]?.metadata.populationKind ?? "structural",
      };
    });
  return freezeSourceValue({
    payloadHash: envelope.payloadHash,
    entities,
    assertions,
    coverage,
    inputManifest: envelope.payload.inputs,
  });
}
