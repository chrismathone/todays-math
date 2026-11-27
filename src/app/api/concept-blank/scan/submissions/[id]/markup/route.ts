import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { scanHandlers } from "@/lib/concept-blank/scan/routes.server";

export const runtime = "nodejs";
const path = "/api/concept-blank/scan/submissions/[id]/markup";
export const GET = withErrorLog(path, scanHandlers.markupGet);
export const POST = withErrorLog(path, scanHandlers.markupPost);
