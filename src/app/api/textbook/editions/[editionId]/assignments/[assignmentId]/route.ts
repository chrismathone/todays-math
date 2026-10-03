/**
 * DELETE …/assignments/{assignmentId} — 회수. 줄을 지우지 않고 회수 시각을 찍는다(다음 요청부터 학생에게 닫힌다).
 */
import {
  textbookAssignmentSchema,
  textbookRequestSchema,
} from "@/contracts/textbook.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { revokeAssignment } from "@/lib/textbook/server/assignments";
import {
  data,
  readBody,
  requestKeyOf,
  textbookRoute,
  uuidParam,
} from "@/lib/textbook/server/http";

type Context = {
  params: Promise<{ editionId: string; assignmentId: string }>;
};

export const DELETE = withErrorLog(
  "/api/textbook/editions/[editionId]/assignments/[assignmentId]",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const params = await context.params;
      const scope = {
        editionId: uuidParam(params.editionId, "판본"),
        assignmentId: uuidParam(params.assignmentId, "배정"),
      };
      const body = await readBody(request, textbookRequestSchema);
      const { assignment } = await revokeAssignment(
        db,
        actor,
        scope.editionId,
        scope.assignmentId,
        requestKeyOf(actor, "assign-revoke", body, scope),
      );
      return data(textbookAssignmentSchema, assignment);
    }),
);
