/**
 * POST …/items/{itemId}/recapture — 지금 은행 문항으로 새 확정본을 만들고 배치가 그것을 가리키게 한다.
 * `expectedRevision` 은 판본 집계 revision 이다. 옛 확정본은 지워지지 않는다.
 */
import { textbookSnapshotActionSchema } from "@/contracts/textbook.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { createFigureLoader } from "@/lib/textbook/server/figureBytes";
import {
  plain,
  readBody,
  requestKeyOf,
  textbookRoute,
  uuidParam,
} from "@/lib/textbook/server/http";
import { recaptureItem } from "@/lib/textbook/server/items";

export const runtime = "nodejs";

type Context = { params: Promise<{ editionId: string; itemId: string }> };

const loadFigure = createFigureLoader();

export const POST = withErrorLog(
  "/api/textbook/editions/[editionId]/items/[itemId]/recapture",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const params = await context.params;
      const scope = {
        editionId: uuidParam(params.editionId, "판본"),
        itemId: uuidParam(params.itemId, "배치"),
      };
      const body = await readBody(request, textbookSnapshotActionSchema);
      return plain(
        await recaptureItem(
          db,
          actor,
          scope.editionId,
          scope.itemId,
          requestKeyOf(actor, "recapture", body, scope),
          body,
          loadFigure,
        ),
      );
    }),
);
