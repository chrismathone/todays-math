/**
 * PUT /api/textbook/concept-attempts/{attemptId}/review — 교사의 확인(`checked` · `needs-review`)과 메모.
 * `expectedRevision` 으로 충돌을 본다. 학생이 낸 글은 바뀌지 않는다.
 */
import {
  textbookAttemptReviewSchema,
  textbookConceptAttemptSchema,
} from "@/contracts/textbookConcept.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { reviewAttempt } from "@/lib/textbook/server/conceptRows";
import {
  data,
  readBody,
  requestKeyOf,
  textbookRoute,
  uuidParam,
} from "@/lib/textbook/server/http";

type Context = { params: Promise<{ attemptId: string }> };

export const PUT = withErrorLog(
  "/api/textbook/concept-attempts/[attemptId]/review",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const attemptId = uuidParam(
        (await context.params).attemptId,
        "활동 기록",
      );
      const body = await readBody(request, textbookAttemptReviewSchema);
      const { attempt } = await reviewAttempt(
        db,
        actor,
        attemptId,
        requestKeyOf(actor, "attempt-review", body, { attemptId }),
        body,
      );
      return data(textbookConceptAttemptSchema, attempt);
    }),
);
