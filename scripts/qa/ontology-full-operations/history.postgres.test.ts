import { describe, expect, it } from "vitest";
import { db, fixture, now } from "./harness";
import { createOntologyHistoryDelivery } from "@/lib/math-ontology/outbox/history";
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
  const foreign = await fixture(); await expect(deliver(foreign.actor, receipt.id)).rejects.toThrow();
 });
});
