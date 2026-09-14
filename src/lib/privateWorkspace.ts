import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { authorizeAccount } from "@/lib/accountAccess";
import { recordAudit } from "@/lib/audit";
import type { WorkspaceDocument } from "@prisma/client";

export const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
export const documentSummarySelect = {
  id: true,
  kind: true,
  title: true,
  problemCount: true,
  revision: true,
  createdAt: true,
  updatedAt: true,
} as const;
export function documentDto(
  doc: Pick<WorkspaceDocument, keyof typeof documentSummarySelect> & {
    payload?: unknown;
  },
) {
  return {
    id: doc.id,
    kind: doc.kind,
    title: doc.title,
    problemCount: doc.problemCount,
    revision: doc.revision,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    ...("payload" in doc ? { payload: doc.payload } : {}),
  };
}
export const privateError = (message: string, status: number) =>
  Response.json(
    {
      error: {
        code:
          status === 409
            ? "CONFLICT"
            : status === 404
              ? "NOT_FOUND"
              : status === 400
                ? "VALIDATION_ERROR"
                : "FORBIDDEN",
        message,
      },
    },
    { status, headers: privateHeaders },
  );
export async function authorizePrivate(request: Request, ownerId?: string) {
  const access = await authorizeAccount(request, Boolean(ownerId));
  if (access.response) return { ...access, ownerId: null };
  if (
    !ownerId &&
    request.headers.has("x-workspace-owner") &&
    request.headers.get("x-workspace-owner") !== access.account!.id
  )
    return {
      account: null,
      ownerId: null,
      response: privateError(
        "로그인한 계정이 변경되었습니다. 작업을 다시 열어 주세요.",
        403,
      ),
    };
  if (
    !ownerId &&
    !access.account!.isAdmin &&
    !access.account!.menus.some((menu) =>
      ["studio", "export", "library"].includes(menu),
    )
  )
    return {
      account: null,
      ownerId: null,
      response: privateError("자료 저장 메뉴를 사용할 권한이 없습니다.", 403),
    };
  if (ownerId) {
    if (
      !z.uuid().safeParse(ownerId).success ||
      !(await db.user.findFirst({
        where: { id: ownerId, deletedAt: null },
        select: { id: true },
      }))
    )
      return {
        account: null,
        ownerId: null,
        response: privateError("사용자를 찾지 못했습니다.", 404),
      };
    await recordAudit({
      userId: ownerId,
      actorId: access.account!.id,
      action: "admin.private_material_view",
      outcome: "requested",
      details: { path: new URL(request.url).pathname },
    });
  }
  return { ...access, ownerId: ownerId ?? access.account!.id };
}
export function adminAssetUrls(value: unknown, userId: string): unknown {
  if (typeof value === "string" && value.startsWith("/api/library/assets/"))
    return value.replace(
      "/api/library/assets/",
      `/api/admin/users/${userId}/assets/`,
    );
  if (Array.isArray(value))
    return value.map((item) => adminAssetUrls(item, userId));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        adminAssetUrls(item, userId),
      ]),
    );
  return value;
}
