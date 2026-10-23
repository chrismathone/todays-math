import { describe, expect, it } from "vitest";
import {
  MATH_ONTOLOGY_SOURCE_NAMESPACES,
  type MathOntologySourceRecord,
} from "@/contracts/mathOntologySource.contract";
import {
  sealMathOntologySourcePayload,
  assembleMathOntologySources,
} from "@/lib/math-ontology/sources/assembler";
import { sourceByteDigest } from "@/lib/math-ontology/sources/canonical";
import {
  toMathOntologySourceQuads,
  sourceQuadsToNQuads,
} from "@/lib/math-ontology/sources/rdf";
const digest = `sha256:${"1".repeat(64)}` as const;
const origin = {
  repositoryPath: "prisma/seed-data/units.ts",
  pointer: "/0",
  byteHash: digest,
  extractorVersion: "repo-sources-1" as const,
};
const rec: MathOntologySourceRecord = {
  namespace: "curriculum-section",
  scope: "global",
  nativeId: "초3::same",
  kind: "Section",
  sourceProvenance: "native-source",
  origin,
  distribution: "native-metadata",
  edition: "unknown",
  metadata: { grade: "초3" },
};
function fixture(records: MathOntologySourceRecord[] = [rec]) {
  return sealMathOntologySourcePayload({
    schemaVersion: 1,
    adapterVersion: "repo-sources-1",
    inputs: [{ path: origin.repositoryPath, byteHash: digest, bytes: 10 }],
    records,
    assertions: [],
    expectedCoverage: MATH_ONTOLOGY_SOURCE_NAMESPACES.map((namespace) => ({
      namespace,
      expected: records.filter((r) => r.namespace === namespace).length,
    })),
  });
}
describe("immutable source assembler and RDF boundary", () => {
  it("keeps stable IDs but binds each immutable version and byte manifest", () => {
    const envelope = fixture();
    const dataset = assembleMathOntologySources(envelope, {
      expectedPayloadHash: envelope.payloadHash,
    });
    expect(dataset.entities[0].stableIri).not.toBe(dataset.entities[0].iri);
    expect(Object.isFrozen(dataset.entities[0].origin)).toBe(true);
    expect(sourceQuadsToNQuads(toMathOntologySourceQuads(dataset))).toContain(
      "urn:todaymath:vocab:versionOf",
    );
  });
  it("rejects tampered bytes even if a self-declared envelope digest is replaced", () => {
    const a = fixture();
    const b = fixture([{ ...rec, nativeId: "other" }]);
    expect(() =>
      assembleMathOntologySources(b, { expectedPayloadHash: a.payloadHash }),
    ).toThrow(/hash/i);
    expect(() =>
      assembleMathOntologySources(
        { ...a, payload: { ...a.payload, records: [] } },
        { expectedPayloadHash: a.payloadHash },
      ),
    ).toThrow(/hash/i);
  });
  it("rejects duplicates, omitted whole families and source-coordinate mismatches", () => {
    expect(() => fixture([rec, rec])).toThrow(/duplicate/i);
    const a = fixture();
    expect(() =>
      assembleMathOntologySources(
        {
          ...a,
          payload: {
            ...a.payload,
            expectedCoverage: a.payload.expectedCoverage.slice(1),
          },
        },
        { expectedPayloadHash: a.payloadHash },
      ),
    ).toThrow();
    expect(() =>
      fixture([
        { ...rec, origin: { ...origin, byteHash: `sha256:${"2".repeat(64)}` } },
      ]),
    ).toThrow(/source|hash/i);
  });
  it("blocks imported/private metadata from the RDF graph while retaining its census denominator", () => {
    const a = fixture([
      {
        ...rec,
        distribution: "quarantine-reference",
        sourceProvenance: "imported-source",
        nativeId: "PRIVATE-TEXTBOOK-ID",
      },
    ]);
    const d = assembleMathOntologySources(a, {
      expectedPayloadHash: a.payloadHash,
    });
    const nq = sourceQuadsToNQuads(toMathOntologySourceQuads(d));
    expect(nq).not.toContain("PRIVATE-TEXTBOOK-ID");
    expect(d.coverage.find((c) => c.namespace === rec.namespace)).toMatchObject(
      { registered: 1, rdfEligible: 0, quarantined: 1, actualInstances: null },
    );
  });
  it("preserves homonymous searchable labels and rejects manipulated label correspondence", () => {
    const label = {
      value: "같은 개념 이름",
      language: "ko" as const,
      sourceField: "term" as const,
      sourceTextHash: sourceByteDigest("같은 개념 이름"),
      origin,
    };
    const a = fixture([
      { ...rec, labels: [label] },
      { ...rec, nativeId: "another-id", edition: "2015", labels: [label] },
    ]);
    const d = assembleMathOntologySources(a, {
      expectedPayloadHash: a.payloadHash,
    });
    expect(d.entities.length).toBe(2);
    expect(sourceQuadsToNQuads(toMathOntologySourceQuads(d))).toContain(
      "같은 개념 이름",
    );
    expect(() =>
      fixture([{ ...rec, labels: [{ ...label, value: "altered" }] }]),
    ).toThrow(/label|hash/i);
    const b = fixture([
      {
        ...rec,
        labels: [
          {
            ...label,
            value: "altered",
            sourceTextHash: sourceByteDigest("altered"),
          },
        ],
      },
    ]);
    expect(() =>
      assembleMathOntologySources(b, { expectedPayloadHash: a.payloadHash }),
    ).toThrow(/hash/i);
  });
  it("is canonical across record insertion order and emits no sameAs", () => {
    const second = { ...rec, nativeId: "different" };
    const a = fixture([rec, second]),
      b = fixture([second, rec]);
    expect(a.payloadHash).toBe(b.payloadHash);
    expect(
      sourceQuadsToNQuads(
        toMathOntologySourceQuads(
          assembleMathOntologySources(a, {
            expectedPayloadHash: a.payloadHash,
          }),
        ),
      ),
    ).not.toContain("sameAs");
  });
});
