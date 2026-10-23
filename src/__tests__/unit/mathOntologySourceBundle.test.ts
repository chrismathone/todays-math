import { describe, expect, it } from "vitest";
import {
  MATH_ONTOLOGY_SOURCE_NAMESPACES,
  type MathOntologySourcePayload,
} from "@/contracts/mathOntologySource.contract";
import { sealMathOntologySourcePayload } from "@/lib/math-ontology/sources/assembler";
import {
  encodeMathOntologySourceBundle,
  loadMathOntologySourceBundle,
  sourceBundleRelativePaths,
} from "@/lib/math-ontology/sources/bundle";
const input: Omit<MathOntologySourcePayload, "versions"> = {
  schemaVersion: 1,
  adapterVersion: "repo-sources-1",
  inputs: [],
  records: [],
  assertions: [],
  expectedCoverage: MATH_ONTOLOGY_SOURCE_NAMESPACES.map((namespace) => ({
    namespace,
    expected: 0,
  })),
};
describe("release-pinned content-addressed source bundle", () => {
  it("is deterministic and validates artifact bytes, original bytes and caller-owned release pins", () => {
    const envelope = sealMathOntologySourcePayload(input),
      a = encodeMathOntologySourceBundle(envelope),
      b = encodeMathOntologySourceBundle(envelope);
    expect(a.artifact).toEqual(b.artifact);
    expect(a.manifestBytes).toEqual(b.manifestBytes);
    const paths = sourceBundleRelativePaths(envelope.payloadHash);
    const read = (p: string) =>
      p === paths.manifest ? a.manifestBytes : a.artifact;
    const d = loadMathOntologySourceBundle(read, {
      expectedPayloadHash: envelope.payloadHash,
      expectedManifestByteHash: a.manifestByteHash,
    });
    expect(d.entities).toEqual([]);
    expect(() =>
      loadMathOntologySourceBundle(() => new Uint8Array([1, 2, 3]), {
        expectedPayloadHash: envelope.payloadHash,
        expectedManifestByteHash: a.manifestByteHash,
      }),
    ).toThrow(/hash/i);
  });
  it("rejects self-redeclared metadata, label and envelope hashes against independent approved manifest pin", () => {
    const original = encodeMathOntologySourceBundle(
      sealMathOntologySourcePayload(input),
    );
    const changed = encodeMathOntologySourceBundle(
      sealMathOntologySourcePayload({
        ...input,
        inputs: [
          {
            path: "source.json",
            bytes: 1,
            byteHash: `sha256:${"f".repeat(64)}`,
          },
        ],
      }),
    );
    expect(() =>
      loadMathOntologySourceBundle(
        (p) =>
          p.endsWith(".manifest.json")
            ? changed.manifestBytes
            : changed.artifact,
        {
          expectedPayloadHash: changed.descriptor.payloadHash,
          expectedManifestByteHash: original.manifestByteHash,
        },
      ),
    ).toThrow(/hash/i);
  });
});
