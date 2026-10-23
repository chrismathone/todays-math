import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma, PrismaClient } from "@prisma/client";
import { isoDateTimeSchema } from "@/contracts/common.contract";
import {
  ontologyActionFeedbackInputSchema,
  ontologyActionReceiptSchema,
  ontologyActionTargetSchema,
  ontologyOpaqueIdentitySchema,
  type OntologyActionTarget,
} from "@/contracts/mathOntologyAction.contract";
import {
  authorizeOntologyAction,
  type OntologyActionActor,
} from "../actions/authorization";
import { canonicalBytes, checkedCanonical, digest } from "../actions/canonical";
import { requireOperation } from "../actions/errors";

const count = z.number().int().nonnegative();
const resolvedObservationSchema = z
  .strictObject({
    actorId: z.string().uuid(),
    target: ontologyActionTargetSchema,
    sourceSnapshotId: ontologyOpaqueIdentitySchema,
    graphVersion: ontologyOpaqueIdentitySchema,
    studentRevision: count,
    windowStart: isoDateTimeSchema,
    windowEnd: isoDateTimeSchema,
    counts: z.strictObject({
      retainedFirstAttempts: count,
      independentCorrect: count,
      independentIncorrect: count,
      excluded: count,
    }),
    sourceIds: z.array(ontologyOpaqueIdentitySchema).max(1000),
  })
  .superRefine((value, ctx) => {
    if (
      value.counts.independentCorrect +
        value.counts.independentIncorrect +
        value.counts.excluded !==
        value.counts.retainedFirstAttempts ||
      new Set(value.sourceIds).size !== value.sourceIds.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Invalid retained observation counts or source ids",
      });
  });
type ResolvedObservation = z.infer<typeof resolvedObservationSchema>;
export interface OntologyObservationPort {
  /** Current authorized retained observations, bounded at the action commit.
   * It must not infer causality, mastery or reconstruction of absent history.
   */
  resolve(
    tx: Prisma.TransactionClient,
    actor: OntologyActionActor,
    target: OntologyActionTarget,
    sourceSnapshotId: string,
    now: Date,
  ): Promise<ResolvedObservation>;
}

export function createOntologyFeedbackService(deps: {
  db: Pick<PrismaClient, "$transaction">;
  observations: OntologyObservationPort;
  now?: () => Date;
}) {
  const now = deps.now ?? (() => new Date());
  async function authorized(
    tx: Prisma.TransactionClient,
    actor: OntologyActionActor,
    receiptId: string,
    time: Date,
  ) {
    const receipt = await tx.ontologyReceipt.findUnique({
      where: { id: receiptId },
      include: { proposal: true },
    });
    requireOperation(receipt && receipt.actorId === actor.id, "NOT_FOUND");
    const target = {
      studentId: receipt.proposal.studentId,
      classId: receipt.proposal.classId,
      branchId: receipt.proposal.branchId,
    };
    await authorizeOntologyAction(tx, actor, target, time);
    const result = ontologyActionReceiptSchema.parse(
      checkedCanonical(receipt.resultCanonical, receipt.resultHash),
    );
    requireOperation(
      result.id === receiptId && result.proposalId === receipt.proposalId,
      "BINDING_MISMATCH",
    );
    return { receipt, result, target };
  }
  return {
    async record(actor: OntologyActionActor, raw: unknown) {
      const input = ontologyActionFeedbackInputSchema.parse(raw);
      return deps.db.$transaction(async (tx) => {
        const time = now(),
          { result, target } = await authorized(
            tx,
            actor,
            input.receiptId,
            time,
          );
        const value = resolvedObservationSchema.parse(
          await deps.observations.resolve(
            tx,
            actor,
            target,
            input.sourceSnapshotId,
            time,
          ),
        );
        requireOperation(
          value.actorId === actor.id &&
            canonicalBytes(value.target) === canonicalBytes(target) &&
            value.sourceSnapshotId === input.sourceSnapshotId,
          "BINDING_MISMATCH",
        );
        requireOperation(
          value.studentRevision >= result.afterRevision &&
            Date.parse(value.windowStart) >= Date.parse(result.committedAt) &&
            Date.parse(value.windowStart) <= Date.parse(value.windowEnd) &&
            Date.parse(value.windowEnd) <= time.getTime(),
          "STALE",
        );
        const observation = {
          kind: "descriptive" as const,
          receiptId: result.id,
          sourceSnapshotId: value.sourceSnapshotId,
          graphVersion: value.graphVersion,
          studentRevision: value.studentRevision,
          windowStart: value.windowStart,
          windowEnd: value.windowEnd,
          counts: value.counts,
          sourceIds: value.sourceIds,
        };
        const observationCanonical = canonicalBytes(observation),
          observationHash = digest(observationCanonical);
        const row = await tx.ontologyFeedback.upsert({
          where: {
            receiptId_observationHash: {
              receiptId: result.id,
              observationHash,
            },
          },
          update: {},
          create: {
            id: randomUUID(),
            receiptId: result.id,
            actorId: actor.id,
            sourceSnapshotId: input.sourceSnapshotId,
            observationCanonical,
            observationHash,
            observedAt: new Date(value.windowEnd),
            createdAt: time,
          },
        });
        return { id: row.id, observation };
      });
    },
    async list(actor: OntologyActionActor, receiptId: string) {
      z.uuid().parse(receiptId);
      return deps.db.$transaction(async (tx) => {
        await authorized(tx, actor, receiptId, now());
        const rows = await tx.ontologyFeedback.findMany({
          where: { receiptId },
          orderBy: [{ observedAt: "asc" }, { id: "asc" }],
          take: 100,
        });
        return rows.map((row) => ({
          id: row.id,
          observation: checkedCanonical(
            row.observationCanonical,
            row.observationHash,
          ),
        }));
      });
    },
  };
}
