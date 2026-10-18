// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyEywaRelations } from "@/lib/eywa/managedRelations";
import {
  COLLECTION_KINDS,
  type Manifest,
  type SnapshotRows,
} from "@/lib/eywa/sync-contract";
import { managedRelationDb } from "../helpers/managedRelationDb";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const bindingId = id(1),
  branchId = id(2),
  tenantId = id(3),
  epoch = id(4),
  teacher = id(5),
  otherTeacher = id(6),
  classA = id(7),
  classB = id(8),
  studentA = id(9),
  studentB = id(10);
const sourceClass = (sourceId: string) => ({
  id: sourceId,
  name: "Math",
  subject: "math",
  grade: "중1",
  active: true,
  closedAt: null,
  teacherId: teacher,
  permissionRevision: "1",
});
const sourceStudent = (sourceId: string) => ({
  id: sourceId,
  name: "Same name",
  grade: "중1",
  school: null,
  status: "enrolled",
  isTest: false,
});
function snapshot(rows: SnapshotRows): Manifest {
  return {
    schemaVersion: 2,
    snapshotId: id(20),
    bindingId,
    tenantId,
    targetBranchId: branchId,
    sourceEpoch: epoch,
    securityRevision: "1",
    contentGeneration: "1",
    generatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    complete: true,
    control: {
      schemaVersion: 2,
      bindingId,
      tenantId,
      targetBranchId: branchId,
      sourceEpoch: epoch,
      securityRevision: "1",
      tenantRevocationGeneration: "0",
      enabled: true,
      healthy: true,
      mode: "active",
      validatedAt: new Date().toISOString(),
      nextEffectiveAt: null,
      users: [],
    },
    collections: Object.fromEntries(
      COLLECTION_KINDS.map((kind) => [
        kind,
        { total: rows[kind].length, pages: [] },
      ]),
    ) as unknown as Manifest["collections"],
  };
}
let fixture: ReturnType<typeof managedRelationDb>;
let rows: SnapshotRows;
const apply = () =>
  fixture.transaction((tx) => applyEywaRelations(tx, snapshot(rows), rows));
function seedProgress() {
  fixture.tables.unit.push(
    {
      id: "unit-a",
      grade: "중1",
      chapter: "7. 입체도형",
      section: "다면체",
      orderIndex: 160,
    },
    {
      id: "unit-b",
      grade: "중1",
      chapter: "7. 입체도형",
      section: "회전체",
      orderIndex: 162,
    },
  );
  rows.progress = [studentA, studentB].map((studentId, offset) => ({
    id: id(80 + offset),
    studentId,
    classId: classA,
    makeupClassId: null,
    reportDate: "2026-10-01",
    createdAt: "2026-10-01T00:00:00Z",
    progress: "수학 다면체",
  }));
}
function progressWrites() {
  return {
    create: vi.spyOn(fixture.tx.progress, "create"),
    createMany: vi.spyOn(fixture.tx.progress, "createMany"),
    update: vi.spyOn(fixture.tx.progress, "update"),
    updateMany: vi.spyOn(fixture.tx.progress, "updateMany"),
    upsert: vi.spyOn(fixture.tx.progress, "upsert"),
  };
}
function rosterWrites() {
  return [
    fixture.tx.class,
    fixture.tx.student,
    fixture.tx.classMembership,
    fixture.tx.studentEnrollment,
  ].flatMap((model) => [
    vi.spyOn(model, "create").mockClear(),
    vi.spyOn(model, "createMany").mockClear(),
    vi.spyOn(model, "update").mockClear(),
    vi.spyOn(model, "updateMany").mockClear(),
    vi.spyOn(model, "upsert").mockClear(),
  ]);
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-04T03:00:00Z"));
  fixture = managedRelationDb();
  fixture.tables.eywaBinding.push({
    id: bindingId,
    tenantId,
    targetBranchId: branchId,
    sourceEpoch: epoch,
    mode: "active",
    enabled: true,
    healthy: true,
    securityRevision: BigInt("1"),
    contentGeneration: BigInt("0"),
    archiveOwnerUserId: null,
  });
  for (const sourceUser of [teacher, otherTeacher])
    fixture.tables.eywaManagedAccount.push({
      id: sourceUser,
      bindingId,
      sourceUserId: sourceUser,
      currentSourceUserId: sourceUser,
      userId: `target-${sourceUser}`,
      currentUserId: `target-${sourceUser}`,
      status: "confirmed",
      endedAt: null,
    });
  rows = {
    staff: [],
    classes: [sourceClass(classA), sourceClass(classB)],
    students: [sourceStudent(studentA), sourceStudent(studentB)],
    memberships: [
      {
        id: `homeroom:${classA}`,
        classId: classA,
        userId: teacher,
        role: "homeroom",
        startsOn: null,
        endsOn: null,
        revokedAt: null,
        capabilities: ["class:read", "test:write"],
      },
      {
        id: `slot:${classA}:${otherTeacher}`,
        classId: classA,
        userId: otherTeacher,
        role: "slot",
        startsOn: "2026-01-01",
        endsOn: null,
        revokedAt: null,
        capabilities: ["class:read"],
      },
    ],
    enrollments: [
      {
        id: id(11),
        studentId: studentA,
        classId: classA,
        startsOn: "2026-01-01",
        endsOn: null,
        onHold: false,
        isTransferred: false,
        attendanceDays: [],
      },
      {
        id: id(12),
        studentId: studentA,
        classId: classB,
        startsOn: "2026-01-01",
        endsOn: null,
        onHold: false,
        isTransferred: false,
        attendanceDays: [],
      },
      {
        id: id(13),
        studentId: studentB,
        classId: classA,
        startsOn: "2026-01-01",
        endsOn: null,
        onHold: false,
        isTransferred: false,
        attendanceDays: [],
      },
    ],
    progress: [],
  };
});

afterEach(() => vi.useRealTimers());

describe("verified manifest relation application", () => {
  it("stores verified phone suffixes, preserves omitted values and clears explicit null", async () => {
    Object.assign(rows.students[0], { phoneLast4: "0123" });
    await apply();
    expect(fixture.tables.student[0].phoneLast4).toBe("0123");
    rows.students[0] = { ...rows.students[0] };
    delete rows.students[0].phoneLast4;
    const writes = rosterWrites();
    await apply();
    expect(fixture.tables.student[0].phoneLast4).toBe("0123");
    for (const spy of writes) expect(spy).not.toHaveBeenCalled();
    Object.assign(rows.students[0], { phoneLast4: null });
    await apply();
    expect(fixture.tables.student[0].phoneLast4).toBeNull();
  });

  it.each([
    { active: false, closedAt: null },
    { active: true, closedAt: "2026-10-03T00:00:00Z" },
  ])(
    "does not import ended classes or their students, edges and progress (%j)",
    async (state) => {
      seedProgress();
      Object.assign(rows.classes[0], state);
      rows.enrollments[0].startsOn = "2026-09-01"; // Closed class must never become the primary class.
      const result = await apply();
      expect(result.classes).toBe(1);
      expect(result.students).toBe(1);
      expect(result.memberships).toBe(0);
      expect(result.enrollments).toBe(1);
      expect(result.progress).toBe(0);
      expect(result.unresolvedProgress).toBe(0);
      expect(fixture.tables.class.map((row) => row.eywaClassId)).toEqual([
        classB,
      ]);
      expect(fixture.tables.student.map((row) => row.eywaStudentId)).toEqual([
        studentA,
      ]);
      expect(fixture.tables.student[0].classId).toBe(
        fixture.tables.class[0].id,
      );
      expect(fixture.tables.classMembership).toHaveLength(0);
      expect(fixture.tables.studentEnrollment).toHaveLength(1);
      expect(fixture.tables.progress).toHaveLength(0);
      expect(fixture.tables.user).toHaveLength(0);
    },
  );

  it.each([
    { active: false, closedAt: null },
    { active: true, closedAt: "2026-10-03T00:00:00Z" },
  ])(
    "deactivates an ended class and revokes its edges once while preserving its history (%j)",
    async (state) => {
      seedProgress();
      await apply();
      const oldClass = structuredClone(fixture.tables.class[0]);
      const progress = structuredClone(fixture.tables.progress);
      const studentIds = fixture.tables.student.map((row) => row.id);
      Object.assign(rows.classes[0], state, {
        name: "Do not import closed updates",
      });
      rows.students[1].name = "Do not import closed student";
      rows.progress = []; // Closed history must survive missing reports in later snapshots.
      await apply();
      expect(fixture.tables.class[0]).toMatchObject({
        id: oldClass.id,
        name: oldClass.name,
        active: false,
        closedAt: new Date(state.closedAt ?? "2026-10-04T03:00:00Z"),
      });
      expect(fixture.tables.student.map((row) => row.id)).toEqual(studentIds);
      expect(fixture.tables.student[1].name).toBe("Same name");
      expect(fixture.tables.student[1].eywaWithdrawnAt).toBeInstanceOf(Date);
      expect(fixture.tables.student[0].classId).toBe(
        fixture.tables.class[1].id,
      );
      expect(
        fixture.tables.classMembership.every(
          (row) => row.revokedAt instanceof Date,
        ),
      ).toBe(true);
      expect(
        fixture.tables.studentEnrollment
          .filter((row) => row.classId === oldClass.id)
          .every((row) => row.endedAt instanceof Date),
      ).toBe(true);
      expect(
        fixture.tables.studentEnrollment.find(
          (row) => row.classId !== oldClass.id,
        )?.endedAt,
      ).toBeNull();
      expect(fixture.tables.progress).toEqual(progress);
      const before = structuredClone(fixture.tables);
      const writes = [...rosterWrites(), ...Object.values(progressWrites())];
      await apply();
      expect(fixture.tables).toEqual(before);
      for (const spy of writes) expect(spy).not.toHaveBeenCalled();
    },
  );

  it("preserves progress when a closed class disappears from the complete source snapshot", async () => {
    seedProgress();
    await apply();
    const progress = structuredClone(fixture.tables.progress);
    rows.classes = [rows.classes[1]];
    rows.memberships = [];
    rows.enrollments = [rows.enrollments[1]];
    rows.progress = [];
    await apply();
    expect(fixture.tables.class[0].active).toBe(false);
    expect(fixture.tables.progress).toEqual(progress);
  });

  it("holds existing student status when an operational source class has an identity conflict", async () => {
    await apply();
    fixture.tables.class[0].branchId = "conflicting-branch";
    const student = structuredClone(fixture.tables.student[1]);
    const result = await apply();
    expect(result.conflicts).toContainEqual({
      entity: "class",
      sourceId: classA,
      code: "class_branch_conflict",
    });
    expect(fixture.tables.student[1]).toEqual(student);
  });

  it("reopens the same class and relation identities only after the source becomes active again", async () => {
    seedProgress();
    await apply();
    const original = structuredClone(fixture.tables);
    rows.classes[0].active = false;
    await apply();
    rows.classes[0].active = true;
    await apply();
    expect(fixture.tables).toEqual(original);
  });

  it("keeps a future scheduled closure operational until its effective time", async () => {
    rows.classes[0].closedAt = "2026-10-05T00:00:00Z";
    await apply();
    expect(fixture.tables.class[0].active).toBe(true);
    expect(fixture.tables.classMembership).toHaveLength(2);
    expect(fixture.tables.studentEnrollment).toHaveLength(3);
    vi.setSystemTime(new Date("2026-10-05T00:00:00Z"));
    await apply();
    expect(fixture.tables.class[0].active).toBe(false);
    expect(
      fixture.tables.classMembership.every(
        (row) => row.revokedAt instanceof Date,
      ),
    ).toBe(true);
  });

  it("bulk-reads the roster and performs zero relationship or progress writes on an identical full snapshot", async () => {
    seedProgress();
    await apply();
    const before = structuredClone(fixture.tables);
    rows = structuredClone(rows); // Fresh arrays and parsed Date values still compare by value.
    const roster = rosterWrites();
    const progress = progressWrites();
    const classLookup = vi.spyOn(fixture.tx.class, "findUnique");
    const studentLookup = vi.spyOn(fixture.tx.student, "findUnique");
    const reads = [
      fixture.tx.class,
      fixture.tx.student,
      fixture.tx.classMembership,
      fixture.tx.studentEnrollment,
    ].map((model) => vi.spyOn(model, "findMany"));
    const progressRead = vi.spyOn(fixture.tx.progress, "findMany");
    await apply();
    expect(fixture.tables).toEqual(before);
    for (const spy of [...roster, ...Object.values(progress)])
      expect(spy).not.toHaveBeenCalled();
    for (const read of reads) expect(read).toHaveBeenCalledTimes(1);
    expect(classLookup).not.toHaveBeenCalled();
    expect(studentLookup).not.toHaveBeenCalled();
    expect(progressRead).toHaveBeenCalledTimes(1 + rows.classes.length);
  });

  it("applies only changed source-owned roster fields with exact date, bigint and array values", async () => {
    rows.enrollments[0].attendanceDays = ["월", "수"];
    await apply();
    const originalClass = structuredClone(fixture.tables.class[0]);
    const originalStudent = structuredClone(fixture.tables.student[0]);
    const originalMembership = structuredClone(
      fixture.tables.classMembership[0],
    );
    const originalEnrollment = structuredClone(
      fixture.tables.studentEnrollment[0],
    );
    fixture.tables.student[0].localNotes = "retained local field";
    rows.classes[0].name = "Corrected class";
    rows.classes[0].permissionRevision = "9007199254740993";
    rows.students[0].name = "Corrected student";
    rows.students[0].school = "New school";
    rows.students[0].grade = "고2";
    rows.students[0].status = "withdrawn";
    rows.memberships[0].endsOn = "2026-10-04";
    rows.memberships[0].revokedAt = "2026-10-02T12:34:56.017Z";
    rows.memberships[0].capabilities = ["test:write", "class:read"];
    rows.enrollments[0].endsOn = "2026-10-04";
    rows.enrollments[0].onHold = true;
    rows.enrollments[0].attendanceDays = ["월", "목"];
    const classWrite = vi.spyOn(fixture.tx.class, "upsert");
    const studentWrite = vi.spyOn(fixture.tx.student, "upsert");
    const membershipWrite = vi.spyOn(fixture.tx.classMembership, "update");
    const enrollmentWrite = vi.spyOn(fixture.tx.studentEnrollment, "update");
    await apply();
    expect(classWrite).toHaveBeenCalledTimes(1);
    expect(studentWrite).toHaveBeenCalledTimes(1);
    expect(membershipWrite).toHaveBeenCalledTimes(1);
    expect(enrollmentWrite).toHaveBeenCalledTimes(1);
    expect(fixture.tables.class[0]).toMatchObject({
      id: originalClass.id,
      userId: originalClass.userId,
      name: "Corrected class",
      permissionRevision: BigInt("9007199254740993"),
      closedAt: null,
    });
    expect(fixture.tables.student[0]).toMatchObject({
      id: originalStudent.id,
      schoolLevel: "고",
      schoolGrade: 2,
      schoolName: "New school",
      localNotes: "retained local field",
    });
    expect(fixture.tables.student[0].eywaWithdrawnAt).toBeInstanceOf(Date);
    expect(fixture.tables.classMembership[0]).toMatchObject({
      id: originalMembership.id,
      capabilities: ["test:write", "class:read"],
      endsOn: new Date("2026-10-04T00:00:00Z"),
      revokedAt: new Date("2026-10-02T12:34:56.017Z"),
    });
    expect(fixture.tables.studentEnrollment[0]).toMatchObject({
      id: originalEnrollment.id,
      attendanceDays: ["월", "목"],
      onHold: true,
      endsOn: new Date("2026-10-04T00:00:00Z"),
    });
    const corrected = structuredClone(fixture.tables);
    const writes = rosterWrites();
    await apply();
    expect(fixture.tables).toEqual(corrected);
    for (const spy of writes) expect(spy).not.toHaveBeenCalled();
  });

  it("retains enrollment report metadata without a write when the present report loses class attribution", async () => {
    seedProgress();
    await apply();
    const metadata = structuredClone(fixture.tables.studentEnrollment);
    rows.progress[0].classId = null;
    const writes = rosterWrites();
    await apply();
    expect(fixture.tables.studentEnrollment).toEqual(metadata);
    for (const spy of writes) expect(spy).not.toHaveBeenCalled();
  });

  it("batches new memberships and enrollments, retires them once and revives the same IDs", async () => {
    rows.memberships = Array.from({ length: 501 }, (_, offset) => ({
      ...rows.memberships[0],
      id: `membership-${offset}`,
    }));
    rows.enrollments = Array.from({ length: 501 }, (_, offset) => ({
      ...rows.enrollments[0],
      id: id(1000 + offset),
    }));
    rows.students = [rows.students[0]];
    const membershipCreate = vi.spyOn(fixture.tx.classMembership, "createMany");
    const enrollmentCreate = vi.spyOn(
      fixture.tx.studentEnrollment,
      "createMany",
    );
    await apply();
    expect(
      membershipCreate.mock.calls.map(
        ([args]) => (args!.data as unknown[]).length,
      ),
    ).toEqual([500, 1]);
    expect(
      enrollmentCreate.mock.calls.map(
        ([args]) => (args!.data as unknown[]).length,
      ),
    ).toEqual([500, 1]);
    const membershipIds = fixture.tables.classMembership.map((row) => row.id);
    const enrollmentIds = fixture.tables.studentEnrollment.map((row) => row.id);
    const memberships = rows.memberships;
    const enrollments = rows.enrollments;
    rows.memberships = [];
    rows.enrollments = [];
    await apply();
    expect(
      fixture.tables.classMembership.every(
        (row) => row.revokedAt instanceof Date,
      ),
    ).toBe(true);
    expect(
      fixture.tables.studentEnrollment.every(
        (row) => row.endedAt instanceof Date,
      ),
    ).toBe(true);
    const retired = structuredClone(fixture.tables);
    const writes = rosterWrites();
    await apply();
    expect(fixture.tables).toEqual(retired);
    for (const spy of writes) expect(spy).not.toHaveBeenCalled();
    rows.memberships = memberships;
    rows.enrollments = enrollments;
    await apply();
    expect(fixture.tables.classMembership.map((row) => row.id)).toEqual(
      membershipIds,
    );
    expect(fixture.tables.studentEnrollment.map((row) => row.id)).toEqual(
      enrollmentIds,
    );
    expect(
      fixture.tables.classMembership.every((row) => row.revokedAt === null),
    ).toBe(true);
    expect(
      fixture.tables.studentEnrollment.every((row) => row.endedAt === null),
    ).toBe(true);
    expect(membershipCreate).not.toHaveBeenCalled();
    expect(enrollmentCreate).not.toHaveBeenCalled();
  });

  it("keeps foreign class UUID collisions held during the bulk roster read", async () => {
    fixture.tables.class.push({
      id: "foreign-class",
      eywaClassId: classA,
      eywaBindingId: "foreign-binding",
      branchId: "foreign-branch",
      userId: "foreign-owner",
      name: "Original class",
      active: true,
    });
    const before = structuredClone(fixture.tables.class[0]);
    const result = await apply();
    expect(result.conflicts).toContainEqual({
      entity: "class",
      sourceId: classA,
      code: "class_branch_conflict",
    });
    expect(fixture.tables.class[0]).toEqual(before);
    expect(fixture.tables.classMembership).toHaveLength(0);
    expect(fixture.tables.studentEnrollment).toHaveLength(1);
  });

  it("preserves nullable source-ID retirement behavior for an empty complete roster", async () => {
    await apply();
    fixture.tables.class.push({
      id: "owned-null-class",
      eywaBindingId: bindingId,
      eywaClassId: null,
      active: true,
      closedAt: null,
    });
    fixture.tables.student.push({
      id: "owned-null-student",
      eywaBindingId: bindingId,
      eywaStudentId: null,
      eywaWithdrawnAt: null,
    });
    await apply();
    expect(
      fixture.tables.class.find((row) => row.id === "owned-null-class")!.active,
    ).toBe(true);
    expect(
      fixture.tables.student.find((row) => row.id === "owned-null-student")!
        .eywaWithdrawnAt,
    ).toBeNull();
    rows.classes = [];
    rows.students = [];
    rows.memberships = [];
    rows.enrollments = [];
    await apply();
    expect(
      fixture.tables.class.find((row) => row.id === "owned-null-class")!
        .closedAt,
    ).toBeInstanceOf(Date);
    expect(
      fixture.tables.student.find((row) => row.id === "owned-null-student")!
        .eywaWithdrawnAt,
    ).toBeInstanceOf(Date);
  });

  it("performs zero progress writes on an identical second full snapshot, including derived rows", async () => {
    seedProgress();
    const first = await apply();
    const before = structuredClone(fixture.tables.progress);
    const writes = progressWrites();
    const second = await apply();
    expect(first.progress).toBe(2);
    expect(first.derivedProgress).toBe(1);
    expect(second.progress).toBe(first.progress);
    expect(second.derivedProgress).toBe(first.derivedProgress);
    expect(fixture.tables.progress).toEqual(before);
    for (const spy of Object.values(writes)) expect(spy).not.toHaveBeenCalled();
  });

  it("updates corrected report dates and source milliseconds in place, including the derived row", async () => {
    seedProgress();
    await apply();
    const before = structuredClone(fixture.tables.progress);
    const writes = progressWrites();
    rows.progress[0].reportDate = "2026-10-02";
    rows.progress[0].createdAt = "2026-10-03T01:02:03.017Z";
    await apply();
    expect(fixture.tables.progress.map((row) => row.id)).toEqual(
      before.map((row) => row.id),
    );
    for (const row of fixture.tables.progress)
      if (row.eywaReportId === rows.progress[0].id || row.studentId === null) {
        expect(row.recordedAt).toEqual(new Date("2026-10-02T00:00:00Z"));
        expect(row.createdAt).toEqual(new Date("2026-10-03T01:02:03.017Z"));
        expect(row.retiredAt).toBeNull();
      } else expect(row).toEqual(before.find((old) => old.id === row.id));
    expect(writes.update).toHaveBeenCalledTimes(2);
    expect(writes.updateMany).not.toHaveBeenCalled();
    expect(writes.createMany).not.toHaveBeenCalled();
    expect(writes.upsert).not.toHaveBeenCalled();
  });

  it("retires only removed report units and revives both student and derived history with the same IDs", async () => {
    seedProgress();
    for (const report of rows.progress)
      report.progress = "수학 다면체\n수학 회전체";
    await apply();
    const before = structuredClone(fixture.tables.progress);
    expect(before).toHaveLength(5);
    const writes = progressWrites();
    for (const report of rows.progress) report.progress = "수학 다면체";
    await apply();
    const retired = fixture.tables.progress.filter(
      (row) => row.unitId === "unit-b",
    );
    expect(retired).toHaveLength(3);
    expect(retired.every((row) => row.retiredAt instanceof Date)).toBe(true);
    for (const old of before.filter((row) => row.unitId === "unit-a"))
      expect(fixture.tables.progress.find((row) => row.id === old.id)).toEqual(
        old,
      );
    expect(writes.update).not.toHaveBeenCalled();
    expect(writes.updateMany).toHaveBeenCalledTimes(2);
    expect(writes.createMany).toHaveBeenCalledTimes(1); // New derived unit-a only.

    for (const spy of Object.values(writes)) spy.mockClear();
    for (const report of rows.progress)
      report.progress = "수학 다면체\n수학 회전체";
    await apply();
    for (const old of before)
      expect(fixture.tables.progress.find((row) => row.id === old.id)).toEqual(
        old,
      );
    expect(fixture.tables.progress).toHaveLength(6); // Retain the retired derived unit-a.
    expect(writes.update).toHaveBeenCalledTimes(3);
    expect(writes.createMany).not.toHaveBeenCalled();
    expect(writes.updateMany).toHaveBeenCalledTimes(1);
    for (const old of before.filter((row) => row.unitId === "unit-b"))
      expect(old.createdAt.getTime()).toBe(
        new Date(rows.progress[0].createdAt).getTime() + 1,
      );
  });

  it("retires absent reports once and revives their original student and derived IDs when they return", async () => {
    seedProgress();
    await apply();
    const before = structuredClone(fixture.tables.progress);
    const removedReport = rows.progress.pop()!;
    await apply();
    const retired = structuredClone(fixture.tables.progress);
    expect(retired.filter((row) => row.retiredAt !== null)).toHaveLength(2);
    expect(
      retired.find((row) => row.eywaReportId === rows.progress[0].id),
    ).toEqual(before.find((row) => row.eywaReportId === rows.progress[0].id));
    const writes = progressWrites();
    await apply();
    expect(fixture.tables.progress).toEqual(retired);
    for (const spy of Object.values(writes)) expect(spy).not.toHaveBeenCalled();
    rows.progress.push(removedReport);
    await apply();
    expect(fixture.tables.progress).toEqual(before);
    expect(writes.update).toHaveBeenCalledTimes(2);
    expect(writes.createMany).not.toHaveBeenCalled();
  });

  it.each(["unresolved curriculum", "null class", "outside enrollment"])(
    "holds existing student and derived history without writes for %s",
    async (reason) => {
      seedProgress();
      await apply();
      if (reason === "unresolved curriculum") {
        rows.progress[0].reportDate = "2026-10-02";
        rows.progress.push({
          ...rows.progress[0],
          id: id(90),
          progress: "unknown curriculum",
        });
      } else if (reason === "null class") rows.progress[0].classId = null;
      else rows.progress[0].reportDate = "2025-12-31";
      const before = structuredClone(fixture.tables.progress);
      const writes = progressWrites();
      const result = await apply();
      expect(result.unresolvedProgress).toBeGreaterThan(0);
      expect(fixture.tables.progress).toEqual(before);
      for (const spy of Object.values(writes))
        expect(spy).not.toHaveBeenCalled();
    },
  );

  it.each(["binding", "class", "student"])(
    "holds the entire report group and derived rows on a retired conflicting %s identity",
    async (conflict) => {
      seedProgress();
      await apply();
      const targetClass = fixture.tables.class.find(
        (row) => row.eywaClassId === classA,
      )!.id;
      const targetStudent = fixture.tables.student.find(
        (row) => row.eywaStudentId === studentA,
      )!.id;
      fixture.tables.class.push({
        id: "foreign-class",
        eywaBindingId: "foreign-binding",
      });
      fixture.tables.progress.push({
        id: "conflicting-progress",
        eywaReportId: rows.progress[0].id,
        unitId: "unit-b",
        classId:
          conflict === "binding"
            ? "foreign-class"
            : conflict === "class"
              ? fixture.tables.class.find((row) => row.eywaClassId === classB)!
                  .id
              : targetClass,
        studentId: conflict === "student" ? "other-student" : targetStudent,
        recordedAt: new Date("2026-10-01T00:00:00Z"),
        createdAt: new Date("2026-10-01T00:00:00Z"),
        retiredAt: new Date("2026-10-02T00:00:00Z"),
      });
      rows.progress[0].progress = "수학 회전체";
      const before = structuredClone(fixture.tables.progress);
      const writes = progressWrites();
      const result = await apply();
      expect(result.conflicts).toContainEqual({
        entity: "progress",
        sourceId: rows.progress[0].id,
        code: "progress_identity_conflict",
      });
      expect(fixture.tables.progress).toEqual(before);
      for (const spy of Object.values(writes))
        expect(spy).not.toHaveBeenCalled();
    },
  );

  it("leaves derived markers untouched on a conflicting class identity", async () => {
    seedProgress();
    await apply();
    fixture.tables.class.push({
      id: "foreign-class",
      eywaBindingId: "foreign-binding",
    });
    fixture.tables.progress.push({
      id: "conflicting-derived-progress",
      eywaReportId: classA,
      unitId: "unit-b",
      classId: "foreign-class",
      studentId: null,
      recordedAt: new Date("2026-10-01T00:00:00Z"),
      createdAt: new Date("2026-10-01T00:00:00Z"),
      retiredAt: null,
    });
    const before = structuredClone(fixture.tables.progress);
    const writes = progressWrites();
    const result = await apply();
    expect(result.conflicts).toContainEqual({
      entity: "progress",
      sourceId: classA,
      code: "derived_progress_identity_conflict",
    });
    expect(fixture.tables.progress).toEqual(before);
    for (const spy of Object.values(writes)) expect(spy).not.toHaveBeenCalled();
  });

  it("batches 1,001 new and absent report identities and writes nothing on an unchanged reapply", async () => {
    seedProgress();
    rows.students = [rows.students[0]];
    rows.enrollments = [rows.enrollments[0]];
    rows.progress = Array.from({ length: 1001 }, (_, offset) => ({
      ...rows.progress[0],
      id: id(1000 + offset),
    }));
    const writes = progressWrites();
    const result = await apply();
    expect(result.progress).toBe(1001);
    expect(result.derivedProgress).toBe(1);
    expect(
      writes.createMany.mock.calls.map(
        ([args]) => (args!.data as unknown[]).length,
      ),
    ).toEqual([500, 500, 1, 1]);
    expect(writes.upsert).not.toHaveBeenCalled();
    expect(writes.update).not.toHaveBeenCalled();
    const before = structuredClone(fixture.tables.progress);
    for (const spy of Object.values(writes)) spy.mockClear();
    await apply();
    expect(fixture.tables.progress).toEqual(before);
    for (const spy of Object.values(writes)) expect(spy).not.toHaveBeenCalled();
    rows.progress = [];
    await apply();
    expect(
      writes.updateMany.mock.calls.map(
        ([args]) => (args!.where!.id as { in: string[] }).in.length,
      ),
    ).toEqual([500, 500, 1, 1]);
    expect(
      fixture.tables.progress.every((row) => row.retiredAt instanceof Date),
    ).toBe(true);
    const retired = structuredClone(fixture.tables.progress);
    for (const spy of Object.values(writes)) spy.mockClear();
    await apply();
    expect(fixture.tables.progress).toEqual(retired);
    for (const spy of Object.values(writes)) expect(spy).not.toHaveBeenCalled();
  });

  it("rolls back earlier progress batches and all relationship writes if a later batch fails", async () => {
    seedProgress();
    rows.progress = Array.from({ length: 501 }, (_, offset) => ({
      ...rows.progress[0],
      id: id(1000 + offset),
    }));
    const before = structuredClone(fixture.tables);
    const createMany = fixture.tx.progress.createMany.bind(fixture.tx.progress);
    const write = vi
      .spyOn(fixture.tx.progress, "createMany")
      .mockImplementationOnce(createMany)
      .mockRejectedValueOnce(new Error("later batch failed"));
    await expect(apply()).rejects.toThrow("later batch failed");
    expect(write).toHaveBeenCalledTimes(2);
    expect(fixture.tables).toEqual(before);
  });

  it("preserves one identity for a multi-class student and multiple teachers, with idempotent repeated snapshots", async () => {
    await apply();
    const identities = fixture.tables.student.map((s) => s.id);
    const relations = fixture.tables.studentEnrollment.map((e) => e.id);
    await apply();
    expect(fixture.tables.student.map((s) => s.id)).toEqual(identities);
    expect(fixture.tables.studentEnrollment.map((e) => e.id)).toEqual(
      relations,
    );
    expect(
      fixture.tables.studentEnrollment.filter(
        (e) => e.studentId === identities[0],
      ),
    ).toHaveLength(2);
    expect(fixture.tables.classMembership).toHaveLength(2);
    expect(fixture.tables.student).toHaveLength(2); // Equal names never merge identities.
  });
  it("revokes missing relationships only after completeness and retains classes, students and historical IDs", async () => {
    await apply();
    const old = fixture.tables.student[0].id;
    const incomplete = snapshot(rows);
    incomplete.collections.memberships.total++;
    await expect(
      fixture.transaction((tx) => applyEywaRelations(tx, incomplete, rows)),
    ).rejects.toThrow("incomplete_relation_snapshot");
    expect(
      fixture.tables.classMembership.every((m) => m.revokedAt === null),
    ).toBe(true);
    rows.memberships = [];
    rows.enrollments = [];
    rows.classes = [];
    rows.students = [];
    await apply();
    expect(
      fixture.tables.classMembership.every((m) => m.revokedAt instanceof Date),
    ).toBe(true);
    expect(
      fixture.tables.studentEnrollment.every((e) => e.endedAt instanceof Date),
    ).toBe(true);
    expect(fixture.tables.class.every((c) => c.active === false)).toBe(true);
    expect(fixture.tables.student[0].id).toBe(old);
  });
  it("does not import a new class without a linked teacher and records no conflict (원장님 2026-10-18)", async () => {
    rows.classes[1].teacherId = null;
    const unlinked = await apply();
    expect(
      fixture.tables.class.some((row) => row.eywaClassId === classB),
    ).toBe(false);
    expect(unlinked.conflicts).toEqual([]);
    rows.classes[1].teacherId = id(77);
    await apply();
    expect(
      fixture.tables.class.some((row) => row.eywaClassId === classB),
    ).toBe(false);
    rows.classes[1].teacherId = otherTeacher;
    await apply();
    expect(
      fixture.tables.class.find((row) => row.eywaClassId === classB)?.userId,
    ).toBe(`target-${otherTeacher}`);
  });
  it("keeps an imported class when its source teacher is cleared", async () => {
    await apply();
    rows.classes[0].teacherId = null;
    await apply();
    expect(
      fixture.tables.class.find((row) => row.eywaClassId === classA)?.active,
    ).toBe(true);
  });
  it("applies a real handover without changing original author, while a pending candidate receives no membership", async () => {
    await apply();
    const creator = fixture.tables.class[0].userId;
    rows.classes[0].teacherId = otherTeacher;
    rows.memberships = [{ ...rows.memberships[0], userId: otherTeacher }];
    await apply();
    expect(fixture.tables.class[0].userId).toBe(creator);
    expect(
      fixture.tables.classMembership.find(
        (m) => m.sourceId === `homeroom:${classA}`,
      )?.sourceUserId,
    ).toBe(otherTeacher);
    fixture.tables.eywaManagedAccount.find(
      (a) => a.sourceUserId === otherTeacher,
    )!.status = "candidate";
    await apply();
    expect(
      fixture.tables.classMembership.every((m) => m.revokedAt instanceof Date),
    ).toBe(true);
  });
  it("does not infer a scheduled handover that the source has not applied", async () => {
    await apply();
    await apply();
    expect(
      fixture.tables.classMembership.find((m) => m.role === "homeroom")
        ?.sourceUserId,
    ).toBe(teacher);
  });
  it("holds a cross-branch collision while a valid same-name student converges", async () => {
    fixture.tables.student.push({
      id: "foreign-student",
      eywaStudentId: studentA,
      branchId: "other-branch",
      eywaBindingId: "other-binding",
      classId: "foreign-class",
      name: "Original",
    });
    const result = await apply();
    expect(result.conflicts).toEqual([
      {
        entity: "student",
        sourceId: studentA,
        code: "student_branch_conflict",
      },
    ]);
    expect(
      fixture.tables.student.find((s) => s.id === "foreign-student")?.name,
    ).toBe("Original");
    expect(
      fixture.tables.student.find((s) => s.eywaStudentId === studentB)
        ?.eywaBindingId,
    ).toBe(bindingId);
    expect(fixture.tables.studentEnrollment).toHaveLength(1);
  });
  it("preserves effective imported progress for an ambiguous null-class report and never touches other bindings", async () => {
    await apply();
    const localStudent = fixture.tables.student[0].id,
      localClass = fixture.tables.class[0].id;
    fixture.tables.class.push({
      id: "foreign-class",
      eywaBindingId: "foreign",
    });
    fixture.tables.progress.push(
      {
        id: "old-progress",
        classId: localClass,
        studentId: localStudent,
        unitId: "u",
        eywaReportId: id(99),
        retiredAt: null,
      },
      {
        id: "foreign-progress",
        classId: "foreign-class",
        eywaReportId: id(98),
        retiredAt: null,
      },
    );
    rows.progress = [
      {
        id: id(99),
        studentId: studentA,
        classId: null,
        makeupClassId: null,
        reportDate: "2026-10-01",
        createdAt: "2026-10-01T00:00:00Z",
        progress: "ambiguous",
      },
    ];
    const result = await apply();
    expect(result.unresolvedProgress).toBe(1);
    expect(fixture.tables.progress.every((p) => p.retiredAt === null)).toBe(
      true,
    );
  });
  it("retains absent reports as retired rows and leaves manual progress untouched", async () => {
    await apply();
    fixture.tables.progress.push(
      {
        id: "imported",
        classId: fixture.tables.class[0].id,
        studentId: fixture.tables.student[0].id,
        eywaReportId: id(99),
        retiredAt: null,
      },
      {
        id: "manual",
        classId: fixture.tables.class[0].id,
        eywaReportId: null,
        retiredAt: null,
      },
    );
    await apply();
    expect(fixture.tables.progress[0].retiredAt).toBeInstanceOf(Date);
    expect(fixture.tables.progress[1].retiredAt).toBeNull();
  });
  it("does no relationship writes for OFF or shadow and rejects a stale or wrong-binding snapshot", async () => {
    fixture.tables.eywaBinding[0].enabled = false;
    expect((await apply()).applied).toBe(false);
    expect(fixture.tables.class).toHaveLength(0);
    fixture.tables.eywaBinding[0].enabled = true;
    fixture.tables.eywaBinding[0].securityRevision = BigInt("2");
    await expect(apply()).rejects.toThrow("stale_relation_snapshot");
    fixture.tables.eywaBinding[0].sourceEpoch = id(100);
    await expect(apply()).rejects.toThrow("relation_binding_mismatch");
  });
  it("keeps per-enrollment report metadata and derives only a fully converged class roster", async () => {
    fixture.tables.unit.push(
      {
        id: "unit-a",
        grade: "중1",
        chapter: "7. 입체도형",
        section: "다면체",
        orderIndex: 160,
      },
      {
        id: "unit-b",
        grade: "중1",
        chapter: "7. 입체도형",
        section: "회전체",
        orderIndex: 162,
      },
    );
    rows.progress = [
      {
        id: id(80),
        studentId: studentA,
        classId: classA,
        makeupClassId: null,
        reportDate: "2026-10-01",
        createdAt: "2026-10-01T00:00:00Z",
        progress: "수학 다면체",
      },
      {
        id: id(81),
        studentId: studentB,
        classId: classA,
        makeupClassId: null,
        reportDate: "2026-10-01",
        createdAt: "2026-10-01T00:00:00Z",
        progress: "수학 다면체",
      },
      {
        id: id(82),
        studentId: studentA,
        classId: classB,
        makeupClassId: null,
        reportDate: "2026-10-02",
        createdAt: "2026-10-02T00:00:00Z",
        progress: "내신대비",
      },
    ];
    const result = await apply();
    expect(result.derivedProgress).toBe(1);
    const a = fixture.tables.class.find((c) => c.eywaClassId === classA)!.id;
    const b = fixture.tables.class.find((c) => c.eywaClassId === classB)!.id;
    expect(
      fixture.tables.studentEnrollment.find((e) => e.classId === a)
        ?.eywaLastReportText,
    ).toBe("수학 다면체");
    expect(
      fixture.tables.studentEnrollment.find((e) => e.classId === b)
        ?.eywaLastReportText,
    ).toBe("내신대비");
    const derived = fixture.tables.progress.find((p) => p.studentId === null)!;
    expect(derived.eywaReportId).toBe(classA);
    const stableId = derived.id;
    await apply();
    expect(fixture.tables.progress.find((p) => p.studentId === null)?.id).toBe(
      stableId,
    );
    rows.progress[1].progress = "수학 회전체";
    await apply();
    expect(
      fixture.tables.progress.find((p) => p.id === stableId)?.retiredAt,
    ).toBeInstanceOf(Date);
  });
});
