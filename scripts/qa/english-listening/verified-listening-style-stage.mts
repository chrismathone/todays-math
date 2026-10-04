/** Offline receipt boundary. No network, database, Storage, or model calls. */
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import {
  basename,
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";
import { z } from "zod";
import type {
  ListeningStyleRevisionAudit,
  ListeningStyleTemplate,
} from "../../../src/lib/english/listening/reconstructionStyle";

// tsx loads application .ts as CommonJS; Vitest loads the same modules as ESM.
function moduleExports<T>(module: T): T {
  const fallback = (module as { default?: unknown }).default;
  return fallback && typeof fallback === "object" ? (fallback as T) : module;
}
const { listeningCreateSetSchema, listeningUpdateSetSchema } = moduleExports(
  await import("../../../src/contracts/englishListeningHttp.contract"),
);
const { freezeListeningValue, listeningValueHash } = moduleExports(
  await import("../../../src/lib/english/listening/publication"),
);
const {
  listeningAsrSegmentsSchema,
  listeningReconstructionQuestionsSchema,
  buildListeningReconstructionChecks,
} = moduleExports(
  await import("../../../src/lib/english/listening/reconstruction"),
);
const {
  listeningStyleRevisionAuditSchema,
  listeningStyleTaskType,
  validateListeningStyleRevision,
  buildListeningStyleChecks,
  readListeningStyleGroundingJudgment,
  readListeningStyleJudgment,
  listeningStyleGenerationVersionAllowed,
  listeningStyleSemanticWarnings,
  normalizeListeningStyleGeneration,
} = moduleExports(
  await import("../../../src/lib/english/listening/reconstructionStyle"),
);

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const sourceIdentity = z
  .string()
  .regex(/^(ebs|ebsi)-(middle|high)-[1-3]-\d{4}-(1|2|09-mock)$/);
const editableSchema = listeningUpdateSetSchema.omit({
  expectedRevision: true,
});
const fileSchema = z
  .object({
    kind: z.string(),
    path: z.string().min(1),
    bytes: z.number().int().positive(),
    sha256: hash,
  })
  .passthrough();
const groundingSchema = z
  .object({
    generatedOrdinal: z.number().int().positive(),
    sourceSegmentIds: z.array(z.number().int().positive()).min(1),
    evidenceQuotes: z.array(z.string().min(1)).min(1).max(8),
    asrUncertain: z.boolean(),
    included: z.literal(true),
  })
  .passthrough();
const preparedSchema = z
  .object({
    schemaVersion: z.literal(1),
    sourceRecordId: sourceIdentity,
    preparedAt: z.iso.datetime({ offset: true }),
    createInput: listeningCreateSetSchema,
    editableInput: editableSchema,
    sourceFiles: z.array(fileSchema).min(1),
    verification: z
      .object({
        questionCount: z.number().int().positive(),
        reconstruction: z.boolean().optional(),
        originalDocumentsMissing: z.boolean().optional(),
        asr: z
          .object({
            path: z.string(),
            sha256: hash,
            sourceAudioSha256: hash,
            humanReviewed: z.literal(false),
          })
          .passthrough()
          .optional(),
        grounding: z.array(groundingSchema).min(1).max(30).optional(),
        styleRevision: listeningStyleRevisionAuditSchema.optional(),
      })
      .passthrough(),
  })
  .passthrough();
type Prepared = z.infer<typeof preparedSchema>;
export interface VerifiedListeningStyleStage {
  sourceRecordId: string;
  staged: Prepared & {
    verification: Prepared["verification"] & {
      styleRevision: ListeningStyleRevisionAudit;
    };
  };
  baseline: Prepared;
  audit: ListeningStyleRevisionAudit;
  stageSha256: string;
  adoptionEligible: boolean;
}
const verifiedStages = new WeakSet<object>();
export class ListeningStyleStageValidationError extends Error {}
function fail(message: string): never {
  throw new ListeningStyleStageValidationError(message);
}
const sha = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
const same = (a: unknown, b: unknown) =>
  listeningValueHash(a) === listeningValueHash(b);
function equal(a: unknown, b: unknown, message: string) {
  if (!same(a, b)) fail(message);
}
function unique<T>(values: T[], message: string) {
  if (new Set(values).size !== values.length) fail(message);
}
function sourceGrade(sourceRecordId: string) {
  // Identity fields are provider, school level, grade, year, round.
  const parts = sourceRecordId.split("-");
  return `${parts[1] === "middle" ? "중" : "고"}${parts[2]}`;
}
function below(root: string, path: string) {
  const rel = relative(root, path);
  if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))
    fail("Artifact is outside the listening archive.");
  return rel;
}

/** Resolve before opening, reject every symlink/junction component, and verify the
 * opened file and path still denote the same unchanged bounded regular file. */
async function archiveReader(archiveRoot: string) {
  const root = await realpath(resolve(archiveRoot));
  const cache = new Map<string, Buffer>();
  const inside = async (file: string) => {
    if (!isAbsolute(file)) fail("Artifact path must be absolute.");
    const path = resolve(file),
      rel = below(root, path);
    let current = root;
    for (const part of rel.split(sep)) {
      current = resolve(current, part);
      if ((await lstat(current)).isSymbolicLink())
        fail("Artifact symlinks and junctions are forbidden.");
    }
    const actual = await realpath(path);
    below(root, actual);
    if (actual !== path) fail("Artifact path changed during resolution.");
    return actual;
  };
  const bytes = async (file: string, limit = 16 * 1024 * 1024) => {
    const actual = await inside(file),
      cached = cache.get(actual);
    if (cached) {
      if (cached.length > limit) fail("Artifact exceeds its size limit.");
      return cached;
    }
    const before = await lstat(actual);
    if (!before.isFile() || before.size < 1 || before.size > limit)
      fail("Artifact must be a bounded regular file.");
    const handle = await open(
      actual,
      constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
    );
    try {
      const opened = await handle.stat();
      if (
        !opened.isFile() ||
        opened.dev !== before.dev ||
        opened.ino !== before.ino ||
        opened.size !== before.size ||
        opened.mtimeMs !== before.mtimeMs
      )
        fail("Artifact changed while opening.");
      const result = Buffer.alloc(opened.size);
      let offset = 0;
      while (offset < result.length) {
        const read = await handle.read(
          result,
          offset,
          result.length - offset,
          offset,
        );
        if (!read.bytesRead) fail("Artifact changed while reading.");
        offset += read.bytesRead;
      }
      const extra = await handle.read(Buffer.alloc(1), 0, 1, offset);
      const after = await handle.stat(),
        pathAfter = await lstat(actual);
      if (
        extra.bytesRead ||
        after.size !== opened.size ||
        after.mtimeMs !== opened.mtimeMs ||
        after.ctimeMs !== opened.ctimeMs ||
        pathAfter.isSymbolicLink() ||
        pathAfter.dev !== opened.dev ||
        pathAfter.ino !== opened.ino ||
        (await inside(actual)) !== actual
      )
        fail("Artifact changed during verification.");
      cache.set(actual, result);
      return result;
    } finally {
      await handle.close();
    }
  };
  const json = async (file: string) =>
    JSON.parse((await bytes(file)).toString("utf8")) as unknown;
  const expected = async (file: string, paths: string[]) => {
    const actual = await inside(file);
    if (!paths.some((path) => resolve(path) === actual))
      fail("Artifact location does not match its source identity.");
  };
  return { root, inside, bytes, json, expected };
}

const nativeSchema = z
  .object({
    schemaVersion: z.literal(1),
    sourceRecordId: sourceIdentity,
    originalPreparedPath: z.string(),
    originalPreparedSha256: hash,
    sourceQuestionPdfSha256: hash,
    questions: z
      .array(
        z
          .object({
            questionId: z.uuid(),
            sourceNumber: z.number().int().positive(),
            prompt: z.string().min(1),
            choices: z
              .array(z.strictObject({ id: z.uuid(), text: z.string().min(1) }))
              .min(2)
              .max(5),
            answerChoiceId: z.uuid(),
            conversion: z
              .object({
                nativePrompt: z.boolean(),
                nativeChoices: z.boolean(),
                sourcePage: z.number().int().positive(),
                bounds: z.tuple([
                  z.number(),
                  z.number(),
                  z.number(),
                  z.number(),
                ]),
              })
              .passthrough(),
          })
          .passthrough(),
      )
      .min(1),
  })
  .passthrough();
function choiceLanguage(choices: string[]) {
  return choices.every((choice) => /[가-힣]/.test(choice))
    ? "korean"
    : choices.every((choice) =>
          /^(?:\$?\s*\d|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d)/i.test(
            choice,
          ),
        )
      ? "numeric"
      : choices.every((choice) => !/[가-힣]/.test(choice))
        ? "english"
        : "mixed";
}

async function verifyTemplates(
  reader: Awaited<ReturnType<typeof archiveReader>>,
  audit: ListeningStyleRevisionAudit,
  level: string,
) {
  const validated = new Set<string>();
  for (const verdict of audit.questionVerdicts) {
    unique(
      verdict.templateBindings.map(
        (t) => `${t.sourceRecordId}:${t.sourceNumber}`,
      ),
      "Duplicate official template binding.",
    );
    for (const template of verdict.templateBindings) {
      if (
        template.level !== level ||
        sourceGrade(template.sourceRecordId) !== level
      )
        fail("Official template must match the target grade.");
      const fingerprint = listeningValueHash(template);
      if (validated.has(fingerprint)) continue;
      sourceIdentity.parse(template.sourceRecordId);
      await reader.expected(
        template.originalPreparedPath,
        ["prepared-registration", "prepared-historical-registration"].map(
          (dir) => resolve(reader.root, dir, `${template.sourceRecordId}.json`),
        ),
      );
      await reader.expected(template.nativePreparedPath, [
        resolve(
          reader.root,
          "prepared-native-registration",
          `${template.sourceRecordId}.json`,
        ),
      ]);
      const originalBytes = await reader.bytes(template.originalPreparedPath),
        nativeBytes = await reader.bytes(template.nativePreparedPath);
      if (
        sha(originalBytes) !== template.originalPreparedSha256 ||
        sha(nativeBytes) !== template.nativePreparedSha256
      )
        fail("Official template artifact hash mismatch.");
      const original = preparedSchema.parse(
          JSON.parse(originalBytes.toString("utf8")),
        ),
        native = nativeSchema.parse(JSON.parse(nativeBytes.toString("utf8")));
      if (
        original.sourceRecordId !== template.sourceRecordId ||
        native.sourceRecordId !== template.sourceRecordId ||
        original.createInput.level !== level ||
        original.editableInput.level !== level ||
        original.verification.originalDocumentsMissing ||
        original.verification.reconstruction ||
        native.originalPreparedSha256 !== template.originalPreparedSha256 ||
        native.sourceQuestionPdfSha256 !== template.sourceQuestionPdfSha256
      )
        fail("Official template provenance mismatch.");
      await reader.expected(native.originalPreparedPath, [
        template.originalPreparedPath,
      ]);
      const pdfs = original.sourceFiles.filter(
        (file) =>
          file.kind === "questions" ||
          (original.createInput.source?.kind === "mock_exam" &&
            file.kind === "paper"),
      );
      if (
        pdfs.length !== 1 ||
        pdfs[0].sha256 !== template.sourceQuestionPdfSha256
      )
        fail("Official template PDF binding mismatch.");
      const pdf = await reader.bytes(pdfs[0].path, 64 * 1024 * 1024);
      if (
        sha(pdf) !== pdfs[0].sha256 ||
        pdf.length !== pdfs[0].bytes ||
        pdf.subarray(0, 5).toString() !== "%PDF-"
      )
        fail("Official template PDF hash mismatch.");
      const originals = original.editableInput.groups.flatMap(
        (group) => group.questions,
      );
      if (
        native.questions.length !== originals.length ||
        original.verification.questionCount !== originals.length
      )
        fail("Official template question coverage mismatch.");
      unique(
        originals.map((q) => q.id),
        "Duplicate original template identity.",
      );
      unique(
        native.questions.map((q) => q.questionId),
        "Duplicate native template identity.",
      );
      unique(
        native.questions.map((q) => q.sourceNumber),
        "Duplicate native template source number.",
      );
      for (const [index, question] of native.questions.entries()) {
        const old = originals[index];
        unique(
          question.choices.map((c) => c.id),
          "Duplicate native choice identity.",
        );
        if (
          question.questionId !== old.id ||
          question.sourceNumber !== old.sourceNumber ||
          question.answerChoiceId !== old.answerChoiceId ||
          !question.choices.some((c) => c.id === question.answerChoiceId) ||
          old.metadata?.origin !== "official_original" ||
          old.metadata.sourceRecordId !== template.sourceRecordId ||
          old.metadata.level !== level ||
          old.metadata.sourceNumber !== question.sourceNumber ||
          old.metadata.sourceQuestionSha256 !== template.sourceQuestionPdfSha256
        )
          fail("Official template question or answer identity mismatch.");
        equal(
          question.choices.map((c) => c.id),
          old.choices.map((c) => c.id),
          "Official template choice identity/order mismatch.",
        );
        const [x1, y1, x2, y2] = question.conversion.bounds;
        if (
          ![x1, y1, x2, y2].every(Number.isFinite) ||
          x1 < 0 ||
          y1 < 0 ||
          x1 >= x2 ||
          y1 >= y2
        )
          fail("Official template source bounds are invalid.");
      }
      const nativeQuestion = native.questions.find(
        (q) => q.sourceNumber === template.sourceNumber,
      )!;
      const old = originals.find((q) => q.id === nativeQuestion?.questionId);
      if (
        !nativeQuestion ||
        !old ||
        !nativeQuestion.conversion.nativePrompt ||
        !nativeQuestion.conversion.nativeChoices ||
        nativeQuestion.choices.length !== 5 ||
        nativeQuestion.choices.some((c) => /^[①②③④⑤]$/.test(c.text))
      )
        fail("Official template lacks native text evidence.");
      const choices = nativeQuestion.choices.map((c) => c.text),
        task = listeningStyleTaskType(
          nativeQuestion.prompt,
          old.metadata?.questionType ?? "unknown",
        );
      if (
        task === "visual" ||
        /그림|다음 표|다음 지도/.test(nativeQuestion.prompt)
      )
        fail("Unavailable visual cannot supply a text template.");
      equal(
        {
          prompt: template.prompt,
          choices: template.choices,
          questionType: template.questionType,
          choiceLanguage: template.choiceLanguage,
          sourcePage: template.sourcePage,
        },
        {
          prompt: nativeQuestion.prompt,
          choices,
          questionType: task,
          choiceLanguage: choiceLanguage(choices),
          sourcePage: nativeQuestion.conversion.sourcePage,
        },
        "Official template text/type/page differs from the bound native original.",
      );
      validated.add(fingerprint);
    }
  }
}

const receiptSchema = z
  .object({
    requestHash: hash,
    receivedAt: z.iso.datetime(),
    response: z.unknown(),
  })
  .passthrough();
const generationResponseSchema = z
  .object({
    model: z.string().min(1),
    choices: z
      .array(
        z
          .object({
            finish_reason: z.literal("stop"),
            message: z.object({ content: z.string().min(1) }).passthrough(),
          })
          .passthrough(),
      )
      .length(1),
  })
  .passthrough();
const jevResponseSchema = z
  .object({
    model: z.string().regex(/^jev-\d+\.\d+(?:\.\d+)?$/),
    answers: z.record(z.string(), z.unknown()),
  })
  .passthrough();
async function receipt(
  reader: Awaited<ReturnType<typeof archiveReader>>,
  audit: ListeningStyleRevisionAudit,
  index: number,
  kind: ListeningStyleRevisionAudit["receipts"][number]["kind"],
  stem: string,
) {
  const reference = audit.receipts[index];
  if (!reference || reference.kind !== kind)
    fail("Receipt coverage/order mismatch.");
  // A later verification may reuse an earlier immutable generation/answer
  // receipt. Every referenced file remains archive-bounded and content-bound.
  const receiptDirectory = dirname(await reader.inside(reference.requestPath));
  await reader.inside(reference.receiptPath);
  if (basename(receiptDirectory) !== basename(audit.auditDirectory))
    fail("Receipt directory/source identity mismatch.");
  await reader.expected(reference.requestPath, [
    resolve(receiptDirectory, `${stem}.request.json`),
  ]);
  await reader.expected(reference.receiptPath, [
    resolve(receiptDirectory, `${stem}.receipt.json`),
  ]);
  const request = await reader.json(reference.requestPath),
    raw = await reader.bytes(reference.receiptPath);
  const saved = receiptSchema.parse(JSON.parse(raw.toString("utf8")));
  if (
    sha(JSON.stringify(request)) !== reference.requestHash ||
    saved.requestHash !== reference.requestHash ||
    sha(raw) !== reference.receiptSha256
  )
    fail("Raw request/receipt hash mismatch.");
  return { request, saved, reference };
}

/** Only file-backed, fully validated and frozen results can cross the adoption boundary. */
export function assertVerifiedListeningStyleStage(
  value: unknown,
): asserts value is VerifiedListeningStyleStage {
  if (!value || typeof value !== "object" || !verifiedStages.has(value))
    fail(
      "Listening style stage was not loaded by the trusted offline verifier.",
    );
  if (!(value as VerifiedListeningStyleStage).adoptionEligible)
    fail(
      "Legacy listening style audit lacks the current semantic guard required for adoption.",
    );
}

export async function loadVerifiedListeningStyleStage(
  file: string,
  archiveRoot: string,
): Promise<VerifiedListeningStyleStage> {
  const reader = await archiveReader(archiveRoot),
    rawStage = await reader.bytes(resolve(file));
  const stageValue = JSON.parse(rawStage.toString("utf8"));
  const staged = preparedSchema.parse(stageValue);
  equal(
    stageValue.editableInput,
    staged.editableInput,
    "Staged editable content requires lossy schema normalization.",
  );
  const audit = listeningStyleRevisionAuditSchema.parse(
    staged.verification.styleRevision,
  );
  if (resolve(file) !== resolve(dirname(file), `${staged.sourceRecordId}.json`))
    fail("Stage filename/source identity mismatch.");
  await reader.expected(audit.auditDirectory, [
    resolve(dirname(file), "audit", staged.sourceRecordId),
  ]);
  await reader.expected(audit.baselinePath, [
    resolve(
      reader.root,
      "prepared-reconstructed-registration",
      `${staged.sourceRecordId}.json`,
    ),
  ]);
  const rawBaseline = await reader.bytes(audit.baselinePath);
  if (sha(rawBaseline) !== audit.baselineSha256)
    fail("Baseline file hash mismatch.");
  const baselineValue = JSON.parse(rawBaseline.toString("utf8"));
  const baseline = preparedSchema.parse(baselineValue);
  equal(
    baselineValue.editableInput,
    baseline.editableInput,
    "Baseline editable content requires lossy schema normalization.",
  );
  if (
    baseline.verification.styleRevision ||
    baseline.sourceRecordId !== staged.sourceRecordId ||
    !baseline.verification.reconstruction ||
    !baseline.verification.originalDocumentsMissing ||
    !baseline.verification.asr ||
    !baseline.verification.grounding ||
    baseline.verification.sourceNumbersAreGeneratedOrdinals !== true ||
    baseline.verification.originalQuestionNumbersRecovered !== false ||
    baseline.createInput.level !== baseline.editableInput.level ||
    !baseline.createInput.level ||
    sourceGrade(baseline.sourceRecordId) !== baseline.createInput.level
  )
    fail("Original reconstructed baseline proof is missing.");
  if (
    listeningValueHash(baseline.editableInput) !==
    audit.baselineEditableInputSha256
  )
    fail("Canonical baseline editable hash mismatch.");
  equal(
    staged.createInput,
    baseline.createInput,
    "Style revision changed set creation metadata.",
  );
  equal(
    staged.sourceFiles,
    baseline.sourceFiles,
    "Style revision changed source files.",
  );
  const { styleRevision: ignored, ...verification } = staged.verification;
  void ignored;
  equal(
    verification,
    baseline.verification,
    "Style revision changed inherited verification/evidence.",
  );
  const {
    editableInput: ignoredEditable,
    verification: ignoredVerification,
    preparedAt: ignoredDate,
    ...stageRest
  } = staged;
  const {
    editableInput: ignoredBaselineEditable,
    verification: ignoredBaselineVerification,
    preparedAt: ignoredBaselineDate,
    ...baselineRest
  } = baseline;
  void ignoredEditable;
  void ignoredVerification;
  void ignoredDate;
  void ignoredBaselineEditable;
  void ignoredBaselineVerification;
  void ignoredBaselineDate;
  equal(
    stageRest,
    baselineRest,
    "Style revision changed inherited prepared fields.",
  );
  const asrReference = baseline.verification.asr;
  await reader.expected(audit.asrPath, [asrReference.path]);
  const asrBytes = await reader.bytes(audit.asrPath);
  if (
    sha(asrBytes) !== audit.asrSha256 ||
    audit.asrSha256 !== asrReference.sha256 ||
    audit.sourceAudioSha256 !== asrReference.sourceAudioSha256
  )
    fail("Raw ASR hash/source binding mismatch.");
  const rawAsr = z
    .object({
      sourceAudioSha256: hash,
      segments: z.array(
        z
          .object({ id: z.number(), text: z.string(), uncertain: z.boolean() })
          .passthrough(),
      ),
    })
    .passthrough()
    .parse(JSON.parse(asrBytes.toString("utf8")));
  if (rawAsr.sourceAudioSha256 !== audit.sourceAudioSha256)
    fail("ASR source audio identity mismatch.");
  const segments = listeningAsrSegmentsSchema.parse(
    rawAsr.segments.map(({ id, text, uncertain }) => ({ id, text, uncertain })),
  );
  const audioFiles = baseline.sourceFiles.filter(
    (source) => source.kind === "audio",
  );
  if (
    audioFiles.length !== 1 ||
    audioFiles[0].sha256 !== audit.sourceAudioSha256
  )
    fail("Baseline audio identity mismatch.");
  const audioBytes = await reader.bytes(audioFiles[0].path, 128 * 1024 * 1024);
  if (
    sha(audioBytes) !== audit.sourceAudioSha256 ||
    audioBytes.length !== audioFiles[0].bytes
  )
    fail("Source audio file hash mismatch.");
  const originals = baseline.editableInput.groups.flatMap(
      (group) => group.questions,
    ),
    grounding = baseline.verification.grounding;
  if (
    !originals.length ||
    originals.length !== baseline.verification.questionCount ||
    originals.length !== audit.questionVerdicts.length ||
    originals.length !== grounding.length
  )
    fail("Baseline/verdict question coverage mismatch.");
  unique(
    originals.map((q) => q.id),
    "Duplicate baseline question identity.",
  );
  unique(
    originals.map((q) => q.sourceNumber),
    "Duplicate generated ordinal.",
  );
  unique(
    grounding.map((g) => g.generatedOrdinal),
    "Duplicate baseline grounding ordinal.",
  );
  const baselineQuestions = originals.map((question, index) => {
    const evidence = grounding[index],
      metadata = question.metadata;
    const correctChoiceOneBased =
      question.choices.findIndex(
        (choice) => choice.id === question.answerChoiceId,
      ) + 1;
    unique(
      question.choices.map((c) => c.id),
      "Duplicate baseline choice identity.",
    );
    if (
      !question.sourceNumber ||
      evidence.generatedOrdinal !== question.sourceNumber ||
      !correctChoiceOneBased ||
      metadata?.origin !== "audio_reconstructed" ||
      metadata.sourceRecordId !== staged.sourceRecordId ||
      metadata.level !== baseline.createInput.level ||
      metadata.sourceNumber !== null ||
      metadata.sourceAudioSha256 !== audit.sourceAudioSha256 ||
      !metadata.reconstruction ||
      metadata.reconstruction.sourceAudioSha256 !== audit.sourceAudioSha256
    )
      fail("Baseline immutable question/answer/source evidence mismatch.");
    const selected = evidence.sourceSegmentIds.map((id) =>
      segments.find((segment) => segment.id === id),
    );
    if (selected.some((segment) => !segment))
      fail("Baseline source segment is missing.");
    const transcript = selected.map((segment) => segment!.text).join(" ");
    if (
      evidence.evidenceQuotes.some((quote) => !transcript.includes(quote)) ||
      evidence.asrUncertain !== selected.some((segment) => segment!.uncertain)
    )
      fail("Baseline evidence quote/uncertainty mismatch.");
    return {
      ...listeningReconstructionQuestionsSchema.shape.questions.element
        .extend({ explanation: z.string().max(10000) })
        .parse({
          sourceNumber: question.sourceNumber,
          prompt: question.prompt,
          choices: question.choices.map((choice) => choice.text),
          correctChoiceOneBased,
          explanation: question.explanation || "",
          evidenceQuotes: evidence.evidenceQuotes,
          questionType: metadata.questionType,
          topics: metadata.topics,
          keywords: metadata.keywords,
        }),
      sourceSegmentIds: evidence.sourceSegmentIds,
    };
  });
  await verifyTemplates(reader, audit, baseline.createInput.level);
  const bindings: Record<number, ListeningStyleTemplate[]> = Object.fromEntries(
    audit.questionVerdicts.map((verdict, index) => {
      const old = originals[index],
        question = baselineQuestions[index];
      if (
        verdict.questionId !== old.id ||
        verdict.generatedOrdinal !== old.sourceNumber ||
        verdict.originalAnswerChoiceId !== old.answerChoiceId ||
        verdict.revisedAnswerChoiceId !== old.answerChoiceId ||
        verdict.correctChoiceOneBased !== question.correctChoiceOneBased ||
        verdict.priorVerification !== old.metadata!.reconstruction!.verification
      )
        fail("Verdict immutable identity/order/answer binding mismatch.");
      equal(
        verdict.sourceSegmentIds,
        question.sourceSegmentIds,
        "Verdict changed baseline source segments.",
      );
      return [question.sourceNumber, verdict.templateBindings];
    }),
  );
  if (audit.receipts.length !== 1 + 2 * Math.ceil(originals.length / 4))
    fail("Receipt question coverage is incomplete or duplicated.");
  const generation = await receipt(
    reader,
    audit,
    0,
    "generation",
    "generation",
  );
  const response = generationResponseSchema.parse(generation.saved.response);
  const generationRequest = z
    .strictObject({
      model: z.enum(["deepseek-v4-pro", "deepseek-flash"]),
      reasoning_effort: z.enum(["low", "high"]).optional(),
      max_tokens: z.number().int().min(8000).max(64000),
      response_format: z.strictObject({ type: z.literal("json_object") }),
      messages: z
        .array(
          z.strictObject({
            role: z.enum(["system", "user"]),
            content: z.string().min(1),
          }),
        )
        .length(2),
    })
    .parse(generation.request);
  // Generation instructions are retained hash-bound evidence, not reconstructed
  // from mutable current prompts. Independent checks below decide eligibility.
  if (
    generation.reference.actualModel !== response.model ||
    response.model !== generationRequest.model ||
    generation.saved.receivedAt !== audit.generatedAt ||
    generationRequest.messages[0].role !== "system" ||
    generationRequest.messages[1].role !== "user"
  )
    fail("Generation model/instruction/time binding mismatch.");
  const user = z
    .object({
      version: z.enum([
        "korean-official-style-v1-20261005",
        "korean-official-style-v2-20261005",
        "korean-official-style-v3-20261005",
        "korean-official-style-v4-20261005",
      ]),
      task: z.string().min(1),
      sourceRecordId: sourceIdentity,
      level: z.string(),
      sourceAudioSha256: hash,
      asrSha256: hash,
      actualOfficialExamples: z.array(z.unknown()),
      existingQuestions: z.array(z.record(z.string(), z.unknown())),
      instructionVersion: z
        .union([z.literal(1), z.literal(2), z.literal(3)])
        .optional(),
      revisionRules: z.array(z.string().min(1)).optional(),
    })
    .strict()
    .parse(JSON.parse(generationRequest.messages[1].content));
  if (!listeningStyleGenerationVersionAllowed(audit.version, user.version))
    fail(
      "Generation version is incompatible with the declared audit semantics.",
    );
  if (
    user.sourceRecordId !== staged.sourceRecordId ||
    user.level !== baseline.createInput.level ||
    user.sourceAudioSha256 !== audit.sourceAudioSha256 ||
    user.asrSha256 !== audit.asrSha256
  )
    fail("Generation input source/grade/version binding mismatch.");
  const templates = [
    ...new Map(
      Object.values(bindings)
        .flat()
        .map((template) => [
          `${template.sourceRecordId}:${template.sourceNumber}`,
          template,
        ]),
    ).values(),
  ];
  equal(
    user.actualOfficialExamples,
    templates,
    "Generation official templates differ from verified bindings.",
  );
  const expectedQuestions = baselineQuestions.map((question) => ({
    ...question,
    ...(user.instructionVersion !== undefined
      ? {
          plannedQuestionType: listeningStyleTaskType(
            question.prompt,
            question.questionType,
          ),
        }
      : {}),
    styleTemplateIds: bindings[question.sourceNumber].map(
      (template) => `${template.sourceRecordId}:${template.sourceNumber}`,
    ),
    selectedActualAsrSegments: question.sourceSegmentIds.map((id) =>
      segments.find((segment) => segment.id === id),
    ),
  }));
  equal(
    user.existingQuestions,
    expectedQuestions,
    "Generation input differs from immutable baseline questions/ASR/template coverage.",
  );
  let generated: unknown = JSON.parse(response.choices[0].message.content);
  if (audit.version === "korean-official-style-v4-20261005") {
    const normalizationVersion =
        audit.generationNormalization?.version ?? "structural-metadata-v1",
      normalized = normalizeListeningStyleGeneration(
        generated,
        {
          sourceRecordId: staged.sourceRecordId,
          level: baseline.createInput.level,
        },
        normalizationVersion,
      );
    // The recovery authorization covers only redundant identity metadata and
    // the explicitly versioned taxonomy aliases, never substantive item edits.
    if (
      normalized.generationNormalization.steps.some(
        (step) =>
          step.field === "questionType" &&
          (step.to !== "detail" ||
            (step.from !== "reason" &&
              !(
                normalizationVersion === "structural-metadata-v2" &&
                step.from === "action"
              ))),
      )
    )
      fail("Generation normalization contains an unauthorized taxonomy alias.");
    if (
      normalized.generationNormalization.steps.length &&
      !audit.generationNormalization
    )
      fail(
        "Generation normalization requires a declared transformation proof.",
      );
    if (audit.generationNormalization)
      equal(
        audit.generationNormalization,
        normalized.generationNormalization,
        "Declared generation normalization differs from the immutable raw response.",
      );
    generated = normalized.value;
  }
  const grounded = validateListeningStyleRevision(
    segments,
    baselineQuestions,
    generated,
  );
  for (const [index, candidate] of grounded.questions.entries()) {
    const verdict = audit.questionVerdicts[index];
    const warnings = listeningStyleSemanticWarnings(
      baselineQuestions[index],
      candidate,
      grounded.items[index].transcript,
    );
    if (audit.version === "korean-official-style-v4-20261005") {
      equal(
        verdict.semanticWarnings,
        warnings,
        "Declared semantic warnings differ from baseline/raw generation meaning.",
      );
      if (warnings.length && verdict.eligible)
        fail("Semantic drift cannot qualify for a style edit.");
    }
  }
  for (
    let offset = 0, receiptIndex = 1;
    offset < originals.length;
    offset += 4
  ) {
    const questions = grounded.questions.slice(offset, offset + 4),
      items = grounded.items.slice(offset, offset + 4);
    const answer = await receipt(
      reader,
      audit,
      receiptIndex++,
      "answer_verification",
      `answer-${offset + 1}`,
    );
    const style = await receipt(
      reader,
      audit,
      receiptIndex++,
      "style_verification",
      `style-${offset + 1}`,
    );
    equal(
      answer.request,
      {
        model: "jev-latest",
        ...buildListeningReconstructionChecks(items, questions),
      },
      "Answer request differs from blind evidence-bound checks (or leaks an answer key).",
    );
    const expectedStyle = buildListeningStyleChecks(
      items,
      questions,
      baseline.createInput.level,
      bindings,
      audit.judgmentVersion,
    );
    equal(
      style.request,
      { model: "jev-latest", ...expectedStyle },
      "Style request differs from actual same-grade checks (or leaks an answer key).",
    );
    const answerResponse = jevResponseSchema.parse(answer.saved.response),
      styleResponse = jevResponseSchema.parse(style.saved.response);
    if (
      answerResponse.model !== answer.reference.actualModel ||
      styleResponse.model !== style.reference.actualModel
    )
      fail("Jev actual model binding mismatch.");
    equal(
      Object.keys(answerResponse.answers).sort(),
      Object.keys(
        buildListeningReconstructionChecks(items, questions).questions,
      ).sort(),
      "Answer receipt question coverage mismatch.",
    );
    equal(
      Object.keys(styleResponse.answers).sort(),
      Object.keys(expectedStyle.questions).sort(),
      "Style receipt question coverage mismatch.",
    );
    for (const [index, question] of questions.entries()) {
      const verdict = audit.questionVerdicts[offset + index],
        item = items[index];
      const groundingJudgment = readListeningStyleGroundingJudgment(
          answerResponse.answers,
          question.sourceNumber,
        ),
        styleJudgment = readListeningStyleJudgment(
          styleResponse.answers,
          question.sourceNumber,
          audit.judgmentVersion,
        );
      if (!groundingJudgment || !styleJudgment)
        fail(
          "Jev receipt contains a malformed or missing probability judgment.",
        );
      equal(
        verdict.groundingJudgment,
        groundingJudgment,
        "Declared grounding judgment differs from raw Jev answers.",
      );
      equal(
        verdict.styleJudgment,
        styleJudgment,
        "Declared style judgment differs from raw Jev answers.",
      );
      equal(
        verdict.evidenceQuotes,
        question.evidenceQuotes,
        "Declared source quotes differ from generation response.",
      );
      if (verdict.asrUncertain !== item.uncertain)
        fail("Declared uncertainty differs from bound raw ASR.");
    }
  }
  // Audit schema recomputes all gates from the now receipt-bound judgments.
  listeningStyleRevisionAuditSchema.parse(audit);
  let index = 0;
  const expectedEditable = {
    ...baseline.editableInput,
    groups: baseline.editableInput.groups.map((group) => ({
      ...group,
      questions: group.questions.map((question) => {
        const candidate = grounded.questions[index],
          verdict = audit.questionVerdicts[index++];
        if (!verdict.eligible) return question;
        return {
          ...question,
          prompt: candidate.prompt,
          choices: question.choices.map((choice, choiceIndex) => ({
            ...choice,
            text: candidate.choices[choiceIndex],
          })),
          explanation: candidate.explanation,
          metadata: {
            ...question.metadata!,
            questionType: candidate.questionType,
            topics: candidate.topics,
            keywords: question.metadata!.keywords,
            classification: {
              ...question.metadata!.classification,
              model: response.model,
            },
            reconstruction: {
              ...question.metadata!.reconstruction!,
              model: response.model,
              generatedAt: generation.saved.receivedAt,
              verification: verdict.verification,
            },
          },
        };
      }),
    })),
  };
  equal(
    staged.editableInput,
    expectedEditable,
    "Staged editable content differs from the exact eligible-only generation patch.",
  );
  const loaded: VerifiedListeningStyleStage = freezeListeningValue({
    sourceRecordId: staged.sourceRecordId,
    staged: {
      ...staged,
      verification: { ...staged.verification, styleRevision: audit },
    },
    baseline,
    audit,
    stageSha256: sha(rawStage),
    adoptionEligible: audit.version === "korean-official-style-v4-20261005",
  });
  verifiedStages.add(loaded);
  return loaded;
}
