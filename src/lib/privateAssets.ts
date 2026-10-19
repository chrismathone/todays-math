import "server-only";
import { z } from "zod";
import { documentIdSchema } from "@/contracts/privateWorkspace.contract";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import {
  authorizePrivate,
  privateError,
  privateHeaders,
  sharedDocumentWhere,
  mutationOwnerError,
} from "@/lib/privateWorkspace";
import { auditData } from "@/lib/audit";
import { isPrismaErrorCode } from "@/lib/prismaErrors";
import { canOutputFrom } from "@/contracts/accountAccess.contract";
const MAX_SIZE = 64 * 1024 * 1024;
const MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/svg+xml",
  "image/avif",
]);
const validId = (id: string) => /^[a-f0-9]{64}$/.test(id);

export async function readPrivateAsset(
  request: Request,
  id: string,
  owner?: string,
) {
  const access = await authorizePrivate(request, owner);
  if (access.response) return access.response;
  if (!validId(id)) return privateError("파일을 찾지 못했습니다.", 404);
  const url = new URL(request.url);
  const requestedOwner = url.searchParams.get("ownerId");
  const sharedOwner =
    !owner && requestedOwner && requestedOwner !== access.ownerId
      ? requestedOwner
      : null;
  if (sharedOwner) {
    const documentId = url.searchParams.get("documentId");
    if (
      !documentIdSchema.safeParse(documentId).success ||
      !z.uuid().safeParse(sharedOwner).success
    )
      return privateError("파일을 찾지 못했습니다.", 404);
  }
  // Scope and bytes are read together, including the viewer's current branch.
  const asset = sharedOwner
    ? await db.workspaceAsset.findFirst({
        where: {
          userId: sharedOwner,
          id,
          documents: {
            some: {
              documentId: url.searchParams.get("documentId")!,
              document: sharedDocumentWhere(access.account!),
            },
          },
        },
      })
    : await db.workspaceAsset.findUnique({
        where: { userId_id: { userId: access.ownerId!, id } },
      });
  if (!asset || asset.bytes.byteLength !== asset.size)
    return privateError("파일을 찾지 못했습니다.", 404);
  return new Response(new Uint8Array(asset.bytes), {
    headers: {
      ...privateHeaders,
      "Content-Type": asset.mimeType,
      "Content-Length": String(asset.size),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(asset.name)}`,
      "Content-Security-Policy": "sandbox; default-src 'none'",
    },
  });
}
export async function writePrivateAsset(request: Request, id: string) {
  const access = await authorizePrivate(request);
  if (access.response) return access.response;
  const ownerError = mutationOwnerError(request, access.ownerId!);
  if (ownerError) return ownerError;
  if (
    !(["bank", "studio", "library"] as const).some((source) =>
      canOutputFrom(access.account!.menus, source),
    )
  )
    return privateError("파일을 저장할 권한이 없습니다.", 403);
  if (!validId(id)) return privateError("파일 식별자를 확인해 주세요.", 400);
  const range = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(
    request.headers.get("content-range") ?? "",
  );
  if (!range) return privateError("업로드 범위를 확인해 주세요.", 400);
  const [start, end, total] = range.slice(1).map(Number);
  if (
    ![start, end, total].every(Number.isSafeInteger) ||
    start < 0 ||
    end < start ||
    total < 1 ||
    total > MAX_SIZE ||
    end >= total ||
    end - start >= 1024 * 1024
  )
    return privateError("파일은 최대 64MB이며 나누어 전송해야 합니다.", 400);
  const mimeType = request.headers.get("content-type")?.split(";")[0] ?? "";
  if (!MIME.has(mimeType))
    return privateError("지원하지 않는 파일 형식입니다.", 400);
  let name: string;
  try {
    name = decodeURIComponent(
      request.headers.get("x-file-name") ?? "자료",
    ).slice(0, 255);
  } catch {
    return privateError("파일 이름을 확인해 주세요.", 400);
  }
  const chunk = new Uint8Array(await request.arrayBuffer());
  if (chunk.byteLength !== end - start + 1)
    return privateError("전송한 파일 크기가 맞지 않습니다.", 400);
  const userId = access.ownerId!;
  try {
    const result = await db.$transaction(async (tx) => {
      const existing = await tx.workspaceAsset.findUnique({
        where: { userId_id: { userId, id } },
      });
      if (existing && existing.size !== total) return null;
      if (existing?.bytes.length === total)
        return { offset: total, complete: true };
      const offset = existing?.bytes.length ?? 0;
      if (start !== offset) return { offset, complete: false };
      const bytes = Buffer.concat([
        existing ? Buffer.from(existing.bytes) : Buffer.alloc(0),
        chunk,
      ]);
      const complete = bytes.length === total;
      if (complete && createHash("sha256").update(bytes).digest("hex") !== id)
        return null;
      if (existing) {
        const updated = await tx.workspaceAsset.updateMany({
          where: { userId, id, bytes: { equals: existing.bytes } },
          data: { bytes: new Uint8Array(bytes) },
        });
        if (updated.count !== 1) return null;
      } else
        await tx.workspaceAsset.create({
          data: {
            userId,
            id,
            name,
            mimeType,
            size: total,
            bytes: new Uint8Array(bytes),
          },
        });
      if (complete)
        await tx.accountAuditLog.create({
          data: auditData({
            userId,
            actorId: userId,
            action: "material.file_uploaded",
            outcome: "success",
            details: { assetId: id, name, bytes: total },
          }),
        });
      return { offset: bytes.length, complete };
    });
    return result
      ? Response.json(
          { data: { ...result, url: `/api/library/assets/${id}` } },
          { headers: privateHeaders },
        )
      : privateError("파일 업로드가 변경되었습니다. 다시 시도해 주세요.", 409);
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002"))
      return privateError(
        "다른 업로드가 진행 중입니다. 다시 시도해 주세요.",
        409,
      );
    throw error;
  }
}
