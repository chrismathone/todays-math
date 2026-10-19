import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { handleCourseStudentRequest } from "@/lib/math-srs/courseRoutes";
async function handlePost(request: Request) {
  return handleCourseStudentRequest(request, "follow-up");
}
export const POST = withErrorLog(
  "/api/learn/math-srs/course/follow-up",
  handlePost,
);
