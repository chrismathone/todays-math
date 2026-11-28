import { devPageVisible } from "@/lib/devPageAccess";
import { arithmeticPackResponse } from "@/lib/arithmetic-v2/presentation/packRoute.server";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

export const GET = withErrorLog(
  "/dev/arithmetic/packs",
  async (request: Request) =>
    (await devPageVisible())
      ? arithmeticPackResponse(request)
      : new Response(null, { status: 404 }),
);
