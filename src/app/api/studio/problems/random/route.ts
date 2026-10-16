import { authorizeStudio, STUDIO_HEADERS } from "@/lib/studio-ai/guard";
import { randomBankResponse } from "@/lib/unifiedBankSelection";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { bankQueryContext } from "@/lib/bankQueryContext";

async function handlePost(request: Request) {
  const access = await authorizeStudio(request);
  if (access.response) return access.response;
  return randomBankResponse(
    request,
    STUDIO_HEADERS,
    bankQueryContext(access.user.id),
  );
}

export const POST = withErrorLog("/api/studio/problems/random", handlePost);
