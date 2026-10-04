import { z } from "zod";
import { authorizeAccount } from "@/lib/accountAccess";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { canManageStudentAccounts } from "@/lib/learn/studentAccountPolicy";

const createSchema = z.strictObject({
  classId: z.uuid(),
  name: z.string().trim().min(1).max(50),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .refine(
      (phone) =>
        !phone ||
        (/^[0-9+()\-\s]+$/.test(phone) &&
          phone.replace(/[^0-9]/g, "").length >= 7),
      { error: "전화번호를 확인해 주세요." },
    ),
});

/** Registration creates a roster record only. Class-wide issuance is a separate explicit action. */
async function handlePost(request: Request) {
  const access = await authorizeAccount(request);
  if (access.response) return access.response;
  const branchId = access.account?.branchId;
  if (!branchId || !access.account || !canManageStudentAccounts(access.account))
    return Response.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "지점 관리자만 학생을 등록할 수 있습니다.",
        },
      },
      { status: 403 },
    );
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message:
            parsed.error.issues[0]?.message ?? "학생 정보를 확인해 주세요.",
        },
      },
      { status: 400 },
    );
  const { classId, name, phone } = parsed.data;
  const target = await db.class.findFirst({
    where: {
      id: classId,
      branchId,
      eywaBindingId: null,
      active: true,
      OR: [{ closedAt: null }, { closedAt: { gt: new Date() } }],
    },
    select: { id: true },
  });
  if (!target)
    return Response.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "소속 지점의 운영 중인 반을 선택해 주세요.",
        },
      },
      { status: 404 },
    );
  const phoneLast4 = phone ? phone.replace(/[^0-9]/g, "").slice(-4) : null;
  const student = await db.student.create({
    data: { classId, branchId, name, phoneLast4 },
  });
  await recordAudit({
    userId: access.account.id,
    actorId: access.account.id,
    action: "student.register",
    outcome: "success",
    details: { studentId: student.id, classId },
  });
  return Response.json(
    { data: { id: student.id, name: student.name, classId: student.classId } },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
export const POST = withErrorLog("/api/branch/students", handlePost);
