import { z } from "zod";
import {
  studentListQuerySchema,
  studentListResponseSchema,
} from "@/contracts/class.contract";
import { authorizeAccount } from "@/lib/accountAccess";
import { forbiddenError, jsonOk, validationError } from "@/lib/apiResponse";
import { recordAudit } from "@/lib/audit";
import {
  currentEnrollmentWhere,
  studentsInClassWhere,
} from "@/lib/classAccess";
import { db } from "@/lib/db";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { canManageStudentAccounts } from "@/lib/learn/studentAccountPolicy";
import { serializeStudent } from "@/lib/serializers";

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

async function handleGet(request: Request) {
  const access = await authorizeAccount(request);
  if (access.response) return access.response;
  const branchId = access.account?.branchId;
  if (!branchId || !access.account || !canManageStudentAccounts(access.account))
    return forbiddenError();

  const parsed = studentListQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success) return validationError(parsed.error);

  const { page, pageSize, classId } = parsed.data;
  const target = await db.class.findFirst({
    where: { id: classId, branchId },
    select: { id: true },
  });
  if (!target) return forbiddenError();

  const [rows, total] = await Promise.all([
    db.student.findMany({
      where: studentsInClassWhere(classId),
      include: {
        enrollments: {
          where: { classId, ...currentEnrollmentWhere(undefined, true) },
          orderBy: { startsOn: "desc" },
          take: 1,
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "asc" },
    }),
    db.student.count({ where: studentsInClassWhere(classId) }),
  ]);

  const response = jsonOk(studentListResponseSchema, {
    data: rows.map((row) =>
      serializeStudent({
        ...row,
        classId,
        ...(row.eywaBindingId
          ? {
              eywaLastReportDate:
                row.enrollments[0]?.eywaLastReportDate ?? null,
              eywaLastReportText:
                row.enrollments[0]?.eywaLastReportText ?? null,
            }
          : {}),
      }),
    ),
    meta: { page, pageSize, total },
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

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
export const GET = withErrorLog("/api/branch/students", handleGet);
export const POST = withErrorLog("/api/branch/students", handlePost);
