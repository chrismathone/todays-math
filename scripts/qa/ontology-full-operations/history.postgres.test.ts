import { describe, expect, it } from "vitest";
import { db, fixture, now } from "./harness";
import { createOntologyHistoryDelivery } from "@/lib/math-ontology/outbox/history";
import { createOntologyHistoryReader } from "@/lib/math-ontology/actions/history";
describe("concrete internal outbox history consumer", () => {
 it("delivers one stable event and fence-ack, and denies a foreign actor", async () => {
  const f = await fixture(), { approval } = await f.ready(), receipt = await f.service.execute(f.actor, approval);
  const deliver = createOntologyHistoryDelivery({ db, now: () => now });
  expect(await deliver(f.actor, receipt.id)).toEqual({ state: "delivered" });
  expect(await deliver(f.actor, receipt.id)).toEqual({ state: "waiting-or-delivered" });
  const outbox = await db.ontologyOutbox.findFirstOrThrow({ where: { receiptId: receipt.id } });
  expect(outbox.status).toBe("delivered");
  const event = await db.ontologyReviewEvent.findUniqueOrThrow({ where: { id: outbox.id } });
  expect(event.event).toBe("action.history.delivered"); expect(event.subjectId).toBe(receipt.id);
  expect(await db.ontologyReviewEvent.count({ where: { id: outbox.id } })).toBe(1);
  const read = createOntologyHistoryReader({ db, now: () => now });
  const history = await read(f.actor);
  expect(history.steps.some(step => step.id === receipt.id)).toBe(true);
  await db.student.update({ where: { id: f.student.id }, data: { classId: (await fixture()).cls.id } });
  expect((await read(f.actor)).steps.some(step => step.id === receipt.id)).toBe(false);
  const foreign = await fixture(); await expect(deliver(foreign.actor, receipt.id)).rejects.toThrow();
 });
});
