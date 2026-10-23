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
