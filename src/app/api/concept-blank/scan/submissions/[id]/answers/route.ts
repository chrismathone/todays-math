import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { scanHandlers } from "@/lib/concept-blank/scan/routes.server";

export const runtime = "nodejs";
export const maxDuration = 300;
export const POST = withErrorLog(
  "/api/concept-blank/scan/submissions/[id]/answers",
  scanHandlers.answer,
);
