import { z } from "zod";
import { authorizeAccount } from "@/lib/accountAccess";
import { accountRouteAllowed } from "@/lib/accountRouteAccess";
import { jsonError, validationError } from "@/lib/apiResponse";
import { getConceptBlankGradeBank } from "@/lib/concept-blank/bank/runtime";
import { CONCEPT_BLANK_GRADES } from "@/lib/concept-blank/sections";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { noStore } from "@/lib/learn/accountRoutes";
import { routeAccessFor } from "@/lib/routeAccess";

export const GET = withErrorLog(
  "/api/concept-blank/bank",
  async (request: Request) => {
    const access = await authorizeAccount(request);
    if (access.response) return noStore(access.response);
    const url = new URL(request.url);
    if (
      !accountRouteAllowed(access.account, request.method, url.pathname) ||
      (!access.account.isAdmin &&
        routeAccessFor(access.account.role, request.method, url.pathname) ===
          "deny")
    )
      return noStore(
        jsonError("FORBIDDEN", "개념 백지 메뉴를 사용할 권한이 없습니다.", 403),
      );
    const grade = z
      .enum(CONCEPT_BLANK_GRADES)
      .safeParse(url.searchParams.get("grade"));
    if (!grade.success) return noStore(validationError(grade.error));
    // The editor needs answer keys for printing. The payload contains only shared,
    // authored material from this grade and is available only to workspace staff.
    return noStore(Response.json(getConceptBlankGradeBank(grade.data)));
  },
);
