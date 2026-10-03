import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
import {
  bindingConfig,
  bindingConfigs,
  fetchControl,
} from "./managedTransport";
import { candidateProblem, EywaAccessError } from "./managedPolicy";
import { lockBinding } from "./managedAccounts";
import {
  normalizeEmail,
  normalizeName,
  parseAutomaticConfigs,
} from "./sync-contract";

export async function managedStatus(actor: AccountAccess, ownOnly = false) {
  const scope = ownOnly
    ? { userId: actor.id }
    : actor.isSuperAdmin
      ? {}
      : {
          binding: {
            targetBranchId:
              actor.branchId ?? "00000000-0000-0000-0000-000000000000",
          },
        };
  const [bindings, accounts] = await Promise.all([
    ownOnly
      ? []
      : db.eywaBinding.findMany({
          where: actor.isSuperAdmin
            ? {}
            : {
                targetBranchId:
                  actor.branchId ?? "00000000-0000-0000-0000-000000000000",
              },
          include: { _count: { select: { inbox: true } } },
          orderBy: { createdAt: "desc" },
        }),
    db.eywaManagedAccount.findMany({
      where: scope,
      include: {
        user: { select: { name: true, email: true, branchId: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
  ]);
  const [events, relationReviews] = bindings.length
    ? await Promise.all([
        db.eywaInbox.findMany({
          where: { bindingId: { in: bindings.map((b) => b.id) } },
          select: {
            eventId: true,
            bindingId: true,
            status: true,
            errorCode: true,
            receivedAt: true,
            appliedAt: true,
          },
          orderBy: { receivedAt: "desc" },
          take: 30,
        }),
        db.accountAuditLog.findMany({
          where: {
            action: "eywa.relation_conflicts",
            OR: bindings.map((b) => ({
              details: { path: ["bindingId"], equals: b.id },
            })),
          },
          select: { id: true, details: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ])
    : [[], []];
  const branches = bindings.length
    ? await db.branch.findMany({
        where: { id: { in: bindings.map((b) => b.targetBranchId) } },
        select: { id: true, name: true },
      })
    : [];
  const names = new Map(branches.map((b) => [b.id, b.name]));
  return {
    automaticProvisioningEnabled:
      actor.isSuperAdmin &&
      !ownOnly &&
      parseAutomaticConfigs(process.env.EYWA_SYNC_AUTO_JSON).length > 0,
    events: events.map((e) => ({
      ...e,
      receivedAt: e.receivedAt.toISOString(),
      appliedAt: e.appliedAt?.toISOString() ?? null,
    })),
    relationReviews: relationReviews.map((e) => ({
      id: e.id,
      createdAt: e.createdAt.toISOString(),
      details: e.details,
    })),
    bindings: bindings.map((b) => {
      const sourceName =
        b.control &&
        typeof b.control === "object" &&
        !Array.isArray(b.control) &&
        typeof b.control.tenantName === "string"
          ? b.control.tenantName
          : null;
      const targetName = names.get(b.targetBranchId) ?? null;
      return {
        id: b.id,
        tenantId: b.tenantId,
        targetBranchId: b.targetBranchId,
        targetBranchName: targetName,
        sourceTenantName: sourceName,
        branchNameMismatch:
          !!sourceName &&
          !!targetName &&
          normalizeName(sourceName) !== normalizeName(targetName),
        configured: bindingConfigs(b.id).length > 0,
        mode: b.mode,
        enabled: b.enabled,
        healthy: b.healthy,
        retiredAt: b.retiredAt?.toISOString() ?? null,
        sourceEpoch: b.sourceEpoch,
        securityRevision: String(b.securityRevision),
        contentGeneration: String(b.contentGeneration),
        lastError: b.lastError,
        validatedAt: b.validatedAt?.toISOString() ?? null,
        leaseExpiresAt: b.leaseExpiresAt?.toISOString() ?? null,
        inboxCount: b._count.inbox,
      };
    }),
    accounts: accounts.map((a) => ({
      id: a.id,
      bindingId: a.bindingId,
      sourceUserId: a.sourceUserId,
      userId: a.userId,
      sourceEmail: a.sourceEmail,
      sourceName: a.sourceName,
      localName: a.user?.name ?? null,
      localEmail: a.user?.email ?? null,
      localBranchId: a.user?.branchId ?? null,
      status: a.status,
      blockReasons: a.blockReasons,
      conflictReason: a.conflictReason,
      candidateVersion: a.candidateVersion,
      confirmedAt: a.confirmedAt?.toISOString() ?? null,
      confirmationMethod: a.confirmationMethod,
      confirmedBy: a.confirmedBy,
      leaseExpiresAt: a.leaseExpiresAt?.toISOString() ?? null,
    })),
    configuredBindings:
      actor.isSuperAdmin && !ownOnly
        ? [...new Set(bindingConfigs().map((c) => c.bindingId))]
        : [],
  };
}
/** Read-only: no snapshot creation, lease renewal, accounts or binding changes. */
export async function previewManagedBinding(bindingId: string) {
  const config = bindingConfig(bindingId);
  const { control } = await fetchControl(config);
  const counts = {
    eligible: 0,
    newAccounts: 0,
    matchingCandidates: 0,
    conflicts: 0,
    ineligible: 0,
  };
  for (const source of control.users) {
    if (!source.eligible) {
      counts.ineligible++;
      continue;
    }
    counts.eligible++;
    const users = await db.user.findMany({
      where: {
        OR: [
          {
            email: {
              equals: normalizeEmail(source.email),
              mode: "insensitive",
            },
          },
          { eywaUserId: source.id },
        ],
      },
    });
    if (!users.length) counts.newAccounts++;
    else if (users.length !== 1 || candidateProblem(source, users[0]))
      counts.conflicts++;
    else counts.matchingCandidates++;
  }
  return {
    bindingId,
    tenantId: config.tenantId,
    targetBranchId: config.targetBranchId,
    enabled: control.enabled,
    healthy: control.healthy,
    mode: control.mode,
    counts,
  };
}
export async function configureManagedBinding(
  actor: AccountAccess,
  input: {
    bindingId: string;
    action:
      "register" | "activate" | "shadow" | "retire" | "rebaseline" | "retry";
    archiveOwnerUserId?: string;
    evidence?: string;
  },
) {
  if (!actor.isSuperAdmin)
    throw new EywaAccessError("platform_operator_required");
  const config = bindingConfig(input.bindingId);
  // Automatic mode must never use manual registration to adopt an existing branch.
  if (input.action === "register" && config.provision === "automatic")
    throw new EywaAccessError("automatic_receiver_required");
  // Emergency target retirement must not depend on source availability or a prior control read.
  if (input.action === "retire" || input.action === "shadow")
    return db.$transaction(async (tx) => {
      const binding = await lockBinding(tx, input.bindingId);
      if (
        binding.tenantId !== config.tenantId ||
        binding.targetBranchId !== config.targetBranchId
      )
        throw new EywaAccessError("binding_mismatch");
      await tx.eywaBinding.update({
        where: { id: binding.id },
        data: {
          mode: "shadow",
          enabled: false,
          healthy: false,
          leaseExpiresAt: new Date(0),
          leaseToken: null,
          leaseUntil: null,
          ...(input.action === "retire" ? { retiredAt: new Date() } : {}),
        },
      });
      const accounts = await tx.eywaManagedAccount.findMany({
        where: { bindingId: binding.id, status: "confirmed" },
      });
      for (const account of accounts) {
        await tx.eywaManagedAccount.update({
          where: { id: account.id },
          data: {
            blockReasons: [
              ...new Set([
                ...account.blockReasons,
                input.action === "retire"
                  ? "binding_retired"
                  : "binding_inactive",
              ]),
            ],
            leaseExpiresAt: new Date(0),
          },
        });
        if (account.currentUserId)
          await tx.user.update({
            where: { id: account.currentUserId },
            data: { suspendedAt: new Date(), sessionVersion: { increment: 1 } },
          });
      }
      await tx.accountAuditLog.create({
        data: {
          actorId: actor.id,
          action: `eywa.binding_${input.action}`,
          outcome: "success",
          details: { bindingId: binding.id },
        },
      });
      return { changed: true };
    });
  const fresh = await fetchControl(config);
  if (input.action === "register") {
    if (!(await db.branch.findUnique({ where: { id: config.targetBranchId } })))
      throw new EywaAccessError("target_branch_missing");
    if (
      input.archiveOwnerUserId &&
      !(await db.user.findFirst({
        where: {
          id: input.archiveOwnerUserId,
          branchId: config.targetBranchId,
          deletedAt: null,
        },
      }))
    )
      throw new EywaAccessError("invalid_archive_owner");
    return db.$transaction(async (tx) => {
      const binding = await tx.eywaBinding.create({
        data: {
          id: config.bindingId,
          tenantId: config.tenantId,
          targetBranchId: config.targetBranchId,
          archiveOwnerUserId: input.archiveOwnerUserId,
          mode: "shadow",
          sourceEpoch: fresh.control.sourceEpoch,
        },
      });
      await tx.accountAuditLog.create({
        data: {
          actorId: actor.id,
          action: "eywa.binding_registered",
          outcome: "success",
          details: { bindingId: binding.id },
        },
      });
      return { registered: true };
    });
  }
  return db.$transaction(async (tx) => {
    const binding = await lockBinding(tx, input.bindingId);
    if (
      binding.tenantId !== config.tenantId ||
      binding.targetBranchId !== config.targetBranchId
    )
      throw new EywaAccessError("binding_mismatch");
    if (
      input.action === "activate" &&
      (binding.retiredAt ||
        !fresh.control.healthy ||
        binding.sourceEpoch !== fresh.control.sourceEpoch)
    )
      throw new EywaAccessError("activation_requires_healthy_binding");
    if (
      input.action === "rebaseline" &&
      (!input.evidence ||
        input.evidence.trim().length < 30 ||
        fresh.control.sourceEpoch === binding.sourceEpoch)
    )
      throw new EywaAccessError("rebaseline_evidence_required");
    if (input.action === "rebaseline") {
      await tx.eywaManagedAccount.updateMany({
        where: { bindingId: binding.id, status: "confirmed" },
        data: {
          blockReasons: ["binding_inactive"],
          leaseExpiresAt: new Date(0),
        },
      });
      if (input.action === "rebaseline")
        await tx.eywaManagedAccount.updateMany({
          where: { bindingId: binding.id, status: "confirmed" },
          data: {
            sourceEpoch: fresh.control.sourceEpoch,
            securityRevision: BigInt(0),
            tenantRevocationGeneration: BigInt(0),
            accountRevocationGeneration: BigInt(0),
            classListRevision: BigInt(0),
            sourceClasses: [],
          },
        });
      await tx.eywaBinding.update({
        where: { id: binding.id },
        data: {
          mode: "shadow",
          enabled: false,
          healthy: false,
          leaseExpiresAt: new Date(0),
          leaseToken: null,
          leaseUntil: null,
          sourceEpoch: fresh.control.sourceEpoch,
          securityRevision: BigInt(0),
          contentGeneration: BigInt(0),
          tenantRevocationGeneration: BigInt(0),
        },
      });
      const mappings = await tx.eywaManagedAccount.findMany({
        where: { bindingId: binding.id, status: "confirmed" },
      });
      for (const m of mappings)
        if (m.currentUserId)
          await tx.user.update({
            where: { id: m.currentUserId },
            data: { suspendedAt: new Date(), sessionVersion: { increment: 1 } },
          });
    } else if (input.action === "activate")
      await tx.eywaBinding.update({
        where: { id: binding.id },
        data: { mode: "active" },
      });
    if (input.action === "retry")
      await tx.eywaInbox.updateMany({
        where: { bindingId: binding.id, status: "conflict" },
        data: { status: "received", retryAt: new Date(), errorCode: null },
      });
    const eventId = randomUUID();
    const event = {
      schemaVersion: 2,
      eventId,
      bindingId: binding.id,
      tenantId: binding.tenantId,
      sourceEpoch: fresh.control.sourceEpoch,
      securityRevision: fresh.control.securityRevision,
      tenantRevocationGeneration: fresh.control.tenantRevocationGeneration,
      occurredAt: new Date().toISOString(),
      kind: "reconcile",
      entityType: "binding",
      entityId: null,
    };
    await tx.eywaInbox.create({
      data: {
        eventId,
        bindingId: binding.id,
        bodyHash: "local_operator_reconcile",
        payload: event,
      },
    });
    await tx.accountAuditLog.create({
      data: {
        actorId: actor.id,
        action: `eywa.binding_${input.action}`,
        outcome: "success",
        details: {
          bindingId: binding.id,
          ...(input.evidence ? { evidence: input.evidence } : {}),
        },
      },
    });
    return { changed: true };
  });
}
