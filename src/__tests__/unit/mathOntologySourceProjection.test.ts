import { describe, expect, it } from "vitest";
import {
  sourceFixture,
  sourceCompileFixture,
} from "../../../scripts/ontology/compiler/source-fixture";
import {
  prepareSourceProjectionCompileInput,
  SOURCE_RELATION_POLICIES,
} from "@/lib/math-ontology/compiler/sourceProjection";
import { MATH_ONTOLOGY_SOURCE_RELATION_POLICY } from "@/lib/math-ontology/sources/relationMatrix";
import { mathOntologySourceRecordSchema } from "@/contracts/mathOntologySource.contract";
import sourceKinds from "../../../ontology/model/source-kinds.json";
describe("explicit native projection release authority", () => {
  it("maps every registered source kind to an explicit TBox class and shape", () => {
    expect(Object.keys(sourceKinds).sort()).toEqual(
      [...mathOntologySourceRecordSchema.shape.kind.options].sort(),
    );
    expect(
      Object.values(sourceKinds).every(
        (v) =>
          v.classIri.startsWith("urn:todaymath:vocab:Source") &&
          v.shapeIri.endsWith("Shape"),
      ),
    ).toBe(true);
  });
  it("uses one exhaustive source policy and never approves the editorial candidate", async () => {
    expect(SOURCE_RELATION_POLICIES).toBe(MATH_ONTOLOGY_SOURCE_RELATION_POLICY);
    const input = await sourceCompileFixture();
    expect(input.assertions).toHaveLength(7);
    expect(
      input.assertions.some((a) =>
        a.predicate.endsWith("editorialPrerequisite"),
      ),
    ).toBe(false);
    expect(
      input.assertions.every(
        (a) => a.sourceDigestKind === "authorized-projection",
      ),
    ).toBe(true);
    expect(JSON.parse(input.sourceManifest).inputs).toBeUndefined();
    expect(input.sourceManifest).not.toContain('"payloadHash"');
  });
  it("does not accept a caller's approval IRI as publisher authority", async () => {
    await expect(
      prepareSourceProjectionCompileInput(sourceFixture(), {
        decisionId: "urn:todaymath:decision:forged",
        scope: "global",
        expectedProjectionHash: `sha256:${"a".repeat(64)}`,
        verify: async () => ({
          isSuperAdmin: false,
          active: true,
          approvedProjectionHash: `sha256:${"a".repeat(64)}`,
          decisionId: "urn:todaymath:decision:forged",
        }),
      }),
    ).rejects.toThrow("AUTHORITY_DENIED");
  });
});
