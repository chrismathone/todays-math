import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { handleCourseFigure } from "@/lib/math-srs/courseRoutes";
export const GET = withErrorLog(
  "/api/learn/math-srs/course/figure",
  handleCourseFigure,
);
