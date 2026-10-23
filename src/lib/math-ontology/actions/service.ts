import "server-only";
import { randomUUID } from "node:crypto";
import type { OntologyProposal, Prisma, PrismaClient } from "@prisma/client";
import {
  ontologyActionApprovalInputSchema,
  ontologyActionExecutionInputSchema,
  ontologyActionBindingSchema,
  ontologyActionReceiptSchema,
  ontologyActionTargetSchema,
  ontologyPlanArgsSchema,
  type OntologyActionTarget,
} from "@/contracts/mathOntologyAction.contract";
import {
  changeSrsState,
  readSrsState,
  srsStateTableIn,
} from "@/lib/math-srs/serverStore";
import {
  authorizeOntologyAction,
  type OntologyActionActor,
} from "./authorization";
import {
  canonicalBytes,
  checkedCanonical,
  digest,
  type CanonicalValue,
} from "./canonical";
import {
  COURSE_PLAN_ACTION,
  coursePlanTransition,
  previewCoursePlan,
} from "./coursePlan";
import { OntologyOperationError, requireOperation } from "./errors";

export interface ResolvedActionEvidence {
  graphVersion: string;
  sourceSnapshotId: string;
  studentRevision: number;
  actorId: string;
  target: OntologyActionTarget;
  expiresAt: string;
  sourceSnapshot: CanonicalValue;
  evidencePacket: CanonicalValue;
}
/** Must resolve authorized, validated, immutable evidence from server state.
 * Called inside the transaction: no model/HTTP calls, no client-declared bytes.
 * Implementations lock/check the current graph generation and revocation row.
 */
export interface OntologyActionEvidencePort {
  resolve(
    tx: Prisma.TransactionClient,
    actor: OntologyActionActor,
    target: OntologyActionTarget,
    ref: { graphVersion: string; sourceSnapshotId: string },
    now: Date,
  ): Promise<ResolvedActionEvidence>;
}
export type OperationFailpoint =
  | "approval-consumed"
  | "student-written"
  | "receipt-written"
  | "audit-written"
  | "outbox-written";

function targetOf(row: OntologyProposal): OntologyActionTarget {
  return {
    studentId: row.studentId,
    classId: row.classId,
    branchId: row.branchId,
  };
}
function seal(
  row: Pick<
    OntologyProposal,
    | "id"
    | "actorId"
    | "studentId"
    | "classId"
    | "branchId"
    | "actionId"
    | "bindingCanonical"
    | "authorizationStamp"
    | "expiresAt"
    | "createdAt"
  >,
) {
  return digest(
    canonicalBytes({
      id: row.id,
      actorId: row.actorId,
      target: targetOf(row as OntologyProposal),
      actionId: row.actionId,
      bindingCanonical: row.bindingCanonical,
      authorizationStamp: row.authorizationStamp,
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    }),
  );
}
function verifyProposal(row: OntologyProposal, expectedSeal: string) {
  requireOperation(
    row.actionId === COURSE_PLAN_ACTION &&
      expectedSeal === row.sealHash &&
      seal(row) === row.sealHash,
    "BINDING_MISMATCH",
  );
  try {
    const binding = ontologyActionBindingSchema.parse(
      JSON.parse(row.bindingCanonical),
    );
    requireOperation(
      canonicalBytes(binding) === row.bindingCanonical,
      "BINDING_MISMATCH",
    );
    const args = ontologyPlanArgsSchema.parse(
      checkedCanonical(row.argumentsCanonical, binding.argumentHash),
    );
    checkedCanonical(row.evidenceCanonical, binding.evidencePacketHash);
    checkedCanonical(row.sourceCanonical, binding.sourceSnapshotHash);
    checkedCanonical(row.previewCanonical, binding.previewHash);
    requireOperation(
      binding.contextHash ===
        digest(
          canonicalBytes({
            target: targetOf(row),
            authorizationStamp: row.authorizationStamp,
          }),
        ),
      "BINDING_MISMATCH",
    );
    return { binding, args };
  } catch {
    throw new OntologyOperationError("BINDING_MISMATCH");
  }
}

export function createOntologyActionService(deps: {
  db: Pick<PrismaClient, "$transaction">;
  evidence: OntologyActionEvidencePort;
  now?: () => Date;
  failpoint?: (stage: OperationFailpoint) => Promise<void>;
}) {
  const now = deps.now ?? (() => new Date());
  const transaction = <T>(run: (tx: Prisma.TransactionClient) => Promise<T>) =>
    deps.db.$transaction(run, { maxWait: 10000, timeout: 20000 });
  async function resolve(
    tx: Prisma.TransactionClient,
    actor: OntologyActionActor,
    target: OntologyActionTarget,
    ref: { graphVersion: string; sourceSnapshotId: string },
    revision: number,
    time: Date,
  ) {
    const value = await deps.evidence.resolve(tx, actor, target, ref, time);
    requireOperation(
      value.actorId === actor.id &&
        canonicalBytes(value.target) === canonicalBytes(target) &&
        value.graphVersion === ref.graphVersion &&
        value.sourceSnapshotId === ref.sourceSnapshotId &&
        value.studentRevision === revision,
      "STALE",
    );
    requireOperation(
      Number.isFinite(Date.parse(value.expiresAt)) &&
        Date.parse(value.expiresAt) > time.getTime(),
      "EXPIRED",
    );
    return value;
  }
  async function lockedProposal(
    tx: Prisma.TransactionClient,
    actor: OntologyActionActor,
    id: string,
    time: Date,
  ) {
    const initial = await tx.ontologyProposal.findUnique({ where: { id } });
    requireOperation(initial && initial.actorId === actor.id, "NOT_FOUND");
    const access = await authorizeOntologyAction(
      tx,
      actor,
      targetOf(initial),
      time,
    );
    await tx.$queryRaw`SELECT id FROM ontology_proposal WHERE id = ${id}::uuid FOR UPDATE`;
    const row = await tx.ontologyProposal.findUniqueOrThrow({ where: { id } });
    requireOperation(
      row.actorId === actor.id &&
        canonicalBytes(targetOf(row)) === canonicalBytes(targetOf(initial)),
      "BINDING_MISMATCH",
    );
    return { row, access };
  }
  async function current(
    tx: Prisma.TransactionClient,
    actor: OntologyActionActor,
    row: OntologyProposal,
    access: { authorizationStamp: string },
    expectedSeal: string,
    time: Date,
  ) {
    const { args, binding } = verifyProposal(row, expectedSeal);
    requireOperation(row.expiresAt > time, "EXPIRED");
    requireOperation(
      row.authorizationStamp === access.authorizationStamp,
      "STALE",
    );
    const saved = await readSrsState(row.studentId, srsStateTableIn(tx));
    requireOperation(
      saved.revision === binding.expectedStudentRevision,
      "STALE",
    );
    const actual = await resolve(
      tx,
      actor,
      targetOf(row),
      binding,
      saved.revision,
      time,
    );
    requireOperation(
      digest(canonicalBytes(actual.sourceSnapshot)) ===
        binding.sourceSnapshotHash &&
        digest(canonicalBytes(actual.evidencePacket)) ===
          binding.evidencePacketHash,
      "BINDING_MISMATCH",
    );
    const preview = await previewCoursePlan(
      row.studentId,
      saved.state,
      saved.revision,
      args,
      time,
    );
    requireOperation(
      digest(canonicalBytes(preview)) === binding.previewHash,
      "STALE",
    );
    return { args, binding, saved };
  }
  return {
    async propose(
      actor: OntologyActionActor,
      input: {
        target: OntologyActionTarget;
        args: unknown;
        graphVersion: string;
        sourceSnapshotId: string;
      },
    ) {
      const target = ontologyActionTargetSchema.parse(input.target);
      const args = ontologyPlanArgsSchema.parse(input.args);
      return transaction(async (tx) => {
        const time = now();
        const access = await authorizeOntologyAction(tx, actor, target, time);
        const saved = await readSrsState(target.studentId, srsStateTableIn(tx));
        const actual = await resolve(
          tx,
          actor,
          target,
          input,
          saved.revision,
          time,
        );
        const preview = await previewCoursePlan(
          target.studentId,
          saved.state,
          saved.revision,
          args,
          time,
        );
        const argumentsCanonical = canonicalBytes(args),
          evidenceCanonical = canonicalBytes(actual.evidencePacket),
          sourceCanonical = canonicalBytes(actual.sourceSnapshot),
          previewCanonical = canonicalBytes(preview);
        const binding = ontologyActionBindingSchema.parse({
          version: 1,
          actionId: COURSE_PLAN_ACTION,
          graphVersion: actual.graphVersion,
          sourceSnapshotId: actual.sourceSnapshotId,
          sourceSnapshotHash: digest(sourceCanonical),
          argumentHash: digest(argumentsCanonical),
          evidencePacketHash: digest(evidenceCanonical),
          previewHash: digest(previewCanonical),
          contextHash: digest(
            canonicalBytes({
              target,
              authorizationStamp: access.authorizationStamp,
            }),
          ),
          expectedStudentRevision: saved.revision,
        });
        const row = {
          id: randomUUID(),
          actorId: actor.id,
          ...target,
          actionId: COURSE_PLAN_ACTION,
          argumentsCanonical,
          evidenceCanonical,
          sourceCanonical,
          previewCanonical,
          bindingCanonical: canonicalBytes(binding),
          authorizationStamp: access.authorizationStamp,
          createdAt: time,
          expiresAt: new Date(
            Math.min(
              time.getTime() + 10 * 60_000,
              Date.parse(actual.expiresAt),
            ),
          ),
        };
        const proposal = await tx.ontologyProposal.create({
          data: { ...row, sealHash: seal(row) },
        });
        return {
          proposalId: proposal.id,
          sealHash: proposal.sealHash,
          binding,
          preview,
          expiresAt: proposal.expiresAt.toISOString(),
        };
      });
    },
    async approve(actor: OntologyActionActor, raw: unknown) {
      const input = ontologyActionApprovalInputSchema.parse(raw);
      return transaction(async (tx) => {
        const time = now(),
          { row, access } = await lockedProposal(
            tx,
            actor,
            input.proposalId,
            time,
          );
        verifyProposal(row, input.sealHash);
        const existing = await tx.ontologyApproval.findUnique({
          where: { proposalId: row.id },
        });
        if (existing) {
          requireOperation(
            existing.actorId === actor.id &&
              existing.sealHash === input.sealHash,
            "BINDING_MISMATCH",
          );
          // A lost execute response may repeat approval. Fresh authorization has
          // already run; a consumed approval is recovery, never a new mutation.
          if (existing.consumedAt) {
            const receipt = await tx.ontologyReceipt.findUnique({ where: { approvalId: existing.id } });
            requireOperation(row.status === "executed" && receipt, "BINDING_MISMATCH");
            return { approvalId: existing.id, proposalId: row.id, sealHash: input.sealHash };
          }
          await current(tx, actor, row, access, input.sealHash, time);
          return {
            approvalId: existing.id,
            proposalId: row.id,
            sealHash: input.sealHash,
          };
        }
        await current(tx, actor, row, access, input.sealHash, time);
        requireOperation(row.status === "draft", "CONFLICT");
        const approval = await tx.ontologyApproval.create({
          data: {
            id: randomUUID(),
            actorId: actor.id,
            proposalId: row.id,
            sealHash: input.sealHash,
            approvedAt: time,
          },
        });
        await tx.ontologyProposal.update({
          where: { id: row.id },
          data: { status: "approved" },
        });
        return {
          approvalId: approval.id,
          proposalId: row.id,
          sealHash: input.sealHash,
        };
      });
    },
    async execute(actor: OntologyActionActor, raw: unknown) {
      const input = ontologyActionExecutionInputSchema.parse(raw);
      return transaction(async (tx) => {
        const time = now(),
          { row, access } = await lockedProposal(
            tx,
            actor,
            input.proposalId,
            time,
          );
        const verified = verifyProposal(row, input.sealHash);
        const approval = await tx.ontologyApproval.findUnique({
          where: { id: input.approvalId },
        });
        requireOperation(
          approval &&
            approval.proposalId === row.id &&
            approval.actorId === actor.id &&
            approval.sealHash === input.sealHash,
          "BINDING_MISMATCH",
        );
        const previous = await tx.ontologyReceipt.findUnique({
          where: { approvalId: approval.id },
        });
        if (previous) {
          requireOperation(
            previous.actorId === actor.id &&
              row.status === "executed" &&
              approval.consumedAt,
            "BINDING_MISMATCH",
          );
          const result = ontologyActionReceiptSchema.parse(
            checkedCanonical(previous.resultCanonical, previous.resultHash),
          );
          requireOperation(
            result.id === previous.id &&
              result.proposalId === row.id &&
              result.approvalId === approval.id &&
              canonicalBytes(result.binding) ===
                canonicalBytes(verified.binding),
            "BINDING_MISMATCH",
          );
          return result;
        }
        requireOperation(
          row.status === "approved" && !approval.consumedAt,
          "CONFLICT",
        );
        const { args, binding, saved } = await current(
          tx,
          actor,
          row,
          access,
          input.sealHash,
          time,
        );
        await tx.ontologyApproval.update({
          where: { id: approval.id },
          data: { consumedAt: time },
        });
        await deps.failpoint?.("approval-consumed");
        const updated = await changeSrsState(
          row.studentId,
          (state) => coursePlanTransition(state, args, time),
          srsStateTableIn(tx),
          binding.expectedStudentRevision,
          { teacher: true },
          time,
        );
        await deps.failpoint?.("student-written");
        const result = ontologyActionReceiptSchema.parse({
          id: randomUUID(),
          proposalId: row.id,
          approvalId: approval.id,
          outcome: updated.revision === saved.revision ? "no-op" : "applied",
          beforeRevision: saved.revision,
          afterRevision: updated.revision,
          plan: updated.state.course?.plan ?? null,
          committedAt: time.toISOString(),
          binding,
        });
        const resultCanonical = canonicalBytes(result);
        await tx.ontologyReceipt.create({
          data: {
            id: result.id,
            proposalId: row.id,
            approvalId: approval.id,
            actorId: actor.id,
            resultCanonical,
            resultHash: digest(resultCanonical),
            createdAt: time,
          },
        });
        await deps.failpoint?.("receipt-written");
        const detailCanonical = canonicalBytes({
          proposalId: row.id,
          approvalId: approval.id,
          receiptId: result.id,
          target: targetOf(row),
          outcome: result.outcome,
          beforeRevision: result.beforeRevision,
          afterRevision: result.afterRevision,
          sealHash: row.sealHash,
        });
        await tx.ontologyAudit.create({
          data: {
            id: randomUUID(),
            receiptId: result.id,
            actorId: actor.id,
            event: "course.plan.set/v1",
            detailCanonical,
            detailHash: digest(detailCanonical),
            createdAt: time,
          },
        });
        await deps.failpoint?.("audit-written");
        const bodyCanonical = canonicalBytes({
          receiptId: result.id,
          proposalId: row.id,
          outcome: result.outcome,
        });
        await tx.ontologyOutbox.create({
          data: {
            id: randomUUID(),
            receiptId: result.id,
            topic: "ontology.action.committed",
            bodyCanonical,
            bodyHash: digest(bodyCanonical),
            availableAt: time,
          },
        });
        await deps.failpoint?.("outbox-written");
        await tx.ontologyProposal.update({
          where: { id: row.id },
          data: { status: "executed" },
        });
        return result;
      });
    },
  };
}
