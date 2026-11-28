import { authorizeAccount } from "@/lib/accountAccess";
import { arithmeticPackResponse } from "@/lib/arithmetic-v2/presentation/packRoute.server";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

export const GET = withErrorLog(
  "/api/arithmetic/v2/packs",
  async (request: Request) => {
    const { account, response } = await authorizeAccount(request);
    if (response) return response;
    if (!account.isSuperAdmin && !account.menus.includes("arithmetic"))
      return new Response(null, { status: 403 });
    return arithmeticPackResponse(request);
  },
);
