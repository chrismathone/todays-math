import { regenerateArithmeticV2 } from "@/lib/workspaceArithmeticRegenerationRoutes";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

export const POST = withErrorLog(
  "/api/arithmetic/v2/regenerate",
  regenerateArithmeticV2,
);
