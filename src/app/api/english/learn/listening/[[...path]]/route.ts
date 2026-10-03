import { handleListeningHttp } from "@/lib/english/listening/runtime/http";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
export const runtime = "nodejs";
type Context = { params: Promise<{ path?: string[] }> };
async function handle(request: Request, context: Context) {
  return handleListeningHttp(
    request,
    (await context.params).path ?? [],
    "student",
  );
}
export const GET = withErrorLog(
  "/api/english/learn/listening/[[...path]]",
  handle,
);
export const POST = withErrorLog(
  "/api/english/learn/listening/[[...path]]",
  handle,
);
export const HEAD = withErrorLog(
  "/api/english/learn/listening/[[...path]]",
  handle,
);
