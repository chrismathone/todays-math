// @vitest-environment node
import type { PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runEywaSync } from "@/lib/eywa/runSync";
import type { EywaSnapshot } from "@/lib/eywa/transport";
import { managedRelationDb } from "../helpers/managedRelationDb";

const fetchSnapshot = vi.hoisted(() => vi.fn());
vi.mock("@/lib/eywa/transport", async (original) => ({
  ...(await original<typeof import("@/lib/eywa/transport")>()),
  fetchViaApi: fetchSnapshot,
}));

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ownerId = id(1),
  branchId = id(2),
  classA = id(3),
  classB = id(4),
  studentA = id(5);
let fixture: ReturnType<typeof managedRelationDb>;
let snapshot: EywaSnapshot;
let client: PrismaClient;

beforeEach(() => {
  vi.stubEnv("EYWA_TRANSPORT", "api");
  vi.stubEnv("EYWA_SYNC_BINDINGS_JSON", "");
  vi.stubEnv("EYWA_SYNC_AUTO_JSON", "");
  vi.stubEnv("EYWA_SYNC_CLASS_IDS", `${classA},${classB}`);
  vi.stubEnv("EYWA_SYNC_OWNER_EMAIL", "owner@example.test");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  fixture = managedRelationDb();
  fixture.tables.user.push({
    id: ownerId,
    branchId,
    email: "owner@example.test",
  });
  fixture.tables.unit.push({
    id: "unit-a",
    grade: "중1",
    chapter: "7. 입체도형",
    section: "다면체",
    orderIndex: 160,
  });
  fixture.tables.unit.push({
    id: "unit-b",
    grade: "중1",
    chapter: "7. 입체도형",
    section: "회전체",
    orderIndex: 162,
  });
  fixture.tables.class.push(
    {
      id: "local-a",
      eywaClassId: classA,
      eywaBindingId: null,
      branchId,
      userId: ownerId,
      name: "Active",
      grade: "중1",
      active: false,
      closedAt: new Date("2026-09-01"),
    },
    {
      id: "local-b",
      eywaClassId: classB,
      eywaBindingId: null,
      branchId,
      userId: ownerId,
      name: "Ended",
      grade: "중1",
      active: true,
      closedAt: null,
    },
  );
  fixture.tables.student.push({
    id: "old-student",
    eywaStudentId: id(6),
    eywaBindingId: null,
    classId: "local-b",
    eywaWithdrawnAt: null,
  });
  fixture.tables.progress.push({
    id: "old-history",
    classId: "local-b",
    studentId: "old-student",
    eywaReportId: id(7),
    unitId: "unit-b",
    recordedAt: new Date("2026-09-01"),
    createdAt: new Date("2026-09-01"),
  });
  const tx = {
    ...fixture.tx,
    $executeRawUnsafe: vi.fn(),
    eywaSyncRun: { create: vi.fn() },
    progress: {
      ...fixture.tx.progress,
      async deleteMany(
        args: Parameters<typeof fixture.tx.progress.findMany>[0],
      ) {
        const matched = await fixture.tx.progress.findMany(args);
        const ids = new Set(matched.map((row) => row.id));
        fixture.tables.progress = fixture.tables.progress.filter(
          (row) => !ids.has(row.id),
        );
        return { count: ids.size };
      },
    },
  };
  client = {
    ...tx,
    $transaction: (work: (value: typeof tx) => Promise<unknown>) =>
      fixture.transaction(() => work(tx)),
  } as unknown as PrismaClient;
  snapshot = {
    roster: {
      generatedAt: "2026-10-04T00:00:00Z",
      total: 1,
      students: [
        {
          id: studentA,
          name: "Student",
          grade: "초6",
          school: null,
          status: "enrolled",
          classes: [{ id: classA, name: "Active", startDate: "2026-01-01" }],
        },
      ],
    },
    reports: [
      {
        id: id(8),
        studentId: studentA,
        classId: classA,
        makeupClassId: null,
        reportDate: "2026-10-01",
        createdAt: "2026-10-01T00:00:00Z",
        progress: "수학 다면체",
      },
      {
        id: id(9),
        studentId: studentA,
        classId: classB,
        makeupClassId: null,
        reportDate: "2026-10-03",
        createdAt: "2026-10-03T00:00:00Z",
        progress: "수학 회전체",
      },
    ],
    progressTotal: 2,
  };
  fetchSnapshot.mockImplementation(async () => snapshot);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("legacy synchronization active classes", () => {
  it("stores only the verified phone suffix and preserves it when a later legacy response omits the field", async () => {
    Object.assign(snapshot.roster.students[0], { phoneLast4: "0123" });
    await runEywaSync({ prisma: client, apply: true, writeLedger: vi.fn() });
    const student = fixture.tables.student.find(
      (row) => row.eywaStudentId === studentA,
    )!;
    expect(student.phoneLast4).toBe("0123");
    snapshot.roster.students[0] = { ...snapshot.roster.students[0] };
    delete snapshot.roster.students[0].phoneLast4;
    await runEywaSync({ prisma: client, apply: true, writeLedger: vi.fn() });
    expect(student.phoneLast4).toBe("0123");
    Object.assign(snapshot.roster.students[0], { phoneLast4: null });
    await runEywaSync({ prisma: client, apply: true, writeLedger: vi.fn() });
    expect(student.phoneLast4).toBeNull();
  });

  it("closes ended classes, preserves their history and excludes their reports from current students", async () => {
    const history = structuredClone(fixture.tables.progress[0]);
    const ledger = vi.fn();
    const result = await runEywaSync({
      prisma: client,
      apply: true,
      writeLedger: ledger,
    });
    expect(result.applied).toBe(true);
    expect(result.classes).toBe(1);
    expect(result.plannedRows).toBe(1);
    expect(fixture.tables.class[0]).toMatchObject({
      active: true,
      closedAt: null,
    });
    expect(fixture.tables.class[1].active).toBe(false);
    expect(fixture.tables.class[1].closedAt).toBeInstanceOf(Date);
    expect(
      fixture.tables.progress.find((row) => row.id === history.id),
    ).toEqual(history);
    expect(
      fixture.tables.progress.filter((row) => row.eywaReportId === id(9)),
    ).toHaveLength(0);
    expect(fixture.tables.student[0].eywaWithdrawnAt).toBeInstanceOf(Date);
    expect(
      fixture.tables.student.find((row) => row.eywaStudentId === studentA),
    ).toMatchObject({
      classId: "local-a",
      schoolLevel: "초",
      schoolGrade: 6,
      eywaLastReportDate: new Date("2026-10-01"),
      eywaLastReportText: "수학 다면체",
    });
    expect(fixture.tables.user).toHaveLength(1);
    expect(ledger).toHaveBeenCalledTimes(1);
  });

  it("deactivates all previously imported scoped classes when only other active classes remain in the source", async () => {
    const history = structuredClone(fixture.tables.progress);
    snapshot.roster.students[0].classes = [
      { id: id(99), name: "Outside scope", startDate: "2026-01-01" },
    ];
    const result = await runEywaSync({
      prisma: client,
      apply: true,
      writeLedger: vi.fn(),
    });
    expect(result.classes).toBe(0);
    expect(result.rosterTotal).toBe(0);
    expect(fixture.tables.class.every((row) => !row.active)).toBe(true);
    expect(fixture.tables.progress).toEqual(history);
  });
});
