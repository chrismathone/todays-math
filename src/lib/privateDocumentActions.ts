import type { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { auditData } from "@/lib/audit";
import {
  authorizePrivate,
  documentDto,
  privateHeaders,
  privateError,
  adminAssetUrls,
  sharedAssetUrls,
  sharedDocumentWhere,
  mutationOwnerError,
  documentAssetIds,
  privateDocumentKinds,
} from "@/lib/privateWorkspace";
import {
  documentIdSchema,
  isLibraryDocumentKind,
  LIBRARY_DOCUMENT_KINDS,
  saveDocumentSchema,
  type DocumentKind,
} from "@/contracts/privateWorkspace.contract";
import {
  canOutputFrom,
  type WorkspaceMenu,
} from "@/contracts/accountAccess.contract";
import {
  CONCEPT_BLANK_TITLE_MAX,
  conceptBlankDocumentSchema,
} from "@/contracts/conceptBlank.contract";
import { isPrismaErrorCode } from "@/lib/prismaErrors";
import { sheetTagSchema } from "@/contracts/sheetTag.contract";
import { z } from "zod";
import { validateQuestionDraft } from "@/lib/problem/questionDraft";
import { QuestionSelectionConflict } from "@/lib/problem/questionSelection";
import { parseStrictJson } from "@/lib/textbook/strictJson";
import {
  ARITHMETIC_SHEET_JSON_LIMITS,
  assertArithmeticSheetByteBudget,
  readArithmeticLibraryBody,
} from "@/lib/arithmetic/byteBudget";
import { ARITHMETIC_SHEET_KIND } from "@/contracts/arithmetic.contract";
import { anyArithmeticSheetProblemCount } from "@/lib/arithmeticDocument";
import {
  arithmeticEngineErrorResponse,
  arithmeticSheetPayloadError,
  arithmeticSheetWriteError,
} from "@/lib/arithmeticDocumentPolicy";

/** 자료를 저장하려면 있어야 하는 메뉴 — 그 자료를 만드는 화면. */
function canEditDocument(menus: readonly WorkspaceMenu[], kind: DocumentKind) {
  if (kind === "draft")
    return (["bank", "studio", "library"] as const).some((source) =>
      canOutputFrom(menus, source),
    );
  return canOutputFrom(
    menus,
    kind === "extraction"
      ? "studio"
      : kind === "arithmeticSheet"
        ? "arithmetic"
        : "conceptBlank",
  );
}

/**
 * 자료의 문항 수 — 꼴이 틀리면 null. 개념 백지(26 §9 ⑾)는 고르기만 담으므로 지면을 합쳐 찍히는 문항을 센다
 * (은행은 이 종류를 저장할 때만 불러온다 — 다른 자료의 저장 경로에 은행을 싣지 않는다).
 */
async function problemCountOf(
  kind: DocumentKind,
  payload: Record<string, unknown>,
): Promise<number | null> {
  if (kind === ARITHMETIC_SHEET_KIND)
    return anyArithmeticSheetProblemCount(payload);
  if (kind === "conceptBlank") {
    const document = conceptBlankDocumentSchema.safeParse(payload);
    if (!document.success) return null;
    const [{ composeSheets, sheetItemCount }, { CONCEPT_BLANK_BANK }] =
      await Promise.all([
        import("@/lib/concept-blank/compose"),
        import("@/lib/concept-blank/bank"),
      ]);
    return composeSheets(document.data.selection, CONCEPT_BLANK_BANK).reduce(
      (n, sheet) => n + sheetItemCount(sheet),
      0,
    );
  }
  const list =
    kind === "draft"
      ? payload.problems
      : (payload.data as Record<string, unknown> | undefined)?.crops;
  return Array.isArray(list) && list.length <= 2000 ? list.length : null;
}

/**
 * 자료 길이 다루는 종류 — 출제 조건(W5 `examCondition`)은 같은 표에 있지만 자료가 아니라, 읽기 · 이름 바꾸기 · 삭제 ·
 * 사본 · 덮어쓰기 어느 것도 이 길로 닿지 않는다(제 길은 `/api/studio/exam-conditions`).
 */
const libraryKindWhere = { kind: { in: [...LIBRARY_DOCUMENT_KINDS] } };

export async function readDocument(
  request: Request,
  id: string,
  owner?: string,
) {
  const access = await authorizePrivate(request, owner, true);
  if (access.response) return access.response;
  if (!documentIdSchema.safeParse(id).success)
    return privateError("자료를 찾지 못했습니다.", 404);
  const requestedOwner = new URL(request.url).searchParams.get("ownerId");
  if (requestedOwner && !z.uuid().safeParse(requestedOwner).success)
    return privateError("자료를 찾지 못했습니다.", 404);
  const sharedOwner =
    !owner && requestedOwner && requestedOwner !== access.ownerId
      ? requestedOwner
      : null;
  const document = sharedOwner
    ? await db.workspaceDocument.findFirst({
        where: {
          ...sharedDocumentWhere(access.account!),
          userId: sharedOwner,
          id,
        },
        include: { user: { select: { name: true } } },
      })
    : await db.workspaceDocument.findUnique({
        where: { userId_id: { userId: access.ownerId!, id } },
        include: { user: { select: { name: true } } },
      });
  if (!document || !isLibraryDocumentKind(document.kind))
    return privateError("자료를 찾지 못했습니다.", 404);
  if (!owner && !privateDocumentKinds(access.account!).includes(document.kind))
    return privateError("자료를 찾지 못했습니다.", 404);
  if (document.kind === ARITHMETIC_SHEET_KIND) {
    const invalid = arithmeticSheetPayloadError(document.payload);
    if (invalid) return invalid;
  }
  const dto = documentDto(document, access.account!.id);
  return Response.json(
    {
      data: owner
        ? { ...dto, payload: adminAssetUrls(dto.payload, owner) }
        : sharedOwner
          ? { ...dto, payload: sharedAssetUrls(dto.payload, sharedOwner, id) }
          : dto,
    },
    { headers: privateHeaders },
  );
}

export async function saveDocument(request: Request, id: string) {
  const access = await authorizePrivate(request, undefined, true);
  if (access.response) return access.response;
  const ownerError = mutationOwnerError(request, access.ownerId!);
  if (ownerError) return ownerError;
  if (!documentIdSchema.safeParse(id).success)
    return privateError("자료 이름을 확인해 주세요.", 400);
  let text: string;
  try {
    text = await readArithmeticLibraryBody(request);
  } catch {
    return privateError(
      "자료 크기는 3.5MB 이하여야 합니다. 문항 수나 이미지 크기를 줄여 주세요.",
      413,
    );
  }
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
  const { kind, title, payload, expectedRevision, visibility, sharedBranchId } =
    parsed.data;
  if (!canEditDocument(access.account!.menus, kind))
    return privateError("이 자료를 편집할 권한이 없습니다.", 403);
  // 시험지 태그(W8) — 시험지는 `payload.tag` 에 정해진 여덟 가운데 하나만. 연산 연습지는 `presentation.tag` 를
  // 연산 본문 검사가 가린다(본문 맨 위 칸은 받지 않는다). 다른 종류에는 태그가 없다.
  if (
    "tag" in payload &&
    (kind !== "draft" || !sheetTagSchema.safeParse(payload.tag).success)
  )
    return privateError("시험지 태그를 확인해 주세요.", 400);
  if (kind === ARITHMETIC_SHEET_KIND) {
    const disabled = arithmeticSheetWriteError();
    if (disabled) return disabled;
    try {
      parseStrictJson(text, ARITHMETIC_SHEET_JSON_LIMITS);
    } catch {
      return privateError("연산 학습지의 형식과 크기를 확인해 주세요.", 400);
    }
    try {
      assertArithmeticSheetByteBudget(payload);
    } catch (error) {
      return arithmeticEngineErrorResponse(error);
    }
  }
  if (
    visibility === "branch" &&
    (!access.account!.branchId || sharedBranchId !== access.account!.branchId)
  )
    return privateError(
      "학원 소속이 변경되었습니다. 새로고침한 뒤 공개 범위를 확인해 주세요.",
      409,
      "BRANCH_CHANGED",
    );
  let assetIds: string[];
  try {
    assetIds = documentAssetIds(payload);
  } catch (cause) {
    return privateError((cause as Error).message, 400);
  }
  let problemCount: number | null;
  try {
    problemCount = await problemCountOf(kind, payload);
  } catch (error) {
    return arithmeticEngineErrorResponse(error);
  }
  if (problemCount === null)
    return privateError(
      kind === "conceptBlank"
        ? "저장할 개념 백지를 확인해 주세요."
        : "문제 목록을 확인해 주세요.",
      400,
    );
  if (kind === "conceptBlank" && title.length > CONCEPT_BLANK_TITLE_MAX)
    return privateError(
      `개념 백지 이름은 ${CONCEPT_BLANK_TITLE_MAX}자까지입니다.`,
      400,
    );
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
      if (kind === "draft") await validateQuestionDraft(tx, payload);
      // A stale autosave may not carry a share into a new branch.
      const branchId = access.account!.branchId;
      const nextVisibility =
        visibility ??
        (previous?.sharedBranchId === branchId
          ? previous?.visibility
          : "private") ??
        "private";
      for (const assetId of assetIds) {
        const asset = await tx.workspaceAsset.findUnique({
          where: { userId_id: { userId, id: assetId } },
        });
        if (!asset || asset.bytes.byteLength !== asset.size)
          return "invalid-asset" as const;
      }
      const data = {
        kind,
        title,
        payload: payload as Prisma.InputJsonObject,
        problemCount,
        visibility: nextVisibility,
        sharedBranchId: nextVisibility === "branch" ? branchId : null,
      };
      if (previous) {
        const changed = await tx.workspaceDocument.updateMany({
          where: { userId, id, revision: expectedRevision! },
          data: { ...data, revision: { increment: 1 } },
        });
        if (changed.count !== 1) return null;
      } else
        await tx.workspaceDocument.create({ data: { ...data, userId, id } });
      await tx.workspaceDocumentAsset.deleteMany({
        where: { userId, documentId: id },
      });
      if (assetIds.length)
        await tx.workspaceDocumentAsset.createMany({
          data: assetIds.map((assetId) => ({
            userId,
            documentId: id,
            assetId,
          })),
        });
      const document = await tx.workspaceDocument.findUniqueOrThrow({
        where: { userId_id: { userId, id } },
        include: { user: { select: { name: true } } },
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
            problemCount,
            revision: document.revision,
          },
        }),
      });
      return document;
    });
    if (result === "invalid-asset")
      return privateError("저장할 파일을 먼저 업로드해 주세요.", 400);
    return result
      ? Response.json(
          { data: documentDto(result, userId) },
          { headers: privateHeaders },
        )
      : privateError(
          "다른 창이나 기기에서 자료가 변경되었습니다. 다시 불러온 뒤 저장해 주세요.",
          409,
        );
  } catch (error) {
    if (error instanceof QuestionSelectionConflict)
      return privateError(error.message, 409, "QUESTION_CHANGED");
    if (isPrismaErrorCode(error, "P2002"))
      return privateError("이미 저장된 자료입니다. 다시 불러와 주세요.", 409);
    throw error;
  }
}
export async function deleteDocument(request: Request, id: string) {
  const access = await authorizePrivate(request, undefined, true);
  if (access.response) return access.response;
  const ownerError = mutationOwnerError(request, access.ownerId!);
  if (ownerError) return ownerError;
  const revision = Number(new URL(request.url).searchParams.get("revision"));
  if (
    !documentIdSchema.safeParse(id).success ||
    !Number.isSafeInteger(revision) ||
    revision < 1
  )
    return privateError("자료 버전을 확인해 주세요.", 400);
  // 보관함(library)이 모든 자료를, 연산대장(arithmetic)이 연산 학습지만 — 종류는 아래에서 다시 가른다.
  if (
    !access.account!.menus.some(
      (menu) => menu === "library" || menu === "arithmetic",
    )
  )
    return privateError("내 시험지 메뉴를 사용할 권한이 없습니다.", 403);
  const userId = access.ownerId!;
  const deleted = await db.$transaction(async (tx) => {
    const document = await tx.workspaceDocument.findFirst({
      where: { userId, id, revision, ...libraryKindWhere },
    });
    if (!document) return false;
    if (document.kind === ARITHMETIC_SHEET_KIND) {
      const disabled = arithmeticSheetWriteError();
      if (disabled) return disabled;
    } else if (!access.account!.menus.includes("library"))
      return privateError("내 시험지 메뉴를 사용할 권한이 없습니다.", 403);
    const removed = await tx.workspaceDocument.deleteMany({
      where: { userId, id, revision, ...libraryKindWhere },
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
  if (deleted instanceof Response) return deleted;
  return deleted
    ? Response.json({ data: { deleted: true } }, { headers: privateHeaders })
    : privateError(
        "자료가 변경되었거나 이미 삭제됐습니다. 목록을 새로고침해 주세요.",
        409,
      );
}

export async function renameDocument(request: Request, id: string) {
  const access = await authorizePrivate(request, undefined, true);
  if (access.response) return access.response;
  const ownerError = mutationOwnerError(request, access.ownerId!);
  if (ownerError) return ownerError;
  // 보관함(library)이 모든 자료를, 연산대장(arithmetic)이 연산 학습지만 — 종류는 아래에서 다시 가른다.
  if (
    !access.account!.menus.some(
      (menu) => menu === "library" || menu === "arithmetic",
    )
  )
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
      where: { userId, id, revision: expectedRevision, ...libraryKindWhere },
    });
    if (!previous) return null;
    if (previous.kind === ARITHMETIC_SHEET_KIND) {
      const denied =
        arithmeticSheetWriteError() ??
        arithmeticSheetPayloadError(previous.payload);
      if (denied) return denied;
    } else if (!access.account!.menus.includes("library"))
      return privateError("내 시험지 메뉴를 사용할 권한이 없습니다.", 403);
    // 개념 백지는 자료 이름 = 지면 제목(26 §9 ⑾) — 제목 상한 안에서만 바꾼다.
    const blank = previous.kind === "conceptBlank";
    if (blank && title.length > CONCEPT_BLANK_TITLE_MAX) return "too-long";
    const payload = previous.payload as Prisma.JsonObject;
    const changed = await tx.workspaceDocument.updateMany({
      // 종류는 위 findFirst 가 가렸다 — 버전이 같으면 같은 행이다.
      where: { userId, id, revision: expectedRevision },
      data: {
        title,
        payload: {
          ...payload,
          ...(previous.kind === "draft" ? { title } : {}),
          ...(blank
            ? {
                selection: {
                  ...(payload.selection as Prisma.JsonObject),
                  title,
                },
              }
            : {}),
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
      include: { user: { select: { name: true } } },
    });
  });
  if (document instanceof Response) return document;
  if (document === "too-long")
    return privateError(
      `개념 백지 이름은 ${CONCEPT_BLANK_TITLE_MAX}자까지입니다.`,
      400,
    );
  return document
    ? Response.json(
        { data: documentDto(document, userId) },
        { headers: privateHeaders },
      )
    : privateError(
        "자료가 변경됐습니다. 다시 불러온 뒤 이름을 바꿔 주세요.",
        409,
      );
}

/** Opening a colleague's document creates an independent, private snapshot. */
export async function copyDocument(request: Request, id: string) {
  const access = await authorizePrivate(request, undefined, true);
  if (access.response) return access.response;
  const ownerId = new URL(request.url).searchParams.get("ownerId");
  if (
    !documentIdSchema.safeParse(id).success ||
    !z.uuid().safeParse(ownerId).success
  )
    return privateError("자료를 찾지 못했습니다.", 404);
  const userId = access.ownerId!;
  const copied = await db.$transaction(async (tx) => {
    const source = await tx.workspaceDocument.findFirst({
      where: {
        ...sharedDocumentWhere(access.account!),
        ...libraryKindWhere,
        userId: ownerId!,
        id,
      },
    });
    if (!source) return null;
    if (!canEditDocument(access.account!.menus, source.kind as DocumentKind))
      return "forbidden" as const;
    let problemCount = source.problemCount;
    if (source.kind === ARITHMETIC_SHEET_KIND) {
      const disabled = arithmeticSheetWriteError();
      if (disabled) return disabled;
      try {
        problemCount = anyArithmeticSheetProblemCount(source.payload);
      } catch (error) {
        return arithmeticEngineErrorResponse(error);
      }
    }
    const assetIds = documentAssetIds(
      source.payload as Record<string, unknown>,
    );
    for (const assetId of assetIds) {
      const asset = await tx.workspaceAsset.findUnique({
        where: { userId_id: { userId: ownerId!, id: assetId } },
      });
      if (!asset || asset.bytes.byteLength !== asset.size)
        return "invalid-asset" as const;
      await tx.workspaceAsset.upsert({
        where: { userId_id: { userId, id: assetId } },
        create: { ...asset, userId },
        update: {
          bytes: asset.bytes,
          size: asset.size,
          mimeType: asset.mimeType,
          name: asset.name,
        },
      });
    }
    const copyId = randomUUID();
    const title = `${source.title.slice(0, source.kind === "conceptBlank" ? CONCEPT_BLANK_TITLE_MAX - 5 : 75)} (사본)`;
    const payload = source.payload as Prisma.JsonObject;
    const document = await tx.workspaceDocument.create({
      data: {
        userId,
        id: copyId,
        kind: source.kind,
        title,
        payload: {
          ...payload,
          ...(source.kind === "draft" ? { id: copyId, title } : {}),
          ...(source.kind === "conceptBlank"
            ? {
                selection: {
                  ...(payload.selection as Prisma.JsonObject),
                  title,
                },
              }
            : {}),
        } as Prisma.InputJsonObject,
        problemCount,
        visibility: "private",
        sharedBranchId: null,
      },
    });
    if (assetIds.length)
      await tx.workspaceDocumentAsset.createMany({
        data: assetIds.map((assetId) => ({
          userId,
          documentId: copyId,
          assetId,
        })),
      });
    await tx.accountAuditLog.create({
      data: auditData({
        userId,
        actorId: userId,
        action: "material.copied",
        outcome: "success",
        details: {
          documentId: copyId,
          sourceOwnerId: ownerId,
          sourceDocumentId: id,
        },
      }),
    });
    return document;
  });
  if (copied instanceof Response) return copied;
  if (copied === "forbidden")
    return privateError("이 자료를 편집할 권한이 없습니다.", 403);
  if (copied === "invalid-asset")
    return privateError("원본 파일을 찾지 못했습니다.", 404);
  return copied
    ? Response.json(
        { data: documentDto(copied, userId) },
        { headers: privateHeaders },
      )
    : privateError(
        "자료를 찾지 못했습니다. 공개 범위나 학원 소속이 변경되었을 수 있습니다.",
        404,
      );
}
