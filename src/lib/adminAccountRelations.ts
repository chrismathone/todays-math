import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { currentEnrollmentWhere } from "@/lib/classAccess";
import {
  kstRelationshipDay,
  membershipAllows,
} from "@/lib/eywa/relationPolicy";
import { controlLeaseExpiresAt, controlSchema } from "@/lib/eywa/sync-contract";
import type {
  AdminRelationsQuery,
  AdminRelationsResponse,
  ConnectedClass,
  ConnectedStudent,
} from "@/contracts/adminRelations.contract";
import {
  compareRosterNames,
  selectAdminStudents,
  studentAccountLoginState,
} from "@/lib/adminStudentRoster";
import { readAdminClassIssuanceSummaries } from "@/lib/adminLearningRoster";

const bindingSelect = {
  id: true,
  targetBranchId: true,
  tenantId: true,
  sourceEpoch: true,
  enabled: true,
  healthy: true,
  mode: true,
  retiredAt: true,
  leaseExpiresAt: true,
  securityRevision: true,
  tenantRevocationGeneration: true,
  control: true,
} satisfies Prisma.EywaBindingSelect;
type Binding = Prisma.EywaBindingGetPayload<{ select: typeof bindingSelect }>;

/** Observes stored state only: admin inspection must never refresh/apply a source snapshot. */
function syncState(
  bindingId: string | null,
  sourceId: string | null,
  bindings: Map<string, Binding>,
  now: Date,
) {
  if (!bindingId) return sourceId ? ("legacy" as const) : ("local" as const);
  const binding = bindings.get(bindingId);
  if (!binding) return "unverified" as const;
  if (binding.retiredAt || binding.mode !== "active" || !binding.enabled)
    return "paused" as const;
  if (
    !binding.healthy ||
    !binding.leaseExpiresAt ||
    binding.leaseExpiresAt <= now
  )
    return "unverified" as const;
  const parsed = controlSchema.safeParse(binding.control);
  if (!parsed.success) return "unverified" as const;
  const c = parsed.data;
  return c.enabled &&
    c.healthy &&
    c.mode === "active" &&
    c.bindingId === binding.id &&
    c.targetBranchId === binding.targetBranchId &&
    c.tenantId === binding.tenantId &&
    c.sourceEpoch === binding.sourceEpoch &&
    BigInt(c.securityRevision) === binding.securityRevision &&
    BigInt(c.tenantRevocationGeneration) ===
      binding.tenantRevocationGeneration &&
    controlLeaseExpiresAt(c, now.getTime()) > now.getTime()
    ? ("active" as const)
    : ("unverified" as const);
}

export class AdminRelationScopeError extends Error {}

/** Relation inspection is distinct from impersonation or granting the target's operational permissions. */
export async function readAdminAccountRelations(
  targetId: string,
  query: AdminRelationsQuery,
): Promise<AdminRelationsResponse> {
  return db.$transaction(
    async (tx) => {
      const branchId = query.branchId === "unassigned" ? null : query.branchId;
      const target = await tx.user.findFirst({
        where: { id: targetId, branchId, deletedAt: null },
        select: { id: true, branchId: true },
      });
      if (
        !target ||
        (branchId &&
          !(await tx.branch.findUnique({
            where: { id: branchId },
            select: { id: true },
          })))
      )
        throw new AdminRelationScopeError(
          "계정 또는 소속 지점을 찾지 못했습니다.",
        );

      const now = new Date();
      const bindingRows = branchId
        ? await tx.eywaBinding.findMany({
            where: { targetBranchId: branchId },
            select: bindingSelect,
          })
        : [];
      const bindings = new Map(bindingRows.map((b) => [b.id, b]));
      const bindingIds = [...bindings.keys()]; // DB makes targetBranchId unique: every managed edge has the same immutable binding.
      const memberships = branchId
        ? await tx.classMembership.findMany({
            where: {
              userId: targetId,
              bindingId: { in: bindingIds },
              revokedAt: null,
              class: { branchId, active: true },
            },
            select: {
              classId: true,
              bindingId: true,
              role: true,
              capabilities: true,
              startsOn: true,
              endsOn: true,
              revokedAt: true,
              class: { select: { eywaBindingId: true, closedAt: true } },
            },
            orderBy: [{ classId: "asc" }, { role: "asc" }, { id: "asc" }],
          })
        : [];
      const roles = new Map<string, ConnectedClass["memberships"]>();
      for (const m of memberships) {
        if (
          m.bindingId !== m.class.eywaBindingId ||
          (m.class.closedAt && m.class.closedAt <= now) ||
          !(
            membershipAllows(m, "class:read", now) ||
            membershipAllows(m, "student:read", now)
          )
        )
          continue;
        const current = roles.get(m.classId) ?? [];
        const role = m.role as ConnectedClass["memberships"][number];
        if (!current.includes(role)) roles.set(m.classId, [...current, role]);
      }
      const classScope: Prisma.ClassWhereInput = {
        branchId,
        OR: [{ userId: targetId }, { id: { in: [...roles.keys()] } }],
      };
      const activeClasses: Prisma.ClassWhereInput = {
        AND: [
          classScope,
          { active: true, OR: [{ closedAt: null }, { closedAt: { gt: now } }] },
        ],
      };
      const enrollmentScope: Prisma.StudentEnrollmentWhereInput = {
        ...currentEnrollmentWhere(kstRelationshipDay(now), true),
        bindingId: { in: bindingIds },
        class: { AND: [activeClasses, { eywaBindingId: { in: bindingIds } }] },
      };
      const studentScope: Prisma.StudentWhereInput = {
        branchId,
        isTest: false,
        eywaWithdrawnAt: null,
        AND: [
          {
            OR: [
              { sourceStatus: null },
              { sourceStatus: { not: "withdrawn" } },
            ],
          },
          {
            OR: [
              { eywaBindingId: null, class: activeClasses },
              {
                eywaBindingId: { in: bindingIds },
                enrollments: { some: enrollmentScope },
              },
            ],
          },
        ],
      };
      const total =
        query.kind === "classes"
          ? await tx.class.count({ where: activeClasses })
          : 0;
      const page = Math.min(
        query.page,
        Math.max(1, Math.ceil(total / query.pageSize)),
      );
      const meta = { page, pageSize: query.pageSize, total };
      const pagination = {
        orderBy: [{ name: "asc" as const }, { id: "asc" as const }],
        skip: (page - 1) * query.pageSize,
        take: query.pageSize,
      };

      if (query.kind === "classes") {
        const rows = await tx.class.findMany({
          where: activeClasses,
          ...pagination,
          select: {
            id: true,
            userId: true,
            name: true,
            grade: true,
            active: true,
            closedAt: true,
            eywaBindingId: true,
            eywaClassId: true,
          },
        });
        const summaries = await readAdminClassIssuanceSummaries(
          tx,
          branchId,
          rows.map((c) => c.id),
          now,
        );
        return {
          kind: "classes",
          meta,
          data: rows.map((c) => ({
            id: c.id,
            name: c.name,
            grade: c.grade,
            active: c.active && (!c.closedAt || c.closedAt > now),
            owner: c.userId === target.id,
            memberships: roles.get(c.id) ?? [],
            sync: syncState(c.eywaBindingId, c.eywaClassId, bindings, now),
            issuanceSummary: summaries.get(c.id),
          })),
        };
      }
      const rows = await tx.student.findMany({
        where: studentScope,
        orderBy: pagination.orderBy,
        select: {
          id: true,
          name: true,
          schoolLevel: true,
          schoolGrade: true,
          eywaBindingId: true,
          eywaStudentId: true,
          class: { select: { id: true, name: true, grade: true } },
          studentAccount: { select: { disabledAt: true, lockedUntil: true } },
          enrollments: {
            where: enrollmentScope,
            orderBy: [{ classId: "asc" }, { onHold: "asc" }, { id: "asc" }],
            select: {
              bindingId: true,
              onHold: true,
              class: { select: { id: true, name: true, grade: true } },
            },
          },
        },
      });
      const roster: ConnectedStudent[] = rows.map((s) => {
        const login = studentAccountLoginState(s.studentAccount, now);
        const classes = new Map<
          string,
          { id: string; name: string; membership: "enrolled" | "on-hold" }
        >();
        for (const e of s.enrollments) {
          if (e.bindingId !== s.eywaBindingId || classes.has(e.class.id))
            continue;
          classes.set(e.class.id, {
            id: e.class.id,
            name: e.class.name,
            membership: e.onHold ? "on-hold" : "enrolled",
          });
        }
        const classGrades = [
          ...new Set(
            (s.eywaBindingId
              ? s.enrollments
                  .filter((e) => e.bindingId === s.eywaBindingId)
                  .map((e) => e.class.grade)
              : [s.class.grade]
            ).filter(Boolean),
          ),
        ];
        return {
          id: s.id,
          name: s.name,
          grade:
            s.schoolLevel && s.schoolGrade
              ? `${s.schoolLevel}${s.schoolGrade}`
              : classGrades.length === 1
                ? classGrades[0]
                : null,
          sync: syncState(s.eywaBindingId, s.eywaStudentId, bindings, now),
          login,
          classes: s.eywaBindingId
            ? [...classes.values()].sort((a, b) =>
                compareRosterNames(a.name, b.name),
              )
            : [
                {
                  id: s.class.id,
                  name: s.class.name,
                  membership: "legacy" as const,
                },
              ],
        };
      });
      const availableClasses = await tx.class.findMany({
        where: activeClasses,
        select: { id: true, name: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
      });
      return {
        kind: "students",
        ...selectAdminStudents(roster, query),
        filters: {
          classes: availableClasses
            .map((c) => ({ id: c.id, name: c.name }))
            .sort((a, b) => compareRosterNames(a.name, b.name)),
          grades: [
            ...new Set(
              roster
                .map((student) => student.grade)
                .filter((grade): grade is string => !!grade),
            ),
          ].sort(compareRosterNames),
        },
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
