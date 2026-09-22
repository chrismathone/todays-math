import { randomBankResponse } from "@/lib/unifiedBankSelection";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

async function handlePost(request: Request) {
  if (process.env.NODE_ENV !== "development")
    return new Response(null, { status: 404 });
  return randomBankResponse(request, { "Cache-Control": "no-store" });
}

export const POST = withErrorLog(
  "/api/dev/unified/problems/random",
  handlePost,
);
