/**
 * POST …/publish/steps/next — 조판 한 걸음. 본문은 `requestId` 뿐이다.
 * 서버가 다음 걸음을 임대로 잡아 조판하고 결과를 적는다. 브라우저는 걸음을 재촉할 뿐 조판하지 않는다 —
 * PDF · 쪽 · 해시를 본문으로 받지 않는다(계약이 `strictObject` 라 다른 칸이 오면 400 이다).
 *
 * 조판은 Chromium 을 띄우는 긴 일이다 — 실행 한도를 넉넉히 잡는다(자동 출제 cron 과 같은 전례).
 */
import {
  textbookPublishJobSchema,
  textbookRequestSchema,
} from "@/contracts/textbook.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { publishDeps } from "@/lib/textbook/publish/deps.server";
import { runNextStep } from "@/lib/textbook/publish/step";
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
  "/api/textbook/editions/[editionId]/publish/steps/next",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const editionId = uuidParam((await context.params).editionId, "판본");
      const body = await readBody(request, textbookRequestSchema);
      return data(
        textbookPublishJobSchema,
        await runNextStep(db, actor, editionId, body.requestId, publishDeps()),
      );
    }),
);
