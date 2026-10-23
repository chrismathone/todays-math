import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db, fixture, now } from "./harness";
import { canonicalOntologyJson, ontologyDigest } from "@/lib/math-ontology/compiler/canonical";
import { createOntologyHistoryReader } from "@/lib/math-ontology/actions/history";
import { createOntologyReleaseGovernance } from "@/lib/math-ontology/publish/governance";
async function setup() {
 const f = await fixture(); await db.user.update({ where: { id: f.actor.id }, data: { isSuperAdmin: true } });
 const id = randomUUID(), graphVersion = ontologyDigest(id), projectionHash = ontologyDigest("synthetic-projection"), input = { schemaVersion: 1, profile: "tm-owlrl-1", scope: "global", registryNquads: "", assertions: [], sourceManifest: canonicalOntologyJson({ format: "tm-packaged-source-1", baseHash: ontologyDigest("synthetic-base"), projectionHash, authorityDecisionId: `urn:todaymath:source-authority:${id}`, scope: "global" }) };
 const inputCanonical = canonicalOntologyJson(input), decisionCanonical = canonicalOntologyJson({ decision: "approved" });
 await db.ontologySourceAuthorityDecision.create({ data: { id, scopeKey: "global", sourceManifestHash: projectionHash, decisionCanonical, decisionHash: ontologyDigest(decisionCanonical), approvedBy: f.actor.id, createdAt: now } });
 await db.ontologyCompileJob.create({ data: { id, scopeKey: "global", requestedBy: f.actor.id, inputCanonical, inputManifestHash: ontologyDigest(inputCanonical), approvedReviewStateHash: ontologyDigest("[]"), expectedActiveGeneration: 0, engineLockHash: ontologyDigest("synthetic"), state: "published" } });
 // Synthetic persisted release tests operator atomicity, not the formal engine.
 await db.ontologyRelease.create({ data: { graphVersion, scopeKey: "global", jobId: id, identityCanonical: "{}", artifactCanonical: "{}", artifactHash: ontologyDigest("{}"), publishedAt: now } });
 const active = await db.ontologyActiveGraph.upsert({ where: { scopeKey: "global" }, create: { scopeKey: "global", graphVersion, generation: 1, updatedAt: now }, update: { graphVersion, generation: { increment: 1 } } });
 return { f, id, graphVersion, generation: active.generation, service: createOntologyReleaseGovernance({ db, now: () => now }) };
}
describe("explicit publisher release/source-authority withdrawal", () => {
 it("preview is inert; an audit failure rolls back every withdrawal; confirm is atomic and idempotent", async () => {
  const { f, id, graphVersion, generation, service } = await setup(), p = await service.prepare(f.actor), input = { confirmationId: p.confirmationId, sealHash: p.sealHash };
  expect((await db.ontologyActiveGraph.findUniqueOrThrow({ where: { scopeKey: "global" } })).graphVersion).toBe(graphVersion);
  // Other serialized fixtures retain their immutable revocation histories.
  // Fail this operation's new audit, without rejecting those older rows.
  if (!/^[a-f0-9-]{36}$/.test(p.confirmationId)) throw new Error("Invalid synthetic confirmation id");
  await db.$executeRawUnsafe(`ALTER TABLE ontology_review_event ADD CONSTRAINT qa_revoke_audit_failure CHECK (event <> 'release.revoked' OR subject_id <> '${p.confirmationId}')`);
  try { await expect(service.confirm(f.actor, input)).rejects.toThrow(); }
  finally { await db.$executeRawUnsafe("ALTER TABLE ontology_review_event DROP CONSTRAINT qa_revoke_audit_failure"); }
  expect((await db.ontologyRelease.findUniqueOrThrow({ where: { graphVersion } })).revokedAt).toBeNull();
  expect((await db.ontologySourceAuthorityDecision.findUniqueOrThrow({ where: { id } })).revokedAt).toBeNull();
  expect((await db.ontologyActiveGraph.findUniqueOrThrow({ where: { scopeKey: "global" } })).generation).toBe(generation);
  const result = await service.confirm(f.actor, input); expect(result.state).toBe("applied");
  expect(await service.confirm(f.actor, input)).toEqual(result);
  expect((await db.ontologyActiveGraph.findUniqueOrThrow({ where: { scopeKey: "global" } }))).toMatchObject({ graphVersion: null, generation: generation + 1 });
  expect((await db.ontologySourceAuthorityDecision.findUniqueOrThrow({ where: { id } })).revokedAt).toEqual(now);
  expect((await db.ontologyRelease.findUniqueOrThrow({ where: { graphVersion } })).revokedAt).toEqual(now);
  expect((await createOntologyHistoryReader({ db, now: () => now })(f.actor)).steps.some(step => step.title === "지식 판 철회 기록")).toBe(true);
 });
 it("refuses stale generations and withdrawn publisher capability without revoking history", async () => {
  const { f, graphVersion, service } = await setup(), p = await service.prepare(f.actor), input = { confirmationId: p.confirmationId, sealHash: p.sealHash };
  await db.ontologyActiveGraph.update({ where: { scopeKey: "global" }, data: { generation: { increment: 1 } } });
  await expect(service.confirm(f.actor, input)).rejects.toMatchObject({ code: "STALE" });
  await db.user.update({ where: { id: f.actor.id }, data: { isSuperAdmin: false } });
  await expect(service.prepare(f.actor)).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect((await db.ontologyRelease.findUniqueOrThrow({ where: { graphVersion } })).revokedAt).toBeNull();
 });
});
