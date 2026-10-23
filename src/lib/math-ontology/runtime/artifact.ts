import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Parser, Store } from "n3";
import {
  mathOntologyArtifactSchema,
  mathOntologyGraphIdentitySchema,
  MATH_ONTOLOGY_HASH_KEYS,
  type MathOntologyArtifact,
  type MathOntologyGraphIdentity,
} from "@/contracts/mathOntology.contract";
import {
  canonicalOntologyJson,
  freezeOntology,
  ontologyDigest,
} from "../compiler/canonical";
import { checkOntologyProofs } from "../proof/check";
import { validateOntologyCore } from "../validation/core";

export function verifyOntologyArtifact(
  value: unknown,
  expected: MathOntologyGraphIdentity,
): MathOntologyArtifact {
  const artifact = mathOntologyArtifactSchema.parse(value);
  if (
    canonicalOntologyJson(artifact.identity) !==
    canonicalOntologyJson(mathOntologyGraphIdentitySchema.parse(expected))
  )
    throw new Error("RELEASE_IDENTITY_MISMATCH");
  let bytes = 0;
  for (const key of MATH_ONTOLOGY_HASH_KEYS) {
    bytes += Buffer.byteLength(artifact.files[key]);
    if (ontologyDigest(artifact.files[key]) !== expected.hashes[key])
      throw new Error(`ARTIFACT_HASH_MISMATCH:${key}`);
  }
  if (bytes > 192 * 1024 * 1024) throw new Error("ARTIFACT_BUDGET");
  const { graphVersion, ...unsigned } = artifact.identity;
  if (ontologyDigest(canonicalOntologyJson(unsigned)) !== graphVersion)
    throw new Error("MANIFEST_HASH_MISMATCH");
  const model = readFileSync(
    resolve(process.cwd(), "ontology/model/tm-owlrl-1.ttl"),
    "utf8",
  );
  const runtime = readFileSync(
    resolve(process.cwd(), "ontology/shapes/runtime-core.ttl"),
    "utf8",
  );
  const full = readFileSync(
    resolve(process.cwd(), "ontology/shapes/full.ttl"),
    "utf8",
  );
  const rules = readFileSync(
    resolve(process.cwd(), "ontology/rules/profile.json"),
    "utf8",
  );
  if (
    artifact.files.ontology !== model ||
    artifact.files.rules !== rules ||
    artifact.files.shapes !== canonicalOntologyJson({ runtime, full })
  )
    throw new Error("UNSUPPORTED_RELEASE_POLICY");
  const engine = JSON.parse(artifact.files.engine);
  if (
    canonicalOntologyJson(engine.packages) !==
    canonicalOntologyJson({
      rdflib: "7.6.0",
      owlrl: "7.6.2",
      pyshacl: "0.40.1",
    })
  )
    throw new Error("UNSUPPORTED_ENGINE_LOCK");
  const reports = JSON.parse(artifact.files.report);
  if (
    ![reports.raw, reports.closure].every(
      (r) => r?.conforms === true && r.incomplete === false,
    )
  )
    throw new Error("INCOMPLETE_RELEASE_VALIDATION");
  return freezeOntology(artifact);
}

/** Each factory result owns one fixed version; mutable stores never leave its closure. */
export async function loadOntologyRuntime(
  value: unknown,
  expected: MathOntologyGraphIdentity,
) {
  const artifact = verifyOntologyArtifact(value, expected);
  const parse = (text: string, format = "N-Quads") =>
    new Store(new Parser({ format }).parse(text));
  const registry = parse(artifact.files.registry),
    asserted = parse(artifact.files.asserted),
    closure = parse(artifact.files.closure),
    model = parse(artifact.files.ontology, "text/turtle");
  const proofs = checkOntologyProofs(
    JSON.parse(artifact.files.proof),
    JSON.parse(artifact.files.review),
    model,
    closure,
  );
  const shapes = JSON.parse(artifact.files.shapes).runtime as string;
  const validation = await validateOntologyCore(
    new Store([...registry, ...asserted]),
    shapes,
  );
  if (!validation.conforms || validation.incomplete)
    throw new Error("RUNTIME_SHACL_VIOLATION");
  const coverage = freezeOntology(
    JSON.parse(artifact.files.coverage),
  ) as Readonly<{
    scope: string;
    registryTriples: number;
    engineInferredTriples: number;
    witnessedInferredTriples: number;
    untracedInferredTriples: number;
  }>;
  return Object.freeze({
    identity: artifact.identity,
    coverage,
    validation: freezeOntology(validation),
    // Request-specific API receives fresh copies. No caller can mutate the cached store.
    datasets: () => ({
      registry: new Store(registry),
      asserted: new Store(asserted),
      closure: new Store(closure),
    }),
    proofs: () => freezeOntology(structuredClone(proofs)),
    shapes,
  });
}
export type MathOntologyRuntime = Awaited<
  ReturnType<typeof loadOntologyRuntime>
>;
export function createOntologyRuntimeFactory(maxEntries = 2) {
  const cache = new Map<string, Promise<MathOntologyRuntime>>();
  return Object.freeze({
    async load(value: unknown, expected: MathOntologyGraphIdentity) {
      // Recheck bytes even for a cache hit; the caller cannot substitute a damaged bundle.
      verifyOntologyArtifact(value, expected);
      let runtime = cache.get(expected.graphVersion);
      if (!runtime) {
        runtime = loadOntologyRuntime(value, expected);
        cache.set(expected.graphVersion, runtime);
        while (cache.size > maxEntries)
          cache.delete(cache.keys().next().value!);
      }
      try {
        return await runtime;
      } catch (error) {
        cache.delete(expected.graphVersion);
        throw error;
      }
    },
  });
}
