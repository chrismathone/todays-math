import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { Prisma } from "@prisma/client";
import { ACTUAL_FORMAT_VERSION } from "./problem/actualFormat";

type Client = Pick<Prisma.TransactionClient, "$queryRaw"> &
  Partial<Pick<Prisma.TransactionClient, "unit" | "problem">>;
type Fingerprint = { token: string; invalid: string };
const snapshot = new AsyncLocalStorage<{
  client: Client;
  fingerprint: Fingerprint;
}>();

/** No problem text/answers leave PostgreSQL. Two seeded 64-bit row-version hashes
 * cover inserts, updates and deletes, including SQL that preserves updated_at.
 * Related tables participate because unit order and book/material metadata also
 * affect public counts/representative IDs. This is a change fingerprint, not a
 * replacement for the input-digest audit. Run inside RepeatableRead only.
 */
export function bankReadFingerprintSql() {
  return Object.assign(
    Prisma.sql`WITH facts AS (
    SELECT 'p'::text AS domain,p.id,p.xmin::text AS revision,
      (p.actual_format IS NULL OR p.actual_format_version IS DISTINCT FROM ${ACTUAL_FORMAT_VERSION}) AS invalid
      FROM public.problem p WHERE p.pool='shared'
    UNION ALL SELECT 'u',u.id,u.xmin::text,false FROM public.unit u
    UNION ALL SELECT 'm',m.id,m.xmin::text,false FROM public.source_material m
    UNION ALL SELECT 'b',b.id,b.xmin::text,false FROM public.source_book b
  ) SELECT count(*)::text || ':' ||
      COALESCE(bit_xor(hashtextextended(domain || ':' || id::text || ':' || revision,0))::text,'0') || ':' ||
      COALESCE(bit_xor(hashtextextended(domain || ':' || id::text || ':' || revision,1))::text,'0') AS token,
    count(*) FILTER (WHERE invalid)::text AS invalid FROM facts`,
    {
      bankReadFingerprint: true,
    },
  );
}

/** Validate on every request, in the same snapshot as the cached result's read.
 * A process never reuses another request's fingerprint or skips this DB check.
 */
export async function withBankReadFingerprint<T>(
  client: Client,
  read: () => Promise<T>,
): Promise<T> {
  if (snapshot.getStore()?.client === client) return read();
  const [fingerprint] = await client.$queryRaw<Fingerprint[]>(
    bankReadFingerprintSql(),
  );
  if (
    !fingerprint ||
    typeof fingerprint.token !== "string" ||
    typeof fingerprint.invalid !== "string"
  )
    throw new Error("BANK_FINGERPRINT_MISSING");
  return snapshot.run({ client, fingerprint }, read);
}

export function currentBankReadFingerprint() {
  return snapshot.getStore()?.fingerprint;
}
export function currentBankReadClient() {
  return snapshot.getStore()?.client;
}
export function bankFormatsCurrent(client: object) {
  const current = snapshot.getStore();
  return current?.client === client && current.fingerprint.invalid === "0";
}
