import { Prisma } from "@prisma/client";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
import {
  englishListeningBankQuerySchema,
  englishListeningBankResponseSchema,
  englishListeningReferenceQuerySchema,
  englishListeningReferencesResponseSchema,
  type EnglishListeningReference,
} from "@/contracts/englishBank.contract";
import catalog from "../../../../../docs/listening-samples/ebs-catalog-20261003.json";
import { decodeBankCursor, encodeBankCursor } from "../../bank/service";
import { invalid, type ListeningTx } from "./database";

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
      publication_count: bigint;
      updated_at: Date;
    }[]
  >(Prisma.sql`
    SELECT s.id,s.revision,s.document->>'title' AS title,s.document->>'level' AS level,
      jsonb_array_length(s.document->'groups') AS group_count,
      (SELECT count(*) FROM english_listening_publication p WHERE p.set_id=s.id) AS publication_count,s.updated_at
    FROM english_listening_set s WHERE s.deleted_at IS NULL
      AND (${account.isSuperAdmin === true} OR (s.owner_id=${account.id}::uuid AND (s.branch_id IS NULL OR s.branch_id=${account.branchId ?? null}::uuid)) OR (${account.isAdmin && !!account.branchId} AND s.branch_id=${account.branchId ?? null}::uuid))
      ${query.q ? Prisma.sql`AND (s.document->>'title' ILIKE ${"%" + escaped + "%"} OR EXISTS (SELECT 1 FROM jsonb_array_elements(s.document->'groups') g WHERE g->'transcript'->>'text' ILIKE ${"%" + escaped + "%"}))` : Prisma.empty}
      ${query.level ? Prisma.sql`AND s.document->>'level'=${query.level}` : Prisma.empty}
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
/** Exact allowlist projection: never spread the catalog record (it contains asset URLs). */
export function officialListeningReferences(
  records: unknown = catalog.records,
): EnglishListeningReference[] {
  if (!Array.isArray(records)) return [];
  return records.flatMap((record) => {
    if (!record || typeof record !== "object") return [];
    const row = record as Record<string, unknown>;
    let url: URL;
    try {
      url = new URL(String(row.sourceUrl));
    } catch {
      return [];
    }
    const official =
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      ((url.hostname === "mid.ebs.co.kr" &&
        url.pathname === "/english/engGrade") ||
        (url.hostname === "www.ebsi.co.kr" &&
          /^\/ebs\/pot\/potg\/EnglishListening\d+\.ebs$/.test(url.pathname)));
    if (!official) return [];
    const school =
      row.school === "middle"
        ? "middle"
        : row.school === "high"
          ? "high"
          : null;
    if (
      !school ||
      typeof row.id !== "string" ||
      typeof row.provider !== "string" ||
      !Number.isInteger(row.grade) ||
      !Number.isInteger(row.year) ||
      !Number.isInteger(row.round)
    )
      return [];
    // Only known page parameters survive; arbitrary links in query strings are not returned.
    const safe = new URL(url.origin + url.pathname);
    for (const key of school === "middle"
      ? ["clsfnSystId"]
      : ["targetCd", "seriesGrpNo"]) {
      const value = url.searchParams.get(key);
      if (value && /^[A-Za-z0-9]+$/.test(value))
        safe.searchParams.set(key, value);
    }
    return [
      {
        id: row.id,
        title: `${row.provider} ${school === "middle" ? "중" : "고"}${row.grade} ${row.year}년 ${row.round}회`,
        school,
        grade: row.grade as number,
        year: row.year as number,
        round: row.round as number,
        provider: row.provider,
        sourceUrl: safe.toString(),
        reuseStatus: "permission-required" as const,
        hosted: false as const,
      },
    ];
  });
}
export function searchListeningReferences(input: unknown) {
  const query = englishListeningReferenceQuerySchema.parse(input);
  const rows = officialListeningReferences()
    .filter(
      (row) =>
        (!query.q ||
          row.title
            .toLocaleLowerCase()
            .includes(query.q.toLocaleLowerCase())) &&
        (!query.level ||
          query.level ===
            `${row.school === "middle" ? "중" : "고"}${row.grade}`) &&
        (!query.year || row.year === query.year) &&
        (!query.round || row.round === query.round),
    )
    .sort(
      (a, b) =>
        b.year - a.year || b.round - a.round || a.id.localeCompare(b.id),
    );
  const index = query.cursor
    ? rows.findIndex((row) => row.id === query.cursor)
    : -1;
  if (query.cursor && index < 0) throw invalid("목록을 새로 불러와 주세요.");
  const page = rows.slice(index + 1, index + 1 + query.limit);
  return englishListeningReferencesResponseSchema.parse({
    data: page,
    meta: {
      nextCursor:
        index + 1 + query.limit < rows.length ? page.at(-1)!.id : null,
    },
  });
}
