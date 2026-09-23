import { z } from "zod";
import { authorizeAccount } from "@/lib/accountAccess";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

type Context = { params: Promise<{ id: string }> };
const schema = z.strictObject({ classId: z.uuid() });

async function handlePatch(request: Request, context: Context) {
  const access = await authorizeAccount(request, true);
  if (access.response) return access.response;
  const branchId = access.account?.branchId;
  if (
    !branchId ||
    !["owner", "manager"].includes(access.account?.branchRole ?? "")
  )
    return Response.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "지점 관리자만 학생을 배정할 수 있습니다.",
        },
      },
      { status: 403 },
    );
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(id).success || !parsed.success)
    return Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "학생과 반을 확인해 주세요.",
        },
      },
      { status: 400 },
    );
  const [student, target] = await Promise.all([
    db.student.findFirst({
      where: { id, class: { user: { branchId } } },
      select: { id: true, classId: true },
    }),
    db.class.findFirst({
      where: { id: parsed.data.classId, user: { branchId } },
      select: { id: true },
    }),
  ]);
  if (!student || !target)
    return Response.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "같은 지점의 학생과 반을 선택해 주세요.",
        },
      },
      { status: 404 },
    );
  if (student.classId !== target.id) {
    await db.student.update({ where: { id }, data: { classId: target.id } });
    await recordAudit({
      userId: access.account!.id,
      actorId: access.account!.id,
      action: "branch.student_assigned",
      outcome: "success",
      details: {
        studentId: id,
        previousClassId: student.classId,
        classId: target.id,
      },
    });
  }
  return Response.json(
    { data: { id, classId: target.id } },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export const PATCH = withErrorLog("/api/branch/students/[id]", handlePatch);
