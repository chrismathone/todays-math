/**
 * DELETE /api/admin/users/[id]/eywa-link — 관리자가 남의 eywa 연결을 푼다 (D-139 ⑹ · 화면 없음, 원장님 «뒷단만»).
 *
 * 권한은 옆 라우트 `api/admin/users/[id]`·`/password` 와 같은 줄이다 — 승인된 **최고관리자** · 같은 사이트
 * (`authorizeAccount(request, true, true)`). 최고관리자 계정은 여기서 건드리지 않는다(옆 라우트와 같다 —
 * 본인은 `DELETE /api/account/eywa-link` 로 푼다). 지워진·정지된 계정도 풀 수 있다 — 연결을 없애는 일은
 * 접근을 넓히지 않는다. 감사 `auth.eywa-unlink`(details 에 이메일 없음).
 */
import { z } from "zod";

import { EYWA_LINK_MESSAGES } from "@/contracts/eywaLink.contract";
import { authorizeAccount } from "@/lib/accountAccess";
import { auditData } from "@/lib/audit";
import { db } from "@/lib/db";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { isPrismaErrorCode } from "@/lib/prismaErrors";

type Context = { params: Promise<{ id: string }> };

const failure = (code: string, message: string, status: number) =>
  Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );

async function handleDelete(request: Request, context: Context) {
  const access = await authorizeAccount(request, true, true);
  if (access.response) return access.response;
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success)
    return failure("NOT_FOUND", "사용자를 찾지 못했습니다.", 404);
  const conflict = () =>
    failure(
      "CONFLICT",
      "다른 관리자가 설정을 변경했습니다. 새로고침 후 다시 확인해 주세요.",
      409,
    );
  try {
    return await db.$transaction(
      async (tx) => {
        if (
          await tx.eywaManagedAccount.findUnique({
            where: { currentUserId: id },
          })
        )
          return failure(
            "FORBIDDEN",
            "연동 관리 계정은 여기서 연결을 해제할 수 없습니다.",
            403,
          );
        const target = await tx.user.findFirst({
          where: { id },
          select: {
            id: true,
            isSuperAdmin: true,
            eywaUserId: true,
            updatedAt: true,
            branchId: true,
          },
        });
        if (!target)
          return failure("NOT_FOUND", "사용자를 찾지 못했습니다.", 404);
        if (target.isSuperAdmin)
          return failure(
            "FORBIDDEN",
            "최고관리자 계정의 연결은 여기서 해제할 수 없습니다.",
            403,
          );
        const sub = target.eywaUserId;
        if (!sub)
          return failure("NOT_FOUND", EYWA_LINK_MESSAGES.notLinked, 404);
        const changed = await tx.user.updateMany({
          where: {
            id,
            isSuperAdmin: false,
            eywaUserId: sub,
            updatedAt: target.updatedAt,
            branchId: target.branchId,
          },
          data: { eywaUserId: null, eywaLinkedAt: null },
        });
        if (changed.count !== 1) return conflict();
        await tx.accountAuditLog.create({
          data: auditData({
            userId: id,
            actorId: access.account!.id,
            action: "auth.eywa-unlink",
            outcome: "success",
            details: { eywaUserId: sub, by: "admin" },
          }),
        });
        return Response.json(
          { data: { unlinked: true } },
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

export const DELETE = withErrorLog(
  "/api/admin/users/[id]/eywa-link",
  handleDelete,
);
