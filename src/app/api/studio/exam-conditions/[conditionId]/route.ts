import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { deleteExamCondition, patchExamCondition } from "@/lib/examConditions";

type Context = { params: Promise<{ conditionId: string }> };
// 이름 바꾸기 · 적용(마지막 사용) · 삭제.
export const PATCH = withErrorLog(
  "/api/studio/exam-conditions/[conditionId]",
  async (request: Request, context: Context) =>
    patchExamCondition(request, (await context.params).conditionId),
);
export const DELETE = withErrorLog(
  "/api/studio/exam-conditions/[conditionId]",
  async (request: Request, context: Context) =>
    deleteExamCondition(request, (await context.params).conditionId),
);
