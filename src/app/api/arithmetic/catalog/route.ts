import { arithmeticCatalog } from "@/lib/workspaceArithmeticRoutes";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

export const GET = withErrorLog("/api/arithmetic/catalog", arithmeticCatalog);
