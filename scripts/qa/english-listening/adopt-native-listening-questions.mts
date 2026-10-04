/** Trusted CLI: verified original PDF text replaces only unreviewed imported question presentation. */
import { createHash } from "node:crypto";
import { open, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import type { ListeningDraft } from "../../../src/contracts/englishListeningHttp.contract";
import type {
  ListeningActor,
  ListeningDatabase,
} from "../../../src/lib/english/listening/runtime/database";

// The application .ts modules are CommonJS under Node/tsx and ESM under Vitest.
function moduleExports<T>(module: T): T {
  const fallback = (module as { default?: unknown }).default;
  return fallback && typeof fallback === "object" ? (fallback as T) : module;
}
const { listeningCreateSetSchema, listeningUpdateSetSchema } = moduleExports(
  await import("../../../src/contracts/englishListeningHttp.contract"),
);
const { listeningQuestionImageSchema } = moduleExports(
  await import("../../../src/contracts/englishListeningSource.contract"),
);
const { freezeListeningValue, listeningValueHash } = moduleExports(
  await import("../../../src/lib/english/listening/publication"),
);
const { audit, json, lock, one, ownedSet, teacher } = moduleExports(
  await import("../../../src/lib/english/listening/runtime/database"),
);
const { updateSet, verifiedMedia } = moduleExports(
  await import("../../../src/lib/english/listening/runtime/sets"),
);

const OWNER_ID = "6f361696-5eb5-4f7d-9c66-9313ad7bb06a";
const PROJECT_ID = "jyaguxwuaxgdnovtulna";
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const sourceIdentity = z
  .string()
  .regex(/^(ebs|ebsi)-(middle|high)-[1-3]-\d{4}-(1|2|09-mock)$/);
const sourceBounds = z.tuple([
  z.number().finite().nonnegative(),
  z.number().finite().nonnegative(),
  z.number().finite().nonnegative(),
  z.number().finite().nonnegative(),
]);
const editableSchema = listeningUpdateSetSchema.omit({
  expectedRevision: true,
});
const stageSchema = z.strictObject({
  schemaVersion: z.literal(1),
  sourceRecordId: sourceIdentity,
  preparedAt: z.iso.datetime({ offset: true }),
  originalPreparedPath: z.string().min(1),
  originalPreparedSha256: hash,
  sourceQuestionPdfSha256: hash,
  questions: z
    .array(
      z.strictObject({
        questionId: z.uuid(),
        sourceNumber: z.number().int().min(1).max(100),
        prompt: z.string().min(1).max(2000),
        instruction: z.string().min(1).max(2000).optional(),
        image: listeningQuestionImageSchema
          .extend({ role: z.enum(["question", "visual"]) })
          .optional(),
        choices: z
          .array(
            z.strictObject({ id: z.uuid(), text: z.string().min(1).max(2000) }),
          )
          .min(2)
          .max(5),
        answerChoiceId: z.uuid(),
        conversion: z.strictObject({
          method: z.enum([
            "pdf_text",
            "ocr_verified",
            "original_image_preserved",
          ]),
          sourcePage: z.number().int().min(1).max(2000),
          bounds: sourceBounds,
          nativePrompt: z.boolean(),
          nativeChoices: z.boolean(),
          visualSha256: hash.optional(),
          visualBounds: sourceBounds.optional(),
          originalPrompt: z.string().min(1).max(2000).optional(),
          reason: z.string().min(1).max(2000).optional(),
        }),
      }),
    )
    .min(1)
    .max(900),
  conversion: z.strictObject({
    parser: z.string().trim().min(1).max(200),
    questionCount: z.number().int().min(1).max(900),
    nativeCount: z.number().int().nonnegative().max(900),
    preservedImageCount: z.number().int().nonnegative().max(900),
  }),
});
const originalSchema = z.object({
  schemaVersion: z.literal(1),
  sourceRecordId: sourceIdentity,
  createInput: listeningCreateSetSchema,
  editableInput: editableSchema,
  sourceFiles: z
    .array(
      z.object({
        kind: z.string(),
        path: z.string(),
        bytes: z.number().int().positive(),
        sha256: hash,
      }),
    )
    .min(1),
});
type NativeStage = z.infer<typeof stageSchema>;
type Editable = z.infer<typeof editableSchema>;
type DraftQuestion = ListeningDraft["groups"][number]["questions"][number];
interface LoadedNativeStage {
  stage: NativeStage;
  original: z.infer<typeof originalSchema>;
  stageSha256: string;
}
const verifiedStages = new WeakSet<object>();
export class NativeListeningAdoptionError extends Error {}
function fail(message: string): never {
  throw new NativeListeningAdoptionError(message);
}
const digest = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
const content = (question: DraftQuestion) => {
  const { metadata, ...rest } = question;
  void metadata;
  return rest;
};
const same = (a: unknown, b: unknown) =>
  listeningValueHash(a) === listeningValueHash(b);
const imageSha = (image: NonNullable<DraftQuestion["image"]>) =>
  digest(Buffer.from(image.dataUrl.split(",")[1], "base64"));

/** Complete identities, original answer references, unchanged non-native portions, and image evidence. */
export function validateNativeQuestionStage(
  input: unknown,
  originalInput: unknown,
) {
  const stage = stageSchema.parse(input);
  const original = originalSchema.parse(originalInput);
  if (stage.sourceRecordId !== original.sourceRecordId)
    fail("Source identity mismatch.");
  if (!original.createInput.source)
    fail("Original assessment source metadata is required.");
  const old = original.editableInput.groups.flatMap((group) => group.questions);
  if (
    !old.length ||
    old.length !== stage.questions.length ||
    stage.conversion.questionCount !== old.length
  )
    fail("Native stage must contain every original question.");
  if (
    new Set(old.map((q) => q.id)).size !== old.length ||
    new Set(stage.questions.map((q) => q.questionId)).size !== old.length
  )
    fail("Question identities are duplicated.");
  let nativeCount = 0,
    preservedImageCount = 0;
  for (const [index, next] of stage.questions.entries()) {
    const previous = old[index];
    if (
      next.questionId !== previous.id ||
      next.sourceNumber !== previous.sourceNumber ||
      next.answerChoiceId !== previous.answerChoiceId ||
      !same(
        next.choices.map((c) => c.id),
        previous.choices.map((c) => c.id),
      )
    )
      fail("Original question, choice order, or answer identity changed.");
    if (
      previous.metadata?.origin !== "official_original" ||
      previous.metadata.sourceRecordId !== stage.sourceRecordId
    )
      fail("Only proven original PDF questions may be adopted.");
    const proof = next.conversion;
    if (
      proof.bounds[0] >= proof.bounds[2] ||
      proof.bounds[1] >= proof.bounds[3]
    )
      fail("Invalid source bounds.");
    if (
      proof.visualBounds &&
      (!next.image ||
        proof.visualBounds[0] >= proof.visualBounds[2] ||
        proof.visualBounds[1] >= proof.visualBounds[3] ||
        proof.visualBounds[0] < proof.bounds[0] ||
        proof.visualBounds[1] < proof.bounds[1] ||
        proof.visualBounds[2] > proof.bounds[2] ||
        proof.visualBounds[3] > proof.bounds[3])
    )
      fail("Invalid visual source bounds.");
    if (
      !proof.nativePrompt &&
      (next.prompt !== previous.prompt ||
        next.instruction !== previous.instruction)
    )
      fail("Unconverted prompt must preserve the original.");
    if (!proof.nativeChoices && !same(next.choices, previous.choices))
      fail("Unconverted choices must preserve the original.");
    if (
      next.image &&
      (!proof.visualSha256 || imageSha(next.image) !== proof.visualSha256)
    )
      fail("Native image evidence mismatch.");
    if (!next.image && proof.visualSha256) fail("Image evidence has no image.");
    if (proof.method === "original_image_preserved") {
      preservedImageCount++;
      if (
        proof.nativePrompt ||
        proof.nativeChoices ||
        !previous.image ||
        !next.image ||
        next.image.role !== "question" ||
        imageSha(next.image) !== imageSha(previous.image) ||
        next.image.width !== previous.image.width ||
        next.image.height !== previous.image.height
      )
        fail("Preserved question image or original presentation changed.");
    } else {
      nativeCount++;
      if (!proof.nativePrompt && !proof.nativeChoices)
        fail("Native conversion has no native content.");
      if (next.image?.role === "question")
        fail("Native text must not be paired with a full question crop.");
    }
  }
  if (
    nativeCount !== stage.conversion.nativeCount ||
    preservedImageCount !== stage.conversion.preservedImageCount
  )
    fail("Native conversion counts mismatch.");
  return { stage, original };
}

async function bytes(path: string, max: number) {
  const handle = await open(path, "r");
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size < 1 || info.size > max)
      fail("Artifact file is missing or exceeds its size limit.");
    const result = await handle.readFile();
    if (result.length !== info.size || result.length > max)
      fail("Artifact changed during verification.");
    return result;
  } finally {
    await handle.close();
  }
}
async function inside(root: string, path: string) {
  if (!isAbsolute(path)) fail("Source artifact path must be absolute.");
  const actual = await realpath(path);
  const rel = relative(root, actual);
  if (
    !rel ||
    rel === ".." ||
    rel.startsWith("..\\") ||
    rel.startsWith("../") ||
    isAbsolute(rel)
  )
    fail("Source artifact is outside the listening archive.");
  return actual;
}
export async function loadNativeQuestionStage(
  archiveRoot: string,
  sourceRecordId: string,
): Promise<LoadedNativeStage> {
  sourceIdentity.parse(sourceRecordId);
  const root = await realpath(resolve(archiveRoot));
  const rawStage = await bytes(
    await inside(
      root,
      resolve(root, "prepared-native-registration", sourceRecordId + ".json"),
    ),
    16 * 1024 * 1024,
  );
  const first = stageSchema.parse(JSON.parse(rawStage.toString("utf8")));
  if (first.sourceRecordId !== sourceRecordId)
    fail("Selected source identity mismatch.");
  const originalPath = await inside(root, first.originalPreparedPath);
  const expectedPaths = await Promise.all(
    ["prepared-registration", "prepared-historical-registration"].map(
      async (directory) => {
        try {
          return await realpath(
            resolve(root, directory, sourceRecordId + ".json"),
          );
        } catch {
          return null;
        }
      },
    ),
  );
  if (!expectedPaths.includes(originalPath))
    fail("Original prepared artifact location mismatch.");
  const rawOriginal = await bytes(originalPath, 16 * 1024 * 1024);
  if (digest(rawOriginal) !== first.originalPreparedSha256)
    fail("Original prepared artifact hash mismatch.");
  const { stage, original } = validateNativeQuestionStage(
    first,
    JSON.parse(rawOriginal.toString("utf8")),
  );
  const questionFiles = original.sourceFiles.filter(
    (file) =>
      file.kind === "questions" ||
      (original.createInput.source?.kind === "mock_exam" &&
        file.kind === "paper"),
  );
  if (
    questionFiles.length !== 1 ||
    questionFiles[0].sha256 !== stage.sourceQuestionPdfSha256
  )
    fail("Original question PDF identity mismatch.");
  const pdf = questionFiles[0];
  const rawPdf = await bytes(await inside(root, pdf.path), 64 * 1024 * 1024);
  if (
    rawPdf.length !== pdf.bytes ||
    digest(rawPdf) !== pdf.sha256 ||
    rawPdf.subarray(0, 5).toString() !== "%PDF-"
  )
    fail("Original question PDF proof mismatch.");
  const loaded = freezeListeningValue({
    stage,
    original,
    stageSha256: digest(rawStage),
  });
  verifiedStages.add(loaded);
  return loaded;
}

function replacement(
  previous: DraftQuestion,
  staged: NativeStage["questions"][number],
): DraftQuestion {
  const { instruction, image, ...rest } = previous;
  void instruction;
  void image;
  return {
    ...rest,
    prompt: staged.prompt,
    ...(staged.instruction === undefined
      ? {}
      : { instruction: staged.instruction }),
    ...(staged.image === undefined ? {} : { image: staged.image }),
    choices: previous.choices.map((choice, index) => ({
      ...choice,
      text: staged.choices[index].text,
    })),
  };
}
/** Preserve every field except verified presentation, including metadata, ranges, evidence and media. */
export function planNativeQuestionAdoption(
  loaded: Pick<LoadedNativeStage, "stage" | "original">,
  document: ListeningDraft,
): { alreadyNative: boolean; input: Editable } {
  const { stage, original } = validateNativeQuestionStage(
    loaded.stage,
    loaded.original,
  );
  const oldGroups = original.editableInput.groups;
  if (
    !same(document.source, original.createInput.source) ||
    !same(
      document.groups.map((g) => g.id),
      oldGroups.map((g) => g.id),
    )
  )
    fail("Stored source or group identity mismatch.");
  const expected = oldGroups.flatMap((g) => g.questions),
    actual = document.groups.flatMap((g) => g.questions);
  if (
    !same(
      actual.map((q) => q.id),
      expected.map((q) => q.id),
    )
  )
    fail("Stored question identities changed; preserve user edits.");
  if (
    !same(
      document.groups.map((g) => g.questions.map((q) => q.id)),
      oldGroups.map((g) => g.questions.map((q) => q.id)),
    )
  )
    fail("Stored question group changed; preserve user edits.");
  const nextById = new Map(stage.questions.map((q) => [q.questionId, q]));
  const native = expected.map((q) => replacement(q, nextById.get(q.id)!));
  const isOriginal = actual.every((q, i) =>
    same(content(q), content(expected[i])),
  );
  const alreadyNative = actual.every((q, i) =>
    same(content(q), content(native[i])),
  );
  if (!isOriginal && !alreadyNative)
    fail("Stored question content changed; preserve user edits.");
  return {
    alreadyNative,
    input: editableSchema.parse({
      title: document.title,
      level: document.level,
      examId: document.examId,
      rights: document.rights,
      basis: document.provenance.basis,
      groups: document.groups.map((group) => {
        const { reviews, ...rest } = group;
        void reviews;
        return {
          ...rest,
          questions: group.questions.map((q) =>
            replacement(q, nextById.get(q.id)!),
          ),
        };
      }),
    }),
  };
}

export async function adoptNativeListeningQuestions(
  database: ListeningDatabase,
  loaded: LoadedNativeStage,
  options: { actor: ListeningActor; apply?: boolean },
) {
  if (!verifiedStages.has(loaded))
    fail("Native stage must be loaded and verified from archive files.");
  if (options.actor.kind !== "teacher")
    fail("Native question adoption requires a teacher.");
  return database.$transaction(
    async (tx) => {
      // Default mode actively prevents accidental writes, even if a future helper gains side effects.
      if (!options.apply)
        await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      await tx.$executeRawUnsafe("SET LOCAL TIME ZONE 'UTC'");
      const account = await teacher(tx, options.actor, "materials");
      const ids = await tx.$queryRaw<{ id: string }[]>(
        Prisma.sql`SELECT id::text FROM english_listening_set WHERE owner_id=${account.id}::uuid AND deleted_at IS NULL AND document->'source'=${json(loaded.original.createInput.source)} AND document->>'level'=${loaded.original.createInput.level ?? null}`,
      );
      if (!ids.length)
        return {
          sourceRecordId: loaded.stage.sourceRecordId,
          status: "pending_registration" as const,
        };
      if (ids.length !== 1) fail("Source identity is ambiguous.");
      const setId = ids[0].id;
      await lock(tx, setId);
      const set = await ownedSet(tx, account, setId);
      if (set.owner_id !== account.id)
        fail("Native adoption requires the exact source owner.");
      if (
        (await one(
          tx,
          Prisma.sql`SELECT id FROM english_listening_publication WHERE set_id=${setId}::uuid LIMIT 1`,
        )) ||
        set.document.groups.some(
          (group) =>
            group.reviews.content ||
            group.reviews.audio ||
            group.reviews.alignment,
        )
      )
        fail("Preserve published or human-reviewed material.");
      for (const group of set.document.groups) {
        if (!group.audio) fail("Registered original audio is required.");
        const completion = await verifiedMedia(tx, set, group.audio.assetId);
        if (
          completion.sha256 !== group.audio.sha256 ||
          completion.durationMs !== group.audio.durationMs
        )
          fail("Stored audio reference differs from immutable readiness.");
        const originals = loaded.original.sourceFiles.filter(
          (file) => file.kind === "audio",
        );
        if (
          originals.length !== 1 ||
          completion.originalSha256 !== originals[0].sha256
        )
          fail("Ready original audio differs from source provenance.");
      }
      const plan = planNativeQuestionAdoption(loaded, set.document);
      const result = {
        sourceRecordId: loaded.stage.sourceRecordId,
        setId,
        revision: set.revision,
        ...loaded.stage.conversion,
      };
      if (plan.alreadyNative)
        return { ...result, status: "already_native" as const };
      if (!options.apply) return { ...result, status: "read_only" as const };
      const now = new Date().toISOString();
      const saved = await updateSet(
        tx,
        account,
        setId,
        listeningUpdateSetSchema.parse({
          ...plan.input,
          expectedRevision: set.revision,
        }),
        now,
      );
      await audit(
        tx,
        setId,
        account.id,
        "native_questions_adopted",
        {
          sourceRecordId: loaded.stage.sourceRecordId,
          stageSha256: loaded.stageSha256,
          originalPreparedSha256: loaded.stage.originalPreparedSha256,
          sourceQuestionPdfSha256: loaded.stage.sourceQuestionPdfSha256,
          ...loaded.stage.conversion,
          sourceRevision: set.revision,
          revision: saved.revision,
        },
        now,
      );
      return {
        ...result,
        status: "applied" as const,
        revision: saved.revision,
      };
    },
    { maxWait: 10000, timeout: 60000 },
  );
}

export function nativeListeningDatabaseUrl(value: string | undefined) {
  let url: URL;
  try {
    url = new URL(value ?? "");
  } catch {
    return fail("Expected listening database project is unavailable.");
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
    fail("Expected listening database project is unavailable.");
  url.searchParams.set("connection_limit", "2");
  url.searchParams.set("pool_timeout", "60");
  return url.toString();
}
export function parseNativeListeningArgs(args: string[]) {
  let sourceRecordId: string | undefined,
    apply = false,
    help = false;
  let archiveRoot = resolve("output/listening-assessments");
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--apply") apply = true;
    else if (args[i] === "--help") help = true;
    else if (args[i] === "--archive-root") {
      const value = args[++i];
      if (!value || value.startsWith("--"))
        fail("--archive-root requires a path.");
      archiveRoot = resolve(value);
    } else if (!sourceRecordId && !args[i].startsWith("--"))
      sourceRecordId = sourceIdentity.parse(args[i]);
    else fail("Unknown native adoption option.");
  }
  if (!help && !sourceRecordId) fail("A source record identity is required.");
  return { sourceRecordId, archiveRoot, apply, help };
}
if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  let database: PrismaClient | undefined;
  try {
    const options = parseNativeListeningArgs(process.argv.slice(2));
    if (options.help)
      console.log(
        "adopt-native-listening-questions.mts SOURCE_ID [--archive-root PATH] [--apply]\nDefault: database read-only preflight. --apply updates only verified, unreviewed existing originals. DATABASE_URL must target the configured project; no Storage credentials or uploads are needed.",
      );
    else {
      const loaded = await loadNativeQuestionStage(
        options.archiveRoot,
        options.sourceRecordId!,
      );
      database = new PrismaClient({
        datasourceUrl: nativeListeningDatabaseUrl(process.env.DATABASE_URL),
      });
      console.log(
        JSON.stringify(
          await adoptNativeListeningQuestions(database, loaded, {
            actor: { kind: "teacher", userId: OWNER_ID },
            apply: options.apply,
          }),
        ),
      );
    }
  } catch (error) {
    console.error(
      error instanceof NativeListeningAdoptionError
        ? error.message
        : "Native question adoption failed validation or database access.",
    );
    process.exitCode = 1;
  } finally {
    await database?.$disconnect();
  }
}
