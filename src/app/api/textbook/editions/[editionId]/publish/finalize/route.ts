/**
 * POST …/publish/finalize — 발행 확정. 본문은 `requestId` 뿐이다.
 * 쪽 · PDF 해시 · «통과» 표지를 받지 않는다 — 서버가 끝낸 걸음만 모아 확인하고, 판본을 마지막에 발행으로 바꾼다.
 * 같은 요청이 다시 오면 그때의 결과를 그대로 돌려준다.
 */
import {
  textbookPublishJobSchema,
  textbookRequestSchema,
} from "@/contracts/textbook.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { publishDeps } from "@/lib/textbook/publish/deps.server";
import { finalizePublish } from "@/lib/textbook/publish/finalize";
import {
  data,
  readBody,
  textbookRoute,
  uuidParam,
} from "@/lib/textbook/server/http";

export const runtime = "nodejs";
export const maxDuration = 300;

type Context = { params: Promise<{ editionId: string }> };

export const POST = withErrorLog(
  "/api/textbook/editions/[editionId]/publish/finalize",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const editionId = uuidParam((await context.params).editionId, "판본");
      const body = await readBody(request, textbookRequestSchema);
      return data(
        textbookPublishJobSchema,
        await finalizePublish(
          db,
          actor,
          editionId,
          body.requestId,
          publishDeps(),
        ),
      );
    }),
);
