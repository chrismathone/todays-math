import { describe, expect, it } from "vitest";
import { randomUUID, createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { db, fixture, now } from "./harness";
import { canonicalBytes, digest } from "@/lib/math-ontology/actions/canonical";
import { createOntologyActionService } from "@/lib/math-ontology/actions/service";
import { createOntologyPublisher } from "@/lib/math-ontology/publish/service";
import { createOntologyPublicationApproval } from "@/lib/math-ontology/publish/approval";
import { createOntologyReleaseGovernance } from "@/lib/math-ontology/publish/governance";
import { createOntologyHistoryDelivery } from "@/lib/math-ontology/outbox/history";
import { createOntologyOutbox } from "@/lib/math-ontology/outbox/service";
import { createOntologyStageStore, stageSignature } from "@/lib/math-ontology/publish/staging";
import { createOntologyRelationService } from "@/lib/math-ontology/review/service";
import { sealOntologyModelRelationProposal } from "@/lib/math-ontology/review/modelReceipt";
import { MATH_ONTOLOGY_HASH_KEYS, type MathOntologyArtifact, type MathOntologyCompileInput } from "@/contracts/mathOntology.contract";
import { canonicalOntologyJson } from "@/lib/math-ontology/compiler/canonical";

function clocked(test: (model: string, operation: string, data: Record<string, unknown>) => boolean, advance: number) {
  let time = now, armed = false;
  const hooked = db.$extends({ query: { $allModels: { async $allOperations({ model, operation, args, query }) {
    const result = await query(args);
    const data = (args as unknown as { data?: Record<string, unknown> }).data ?? {};
    if (armed && test(model, operation, data)) { armed = false; time = new Date(time.getTime() + advance); }
    return result;
  } } } });
  return { db: hooked as unknown as typeof db, now: () => time, set: (offset: number) => { time = new Date(now.getTime() + offset); }, arm: () => { armed = true; } };
}
const base = { baseHash: digest("synthetic-deadline-base"), projectionHash: digest("synthetic-projection"), entities: 2, assertions: 1, focuses: 3 };
async function publicationFixture(clock: ReturnType<typeof clocked>) {
  const f = await fixture(); await db.user.update({ where: { id: f.actor.id }, data: { isSuperAdmin: true } });
  let compiles = 0;
  const publisher = createOntologyPublisher({ db: clock.db, now: clock.now, engineLockHash: digest("synthetic-clock-engine"),
    async buildInput(tx) { const authority = await tx.ontologySourceAuthorityDecision.findFirstOrThrow({ where: { approvedBy: f.actor.id }, orderBy: { createdAt: "desc" } }); return { schemaVersion: 1, profile: "tm-owlrl-1", scope: "global", registryNquads: "", assertions: [], sourceManifest: canonicalOntologyJson({ authorityDecisionId: `urn:todaymath:source-authority:${authority.id}` }) } as MathOntologyCompileInput; },
    compiler: { async compile(input) { compiles++; const files = Object.fromEntries(MATH_ONTOLOGY_HASH_KEYS.map(key => [key, key === "source" ? input.sourceManifest : `synthetic-${key}`])) as MathOntologyArtifact["files"], hashes = Object.fromEntries(MATH_ONTOLOGY_HASH_KEYS.map(key => [key, digest(files[key])])) as MathOntologyArtifact["identity"]["hashes"]; return { identity: { schemaVersion: 1, profile: "tm-owlrl-1", graphVersion: digest(canonicalBytes(hashes)), hashes }, files }; } },
    verifyArtifact: async value => value, // Explicit orchestration clock fixture, not an engine claim.
  });
  return { f, service: createOntologyPublicationApproval({ db: clock.db, publisher, now: clock.now, base: () => base }), compiles: () => compiles };
}
describe("same-class confirmation deadline boundaries in actual isolated PostgreSQL", () => {
  it.each(["entry", "last-write", "control"] as const)("publication preview expiry: %s", async point => {
    const clock = clocked((model, op, data) => point === "entry" ? model === "OntologyActiveGraph" && op === "upsert" : model === "OntologyReviewEvent" && data.event === "publish.queued", 2000);
    const { f, service, compiles } = await publicationFixture(clock), preview = await service.prepare(f.actor), input = { confirmationId: preview.confirmationId, sealHash: preview.sealHash };
    clock.set(599000); if (point !== "control") clock.arm();
    if (point === "control") { const result = await service.confirm(f.actor, input); clock.set(601000); expect(await service.confirm(f.actor, input)).toEqual(result); expect(compiles()).toBe(1); }
    else { await expect(service.confirm(f.actor, input)).rejects.toMatchObject({ code: "EXPIRED" }); expect(await db.ontologySourceAuthorityDecision.count({ where: { id: preview.confirmationId } })).toBe(0); expect(await db.ontologyCompileJob.count({ where: { id: preview.confirmationId } })).toBe(0); expect(compiles()).toBe(0); }
  });
  it.each(["expiry", "control"] as const)("revocation last audit: %s", async point => {
    const clock = clocked((model, _op, data) => model === "OntologyReviewEvent" && data.event === "release.revoked", 2000);
    const { f, service } = await publicationFixture(clock), initial = await service.prepare(f.actor);
    const published = await service.confirm(f.actor, { confirmationId: initial.confirmationId, sealHash: initial.sealHash });
    const before = await db.ontologyActiveGraph.findUniqueOrThrow({ where: { scopeKey: "global" } }), graphVersion = before.graphVersion!;
    const governance = createOntologyReleaseGovernance({ db: clock.db, now: clock.now }), preview = await governance.prepare(f.actor), input = { confirmationId: preview.confirmationId, sealHash: preview.sealHash };
    clock.set(599000); if (point === "expiry") clock.arm();
    if (point === "control") { const result = await governance.confirm(f.actor, input); clock.set(601000); expect(await governance.confirm(f.actor, input)).toEqual(result); }
    else { await expect(governance.confirm(f.actor, input)).rejects.toMatchObject({ code: "EXPIRED" }); expect(await db.ontologyActiveGraph.findUniqueOrThrow({ where: { scopeKey: "global" } })).toEqual(before); expect((await db.ontologyRelease.findUniqueOrThrow({ where: { graphVersion } })).revokedAt).toBeNull(); expect((await db.ontologySourceAuthorityDecision.findUniqueOrThrow({ where: { id: published.id } })).revokedAt).toBeNull(); expect(await db.ontologyReviewEvent.count({ where: { subjectId: preview.confirmationId, event: "release.revoked" } })).toBe(0); }
  });
  it("rolls back a plan approval that expires after its final proposal write", async () => {
    const f = await fixture(), clock = clocked((model, op, data) => model === "OntologyProposal" && op === "update" && data.status === "approved", 2000);
    const service = createOntologyActionService({ db: clock.db, evidence: f.evidence, now: clock.now }), p = await service.propose(f.actor, f.input);
    clock.set(599000); clock.arm(); await expect(service.approve(f.actor, { proposalId: p.proposalId, sealHash: p.sealHash })).rejects.toMatchObject({ code: "EXPIRED" });
    expect((await db.ontologyProposal.findUniqueOrThrow({ where: { id: p.proposalId } })).status).toBe("draft"); expect(await db.ontologyApproval.count({ where: { proposalId: p.proposalId } })).toBe(0);
  });
  it.each(["history", "ack", "retry", "claim"] as const)("rolls back expired outbox %s after its last write", async point => {
    const f = await fixture(), ready = await f.ready(), receipt = await f.service.execute(f.actor, ready.approval);
    const clock = clocked((model, _op, data) => model === "OntologyOutbox" && data.status === (point === "claim" ? "leased" : point === "retry" ? "queued" : "delivered"), 61000);
    if (point === "history") { clock.arm(); await expect(createOntologyHistoryDelivery({ db: clock.db, now: clock.now })(f.actor, receipt.id)).rejects.toMatchObject({ code: "STALE" }); }
    else { const outbox = createOntologyOutbox({ db: clock.db, now: clock.now, receiptId: receipt.id }); if (point === "claim") { clock.arm(); await expect(outbox.claim()).rejects.toMatchObject({ code: "STALE" }); } else if (point === "retry") { clock.arm(); expect(await outbox.deliverOne(async () => { throw new Error("synthetic sink failure"); })).toBe("lease-lost"); } else { const lease = await outbox.claim(); clock.arm(); expect(await outbox.acknowledge(lease!)).toBe(false); } }
    const row = await db.ontologyOutbox.findUniqueOrThrow({ where: { receiptId: receipt.id } }); expect(row.status).toBe(point === "claim" ? "queued" : "leased"); expect(row.deliveredAt).toBeNull(); expect(await db.ontologyReviewEvent.count({ where: { id: row.id } })).toBe(0); expect(await db.ontologyAudit.count({ where: { receiptId: receipt.id } })).toBe(1);
  });
  it("rejects a chunk whose signed deadline expires during its insert even while the job lease remains live", async () => {
    const clock = clocked((model, op) => model === "OntologyArtifactChunk" && op === "create", 2000), key = "synthetic-deadline-stage-secret-32-characters", jobId = randomUUID(), bytes = gzipSync("synthetic chunk only");
    const hash = `sha256:${createHash("sha256").update(bytes).digest("hex")}` as const, inputHash = digest("synthetic-input");
    await db.ontologyCompileJob.create({ data: { id: jobId, scopeKey: "global", requestedBy: randomUUID(), inputCanonical: "{}", inputManifestHash: inputHash, approvedReviewStateHash: digest("[]"), expectedActiveGeneration: 0, engineLockHash: digest("synthetic"), state: "leased", leaseGeneration: 1, leaseUntil: new Date(now.getTime() + 60000) } });
    const meta = { jobId, scopeKey: "global", inputHash, leaseGeneration: 1, chunkIndex: 0, chunkCount: 1, totalBytes: bytes.length, chunkHash: hash, gzipHash: hash, expiresAt: new Date(now.getTime() + 1000).toISOString() };
    clock.arm(); await expect(createOntologyStageStore({ db: clock.db, key, now: clock.now, verifyArtifact: async value => value }).accept({ ...meta, bytesBase64: bytes.toString("base64") }, stageSignature(key, meta))).rejects.toMatchObject({ code: "EXPIRED" }); expect(await db.ontologyArtifactChunk.count({ where: { jobId } })).toBe(0);
  });
  it("replays an already-created model draft after its intake deadline without minting another candidate", async () => {
    const f = await fixture(); await db.user.update({ where: { id: f.actor.id }, data: { isSuperAdmin: true } }); let time = now;
    const assertion = { id: `urn:todaymath:assertion:${randomUUID()}`, subject: "urn:todaymath:concept:a", predicate: "urn:todaymath:vocab:supports", object: "urn:todaymath:concept:b", scope: "global", sourceRevision: "urn:todaymath:source:synthetic", sourceDigest: digest("synthetic-source"), locator: "synthetic", provenance: "unknown", origin: "model-proposal", support: "unknown", review: "candidate", publication: "unpublished", distribution: "allowed", revision: 1 };
    const sealed = await db.$transaction(tx => sealOntologyModelRelationProposal(tx, f.actor, { assertion, evidenceRef: "synthetic-graph", evidenceHash: digest("synthetic-evidence"), receipt: { modelCalled: true, vendor: "gemini", requestedModel: "synthetic-no-call", reportedModel: null, responseId: null, completionReason: "synthetic-stop", responseTextHash: digest("synthetic-response"), usage: null } }, () => time));
    const service = createOntologyRelationService({ db, now: () => time, candidates: { authorize: async () => {}, validate: async () => { throw new Error("unused fixture port"); } } }), input = { assertion, evidenceRef: "synthetic-graph", ...sealed };
    const first = await service.draftModel(f.actor, input); time = new Date(now.getTime() + 601000); expect(await service.draftModel(f.actor, input)).toEqual(first); expect(await db.ontologyRelationReview.count({ where: { id: first.reviewId } })).toBe(1);
  });
});
