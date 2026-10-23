import { gunzipSync } from "node:zlib";
import { z } from "zod";
import {
  mathOntologySourceDigestSchema,
  MATH_ONTOLOGY_SOURCE_NAMESPACES,
} from "@/contracts/mathOntologySource.contract";
import { sourceByteDigest, freezeSourceValue } from "./canonical";
const verifiedManifests = new WeakSet<object>();
const MAX_RAW = 64 * 1024 * 1024;
export const sourcePartitionArtifactSchema = z.strictObject({
  path: z
    .string()
    .regex(
      /^ontology\/source-manifests\/public-v1\/[a-f0-9]{64}\/[a-z0-9-]+\/[a-f0-9]\.(?:nq|projection|index)\.gz$/,
    ),
  byteHash: mathOntologySourceDigestSchema,
  rawByteHash: mathOntologySourceDigestSchema,
  bytes: z
    .number()
    .int()
    .nonnegative()
    .max(16 * 1024 * 1024),
  rawBytes: z.number().int().nonnegative().max(MAX_RAW),
});
export const sourcePartitionManifestSchema = z.strictObject({
  format: z.literal("math-source-partitions-1"),
  projectionHash: mathOntologySourceDigestSchema,
  routing: z.literal("namespace-sha256-stable-iri-first-hex-1"),
  entities: z.number().int().nonnegative(),
  assertions: z.number().int().nonnegative(),
  quadCount: z.number().int().nonnegative(),
  partitions: z.array(
    z.strictObject({
      key: z.string().regex(/^[a-z0-9-]+\/[a-f0-9]$/),
      primaryEntities: z.number().int().nonnegative(),
      primaryAssertions: z.number().int().nonnegative(),
      dependencyEntities: z.number().int().nonnegative(),
      quads: z.number().int().nonnegative(),
      nquads: sourcePartitionArtifactSchema,
      projection: sourcePartitionArtifactSchema,
    }),
  ),
  assertionIndexes: z.array(sourcePartitionArtifactSchema),
});
export type MathOntologySourcePartitionManifest = z.infer<
  typeof sourcePartitionManifestSchema
>;
export type MathOntologySourcePartitionArtifact = z.infer<
  typeof sourcePartitionArtifactSchema
>;
export function sourcePartitionKey(namespace: string, stableIri: string) {
  if (
    !(MATH_ONTOLOGY_SOURCE_NAMESPACES as readonly string[]).includes(namespace)
  )
    throw new Error("Unknown source namespace");
  return namespace + "/" + sourceByteDigest(stableIri).slice(7, 8);
}
export function sourcePartitionManifestPath(projectionHash: string) {
  mathOntologySourceDigestSchema.parse(projectionHash);
  return (
    "ontology/source-manifests/public-v1/" +
    projectionHash.slice(7) +
    "/manifest.json"
  );
}
/** Server release pins are authoritative. A client/model cannot select a different manifest. */
export function loadSourcePartitionManifest(
  read: (path: string) => Uint8Array,
  pins: { projectionHash: string; manifestByteHash: string },
) {
  mathOntologySourceDigestSchema.parse(pins.manifestByteHash);
  const bytes = read(sourcePartitionManifestPath(pins.projectionHash));
  if (sourceByteDigest(bytes) !== pins.manifestByteHash)
    throw new Error("Source partition manifest pin mismatch");
  const value = sourcePartitionManifestSchema.parse(
    JSON.parse(Buffer.from(bytes).toString("utf8")),
  );
  if (value.projectionHash !== pins.projectionHash)
    throw new Error("Source projection mismatch");
  const prefix = sourcePartitionManifestPath(pins.projectionHash).replace(
    "manifest.json",
    "",
  );
  const keys = new Set<string>();
  for (const p of value.partitions) {
    if (keys.has(p.key)) throw new Error("Duplicate partition");
    keys.add(p.key);
    if (
      p.nquads.path !== prefix + p.key + ".nq.gz" ||
      p.projection.path !== prefix + p.key + ".projection.gz"
    )
      throw new Error("Partition path mismatch");
  }
  for (const a of value.assertionIndexes)
    if (!a.path.startsWith(prefix + "assertion-index/"))
      throw new Error("Index path mismatch");
  if (
    value.partitions.reduce((s, p) => s + p.primaryEntities, 0) !==
      value.entities ||
    value.partitions.reduce((s, p) => s + p.primaryAssertions, 0) !==
      value.assertions
  )
    throw new Error("Partition primary population mismatch");
  verifiedManifests.add(value);
  return freezeSourceValue(value);
}
/** Only descriptor objects from the pinned manifest may be read; arbitrary descriptor hashes are not authority. */
export function readSourcePartitionArtifact(
  read: (path: string) => Uint8Array,
  manifest: MathOntologySourcePartitionManifest,
  artifact: MathOntologySourcePartitionArtifact,
) {
  if (!verifiedManifests.has(manifest))
    throw new Error("Manifest was not loaded from pinned bytes");
  if (
    !manifest.partitions.some(
      (p) => p.nquads === artifact || p.projection === artifact,
    ) &&
    !manifest.assertionIndexes.includes(artifact)
  )
    throw new Error("Artifact not in pinned manifest");
  const compressed = read(artifact.path);
  if (
    compressed.length !== artifact.bytes ||
    sourceByteDigest(compressed) !== artifact.byteHash
  )
    throw new Error("Partition byte hash mismatch");
  const raw = gunzipSync(compressed, { maxOutputLength: artifact.rawBytes });
  if (
    raw.length !== artifact.rawBytes ||
    sourceByteDigest(raw) !== artifact.rawByteHash
  )
    throw new Error("Partition raw hash mismatch");
  return raw;
}
