import { bankReadinessResponse, checkBankProblems } from "@/lib/bankReadiness";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { authorizeStudio, STUDIO_HEADERS } from "@/lib/studio-ai/guard";

/**
 * 출력 직전 재검증(문제은행 P0) — 담긴 문항 id 가 지금도 출제 가능한가 · 못 내면 그 까닭.
 * 필터와 무관하게 id 로만 본다. 관문은 이웃 목록 라우트(`../route.ts`)와 같다(로그인 · 메뉴 bank · 같은 사이트).
 */
async function handlePost(request: Request) {
  const access = await authorizeStudio(request);
  if (access.response) return access.response;
  return bankReadinessResponse(request, STUDIO_HEADERS, checkBankProblems);
}

export const POST = withErrorLog("/api/studio/problems/check", handlePost);
