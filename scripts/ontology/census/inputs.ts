import { readFileSync, realpathSync } from "node:fs";
import { resolve, sep } from "node:path";
import {
  mathOntologySourcePathSchema,
  type MathOntologySourceInput,
} from "@/contracts/mathOntologySource.contract";
import {
  sourceByteDigest,
  compareSourceStrings,
} from "@/lib/math-ontology/sources/canonical";
export interface RepoSourceReadPort {
  read(repositoryPath: string): Uint8Array;
}
export function createRepoSourceReadPort(root: string): RepoSourceReadPort {
  const realRoot = realpathSync(root);
  return {
    read(repositoryPath) {
      mathOntologySourcePathSchema.parse(repositoryPath);
      const file = realpathSync(resolve(realRoot, repositoryPath));
      if (!file.startsWith(realRoot + sep))
        throw new Error("Source path escapes repository");
      return readFileSync(file);
    },
  };
}
export function readSourceInputManifest(
  port: RepoSourceReadPort,
  paths: readonly string[],
): MathOntologySourceInput[] {
  if (new Set(paths).size !== paths.length)
    throw new Error("Duplicate source input paths");
  return [...paths].sort(compareSourceStrings).map((path) => {
    const bytes = port.read(path);
    return { path, bytes: bytes.byteLength, byteHash: sourceByteDigest(bytes) };
  });
}
export function verifySourceInputManifest(
  port: RepoSourceReadPort,
  expected: readonly MathOntologySourceInput[],
): MathOntologySourceInput[] {
  const actual = readSourceInputManifest(
    port,
    expected.map((x) => x.path),
  );
  const byPath = new Map(expected.map((x) => [x.path, x]));
  for (const input of actual) {
    const prior = byPath.get(input.path)!;
    if (prior.byteHash !== input.byteHash || prior.bytes !== input.bytes)
      throw new Error(`Source byte hash mismatch: ${input.path}`);
  }
  return actual;
}
