import { z } from "zod";
import { authorizeAccount } from "@/lib/accountAccess";
import { db } from "@/lib/db";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

const profileSchema = z.strictObject({
  name: z.string().trim().min(1).max(50),
});

async function handlePatch(request: Request) {
  const access = await authorizeAccount(request);
  if (access.response) return access.response;

  const parsed = profileSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "이름은 1~50자로 입력해 주세요.",
        },
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );

  const userId = access.account!.id;
  const current = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, deletedAt: true, suspendedAt: true },
  });
  if (!current || current.deletedAt || current.suspendedAt)
    return Response.json(
      { error: { code: "FORBIDDEN", message: "계정 상태를 확인해 주세요." } },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );

  if (current.name !== parsed.data.name) {
    const changed = await db.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: {
          id: userId,
          name: current.name,
          deletedAt: null,
          suspendedAt: null,
        },
        data: { name: parsed.data.name },
      });
      if (updated.count !== 1) return false;
      await tx.accountAuditLog.create({
        data: {
          userId,
          actorId: userId,
          action: "account.profile_updated",
          outcome: "success",
          details: { fields: ["name"] },
        },
      });
      return true;
    });
    if (!changed)
      return Response.json(
        {
          error: {
            code: "CONFLICT",
            message:
              "계정 정보가 변경됐습니다. 새로고침 후 다시 시도해 주세요.",
          },
        },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
  }

  const updated = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, updatedAt: true },
  });
  if (!updated || updated.name !== parsed.data.name)
    return Response.json(
      {
        error: {
          code: "CONFLICT",
          message: "계정 정보가 변경됐습니다. 새로고침 후 다시 시도해 주세요.",
        },
      },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  return Response.json(
    {
      data: { name: updated.name, updatedAt: updated.updatedAt.toISOString() },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export const PATCH = withErrorLog("/api/account/profile", handlePatch);
