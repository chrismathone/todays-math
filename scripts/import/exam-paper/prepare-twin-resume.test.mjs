import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { inspectPreparation } from "./prepare-twin-resume.mjs";

const pack = JSON.parse(readFileSync(new URL("../../../.qa-artifacts/exam-resume-20261008/bumil-twin-v2/prepared/preparation.json", import.meta.url), "utf8"));
const mutate = (change) => {
  const altered = structuredClone(pack);
  change(altered);
  return () => inspectPreparation(altered);
};

test("prepared package stays unapproved and unloadable despite 21 historical solves", () => {
  const result = inspectPreparation(pack);
  assert.equal(pack.originalRegeneration.questions, 21);
  assert.equal(result.twinVerified, 0);
  assert.equal(result.loadable, 0);
  assert.equal(result.gradeCurriculumPending, 21);
});
test("original external ID cannot be reused for a twin", () => {
  assert.throws(mutate((p) => { p.questions[0].twinExternalId = p.questions[0].sourceReference.externalId; }));
});
test("source crops cannot become completed new figures", () => {
  assert.throws(mutate((p) => { p.questions[1].figure.finalAssets = [p.referenceFigures[0]]; }));
});
test("old source verification cannot approve a new version", () => {
  assert.throws(mutate((p) => { p.questions[0].independentVerification = { status: "verified", sourceDigest: p.questions[0].sourceReference.sourceContentSha256 }; }));
});
test("grade and rights review cannot be silently promoted in setup", () => {
  for (const key of ["gradeCurriculum", "rights", "status"]) {
    assert.throws(mutate((p) => { p.questions[0].review[key] = "approved"; }));
  }
  assert.throws(mutate((p) => { p.questions[0].directUseAllowed = true; }));
});
test("wrong grade, unit and registry pairing are rejected", () => {
  assert.throws(mutate((p) => { p.questions[0].metadata.assignment.currentUnit.grade = "고1"; }));
  assert.throws(mutate((p) => { p.questions[0].metadata.assignment.currentUnit.id = p.questions[3].metadata.assignment.unitId; }));
  assert.throws(mutate((p) => { p.questions[0].metadata.assignment.familyKey = p.questions[1].metadata.assignment.familyKey; }));
});
test("missing primary HWP/PDF cannot pass based on an old comparison", () => {
  assert.throws(mutate((p) => { p.sourceFiles.find((f) => f.required).available = false; }));
});
test("answers and solutions must not leak into author reference metadata", () => {
  assert.throws(mutate((p) => { p.questions[0].sourceReference.answer = "①"; }));
  assert.throws(mutate((p) => { p.questions[0].sourceReference.solution = "old solution"; }));
});

test("official standard references stay source-bound proposals with pending candidate approval", () => {
  assert(pack.questions.every((q) => q.metadata.achievementStandardRefs.length > 0));
  assert(pack.questions.every((q) => q.metadata.achievementStandardStatus === "expert-proposal-not-candidate-approval"));
  assert(pack.questions.every((q) => q.metadata.sourceIdentityReview.status === "pending-attestation"));
  assert(pack.questions.every((q) => q.review.gradeCurriculum === "pending"));
});
