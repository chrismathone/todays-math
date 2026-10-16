import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { authorizeAccount } from "@/lib/accountAccess";
import { recordAudit } from "@/lib/audit";
import type { Prisma, WorkspaceDocument } from "@prisma/client";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
import { documentWorkflow } from "@/contracts/workspaceWorkflow.contract";

export const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
export const documentSummarySelect = {
  userId: true,
  visibility: true,
  sharedBranchId: true,
  id: true,
  kind: true,
  title: true,
  problemCount: true,
  revision: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { name: true } },
} as const;
export function documentDto(
  doc: Pick<
    WorkspaceDocument,
    Exclude<keyof typeof documentSummarySelect, "user">
  > & {
    user?: { name: string };
    payload?: unknown;
  },
  viewerId?: string,
) {
  const workflow = documentWorkflow(doc.kind, doc.payload);
  return {
    ownerId: doc.userId,
    ownerName: doc.user?.name ?? "선생님",
    isOwner: doc.userId === viewerId,
    visibility: doc.visibility ?? "private",
    sharedBranchId: doc.sharedBranchId ?? null,
    id: doc.id,
    kind: doc.kind,
    title: doc.title,
    problemCount: doc.problemCount,
    revision: doc.revision,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    ...(workflow ? { workflow } : {}),
    ...("payload" in doc ? { payload: doc.payload } : {}),
  };
}
export const privateError = (message: string, status: number, code?: string) =>
  Response.json(
    {
      error: {
        code:
          code ??
          (status === 409
            ? "CONFLICT"
            : status === 404
              ? "NOT_FOUND"
              : status === 400
                ? "VALIDATION_ERROR"
                : "FORBIDDEN"),
        message,
      },
    },
    { status, headers: privateHeaders },
  );
/** Bank-only access is limited to arithmetic documents, never private assets. */
export function arithmeticDocumentsOnly(account: AccountAccess): boolean {
  return !account.menus.some((menu) =>
    ["studio", "export", "library", "conceptBlank"].includes(menu),
  );
}

export async function authorizePrivate(
  request: Request,
  ownerId?: string,
  allowArithmeticDocuments = false,
) {
  const access = await authorizeAccount(
    request,
    Boolean(ownerId),
    Boolean(ownerId),
  );
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
    arithmeticDocumentsOnly(access.account!) &&
    !(allowArithmeticDocuments && access.account!.menus.includes("arithmetic"))
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
  // Session snapshots and browser props are not authority for branch membership.
  const current = await db.user.findFirst({
    where: {
      id: access.account!.id,
      deletedAt: null,
      suspendedAt: null,
      approvalStatus: "approved",
    },
    select: { branchId: true },
  });
  if (!current)
    return {
      account: null,
      ownerId: null,
      response: privateError("계정 권한을 다시 확인해 주세요.", 403),
    };
  return {
    ...access,
    account: { ...access.account!, branchId: current.branchId ?? null },
    ownerId: ownerId ?? access.account!.id,
  };
}

/** Both teachers must still belong to the exact branch that was shared with. */
export function sharedDocumentWhere(
  account: AccountAccess,
): Prisma.WorkspaceDocumentWhereInput {
  return account.branchId
    ? {
        visibility: "branch",
        sharedBranchId: account.branchId,
        sharedBranch: {
          users: {
            some: {
              id: account.id,
              deletedAt: null,
              suspendedAt: null,
              approvalStatus: "approved",
            },
          },
        },
        user: {
          branchId: account.branchId,
          deletedAt: null,
          suspendedAt: null,
          approvalStatus: "approved",
        },
      }
    : { AND: [{ userId: { in: [] } }] };
}
export function readableDocumentWhere(
  account: AccountAccess,
): Prisma.WorkspaceDocumentWhereInput {
  return { OR: [{ userId: account.id }, sharedDocumentWhere(account)] };
}
export function mutationOwnerError(request: Request, userId: string) {
  const requested = new URL(request.url).searchParams.get("ownerId");
  return requested && requested !== userId
    ? privateError(
        "작성자만 원본을 변경할 수 있습니다. 사본으로 저장해 주세요.",
        403,
      )
    : null;
}
export function sharedAssetUrls(
  value: unknown,
  ownerId: string,
  documentId: string,
): unknown {
  if (typeof value === "string")
    return value.replace(
      /\/api\/library\/assets\/([a-f0-9]{64})\b/g,
      (path) =>
        `${path}?ownerId=${encodeURIComponent(ownerId)}&documentId=${encodeURIComponent(documentId)}`,
    );
  if (Array.isArray(value))
    return value.map((item) => sharedAssetUrls(item, ownerId, documentId));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        sharedAssetUrls(item, ownerId, documentId),
      ]),
    );
  return value;
}

/** Asset references are indexed from the canonical payload, never supplied as ACLs. */
export function documentAssetIds(payload: Record<string, unknown>): string[] {
  const ids = new Set<string>();
  const walk = (value: unknown) => {
    if (typeof value === "string") {
      for (const match of value.matchAll(
        /\/api\/library\/assets\/([a-f0-9]{64})\b/g,
      )) {
        const suffix = value.slice(match.index + match[0].length);
        if (suffix.startsWith("?"))
          throw new Error("공유 원본은 사본으로 연 뒤 저장해 주세요.");
        ids.add(match[1]);
      }
      if (value.includes("/api/admin/users/"))
        throw new Error("관리자 자료 주소는 저장할 수 없습니다.");
    } else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object")
      Object.values(value).forEach(walk);
  };
  walk(payload);
  if (payload.assets && typeof payload.assets === "object") {
    for (const hash of Object.values(payload.assets)) {
      if (typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash))
        throw new Error("원본 파일 목록을 확인해 주세요.");
      ids.add(hash);
    }
  }
  return [...ids];
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
