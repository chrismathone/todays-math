import { describe, expect, it } from "vitest";
import { DataFactory, Store } from "n3";
import fixture from "../fixtures/ontology-formal-release.json";
import {
  mathOntologyGraphIdentitySchema,
  MATH_ONTOLOGY_HASH_KEYS,
} from "@/contracts/mathOntology.contract";
import {
  loadOntologyRuntime,
  createOntologyRuntimeFactory,
} from "@/lib/math-ontology/runtime/artifact";
import { queryOntology } from "@/lib/math-ontology/query/closed";
import { validateOntologyCore } from "@/lib/math-ontology/validation/core";
const identity = mathOntologyGraphIdentitySchema.parse(fixture.identity);
const context = {
  allowedScopes: ["global"],
  contextHash: "synthetic-context",
  cursorSecret: "synthetic-only-test-secret",
  deadlineMs: 10000,
};
describe("actual Node RDF query, proof and Core SHACL", () => {
  it("loads the real Python OWL/SHACL release and queries its checked transitive conclusion", async () => {
    const runtime = await loadOntologyRuntime(fixture, identity);
    expect(runtime.validation.engine).toBe("rdf-validate-shacl@0.6.5");
    const answer = await queryOntology(
      runtime,
      {
        kind: "neighbors",
        entityId: "urn:todaymath:entity:a",
        relation: "partOf",
        limit: 20,
      },
      context,
    );
    expect(answer.rows.map((r) => r.o)).toEqual([
      "urn:todaymath:entity:b",
      "urn:todaymath:entity:c",
    ]);
    expect(answer.proofIds).toHaveLength(2);
  });
  it("rejects tampering of every artifact component against a trusted identity", async () => {
    for (const key of MATH_ONTOLOGY_HASH_KEYS) {
      const broken = structuredClone(fixture);
      broken.files[key] += " ";
      await expect(loadOntologyRuntime(broken, identity)).rejects.toThrow(
        "HASH_MISMATCH",
      );
    }
  });
  it("cannot leak a branch release or citable premise into an unauthorized context", async () => {
    const runtime = await loadOntologyRuntime(fixture, identity);
    await expect(
      queryOntology(
        runtime,
        { kind: "neighbors", entityId: "urn:todaymath:entity:a", limit: 20 },
        { ...context, allowedScopes: ["branch:other"] },
      ),
    ).rejects.toThrow("SCOPE_DENIED");
  });
  it("pages actual SPARQL neighbors with stable order and no duplicate or missing rows", async () => {
    const runtime = await loadOntologyRuntime(fixture, identity);
    const query = {
      kind: "neighbors" as const,
      entityId: "urn:todaymath:entity:a",
      relation: "partOf",
      limit: 1,
    };
    const first = await queryOntology(runtime, query, context);
    expect(first.rows).toHaveLength(1);
    expect(first.truncated).toBe(true);
    expect(first.cursor).toBeTruthy();
    const second = await queryOntology(
      runtime,
      { ...query, cursor: first.cursor! },
      context,
    );
    expect(second.rows).toHaveLength(1);
    expect(second.truncated).toBe(false);
    expect([...first.rows, ...second.rows].map((r) => r.o)).toEqual([
      "urn:todaymath:entity:b",
      "urn:todaymath:entity:c",
    ]);
    await expect(
      queryOntology(
        runtime,
        { ...query, cursor: first.cursor! },
        { ...context, contextHash: "other" },
      ),
    ).rejects.toThrow("STALE_CURSOR");
    await expect(
      queryOntology(
        runtime,
        { ...query, cursor: first.cursor!.slice(0, -1) + (first.cursor!.endsWith("0") ? "1" : "0") },
        context,
      ),
    ).rejects.toThrow();
  });
  it("really validates a malformed Assertion with the Core engine", async () => {
    const runtime = await loadOntologyRuntime(fixture, identity),
      data = new Store();
    data.addQuad(
      DataFactory.namedNode("urn:todaymath:bad"),
      DataFactory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
      DataFactory.namedNode("urn:todaymath:vocab:Assertion"),
    );
    const report = await validateOntologyCore(data, runtime.shapes);
    expect(report.conforms).toBe(false);
    expect(report.results.length).toBeGreaterThan(0);
    expect(report.focusNodeCount).toBe(1);
  });
  it("does not expose mutable cached datasets across simultaneous callers", async () => {
    const factory = createOntologyRuntimeFactory();
    const [a, b] = await Promise.all([
      factory.load(fixture, identity),
      factory.load(fixture, identity),
    ]);
    a.datasets().asserted.removeMatches(null, null, null, null);
    expect(b.datasets().asserted.size).toBeGreaterThan(0);
    const path = await queryOntology(
      b,
      {
        kind: "path",
        entityId: "urn:todaymath:entity:a",
        targetId: "urn:todaymath:entity:c",
        relation: "partOf",
        limit: 20,
      },
      context,
    );
    expect(path.proofIds.length).toBeGreaterThan(0);
  });
});
