import {
  bankReadinessResponse,
  loadTextbookSlotReadiness,
} from "@/lib/bankReadiness";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

/** 교과서 지정 두 슬롯 — dev 미리보기 짝. 운영 빌드에서는 404(이웃 `../route.ts` 와 같다). */
async function handlePost(request: Request) {
  if (process.env.NODE_ENV !== "development")
    return new Response(null, { status: 404 });
  return bankReadinessResponse(
    request,
    { "Cache-Control": "no-store" },
    loadTextbookSlotReadiness,
  );
}

export const POST = withErrorLog(
  "/api/dev/unified/problems/textbook-slots",
  handlePost,
);
