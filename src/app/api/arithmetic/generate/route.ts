import { generateArithmetic } from "@/lib/workspaceArithmeticRoutes";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

export const POST = withErrorLog(
  "/api/arithmetic/generate",
  generateArithmetic,
);
