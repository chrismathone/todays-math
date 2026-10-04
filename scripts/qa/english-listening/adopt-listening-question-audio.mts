/** Trusted operator CLI. Default mode performs no SQL or Storage writes. */
import { createRequire } from "node:module";
import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PrismaClient } from "@prisma/client";
const require = createRequire(import.meta.url);
const { questionAudioSourceIdSchema } =
  require("../../../src/lib/english/listening/questionAudioProof.ts") as typeof import("../../../src/lib/english/listening/questionAudioProof.ts");
const { loadListeningQuestionAudioPlan, adoptListeningQuestionAudio } =
  require("../../../src/lib/english/listening/runtime/questionAudio.ts") as typeof import("../../../src/lib/english/listening/runtime/questionAudio.ts");
const { readListeningStorageConfig, createListeningStorageApi } =
  require("../../../src/lib/english/listening/media/storageApi.ts") as typeof import("../../../src/lib/english/listening/media/storageApi.ts");
const PROJECT_ID = "jyaguxwuaxgdnovtulna";
const OWNER_ID = "6f361696-5eb5-4f7d-9c66-9313ad7bb06a";
function fail(message: string): never {
  throw Error("Question audio CLI: " + message);
}
export function questionAudioDatabaseUrl(value: string | undefined) {
  let url: URL;
  try {
    url = new URL(value ?? "");
  } catch {
    return fail("Expected project database is unavailable.");
  }
  const user = decodeURIComponent(url.username);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !(
      (url.hostname === `db.${PROJECT_ID}.supabase.co` &&
        user === "postgres") ||
      (url.hostname.endsWith(".pooler.supabase.com") &&
        user === `postgres.${PROJECT_ID}`)
    )
  )
    fail("Expected project database is unavailable.");
  url.searchParams.set("connection_limit", "2");
  url.searchParams.set("pool_timeout", "60");
  return url.toString();
}
export function parseQuestionAudioArgs(args: string[]) {
  let sourceRecordId: string | undefined,
    apply = false,
    help = false,
    ffmpegPath: string | undefined;
  let archiveRoot = resolve("output/listening-assessments");
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--apply") apply = true;
    else if (args[i] === "--help") help = true;
    else if (args[i] === "--archive-root" || args[i] === "--ffmpeg-path") {
      const option = args[i],
        value = args[++i];
      if (!value || value.startsWith("--")) fail("Option requires a path.");
      if (option === "--archive-root") archiveRoot = resolve(value);
      else {
        if (!isAbsolute(value)) fail("FFmpeg path must be absolute.");
        ffmpegPath = value;
      }
    } else if (!sourceRecordId && !args[i].startsWith("--"))
      sourceRecordId = questionAudioSourceIdSchema.parse(args[i]);
    else
      fail(
        "Unknown option. Evidence cannot be bypassed with an approval flag.",
      );
  }
  if (!help && !sourceRecordId) fail("A source record identity is required.");
  return { sourceRecordId, archiveRoot, apply, help, ffmpegPath };
}
if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  let database: PrismaClient | undefined,
    plan:
      Awaited<ReturnType<typeof loadListeningQuestionAudioPlan>> | undefined;
  try {
    const options = parseQuestionAudioArgs(process.argv.slice(2));
    if (options.help)
      console.log(
        "adopt-listening-question-audio.mts SOURCE_ID [--archive-root PATH] [--ffmpeg-path ABSOLUTE_PATH] [--apply]\nDefault: read-only SQL preflight after full local decoding. Every passage must have qualified numbering, complete official dialogue/repetitions and unsplit VAD boundaries. --apply uses private Storage chunks and atomic document CAS. No --approve override exists.",
      );
    else {
      const databaseUrl = questionAudioDatabaseUrl(process.env.DATABASE_URL);
      plan = await loadListeningQuestionAudioPlan(
        options.archiveRoot,
        options.sourceRecordId!,
        { ffmpegPath: options.ffmpegPath },
      );
      if (plan.snapshot.expectedSet.ownerId !== OWNER_ID)
        fail("Expected source owner differs.");
      let storage = null;
      if (options.apply) {
        const config = readListeningStorageConfig();
        if (!config || config.url !== `https://${PROJECT_ID}.supabase.co`)
          fail("Expected private Storage project is unavailable.");
        storage = createListeningStorageApi(config);
      }
      database = new PrismaClient({ datasourceUrl: databaseUrl });
      console.log(
        JSON.stringify(
          await adoptListeningQuestionAudio(database, storage, plan, {
            actor: { kind: "teacher", userId: OWNER_ID },
            apply: options.apply,
          }),
        ),
      );
    }
  } catch (error) {
    console.error(
      error instanceof Error &&
        /^Question audio (?:CLI|proof|import):/.test(error.message)
        ? error.message
        : "Question audio import failed validation or access checks.",
    );
    process.exitCode = 1;
  } finally {
    await plan?.dispose();
    await database?.$disconnect();
  }
}
