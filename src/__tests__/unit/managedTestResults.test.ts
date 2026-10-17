// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { managedRelationDb } from "../helpers/managedRelationDb";
import { resultDay, resultDays } from "@/lib/eywa/managedTestResults";
import { refreshManagedBinding } from "@/lib/eywa/managedAccounts";

const state = vi.hoisted(() => ({ db: {} as object }));
vi.mock("@/lib/db", () => ({
  db: new Proxy({}, { get: (_target, key) => Reflect.get(state.db, key) }),
}));
vi.mock("@/lib/eywa/managedAccounts", () => ({
  refreshManagedBinding: vi.fn(),
  getManagedClassGrants: vi.fn(),
}));
const now = new Date("2026-10-17T03:00:00Z");
let fixture: ReturnType<typeof managedRelationDb>;
const test = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  classId: "a",
  studentId: null,
  status: "confirmed",
  predictionRunId: null,
  testType: "daily",
  testDate: new Date("2026-10-15"),
  publicationId: null,
  rangeEndUnitId: "unit-1",
  ...over,
});
const result = (id: string, testId: string, over: Record<string, unknown> = {}) => ({
  id,
  testId,
  studentId: "s1",
  absent: false,
  score: 80,
  takenAt: now,
  ...over,
});
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
    { id: "a", name: "A", eywaClassId: "src-a", eywaBindingId: "binding", branchId: "branch" },
    { id: "foreign", name: "F", eywaClassId: "src-f", eywaBindingId: "other", branchId: "other" },
  );
  fixture.tables.student.push(
    { id: "s1", eywaStudentId: "src-s1", eywaBindingId: "binding", branchId: "branch", isTest: false },
    { id: "s2", eywaStudentId: "src-s2", eywaBindingId: "binding", branchId: "branch", isTest: false },
    { id: "local", eywaStudentId: null, eywaBindingId: null, branchId: "branch", isTest: false },
    { id: "tester", eywaStudentId: "src-t", eywaBindingId: "binding", branchId: "branch", isTest: true },
  );
  fixture.tables.unit.push({ id: "unit-1", section: "일차방정식" });
  fixture.tables.examPublication.push({ id: "pub", title: "10월 월말평가", examType: "monthly" });
  fixture.tables.test.push(
    test("daily"),
    test("monthly", { testType: "review", publicationId: "pub" }),
    test("draft", { status: "draft" }),
    test("predict", { predictionRunId: "run" }),
    test("foreign", { classId: "foreign" }),
    test("other-day", { testDate: new Date("2026-10-16") }),
  );
  fixture.tables.testProblem.push(
    ...["p1", "p2", "p3", "p4", "p5"].map((problemId) => ({ testId: "daily", problemId })),
  );
  fixture.tables.testResult.push(
    result("r1", "daily"),
    result("r2", "daily", { studentId: "s2", absent: true, score: null }),
    result("r3", "monthly", { score: 92.5 }),
    result("r-draft", "draft"),
    result("r-predict", "predict"),
    result("r-foreign", "foreign"),
    result("r-local", "daily", { studentId: "local" }),
    result("r-tester", "daily", { studentId: "tester" }),
    result("r-other", "other-day"),
  );
  fixture.tables.problemAnswer.push(
    ...[true, true, true, true, false].map((isCorrect) => ({ testResultId: "r1", isCorrect })),
  );
});
afterEach(() => vi.useRealTimers());

describe("test result feed to aywa (2026-10-17)", () => {
  it("returns one row per linked student and counted test, absent without a score", async () => {
    const day = await resultDay("binding", "2026-10-15");
    expect(day.rows).toEqual([
      {
        sourceTestId: "daily", sourceStudentId: "src-s1", sourceClassId: "src-a", kind: "daily", title: null,
        unitName: "일차방정식", testDate: "2026-10-15", questionCount: 5, absent: false, score: 80, correctCount: 4,
        takenAt: now.toISOString(),
      },
      {
        sourceTestId: "daily", sourceStudentId: "src-s2", sourceClassId: "src-a", kind: "daily", title: null,
        unitName: "일차방정식", testDate: "2026-10-15", questionCount: 5, absent: true, score: null, correctCount: null,
        takenAt: now.toISOString(),
      },
      {
        sourceTestId: "monthly", sourceStudentId: "src-s1", sourceClassId: "src-a", kind: "monthly", title: "10월 월말평가",
        unitName: "일차방정식", testDate: "2026-10-15", questionCount: 0, absent: false, score: 92.5, correctCount: null,
        takenAt: now.toISOString(),
      },
    ]);
  });

  it("the day digest matches the fetched day, and a regrade changes it", async () => {
    const days = await resultDays("binding", "2026-10-01", "2026-10-17");
    expect(days.days.map((d) => [d.date, d.count])).toEqual([["2026-10-15", 3], ["2026-10-16", 1]]);
    const before = await resultDay("binding", "2026-10-15");
    expect(days.days[0].sha256).toBe(before.sha256);
    fixture.tables.testResult.push(result("r9", "daily", { score: 100, takenAt: new Date(now.getTime() + 1000) }));
    const after = await resultDay("binding", "2026-10-15");
    expect(after.sha256).not.toBe(before.sha256);
    expect(after.rows.find((r) => r.sourceStudentId === "src-s1" && r.sourceTestId === "daily")).toMatchObject({ score: 100, correctCount: null });
  });

  it("an empty day is a real empty list with the empty digest", async () => {
    const day = await resultDay("binding", "2026-10-10");
    expect(day.rows).toEqual([]);
    expect(day.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("🔴 an inactive or unverifiable link throws instead of returning empty (aywa would delete the day)", async () => {
    fixture.tables.eywaBinding[0].enabled = false;
    await expect(resultDay("binding", "2026-10-15")).rejects.toThrow("binding_inactive");
    await expect(resultDays("binding", "2026-10-01", "2026-10-17")).rejects.toThrow("binding_inactive");
    fixture.tables.eywaBinding[0].enabled = true;
    fixture.tables.eywaBinding[0].leaseExpiresAt = now;
    vi.mocked(refreshManagedBinding).mockRejectedValueOnce(new Error("source_unavailable"));
    await expect(resultDay("binding", "2026-10-15")).rejects.toThrow("source_unavailable");
  });

  it("rejects malformed dates and windows", async () => {
    await expect(resultDay("binding", "2026-02-30")).rejects.toThrow("invalid_date");
    await expect(resultDay("binding", "x")).rejects.toThrow("invalid_date");
    await expect(resultDays("binding", "2026-10-17", "2026-10-01")).rejects.toThrow("invalid_window");
    await expect(resultDays("binding", "2026-01-01", "2026-10-17")).rejects.toThrow("invalid_window");
  });
});
