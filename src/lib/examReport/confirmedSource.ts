import "server-only";
import type { ExamReportSource } from "@/lib/eywa/managedExamReports";

/** 닫힌 통로의 기본. DB·저장소를 읽지 않는다. */
export const unavailableExamReportSource: ExamReportSource = {
  readDay: async () => ({ availability: "not-installed", candidates: [] }),
  readPdf: async () => null,
};

/** 리드만 켠다. 첫 연동 대상은 원장님이 정한 «학원이» 한 명으로 제한한다. */
export const confirmedExamReportSource: ExamReportSource = {
  async readDay(binding, date) {
    if (process.env.EXAM_REPORT_EYWA_FEED !== "on")
      return unavailableExamReportSource.readDay(binding, date);
    const { db } = await import("@/lib/db");
    const { archivedArtifact, loadExamReportContext } = await import("./read");
    const tests = await db.test.findMany({
      where: {
        predictionRunId: null,
        status: { in: ["confirmed", "printed"] },
        publication: {
          testDate: new Date(`${date}T00:00:00.000Z`),
          branchId: binding.targetBranchId,
        },
        class: { eywaBindingId: binding.id, branchId: binding.targetBranchId },
      },
      select: { id: true },
    });
    const candidates = [];
    for (const row of tests) {
      const context = await loadExamReportContext(row.id);
      for (const entry of context.entries) {
        if (
          entry.student.name !== "학원이" ||
          entry.summary.status !== "confirmed" ||
          !entry.snapshot ||
          !entry.draft?.confirmedArtifact
        )
          continue;
        candidates.push({
          publicationBranchId: context.test.publication!.branchId,
          test: {
            id: row.id,
            publicationId: context.test.publicationId,
            predictionRunId: context.test.predictionRunId,
            status: context.test.status,
            classId: context.test.classId,
            sourceClassId: context.test.class.eywaClassId,
            eywaBindingId: context.test.class.eywaBindingId,
            branchId: context.test.class.branchId,
          },
          student: {
            id: entry.student.id,
            eywaStudentId: entry.student.eywaStudentId,
            eywaBindingId: entry.student.eywaBindingId,
            branchId: entry.student.branchId,
            isTest: entry.student.isTest,
          },
          current: entry.snapshot,
          confirmation: archivedArtifact(entry.draft.confirmedArtifact),
        });
      }
    }
    return { availability: "ready", candidates };
  },
  async readPdf(artifactId) {
    if (process.env.EXAM_REPORT_EYWA_FEED !== "on") return null;
    const { db } = await import("@/lib/db");
    const { examReportStorage } = await import("./storage");
    const row = await db.examReportArtifact.findUnique({
      where: { id: artifactId },
    });
    return row
      ? examReportStorage().read({
          path: row.pdfPath,
          size: row.pdfSize,
          sha256: row.pdfSha256,
        })
      : null;
  },
};
