/**
 * POST /api/learn/logout — 학생 로그아웃. 세션 쿠키를 지우고 학생 로그인 화면(`/learn/login`)으로 가라고 한다.
 * 원장님 로그아웃(서버 액션 `signOutAction` → `/login`)과 따로다(D-125 ⑷ — 섞지 않는다).
 * 대응 계약: src/contracts/studentAccount.contract.ts `studentLogoutResponseSchema`
 */
import type { NextRequest } from "next/server";

import { studentLogoutResponseSchema } from "@/contracts/studentAccount.contract";
import { sameOriginMutation } from "@/lib/accountAccess";
import { jsonOk, unauthorizedError } from "@/lib/apiResponse";
import { recordAudit } from "@/lib/audit";
import { signOut } from "@/lib/auth";
import { crossSiteError } from "@/lib/learn/accountRoutes";
import { getStudentSession } from "@/lib/learn/studentRequest";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

async function handlePost(request: NextRequest) {
  const student = await getStudentSession();
  if (!student) return unauthorizedError();
  if (!sameOriginMutation(request)) return crossSiteError();

  await signOut({ redirect: false });
  await recordAudit({
    action: "student_auth.logout",
    outcome: "success",
    details: {
      studentAccountId: student.accountId,
      studentId: student.studentId,
    },
  });
  return jsonOk(studentLogoutResponseSchema, {
    data: { redirectTo: "/learn/login" },
  });
}

export const POST = withErrorLog("/api/learn/logout", handlePost);
