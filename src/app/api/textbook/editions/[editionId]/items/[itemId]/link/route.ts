/**
 * POST …/items/{itemId}/link — 연결 후보의 확정. 사람이 고른 은행 문항(`problemId`)을 서버가 다시 캡처해
 * **내용 해시가 배치의 확정본과 같을 때만** 잇는다. `expectedRevision` 은 판본 집계 revision 이다.
 */
import {
  textbookItemMutationResultSchema,
  textbookLinkItemSchema,
} from "@/contracts/textbookServer.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { createFigureLoader } from "@/lib/textbook/server/figureBytes";
import {
  data,
  readBody,
  requestKeyOf,
  textbookRoute,
  uuidParam,
} from "@/lib/textbook/server/http";
import { linkItem } from "@/lib/textbook/server/itemLink";

export const runtime = "nodejs";

type Context = { params: Promise<{ editionId: string; itemId: string }> };

const loadFigure = createFigureLoader();

export const POST = withErrorLog(
  "/api/textbook/editions/[editionId]/items/[itemId]/link",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const params = await context.params;
      const scope = {
        editionId: uuidParam(params.editionId, "판본"),
        itemId: uuidParam(params.itemId, "배치"),
      };
      const body = await readBody(request, textbookLinkItemSchema);
      return data(
        textbookItemMutationResultSchema,
        await linkItem(
          db,
          actor,
          scope.editionId,
          scope.itemId,
          requestKeyOf(actor, "link", body, scope),
          body,
          loadFigure,
        ),
      );
    }),
);
