import { z } from "zod";
import { db } from "@/lib/db";
import { authorizeAccount } from "@/lib/accountAccess";
import { managedAccount, managedAccountSelect } from "@/lib/adminAccounts";
import {
  accountUpdateSchema,
  ALL_WORKSPACE_MENUS,
} from "@/contracts/accountAccess.contract";
import { auditData, recordAudit } from "@/lib/audit";

type Context = { params: Promise<{ id: string }> };
const failure = (message: string, status: number) =>
  Response.json(
    {
      error: {
        code:
          status === 409
            ? "CONFLICT"
            : status === 404
              ? "NOT_FOUND"
              : "FORBIDDEN",
        message,
      },
    },
    { status },
  );
export async function GET(request: Request, context: Context) {
  const access = await authorizeAccount(request, true);
  if (access.response) return access.response;
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success)
    return failure("사용자를 찾지 못했습니다.", 404);
  const user = await db.user.findFirst({
    where: { id, deletedAt: null },
    select: managedAccountSelect,
  });
  if (user)
    await recordAudit({
      userId: id,
      actorId: access.account!.id,
      action: "admin.account_view",
      outcome: "success",
    });
  return user
    ? Response.json(
        { data: managedAccount(user) },
        { headers: { "Cache-Control": "no-store" } },
      )
    : failure("사용자를 찾지 못했습니다.", 404);
}
export async function PATCH(request: Request, context: Context) {
  const access = await authorizeAccount(request, true);
  if (access.response) return access.response;
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success)
    return failure("사용자를 찾지 못했습니다.", 404);
  const parsed = accountUpdateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "변경할 설정을 확인해 주세요.",
        },
      },
      { status: 400 },
    );
  const update = parsed.data;
  const result = await db.$transaction(async (tx) => {
    const previous = await tx.user.findFirst({
      where: { id, deletedAt: null },
      select: managedAccountSelect,
    });
    if (!previous) return { error: failure("사용자를 찾지 못했습니다.", 404) };
    if (previous.isAdmin)
      return {
        error: failure(
          "관리자 계정의 권한은 이 화면에서 변경할 수 없습니다.",
          403,
        ),
      };
    const changed = await tx.user.updateMany({
      where: {
        id,
        isAdmin: false,
        deletedAt: null,
        updatedAt: new Date(update.expectedUpdatedAt),
      },
      data: {
        ...(update.approvalStatus
          ? { approvalStatus: update.approvalStatus }
          : {}),
        ...(update.menus
          ? {
              disabledMenus: ALL_WORKSPACE_MENUS.filter(
                (menu) => !update.menus!.includes(menu),
              ),
            }
          : {}),
      },
    });
    if (changed.count !== 1)
      return {
        error: failure(
          "다른 관리자가 설정을 변경했습니다. 새로고침 후 다시 확인해 주세요.",
          409,
        ),
      };
    const user = await tx.user.findUniqueOrThrow({
      where: { id },
      select: managedAccountSelect,
    });
    await tx.accountAuditLog.create({
      data: auditData({
        userId: id,
        actorId: access.account!.id,
        action: "account.settings_changed",
        outcome: "success",
        details: {
          previousStatus: previous.approvalStatus,
          status: user.approvalStatus,
          previousMenus: managedAccount(previous).menus,
          menus: managedAccount(user).menus,
        },
      }),
    });
    return { user };
  });
  return "error" in result
    ? result.error
    : Response.json(
        { data: managedAccount(result.user) },
        { headers: { "Cache-Control": "no-store" } },
      );
}
