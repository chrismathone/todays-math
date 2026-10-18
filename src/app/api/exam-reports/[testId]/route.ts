import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { examReportHttp } from "@/lib/examReport/http";

export const runtime = "nodejs";
export const maxDuration = 300;
type Context = { params: Promise<{ testId: string }> };
async function handleGET(request: Request, { params }: Context) {
  return examReportHttp(request, await params, "list");
}
export const GET = withErrorLog("/api/exam-reports/[testId]", handleGET);
