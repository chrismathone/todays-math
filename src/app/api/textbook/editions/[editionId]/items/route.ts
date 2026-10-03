/**
 * POST /api/textbook/editions/{editionId}/items — 문항 담기(시험지 하나 또는 문항 id 목록 → 확정본 + 배치).
 * `expectedRevision` 은 판본 집계 revision 이다. 결과에 제외한 문항과 사유가 같이 온다.
 *
 * 그림 바이트를 읽어 얼리는 일이라 기본 한도로는 모자랄 수 있다 — 넉넉히 잡는다(조판 걸음과 같은 전례).
 */
import {
  textbookCaptureItemsSchema,
  textbookCaptureResultSchema,
} from "@/contracts/textbook.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { createFigureLoader } from "@/lib/textbook/server/figureBytes";
import {
  data,
  readBody,
  requestKeyOf,
  textbookRoute,
  uuidParam,
} from "@/lib/textbook/server/http";
import { captureItems } from "@/lib/textbook/server/items";

export const runtime = "nodejs";
export const maxDuration = 300;

type Context = { params: Promise<{ editionId: string }> };

const loadFigure = createFigureLoader();

export const POST = withErrorLog(
  "/api/textbook/editions/[editionId]/items",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const editionId = uuidParam((await context.params).editionId, "판본");
      const body = await readBody(request, textbookCaptureItemsSchema);
      const result = await captureItems(
        db,
        actor,
        editionId,
        requestKeyOf(actor, "capture", body, { editionId }),
        body,
        loadFigure,
      );
      return data(
        textbookCaptureResultSchema,
        result,
        result.replayed ? 200 : 201,
      );
    }),
);
