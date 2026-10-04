import type { NextRequest } from "next/server";
import { idParamSchema } from "@/contracts/common.contract";
import { bulkStudentAccountResponseSchema } from "@/contracts/bulkStudentAccount.contract";
import { sameOriginMutation } from "@/lib/accountAccess";
import {
  jsonError,
  jsonOk,
  notFoundError,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";
import { getSessionUser } from "@/lib/session";
import { canManageStudentAccounts } from "@/lib/learn/studentAccountPolicy";
import {
  BulkStudentAccountError,
  bulkStudentAccounts,
} from "@/lib/learn/bulkStudentAccounts";
import { crossSiteError, noStore } from "@/lib/learn/accountRoutes";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

type Context = { params: Promise<{ id: string }> };
async function handle(
  request: NextRequest,
  { params }: Context,
  issue: boolean,
) {
  const viewer = await getSessionUser();
  if (!viewer) return unauthorizedError();
  if (!canManageStudentAccounts(viewer))
    return jsonError(
      "FORBIDDEN",
      "학생 계정은 지점 관리자 이상만 발급할 수 있습니다.",
      403,
    );
  if (issue && !sameOriginMutation(request)) return crossSiteError();
  const { id } = await params;
  const parsed = idParamSchema.safeParse({ id });
  if (!parsed.success) return validationError(parsed.error);
  try {
    const data = await bulkStudentAccounts(viewer, id, issue);
    return noStore(jsonOk(bulkStudentAccountResponseSchema, { data }));
  } catch (error) {
    if (!(error instanceof BulkStudentAccountError)) throw error;
    if (error.reason === "not_found") return notFoundError("반");
    if (error.reason === "forbidden")
      return jsonError(
        "FORBIDDEN",
        "소속 지점의 학생 계정만 관리할 수 있습니다.",
        403,
      );
    if (error.reason === "inactive")
      return jsonError(
        "CONFLICT",
        "현재 운영 중인 반에서만 학생 계정을 생성할 수 있습니다.",
        409,
      );
    return jsonError(
      "CONFLICT",
      "연동 상태를 확인하지 못했습니다. 동기화 후 다시 시도해 주세요.",
      409,
    );
  }
}
export const GET = withErrorLog(
  "/api/classes/[id]/student-accounts",
  (request, context: Context) => handle(request, context, false),
);
export const POST = withErrorLog(
  "/api/classes/[id]/student-accounts",
  (request, context: Context) => handle(request, context, true),
);
