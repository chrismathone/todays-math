import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { handleCourseDashboard } from "@/lib/math-srs/courseTeacherRoutes";
export const GET = withErrorLog("/api/math-srs/course", handleCourseDashboard);
