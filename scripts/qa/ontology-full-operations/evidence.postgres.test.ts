import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import release from "@/../src/__tests__/fixtures/ontology-formal-release.json";
import { db, fixture, now } from "./harness";
import { loadOntologyRuntime } from "@/lib/math-ontology/runtime/artifact";
import { mathOntologyGraphIdentitySchema } from "@/contracts/mathOntology.contract";
import { canonicalOntologyJson, ontologyDigest } from "@/lib/math-ontology/compiler/canonical";
import { createOntologyEvidenceStore } from "@/lib/math-ontology/actions/evidence";
import { createOntologyActionService } from "@/lib/math-ontology/actions/service";
import { currentOntologyObservations } from "@/lib/math-ontology/feedback/observations";
import { createOntologyFeedbackService } from "@/lib/math-ontology/feedback/service";

async function setup() {
  const f = await fixture(), identity = mathOntologyGraphIdentitySchema.parse(release.identity), runtime = await loadOntologyRuntime(release, identity);
  const artifactCanonical = canonicalOntologyJson(release), jobId = randomUUID();
  await db.ontologyCompileJob.create({ data: { id: jobId, scopeKey: "global", requestedBy: f.actor.id, inputCanonical: "{}", inputManifestHash: ontologyDigest("{}"), approvedReviewStateHash: ontologyDigest("[]"), expectedActiveGeneration: 0, engineLockHash: ontologyDigest("test"), state: "published" } });
  await db.ontologyRelease.upsert({ where: { graphVersion: identity.graphVersion }, update: {}, create: { graphVersion: identity.graphVersion, scopeKey: "global", jobId, identityCanonical: canonicalOntologyJson(identity), artifactCanonical, artifactHash: ontologyDigest(artifactCanonical), publishedAt: now } });
  await db.ontologyActiveGraph.upsert({ where: { scopeKey: "global" }, create: { scopeKey: "global", graphVersion: identity.graphVersion, generation: 1, updatedAt: now }, update: { graphVersion: identity.graphVersion, generation: { increment: 1 } } });
  const store = createOntologyEvidenceStore({ db, runtime: { load: async () => runtime }, cursorSecret: () => "isolated-test-cursor-secret", now: () => now });
  const first = runtime.proofs().find(p => p.assertionIds.length && p.conclusion[1].startsWith("urn:todaymath:vocab:"))!;
  const query = { kind: "neighbors", entityId: first.conclusion[0], limit: 100 };
  return { f, store, identity, query };
}
describe("actual source read and closed graph proof -> durable opaque evidence snapshot", () => {
  it("captures real SHACL/proof-checked query and actual source in the same tx, executes and observes retained post-action data", async () => {
    const { f, store, identity, query } = await setup();
    const captured = await store.capture(f.actor, { target: f.target, graphVersion: identity.graphVersion, query });
    expect(captured.sourceSnapshotId).toMatch(/^ontology:snapshot:/);
    expect(captured.evidencePacket.rows.length).toBeGreaterThan(0);
    const service = createOntologyActionService({ db, evidence: store.evidence, now: () => now });
    const proposal = await service.propose(f.actor, { ...f.input, graphVersion: identity.graphVersion, sourceSnapshotId: captured.sourceSnapshotId });
    const approval = await service.approve(f.actor, { proposalId: proposal.proposalId, sealHash: proposal.sealHash });
    const receipt = await service.execute(f.actor, approval);
    const feedback = createOntologyFeedbackService({ db, observations: currentOntologyObservations, now: () => new Date(now.getTime() + 1000) });
    const result = await feedback.record(f.actor, { receiptId: receipt.id, sourceSnapshotId: `ontology:observation:${randomUUID()}` });
    expect(result.observation.counts).toEqual({ retainedFirstAttempts: 0, independentCorrect: 0, independentIncorrect: 0, excluded: 0 });
    expect(result.observation.kind).toBe("descriptive");
  });
  it("refuses a foreign actor, forged graph and changed current source before any proposal", async () => {
    const { f, store, identity, query } = await setup();
    const snapshot = await store.capture(f.actor, { target: f.target, graphVersion: identity.graphVersion, query });
    const foreign = await fixture();
    await expect(db.$transaction(tx => store.evidence.resolve(tx, foreign.actor, foreign.target, snapshot, now))).rejects.toThrow();
    await expect(store.capture(f.actor, { target: f.target, graphVersion: "forged", query })).rejects.toThrow();
    await db.studentSrsState.update({ where: { studentId: f.student.id }, data: { revision: { increment: 1 } } });
    await expect(db.$transaction(tx => store.evidence.resolve(tx, f.actor, f.target, snapshot, now))).rejects.toThrow();
  });
});
