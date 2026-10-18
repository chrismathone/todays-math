// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { managedRelationDb } from "../helpers/managedRelationDb";
import { activeStudentClassIds } from "@/lib/classAccess";
import {
  getEywaStudentStatus,
  studentAccountSummary,
} from "@/lib/eywa/managedStudentStatus";
import { refreshManagedBinding } from "@/lib/eywa/managedAccounts";
import {
  assertLegacyTransportAllowed,
  assertLegacyWriterAllowed,
} from "@/lib/eywa/legacyFence";

const state = vi.hoisted(() => ({ db: {} as object }));
vi.mock("@/lib/db", () => ({
  db: new Proxy({}, { get: (_target, key) => Reflect.get(state.db, key) }),
}));
const access = vi.hoisted(() => ({ allowed: true }));
vi.mock("@/lib/eywa/managedStudentAccess", () => ({
  managedStudentAccess: vi.fn(async () => ({
    allowed: access.allowed,
    stamp: null,
  })),
}));
vi.mock("@/lib/eywa/managedAccounts", () => ({
  refreshManagedBinding: vi.fn(),
  getManagedClassGrants: vi.fn(),
}));
const now = new Date("2026-10-03T03:00:00Z");
let fixture: ReturnType<typeof managedRelationDb>;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.resetAllMocks();
  fixture = managedRelationDb();
  state.db = fixture.tx;
  fixture.tables.eywaBinding.push({
    id: "binding",
    targetBranchId: "branch",
    tenantId: "tenant",
    mode: "active",
    enabled: true,
    healthy: true,
    retiredAt: null,
    leaseExpiresAt: new Date(now.getTime() + 60000),
  });
  fixture.tables.class.push(
    {
      id: "a",
      name: "Math A",
      eywaClassId: "source-a",
      eywaBindingId: "binding",
      branchId: "branch",
      active: true,
      closedAt: null,
    },
    {
      id: "foreign",
      name: "Foreign",
      eywaClassId: "source-foreign",
      eywaBindingId: "other-binding",
      branchId: "other-branch",
      active: true,
      closedAt: null,
    },
  );
  fixture.tables.student.push({
    id: "student",
    eywaStudentId: "source-student",
    eywaBindingId: "binding",
    branchId: "branch",
    isTest: false,
    eywaWithdrawnAt: null,
  });
  fixture.tables.studentEnrollment.push({
    id: "enrollment",
    bindingId: "binding",
    studentId: "student",
    classId: "a",
    startsOn: new Date("2026-01-01"),
    endsOn: null,
    endedAt: null,
    onHold: false,
    isTransferred: false,
  });
  fixture.tables.test.push(
    {
      id: "class-test",
      classId: "a",
      studentId: null,
      status: "confirmed",
      predictionRunId: null,
      testType: "daily",
      testDate: new Date("2026-10-01"),
      publicationId: null,
      rangeEndUnitId: "unit-1",
    },
    {
      id: "private",
      classId: "a",
      studentId: "student",
      status: "confirmed",
      predictionRunId: "prediction",
    },
    {
      id: "foreign",
      classId: "foreign",
      studentId: "student",
      status: "confirmed",
      predictionRunId: null,
    },
  );
  fixture.tables.testResult.push(
    {
      id: "result",
      studentId: "student",
      testId: "class-test",
      absent: false,
      score: 80,
      takenAt: now,
    },
    {
      id: "private-result",
      studentId: "student",
      testId: "private",
      absent: false,
      takenAt: now,
    },
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("managed student summary", () => {
  it("counts only operational tests in the frozen binding and excludes private prediction work", async () => {
    const result = await getEywaStudentStatus("binding", "source-student");
    expect(result.linked).toBe(true);
    expect(result.tests).toEqual({ assigned: 1, completed: 1 });
    expect(result.lastActivityAt).toBe(now.toISOString());
    expect(result.classes).toEqual([
      { sourceClassId: "source-a", name: "Math A", active: true },
    ]);
  });
  it("refreshes an expired control lease and propagates source failure instead of false unlinking", async () => {
    fixture.tables.eywaBinding[0].leaseExpiresAt = now;
    vi.mocked(refreshManagedBinding).mockRejectedValueOnce(
      new Error("source_unavailable"),
    );
    await expect(
      getEywaStudentStatus("binding", "source-student"),
    ).rejects.toThrow("source_unavailable");
    expect(fixture.tables.eywaBinding[0].leaseExpiresAt).toEqual(now);
    vi.mocked(refreshManagedBinding).mockImplementationOnce(async () => {
      fixture.tables.eywaBinding[0].leaseExpiresAt = new Date(
        now.getTime() + 60000,
      );
    });
    expect(
      (await getEywaStudentStatus("binding", "source-student")).linked,
    ).toBe(true);
    expect(refreshManagedBinding).toHaveBeenCalledTimes(2);
  });
  it("renews an idle learner lease without teacher traffic, but denies fresh OFF and failed renewal", async () => {
    const binding = fixture.tables.eywaBinding[0];
    binding.leaseExpiresAt = now;
    vi.mocked(refreshManagedBinding).mockImplementationOnce(async () => {
      binding.leaseExpiresAt = new Date(now.getTime() + 60000);
    });
    expect(await activeStudentClassIds("student", fixture.tx)).toEqual(["a"]);
    binding.leaseExpiresAt = now;
    vi.mocked(refreshManagedBinding).mockImplementationOnce(async () => {
      binding.enabled = false;
      binding.leaseExpiresAt = new Date(now.getTime() + 60000);
    });
    expect(await activeStudentClassIds("student", fixture.tx)).toEqual([]);
    binding.enabled = true;
    binding.leaseExpiresAt = now;
    vi.mocked(refreshManagedBinding).mockRejectedValueOnce(
      new Error("source_unavailable"),
    );
    expect(await activeStudentClassIds("student", fixture.tx)).toEqual([]);
    expect(binding.leaseExpiresAt).toEqual(now);
  });
  it("retains held enrollment visibility while excluding held class assignments and absent completion", async () => {
    fixture.tables.studentEnrollment[0].onHold = true;
    const held = await getEywaStudentStatus("binding", "source-student");
    expect(held.linked).toBe(true);
    expect(held.classes[0].active).toBe(true);
    expect(held.tests).toEqual({ assigned: 0, completed: 0 });
    fixture.tables.studentEnrollment[0].onHold = false;
    fixture.tables.testResult[0].absent = true;
    expect(
      (await getEywaStudentStatus("binding", "source-student")).tests.completed,
    ).toBe(0);
    fixture.tables.eywaBinding[0].enabled = false;
    expect(
      (await getEywaStudentStatus("binding", "source-student")).linked,
    ).toBe(false);
    expect(fixture.tables.student).toHaveLength(1);
  });
});

describe("recent tests (read-only, 2026-10-17)", () => {
  beforeEach(() => {
    fixture.tables.unit.push({ id: "unit-1", section: "일차방정식" });
    fixture.tables.testProblem.push(
      ...["p1", "p2", "p3", "p4", "p5"].map((problemId) => ({
        testId: "class-test",
        problemId,
      })),
    );
    fixture.tables.problemAnswer.push(
      ...[true, true, true, true, false].map((isCorrect) => ({
        testResultId: "result",
        isCorrect,
      })),
    );
    fixture.tables.examPublication.push({
      id: "pub",
      title: "10월 월말평가",
      examType: "monthly",
    });
    fixture.tables.test.push(
      {
        id: "monthly",
        classId: "a",
        studentId: null,
        status: "confirmed",
        predictionRunId: null,
        testType: "review",
        testDate: new Date("2026-10-15"),
        publicationId: "pub",
        rangeEndUnitId: "unit-1",
      },
      {
        id: "absent-test",
        classId: "a",
        studentId: "student",
        status: "printed",
        predictionRunId: null,
        testType: "review",
        testDate: new Date("2026-10-10"),
        publicationId: null,
        rangeEndUnitId: "unit-1",
      },
    );
    fixture.tables.testResult.push({
      id: "absent-result",
      studentId: "student",
      testId: "absent-test",
      absent: true,
      score: null,
      takenAt: now,
    });
  });

  it("lists the counted tests newest first without turning absence or not-yet-taken into zero", async () => {
    const result = await getEywaStudentStatus("binding", "source-student");
    expect(result.tests).toEqual({ assigned: 3, completed: 1 });
    expect(result.recentTests).toEqual([
      {
        testId: "monthly",
        kind: "monthly",
        title: "10월 월말평가",
        unitName: "일차방정식",
        testDate: "2026-10-15",
        sourceClassId: "source-a",
        className: "Math A",
        questionCount: 0,
        result: null,
      },
      {
        testId: "absent-test",
        kind: "review",
        title: null,
        unitName: "일차방정식",
        testDate: "2026-10-10",
        sourceClassId: "source-a",
        className: "Math A",
        questionCount: 0,
        result: { absent: true, takenAt: now.toISOString() },
      },
      {
        testId: "class-test",
        kind: "daily",
        title: null,
        unitName: "일차방정식",
        testDate: "2026-10-01",
        sourceClassId: "source-a",
        className: "Math A",
        questionCount: 5,
        result: {
          absent: false,
          score: 80,
          correctCount: 4,
          takenAt: now.toISOString(),
        },
      },
    ]);
  });

  it("uses the latest grading of a regraded test and never leaks private prediction work", async () => {
    fixture.tables.testResult.push({
      id: "regrade",
      studentId: "student",
      testId: "class-test",
      absent: false,
      score: 100,
      takenAt: new Date(now.getTime() + 1000),
    });
    const result = await getEywaStudentStatus("binding", "source-student");
    const daily = result.recentTests.find((t) => t.testId === "class-test");
    expect(daily?.result).toMatchObject({ score: 100, correctCount: null });
    expect(result.recentTests.map((t) => t.testId)).not.toContain("private");
    expect(result.recentTests.map((t) => t.testId)).not.toContain("foreign");
  });

  it("reports no account until one is issued, and never sends the login id", async () => {
    expect(
      (await getEywaStudentStatus("binding", "source-student")).account,
    ).toBeNull();
    fixture.tables.studentAccount.push({
      id: "acct",
      studentId: "student",
      loginId: "secret-id",
      passwordHash: "hash",
      issuedAt: new Date("2026-10-01T00:00:00Z"),
      lastLoginAt: null,
      disabledAt: null,
      lockedUntil: null,
    });
    const result = await getEywaStudentStatus("binding", "source-student");
    expect(result.account).toEqual({
      state: "active",
      issuedAt: "2026-10-01T00:00:00.000Z",
      lastLoginAt: null,
    });
    expect(JSON.stringify(result)).not.toContain("secret-id");
    expect(JSON.stringify(result)).not.toContain("hash");
    access.allowed = false;
    expect(
      (await getEywaStudentStatus("binding", "source-student")).account?.state,
    ).toBe("blocked");
    access.allowed = true;
  });

  it("orders withdrawn, disabled and locked like the account panel", () => {
    const base = {
      issuedAt: now,
      lastLoginAt: now,
      disabledAt: null as Date | null,
      lockedUntil: null as Date | null,
    };
    const t = now.getTime();
    const later = new Date(t + 60000);
    expect(studentAccountSummary(base, null, true, t)?.state).toBe("active");
    expect(
      studentAccountSummary({ ...base, lockedUntil: now }, null, true, t)
        ?.state,
    ).toBe("active");
    expect(
      studentAccountSummary({ ...base, lockedUntil: later }, null, true, t)
        ?.state,
    ).toBe("locked");
    expect(
      studentAccountSummary(
        { ...base, lockedUntil: later, disabledAt: now },
        null,
        false,
        t,
      )?.state,
    ).toBe("disabled");
    expect(
      studentAccountSummary({ ...base, disabledAt: now }, now, false, t)?.state,
    ).toBe("withdrawn");
    expect(
      studentAccountSummary({ ...base, lockedUntil: later }, null, false, t)
        ?.state,
    ).toBe("blocked");
  });

  it("returns an empty list when unlinked", async () => {
    fixture.tables.eywaBinding[0].enabled = false;
    expect(
      (await getEywaStudentStatus("binding", "source-student")).recentTests,
    ).toEqual([]);
  });
});

describe("legacy writer isolation", () => {
  it("fences configured transports and retained OFF bindings while preserving nonmanaged legacy imports", async () => {
    vi.stubEnv("EYWA_TENANT_ID", "00000000-0000-4000-8000-000000000001");
    vi.stubEnv("EYWA_SYNC_BINDINGS_JSON", "");
    expect(() => assertLegacyTransportAllowed()).not.toThrow();
    fixture.tables.eywaBinding[0].enabled = false;
    await expect(
      assertLegacyWriterAllowed(fixture.tx, "branch"),
    ).rejects.toThrow("legacy_sync_fenced");
    await expect(
      assertLegacyWriterAllowed(fixture.tx, "unrelated"),
    ).resolves.toBeUndefined();
    vi.stubEnv(
      "EYWA_SYNC_BINDINGS_JSON",
      JSON.stringify([
        {
          bindingId: "00000000-0000-4000-8000-000000000002",
          tenantId: process.env.EYWA_TENANT_ID,
          targetBranchId: "branch",
          sourceBaseUrl: "https://source.example",
          targetBaseUrl: "https://target.example",
          keyId: "test",
          controlSecret: "a".repeat(32),
          webhookSecret: "b".repeat(32),
          ssoSecret: "c".repeat(32),
        },
      ]),
    );
    expect(() => assertLegacyTransportAllowed()).toThrow("legacy_sync_fenced");
  });
});
