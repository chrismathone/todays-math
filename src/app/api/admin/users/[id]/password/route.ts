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
    select: { id: true, isSuperAdmin: true },
  });
  if (!target || target.isSuperAdmin)
    return Response.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "이 계정의 비밀번호는 여기서 재발급할 수 없습니다.",
        },
      },
      { status: 403 },
    );
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
  });
  return Response.json(
    { data: { initialPassword } },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export const POST = withErrorLog("/api/admin/users/[id]/password", handlePost);
