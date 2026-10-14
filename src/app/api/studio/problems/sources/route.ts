import { bankSourcesResponse } from "@/lib/bankSourceRoute";
import {
  authorizeStudio,
  STUDIO_HEADERS as headers,
} from "@/lib/studio-ai/guard";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

/**
 * 문제은행 «출처 고르기» 창의 수(D-161 H1) — 관문은 이웃 목록 라우트(`../route.ts`)와 같다.
 * `?view=available` 은 현재 조건의 가용량(문제은행 P0) — 기본 응답의 뜻은 그대로다(`bankSourceRoute.ts`).
 */
async function handle(request: Request) {
  const access = await authorizeStudio(request);
  if (access.response) return access.response;
  return bankSourcesResponse(request, headers);
}

export const GET = withErrorLog("/api/studio/problems/sources", handle);
export const POST = withErrorLog("/api/studio/problems/sources", handle);
