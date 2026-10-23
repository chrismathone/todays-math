import { describe, expect, it } from "vitest";
import { db, fixture, now } from "./harness";
import { canonicalOntologyJson, ontologyDigest } from "@/lib/math-ontology/compiler/canonical";
import { createOntologyPublicationApproval } from "@/lib/math-ontology/publish/approval";
import { createOntologyPublisher } from "@/lib/math-ontology/publish/service";
import { MATH_ONTOLOGY_HASH_KEYS, type MathOntologyArtifact, type MathOntologyCompileInput } from "@/contracts/mathOntology.contract";
import { canonicalBytes, digest } from "@/lib/math-ontology/actions/canonical";
import { createOntologyOperationsHandler } from "@/lib/math-ontology/actions/handlers";
const base = { baseHash: ontologyDigest("synthetic-base"), projectionHash: ontologyDigest("synthetic-public-projection"), entities: 123, assertions: 456, focuses: 579 };
async function setup() {
  const f = await fixture(); await db.user.update({ where: { id: f.actor.id }, data: { isSuperAdmin: true } });
  let compileCount = 0;
  const publisher = createOntologyPublisher({ db, now: () => now, engineLockHash: ontologyDigest("synthetic-engine"),
    async buildInput(tx, actor, scope) {
      const authority = await tx.ontologySourceAuthorityDecision.findFirst({ where: { approvedBy: actor.id, sourceManifestHash: base.projectionHash, revokedAt: null } });
      if (!authority) throw new Error("No source approval");
      return { schemaVersion: 1, profile: "tm-owlrl-1", scope, registryNquads: "", assertions: [], sourceManifest: canonicalOntologyJson({ projectionHash: base.projectionHash, authorityId: authority.id }) } as MathOntologyCompileInput;
    },
    compiler: { async compile(input) { compileCount++; const files = Object.fromEntries(MATH_ONTOLOGY_HASH_KEYS.map(key => [key, key === "source" ? input.sourceManifest : `synthetic-${key}`])) as MathOntologyArtifact["files"], hashes = Object.fromEntries(MATH_ONTOLOGY_HASH_KEYS.map(key => [key, ontologyDigest(files[key])])) as MathOntologyArtifact["identity"]["hashes"]; return { identity: { schemaVersion: 1, profile: "tm-owlrl-1", graphVersion: ontologyDigest(canonicalOntologyJson(hashes)), hashes }, files }; } },
    verifyArtifact: async artifact => artifact, // Synthetic orchestration port; not an engine acceptance claim.
  });
  return { f, publisher, publication: createOntologyPublicationApproval({ db, publisher, base: () => base, now: () => now }), compileCount: () => compileCount };
}
describe("durable publication confirmation (synthetic compiler, actual PostgreSQL)", () => {
  it("discloses a legacy unsupported approved row, refuses new publication atomically, and preserves an earlier published replay", async () => {
    const { f, publication, publisher, compileCount } = await setup();
    const old = await publication.prepare(f.actor), oldInput = { confirmationId: old.confirmationId, sealHash: old.sealHash };
    const oldResult = await publication.confirm(f.actor, oldInput);
    const assertionCanonical = canonicalBytes({ id: `urn:todaymath:assertion:legacy-policy:${crypto.randomUUID()}`, subject: "urn:todaymath:concept:synthetic:a", predicate: "urn:todaymath:vocab:supports", object: "urn:todaymath:concept:synthetic:b", scope: "global", sourceRevision: "urn:todaymath:source:synthetic:r1", sourceDigest: digest("synthetic-source"), locator: "legacy unsupported fixture only", provenance: "unknown", origin: "authored", support: "unknown", review: "candidate", publication: "unpublished", distribution: "allowed", revision: 1 });
    const validationCanonical = canonicalBytes({ engine: "synthetic-policy-validation", conforms: true, incomplete: false, report: "[]", focusNodeCount: 1, results: [] });
    const row = await db.ontologyRelationReview.create({ data: { id: crypto.randomUUID(), scopeKey: "global", assertionId: JSON.parse(assertionCanonical).id, assertionCanonical, assertionHash: digest(assertionCanonical), proposedBy: f.actor.id, state: "approved", revision: 3, validationCanonical, validationHash: digest(validationCanonical), reviewerId: f.actor.id, reviewedAt: now } });
    try {
      const prepared = await publication.prepare(f.actor);
      expect(prepared.preview.excludedRelationCount).toBe(1);
      expect(prepared.preview.eligibleRelationCount).toBe(prepared.preview.relationCount - 1);
      const unused = async (): Promise<never> => { throw new Error("unused policy fixture port"); };
      const handler = createOntologyOperationsHandler({ authorize: async () => ({ actor: f.actor, response: null }), plans: {} as never, relations: {} as never, feedback: {} as never, students: unused, publication, readProposal: unused });
      const response = await handler(new Request("http://127.0.0.1/api/math-ontology/publish/prepare", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }));
      expect(response.status).toBe(200);
      const view = (await response.json()).data;
      expect(view.action).toBeUndefined(); expect(view.summary).toBe("근거·배포 조건을 확인해야 게시할 수 있습니다.");
      await expect(publication.confirm(f.actor, { confirmationId: prepared.confirmationId, sealHash: prepared.sealHash })).rejects.toMatchObject({ code: "EVIDENCE_INSUFFICIENT" });
      await expect(publisher.enqueue(f.actor, "global")).rejects.toMatchObject({ code: "EVIDENCE_INSUFFICIENT" });
      expect(await db.ontologySourceAuthorityDecision.count({ where: { id: prepared.confirmationId } })).toBe(0);
      expect(await db.ontologyCompileJob.count({ where: { id: prepared.confirmationId } })).toBe(0);
      expect(compileCount()).toBe(1);
      expect(await publication.confirm(f.actor, oldInput)).toEqual(oldResult);
      expect((await db.ontologyRelationReview.findUniqueOrThrow({ where: { id: row.id } })).assertionCanonical).toBe(assertionCanonical);
    } finally { await db.ontologyRelationReview.update({ where: { id: row.id }, data: { state: "retired", revision: { increment: 1 } } }); }
  });
  it("preview grants no authority; one explicit confirmation atomically records authority+job and repeats return one published result", async () => {
    const { f, publication, compileCount } = await setup();
    const preview = await publication.prepare(f.actor);
    expect(await db.ontologySourceAuthorityDecision.count({ where: { id: preview.confirmationId } })).toBe(0);
    expect(await db.ontologyCompileJob.count({ where: { id: preview.confirmationId } })).toBe(0);
    const first = await publication.confirm(f.actor, { confirmationId: preview.confirmationId, sealHash: preview.sealHash });
    expect(first.state).toBe("published");
    expect(await publication.confirm(f.actor, { confirmationId: preview.confirmationId, sealHash: preview.sealHash })).toEqual(first);
    expect(compileCount()).toBe(1);
    expect(await db.ontologySourceAuthorityDecision.count({ where: { id: first.id } })).toBe(1);
    expect(await db.ontologyCompileJob.count({ where: { id: first.id, state: "published" } })).toBe(1);
  });
  it("stale generation, client seal tampering or capability withdrawal cannot grant source authority or enqueue", async () => {
    const { f, publication } = await setup(); const preview = await publication.prepare(f.actor);
    const input = { confirmationId: preview.confirmationId, sealHash: preview.sealHash };
    await expect(publication.confirm(f.actor, { ...input, sealHash: ontologyDigest("tampered") })).rejects.toThrow();
    await db.ontologyActiveGraph.update({ where: { scopeKey: "global" }, data: { generation: { increment: 1 } } });
    await expect(publication.confirm(f.actor, input)).rejects.toThrow();
    expect(await db.ontologySourceAuthorityDecision.count({ where: { id: preview.confirmationId } })).toBe(0);
    const newer = await publication.prepare(f.actor);
    await db.user.update({ where: { id: f.actor.id }, data: { isSuperAdmin: false } });
    await expect(publication.confirm(f.actor, { confirmationId: newer.confirmationId, sealHash: newer.sealHash })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await db.ontologySourceAuthorityDecision.count({ where: { id: newer.confirmationId } })).toBe(0);
  });
});
