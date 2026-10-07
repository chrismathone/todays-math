import { jsonError } from "@/lib/apiResponse";
import { requireStudent } from "@/lib/learn/studentRequest";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
export const runtime = "nodejs";
async function handle() {
  const gate = await requireStudent({ active: true });
  if (gate.response) return gate.response;
  return jsonError(
    "FORBIDDEN",
    "학생 화면에서는 영어 듣기를 이용할 수 없습니다.",
    403,
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
