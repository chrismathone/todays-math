import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient, type EnglishPassage } from "@prisma/client";
import { z } from "zod";
import type { WorkspaceMenu } from "@/contracts/accountAccess.contract";
import { englishRouteAllowed } from "@/lib/accountRouteAccess";
import {
  englishPassageCreateSchema,
  englishPassageUpdateSchema,
  englishPassageArchiveSchema,
  englishPassageRightsConfirmSchema,
  englishPassageRightsSchema,
  englishPassageImportSchema,
  englishPassagePrepareSchema,
  englishPassageQuerySchema,
  englishPassageDetailSchema,
  englishPassageSummarySchema,
  englishPassageSourceSchema,
  type EnglishPassageCreate,
  type EnglishPassageImport,
} from "@/contracts/englishBank.contract";
import {
  englishSetMetaSchema,
  type EnglishPassageRef,
  type EnglishSetMeta,
} from "@/contracts/english.contract";
import {
  ownedRowsWhere,
  withinOwnerScope,
  type ScopeViewer,
} from "@/lib/ownerScope";
import {
  assertPassageUse,
  canonical,
  EnglishBankError,
  exactHash,
  normalizeBankText,
  readMaterialText,
  unavailable,
  unconfirmedRights,
} from "./policy";

export type BankTx = Prisma.TransactionClient;
type BankViewer = ScopeViewer & { menus?: readonly WorkspaceMenu[] };
function requireOriginalMenu(viewer: BankViewer, path: string, method = "GET") {
  if (!englishRouteAllowed(viewer.menus ?? [], method, path))
    throw new EnglishBankError("SOURCE_ACCESS_DENIED");
}
export const bankSummarySelect = {
  id: true,
  title: true,
  grade: true,
  source: true,
  revision: true,
  textRevision: true,
  textLength: true,
  snapshotHash: true,
  rights: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;
const summary = (
  row: Prisma.EnglishPassageGetPayload<{ select: typeof bankSummarySelect }>,
) =>
  englishPassageSummarySchema.parse({
    id: row.id,
    title: row.title,
    grade: row.grade,
    source: row.source,
    revision: row.revision,
    textRevision: row.textRevision,
    textLength: row.textLength,
    snapshotHash: row.snapshotHash,
    rights: row.rights,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
export function encodeBankCursor(at: Date, id: string) {
  return Buffer.from(JSON.stringify({ at: at.toISOString(), id })).toString(
    "base64url",
  );
}
export function decodeBankCursor(cursor?: string) {
  if (!cursor) return null;
  let data: unknown;
  try {
    data = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    data = null;
  }
  return z.strictObject({ at: z.iso.datetime(), id: z.uuid() }).parse(data);
}
export async function ownedPassage(
  tx: BankTx,
  viewer: ScopeViewer,
  id: string,
  lock = false,
) {
  if (lock)
    await tx.$queryRaw`SELECT id FROM english_passage WHERE id=${id}::uuid FOR UPDATE`;
  const row = await tx.englishPassage.findFirst({
    where: { id, ...ownedRowsWhere(viewer) },
  });
  if (!row) throw unavailable();
  return row;
}
export async function ownedBankExam(
  tx: BankTx,
  viewer: ScopeViewer,
  id: string,
) {
  const row = await tx.englishExam.findFirst({
    where: { id, ...ownedRowsWhere(viewer) },
  });
  if (!row) throw unavailable();
  return row;
}
export async function passageUses(
  tx: BankTx,
  viewer: ScopeViewer,
  passageId: string,
) {
  await ownedPassage(tx, viewer, passageId);
  const rows = await tx.englishPassageUse.findMany({
    where: { passageId, set: { exam: ownedRowsWhere(viewer) } },
    include: { set: { select: { id: true, title: true, examId: true } } },
    orderBy: [{ createdAt: "desc" }, { setId: "desc" }],
  });
  return rows.map((row) => ({
    setId: row.setId,
    examId: row.set.examId,
    title: row.set.title,
    textRevision: row.textRevision,
    snapshotHash: row.snapshotHash,
    sourceSnapshot: englishPassageSourceSchema.parse(row.sourceSnapshot),
    textSnapshot: row.textSnapshot,
    createdAt: row.createdAt.toISOString(),
  }));
}
async function detail(tx: BankTx, viewer: ScopeViewer, row: EnglishPassage) {
  return englishPassageDetailSchema.parse({
    ...summary(row),
    text: row.text,
    importedFrom: row.importedFrom,
    usages: await passageUses(tx, viewer, row.id),
  });
}
function expected(row: EnglishPassage, revision: number) {
  if (row.revision !== revision)
    throw new EnglishBankError("REVISION_MISMATCH");
}

/** Both generation and set persistence call this; trust only the immutable database revision. */
export async function validateBankReference(
  tx: BankTx,
  viewer: BankViewer,
  ref: EnglishPassageRef,
  input: string,
  path: "chatgpt" | "cloze" | "api",
) {
  requireOriginalMenu(viewer, "/api/english/passages");
  const row = await ownedPassage(tx, viewer, ref.passageId, true);
  if (row.archivedAt) throw unavailable();
  if (row.textRevision !== ref.textRevision)
    throw new EnglishBankError("PASSAGE_TEXT_MISMATCH");
  const revision = await tx.englishPassageRevision.findUnique({
    where: {
      passageId_textRevision: {
        passageId: row.id,
        textRevision: ref.textRevision,
      },
    },
  });
  if (!revision) throw unavailable();
  if (
    revision.snapshotHash !== ref.snapshotHash ||
    normalizeBankText(revision.text) !== normalizeBankText(input)
  )
    throw new EnglishBankError("PASSAGE_TEXT_MISMATCH");
  assertPassageUse(
    revision.text,
    englishPassageRightsSchema.parse(row.rights),
    path,
  );
  return { row, revision };
}
export async function validateBankSetReference(
  tx: BankTx,
  viewer: BankViewer,
  examId: string,
  passage: string,
  meta: EnglishSetMeta,
  source: string,
) {
  await ownedBankExam(tx, viewer, examId);
  if (!meta.passageRef) return null;
  const expectedSource = {
    cloze: "cloze",
    chatgpt: "chatgpt",
    api: "deepseek",
  };
  if (
    expectedSource[meta.path] !== source ||
    (meta.path === "cloze" && meta.mode === "variation")
  )
    throw new EnglishBankError("PASSAGE_TEXT_MISMATCH");
  if (meta.mode === "new") throw new EnglishBankError("PASSAGE_TEXT_MISMATCH");
  const input = meta.mode === "variation" ? meta.sourcePassage : passage;
  if (input === undefined) throw new EnglishBankError("PASSAGE_TEXT_MISMATCH");
  return validateBankReference(tx, viewer, meta.passageRef, input, meta.path);
}
export async function savePassageUse(
  tx: BankTx,
  setId: string,
  verified: Awaited<ReturnType<typeof validateBankReference>>,
) {
  return tx.englishPassageUse.create({
    data: {
      setId,
      passageId: verified.row.id,
      textRevision: verified.revision.textRevision,
      snapshotHash: verified.revision.snapshotHash,
      textSnapshot: verified.revision.text,
      sourceSnapshot: verified.row.source as Prisma.InputJsonValue,
    },
  });
}
/** Preserve existing metadata replay rules except bank source identity, which cannot change. */
export function sameBankSaveReference(
  stored: unknown,
  incoming: EnglishSetMeta | undefined,
) {
  const old = englishSetMetaSchema.safeParse(stored);
  const prior = old.success ? old.data : undefined;
  if (!prior?.passageRef && !incoming?.passageRef) return true;
  const identity = (meta: EnglishSetMeta | undefined) => ({
    ref: meta?.passageRef ?? null,
    path: meta?.path ?? null,
    mode: meta?.mode ?? null,
    sourcePassage: meta?.sourcePassage ?? null,
  });
  return canonical(identity(prior)) === canonical(identity(incoming));
}

export function createEnglishBank(
  database: Pick<PrismaClient, "$transaction">,
) {
  const transaction = async <T>(
    viewer: BankViewer,
    fn: (tx: BankTx) => Promise<T>,
  ) => {
    requireOriginalMenu(viewer, "/api/english/passages");
    return database.$transaction(fn, { maxWait: 10000, timeout: 30000 });
  };
  async function createInTransaction(
    tx: BankTx,
    viewer: ScopeViewer,
    input: EnglishPassageCreate,
    importedFrom: {
      kind: "material" | "set";
      id: string;
      textKind?: "passage" | "sourcePassage";
    } | null = null,
  ) {
    // Serialize creates by user, including distinct keys targeting the same original.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"english-bank-create:" + viewer.id},0))`;
    const requestHash = exactHash(canonical({ ...input, importedFrom }));
    const receipt = await tx.englishPassageReceipt.findUnique({
      where: {
        userId_clientKey: { userId: viewer.id, clientKey: input.clientKey },
      },
    });
    if (receipt && receipt.requestHash !== requestHash)
      throw new EnglishBankError("CLIENT_KEY_CONFLICT");
    let row = receipt
      ? await ownedPassage(tx, viewer, receipt.passageId)
      : null;
    const fingerprint = importedFrom
      ? exactHash(canonical({ importedFrom, text: input.text }))
      : null;
    if (!row && fingerprint)
      row = await tx.englishPassage.findFirst({
        where: { userId: viewer.id, importFingerprint: fingerprint },
      });
    // Deduplication never crosses a branch boundary, even when the owner moved.
    if (row && !withinOwnerScope(viewer, row.userId, row.branchId))
      throw unavailable();
    const replayed = Boolean(row);
    if (!row) {
      const hash = exactHash(input.text);
      row = await tx.englishPassage.create({
        data: {
          userId: viewer.id,
          branchId: viewer.branchId ?? null,
          title: input.title,
          grade: input.grade,
          source: input.source,
          text: input.text,
          textLength: input.text.length,
          snapshotHash: hash,
          duplicateHash: exactHash(normalizeBankText(input.text)),
          rights: unconfirmedRights(),
          importedFrom: importedFrom ?? Prisma.DbNull,
          importFingerprint: fingerprint,
          revisions: {
            create: { textRevision: 1, text: input.text, snapshotHash: hash },
          },
        },
      });
    }
    if (!receipt)
      await tx.englishPassageReceipt.create({
        data: {
          userId: viewer.id,
          clientKey: input.clientKey,
          requestHash,
          passageId: row.id,
        },
      });
    const duplicates = await tx.englishPassage.findMany({
      where: {
        userId: viewer.id,
        AND: [ownedRowsWhere(viewer)],
        duplicateHash: row.duplicateHash,
        id: { not: row.id },
        archivedAt: null,
      },
      select: { id: true },
      orderBy: { id: "asc" },
    });
    return {
      data: await detail(tx, viewer, row),
      meta: { replayed, duplicateIds: duplicates.map((d) => d.id) },
    };
  }
  async function importInput(
    tx: BankTx,
    viewer: BankViewer,
    input: EnglishPassageImport,
  ) {
    requireOriginalMenu(
      viewer,
      `/api/english/${input.kind === "material" ? "materials" : "sets"}/${input.id}`,
    );
    if (input.kind === "material") {
      await tx.$queryRaw`SELECT m.id FROM english_material m JOIN english_exam e ON m.exam_id=e.id WHERE m.id=${input.id}::uuid FOR SHARE OF m,e`;
      const row = await tx.englishMaterial.findUnique({
        where: { id: input.id },
        include: { exam: true },
      });
      if (!row || !withinOwnerScope(viewer, row.exam.userId, row.exam.branchId))
        throw unavailable();
      return englishPassageCreateSchema.parse({
        clientKey: input.clientKey,
        title: input.title ?? row.name,
        text: readMaterialText(row),
        grade: row.exam.grade,
        source: { label: row.name, url: null },
      });
    }
    await tx.$queryRaw`SELECT s.id FROM english_question_set s JOIN english_exam e ON s.exam_id=e.id WHERE s.id=${input.id}::uuid FOR SHARE OF s,e`;
    const row = await tx.englishQuestionSet.findUnique({
      where: { id: input.id },
      include: { exam: true },
    });
    if (!row || !withinOwnerScope(viewer, row.exam.userId, row.exam.branchId))
      throw unavailable();
    let text: string | undefined =
      input.textKind === "passage" ? row.passage : undefined;
    if (input.textKind === "sourcePassage") {
      const use = await tx.englishPassageUse.findUnique({
        where: { setId: row.id },
      });
      if (use) {
        await ownedPassage(tx, viewer, use.passageId);
        text = use.textSnapshot;
      } else {
        const meta = englishSetMetaSchema.safeParse(row.meta);
        text = meta.success ? meta.data.sourcePassage : undefined;
      }
    }
    if (!text) throw new EnglishBankError("IMPORT_TEXT_UNAVAILABLE");
    return englishPassageCreateSchema.parse({
      clientKey: input.clientKey,
      title: input.title ?? row.title,
      text,
      grade: row.exam.grade,
      source: { label: row.title, url: null },
    });
  }
  return {
    list: (viewer: BankViewer, input: unknown) =>
      transaction(viewer, async (tx) => {
        const query = englishPassageQuerySchema.parse(input);
        const cursor = decodeBankCursor(query.cursor);
        const rows = await tx.englishPassage.findMany({
          where: {
            AND: [
              ownedRowsWhere(viewer),
              ...(query.q
                ? [
                    {
                      OR: [
                        {
                          title: {
                            contains: query.q,
                            mode: "insensitive" as const,
                          },
                        },
                        {
                          text: {
                            contains: query.q,
                            mode: "insensitive" as const,
                          },
                        },
                        {
                          source: {
                            path: ["label"],
                            string_contains: query.q,
                            mode: "insensitive" as const,
                          },
                        },
                      ],
                    },
                  ]
                : []),
              ...(cursor
                ? [
                    {
                      OR: [
                        { createdAt: { lt: new Date(cursor.at) } },
                        {
                          createdAt: new Date(cursor.at),
                          id: { lt: cursor.id },
                        },
                      ],
                    },
                  ]
                : []),
            ],
            archivedAt: query.archived === "true" ? { not: null } : null,
            ...(query.grade ? { grade: query.grade } : {}),
            ...(query.source
              ? {
                  source: {
                    path: ["label"],
                    string_contains: query.source,
                    mode: "insensitive" as const,
                  },
                }
              : {}),
          },
          select: bankSummarySelect,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: query.limit + 1,
        });
        const page = rows.slice(0, query.limit);
        const last = page.at(-1);
        return {
          data: page.map(summary),
          meta: {
            nextCursor:
              rows.length > query.limit && last
                ? encodeBankCursor(last.createdAt, last.id)
                : null,
          },
        };
      }),
    get: (viewer: BankViewer, id: string) =>
      transaction(viewer, async (tx) =>
        detail(tx, viewer, await ownedPassage(tx, viewer, z.uuid().parse(id))),
      ),
    uses: (viewer: BankViewer, id: string) =>
      transaction(viewer, (tx) => passageUses(tx, viewer, z.uuid().parse(id))),
    create: (viewer: BankViewer, input: unknown) =>
      transaction(viewer, (tx) =>
        createInTransaction(
          tx,
          viewer,
          englishPassageCreateSchema.parse(input),
        ),
      ),
    import: (viewer: BankViewer, input: unknown) =>
      transaction(viewer, async (tx) => {
        const parsed = englishPassageImportSchema.parse(input);
        const original = await importInput(tx, viewer, parsed);
        return createInTransaction(tx, viewer, original, {
          kind: parsed.kind,
          id: parsed.id,
          ...(parsed.textKind ? { textKind: parsed.textKind } : {}),
        });
      }),
    update: (viewer: BankViewer, id: string, input: unknown) =>
      transaction(viewer, async (tx) => {
        const parsed = englishPassageUpdateSchema.parse(input);
        const row = await ownedPassage(tx, viewer, z.uuid().parse(id), true);
        expected(row, parsed.revision);
        if (row.archivedAt) throw unavailable();
        const textChanged =
          parsed.text !== undefined && parsed.text !== row.text;
        const sourceChanged =
          parsed.source !== undefined &&
          canonical(parsed.source) !== canonical(row.source);
        const changed = await tx.englishPassage.updateMany({
          where: { id, revision: row.revision, ...ownedRowsWhere(viewer) },
          data: {
            title: parsed.title,
            text: parsed.text,
            grade: parsed.grade,
            source: parsed.source,
            revision: { increment: 1 },
            ...(textChanged
              ? {
                  textRevision: { increment: 1 },
                  textLength: parsed.text!.length,
                  snapshotHash: exactHash(parsed.text!),
                  duplicateHash: exactHash(normalizeBankText(parsed.text!)),
                }
              : {}),
            ...(textChanged || sourceChanged
              ? { rights: unconfirmedRights() }
              : {}),
          },
        });
        if (changed.count !== 1)
          throw new EnglishBankError("REVISION_MISMATCH");
        if (textChanged)
          await tx.englishPassageRevision.create({
            data: {
              passageId: id,
              textRevision: row.textRevision + 1,
              text: parsed.text!,
              snapshotHash: exactHash(parsed.text!),
            },
          });
        return detail(tx, viewer, await ownedPassage(tx, viewer, id));
      }),
    archive: (viewer: BankViewer, id: string, input: unknown) =>
      transaction(viewer, async (tx) => {
        const parsed = englishPassageArchiveSchema.parse(input);
        const row = await ownedPassage(tx, viewer, z.uuid().parse(id), true);
        expected(row, parsed.revision);
        const archived = await tx.englishPassage.update({
          where: { id },
          data: { archivedAt: new Date(), revision: { increment: 1 } },
        });
        return detail(tx, viewer, archived);
      }),
    rights: (viewer: BankViewer, id: string, input: unknown) =>
      transaction(viewer, async (tx) => {
        const parsed = englishPassageRightsConfirmSchema.parse(input);
        const row = await ownedPassage(tx, viewer, z.uuid().parse(id), true);
        expected(row, parsed.revision);
        if (row.archivedAt) throw unavailable();
        const updated = await tx.englishPassage.update({
          where: { id },
          data: {
            revision: { increment: 1 },
            rights: {
              status: "confirmed",
              basis: parsed.basis,
              allowedUses: parsed.allowedUses,
              confirmedBy: viewer.id,
              confirmedAt: new Date().toISOString(),
            },
          },
        });
        return detail(tx, viewer, updated);
      }),
    prepare: (viewer: BankViewer, id: string, input: unknown) =>
      transaction(viewer, async (tx) => {
        const parsed = englishPassagePrepareSchema.parse(input);
        requireOriginalMenu(viewer, "/api/english/generate", "POST");
        await ownedBankExam(tx, viewer, parsed.examId);
        const row = await ownedPassage(tx, viewer, z.uuid().parse(id), true);
        if (row.archivedAt) throw unavailable();
        if (row.textRevision !== parsed.textRevision)
          throw new EnglishBankError("PASSAGE_TEXT_MISMATCH");
        const revision = await tx.englishPassageRevision.findUnique({
          where: {
            passageId_textRevision: {
              passageId: id,
              textRevision: parsed.textRevision,
            },
          },
        });
        if (!revision) throw unavailable();
        assertPassageUse(
          revision.text,
          englishPassageRightsSchema.parse(row.rights),
          parsed.path,
        );
        return {
          requestId: randomUUID(),
          examId: parsed.examId,
          path: parsed.path,
          passageRef: {
            passageId: row.id,
            textRevision: revision.textRevision,
            snapshotHash: revision.snapshotHash,
          },
          title: row.title,
          text: revision.text,
        };
      }),
  };
}
