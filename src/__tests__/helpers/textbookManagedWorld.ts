import { randomUUID } from "node:crypto";

import type { TextbookActor } from "@/lib/textbook/access";
import { kstRelationshipDay } from "@/lib/eywa/relationPolicy";

import { type Db, sqlNow } from "./textbookPglite";
import { insertBranch, insertTeacher } from "./textbookServerWorld";

/** Isolated local rows only. No transport, Prisma client, or application auth is mocked. */
export async function createManagedWorld(pg: Db) {
  const branchId = await insertBranch(pg);
  const teacher = await insertTeacher(pg, { branchId, name: "현재 담당" });
  const formerTeacher = await insertTeacher(pg, {
    branchId,
    name: "이전 담당",
  });
  const delegate = await insertTeacher(pg, { branchId, name: "조회 위임" });
  const bindingId = randomUUID();
  const sourceEpoch = randomUUID();
  const classId = randomUUID();
  const otherClassId = randomUUID();
  const sourceClassId = randomUUID();
  const otherSourceClassId = randomUUID();
  const studentId = randomUUID();
  const teacherSourceUserId = randomUUID();
  const formerSourceUserId = randomUUID();
  const delegateSourceUserId = randomUUID();
  // Deliberately above JS's safe integer range: JSON grant comparisons must remain exact.
  const permissionRevision = "9007199254740993";
  const now = new Date(Date.now());
  const today = kstRelationshipDay(now);
  const startsOn = kstRelationshipDay(
    new Date(now.getTime() - 10 * 86_400_000),
  );
  const leaseExpiresAt = new Date(now.getTime() + 86_400_000).toISOString();
  const capabilities = [
    "class:read",
    "student:read",
    "progress:read",
    "progress:write",
    "test:read",
    "test:write",
    "student:account",
  ];

  await pg.query(
    `INSERT INTO "eywa_binding" ("id", "tenant_id", "target_branch_id", "source_epoch", "mode", "enabled", "healthy",
       "security_revision", "tenant_revocation_generation", "lease_expires_at", "updated_at")
     VALUES ($1, $2, $3, $4, 'active', TRUE, TRUE, 1, 1, $5, $6)`,
    [bindingId, randomUUID(), branchId, sourceEpoch, leaseExpiresAt, sqlNow()],
  );
  for (const [id, sourceId] of [
    [classId, sourceClassId],
    [otherClassId, otherSourceClassId],
  ]) {
    await pg.query(
      `INSERT INTO "class" ("id", "user_id", "name", "grade", "difficulty_ratio", "branch_id", "eywa_binding_id",
         "eywa_class_id", "permission_revision", "updated_at")
       VALUES ($1, $2, '관리형 반', '중1', '{}', $3, $4, $5, $6, $7)`,
      [
        id,
        formerTeacher.id,
        branchId,
        bindingId,
        sourceId,
        permissionRevision,
        sqlNow(),
      ],
    );
  }

  async function account(
    actor: TextbookActor,
    sourceUserId: string,
    sourceIds: string[],
  ) {
    await pg.query(
      `UPDATE "user" SET "auth_source" = 'eywa', "branch_role" = 'teacher',
        "eywa_user_id" = $2 WHERE "id" = $1`,
      [actor.id, sourceUserId],
    );
    await pg.query(
      `INSERT INTO "eywa_managed_account" ("id", "binding_id", "source_user_id", "user_id", "current_user_id",
         "current_source_user_id", "status", "source_email", "source_name", "source_classes", "source_epoch",
         "security_revision", "tenant_revocation_generation", "class_list_revision", "lease_expires_at", "updated_at")
       VALUES ($1, $2, $3, $4, $4, $3, 'confirmed', $5, $6, $7, $8, 1, 1, 1, $9, $10)`,
      [
        randomUUID(),
        bindingId,
        sourceUserId,
        actor.id,
        `${actor.id}@example.test`,
        actor.name,
        JSON.stringify(
          sourceIds.map((id) => ({
            id,
            permissionRevision,
            capabilities,
            validUntil: null,
          })),
        ),
        sourceEpoch,
        leaseExpiresAt,
        sqlNow(),
      ],
    );
  }
  await account(teacher, teacherSourceUserId, [sourceClassId]);
  await account(formerTeacher, formerSourceUserId, [otherSourceClassId]);
  await account(delegate, delegateSourceUserId, [sourceClassId]);

  async function membership(
    actor: TextbookActor,
    sourceUserId: string,
    targetClassId: string,
    role: string,
    revoked = false,
  ) {
    const id = randomUUID();
    await pg.query(
      `INSERT INTO "class_membership" ("id", "binding_id", "source_id", "class_id", "user_id", "source_user_id",
         "role", "starts_on", "revoked_at", "capabilities") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        bindingId,
        id,
        targetClassId,
        actor.id,
        sourceUserId,
        role,
        startsOn,
        revoked ? sqlNow() : null,
        capabilities,
      ],
    );
    return id;
  }
  const teacherMembershipId = await membership(
    teacher,
    teacherSourceUserId,
    classId,
    "homeroom",
  );
  const formerMembershipId = await membership(
    formerTeacher,
    formerSourceUserId,
    classId,
    "homeroom",
    true,
  );
  const formerOtherMembershipId = await membership(
    formerTeacher,
    formerSourceUserId,
    otherClassId,
    "slot",
  );
  const delegateMembershipId = await membership(
    delegate,
    delegateSourceUserId,
    classId,
    "delegate",
  );

  await pg.query(
    `INSERT INTO "student" ("id", "class_id", "name", "branch_id", "eywa_binding_id", "updated_at")
     VALUES ($1, $2, '복수 수강 학생', $3, $4, $5)`,
    [studentId, otherClassId, branchId, bindingId, sqlNow()],
  );
  async function enrollment(targetClassId: string) {
    const id = randomUUID();
    await pg.query(
      `INSERT INTO "student_enrollment" ("id", "binding_id", "source_id", "student_id", "class_id", "starts_on")
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, bindingId, randomUUID(), studentId, targetClassId, startsOn],
    );
    return id;
  }
  const enrollmentId = await enrollment(classId);
  const otherEnrollmentId = await enrollment(otherClassId);
  return {
    bindingId,
    branchId,
    sourceEpoch,
    classId,
    otherClassId,
    sourceClassId,
    otherSourceClassId,
    studentId,
    teacher,
    formerTeacher,
    delegate,
    teacherSourceUserId,
    formerSourceUserId,
    delegateSourceUserId,
    teacherMembershipId,
    formerMembershipId,
    formerOtherMembershipId,
    delegateMembershipId,
    enrollmentId,
    otherEnrollmentId,
    permissionRevision,
    capabilities,
    today,
    startsOn,
    leaseExpiresAt,
  };
}
