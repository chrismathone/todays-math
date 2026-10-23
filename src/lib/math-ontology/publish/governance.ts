import "server-only";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import type { OntologyActionActor } from "../actions/authorization";
import { canonicalBytes, checkedCanonical, digest } from "../actions/canonical";
import { requireOperation } from "../actions/errors";
import { authorizeOntologyPublisher } from "../review/authorization";
import { recordOntologyReviewEvent } from "../review/events";
import { lockOntologyScope } from "./scope";
import { lockActiveOntologyReleaseInTransaction } from "./store";
import { canonicalOntologyJson, ontologyDigest } from "../compiler/canonical";
import { mathOntologyCompileInputSchema } from "@/contracts/mathOntology.contract";
const previewSchema = z.strictObject({ id: z.uuid(), actorId: z.uuid(), scopeKey: z.literal("global"), graphVersion: z.string(), generation: z.number().int().nonnegative(), expiresAt: z.iso.datetime() });
/** Explicit publisher revocation. It withdraws source authority and the active
 * release pointer atomically, and preserves immutable historical bytes. */
export function createOntologyReleaseGovernance(deps: { db: Pick<PrismaClient, "$transaction">; now?: () => Date }) {
  const clock = deps.now ?? (() => new Date());
  return {
    async prepare(actor: OntologyActionActor) {
      return deps.db.$transaction(async tx => {
        await authorizeOntologyPublisher(tx, actor, clock);
        const active = await lockActiveOntologyReleaseInTransaction(tx, "global"), time = clock();
        const preview = previewSchema.parse({ id: randomUUID(), actorId: actor.id, scopeKey: "global", graphVersion: active.release.graphVersion, generation: active.generation, expiresAt: new Date(time.getTime() + 600000).toISOString() });
        await recordOntologyReviewEvent(tx, actor.id, "global", preview.id, "release.revocation.prepared", preview, time);
        await authorizeOntologyPublisher(tx, actor, clock);
        return { confirmationId: preview.id, sealHash: digest(canonicalBytes(preview)), preview };
      });
    },
    async confirm(actor: OntologyActionActor, raw: unknown) {
      const input = z.strictObject({ confirmationId: z.uuid(), sealHash: z.string().regex(/^sha256:[a-f0-9]{64}$/) }).parse(raw);
      return deps.db.$transaction(async tx => {
        await authorizeOntologyPublisher(tx, actor, clock);
        const event = await tx.ontologyReviewEvent.findFirst({ where: { actorId: actor.id, subjectId: input.confirmationId, event: "release.revocation.prepared" } });
        requireOperation(event && event.detailHash === input.sealHash, "BINDING_MISMATCH");
        const preview = previewSchema.parse(checkedCanonical(event.detailCanonical, event.detailHash));
        const active = await lockOntologyScope(tx, "global", clock());
        await tx.$queryRaw`SELECT graph_version FROM ontology_release WHERE graph_version = ${preview.graphVersion} FOR UPDATE`;
        const row = await tx.ontologyRelease.findUnique({ where: { graphVersion: preview.graphVersion }, select: { revokedAt: true, jobId: true } });
        requireOperation(row, "NOT_FOUND");
        const done = await tx.ontologyReviewEvent.findFirst({ where: { actorId: actor.id, subjectId: preview.id, event: "release.revoked" } });
        if (!done) {
          requireOperation(Date.parse(preview.expiresAt) > clock().getTime(), "EXPIRED");
          requireOperation(!row.revokedAt && active.graphVersion === preview.graphVersion && active.generation === preview.generation, "STALE");
          const job = await tx.ontologyCompileJob.findUniqueOrThrow({ where: { id: row.jobId } });
          const compileInput = mathOntologyCompileInputSchema.parse(JSON.parse(job.inputCanonical));
          requireOperation(canonicalOntologyJson(compileInput) === job.inputCanonical && ontologyDigest(job.inputCanonical) === job.inputManifestHash, "BINDING_MISMATCH");
          const source = compileInput.sourceManifest ? JSON.parse(compileInput.sourceManifest) as { authorityDecisionId?: string } : null;
          const authorityId = source?.authorityDecisionId?.match(/^urn:todaymath:source-authority:([a-f0-9-]{36})$/)?.[1];
          if (authorityId) await tx.ontologySourceAuthorityDecision.updateMany({ where: { id: authorityId, revokedAt: null }, data: { revokedAt: clock() } });
          await tx.ontologyRelease.update({ where: { graphVersion: preview.graphVersion }, data: { revokedAt: clock() } });
          await tx.ontologyActiveGraph.update({ where: { scopeKey: "global" }, data: { graphVersion: null, generation: { increment: 1 }, updatedAt: clock() } });
          await recordOntologyReviewEvent(tx, actor.id, "global", preview.id, "release.revoked", { graphVersion: preview.graphVersion, previousGeneration: preview.generation }, clock());
        }
        else requireOperation(row.revokedAt, "BINDING_MISMATCH");
        await authorizeOntologyPublisher(tx, actor, clock);
        return { id: preview.id, state: "applied" as const, message: "활성 지식 판을 철회했습니다.", details: ["이전 판과 승인 이력은 보존했습니다.", "새 게시가 끝나기 전까지 이 판을 근거로 한 새 실행은 중단됩니다."] };
      }, { timeout: 20000, maxWait: 10000 });
    },
  };
}
