import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { authorizeStudio, STUDIO_HEADERS } from "@/lib/studio-ai/guard";
import { usageLabelsResponse } from "@/lib/usageLabels/respond";

/**
 * 문제은행·연산 유형의 읽기 전용 순위.
 * 관문은 이웃 목록 라우트와 같다(로그인 · 메뉴 bank · 같은 사이트).
 */
async function handlePost(request: Request) {
  const access = await authorizeStudio(request);
  if (access.response) return access.response;
  if (!access.user) {
    return Response.json(
      { error: "로그인이 필요합니다." },
      { status: 401, headers: STUDIO_HEADERS },
    );
  }
  return usageLabelsResponse(request, STUDIO_HEADERS, access.user);
}

export const POST = withErrorLog("/api/studio/problems/labels", handlePost);
