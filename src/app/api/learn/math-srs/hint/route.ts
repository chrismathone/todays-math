import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { handleSrsStudentRequest } from "@/lib/math-srs/serverRoutes";

async function handlePost(request: Request) {
  return handleSrsStudentRequest(request, "hint");
}
export const POST = withErrorLog("/api/learn/math-srs/hint", handlePost);
