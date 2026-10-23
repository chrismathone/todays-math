import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import type { MathOntologySourceDataset } from "@/contracts/mathOntologySource.contract";
import {
  projectMathOntologyPublicSources,
  type MathOntologyPublicSourceProjection,
} from "@/lib/math-ontology/sources/publicProjection";
import {
  canonicalSourceJson,
  sourceByteDigest,
  compareSourceStrings,
} from "@/lib/math-ontology/sources/canonical";
import {
  publicMathOntologySourceQuads,
  sourceQuadsToNQuads,
} from "@/lib/math-ontology/sources/rdf";
import {
  sourcePartitionKey,
  sourcePartitionManifestPath,
  sourcePartitionManifestSchema,
  type MathOntologySourcePartitionArtifact,
} from "@/lib/math-ontology/sources/partitions";
/** Offline release builder: all original foci once, endpoint metadata repeated only as explicit dependencies. */
export function writeSourcePartitions(
  dataset: MathOntologySourceDataset,
  outputRoot: string,
) {
  const projection = projectMathOntologyPublicSources(dataset),
    root = sourcePartitionManifestPath(projection.projectionHash).replace(
      "manifest.json",
      "",
    );
  const byIri = new Map(projection.entities.map((e) => [e.iri, e]));
  const groups = new Map<
    string,
    {
      entities: (typeof projection.entities)[number][];
      assertions: (typeof projection.assertions)[number][];
    }
  >();
  const group = (key: string) => {
    let value = groups.get(key);
    if (!value) {
      value = { entities: [], assertions: [] };
      groups.set(key, value);
    }
    return value;
  };
  for (const e of projection.entities)
    group(sourcePartitionKey(e.namespace, e.stableIri)).entities.push(e);
  const indexes = new Map<string, [string, string][]>();
  for (const a of projection.assertions) {
    const subject = byIri.get(a.subjectIri)!;
    const key = sourcePartitionKey(subject.namespace, subject.stableIri);
    group(key).assertions.push(a);
    const b = sourceByteDigest(a.iri).slice(7, 8);
    const index = indexes.get(b) ?? [];
    index.push([a.iri, key]);
    indexes.set(b, index);
  }
  const artifact = (
    path: string,
    raw: Buffer,
  ): MathOntologySourcePartitionArtifact => {
    if (raw.length > 64 * 1024 * 1024)
      throw new Error("Source shard exceeds bounded runtime budget");
    const compressed = gzipSync(raw, { level: 9 });
    const full = resolve(outputRoot, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, compressed);
    return {
      path,
      byteHash: sourceByteDigest(compressed),
      rawByteHash: sourceByteDigest(raw),
      bytes: compressed.length,
      rawBytes: raw.length,
    };
  };
  const partitions = [];
  let totalQuads = 0;
  for (const [key, g] of [...groups].sort(([a], [b]) =>
    compareSourceStrings(a, b),
  )) {
    const dependencies = new Map(g.entities.map((e) => [e.iri, e]));
    for (const a of g.assertions) {
      dependencies.set(a.subjectIri, byIri.get(a.subjectIri)!);
      dependencies.set(a.objectIri, byIri.get(a.objectIri)!);
    }
    const slice: MathOntologyPublicSourceProjection = {
      projectionHash: projection.projectionHash,
      entities: [...dependencies.values()].sort((a, b) =>
        compareSourceStrings(a.iri, b.iri),
      ),
      assertions: g.assertions,
    };
    const nq = sourceQuadsToNQuads(publicMathOntologySourceQuads(slice));
    const quads = nq === "" ? 0 : nq.split("\n").length - 1;
    totalQuads += quads;
    const transport = {
      format: "math-source-projection-shard-1",
      key,
      primaryEntityIris: g.entities.map((e) => e.iri),
      primaryAssertionIris: g.assertions.map((a) => a.iri),
      ...slice,
    };
    partitions.push({
      key,
      primaryEntities: g.entities.length,
      primaryAssertions: g.assertions.length,
      dependencyEntities: dependencies.size - g.entities.length,
      quads,
      nquads: artifact(root + key + ".nq.gz", Buffer.from(nq)),
      projection: artifact(
        root + key + ".projection.gz",
        Buffer.from(canonicalSourceJson(transport) + "\n"),
      ),
    });
  }
  const assertionIndexes = [...indexes]
    .sort(([a], [b]) => compareSourceStrings(a, b))
    .map(([bucket, rows]) =>
      artifact(
        root + "assertion-index/" + bucket + ".index.gz",
        Buffer.from(
          canonicalSourceJson(
            rows.sort(([a], [b]) => compareSourceStrings(a, b)),
          ) + "\n",
        ),
      ),
    );
  const manifest = sourcePartitionManifestSchema.parse({
    format: "math-source-partitions-1",
    projectionHash: projection.projectionHash,
    routing: "namespace-sha256-stable-iri-first-hex-1",
    entities: projection.entities.length,
    assertions: projection.assertions.length,
    quadCount: totalQuads,
    partitions,
    assertionIndexes,
  });
  const bytes = Buffer.from(canonicalSourceJson(manifest) + "\n");
  const path = sourcePartitionManifestPath(projection.projectionHash);
  mkdirSync(dirname(resolve(outputRoot, path)), { recursive: true });
  writeFileSync(resolve(outputRoot, path), bytes);
  return { path, manifestByteHash: sourceByteDigest(bytes), manifest };
}
