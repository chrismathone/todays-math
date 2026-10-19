import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { Prisma } from "@prisma/client";
import { ACTUAL_FORMAT_VERSION } from "./problem/actualFormat";

type Client = Pick<Prisma.TransactionClient, "$queryRaw"> &
  Partial<Pick<Prisma.TransactionClient, "unit" | "problem">>;
type Fingerprint = { token: string; invalid: string };
type RevisionFingerprint = Fingerprint & { formatVersion: string; schemaVersion: number };
const snapshot = new AsyncLocalStorage<{
  client: Client;
  fingerprint: Fingerprint;
}>();
const readClient = new AsyncLocalStorage<Client>();

/** Bind range/identity resolution to an uncached scoped read's transaction.
 * This conveys no fingerprint or cache-validity proof and issues no global scan.
 */
export function withBankReadClient<T>(client: Client, read: () => Promise<T>): Promise<T> {
  return readClient.run(client, read);
}

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

/** Lead enables BANK_READ_REVISION=on only AFTER the guarded DDL/catalog check.
 * Default off keeps deployments before the additive DDL on the existing path.
 * No generated Prisma client/table delegate is needed. Every request still reads
 * the database in its own RepeatableRead snapshot; this token has no TTL.
 */
export function bankRevisionFingerprintSql() {
  return Object.assign(
    Prisma.sql`SELECT 'revision-v1:' || format_version || ':' || revision::text AS token,
      invalid_format_count::text AS invalid, format_version AS "formatVersion",
      schema_version::int AS "schemaVersion"
      FROM public.bank_read_revision WHERE id=1`,
    { bankReadRevision: true },
  );
}

async function readFingerprint(client: Client): Promise<Fingerprint | undefined> {
  if (process.env.BANK_READ_REVISION === "on") {
    const [revision] = await client.$queryRaw<RevisionFingerprint[]>(
      bankRevisionFingerprintSql(),
    );
    if (!revision || revision.schemaVersion !== 1 ||
      !/^\d+$/.test(revision.invalid) || !revision.token?.startsWith("revision-v1:"))
      throw new Error("BANK_REVISION_NOT_READY");
    // A future classifier deployment cannot trust a counter maintained for the
    // previous version. Keep the original correct reader until a reviewed recount.
    if (revision.formatVersion === ACTUAL_FORMAT_VERSION) return revision;
  }
  const [fingerprint] = await client.$queryRaw<Fingerprint[]>(bankReadFingerprintSql());
  return fingerprint;
}

/** Validate on every request, in the same snapshot as the cached result's read.
 * A process never reuses another request's fingerprint or skips this DB check.
 */
export async function withBankReadFingerprint<T>(
  client: Client,
  read: () => Promise<T>,
): Promise<T> {
  if (snapshot.getStore()?.client === client) return read();
  const fingerprint = await readFingerprint(client);
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
  return snapshot.getStore()?.client ?? readClient.getStore();
}
export function bankFormatsCurrent(client: object) {
  const current = snapshot.getStore();
  return current?.client === client && current.fingerprint.invalid === "0";
}
