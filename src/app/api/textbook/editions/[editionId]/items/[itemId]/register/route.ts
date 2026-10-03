/**
 * POST …/items/{itemId}/register — 은행과 연결되지 않은 배치를 문제은행의 **검수 대기** 문항으로 올린다.
 * 연결하지 않고 승인하지 않는다 — 배치의 연결 상태는 그대로이고, 만든 문항이 연결 후보로 붙는다.
 * 검수를 통과한 뒤 `…/link` 가 그 은행 문항의 내용이 그대로일 때만 잇는다. `expectedRevision` 은 판본 집계 revision 이다.
 */
import {
  textbookRegisterItemResultSchema,
  textbookRegisterItemSchema,
} from "@/contracts/textbookServer.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import {
  data,
  readBody,
  requestKeyOf,
  textbookRoute,
  uuidParam,
} from "@/lib/textbook/server/http";
import { registerItemProblem } from "@/lib/textbook/server/itemRegister";

export const runtime = "nodejs";

type Context = { params: Promise<{ editionId: string; itemId: string }> };

export const POST = withErrorLog(
  "/api/textbook/editions/[editionId]/items/[itemId]/register",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const params = await context.params;
      const scope = {
        editionId: uuidParam(params.editionId, "판본"),
        itemId: uuidParam(params.itemId, "배치"),
      };
      const body = await readBody(request, textbookRegisterItemSchema);
      const result = await registerItemProblem(
        db,
        actor,
        scope.editionId,
        scope.itemId,
        requestKeyOf(actor, "register", body, scope),
        body,
      );
      return data(
        textbookRegisterItemResultSchema,
        result,
        result.replayed ? 200 : 201,
      );
    }),
);
