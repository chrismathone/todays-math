import { describe, expect, it } from "vitest";
import { db, now, fixture } from "./harness";
import { createOntologyOutbox } from "@/lib/math-ontology/outbox/service";
import { createOntologyFeedbackService } from "@/lib/math-ontology/feedback/service";

describe("durable outbox repair and descriptive feedback", () => {
  it("redelivers after an expired lease with the same event id; old workers cannot acknowledge a new lease", async () => {
    const f = await fixture(),
      { approval } = await f.ready();
    const receipt = await f.service.execute(f.actor, approval);
    let clock = now;
    const worker = createOntologyOutbox({
      db,
      now: () => clock,
      receiptId: receipt.id,
    });
    const first = await worker.claim();
    expect(first?.body).toMatchObject({ receiptId: receipt.id });
    clock = new Date(now.getTime() + 61000);
    const resumed = await worker.claim();
    expect(resumed?.id).toBe(first!.id);
    expect(resumed!.leaseGeneration).toBe(first!.leaseGeneration + 1);
    expect(await worker.acknowledge(first!)).toBe(false);
    expect(await worker.acknowledge(resumed!)).toBe(true);
    expect(await worker.claim()).toBeNull();
    expect(
      (
        await db.studentSrsState.findUniqueOrThrow({
          where: { studentId: f.student.id },
        })
      ).revision,
    ).toBe(2);
  });
  it("queues failed delivery without losing the committed primary audit and never calls an external channel in QA", async () => {
    const f = await fixture(),
      { approval } = await f.ready();
    const receipt = await f.service.execute(f.actor, approval);
    const worker = createOntologyOutbox({
      db,
      now: () => now,
      receiptId: receipt.id,
    });
    expect(
      await worker.deliverOne(async () => {
        throw new Error("synthetic sink down");
      }),
    ).toBe("retry");
    expect(
      await db.ontologyAudit.count({ where: { receiptId: receipt.id } }),
    ).toBe(1);
    const row = await db.ontologyOutbox.findUniqueOrThrow({
      where: { receiptId: receipt.id },
    });
    expect(row.status).toBe("queued");
    expect(row.lastErrorCode).toBe("delivery-failed");
    expect(row.lastErrorCode).not.toContain("synthetic");
  });
  it("records authorized subsequent counts as descriptive evidence, deduplicates it and changes no student state", async () => {
    const f = await fixture(),
      { approval } = await f.ready();
    const receipt = await f.service.execute(f.actor, approval);
    const later = new Date(now.getTime() + 3600000);
    const observations = {
      resolve: async () => ({
        actorId: f.actor.id,
        target: f.target,
        sourceSnapshotId: "opaque:after",
        graphVersion: f.graphVersion,
        studentRevision: 2,
        windowStart: now.toISOString(),
        windowEnd: later.toISOString(),
        counts: {
          retainedFirstAttempts: 4,
          independentCorrect: 2,
          independentIncorrect: 1,
          excluded: 1,
        },
        sourceIds: ["synthetic:observation-2"],
      }),
    };
    const feedback = createOntologyFeedbackService({
      db,
      observations,
      now: () => later,
    });
    const first = await feedback.record(f.actor, {
      receiptId: receipt.id,
      sourceSnapshotId: "opaque:after",
    });
    expect(
      await feedback.record(f.actor, {
        receiptId: receipt.id,
        sourceSnapshotId: "opaque:after",
      }),
    ).toEqual(first);
    expect(first.observation.kind).toBe("descriptive");
    expect(first.observation).not.toHaveProperty("mastery");
    expect(
      (
        await db.studentSrsState.findUniqueOrThrow({
          where: { studentId: f.student.id },
        })
      ).revision,
    ).toBe(2);
    expect(await feedback.list(f.actor, receipt.id)).toHaveLength(1);
    await db.user.update({
      where: { id: f.actor.id },
      data: { disabledMenus: ["srs"] },
    });
    await expect(feedback.list(f.actor, receipt.id)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
  it("refuses pre-action observations and forged outcome fields rather than converting feedback to efficacy", async () => {
    const f = await fixture(),
      { approval } = await f.ready();
    const receipt = await f.service.execute(f.actor, approval);
    const observations = {
      resolve: async () => ({
        actorId: f.actor.id,
        target: f.target,
        sourceSnapshotId: "opaque:before",
        graphVersion: f.graphVersion,
        studentRevision: 2,
        windowStart: new Date(now.getTime() - 1).toISOString(),
        windowEnd: now.toISOString(),
        counts: {
          retainedFirstAttempts: 1,
          independentCorrect: 1,
          independentIncorrect: 0,
          excluded: 0,
        },
        sourceIds: ["synthetic:observation-old"],
      }),
    };
    const feedback = createOntologyFeedbackService({
      db,
      observations,
      now: () => now,
    });
    await expect(
      feedback.record(f.actor, {
        receiptId: receipt.id,
        sourceSnapshotId: "opaque:before",
      }),
    ).rejects.toMatchObject({ code: "STALE" });
    await expect(
      feedback.record(f.actor, {
        receiptId: receipt.id,
        sourceSnapshotId: "opaque:before",
        efficacy: 100,
      }),
    ).rejects.toThrow();
  });
});
