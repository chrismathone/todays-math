/** Privileged, explicitly scoped retirement. Source manifests are private temporary inputs. */
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { Prisma, PrismaClient } from "@prisma/client";
const require = createRequire(import.meta.url);
const { readListeningStorageConfig } =
  require("../../../../src/lib/english/listening/media/storageApi") as typeof import("../../../../src/lib/english/listening/media/storageApi");

type AssetSnapshot = {
  assetId: string;
  setId: string;
  record: Prisma.JsonValue;
};
type StorageReference = {
  bucket: string;
  key: string;
  ownerId: string;
  bytes: number;
};
type RetirementPlan = {
  project: string;
  sourceCount: number;
  questionCount: number;
  discardSetIds: string[];
  discardAssets: AssetSnapshot[];
  storageBlobs: { ref: Prisma.JsonValue }[];
  retainedSetIdentities: {
    id: string;
    revision: number;
    documentSha256: string;
  }[];
};

const args = process.argv.slice(2);
const option = (name: string) => args[args.indexOf(name) + 1];
const apply = args.includes("--apply");
const remoteAlreadyDeleted = args.includes("--remote-already-deleted");
const manifestPath = option("--manifest");
if (!manifestPath || !args.includes("--manifest"))
  throw Error("A reviewed private manifest is required");
const bytes = await readFile(manifestPath);
const digest = (value: Uint8Array | string) =>
  createHash("sha256").update(value).digest("hex");
if (
  args.includes("--manifest-sha256") &&
  digest(bytes) !== option("--manifest-sha256")
)
  throw Error("Manifest changed");
const plan = JSON.parse(bytes.toString("utf8")) as RetirementPlan;
if (
  plan.project !== "jyaguxwuaxgdnovtulna" ||
  plan.sourceCount !== 193 ||
  plan.questionCount !== 3699
)
  throw Error("Wrong retirement population");
if (apply) {
  if (
    !args.includes("--manifest-sha256") ||
    !args.includes("--patterns") ||
    !args.includes("--patterns-sha256")
  )
    throw Error("Apply requires reviewed manifest and abstract pattern hashes");
  if (
    digest(await readFile(option("--patterns"))) !== option("--patterns-sha256")
  )
    throw Error("Reviewed patterns changed");
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ids: string[] = plan.discardSetIds;
if (
  !Array.isArray(ids) ||
  ids.length !== new Set(ids).size ||
  !ids.every((id) => uuid.test(id))
)
  throw Error("Invalid set identities");
const assetIds = new Set<string>(plan.discardAssets.map((a) => a.assetId));
if (!assetIds.size || [...assetIds].some((id) => !uuid.test(id)))
  throw Error("Invalid asset identities");
const dbUrl = new URL(process.env.DIRECT_URL!);
if (
  decodeURIComponent(dbUrl.username) !== "postgres.jyaguxwuaxgdnovtulna" &&
  !(
    dbUrl.hostname === "db.jyaguxwuaxgdnovtulna.supabase.co" &&
    dbUrl.username === "postgres"
  )
)
  throw Error("Wrong DB project");
dbUrl.searchParams.set("connection_limit", "1");
dbUrl.searchParams.set("pool_timeout", "60");
const candidateConfig = readListeningStorageConfig();
if (
  !candidateConfig ||
  candidateConfig.url !== "https://jyaguxwuaxgdnovtulna.supabase.co" ||
  candidateConfig.bucket !== "english-listening-private"
)
  throw Error("Wrong private Storage project");
const config = candidateConfig;
const credentials = {
  apikey: config.serviceKey,
  ...(!config.serviceKey.startsWith("sb_secret_")
    ? { Authorization: `Bearer ${config.serviceKey}` }
    : {}),
};
const storageRequest = async (path: string, init: RequestInit = {}) =>
  fetch(config.url + "/storage/v1" + path, {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(60000),
    headers: {
      ...credentials,
      ...Object.fromEntries(new Headers(init.headers)),
    },
  });

async function inspectObject(
  ref: StorageReference,
): Promise<"absent" | "matching"> {
  const objectPath = "/object/authenticated/" + config.bucket + "/" + ref.key;
  const response = await storageRequest(objectPath, { method: "HEAD" });
  const status = response.status;
  const matches =
    response.ok && Number(response.headers.get("content-length")) === ref.bytes;
  await response.body?.cancel();
  if (status === 404) return "absent";
  if (matches) return "matching";
  if (status === 400) {
    // This Storage server wraps a missing object as HTTP400 with a404 error payload.
    const readback = await storageRequest(objectPath, {
      headers: { Range: "bytes=0-0" },
    });
    if (readback.status === 404) {
      await readback.body?.cancel();
      return "absent";
    }
    if (readback.status === 400) {
      const error = (await readback.json()) as {
        statusCode?: string | number;
        error?: string;
        message?: string;
      };
      if (
        String(error.statusCode) === "404" &&
        error.error === "not_found" &&
        error.message === "Object not found"
      )
        return "absent";
    } else {
      await readback.body?.cancel();
    }
  }
  throw Error("A Storage object differs from its reviewed reference");
}
const refs = new Map<string, StorageReference>();
function collect(value: unknown, into: Map<string, StorageReference>) {
  if (!value || typeof value !== "object") return;
  const candidate = value as Partial<StorageReference>;
  if (
    typeof candidate.bucket === "string" &&
    typeof candidate.key === "string" &&
    typeof candidate.ownerId === "string"
  ) {
    if (!Number.isSafeInteger(candidate.bytes) || candidate.bytes! < 0)
      throw Error("Invalid object byte count");
    into.set(
      candidate.bucket + "/" + candidate.key,
      candidate as StorageReference,
    );
  }
  for (const child of Object.values(value))
    if (child && typeof child === "object") collect(child, into);
}
for (const asset of plan.discardAssets) collect(asset.record, refs);
for (const blob of plan.storageBlobs) collect(blob.ref, refs);
for (const ref of refs.values()) {
  const parts = ref.key.split("/");
  if (
    ref.bucket !== config.bucket ||
    parts.length !== 3 ||
    !parts.every((p: string) => uuid.test(p)) ||
    parts[0] !== ref.ownerId ||
    !assetIds.has(parts[1])
  )
    throw Error("Object escaped the reviewed external asset scope");
}
async function mapBounded<T, R>(
  items: T[],
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += 8)
    results.push(...(await Promise.all(items.slice(i, i + 8).map(task))));
  return results;
}
const db = new PrismaClient({
  datasources: { db: { url: dbUrl.toString() } },
  log: [],
});
try {
  const setList = Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`));
  const assetList = Prisma.join(
    [...assetIds].map((id) => Prisma.sql`${id}::uuid`),
  );
  const currentSets = await db.$queryRaw<
    { id: string; deleted_at: Date | null }[]
  >(
    Prisma.sql`SELECT id,deleted_at FROM english_listening_set WHERE id IN (${setList})`,
  );
  if (
    currentSets.length !== ids.length ||
    currentSets.some((s) => !s.deleted_at)
  )
    throw Error("Sources are not completely quarantined");
  const currentAssets = await db.$queryRaw<AssetSnapshot[]>(
    Prisma.sql`SELECT "assetId","setId",record FROM english_listening_media_asset WHERE "assetId" IN (${assetList})`,
  );
  if (
    currentAssets.length !== assetIds.size ||
    currentAssets.some((a) => !ids.includes(a.setId))
  )
    throw Error("Asset scope changed");
  for (const a of currentAssets) {
    const frozen = plan.discardAssets.find((p) => p.assetId === a.assetId)!;
    if (
      digest(JSON.stringify(a.record)) !== digest(JSON.stringify(frozen.record))
    )
      throw Error("An asset changed after review");
  }
  const keptAssets = await db.$queryRaw<{ record: Prisma.JsonValue }[]>(
    Prisma.sql`SELECT record FROM english_listening_media_asset WHERE "setId" NOT IN (${setList})`,
  );
  const keptRefs = new Map<string, StorageReference>();
  keptAssets.forEach((a) => collect(a.record, keptRefs));
  const keptStorageBlobs = await db.$queryRaw<{ ref: Prisma.JsonValue }[]>(
    Prisma.sql`SELECT ref FROM english_listening_media_storage_blob WHERE "assetId" NOT IN (${assetList})`,
  );
  keptStorageBlobs.forEach((b) => collect(b.ref, keptRefs));
  if ([...refs.keys()].some((key) => keptRefs.has(key)))
    throw Error("An own recording shares a proposed deletion object");
  const providerRows = await db.$queryRaw<{ provider_transcript_id: string }[]>(
    Prisma.sql`SELECT provider_transcript_id FROM english_listening_source_transcript WHERE set_id IN (${setList})`,
  );
  const providerIds = providerRows.map((r) => r.provider_transcript_id);
  if (providerIds.some((id: string) => !uuid.test(id)))
    throw Error("Invalid provider transcript identity");
  const summary: Record<string, unknown> = {
    externalSets: ids.length,
    externalAssets: assetIds.size,
    storageObjects: refs.size,
    providerTranscripts: providerIds.length,
    ownSetsProtected: plan.retainedSetIdentities.length,
    sharedOwnObjects: 0,
    apply,
  };
  if (!apply) {
    console.log(JSON.stringify(summary));
  } else {
    const bucketReply = await storageRequest("/bucket/" + config.bucket);
    if (!bucketReply.ok) throw Error("Private bucket check failed");
    const bucket = await bucketReply.json();
    if (bucket.id !== config.bucket || bucket.public !== false)
      throw Error("Unexpected bucket privacy");
    const allRefs = [...refs.values()];
    await mapBounded(allRefs, async (ref) => {
      const state = await inspectObject(ref);
      if (remoteAlreadyDeleted && state !== "absent")
        throw Error("Resume requires every remote object already absent");
    });
    for (let i = 0; !remoteAlreadyDeleted && i < allRefs.length; i += 50) {
      const r = await storageRequest("/object/" + config.bucket, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefixes: allRefs.slice(i, i + 50).map((ref) => ref.key),
        }),
      });
      if (!r.ok) {
        await r.body?.cancel();
        throw Error("Scoped Storage deletion failed");
      }
      await r.body?.cancel();
      console.log(
        JSON.stringify({
          stage: "storage",
          removedOrAbsent: Math.min(i + 50, allRefs.length),
          total: allRefs.length,
        }),
      );
    }
    if (!remoteAlreadyDeleted)
      await mapBounded(allRefs, async (ref) => {
        if ((await inspectObject(ref)) !== "absent")
          throw Error("A retired Storage object remains");
      });
    // Delete only this project's previously submitted transcripts, never an account-wide list.
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (providerIds.length && !apiKey)
      throw Error("Provider cleanup key unavailable");
    for (let i = 0; !remoteAlreadyDeleted && i < providerIds.length; i++) {
      const target =
        "https://api.assemblyai.com/v2/transcript/" + providerIds[i];
      const r = await fetch(target, {
        method: "DELETE",
        redirect: "error",
        signal: AbortSignal.timeout(60000),
        headers: { authorization: apiKey! },
      });
      if (!r.ok && r.status !== 404) {
        await r.body?.cancel();
        throw Error("Scoped provider transcript deletion failed");
      }
      await r.body?.cancel();
      if ((i + 1) % 20 === 0 || i + 1 === providerIds.length)
        console.log(
          JSON.stringify({
            stage: "transcripts",
            removedOrAbsent: i + 1,
            total: providerIds.length,
          }),
        );
    }
    const remainingProvider = await mapBounded(providerIds, async (id) => {
      const r = await fetch("https://api.assemblyai.com/v2/transcript/" + id, {
        redirect: "error",
        signal: AbortSignal.timeout(60000),
        headers: { authorization: apiKey! },
      });
      if (r.status === 404) {
        await r.body?.cancel();
        return false;
      }
      if (!r.ok) {
        await r.body?.cancel();
        throw Error("Provider cleanup readback failed");
      }
      const data = await r.json();
      // This provider retains a tombstone object whose text and audio URL are this exact sentinel.
      return Boolean(
        (data.text && data.text !== "Deleted by user.") ||
        (data.audio_url && data.audio_url !== "http://deleted_by_user") ||
        data.words?.length ||
        data.utterances?.length ||
        data.translated_texts ||
        data.summary,
      );
    });
    if (remainingProvider.some(Boolean))
      throw Error("Provider transcript content remains");
    const deleted = await db.$transaction(
      async (tx) => {
        // Existing append-only guard is suspended only inside this exclusive cleanup transaction.
        await tx.$executeRawUnsafe(
          "LOCK TABLE english_listening_source_transcript IN ACCESS EXCLUSIVE MODE",
        );
        await tx.$executeRawUnsafe(
          "ALTER TABLE english_listening_source_transcript DISABLE TRIGGER english_listening_source_transcript_immutable",
        );
        const transcriptRows = await tx.$executeRaw(
          Prisma.sql`DELETE FROM english_listening_source_transcript WHERE set_id IN (${setList})`,
        );
        await tx.$executeRawUnsafe(
          "ALTER TABLE english_listening_source_transcript ENABLE TRIGGER english_listening_source_transcript_immutable",
        );
        const publications = await tx.$queryRaw<{ id: string }[]>(
          Prisma.sql`SELECT id FROM english_listening_publication WHERE set_id IN (${setList})`,
        );
        if (publications.length)
          throw Error(
            "Published descendants require additional reviewed cleanup",
          );
        const storageBlobRows = await tx.$executeRaw(
          Prisma.sql`DELETE FROM english_listening_media_storage_blob WHERE "assetId" IN (${assetList})`,
        );
        const blobRows = await tx.$executeRaw(
          Prisma.sql`DELETE FROM english_listening_media_blob WHERE "assetId" IN (${assetList})`,
        );
        const auditRows = await tx.$executeRaw(
          Prisma.sql`DELETE FROM english_listening_audit WHERE resource_id IN (${setList}) OR resource_id IN (${assetList})`,
        );
        const assetRows = await tx.$executeRaw(
          Prisma.sql`DELETE FROM english_listening_media_asset WHERE "assetId" IN (${assetList})`,
        );
        const setRows = await tx.$executeRaw(
          Prisma.sql`DELETE FROM english_listening_set WHERE id IN (${setList}) AND deleted_at IS NOT NULL`,
        );
        return {
          transcriptRows,
          storageBlobRows,
          blobRows,
          auditRows,
          assetRows,
          setRows,
        };
      },
      { timeout: 120000, maxWait: 10000 },
    );
    const left = await db.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`SELECT count(*) AS count FROM english_listening_set WHERE id IN (${setList})`,
    );
    if (Number(left[0].count)) throw Error("A retired DB source remains");
    for (const original of plan.retainedSetIdentities) {
      const rows = await db.$queryRaw<
        { revision: number; document: Prisma.JsonValue }[]
      >(
        Prisma.sql`SELECT revision,document FROM english_listening_set WHERE id=${original.id}::uuid`,
      );
      if (
        rows.length !== 1 ||
        rows[0].revision !== original.revision ||
        digest(JSON.stringify(rows[0].document)) !== original.documentSha256
      )
        throw Error("Own material changed during retirement");
    }
    summary.deleted = deleted;
    summary.storageReadbackAbsent = allRefs.length;
    summary.providerContentReadbackAbsent = providerIds.length;
    await writeFile(
      ".qa-artifacts/listening-retirement-20261006/live-purge-summary.json",
      JSON.stringify(summary, null, 2),
      { flag: "wx" },
    );
    console.log(JSON.stringify(summary));
  }
} catch (error) {
  console.error(
    error instanceof Prisma.PrismaClientKnownRequestError
      ? `Scoped retirement DB failure (${error.code}); reviewed plan retained.`
      : error instanceof Error &&
          /^(?:Provider|Scoped|A retired|Own material|Published descendants|Resume requires)/.test(
            error.message,
          )
        ? error.message
        : "Scoped retirement failed; preserve the reviewed private plan and inspect the last completed stage.",
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
