import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { handleExplorerRequest } from "@/lib/math-explorers/routes";

export const GET = withErrorLog(
  "/api/learn/math-explorers",
  (request: Request) => handleExplorerRequest(request, "read"),
);
export const POST = withErrorLog(
  "/api/learn/math-explorers",
  (request: Request) => handleExplorerRequest(request, "action"),
);
