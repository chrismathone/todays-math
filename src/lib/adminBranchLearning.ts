import "server-only";
import type { Prisma } from "@prisma/client";
import type {
  AdminBranchLearningClass,
  AdminBranchLearningQuery,
  AdminBranchLearningResponse,
} from "@/contracts/adminBranchLearning.contract";
import { db } from "@/lib/db";
import { membershipAllows } from "@/lib/eywa/relationPolicy";
import { compareRosterNames } from "@/lib/adminStudentRoster";
import {
  readAdminLearningRoster,
  summarizeAdminLearningRoster,
} from "@/lib/adminLearningRoster";

export class AdminBranchLearningScopeError extends Error {}

function pageRows<T extends { id: string; name: string }>(
  rows: T[],
  query: AdminBranchLearningQuery,
) {
  rows.sort(
    (a, b) => compareRosterNames(a.name, b.name) || a.id.localeCompare(b.id),
  );
  const total = rows.length;
  const page = Math.min(
    query.page,
    Math.max(1, Math.ceil(total / query.pageSize)),
  );
  return {
    data: rows.slice((page - 1) * query.pageSize, page * query.pageSize),
    meta: { page, pageSize: query.pageSize, total },
  };
}
const includes = (value: string, search: string) =>
  value.toLocaleLowerCase("ko-KR").includes(search);

/** Superadmin inspection uses frozen Student/Class branches, never a creator's current branch. */
export async function readAdminBranchLearning(
  branchId: string,
  query: AdminBranchLearningQuery,
): Promise<AdminBranchLearningResponse> {
  return db.$transaction(
    async (tx) => {
      if (
        !(await tx.branch.findUnique({
          where: { id: branchId },
          select: { id: true },
        }))
      )
        throw new AdminBranchLearningScopeError("지점을 찾지 못했습니다.");
      const now = new Date();
      const classes = await tx.class.findMany({
        where: { branchId },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        select: {
          id: true,
          name: true,
          grade: true,
          active: true,
          closedAt: true,
          eywaBindingId: true,
          userId: true,
          user: { select: { name: true, branchId: true, deletedAt: true } },
        },
      });
      if (query.classId && !classes.some((c) => c.id === query.classId))
        throw new AdminBranchLearningScopeError("지점의 반을 찾지 못했습니다.");
      const filters = {
        classes: classes
          .map(({ id, name }) => ({ id, name }))
          .sort(
            (a, b) =>
              compareRosterNames(a.name, b.name) || a.id.localeCompare(b.id),
          ),
      };
      const roster = await readAdminLearningRoster(tx, branchId, now);
      const search = query.q.toLocaleLowerCase("ko-KR");
      if (query.kind === "students") {
        const students = roster
          .map(({ student }) => ({
            ...student,
            classId:
              query.classId &&
              student.classes.some((c) => c.id === query.classId)
                ? query.classId
                : student.classId,
          }))
          .filter(
            (s) =>
              (!query.classId ||
                s.classes.some((c) => c.id === query.classId)) &&
              (!search ||
                [
                  s.name,
                  s.account?.loginId ?? "",
                  ...s.classes.map((c) => c.name),
                ].some((name) => includes(name, search))) &&
              (query.login === "all" ||
                (query.login === "issued"
                  ? !!s.account
                  : s.login === query.login)),
          );
        return { kind: "students", ...pageRows(students, query), filters };
      }

      const classIds = classes.map((c) => c.id);
      const summaries = summarizeAdminLearningRoster(roster, classIds);
      const memberships = await tx.classMembership.findMany({
        where: {
          classId: { in: classIds },
          class: { branchId },
          revokedAt: null,
          user: { branchId, deletedAt: null },
        },
        orderBy: [{ classId: "asc" }, { userId: "asc" }, { id: "asc" }],
        select: {
          classId: true,
          userId: true,
          bindingId: true,
          role: true,
          capabilities: true,
          startsOn: true,
          endsOn: true,
          revokedAt: true,
          user: { select: { name: true } },
        },
      });
      const classById = new Map(classes.map((c) => [c.id, c]));
      const teachers = new Map<string, Set<string>>();
      for (const c of classes) {
        if (c.user.branchId === branchId && !c.user.deletedAt)
          teachers.set(c.id, new Set([c.user.name]));
      }
      for (const m of memberships) {
        const c = classById.get(m.classId);
        if (
          !c ||
          !c.active ||
          (c.closedAt && c.closedAt <= now) ||
          m.bindingId !== c.eywaBindingId ||
          !(
            membershipAllows(m, "class:read", now) ||
            membershipAllows(m, "student:read", now)
          )
        )
          continue;
        const names = teachers.get(c.id) ?? new Set<string>();
        names.add(m.user.name);
        teachers.set(c.id, names);
      }
      // Class-level login filters mean at least one current enrolled student matches that state.
      const classLoginMatches = new Set(
        roster
          .filter(
            ({ student }) =>
              query.login === "all" ||
              (query.login === "issued"
                ? !!student.account
                : student.login === query.login),
          )
          .flatMap(({ countedClassIds }) => countedClassIds),
      );
      const rows: AdminBranchLearningClass[] = classes
        .map((c) => ({
          id: c.id,
          name: c.name,
          grade: c.grade,
          active: c.active && (!c.closedAt || c.closedAt > now),
          sourceManaged: !!c.eywaBindingId,
          teachers: [...(teachers.get(c.id) ?? [])].sort(compareRosterNames),
          enrolledCount: summaries.get(c.id)!.total,
          issuanceSummary: summaries.get(c.id)!,
        }))
        .filter(
          (c) =>
            (!query.classId || c.id === query.classId) &&
            (!search ||
              [c.name, c.grade, ...c.teachers].some((name) =>
                includes(name, search),
              )) &&
            (query.login === "all" || classLoginMatches.has(c.id)),
        );
      return { kind: "classes", ...pageRows(rows, query), filters };
    },
    {
      isolationLevel:
        "RepeatableRead" satisfies Prisma.TransactionIsolationLevel,
    },
  );
}
