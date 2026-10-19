import { loadUnifiedBank, UnifiedBankQueryError } from "@/lib/unifiedPreview";
import {
  authorizeStudio,
  STUDIO_HEADERS as headers,
} from "@/lib/studio-ai/guard";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { readUnifiedBankQueryBody } from "@/lib/unifiedBankQueryBody";
import { bankQueryContext } from "@/lib/bankQueryContext";
async function handleGet(request: Request) {
  try {
    const access = await authorizeStudio(request);
    if (access.response) return access.response;
    return Response.json(
      await loadUnifiedBank(
        request.method === "POST"
          ? await readUnifiedBankQueryBody(request)
          : new URL(request.url).searchParams,
        // 최근 출제 빼기(`recent=1`)는 로그인한 이 계정의 시험지로 센다(D-20).
        bankQueryContext(access.user.id),
      ),
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

export const GET = withErrorLog("/api/studio/problems", handleGet);
export const POST = withErrorLog("/api/studio/problems", handleGet);
