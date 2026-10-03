import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  applyManagedControl,
  lockBinding,
  reconcileManagedAccounts,
} from "./managedAccounts";
import { applyEywaRelations } from "./managedRelations";
import { EywaAccessError, controlOrderError } from "./managedPolicy";
import {
  bindingConfig,
  checkedBinding,
  fetchControl,
  fetchSnapshot,
} from "./managedTransport";
import {
  eventSchema,
  sha256,
  validateCompleteSnapshot,
  type SyncEvent,
} from "./sync-contract";

export async function receiveEvent(raw: string, bindingId: string) {
  const event = eventSchema.parse(JSON.parse(raw));
  const binding = await checkedBinding(bindingConfig(bindingId));
  if (event.bindingId !== binding.id || event.tenantId !== binding.tenantId)
    throw new EywaAccessError("binding_mismatch");
  const bodyHash = sha256(raw);
  try {
    await db.eywaInbox.create({
      data: { eventId: event.eventId, bindingId, bodyHash, payload: event },
    });
  } catch (error) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== "P2002"
    )
      throw error;
  }
  const existing = await db.eywaInbox.findUniqueOrThrow({
    where: { eventId: event.eventId },
  });
  if (existing.bindingId !== bindingId || existing.bodyHash !== bodyHash)
    throw new EywaAccessError("event_body_conflict");
  return {
    eventId: existing.eventId,
    status: existing.status === "processing" ? "received" : existing.status,
  };
}

export async function claimBinding(bindingId: string) {
  return db.$transaction(async (tx) => {
    const binding = await lockBinding(tx, bindingId);
    if (binding.leaseUntil && binding.leaseUntil.getTime() > Date.now())
      return null;
    const token = randomUUID();
    const until = new Date(Date.now() + 120_000);
    await tx.eywaBinding.update({
      where: { id: bindingId },
      data: { leaseToken: token, leaseUntil: until },
    });
    return { token, until };
  });
}
export async function assertFence(
  tx: Prisma.TransactionClient,
  bindingId: string,
  token: string,
) {
  const binding = await lockBinding(tx, bindingId);
  if (
    binding.leaseToken !== token ||
    !binding.leaseUntil ||
    binding.leaseUntil.getTime() <= Date.now()
  )
    throw new EywaAccessError("lease_lost");
  return binding;
}
export async function processBinding(bindingId: string, limit = 10) {
  const config = bindingConfig(bindingId);
  await checkedBinding(config);
  const lease = await claimBinding(bindingId);
  if (!lease) return { busy: true, results: [] };
  const results: { eventId: string; status: string }[] = [];
  let batchStatus: string | undefined;
  try {
    const events = await db.eywaInbox.findMany({
      where: {
        bindingId,
        status: { in: ["received", "processing"] },
        retryAt: { lte: new Date() },
      },
      orderBy: { receivedAt: "asc" },
      take: Math.max(1, Math.min(20, limit)),
    });
    for (const row of events) {
      const event = eventSchema.parse(row.payload);
      await db.$transaction(async (tx) => {
        await assertFence(tx, bindingId, lease.token);
        await tx.eywaInbox.update({
          where: { eventId: row.eventId },
          data: {
            status: "processing",
            attempts: { increment: 1 },
            leaseToken: lease.token,
            leaseUntil: lease.until,
          },
        });
      });
      try {
        if (batchStatus) {
          await finishEvent(bindingId, lease.token, event, batchStatus);
          results.push({ eventId: row.eventId, status: batchStatus });
          continue;
        }
        // Revocation commits independently of content/matching, so a bad roster cannot undo OFF.
        const fresh = await fetchControl(config);
        const issue = await db.$transaction(async (tx) =>
          applyManagedControl(
            tx,
            await assertFence(tx, bindingId, lease.token),
            fresh.control,
            fresh.started,
          ),
        );
        if (issue && issue !== "control_superseded")
          throw new EywaAccessError(issue);
        let status = "applied";
        if (fresh.control.enabled && fresh.control.healthy) {
          const snapshot = await fetchSnapshot(config);
          const collections = validateCompleteSnapshot(
            snapshot.manifest,
            snapshot.pages,
          );
          status = await db.$transaction(
            async (tx) => {
              const binding = await assertFence(tx, bindingId, lease.token);
              if (
                controlOrderError(binding, snapshot.manifest.control) ||
                BigInt(snapshot.manifest.contentGeneration) <
                  binding.contentGeneration
              )
                return "superseded";
              if (
                binding.mode === "active" &&
                snapshot.manifest.control.mode === "active" &&
                !binding.retiredAt
              ) {
                await reconcileManagedAccounts(
                  tx,
                  binding,
                  snapshot.manifest.control,
                  snapshot.started,
                );
                await applyManagedControl(
                  tx,
                  binding,
                  snapshot.manifest.control,
                  snapshot.started,
                );
                const relationResult = await applyEywaRelations(
                  tx,
                  snapshot.manifest,
                  collections,
                );
                if (
                  relationResult.applied &&
                  (relationResult.conflicts?.length ||
                    relationResult.deferredStudents ||
                    relationResult.unresolvedProgress)
                ) {
                  await tx.accountAuditLog.create({
                    data: {
                      action: "eywa.relation_conflicts",
                      outcome: "denied",
                      details: {
                        bindingId,
                        snapshotId: snapshot.manifest.snapshotId,
                        conflicts: relationResult.conflicts,
                        deferredStudents: relationResult.deferredStudents,
                        unresolvedProgress: relationResult.unresolvedProgress,
                      },
                    },
                  });
                  await tx.eywaBinding.update({
                    where: { id: bindingId },
                    data: {
                      contentGeneration: BigInt(
                        snapshot.manifest.contentGeneration,
                      ),
                      lastError: "relation_conflicts",
                    },
                  });
                  return "conflict";
                }
              }
              await tx.eywaBinding.update({
                where: { id: bindingId },
                data: {
                  contentGeneration: BigInt(
                    snapshot.manifest.contentGeneration,
                  ),
                  lastError: null,
                },
              });
              const conflicts = await tx.eywaManagedAccount.count({
                where: { bindingId, status: { in: ["candidate", "conflict"] } },
              });
              return conflicts ? "conflict" : "applied";
            },
            { timeout: 60_000, isolationLevel: "Serializable" },
          );
        }
        await finishEvent(bindingId, lease.token, event, status);
        batchStatus = status;
        results.push({ eventId: row.eventId, status });
      } catch (error) {
        const code =
          error instanceof EywaAccessError ? error.code : "apply_failed";
        const conflict = [
          "source_epoch_changed",
          "source_rebaseline_required",
        ].includes(code);
        await db.$transaction(async (tx) => {
          await assertFence(tx, bindingId, lease.token);
          await tx.eywaInbox.updateMany({
            where: { eventId: row.eventId, leaseToken: lease.token },
            data: {
              status: conflict ? "conflict" : "received",
              errorCode: code,
              retryAt: new Date(
                Date.now() +
                  Math.min(300_000, 2000 * 2 ** Math.min(row.attempts, 7)),
              ),
              leaseToken: null,
              leaseUntil: null,
            },
          });
          await tx.eywaBinding.update({
            where: { id: bindingId },
            data: { lastError: code },
          });
        });
        results.push({
          eventId: row.eventId,
          status: conflict ? "conflict" : "received",
        });
        break;
      }
    }
  } finally {
    await db.eywaBinding.updateMany({
      where: { id: bindingId, leaseToken: lease.token },
      data: { leaseToken: null, leaseUntil: null },
    });
  }
  return { busy: false, results };
}
async function finishEvent(
  bindingId: string,
  token: string,
  event: SyncEvent,
  status: string,
) {
  return db.$transaction(async (tx) => {
    await assertFence(tx, bindingId, token);
    const changed = await tx.eywaInbox.updateMany({
      where: { eventId: event.eventId, bindingId, leaseToken: token },
      data: {
        status,
        appliedAt: new Date(),
        errorCode: null,
        leaseToken: null,
        leaseUntil: null,
      },
    });
    if (changed.count !== 1) throw new EywaAccessError("lease_lost");
  });
}
