// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
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
beforeEach(() => {
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

describe("verified manifest relation application", () => {
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
