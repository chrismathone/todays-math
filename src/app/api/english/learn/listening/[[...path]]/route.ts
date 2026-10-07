import { requireStudent } from "@/lib/learn/studentRequest";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
export const runtime = "nodejs";
type Context = { params: Promise<{ path?: string[] }> };
async function handle(request: Request, context: Context) {
  const gate = await requireStudent({
    active: true,
    menu: "english-listening",
  });
  if (gate.response) return gate.response;
  const { handleListeningHttp } =
    await import("@/lib/english/listening/runtime/http");
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
