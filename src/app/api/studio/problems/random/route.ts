import { authorizeStudio, STUDIO_HEADERS } from "@/lib/studio-ai/guard";
import { randomBankResponse } from "@/lib/unifiedBankSelection";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

async function handlePost(request: Request) {
  const access = await authorizeStudio(request);
  if (access.response) return access.response;
  return randomBankResponse(request, STUDIO_HEADERS);
}

export const POST = withErrorLog("/api/studio/problems/random", handlePost);
