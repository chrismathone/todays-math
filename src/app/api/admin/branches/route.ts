import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { authorizeAccount } from "@/lib/accountAccess";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { isPrismaErrorCode } from "@/lib/prismaErrors";

const createSchema = z.strictObject({
  branchName: z.string().trim().min(1).max(100),
  ownerName: z.string().trim().min(1).max(50),
  ownerEmail: z
    .email()
    .max(255)
    .transform((value) => value.trim().toLowerCase()),
});

async function handleGet(request: Request) {
  const access = await authorizeAccount(request, true, true);
  if (access.response) return access.response;
  const branches = await db.branch.findMany({
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: { select: { users: true } },
      users: {
        where: { branchRole: "owner", deletedAt: null },
        select: { id: true, name: true, email: true, suspendedAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
  });
  return Response.json(
    { data: branches },
    { headers: { "Cache-Control": "no-store" } },
  );
}

async function handlePost(request: Request) {
  const access = await authorizeAccount(request, true, true);
  if (access.response) return access.response;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "지점명과 원장 정보를 확인해 주세요.",
        },
      },
      { status: 400 },
    );
  const { branchName, ownerName, ownerEmail } = parsed.data;
  const initialPassword = randomBytes(18).toString("base64url");
  const passwordHash = await hash(initialPassword, 10);
  try {
    const created = await db.$transaction(async (tx) => {
      const branch = await tx.branch.create({ data: { name: branchName } });
      const owner = await tx.user.create({
        data: {
          email: ownerEmail,
          name: ownerName,
          passwordHash,
          approvalStatus: "approved",
          branchId: branch.id,
          branchRole: "owner",
          isAdmin: true,
          isSuperAdmin: false,
        },
        select: { id: true, email: true, name: true },
      });
      return { branch, owner };
    });
    await recordAudit({
      userId: created.owner.id,
      actorId: access.account!.id,
      action: "admin.branch_created",
      outcome: "success",
      details: { branchId: created.branch.id },
    });
    return Response.json(
      {
        data: {
          branch: { id: created.branch.id, name: created.branch.name },
          owner: created.owner,
          initialPassword,
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
            message: "이미 사용 중인 원장 이메일입니다.",
          },
        },
        { status: 409 },
      );
    throw error;
  }
}

export const GET = withErrorLog("/api/admin/branches", handleGet);
export const POST = withErrorLog("/api/admin/branches", handlePost);
