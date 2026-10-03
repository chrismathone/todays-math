// @vitest-environment node
import { randomUUID } from "node:crypto";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// Importing the global Prisma client would break the isolation promised by TextbookSql.
vi.mock("@/lib/db", () => {
  throw new Error("Operational SQL must not import the live database");
});

import {
  activeTextbookStudentClasses,
  mayUseClass,
  mayUseStudent,
  requireClassScope,
  requireStudentScope,
} from "@/lib/textbook/server/operationalScope";
import type { TextbookDb, TextbookSql } from "@/lib/textbook/server/sql";

import { createManagedWorld } from "../helpers/textbookManagedWorld";
import { type Db, openTextbookDb, sqlNow } from "../helpers/textbookPglite";
import {
  insertBranch,
  insertTeacher,
  pgliteTextbookDb,
} from "../helpers/textbookServerWorld";

let pg: Db;
let db: TextbookDb;
let world: Awaited<ReturnType<typeof createManagedWorld>>;

beforeAll(async () => {
  vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-03T15:30:00Z"));
  pg = await openTextbookDb();
  db = pgliteTextbookDb(pg);
}, 120_000);
beforeEach(async () => {
  world = await createManagedWorld(pg);
});
afterAll(async () => {
  vi.restoreAllMocks();
  await pg.close();
});

describe("textbook operational scope on the actual migration chain", () => {
  it("uses current staff, not the archived creator, and keeps private ownership flags out", async () => {
    expect(
      await mayUseClass(db, world.teacher, world.classId, "progress:write"),
    ).toBe(true);
    expect(
      await mayUseClass(
        db,
        world.formerTeacher,
        world.classId,
        "progress:read",
      ),
    ).toBe(false);
    expect(
      await mayUseClass(
        db,
        world.formerTeacher,
        world.otherClassId,
        "progress:write",
      ),
    ).toBe(true);
    expect(
      await mayUseClass(
        db,
        { ...world.formerTeacher, isAdmin: true } as typeof world.teacher,
        world.classId,
        "progress:read",
      ),
    ).toBe(false);
    await expect(
      requireClassScope(
        db,
        world.formerTeacher,
        world.classId,
        "progress:write",
      ),
    ).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
  });

  it("preserves own-only local classes and their frozen branch after a creator moves", async () => {
    const branch = await insertBranch(pg);
    const otherBranch = await insertBranch(pg);
    const local = await insertTeacher(pg, { branchId: branch });
    const colleague = await insertTeacher(pg, { branchId: branch });
    const classId = randomUUID();
    await pg.query(
      `INSERT INTO "class" ("id", "user_id", "name", "grade", "difficulty_ratio", "branch_id", "updated_at")
       VALUES ($1, $2, '개인 반', '중1', '{}', $3, $4)`,
      [classId, local.id, branch, sqlNow()],
    );
    expect(await mayUseClass(db, local, classId, "test:write")).toBe(true);
    expect(await mayUseClass(db, colleague, classId, "test:read")).toBe(false);
    await pg.query(`UPDATE "user" SET "branch_id" = $2 WHERE "id" = $1`, [
      local.id,
      otherBranch,
    ]);
    expect(
      await mayUseClass(
        db,
        { ...local, branchId: otherBranch },
        classId,
        "test:write",
      ),
    ).toBe(false);
    const unboundClassId = randomUUID();
    await pg.query(
      `INSERT INTO "class" ("id", "user_id", "name", "grade", "difficulty_ratio", "updated_at")
       VALUES ($1, $2, '독립 반', '중1', '{}', $3)`,
      [unboundClassId, local.id, sqlNow()],
    );
    expect(
      await mayUseClass(
        db,
        { ...local, branchId: otherBranch },
        unboundClassId,
        "test:write",
      ),
    ).toBe(true);
  });

  it("does not fall back to creator ownership for missing or blocked managed identities", async () => {
    await pg.query(
      `UPDATE "eywa_managed_account" SET "status" = 'ended', "current_user_id" = NULL,
      "current_source_user_id" = NULL WHERE "current_user_id" = $1`,
      [world.formerTeacher.id],
    );
    expect(
      await mayUseClass(
        db,
        world.formerTeacher,
        world.otherClassId,
        "test:write",
      ),
    ).toBe(false);
    await pg.query(
      `UPDATE "eywa_managed_account" SET "block_reasons" = ARRAY['staff_ineligible'] WHERE "current_user_id" = $1`,
      [world.teacher.id],
    );
    expect(
      await mayUseClass(db, world.teacher, world.classId, "test:write"),
    ).toBe(false);
  });

  it("enforces readonly delegation despite source and local write capability lists", async () => {
    expect(
      await mayUseClass(db, world.delegate, world.classId, "progress:read"),
    ).toBe(true);
    expect(
      await mayUseStudent(db, world.delegate, world.studentId, "progress:read"),
    ).toBe(true);
    expect(
      await mayUseClass(db, world.delegate, world.classId, "test:write"),
    ).toBe(false);
    expect(
      await mayUseStudent(
        db,
        world.delegate,
        world.studentId,
        "progress:write",
      ),
    ).toBe(false);
  });

  it("rejects revoked membership and a source grant removed while the local row remains", async () => {
    await pg.query(
      `UPDATE "class_membership" SET "revoked_at" = $2 WHERE "id" = $1`,
      [world.teacherMembershipId, sqlNow()],
    );
    expect(
      await mayUseClass(db, world.teacher, world.classId, "progress:read"),
    ).toBe(false);
    await pg.query(
      `UPDATE "class_membership" SET "revoked_at" = NULL WHERE "id" = $1`,
      [world.teacherMembershipId],
    );
    await pg.query(
      `UPDATE "eywa_managed_account" SET "source_classes" = '[]' WHERE "current_user_id" = $1`,
      [world.teacher.id],
    );
    expect(
      await mayUseClass(db, world.teacher, world.classId, "progress:read"),
    ).toBe(false);
  });

  it("compares source permission revisions exactly above Number.MAX_SAFE_INTEGER", async () => {
    expect(
      await mayUseClass(db, world.teacher, world.classId, "test:write"),
    ).toBe(true);
    await pg.query(
      `UPDATE "class" SET "permission_revision" = "permission_revision" + 1 WHERE "id" = $1`,
      [world.classId],
    );
    expect(
      await mayUseClass(db, world.teacher, world.classId, "test:write"),
    ).toBe(false);
  });

  it.each(["account", "binding"] as const)(
    "denies expired %s leases without falling back",
    async (kind) => {
      if (kind === "account") {
        await pg.query(
          `UPDATE "eywa_managed_account" SET "lease_expires_at" = '2000-01-01' WHERE "current_user_id" = $1`,
          [world.teacher.id],
        );
      } else {
        await pg.query(
          `UPDATE "eywa_binding" SET "lease_expires_at" = '2000-01-01' WHERE "id" = $1`,
          [world.bindingId],
        );
        expect(await activeTextbookStudentClasses(db, world.studentId)).toEqual(
          [],
        );
      }
      expect(
        await mayUseClass(db, world.teacher, world.classId, "progress:read"),
      ).toBe(false);
    },
  );

  it("denies epoch or tenant generation disagreement and malformed grants", async () => {
    await pg.query(
      `UPDATE "eywa_managed_account" SET "tenant_revocation_generation" = 2 WHERE "current_user_id" = $1`,
      [world.teacher.id],
    );
    expect(
      await mayUseClass(db, world.teacher, world.classId, "test:read"),
    ).toBe(false);
    await pg.query(
      `UPDATE "eywa_managed_account" SET "tenant_revocation_generation" = 1, "source_epoch" = $2 WHERE "current_user_id" = $1`,
      [world.teacher.id, randomUUID()],
    );
    expect(
      await mayUseClass(db, world.teacher, world.classId, "test:read"),
    ).toBe(false);
    await pg.query(
      `UPDATE "eywa_managed_account" SET "source_epoch" = $2, "source_classes" = '{}' WHERE "current_user_id" = $1`,
      [world.teacher.id, world.sourceEpoch],
    );
    expect(
      await mayUseClass(db, world.teacher, world.classId, "test:read"),
    ).toBe(false);
  });

  it("uses KST membership days including a normal end date", async () => {
    expect(world.today).toBe("2026-10-04");
    await pg.query(
      `UPDATE "class_membership" SET "starts_on" = $2, "ends_on" = $2 WHERE "id" = $1`,
      [world.teacherMembershipId, world.today],
    );
    expect(
      await mayUseClass(db, world.teacher, world.classId, "test:read"),
    ).toBe(true);
    await pg.query(
      `UPDATE "class_membership" SET "starts_on" = '2026-10-05', "ends_on" = NULL WHERE "id" = $1`,
      [world.teacherMembershipId],
    );
    expect(
      await mayUseClass(db, world.teacher, world.classId, "test:read"),
    ).toBe(false);
    await pg.query(
      `UPDATE "class_membership" SET "starts_on" = '2026-10-01', "ends_on" = '2026-10-03' WHERE "id" = $1`,
      [world.teacherMembershipId],
    );
    expect(
      await mayUseClass(db, world.teacher, world.classId, "test:read"),
    ).toBe(false);
  });

  it("finds every current enrollment and never uses the managed compatibility class as permission", async () => {
    expect(
      await mayUseStudent(db, world.teacher, world.studentId, "progress:write"),
    ).toBe(true);
    const classes = await activeTextbookStudentClasses(db, world.studentId);
    expect(classes.map((row) => row.classId).sort()).toEqual(
      [world.classId, world.otherClassId].sort(),
    );
    expect(
      classes.every((row) => row.managed && row.branchId === world.branchId),
    ).toBe(true);
    await pg.query(
      `UPDATE "student_enrollment" SET "ended_at" = $2 WHERE "student_id" = $1`,
      [world.studentId, sqlNow()],
    );
    expect(await activeTextbookStudentClasses(db, world.studentId)).toEqual([]);
    expect(
      await mayUseStudent(
        db,
        world.formerTeacher,
        world.studentId,
        "progress:read",
      ),
    ).toBe(false);
    await expect(
      requireStudentScope(db, world.teacher, world.studentId, "progress:write"),
    ).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
  });

  it("retains read access to on-hold enrollment but blocks new work and student QR scope", async () => {
    await pg.query(
      `UPDATE "student_enrollment" SET "on_hold" = TRUE WHERE "id" = $1`,
      [world.enrollmentId],
    );
    expect(
      await mayUseStudent(db, world.teacher, world.studentId, "progress:read"),
    ).toBe(true);
    expect(
      await mayUseStudent(db, world.teacher, world.studentId, "progress:write"),
    ).toBe(false);
    expect(
      (await activeTextbookStudentClasses(db, world.studentId)).map(
        (row) => row.classId,
      ),
    ).toEqual([world.otherClassId]);
  });

  it("treats transfer end as exclusive and regular end as inclusive", async () => {
    await pg.query(
      `UPDATE "student_enrollment" SET "ends_on" = $2 WHERE "id" = $1`,
      [world.enrollmentId, world.today],
    );
    expect(
      await mayUseStudent(db, world.teacher, world.studentId, "progress:write"),
    ).toBe(true);
    await pg.query(
      `UPDATE "student_enrollment" SET "is_transferred" = TRUE WHERE "id" = $1`,
      [world.enrollmentId],
    );
    expect(
      await mayUseStudent(db, world.teacher, world.studentId, "progress:write"),
    ).toBe(false);
    expect(
      (await activeTextbookStudentClasses(db, world.studentId)).map(
        (row) => row.classId,
      ),
    ).toEqual([world.otherClassId]);
  });

  it("keeps student eligibility independent of teacher departure", async () => {
    await pg.query(
      `UPDATE "class_membership" SET "revoked_at" = $2 WHERE "binding_id" = $1`,
      [world.bindingId, sqlNow()],
    );
    await pg.query(
      `UPDATE "eywa_managed_account" SET "status" = 'ended', "current_user_id" = NULL,
      "current_source_user_id" = NULL WHERE "binding_id" = $1`,
      [world.bindingId],
    );
    expect(
      await mayUseStudent(db, world.teacher, world.studentId, "progress:read"),
    ).toBe(false);
    expect(
      (await activeTextbookStudentClasses(db, world.studentId))
        .map((row) => row.classId)
        .sort(),
    ).toEqual([world.classId, world.otherClassId].sort());
  });

  it("fails closed for branch disagreement, closed classes and withdrawn/test students", async () => {
    const otherBranch = await insertBranch(pg);
    await pg.query(
      `UPDATE "eywa_binding" SET "target_branch_id" = $2 WHERE "id" = $1`,
      [world.bindingId, otherBranch],
    );
    expect(
      await mayUseClass(db, world.teacher, world.classId, "test:read"),
    ).toBe(false);
    expect(
      await mayUseStudent(db, world.teacher, world.studentId, "progress:read"),
    ).toBe(false);
    expect(await activeTextbookStudentClasses(db, world.studentId)).toEqual([]);
    await pg.query(
      `UPDATE "eywa_binding" SET "target_branch_id" = $2 WHERE "id" = $1`,
      [world.bindingId, world.branchId],
    );
    await pg.query(
      `UPDATE "class" SET "closed_at" = '2000-01-01' WHERE "id" = $1`,
      [world.classId],
    );
    expect(
      await mayUseClass(db, world.teacher, world.classId, "test:read"),
    ).toBe(false);
    expect(
      (await activeTextbookStudentClasses(db, world.studentId)).map(
        (row) => row.classId,
      ),
    ).toEqual([world.otherClassId]);
    await pg.query(
      `UPDATE "student" SET "eywa_withdrawn_at" = $2 WHERE "id" = $1`,
      [world.studentId, sqlNow()],
    );
    expect(await activeTextbookStudentClasses(db, world.studentId)).toEqual([]);
    await pg.query(
      `UPDATE "student" SET "eywa_withdrawn_at" = NULL, "is_test" = TRUE WHERE "id" = $1`,
      [world.studentId],
    );
    expect(await activeTextbookStudentClasses(db, world.studentId)).toEqual([]);
    expect(
      await mayUseStudent(
        db,
        world.formerTeacher,
        world.studentId,
        "progress:read",
      ),
    ).toBe(false);
  });

  it("locks the managed binding before operational rows and rechecks persisted facts in the transaction", async () => {
    const statements: string[] = [];
    await db.transaction(async (tx) => {
      const observed: TextbookSql = {
        execute: tx.execute,
        query: async (text, params) => {
          statements.push(text);
          return tx.query(text, params);
        },
      };
      expect(
        await mayUseStudent(
          observed,
          world.teacher,
          world.studentId,
          "progress:write",
          { lock: true },
        ),
      ).toBe(true);
      await tx.execute(
        `UPDATE "class_membership" SET "revoked_at" = $2::timestamp WHERE "id" = $1::uuid`,
        [world.teacherMembershipId, sqlNow()],
      );
      expect(
        await mayUseStudent(
          observed,
          world.teacher,
          world.studentId,
          "progress:write",
          { lock: true },
        ),
      ).toBe(false);
    });
    const bindingLock = statements.findIndex(
      (text) =>
        text.includes('FROM "eywa_binding"') && text.includes("FOR SHARE"),
    );
    const classLock = statements.findIndex((text) =>
      text.includes("FOR SHARE OF c"),
    );
    expect(bindingLock).toBeGreaterThanOrEqual(0);
    expect(classLock).toBeGreaterThan(bindingLock);
  });
});
