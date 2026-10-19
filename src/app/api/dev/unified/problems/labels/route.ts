import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { authorizeStudio } from "@/lib/studio-ai/guard";
import { usageLabelsResponse } from "@/lib/usageLabels/respond";

/** 순위 읽기 — dev 미리보기 짝. 운영 빌드에서는 404. */
async function handlePost(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new Response(null, { status: 404 });
  }
  const access = await authorizeStudio(request);
  if (access.response) return access.response;
  if (!access.user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  return usageLabelsResponse(
    request,
    { "Cache-Control": "no-store" },
    access.user,
  );
}

export const POST = withErrorLog(
  "/api/dev/unified/problems/labels",
  handlePost,
);
