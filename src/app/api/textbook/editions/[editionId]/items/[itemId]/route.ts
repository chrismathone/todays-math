/**
 * GET   …/items/{itemId} — 배치 하나와 연결 후보(후보는 주인에게만)
 * PATCH …/items/{itemId} — 배치 고치기(학습 단계 · 표시 번호 · 풀이선 · 영상 정책 · 검수한 개념 열쇠).
 * `expectedRevision` 은 판본 집계 revision 이다. 배치의 자리는 구획 저장이 정한다 — 여기서 못 옮긴다.
 */
import { textbookUpdateItemSchema } from "@/contracts/textbook.contract";
import {
  textbookItemDetailSchema,
  textbookItemMutationResultSchema,
} from "@/contracts/textbookServer.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import {
  data,
  readBody,
  requestKeyOf,
  textbookRoute,
  uuidParam,
} from "@/lib/textbook/server/http";
import { getItemDetail } from "@/lib/textbook/server/itemLink";
import { updateItem } from "@/lib/textbook/server/items";

type Context = { params: Promise<{ editionId: string; itemId: string }> };

export const GET = withErrorLog(
  "/api/textbook/editions/[editionId]/items/[itemId]",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const params = await context.params;
      return data(
        textbookItemDetailSchema,
        await getItemDetail(
          db,
          actor,
          uuidParam(params.editionId, "판본"),
          uuidParam(params.itemId, "배치"),
        ),
      );
    }),
);

export const PATCH = withErrorLog(
  "/api/textbook/editions/[editionId]/items/[itemId]",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const params = await context.params;
      const scope = {
        editionId: uuidParam(params.editionId, "판본"),
        itemId: uuidParam(params.itemId, "배치"),
      };
      const body = await readBody(request, textbookUpdateItemSchema);
      return data(
        textbookItemMutationResultSchema,
        await updateItem(
          db,
          actor,
          scope.editionId,
          scope.itemId,
          requestKeyOf(actor, "item-update", body, scope),
          body,
        ),
      );
    }),
);
