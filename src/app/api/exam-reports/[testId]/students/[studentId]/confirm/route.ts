import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { examReportHttp } from "@/lib/examReport/http";

export const runtime = "nodejs";
export const maxDuration = 300;
type Context = { params: Promise<{ testId: string; studentId: string }> };
async function handlePOST(request: Request, { params }: Context) {
  return examReportHttp(request, await params, "confirm");
}
export const POST = withErrorLog(
  "/api/exam-reports/[testId]/students/[studentId]/confirm",
  handlePOST,
);
