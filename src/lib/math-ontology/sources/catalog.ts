import { readFileSync, realpathSync } from "node:fs";
import { resolve, sep } from "node:path";
import { loadMathOntologySourceBundle } from "./bundle";
import type { MathOntologySourceDigest } from "@/contracts/mathOntologySource.contract";
/** Node runtime/import integration. Request handlers must supply pins from their approved release identity. */
export function loadBundledMathOntologySources(
  pins: {
    expectedManifestByteHash: MathOntologySourceDigest | string;
    expectedPayloadHash: MathOntologySourceDigest | string;
  },
  repositoryRoot = process.cwd(),
) {
  const root = realpathSync(repositoryRoot);
  return loadMathOntologySourceBundle((path) => {
    if (
      !/^ontology\/source-manifests\/v1\/[a-f0-9]{64}\.(manifest\.json|json\.gz)$/.test(
        path,
      )
    )
      throw new Error("Unexpected bundled source path");
    const file = realpathSync(resolve(root, path));
    if (!file.startsWith(root + sep))
      throw new Error("Source artifact escapes package");
    return readFileSync(file);
  }, pins);
}

import { statSync } from "node:fs";
import {
  loadSourcePartitionManifest,
  readSourcePartitionArtifact,
  type MathOntologySourcePartitionManifest,
} from "./partitions";
/** Bounded immutable runtime path. Unlike the administrative bundle loader this never reassembles the full population. */
export function loadBundledMathOntologySourcePartitions(
  pins: { projectionHash: string; manifestByteHash: string },
  repositoryRoot = process.cwd(),
) {
  const root = realpathSync(repositoryRoot);
  const read = (path: string) => {
    if (
      !/^ontology\/source-manifests\/public-v1\/[a-f0-9]{64}\/(?:manifest\.json|[a-z0-9-]+\/[a-f0-9]\.(?:nq|projection|index)\.gz)$/.test(
        path,
      )
    )
      throw new Error("Unexpected source partition path");
    const file = realpathSync(resolve(root, path));
    if (!file.startsWith(root + sep) || statSync(file).size > 16 * 1024 * 1024)
      throw new Error("Source partition escapes package or byte budget");
    return readFileSync(file);
  };
  const manifest = loadSourcePartitionManifest(read, pins);
  return Object.freeze({
    manifest,
    read,
    readArtifact: (
      artifact: MathOntologySourcePartitionManifest["partitions"][number]["projection"],
    ) => readSourcePartitionArtifact(read, manifest, artifact),
  });
}
