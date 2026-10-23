import "server-only";
import type { Prisma } from "@prisma/client";
import {
  accessibleClassesWhere,
  assertClassWrite,
  assertStudentEnrollment,
  classAccessAllowed,
  ClassAccessDenied,
  studentsInClassWhere,
} from "@/lib/classAccess";
import { effectiveWorkspaceMenuPolicy } from "@/lib/workspaceMenuPolicy.server";
import type { ScopeViewer } from "@/lib/ownerScope";
import type { WorkbookPolicy } from "../store";
import { fail } from "../errors";

export function createWorkbookPolicy(
  tx: Prisma.TransactionClient,
  actorId: string,
): WorkbookPolicy {
  let viewer: ScopeViewer | null = null;
  const assertTeacher = async () => {
    const user = await tx.user.findUnique({
      where: { id: actorId },
      include: { branch: true },
    });
    if (
      !user ||
      user.deletedAt ||
      user.suspendedAt ||
      user.manualSuspendedAt ||
      user.approvalStatus !== "approved"
    )
      fail("UNAUTHORIZED", "계정 상태를 확인하고 다시 로그인해 주세요.");
    if (
      user.role !== "director" ||
      !effectiveWorkspaceMenuPolicy(user).menus.includes("teaching")
    )
      fail("FORBIDDEN", "수업 · 학생 관리 권한이 필요합니다.");
    viewer = {
      id: user.id,
      branchId: user.branchId,
      branchRole: user.branchRole,
      isSuperAdmin: user.isSuperAdmin,
      isAdmin:
        user.isSuperAdmin ||
        (user.isAdmin &&
          !!user.branchId &&
          (user.branchRole === "owner" || user.branchRole === "manager")),
    };
  };
  const projectRoster: NonNullable<WorkbookPolicy["projectRoster"]> = async (
    classId,
    studentIds,
    write,
  ) => {
    if (!viewer) await assertTeacher();
    try {
      const cls = await tx.class.findUnique({ where: { id: classId } });
      if (!cls || !cls.active || (cls.closedAt && cls.closedAt <= new Date()))
        throw new ClassAccessDenied();
      if (write) {
        await assertClassWrite(tx, viewer!, classId, "test:write");
        // Legacy classes also need a held scope row; managed writes already hold it.
        await tx.$queryRaw`SELECT id FROM class WHERE id = ${classId}::uuid FOR SHARE`;
        const locked = await tx.class.findUnique({ where: { id: classId } });
        if (
          !locked ||
          !locked.active ||
          (locked.closedAt && locked.closedAt <= new Date()) ||
          !(await classAccessAllowed(viewer!, locked, "test:write", {
            client: tx,
          }))
        )
          throw new ClassAccessDenied();
      } else if (
        !(await classAccessAllowed(viewer!, cls, "test:read", {
          client: tx,
          forceRefresh: true,
        }))
      )
        throw new ClassAccessDenied();
      const loadStudents = () =>
        tx.student.findMany({
          where: {
            AND: [
              { id: { in: studentIds }, eywaWithdrawnAt: null, isTest: false },
              studentsInClassWhere(classId, false),
            ],
          },
          select: { id: true, name: true },
        });
      let students = (await loadStudents()).filter((student) =>
        studentIds.includes(student.id),
      );
      if (write && students.length) {
        // Hold only currently eligible students. A transferred peer must not block a remaining target.
        for (const student of [...students].sort((a, b) =>
          a.id.localeCompare(b.id),
        ))
          await tx.$queryRaw`SELECT id FROM student WHERE id = ${student.id}::uuid FOR SHARE`;
        students = (await loadStudents()).filter((student) =>
          studentIds.includes(student.id),
        );
        const valid = [];
        for (const student of students) {
          try {
            await assertStudentEnrollment(tx, student.id, classId, false);
            valid.push(student);
          } catch (error) {
            if (!(error instanceof ClassAccessDenied)) throw error;
          }
        }
        students = valid;
      }
      return { className: cls.name, students };
    } catch (error) {
      if (error instanceof ClassAccessDenied)
        fail(
          "SCOPE_CHANGED",
          "현재 담당 반·학생 범위가 변경되었습니다. 다시 불러와 주세요.",
        );
      throw error;
    }
  };
  const assertRoster: WorkbookPolicy["assertRoster"] = async (
    classId,
    studentIds,
    write,
  ) => {
    const roster = await projectRoster(classId, studentIds, write);
    if (roster.students.length !== studentIds.length)
      fail(
        "SCOPE_CHANGED",
        "현재 담당 반·학생 범위가 변경되었습니다. 다시 불러와 주세요.",
      );
    return roster;
  };
  return {
    assertTeacher,
    assertRoster,
    projectRoster,
    listRoster: async () => {
      if (!viewer) await assertTeacher();
      const where = await accessibleClassesWhere(viewer!, "test:write", {
        client: tx,
        forceRefresh: true,
      });
      const classes = await tx.class.findMany({
        where: {
          AND: [
            where,
            {
              active: true,
              OR: [{ closedAt: null }, { closedAt: { gt: new Date() } }],
            },
          ],
        },
        select: { id: true, name: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
      });
      const result = [];
      for (const cls of classes) {
        const students = await tx.student.findMany({
          where: {
            AND: [
              studentsInClassWhere(cls.id, false),
              { isTest: false, eywaWithdrawnAt: null },
            ],
          },
          select: { id: true, name: true },
          orderBy: [{ name: "asc" }, { id: "asc" }],
        });
        result.push({ ...cls, students });
      }
      return result;
    },
  };
}
