/** Offline only: cached ASR + actual same-grade originals; never imports a DB client. */
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import dotenv from "dotenv";
import OpenAI from "openai";
import { z } from "zod";
import { DEEPSEEK_MODEL } from "../../../src/lib/ai/client";
import {
  listeningUpdateSetSchema,
  listeningCreateSetSchema,
} from "../../../src/contracts/englishListeningHttp.contract";
import { listeningValueHash } from "../../../src/lib/english/listening/publication";
import {
  buildListeningReconstructionChecks,
  listeningAsrSegmentsSchema,
  listeningReconstructionQuestionsSchema,
  type ListeningReconstructionJudgment,
} from "../../../src/lib/english/listening/reconstruction";
import {
  LISTENING_RECONSTRUCTION_STYLE_VERSION,
  LISTENING_RECONSTRUCTION_STYLE_THRESHOLD,
  LISTENING_KOREAN_STYLE_INSTRUCTIONS,
  listeningStyleTemplateSchema,
  selectListeningStyleTemplates,
  listeningStyleTaskType,
  validateListeningStyleRevision,
  buildListeningStyleChecks,
  listeningStyleRevisionVerification,
  listeningStyleRevisionAuditSchema,
  readListeningStyleGroundingJudgment,
  readListeningStyleJudgment,
  listeningStyleSemanticWarnings,
  normalizeListeningStyleGeneration,
  type ListeningStyleTemplate,
  type ListeningStyleJudgment,
  type ListeningStyleRevisionAudit,
} from "../../../src/lib/english/listening/reconstructionStyle";

const editableSchema = listeningUpdateSetSchema.omit({
  expectedRevision: true,
});
const preparedSchema = z
  .object({
    sourceRecordId: z.string(),
    createInput: listeningCreateSetSchema,
    editableInput: editableSchema,
    sourceFiles: z.array(
      z
        .object({ kind: z.string(), sha256: z.string(), path: z.string() })
        .passthrough(),
    ),
    verification: z
      .object({
        reconstruction: z.boolean().optional(),
        questionCount: z.number(),
        originalDocumentsMissing: z.boolean().optional(),
        asr: z
          .object({
            path: z.string(),
            sha256: z.string(),
            sourceAudioSha256: z.string(),
          })
          .passthrough()
          .optional(),
        grounding: z
          .array(
            z
              .object({
                generatedOrdinal: z.number(),
                sourceSegmentIds: z.array(z.number()),
                evidenceQuotes: z.array(z.string()),
              })
              .passthrough(),
          )
          .optional(),
      })
      .passthrough(),
  })
  .passthrough();
const nativeSchema = z.object({
  originalPreparedSha256: z.string(),
  sourceQuestionPdfSha256: z.string(),
  questions: z.array(
    z
      .object({
        questionId: z.string(),
        sourceNumber: z.number(),
        prompt: z.string(),
        choices: z.array(z.object({ id: z.string(), text: z.string() })),
        conversion: z
          .object({
            nativeChoices: z.boolean(),
            nativePrompt: z.boolean(),
            sourcePage: z.number(),
          })
          .passthrough(),
      })
      .passthrough(),
  ),
});
const sha = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
const json = async (file: string) =>
  JSON.parse(await fs.readFile(file, "utf8")) as unknown;
const exists = (file: string) =>
  fs.access(file).then(
    () => true,
    () => false,
  );
const writeNew = async (file: string, value: unknown) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2), {
    encoding: "utf8",
    flag: "wx",
  });
};
const secrets: string[] = [];
const safeMessage = (error: unknown) => {
  let message = error instanceof Error ? error.message : "Unknown failure";
  for (const secret of secrets)
    message = message.replaceAll(secret, "[REDACTED]");
  return message.slice(0, 1800);
};

async function loadCorpus(mainRoot: string) {
  const root = path.join(mainRoot, "output/listening-assessments");
  const templates: ListeningStyleTemplate[] = [];
  const originals: Array<{
    sourceRecordId: string;
    level: string | null;
    questionCount: number;
    textChoices: number;
    imageChoices: number;
  }> = [];
  for (const directory of [
    "prepared-historical-registration",
    "prepared-registration",
  ])
    for (const filename of (
      await fs.readdir(path.join(root, directory))
    ).sort()) {
      if (!/^eb.*\.json$/.test(filename)) continue;
      const originalPath = path.join(root, directory, filename);
      const originalBytes = await fs.readFile(originalPath);
      const original = preparedSchema.parse(
        JSON.parse(originalBytes.toString("utf8")),
      );
      if (
        !original.verification.questionCount ||
        original.verification.originalDocumentsMissing
      )
        continue;
      const nativePath = path.join(
        root,
        "prepared-native-registration",
        filename,
      );
      const nativeBytes = await fs.readFile(nativePath);
      const native = nativeSchema.parse(
        JSON.parse(nativeBytes.toString("utf8")),
      );
      const pdf = original.sourceFiles.find(
        (file) =>
          file.kind === "questions" ||
          (original.createInput.source?.kind === "mock_exam" &&
            file.kind === "paper"),
      );
      if (
        !pdf ||
        native.originalPreparedSha256 !== sha(originalBytes) ||
        native.sourceQuestionPdfSha256 !== pdf.sha256 ||
        sha(await fs.readFile(pdf.path)) !== pdf.sha256
      )
        throw new Error(`Official template provenance mismatch: ${filename}`);
      let textChoices = 0;
      for (const question of native.questions) {
        const originalQuestion = original.editableInput.groups
          .flatMap((group) => group.questions)
          .find((item) => item.id === question.questionId);
        if (
          !originalQuestion ||
          question.sourceNumber !== originalQuestion.sourceNumber ||
          question.choices.some(
            (choice, index) =>
              choice.id !== originalQuestion.choices[index]?.id,
          )
        )
          throw new Error(
            `Native original identities differ: ${filename}/${question.sourceNumber}`,
          );
        if (
          !question.conversion.nativeChoices ||
          !question.conversion.nativePrompt
        )
          continue;
        if (
          question.choices.length !== 5 ||
          question.choices.some((choice) => /^[①②③④⑤]$/.test(choice.text))
        )
          continue;
        const choices = question.choices.map((choice) => choice.text);
        const choiceLanguage = choices.every((choice) => /[가-힣]/.test(choice))
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
        const questionType = listeningStyleTaskType(
          question.prompt,
          originalQuestion.metadata?.questionType ?? "unknown",
        );
        if (
          questionType === "visual" ||
          /그림|다음 표|다음 지도/.test(question.prompt)
        )
          continue;
        templates.push(
          listeningStyleTemplateSchema.parse({
            sourceRecordId: original.sourceRecordId,
            level: original.createInput.level,
            sourceNumber: question.sourceNumber,
            questionType,
            prompt: question.prompt,
            choices,
            choiceLanguage,
            originalPreparedPath: originalPath,
            originalPreparedSha256: sha(originalBytes),
            nativePreparedPath: nativePath,
            nativePreparedSha256: sha(nativeBytes),
            sourceQuestionPdfSha256: pdf.sha256,
            sourcePage: question.conversion.sourcePage,
          }),
        );
        textChoices++;
      }
      originals.push({
        sourceRecordId: original.sourceRecordId,
        level: original.createInput.level ?? null,
        questionCount: original.verification.questionCount,
        textChoices,
        imageChoices: original.verification.questionCount - textChoices,
      });
    }
  const baselines = [];
  for (const filename of (
    await fs.readdir(path.join(root, "prepared-reconstructed-registration"))
  ).sort()) {
    if (!/^ebs-middle-[123]-\d{4}-[12]\.json$/.test(filename)) continue;
    const file = path.join(
      root,
      "prepared-reconstructed-registration",
      filename,
    );
    const bytes = await fs.readFile(file),
      payload = preparedSchema.parse(JSON.parse(bytes.toString("utf8")));
    if (
      !payload.verification.reconstruction ||
      !payload.verification.originalDocumentsMissing ||
      !payload.verification.asr ||
      !payload.verification.grounding
    )
      throw new Error(`Invalid reconstruction baseline: ${filename}`);
    const asrBytes = await fs.readFile(payload.verification.asr.path);
    const rawAsr = z
      .object({
        sourceAudioSha256: z.string(),
        segments: z.array(
          z
            .object({
              id: z.number(),
              text: z.string(),
              uncertain: z.boolean(),
            })
            .passthrough(),
        ),
      })
      .passthrough()
      .parse(JSON.parse(asrBytes.toString("utf8")));
    const asr = {
      ...rawAsr,
      segments: listeningAsrSegmentsSchema.parse(
        rawAsr.segments.map(({ id, text, uncertain }) => ({
          id,
          text,
          uncertain,
        })),
      ),
    };
    const audio = payload.sourceFiles.find((file) => file.kind === "audio");
    if (
      !audio ||
      audio.sha256 !== asr.sourceAudioSha256 ||
      sha(asrBytes) !== payload.verification.asr.sha256
    )
      throw new Error(`Cached ASR binding mismatch: ${filename}`);
    const questions = payload.editableInput.groups.flatMap(
      (group) => group.questions,
    );
    if (questions.length !== payload.verification.questionCount)
      throw new Error("Baseline question count differs");
    const seenOrdinals = new Set<number>();
    for (const question of questions) {
      const ordinal = question.sourceNumber;
      const matches = payload.verification.grounding.filter(
        (entry) => entry.generatedOrdinal === ordinal,
      );
      if (
        !ordinal ||
        seenOrdinals.has(ordinal) ||
        matches.length !== 1 ||
        question.choices.length !== 5 ||
        !question.choices.some(
          (choice) => choice.id === question.answerChoiceId,
        )
      )
        throw new Error(
          `Baseline answer/evidence identity mismatch: ${filename}/${ordinal}`,
        );
      seenOrdinals.add(ordinal);
      const proof = matches[0];
      const selected = proof.sourceSegmentIds.map((id) =>
        asr.segments.find((segment) => segment.id === id),
      );
      if (
        !selected.length ||
        selected.some((segment) => !segment) ||
        new Set(proof.sourceSegmentIds).size !==
          proof.sourceSegmentIds.length ||
        !proof.evidenceQuotes.length ||
        proof.evidenceQuotes.some(
          (quote) =>
            !selected
              .map((segment) => segment!.text)
              .join(" ")
              .includes(quote),
        )
      )
        throw new Error(
          `Baseline cached ASR evidence mismatch: ${filename}/${ordinal}`,
        );
    }
    baselines.push({ file, bytes, payload, asr, asrBytes, audio });
  }
  return { root, templates, originals, baselines };
}

const jevResponseSchema = z
  .object({
    model: z.string(),
    answers: z.record(z.string(), z.unknown()),
    usage: z.object({ input_tokens: z.number(), output_tokens: z.number() }),
  })
  .passthrough();

async function main() {
  const { values } = parseArgs({
    options: {
      "main-root": { type: "string", default: "C:/Creative/testautocreator" },
      output: { type: "string" },
      "env-file": { type: "string" },
      only: { type: "string" },
      limit: { type: "string", default: "72" },
      concurrency: { type: "string", default: "2" },
      "generation-effort": { type: "string", default: "high" },
      model: { type: "string", default: DEEPSEEK_MODEL },
      "max-generation-usd": { type: "string", default: "2.30" },
      "max-generation-tokens": { type: "string", default: "24000" },
      "instruction-version": { type: "string", default: "4" },
      "normalize-structural-metadata": { type: "boolean", default: false },
      "judgment-version": { type: "string", default: "4" },
      "reuse-audit-root": { type: "string" },
      execute: { type: "boolean", default: false },
      "check-balance": { type: "boolean", default: false },
    },
    strict: true,
  });
  if (!values.output)
    throw new Error(
      "--output is required and must be a new ignored output directory",
    );
  if (values["normalize-structural-metadata"] && !values["reuse-audit-root"])
    throw new Error(
      "Structural recovery requires --reuse-audit-root; no fresh generation is permitted",
    );
  const output = path.resolve(values.output),
    mainRoot = path.resolve(values["main-root"]!);
  const allowedRoot = path.resolve(mainRoot, "output/listening-assessments");
  if (
    !output.startsWith(allowedRoot + path.sep) ||
    !path.basename(output).startsWith("style-revision-")
  )
    throw new Error(
      "Output must be a separate MAIN output/listening-assessments/style-revision-* directory",
    );
  const limit = Number(values.limit),
    concurrency = Number(values.concurrency);
  const maximumGenerationUsd = Number(values["max-generation-usd"]);
  const maximumGenerationTokens = Number(values["max-generation-tokens"]);
  if (
    !Number.isInteger(maximumGenerationTokens) ||
    maximumGenerationTokens < 8000 ||
    maximumGenerationTokens > 64000 ||
    !["1", "2", "3", "4"].includes(values["instruction-version"]!) ||
    ![DEEPSEEK_MODEL, "deepseek-flash"].includes(values.model!) ||
    values["judgment-version"] !== "4"
  )
    throw new Error(
      "Generation tokens 8000..64000, instruction version 1/2/3/4 and supported DeepSeek model required",
    );
  if (
    !Number.isFinite(maximumGenerationUsd) ||
    maximumGenerationUsd <= 0 ||
    !["low", "high"].includes(values["generation-effort"]!)
  )
    throw new Error(
      "Positive --max-generation-usd and --generation-effort low/high required",
    );
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 72 ||
    !Number.isInteger(concurrency) ||
    concurrency < 1 ||
    concurrency > 4
  )
    throw new Error("Limit 1..72 and concurrency 1..4 required");
  const env = values["env-file"]
    ? dotenv.parse(await fs.readFile(values["env-file"]))
    : {};
  for (const key of [env.DEEPSEEK_API_KEY, env.TYPESAFE_API_KEY])
    if (key) secrets.push(key);
  if ((values.execute || values["check-balance"]) && !values["env-file"])
    throw new Error("Explicit MAIN --env-file required for API calls");
  const corpus = await loadCorpus(mainRoot);
  const countBy = (items: Array<{ level: string | null }>) =>
    Object.fromEntries(
      [...new Set(items.map((item) => item.level))].map((level) => [
        String(level),
        items.filter((item) => item.level === level).length,
      ]),
    );
  const audit = {
    version: LISTENING_RECONSTRUCTION_STYLE_VERSION,
    auditedAt: new Date().toISOString(),
    officialSetCount: corpus.originals.length,
    officialQuestionCount: corpus.originals.reduce(
      (total, item) => total + item.questionCount,
      0,
    ),
    officialSetsByGrade: countBy(corpus.originals),
    nativeTextTemplateCount: corpus.templates.length,
    nativeTemplatesByGrade: countBy(corpus.templates),
    originals: corpus.originals,
    reconstructionSetCount: corpus.baselines.length,
    reconstructionQuestionCount: corpus.baselines.reduce(
      (total, item) => total + item.payload.verification.questionCount,
      0,
    ),
    reconstructedSets: corpus.baselines.map(
      ({ file, bytes, payload, asr }) => ({
        sourceRecordId: payload.sourceRecordId,
        level: payload.createInput.level,
        questionCount: payload.verification.questionCount,
        baselinePath: file,
        baselineSha256: sha(bytes),
        asrPath: payload.verification.asr!.path,
        asrSha256: payload.verification.asr!.sha256,
        englishPromptCount: payload.editableInput.groups
          .flatMap((group) => group.questions)
          .filter((question) => !/[가-힣]/.test(question.prompt)).length,
        questionTypes: payload.editableInput.groups
          .flatMap((group) => group.questions)
          .map((question) => question.metadata?.questionType),
        uncertainSegmentCount: asr.segments.filter(
          (segment) => segment.uncertain,
        ).length,
        nonEnglishSegments: asr.segments
          .filter((segment) => /[ぁ-ゖァ-ヺ]/.test(segment.text))
          .map((segment) => segment.id),
      }),
    ),
  };
  const auditPath = path.join(output, "corpus-audit.json"),
    templatePath = path.join(output, "official-style-templates.json");
  if (!(await exists(auditPath))) await writeNew(auditPath, audit);
  if (!(await exists(templatePath)))
    await writeNew(templatePath, corpus.templates);
  console.log(
    JSON.stringify({
      stage: "audited",
      officialSets: audit.officialSetCount,
      officialTextTemplates: corpus.templates.length,
      reconstructedSets: corpus.baselines.length,
      questions: audit.reconstructionQuestionCount,
    }),
  );
  if (values["check-balance"]) {
    if (!env.DEEPSEEK_API_KEY)
      throw new Error("Missing DeepSeek server credential");
    const response = await fetch("https://api.deepseek.com/user/balance", {
      headers: {
        Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
        Accept: "application/json",
      },
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    const balance = {
      checkedAt: new Date().toISOString(),
      httpStatus: response.status,
      response: (await response.json()) as unknown,
      documentation: "https://api-docs.deepseek.com/api/get-user-balance/",
    };
    await writeNew(path.join(output, `balance-${Date.now()}.json`), balance);
    console.log(JSON.stringify({ stage: "balance", ...balance }));
    if (!response.ok)
      throw new Error(`Balance HTTP ${response.status}; no batch start`);
    const parsed = z
      .object({ is_available: z.boolean() })
      .parse(balance.response);
    if (!parsed.is_available)
      throw new Error("DeepSeek balance unavailable; no paid batch start");
  }
  const selected = corpus.baselines
    .filter(
      (record) =>
        !values.only ||
        values.only.split(",").includes(record.payload.sourceRecordId),
    )
    .slice(0, limit);
  if (!selected.length) throw new Error("No matching reconstruction baseline");
  if (!values.execute) {
    console.log(
      JSON.stringify({
        stage: "planned",
        count: selected.length,
        output,
        paidCalls: 0,
      }),
    );
    return;
  }
  if (!env.DEEPSEEK_API_KEY || !env.TYPESAFE_API_KEY)
    throw new Error("DeepSeek and TypeSafe server credentials required");
  const client = new OpenAI({
    apiKey: env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com",
    maxRetries: 0,
    timeout: 600000,
  });
  const manifestPath = path.join(output, "manifest.json");
  const manifest = (await exists(manifestPath))
    ? z
        .object({ records: z.array(z.record(z.string(), z.unknown())) })
        .passthrough()
        .parse(await json(manifestPath))
    : {
        version: LISTENING_RECONSTRUCTION_STYLE_VERSION,
        createdAt: new Date().toISOString(),
        records: [] as Record<string, unknown>[],
      };
  let manifestWrites = Promise.resolve(),
    balanceBlocked = false;
  const reuseAuditRoot = values["reuse-audit-root"]
    ? path.resolve(values["reuse-audit-root"])
    : null;
  if (reuseAuditRoot && !reuseAuditRoot.startsWith(allowedRoot + path.sep))
    throw new Error("Reused receipts must stay within MAIN listening archive");
  // Conservative published peak-rate upper bound; actual receipt tokens release unused reservations.
  // Budget includes existing completed calls and unresolved attempts in this output directory.
  let generationUsdCommitted = 0;
  const modelRates = (model: string) =>
    model === "deepseek-flash"
      ? { hit: 0.006, miss: 0.3, output: 1.2 }
      : { hit: 0.044, miss: 1.32, output: 3.96 };
  const receiptTokenCost = (response: unknown) => {
    const usage = z
      .object({
        prompt_tokens: z.number().nonnegative(),
        completion_tokens: z.number().nonnegative(),
        prompt_cache_hit_tokens: z.number().nonnegative().optional(),
        prompt_cache_miss_tokens: z.number().nonnegative().optional(),
      })
      .parse((response as { usage: unknown }).usage);
    const created = (response as { created?: number }).created;
    const date = new Date(typeof created === "number" ? created * 1000 : NaN),
      day = date.getUTCDay(),
      hour = date.getUTCHours();
    const peak =
      !Number.isFinite(date.valueOf()) ||
      (day >= 1 &&
        day <= 5 &&
        ((hour >= 1 && hour < 4) || (hour >= 6 && hour < 10)));
    const rates = modelRates((response as { model: string }).model);
    return (
      (((usage.prompt_cache_hit_tokens ?? 0) * rates.hit +
        (usage.prompt_cache_miss_tokens ?? usage.prompt_tokens) * rates.miss +
        usage.completion_tokens * rates.output) /
        1_000_000) *
      (peak ? 1 : 0.5)
    );
  };
  const auditRoot = path.join(output, "audit");
  if (await exists(auditRoot))
    for (const id of await fs.readdir(auditRoot)) {
      const receiptFile = path.join(auditRoot, id, "generation.receipt.json"),
        startedFile = path.join(auditRoot, id, "generation.started.json");
      if (await exists(receiptFile))
        generationUsdCommitted += receiptTokenCost(
          ((await json(receiptFile)) as { response: unknown }).response,
        );
      else if (await exists(startedFile))
        generationUsdCommitted +=
          ((await json(startedFile)) as { maximumReservedUsd?: number })
            .maximumReservedUsd ?? 0.4;
    }
  const saveRecord = async (record: Record<string, unknown>) => {
    const index = manifest.records.findIndex(
      (item) => item.sourceRecordId === record.sourceRecordId,
    );
    if (index < 0) manifest.records.push(record);
    else manifest.records[index] = record;
    const snapshot = JSON.stringify(
      { ...manifest, updatedAt: new Date().toISOString() },
      null,
      2,
    );
    manifestWrites = manifestWrites.then(() =>
      fs.writeFile(manifestPath, snapshot, "utf8"),
    );
    await manifestWrites;
  };
  async function cachedCall<T>(
    directory: string,
    stem: string,
    request: unknown,
    call: () => Promise<T>,
  ) {
    const requestHash = sha(JSON.stringify(request)),
      requestPath = path.join(directory, `${stem}.request.json`),
      receiptPath = path.join(directory, `${stem}.receipt.json`);
    if (!(await exists(requestPath))) await writeNew(requestPath, request);
    else if (sha(JSON.stringify(await json(requestPath))) !== requestHash)
      throw new Error(`Request cache mismatch: ${stem}`);
    if (!(await exists(receiptPath))) {
      if (balanceBlocked)
        throw new Error("Paid calls paused after DeepSeek 402");
      const startedPath = path.join(directory, `${stem}.started.json`);
      if (await exists(startedPath))
        throw new Error(
          `Prior paid attempt has no successful receipt: ${stem}; no automatic retry`,
        );
      const rates = modelRates(
        (request as { model?: string }).model ?? DEEPSEEK_MODEL,
      );
      const maximumReservedUsd =
        stem === "generation"
          ? (Buffer.byteLength(JSON.stringify(request)) * rates.miss +
              maximumGenerationTokens * rates.output +
              2048 * rates.miss) /
            1_000_000
          : 0;
      if (
        maximumReservedUsd &&
        generationUsdCommitted + maximumReservedUsd > maximumGenerationUsd
      )
        throw new Error(
          `Generation budget bound reached (${generationUsdCommitted.toFixed(4)} committed + ${maximumReservedUsd.toFixed(4)} reserved > ${maximumGenerationUsd}); no paid call`,
        );
      generationUsdCommitted += maximumReservedUsd;
      await writeNew(startedPath, {
        requestHash,
        startedAt: new Date().toISOString(),
        ...(maximumReservedUsd
          ? {
              maximumReservedUsd,
              budgetUsd: maximumGenerationUsd,
              costPolicy:
                "published peak-rate upper bound including unresolved calls",
            }
          : {}),
      });
      const started = performance.now();
      try {
        const response = await call();
        await writeNew(receiptPath, {
          requestHash,
          receivedAt: new Date().toISOString(),
          latencyMs: Math.round(performance.now() - started),
          response,
        });
        if (maximumReservedUsd)
          generationUsdCommitted +=
            receiptTokenCost(response) - maximumReservedUsd;
      } catch (error) {
        if (error instanceof OpenAI.APIError && error.status === 402)
          balanceBlocked = true;
        await writeNew(path.join(directory, `${stem}.failure.json`), {
          requestHash,
          failedAt: new Date().toISOString(),
          error: safeMessage(error),
          automaticRetry: false,
        });
        throw error;
      }
    }
    const bytes = await fs.readFile(receiptPath);
    const receipt = z
      .object({
        requestHash: z.string(),
        receivedAt: z.string(),
        response: z.unknown(),
      })
      .passthrough()
      .parse(JSON.parse(bytes.toString("utf8")));
    if (receipt.requestHash !== requestHash)
      throw new Error("Receipt request hash mismatch");
    return {
      ...receipt,
      reference: {
        requestPath,
        requestHash,
        receiptPath,
        receiptSha256: sha(bytes),
      },
    };
  }
  async function readExistingCall(
    directory: string,
    stem: string,
    expectedRequest?: unknown,
  ) {
    const requestPath = path.join(directory, `${stem}.request.json`),
      receiptPath = path.join(directory, `${stem}.receipt.json`);
    const request = await json(requestPath),
      requestHash = sha(JSON.stringify(request));
    if (expectedRequest && sha(JSON.stringify(expectedRequest)) !== requestHash)
      throw new Error(
        "Reused request differs from current exact question/evidence check",
      );
    const bytes = await fs.readFile(receiptPath);
    const receipt = z
      .object({
        requestHash: z.string(),
        receivedAt: z.string(),
        response: z.unknown(),
      })
      .passthrough()
      .parse(JSON.parse(bytes.toString("utf8")));
    if (receipt.requestHash !== requestHash)
      throw new Error("Reused receipt request hash differs");
    return {
      ...receipt,
      request,
      reference: {
        requestPath,
        requestHash,
        receiptPath,
        receiptSha256: sha(bytes),
      },
    };
  }
  const runRecord = async (record: (typeof selected)[number]) => {
    const { payload, asr, bytes, file, audio } = record,
      id = payload.sourceRecordId;
    const resultPath = path.join(output, `${id}.json`),
      auditDirectory = path.join(output, "audit", id);
    try {
      if (await exists(resultPath)) {
        const previous = preparedSchema.parse(await json(resultPath));
        const style = listeningStyleRevisionAuditSchema.parse(
          previous.verification.styleRevision,
        );
        if (style.baselineSha256 !== sha(bytes))
          throw new Error(
            "Existing result belongs to a different immutable baseline",
          );
        await saveRecord({
          sourceRecordId: id,
          status: "prepared",
          path: resultPath,
          questionCount: payload.verification.questionCount,
          eligible: style.eligibleQuestionIds.length,
          needsReview: style.needsReviewQuestionIds.length,
          sha256: sha(await fs.readFile(resultPath)),
          reused: true,
        });
        return;
      }
      await saveRecord({
        sourceRecordId: id,
        status: "generating",
        baselineSha256: sha(bytes),
        auditDirectory,
      });
      const originalQuestions = payload.editableInput.groups.flatMap(
        (group) => group.questions,
      );
      const baseline = originalQuestions.map((question) => {
        const grounding = payload.verification.grounding!.find(
          (item) => item.generatedOrdinal === question.sourceNumber,
        );
        const answerIndex = question.choices.findIndex(
          (choice) => choice.id === question.answerChoiceId,
        );
        if (!grounding || !question.sourceNumber || answerIndex < 0)
          throw new Error("Baseline has no immutable answer/evidence binding");
        return {
          ...listeningReconstructionQuestionsSchema.shape.questions.element
            .extend({ explanation: z.string().max(10000) })
            .parse({
              sourceNumber: question.sourceNumber,
              prompt: question.prompt,
              choices: question.choices.map((choice) => choice.text),
              correctChoiceOneBased: answerIndex + 1,
              explanation: question.explanation || "",
              evidenceQuotes: grounding.evidenceQuotes,
              questionType: question.metadata?.questionType ?? "unknown",
              topics: question.metadata?.topics ?? [],
              keywords: question.metadata?.keywords ?? [],
              // Baseline explanations can be deliberately cleared by the prior verifier.
            }),
          sourceSegmentIds: grounding.sourceSegmentIds,
        };
      });
      const bindings = Object.fromEntries(
        baseline.map((question) => [
          question.sourceNumber,
          selectListeningStyleTemplates(
            corpus.templates,
            payload.createInput.level!,
            question,
          ),
        ]),
      );
      const uniqueTemplates = [
        ...new Map(
          Object.values(bindings)
            .flat()
            .map((template) => [
              `${template.sourceRecordId}:${template.sourceNumber}`,
              template,
            ]),
        ).values(),
      ];
      const generationRequest = {
        model: values.model!,
        reasoning_effort: values["generation-effort"] as "low" | "high",
        max_tokens: maximumGenerationTokens,
        response_format: { type: "json_object" as const },
        messages: [
          {
            role: "system" as const,
            content: LISTENING_KOREAN_STYLE_INSTRUCTIONS,
          },
          {
            role: "user" as const,
            content: JSON.stringify({
              version: LISTENING_RECONSTRUCTION_STYLE_VERSION,
              instructionVersion: Number(values["instruction-version"]),
              ...(["2", "3", "4"].includes(values["instruction-version"]!)
                ? {
                    revisionRules: [
                      "Improve the four distractors, not just translate old uneven options. First choose one semantic category and one grammatical pattern shared by all five choices. Each choice must have comparable specificity and length; pad no choice with irrelevant text. Preserve only the correct choice meaning and its fixed position; incorrect-choice meanings may change freely to make plausible parallel alternatives.",
                      "When asking money, a day/date/time, opening days or an interval, use questionType number and five consistent forms: amounts in the same currency, weekdays/dates in the same notation, five day-ranges, or five time intervals. Korean when/receive/closing-day tasks use Korean weekday/date choices, not English By/On adverb phrases. Do not mix morning/afternoon, weekends/weekdays and any-time in one question; express the same supported correct meaning with one consistent alternative category.",
                      "For reasons use five equally specific ~해서 phrases; actions use five ~하기 phrases; purposes use five similarly short ~하려고 phrases; book contents use five phrases describing the same kind of story; objects use five names from the same category. Avoid a long correct description among short unrelated distractors.",
                      "Each existing selected ASR segment list is binding; do not repair a weak fragment by inventing speaker names, context or new speech. Phrase around the directly supported proposition. For a concise explanation restate only the exact selected source proposition, without naming a book author/customer/product unless that fact is explicitly in selected speech; calculations must use only the stated numbers.",
                      "Use the plannedQuestionType and matching same-grade task templates; do not copy a generic detail label for a numeric task. This is a new explicit instruction revision; older receipts remain immutable.",
                      ...(values["instruction-version"] === "4"
                        ? [
                            "Return only the exact named fields in the requested question object, with no copied sourceRecordId, level or planning fields. questionType must be exactly one of gist,purpose,opinion,detail,inference,number,relationship,location,emotion,sequence,reply,visual,unknown. Reasons and proposed actions belong to detail; never return reason or action labels. The enclosing object has only questions.",
                          ]
                        : []),
                      ...(["3", "4"].includes(values["instruction-version"]!)
                        ? [
                            "Preserve every correct-choice temporal qualifier and unit exactly in meaning: by Friday means 금요일까지, before means 이전/전에, after means 이후, about means 약/쯤, at is an exact time. Do not turn a deadline into a precise event date. Preserve this/next/last, every/only, currency, quantities and duration units; equivalent unit conversions must be mathematically exact.",
                            "Selected ASR has no reliable speaker-gender labels unless literally labeled Man:/Woman:. Use a neutral Korean prompt such as 대화를 듣고, ... instead of 남자/여자. Do not introduce 상담원, 작가, 점원, 손님, 고객 or personal names unless selected speech explicitly identifies that role or name. Your book alone does not establish author identity.",
                            "For an English response task, the correct option must be an appropriate next utterance, not an utterance already spoken. No two options may both provide equivalent acceptable responses, such as Any time is fine and It doesn't matter. Distinguish plausible distractors by their conversational function.",
                          ]
                        : []),
                    ],
                  }
                : {}),
              task: "Revise every existing newly reconstructed item once in existing order. Do not change sourceNumber, sourceSegmentIds or correctChoiceOneBased. Keep the correct choice meaning at the same position; rewrite its Korean/English form and the four distractors to match the same-grade actual examples. Do not copy example facts. Preserve each existing listening focus; uncertainty may require review rather than a new unsupported focus. Return {questions:[{sourceNumber,sourceSegmentIds,prompt,choices,correctChoiceOneBased,explanation,evidenceQuotes,questionType,topics,keywords}]}. Each evidenceQuote must occur verbatim in selected segment texts joined by one space. Use concise Korean explanations.",
              sourceRecordId: id,
              level: payload.createInput.level,
              sourceAudioSha256: audio.sha256,
              asrSha256: payload.verification.asr!.sha256,
              actualOfficialExamples: uniqueTemplates,
              existingQuestions: baseline.map((question) => ({
                ...question,
                plannedQuestionType: listeningStyleTaskType(
                  question.prompt,
                  question.questionType,
                ),
                styleTemplateIds: bindings[question.sourceNumber].map(
                  (template) =>
                    `${template.sourceRecordId}:${template.sourceNumber}`,
                ),
                selectedActualAsrSegments: question.sourceSegmentIds.map(
                  (segmentId) =>
                    asr.segments.find((segment) => segment.id === segmentId),
                ),
              })),
            }),
          },
        ],
      };
      const priorAuditDirectory = reuseAuditRoot
        ? path.join(reuseAuditRoot, id)
        : null;
      const generation = priorAuditDirectory
        ? await readExistingCall(priorAuditDirectory, "generation")
        : await cachedCall(
            auditDirectory,
            "generation",
            generationRequest,
            () => client.chat.completions.create(generationRequest),
          );
      if (priorAuditDirectory) {
        const previousRequest = z
          .object({
            messages: z.array(
              z.object({ role: z.string(), content: z.string() }),
            ),
          })
          .parse(
            (generation as Awaited<ReturnType<typeof readExistingCall>>)
              .request,
          );
        const previousState = z
          .object({
            sourceRecordId: z.string(),
            level: z.string(),
            sourceAudioSha256: z.string(),
            asrSha256: z.string(),
            existingQuestions: z.array(z.record(z.string(), z.unknown())),
          })
          .parse(
            JSON.parse(
              previousRequest.messages.find(
                (message) => message.role === "user",
              )!.content,
            ),
          );
        if (
          previousState.sourceRecordId !== id ||
          previousState.level !== payload.createInput.level ||
          previousState.sourceAudioSha256 !== audio.sha256 ||
          previousState.asrSha256 !== sha(record.asrBytes) ||
          previousState.existingQuestions.length !== baseline.length
        )
          throw new Error(
            "Reused generation belongs to a different original source",
          );
        for (let index = 0; index < baseline.length; index++) {
          const expected = baseline[index],
            previous = previousState.existingQuestions[index];
          for (const field of [
            "sourceNumber",
            "prompt",
            "choices",
            "correctChoiceOneBased",
            "sourceSegmentIds",
            "evidenceQuotes",
          ] as const)
            if (
              listeningValueHash(previous[field]) !==
              listeningValueHash(expected[field])
            )
              throw new Error(`Reused generation baseline differs: ${field}`);
          const actualSegments = expected.sourceSegmentIds.map((segmentId) =>
            asr.segments.find((segment) => segment.id === segmentId),
          );
          if (
            listeningValueHash(previous.selectedActualAsrSegments) !==
            listeningValueHash(actualSegments)
          )
            throw new Error("Reused generation ASR speech differs");
        }
      }
      const response =
        generation.response as OpenAI.Chat.Completions.ChatCompletion;
      if (
        response.choices?.[0]?.finish_reason !== "stop" ||
        !response.choices[0].message.content
      )
        throw new Error(
          "Incomplete generation retained; no automatic paid retry",
        );
      const rawGenerated = JSON.parse(response.choices[0].message.content);
      const normalized = values["normalize-structural-metadata"]
        ? normalizeListeningStyleGeneration(rawGenerated, {
            sourceRecordId: id,
            level: payload.createInput.level!,
          })
        : null;
      const grounded = validateListeningStyleRevision(
        asr.segments,
        baseline,
        normalized?.value ?? rawGenerated,
      );
      const references: ListeningStyleRevisionAudit["receipts"] = [
        {
          kind: "generation",
          ...generation.reference,
          actualModel: response.model,
        },
      ];
      const groundingJudgments = new Map<
          number,
          ListeningReconstructionJudgment | null
        >(),
        styleJudgments = new Map<number, ListeningStyleJudgment | null>();
      const verify = async (stem: string, checks: unknown) => {
        const request = { model: "jev-latest", ...(checks as object) };
        const reuseVerification =
          priorAuditDirectory &&
          (stem.startsWith("answer-") ||
            values["normalize-structural-metadata"]);
        const priorReceiptExists =
          reuseVerification &&
          (await exists(
            path.join(priorAuditDirectory!, `${stem}.receipt.json`),
          ));
        if (
          reuseVerification &&
          !priorReceiptExists &&
          (await exists(
            path.join(priorAuditDirectory!, `${stem}.started.json`),
          ))
        )
          throw new Error(
            `Prior paid verification has no successful receipt: ${stem}; no automatic retry`,
          );
        const receipt = priorReceiptExists
          ? await readExistingCall(priorAuditDirectory, stem, request)
          : await cachedCall(auditDirectory, stem, request, async () => {
              const result = await fetch(
                "https://api.typesafe.ai/v1/systemone",
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${env.TYPESAFE_API_KEY}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(request),
                  redirect: "error",
                  signal: AbortSignal.timeout(45000),
                },
              );
              const body: unknown = await result.json();
              if (!result.ok)
                throw new Error(
                  `TypeSafe HTTP ${result.status}; no automatic retry`,
                );
              return body;
            });
        const parsed = jevResponseSchema.parse(receipt.response);
        references.push({
          kind: stem.startsWith("answer")
            ? "answer_verification"
            : "style_verification",
          ...receipt.reference,
          actualModel: parsed.model,
        });
        return parsed;
      };
      for (let offset = 0; offset < grounded.questions.length; offset += 4) {
        const questions = grounded.questions.slice(offset, offset + 4),
          items = grounded.items.filter((item) =>
            questions.some(
              (question) => question.sourceNumber === item.sourceNumber,
            ),
          );
        // Separate blind requests: style references cannot leak into answer solving.
        const answer = await verify(
          `answer-${offset + 1}`,
          buildListeningReconstructionChecks(items, questions),
        );
        const style = await verify(
          `style-${offset + 1}`,
          buildListeningStyleChecks(
            items,
            questions,
            payload.createInput.level!,
            bindings,
            values["judgment-version"] as "1" | "2" | "3" | "4",
          ),
        );
        for (const question of questions) {
          groundingJudgments.set(
            question.sourceNumber,
            readListeningStyleGroundingJudgment(
              answer.answers,
              question.sourceNumber,
            ),
          );
          styleJudgments.set(
            question.sourceNumber,
            readListeningStyleJudgment(
              style.answers,
              question.sourceNumber,
              values["judgment-version"] as "1" | "2" | "3" | "4",
            ),
          );
        }
        console.log(
          JSON.stringify({
            stage: "verified",
            sourceRecordId: id,
            checked: Math.min(offset + 4, grounded.questions.length),
            total: grounded.questions.length,
          }),
        );
      }
      const questionVerdicts = grounded.questions.map((question, index) => {
        const original = originalQuestions[index],
          asrUncertain = grounded.items[index].uncertain,
          groundingJudgment =
            groundingJudgments.get(question.sourceNumber) ?? null,
          styleJudgment = styleJudgments.get(question.sourceNumber) ?? null,
          semanticWarnings = listeningStyleSemanticWarnings(
            baseline[index],
            question,
            grounded.items[index].transcript,
          );
        return {
          questionId: original.id,
          generatedOrdinal: question.sourceNumber,
          originalAnswerChoiceId: original.answerChoiceId!,
          revisedAnswerChoiceId: original.answerChoiceId!,
          sourceSegmentIds: baseline[index].sourceSegmentIds,
          evidenceQuotes: question.evidenceQuotes,
          asrUncertain,
          semanticWarnings,
          priorVerification: original.metadata!.reconstruction!.verification,
          groundingJudgment,
          styleJudgment,
          correctChoiceOneBased: question.correctChoiceOneBased,
          ...listeningStyleRevisionVerification(
            question.correctChoiceOneBased,
            groundingJudgment,
            styleJudgment,
            asrUncertain,
            semanticWarnings,
          ),
          verification:
            original.metadata!.reconstruction!.verification === "needs_review"
              ? ("needs_review" as const)
              : listeningStyleRevisionVerification(
                  question.correctChoiceOneBased,
                  groundingJudgment,
                  styleJudgment,
                  asrUncertain,
                  semanticWarnings,
                ).verification,
          templateBindings: bindings[question.sourceNumber],
        };
      });
      const styleRevision = listeningStyleRevisionAuditSchema.parse({
        version: LISTENING_RECONSTRUCTION_STYLE_VERSION,
        draftOnly: true,
        humanReviewed: false,
        audioAlignmentVerified: false,
        baselinePath: file,
        baselineSha256: sha(bytes),
        baselineEditableInputSha256: listeningValueHash(payload.editableInput),
        asrPath: payload.verification.asr!.path,
        asrSha256: sha(record.asrBytes),
        sourceAudioSha256: audio.sha256,
        auditDirectory,
        generatedAt: generation.receivedAt,
        originalQuestionNumbersRecovered: false,
        threshold: LISTENING_RECONSTRUCTION_STYLE_THRESHOLD,
        judgmentVersion: values["judgment-version"],
        ...(normalized
          ? { generationNormalization: normalized.generationNormalization }
          : {}),
        receipts: references,
        questionVerdicts,
        eligibleQuestionIds: questionVerdicts
          .filter((verdict) => verdict.eligible)
          .map((verdict) => verdict.questionId),
        needsReviewQuestionIds: questionVerdicts
          .filter((verdict) => !verdict.eligible)
          .map((verdict) => verdict.questionId),
      });
      await writeNew(path.join(auditDirectory, "all-candidates.json"), {
        version: LISTENING_RECONSTRUCTION_STYLE_VERSION,
        questions: grounded.questions,
        questionVerdicts,
      });
      const revisedById = new Map(
        originalQuestions.map((question, index) => [
          question.id,
          {
            candidate: grounded.questions[index],
            verdict: questionVerdicts[index],
          },
        ]),
      );
      const editableInput = {
        ...payload.editableInput,
        groups: payload.editableInput.groups.map((group) => ({
          ...group,
          questions: group.questions.map((question) => {
            const { candidate, verdict } = revisedById.get(question.id)!;
            if (!verdict.eligible) return question;
            return {
              ...question,
              prompt: candidate.prompt,
              choices: question.choices.map((choice, index) => ({
                ...choice,
                text: candidate.choices[index],
              })),
              explanation: candidate.explanation,
              metadata: {
                ...question.metadata!,
                questionType: candidate.questionType,
                topics: candidate.topics,
                // Existing source/search provenance remains bound; only task labels change.
                keywords: question.metadata!.keywords,
                classification: {
                  ...question.metadata!.classification,
                  model: response.model,
                },
                reconstruction: {
                  ...question.metadata!.reconstruction!,
                  model: response.model,
                  generatedAt: generation.receivedAt,
                  verification: verdict.verification,
                },
              },
            };
          }),
        })),
      };
      editableSchema.parse(editableInput);
      const result = {
        ...payload,
        preparedAt: new Date().toISOString(),
        editableInput,
        verification: { ...payload.verification, styleRevision },
      };
      await writeNew(resultPath, result);
      await writeNew(
        path.join(auditDirectory, "before-after.json"),
        originalQuestions.map((question, index) => ({
          questionId: question.id,
          sourceNumber: question.sourceNumber,
          eligible: questionVerdicts[index].eligible,
          before: {
            prompt: question.prompt,
            choices: question.choices.map((choice) => choice.text),
            questionType: question.metadata?.questionType,
          },
          candidate: {
            prompt: grounded.questions[index].prompt,
            choices: grounded.questions[index].choices,
            questionType: grounded.questions[index].questionType,
          },
          final: {
            prompt: editableInput.groups.flatMap((group) => group.questions)[
              index
            ].prompt,
            choices: editableInput.groups
              .flatMap((group) => group.questions)
              [index].choices.map((choice) => choice.text),
          },
          templateBindings: bindings[question.sourceNumber!],
        })),
      );
      await saveRecord({
        sourceRecordId: id,
        status: "prepared",
        path: resultPath,
        questionCount: originalQuestions.length,
        eligible: styleRevision.eligibleQuestionIds.length,
        needsReview: styleRevision.needsReviewQuestionIds.length,
        sha256: sha(await fs.readFile(resultPath)),
        auditDirectory,
      });
      console.log(
        JSON.stringify({
          stage: "prepared",
          sourceRecordId: id,
          questions: originalQuestions.length,
          eligible: styleRevision.eligibleQuestionIds.length,
          needsReview: styleRevision.needsReviewQuestionIds.length,
          output: resultPath,
        }),
      );
    } catch (error) {
      await saveRecord({
        sourceRecordId: id,
        status: "failed",
        error: safeMessage(error),
        auditDirectory,
        automaticRetry: false,
      });
      console.log(
        JSON.stringify({
          stage: "failed",
          sourceRecordId: id,
          error: safeMessage(error),
        }),
      );
    }
  };
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, selected.length) }, async () => {
      for (;;) {
        const record = selected[next++];
        if (!record) return;
        if (balanceBlocked) {
          await saveRecord({
            sourceRecordId: record.payload.sourceRecordId,
            status: "pending_balance",
            automaticRetry: false,
          });
          continue;
        }
        await runRecord(record);
      }
    }),
  );
  const prepared = manifest.records.filter(
      (record) => record.status === "prepared",
    ),
    failed = manifest.records.filter((record) => record.status === "failed");
  console.log(
    JSON.stringify({
      stage: "complete",
      prepared: prepared.length,
      failed: failed.length,
      eligible: prepared.reduce(
        (total, record) => total + Number(record.eligible),
        0,
      ),
      needsReview: prepared.reduce(
        (total, record) => total + Number(record.needsReview),
        0,
      ),
      manifest: manifestPath,
    }),
  );
  if (failed.length || balanceBlocked) process.exitCode = 1;
}
void main().catch((error) => {
  console.error(JSON.stringify({ error: safeMessage(error) }));
  process.exitCode = 1;
});
