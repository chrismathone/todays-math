import { createExamReportFeed } from "@/lib/eywa/managedExamReports";
import {
  verifyExamReportReceiver,
  examReportReceiverFailure,
  recheckExamReportBinding,
} from "@/lib/eywa/examReportReceiver";
import { unavailableExamReportSource } from "@/lib/examReport/confirmedSource";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

export const runtime = "nodejs";
/** 목록의 지문을 서명 질의에 넣어 보관된 PDF 한 파일을 받는다. 현재는 보관본이 없어 404다. */
async function get(
  request: Request,
  context: {
    params: Promise<{
      date: string;
      publicationId: string;
      sourceStudentId: string;
    }>;
  },
) {
  try {
    const binding = await verifyExamReportReceiver(request);
    const { date, publicationId, sourceStudentId } = await context.params;
    const digest = new URL(request.url).searchParams.get("sha256") ?? "";
    const bytes = await createExamReportFeed(unavailableExamReportSource).pdf(
      binding,
      date,
      publicationId,
      sourceStudentId,
      digest,
    );
    await recheckExamReportBinding(binding);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="exam-report.pdf"',
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return examReportReceiverFailure(error);
  }
}
export const GET = withErrorLog(
  "/api/integrations/eywa/v2/exam-reports/[date]/[publicationId]/[sourceStudentId]",
  get,
);
