import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { scanHandlers } from "@/lib/concept-blank/scan/routes.server";

export const runtime = "nodejs";
export const maxDuration = 300;
export const GET = withErrorLog(
  "/api/concept-blank/scan/purge/cron",
  scanHandlers.purge,
);
