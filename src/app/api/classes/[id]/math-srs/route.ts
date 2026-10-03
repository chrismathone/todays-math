import { idParamSchema } from "@/contracts/common.contract";
import { mathSrsClassResponseSchema } from "@/contracts/mathSrs.contract";
import { authorizeAccount } from "@/lib/accountAccess";
import { accountRouteAllowed } from "@/lib/accountRouteAccess";
import { routeAccessFor } from "@/lib/routeAccess";
import { jsonError, jsonOk, validationError } from "@/lib/apiResponse";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { noStore } from "@/lib/learn/accountRoutes";
import { requireOwnedClass } from "@/lib/ownership";
import { loadSrsClassDashboard } from "@/lib/math-srs/serverContext";
import { srsFailureResponse } from "@/lib/math-srs/serverRoutes";

async function handleGet(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await authorizeAccount(request);
  if (access.response) return noStore(access.response);
  const path = new URL(request.url).pathname;
  if (
    !accountRouteAllowed(access.account, "GET", path) ||
    (!access.account.isAdmin &&
      routeAccessFor(access.account.role, "GET", path) === "deny")
  )
    return noStore(
      jsonError("FORBIDDEN", "수업 · 학생 관리 권한이 필요합니다.", 403),
    );
  const parsed = idParamSchema.safeParse(await params);
  if (!parsed.success) return noStore(validationError(parsed.error));
  const owned = await requireOwnedClass(
    parsed.data.id,
    access.account,
    "progress:read",
  );
  if (!owned.ok) return noStore(owned.response);
  try {
    const dashboard = await loadSrsClassDashboard(owned.data, new Date());
    return noStore(jsonOk(mathSrsClassResponseSchema, { data: dashboard }));
  } catch (error) {
    return srsFailureResponse(error);
  }
}
export const GET = withErrorLog("/api/classes/[id]/math-srs", handleGet);
