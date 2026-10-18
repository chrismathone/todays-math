import { bankSourcesResponse } from "@/lib/bankSourceRoute";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { devBankQueryContext } from "@/lib/devBankQueryContext";

/**
 * 문제은행 «출처 고르기» 창의 수(D-161 H1) — dev 미리보기 짝. 운영 빌드에서는 404(이웃 `../route.ts` 와 같다).
 * `?view=available` 은 현재 조건의 가용량(문제은행 P0 — `bankSourceRoute.ts`).
 */
async function handle(request: Request) {
  if (process.env.NODE_ENV !== "development")
    return new Response(null, { status: 404 });
  return bankSourcesResponse(
    request,
    { "Cache-Control": "no-store" },
    devBankQueryContext(),
  );
}

export const GET = withErrorLog("/api/dev/unified/problems/sources", handle);
export const POST = withErrorLog("/api/dev/unified/problems/sources", handle);
