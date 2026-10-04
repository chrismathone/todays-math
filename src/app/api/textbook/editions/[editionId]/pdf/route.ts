import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { pdfSource, serveDownloadBytes } from "@/lib/textbook/server/bytes";
import { TextbookError } from "@/lib/textbook/server/errors";
import { textbookRoute, uuidParam } from "@/lib/textbook/server/http";

export const runtime = "nodejs";
export const maxDuration = 300;
type Context = { params: Promise<{ editionId: string }> };

export const GET = withErrorLog(
  "/api/textbook/editions/[editionId]/pdf",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const kind = new URL(request.url).searchParams.get("kind") ?? "student";
      if (kind !== "student" && kind !== "answers")
        throw new TextbookError(
          400,
          "VALIDATION_ERROR",
          "PDF 종류를 확인해 주세요.",
        );
      const editionId = uuidParam((await context.params).editionId, "판본");
      return serveDownloadBytes(
        db,
        request,
        await pdfSource(
          db,
          actor,
          editionId,
          kind === "student" ? "student-pdf" : "answer-pdf",
        ),
      );
    }),
);
