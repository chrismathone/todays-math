import type { Class, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { EYWA_SYNC_CLASSES } from "@/lib/eywa/syncScope";

// Deliberately NOT scopedClassIds(): import overrides must never expand automatic generation.
const approved = new Set(EYWA_SYNC_CLASSES.map((c) => c.eywaClassId));
export function autoDraftClassAllowed(
  cls: Pick<Class, "eywaClassId">,
): boolean {
  return !cls.eywaClassId || approved.has(cls.eywaClassId);
}

export async function autoDraftBindingAllowed(
  cls: Pick<Class, "eywaClassId" | "eywaBindingId"> &
    Partial<Pick<Class, "active" | "closedAt">>,
  client: Pick<Prisma.TransactionClient, "eywaBinding"> = db,
): Promise<boolean> {
  if (!autoDraftClassAllowed(cls)) return false;
  if (
    cls.active === false ||
    (cls.closedAt && cls.closedAt.getTime() <= Date.now())
  )
    return false;
  if (!cls.eywaBindingId) return true;
  const binding = await client.eywaBinding.findUnique({
    where: { id: cls.eywaBindingId },
  });
  return (
    !!binding &&
    binding.enabled &&
    binding.healthy &&
    binding.mode === "active" &&
    !binding.retiredAt &&
    !!binding.leaseExpiresAt &&
    binding.leaseExpiresAt.getTime() > Date.now()
  );
}
