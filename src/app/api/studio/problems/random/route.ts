import { authorizeStudio, STUDIO_HEADERS } from "@/lib/studio-ai/guard";
import { randomBankResponse } from "@/lib/unifiedBankSelection";

export async function POST(request: Request) {
  const access = await authorizeStudio(request);
  if (access.response) return access.response;
  return randomBankResponse(request, STUDIO_HEADERS);
}
