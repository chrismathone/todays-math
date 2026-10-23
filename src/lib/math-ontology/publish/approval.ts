import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { OntologyActionActor } from "../actions/authorization";
import { canonicalBytes, checkedCanonical, digest, type CanonicalValue } from "../actions/canonical";
import { OntologyOperationError, requireOperation } from "../actions/errors";
import { authorizeOntologyPublisher } from "../review/authorization";
import { recordOntologyReviewEvent } from "../review/events";
import { approvedOntologyReviews, type createOntologyPublisher } from "./service";
import { lockOntologyScope } from "./scope";
import { mathOntologyAssertionSchema } from "@/contracts/mathOntology.contract";
import { ontologyRelationCanPublish } from "../review/eligibility";
export interface OntologyPublicationBase {
  baseHash: string;
  projectionHash: string;
  entities: number;
  assertions: number;
  focuses: number;
}
const baseSchema = z.strictObject({ baseHash: z.string().regex(/^sha256:[a-f0-9]{64}$/), projectionHash: z.string().regex(/^sha256:[a-f0-9]{64}$/), entities: z.number().int().nonnegative(), assertions: z.number().int().nonnegative(), focuses: z.number().int().nonnegative() });
const previewSchema = z.strictObject({ version: z.literal(1), id: z.uuid(), actorId: z.uuid(), scopeKey: z.literal("global"), base: baseSchema, reviewStateHash: z.string(), generation: z.number().int().nonnegative(), relationCount: z.number().int().nonnegative(), expiresAt: z.iso.datetime() });
/** Global source import is approved in the same transaction as the durable
 * publication job. Preparing a preview grants no source authority. */
export function createOntologyPublicationApproval(deps: {
  db: Pick<PrismaClient, "$transaction">;
  publisher: ReturnType<typeof createOntologyPublisher>;
  base(): OntologyPublicationBase;
  now?: () => Date;
}) {
  const now = deps.now ?? (() => new Date());
  const transaction = <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) => deps.db.$transaction(fn, { maxWait: 10000, timeout: 30000 });
  return {
    async prepare(actor: OntologyActionActor) {
      return transaction(async tx => {
        const time = now(); await authorizeOntologyPublisher(tx, actor, now);
        const base = baseSchema.parse(deps.base()), active = await lockOntologyScope(tx, "global", time), reviews = await approvedOntologyReviews(tx, "global"), id = randomUUID();
        const eligibleRelationCount = reviews.rows.filter(row => ontologyRelationCanPublish(mathOntologyAssertionSchema.parse(checkedCanonical(row.assertionCanonical, row.assertionHash)))).length;
        const preview = previewSchema.parse({ version: 1, id, actorId: actor.id, scopeKey: "global", base, reviewStateHash: reviews.hash, generation: active.generation, relationCount: reviews.rows.length, expiresAt: new Date(time.getTime() + 10 * 60_000).toISOString() });
        await recordOntologyReviewEvent(tx, actor.id, "global", id, "publish.prepared", preview as unknown as CanonicalValue, time);
        await authorizeOntologyPublisher(tx, actor, now);
        requireOperation(Date.parse(preview.expiresAt) > now().getTime(), "EXPIRED");
        return { confirmationId: id, sealHash: digest(canonicalBytes(preview)), preview: { ...preview, eligibleRelationCount, excludedRelationCount: reviews.rows.length - eligibleRelationCount } };
      });
    },
    async confirm(actor: OntologyActionActor, raw: unknown) {
      const input = z.strictObject({ confirmationId: z.uuid(), sealHash: z.string().regex(/^sha256:[a-f0-9]{64}$/) }).parse(raw);
      const job = await transaction(async tx => {
        const time = now(); await authorizeOntologyPublisher(tx, actor, now);
        await lockOntologyScope(tx, "global", time);
        const row = await tx.ontologyReviewEvent.findFirst({ where: { subjectId: input.confirmationId, event: "publish.prepared", actorId: actor.id } });
        requireOperation(row && row.detailHash === input.sealHash, "BINDING_MISMATCH");
        const preview = previewSchema.parse(checkedCanonical(row.detailCanonical, row.detailHash));
        requireOperation(preview.id === input.confirmationId && preview.actorId === actor.id, "BINDING_MISMATCH");
        const existing = await tx.ontologyCompileJob.findUnique({ where: { id: preview.id } });
        if (!existing) {
          requireOperation(Date.parse(preview.expiresAt) > now().getTime(), "EXPIRED");
          requireOperation(canonicalBytes(baseSchema.parse(deps.base())) === canonicalBytes(preview.base), "STALE");
          const decision = { version: 1, decision: "approved", scope: "global", baseHash: preview.base.baseHash, projectionHash: preview.base.projectionHash, confirmationId: preview.id };
          const decisionCanonical = canonicalBytes(decision);
          await tx.ontologySourceAuthorityDecision.create({ data: { id: preview.id, scopeKey: "global", sourceManifestHash: preview.base.projectionHash, decisionCanonical, decisionHash: digest(decisionCanonical), approvedBy: actor.id, createdAt: time } });
          await recordOntologyReviewEvent(tx, actor.id, "global", preview.id, "source.approved", decision, time);
        }
        const queued = await deps.publisher.enqueueInTransaction(tx, actor, "global", { jobId: preview.id, reviewStateHash: preview.reviewStateHash, generation: preview.generation });
        // A completed durable confirmation is replay, not a new grant. Only a
        // newly granted authority/job must still meet the original preview TTL.
        if (!existing) requireOperation(Date.parse(preview.expiresAt) > now().getTime(), "EXPIRED");
        return queued;
      });
      // Engine work is outside the approval/job transaction. A crash leaves a
      // durable queued/leased job, recoverable under current publisher rights.
      let result: { state: string } = job;
      requireOperation(job.state !== "stale", "STALE");
      if (job.state !== "published") {
        try { result = await deps.publisher.run(actor, job.jobId); }
        catch (error) { if (!(error instanceof OntologyOperationError && error.code === "CONFLICT")) throw error; }
      }
      return { id: job.jobId, state: result.state === "published" ? "published" as const : "preparing" as const, message: result.state === "published" ? "검토한 내용을 게시했습니다." : "게시 결과를 준비하고 있습니다.", details: [`작업 ${job.jobId}`, "승인한 원천 판과 관계 검토 이력을 보존했습니다."] };
    },
    async recover(actor: OntologyActionActor, jobId: string) {
      z.uuid().parse(jobId);
      const result = await deps.publisher.recover(actor, jobId);
      return { id: jobId, state: result.state === "published" ? "published" as const : "preparing" as const, message: "게시 결과를 확인했습니다.", details: [`작업 ${jobId}`] };
    },
  };
}
