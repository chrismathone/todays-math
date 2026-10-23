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
import {
  publicSourceRecordValue,
  publicSourceAssertionValue,
} from "./publicProjection";
type UnversionedPayload = Omit<MathOntologySourcePayload, "versions">;
const recordKey = (ref: MathOntologySourceRef) =>
  canonicalSourceJson([ref.namespace, ref.scope, ref.nativeId]);
function familyVersion(
  namespace: string,
  records: MathOntologySourcePayload["records"],
  inputs: MathOntologySourcePayload["inputs"],
) {
  const paths = new Set<string>();
  for (const row of records) {
    paths.add(row.origin.repositoryPath);
    for (const label of row.labels ?? [])
      paths.add(label.origin.repositoryPath);
    for (const reference of row.nativeReferences ?? [])
      paths.add(reference.origin.repositoryPath);
  }
  const sourceInputs = inputs.filter(
    (input) =>
      paths.has(input.path) ||
      input.path.startsWith("scripts/ontology/") ||
      input.path.startsWith("src/lib/math-ontology/") ||
      input.path === "src/contracts/mathOntologySource.contract.ts",
  );
  return sourceDigest({
    adapterVersion: "repo-sources-1",
    namespace,
    sourceInputs,
    records,
  });
}
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
  const versions = MATH_ONTOLOGY_SOURCE_NAMESPACES.map((namespace) => ({
    namespace,
    sourceVersion: familyVersion(
      namespace,
      records.filter((r) => r.namespace === namespace),
      inputs,
    ),
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
      (record.sourceProvenance === "imported-source" ||
        record.sourceProvenance === "unknown") &&
      record.distribution !== "quarantine-reference"
    )
      throw new Error(
        "Imported or unknown source cannot be published by the metadata adapter",
      );
    if (
      record.metadata.licenseStatus === "unknown" &&
      record.distribution !== "quarantine-reference"
    )
      throw new Error("Unknown license source must remain quarantined");
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
    for (const reference of record.nativeReferences ?? []) {
      if (
        paths.get(reference.origin.repositoryPath) !== reference.origin.byteHash
      )
        throw new Error("Native reference/source hash mismatch");
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
  // Every eligible version binds only its own namespace AND scope projection.
  // Foreign source rows cannot change a global version or its query/cache identity.
  const eligibleVersions = new Map<string, string>();
  for (const record of envelope.payload.records) {
    const key = canonicalSourceJson([record.namespace, record.scope]);
    if (eligibleVersions.has(key)) continue;
    eligibleVersions.set(
      key,
      sourceDigest({
        adapterVersion: envelope.payload.adapterVersion,
        namespace: record.namespace,
        scope: record.scope,
        records: envelope.payload.records
          .filter(
            (r) =>
              r.namespace === record.namespace &&
              r.scope === record.scope &&
              r.distribution !== "quarantine-reference",
          )
          .map(publicSourceRecordValue),
      }),
    );
  }
  const entities = envelope.payload.records.map((record) => {
    const sourceVersion =
      record.distribution === "quarantine-reference"
        ? versions.get(record.namespace)!
        : eligibleVersions.get(
            canonicalSourceJson([record.namespace, record.scope]),
          )!;
    return {
      ...record,
      stableIri: sourceEntityIri(record),
      iri: sourceEntityVersionIri(record, sourceVersion),
      sourceVersion,
    };
  });
  const byRef = new Map(entities.map((e) => [recordKey(e), e]));
  const assertions = envelope.payload.assertions.map((a) => {
    const scope = a.origin.repositoryPath;
    const sourceVersion = sourceDigest({
      assertion:
        byRef.get(recordKey(a.subject))!.distribution !==
          "quarantine-reference" &&
        byRef.get(recordKey(a.object))!.distribution !== "quarantine-reference"
          ? publicSourceAssertionValue(a)
          : a,
      subjectVersion: byRef.get(recordKey(a.subject))!.sourceVersion,
      objectVersion: byRef.get(recordKey(a.object))!.sourceVersion,
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
