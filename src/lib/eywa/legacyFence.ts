import type { Prisma } from "@prisma/client";
import { parseAutomaticConfigs, parseBindingConfigs } from "./sync-contract";

/** The legacy transport cannot prove managed authorization, even when the binding is OFF. */
export function assertLegacyTransportAllowed(
  tenantId = process.env.EYWA_TENANT_ID,
) {
  if (parseAutomaticConfigs(process.env.EYWA_SYNC_AUTO_JSON).length)
    throw new Error("legacy_sync_fenced");
  const configs = parseBindingConfigs(process.env.EYWA_SYNC_BINDINGS_JSON);
  if (configs.some((c) => !tenantId || c.tenantId === tenantId))
    throw new Error("legacy_sync_fenced");
}

export async function assertLegacyWriterAllowed(
  client: Pick<Prisma.TransactionClient, "eywaBinding">,
  ownerBranchId?: string | null,
) {
  assertLegacyTransportAllowed();
  const tenantId = process.env.EYWA_TENANT_ID;
  const binding = await client.eywaBinding.findFirst({
    where: {
      OR: [
        ...(tenantId ? [{ tenantId }] : [{}]),
        ...(ownerBranchId ? [{ targetBranchId: ownerBranchId }] : []),
      ],
    },
    select: { id: true },
  });
  if (binding) throw new Error("legacy_sync_fenced");
}
