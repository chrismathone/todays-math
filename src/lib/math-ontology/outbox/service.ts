import "server-only";
import type { PrismaClient, Prisma } from "@prisma/client";
import { checkedCanonical, type CanonicalValue } from "../actions/canonical";

export type OntologyOutboxLease = {
  id: string;
  leaseGeneration: number;
  topic: string;
  body: CanonicalValue;
};

/** At-least-once delivery of a stable event id. The primary audit is already
 * durable in the action transaction; a sink must deduplicate this event id.
 */
export function createOntologyOutbox(deps: {
  db: Pick<PrismaClient, "$transaction" | "ontologyOutbox">;
  now?: () => Date;
  receiptId?: string;
  authorize?: (tx: Prisma.TransactionClient) => Promise<void>;
}) {
  const now = deps.now ?? (() => new Date());
  async function claim(): Promise<OntologyOutboxLease | null> {
    return deps.db.$transaction(async (tx) => {
      const time = now(),
        receiptId = deps.receiptId ?? null;
      const candidates = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM ontology_outbox WHERE ((status = 'queued' AND available_at <= ${time}) OR (status = 'leased' AND lease_until <= ${time})) AND (${receiptId}::uuid IS NULL OR receipt_id = ${receiptId}::uuid) ORDER BY available_at, id FOR UPDATE SKIP LOCKED LIMIT 1`;
      if (!candidates.length) return null;
      const row = await tx.ontologyOutbox.findUniqueOrThrow({
        where: { id: candidates[0].id },
      });
      await deps.authorize?.(tx);
      let body: CanonicalValue;
      try {
        body = checkedCanonical(row.bodyCanonical, row.bodyHash);
      } catch {
        await tx.ontologyOutbox.update({
          where: { id: row.id },
          data: {
            status: "failed",
            lastErrorCode: "binding-mismatch",
            leaseUntil: null,
          },
        });
        await deps.authorize?.(tx);
        return null;
      }
      const next = await tx.ontologyOutbox.update({
        where: { id: row.id },
        data: {
          status: "leased",
          leaseGeneration: { increment: 1 },
          attempts: { increment: 1 },
          leaseUntil: new Date(time.getTime() + 60000),
        },
      });
      await deps.authorize?.(tx);
      return {
        id: row.id,
        leaseGeneration: next.leaseGeneration,
        topic: row.topic,
        body,
      };
    });
  }
  async function acknowledge(lease: OntologyOutboxLease) {
    const time = now();
    return (
      (
        await deps.db.ontologyOutbox.updateMany({
          where: {
            id: lease.id,
            leaseGeneration: lease.leaseGeneration,
            status: "leased",
            leaseUntil: { gt: time },
          },
          data: {
            status: "delivered",
            deliveredAt: time,
            leaseUntil: null,
            lastErrorCode: null,
          },
        })
      ).count === 1
    );
  }
  return {
    claim,
    acknowledge,
    async deliverOne(sink: (event: OntologyOutboxLease) => Promise<void>) {
      const lease = await claim();
      if (!lease) return "empty" as const;
      try {
        await sink(lease);
      } catch {
        await deps.db.ontologyOutbox.updateMany({
          where: {
            id: lease.id,
            leaseGeneration: lease.leaseGeneration,
            status: "leased",
          },
          data: {
            status: "queued",
            leaseUntil: null,
            availableAt: new Date(now().getTime() + 30000),
            lastErrorCode: "delivery-failed",
          },
        });
        return "retry" as const;
      }
      return (await acknowledge(lease))
        ? ("delivered" as const)
        : ("lease-lost" as const);
    },
  };
}
