/**
 * POST …/reissue — 발행본의 문항들로 새 시험지를 만든다(문항마다 확정본을 단다).
 * 자격을 잃었거나 지워진 문항 · 두 번 고른 문항이 있으면 만들지 않고 사유를 낸다.
 */
import { textbookReissueSchema } from "@/contracts/textbook.contract";
import { textbookReissueResultSchema } from "@/contracts/textbookServer.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import {
  data,
  readBody,
  requestKeyOf,
  textbookRoute,
  uuidParam,
} from "@/lib/textbook/server/http";
import { reissueTest } from "@/lib/textbook/server/reissue";

type Context = { params: Promise<{ editionId: string }> };

export const POST = withErrorLog(
  "/api/textbook/editions/[editionId]/reissue",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const editionId = uuidParam((await context.params).editionId, "판본");
      const body = await readBody(request, textbookReissueSchema);
      const result = await reissueTest(
        db,
        actor,
        editionId,
        requestKeyOf(actor, "reissue", body, { editionId }),
        body,
      );
      return data(
        textbookReissueResultSchema,
        result,
        result.replayed ? 200 : 201,
      );
    }),
);
