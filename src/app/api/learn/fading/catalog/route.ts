/**
 * GET /api/learn/fading/catalog?grade= — «오늘의 기억» 개념 목록(학년 하나).
 * 대응 계약: src/contracts/fadingApi.contract.ts `fadingCatalogResponseSchema`
 */
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { handleFadingCatalogRequest } from "@/lib/fading/routes";

async function handleGet(request: Request) {
  return handleFadingCatalogRequest(request);
}
export const GET = withErrorLog("/api/learn/fading/catalog", handleGet);
