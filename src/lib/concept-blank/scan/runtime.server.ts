import "server-only";
import { recordErrorLog } from "@/lib/errorLog/record";
import { scanDatabase } from "./database.server";
import { createScanModel, scanConfig } from "./model";
import { scanPhotoStorage } from "./storage.server";
import { createDatabaseScanUsageStore } from "./usageDatabase";
import { scanJobFailureMessage } from "./jobs";

/** Production dependencies are server-only. Test/UI harnesses inject these at the boundary, never via a public flag. */
export function scanRuntime(request: Request) {
  return {
    db: scanDatabase,
    origin: new URL(
      process.env.AUTH_URL || process.env.NEXTAUTH_URL || request.url,
    ).origin,
    storage: scanPhotoStorage,
    config: scanConfig,
    model: (requestKey: string, submissionId: string) =>
      createScanModel({
        store: createDatabaseScanUsageStore(scanDatabase, { submissionId }),
        requestKey,
      }),
    onError: async (error: unknown) => {
      await recordErrorLog({
        source: "server",
        kind: "ai-rejected",
        route: "/api/concept-blank/scan/submissions/[id]/jobs",
        method: "POST",
        action: "concept-blank-scan",
        message: scanJobFailureMessage(error),
      });
    },
  };
}
