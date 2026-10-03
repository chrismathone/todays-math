/**
 * POST …/items/{itemId}/diff — 확정본과 지금 은행 문항을 견준다. 읽기만 한다(확정본도 은행도 안 바뀐다).
 * 본문은 없어도 된다 — 견주는 데는 요청 번호가 필요 없다.
 */
import { textbookItemDiffSchema } from "@/contracts/textbookServer.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { createFigureLoader } from "@/lib/textbook/server/figureBytes";
import { data, textbookRoute, uuidParam } from "@/lib/textbook/server/http";
import { diffItem } from "@/lib/textbook/server/items";

export const runtime = "nodejs";

type Context = { params: Promise<{ editionId: string; itemId: string }> };

const loadFigure = createFigureLoader();

export const POST = withErrorLog(
  "/api/textbook/editions/[editionId]/items/[itemId]/diff",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const params = await context.params;
      return data(
        textbookItemDiffSchema,
        await diffItem(
          db,
          actor,
          uuidParam(params.editionId, "판본"),
          uuidParam(params.itemId, "배치"),
          loadFigure,
        ),
      );
    }),
);
