/**
 * GET /api/students/{id}/math-srs/fading — «오늘의 기억» 교사 현황(학생 하나).
 * PUT /api/students/{id}/math-srs/fading — 다음 한국 날짜부터의 하루 분량(원장 · 지점 관리자).
 * 대응 계약: src/contracts/fadingTeacher.contract.ts `fadingTeacherStudentResponseSchema` · `fadingTeacherQuotaInputSchema` · `fadingTeacherQuotaResponseSchema`
 */
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import {
  handleFadingTeacherQuota,
  handleFadingTeacherStudent,
} from "@/lib/fading/teacherRoutes";

export const GET = withErrorLog(
  "/api/students/[id]/math-srs/fading",
  handleFadingTeacherStudent,
);
export const PUT = withErrorLog(
  "/api/students/[id]/math-srs/fading",
  handleFadingTeacherQuota,
);
