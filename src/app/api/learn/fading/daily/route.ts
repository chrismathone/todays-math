/**
 * GET /api/learn/fading/daily — «오늘 할 일»(하루 분량을 정하는 엔진의 계획 · 읽기뿐).
 * 대응 계약: src/contracts/fadingDaily.contract.ts `fadingDailyPlanResponseSchema`
 */
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { handleFadingDailyRequest } from "@/lib/fading/dailyRoutes";

async function handleGet(request: Request) {
  return handleFadingDailyRequest(request);
}
export const GET = withErrorLog("/api/learn/fading/daily", handleGet);
