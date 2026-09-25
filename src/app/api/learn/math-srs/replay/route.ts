import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { handleReplayRequest } from "@/lib/math-srs/replayRoutes";

export const GET = withErrorLog(
  "/api/learn/math-srs/replay",
  (request: Request) => handleReplayRequest(request, "read"),
);
export const POST = withErrorLog(
  "/api/learn/math-srs/replay",
  (request: Request) => handleReplayRequest(request, "grade"),
);
