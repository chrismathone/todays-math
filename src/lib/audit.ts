import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type AuditInput = {
  userId?: string | null;
  actorId?: string | null;
  action: string;
  outcome: "success" | "denied" | "requested" | "failed";
  details?: Record<string, string | number | boolean | null | string[]>;
  eventId?: string;
};
const SECRET_KEY =
  /password|token|cookie|authorization|secret|content|payload/i;
export function auditData(
  input: AuditInput,
): Prisma.AccountAuditLogUncheckedCreateInput {
  const details = Object.fromEntries(
    Object.entries(input.details ?? {}).filter(
      ([key]) => !SECRET_KEY.test(key),
    ),
  );
  return { ...input, details };
}
/** Confirmed mutations call this in their own transaction; request telemetry is best effort. */
export async function recordAudit(input: AuditInput) {
  try {
    await db.accountAuditLog.create({ data: auditData(input) });
  } catch {
    console.error("Unable to record account activity.");
  }
}
