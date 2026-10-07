/**
 * GET · POST /api/learn/fading/relearn — «오늘의 기억» 단기 재학습 대기열(1분 · 5분 뒤 다시 확인).
 * 대응 계약: src/contracts/fadingRelearn.contract.ts `fadingRelearnQueueResponseSchema` · `fadingRelearnActionSchema` · `fadingRelearnActionResponseSchema`
 */
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { handleFadingRelearnRequest } from "@/lib/fading/relearnRoutes";

async function handleGet(request: Request) {
  return handleFadingRelearnRequest(request, "read");
}
async function handlePost(request: Request) {
  return handleFadingRelearnRequest(request, "action");
}
export const GET = withErrorLog("/api/learn/fading/relearn", handleGet);
export const POST = withErrorLog("/api/learn/fading/relearn", handlePost);
