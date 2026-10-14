import { generateArithmeticV2 } from "@/lib/workspaceArithmeticV2Routes";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
export const POST = withErrorLog(
  "/api/arithmetic/v2/generate",
  generateArithmeticV2,
);
