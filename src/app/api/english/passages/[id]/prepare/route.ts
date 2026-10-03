import type { NextRequest } from "next/server";
import { handleBankHttp } from "@/lib/english/bank/http";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
export const POST = withErrorLog(
  "/api/english/passages/[id]/prepare",
  async (request: NextRequest, context: { params: Promise<{ id: string }> }) =>
    handleBankHttp(request, (await context.params).id, "prepare"),
);
