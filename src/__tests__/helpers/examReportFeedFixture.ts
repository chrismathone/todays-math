import type { StudentExamReport } from "@/contracts/examReport.contract";
import type { ExamReportCandidate } from "@/lib/eywa/managedExamReports";
import { examReportSnapshotDigest } from "@/lib/eywa/managedExamReports";
import { sha256 } from "@/lib/textbook/hash.server";

export const reportId = (n: number) =>
  `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
export const reportBinding = { id: reportId(1), targetBranchId: reportId(2) };
// 전송 시험용 바이트. 실제 지면 렌더 또는 유효한 PDF 문서 검증을 주장하지 않는다.
export const reportPdf = new TextEncoder().encode(
  "%PDF-1.4\nfixture transport bytes\n%%EOF",
);
export function reportCandidate(): ExamReportCandidate {
  const question = {
    problemId: reportId(8),
    no: 1,
    content: "x + 3 = 10의 해를 구하시오.",
    answer: "x = 7",
    solution: "양변에서 3을 뺍니다.",
    questionType: "short-answer",
    figureUrls: [],
    figureSvg: null,
    unitName: "일차방정식",
    typeLabel: "계산",
    isCorrect: false,
  };
  const report: StudentExamReport = {
    publication: {
      id: reportId(3),
      title: "10월 월말평가",
      testDate: "2026-10-24",
    },
    testId: reportId(4),
    classId: reportId(5),
    className: "가람반",
    student: { id: reportId(6), name: "서하린" },
    resultId: reportId(7),
    takenAt: "2026-10-24T04:00:00.000Z",
    status: "graded",
    score: { value: 0, maximum: 1, unit: "questions", storedValue: 0 },
    correctCount: 0,
    questionCount: 1,
    questions: [question],
    wrongQuestions: [question],
    teacherNote: "양변에 같은 수를 더하고 빼 보세요.",
    retries: [],
  };
  const snapshot = {
    report,
    layoutVersion: "fixture-layout-v1",
    options: {
      format: "M1" as const,
      wrongQuestions: true,
      retries: true,
      teacherNote: true,
    },
  };
  return {
    publicationBranchId: reportBinding.targetBranchId,
    test: {
      id: report.testId,
      publicationId: report.publication.id,
      predictionRunId: null,
      status: "confirmed",
      classId: report.classId,
      eywaBindingId: reportBinding.id,
      branchId: reportBinding.targetBranchId,
    },
    student: {
      id: report.student.id,
      eywaStudentId: "eywa-student-1",
      eywaBindingId: reportBinding.id,
      branchId: reportBinding.targetBranchId,
      isTest: false,
    },
    current: structuredClone(snapshot),
    confirmation: {
      id: reportId(9),
      state: "confirmed",
      confirmedAt: "2026-10-24T05:00:00.000Z",
      snapshot: structuredClone(snapshot),
      sourceDigest: examReportSnapshotDigest(snapshot),
      pdfSha256: sha256(reportPdf),
      pdfSize: reportPdf.byteLength,
    },
  };
}
