/**
 * GET  /api/textbook/videos[?editionId=] — 내 영상과 연결들(판본을 주면 그 판본에 놓인 문항의 연결만)
 * POST /api/textbook/videos — 영상 등록(공급자 + 영상 id). 같은 영상을 다시 등록하면 있던 줄을 돌려준다
 */
import {
  textbookVideoCreateSchema,
  textbookVideoSchema,
} from "@/contracts/textbook.contract";
import { textbookVideoListSchema } from "@/contracts/textbookServer.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import {
  data,
  readBody,
  requestKeyOf,
  textbookRoute,
  uuidParam,
} from "@/lib/textbook/server/http";
import {
  createVideo,
  listBindings,
  listVideos,
} from "@/lib/textbook/server/videos";

export const GET = withErrorLog("/api/textbook/videos", (request: Request) =>
  textbookRoute(request, async ({ actor, db }) => {
    const editionId = new URL(request.url).searchParams.get("editionId");
    return data(textbookVideoListSchema, {
      videos: await listVideos(db, actor),
      bindings: await listBindings(
        db,
        actor,
        editionId ? uuidParam(editionId, "판본") : undefined,
      ),
    });
  }),
);

export const POST = withErrorLog("/api/textbook/videos", (request: Request) =>
  textbookRoute(request, async ({ actor, db }) => {
    const body = await readBody(request, textbookVideoCreateSchema);
    const { video, replayed } = await createVideo(
      db,
      actor,
      requestKeyOf(actor, "video-create", body, {}),
      body,
    );
    return data(textbookVideoSchema, video, replayed ? 200 : 201);
  }),
);
