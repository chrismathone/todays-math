import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { db, fixture, localDatabaseUrl, now } from "./harness";
import { createOntologyPublisher } from "@/lib/math-ontology/publish/service";
import { loadOntologyRuntime } from "@/lib/math-ontology/runtime/artifact";
import { digest } from "@/lib/math-ontology/actions/canonical";
import type { MathOntologyArtifact, MathOntologyCompileInput } from "@/contracts/mathOntology.contract";
const directory = "/Users/pss/Desktop/creative/display-survey/consensus/ontology-full-20261023/independent/heldout-fixtures/E01/";
const input: MathOntologyCompileInput = JSON.parse(readFileSync(directory + "input.json", "utf8"));
const artifact: MathOntologyArtifact = JSON.parse(readFileSync(directory + "artifact.json", "utf8"));
describe("real PostgreSQL publication lease fencing (genuine E01 artifact, synthetic compile clock)", () => {
  it.each(["scope-lock", "release-create", "last-event", "generation-during-write", "none"] as const)("checks live lease after %s and preserves atomic activation", async point => {
    const f = await fixture(); await db.user.update({ where: { id: f.actor.id }, data: { isSuperAdmin: true } });
    let clock = now, activation = false, compileCount = 0, unlock!: () => void, held!: () => void;
    const acquired = new Promise<void>(resolve => { held = resolve; }), gate = new Promise<void>(resolve => { unlock = resolve; });
    let blocker: Promise<unknown> | undefined;
    const application = `ontology_publish_lease_${point.replaceAll("-", "_")}`;
    const client = new PrismaClient({ datasources: { db: { url: `${localDatabaseUrl}?application_name=${application}&connection_limit=2` } } });
    const hooked = client.$extends({ query: {
      ontologyRelease: { async create({ args, query }) { const result = await query(args); if (activation && point === "release-create") clock = new Date(clock.getTime() + 2000); return result; } },
      ontologyReviewEvent: { async create({ args, query }) { const result = await query(args); if (point === "last-event" && args.data.event === "publish.activated") clock = new Date(clock.getTime() + 2000); return result; } },
      ontologyCompileJob: { async update({ args, query }) { return query(point === "generation-during-write" && args.data.state === "published" ? { ...args, data: { ...args.data, leaseGeneration: { increment: 1 } } } : args); } },
    } });
    const publisher = createOntologyPublisher({ db: hooked as unknown as Pick<typeof db, "$transaction" | "ontologyCompileJob">, now: () => clock, engineLockHash: digest("synthetic-lease-clock-engine"), buildInput: async () => input,
      compiler: { async compile() {
        compileCount++; clock = new Date(now.getTime() + 539000); activation = true;
        if (point === "scope-lock") {
          blocker = db.$transaction(async tx => { await tx.$queryRaw`SELECT scope_key FROM ontology_active_graph WHERE scope_key = 'global' FOR UPDATE`; held(); await gate; }, { timeout: 10000 });
          await acquired;
        }
        return artifact;
      } },
      async verifyArtifact(raw) { await loadOntologyRuntime(raw, raw.identity); return raw; },
    });
    try {
      const job = await publisher.enqueue(f.actor, "global");
      const before = await db.ontologyActiveGraph.findUniqueOrThrow({ where: { scopeKey: "global" } });
      const pending = publisher.run(f.actor, job.jobId).then(value => ({ value }), error => ({ error }));
      if (point === "scope-lock") {
        await acquired; let waiting = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          const rows = await db.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM pg_stat_activity WHERE application_name = ${application} AND wait_event_type = 'Lock'`;
          if (Number(rows[0].n) > 0) { waiting = true; break; }
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        expect(waiting).toBe(true); clock = new Date(clock.getTime() + 2000); unlock(); await blocker;
      }
      const result = await pending;
      if (point === "none") {
        expect(result).toMatchObject({ value: { state: "published" } });
        expect((await db.ontologyActiveGraph.findUniqueOrThrow({ where: { scopeKey: "global" } })).generation).toBe(before.generation + 1);
        clock = new Date(now.getTime() + 541000);
        expect(await publisher.run(f.actor, job.jobId)).toMatchObject({ state: "published", graphVersion: artifact.identity.graphVersion }); expect(compileCount).toBe(1);
      } else {
        expect(result).toMatchObject({ error: { code: "STALE" } });
        expect(await db.ontologyRelease.count({ where: { jobId: job.jobId } })).toBe(0);
        expect(await db.ontologyReviewEvent.count({ where: { subjectId: job.jobId, event: "publish.activated" } })).toBe(0);
        expect(await db.ontologyActiveGraph.findUniqueOrThrow({ where: { scopeKey: "global" } })).toEqual(before);
        expect((await db.ontologyCompileJob.findUniqueOrThrow({ where: { id: job.jobId } })).state).toBe("stale");
        expect(await db.ontologyAudit.count({ where: { actorId: f.actor.id } })).toBe(0);
        expect(await db.ontologyOutbox.count({ where: { receipt: { actorId: f.actor.id } } })).toBe(0);
      }
    } finally { unlock(); await blocker; await client.$disconnect(); }
  });
});
