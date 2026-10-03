import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { handleTestConsole } from "@/lib/math-srs/testConsoleRoutes";

export const GET = withErrorLog("/api/learn/test-console", (request: Request) =>
  handleTestConsole(request, "read"),
);
export const POST = withErrorLog(
  "/api/learn/test-console",
  (request: Request) => handleTestConsole(request, "action"),
);
