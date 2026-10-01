import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { handleExplorerTeacherClass } from "@/lib/math-explorers/teacherRoutes";
export const GET = withErrorLog(
  "/api/classes/[id]/math-srs/explorers",
  handleExplorerTeacherClass,
);
