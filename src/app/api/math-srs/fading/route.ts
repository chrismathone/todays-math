/**
 * GET /api/math-srs/fading — «오늘의 기억» 교사 현황(반 · 학생별).
 * 대응 계약: src/contracts/fadingTeacher.contract.ts `fadingTeacherDashboardResponseSchema`
 */
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { handleFadingTeacherDashboard } from "@/lib/fading/teacherRoutes";

export const GET = withErrorLog(
  "/api/math-srs/fading",
  handleFadingTeacherDashboard,
);
