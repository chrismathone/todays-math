import { it, expect } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  MATH_ONTOLOGY_SOURCE_NAMESPACES,
  type MathOntologySourceRecord,
} from "@/contracts/mathOntologySource.contract";
import {
  sealMathOntologySourcePayload,
  assembleMathOntologySources,
} from "@/lib/math-ontology/sources/assembler";
import { sourceByteDigest } from "@/lib/math-ontology/sources/canonical";
import { writeSourcePartitions } from "../../../scripts/ontology/census/writePartitions";
import {
  loadSourcePartitionManifest,
  readSourcePartitionArtifact,
} from "@/lib/math-ontology/sources/partitions";
it("packages every primary focus once, closes cross-partition endpoint metadata, and rejects unapproved/tampered artifacts", () => {
  const origin = {
    repositoryPath: "fixture.ts",
    pointer: "/0",
    byteHash: sourceByteDigest("fixture"),
    extractorVersion: "repo-sources-1" as const,
  };
  const base = {
    scope: "global",
    sourceProvenance: "native-source",
    distribution: "native-metadata",
    edition: "unknown",
    origin,
    metadata: {},
  } as const;
  const records: MathOntologySourceRecord[] = [
    {
      ...base,
      namespace: "bank-assessment",
      nativeId: "A",
      kind: "AssessmentEntry",
    },
    {
      ...base,
      namespace: "bank-definition",
      nativeId: "D",
      kind: "Definition",
    },
  ];
  const envelope = sealMathOntologySourcePayload({
    schemaVersion: 1,
    adapterVersion: "repo-sources-1",
    inputs: [{ path: "fixture.ts", byteHash: origin.byteHash, bytes: 7 }],
    records,
    assertions: [
      {
        nativeId: "A-D",
        subject: {
          namespace: "bank-assessment",
          scope: "global",
          nativeId: "A",
        },
        object: {
          namespace: "bank-definition",
          scope: "global",
          nativeId: "D",
        },
        predicate: "assessesDefinition",
        origin,
        originKind: "source-projection",
        supportKind: "direct-source-structure",
        evidenceKind: "observed",
        reviewState: "unreviewed",
        publicationState: "unpublished",
        partial: false,
      },
    ],
    expectedCoverage: MATH_ONTOLOGY_SOURCE_NAMESPACES.map((namespace) => ({
      namespace,
      expected: records.filter((r) => r.namespace === namespace).length,
    })),
  });
  const dataset = assembleMathOntologySources(envelope, {
    expectedPayloadHash: envelope.payloadHash,
  });
  const root = mkdtempSync(join(tmpdir(), "source-parts-"));
  try {
    const built = writeSourcePartitions(dataset, root);
    const read = (p: string) => readFileSync(join(root, p));
    const manifest = loadSourcePartitionManifest(read, {
      projectionHash: built.manifest.projectionHash,
      manifestByteHash: built.manifestByteHash,
    });
    expect(manifest.entities).toBe(2);
    expect(manifest.assertions).toBe(1);
    const shard = manifest.partitions.find((p) => p.primaryAssertions === 1)!;
    expect(shard.dependencyEntities).toBe(1);
    const data = JSON.parse(
      readSourcePartitionArtifact(read, manifest, shard.projection).toString(),
    );
    expect(data.primaryEntityIris).toHaveLength(1);
    expect(data.entities).toHaveLength(2);
    expect(
      readSourcePartitionArtifact(read, manifest, shard.nquads).toString(),
    ).toContain("assessesDefinition");
    expect(() =>
      readSourcePartitionArtifact(read, manifest, { ...shard.nquads }),
    ).toThrow(/pinned/);
    expect(() =>
      loadSourcePartitionManifest(read, {
        projectionHash: manifest.projectionHash,
        manifestByteHash: sourceByteDigest("not approved"),
      }),
    ).toThrow(/pin/);
    expect(() =>
      readSourcePartitionArtifact(
        () => Buffer.from("tamper"),
        manifest,
        shard.nquads,
      ),
    ).toThrow(/hash/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
