/**
 * POST …/publish/reserve — 발행 예약. `expectedRevision` 은 판본 집계 revision 이다.
 * QR 을 예약하고 조판 걸음을 세운다. 판본은 초안 그대로다 — 발행은 확정이 한다.
 */
import {
  textbookPublishJobSchema,
  textbookPublishReserveSchema,
} from "@/contracts/textbook.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { publishDeps } from "@/lib/textbook/publish/deps.server";
import { reservePublish } from "@/lib/textbook/publish/reserve";
import {
  data,
  readBody,
  requestKeyOf,
  textbookRoute,
  uuidParam,
} from "@/lib/textbook/server/http";

export const runtime = "nodejs";

type Context = { params: Promise<{ editionId: string }> };

export const POST = withErrorLog(
  "/api/textbook/editions/[editionId]/publish/reserve",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const editionId = uuidParam((await context.params).editionId, "판본");
      const body = await readBody(request, textbookPublishReserveSchema);
      const job = await reservePublish(
        db,
        actor,
        editionId,
        body,
        requestKeyOf(actor, "publish", body, { editionId }).bodyHash,
        publishDeps(),
      );
      return data(textbookPublishJobSchema, job, job.replayed ? 200 : 201);
    }),
);
