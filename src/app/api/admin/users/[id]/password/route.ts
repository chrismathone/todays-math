import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { authorizeAccount } from "@/lib/accountAccess";
import { auditData } from "@/lib/audit";
import { db } from "@/lib/db";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { isPrismaErrorCode } from "@/lib/prismaErrors";

type Context = { params: Promise<{ id: string }> };
const resetSchema = z.strictObject({
  expectedUpdatedAt: z.iso.datetime(),
  expectedBranchId: z.uuid().nullable(),
  recoveryEvidence: z.string().trim().max(1000).optional(),
});
const failure = (code: string, message: string, status: number) =>
  Response.json({ error: { code, message } }, { status });
const conflict = () =>
  failure(
    "CONFLICT",
    "다른 관리자가 설정을 변경했습니다. 새로고침 후 다시 확인해 주세요.",
    409,
  );

async function handlePost(request: Request, context: Context) {
  const access = await authorizeAccount(request, true, true);
  if (access.response) return access.response;
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success)
    return failure("NOT_FOUND", "계정을 찾지 못했습니다.", 404);
  const parsed = resetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return failure(
      "VALIDATION_ERROR",
      "계정 정보를 새로고침 후 다시 확인해 주세요.",
      400,
    );
  const { expectedUpdatedAt, expectedBranchId, recoveryEvidence } = parsed.data;
  const initialPassword = randomBytes(12).toString("base64url");
  const passwordHash = await hash(initialPassword, 10);
  try {
    return await db.$transaction(
      async (tx) => {
        const target = await tx.user.findFirst({
          where: { id, deletedAt: null },
          select: {
            id: true,
            isSuperAdmin: true,
            authSource: true,
            updatedAt: true,
            branchId: true,
          },
        });
        if (!target || target.isSuperAdmin || target.authSource === "eywa")
          return failure(
            "FORBIDDEN",
            "이 계정의 비밀번호는 여기서 재발급할 수 없습니다.",
            403,
          );
        if (
          target.updatedAt.getTime() !==
            new Date(expectedUpdatedAt).getTime() ||
          target.branchId !== expectedBranchId
        )
          return conflict();
        const mapping = await tx.eywaManagedAccount.findUnique({
          where: { currentUserId: id },
        });
        if (mapping && (!recoveryEvidence || recoveryEvidence.length < 30))
          return failure(
            "FORBIDDEN",
            "연동 계정 복구는 독립적인 소유권 확인 근거를 기록해야 합니다.",
            403,
          );
        const changed = await tx.user.updateMany({
          where: {
            id,
            deletedAt: null,
            isSuperAdmin: false,
            authSource: target.authSource,
            updatedAt: new Date(expectedUpdatedAt),
            branchId: expectedBranchId,
          },
          data: {
            passwordHash,
            sessionVersion: { increment: 1 },
            // Advance even if two requests happen in the same millisecond.
            updatedAt: new Date(
              Math.max(Date.now(), target.updatedAt.getTime() + 1),
            ),
          },
        });
        if (changed.count !== 1) return conflict();
        await tx.accountAuditLog.create({
          data: auditData({
            userId: id,
            actorId: access.account!.id,
            action: "account.password_reissued",
            outcome: "success",
            ...(mapping
              ? {
                  details: {
                    recoveryEvidence: recoveryEvidence!,
                    bindingId: mapping.bindingId,
                  },
                }
              : {}),
          }),
        });
        return Response.json(
          { data: { initialPassword } },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (isPrismaErrorCode(error, "P2034")) return conflict();
    throw error;
  }
}

export const POST = withErrorLog("/api/admin/users/[id]/password", handlePost);
