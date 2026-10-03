/**
 * GET  …/concepts — 판본의 개념 목록
 * POST …/concepts — 새 개념(`expectedRevision` 0). 연결의 확인은 서버가 찍는다
 */
import {
  textbookConceptRecordSchema,
  textbookSaveConceptSchema,
} from "@/contracts/textbook.contract";
import { textbookConceptListSchema } from "@/contracts/textbookServer.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { resolveReviewedConcept } from "@/lib/textbook/concepts";
import { listConcepts, saveConcept } from "@/lib/textbook/server/conceptRows";
import { invalid } from "@/lib/textbook/server/errors";
import {
  data,
  readBody,
  requestKeyOf,
  textbookRoute,
  uuidParam,
} from "@/lib/textbook/server/http";

type Context = { params: Promise<{ editionId: string }> };

export const GET = withErrorLog(
  "/api/textbook/editions/[editionId]/concepts",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) =>
      data(
        textbookConceptListSchema,
        await listConcepts(
          db,
          actor,
          uuidParam((await context.params).editionId, "판본"),
        ),
      ),
    ),
);

export const POST = withErrorLog(
  "/api/textbook/editions/[editionId]/concepts",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const editionId = uuidParam((await context.params).editionId, "판본");
      const body = await readBody(request, textbookSaveConceptSchema);
      if (body.expectedRevision !== 0)
        throw invalid("새 개념은 expectedRevision 0 으로 만듭니다.");
      const saved = await saveConcept(
        db,
        actor,
        editionId,
        body.concept.conceptKey,
        requestKeyOf(actor, "concept-save", body, {
          editionId,
          conceptKey: body.concept.conceptKey,
        }),
        body,
        resolveReviewedConcept,
      );
      // 응답은 계약의 세 칸만 — 서버 함수가 같이 돌려주는 `replayed` 를 그대로 실으면 엄격한 스키마가 500 을 낸다
      return data(
        textbookConceptRecordSchema,
        {
          concept: saved.concept,
          revision: saved.revision,
          aggregateRevision: saved.aggregateRevision,
        },
        saved.replayed ? 200 : 201,
      );
    }),
);
