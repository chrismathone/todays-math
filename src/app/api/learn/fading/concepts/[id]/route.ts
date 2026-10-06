/**
 * GET /api/learn/fading/concepts/{id} — «오늘의 기억» 개념 하나의 내용과 내 상태.
 * 대응 계약: src/contracts/fadingApi.contract.ts `fadingConceptResponseSchema`
 */
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { handleFadingConceptRequest } from "@/lib/fading/routes";

type RouteContext = { params: Promise<{ id: string }> };

async function handleGet(request: Request, { params }: RouteContext) {
  return handleFadingConceptRequest(request, (await params).id);
}
export const GET = withErrorLog("/api/learn/fading/concepts/[id]", handleGet);
