/**
 * POST …/publish/preflight — 발행 사전 검사. 읽기만 한다(조판 없이 알 수 있는 막는 사유 전부).
 */
import { textbookPreflightSchema } from "@/contracts/textbook.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { publishDeps } from "@/lib/textbook/publish/deps.server";
import { preflightEdition } from "@/lib/textbook/publish/preflight";
import { data, textbookRoute, uuidParam } from "@/lib/textbook/server/http";

export const runtime = "nodejs";

type Context = { params: Promise<{ editionId: string }> };

export const POST = withErrorLog(
  "/api/textbook/editions/[editionId]/publish/preflight",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) =>
      data(
        textbookPreflightSchema,
        await preflightEdition(
          db,
          actor,
          uuidParam((await context.params).editionId, "판본"),
          publishDeps(),
        ),
      ),
    ),
);
