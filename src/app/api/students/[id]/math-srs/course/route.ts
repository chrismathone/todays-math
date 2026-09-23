import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { handleCourseTeacherStudent } from "@/lib/math-srs/courseTeacherRoutes";
export const GET = withErrorLog(
  "/api/students/[id]/math-srs/course",
  handleCourseTeacherStudent,
);
export const POST = withErrorLog(
  "/api/students/[id]/math-srs/course",
  handleCourseTeacherStudent,
);
