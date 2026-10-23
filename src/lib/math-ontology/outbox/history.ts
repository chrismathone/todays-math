import "server-only";
import type { PrismaClient, Prisma } from "@prisma/client";
import type { OntologyActionActor } from "../actions/authorization";
import { authorizeOntologyAction } from "../actions/authorization";
import { canonicalBytes, checkedCanonical } from "../actions/canonical";
import { requireOperation } from "../actions/errors";
import { createOntologyOutbox } from "./service";

/** Concrete application consumer: deliver the committed action into the
 * teacher's durable operation history. No email/chat/external side effects.
 * Stable outbox id is the history event id; lease and insertion/ack are fenced
 * in one transaction. Repeating execute or the explicit resume route recovers. */
export function createOntologyHistoryDelivery(deps: { db: Pick<PrismaClient, "$transaction" | "ontologyOutbox">; now?: () => Date }) {
  const clock = deps.now ?? (() => new Date());
  return async (actor: OntologyActionActor, receiptId: string) => {
    async function authorize(tx: Prisma.TransactionClient) {
      const receipt = await tx.ontologyReceipt.findUnique({ where: { id: receiptId }, include: { proposal: true } });
      requireOperation(receipt && receipt.actorId === actor.id, "NOT_FOUND");
      await authorizeOntologyAction(tx, actor, { studentId: receipt.proposal.studentId, classId: receipt.proposal.classId, branchId: receipt.proposal.branchId }, clock);
    }
    await deps.db.$transaction(authorize);
    const lease = await createOntologyOutbox({ db: deps.db, receiptId, now: clock, authorize }).claim();
    if (!lease) return { state: "waiting-or-delivered" as const };
    return deps.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM ontology_outbox WHERE id = ${lease.id}::uuid FOR UPDATE`;
      const row = await tx.ontologyOutbox.findUniqueOrThrow({ where: { id: lease.id } });
      const receipt = await tx.ontologyReceipt.findUnique({ where: { id: receiptId }, include: { proposal: true } });
      requireOperation(receipt && receipt.actorId === actor.id && row.receiptId === receiptId, "NOT_FOUND");
      const target = { studentId: receipt.proposal.studentId, classId: receipt.proposal.classId, branchId: receipt.proposal.branchId };
      await authorizeOntologyAction(tx, actor, target, clock);
      requireOperation(row.status === "leased" && row.leaseGeneration === lease.leaseGeneration && row.leaseUntil && row.leaseUntil > clock(), "STALE");
      const deadline = row.leaseUntil;
      checkedCanonical(row.bodyCanonical, row.bodyHash);
      const previous = await tx.ontologyReviewEvent.findUnique({ where: { id: row.id } });
      if (previous) requireOperation(previous.subjectId === receiptId && previous.actorId === actor.id && previous.detailHash === row.bodyHash && previous.detailCanonical === row.bodyCanonical, "BINDING_MISMATCH");
      else await tx.ontologyReviewEvent.create({ data: { id: row.id, actorId: actor.id, scopeKey: `owner:${actor.id}`, subjectId: receiptId, event: "action.history.delivered", detailCanonical: row.bodyCanonical, detailHash: row.bodyHash, createdAt: clock() } });
      requireOperation(canonicalBytes(lease.body) === row.bodyCanonical, "BINDING_MISMATCH");
      await tx.ontologyOutbox.update({ where: { id: row.id }, data: { status: "delivered", deliveredAt: clock(), leaseUntil: null, lastErrorCode: null } });
      const finalized = await tx.ontologyOutbox.findUniqueOrThrow({ where: { id: row.id } });
      await authorizeOntologyAction(tx, actor, target, clock);
      requireOperation(finalized.status === "delivered" && finalized.leaseGeneration === lease.leaseGeneration && deadline > clock(), "STALE");
      return { state: "delivered" as const };
    });
  };
}
