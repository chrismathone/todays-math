import "server-only";
import type { Prisma } from "@prisma/client";
import { effectiveWorkspaceMenuPolicy } from "@/lib/workspaceMenuPolicy.server";
import type { OntologyActionActor } from "../actions/authorization";
import { requireOperation } from "../actions/errors";
import { readOntologyActorInTransaction } from "../actions/actor";

export async function authorizeOntologyPublisher(
  tx: Prisma.TransactionClient,
  actor: OntologyActionActor,
  now = new Date(),
) {
  const { row } = await readOntologyActorInTransaction(tx, actor, now);
  requireOperation(row.isSuperAdmin, "FORBIDDEN");
  return row;
}

/** Tenant-private drafts confer no publication rights; actual entity access is
 * checked by the server's evidence resolver before this scope-only guard.
 */
export async function authorizeOntologyDraftScope(
  tx: Prisma.TransactionClient,
  actor: OntologyActionActor,
  scopeKey: string,
  now = new Date(),
) {
  const { row, branch } = await readOntologyActorInTransaction(tx, actor, now);
  if (row.isSuperAdmin) return;
  requireOperation(
    effectiveWorkspaceMenuPolicy({ ...row, branch }).menus.includes("srs") &&
      scopeKey === `owner:${actor.id}`,
    "FORBIDDEN",
  );
}
