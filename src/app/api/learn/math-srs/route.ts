import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { handleSrsStudentRequest } from "@/lib/math-srs/serverRoutes";

async function handleGet(request: Request) {
  return handleSrsStudentRequest(request, "read");
}
async function handlePost(request: Request) {
  return handleSrsStudentRequest(request, "start");
}
export const GET = withErrorLog("/api/learn/math-srs", handleGet);
export const POST = withErrorLog("/api/learn/math-srs", handlePost);
