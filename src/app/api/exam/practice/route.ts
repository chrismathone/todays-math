import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { createExamStudy, examStudyCatalog } from "@/lib/examStudyRoutes";

export const runtime = "nodejs";
export const maxDuration = 60;
export const GET = withErrorLog("/api/exam/practice", examStudyCatalog);
export const POST = withErrorLog("/api/exam/practice", createExamStudy);
