import "server-only";
import type {
  ExamReportArtifact,
  ExamReportDraft,
  Prisma,
} from "@prisma/client";
import {
  examReportOptionsSchema,
  type ExamReportSummary,
  type ExamReportOptions,
} from "@/contracts/examReportWorkspace.contract";
import {
  examReportSnapshotSchema,
  confirmedExamReportArtifactSchema,
  type ExamReportSnapshot,
} from "@/contracts/eywaExamReport.contract";
import type { StudentExamReport } from "@/contracts/examReport.contract";
import { studentsInClassWhere } from "@/lib/classAccess";
import { db } from "@/lib/db";
import { canonicalHash } from "@/lib/textbook/hash.server";
import { examReportSnapshotDigest } from "@/lib/eywa/managedExamReports";
import { buildStudentExamReport, buildClassExamReport } from "./build";
import { loadExamReportProblems } from "./problems";
import { EXAM_REPORT_LAYOUT_VERSION } from "./settings";

type Draft = ExamReportDraft & {
  confirmedArtifact: ExamReportArtifact | null;
  artifacts: ExamReportArtifact[];
};
export class ExamReportError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ExamReportError";
  }
}
export const reportConflict = () =>
  new ExamReportError(
    409,
    "내용이 그사이 바뀌었습니다. 입력을 보관한 채 최신 기록을 다시 확인해 주세요.",
  );
export function reportSnapshot(
  report: StudentExamReport,
  options: ExamReportOptions,
  rollup: { averageScore: number | null; gradedCount: number },
): ExamReportSnapshot | null {
  if (report.status !== "graded") return null;
  return examReportSnapshotSchema.parse({
    report,
    options,
    layoutVersion: EXAM_REPORT_LAYOUT_VERSION,
    classComparison:
      options.classAverage && rollup.averageScore !== null
        ? { averageScore: rollup.averageScore, gradedCount: rollup.gradedCount }
        : null,
  });
}
export function reportSummary(
  report: StudentExamReport,
  draft: Draft | undefined,
  snapshot: ExamReportSnapshot | null,
): ExamReportSummary {
  const latest = draft?.artifacts[0] ?? draft?.confirmedArtifact;
  const confirmed =
    draft?.state === "confirmed" &&
    draft.confirmedArtifact &&
    snapshot &&
    draft.confirmedArtifact.sourceDigest === examReportSnapshotDigest(snapshot);
  return {
    student: report.student,
    gradingStatus: report.status,
    score: report.score,
    wrongCount: report.wrongQuestions.length,
    teacherNote: report.teacherNote,
    revision: draft?.revision ?? 0,
    status:
      report.status !== "graded"
        ? report.status
        : confirmed
          ? "confirmed"
          : latest
            ? "stale"
            : report.teacherNote.trim()
              ? "draft"
              : "none",
    confirmedAt: latest?.confirmedAt.toISOString() ?? null,
  };
}
export function archivedArtifact(row: ExamReportArtifact) {
  return confirmedExamReportArtifactSchema.parse({
    id: row.id,
    state: "confirmed",
    confirmedAt: row.confirmedAt.toISOString(),
    snapshot: row.snapshot,
    sourceDigest: row.sourceDigest,
    pdfSha256: row.pdfSha256,
    pdfSize: row.pdfSize,
  });
}

/** 호출자가 권한을 먼저 검사한다. 재조회도 같은 계산과 거래 클라이언트를 쓴다. */
export async function loadExamReportContext(
  testId: string,
  client: Prisma.TransactionClient = db,
) {
  const test = await client.test.findUnique({
    where: { id: testId },
    include: { publication: true, class: true },
  });
  if (
    !test?.publication ||
    test.predictionRunId ||
    !["confirmed", "printed"].includes(test.status)
  )
    throw new ExamReportError(404, "낸 시험을 찾지 못했습니다.");
  const [students, problems, results, drafts] = await Promise.all([
    client.student.findMany({
      where: studentsInClassWhere(test.classId),
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    loadExamReportProblems(testId, client),
    client.testResult.findMany({
      where: { testId },
      include: { answers: true },
    }),
    client.examReportDraft.findMany({
      where: { testId },
      include: {
        confirmedArtifact: true,
        artifacts: { orderBy: { revision: "desc" }, take: 1 },
      },
      orderBy: { id: "asc" },
    }),
  ]);
  const options = examReportOptionsSchema.parse(drafts[0]?.options ?? {});
  // 한 반의 설정은 한 벌이다. 일부 행의 설정이 다르면 조용히 한쪽을 택하지 않는다.
  if (
    drafts.some(
      (draft) =>
        canonicalHash(examReportOptionsSchema.parse(draft.options)) !==
        canonicalHash(options),
    )
  )
    throw reportConflict();
  const input = {
    publication: {
      id: test.publication.id,
      title: test.publication.title,
      testDate: test.publication.testDate.toISOString().slice(0, 10),
    },
    test: {
      id: test.id,
      publicationId: test.publicationId,
      classId: test.classId,
      className: test.class.name,
    },
    problems,
    results: results.map((r) => ({ ...r, takenAt: r.takenAt.toISOString() })),
  };
  const classReport = buildClassExamReport({
    ...input,
    students: students.map(({ id, name }) => ({ id, name })),
  });
  const entries = students.map((student) => {
    const draft = drafts.find((row) => row.studentId === student.id);
    const report = buildStudentExamReport({
      ...input,
      student: { id: student.id, name: student.name },
      teacherNote: draft?.teacherNote,
    });
    const snapshot = reportSnapshot(report, options, classReport.rollup);
    return {
      student,
      draft,
      report,
      snapshot,
      summary: reportSummary(report, draft, snapshot),
    };
  });
  return {
    test,
    drafts,
    options,
    optionsDigest: canonicalHash(options),
    classReport,
    entries,
  };
}
export type ExamReportContext = Awaited<
  ReturnType<typeof loadExamReportContext>
>;
export function reportEntry(context: ExamReportContext, studentId: string) {
  const entry = context.entries.find((row) => row.student.id === studentId);
  if (!entry) throw new ExamReportError(404, "이 반의 학생을 찾지 못했습니다.");
  return entry;
}
export function reportStudentData(
  context: ExamReportContext,
  studentId: string,
) {
  const { report, summary } = reportEntry(context, studentId);
  return {
    report,
    summary,
    options: context.options,
    classComparison: context.options.classAverage
      ? {
          averageScore: context.classReport.rollup.averageScore,
          gradedCount: context.classReport.rollup.gradedCount,
        }
      : null,
  };
}
export function reportListData(context: ExamReportContext) {
  return {
    classReport: context.classReport,
    options: context.options,
    optionsDigest: context.optionsDigest,
    students: context.entries.map((row) => row.summary),
  };
}
export function paperOptions(snapshot: ExamReportSnapshot) {
  const options = examReportOptionsSchema.parse(snapshot.options);
  return {
    mode: "S1" as const,
    wrong: options.wrongQuestions,
    retry: options.retries,
    note: options.teacherNote && Boolean(snapshot.report.teacherNote.trim()),
    average: options.classAverage ? snapshot.classComparison : null,
  };
}
