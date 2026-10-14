import {
  bankReadinessResponse,
  loadTextbookSlotReadiness,
} from "@/lib/bankReadiness";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { authorizeStudio, STUDIO_HEADERS } from "@/lib/studio-ai/guard";

/**
 * 교과서 원문의 지정 두 슬롯 준비 상태(문제은행 P0) — 오답 복습과 같은 술어(`textbookSlotReadiness`).
 * 관문은 이웃 목록 라우트(`../route.ts`)와 같다(로그인 · 메뉴 bank · 같은 사이트).
 */
async function handlePost(request: Request) {
  const access = await authorizeStudio(request);
  if (access.response) return access.response;
  return bankReadinessResponse(
    request,
    STUDIO_HEADERS,
    loadTextbookSlotReadiness,
  );
}

export const POST = withErrorLog(
  "/api/studio/problems/textbook-slots",
  handlePost,
);
