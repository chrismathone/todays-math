import "server-only";
import { randomUUID } from "node:crypto";
import type { EywaBinding, Prisma } from "@prisma/client";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { syncAutomaticBranchName } from "./managedProvisioning";
import {
  ALL_WORKSPACE_MENUS,
  type AccountAccess,
} from "@/contracts/accountAccess.contract";
import {
  bindingConfig,
  checkedBinding,
  fetchControl,
} from "./managedTransport";
import {
  accountUsable,
  candidateProblem,
  candidateVersion,
  controlOrderError,
  EywaAccessError,
  leaseExpiry,
  managedBlockReasons,
} from "./managedPolicy";
import {
  controlUserSchema,
  normalizeEmail,
  normalizeName,
  sha256,
  type Control,
} from "./sync-contract";

type Tx = Prisma.TransactionClient;
export async function enqueueManagedReconcile(tx: Tx, control: Control) {
  const eventId = randomUUID();
  const event = {
    schemaVersion: 2,
    eventId,
    bindingId: control.bindingId,
    tenantId: control.tenantId,
    sourceEpoch: control.sourceEpoch,
    securityRevision: control.securityRevision,
    tenantRevocationGeneration: control.tenantRevocationGeneration,
    occurredAt: new Date().toISOString(),
    kind: "reconcile",
    entityType: "mapping",
    entityId: null,
  };
  await tx.eywaInbox.create({
    data: {
      eventId,
      bindingId: control.bindingId,
      payload: event,
      bodyHash: sha256(JSON.stringify(event)),
    },
  });
}
export async function lockBinding(tx: Tx, bindingId: string) {
  await tx.$queryRaw`SELECT id FROM eywa_binding WHERE id = ${bindingId}::uuid FOR UPDATE`;
  return tx.eywaBinding.findUniqueOrThrow({ where: { id: bindingId } });
}
export async function applyManagedControl(
  tx: Tx,
  binding: EywaBinding,
  control: Control,
  started: number,
  onlyUserId?: string,
) {
  const orderError = controlOrderError(binding, control);
  if (orderError) {
    // A request that started before the winning control read may arrive late.
    if (
      binding.validatedAt &&
      started <= binding.validatedAt.getTime() &&
      Date.parse(control.validatedAt) <= binding.validatedAt.getTime()
    )
      return "control_superseded";
    await tx.eywaBinding.update({
      where: { id: binding.id },
      data: {
        healthy: false,
        leaseExpiresAt: new Date(0),
        lastError: orderError,
      },
    });
    return orderError;
  }
  await syncAutomaticBranchName(tx, binding, control, started);
  const expiry = leaseExpiry(control, started);
  const active =
    binding.mode === "active" &&
    control.mode === "active" &&
    !binding.retiredAt;
  const updated = await tx.eywaBinding.update({
    where: { id: binding.id },
    data: {
      sourceEpoch: control.sourceEpoch,
      securityRevision: BigInt(control.securityRevision),
      tenantRevocationGeneration: BigInt(control.tenantRevocationGeneration),
      enabled: control.enabled,
      healthy: control.healthy,
      validatedAt: new Date(control.validatedAt),
      leaseExpiresAt: expiry,
      nextEffectiveAt: control.nextEffectiveAt
        ? new Date(control.nextEffectiveAt)
        : null,
      control: control as unknown as Prisma.InputJsonValue,
      lastError: control.healthy ? null : "source_unhealthy",
    },
  });
  const accounts = await tx.eywaManagedAccount.findMany({
    where: {
      bindingId: binding.id,
      status: "confirmed",
      ...(onlyUserId ? { sourceUserId: onlyUserId } : {}),
    },
    include: { user: true },
  });
  for (const account of accounts) {
    const source = control.users.find((u) => u.id === account.sourceUserId);
    const reasons = managedBlockReasons(control, source);
    if (!active)
      reasons.push(binding.retiredAt ? "binding_retired" : "binding_inactive");
    if (
      source &&
      BigInt(source.accountRevocationGeneration) <
        account.accountRevocationGeneration
    )
      reasons.push("source_rebaseline_required");
    const accountGeneration = source
      ? BigInt(source.accountRevocationGeneration)
      : account.accountRevocationGeneration;
    const revoke =
      account.tenantRevocationGeneration < updated.tenantRevocationGeneration ||
      account.accountRevocationGeneration < accountGeneration ||
      (!account.blockReasons.length && reasons.length > 0);
    await tx.eywaManagedAccount.update({
      where: { id: account.id },
      data: {
        sourceEmail: source?.email.slice(0, 255) ?? account.sourceEmail,
        sourceName: source?.name.slice(0, 200) ?? account.sourceName,
        blockReasons: reasons,
        sourceClasses: source?.classes ?? [],
        sourceEpoch: control.sourceEpoch,
        securityRevision: BigInt(control.securityRevision),
        tenantRevocationGeneration: updated.tenantRevocationGeneration,
        accountRevocationGeneration:
          accountGeneration > account.accountRevocationGeneration
            ? accountGeneration
            : account.accountRevocationGeneration,
        classListRevision: source
          ? BigInt(source.classListRevision)
          : account.classListRevision,
        leaseExpiresAt: expiry,
      },
    });
    if (account.user && account.currentUserId === account.userId)
      await tx.user.update({
        where: { id: account.user.id },
        data: {
          // Source refresh must retain the superadmin's local account type.
          branchRole: account.branchRoleOverride ?? "teacher",
          isAdmin: ["owner", "manager"].includes(
            account.branchRoleOverride ?? "teacher",
          ),
          suspendedAt:
            account.user.manualSuspendedAt ??
            (reasons.length ? (account.user.suspendedAt ?? new Date()) : null),
          ...(revoke ? { sessionVersion: { increment: 1 } } : {}),
        },
      });
  }
  return null;
}

export async function reconcileManagedAccounts(
  tx: Tx,
  binding: EywaBinding,
  control: Control,
  started: number,
  onlyUserId?: string,
) {
  if (
    binding.mode !== "active" ||
    control.mode !== "active" ||
    !control.enabled ||
    !control.healthy ||
    binding.retiredAt ||
    leaseExpiry(control, started).getTime() <= Date.now()
  )
    return;
  let changed = false;
  const emailOwners = new Map<string, Set<string>>();
  for (const source of control.users) {
    const email = normalizeEmail(source.email);
    const owners = emailOwners.get(email) ?? new Set<string>();
    owners.add(source.id);
    emailOwners.set(email, owners);
  }
  for (const source of control.users) {
    if (!source.eligible || (onlyUserId && source.id !== onlyUserId)) continue;
    const existing = await tx.eywaManagedAccount.findFirst({
      where: {
        bindingId: binding.id,
        sourceUserId: source.id,
        status: { not: "ended" },
      },
    });
    if (existing?.status === "confirmed") continue;
    const email = normalizeEmail(source.email);
    // Never choose one of multiple identities sharing a normalized email.
    const validEmail =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
    // Lock candidate users across bindings before checking current ownership.
    // btrim matches normalizeEmail, including older addresses stored with spaces.
    const candidateIds = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "user"
      WHERE lower(btrim(email)) = ${email} OR eywa_user_id = ${source.id}::uuid
      ORDER BY id FOR UPDATE`;
    const candidates = await tx.user.findMany({
      where: { id: { in: candidateIds.map((u) => u.id) } },
    });
    const validProfile =
      validEmail &&
      (candidates.length > 0 ||
        (normalizeName(source.name).length > 0 &&
          normalizeName(source.name).length <= 50));
    const currentIdentity = await tx.eywaManagedAccount.findUnique({
      where: { currentSourceUserId: source.id },
    });
    if (
      !validProfile ||
      candidates.length > 1 ||
      currentIdentity ||
      emailOwners.get(email)!.size > 1
    ) {
      const identityUser = currentIdentity?.userId
        ? await tx.user.findUnique({ where: { id: currentIdentity.userId } })
        : null;
      const data = {
        sourceEmail: source.email.slice(0, 255),
        sourceName: source.name.slice(0, 200),
        status: "conflict",
        conflictReason: !validProfile ? "invalid_profile" : "identity_conflict",
        ...(identityUser
          ? {
              userId: identityUser.id,
              candidateVersion: candidateVersion(source, identityUser),
            }
          : {}),
      };
      if (existing)
        await tx.eywaManagedAccount.update({
          where: { id: existing.id },
          data,
        });
      else
        await tx.eywaManagedAccount.create({
          data: { ...data, bindingId: binding.id, sourceUserId: source.id },
        });
      continue;
    }
    const user = candidates[0];
    if (user) {
      const occupied = await tx.eywaManagedAccount.findUnique({
        where: { currentUserId: user.id },
      });
      const problem =
        candidateProblem(source, user) ??
        (occupied ? "managed_elsewhere" : null);
      if (!problem) {
        const previousBranchId = user.branchId;
        if (previousBranchId !== binding.targetBranchId) {
          await tx.classMembership.updateMany({
            where: { userId: user.id, revokedAt: null },
            data: { revokedAt: new Date() },
          });
          await tx.workspaceDocument.updateMany({
            where: { userId: user.id, visibility: "branch" },
            data: {
              visibility: "private",
              sharedBranchId: null,
              revision: { increment: 1 },
            },
          });
        }
        // Preserve password/auth source, display name, approval and all history.
        await tx.user.update({
          where: { id: user.id },
          data: {
            branchId: binding.targetBranchId,
            branchRole: "teacher",
            eywaUserId: source.id,
            eywaLinkedAt: new Date(),
            sessionVersion: { increment: 1 },
          },
        });
        const data = {
          userId: user.id,
          currentUserId: user.id,
          currentSourceUserId: source.id,
          sourceEmail: source.email,
          sourceName: source.name,
          status: "confirmed",
          conflictReason: null,
          candidateVersion: null,
          blockReasons: [],
          sourceEpoch: control.sourceEpoch,
          confirmedAt: new Date(),
          confirmationMethod: "email_match",
          sourceClasses: source.classes,
          securityRevision: BigInt(control.securityRevision),
          tenantRevocationGeneration: BigInt(
            control.tenantRevocationGeneration,
          ),
          accountRevocationGeneration: BigInt(
            source.accountRevocationGeneration,
          ),
          classListRevision: BigInt(source.classListRevision),
          leaseExpiresAt: leaseExpiry(control, started),
        };
        const mapping = existing
          ? await tx.eywaManagedAccount.update({
              where: { id: existing.id },
              data,
            })
          : await tx.eywaManagedAccount.create({
              data: { ...data, bindingId: binding.id, sourceUserId: source.id },
            });
        const [roster] =
          previousBranchId !== binding.targetBranchId
            ? await tx.$queryRaw<
                { classes: number; students: number; held_classes: number }[]
              >`
              SELECT * FROM eywa_transfer_owned_roster(
                ${user.id}::uuid, ${binding.id}::uuid, ${previousBranchId}::uuid)`
            : [{ classes: 0, students: 0, held_classes: 0 }];
        await tx.accountAuditLog.create({
          data: {
            userId: user.id,
            action: "eywa.account_migrated",
            outcome: "success",
            details: {
              bindingId: binding.id,
              mappingId: mapping.id,
              method: "email_match",
              ...roster,
            },
          },
        });
        changed = true;
        continue;
      }
      const data = {
        userId: user.id,
        sourceEmail: source.email.slice(0, 255),
        sourceName: source.name.slice(0, 200),
        status: problem ? "conflict" : "candidate",
        conflictReason: problem,
        candidateVersion: candidateVersion(source, user),
        sourceEpoch: control.sourceEpoch,
        securityRevision: BigInt(control.securityRevision),
      };
      if (existing)
        await tx.eywaManagedAccount.update({
          where: { id: existing.id },
          data,
        });
      else
        await tx.eywaManagedAccount.create({
          data: { ...data, bindingId: binding.id, sourceUserId: source.id },
        });
      continue;
    }
    // Never automatically turn a previously reviewed/denied mapping into a new account.
    if (existing) continue;
    const created = await tx.user.create({
      data: {
        email,
        name: normalizeName(source.name),
        passwordHash: null,
        authSource: "eywa",
        role: "director",
        isAdmin: false,
        isSuperAdmin: false,
        branchId: binding.targetBranchId,
        branchRole: "teacher",
        approvalStatus: "approved",
        eywaUserId: source.id,
        eywaLinkedAt: new Date(),
        disabledMenus: ALL_WORKSPACE_MENUS.filter(
          (m) => !["home", "teaching", "concept"].includes(m),
        ),
      },
    });
    await tx.eywaManagedAccount.create({
      data: {
        bindingId: binding.id,
        sourceUserId: source.id,
        userId: created.id,
        currentUserId: created.id,
        currentSourceUserId: source.id,
        status: "confirmed",
        sourceEmail: source.email,
        sourceName: source.name,
        sourceEpoch: control.sourceEpoch,
        confirmedAt: new Date(),
        confirmationMethod: "provisioned",
        securityRevision: BigInt(control.securityRevision),
        tenantRevocationGeneration: BigInt(control.tenantRevocationGeneration),
        accountRevocationGeneration: BigInt(source.accountRevocationGeneration),
        classListRevision: BigInt(source.classListRevision),
        sourceClasses: source.classes,
        leaseExpiresAt: leaseExpiry(control, started),
      },
    });
    await tx.accountAuditLog.create({
      data: {
        userId: created.id,
        action: "eywa.account_provisioned",
        outcome: "success",
        details: { bindingId: binding.id, sourceUserId: source.id },
      },
    });
    changed = true;
  }
  return changed;
}

const refreshes = new Map<string, Promise<void>>();
const failures = new Map<string, number>();
const bindingRefreshes = new Map<string, Promise<void>>();
export async function refreshManagedBinding(bindingId: string) {
  const pending = bindingRefreshes.get(bindingId);
  if (pending) return pending;
  const work = (async () => {
    try {
      const config = bindingConfig(bindingId);
      await checkedBinding(config);
      const { control, started } = await fetchControl(config);
      const issue = await db.$transaction(async (tx) =>
        applyManagedControl(
          tx,
          await lockBinding(tx, bindingId),
          control,
          started,
        ),
      );
      if (issue && issue !== "control_superseded")
        throw new EywaAccessError(issue);
    } catch {
      throw new EywaAccessError("source_unavailable");
    }
  })();
  bindingRefreshes.set(bindingId, work);
  try {
    await work;
  } finally {
    bindingRefreshes.delete(bindingId);
  }
}
export async function refreshManagedUser(userId: string) {
  const current = refreshes.get(userId);
  if (current) return current;
  if ((failures.get(userId) ?? 0) > Date.now())
    throw new EywaAccessError("source_unavailable");
  const promise = (async () => {
    const account = await db.eywaManagedAccount.findUnique({
      where: { currentUserId: userId },
    });
    if (!account) return;
    const config = bindingConfig(account.bindingId);
    await checkedBinding(config);
    const { control, started } = await fetchControl(
      config,
      account.sourceUserId,
    );
    const issue = await db.$transaction(async (tx) =>
      applyManagedControl(
        tx,
        await lockBinding(tx, account.bindingId),
        control,
        started,
        account.sourceUserId,
      ),
    );
    if (issue && issue !== "control_superseded")
      throw new EywaAccessError(issue);
  })();
  refreshes.set(userId, promise);
  try {
    await promise;
    failures.delete(userId);
  } catch (error) {
    failures.set(userId, Date.now() + 2000);
    throw error;
  } finally {
    refreshes.delete(userId);
  }
}
export async function getManagedClassGrants(
  userId: string,
  options: { forceRefresh?: boolean } = {},
) {
  let account = await db.eywaManagedAccount.findUnique({
    where: { currentUserId: userId },
    include: { binding: true, user: true },
  });
  if (!account) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { authSource: true },
    });
    if (user?.authSource === "eywa")
      throw new EywaAccessError("managed_identity_missing");
    return null;
  }
  if (
    options.forceRefresh ||
    !account.leaseExpiresAt ||
    account.leaseExpiresAt.getTime() <= Date.now() ||
    !account.binding.leaseExpiresAt ||
    account.binding.leaseExpiresAt.getTime() <= Date.now()
  ) {
    await refreshManagedUser(userId);
    account = await db.eywaManagedAccount.findUnique({
      where: { currentUserId: userId },
      include: { binding: true, user: true },
    });
  }
  if (!account?.user || !accountUsable(account.user, account, account.binding))
    throw new EywaAccessError("managed_access_denied");
  return {
    bindingId: account.bindingId,
    sourceEpoch: account.sourceEpoch!,
    sourceClasses: controlUserSchema.shape.classes.parse(account.sourceClasses),
    classListRevision: account.classListRevision,
    leaseExpiresAt: account.leaseExpiresAt!,
  };
}
export async function managedLoginAllowed(
  userId: string,
  forceRefresh = false,
) {
  try {
    await getManagedClassGrants(userId, { forceRefresh });
    return true;
  } catch {
    return false;
  }
}
export async function isManagedIdentity(userId: string, sourceUserId?: string) {
  return !!(await db.eywaManagedAccount.findFirst({
    where: {
      OR: [
        { currentUserId: userId },
        ...(sourceUserId ? [{ currentSourceUserId: sourceUserId }] : []),
      ],
    },
    select: { id: true },
  }));
}

export async function approveManagedCandidate(
  actor: AccountAccess,
  input: {
    id: string;
    version: string;
    password?: string;
    evidence?: string;
    method: "owner" | "operator";
  },
) {
  const candidate = await db.eywaManagedAccount.findUniqueOrThrow({
    where: { id: input.id },
  });
  if (
    !candidate.userId ||
    !["candidate", "conflict"].includes(candidate.status)
  )
    throw new EywaAccessError("candidate_changed");
  const { control, started } = await fetchControl(
    bindingConfig(candidate.bindingId),
    candidate.sourceUserId,
  );
  const source = control.users.find((u) => u.id === candidate.sourceUserId);
  if (!source?.eligible || !control.enabled || !control.healthy)
    throw new EywaAccessError("source_ineligible");
  const user = await db.user.findUniqueOrThrow({
    where: { id: candidate.userId },
  });
  const previousMapping = await db.eywaManagedAccount.findUnique({
    where: { currentUserId: user.id },
  });
  let previousRevoked = false;
  if (previousMapping && input.method === "operator") {
    const previousControl = await fetchControl(
      bindingConfig(previousMapping.bindingId),
      previousMapping.sourceUserId,
    );
    previousRevoked =
      previousControl.control.healthy &&
      (!previousControl.control.enabled ||
        !previousControl.control.users.some(
          (u) => u.id === previousMapping.sourceUserId && u.eligible,
        ));
  }
  if (input.method === "owner") {
    if (
      actor.id !== user.id ||
      !user.passwordHash ||
      !input.password ||
      !(await compare(input.password, user.passwordHash))
    )
      throw new EywaAccessError("owner_confirmation_required");
  } else {
    if (
      !actor.isAdmin ||
      (!actor.isSuperAdmin &&
        (actor.branchId !== user.branchId ||
          actor.branchId !== control.targetBranchId))
    )
      throw new EywaAccessError("operator_forbidden");
    if (!input.evidence || input.evidence.trim().length < 30)
      throw new EywaAccessError("independent_evidence_required");
  }
  return db.$transaction(
    async (tx) => {
      for (const id of [
        ...new Set([
          candidate.bindingId,
          ...(previousMapping ? [previousMapping.bindingId] : []),
        ]),
      ].sort())
        await lockBinding(tx, id);
      const binding = await lockBinding(tx, candidate.bindingId);
      if (
        binding.mode !== "active" ||
        binding.retiredAt ||
        control.mode !== "active" ||
        controlOrderError(binding, control) ||
        leaseExpiry(control, started).getTime() <= Date.now()
      )
        throw new EywaAccessError("binding_inactive");
      const latest = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      const mapping = await tx.eywaManagedAccount.findUniqueOrThrow({
        where: { id: candidate.id },
      });
      if (
        mapping.candidateVersion !== input.version ||
        candidateVersion(source, latest) !== input.version ||
        latest.updatedAt.getTime() !== user.updatedAt.getTime()
      )
        throw new EywaAccessError("candidate_changed");
      const problem = candidateProblem(source, latest, previousRevoked);
      if (problem) throw new EywaAccessError(problem);
      const occupied = await tx.eywaManagedAccount.findFirst({
        where: {
          OR: [
            { currentUserId: latest.id },
            { currentSourceUserId: source.id },
          ],
        },
      });
      if (
        occupied &&
        (!previousRevoked ||
          occupied.id !== previousMapping?.id ||
          occupied.userId !== latest.id)
      )
        throw new EywaAccessError("managed_elsewhere");
      if (occupied)
        await tx.eywaManagedAccount.update({
          where: { id: occupied.id },
          data: {
            status: "ended",
            endedAt: new Date(),
            currentUserId: null,
            currentSourceUserId: null,
            leaseExpiresAt: new Date(0),
          },
        });
      // All legacy operational classes must have frozen branch attribution before transfer.
      if (
        await tx.class.count({ where: { userId: latest.id, branchId: null } })
      )
        throw new EywaAccessError("legacy_branch_unresolved");
      await tx.classMembership.updateMany({
        where: { userId: latest.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (latest.branchId !== binding.targetBranchId)
        await tx.workspaceDocument.updateMany({
          where: { userId: latest.id, visibility: "branch" },
          data: {
            visibility: "private",
            sharedBranchId: null,
            revision: { increment: 1 },
          },
        });
      await tx.user.update({
        where: { id: latest.id },
        data: {
          branchId: binding.targetBranchId,
          branchRole: "teacher",
          eywaUserId: source.id,
          eywaLinkedAt: new Date(),
          suspendedAt: latest.manualSuspendedAt,
          sessionVersion: { increment: 1 },
        },
      });
      await tx.eywaManagedAccount.update({
        where: { id: mapping.id },
        data: {
          status: "confirmed",
          currentUserId: latest.id,
          currentSourceUserId: source.id,
          sourceEpoch: control.sourceEpoch,
          blockReasons: [],
          conflictReason: null,
          confirmedBy: actor.id,
          confirmedAt: new Date(),
          confirmationMethod: input.method,
          confirmationEvidence:
            input.method === "operator"
              ? input.evidence!.trim()
              : "Current account password reauthenticated by owner",
          sourceClasses: source.classes,
          securityRevision: BigInt(control.securityRevision),
          tenantRevocationGeneration: BigInt(
            control.tenantRevocationGeneration,
          ),
          accountRevocationGeneration: BigInt(
            source.accountRevocationGeneration,
          ),
          classListRevision: BigInt(source.classListRevision),
          leaseExpiresAt: leaseExpiry(control, started),
        },
      });
      await applyManagedControl(tx, binding, control, started, source.id);
      await tx.accountAuditLog.create({
        data: {
          userId: latest.id,
          actorId: actor.id,
          action: "eywa.mapping_approved",
          outcome: "success",
          details: {
            bindingId: binding.id,
            mappingId: mapping.id,
            method: input.method,
          },
        },
      });
      await enqueueManagedReconcile(tx, control);
      return { approved: true };
    },
    { isolationLevel: "Serializable" },
  );
}
