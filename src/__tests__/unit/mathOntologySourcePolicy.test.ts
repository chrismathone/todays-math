import { describe, expect, it } from "vitest";
import { MATH_ONTOLOGY_SOURCE_PREDICATES } from "@/contracts/mathOntologySource.contract";
import { MATH_ONTOLOGY_SOURCE_RELATION_POLICY } from "@/lib/math-ontology/sources/relationMatrix";
import {
  mathOntologyAdminSourceCoverageRows,
  mathOntologyVisibleSourceCoverageRows,
} from "@/lib/math-ontology/sources/registry";
describe("full relation policy and administrative coverage separation", () => {
  it("gives every actual source predicate a distinct formal/query/review/proof location", () => {
    expect(Object.keys(MATH_ONTOLOGY_SOURCE_RELATION_POLICY).sort()).toEqual(
      [...MATH_ONTOLOGY_SOURCE_PREDICATES].sort(),
    );
    for (const [p, policy] of Object.entries(
      MATH_ONTOLOGY_SOURCE_RELATION_POLICY,
    )) {
      expect(policy.iri).toBe("urn:todaymath:vocab:" + p);
      expect(policy.transitive).toBe(false);
      expect(policy.officialEducationalMeaning).toBe(false);
    }
    expect(
      MATH_ONTOLOGY_SOURCE_RELATION_POLICY.editorialPrerequisite.queryLocation,
    ).toBe("candidate-review");
    expect(
      MATH_ONTOLOGY_SOURCE_RELATION_POLICY.assessesDefinition.queryLocation,
    ).toBe("approved-source-projection");
    expect(
      MATH_ONTOLOGY_SOURCE_RELATION_POLICY.partialCourseMapping.publicationGate,
    ).toBe("independent-relation-review");
  });
  it("never exposes hidden imported source denominators in visible UI rows", () => {
    const row = {
      namespace: "textbook-script-turn" as const,
      expected: 10,
      registered: 10,
      rdfEligible: 4,
      quarantined: 6,
      sourceLinked: 10,
      reviewedEducationalRelations: 0,
      officialStandardMappings: 0,
      actualInstances: null,
      populationKind: "materialized-source-record" as const,
    };
    expect(mathOntologyAdminSourceCoverageRows([row])[0].quarantined).toBe(6);
    expect(mathOntologyVisibleSourceCoverageRows([row])).toEqual(
      mathOntologyVisibleSourceCoverageRows([
        {
          ...row,
          expected: 100,
          registered: 100,
          quarantined: 96,
          sourceLinked: 100,
        },
      ]),
    );
    expect(
      mathOntologyVisibleSourceCoverageRows([{ ...row, rdfEligible: 0 }]),
    ).toEqual([]);
  });
});
