import { Prisma } from "@prisma/client";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
import {
  englishListeningBankQuerySchema,
  englishListeningBankResponseSchema,
  englishListeningReferenceQuerySchema,
  englishListeningReferencesResponseSchema,
} from "@/contracts/englishBank.contract";
import { decodeBankCursor, encodeBankCursor } from "../../bank/service";
import { availableListeningDocument, type ListeningTx } from "./database";

export async function searchListeningBank(
  tx: ListeningTx,
  account: AccountAccess,
  input: unknown,
) {
  const query = englishListeningBankQuerySchema.parse(input);
  const cursor = decodeBankCursor(query.cursor);
  const escaped = query.q.replace(/[\\%_]/g, "\\$&");
  const rows = await tx.$queryRaw<
    {
      id: string;
      revision: number;
      title: string;
      level: string | null;
      group_count: number;
      question_count: number;
      reconstructed_question_count: number;
      source: unknown;
      publication_count: bigint;
      updated_at: Date;
    }[]
  >(Prisma.sql`
    SELECT s.id,s.revision,s.document->>'title' AS title,s.document->>'level' AS level,
      jsonb_array_length(s.document->'groups') AS group_count,
      (SELECT count(*)::int FROM jsonb_array_elements(s.document->'groups') g, jsonb_array_elements(g->'questions') q) AS question_count,
      (SELECT count(*)::int FROM jsonb_array_elements(s.document->'groups') g, jsonb_array_elements(g->'questions') q WHERE q->'metadata'->>'origin'='audio_reconstructed') AS reconstructed_question_count,
      s.document->'source' AS source,
      (SELECT count(*) FROM english_listening_publication p WHERE p.set_id=s.id) AS publication_count,s.updated_at
    FROM english_listening_set s WHERE s.deleted_at IS NULL
      AND ${availableListeningDocument(Prisma.sql`s.document`)}
      AND (${account.isSuperAdmin === true} OR (s.owner_id=${account.id}::uuid AND (s.branch_id IS NULL OR s.branch_id=${account.branchId ?? null}::uuid)) OR (${account.isAdmin && !!account.branchId} AND s.branch_id=${account.branchId ?? null}::uuid))
      ${
        query.q
          ? Prisma.sql`AND (s.document->>'title' ILIKE ${"%" + escaped + "%"} OR s.document->'source'->>'provider' ILIKE ${"%" + escaped + "%"} OR EXISTS (SELECT 1 FROM jsonb_array_elements(s.document->'groups') g WHERE g->'transcript'->>'text' ILIKE ${"%" + escaped + "%"} OR EXISTS (SELECT 1 FROM jsonb_array_elements(g->'questions') q WHERE q->>'prompt' ILIKE ${"%" + escaped + "%"} OR q->'metadata'->>'questionType' ILIKE ${"%" + escaped + "%"} OR (q->'metadata'->'topics')::text ILIKE ${"%" + escaped + "%"} OR (q->'metadata'->'keywords')::text ILIKE ${"%" + escaped + "%"})))`
          : Prisma.empty
      }
      ${query.level ? Prisma.sql`AND s.document->>'level'=${query.level}` : Prisma.empty}
      ${query.year ? Prisma.sql`AND s.document->'source'->>'year'=${String(query.year)}` : Prisma.empty}
      ${query.round ? Prisma.sql`AND s.document->'source'->>'round'=${String(query.round)}` : Prisma.empty}
      ${query.origin ? Prisma.sql`AND EXISTS (SELECT 1 FROM jsonb_array_elements(s.document->'groups') g, jsonb_array_elements(g->'questions') q WHERE q->'metadata'->>'origin'=${query.origin})` : Prisma.empty}
      ${cursor ? Prisma.sql`AND (s.updated_at,s.id)<(${new Date(cursor.at)},${cursor.id}::uuid)` : Prisma.empty}
    ORDER BY s.updated_at DESC,s.id DESC LIMIT ${query.limit + 1}`);
  const page = rows.slice(0, query.limit);
  const last = page.at(-1);
  return englishListeningBankResponseSchema.parse({
    data: page.map((row) => ({
      id: row.id,
      revision: row.revision,
      title: row.title,
      level: row.level,
      groupCount: row.group_count,
      publicationCount: Number(row.publication_count),
      questionCount: row.question_count,
      reconstructedQuestionCount: row.reconstructed_question_count,
      ...(row.source ? { source: row.source } : {}),
      updatedAt: row.updated_at.toISOString(),
    })),
    meta: {
      nextCursor:
        rows.length > query.limit && last
          ? encodeBankCursor(last.updated_at, last.id)
          : null,
    },
  });
}
/** Compatibility entrypoint: the external reference catalog has been retired. */
export function officialListeningReferences(_records?: unknown): [] {
  void _records;
  return [];
}
export function searchListeningReferences(input: unknown) {
  englishListeningReferenceQuerySchema.parse(input);
  return englishListeningReferencesResponseSchema.parse({
    data: [],
    meta: { nextCursor: null },
  });
}
