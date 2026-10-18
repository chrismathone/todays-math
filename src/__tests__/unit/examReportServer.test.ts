// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import type { ExamReportArtifact, ExamReportDraft } from "@prisma/client";
import { reportCandidate, reportId } from "../helpers/examReportFeedFixture";

const m = vi.hoisted(() => ({
  db: {
    test: { findUnique: vi.fn(), findMany: vi.fn() },
    examPublication: { findMany: vi.fn() },
    student: { findMany: vi.fn() },
    testProblem: { findMany: vi.fn() },
    testResult: { findMany: vi.fn() },
    examReportDraft: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    examReportArtifact: { create: vi.fn(), findUnique: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
  buildPdf: vi.fn(),
  upload: vi.fn(),
  read: vi.fn(),
  owned: vi.fn(),
  assertWrite: vi.fn(),
  noteLog: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: m.db }));
vi.mock("@/lib/ownership", () => ({ requireOwnedClass: m.owned }));
vi.mock("@/lib/classAccess", async (original) => ({
  ...(await original<typeof import("@/lib/classAccess")>()),
  assertClassWrite: m.assertWrite,
}));
vi.mock("@/lib/examReport/storage", () => ({
  examReportStorage: () => ({ upload: m.upload, read: m.read }),
}));
vi.mock("@/lib/errorLog/scope", () => ({ noteErrorLog: m.noteLog }));
vi.mock("@/lib/export/pdfServer", async (original) => ({
  ...(await original<typeof import("@/lib/export/pdfServer")>()),
  buildPdf: m.buildPdf,
}));

import {
  confirmExamReport,
  printExamReports,
  readConfirmedExamReportPdf,
  readExamReportList,
  readExamReportStudent,
  saveExamReportNote,
  saveExamReportSettings,
} from "@/lib/examReport/server";
import {
  examReportOptionsSchema,
  examReportStudentResponseSchema,
} from "@/contracts/examReportWorkspace.contract";
import type { SessionUser } from "@/lib/session";

const session: SessionUser = {
  id: reportId(20),
  email: "fixture@example.test",
  name: "원장",
  isAdmin: true,
  branchId: reportId(2),
};
function seed() {
  const { current } = reportCandidate();
  const report = current.report;
  const q = report.questions[0];
  const publication = {
    id: report.publication.id,
    userId: session.id,
    branchId: session.branchId,
    title: report.publication.title,
    testDate: new Date("2026-10-24T00:00:00Z"),
    payload: {
      version: 1,
      problems: [
        { ...q, section: q.unitName, score: null, problemType: q.typeLabel },
      ],
    },
  };
  const cls = {
    id: report.classId,
    name: report.className,
    userId: session.id,
    branchId: session.branchId,
    eywaClassId: "eywa-class",
    eywaBindingId: reportId(1),
  };
  return {
    test: {
      id: report.testId,
      userId: session.id,
      classId: cls.id,
      publicationId: publication.id,
      predictionRunId: null,
      status: "confirmed",
      class: cls,
      publication,
    },
    students: [
      {
        id: report.student.id,
        name: report.student.name,
        classId: cls.id,
        branchId: session.branchId,
        eywaBindingId: reportId(1),
        eywaStudentId: "eywa-student",
        isTest: false,
      },
    ],
    problems: [
      {
        testId: report.testId,
        problemId: q.problemId,
        orderIndex: 1,
        score: null,
        snapshot: null,
        problem: {
          ...q,
          id: q.problemId,
          unitId: reportId(30),
          difficulty: "기본",
          score: null,
          problemType: q.typeLabel,
          unit: { section: q.unitName },
        },
      },
    ],
    results: [
      {
        id: report.resultId!,
        testId: report.testId,
        studentId: report.student.id,
        takenAt: new Date(report.takenAt!),
        absent: false,
        score: 0 as number | null,
        answers: [{ problemId: q.problemId, isCorrect: false }],
      },
    ],
    drafts: [] as ExamReportDraft[],
    artifacts: [] as ExamReportArtifact[],
  };
}
let world = seed();
const testId = reportId(4),
  studentId = reportId(6);
let pdf: Uint8Array;
function decorated() {
  return world.drafts.map((row) => ({
    ...row,
    confirmedArtifact:
      world.artifacts.find(
        (artifact) => artifact.id === row.confirmedArtifactId,
      ) ?? null,
    artifacts: world.artifacts
      .filter((artifact) => artifact.reportId === row.id)
      .sort((a, b) => b.revision - a.revision)
      .slice(0, 1),
  }));
}
beforeEach(async () => {
  vi.clearAllMocks();
  world = seed();
  const document = await PDFDocument.create();
  document.addPage([100, 100]);
  pdf = new Uint8Array(await document.save());
  m.buildPdf.mockReset().mockResolvedValue(pdf);
  m.upload.mockReset().mockResolvedValue(undefined);
  m.read.mockReset().mockResolvedValue(pdf);
  m.owned.mockResolvedValue({ ok: true, data: world.test.class });
  m.assertWrite.mockResolvedValue(undefined);
  m.db.test.findUnique.mockImplementation(async () =>
    structuredClone(world.test),
  );
  m.db.test.findMany.mockImplementation(async () => [
    structuredClone(world.test),
  ]);
  m.db.examPublication.findMany.mockImplementation(async () => [
    structuredClone(world.test.publication),
  ]);
  m.db.student.findMany.mockImplementation(async () =>
    structuredClone(world.students),
  );
  m.db.testProblem.findMany.mockImplementation(async () =>
    structuredClone(world.problems),
  );
  m.db.testResult.findMany.mockImplementation(async () =>
    structuredClone(world.results),
  );
  m.db.examReportDraft.findMany.mockImplementation(async () =>
    structuredClone(decorated()),
  );
  m.db.examReportDraft.create.mockImplementation(async ({ data }) => {
    const row = {
      id: reportId(40 + world.drafts.length),
      teacherNote: "",
      options: {},
      revision: 1,
      state: "draft",
      confirmedArtifactId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    } as ExamReportDraft;
    world.drafts.push(row);
    return structuredClone(row);
  });
  m.db.examReportDraft.update.mockImplementation(async ({ where, data }) => {
    const row = world.drafts.find((draft) => draft.id === where.id)!;
    if (
      (data.teacherNote !== undefined &&
        data.teacherNote !== row.teacherNote) ||
      (data.options &&
        JSON.stringify(data.options) !== JSON.stringify(row.options))
    ) {
      row.revision++;
      row.state = "draft";
      row.confirmedArtifactId = null;
    }
    Object.assign(row, data);
    return structuredClone(row);
  });
  m.db.examReportDraft.updateMany.mockImplementation(async ({ data }) => {
    for (const row of world.drafts)
      await m.db.examReportDraft.update({ where: { id: row.id }, data });
    return { count: world.drafts.length };
  });
  m.db.examReportArtifact.create.mockImplementation(async ({ data }) => {
    const row = {
      confirmedAt: new Date("2026-10-24T05:00:00Z"),
      ...data,
    } as ExamReportArtifact;
    if (
      world.artifacts.some(
        (old) => old.reportId === row.reportId && old.revision === row.revision,
      )
    )
      throw new Error("같은 판 보관본");
    world.artifacts.push(row);
    return structuredClone(row);
  });
  m.db.$transaction.mockImplementation(async (run) => {
    const backup = structuredClone(world);
    try {
      return await run(m.db);
    } catch (error) {
      world = backup;
      throw error;
    }
  });
});

describe("실제 성적표 읽기·쓰기 — DB·Chromium·외부 호출 없는 더블", () => {
  it("읽기는 편집 줄을 만들지 않으며 기존 발행 문항·점수 계산과 명단을 쓴다", async () => {
    const data = await readExamReportList(session, testId);
    expect(data.students[0]).toMatchObject({
      status: "none",
      revision: 0,
      score: { value: 0, maximum: 1, unit: "questions" },
    });
    const student = await readExamReportStudent(session, testId, studentId);
    expect(student.report.questions[0].content).toContain("x + 3");
    expect(student.report.retries).toEqual([]);
    expect(m.db.examReportDraft.create).not.toHaveBeenCalled();
    expect(m.owned).toHaveBeenCalledWith(
      reportId(5),
      expect.objectContaining({ id: session.id, isAdmin: false }),
      "test:write",
    );
  });
  it("문장 없음·문장 씀·확정·문장 변경 후 다시 확정·재채점 후 다시 확정을 실제 읽기로 가른다", async () => {
    let data = await saveExamReportNote(session, testId, studentId, {
      expectedRevision: 0,
      teacherNote: "문장",
    });
    expect(data.summary.status).toBe("draft");
    data = await confirmExamReport(
      session,
      testId,
      studentId,
      { expectedRevision: data.summary.revision },
      "https://math.example.test",
    );
    expect(data.summary.status).toBe("confirmed");
    expect(world.artifacts).toHaveLength(1);
    data = await saveExamReportNote(session, testId, studentId, {
      expectedRevision: data.summary.revision,
      teacherNote: "고친 문장",
    });
    expect(data.summary.status).toBe("stale");
    expect(world.drafts[0].confirmedArtifactId).toBeNull();
    data = await confirmExamReport(
      session,
      testId,
      studentId,
      { expectedRevision: data.summary.revision },
      "https://math.example.test",
    );
    const old = structuredClone(world.artifacts);
    world.results.push({
      ...world.results[0],
      id: reportId(80),
      takenAt: new Date("2026-10-24T06:00:00Z"),
    });
    data = await readExamReportStudent(session, testId, studentId);
    expect(data.summary.status).toBe("stale");
    await confirmExamReport(
      session,
      testId,
      studentId,
      { expectedRevision: data.summary.revision },
      "https://math.example.test",
    );
    expect(world.artifacts).toHaveLength(3);
    expect(world.artifacts.slice(0, 2)).toEqual(old);
    expect(world.artifacts[2].revision).toBeGreaterThan(
      world.artifacts[1].revision,
    );
  });
  it("확정은 현재 문장 저장을 포함하고, 빈 문장 확정은 문장 칸이 없다", async () => {
    let data = await confirmExamReport(
      session,
      testId,
      studentId,
      { expectedRevision: 0, teacherNote: "" },
      "https://math.example.test",
    );
    expect(data.summary.status).toBe("confirmed");
    expect(m.buildPdf.mock.calls[0][0]).toMatchObject({
      fontPolicy: "self-hosted",
    });
    expect(m.buildPdf.mock.calls[0][0].html).not.toContain("er-area er-note");
    data = await confirmExamReport(
      session,
      testId,
      studentId,
      { expectedRevision: data.summary.revision, teacherNote: "저장까지 포함" },
      "https://math.example.test",
    );
    expect(data.report.teacherNote).toBe("저장까지 포함");
    expect(world.artifacts.at(-1)!.snapshot).toMatchObject({
      report: { teacherNote: "저장까지 포함" },
    });
  });
  it("문장 저장 실패는 PDF·업로드에 이르지 않는다", async () => {
    m.db.examReportDraft.update.mockRejectedValueOnce(new Error("저장 실패"));
    await expect(
      confirmExamReport(
        session,
        testId,
        studentId,
        { expectedRevision: 0, teacherNote: "새 문장" },
        "https://math.example.test",
      ),
    ).rejects.toThrow("저장 실패");
    expect(m.buildPdf).not.toHaveBeenCalled();
    expect(m.upload).not.toHaveBeenCalled();
    expect(world.artifacts).toHaveLength(0);
  });
  it.each(["render", "upload"])(
    "%s 실패는 확정하지 않고 저장된 문장은 남긴다",
    async (kind) => {
      if (kind === "render")
        m.buildPdf.mockRejectedValueOnce(new Error("PDF 실패"));
      else m.upload.mockRejectedValueOnce(new Error("업로드 실패"));
      await expect(
        confirmExamReport(
          session,
          testId,
          studentId,
          { expectedRevision: 0, teacherNote: "보존할 문장" },
          "https://math.example.test",
        ),
      ).rejects.toThrow();
      expect(world.drafts[0]).toMatchObject({
        teacherNote: "보존할 문장",
        state: "draft",
        confirmedArtifactId: null,
      });
      expect(world.artifacts).toHaveLength(0);
    },
  );
  it.each(["revision", "result", "digest"])(
    "업로드 뒤 %s가 달라지면 409 · 파일 경로를 오류 기록에 남긴다",
    async (kind) => {
      m.upload.mockImplementationOnce(async () => {
        if (kind === "revision") world.drafts[0].revision++;
        if (kind === "result")
          world.results.push({
            ...world.results[0],
            id: reportId(80),
            takenAt: new Date("2026-10-24T06:00:00Z"),
          });
        if (kind === "digest") world.results[0].answers[0].isCorrect = true;
      });
      await expect(
        confirmExamReport(
          session,
          testId,
          studentId,
          { expectedRevision: 0, teacherNote: "문장" },
          "https://math.example.test",
        ),
      ).rejects.toMatchObject({ status: 409 });
      expect(world.artifacts).toHaveLength(0);
      expect(m.noteLog).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            unconfirmedPdfPath: expect.stringMatching(/\.pdf$/),
          }),
        }),
      );
    },
  );
  it("다른 소유자·지점·반 밖 학생·결시를 거절하고 새 쓰기가 없다", async () => {
    await expect(
      readExamReportList({ ...session, id: reportId(99) }, testId),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      readExamReportList({ ...session, branchId: reportId(99) }, testId),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      readExamReportStudent(session, testId, reportId(99)),
    ).rejects.toMatchObject({ status: 404 });
    world.results[0].absent = true;
    world.results[0].score = null;
    expect(
      (await readExamReportStudent(session, testId, studentId)).summary.status,
    ).toBe("absent");
    await expect(
      confirmExamReport(
        session,
        testId,
        studentId,
        { expectedRevision: 0 },
        "https://math.example.test",
      ),
    ).rejects.toMatchObject({ status: 422 });
    expect(m.upload).not.toHaveBeenCalled();
  });
  it("반 설정은 명단 전체를 한 거래에 쓰고 확정을 푼다. 오래된 설정 지문은 덮어쓰지 않는다", async () => {
    await confirmExamReport(
      session,
      testId,
      studentId,
      { expectedRevision: 0 },
      "https://math.example.test",
    );
    world.students.push({
      ...world.students[0],
      id: reportId(66),
      name: "둘째",
    });
    const before = await readExamReportList(session, testId);
    const options = examReportOptionsSchema.parse({ format: "M1" });
    const data = await saveExamReportSettings(session, testId, {
      expectedOptionsDigest: before.optionsDigest,
      options,
    });
    expect(world.drafts).toHaveLength(2);
    expect(
      world.drafts.every(
        (draft) => JSON.stringify(draft.options) === JSON.stringify(options),
      ),
    ).toBe(true);
    expect(
      data.students.find((row) => row.student.id === studentId)?.status,
    ).toBe("stale");
    await expect(
      saveExamReportSettings(session, testId, {
        expectedOptionsDigest: before.optionsDigest,
        options,
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("반 평균은 계약의 두 필드로만 전달하며 다른 학생의 재채점도 다시 확정으로 읽는다", async () => {
    const second = reportId(66);
    world.students.push({ ...world.students[0], id: second, name: "둘째" });
    world.results.push({
      ...world.results[0],
      id: reportId(77),
      studentId: second,
      answers: [{ ...world.results[0].answers[0] }],
    });
    const before = await readExamReportList(session, testId);
    await saveExamReportSettings(session, testId, {
      expectedOptionsDigest: before.optionsDigest,
      options: examReportOptionsSchema.parse({ classAverage: true }),
    });
    let student = await readExamReportStudent(session, testId, studentId);
    expect(
      examReportStudentResponseSchema.safeParse({ data: student }).success,
    ).toBe(true);
    expect(student.classComparison).toEqual({
      averageScore: 0,
      gradedCount: 2,
    });
    student = await confirmExamReport(
      session,
      testId,
      studentId,
      { expectedRevision: student.summary.revision },
      "https://math.example.test",
    );
    expect(student.summary.status).toBe("confirmed");
    world.results[1].answers[0].isCorrect = true;
    expect(
      (await readExamReportStudent(session, testId, studentId)).summary.status,
    ).toBe("stale");
  });
  it("실제 PDF 넘침은 422로 돌리고 확정하지 않는다", async () => {
    m.buildPdf.mockRejectedValueOnce(
      new Error(
        "성적표 1쪽이 지면을 벗어납니다. 문장·지면 설정을 확인해 주세요.",
      ),
    );
    await expect(
      confirmExamReport(
        session,
        testId,
        studentId,
        { expectedRevision: 0 },
        "https://math.example.test",
      ),
    ).rejects.toMatchObject({ status: 422 });
    expect(m.upload).not.toHaveBeenCalled();
    expect(world.artifacts).toHaveLength(0);
  });
  it("업로드 뒤 권한이 바뀌면 보관본·확정이 남지 않고 파일 경로만 기록한다", async () => {
    const denied = new Error("반 권한 변경");
    denied.name = "ClassAccessDenied";
    m.assertWrite
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(denied);
    await expect(
      confirmExamReport(
        session,
        testId,
        studentId,
        { expectedRevision: 0 },
        "https://math.example.test",
      ),
    ).rejects.toThrow("반 권한 변경");
    expect(world.artifacts).toHaveLength(0);
    expect(world.drafts[0].state).toBe("draft");
    expect(m.noteLog).toHaveBeenCalled();
  });
  it("확정 PDF는 보관 바이트를 주며 읽는 동안 재채점되면 거절한다", async () => {
    await confirmExamReport(
      session,
      testId,
      studentId,
      { expectedRevision: 0 },
      "https://math.example.test",
    );
    expect(
      await readConfirmedExamReportPdf(session, testId, studentId),
    ).toEqual(pdf);
    m.read.mockImplementationOnce(async () => {
      world.results[0].answers[0].isCorrect = true;
      return pdf;
    });
    await expect(
      readConfirmedExamReportPdf(session, testId, studentId),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("확정된 학생은 보관 PDF, 전원 범위의 미확정 학생은 현재 내용으로 만들어 한 파일로 합친다", async () => {
    await confirmExamReport(
      session,
      testId,
      studentId,
      { expectedRevision: 0 },
      "https://math.example.test",
    );
    const second = reportId(66);
    world.students.push({ ...world.students[0], id: second, name: "둘째" });
    world.results.push({
      ...world.results[0],
      id: reportId(77),
      studentId: second,
    });
    m.buildPdf.mockClear();
    m.read.mockClear();
    let bytes = await printExamReports(
      session,
      testId,
      { scope: "confirmed", kind: "students" },
      "https://math.example.test",
    );
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
    expect(m.buildPdf).not.toHaveBeenCalled();
    bytes = await printExamReports(
      session,
      testId,
      { scope: "all", kind: "students" },
      "https://math.example.test",
    );
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2);
    expect(m.buildPdf).toHaveBeenCalledTimes(1);
    expect(m.read).toHaveBeenCalledTimes(2);
    await printExamReports(
      session,
      testId,
      { scope: "all", kind: "class" },
      "https://math.example.test",
    );
    expect(m.buildPdf.mock.calls.at(-1)![0]).toMatchObject({ landscape: true });
  });
});
