/** Offline staging only. Paid calls require --generate/--verify; completed calls are cached. */
import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import dotenv from "dotenv";
import OpenAI from "openai";
import { z } from "zod";
import { DEEPSEEK_MODEL } from "../../../src/lib/ai/client";
import {
  buildListeningReconstructionChecks,
  groundListeningReconstructionSegments,
  listeningAsrSegmentsSchema,
  listeningReconstructionVerification,
  readListeningReconstructionGeneration,
  reorderListeningReconstructionChoices,
  listeningReconstructionDisposition,
  listeningReconstructionFifthChoiceTargets,
  addListeningReconstructionFifthChoices,
  normalizeListeningReconstructionEvidenceQuotes,
  type ListeningReconstructionJudgment,
} from "../../../src/lib/english/listening/reconstruction";
import {
  listeningCreateSetSchema,
  listeningUpdateSetSchema,
} from "../../../src/contracts/englishListeningHttp.contract";

const secretValues: string[] = [];
async function main() {
  const { values } = parseArgs({
    options: {
      prepared: { type: "string" },
      asr: { type: "string" },
      output: { type: "string" },
      "env-file": { type: "string" },
      generate: { type: "boolean", default: false },
      verify: { type: "boolean", default: false },
      "repair-four-choices": { type: "boolean", default: false },
      "generation-version": { type: "string", default: "2" },
      "revise-existing": { type: "boolean", default: false },
    },
    strict: true,
  });
  for (const field of ["prepared", "asr", "output"] as const)
    if (!values[field]) throw new Error(`--${field} is required`);
  const json = async (file: string) =>
    JSON.parse(await fs.readFile(file, "utf8"));
  const sha = (value: string | Uint8Array) =>
    createHash("sha256").update(value).digest("hex");
  const write = async (file: string, value: unknown) => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(value, null, 2), {
      encoding: "utf8",
      flag: "wx",
    });
  };
  const exists = async (file: string) =>
    fs.access(file).then(
      () => true,
      () => false,
    );
  const prepared = await json(values.prepared!);
  if (
    !prepared.verification.audioOnly ||
    !prepared.verification.originalDocumentsMissing
  )
    throw new Error("Only actual audio-only originals may be reconstructed");
  const asrBytes = await fs.readFile(values.asr!);
  const asr = JSON.parse(asrBytes.toString("utf8"));
  const sourceAudio = prepared.sourceFiles.find(
    (file: { kind: string }) => file.kind === "audio",
  );
  if (
    !sourceAudio ||
    sha(await fs.readFile(prepared.audioFilePath)) !== sourceAudio.sha256 ||
    asr.sourceAudioSha256 !== sourceAudio.sha256
  )
    throw new Error("Original recording or ASR source SHA differs");
  if (
    !Number.isFinite(asr.durationSeconds) ||
    asr.durationSeconds <= 0 ||
    asr.durationSeconds > 1800
  )
    throw new Error("ASR source duration is outside the bounded import");
  const segments = listeningAsrSegmentsSchema.parse(
    asr.segments.map(
      (segment: { id: number; text: string; uncertain: boolean }) => ({
        id: segment.id,
        text: segment.text,
        uncertain: segment.uncertain,
      }),
    ),
  );
  const env = values["env-file"]
    ? dotenv.parse(await fs.readFile(values["env-file"]!))
    : process.env;
  for (const key of [env.DEEPSEEK_API_KEY, env.TYPESAFE_API_KEY])
    if (key) secretValues.push(key);
  const recordDirectory = path.join(
    path.resolve(values.output!),
    "audit",
    prepared.sourceRecordId,
  );
  const generationRequest = {
    model: DEEPSEEK_MODEL,
    system:
      "Create new listening questions grounded only in the supplied actual ASR transcript. The original question sheet is missing. Do not pretend to recover original questions. Return strict JSON, no prose.",
    prompt: JSON.stringify({
      task:
        "Create up to 20 distinct new five-choice listening questions for this real recording, in audio order. Fewer is correct if reliable spoken evidence is missing. Do not fabricate a missing conversation or force a count. Questions/choices/explanations should be English; short topic and keyword labels should be Korean. Ignore opening/closing broadcast announcements. Exclude translated Korean paraphrases of English speech and uncertain ASR segments unless the uncertainty is explicitly preserved for review. Use only sourceSegmentIds from the supplied list, in original order. sourceNumber is a new sequential question ordinal starting at 1; it is not a claimed recovered official number. Never invent speaker names, timestamps, unseen images or diagrams. Ask text-only questions whose unique answer follows from the actual speech; for originally visual items ask a new spoken-detail question instead. Each evidenceQuotes entry must be an exact substring of the selected source segment texts joined by a single space. Do not repair or rewrite transcript quotes. Distractors must be distinct and wrong under the spoken evidence. Do not answer original questions with missing dialogue. Include actual inferred topics and keywords for search, without answer phrases." +
        (values["generation-version"] === "1"
          ? ""
          : " Use 'one speaker' instead of assuming man/woman or unlabelled identities. Keep explanations concise and strictly factual, including only claims explicit in the selected ASR segments. Include every segment necessary to support all explanation claims; do not infer a proposed action was performed. Do not claim recovered original numbering."),
      questionTypes: [
        "gist",
        "purpose",
        "opinion",
        "detail",
        "inference",
        "number",
        "relationship",
        "location",
        "emotion",
        "sequence",
        "reply",
        "unknown",
      ],
      schema: {
        questions: [
          {
            sourceNumber: 1,
            sourceSegmentIds: [1, 2],
            prompt: "...",
            choices: ["...", "...", "...", "...", "..."],
            correctChoiceOneBased: 1,
            explanation: "...",
            evidenceQuotes: ["exact source quote"],
            questionType: "detail",
            topics: ["주제"],
            keywords: ["검색어"],
          },
        ],
      },
      source: {
        sourceRecordId: prepared.sourceRecordId,
        level: prepared.createInput.level,
        asrModel: asr.model,
        humanReviewed: false,
        segments,
      },
    }),
  };
  const generationHash = sha(JSON.stringify(generationRequest));
  const generationFile = path.join(recordDirectory, "generation.json");
  if (!(await exists(generationFile))) {
    if (!values.generate)
      throw new Error(
        "Generation is absent; use --generate to authorize the one cached request",
      );
    if (!env.DEEPSEEK_API_KEY)
      throw new Error("DeepSeek server credential missing");
    const client = new OpenAI({
      apiKey: env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com",
      maxRetries: 0,
      timeout: 600000,
    });
    const started = performance.now();
    const response = await client.chat.completions.create({
      model: DEEPSEEK_MODEL,
      max_tokens: 64000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: generationRequest.system },
        { role: "user", content: generationRequest.prompt },
      ],
    });
    await write(generationFile, {
      requestHash: generationHash,
      generatedAt: new Date().toISOString(),
      latencyMs: Math.round(performance.now() - started),
      model: response.model,
      usage: response.usage,
      finishReason: response.choices[0]?.finish_reason,
      content: response.choices[0]?.message.content ?? null,
    });
  }
  const generation = await json(generationFile);
  if (generation.requestHash !== generationHash)
    throw new Error(
      "Cached generation belongs to different evidence or instructions",
    );
  if (generation.finishReason === "length" || !generation.content)
    throw new Error(
      "Generation did not return a complete answer; audit retained, no automatic paid retry",
    );
  const rawGenerated = normalizeListeningReconstructionEvidenceQuotes(
    segments,
    JSON.parse(generation.content),
  );
  const repairTargets = listeningReconstructionFifthChoiceTargets(rawGenerated);
  const fourChoiceQuestions = repairTargets.questions.filter(
    (question) => question.choices.length === 4,
  );
  let repair: typeof generation | null = null;
  let generated;
  if (fourChoiceQuestions.length) {
    const request = {
      model: DEEPSEEK_MODEL,
      system:
        "Return strict JSON. Supply only one additional wrong distractor for each supplied four-choice question. Never rewrite the question, existing choices, answer, explanation or transcript.",
      prompt: JSON.stringify({
        task: "Add one fifth distractor, in English, per listed question. It must be distinct from the existing four choices and clearly wrong under the actual selected speech. Do not invent spoken facts or alter the existing answer. Return only {choices:[{sourceNumber,fifthChoice}]}. These are newly generated ordinals, not official numbers.",
        sourceAudioSha256: sourceAudio.sha256,
        questions: fourChoiceQuestions.map((question) => ({
          ...question,
          actualSegments: question.sourceSegmentIds.map((id) => {
            const segment = segments.find((item) => item.id === id);
            if (!segment) throw new Error("Repair source segment is absent");
            return segment;
          }),
        })),
      }),
    };
    const requestHash = sha(JSON.stringify(request));
    const repairFile = path.join(
      recordDirectory,
      "generation-repair-five-choices.json",
    );
    if (!(await exists(repairFile))) {
      if (!values["repair-four-choices"] || !env.DEEPSEEK_API_KEY)
        throw new Error(
          "Four-choice cache requires one --repair-four-choices request, not regeneration",
        );
      const client = new OpenAI({
        apiKey: env.DEEPSEEK_API_KEY,
        baseURL: "https://api.deepseek.com",
        maxRetries: 0,
        timeout: 600000,
      });
      const started = performance.now();
      const response = await client.chat.completions.create({
        model: DEEPSEEK_MODEL,
        max_tokens: 16000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.prompt },
        ],
      });
      await write(repairFile, {
        requestHash,
        generatedAt: new Date().toISOString(),
        latencyMs: Math.round(performance.now() - started),
        model: response.model,
        usage: response.usage,
        finishReason: response.choices[0]?.finish_reason,
        content: response.choices[0]?.message.content ?? null,
      });
    }
    repair = await json(repairFile);
    if (
      repair.requestHash !== requestHash ||
      repair.finishReason === "length" ||
      !repair.content
    )
      throw new Error(
        "Incomplete or mismatched format repair retained in audit; no automatic paid retry",
      );
    generated = addListeningReconstructionFifthChoices(
      rawGenerated,
      JSON.parse(repair.content),
    );
  } else generated = readListeningReconstructionGeneration(rawGenerated);
  const finalGeneratedAt = repair?.generatedAt ?? generation.generatedAt;
  const grounded = groundListeningReconstructionSegments(segments, generated);
  if (
    grounded.questions.some(
      (question, index) => question.sourceNumber !== index + 1,
    )
  )
    throw new Error("Generated question ordinals must be sequential");
  const choiceOrders = grounded.questions.map((question) => {
    const order = [0, 1, 2, 3, 4];
    const seed = createHash("sha256")
      .update(`${sourceAudio.sha256}:${question.sourceNumber}:choices-v1`)
      .digest();
    for (let i = 4; i > 0; i--) {
      const j = seed[i] % (i + 1);
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  });
  grounded.questions = grounded.questions.map((question, index) =>
    reorderListeningReconstructionChoices(question, choiceOrders[index]),
  );
  const dispositions = new Map<
    number,
    ReturnType<typeof listeningReconstructionDisposition>
  >();
  const judgments = new Map<
    number,
    ReturnType<typeof listeningReconstructionVerification>
  >();
  const verificationAudits: unknown[] = [];
  for (let offset = 0; offset < grounded.questions.length; offset += 4) {
    const questions = grounded.questions.slice(offset, offset + 4);
    const checks = buildListeningReconstructionChecks(
      grounded.items.filter((item) =>
        questions.some(
          (question) => question.sourceNumber === item.sourceNumber,
        ),
      ),
      questions,
    );
    const request = { model: "jev-latest", ...checks };
    const requestHash = sha(JSON.stringify(request));
    const cacheFile = path.join(
      recordDirectory,
      `jev-named-shuffled-${offset + 1}.json`,
    );
    if (!(await exists(cacheFile))) {
      if (!values.verify)
        throw new Error(
          "Verification is absent; use --verify to authorize the cached batch",
        );
      if (!env.TYPESAFE_API_KEY)
        throw new Error("TypeSafe server credential missing");
      const started = performance.now();
      const response = await fetch("https://api.typesafe.ai/v1/systemone", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.TYPESAFE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(30000),
        redirect: "error",
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`TypeSafe HTTP ${response.status}; no automatic retry`);
      }
      await write(cacheFile, {
        requestHash,
        checkedAt: new Date().toISOString(),
        latencyMs: Math.round(performance.now() - started),
        response: await response.json(),
      });
    }
    const audit = await json(cacheFile);
    if (audit.requestHash !== requestHash)
      throw new Error(
        "Cached Jev check belongs to different questions or evidence",
      );
    verificationAudits.push(audit);
    const answerSchema = z.object({
      type: z.literal("choice"),
      choice: z.string(),
      confidence: z.number().min(0).max(1),
      probabilities: z.record(z.string(), z.number().min(0).max(1)),
    });
    const noulSchema = z.object({
      type: z.literal("noul"),
      noul: z.number().min(0).max(1),
    });
    for (const question of questions) {
      const id = question.sourceNumber;
      const answer = answerSchema.safeParse(
        audit.response?.answers?.[`answer_${id}`],
      );
      const source = noulSchema.safeParse(
        audit.response?.answers?.[`grounded_${id}`],
      );
      const explanation = noulSchema.safeParse(
        audit.response?.answers?.[`explanation_${id}`],
      );
      let verdict: ReturnType<typeof listeningReconstructionVerification> =
        "needs_review";
      let judgment: ListeningReconstructionJudgment | null = null;
      if (answer.success && source.success && explanation.success) {
        const probabilities = answer.data.probabilities;
        const expected = [
          "1",
          "2",
          "3",
          "4",
          "5",
          "no_unique_supported_answer",
        ];
        const selected = probabilities[answer.data.choice];
        const valid =
          Object.keys(probabilities).length === expected.length &&
          expected.every((key) => key in probabilities) &&
          Math.abs(
            Object.values(probabilities).reduce((a, b) => a + b, 0) - 1,
          ) <= 0.01 &&
          selected !== undefined &&
          Object.values(probabilities).every(
            (probability) => probability <= selected,
          );
        if (valid) {
          judgment = {
            choice: answer.data.choice,
            confidence: answer.data.confidence,
            selectedProbability: selected,
            grounded: source.data.noul,
            explanationSupported: explanation.data.noul,
          };
        }
      }
      const disposition = listeningReconstructionDisposition(
        question.correctChoiceOneBased,
        judgment,
        grounded.items.find((item) => item.sourceNumber === id)!.uncertain,
      );
      verdict = disposition.verification;
      dispositions.set(id, disposition);
      judgments.set(id, verdict);
    }
    console.log(
      JSON.stringify({
        stage: "jev",
        sourceRecordId: prepared.sourceRecordId,
        checked: Math.min(offset + 4, grounded.questions.length),
        total: grounded.questions.length,
      }),
    );
  }
  const title = prepared.createInput.title.replace(
    / · 음원$/,
    " · 원본 문제지 없음 · 음원 기반 재구성",
  );
  const basis =
    prepared.createInput.basis +
    "; 원본 녹음의 로컬 ASR 전사 기반 신규 문항. 원본 문제·정답 복원이 아니며 사람 검수 전 초안.";
  const included = grounded.questions.filter(
    (question) => dispositions.get(question.sourceNumber)?.include,
  );
  if (!included.length)
    throw new Error(
      "No question has an independently matching answer and sufficient spoken grounding; receipts retained",
    );
  const questions = included.map((question) => {
    const choices = question.choices.map((text) => ({
      id: randomUUID(),
      text,
    }));
    return {
      id: randomUUID(),
      sourceNumber: question.sourceNumber,
      prompt: question.prompt,
      choices,
      answerChoiceId: choices[question.correctChoiceOneBased - 1].id,
      explanation: dispositions.get(question.sourceNumber)!.clearExplanation
        ? ""
        : question.explanation,
      evidence: [],
      metadata: {
        schemaVersion: 1,
        origin: "audio_reconstructed",
        sourceRecordId: prepared.sourceRecordId,
        assessmentKind: prepared.createInput.source.kind,
        provider: prepared.createInput.source.provider,
        year: prepared.createInput.source.year,
        round: prepared.createInput.source.round,
        month: prepared.createInput.source.month,
        level: prepared.createInput.level,
        sourceNumber: null,
        sourceAudioSha256: sourceAudio.sha256,
        sourceQuestionSha256: null,
        questionType: question.questionType,
        topics: question.topics,
        keywords: Array.from(
          new Set([
            prepared.createInput.source.provider,
            String(prepared.createInput.source.year),
            prepared.createInput.level,
            `${prepared.createInput.source.round}회`,
            "음원 기반 재구성",
            `재구성 ${question.sourceNumber}번`,
            ...question.keywords,
          ]),
        ).slice(0, 30),
        classification: {
          method: "ai",
          model: DEEPSEEK_MODEL,
          confidence: null,
        },
        reconstruction: {
          model: DEEPSEEK_MODEL,
          generatedAt: finalGeneratedAt,
          sourceAudioSha256: sourceAudio.sha256,
          verification: judgments.get(question.sourceNumber) ?? "needs_review",
        },
      },
    };
  });
  const transcript = segments.map((segment) => segment.text).join("\n");
  const createInput = { ...prepared.createInput, title, basis };
  const editableInput = {
    ...prepared.editableInput,
    title,
    basis,
    groups: [
      {
        id: randomUUID(),
        audio: null,
        transcript: {
          revision: 1,
          text: transcript,
          spokenText: transcript,
          translation: null,
        },
        questions,
      },
    ],
  };
  listeningCreateSetSchema.parse(createInput);
  listeningUpdateSetSchema.parse({ ...editableInput, expectedRevision: 1 });
  const outputFile = path.join(
    path.resolve(values.output!),
    `${prepared.sourceRecordId}.json`,
  );
  const receipts = await Promise.all(
    (await fs.readdir(recordDirectory))
      .filter((file) => /^jev-.*\.json$/.test(file))
      .map(async (file) => json(path.join(recordDirectory, file))),
  );
  const typesafeInputTokens = receipts.reduce(
    (total, receipt) => total + (receipt.response?.usage?.input_tokens ?? 0),
    0,
  );
  const typesafeOutputTokens = receipts.reduce(
    (total, receipt) => total + (receipt.response?.usage?.output_tokens ?? 0),
    0,
  );
  const generationReceipts = repair ? [generation, repair] : [generation];
  const hitTokens = generationReceipts.reduce(
    (total, receipt) => total + (receipt.usage?.prompt_cache_hit_tokens ?? 0),
    0,
  );
  const missTokens = generationReceipts.reduce(
    (total, receipt) =>
      total +
      (receipt.usage?.prompt_cache_miss_tokens ??
        receipt.usage?.prompt_tokens ??
        0),
    0,
  );
  const completionTokens = generationReceipts.reduce(
    (total, receipt) => total + (receipt.usage?.completion_tokens ?? 0),
    0,
  );
  const estimatedDeepseekOffPeakUsd =
    (hitTokens * 0.022 + missTokens * 0.66 + completionTokens * 1.98) / 1000000;
  const estimatedTypesafeUsd = (typesafeInputTokens * 0.042) / 1000000;
  const payload = {
    ...prepared,
    preparedAt: new Date().toISOString(),
    createInput,
    editableInput,
    verification: {
      ...prepared.verification,
      parser: null,
      audioOnly: false,
      reconstruction: true,
      originalDocumentsMissing: true,
      questionCount: questions.length,
      answerCount: questions.length,
      answersOneBased: Object.fromEntries(
        included.map((question) => [
          question.sourceNumber,
          question.correctChoiceOneBased,
        ]),
      ),
      answerSource:
        "new_audio_grounded_question_generation_independently_checked_against_asr_by_jev",
      transcriptSource: "local_asr_original_audio_not_human_reviewed",
      transcriptCharacters: transcript.length,
      sourceNumbersAreGeneratedOrdinals: true,
      originalQuestionNumbersRecovered: false,
      guessedAudioRanges: 0,
      cropHashes: [],
      asr: {
        path: path.resolve(values.asr!),
        sha256: sha(asrBytes),
        sourceAudioSha256: sourceAudio.sha256,
        model: asr.model,
        device: asr.device,
        durationSeconds: asr.durationSeconds,
        transcriptionSeconds: asr.transcriptionSeconds,
        uncertainSegmentCount: segments.filter((segment) => segment.uncertain)
          .length,
        humanReviewed: false,
      },
      generation: {
        model: DEEPSEEK_MODEL,
        actualModel: generation.model,
        generatedAt: generation.generatedAt,
        latencyMs: generation.latencyMs,
        usage: generation.usage,
        requestHash: generationHash,
        formatRepair: repair
          ? {
              kind: "add_fifth_distractor_only",
              model: repair.model,
              generatedAt: repair.generatedAt,
              usage: repair.usage,
              requestHash: repair.requestHash,
            }
          : null,
        evidenceQuotePolicy:
          "All original quotes checked against selected ASR before keeping at most 8 per question; complete original generation receipt retained in audit.",
      },
      semanticVerification: {
        modelAliases: ["jev-latest"],
        actualModels: Array.from(
          new Set(
            verificationAudits.map(
              (audit) =>
                (audit as { response: { model: string } }).response.model,
            ),
          ),
        ),
        initialProbabilityThreshold: 0.9,
        aiVerified: questions.filter(
          (question) =>
            question.metadata.reconstruction.verification === "ai_verified",
        ).length,
        needsReview: questions.filter(
          (question) =>
            question.metadata.reconstruction.verification === "needs_review",
        ).length,
        rawAuditsDirectory: recordDirectory,
        asrIsNotHumanReview: true,
        candidateCount: grounded.questions.length,
        excludedOrdinals: grounded.questions
          .filter(
            (question) => !dispositions.get(question.sourceNumber)?.include,
          )
          .map((question) => question.sourceNumber),
        clearedExplanationOrdinals: included
          .filter(
            (question) =>
              dispositions.get(question.sourceNumber)!.clearExplanation,
          )
          .map((question) => question.sourceNumber),
      },
      grounding: grounded.questions.map((question, index) => ({
        generatedOrdinal: question.sourceNumber,
        sourceSegmentIds: grounded.sourceSegmentIds[index],
        evidenceQuotes: question.evidenceQuotes,
        asrUncertain: grounded.items[index].uncertain,
        choiceOrderZeroBased: choiceOrders[index],
        included: dispositions.get(question.sourceNumber)?.include ?? false,
      })),
      metadataEnrichment: {
        schemaVersion: 1,
        method: "audio_source_fields_and_generated_topics",
        semanticAiUsed: true,
      },
      apiCosts: {
        asrUsd: 0,
        deepseekUsage: generation.usage,
        deepseekFormatRepairUsage: repair?.usage ?? null,
        typesafeUsage: verificationAudits.map(
          (audit) => (audit as { response: { usage: unknown } }).response.usage,
        ),
        allTypesafeInputTokens: typesafeInputTokens,
        allTypesafeOutputTokens: typesafeOutputTokens,
        estimatedDeepseekOffPeakUsd,
        estimatedDeepseekPeakUsd: estimatedDeepseekOffPeakUsd * 2,
        estimatedTypesafeUsd,
        estimatedOffPeakTotalUsd:
          estimatedDeepseekOffPeakUsd + estimatedTypesafeUsd,
        pricingCheckedAt: "2026-10-04",
        pricingSources: [
          "https://api-docs.deepseek.com/quick_start/pricing/",
          "https://typesafe.ai/",
        ],
        costNote:
          "Estimates from actual API token receipts and official published rates, not an invoice. DeepSeek peak/off-peak differ; Sunday pilot is off-peak. Includes earlier discarded Jev checks.",
      },
    },
  };
  if (values["revise-existing"] && (await exists(outputFile))) {
    const previous = await json(outputFile);
    if (
      previous.sourceRecordId !== prepared.sourceRecordId ||
      previous.verification.asr.sourceAudioSha256 !== sourceAudio.sha256
    )
      throw new Error("Existing staged payload belongs to a different source");
    await write(
      path.join(
        recordDirectory,
        `previous-payload-${sha(JSON.stringify(previous))}.json`,
      ),
      previous,
    );
  } else if (await exists(outputFile))
    throw new Error(
      "Prepared output already exists; reuse it without overwriting stable IDs",
    );
  const partialFile = outputFile + ".partial";
  await fs.writeFile(partialFile, JSON.stringify(payload, null, 2), "utf8");
  for (let attempt = 0; ; attempt++) {
    try {
      await fs.rename(partialFile, outputFile);
      break;
    } catch (error) {
      if (attempt >= 5) throw error;
      await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
    }
  }
  console.log(
    JSON.stringify({
      output: outputFile,
      sourceRecordId: prepared.sourceRecordId,
      questionCount: questions.length,
      aiVerified: payload.verification.semanticVerification.aiVerified,
      needsReview: payload.verification.semanticVerification.needsReview,
      bytes: Buffer.byteLength(JSON.stringify(payload)),
      sha256: sha(JSON.stringify(payload, null, 2)),
    }),
  );
}
void main().catch((error: unknown) => {
  let message =
    error instanceof Error ? error.message : "Unknown reconstruction failure";
  for (const secret of secretValues)
    message = message.replaceAll(secret, "[REDACTED]");
  console.error(JSON.stringify({ error: message.slice(0, 2000) }));
  process.exitCode = 1;
});
