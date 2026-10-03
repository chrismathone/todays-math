/** Disposable localhost fixture only; never reads application env files. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type {
  Control,
  SnapshotRows,
  Manifest,
} from "../../src/lib/eywa/sync-contract";

const database = "eywa_email_target_test";
const container = "eywa-email-task-30034ed377cc";
const fixtureUrl = `postgresql://postgres@127.0.0.1:55432/${database}?sslmode=disable`;
const migrationPath =
  "prisma/migrations/20261003130017_eywa_owned_roster_transfer/migration.sql";
function psql(sql: string, target = database) {
  return execFileSync(
    "docker",
    [
      "exec",
      "-i",
      container,
      "psql",
      "-X",
      "-q",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      "postgres",
      "-d",
      target,
    ],
    {
      input: sql,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
}
async function prepare() {
  const ports = JSON.parse(
    execFileSync(
      "docker",
      ["inspect", "--format", "{{json .NetworkSettings.Ports}}", container],
      { encoding: "utf8" },
    ),
  );
  assert(
    ports["5432/tcp"].some(
      (p: { HostIp: string; HostPort: string }) =>
        p.HostIp === "127.0.0.1" && p.HostPort === "55432",
    ),
  );
  if (
    !psql(
      `SELECT datname FROM pg_database WHERE datname='${database}'`,
      "postgres",
    ).includes(database)
  )
    psql(`CREATE DATABASE ${database}`, "postgres");
  const scratch = await mkdtemp(path.join(tmpdir(), "eywa-email-fixture-"));
  const schema = path.join(scratch, "schema.prisma");
  try {
    await writeFile(
      schema,
      execFileSync("git", [
        "show",
        "d65f042002eebb7ba04d6df97d9da6891c7d9171:prisma/schema.prisma",
      ]),
    );
    const baseline = execFileSync(
      process.execPath,
      [
        "node_modules/prisma/build/index.js",
        "migrate",
        "diff",
        "--from-empty",
        "--to-schema-datamodel",
        schema,
        "--script",
      ],
      { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
    );
    const migrations = await Promise.all(
      [
        "prisma/migrations/20261003085222_eywa_managed_sync/migration.sql",
        "prisma/migrations/20261003103000_eywa_auto_branch/migration.sql",
        migrationPath,
      ].map((p) => readFile(p, "utf8")),
    );
    psql(
      `DO $$ BEGIN IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF; IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF; END $$; DROP SCHEMA public CASCADE; CREATE SCHEMA public;\n${baseline}\n${migrations.join("\n")}`,
    );
  } finally {
    await unlink(schema);
    await rmdir(scratch);
  }
}
async function main() {
  process.env.DATABASE_URL = fixtureUrl;
  process.env.DIRECT_URL = fixtureUrl;
  await prepare();
  const { db } = await import("../../src/lib/db");
  const { lockBinding, applyManagedControl, reconcileManagedAccounts } =
    await import("../../src/lib/eywa/managedAccounts");
  const { applyEywaRelations } =
    await import("../../src/lib/eywa/managedRelations");
  const { COLLECTION_KINDS } = await import("../../src/lib/eywa/sync-contract");
  const oldBranch = randomUUID(),
    targetBranch = randomUUID(),
    foreignBranch = randomUUID(),
    bindingId = randomUUID(),
    epoch = randomUUID();
  let checks = 0;
  try {
    await db.branch.createMany({
      data: [
        { id: oldBranch, name: "Old fixture" },
        { id: targetBranch, name: "Target fixture" },
        { id: foreignBranch, name: "Foreign fixture" },
      ],
    });
    await db.eywaBinding.create({
      data: {
        id: bindingId,
        tenantId: randomUUID(),
        targetBranchId: targetBranch,
        mode: "active",
        sourceEpoch: epoch,
      },
    });
    const binding = await db.eywaBinding.findUniqueOrThrow({
      where: { id: bindingId },
    });
    const sources: Control["users"] = [];
    const addTeacher = async (
      name: string,
      sourceName = name,
      changes: Record<string, unknown> = {},
      email?: string,
    ) => {
      const id = randomUUID();
      const user = await db.user.create({
        data: {
          name,
          email: email ?? `${id}@example.test`,
          passwordHash: "retained-password-hash",
          branchId: oldBranch,
          branchRole: "teacher",
          approvalStatus: "approved",
          ...changes,
        },
      });
      const source = {
        id,
        email: user.email.trim().toLowerCase(),
        name: sourceName,
        status: "active",
        role: "teacher",
        subjects: ["math"],
        eligible: true,
        blockReasons: [],
        accountRevocationGeneration: "0",
        classListRevision: "1",
        classes: [],
      };
      sources.push(source);
      return { user, source };
    };
    const match = await addTeacher("Different local name", "Source teacher");
    const honorific = await addTeacher("Teacher 선생님", "Teacher");
    const oauth = await addTeacher("OAuth teacher", "Source OAuth", {
      passwordHash: null,
      branchId: null,
    });
    const branchlessClass = await db.class.create({
      data: {
        userId: oauth.user.id,
        name: "Branchless",
        grade: "중1",
        branchId: null,
        difficultyRatio: {},
      },
    });
    const branchlessStudent = await db.student.create({
      data: {
        name: "Branchless student",
        classId: branchlessClass.id,
        branchId: null,
      },
    });
    const trimmed = await addTeacher(
      "Whitespace teacher",
      "Source",
      {},
      "  Spaced@Example.test  ",
    );
    const protectedTeacher = await addTeacher("Protected", "Protected", {
      isAdmin: true,
    });
    const suspendedAt = new Date("2026-01-01");
    const suspended = await addTeacher("Suspended", "Suspended", {
      suspendedAt,
      manualSuspendedAt: suspendedAt,
    });
    const pending = await addTeacher("Pending", "Pending", {
      approvalStatus: "pending",
    });
    const foreignIdentity = await addTeacher(
      "Foreign identity",
      "Foreign identity",
      { eywaUserId: randomUUID() },
    );
    const duplicate = await addTeacher(
      "Duplicate",
      "Duplicate",
      {},
      "duplicated@example.test",
    );
    await db.user.create({
      data: {
        name: "Other duplicate",
        email: " DUPLICATED@example.test ",
        branchId: oldBranch,
        approvalStatus: "approved",
        passwordHash: "hash",
      },
    });
    const sourceDuplicate = await addTeacher("Source duplicate");
    sources.push({ ...sourceDuplicate.source, id: randomUUID() });
    const occupied = await addTeacher("Already managed");
    const foreignBinding = await db.eywaBinding.create({
      data: {
        id: randomUUID(),
        tenantId: randomUUID(),
        targetBranchId: foreignBranch,
        mode: "active",
      },
    });
    await db.user.update({
      where: { id: occupied.user.id },
      data: { branchId: foreignBranch, eywaUserId: occupied.source.id },
    });
    await db.eywaManagedAccount.create({
      data: {
        bindingId: foreignBinding.id,
        sourceUserId: occupied.source.id,
        userId: occupied.user.id,
        currentUserId: occupied.user.id,
        currentSourceUserId: occupied.source.id,
        status: "confirmed",
        sourceEmail: occupied.source.email,
        sourceName: occupied.source.name,
      },
    });
    const localClass = await db.class.create({
      data: {
        userId: match.user.id,
        name: "Local class",
        grade: "중1",
        branchId: oldBranch,
        difficultyRatio: {},
      },
    });
    const localStudent = await db.student.create({
      data: {
        name: "Local student",
        classId: localClass.id,
        branchId: oldBranch,
      },
    });
    const unit = await db.unit.create({
      data: {
        grade: "중1",
        chapter: "Fixture chapter",
        section: "Fixture section",
        orderIndex: 1,
        problemCodePrefix: "FIXTURE1",
      },
    });
    const localTest = await db.test.create({
      data: {
        userId: match.user.id,
        classId: localClass.id,
        studentId: localStudent.id,
        testType: "daily",
        rangeEndUnitId: unit.id,
        testDate: new Date("2026-10-03"),
      },
    });
    const localProgress = await db.progress.create({
      data: {
        classId: localClass.id,
        studentId: localStudent.id,
        unitId: unit.id,
        recordedAt: new Date("2026-10-03"),
      },
    });
    const english = await db.englishExam.create({
      data: {
        userId: match.user.id,
        branchId: oldBranch,
        school: "Fixture",
        grade: "중1",
        title: "Retained English",
      },
    });
    const otherClass = await db.class.create({
      data: {
        userId: pending.user.id,
        name: "Other teacher",
        grade: "중1",
        branchId: oldBranch,
        difficultyRatio: {},
      },
    });
    const managedClass = await db.class.create({
      data: {
        userId: match.user.id,
        name: "Other binding class",
        grade: "중1",
        branchId: foreignBranch,
        eywaBindingId: foreignBinding.id,
        difficultyRatio: {},
      },
    });
    const sharedClass = await db.class.create({
      data: {
        userId: match.user.id,
        name: "Shared class",
        grade: "중1",
        branchId: oldBranch,
        difficultyRatio: {},
      },
    });
    await db.classMembership.create({
      data: {
        bindingId: foreignBinding.id,
        sourceId: randomUUID(),
        classId: sharedClass.id,
        userId: pending.user.id,
        sourceUserId: randomUUID(),
        role: "homeroom",
        capabilities: [],
      },
    });
    const sharedStudentClass = await db.class.create({
      data: {
        userId: match.user.id,
        name: "Shared student class",
        grade: "중1",
        branchId: oldBranch,
        difficultyRatio: {},
      },
    });
    const sharedStudent = await db.student.create({
      data: {
        name: "Shared student",
        classId: sharedStudentClass.id,
        branchId: oldBranch,
      },
    });
    await db.studentEnrollment.create({
      data: {
        bindingId: foreignBinding.id,
        sourceId: randomUUID(),
        studentId: sharedStudent.id,
        classId: managedClass.id,
        startsOn: new Date("2026-01-01"),
      },
    });
    let control: Control = {
      schemaVersion: 2,
      bindingId,
      tenantId: binding.tenantId,
      targetBranchId: targetBranch,
      sourceEpoch: epoch,
      securityRevision: "1",
      tenantRevocationGeneration: "0",
      enabled: true,
      healthy: true,
      mode: "active",
      validatedAt: new Date().toISOString(),
      nextEffectiveAt: null,
      users: sources,
    };
    const reconcile = () =>
      db.$transaction(
        async (tx) => {
          control = { ...control, validatedAt: new Date().toISOString() };
          const current = await lockBinding(tx, bindingId);
          await applyManagedControl(tx, current, control, Date.now());
          await reconcileManagedAccounts(tx, current, control, Date.now());
        },
        { timeout: 30000 },
      );
    await reconcile();
    const after = await db.user.findUniqueOrThrow({
      where: { id: match.user.id },
    });
    assert.equal(after.branchId, targetBranch);
    assert.equal(after.name, match.user.name);
    assert.equal(after.passwordHash, match.user.passwordHash);
    assert.equal(after.authSource, match.user.authSource);
    assert.equal(after.sessionVersion, match.user.sessionVersion + 1);
    assert.equal(
      (
        await db.eywaManagedAccount.findUniqueOrThrow({
          where: { currentUserId: after.id },
        })
      ).confirmationMethod,
      "email_match",
    );
    checks++;
    for (const item of [honorific, trimmed])
      assert.equal(
        (await db.user.findUniqueOrThrow({ where: { id: item.user.id } }))
          .branchId,
        targetBranch,
      );
    checks++;
    const snapshot = {
      cls: await db.class.findUniqueOrThrow({ where: { id: localClass.id } }),
      student: await db.student.findUniqueOrThrow({
        where: { id: localStudent.id },
      }),
      test: await db.test.findUniqueOrThrow({ where: { id: localTest.id } }),
      progress: await db.progress.findUniqueOrThrow({
        where: { id: localProgress.id },
      }),
    };
    assert.equal(snapshot.cls.branchId, targetBranch);
    assert.equal(snapshot.student.branchId, targetBranch);
    assert.deepEqual(snapshot.test, localTest);
    assert.deepEqual(snapshot.progress, localProgress);
    assert.equal(snapshot.student.classId, localClass.id);
    assert.equal(snapshot.cls.eywaBindingId, null);
    checks++;
    const migratedOauth = await db.user.findUniqueOrThrow({
      where: { id: oauth.user.id },
    });
    assert.equal(migratedOauth.passwordHash, null);
    assert.equal(migratedOauth.authSource, "local");
    assert.equal(migratedOauth.branchId, targetBranch);
    assert.equal(
      (await db.class.findUniqueOrThrow({ where: { id: branchlessClass.id } }))
        .branchId,
      targetBranch,
    );
    assert.equal(
      (
        await db.student.findUniqueOrThrow({
          where: { id: branchlessStudent.id },
        })
      ).branchId,
      targetBranch,
    );
    checks++;
    assert.equal(
      (await db.englishExam.findUniqueOrThrow({ where: { id: english.id } }))
        .branchId,
      oldBranch,
    );
    for (const item of [
      otherClass,
      managedClass,
      sharedClass,
      sharedStudentClass,
    ])
      assert.equal(
        (await db.class.findUniqueOrThrow({ where: { id: item.id } })).branchId,
        item.branchId,
      );
    assert.equal(
      (await db.student.findUniqueOrThrow({ where: { id: sharedStudent.id } }))
        .branchId,
      oldBranch,
    );
    checks++;
    for (const item of [
      protectedTeacher,
      suspended,
      pending,
      foreignIdentity,
      duplicate,
      sourceDuplicate,
    ]) {
      const unchanged = await db.user.findUniqueOrThrow({
        where: { id: item.user.id },
      });
      assert.equal(unchanged.branchId, oldBranch);
      const mapping = await db.eywaManagedAccount.findFirstOrThrow({
        where: { bindingId, sourceUserId: item.source.id },
      });
      assert.equal(mapping.status, "conflict");
    }
    assert.equal(
      (
        await db.user.findUniqueOrThrow({ where: { id: suspended.user.id } })
      ).manualSuspendedAt?.toISOString(),
      suspendedAt.toISOString(),
    );
    checks++;
    assert.equal(
      (
        await db.eywaManagedAccount.findUniqueOrThrow({
          where: { currentUserId: occupied.user.id },
        })
      ).bindingId,
      foreignBinding.id,
    );
    checks++;
    const beforeCount = await db.eywaManagedAccount.count();
    await Promise.all([reconcile(), reconcile()]);
    assert.equal(await db.eywaManagedAccount.count(), beforeCount);
    assert.equal(
      (await db.user.findUniqueOrThrow({ where: { id: after.id } }))
        .sessionVersion,
      after.sessionVersion,
    );
    checks++;
    // Reapplication replaces the same restricted functions without changing data.
    psql(await readFile(migrationPath, "utf8"));
    const privileges = await db.$queryRaw<
      { browser_denied: boolean; runtime_allowed: boolean }[]
    >`
      SELECT NOT has_function_privilege('anon','eywa_transfer_owned_roster(uuid,uuid,uuid)','EXECUTE')
        AND NOT has_function_privilege('authenticated','eywa_transfer_owned_roster(uuid,uuid,uuid)','EXECUTE') AS browser_denied,
        has_function_privilege(current_user,'eywa_transfer_owned_roster(uuid,uuid,uuid)','EXECUTE') AS runtime_allowed`;
    assert.deepEqual(privileges, [
      { browser_denied: true, runtime_allowed: true },
    ]);
    checks++;
    // Timestamp columns are UTC without time zone: session zones cannot extend a lease.
    for (const zone of ["Asia/Seoul", "America/Los_Angeles"]) {
      await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT set_config('TimeZone',${zone},true)`;
        const result = await tx.$queryRaw<
          { classes: number }[]
        >`SELECT * FROM eywa_transfer_owned_roster(${after.id}::uuid,${bindingId}::uuid,${targetBranch}::uuid)`;
        assert.equal(result[0].classes, 0);
      });
      await assert.rejects(
        db.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT set_config('TimeZone',${zone},true)`;
          await tx.eywaManagedAccount.update({
            where: { currentUserId: after.id },
            data: { leaseExpiresAt: new Date(Date.now() - 1000) },
          });
          await tx.$queryRaw`SELECT * FROM eywa_transfer_owned_roster(${after.id}::uuid,${bindingId}::uuid,${oldBranch}::uuid)`;
        }),
      );
    }
    checks++;
    await assert.rejects(
      db.class.update({
        where: { id: localClass.id },
        data: { branchId: oldBranch },
      }),
    );
    await assert.rejects(
      db.student.update({
        where: { id: localStudent.id },
        data: { branchId: oldBranch },
      }),
    );
    await assert.rejects(
      db.englishExam.update({
        where: { id: english.id },
        data: { branchId: targetBranch },
      }),
    );
    checks++;
    // Guessed transfer context still cannot move another teacher's class or English.
    await assert.rejects(
      db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT set_config('eywa.roster_transfer_user',${after.id},true), set_config('eywa.roster_transfer_binding',${bindingId},true), set_config('eywa.roster_transfer_from',${oldBranch},true)`;
        await tx.class.update({
          where: { id: otherClass.id },
          data: { branchId: targetBranch },
        });
      }),
    );
    checks++;
    const sourceClasses = [randomUUID(), randomUUID()],
      sourceStudent = randomUUID();
    const rows: SnapshotRows = {
      staff: sources,
      classes: sourceClasses.map((id) => ({
        id,
        name: "Source math",
        subject: "math",
        grade: "중1",
        active: true,
        closedAt: null,
        teacherId: match.source.id,
        permissionRevision: "1",
      })),
      memberships: sourceClasses.map((id) => ({
        id: randomUUID(),
        classId: id,
        userId: match.source.id,
        role: "homeroom",
        startsOn: null,
        endsOn: null,
        revokedAt: null,
        capabilities: ["class:read"],
      })),
      students: [
        {
          id: sourceStudent,
          name: "Roster only",
          grade: "중1",
          school: null,
          status: "enrolled",
          isTest: false,
        },
      ],
      enrollments: sourceClasses.map((id) => ({
        id: randomUUID(),
        classId: id,
        studentId: sourceStudent,
        startsOn: "2026-01-01",
        endsOn: null,
        onHold: false,
        isTransferred: false,
        attendanceDays: [],
      })),
      progress: [],
    };
    const manifest: Manifest = {
      schemaVersion: 2,
      snapshotId: randomUUID(),
      bindingId,
      tenantId: binding.tenantId,
      targetBranchId: targetBranch,
      sourceEpoch: epoch,
      securityRevision: "1",
      contentGeneration: "1",
      generatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      complete: true,
      control,
      collections: Object.fromEntries(
        COLLECTION_KINDS.map((kind) => [
          kind,
          { total: rows[kind].length, pages: [] },
        ]),
      ) as unknown as Manifest["collections"],
    };
    const result = await db.$transaction(
      (tx) => applyEywaRelations(tx, manifest, rows),
      { timeout: 30000 },
    );
    assert.equal(result.classes, 2);
    assert.equal(result.students, 1);
    assert.equal(result.memberships, 2);
    assert.equal(result.enrollments, 2);
    assert.equal(result.conflicts?.length, 0);
    checks++;
    assert.equal(await db.studentAccount.count(), 0);
    checks++;
    const migrationAudit = await db.accountAuditLog.findFirstOrThrow({
      where: { userId: after.id, action: "eywa.account_migrated" },
    });
    assert.deepEqual(
      Object.fromEntries(
        Object.entries(migrationAudit.details as object).filter(([k]) =>
          ["classes", "students", "held_classes"].includes(k),
        ),
      ),
      { classes: 1, students: 1, held_classes: 2 },
    );
    checks++;
    console.log(
      `PASS ${checks} PostgreSQL email migration groups (identity, normalized ambiguity, suspension, preserved IDs/history, transfer guards, complete source roster, no student login creation)`,
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
