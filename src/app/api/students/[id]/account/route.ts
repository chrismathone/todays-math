/**
 * GET/POST/PATCH /api/students/{id}/account — 학생 로그인 계정 상태 · 발급 · 끄기/켜기
 * (D-124 ⑶⑷ · D-125 ⑵ — 원장님이 한 명씩, 아이디는 직접 적는다).
 *
 * 대응 계약: src/contracts/studentAccount.contract.ts · 규칙: src/lib/learn/issueStudentAccount.ts
 * 🔴 초기 비밀번호는 발급 응답에 **한 번만** 싣고(캐시 금지) 서버에는 해시만 남긴다.
 * 🔴 그 학생의 반이 이 원장의 소유 범위 안이어야 한다 — 없으면 404, 남의 반이면 403. 관리자는 넘는다(D-130).
 * 원장·관리자와 **담당 강사**가 쓴다(D-140 — 강사는 자기 반 학생만. 판정 `canManageClassStudents` + 소유 범위).
 * 학생 세션에는 `user` 가 없어 `getSessionUser()` 가 null(401). 관문도 학생을 막는다.
 * GET 은 발급 칸(«수업 · 학생 관리 › 학생»)이 읽는다 — 계정이 없어도 퇴원 여부를 준다(learn-screens 브리프 §1.3).
 */
import type { NextRequest } from "next/server";

import { idParamSchema } from "@/contracts/common.contract";
import {
  studentAccountIssueRequestSchema,
  studentAccountIssueResponseSchema,
  studentAccountPanelResponseSchema,
  studentAccountStatusResponseSchema,
  studentAccountUpdateRequestSchema,
} from "@/contracts/studentAccount.contract";
import { sameOriginMutation } from "@/lib/accountAccess";
import { jsonOk, unauthorizedError, validationError } from "@/lib/apiResponse";
import {
  crossSiteError,
  issueFailureResponse,
  noStore,
} from "@/lib/learn/accountRoutes";
import { studentIssueDeps } from "@/lib/learn/issueDeps";
import {
  issueStudentAccount,
  readStudentAccount,
  setStudentAccountDisabled,
  toAccountStatus,
} from "@/lib/learn/issueStudentAccount";
import { getSessionUser } from "@/lib/session";
import { canManageClassStudents } from "@/lib/ownerScope";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

type RouteContext = { params: Promise<{ id: string }> };

// GET — 발급 칸: 퇴원 여부 + 계정 상태(없으면 account: null)
async function handleGet(_request: NextRequest, { params }: RouteContext) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success) return validationError(idResult.error);

  const result = await readStudentAccount(studentIssueDeps(), {
    director: session,
    studentId: id,
  });
  if (!result.ok) return issueFailureResponse(result.reason);
  const { account, withdrawn } = result.value;
  return jsonOk(studentAccountPanelResponseSchema, {
    data: {
      withdrawn,
      account: account
        ? toAccountStatus(account, new Date(), session.id)
        : null,
    },
  });
}

// POST — 발급
async function handlePost(request: NextRequest, { params }: RouteContext) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();
  if (!canManageClassStudents(session))
    return Response.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "학생 계정은 지점 관리자만 발급할 수 있습니다.",
        },
      },
      { status: 403 },
    );
  if (!sameOriginMutation(request)) return crossSiteError();

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success) return validationError(idResult.error);

  const body = await request.json().catch(() => undefined);
  const parsed = studentAccountIssueRequestSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const result = await issueStudentAccount(studentIssueDeps(), {
    director: session,
    studentId: id,
    loginId: parsed.data.loginId,
  });
  if (!result.ok) return issueFailureResponse(result.reason);

  const { account, initialPassword } = result.value;
  return noStore(
    jsonOk(
      studentAccountIssueResponseSchema,
      {
        data: {
          studentId: account.studentId,
          loginId: account.loginId,
          initialPassword,
          mustChangePassword: true,
          issuedAt: account.issuedAt.toISOString(),
        },
      },
      { status: 201 },
    ),
  );
}

// PATCH — 끄기 · 켜기 (`disabledAt` 만 — 지우지 않는다)
async function handlePatch(request: NextRequest, { params }: RouteContext) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();
  if (!canManageClassStudents(session))
    return Response.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "학생 계정은 지점 관리자만 변경할 수 있습니다.",
        },
      },
      { status: 403 },
    );
  if (!sameOriginMutation(request)) return crossSiteError();

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success) return validationError(idResult.error);

  const body = await request.json().catch(() => undefined);
  const parsed = studentAccountUpdateRequestSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const result = await setStudentAccountDisabled(studentIssueDeps(), {
    director: session,
    studentId: id,
    disabled: parsed.data.disabled,
  });
  if (!result.ok) return issueFailureResponse(result.reason);
  return jsonOk(studentAccountStatusResponseSchema, {
    data: toAccountStatus(result.value, new Date(), session.id),
  });
}

export const GET = withErrorLog("/api/students/[id]/account", handleGet);
export const POST = withErrorLog("/api/students/[id]/account", handlePost);
export const PATCH = withErrorLog("/api/students/[id]/account", handlePatch);
