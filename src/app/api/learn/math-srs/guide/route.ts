import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { handleGuideRequest } from "@/lib/math-srs/guideRoutes";

async function handleGet(request: Request) {
  return handleGuideRequest(request, "read");
}
async function handlePost(request: Request) {
  return handleGuideRequest(request, "choose");
}
export const GET = withErrorLog("/api/learn/math-srs/guide", handleGet);
export const POST = withErrorLog("/api/learn/math-srs/guide", handlePost);
