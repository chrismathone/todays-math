import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { scanHandlers } from "@/lib/concept-blank/scan/routes.server";

export const runtime = "nodejs";
export const GET = withErrorLog(
  "/api/concept-blank/scan/submissions/[id]/markup",
  scanHandlers.markupGet,
);
export const POST = withErrorLog(
  "/api/concept-blank/scan/submissions/[id]/markup",
  scanHandlers.markupPost,
);
