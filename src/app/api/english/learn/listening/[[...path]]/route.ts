import { handleListeningHttp } from "@/lib/english/listening/runtime/http";
export const runtime = "nodejs";
type Context = { params: Promise<{ path?: string[] }> };
async function handle(request: Request, context: Context) {
  return handleListeningHttp(
    request,
    (await context.params).path ?? [],
    "student",
  );
}
export const GET = handle;
export const POST = handle;
export const HEAD = handle;
