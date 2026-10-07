import "server-only";

import type { ScopeViewer } from "@/lib/ownerScope";
import type { StudentOptionalMenu } from "@/contracts/studentLearningMenus.contract";
import type { AppSettingTable } from "@/lib/journeyThemeStore";
import { auditData } from "@/lib/audit";
import { db } from "@/lib/db";
import { forbiddenError } from "@/lib/apiResponse";
import { requireOwnedStudent } from "@/lib/ownership";
import {
  assertClassWrite,
  assertStudentEnrollment,
  ClassAccessDenied,
} from "@/lib/classAccess";
import {
  canManageStudentAccounts,
  studentAccountBranchAllowed,
  studentAccountViewer,
} from "./studentAccountPolicy";
import {
  readStudentLearningMenus,
  writeStudentLearningMenus,
} from "./studentLearningMenusStore";

/** Use the account capability and the current enrollment, never a legacy primary-class shortcut. */
async function authorizeStudent(viewer: ScopeViewer, studentId: string) {
  if (!canManageStudentAccounts(viewer))
    return { ok: false as const, response: forbiddenError() };
  const owned = await requireOwnedStudent(
    studentId,
    studentAccountViewer(viewer),
    "student:account",
  );
  if (!owned.ok) return owned;
  const cls = await db.class.findUnique({
    where: { id: owned.data.classId },
    select: { branchId: true },
  });
  if (
    !cls ||
    !studentAccountBranchAllowed(viewer, cls.branchId) ||
    (owned.data.branchId != null && owned.data.branchId !== cls.branchId)
  )
    return { ok: false as const, response: forbiddenError() };
  return owned;
}

export async function readManagedStudentLearningMenus(
  viewer: ScopeViewer,
  studentId: string,
) {
  const owned = await authorizeStudent(viewer, studentId);
  if (!owned.ok) return owned;
  return {
    ok: true as const,
    data: { ...(await readStudentLearningMenus(studentId)), canManage: true },
  };
}

export async function saveManagedStudentLearningMenus(
  viewer: ScopeViewer,
  studentId: string,
  enabled: readonly StudentOptionalMenu[],
) {
  const owned = await authorizeStudent(viewer, studentId);
  if (!owned.ok) return owned;
  try {
    const data = await db.$transaction(async (tx) => {
      // Match account writes: refresh capability and recheck branch/enrollment at the write boundary.
      await assertClassWrite(
        tx,
        studentAccountViewer(viewer),
        owned.data.classId,
        "student:account",
      );
      const student = await tx.student.findUnique({ where: { id: studentId } });
      const cls = await tx.class.findUnique({
        where: { id: owned.data.classId },
        select: { branchId: true },
      });
      if (
        !student ||
        !cls ||
        !studentAccountBranchAllowed(viewer, cls.branchId) ||
        (student.branchId != null && student.branchId !== cls.branchId) ||
        (student.classId !== owned.data.classId && !student.eywaBindingId)
      )
        throw new ClassAccessDenied();
      if (student.eywaBindingId)
        await assertStudentEnrollment(tx, studentId, owned.data.classId, true);
      const table = (tx as unknown as { appSetting: AppSettingTable })
        .appSetting;
      const previous = await readStudentLearningMenus(studentId, table);
      const saved = await writeStudentLearningMenus(
        studentId,
        enabled,
        viewer.id,
        table,
      );
      await tx.accountAuditLog.create({
        data: auditData({
          actorId: viewer.id,
          action: "student.learning-menus.update",
          outcome: "success",
          details: {
            studentId,
            branchId: cls.branchId,
            previousEnabled: previous.enabled,
            enabled: saved.enabled,
          },
        }),
      });
      return { ...saved, canManage: true };
    });
    return { ok: true as const, data };
  } catch (error) {
    if (error instanceof ClassAccessDenied)
      return { ok: false as const, response: forbiddenError() };
    throw error;
  }
}
