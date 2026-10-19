import { arithmeticV2Catalog } from "@/lib/workspaceArithmeticV2Routes";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
export const GET = withErrorLog(
  "/api/arithmetic/v2/catalog",
  arithmeticV2Catalog,
);
