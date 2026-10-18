import { createExamReportFeed } from "@/lib/eywa/managedExamReports";
import {
  verifyExamReportReceiver,
  examReportReceiverFailure,
} from "@/lib/eywa/examReportReceiver";
import { unavailableExamReportSource } from "@/lib/examReport/confirmedSource";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

export const runtime = "nodejs";
/** 시험일 기준 확정된 학생 성적표만. DB 미적용인 현재 기본은 빈 목록이다. */
async function get(
  request: Request,
  context: { params: Promise<{ date: string }> },
) {
  try {
    const binding = await verifyExamReportReceiver(request);
    const { date } = await context.params;
    return Response.json(
      await createExamReportFeed(unavailableExamReportSource).day(
        binding,
        date,
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return examReportReceiverFailure(error);
  }
}
export const GET = withErrorLog(
  "/api/integrations/eywa/v2/exam-reports/[date]",
  get,
);
