/**
 * Current operational relationships for textbook work. Book ownership remains in access.ts.
 * The production boundary refreshes managed grants before calling this module. This module
 * rechecks persisted facts through the caller's SQL connection, including on request replay.
 * lock:true requires a transaction; binding -> user -> class follows the receiver's fence.
 */
import type { EywaBinding, EywaManagedAccount } from "@prisma/client";

import { accountUsable } from "@/lib/eywa/managedPolicy";
import {
  currentClassGrantAllows,
  enrollmentActive,
  kstRelationshipDay,
  membershipAllows,
  type ClassCapability,
  type EnrollmentWindow,
  type MembershipWindow,
} from "@/lib/eywa/relationPolicy";
import { controlUserSchema } from "@/lib/eywa/sync-contract";

import type { TextbookActor } from "../access";
import { notFound } from "./errors";
import { isoColumn, type TextbookSql } from "./sql";

type ScopeOptions = { lock?: boolean };
type JsonRow = Record<string, unknown>;

interface TeacherRow {
  id: string;
  branchId: string | null;
  authSource: string;
  approvalStatus: Parameters<typeof accountUsable>[0]["approvalStatus"];
  deletedAt: string | null;
  suspendedAt: string | null;
  manualSuspendedAt: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  account: JsonRow | null;
  binding: JsonRow | null;
}

interface TeacherContext {
  user: TeacherRow;
  account: EywaManagedAccount | null;
  binding: EywaBinding | null;
}

interface ClassRow {
  id: string;
  userId: string;
  branchId: string | null;
  eywaBindingId: string | null;
  eywaClassId: string | null;
  permissionRevision: string;
  active: boolean;
  closedAt: string | null;
  classOwnerBranchId: string | null;
  classOwnerActive: boolean;
}

interface StudentRow {
  id: string;
  classId: string;
  branchId: string | null;
  eywaBindingId: string | null;
  eywaWithdrawnAt: string | null;
  isTest: boolean;
}

interface EnrollmentRow extends EnrollmentWindow {
  classId: string;
  bindingId: string;
}

const bigintColumns = [
  "security_revision",
  "account_revocation_generation",
  "tenant_revocation_generation",
  "class_list_revision",
  "content_generation",
] as const;

const asDate = (value: string): Date =>
  new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`);

/** Full to_jsonb(row), with bigint columns transported as strings, preserves model facts. */
function modelRow<T extends EywaBinding | EywaManagedAccount>(row: JsonRow): T {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      const name = key.replace(/_([a-z])/g, (_, letter: string) =>
        letter.toUpperCase(),
      );
      if (value !== null && typeof value === "string") {
        if (bigintColumns.some((column) => column === key))
          value = BigInt(value);
        else if (/(?:At|Until)$/.test(name)) value = asDate(value);
      }
      return [name, value];
    }),
  ) as T;
}

const bindingJson = (alias: string) =>
  `to_jsonb(${alias}) || jsonb_build_object(
    'security_revision', ${alias}."security_revision"::text,
    'tenant_revocation_generation', ${alias}."tenant_revocation_generation"::text,
    'content_generation', ${alias}."content_generation"::text)`;

async function teacherRow(
  sql: TextbookSql,
  id: string,
): Promise<TeacherRow | undefined> {
  const [row] = await sql.query<TeacherRow>(
    `SELECT u."id", u."branch_id" AS "branchId", u."auth_source" AS "authSource",
            u."approval_status"::text AS "approvalStatus", u."is_admin" AS "isAdmin",
            u."is_super_admin" AS "isSuperAdmin", ${isoColumn('u."deleted_at"')} AS "deletedAt",
            ${isoColumn('u."suspended_at"')} AS "suspendedAt",
            ${isoColumn('u."manual_suspended_at"')} AS "manualSuspendedAt",
            CASE WHEN a."id" IS NULL THEN NULL ELSE to_jsonb(a) || jsonb_build_object(
              'security_revision', a."security_revision"::text,
              'account_revocation_generation', a."account_revocation_generation"::text,
              'tenant_revocation_generation', a."tenant_revocation_generation"::text,
              'class_list_revision', a."class_list_revision"::text) END AS "account",
            CASE WHEN b."id" IS NULL THEN NULL ELSE ${bindingJson("b")} END AS "binding"
       FROM "user" u
       LEFT JOIN "eywa_managed_account" a ON a."current_user_id" = u."id"
       LEFT JOIN "eywa_binding" b ON b."id" = a."binding_id"
      WHERE u."id" = $1::uuid`,
    [id],
  );
  return row;
}

function teacherUsable(
  context: TeacherContext,
  actor: TextbookActor,
  now: Date,
): boolean {
  const { user, account, binding } = context;
  if (
    user.id !== actor.id ||
    user.branchId !== actor.branchId ||
    user.deletedAt ||
    user.suspendedAt ||
    user.manualSuspendedAt ||
    user.approvalStatus !== "approved"
  )
    return false;
  if (!account) return user.authSource !== "eywa";
  if (
    !binding ||
    account.currentUserId !== user.id ||
    account.userId !== user.id
  )
    return false;
  return (
    binding.targetBranchId === user.branchId &&
    accountUsable(
      {
        ...user,
        deletedAt: user.deletedAt ? asDate(user.deletedAt) : null,
        manualSuspendedAt: user.manualSuspendedAt
          ? asDate(user.manualSuspendedAt)
          : null,
      },
      account,
      binding,
      now.getTime(),
    )
  );
}

async function teacherContext(
  sql: TextbookSql,
  actor: TextbookActor,
  options: ScopeOptions,
): Promise<TeacherContext | null> {
  let row = await teacherRow(sql, actor.id);
  if (!row) return null;
  if (options.lock) {
    const bindingId = row.account?.binding_id;
    if (typeof bindingId === "string") {
      await sql.query(
        `SELECT "id" FROM "eywa_binding" WHERE "id" = $1::uuid FOR SHARE`,
        [bindingId],
      );
    }
    await sql.query(`SELECT "id" FROM "user" WHERE "id" = $1::uuid FOR SHARE`, [
      actor.id,
    ]);
    row = await teacherRow(sql, actor.id);
    // An identity remap while acquiring locks needs a new request, not a different lock order.
    if (!row || row.account?.binding_id !== bindingId) return null;
  }
  const context: TeacherContext = {
    user: row,
    account: row.account ? modelRow<EywaManagedAccount>(row.account) : null,
    binding: row.binding ? modelRow<EywaBinding>(row.binding) : null,
  };
  return teacherUsable(context, actor, new Date(Date.now())) ? context : null;
}

async function loadClass(
  sql: TextbookSql,
  id: string,
  lock = false,
): Promise<ClassRow | undefined> {
  const [row] = await sql.query<ClassRow>(
    `SELECT c."id", c."user_id" AS "userId", c."branch_id" AS "branchId",
            c."eywa_binding_id" AS "eywaBindingId", c."eywa_class_id" AS "eywaClassId",
            c."permission_revision"::text AS "permissionRevision", c."active",
            ${isoColumn('c."closed_at"')} AS "closedAt", o."branch_id" AS "classOwnerBranchId",
            (o."deleted_at" IS NULL AND o."suspended_at" IS NULL
             AND o."manual_suspended_at" IS NULL AND o."approval_status" = 'approved') AS "classOwnerActive"
       FROM "class" c JOIN "user" o ON o."id" = c."user_id"
      WHERE c."id" = $1::uuid${lock ? " FOR SHARE OF c" : ""}`,
    [id],
  );
  return row;
}

function activeClass(cls: ClassRow, now: Date): boolean {
  return (
    cls.active &&
    (!cls.closedAt || asDate(cls.closedAt).getTime() > now.getTime())
  );
}

async function classAllowed(
  sql: TextbookSql,
  actor: TextbookActor,
  context: TeacherContext,
  cls: ClassRow,
  capability: ClassCapability,
): Promise<boolean> {
  const now = new Date(Date.now());
  if (!teacherUsable(context, actor, now)) return false;
  if (!context.account) {
    return (
      !cls.eywaBindingId &&
      cls.userId === actor.id &&
      (!cls.branchId || cls.branchId === context.user.branchId)
    );
  }
  const { account, binding } = context;
  if (
    !binding ||
    cls.eywaBindingId !== binding.id ||
    cls.branchId !== binding.targetBranchId ||
    !activeClass(cls, now)
  )
    return false;
  const grants = controlUserSchema.shape.classes.safeParse(
    account.sourceClasses,
  );
  if (
    !grants.success ||
    !currentClassGrantAllows(
      grants.data.find((grant) => grant.id === cls.eywaClassId),
      cls.eywaClassId,
      BigInt(cls.permissionRevision),
      capability,
      now,
    )
  )
    return false;
  const memberships = await sql.query<MembershipWindow>(
    `SELECT "starts_on"::text AS "startsOn", "ends_on"::text AS "endsOn",
            ${isoColumn('"revoked_at"')} AS "revokedAt", "role", "capabilities"
       FROM "class_membership" WHERE "user_id" = $1::uuid AND "class_id" = $2::uuid
        AND "binding_id" = $3::uuid AND "source_user_id" = $4::uuid`,
    [actor.id, cls.id, binding.id, account.sourceUserId],
  );
  return memberships.some((membership) =>
    membershipAllows(membership, capability, now),
  );
}

export async function mayUseClass(
  sql: TextbookSql,
  actor: TextbookActor,
  classId: string,
  capability: ClassCapability,
  options: ScopeOptions = {},
): Promise<boolean> {
  const context = await teacherContext(sql, actor, options);
  if (!context) return false;
  const cls = await loadClass(sql, classId, options.lock);
  return !!cls && classAllowed(sql, actor, context, cls, capability);
}

export async function requireClassScope(
  sql: TextbookSql,
  actor: TextbookActor,
  classId: string,
  capability: ClassCapability,
  options: ScopeOptions = {},
): Promise<void> {
  if (!(await mayUseClass(sql, actor, classId, capability, options)))
    throw notFound("반");
}

async function loadStudent(
  sql: TextbookSql,
  id: string,
  lock = false,
): Promise<StudentRow | undefined> {
  const [row] = await sql.query<StudentRow>(
    `SELECT "id", "class_id" AS "classId", "branch_id" AS "branchId",
            "eywa_binding_id" AS "eywaBindingId", "is_test" AS "isTest",
            ${isoColumn('"eywa_withdrawn_at"')} AS "eywaWithdrawnAt"
       FROM "student" WHERE "id" = $1::uuid${lock ? " FOR SHARE" : ""}`,
    [id],
  );
  return row;
}

async function enrollments(
  sql: TextbookSql,
  student: StudentRow,
): Promise<EnrollmentRow[]> {
  return sql.query<EnrollmentRow>(
    `SELECT "class_id" AS "classId", "binding_id" AS "bindingId", "starts_on"::text AS "startsOn",
            "ends_on"::text AS "endsOn", "on_hold" AS "onHold", "is_transferred" AS "isTransferred",
            ${isoColumn('"ended_at"')} AS "endedAt"
       FROM "student_enrollment" WHERE "student_id" = $1::uuid AND "binding_id" = $2::uuid
      ORDER BY "class_id", "id"`,
    [student.id, student.eywaBindingId],
  );
}

export async function mayUseStudent(
  sql: TextbookSql,
  actor: TextbookActor,
  studentId: string,
  capability: ClassCapability,
  options: ScopeOptions = {},
): Promise<boolean> {
  const context = await teacherContext(sql, actor, options);
  if (!context) return false;
  const student = await loadStudent(sql, studentId, options.lock);
  if (!student || student.isTest || student.eywaWithdrawnAt) return false;
  const now = new Date(Date.now());
  const includeOnHold =
    capability.endsWith(":read") || capability === "student:account";
  const classIds = student.eywaBindingId
    ? (await enrollments(sql, student))
        .filter((row) =>
          enrollmentActive(row, kstRelationshipDay(now), includeOnHold),
        )
        .map((row) => row.classId)
    : [student.classId];
  for (const classId of new Set(classIds)) {
    const cls = await loadClass(sql, classId, options.lock);
    if (
      !cls ||
      (student.eywaBindingId &&
        (cls.eywaBindingId !== student.eywaBindingId ||
          cls.branchId !== student.branchId))
    )
      continue;
    if (await classAllowed(sql, actor, context, cls, capability)) return true;
  }
  return false;
}

export async function requireStudentScope(
  sql: TextbookSql,
  actor: TextbookActor,
  studentId: string,
  capability: ClassCapability,
  options: ScopeOptions = {},
): Promise<void> {
  if (!(await mayUseStudent(sql, actor, studentId, capability, options)))
    throw notFound("학생");
}

export interface TextbookStudentClass {
  classId: string;
  classOwnerId: string;
  classOwnerBranchId: string | null;
  classOwnerActive: boolean;
  branchId: string | null;
  managed: boolean;
}

/** Student eligibility is independent of a teacher's departure or a compatibility classId. */
export async function activeTextbookStudentClasses(
  sql: TextbookSql,
  studentId: string,
): Promise<TextbookStudentClass[]> {
  const student = await loadStudent(sql, studentId);
  if (!student || student.isTest || student.eywaWithdrawnAt) return [];
  const now = new Date(Date.now());
  let classIds = [student.classId];
  let binding: EywaBinding | null = null;
  if (student.eywaBindingId) {
    const [row] = await sql.query<{ binding: JsonRow }>(
      `SELECT ${bindingJson("b")} AS "binding" FROM "eywa_binding" b WHERE b."id" = $1::uuid`,
      [student.eywaBindingId],
    );
    if (!row) return [];
    binding = modelRow<EywaBinding>(row.binding);
    if (
      binding.retiredAt ||
      binding.mode !== "active" ||
      !binding.enabled ||
      !binding.healthy ||
      !binding.leaseExpiresAt ||
      binding.leaseExpiresAt.getTime() <= now.getTime() ||
      student.branchId !== binding.targetBranchId
    )
      return [];
    classIds = (await enrollments(sql, student))
      .filter((enrollment) =>
        enrollmentActive(enrollment, kstRelationshipDay(now)),
      )
      .map((enrollment) => enrollment.classId);
  }
  const result: TextbookStudentClass[] = [];
  for (const classId of new Set(classIds)) {
    const cls = await loadClass(sql, classId);
    if (
      !cls ||
      (binding &&
        (cls.eywaBindingId !== binding.id ||
          cls.branchId !== binding.targetBranchId ||
          !activeClass(cls, now)))
    )
      continue;
    result.push({
      classId: cls.id,
      classOwnerId: cls.userId,
      classOwnerBranchId: cls.classOwnerBranchId,
      classOwnerActive: cls.classOwnerActive,
      branchId: cls.branchId,
      managed: binding !== null,
    });
  }
  return result;
}
