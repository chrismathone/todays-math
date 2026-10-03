/**
 * GET …/publish/{requestId} — 발행 작업의 상태 · 진단 · (발행됐으면) 산출물 목록. 주인만.
 */
import { textbookPublishJobSchema } from "@/contracts/textbook.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { requireOwnedEdition } from "@/lib/textbook/access";
import { loadPublishRequest, publishJob } from "@/lib/textbook/publish/job";
import { data, textbookRoute, uuidParam } from "@/lib/textbook/server/http";

type Context = { params: Promise<{ editionId: string; requestId: string }> };

export const GET = withErrorLog(
  "/api/textbook/editions/[editionId]/publish/[requestId]",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const params = await context.params;
      const editionId = uuidParam(params.editionId, "판본");
      await requireOwnedEdition(db, actor, editionId);
      return data(
        textbookPublishJobSchema,
        await publishJob(
          db,
          await loadPublishRequest(
            db,
            actor.id,
            editionId,
            uuidParam(params.requestId, "발행 작업"),
          ),
          false,
        ),
      );
    }),
);
