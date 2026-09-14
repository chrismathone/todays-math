import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { auditData } from "@/lib/audit";
import {
  authorizePrivate,
  documentDto,
  privateHeaders,
  privateError,
  adminAssetUrls,
} from "@/lib/privateWorkspace";
import {
  documentIdSchema,
  saveDocumentSchema,
} from "@/contracts/privateWorkspace.contract";
import { isPrismaErrorCode } from "@/lib/prismaErrors";
import { z } from "zod";

export async function readDocument(
  request: Request,
  id: string,
  owner?: string,
) {
  const access = await authorizePrivate(request, owner);
  if (access.response) return access.response;
  if (!documentIdSchema.safeParse(id).success)
    return privateError("자료를 찾지 못했습니다.", 404);
  const document = await db.workspaceDocument.findUnique({
    where: { userId_id: { userId: access.ownerId!, id } },
  });
  if (!document) return privateError("자료를 찾지 못했습니다.", 404);
  const dto = documentDto(document);
  return Response.json(
    {
      data: owner
        ? { ...dto, payload: adminAssetUrls(dto.payload, owner) }
        : dto,
    },
    { headers: privateHeaders },
  );
}

export async function saveDocument(request: Request, id: string) {
  const access = await authorizePrivate(request);
  if (access.response) return access.response;
  if (!documentIdSchema.safeParse(id).success)
    return privateError("자료 이름을 확인해 주세요.", 400);
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > 3_500_000)
    return privateError(
      "자료가 너무 큽니다. 이미지를 먼저 저장해 주세요.",
      413,
    );
  const parsed = saveDocumentSchema.safeParse(
    (() => {
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    })(),
  );
  if (!parsed.success)
    return privateError("저장할 자료 형식을 확인해 주세요.", 400);
  const { kind, title, payload, expectedRevision } = parsed.data;
  const list =
    kind === "draft"
      ? payload.problems
      : (payload.data as Record<string, unknown> | undefined)?.crops;
  if (!Array.isArray(list) || list.length > 2000)
    return privateError("문제 목록을 확인해 주세요.", 400);
  if (
    !access.account!.isAdmin &&
    !access.account!.menus.includes(kind === "draft" ? "export" : "studio")
  )
    return privateError("이 자료를 편집할 권한이 없습니다.", 403);
  const userId = access.ownerId!;
  try {
    const result = await db.$transaction(async (tx) => {
      const previous = await tx.workspaceDocument.findUnique({
        where: { userId_id: { userId, id } },
      });
      if (
        previous
          ? previous.revision !== expectedRevision
          : expectedRevision !== null && expectedRevision !== 0
      )
        return null;
      if (previous && previous.kind !== kind) return null;
      const data = {
        kind,
        title,
        payload: payload as Prisma.InputJsonObject,
        problemCount: list.length,
      };
      if (previous) {
        const changed = await tx.workspaceDocument.updateMany({
          where: { userId, id, revision: expectedRevision! },
          data: { ...data, revision: { increment: 1 } },
        });
        if (changed.count !== 1) return null;
      } else
        await tx.workspaceDocument.create({ data: { ...data, userId, id } });
      const document = await tx.workspaceDocument.findUniqueOrThrow({
        where: { userId_id: { userId, id } },
      });
      await tx.accountAuditLog.create({
        data: auditData({
          userId,
          actorId: userId,
          action: previous ? "material.saved" : "material.created",
          outcome: "success",
          details: {
            documentId: id,
            kind,
            title,
            problemCount: list.length,
            revision: document.revision,
          },
        }),
      });
      return document;
    });
    return result
      ? Response.json(
          { data: documentDto(result) },
          { headers: privateHeaders },
        )
      : privateError(
          "다른 창이나 기기에서 자료가 변경되었습니다. 다시 불러온 뒤 저장해 주세요.",
          409,
        );
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002"))
      return privateError("이미 저장된 자료입니다. 다시 불러와 주세요.", 409);
    throw error;
  }
}
export async function deleteDocument(request: Request, id: string) {
  const access = await authorizePrivate(request);
  if (access.response) return access.response;
  const revision = Number(new URL(request.url).searchParams.get("revision"));
  if (
    !documentIdSchema.safeParse(id).success ||
    !Number.isSafeInteger(revision) ||
    revision < 1
  )
    return privateError("자료 버전을 확인해 주세요.", 400);
  if (!access.account!.isAdmin && !access.account!.menus.includes("library"))
    return privateError("내 시험지 메뉴를 사용할 권한이 없습니다.", 403);
  const userId = access.ownerId!;
  const deleted = await db.$transaction(async (tx) => {
    const document = await tx.workspaceDocument.findFirst({
      where: { userId, id, revision },
    });
    if (!document) return false;
    const removed = await tx.workspaceDocument.deleteMany({
      where: { userId, id, revision },
    });
    if (removed.count !== 1) return false;
    await tx.accountAuditLog.create({
      data: auditData({
        userId,
        actorId: userId,
        action: "material.deleted",
        outcome: "success",
        details: { documentId: id, title: document.title, kind: document.kind },
      }),
    });
    return true;
  });
  return deleted
    ? Response.json({ data: { deleted: true } }, { headers: privateHeaders })
    : privateError(
        "자료가 변경되었거나 이미 삭제됐습니다. 목록을 새로고침해 주세요.",
        409,
      );
}

export async function renameDocument(request: Request, id: string) {
  const access = await authorizePrivate(request);
  if (access.response) return access.response;
  if (!access.account!.isAdmin && !access.account!.menus.includes("library"))
    return privateError("내 시험지 메뉴를 사용할 권한이 없습니다.", 403);
  const parsed = z
    .object({
      title: z.string().trim().min(1).max(200),
      expectedRevision: z.number().int().positive(),
    })
    .strict()
    .safeParse(await request.json().catch(() => null));
  if (!documentIdSchema.safeParse(id).success || !parsed.success)
    return privateError("자료 이름과 버전을 확인해 주세요.", 400);
  const userId = access.ownerId!;
  const { title, expectedRevision } = parsed.data;
  const document = await db.$transaction(async (tx) => {
    const previous = await tx.workspaceDocument.findFirst({
      where: { userId, id, revision: expectedRevision },
    });
    if (!previous) return null;
    const payload = previous.payload as Prisma.JsonObject;
    const changed = await tx.workspaceDocument.updateMany({
      where: { userId, id, revision: expectedRevision },
      data: {
        title,
        payload: {
          ...payload,
          ...(previous.kind === "draft" ? { title } : {}),
        } as Prisma.InputJsonObject,
        revision: { increment: 1 },
      },
    });
    if (changed.count !== 1) return null;
    await tx.accountAuditLog.create({
      data: auditData({
        userId,
        actorId: userId,
        action: "material.renamed",
        outcome: "success",
        details: { documentId: id, previousTitle: previous.title, title },
      }),
    });
    return tx.workspaceDocument.findUniqueOrThrow({
      where: { userId_id: { userId, id } },
    });
  });
  return document
    ? Response.json(
        { data: documentDto(document) },
        { headers: privateHeaders },
      )
    : privateError(
        "자료가 변경됐습니다. 다시 불러온 뒤 이름을 바꿔 주세요.",
        409,
      );
}
