// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { managedRelationDb } from "../helpers/managedRelationDb";
import { activeStudentClassIds } from "@/lib/classAccess";
import { getEywaStudentStatus } from "@/lib/eywa/managedStudentStatus";
import { refreshManagedBinding } from "@/lib/eywa/managedAccounts";
import {
  assertLegacyTransportAllowed,
  assertLegacyWriterAllowed,
} from "@/lib/eywa/legacyFence";

const state = vi.hoisted(() => ({ db: {} as object }));
vi.mock("@/lib/db", () => ({
  db: new Proxy({}, { get: (_target, key) => Reflect.get(state.db, key) }),
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
