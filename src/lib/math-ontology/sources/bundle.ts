import { gzipSync, gunzipSync } from "node:zlib";
import { z } from "zod";
import {
  mathOntologySourceDigestSchema,
  type MathOntologySourceEnvelope,
  type MathOntologySourceDigest,
} from "@/contracts/mathOntologySource.contract";
import { assembleMathOntologySources } from "./assembler";
import {
  canonicalSourceJson,
  sourceByteDigest,
  freezeSourceValue,
} from "./canonical";
const descriptorSchema = z.strictObject({
  format: z.literal("math-source-gzip-1"),
  payloadHash: mathOntologySourceDigestSchema,
  artifactByteHash: mathOntologySourceDigestSchema,
  uncompressedByteHash: mathOntologySourceDigestSchema,
  compressedBytes: z
    .number()
    .int()
    .positive()
    .max(20 * 1024 * 1024),
  uncompressedBytes: z
    .number()
    .int()
    .positive()
    .max(150 * 1024 * 1024),
});
export function sourceBundleRelativePaths(
  payloadHash: MathOntologySourceDigest | string,
) {
  mathOntologySourceDigestSchema.parse(payloadHash);
  const prefix = `ontology/source-manifests/v1/${payloadHash.slice(7)}`;
  return { artifact: prefix + ".json.gz", manifest: prefix + ".manifest.json" };
}
/** Build-time only. Immutable filenames derive from the sealed payload, not a mutable active-graph pointer. */
export function encodeMathOntologySourceBundle(
  envelope: MathOntologySourceEnvelope,
) {
  assembleMathOntologySources(envelope, {
    expectedPayloadHash: envelope.payloadHash,
  });
  const bytes = Buffer.from(canonicalSourceJson(envelope) + "\n", "utf8");
  const artifact = gzipSync(bytes, { level: 9 });
  const descriptor = descriptorSchema.parse({
    format: "math-source-gzip-1",
    payloadHash: envelope.payloadHash,
    artifactByteHash: sourceByteDigest(artifact),
    uncompressedByteHash: sourceByteDigest(bytes),
    compressedBytes: artifact.length,
    uncompressedBytes: bytes.length,
  });
  const manifestBytes = Buffer.from(
    canonicalSourceJson(descriptor) + "\n",
    "utf8",
  );
  return {
    artifact,
    descriptor,
    manifestBytes,
    manifestByteHash: sourceByteDigest(manifestBytes),
  };
}
/** Pins come from the server's approved immutable release. Never accept them from request/model arguments. */
export function loadMathOntologySourceBundle(
  read: (path: string) => Uint8Array,
  pins: {
    expectedManifestByteHash: MathOntologySourceDigest | string;
    expectedPayloadHash: MathOntologySourceDigest | string;
  },
) {
  mathOntologySourceDigestSchema.parse(pins.expectedManifestByteHash);
  const paths = sourceBundleRelativePaths(pins.expectedPayloadHash),
    manifestBytes = read(paths.manifest);
  if (sourceByteDigest(manifestBytes) !== pins.expectedManifestByteHash)
    throw new Error(
      "Source manifest byte hash does not match approved release",
    );
  const descriptor = descriptorSchema.parse(
    JSON.parse(Buffer.from(manifestBytes).toString("utf8")),
  );
  if (descriptor.payloadHash !== pins.expectedPayloadHash)
    throw new Error("Source manifest payload hash mismatch");
  const artifact = read(paths.artifact);
  if (
    artifact.length !== descriptor.compressedBytes ||
    sourceByteDigest(artifact) !== descriptor.artifactByteHash
  )
    throw new Error("Source artifact byte hash mismatch");
  const bytes = gunzipSync(artifact, {
    maxOutputLength: descriptor.uncompressedBytes,
  });
  if (
    bytes.length !== descriptor.uncompressedBytes ||
    sourceByteDigest(bytes) !== descriptor.uncompressedByteHash
  )
    throw new Error("Source uncompressed byte hash mismatch");
  return freezeSourceValue(
    assembleMathOntologySources(JSON.parse(bytes.toString("utf8")), {
      expectedPayloadHash: pins.expectedPayloadHash,
    }),
  );
}
