import { randomBankResponse } from "@/lib/unifiedBankSelection";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { devBankQueryContext } from "@/lib/devBankQueryContext";

async function handlePost(request: Request) {
  if (process.env.NODE_ENV !== "development")
    return new Response(null, { status: 404 });
  return randomBankResponse(
    request,
    { "Cache-Control": "no-store" },
    devBankQueryContext(),
  );
}

export const POST = withErrorLog(
  "/api/dev/unified/problems/random",
  handlePost,
);
