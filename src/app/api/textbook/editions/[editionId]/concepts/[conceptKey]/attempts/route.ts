/**
 * POST …/concepts/{conceptKey}/attempts — 교사가 종이 활동을 보고 적는 기록(`teacher-observed`).
 * 발행본의 굳은 개념에만 쌓인다. 학생은 자기 반의 학생이어야 한다.
 */
import {
  textbookConceptAttemptSchema,
  textbookObservationCreateSchema,
} from "@/contracts/textbookConcept.contract";
import { textbookKeySchema } from "@/contracts/textbookPrimitives.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { recordObservation } from "@/lib/textbook/server/conceptRows";
import { notFound } from "@/lib/textbook/server/errors";
import {
  data,
  readBody,
  requestKeyOf,
  textbookRoute,
  uuidParam,
} from "@/lib/textbook/server/http";

type Context = { params: Promise<{ editionId: string; conceptKey: string }> };

export const POST = withErrorLog(
  "/api/textbook/editions/[editionId]/concepts/[conceptKey]/attempts",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const params = await context.params;
      const conceptKey = textbookKeySchema.safeParse(params.conceptKey);
      if (!conceptKey.success) throw notFound("개념");
      const scope = {
        editionId: uuidParam(params.editionId, "판본"),
        conceptKey: conceptKey.data,
      };
      const body = await readBody(request, textbookObservationCreateSchema);
      const { attempt, replayed } = await recordObservation(
        db,
        actor,
        scope.editionId,
        scope.conceptKey,
        body,
        requestKeyOf(actor, "concept-observe", body, scope).bodyHash,
      );
      return data(textbookConceptAttemptSchema, attempt, replayed ? 200 : 201);
    }),
);
