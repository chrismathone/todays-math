/**
 * GET …/artifacts/{artifactId} — 발행 산출물(서버가 만든 PDF · 정본 교환 JSON · 검수 보고)의 바이트(구간 읽기).
 * 그 판본을 읽을 수 있는 사람만, 그 판본의 산출물만.
 */
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { artifactSource, serveBytes } from "@/lib/textbook/server/bytes";
import { textbookRoute, uuidParam } from "@/lib/textbook/server/http";

export const runtime = "nodejs";

type Context = { params: Promise<{ editionId: string; artifactId: string }> };

export const GET = withErrorLog(
  "/api/textbook/editions/[editionId]/artifacts/[artifactId]",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const params = await context.params;
      return serveBytes(
        db,
        request,
        await artifactSource(
          db,
          actor,
          uuidParam(params.editionId, "판본"),
          uuidParam(params.artifactId, "산출물"),
        ),
      );
    }),
);
