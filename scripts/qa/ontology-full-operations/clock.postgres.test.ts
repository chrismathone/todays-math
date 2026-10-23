import { describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { db, now, localDatabaseUrl } from "./harness";
import { managedFixture } from "./managed-fixture";
import { readOntologyActorInTransaction } from "@/lib/math-ontology/actions/actor";
import { createOntologyActionService } from "@/lib/math-ontology/actions/service";
import { authorizeMathOntologySourceRead } from "@/lib/math-ontology/sources/server";
import { authorizeOntologyAction } from "@/lib/math-ontology/actions/authorization";
import { readSrsState, srsStateTableIn } from "@/lib/math-srs/serverStore";

describe("read-only student connection capability parity", () => {
 it("allows current student:read context while refusing progress:write", async () => {
  const f = await managedFixture(new Date(now.getTime() + 60000));
  const account = await db.eywaManagedAccount.findUniqueOrThrow({ where: { id: f.managedId } });
  const grants = account.sourceClasses as { id: string; permissionRevision: string; capabilities: string[]; validUntil: null }[];
  await db.eywaManagedAccount.update({ where: { id: f.managedId }, data: { sourceClasses: grants.map(g => ({ ...g, capabilities: ["student:read"] })) } });
  await db.classMembership.update({ where: { id: f.membershipId }, data: { capabilities: ["student:read"] } });
  await expect(db.$transaction(tx => authorizeMathOntologySourceRead(tx, { actor: f.actor, target: f.target, graphVersion: "synthetic:selector", now, authorizationNow: () => now }))).resolves.toHaveProperty("student.id", f.student.id);
  await expect(db.$transaction(tx => authorizeOntologyAction(tx, f.actor, f.target, () => now))).rejects.toMatchObject({ code: "FORBIDDEN" });
 });
});
describe("actual PostgreSQL lock-wait and final-write lease freshness", () => {
  it("uses the injected live clock after a real row lock wait, with an unexpired control", async () => {
    const f = await managedFixture(new Date(now.getTime() + 1000));
    let clock = now;
    let unlock!: () => void, locked!: () => void;
    const held = new Promise<void>(resolve => { locked = resolve; });
    const gate = new Promise<void>(resolve => { unlock = resolve; });
    const blocker = db.$transaction(async tx => { await tx.$queryRaw`SELECT id FROM "user" WHERE id = ${f.actor.id}::uuid FOR UPDATE`; locked(); await gate; }, { timeout: 10000 });
    await held;
    const reader = new PrismaClient({ datasources: { db: { url: `${localDatabaseUrl}?application_name=ontology_clock_reader&connection_limit=1` } } });
    try {
      const pending = reader.$transaction(tx => readOntologyActorInTransaction(tx, f.actor, () => clock));
      // Observe the actual backend waiting on a PostgreSQL lock before advancing
      // the deterministic authorization clock; no fake timer replaces the DB.
      let waiting = false;
      for (let i = 0; i < 100; i++) {
        const rows = await db.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM pg_stat_activity WHERE application_name = 'ontology_clock_reader' AND wait_event_type = 'Lock'`;
        if (Number(rows[0].n) > 0) { waiting = true; break; }
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(waiting).toBe(true); clock = new Date(now.getTime() + 2000); unlock(); await blocker;
      await expect(pending).rejects.toMatchObject({ code: "FORBIDDEN" });
      await db.eywaManagedAccount.update({ where: { id: f.managedId }, data: { leaseExpiresAt: new Date(now.getTime() + 60000) } });
      await db.eywaBinding.update({ where: { id: f.bindingId }, data: { leaseExpiresAt: new Date(now.getTime() + 60000) } });
      await expect(reader.$transaction(tx => readOntologyActorInTransaction(tx, f.actor, () => clock))).resolves.toHaveProperty("row.id", f.actor.id);
    } finally { unlock(); await blocker; await reader.$disconnect(); }
  });
  it("rolls back state, consumed approval, receipt, audit and outbox if lease expires after the last mutation", async () => {
    const f = await managedFixture(new Date(now.getTime() + 1000)); let clock = now;
    const service = createOntologyActionService({ db, evidence: f.evidence, now: () => clock, failpoint: async stage => { if (stage === "outbox-written") clock = new Date(now.getTime() + 2000); } });
    const p = await service.propose(f.actor, f.input), approval = await service.approve(f.actor, { proposalId: p.proposalId, sealHash: p.sealHash });
    await expect(service.execute(f.actor, approval)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await readSrsState(f.student.id, srsStateTableIn(db))).revision).toBe(1);
    expect(await db.ontologyReceipt.count({ where: { proposalId: p.proposalId } })).toBe(0);
    expect((await db.ontologyApproval.findUniqueOrThrow({ where: { id: approval.approvalId } })).consumedAt).toBeNull();
    expect(await db.ontologyAudit.count({ where: { actorId: f.actor.id } })).toBe(0);
    expect(await db.ontologyOutbox.count({ where: { receipt: { proposalId: p.proposalId } } })).toBe(0);
  });
});
