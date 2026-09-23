import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { handleCourseStudentRequest } from "@/lib/math-srs/courseRoutes";
async function handleGet(request: Request) {
  return handleCourseStudentRequest(request, "read");
}
export const GET = withErrorLog("/api/learn/math-srs/course", handleGet);
async function handlePost(request: Request) {
  return handleCourseStudentRequest(request, "start");
}
export const POST = withErrorLog("/api/learn/math-srs/course", handlePost);
