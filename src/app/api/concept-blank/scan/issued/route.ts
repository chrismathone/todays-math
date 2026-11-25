import {
  scanIssueInputSchema,
  scanIssueResponseSchema,
} from "@/contracts/conceptBlankScanIssued.contract";
import { ScanPaperError } from "@/lib/concept-blank/scan/renderQueue";
import { noteErrorLog } from "@/lib/errorLog/scope";
import { describeError, withErrorLog } from "@/lib/errorLog/withErrorLog";
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
function paperFailure(error: unknown): never {
  noteErrorLog({ action: "concept-blank-issue", detail: describeError(error) });
  if (error instanceof ScanPaperError) throw error;
  throw new ScanPaperError(
    "지면의 글꼴·배치를 준비하지 못했습니다. 잠시 뒤 다시 발행해 주세요.",
  );
}

async function handlePost(request: Request) {
  return scanHttp(async () => {
    const actor = await scanRequestActor(request, true);
    const input = scanIssueInputSchema.parse(
      await readScanJson(request, 1_500_000),
    );
    const origin = new URL(
      process.env.AUTH_URL || process.env.NEXTAUTH_URL || request.url,
    ).origin;
    const { renderScanPaper, bank, edition } = await Promise.all([
      import("@/lib/concept-blank/scan/paper.server"),
      import("@/lib/concept-blank/bank"),
    ])
      .then(([paper, { CONCEPT_BLANK_BANK }]) => ({
        renderScanPaper: paper.renderScanPaper,
        bank: CONCEPT_BLANK_BANK,
        edition: paper.scanPublicationEdition(
          input.selection,
          CONCEPT_BLANK_BANK,
          origin,
        ),
      }))
      .catch(paperFailure);
    const data = await issueScanPaper(actor, input, {
      db: scanDatabase,
      publicationEdition: edition,
      render: async (id, selection) => {
        try {
          return await renderScanPaper({
            id,
            selection,
            bank,
            origin,
          });
        } catch (error) {
          paperFailure(error);
        }
      },
    });
    return Response.json(scanIssueResponseSchema.parse({ data }), {
      status: 201,
      headers: scanNoStore,
    });
  });
}
export const POST = withErrorLog("/api/concept-blank/scan/issued", handlePost);
