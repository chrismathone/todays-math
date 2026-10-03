import { z } from "zod";
import { db } from "@/lib/db";
import { authorizeAccount } from "@/lib/accountAccess";
import { managedAccount, managedAccountSelect } from "@/lib/adminAccounts";
import {
  accountUpdateSchema,
  ALL_WORKSPACE_MENUS,
} from "@/contracts/accountAccess.contract";
import { auditData, recordAudit } from "@/lib/audit";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { isPrismaErrorCode } from "@/lib/prismaErrors";

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
async function handleGet(request: Request, context: Context) {
  const access = await authorizeAccount(request, true, true);
  if (access.response) return access.response;
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success)
    return failure("사용자를 찾지 못했습니다.", 404);
  const user = await db.user.findFirst({
    where: { id },
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
async function handlePatch(request: Request, context: Context) {
  const access = await authorizeAccount(request, true, true);
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
  let result;
  try {
    result = await db.$transaction(
      async (tx) => {
        const previous = await tx.user.findFirst({
          where: { id },
          select: managedAccountSelect,
        });
        if (!previous)
          return { error: failure("사용자를 찾지 못했습니다.", 404) };
        if (
          update.expectedBranchId !== undefined &&
          update.expectedBranchId !== previous.branchId
        )
          return {
            error: failure(
              "계정의 소속이 변경되었습니다. 새로고침 후 다시 확인해 주세요.",
              409,
            ),
          };
        const managed = await tx.eywaManagedAccount.findUnique({
          where: { currentUserId: id },
        });
        if (
          managed &&
          (update.branchId !== undefined ||
            update.branchRole !== undefined ||
            update.isAdmin !== undefined)
        )
          return {
            error: failure(
              "연동 계정의 소속과 관리 권한은 연결 관리에서 확인해 주세요.",
              403,
            ),
          };
        if (
          previous.updatedAt.getTime() !==
          new Date(update.expectedUpdatedAt).getTime()
        )
          return {
            error: failure(
              "다른 관리자가 설정을 변경했습니다. 새로고침 후 다시 확인해 주세요.",
              409,
            ),
          };
        if (previous.isSuperAdmin)
          return {
            error: failure(
              "최고관리자 계정의 권한은 이 화면에서 변경할 수 없습니다.",
              403,
            ),
          };
        if (previous.deletedAt && update.deleted !== false)
          return {
            error: failure("삭제된 계정은 복원한 뒤 변경해 주세요.", 403),
          };
        const branchMoving =
          update.branchId !== undefined &&
          update.branchId !== previous.branchId;
        const targetBranchId =
          update.branchId === undefined ? previous.branchId : update.branchId;
        if (update.isAdmin !== undefined && !targetBranchId)
          return { error: failure("먼저 계정을 지점에 소속시켜 주세요.", 403) };
        if (update.branchRole !== undefined && update.branchId === undefined)
          return {
            error: failure("지점 소속과 계정 유형을 함께 선택해 주세요.", 403),
          };
        if (update.branchId !== undefined) {
          if (update.isAdmin !== undefined)
            return {
              error: failure(
                "지점 배정 중에는 계정 유형만 선택해 주세요.",
                403,
              ),
            };
          if (update.branchId === null && update.branchRole !== undefined)
            return {
              error: failure(
                "독립 계정에는 지점 계정 유형을 지정할 수 없습니다.",
                403,
              ),
            };
          if (update.branchId && !update.branchRole)
            return {
              error: failure("지점에서 사용할 계정 유형을 선택해 주세요.", 403),
            };
          const [branch, classCount] = await Promise.all([
            update.branchId
              ? tx.branch.findUnique({
                  where: { id: update.branchId },
                  select: { id: true },
                })
              : null,
            branchMoving ? tx.class.count({ where: { userId: id } }) : 0,
          ]);
          if (update.branchId && !branch)
            return { error: failure("선택한 지점을 찾지 못했습니다.", 404) };
          if (classCount > 0)
            return {
              error: failure(
                "운영 중인 반이 있는 계정은 소속을 변경할 수 없습니다.",
                403,
              ),
            };
        }
        if (
          previous.branchRole === "owner" &&
          previous.approvalStatus === "approved" &&
          !previous.suspendedAt &&
          !previous.deletedAt &&
          (branchMoving ||
            (update.branchRole !== undefined &&
              update.branchRole !== "owner") ||
            update.isAdmin === false ||
            update.suspended === true ||
            update.deleted === true ||
            (update.approvalStatus !== undefined &&
              update.approvalStatus !== "approved"))
        ) {
          const ownerCount = await tx.user.count({
            where: {
              branchId: previous.branchId,
              branchRole: "owner",
              approvalStatus: "approved",
              deletedAt: null,
              suspendedAt: null,
            },
          });
          if (ownerCount <= 1)
            return {
              error: failure(
                "마지막 활성 원장은 소속·계정 유형을 변경하거나 정지·삭제할 수 없습니다.",
                403,
              ),
            };
        }
        const changed = await tx.user.updateMany({
          where: {
            id,
            isSuperAdmin: false,
            updatedAt: new Date(update.expectedUpdatedAt),
            branchId: previous.branchId,
          },
          data: {
            ...(update.approvalStatus
              ? { approvalStatus: update.approvalStatus }
              : {}),
            ...(update.name !== undefined ? { name: update.name } : {}),
            ...(update.email !== undefined ? { email: update.email } : {}),
            ...(update.suspended !== undefined
              ? {
                  manualSuspendedAt: update.suspended ? new Date() : null,
                  suspendedAt: update.suspended
                    ? new Date()
                    : managed?.blockReasons.length
                      ? (previous.suspendedAt ?? new Date())
                      : null,
                }
              : {}),
            ...(update.deleted !== undefined
              ? { deletedAt: update.deleted ? new Date() : null }
              : {}),
            ...(update.branchId !== undefined
              ? {
                  branchId: update.branchId,
                  branchRole: update.branchId ? update.branchRole : null,
                  isAdmin:
                    Boolean(update.branchId) && update.branchRole !== "teacher",
                }
              : {}),
            ...(update.suspended !== undefined ||
            update.deleted !== undefined ||
            update.branchId !== undefined
              ? { sessionVersion: { increment: 1 } }
              : {}),
            ...(update.isAdmin !== undefined
              ? {
                  isAdmin: update.isAdmin,
                  branchRole: update.isAdmin
                    ? previous.branchRole === "owner"
                      ? "owner"
                      : "manager"
                    : "teacher",
                }
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
        if (branchMoving) {
          // Leaving and later rejoining a branch must not republish an old
          // sharing choice. Keep every document, but require a fresh consent.
          await tx.workspaceDocument.updateMany({
            where: { userId: id, visibility: "branch" },
            data: {
              visibility: "private",
              sharedBranchId: null,
              revision: { increment: 1 },
            },
          });
        }
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
              previousBranchManager: previous.isAdmin,
              branchManager: user.isAdmin,
              previousBranchId: previous.branchId,
              branchId: user.branchId,
              suspended: Boolean(user.suspendedAt),
              deleted: Boolean(user.deletedAt),
              previousMenus: managedAccount(previous).menus,
              menus: managedAccount(user).menus,
            },
          }),
        });
        return { user };
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (isPrismaErrorCode(error, "P2034"))
      return failure(
        "다른 관리자가 설정을 변경했습니다. 새로고침 후 다시 확인해 주세요.",
        409,
      );
    if (isPrismaErrorCode(error, "P2002"))
      return failure("이미 사용 중인 이메일입니다.", 409);
    throw error;
  }
  return "error" in result
    ? result.error
    : Response.json(
        { data: managedAccount(result.user) },
        { headers: { "Cache-Control": "no-store" } },
      );
}

export const GET = withErrorLog("/api/admin/users/[id]", handleGet);
export const PATCH = withErrorLog("/api/admin/users/[id]", handlePatch);
