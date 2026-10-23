import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { canonicalBytes, digest } from "../actions/canonical";
export async function recordOntologyReviewEvent(
  tx: Prisma.TransactionClient,
  actorId: string,
  scopeKey: string,
  subjectId: string,
  event: string,
  detail: unknown,
  now: Date,
) {
  const detailCanonical = canonicalBytes(detail);
  return tx.ontologyReviewEvent.create({
    data: {
      id: randomUUID(),
      actorId,
      scopeKey,
      subjectId,
      event,
      detailCanonical,
      detailHash: digest(detailCanonical),
      createdAt: now,
    },
  });
}
