import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { scanHandlers } from "@/lib/concept-blank/scan/routes.server";
export const runtime = "nodejs";
export const maxDuration = 300;
export const GET = withErrorLog(
  "/api/concept-blank/scan/name-captures/[id]",
  scanHandlers.nameGet,
);
export const POST = withErrorLog(
  "/api/concept-blank/scan/name-captures/[id]",
  scanHandlers.nameAction,
);
