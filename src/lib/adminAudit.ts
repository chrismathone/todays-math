import "server-only";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

export const auditCategorySchema = z.enum(["all", "activity", "admin-access"]);

// Explicit read events only: settings, approvals and other admin mutations
// must remain in activity. material_view is retained for historical records.
const ADMIN_ACCESS_ACTIONS = [
  "admin.account_view",
  "admin.private_material_view",
  "admin.material_view",
];

export function accountAuditWhere(
  userId: string,
  category: z.infer<typeof auditCategorySchema>,
): Prisma.AccountAuditLogWhereInput {
  return {
    userId,
    ...(category === "admin-access"
      ? { action: { in: ADMIN_ACCESS_ACTIONS } }
      : category === "activity"
        ? { action: { notIn: ADMIN_ACCESS_ACTIONS } }
        : {}),
  };
}
