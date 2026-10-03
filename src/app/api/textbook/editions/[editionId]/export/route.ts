/**
 * GET …/export — 판본의 교환 형식(`TextbookExchange`). 발행본이면 다시 계산한 manifest 해시가 발행 때의 값과 같아야 낸다.
 */
import { textbookExportResponseSchema } from "@/contracts/textbook.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { textbookHeaders } from "@/lib/textbook/server/authorize";
import { exportEdition } from "@/lib/textbook/server/exportEdition";
import { textbookRoute, uuidParam } from "@/lib/textbook/server/http";

export const runtime = "nodejs";

type Context = { params: Promise<{ editionId: string }> };

export const GET = withErrorLog(
  "/api/textbook/editions/[editionId]/export",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) =>
      Response.json(
        textbookExportResponseSchema.parse({
          data: await exportEdition(
            db,
            actor,
            uuidParam((await context.params).editionId, "판본"),
            new Date().toISOString(),
          ),
        }),
        { headers: textbookHeaders },
      ),
    ),
);
