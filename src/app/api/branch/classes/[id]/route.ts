import { z } from "zod";
import { db } from "@/lib/db";
import { authorizeAccount } from "@/lib/accountAccess";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { recordAudit } from "@/lib/audit";

type Context = { params: Promise<{ id: string }> };
const schema = z.strictObject({ teacherId: z.uuid() });

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
          message: "지점 관리자만 반을 배정할 수 있습니다.",
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
          message: "반과 강사를 확인해 주세요.",
        },
      },
      { status: 400 },
    );
  const [cls, teacher] = await Promise.all([
    db.class.findFirst({
      where: { id, user: { branchId } },
      select: { id: true, userId: true },
    }),
    db.user.findFirst({
      where: {
        id: parsed.data.teacherId,
        branchId,
        deletedAt: null,
        approvalStatus: "approved",
        branchRole: { in: ["owner", "manager", "teacher"] },
      },
      select: { id: true },
    }),
  ]);
  if (!cls || !teacher)
    return Response.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "같은 지점의 반과 강사를 선택해 주세요.",
        },
      },
      { status: 404 },
    );
  await db.class.update({ where: { id }, data: { userId: teacher.id } });
  await recordAudit({
    userId: access.account!.id,
    actorId: access.account!.id,
    action: "branch.class_assigned",
    outcome: "success",
    details: {
      classId: id,
      previousTeacherId: cls.userId,
      teacherId: teacher.id,
    },
  });
  return Response.json(
    { data: { id, teacherId: teacher.id } },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export const PATCH = withErrorLog("/api/branch/classes/[id]", handlePatch);
