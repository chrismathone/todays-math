import { z } from "zod";
import { studentLoginIdSchema } from "@/contracts/studentAccount.contract";
import { authorizeAccount } from "@/lib/accountAccess";
import { recordAudit } from "@/lib/audit";
import { generateInitialPassword } from "@/lib/concept/initialPassword";
import { db } from "@/lib/db";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { hashStudentPin } from "@/lib/learn/pinHash";
import { isPrismaErrorCode } from "@/lib/prismaErrors";

const createSchema = z.strictObject({
  classId: z.uuid(),
  name: z.string().trim().min(1).max(50),
  loginId: studentLoginIdSchema,
});

async function handlePost(request: Request) {
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
          message: "지점 관리자만 학생 계정을 만들 수 있습니다.",
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
  const { classId, name, loginId } = parsed.data;
  const target = await db.class.findFirst({
    where: { id: classId, user: { branchId } },
    select: { id: true },
  });
  if (!target)
    return Response.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "소속 지점의 반을 선택해 주세요.",
        },
      },
      { status: 404 },
    );

  const initialPassword = generateInitialPassword();
  try {
    // Nested create keeps the roster and login together if the login ID is already taken.
    const student = await db.student.create({
      data: {
        classId,
        name,
        studentAccount: {
          create: {
            loginId,
            passwordHash: await hashStudentPin(initialPassword),
            issuedById: access.account!.id,
          },
        },
      },
      include: { studentAccount: { select: { id: true, issuedAt: true } } },
    });
    await recordAudit({
      userId: access.account!.id,
      actorId: access.account!.id,
      action: "student_account.issue",
      outcome: "success",
      details: {
        studentId: student.id,
        studentAccountId: student.studentAccount!.id,
        loginId,
      },
    });
    return Response.json(
      {
        data: {
          id: student.id,
          name: student.name,
          classId: student.classId,
          loginId,
          initialPassword,
          issuedAt: student.studentAccount!.issuedAt.toISOString(),
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002"))
      return Response.json(
        {
          error: {
            code: "CONFLICT",
            message: "이미 사용 중인 학생 아이디입니다.",
          },
        },
        { status: 409 },
      );
    throw error;
  }
}

export const POST = withErrorLog("/api/branch/students", handlePost);
