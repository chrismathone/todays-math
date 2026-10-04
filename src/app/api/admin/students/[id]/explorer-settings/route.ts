import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { handleExplorerTeacherSettings } from "@/lib/math-explorers/teacherSettingsRoutes";
export const GET = withErrorLog(
  "/api/admin/students/[id]/explorer-settings",
  handleExplorerTeacherSettings,
);
export const POST = withErrorLog(
  "/api/admin/students/[id]/explorer-settings",
  handleExplorerTeacherSettings,
);
