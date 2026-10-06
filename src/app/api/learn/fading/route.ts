/**
 * GET · POST /api/learn/fading — «오늘의 기억» 학생 상태와 행동.
 * 대응 계약: src/contracts/fadingApi.contract.ts `fadingStateResponseSchema` · `fadingActionSchema`
 */
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { handleFadingRequest } from "@/lib/fading/routes";

async function handleGet(request: Request) {
  return handleFadingRequest(request, "read");
}
async function handlePost(request: Request) {
  return handleFadingRequest(request, "action");
}
export const GET = withErrorLog("/api/learn/fading", handleGet);
export const POST = withErrorLog("/api/learn/fading", handlePost);
