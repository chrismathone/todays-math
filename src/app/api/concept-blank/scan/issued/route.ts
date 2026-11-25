import {
  scanIssueInputSchema,
  scanIssueResponseSchema,
} from "@/contracts/conceptBlankScanIssued.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { scanDatabase } from "@/lib/concept-blank/scan/database.server";
import { issueScanPaper } from "@/lib/concept-blank/scan/issuance";
import {
  readScanJson,
  scanHttp,
  scanNoStore,
  scanRequestActor,
} from "@/lib/concept-blank/scan/http";

export const runtime = "nodejs";
export const maxDuration = 120;
async function handlePost(request: Request) {
  return scanHttp(async () => {
    const actor = await scanRequestActor(request, true);
    const input = scanIssueInputSchema.parse(
      await readScanJson(request, 1_500_000),
    );
    const origin = new URL(
      process.env.AUTH_URL || process.env.NEXTAUTH_URL || request.url,
    ).origin;
    const data = await issueScanPaper(actor, input, {
      db: scanDatabase,
      render: async (id, selection) => {
        const [{ renderScanPaper }, { CONCEPT_BLANK_BANK }] = await Promise.all(
          [
            import("@/lib/concept-blank/scan/paper.server"),
            import("@/lib/concept-blank/bank"),
          ],
        );
        return renderScanPaper({
          id,
          selection,
          bank: CONCEPT_BLANK_BANK,
          origin,
        });
      },
    });
    return Response.json(scanIssueResponseSchema.parse({ data }), {
      status: 201,
      headers: scanNoStore,
    });
  });
}
export const POST = withErrorLog("/api/concept-blank/scan/issued", handlePost);
