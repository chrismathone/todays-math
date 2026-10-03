/**
 * GET …/concepts/{conceptKey} — 개념 원고와 연결
 * PUT …/concepts/{conceptKey} — 저장. `expectedRevision` 은 개념의 revision 이다(0 = 새로 만든다)
 */
import {
  textbookConceptRecordSchema,
  textbookSaveConceptSchema,
} from "@/contracts/textbook.contract";
import { textbookKeySchema } from "@/contracts/textbookPrimitives.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { resolveReviewedConcept } from "@/lib/textbook/concepts";
import { getConcept, saveConcept } from "@/lib/textbook/server/conceptRows";
import { notFound } from "@/lib/textbook/server/errors";
import {
  data,
  readBody,
  requestKeyOf,
  textbookRoute,
  uuidParam,
} from "@/lib/textbook/server/http";

type Context = { params: Promise<{ editionId: string; conceptKey: string }> };

async function scopeOf(context: Context) {
  const params = await context.params;
  const key = textbookKeySchema.safeParse(params.conceptKey);
  if (!key.success) throw notFound("개념");
  return {
    editionId: uuidParam(params.editionId, "판본"),
    conceptKey: key.data,
  };
}

export const GET = withErrorLog(
  "/api/textbook/editions/[editionId]/concepts/[conceptKey]",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const scope = await scopeOf(context);
      return data(
        textbookConceptRecordSchema,
        await getConcept(db, actor, scope.editionId, scope.conceptKey),
      );
    }),
);

export const PUT = withErrorLog(
  "/api/textbook/editions/[editionId]/concepts/[conceptKey]",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const scope = await scopeOf(context);
      const body = await readBody(request, textbookSaveConceptSchema);
      const saved = await saveConcept(
        db,
        actor,
        scope.editionId,
        scope.conceptKey,
        requestKeyOf(actor, "concept-save", body, scope),
        body,
        resolveReviewedConcept,
      );
      return data(textbookConceptRecordSchema, {
        concept: saved.concept,
        revision: saved.revision,
        aggregateRevision: saved.aggregateRevision,
      });
    }),
);
