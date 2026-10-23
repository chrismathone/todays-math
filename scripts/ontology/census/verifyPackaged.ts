import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadBundledMathOntologySourcePartitions } from "@/lib/math-ontology/sources/catalog";
import { sourcePartitionKey } from "@/lib/math-ontology/sources/partitions";
import { sourceEntityIri } from "@/lib/math-ontology/ids";
import {
  publicMathOntologySourceQuads,
  sourceQuadsToNQuads,
} from "@/lib/math-ontology/sources/rdf";
import type { MathOntologyPublicSourceProjection } from "@/lib/math-ontology/sources/publicProjection";
const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  if (i < 0 || !process.argv[i + 1]) throw new Error("Missing " + name);
  return process.argv[i + 1];
};
/** Offline bounded byte/correspondence verifier, separate from formal SHACL/OWL/authority review. */
export function verifyPackagedMathOntologySources(
  root: string,
  pins: { projectionHash: string; manifestByteHash: string },
) {
  const source = loadBundledMathOntologySourcePartitions(pins, root),
    assertionRoutes = new Map<string, string>(),
    indexIds = new Set<string>(),
    entityIds = new Set<string>(),
    assertionIds = new Set<string>(),
    referenced = new Set<string>(),
    files = [];
  let semanticQuadCountWithDependencies = 0;
  for (const descriptor of source.manifest.partitions) {
    const projectionBytes = source.readArtifact(descriptor.projection),
      nqBytes = source.readArtifact(descriptor.nquads);
    const data = JSON.parse(
      projectionBytes.toString(),
    ) as MathOntologyPublicSourceProjection & {
      format: string;
      key: string;
      primaryEntityIris: string[];
      primaryAssertionIris: string[];
    };
    if (
      data.format !== "math-source-projection-shard-1" ||
      data.projectionHash !== pins.projectionHash ||
      data.key !== descriptor.key
    )
      throw new Error("Source shard coordinate mismatch");
    const local = new Map(data.entities.map((e) => [e.iri, e]));
    if (
      data.primaryEntityIris.length !== descriptor.primaryEntities ||
      data.primaryAssertionIris.length !== descriptor.primaryAssertions ||
      data.assertions.length !== descriptor.primaryAssertions ||
      data.entities.length !==
        descriptor.primaryEntities + descriptor.dependencyEntities
    )
      throw new Error("Source focus denominator mismatch");
    for (const iri of data.primaryEntityIris) {
      const e = local.get(iri);
      if (
        !e ||
        e.scope !== "global" ||
        e.distribution === "quarantine-reference" ||
        entityIds.has(iri) ||
        sourceEntityIri(e) !== e.stableIri ||
        sourcePartitionKey(e.namespace, e.stableIri) !== descriptor.key
      )
        throw new Error(
          "Duplicate, forbidden or misrouted primary source entity",
        );
      entityIds.add(iri);
    }
    const primary = new Set(data.primaryAssertionIris);
    for (const a of data.assertions) {
      const subject = local.get(a.subjectIri);
      if (
        !primary.has(a.iri) ||
        assertionIds.has(a.iri) ||
        !subject ||
        !local.has(a.objectIri) ||
        sourcePartitionKey(subject.namespace, subject.stableIri) !==
          descriptor.key
      )
        throw new Error("Duplicate, dangling or misrouted source assertion");
      assertionIds.add(a.iri);
      assertionRoutes.set(a.iri, descriptor.key);
      referenced.add(a.subjectIri);
      referenced.add(a.objectIri);
    }
    const nq = sourceQuadsToNQuads(publicMathOntologySourceQuads(data));
    if (!Buffer.from(nq).equals(nqBytes))
      throw new Error(
        "Source RDF differs from actual sealed semantic metadata projection",
      );
    const count = nq.split("\n").length - 1;
    if (count !== descriptor.quads)
      throw new Error("Source quad denominator mismatch");
    semanticQuadCountWithDependencies += count;
    files.push(descriptor.nquads, descriptor.projection);
  }
  for (const artifact of source.manifest.assertionIndexes) {
    const rows = JSON.parse(source.readArtifact(artifact).toString()) as [
      string,
      string,
    ][];
    for (const [iri, key] of rows)
      if (
        !assertionIds.has(iri) ||
        indexIds.has(iri) ||
        assertionRoutes.get(iri) !== key
      )
        throw new Error("Source assertion index mismatch");
      else indexIds.add(iri);
    files.push(artifact);
  }
  if (
    indexIds.size !== assertionIds.size ||
    entityIds.size !== source.manifest.entities ||
    assertionIds.size !== source.manifest.assertions ||
    [...referenced].some((iri) => !entityIds.has(iri)) ||
    semanticQuadCountWithDependencies !== source.manifest.quadCount
  )
    throw new Error(
      "Global source population or endpoint completeness mismatch",
    );
  return {
    format: "math-source-package-verification-1",
    pins,
    primaryEntities: entityIds.size,
    primaryAssertions: assertionIds.size,
    dependencyClosedPartitions: source.manifest.partitions.length,
    semanticQuadCountWithDependencies,
    verifiedArtifactCount: files.length,
    files,
    formalShacl: "separate-worker-required",
    globalOwlAndCycleValidation: "separate-worker-required",
    publicationAuthority: "not-granted-by-source-verification",
  };
}
if (process.argv[1]?.endsWith("verifyPackaged.ts")) {
  try {
    const receipt = verifyPackagedMathOntologySources(resolve(arg("--repo")), {
      projectionHash: arg("--projection-hash"),
      manifestByteHash: arg("--manifest-byte-hash"),
    });
    writeFileSync(
      resolve(arg("--receipt")),
      JSON.stringify(receipt, null, 2) + "\n",
    );
    console.log(
      JSON.stringify({
        primaryEntities: receipt.primaryEntities,
        primaryAssertions: receipt.primaryAssertions,
        partitions: receipt.dependencyClosedPartitions,
        artifacts: receipt.verifiedArtifactCount,
      }),
    );
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  }
}
