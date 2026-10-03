import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { authorizeAccount } from "@/lib/accountAccess";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

type Context = { params: Promise<{ id: string }> };

async function handlePost(request: Request, context: Context) {
  const access = await authorizeAccount(request, true, true);
  if (access.response) return access.response;
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success)
    return Response.json(
      { error: { code: "NOT_FOUND", message: "계정을 찾지 못했습니다." } },
      { status: 404 },
    );
  const target = await db.user.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, isSuperAdmin: true, authSource: true },
  });
  if (!target || target.isSuperAdmin || target.authSource === "eywa")
    return Response.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "이 계정의 비밀번호는 여기서 재발급할 수 없습니다.",
        },
      },
      { status: 403 },
    );
  const mapping = await db.eywaManagedAccount.findUnique({
    where: { currentUserId: id },
  });
  let recoveryEvidence: string | undefined;
  if (mapping) {
    const input = z
      .object({ recoveryEvidence: z.string().trim().min(30).max(1000) })
      .safeParse(await request.json().catch(() => null));
    if (!input.success)
      return Response.json(
        {
          error: {
            code: "FORBIDDEN",
            message:
              "연동 계정 복구는 독립적인 소유권 확인 근거를 기록해야 합니다.",
          },
        },
        { status: 403 },
      );
    recoveryEvidence = input.data.recoveryEvidence;
  }
  const initialPassword = randomBytes(12).toString("base64url");
  await db.user.update({
    where: { id },
    data: {
      passwordHash: await hash(initialPassword, 10),
      sessionVersion: { increment: 1 },
    },
  });
  await recordAudit({
    userId: id,
    actorId: access.account!.id,
    action: "account.password_reissued",
    outcome: "success",
    ...(recoveryEvidence
      ? { details: { recoveryEvidence, bindingId: mapping!.bindingId } }
      : {}),
  });
  return Response.json(
    { data: { initialPassword } },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export const POST = withErrorLog("/api/admin/users/[id]/password", handlePost);
