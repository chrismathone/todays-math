import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { resolveExamStudy } from "@/lib/examStudyRoutes";

export const runtime = "nodejs";
export const maxDuration = 60;
export const POST = withErrorLog(
  "/api/exam/practice/resolve",
  resolveExamStudy,
);
