import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { bankFormatsCurrent } from "@/lib/bankReadFingerprint";
import {
  ACTUAL_FORMAT_VERSION,
  actualFormatDigest,
  formatsVerified,
  verifyFormatScope,
} from "./actualFormat";
import {
  classifyFormat,
  type FormatInput,
  type ProblemFormat,
} from "./provenance";
import { questionFormatWithoutContent } from "./questionFormat";
import {
  actualFormatDigestSql,
  questionFormatReadSql,
} from "./questionCountSql";
import type { QuestionDb } from "./questionQueries";

export type FormatDb = QuestionDb &
  Partial<Pick<Prisma.TransactionClient, "$queryRaw" | "$executeRaw">>;
export type StoredFormatRead = FormatInput & {
  id: string;
  questionGroupKey: string | null;
  storedFormat: ProblemFormat | null;
  actualFormat: ProblemFormat | null;
  actualFormatVersion: string | null;
  actualFormatDigest: string | null;
  writable: boolean;
};
type MissingFact = { id: string; format: ProblemFormat; digest: string };

/** A cache fill is optional. Isolate conflicts in a savepoint so a concurrent
 * fill/edit cannot abort the caller's RepeatableRead inspection. */
export async function persistMissingFormats(
  client: Pick<Prisma.TransactionClient, "$executeRaw">,
  missing: readonly MissingFact[],
) {
  if (!missing.length) return;
  await client.$executeRaw`SAVEPOINT problem_actual_format_cache`;
  try {
    for (let i = 0; i < missing.length; i += 500)
      await client.$executeRaw(Prisma.sql`WITH unlocked AS (
        SELECT p.id FROM public.problem p
        WHERE p.id = ANY(${missing.slice(i, i + 500).map((fact) => fact.id)}::uuid[])
        ORDER BY p.id FOR UPDATE SKIP LOCKED
      ) UPDATE public.problem p SET
        actual_format=f.format, actual_format_version=${ACTUAL_FORMAT_VERSION}, actual_format_digest=f.digest
        FROM jsonb_to_recordset(${JSON.stringify(missing.slice(i, i + 500))}::jsonb) f(id uuid, format text, digest text), unlocked
        WHERE p.id=f.id AND p.id=unlocked.id AND p.pool='shared' AND p.actual_format IS NULL
          AND p.actual_format_version IS NULL AND p.actual_format_digest IS NULL
          AND ${actualFormatDigestSql()}=f.digest`);
    await client.$executeRaw`RELEASE SAVEPOINT problem_actual_format_cache`;
  } catch {
    // A failed statement must be rolled back before the read transaction can
    // continue. If recovery itself fails, propagate that real transaction error.
    await client.$executeRaw`ROLLBACK TO SAVEPOINT problem_actual_format_cache`;
    await client.$executeRaw`RELEASE SAVEPOINT problem_actual_format_cache`;
  }
}

/** Only invalid facts cross the wire with their text. READ ONLY transactions
 * never even issue the lazy UPDATE. No generated Prisma fields are required. */
export async function loadActualFormats(
  where: Prisma.ProblemWhereInput,
  client: FormatDb,
  formats: Map<string, ProblemFormat>,
  onlyInvalid = true,
): Promise<boolean> {
  if (onlyInvalid && formatsVerified(formats, client, where)) return true;
  if (onlyInvalid && bankFormatsCurrent(client)) {
    verifyFormatScope(formats, client, where);
    return true;
  }
  if (typeof client.$queryRaw !== "function") return false;
  const query = questionFormatReadSql(where, onlyInvalid);
  if (!query) return false;
  const rows = await client.$queryRaw<StoredFormatRead[]>(query);
  const missing: MissingFact[] = [];
  for (const row of rows) {
    if (row.actualFormat !== null) {
      formats.set(row.id, row.actualFormat);
      continue;
    }
    // Keep the existing certified-key/metadata/body classifier for legacy rows.
    const exact = classifyFormat(row);
    const format = questionFormatWithoutContent(row) ?? exact;
    formats.set(row.id, format);
    if (
      row.writable &&
      row.storedFormat === null &&
      row.actualFormatVersion === null &&
      row.actualFormatDigest === null &&
      format === exact
    )
      missing.push({ id: row.id, format, digest: actualFormatDigest(row) });
  }
  // Do not replace another release's non-NULL version. A separately reviewed
  // backfill owns version upgrades; this writer fills only uncomputed facts.
  if (missing.length && typeof client.$executeRaw === "function") {
    if ("$transaction" in client)
      await db.$transaction((tx) => persistMissingFormats(tx, missing));
    else
      await persistMissingFormats(
        client as Pick<Prisma.TransactionClient, "$executeRaw">,
        missing,
      );
  }
  if (!("$transaction" in client)) verifyFormatScope(formats, client, where);
  return true;
}
