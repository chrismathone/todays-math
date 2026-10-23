import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MATH_ONTOLOGY_SOURCE_NAMESPACES } from "@/contracts/mathOntologySource.contract";
import {
  sealMathOntologySourcePayload,
  assembleMathOntologySources,
} from "@/lib/math-ontology/sources/assembler";
import {
  toMathOntologySourceQuads,
  sourceQuadsToNQuads,
} from "@/lib/math-ontology/sources/rdf";
import { sourceByteDigest } from "@/lib/math-ontology/sources/canonical";
import { writeCanonicalSourceNQuads } from "../../../scripts/ontology/census/writeNQuads";
describe("actual bounded full-source RDF build step", () => {
  it("merges many tiny sorted chunks byte-exactly with the runtime RDF transport", async () => {
    const root = mkdtempSync(join(tmpdir(), "ontology-rdf-"));
    try {
      const path = "source.ts",
        byteHash = `sha256:${"a".repeat(64)}` as const;
      const envelope = sealMathOntologySourcePayload({
        schemaVersion: 1,
        adapterVersion: "repo-sources-1",
        inputs: [{ path, byteHash, bytes: 1 }],
        records: ["둘", "하나", "𠀀"].map((nativeId) => ({
          namespace: "curriculum-section" as const,
          scope: "global",
          nativeId,
          kind: "Section" as const,
          sourceProvenance: "native-source" as const,
          origin: {
            repositoryPath: path,
            pointer: "/" + nativeId,
            byteHash,
            extractorVersion: "repo-sources-1" as const,
          },
          distribution: "native-metadata" as const,
          edition: "unknown" as const,
          metadata: {},
        })),
        assertions: [],
        expectedCoverage: MATH_ONTOLOGY_SOURCE_NAMESPACES.map((namespace) => ({
          namespace,
          expected: namespace === "curriculum-section" ? 3 : 0,
        })),
      });
      const dataset = assembleMathOntologySources(envelope, {
        expectedPayloadHash: envelope.payloadHash,
      });
      const output = join(root, "actual.nq"),
        receipt = await writeCanonicalSourceNQuads(dataset, output, 256);
      const actual = readFileSync(output, "utf8");
      expect(actual).toBe(
        sourceQuadsToNQuads(toMathOntologySourceQuads(dataset)),
      );
      expect(receipt.byteHash).toBe(sourceByteDigest(actual));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
