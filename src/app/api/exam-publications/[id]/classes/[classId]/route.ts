/**
 * DELETE /api/exam-publications/{id}/classes/{classId} — 한 반에 낸 것 지우기(채점을 시작하기 전만).
 * 대응 계약: src/contracts/examPublication.contract.ts
 */
import { uuidSchema } from "@/contracts/common.contract";
import { notFoundError, unauthorizedError } from "@/lib/apiResponse";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { deleteExamPublicationClass } from "@/lib/examPublication/server";
import { getSessionUser } from "@/lib/session";

async function handleDelete(
  _request: Request,
  context: { params: Promise<{ id: string; classId: string }> },
) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();
  const { id, classId } = await context.params;
  if (
    !uuidSchema.safeParse(id).success ||
    !uuidSchema.safeParse(classId).success
  )
    return notFoundError("낸 시험");
  return deleteExamPublicationClass(session, id, classId);
}

export const DELETE = withErrorLog(
  "/api/exam-publications/[id]/classes/[classId]",
  handleDelete,
);
