import { handleListeningHttp } from "@/lib/english/listening/runtime/http";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
export const runtime = "nodejs";
export const maxDuration = 300;
type Context = { params: Promise<{ path?: string[] }> };
async function handle(request: Request, context: Context) {
  return handleListeningHttp(
    request,
    (await context.params).path ?? [],
    "teacher",
  );
}
export const GET = withErrorLog("/api/english/listening/[[...path]]", handle);
export const POST = withErrorLog("/api/english/listening/[[...path]]", handle);
export const PATCH = withErrorLog("/api/english/listening/[[...path]]", handle);
export const DELETE = withErrorLog(
  "/api/english/listening/[[...path]]",
  handle,
);
export const HEAD = withErrorLog("/api/english/listening/[[...path]]", handle);
