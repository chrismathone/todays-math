import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { handleInsightRequest } from "@/lib/math-insight/routes";
export const GET = withErrorLog(
  "/api/students/[id]/math-srs/insight",
  handleInsightRequest,
);
export const POST = withErrorLog(
  "/api/students/[id]/math-srs/insight",
  handleInsightRequest,
);
