import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { collectMathOntologyRepoSources } from "./collect";
import { assembleMathOntologySources } from "@/lib/math-ontology/sources/assembler";
import {
  encodeMathOntologySourceBundle,
  sourceBundleRelativePaths,
} from "@/lib/math-ontology/sources/bundle";
import { mathOntologyAdminSourceCoverageRows } from "@/lib/math-ontology/sources/registry";
import { writeCanonicalSourceNQuads } from "./writeNQuads";
const arg = (name: string) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
};
async function main() {
  const repo = resolve(arg("--repo") ?? process.cwd()),
    outputRoot = resolve(arg("--output-dir") ?? repo);
  const envelope = collectMathOntologyRepoSources(repo);
  const expected = arg("--expected-payload-hash");
  if (expected && expected !== envelope.payloadHash)
    throw new Error(
      "Actual source metadata differs from approved payload hash",
    );
  const bundle = encodeMathOntologySourceBundle(envelope),
    paths = sourceBundleRelativePaths(envelope.payloadHash);
  for (const [path, bytes] of [
    [paths.artifact, bundle.artifact],
    [paths.manifest, bundle.manifestBytes],
  ] as const) {
    const output = resolve(outputRoot, path);
    if (process.argv.includes("--check")) {
      if (!readFileSync(output).equals(bytes))
        throw new Error("Committed source package is stale");
    } else {
      mkdirSync(dirname(output), { recursive: true });
      writeFileSync(output, bytes);
    }
  }
  const dataset = assembleMathOntologySources(envelope, {
    expectedPayloadHash: envelope.payloadHash,
  });
  const nquads = arg("--nquads");
  const rdf = nquads
    ? await writeCanonicalSourceNQuads(dataset, resolve(nquads))
    : null;
  const receipt = {
    payloadHash: envelope.payloadHash,
    manifestByteHash: bundle.manifestByteHash,
    paths,
    descriptor: bundle.descriptor,
    entities: dataset.entities.length,
    assertions: dataset.assertions.length,
    inputFiles: dataset.inputManifest.length,
    rdf,
    coverage: mathOntologyAdminSourceCoverageRows(dataset.coverage),
  };
  if (arg("--receipt"))
    writeFileSync(
      resolve(arg("--receipt")!),
      JSON.stringify(receipt, null, 2) + "\n",
    );
  console.log(
    JSON.stringify({
      payloadHash: envelope.payloadHash,
      manifestByteHash: bundle.manifestByteHash,
      entities: dataset.entities.length,
      assertions: dataset.assertions.length,
      inputFiles: dataset.inputManifest.length,
      rdf,
    }),
  );
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
