import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { mathOntologyAssertionSchema } from "@/contracts/mathOntology.contract";
import type { OntologyActionActor } from "../actions/authorization";
import { canonicalBytes, digest } from "../actions/canonical";
import { authorizeOntologyDraftScope } from "./authorization";
/** Server-only entry after the formal adapter has checked the actual provider
 * response and its exact public evidence packet. No HTTP route exposes this. */
export async function sealOntologyModelRelationProposal(tx: Prisma.TransactionClient, actor: OntologyActionActor, input: {
  assertion: unknown; evidenceRef: string; evidenceHash: string;
  receipt: { modelCalled: true; provider: string; requestedModel: string; reportedModel: string | null; responseId: string | null; inputTokens: number | null; outputTokens: number | null; rawResponseHash: string };
}, now = new Date()) {
  const normalized: Record<string, unknown> = { ...(input.assertion as Record<string, unknown>), origin: "model-proposal", review: "candidate", publication: "unpublished" }; delete normalized.approvalId;
  const candidate = mathOntologyAssertionSchema.parse(normalized);
  await authorizeOntologyDraftScope(tx, actor, candidate.scope, now);
  const receipt = z.strictObject({ modelCalled: z.literal(true), provider: z.string().min(1).max(100), requestedModel: z.string().min(1).max(200), reportedModel: z.string().min(1).max(200).nullable(), responseId: z.string().min(1).max(512).nullable(), inputTokens: z.number().int().nonnegative().nullable(), outputTokens: z.number().int().nonnegative().nullable(), rawResponseHash: z.string().regex(/^sha256:[a-f0-9]{64}$/) }).parse(input.receipt);
  const body = { actorId: actor.id, sessionVersion: actor.sessionVersion, ...receipt, assertionHash: digest(canonicalBytes(candidate)), evidenceRef: z.string().min(1).max(512).parse(input.evidenceRef), evidenceHash: z.string().regex(/^sha256:[a-f0-9]{64}$/).parse(input.evidenceHash), expiresAt: new Date(now.getTime() + 10 * 60_000).toISOString() };
  const id = randomUUID(), detailCanonical = canonicalBytes(body);
  await tx.ontologyReviewEvent.create({ data: { id, actorId: actor.id, scopeKey: candidate.scope, subjectId: candidate.id, event: "model.relation.proposed", detailCanonical, detailHash: digest(detailCanonical), createdAt: now } });
  return { modelRunId: id };
}
