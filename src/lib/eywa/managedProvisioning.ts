import "server-only";
import type { EywaBinding, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { EywaAccessError } from "./managedPolicy";
import {
  assertControlBinding,
  controlLeaseExpiresAt,
  normalizeName,
  sha256,
  type BindingConfig,
  type Control,
} from "./sync-contract";

/** Called only after receiver signature/origin verification and a live source control read. */
export async function provisionAutomaticBinding(
  config: BindingConfig,
  control: Control,
  started: number,
) {
  assertControlBinding(control, config);
  if (
    config.provision !== "automatic" ||
    config.bindingId !== config.tenantId ||
    config.bindingId !== config.targetBranchId
  )
    throw new EywaAccessError("automatic_identity_required");
  const name =
    typeof control.tenantName === "string"
      ? normalizeName(control.tenantName)
      : "";
  if (
    !name ||
    name.length > 100 ||
    /[\p{Cc}\p{Cf}]/u.test(control.tenantName ?? "")
  )
    throw new EywaAccessError("invalid_tenant_name");
  const assertActive = () => {
    if (
      !control.enabled ||
      !control.healthy ||
      control.mode !== "active" ||
      Date.parse(control.validatedAt) > Date.now() + 5000 ||
      controlLeaseExpiresAt(control, started) <= Date.now()
    )
      throw new EywaAccessError("automatic_control_inactive");
  };
  assertActive();
  return db.$transaction(
    async (tx) => {
      // Only identical tenant identities serialize; display names do not identify a branch.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"eywa:automatic-provision:" + config.bindingId}, 0))::text`;
      const existing = await tx.eywaBinding.findUnique({
        where: { id: config.bindingId },
      });
      if (existing) {
        if (
          existing.tenantId !== config.tenantId ||
          existing.targetBranchId !== config.targetBranchId
        )
          throw new EywaAccessError("binding_mismatch");
        return existing; // Never revive, rename, or clear an operator block on an existing binding.
      }
      assertActive(); // A lock wait cannot extend the source authorization lease.
      if (
        await tx.eywaBinding.findFirst({
          where: {
            OR: [
              { tenantId: config.tenantId },
              { targetBranchId: config.targetBranchId },
            ],
          },
        })
      )
        throw new EywaAccessError("automatic_mapping_conflict");
      // Never adopt an unlinked ID. A same-named branch is a distinct identity and stays untouched.
      if (await tx.branch.findUnique({ where: { id: config.targetBranchId } }))
        throw new EywaAccessError("automatic_branch_conflict");
      await tx.branch.create({ data: { id: config.targetBranchId, name } });
      const binding = await tx.eywaBinding.create({
        data: {
          id: config.bindingId,
          tenantId: config.tenantId,
          targetBranchId: config.targetBranchId,
          mode: "active",
          sourceEpoch: control.sourceEpoch,
          autoProvisionedBranch: true,
          enabled: true,
          healthy: true,
          securityRevision: BigInt(control.securityRevision),
          tenantRevocationGeneration: BigInt(
            control.tenantRevocationGeneration,
          ),
          validatedAt: new Date(control.validatedAt),
          leaseExpiresAt: new Date(controlLeaseExpiresAt(control, started)),
          nextEffectiveAt: control.nextEffectiveAt
            ? new Date(control.nextEffectiveAt)
            : null,
          control,
        },
      });
      await tx.accountAuditLog.create({
        data: {
          action: "eywa.binding_auto_provisioned",
          outcome: "success",
          eventId: `eywa:auto-branch:${binding.id}`,
          details: {
            bindingId: binding.id,
            tenantId: binding.tenantId,
            targetBranchId: binding.targetBranchId,
            branchName: name,
            sourceEpoch: control.sourceEpoch,
            sourceBaseUrl: config.sourceBaseUrl,
          },
        },
      });
      return binding;
    },
    { timeout: 10_000, maxWait: 10_000 },
  );
}

/** Caller holds the binding row lock and has already checked epoch/revision monotonicity. */
export async function syncAutomaticBranchName(
  tx: Prisma.TransactionClient,
  binding: EywaBinding,
  control: Control,
  started: number,
) {
  if (
    !control.enabled ||
    !control.healthy ||
    control.mode !== "active" ||
    binding.mode !== "active" ||
    binding.retiredAt ||
    !control.tenantName ||
    controlLeaseExpiresAt(control, started) <= Date.now()
  )
    return;
  const name = normalizeName(control.tenantName);
  const branch = await tx.branch.findUnique({
    where: { id: binding.targetBranchId },
  });
  if (!branch || normalizeName(branch.name) === name) return;
  const previousName =
    binding.control &&
    typeof binding.control === "object" &&
    !Array.isArray(binding.control) &&
    typeof binding.control.tenantName === "string"
      ? normalizeName(binding.control.tenantName)
      : null;
  let reason: string | undefined;
  if (!name || name.length > 100 || /[\p{Cc}\p{Cf}]/u.test(control.tenantName))
    reason = "invalid_tenant_name";
  else if (!binding.autoProvisionedBranch) reason = "branch_not_auto_owned";
  else if (previousName !== normalizeName(branch.name))
    reason = "branch_name_locally_changed";
  if (!reason) {
    // Compare-and-set also preserves an operator rename racing this control transaction.
    const renamed = await tx.branch.updateMany({
      where: { id: branch.id, name: branch.name },
      data: { name },
    });
    if (!renamed.count) reason = "branch_name_locally_changed";
    else {
      await tx.accountAuditLog.create({
        data: {
          action: "eywa.branch_auto_renamed",
          outcome: "success",
          details: {
            bindingId: binding.id,
            targetBranchId: branch.id,
            previousName: branch.name,
            branchName: name,
            sourceEpoch: control.sourceEpoch,
            securityRevision: control.securityRevision,
          },
        },
      });
      return;
    }
  }
  await tx.accountAuditLog.upsert({
    where: {
      eventId: `eywa:name:${sha256(`${binding.id}:${name}:${reason}`)}`,
    },
    update: {},
    create: {
      eventId: `eywa:name:${sha256(`${binding.id}:${name}:${reason}`)}`,
      action: "eywa.branch_name_review",
      outcome: "denied",
      details: {
        bindingId: binding.id,
        targetBranchId: branch.id,
        sourceName: name,
        targetName: branch.name,
        reason,
      },
    },
  });
}
