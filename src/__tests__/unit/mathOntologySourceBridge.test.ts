import { describe, expect, it } from "vitest";
import sourceRelease from "../fixtures/ontology-source-release.json";
import { mathOntologyGraphIdentitySchema } from "@/contracts/mathOntology.contract";
import { loadOntologyRuntime } from "@/lib/math-ontology/runtime/artifact";
import { queryOntology } from "@/lib/math-ontology/query/closed";
const context = {
  allowedScopes: ["global"],
  contextHash: "synthetic-source-context",
  cursorSecret: "synthetic",
  deadlineMs: 10000,
};
describe("source assembler → actual Python OWL/SHACL → Node SPARQL", () => {
  it("joins assessment to definition, section and chapter while excluding the editorial candidate", async () => {
    const runtime = await loadOntologyRuntime(
      sourceRelease,
      mathOntologyGraphIdentitySchema.parse(sourceRelease.identity),
    );
    const assessment = await queryOntology(
      runtime,
      { kind: "catalog", q: "assessment", limit: 20 },
      context,
    );
    const chapter = await queryOntology(
      runtime,
      { kind: "catalog", q: "chapter", limit: 20 },
      context,
    );
    expect(assessment.rows).toHaveLength(1);
    expect(chapter.rows).toHaveLength(1);
    const path = await queryOntology(
      runtime,
      {
        kind: "path",
        entityId: assessment.rows[0].entity,
        targetId: chapter.rows[0].entity,
        limit: 20,
      },
      context,
    );
    expect(path.proofIds.length).toBeGreaterThanOrEqual(2);
    const byId = new Map(runtime.proofs().map((p) => [p.id, p]));
    const premises = new Set(
      path.proofIds.flatMap((id) => byId.get(id)!.assertionIds),
    );
    expect(premises.size).toBe(3);
    const candidate = await queryOntology(
      runtime,
      {
        kind: "neighbors",
        entityId: assessment.rows[0].entity,
        relation: "editorialPrerequisite",
        limit: 20,
      },
      context,
    );
    expect(candidate.rows).toEqual([]);
    expect(runtime.validation.focusNodeCount).toBeGreaterThanOrEqual(11);
  });
});
