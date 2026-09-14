import { loadUnifiedBank, UnifiedBankQueryError } from "@/lib/unifiedPreview";
import {
  authorizeStudio,
  STUDIO_HEADERS as headers,
} from "@/lib/studio-ai/guard";
export async function GET(request: Request) {
  try {
    const access = await authorizeStudio(request);
    if (access.response) return access.response;
    return Response.json(
      await loadUnifiedBank(new URL(request.url).searchParams),
      { headers },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof UnifiedBankQueryError
            ? error.message
            : "문제은행을 불러오지 못했습니다.",
      },
      { status: error instanceof UnifiedBankQueryError ? 400 : 503, headers },
    );
  }
}
