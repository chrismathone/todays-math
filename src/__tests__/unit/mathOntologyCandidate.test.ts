import { describe, expect, it } from "vitest";
import fixture from "../fixtures/ontology-formal-release.json";
import { mathOntologyGraphIdentitySchema } from "@/contracts/mathOntology.contract";
import { loadOntologyRuntime } from "@/lib/math-ontology/runtime/artifact";
import { actualCandidateValidation } from "@/lib/math-ontology/validation/candidate";
describe("real SHACL quarantine", () => {
  const candidate = {
    ...JSON.parse(fixture.files.review)[0],
    id: "urn:todaymath:assertion:candidate",
    review: "candidate",
    publication: "unpublished",
  };
  it("uses candidate shapes without rewriting the draft as approved", async () => {
    const runtime = await loadOntologyRuntime(
      fixture,
      mathOntologyGraphIdentitySchema.parse(fixture.identity),
    );
    const report = await actualCandidateValidation(
      candidate,
      "global",
      runtime,
    );
    expect(report.engine).toBe("rdf-validate-shacl@0.6.5");
    expect(report.conforms).toBe(true);
    expect(report.educationalTruth).toBe("unverified");
    expect(
      runtime.datasets().asserted.countQuads(null, null, null, null),
    ).toBeGreaterThan(0);
    expect(
      runtime
        .datasets()
        .asserted.getQuads(null, null, null, null)
        .some((q) => q.subject.value === candidate.id),
    ).toBe(false);
  });
  it("fails closed without current source context or on invented source/endpoint/scope", async () => {
    await expect(
      actualCandidateValidation(candidate, "global"),
    ).rejects.toThrow("SOURCE_CONTEXT_REQUIRED");
    const runtime = await loadOntologyRuntime(
      fixture,
      mathOntologyGraphIdentitySchema.parse(fixture.identity),
    );
    for (const changed of [
      { subject: "urn:todaymath:entity:missing" },
      { sourceDigest: `sha256:${"0".repeat(64)}` },
      { review: "approved" },
      { scope: "owner:foreign" },
    ])
      await expect(
        actualCandidateValidation(
          { ...candidate, ...changed },
          "global",
          runtime,
        ),
      ).rejects.toThrow();
  });
});
