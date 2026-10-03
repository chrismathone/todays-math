import { handleListeningHttp } from "@/lib/english/listening/runtime/http";
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
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
