import { bankReadinessResponse, checkBankProblems } from "@/lib/bankReadiness";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

/** 출력 직전 재검증 — dev 미리보기 짝. 운영 빌드에서는 404(이웃 `../route.ts` 와 같다). */
async function handlePost(request: Request) {
  if (process.env.NODE_ENV !== "development")
    return new Response(null, { status: 404 });
  return bankReadinessResponse(
    request,
    { "Cache-Control": "no-store" },
    checkBankProblems,
  );
}

export const POST = withErrorLog("/api/dev/unified/problems/check", handlePost);
