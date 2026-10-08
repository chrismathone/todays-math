import { loadBankSourceCounts } from "@/lib/bankSourceCounts";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

/** 문제은행 «출처 고르기» 창의 수(D-161 H1) — dev 미리보기 짝. 운영 빌드에서는 404(이웃 `../route.ts` 와 같다). */
async function handleGet() {
  if (process.env.NODE_ENV !== "development")
    return new Response(null, { status: 404 });
  try {
    return Response.json(await loadBankSourceCounts(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      {
        error:
          "출처별 문항 수를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 503 },
    );
  }
}

export const GET = withErrorLog("/api/dev/unified/problems/sources", handleGet);
