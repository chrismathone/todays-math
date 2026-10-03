/**
 * GET …/assets/{assetId} — 판본이 가리키는 자산의 바이트(구간 읽기).
 * 그 판본을 읽을 수 있는 사람만, 그 판본의 색인에 있는 자산만 — 해시를 안다고 읽히지 않는다.
 */
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { editionAssetSource, serveBytes } from "@/lib/textbook/server/bytes";
import { notFound } from "@/lib/textbook/server/errors";
import { textbookRoute, uuidParam } from "@/lib/textbook/server/http";

export const runtime = "nodejs";

type Context = { params: Promise<{ editionId: string; assetId: string }> };

export const GET = withErrorLog(
  "/api/textbook/editions/[editionId]/assets/[assetId]",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const params = await context.params;
      if (!/^[a-f0-9]{64}$/.test(params.assetId)) throw notFound("자산");
      return serveBytes(
        db,
        request,
        await editionAssetSource(
          db,
          actor,
          uuidParam(params.editionId, "판본"),
          params.assetId,
        ),
      );
    }),
);
