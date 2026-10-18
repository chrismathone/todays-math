import "server-only";
import type { ExamReportSource } from "@/lib/eywa/managedExamReports";

/**
 * DB 초안 미적용·지면 미선택: 확정본은 없다. Prisma에 없는 모델을 추측하거나
 * 일반 채점 기록을 확정본으로 승격하지 않는다. DB 승인·적용 뒤 별도 어댑터로 교체한다.
 * 이 모듈은 DB도 PDF 생성기도 불러오지 않는다.
 */
export const unavailableExamReportSource: ExamReportSource = {
  readDay: async () => ({ availability: "not-installed", candidates: [] }),
  readPdf: async () => null,
};
