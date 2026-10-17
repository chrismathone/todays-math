// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => {
  const cls = vi.fn();
  const student = vi.fn();
  const tx = {
    class: { findUnique: cls },
    student: { findUnique: student },
    testResult: { create: vi.fn() },
    problemAnswer: { createMany: vi.fn() },
    analysisReport: { create: vi.fn() },
  };
  return {
    test: vi.fn(),
    user: vi.fn(),
    student,
    students: vi.fn(),
    cls,
    managedAccount: vi.fn(),
    problems: vi.fn(),
    results: vi.fn(),
    raw: vi.fn(),
    units: vi.fn(),
    transaction: vi.fn(
      async (operation: (client: typeof tx) => Promise<unknown>) =>
        operation(tx),
    ),
    tx,
  };
});
vi.mock("@/lib/db", () => ({
  db: {
    // 월말평가 M1 — 로더가 반 시험의 발행본을 한 번 묻는다(이 시험의 반 시험은 발행본이 없다).
    test: { findUnique: m.test, findMany: async () => [] },
    user: { findUnique: m.user },
    eywaManagedAccount: { findUnique: m.managedAccount },
    student: { findUnique: m.student, findMany: m.students },
    class: { findUnique: m.cls },
    testProblem: { findMany: m.problems },
    testResult: { findMany: m.results },
    unit: { findMany: m.units },
    progress: { findMany: async () => [] },
    progressPlan: { findMany: async () => [] },
    $queryRaw: m.raw,
    $transaction: m.transaction,
  },
}));

import { loadTestProblemItems } from "@/lib/tests/loadTestProblems";
import { loadGradeSheet, saveGradingMarks } from "@/lib/testResults/gradeSheet";
import { submitTestResult } from "@/lib/testResults/submitTestResult";
import { loadAchievementInput } from "@/lib/achievement/load";
import { collectAchievement } from "@/lib/achievement/collect";
import { sha256 } from "@/lib/textbook/hash.server";
import {
  frozenSnapshot,
  testItem,
  PROBLEM_ID,
  UNIT_ID,
  LIVE_UNIT_ID,
  OWNER_ID,
  TEST_ID,
} from "../fixtures/textbookTestProblem";

const TEST_OWNER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const VIEWER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CLASS_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const STUDENT_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const RESULT_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const REPORT_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const BRANCH_ID = "11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const date = new Date("2026-10-03T09:00:00.000Z");
const viewer = {
  id: VIEWER_ID,
  name: "Branch manager",
  email: "manager@example.test",
  isAdmin: true,
  branchId: BRANCH_ID,
};
const bytes = new TextEncoder().encode(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="2"/></svg>',
);
const assetId = sha256(bytes);
const asset = {
  userId: OWNER_ID,
  id: assetId,
  mimeType: "image/svg+xml",
  widthPx: null,
  heightPx: null,
  size: bytes.length,
};
const input = {
  studentId: STUDENT_ID,
  answers: [
    { problemId: PROBLEM_ID, selectedChoice: 2, essayScore: null, sequence: 2 },
  ],
};
const marks = {
  entries: [{ studentId: STUDENT_ID, absent: false, wrongProblemIds: [] }],
};
const period = { from: "2026-10-01", to: "2026-10-31" };

function captured() {
  const base = frozenSnapshot();
  return {
    ...testItem(
      frozenSnapshot({
        payload: {
          ...base.payload,
          answer: " 2\r\n",
          figures: [
            {
              assetId,
              sha256: assetId,
              choiceIndex: null,
              sourceWidthMm: null,
              altText: null,
            },
          ],
        },
      }),
    ),
    score: null as number | null,
  };
}
let row = captured();
beforeEach(() => {
  vi.clearAllMocks();
  row = captured();
  m.test.mockResolvedValue({
    id: TEST_ID,
    userId: TEST_OWNER,
    classId: CLASS_ID,
    studentId: null,
    status: "printed",
    testType: "daily",
    testDate: date,
  });
  m.user.mockResolvedValue({ branchId: BRANCH_ID, authSource: "local" });
  m.managedAccount.mockResolvedValue(null);
  const cls = {
    id: CLASS_ID,
    userId: TEST_OWNER,
    name: "Shared class",
    grade: "초5",
    branchId: BRANCH_ID,
    eywaBindingId: null,
  };
  const student = {
    id: STUDENT_ID,
    classId: CLASS_ID,
    name: "Student",
    useIndividualProgress: false,
    eywaBindingId: null,
    eywaWithdrawnAt: null,
    isTest: false,
    class: cls,
  };
  m.student.mockResolvedValue(student);
  m.students.mockResolvedValue([student]);
  m.cls.mockResolvedValue(cls);
  m.problems.mockImplementation(async () => [row]);
  m.results.mockResolvedValue([]);
  m.units.mockResolvedValue([
    {
      id: UNIT_ID,
      grade: "중1",
      chapter: "Renamed live chapter",
      section: "Renamed live section",
      orderIndex: 1,
    },
  ]);
  m.raw.mockImplementation(async (sql: { sql: string }) => [
    sql.sql.includes('b."bytes"') ? { ...asset, bytes } : { ...asset },
  ]);
  m.tx.testResult.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => ({
      id: RESULT_ID,
      takenAt: date,
      createdAt: date,
      gradingMode: "answers",
      absent: false,
      ...data,
    }),
  );
  m.tx.analysisReport.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => ({
      id: REPORT_ID,
      createdAt: date,
      ...data,
    }),
  );
});

describe("authorized Test access supports a reissue owned by another teacher", () => {
  it("uses the actual Test reader and response model with nullable geometry", async () => {
    const items = await loadTestProblemItems(TEST_ID);
    expect(m.problems).toHaveBeenCalledWith({
      where: { testId: TEST_ID },
      include: { problem: true, snapshot: true },
      orderBy: { orderIndex: "asc" },
    });
    expect(items[0].problem).toMatchObject({
      answer: " 2\r\n",
      unitId: UNIT_ID,
      difficulty: "기본",
      figureDims: [null, null],
      figureSourceMm: [null],
    });
    expect(items[0].problem.figureUrls[0]).toMatch(
      /^data:image\/svg\+xml;base64,/,
    );
  });

  it("authorizes via the shared Test owner but reads assets from the original snapshot owner", async () => {
    const response = await loadGradeSheet(viewer, TEST_ID);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.problems[0]).toMatchObject({
      problemId: PROBLEM_ID,
      problemCode: "E50101-A01-001",
      difficulty: "기본",
    });
    expect(m.cls).toHaveBeenCalledWith({ where: { id: CLASS_ID } });
    for (const [sql] of m.raw.mock.calls) {
      expect(sql.values).toEqual([OWNER_ID, assetId]);
      expect(sql.values).not.toContain(TEST_OWNER);
      expect(sql.values).not.toContain(VIEWER_ID);
    }
  });

  it.each(["answers", "marks"])(
    "grades %s using frozen answers, unit, difficulty and original score",
    async (mode) => {
      const response =
        mode === "answers"
          ? await submitTestResult(viewer, TEST_ID, input)
          : await saveGradingMarks(viewer, TEST_ID, marks);
      expect(response.status).toBe(201);
      expect(m.tx.testResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          testId: TEST_ID,
          studentId: STUDENT_ID,
          score: 3.5,
        }),
      });
      expect(m.tx.problemAnswer.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ problemId: PROBLEM_ID, isCorrect: true }),
        ],
      });
      expect(m.tx.analysisReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          totalScore: 3.5,
          unitScores: { [UNIT_ID]: 100 },
          difficultyDistribution: expect.objectContaining({
            기본: { correct: 1, total: 1 },
            심화상: { correct: 0, total: 0 },
          }),
        }),
      });
    },
  );

  it("keeps the frozen class branch authoritative when its creator moves branches", async () => {
    m.user.mockResolvedValue({
      branchId: "another-branch",
      authSource: "local",
    });
    expect((await loadGradeSheet(viewer, TEST_ID)).status).toBe(200);
    expect(m.problems).toHaveBeenCalled();
  });

  it.each([0, 8])(
    "preserves the Test score override %s over frozen original and live score",
    async (score) => {
      row.score = score;
      expect((await submitTestResult(viewer, TEST_ID, input)).status).toBe(201);
      expect(m.tx.testResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ score }),
      });
    },
  );

  it.each(["read", "answers", "marks"])(
    "rejects out-of-branch %s before reading snapshots or assets",
    async (mode) => {
      m.cls.mockResolvedValue({
        id: CLASS_ID,
        userId: TEST_OWNER,
        branchId: "another-branch",
        eywaBindingId: null,
      });
      const response =
        mode === "read"
          ? await loadGradeSheet(viewer, TEST_ID)
          : mode === "answers"
            ? await submitTestResult(viewer, TEST_ID, input)
            : await saveGradingMarks(viewer, TEST_ID, marks);
      expect(response.status).toBe(403);
      expect(m.problems).not.toHaveBeenCalled();
      expect(m.raw).not.toHaveBeenCalled();
      expect(m.transaction).not.toHaveBeenCalled();
    },
  );

  it.each(["answers", "marks"])(
    "rejects a hash failure in %s before any grading write",
    async (mode) => {
      row.snapshot.contentHash = "f".repeat(64);
      const operation =
        mode === "answers"
          ? submitTestResult(viewer, TEST_ID, input)
          : saveGradingMarks(viewer, TEST_ID, marks);
      await expect(operation).rejects.toThrow(/해시/);
      expect(m.raw).not.toHaveBeenCalled();
      expect(m.transaction).not.toHaveBeenCalled();
    },
  );

  it("rejects missing frozen assets before any grading write instead of using the live figure", async () => {
    m.raw.mockResolvedValue([]);
    await expect(submitTestResult(viewer, TEST_ID, input)).rejects.toThrow(
      /자산/,
    );
    expect(m.transaction).not.toHaveBeenCalled();
  });

  it("keeps legacy live grading and omits every snapshot extension", async () => {
    const legacy = { ...row, snapshotId: null, snapshot: null };
    m.problems.mockResolvedValue([legacy]);
    const items = await loadTestProblemItems(TEST_ID);
    expect(items[0]).not.toHaveProperty("snapshotId");
    expect(items[0].problem).not.toHaveProperty("figureDims");
    expect(items[0].problem).not.toHaveProperty("figureSourceMm");
    // 2026-10-03 병합(문제은행 3자 합의 B1 · D-156): 은행 문항의 보기 그림 짝은 스냅샷 확장이 아니라
    // **은행 문항의 칸**이라 옛 시험지 문항에도 실린다(은행 카드와 시험지 검수가 같은 뷰). 치수 둘은 여전히 안 싣는다.
    expect(items[0].problem.choiceFigureIndex).toEqual(
      legacy.problem.choiceFigureIndex,
    );
    expect(items[0].problem.content).toBe(legacy.problem.content);
    const response = await submitTestResult(viewer, TEST_ID, {
      ...input,
      answers: [{ ...input.answers[0], selectedChoice: 4 }],
    });
    expect(response.status).toBe(201);
    expect(m.tx.testResult.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ score: 87 }),
    });
    expect(m.raw).not.toHaveBeenCalled();
  });
});

describe("achievement reads verified frozen metadata without fetching figure bytes", () => {
  function result(testId = TEST_ID) {
    return {
      testId,
      takenAt: date,
      score: 3.5,
      absent: false,
      test: { testDate: date },
      answers: [
        {
          problemId: PROBLEM_ID,
          isCorrect: true,
          problem: { unitId: LIVE_UNIT_ID, difficulty: "심화상" },
        },
      ],
      analysisReport: { recommendedUnits: [] },
    };
  }

  it("keeps frozen and legacy occurrences of the same bank problem separate by Test ID", async () => {
    const legacyId = "22222222-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    m.results.mockResolvedValue([result(), result(legacyId)]);
    m.problems.mockResolvedValue([
      row,
      { ...row, testId: legacyId, snapshotId: null, snapshot: null },
    ]);
    const loaded = await loadAchievementInput({
      studentId: STUDENT_ID,
      period,
    });
    expect(loaded!.results[0]).toMatchObject({
      maxScore: 3.5,
      items: [
        {
          unitId: UNIT_ID,
          difficulty: "기본",
          frozenUnitLabel: {
            grade: "초5",
            chapter: "분수",
            section: "고정한 소단원",
          },
        },
      ],
    });
    expect(loaded!.results[1]).toMatchObject({
      maxScore: 87,
      items: [{ unitId: LIVE_UNIT_ID, difficulty: "심화상" }],
    });
    expect(loaded!.results[1].items[0]).not.toHaveProperty("frozenUnitLabel");
    const factors = collectAchievement(loaded!);
    expect(factors.scored.unitAccuracy?.underSampled).toContainEqual(
      expect.objectContaining({
        unitId: UNIT_ID,
        grade: "초5",
        chapter: "분수",
        section: "고정한 소단원",
      }),
    );
    expect(m.raw).not.toHaveBeenCalled();
  });

  it("fails on modified frozen metadata instead of falling back to live achievement values", async () => {
    row.snapshot.sourceMetadata = {
      ...frozenSnapshot().sourceMetadata!,
      originalScore: 87,
    };
    m.results.mockResolvedValue([result()]);
    await expect(
      loadAchievementInput({ studentId: STUDENT_ID, period }),
    ).rejects.toThrow(/해시/);
    expect(m.raw).not.toHaveBeenCalled();
    expect(m.units).not.toHaveBeenCalled();
  });
});
