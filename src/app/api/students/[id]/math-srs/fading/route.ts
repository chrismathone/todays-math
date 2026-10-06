/**
 * GET /api/students/{id}/math-srs/fading — «오늘의 기억» 교사 현황(학생 하나).
 * 대응 계약: src/contracts/fadingTeacher.contract.ts `fadingTeacherStudentResponseSchema`
 */
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { handleFadingTeacherStudent } from "@/lib/fading/teacherRoutes";

export const GET = withErrorLog(
  "/api/students/[id]/math-srs/fading",
  handleFadingTeacherStudent,
);
