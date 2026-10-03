import type { NextRequest } from "next/server";
import { handleBankHttp } from "@/lib/english/bank/http";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
async function handle(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return handleBankHttp(request, (await context.params).id);
}
export const GET = withErrorLog("/api/english/passages/[id]", handle);
export const PATCH = withErrorLog("/api/english/passages/[id]", handle);
export const DELETE = withErrorLog("/api/english/passages/[id]", handle);
