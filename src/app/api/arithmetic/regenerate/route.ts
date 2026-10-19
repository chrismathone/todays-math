import { regenerateArithmetic } from "@/lib/workspaceArithmeticRegenerationRoutes";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

export const POST = withErrorLog(
  "/api/arithmetic/regenerate",
  regenerateArithmetic,
);
