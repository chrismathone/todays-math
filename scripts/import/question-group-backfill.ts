/** Protected, keys-only operator. Preparing is read-only; applying/reverting requires
 * a separate Gate 2 approval bound to the exact manifest and DDL SHA-256.
 * Never run --apply/--revert merely to test this implementation on a shared DB.
 */
import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  parseQuestionExternalId,
  proveQuestionPair,
  type QuestionPairRow,
} from "../../src/lib/problem/questionPairProof";

export const QUESTION_PLAN_SHA =
  "50c525785cae16825d23d7bd55de81f7a779fa54cd98e8933d470a126acccc61";
export const QUESTION_DDL_PATH =
  "supabase/migrations/20261018063016_question_group_identity.sql";
export const QUESTION_BACKFILL_CHUNK_SIZE = 100;
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type RawQuestionRow = { id: string; payload: Record<string, Json> };
type PairManifest = {
  key: string;
  rows: [
    { id: string; digest: string; beforeKey: string | null },
    { id: string; digest: string; beforeKey: string | null },
  ];
};
export interface QuestionBackfillManifest {
  kind: "math-question-backfill";
  version: 1;
  planSha256: string;
  ddlSha256: string;
  preparedAt: string;
  preflight: {
    quarantineOverlap: 0;
    rowsScanned: number;
    candidateGroups: number;
    provedPairs: number;
    targetRows: number;
    rejected: Record<string, number>;
  };
  catalog: unknown;
  pairs: PairManifest[];
}
export interface QuestionBackfillReceipt {
  kind: "math-question-backfill-receipt";
  version: 1;
  runId: string;
  manifestSha256: string;
  ddlSha256: string;
  applied: PairManifest[];
  reverted: string[];
  pendingChunk: string[];
  completed: boolean;
}
export type QuestionOperatorClient = Pick<
  Prisma.TransactionClient,
  "$queryRaw" | "$executeRaw"
>;
export type QuestionTransactionHost = QuestionOperatorClient & {
  $transaction: <T>(
    fn: (tx: QuestionOperatorClient) => Promise<T>,
    options?: { isolationLevel?: "RepeatableRead"; timeout?: number },
  ) => Promise<T>;
};

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map(
        (k) =>
          `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`,
      )
      .join(",")}}`;
  return JSON.stringify(value);
}
export function questionPayloadDigest(payload: Record<string, Json>): string {
  const copy = { ...payload };
  delete copy.question_group_key;
  return createHash("sha256").update(canonical(copy)).digest("hex");
}
export function questionManifestSha(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value, null, 2) + "\n")
    .digest("hex");
}
export function rawQuestionPairRow(row: RawQuestionRow): QuestionPairRow {
  return Object.fromEntries(
    Object.entries(row.payload).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()),
      value,
    ]),
  ) as unknown as QuestionPairRow;
}
export async function questionCatalog(client: QuestionOperatorClient) {
  const [columns, triggers, indexes, security] = await Promise.all([
    client.$queryRaw`SELECT attname, format_type(atttypid,atttypmod) AS type FROM pg_attribute WHERE attrelid='public.problem'::regclass AND attnum>0 AND NOT attisdropped ORDER BY attnum`,
    client.$queryRaw`SELECT t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) AS definition,p.prosecdef,p.proconfig,p.proacl::text FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid WHERE t.tgrelid='public.problem'::regclass AND NOT t.tgisinternal ORDER BY t.tgname`,
    client.$queryRaw`SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='problem' ORDER BY indexname`,
    client.$queryRaw`SELECT relrowsecurity,relforcerowsecurity,relacl::text FROM pg_class WHERE oid='public.problem'::regclass`,
  ]);
  return { columns, triggers, indexes, security };
}
async function quarantineOverlap(
  client: QuestionOperatorClient,
  ids: readonly string[],
): Promise<number> {
  let count = 0;
  for (let i = 0; i < ids.length; i += 5000) {
    const rows = await client.$queryRaw<{ n: bigint }[]>(
      Prisma.sql`SELECT count(*)::bigint AS n FROM public.problem_outer_wall_quarantine WHERE problem_id IN (${Prisma.join(ids.slice(i, i + 5000).map((id) => Prisma.sql`${id}::uuid`))})`,
    );
    count += Number(rows[0].n);
  }
  return count;
}
export async function prepareQuestionBackfill(
  client: QuestionTransactionHost,
  ddlSha256: string,
): Promise<QuestionBackfillManifest> {
  return client.$transaction(
    async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const rows = await tx.$queryRaw<
        RawQuestionRow[]
      >`SELECT p.id::text,to_jsonb(p) AS payload FROM public.problem p WHERE p.pool='shared' AND (p.external_id LIKE 'engine-elem:%' OR p.external_id LIKE 'engine-mid:%' OR p.external_id LIKE 'engine-mid-combo:%') ORDER BY p.id`;
      const groups = new Map<string, RawQuestionRow[]>();
      for (const row of rows) {
        const parsed = parseQuestionExternalId(
          String(row.payload.external_id ?? ""),
        );
        if (!parsed) continue;
        const key = JSON.stringify(parsed.tuple);
        const group = groups.get(key) ?? [];
        group.push(row);
        groups.set(key, group);
      }
      const pairs: PairManifest[] = [];
      const rejected: Record<string, number> = {};
      const reject = (reason: string) => {
        rejected[reason] = (rejected[reason] ?? 0) + 1;
      };
      for (const group of groups.values()) {
        const proof = proveQuestionPair(group.map(rawQuestionPairRow));
        if (!proof.ok) {
          if (proof.reason === "existingKeyConflict")
            throw new Error("Existing key conflict");
          reject(proof.reason);
          continue;
        }
        const keyed = group.filter(
          (r) => r.payload.question_group_key != null,
        ).length;
        if (keyed !== 0 && keyed !== 2)
          throw new Error("Partial existing pair; refusing a manifest");
        pairs.push({
          key: proof.key,
          rows: group
            .map((r) => ({
              id: r.id,
              digest: questionPayloadDigest(r.payload),
              beforeKey:
                (r.payload.question_group_key as string | null) ?? null,
            }))
            .sort((a, b) => a.id.localeCompare(b.id)) as PairManifest["rows"],
        });
      }
      pairs.sort((a, b) => a.key.localeCompare(b.key));
      if (
        new Set(pairs.map((p) => p.key)).size !== pairs.length ||
        new Set(pairs.flatMap((p) => p.rows.map((r) => r.id))).size !==
          pairs.length * 2
      )
        throw new Error("Question key/row collision");
      const overlap = await quarantineOverlap(
        tx,
        pairs.flatMap((p) => p.rows.map((r) => r.id)),
      );
      if (overlap !== 0)
        throw new Error(
          `Outer-wall quarantine overlap ${overlap}; no manifest may be approved`,
        );
      return {
        kind: "math-question-backfill",
        version: 1,
        planSha256: QUESTION_PLAN_SHA,
        ddlSha256,
        preparedAt: new Date().toISOString(),
        preflight: {
          quarantineOverlap: 0,
          rowsScanned: rows.length,
          candidateGroups: groups.size,
          provedPairs: pairs.length,
          targetRows: pairs.length * 2,
          rejected,
        },
        catalog: await questionCatalog(tx),
        pairs,
      };
    },
    { isolationLevel: "RepeatableRead", timeout: 120000 },
  );
}
export function validateQuestionBackfillApproval(
  manifest: QuestionBackfillManifest,
  approval: unknown,
  ddlSha256: string,
  writeGate: string | undefined,
): void {
  const sha = questionManifestSha(manifest);
  const a = approval as Record<string, unknown>;
  if (
    manifest.kind !== "math-question-backfill" ||
    manifest.version !== 1 ||
    manifest.planSha256 !== QUESTION_PLAN_SHA ||
    manifest.ddlSha256 !== ddlSha256 ||
    manifest.preflight.quarantineOverlap !== 0 ||
    manifest.preflight.targetRows !== manifest.pairs.length * 2 ||
    a?.decision !== "approved" ||
    a.scope !== "question-backfill-gate-2" ||
    a.manifestSha256 !== sha ||
    a.ddlSha256 !== ddlSha256 ||
    typeof a.reviewer !== "string" ||
    !a.reviewer.trim() ||
    writeGate !== sha
  )
    throw new Error("Gate 2 approval/manifest/DDL/write gate mismatch");
  if (
    new Set(manifest.pairs.map((p) => p.key)).size !== manifest.pairs.length ||
    new Set(manifest.pairs.flatMap((p) => p.rows.map((r) => r.id))).size !==
      manifest.pairs.length * 2
  )
    throw new Error("Manifest contains conflicting pairs");
}
async function assertQuestionDdlReady(client: QuestionOperatorClient) {
  const rows = await client.$queryRaw<
    {
      prosecdef: boolean;
      proconfig: string[];
      public_execute: boolean;
      anon_execute: boolean;
      authenticated_execute: boolean;
    }[]
  >`
    SELECT p.prosecdef,p.proconfig,
      EXISTS(SELECT 1 FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS public_execute,
      has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
      has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    JOIN pg_trigger t ON t.tgfoid=p.oid AND t.tgrelid='public.problem'::regclass AND t.tgname='problem_question_group_invalidate' AND t.tgenabled IN ('O','A')
    WHERE n.nspname='public' AND p.proname='invalidate_problem_question_group_key'`;
  if (
    rows.length !== 1 ||
    rows[0].prosecdef ||
    !rows[0].proconfig.includes("search_path=pg_catalog, public") ||
    rows[0].public_execute ||
    rows[0].anon_execute ||
    rows[0].authenticated_execute
  )
    throw new Error("Question invalidation DDL/permissions are not ready");
  const access = await client.$queryRaw<
    { rolname: string; can_insert: boolean; can_update: boolean }[]
  >`
    SELECT rolname,has_column_privilege(oid,'public.problem','question_group_key','INSERT') AS can_insert,
      has_column_privilege(oid,'public.problem','question_group_key','UPDATE') AS can_update
    FROM pg_roles WHERE rolname IN ('anon','authenticated') ORDER BY rolname`;
  if (
    access.length !== 2 ||
    access.some((role) => role.can_insert || role.can_update)
  )
    throw new Error("Unprivileged proof-key writes are not blocked");
}
function keyOf(row: RawQuestionRow): string | null {
  return (row.payload.question_group_key as string | null) ?? null;
}
async function casKey(
  tx: QuestionOperatorClient,
  row: RawQuestionRow,
  key: string | null,
) {
  const payload = { ...row.payload };
  delete payload.question_group_key;
  const n = await tx.$executeRaw(
    Prisma.sql`UPDATE public.problem AS p SET question_group_key=${key} WHERE p.id=${row.id}::uuid AND p.question_group_key IS NOT DISTINCT FROM ${keyOf(row)} AND (to_jsonb(p)-'question_group_key')=${JSON.stringify(payload)}::jsonb`,
  );
  if (n !== 1) throw new Error(`Row CAS failed: ${row.id}`);
}
async function casChunk(
  tx: QuestionOperatorClient,
  updates: { row: RawQuestionRow; key: string | null }[],
) {
  if (!updates.length) return;
  const values = updates.map(({ row, key }) => {
    const payload = { ...row.payload };
    delete payload.question_group_key;
    return Prisma.sql`(${row.id}::uuid,${keyOf(row)}::text,${key}::text,${JSON.stringify(payload)}::jsonb)`;
  });
  // All rows are already locked and every pair has passed proof. Unique manifest
  // row IDs guarantee that each target joins exactly one VALUES preimage.
  const n = await tx.$executeRaw(
    Prisma.sql`UPDATE public.problem AS p SET question_group_key=v.after_key FROM (VALUES ${Prisma.join(values)}) AS v(id,before_key,after_key,payload) WHERE p.id=v.id AND p.question_group_key IS NOT DISTINCT FROM v.before_key AND (to_jsonb(p)-'question_group_key')=v.payload`,
  );
  if (n !== updates.length)
    throw new Error(
      `Chunk row CAS failed: expected ${updates.length}, got ${n}`,
    );
}
/** Short, sorted row-lock transactions; key is the ONLY SET column. */
export async function executeQuestionBackfill(
  client: QuestionTransactionHost,
  manifest: QuestionBackfillManifest,
  options: {
    mode: "apply" | "revert";
    receipt: QuestionBackfillReceipt;
    chunkSize?: number;
    persist: (receipt: QuestionBackfillReceipt) => void;
  },
): Promise<QuestionBackfillReceipt> {
  await assertQuestionDdlReady(client);
  const { receipt } = options;
  const sha = questionManifestSha(manifest);
  if (
    receipt.manifestSha256 !== sha ||
    receipt.ddlSha256 !== manifest.ddlSha256
  )
    throw new Error("Receipt belongs to another manifest");
  if (receipt.pendingChunk.length)
    throw new Error(
      "Unsettled prior chunk: preserve the receipt for explicit reconciliation",
    );
  const manifestPairs = new Map<string, string>();
  const manifestIds = new Set<string>();
  for (const pair of manifest.pairs) {
    if (manifestPairs.has(pair.key))
      throw new Error("Manifest contains conflicting pairs");
    manifestPairs.set(pair.key, canonical(pair));
    for (const row of pair.rows) {
      if (manifestIds.has(row.id))
        throw new Error("Manifest contains conflicting pairs");
      manifestIds.add(row.id);
    }
  }
  const applied = new Set<string>();
  for (const pair of receipt.applied) {
    if (
      applied.has(pair.key) ||
      manifestPairs.get(pair.key) !== canonical(pair)
    )
      throw new Error("Receipt contains foreign/duplicate pairs");
    applied.add(pair.key);
  }
  const reverted = new Set<string>();
  for (const key of receipt.reverted) {
    if (!applied.has(key) || reverted.has(key))
      throw new Error("Receipt contains foreign/duplicate reverted keys");
    reverted.add(key);
  }
  const pairs =
    options.mode === "revert"
      ? receipt.applied.filter((p) => !reverted.has(p.key))
      : manifest.pairs;
  const chunkSize = options.chunkSize ?? QUESTION_BACKFILL_CHUNK_SIZE;
  if (
    !Number.isInteger(chunkSize) ||
    chunkSize < 1 ||
    chunkSize > QUESTION_BACKFILL_CHUNK_SIZE
  )
    throw new Error("Invalid short transaction chunk size");
  for (let i = 0; i < pairs.length; i += chunkSize) {
    const chunk = pairs.slice(i, i + chunkSize);
    const ids = chunk.flatMap((p) => p.rows.map((r) => r.id)).sort();
    receipt.pendingChunk = chunk.map((p) => p.key);
    options.persist(receipt);
    const changed = await client.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET LOCAL lock_timeout='3s'`;
        await tx.$executeRaw`SET LOCAL statement_timeout='15s'`;
        const rows = await tx.$queryRaw<RawQuestionRow[]>(
          Prisma.sql`SELECT p.id::text,to_jsonb(p) AS payload FROM public.problem p WHERE p.id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))}) ORDER BY p.id FOR UPDATE`,
        );
        if ((await quarantineOverlap(tx, ids)) !== 0)
          throw new Error("Outer-wall overlap changed; refusing all writes");
        const byId = new Map(rows.map((r) => [r.id, r]));
        const changed: PairManifest[] = [];
        const updates: { row: RawQuestionRow; key: string | null }[] = [];
        const expected = new Map<
          string,
          { digest: string; key: string | null }
        >();
        // Finish every digest, proof and conflict check before the chunk's sole
        // UPDATE. A late bad pair must not even attempt an earlier pair's write.
        for (const pair of chunk) {
          const actual = pair.rows.map((expected) => {
            const row = byId.get(expected.id);
            if (!row || questionPayloadDigest(row.payload) !== expected.digest)
              throw new Error(`Payload changed: ${expected.id}`);
            return row;
          });
          const proof = proveQuestionPair(actual.map(rawQuestionPairRow));
          if (!proof.ok || proof.key !== pair.key)
            throw new Error(`Pair proof failed before write: ${pair.key}`);
          for (const row of pair.rows)
            expected.set(row.id, {
              digest: row.digest,
              key: options.mode === "apply" ? pair.key : null,
            });
          if (options.mode === "apply") {
            if (actual.every((r) => keyOf(r) === pair.key)) continue;
            if (
              actual.some(
                (r, j) =>
                  keyOf(r) !== pair.rows[j].beforeKey || keyOf(r) !== null,
              )
            )
              throw new Error("Existing/partial key conflict");
            for (const row of actual) updates.push({ row, key: pair.key });
            changed.push(pair);
          } else {
            if (actual.every((r) => keyOf(r) === null)) continue;
            if (actual.some((r) => keyOf(r) !== pair.key))
              throw new Error("Revert key CAS conflict");
            for (const row of actual) updates.push({ row, key: null });
            changed.push(pair);
          }
        }
        await casChunk(tx, updates);
        const after = await tx.$queryRaw<RawQuestionRow[]>(
          Prisma.sql`SELECT p.id::text,to_jsonb(p) AS payload FROM public.problem p WHERE p.id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))}) ORDER BY p.id`,
        );
        if (
          after.length !== ids.length ||
          after.some(
            (r) =>
              questionPayloadDigest(r.payload) !== expected.get(r.id)?.digest ||
              keyOf(r) !== expected.get(r.id)?.key,
          )
        )
          throw new Error(
            "Readback changed content/revision/eligibility or key",
          );
        return changed;
      },
      { timeout: 20000 },
    );
    if (options.mode === "apply") {
      for (const pair of changed)
        if (!applied.has(pair.key)) {
          receipt.applied.push(pair);
          applied.add(pair.key);
        }
    } else {
      for (const pair of changed)
        if (!reverted.has(pair.key)) {
          receipt.reverted.push(pair.key);
          reverted.add(pair.key);
        }
    }
    receipt.pendingChunk = [];
    options.persist(receipt);
  }
  receipt.completed = true;
  options.persist(receipt);
  return receipt;
}
export function protectedQuestionWrite(
  file: string,
  value: unknown,
  options: { compact?: boolean } = {},
): void {
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  chmodSync(path.dirname(file), 0o700);
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(
    temporary,
    JSON.stringify(value, null, options.compact ? undefined : 2) + "\n",
    {
      mode: 0o600,
    },
  );
  const handle = openSync(temporary, "r");
  try {
    fsyncSync(handle);
  } finally {
    closeSync(handle);
  }
  renameSync(temporary, file);
  chmodSync(file, 0o600);
  const directory = openSync(path.dirname(file), "r");
  try {
    fsyncSync(directory);
  } finally {
    closeSync(directory);
  }
}

/** Loader path: only persisted, rendered actual pairs may acquire a key.
 * Unsupported/native-singleton groups stay NULL. This is called only after the
 * loader's existing import authorization and provenance readback have passed.
 */
export async function assignProvenEngineQuestionGroups(
  client: QuestionTransactionHost,
  externalIds: readonly string[],
) {
  const groups = new Map<string, string[]>();
  for (const externalId of externalIds) {
    const parsed = parseQuestionExternalId(externalId);
    if (!parsed) continue;
    const pair = ["단답형", "객관식"].map((format) =>
      externalId.replace(/\|(단답형|객관식)(?=\|s-?\d+$|$)/, `|${format}`),
    );
    groups.set(JSON.stringify(parsed.tuple), pair);
  }
  if (!groups.size) return { proved: 0, unproved: 0, unchanged: 0 };
  await assertQuestionDdlReady(client);
  let proved = 0,
    unproved = 0,
    unchanged = 0;
  for (const external of [...groups.values()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const outcome = await client.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET LOCAL lock_timeout='3s'`;
        const rows = await tx.$queryRaw<RawQuestionRow[]>(
          Prisma.sql`SELECT p.id::text,to_jsonb(p) AS payload FROM public.problem p WHERE p.external_id IN (${Prisma.join(external)}) ORDER BY p.id FOR UPDATE`,
        );
        if (rows.length !== 2) return "unproved";
        if (
          (await quarantineOverlap(
            tx,
            rows.map((r) => r.id),
          )) !== 0
        )
          throw new Error("Loader pair intersects outer-wall quarantine");
        const proof = proveQuestionPair(rows.map(rawQuestionPairRow));
        if (!proof.ok) {
          if (proof.reason === "existingKeyConflict")
            throw new Error("Loader cannot replace an existing key");
          return "unproved";
        }
        if (rows.every((r) => keyOf(r) === proof.key)) return "unchanged";
        const expected = new Map(
          rows.map((r) => [r.id, questionPayloadDigest(r.payload)]),
        );
        for (const row of rows)
          if (keyOf(row) !== proof.key) await casKey(tx, row, proof.key);
        const after = await tx.$queryRaw<RawQuestionRow[]>(
          Prisma.sql`SELECT p.id::text,to_jsonb(p) AS payload FROM public.problem p WHERE p.external_id IN (${Prisma.join(external)}) ORDER BY p.id`,
        );
        if (
          after.length !== 2 ||
          after.some(
            (r) =>
              questionPayloadDigest(r.payload) !== expected.get(r.id) ||
              keyOf(r) !== proof.key,
          )
        )
          throw new Error("Loader key readback changed payload or eligibility");
        return "proved";
      },
      { timeout: 15000 },
    );
    if (outcome === "proved") proved++;
    else if (outcome === "unchanged") unchanged++;
    else unproved++;
  }
  return { proved, unproved, unchanged };
}
function arg(name: string) {
  const i = process.argv.indexOf(name);
  return i < 0 ? undefined : process.argv[i + 1];
}
async function main() {
  if (
    ["--prepare", "--apply", "--revert"].filter((flag) =>
      process.argv.includes(flag),
    ).length !== 1
  )
    throw new Error("Choose exactly one prepare/apply/revert mode");
  const manifestPath = arg("--prepare") ?? arg("--apply") ?? arg("--revert");
  if (!manifestPath)
    throw new Error(
      "Use --prepare <manifest> or --apply/--revert <manifest> --approval <file> --receipt <file>",
    );
  const ddlSha256 = createHash("sha256")
    .update(readFileSync(QUESTION_DDL_PATH))
    .digest("hex");
  // Explicit fixed local env source, never printed. Preparation still enforces READ ONLY in PostgreSQL.
  const env = readFileSync("/Users/pss/Desktop/creative/today_/.env", "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line);
    if (
      m &&
      ["DATABASE_URL", "DIRECT_URL"].includes(m[1]) &&
      !process.env[m[1]]
    )
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  const client = new PrismaClient();
  try {
    if (arg("--prepare")) {
      if (existsSync(manifestPath))
        throw new Error(
          "Manifest already exists; preserve it and prepare a new path",
        );
      const manifest = await prepareQuestionBackfill(client, ddlSha256);
      protectedQuestionWrite(manifestPath, manifest);
      console.log(
        JSON.stringify({
          manifest: manifestPath,
          sha256: questionManifestSha(manifest),
          preflight: manifest.preflight,
        }),
      );
      return;
    }
    const manifest = JSON.parse(
      readFileSync(manifestPath, "utf8"),
    ) as QuestionBackfillManifest;
    if (
      createHash("sha256").update(readFileSync(manifestPath)).digest("hex") !==
      questionManifestSha(manifest)
    )
      throw new Error("Manifest bytes differ from protected serialization");
    const approvalPath = arg("--approval"),
      receiptPath = arg("--receipt");
    if (!approvalPath || !receiptPath)
      throw new Error("Approval and receipt files are required");
    validateQuestionBackfillApproval(
      manifest,
      JSON.parse(readFileSync(approvalPath, "utf8")),
      ddlSha256,
      process.env.MATH_QUESTION_BACKFILL_WRITE,
    );
    const mode = arg("--revert") ? "revert" : "apply";
    const receipt = existsSync(receiptPath)
      ? (JSON.parse(
          readFileSync(receiptPath, "utf8"),
        ) as QuestionBackfillReceipt)
      : mode === "apply"
        ? {
            kind: "math-question-backfill-receipt" as const,
            version: 1 as const,
            runId: randomUUID(),
            manifestSha256: questionManifestSha(manifest),
            ddlSha256,
            applied: [],
            reverted: [],
            pendingChunk: [],
            completed: false,
          }
        : null;
    if (!receipt)
      throw new Error("Revert needs the original execution receipt");
    await executeQuestionBackfill(client, manifest, {
      mode,
      receipt,
      // Receipt whitespace is not hashed. Keep the exact v1 ownership document,
      // atomic rename and both fsyncs, with fewer bytes per durable checkpoint.
      persist: (r) => protectedQuestionWrite(receiptPath, r, { compact: true }),
    });
    console.log(
      JSON.stringify({
        mode,
        applied: receipt.applied.length,
        reverted: receipt.reverted.length,
        completed: receipt.completed,
      }),
    );
  } finally {
    await client.$disconnect();
  }
}
if (/question-group-backfill\.(ts|js|mts|mjs)$/i.test(process.argv[1] ?? ""))
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
