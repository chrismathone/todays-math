/**
 * POST /api/students/{id}/account/password — 학생 비밀번호 **다시 발급** (브리프 §2.3 «다시 발급은 비밀번호만 새로»).
 *
 * 새 초기 비밀번호(숫자 4자리 — D-125 ⑶)를 뽑아 해시만 저장하고 **이 응답에 한 번만** 싣는다(캐시 금지).
 * 첫 로그인 표시를 다시 세우고 잠금을 푼다 — 이미 로그인해 있던 기기는 다음 요청부터 비밀번호 바꾸기
 * 화면에만 갇힌다(관문이 요청마다 계정을 다시 읽는다). 그 학생의 반이 이 원장의 소유 범위 안이어야 한다(관리자는 넘는다 — D-130).
 * 대응 계약: src/contracts/studentAccount.contract.ts · 규칙: src/lib/learn/issueStudentAccount.ts
 */
import type { NextRequest } from "next/server";

import { idParamSchema } from "@/contracts/common.contract";
import { studentAccountIssueResponseSchema } from "@/contracts/studentAccount.contract";
import { sameOriginMutation } from "@/lib/accountAccess";
import { jsonOk, unauthorizedError, validationError } from "@/lib/apiResponse";
import {
  crossSiteError,
  issueFailureResponse,
  noStore,
} from "@/lib/learn/accountRoutes";
import { studentIssueDeps } from "@/lib/learn/issueDeps";
import { reissueStudentPassword } from "@/lib/learn/issueStudentAccount";
import { getSessionUser } from "@/lib/session";
import { canManageRoster } from "@/lib/ownerScope";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

type RouteContext = { params: Promise<{ id: string }> };

async function handlePost(request: NextRequest, { params }: RouteContext) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();
  if (!canManageRoster(session))
    return Response.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "학생 비밀번호는 지점 관리자만 재발급할 수 있습니다.",
        },
      },
      { status: 403 },
    );
  if (!sameOriginMutation(request)) return crossSiteError();

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success) return validationError(idResult.error);

  const result = await reissueStudentPassword(studentIssueDeps(), {
    director: session,
    studentId: id,
  });
  if (!result.ok) return issueFailureResponse(result.reason);

  const { account, initialPassword } = result.value;
  return noStore(
    jsonOk(studentAccountIssueResponseSchema, {
      data: {
        studentId: account.studentId,
        loginId: account.loginId,
        initialPassword,
        mustChangePassword: true,
        issuedAt: account.issuedAt.toISOString(),
      },
    }),
  );
}

export const POST = withErrorLog(
  "/api/students/[id]/account/password",
  handlePost,
);
