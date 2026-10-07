import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { authorizeAccount } from "@/lib/accountAccess";
import { isPrismaErrorCode } from "@/lib/prismaErrors";
import { recordAudit } from "@/lib/audit";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

const createSchema = z.strictObject({
  email: z
    .email()
    .max(255)
    .transform((value) => value.trim().toLowerCase()),
  name: z.string().trim().min(1).max(50),
  role: z.enum(["owner", "manager", "teacher"]),
});

async function branchAccess(request: Request) {
  const access = await authorizeAccount(request, true);
  if (access.response) return access;
  if (
    !access.account?.branchId ||
    !["owner", "manager"].includes(access.account.branchRole ?? "")
  )
    return {
      account: null,
      response: Response.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "소속 지점의 관리 권한이 필요합니다.",
          },
        },
        { status: 403 },
      ),
    };
  return access;
}

async function handleGet(request: Request) {
  const access = await branchAccess(request);
  if (access.response) return access.response;
  const users = await db.user.findMany({
    where: { branchId: access.account!.branchId, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      branchRole: true,
      isAdmin: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  return Response.json(
    { data: users },
    { headers: { "Cache-Control": "no-store" } },
  );
}

async function handlePost(request: Request) {
  const access = await branchAccess(request);
  if (access.response) return access.response;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "이름, 이메일, 권한을 확인해 주세요.",
        },
      },
      { status: 400 },
    );
  const { email, name, role } = parsed.data;
  if (access.account!.branchRole !== "owner" && role !== "teacher")
    return Response.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "원장·관리자 발급은 지점장만 할 수 있습니다.",
        },
      },
      { status: 403 },
    );
  // 발급마다 새로 뽑아 이 응답에 한 번만 싣는다 — 관리 콘솔의 발급(`api/admin/users/[id]/password`)과 같은 꼴.
  // 고정 기본값이던 때는 직원 계정에 강제 변경 · 실패 잠금이 없어 이메일만 알면 들어올 수 있었다(2026-10-07 검수).
  const initialPassword = randomBytes(12).toString("base64url");
  try {
    const user = await db.user.create({
      data: {
        email,
        name,
        passwordHash: await hash(initialPassword, 10),
        approvalStatus: "approved",
        branchId: access.account!.branchId!,
        branchRole: role,
        isAdmin: role !== "teacher",
        isSuperAdmin: false,
      },
      select: { id: true, email: true, name: true, branchRole: true },
    });
    await recordAudit({
      userId: user.id,
      actorId: access.account!.id,
      action: "branch.account_created",
      outcome: "success",
      details: { branchId: access.account!.branchId ?? null, role },
    });
    return Response.json(
      { data: { ...user, initialPassword } },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002"))
      return Response.json(
        {
          error: { code: "CONFLICT", message: "이미 사용 중인 이메일입니다." },
        },
        { status: 409 },
      );
    throw error;
  }
}

export const GET = withErrorLog("/api/branch/accounts", handleGet);
export const POST = withErrorLog("/api/branch/accounts", handlePost);
