// @vitest-environment node
import { NextRequest } from "next/server";
import { POST as postProgress } from "@/app/api/progress/route";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { managedRelationDb } from "../helpers/managedRelationDb";
import {
  accessibleClassesWhere,
  accessibleStudentsWhere,
  assertClassWrite,
  assertStudentEnrollment,
  classAccessAllowed,
  loadOperationalRoster,
} from "@/lib/classAccess";
import {
  requireOwnedClass,
  requireOwnedEnglishExam,
  requireOwnedStudentInClass,
  requireOwnedTest,
} from "@/lib/ownership";
import { getManagedClassGrants } from "@/lib/eywa/managedAccounts";
import { autoDraftBindingAllowed } from "@/lib/tests/autoDraftScope";
import { EYWA_SYNC_CLASSES } from "@/lib/eywa/syncScope";

const state = vi.hoisted(() => ({ db: {} as object, session: vi.fn() }));
vi.mock("@/lib/session", () => ({ getSessionUser: state.session }));
vi.mock("@/lib/db", () => ({
  db: new Proxy({}, { get: (_t, k) => Reflect.get(state.db, k) }),
}));
vi.mock("@/lib/eywa/managedAccounts", () => ({
  getManagedClassGrants: vi.fn(),
  refreshManagedBinding: vi.fn(),
}));
const now = new Date("2026-10-03T03:00:00Z");
const viewer = { id: "teacher", branchId: "old-branch", isAdmin: false };
let fixture: ReturnType<typeof managedRelationDb>;
const caps = [
  "class:read",
  "student:read",
  "test:read",
  "test:write",
  "progress:read",
  "progress:write",
  "student:account",
] as const;
function grant() {
  return {
    bindingId: "binding",
    sourceEpoch: "epoch",
    classListRevision: BigInt("1"),
    leaseExpiresAt: new Date(now.getTime() + 60000),
    sourceClasses: [
      {
        id: "source-a",
        permissionRevision: "1",
        capabilities: [...caps],
        validUntil: null,
      },
      {
        id: "source-b",
        permissionRevision: "2",
        capabilities: [...caps],
        validUntil: null,
      },
    ],
  };
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  state.session.mockResolvedValue(viewer);
  fixture = managedRelationDb();
  state.db = fixture.tx;
  for (const [id, sourceId, revision] of [
    ["a", "source-a", BigInt("1")],
    ["b", "source-b", BigInt("2")],
  ] as const) {
    fixture.tables.class.push({
      id,
      userId: "original-author",
      name: id,
      grade: "중1",
      eywaBindingId: "binding",
      branchId: "old-branch",
      eywaClassId: sourceId,
      permissionRevision: revision,
      active: true,
      closedAt: null,
    });
    fixture.tables.classMembership.push({
      id: `m-${id}`,
      bindingId: "binding",
      classId: id,
      userId: viewer.id,
      role: "homeroom",
      startsOn: null,
      endsOn: null,
      revokedAt: null,
      capabilities: [...caps],
    });
  }
  fixture.tables.student.push({
    id: "student",
    classId: "a",
    eywaBindingId: "binding",
    branchId: "old-branch",
    isTest: false,
    eywaWithdrawnAt: null,
    name: "One student",
  });
  for (const classId of ["a", "b"])
    fixture.tables.studentEnrollment.push({
      id: `e-${classId}`,
      bindingId: "binding",
      studentId: "student",
      classId,
      startsOn: new Date("2026-01-01"),
      endsOn: null,
      endedAt: null,
      onHold: false,
      isTransferred: false,
    });
  fixture.tables.test.push(
    {
      id: "operational",
      classId: "a",
      userId: "original-author",
      predictionRunId: null,
    },
    {
      id: "private",
      classId: "a",
      userId: "original-author",
      predictionRunId: "prediction",
    },
  );
  vi.mocked(getManagedClassGrants).mockResolvedValue(grant());
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("operational guards use current relationships and immutable branch context", () => {
  it.each(["owner", "manager"] as const)(
    "gives a healthy explicit managed %s access to the whole current branch",
    async (branchRole) => {
      const admin = { ...viewer, isAdmin: true, branchRole };
      vi.mocked(getManagedClassGrants).mockResolvedValue({
        ...grant(),
        sourceClasses: [],
        branchAdminScope: { branchId: viewer.branchId },
      });
      fixture.tables.classMembership.length = 0;
      fixture.tables.class.push({
        id: "colleague-local",
        userId: "colleague",
        branchId: viewer.branchId,
        eywaBindingId: null,
      });
      fixture.tables.class.push({
        id: "other-branch",
        userId: "colleague",
        branchId: "other",
        eywaBindingId: "binding",
      });
      expect(await accessibleClassesWhere(admin)).toEqual({
        branchId: viewer.branchId,
      });
      expect((await requireOwnedClass("a", admin)).ok).toBe(true);
      expect((await requireOwnedClass("colleague-local", admin)).ok).toBe(true);
      expect((await requireOwnedClass("other-branch", admin)).ok).toBe(false);
      expect(
        (await requireOwnedClass("a", { ...admin, branchId: "other" })).ok,
      ).toBe(false);
      expect((await requireOwnedStudentInClass("student", "a", admin)).ok).toBe(
        true,
      );
    },
  );
  it("never turns a stale admin session into branch scope without a current local override", async () => {
    fixture.tables.classMembership.length = 0;
    expect(
      (await requireOwnedClass("a", { ...viewer, isAdmin: true })).ok,
    ).toBe(false);
  });
  it("blocks promoted managed admins after source expiry or failure, including local classes", async () => {
    const admin = { ...viewer, isAdmin: true, branchRole: "manager" as const };
    fixture.tables.class.push({
      id: "colleague-local",
      userId: "colleague",
      branchId: viewer.branchId,
      eywaBindingId: null,
    });
    vi.mocked(getManagedClassGrants).mockResolvedValue({
      ...grant(),
      branchAdminScope: { branchId: viewer.branchId },
      leaseExpiresAt: now,
    });
    expect((await requireOwnedClass("a", admin)).ok).toBe(false);
    expect((await requireOwnedClass("colleague-local", admin)).ok).toBe(false);
    vi.mocked(getManagedClassGrants).mockRejectedValue(
      new Error("staff_inactive"),
    );
    expect((await requireOwnedClass("a", admin)).ok).toBe(false);
    expect((await requireOwnedClass("colleague-local", admin)).ok).toBe(false);
  });
  it("supports two classes for one identity and a second current teacher", async () => {
    expect((await requireOwnedStudentInClass("student", "a", viewer)).ok).toBe(
      true,
    );
    expect((await requireOwnedStudentInClass("student", "b", viewer)).ok).toBe(
      true,
    );
    const rows = await loadOperationalRoster(["a", "b"]);
    expect(rows.map((r) => [r.id, r.classId])).toEqual([
      ["student", "a"],
      ["student", "b"],
    ]);
    fixture.tables.classMembership.push({
      ...fixture.tables.classMembership[0],
      id: "m-second",
      userId: "second",
    });
    expect((await requireOwnedClass("a", { ...viewer, id: "second" })).ok).toBe(
      true,
    );
  });
  it("does not grant access to a transferred original author and keeps private prediction tests personal", async () => {
    expect(
      (
        await requireOwnedTest("operational", {
          ...viewer,
          id: "original-author",
        })
      ).ok,
    ).toBe(false);
    expect((await requireOwnedTest("private", viewer)).ok).toBe(false);
    expect(
      (await requireOwnedTest("private", { ...viewer, id: "original-author" }))
        .ok,
    ).toBe(true);
    expect(
      (await requireOwnedTest("private", { ...viewer, isSuperAdmin: true })).ok,
    ).toBe(false);
  });
  it("holds only the stale class after a source revision advances", async () => {
    const changed = grant();
    changed.sourceClasses[0].permissionRevision = "3";
    vi.mocked(getManagedClassGrants).mockResolvedValue(changed);
    expect((await requireOwnedClass("a", viewer)).ok).toBe(false);
    expect((await requireOwnedClass("b", viewer)).ok).toBe(true);
  });
  it("denies expired grants and source failure, then recovers without extending a failed lease", async () => {
    vi.mocked(getManagedClassGrants).mockResolvedValue({
      ...grant(),
      leaseExpiresAt: now,
    });
    expect(await accessibleClassesWhere(viewer)).toEqual({ id: { in: [] } });
    vi.mocked(getManagedClassGrants).mockRejectedValue(
      new Error("source_unavailable"),
    );
    expect((await requireOwnedClass("a", viewer)).ok).toBe(false);
    vi.mocked(getManagedClassGrants).mockResolvedValue(grant());
    expect((await requireOwnedClass("a", viewer)).ok).toBe(true);
  });
  it("limits delegation to explicit reads and removes it at the inclusive KST end boundary", async () => {
    Object.assign(fixture.tables.classMembership[0], {
      role: "delegate",
      endsOn: new Date("2026-10-03"),
      capabilities: ["class:read", "test:read", "student:account"],
    });
    expect((await requireOwnedTest("operational", viewer)).ok).toBe(true);
    expect(
      (await requireOwnedTest("operational", viewer, "test:write")).ok,
    ).toBe(false);
    expect(
      (
        await requireOwnedStudentInClass(
          "student",
          "a",
          viewer,
          "student:account",
        )
      ).ok,
    ).toBe(false);
    vi.setSystemTime(new Date("2026-10-03T15:00:00Z"));
    vi.mocked(getManagedClassGrants).mockResolvedValue({
      ...grant(),
      leaseExpiresAt: new Date("2026-10-04"),
    });
    expect((await requireOwnedClass("a", viewer)).ok).toBe(false);
  });
  it("rechecks a write after generation instead of trusting the earlier successful check", async () => {
    expect(
      (await requireOwnedTest("operational", viewer, "test:write")).ok,
    ).toBe(true);
    fixture.tables.classMembership[0].revokedAt = now;
    await expect(
      assertClassWrite(fixture.tx, viewer, "a", "test:write"),
    ).rejects.toThrow("반 접근 권한이 변경");
  });
  it("keeps archived records with the old branch admin and preserves nonmanaged manual and English access", async () => {
    vi.mocked(getManagedClassGrants).mockResolvedValue(null);
    fixture.tables.class[0].closedAt = now;
    fixture.tables.class[0].active = false;
    const oldAdmin = { id: "old-admin", branchId: "old-branch", isAdmin: true };
    const newAdmin = { id: "new-admin", branchId: "new-branch", isAdmin: true };
    expect((await requireOwnedClass("a", oldAdmin)).ok).toBe(true);
    expect((await requireOwnedClass("a", newAdmin)).ok).toBe(false);
    fixture.tables.class.push({
      id: "manual",
      userId: viewer.id,
      branchId: null,
      eywaBindingId: null,
    });
    expect((await requireOwnedClass("manual", viewer)).ok).toBe(true);
    fixture.tables.englishExam.push({
      id: "english",
      userId: "original-author",
      branchId: "old-branch",
    });
    expect((await requireOwnedEnglishExam(oldAdmin, "english")).ok).toBe(true);
    expect((await requireOwnedEnglishExam(newAdmin, "english")).ok).toBe(false);
    expect(
      (
        await requireOwnedEnglishExam(
          { ...newAdmin, id: "original-author" },
          "english",
        )
      ).ok,
    ).toBe(false);
  });
  it("does not close a future period early and denies a wrong branch despite a membership", async () => {
    fixture.tables.class[0].closedAt = new Date("2026-10-03T15:00:00Z");
    expect(
      await classAccessAllowed(viewer, fixture.tables.class[0] as never),
    ).toBe(true);
    expect(
      (await requireOwnedClass("a", { ...viewer, branchId: "new-branch" })).ok,
    ).toBe(false);
  });
  it("automatic jobs skip OFF, expired and newly imported classes", async () => {
    const cls = {
      eywaClassId: EYWA_SYNC_CLASSES[0].eywaClassId,
      eywaBindingId: "binding",
    };
    fixture.tables.eywaBinding.push({
      id: "binding",
      enabled: true,
      healthy: true,
      mode: "active",
      retiredAt: null,
      leaseExpiresAt: new Date(now.getTime() + 60000),
    });
    expect(await autoDraftBindingAllowed(cls)).toBe(true);
    fixture.tables.eywaBinding[0].enabled = false;
    expect(await autoDraftBindingAllowed(cls)).toBe(false);
    fixture.tables.eywaBinding[0].enabled = true;
    fixture.tables.eywaBinding[0].leaseExpiresAt = now;
    expect(await autoDraftBindingAllowed(cls)).toBe(false);
    expect(
      await autoDraftBindingAllowed({
        ...cls,
        eywaClassId: "new-source-class",
      }),
    ).toBe(false);
  });
  it("denies a delegated progress POST even if a malformed capability list includes write", async () => {
    const classId = "00000000-0000-4000-8000-000000000001";
    fixture.tables.class[0].id = classId;
    Object.assign(fixture.tables.classMembership[0], {
      classId,
      role: "delegate",
      capabilities: [...caps],
    });
    const response = await postProgress(
      new NextRequest("http://localhost/api/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          classId,
          unitId: "00000000-0000-4000-8000-000000000002",
        }),
      }),
    );
    expect(response.status).toBe(403);
    expect(fixture.tables.progress).toHaveLength(0);
  });
  it("denies withdrawn students with surviving enrollments and keeps hold roster visibility", async () => {
    fixture.tables.student[0].eywaWithdrawnAt = now;
    expect(
      (
        await requireOwnedStudentInClass(
          "student",
          "a",
          viewer,
          "student:account",
        )
      ).ok,
    ).toBe(false);
    await expect(
      assertStudentEnrollment(fixture.tx, "student", "a"),
    ).rejects.toThrow();
    expect(
      await fixture.tx.student.findMany({
        where: await accessibleStudentsWhere(viewer),
      }),
    ).toHaveLength(0);
    fixture.tables.student[0].eywaWithdrawnAt = null;
    fixture.tables.studentEnrollment.forEach((e) => {
      e.onHold = true;
    });
    expect(await loadOperationalRoster(["a"], true)).toHaveLength(1);
    expect(await loadOperationalRoster(["a"])).toHaveLength(0);
    expect(
      (
        await requireOwnedStudentInClass(
          "student",
          "a",
          viewer,
          "student:account",
        )
      ).ok,
    ).toBe(true);
  });
  it("allows moved local classes only in the current branch and with live source access", async () => {
    fixture.tables.class.push({
      id: "old-manual",
      userId: viewer.id,
      branchId: viewer.branchId,
      eywaBindingId: null,
    });
    expect((await requireOwnedClass("old-manual", viewer)).ok).toBe(true);
    const scoped = await fixture.tx.class.findMany({
      where: await accessibleClassesWhere(viewer),
    });
    expect(scoped.map((c) => c.id)).toContain("old-manual");
    fixture.tables.class.at(-1)!.branchId = "previous-branch";
    expect((await requireOwnedClass("old-manual", viewer)).ok).toBe(false);
    fixture.tables.class.at(-1)!.branchId = viewer.branchId;
    fixture.tables.class.at(-1)!.userId = "another-teacher";
    expect((await requireOwnedClass("old-manual", viewer)).ok).toBe(false);
    fixture.tables.class.at(-1)!.userId = viewer.id;
    vi.mocked(getManagedClassGrants).mockRejectedValue(
      new Error("source_unavailable"),
    );
    expect((await requireOwnedClass("old-manual", viewer)).ok).toBe(false);
  });
});
