import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  mathOntologyAssertionSchema,
  mathOntologyValidationSchema,
  type MathOntologyAssertion,
  type MathOntologyValidation,
} from "@/contracts/mathOntology.contract";
import type { OntologyActionActor } from "../actions/authorization";
import { canonicalBytes, checkedCanonical, digest } from "../actions/canonical";
import { requireOperation } from "../actions/errors";
import {
  authorizeOntologyDraftScope,
  authorizeOntologyPublisher,
} from "./authorization";
import { lockOntologyScope } from "../publish/scope";
import { recordOntologyReviewEvent } from "./events";

export interface OntologyCandidatePort {
  /** Actual authorization of subject/object/source and sealed model evidence.
   * It must never infer authorization from an RDF type or a client scope name.
   */
  authorize(
    tx: Prisma.TransactionClient,
    actor: OntologyActionActor,
    assertion: MathOntologyAssertion,
    evidenceRef: string,
  ): Promise<void>;
  /** Actual isolated SHACL; a valid draft never becomes a graph premise. */
  validate(assertion: MathOntologyAssertion): Promise<MathOntologyValidation>;
}
export function createOntologyRelationService(deps: {
  db: Pick<PrismaClient, "$transaction">;
  candidates: OntologyCandidatePort;
  now?: () => Date;
}) {
  const now = deps.now ?? (() => new Date());
  async function draft(
      actor: OntologyActionActor,
      raw: { assertion: unknown; evidenceRef: string },
      origin: "authored" | "model-proposal" = "authored",
      stableReviewId?: string,
    ) {
      z.string().min(1).max(512).parse(raw.evidenceRef);
      const candidateInput = {
        ...(raw.assertion as Record<string, unknown>),
        origin,
        review: "candidate",
        publication: "unpublished",
      };
      delete (candidateInput as Record<string, unknown>).approvalId;
      const candidate = mathOntologyAssertionSchema.parse(candidateInput);
      return deps.db.$transaction(async (tx) => {
        await authorizeOntologyDraftScope(tx, actor, candidate.scope, now);
        await deps.candidates.authorize(tx, actor, candidate, raw.evidenceRef);
        const assertionCanonical = canonicalBytes(candidate),
          assertionHash = digest(assertionCanonical),
          time = now();
        let modelExpiresAt: number | null = null;
        if (stableReviewId) {
          await tx.$queryRaw`SELECT id FROM ontology_review_event WHERE id = ${stableReviewId}::uuid FOR UPDATE`;
          const sealed = await tx.ontologyReviewEvent.findUnique({ where: { id: stableReviewId } });
          requireOperation(sealed && sealed.actorId === actor.id && sealed.event === "model.relation.proposed", "BINDING_MISMATCH");
          const receipt = z.object({ actorId: z.uuid(), sessionVersion: z.number().int(), modelCalled: z.literal(true), assertionHash: z.string(), evidenceRef: z.string(), evidenceHash: z.string(), expiresAt: z.iso.datetime() }).parse(checkedCanonical(sealed.detailCanonical, sealed.detailHash));
          modelExpiresAt = Date.parse(receipt.expiresAt);
          requireOperation(receipt.actorId === actor.id && receipt.sessionVersion === actor.sessionVersion && receipt.assertionHash === assertionHash && receipt.evidenceRef === raw.evidenceRef && modelExpiresAt > now().getTime(), "BINDING_MISMATCH");
          const previous = await tx.ontologyRelationReview.findUnique({ where: { id: stableReviewId } });
          if (previous) {
            requireOperation(previous.proposedBy === actor.id && previous.assertionCanonical === assertionCanonical && previous.assertionHash === assertionHash, "BINDING_MISMATCH");
            await authorizeOntologyDraftScope(tx, actor, previous.scopeKey, now);
            return { reviewId: previous.id, revision: previous.revision, state: previous.state };
          }
        }
        const row = await tx.ontologyRelationReview.create({
          data: {
            id: stableReviewId ?? randomUUID(),
            scopeKey: candidate.scope,
            assertionId: candidate.id,
            assertionCanonical,
            assertionHash,
            proposedBy: actor.id,
            createdAt: time,
          },
        });
        await recordOntologyReviewEvent(
          tx,
          actor.id,
          row.scopeKey,
          row.id,
          "relation.drafted",
          { assertionHash, evidenceRef: raw.evidenceRef },
          time,
        );
        await authorizeOntologyDraftScope(tx, actor, row.scopeKey, now);
        requireOperation(modelExpiresAt === null || modelExpiresAt > now().getTime(), "EXPIRED");
        return { reviewId: row.id, revision: row.revision, state: row.state };
      }, { maxWait: 10000, timeout: 20000 });
    }
  return {
    draft: (actor: OntologyActionActor, raw: { assertion: unknown; evidenceRef: string }) => draft(actor, raw),
    async read(actor: OntologyActionActor, reviewId: string) {
      z.uuid().parse(reviewId);
      return deps.db.$transaction(async tx => {
        await authorizeOntologyPublisher(tx, actor, now);
        const row = await tx.ontologyRelationReview.findUnique({ where: { id: reviewId } }); requireOperation(row, "NOT_FOUND");
        const assertion = mathOntologyAssertionSchema.parse(checkedCanonical(row.assertionCanonical, row.assertionHash));
        const report = row.validationCanonical && row.validationHash ? mathOntologyValidationSchema.parse(checkedCanonical(row.validationCanonical, row.validationHash)) : null;
        await authorizeOntologyPublisher(tx, actor, now);
        return { reviewId, revision: row.revision, state: row.state, assertion, validationHash: row.validationHash, report };
      });
    },
    async draftModel(actor: OntologyActionActor, raw: { assertion: unknown; evidenceRef: string; modelRunId: string }) {
      return draft(actor, raw, "model-proposal", z.uuid().parse(raw.modelRunId));
    },
    async validate(actor: OntologyActionActor, reviewId: string) {
      z.uuid().parse(reviewId);
      const original = await deps.db.$transaction(async (tx) => {
        await authorizeOntologyPublisher(tx, actor, now);
        const row = await tx.ontologyRelationReview.findUnique({
          where: { id: reviewId },
        });
        requireOperation(
          row && ["draft", "validated"].includes(row.state),
          "NOT_FOUND",
        );
        const event = await tx.ontologyReviewEvent.findFirst({ where: { subjectId: row.id, event: "relation.drafted" }, orderBy: { createdAt: "asc" } });
        requireOperation(event, "BINDING_MISMATCH");
        const ref = z.object({ evidenceRef: z.string() }).parse(checkedCanonical(event.detailCanonical, event.detailHash)).evidenceRef;
        await deps.candidates.authorize(tx, actor, mathOntologyAssertionSchema.parse(checkedCanonical(row.assertionCanonical, row.assertionHash)), ref);
        return row;
      });
      const assertion = mathOntologyAssertionSchema.parse(
        checkedCanonical(original.assertionCanonical, original.assertionHash),
      );
      const report = mathOntologyValidationSchema.parse(
        await deps.candidates.validate(assertion),
      );
      const validationCanonical = canonicalBytes(report),
        validationHash = digest(validationCanonical);
      return deps.db.$transaction(async (tx) => {
        await authorizeOntologyPublisher(tx, actor, now);
        await tx.$queryRaw`SELECT id FROM ontology_relation_review WHERE id = ${reviewId}::uuid FOR UPDATE`;
        const row = await tx.ontologyRelationReview.findUniqueOrThrow({
          where: { id: reviewId },
        });
        requireOperation(
          row.revision === original.revision &&
            row.assertionHash === original.assertionHash,
          "STALE",
        );
        const state =
          report.conforms && !report.incomplete ? "validated" : "draft";
        const updated = await tx.ontologyRelationReview.update({
          where: { id: reviewId },
          data: {
            state,
            validationCanonical,
            validationHash,
            revision: { increment: 1 },
          },
        });
        await recordOntologyReviewEvent(
          tx,
          actor.id,
          row.scopeKey,
          row.id,
          "relation.validated",
          {
            validationHash,
            conforms: report.conforms,
            incomplete: report.incomplete,
          },
          now(),
        );
        await authorizeOntologyPublisher(tx, actor, now);
        return {
          reviewId,
          revision: updated.revision,
          state,
          validationHash,
          report,
        };
      });
    },
    async decide(actor: OntologyActionActor, raw: unknown) {
      const input = z
        .strictObject({
          reviewId: z.uuid(),
          expectedRevision: z.number().int().nonnegative(),
          validationHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
          decision: z.enum(["approve", "reject"]),
          sourceReviewed: z.literal(true),
          meaningReviewed: z.literal(true),
        })
        .parse(raw);
      return deps.db.$transaction(async (tx) => {
        await authorizeOntologyPublisher(tx, actor, now);
        const initial = await tx.ontologyRelationReview.findUnique({
          where: { id: input.reviewId },
        });
        requireOperation(initial, "NOT_FOUND");
        await lockOntologyScope(tx, initial.scopeKey, now());
        await tx.$queryRaw`SELECT id FROM ontology_relation_review WHERE id = ${input.reviewId}::uuid FOR UPDATE`;
        const row = await tx.ontologyRelationReview.findUnique({
          where: { id: input.reviewId },
        });
        requireOperation(
          row &&
            row.revision === input.expectedRevision &&
            row.state === "validated" &&
            row.validationCanonical &&
            row.validationHash === input.validationHash,
          "STALE",
        );
        const report = mathOntologyValidationSchema.parse(
          checkedCanonical(row.validationCanonical, row.validationHash),
        );
        requireOperation(
          report.conforms && !report.incomplete,
          "BINDING_MISMATCH",
        );
        const candidate = mathOntologyAssertionSchema.parse(checkedCanonical(row.assertionCanonical, row.assertionHash));
        const event = await tx.ontologyReviewEvent.findFirst({ where: { subjectId: row.id, event: "relation.drafted" }, orderBy: { createdAt: "asc" } });
        requireOperation(event, "BINDING_MISMATCH");
        const ref = z.object({ evidenceRef: z.string() }).parse(checkedCanonical(event.detailCanonical, event.detailHash)).evidenceRef;
        await deps.candidates.authorize(tx, actor, candidate, ref);
        const state = input.decision === "approve" ? "approved" : "rejected",
          time = now();
        const updated = await tx.ontologyRelationReview.update({
          where: { id: row.id },
          data: {
            state,
            revision: { increment: 1 },
            reviewerId: actor.id,
            reviewedAt: time,
          },
        });
        await recordOntologyReviewEvent(
          tx,
          actor.id,
          row.scopeKey,
          row.id,
          `relation.${state}`,
          {
            assertionHash: row.assertionHash,
            validationHash: row.validationHash,
            revision: updated.revision,
            sourceReviewed: true,
            meaningReviewed: true,
          },
          time,
        );
        await authorizeOntologyPublisher(tx, actor, now);
        return { reviewId: row.id, state, revision: updated.revision };
      });
    },
    async retire(actor: OntologyActionActor, reviewId: string, expectedRevision: number) {
      z.uuid().parse(reviewId); z.number().int().nonnegative().parse(expectedRevision);
      return deps.db.$transaction(async tx => {
        const time = now(); await authorizeOntologyPublisher(tx, actor, now);
        const original = await tx.ontologyRelationReview.findUnique({ where: { id: reviewId } });
        requireOperation(original, "NOT_FOUND");
        await lockOntologyScope(tx, original.scopeKey, time);
        await tx.$queryRaw`SELECT id FROM ontology_relation_review WHERE id = ${reviewId}::uuid FOR UPDATE`;
        const row = await tx.ontologyRelationReview.findUniqueOrThrow({ where: { id: reviewId } });
        requireOperation(row.state === "approved" && row.revision === expectedRevision, "STALE");
        const result = await tx.ontologyRelationReview.update({ where: { id: reviewId }, data: { state: "retired", revision: { increment: 1 } } });
        await recordOntologyReviewEvent(tx, actor.id, row.scopeKey, row.id, "relation.retired", { assertionHash: row.assertionHash, previousRevision: row.revision, revision: result.revision }, time);
        await authorizeOntologyPublisher(tx, actor, now);
        return { reviewId, state: result.state, revision: result.revision };
      });
    },
  };
}
