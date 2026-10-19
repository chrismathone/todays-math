import { loadUnifiedBank, UnifiedBankQueryError } from "@/lib/unifiedPreview";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { readUnifiedBankQueryBody } from "@/lib/unifiedBankQueryBody";
import { devBankQueryContext } from "@/lib/devBankQueryContext";

async function handleGet(request: Request) {
  if (process.env.NODE_ENV !== "development")
    return new Response(null, { status: 404 });
  try {
    return Response.json(
      await loadUnifiedBank(
        request.method === "POST"
          ? await readUnifiedBankQueryBody(request)
          : new URL(request.url).searchParams,
        devBankQueryContext(),
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof UnifiedBankQueryError)
      return Response.json({ error: error.message }, { status: 400 });
    return Response.json(
      { error: "문제은행을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 503 },
    );
  }
}

export const GET = withErrorLog("/api/dev/unified/problems", handleGet);
export const POST = withErrorLog("/api/dev/unified/problems", handleGet);
