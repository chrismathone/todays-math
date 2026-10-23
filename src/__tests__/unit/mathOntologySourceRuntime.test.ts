import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadBundledMathOntologySourcePartitions } from "@/lib/math-ontology/sources/catalog";
import { sourcePartitionKey } from "@/lib/math-ontology/sources/partitions";
import { sourceEntityIri } from "@/lib/math-ontology/ids";
import type { MathOntologyPublicSourceProjection } from "@/lib/math-ontology/sources/publicProjection";
it("loads actual packaged source shards and follows assessment to definition to section to chapter without full census assembly", () => {
  const fixture = JSON.parse(
    readFileSync(
      resolve("ontology/source-manifests/source-runtime-fixture.v1.json"),
      "utf8",
    ),
  );
  const source = loadBundledMathOntologySourcePartitions(fixture.pins);
  const read = (namespace: string, stableIri: string) => {
    const key = sourcePartitionKey(namespace, stableIri),
      descriptor = source.manifest.partitions.find((p) => p.key === key)!;
    const data = JSON.parse(
      source.readArtifact(descriptor.projection).toString(),
    ) as MathOntologyPublicSourceProjection;
    expect(data.projectionHash).toBe(fixture.pins.projectionHash);
    return data;
  };
  let namespace = "bank-assessment",
    stableIri = sourceEntityIri({
      namespace: "bank-assessment",
      scope: "global",
      nativeId: fixture.nativeAssessmentId,
    });
  const witnessed = [];
  for (const [predicate, next] of [
    ["assessesDefinition", "bank-definition"],
    ["partOf", "curriculum-section"],
    ["partOf", "curriculum-chapter"],
  ]) {
    const shard = read(namespace, stableIri),
      entity = shard.entities.find((e) => e.stableIri === stableIri)!;
    expect(entity).toBeDefined();
    const claims = shard.assertions.filter(
      (a) => a.subjectIri === entity.iri && a.predicate === predicate,
    );
    expect(claims).toHaveLength(1);
    const claim = claims[0],
      target = shard.entities.find((e) => e.iri === claim.objectIri)!;
    expect(target.namespace).toBe(next);
    expect(claim.originKind).toBe("source-projection");
    expect(claim.evidenceKind).toBe("observed");
    witnessed.push(claim.iri);
    namespace = next;
    stableIri = target.stableIri;
  }
  expect(witnessed).toHaveLength(3);
  expect(source.manifest.entities).toBe(51319);
  expect(source.manifest.assertions).toBe(56049);
  expect(
    source.manifest.partitions.reduce((n, p) => n + p.primaryEntities, 0),
  ).toBe(51319);
});
