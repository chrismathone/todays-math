import "server-only";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { uuidSchema } from "@/contracts/common.contract";
import { db } from "@/lib/db";
import { notFoundError } from "@/lib/apiResponse";
import { ClassAccessDenied } from "@/lib/classAccess";

export const teacherScopeSchema = z.object({
  classId: uuidSchema.optional(),
  branchId: uuidSchema.optional(),
});

/** URL context narrows the authorized roster; it never grants another branch. */
export async function requireTeacherBranch(
  classId: string,
  branchId?: string,
  client: Prisma.TransactionClient = db,
) {
  if (!branchId) return null;
  const cls = await client.class.findUnique({ where: { id: classId } });
  return cls?.branchId === branchId ? null : notFoundError("학생");
}

export async function assertTeacherBranch(
  tx: Prisma.TransactionClient,
  classId: string,
  branchId?: string,
) {
  if (await requireTeacherBranch(classId, branchId, tx))
    throw new ClassAccessDenied();
}
