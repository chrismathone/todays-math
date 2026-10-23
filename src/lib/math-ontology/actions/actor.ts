import "server-only";
import type { Prisma } from "@prisma/client";
import { accountUsable } from "@/lib/eywa/managedPolicy";
import type { OntologyActionActor } from "./authorization";
import { requireOperation } from "./errors";

/** Shared final actor check for all new writers, without upstream refresh IO. */
export async function readOntologyActorInTransaction(
  tx: Prisma.TransactionClient,
  actor: OntologyActionActor,
  clock: () => Date = () => new Date(),
) {
  await tx.$queryRaw`SELECT id FROM "user" WHERE id = ${actor.id}::uuid FOR SHARE`;
  const row = await tx.user.findUnique({ where: { id: actor.id } });
  requireOperation(
    row &&
      !row.deletedAt &&
      !row.suspendedAt &&
      !row.manualSuspendedAt &&
      row.approvalStatus === "approved" &&
      row.sessionVersion === actor.sessionVersion,
    "FORBIDDEN",
  );
  if (row.branchId)
    await tx.$queryRaw`SELECT id FROM branch WHERE id = ${row.branchId}::uuid FOR SHARE`;
  const branch = row.branchId
    ? await tx.branch.findUnique({ where: { id: row.branchId } })
    : null;
  await tx.$queryRaw`SELECT id FROM eywa_managed_account WHERE current_user_id = ${actor.id}::uuid FOR SHARE`;
  const managed = await tx.eywaManagedAccount.findUnique({
    where: { currentUserId: actor.id },
  });
  let binding = null;
  if (managed) {
    await tx.$queryRaw`SELECT id FROM eywa_binding WHERE id = ${managed.bindingId}::uuid FOR SHARE`;
    binding = await tx.eywaBinding.findUnique({
      where: { id: managed.bindingId },
    });
    requireOperation(
      binding && accountUsable(row, managed, binding, clock().getTime()),
      "FORBIDDEN",
    );
  } else requireOperation(row.authSource !== "eywa", "FORBIDDEN");
  return { row, branch, managed, binding };
}
