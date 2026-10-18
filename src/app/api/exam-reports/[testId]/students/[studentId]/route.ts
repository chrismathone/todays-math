import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { examReportHttp } from "@/lib/examReport/http";

export const runtime = "nodejs";
export const maxDuration = 300;
type Context = { params: Promise<{ testId: string; studentId: string }> };
async function handleGET(request: Request, { params }: Context) {
  return examReportHttp(request, await params, "student");
}
export const GET = withErrorLog(
  "/api/exam-reports/[testId]/students/[studentId]",
  handleGET,
);

async function handlePUT(request: Request, { params }: Context) {
  return examReportHttp(request, await params, "note");
}
export const PUT = withErrorLog(
  "/api/exam-reports/[testId]/students/[studentId]",
  handlePUT,
);
