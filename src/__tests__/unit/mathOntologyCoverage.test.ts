import { expect, it } from "vitest";
import release from "../fixtures/ontology-packaged-release.json";
import delta from "../fixtures/ontology-packaged-delta-release.json";
import { ontologyPublicCoverage } from "@/lib/math-ontology/retrieval/coverage";
import { mathOntologyArtifactSchema } from "@/contracts/mathOntology.contract";
import { accountRouteAllowed } from "@/lib/accountRouteAccess";
it("reads full pinned public population, separates source coverage from reviewed delta and educational unknowns", () => {
  const result = ontologyPublicCoverage(
    mathOntologyArtifactSchema.parse(release),
  );
  expect(result.coverage.base).toEqual({
    entities: 51319,
    sourceAssertions: 56049,
    sourceShards: 419,
    primaryFocus: 107368,
  });
  expect(result.coverage.educationalCompleteness).toBe("unknown");
  expect(result.coverage.officialAlignment).toBe("unknown");
  expect(result.coverage.reviewedDeltaAssertions).toBe(0);
  expect(
    ontologyPublicCoverage(mathOntologyArtifactSchema.parse(delta)).coverage
      .reviewedDeltaAssertions,
  ).toBeGreaterThan(0);
  expect(result.data.action).toBeUndefined();
  expect(result.data.steps.some((s) => s.state === "unknown")).toBe(true);
  expect(JSON.stringify(result)).not.toMatch(/studentId|branchId|tenantId/);
});
it("rejects swapped release bytes before reporting coverage", () => {
  const corrupt = structuredClone(release);
  corrupt.files.coverage = "{}";
  expect(() =>
    ontologyPublicCoverage(mathOntologyArtifactSchema.parse(corrupt)),
  ).toThrow("ARTIFACT_HASH_MISMATCH:coverage");
});
it("opens only exact authenticated coverage GET through existing account policy", () => {
  const teacher = {
    id: "synthetic-teacher",
    name: "교사",
    email: "teacher@example.test",
    role: "director" as const,
    isAdmin: false,
    approvalStatus: "approved" as const,
    menus: ["srs" as const],
  };
  expect(
    accountRouteAllowed(teacher, "GET", "/api/math-ontology/coverage"),
  ).toBe(true);
  expect(
    accountRouteAllowed(
      { ...teacher, menus: [] },
      "GET",
      "/api/math-ontology/coverage",
    ),
  ).toBe(false);
  for (const path of [
    "/api/math-ontology/coverage/extra",
    "/api/math-ontology/coverage-private",
  ])
    expect(accountRouteAllowed(teacher, "GET", path)).toBe(false);
  for (const method of ["POST", "HEAD", "PUT"])
    expect(
      accountRouteAllowed(teacher, method, "/api/math-ontology/coverage"),
    ).toBe(false);
});
