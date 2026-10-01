import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { handleExplorerTeacherStudent } from "@/lib/math-explorers/teacherRoutes";
export const GET = withErrorLog(
  "/api/students/[id]/math-srs/explorers",
  handleExplorerTeacherStudent,
);
