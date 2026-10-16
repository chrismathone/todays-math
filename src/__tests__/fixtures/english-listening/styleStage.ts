/** Reusable offline artifact fixture for receipt and adoption transaction tests. */
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { listeningValueHash } from "@/lib/english/listening/publication";
import { listeningUpdateSetSchema } from "@/contracts/englishListeningHttp.contract";
import { buildListeningReconstructionChecks } from "@/lib/english/listening/reconstruction";
import {
  LISTENING_KOREAN_STYLE_INSTRUCTIONS,
  buildListeningStyleChecks,
  listeningStyleRevisionAuditSchema,
  listeningStyleRevisionVerification,
  listeningStyleSemanticWarnings,
  readListeningStyleGroundingJudgment,
  readListeningStyleJudgment,
  validateListeningStyleRevision,
  type ListeningStyleTemplate,
} from "@/lib/english/listening/reconstructionStyle";
const sha = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
const time = "2026-10-04T15:55:39.179Z";
const write = async (file: string, value: unknown) => {
  await mkdir(dirname(file), { recursive: true });
  const data = JSON.stringify(value, null, 2);
  await writeFile(file, data);
  return sha(data);
};
export async function makeListeningStyleStageFixture(
  judgmentVersion: "2" | "4" = "4",
  options: {
    legacy?: boolean;
    koreanOnlyEvidence?: boolean;
    semanticCase?: "deadline_drift" | "deadline_preserved";
    generationRecovery?: boolean;
    excludedGrounding?: boolean;
    generationRecoveryVersion?:
      "structural-metadata-v1" | "structural-metadata-v2";
  } = {},
) {
  // 검증기는 보관 뿌리를 realpath 로 푼다 — macOS 의 tmpdir(/var → /private/var) 같은
  // 심볼릭 링크를 픽스처 쪽에서도 미리 풀어 둬야 «보관 밖» 판정이 링크 탓으로 나지 않는다.
  const root = await realpath(
    await mkdtemp(join(tmpdir(), "verified-listening-style-")),
  );
  const id = "ebs-middle-3-2017-2",
    officialId = "ebs-middle-3-2018-1";
  const file = join(root, "style-revision-fixture", `${id}.json`),
    auditDirectory = join(dirname(file), "audit", id);
  const baselinePath = join(
    root,
    "prepared-reconstructed-registration",
    `${id}.json`,
  );
  const asrPath = join(root, "reconstruction", id, "asr.json"),
    audioPath = join(root, "historical", "audio.mp3");
  const originalPath = join(
      root,
      "prepared-historical-registration",
      `${officialId}.json`,
    ),
    nativePath = join(
      root,
      "prepared-native-registration",
      `${officialId}.json`,
    ),
    pdfPath = join(root, "historical", "questions.pdf");
  await mkdir(dirname(audioPath), { recursive: true });
  const audioBytes = Buffer.from("fixture original audio bytes");
  await writeFile(audioPath, audioBytes);
  const audioHash = sha(audioBytes),
    pdfBytes = Buffer.from("%PDF-1.7\nfixture official paper\n%%EOF");
  await writeFile(pdfPath, pdfBytes);
  const pdfHash = sha(pdfBytes);
  const segments = Array.from({ length: 5 }, (_, index) => ({
    id: options.excludedGrounding && index >= 2 ? index + 2 : index + 1,
    text:
      options.koreanOnlyEvidence && index === 0
        ? "네모난 시계를 살 거예요."
        : options.semanticCase && index === 0
          ? "You'll get the parcel by this Friday."
          : `I will buy the square watch ${index + 1}.`,
    uncertain: index === 2,
  }));
  const excludedSpeech = "The original attempt had no unique supported answer.";
  const allSegments = options.excludedGrounding
    ? [
        ...segments.slice(0, 2),
        { id: 3, text: excludedSpeech, uncertain: false },
        ...segments.slice(2),
      ]
    : segments;
  const asrSha256 = await write(asrPath, {
    sourceAudioSha256: audioHash,
    segments: allSegments.map((segment) => ({
      ...segment,
      start: 20,
      end: 30,
      rawProbability: 0.77,
    })),
    model: "cached-asr",
  });
  const editableFields = {
    title: "음원 기반 신규 재구성",
    level: "중3",
    examId: null,
    rights: { rightsStatus: "unknown", allowedUses: [] },
    basis: "원본 문제지 없음, 사람 검수 전 음원 ASR 기반 초안",
  };
  const source = {
    kind: "national_listening",
    provider: "EBS 중학",
    year: 2017,
    round: 2,
    month: null,
    originalFilename: "",
  };
  const createInput = { ...editableFields, source };
  const oldQuestions = segments.map((segment, index) => {
    const choices = (
      options.semanticCase && index === 0
        ? ["By Monday", "By Friday", "By Sunday", "By Tuesday", "By Thursday"]
        : [
            "A round watch",
            "A square watch",
            "A red watch",
            "A blue watch",
            "A black watch",
          ]
    ).map((text) => ({ id: randomUUID(), text }));
    return {
      id: randomUUID(),
      sourceNumber: segment.id,
      prompt:
        options.semanticCase && index === 0
          ? "By when will the parcel be delivered?"
          : "What will the speaker buy?",
      choices,
      answerChoiceId: choices[1].id,
      explanation: segment.text,
      evidence: [],
      metadata: {
        schemaVersion: 1,
        origin: "audio_reconstructed",
        sourceRecordId: id,
        assessmentKind: "national_listening",
        provider: "EBS 중학",
        year: 2017,
        round: 2,
        month: null,
        level: "중3",
        sourceNumber: null,
        sourceAudioSha256: audioHash,
        sourceQuestionSha256: null,
        questionType: "detail",
        topics: ["시계 구매"],
        keywords: ["재구성", "시계"],
        classification: {
          method: "ai",
          model: "deepseek-v4-pro",
          confidence: null,
        },
        reconstruction: {
          model: "deepseek-v4-pro",
          generatedAt: time,
          sourceAudioSha256: audioHash,
          verification: index === 1 ? "needs_review" : "ai_verified",
        },
      },
    };
  });
  const editableInput = listeningUpdateSetSchema
    .omit({ expectedRevision: true })
    .parse({
      ...editableFields,
      groups: [
        {
          id: randomUUID(),
          audio: null,
          transcript: {
            revision: 1,
            text: allSegments.map((s) => s.text).join("\n"),
            spokenText: allSegments.map((s) => s.text).join("\n"),
            translation: null,
          },
          questions: oldQuestions,
        },
      ],
    });
  const includedGrounding = segments.map((segment) => ({
    generatedOrdinal: segment.id,
    sourceSegmentIds: [segment.id],
    evidenceQuotes: [segment.text],
    asrUncertain: segment.uncertain,
    included: true,
  }));
  const grounding = options.excludedGrounding
    ? [
        ...includedGrounding.slice(0, 2),
        {
          generatedOrdinal: 3,
          sourceSegmentIds: [3],
          evidenceQuotes: [excludedSpeech],
          asrUncertain: false,
          included: false,
          choiceOrderZeroBased: [4, 0, 3, 1, 2],
          exclusionReason: "no_unique_supported_answer",
        },
        ...includedGrounding.slice(2),
      ]
    : includedGrounding;
  const baseline = {
    schemaVersion: 1,
    preparedAt: time,
    sourceRecordId: id,
    createInput,
    editableInput,
    sourceFiles: [
      {
        kind: "audio",
        path: audioPath,
        bytes: audioBytes.length,
        sha256: audioHash,
      },
    ],
    verification: {
      reconstruction: true,
      originalDocumentsMissing: true,
      questionCount: 5,
      asr: {
        path: asrPath,
        sha256: asrSha256,
        sourceAudioSha256: audioHash,
        humanReviewed: false,
      },
      grounding,
      sourceNumbersAreGeneratedOrdinals: true,
      originalQuestionNumbersRecovered: false,
    },
  };
  const baselineSha256 = await write(baselinePath, baseline);
  const officialQuestion = structuredClone(
    editableInput.groups[0].questions[0],
  );
  officialQuestion.sourceNumber = 1;
  officialQuestion.prompt = "대화를 듣고, 여자가 구입할 물건을 고르시오.";
  officialQuestion.choices.forEach((choice, index) => {
    choice.text = ["시계", "안경", "가방", "신발", "모자"][index];
  });
  officialQuestion.metadata = {
    ...officialQuestion.metadata!,
    origin: "official_original",
    sourceRecordId: officialId,
    sourceNumber: 1,
    sourceQuestionSha256: pdfHash,
    reconstruction: null,
  };
  const official = {
    schemaVersion: 1,
    preparedAt: time,
    sourceRecordId: officialId,
    createInput,
    editableInput: {
      ...editableInput,
      groups: [{ ...editableInput.groups[0], questions: [officialQuestion] }],
    },
    sourceFiles: [
      {
        kind: "questions",
        path: pdfPath,
        bytes: pdfBytes.length,
        sha256: pdfHash,
      },
    ],
    verification: { questionCount: 1, originalDocumentsMissing: false },
  };
  const originalPreparedSha256 = await write(originalPath, official);
  const native = {
    schemaVersion: 1,
    sourceRecordId: officialId,
    originalPreparedPath: originalPath,
    originalPreparedSha256,
    sourceQuestionPdfSha256: pdfHash,
    questions: [
      {
        questionId: officialQuestion.id,
        sourceNumber: 1,
        prompt: officialQuestion.prompt,
        choices: officialQuestion.choices,
        answerChoiceId: officialQuestion.answerChoiceId,
        conversion: {
          nativePrompt: true,
          nativeChoices: true,
          sourcePage: 1,
          bounds: [1, 1, 200, 100],
        },
      },
    ],
  };
  const nativePreparedSha256 = await write(nativePath, native);
  const template: ListeningStyleTemplate = {
    sourceRecordId: officialId,
    level: "중3",
    sourceNumber: 1,
    questionType: "detail",
    prompt: officialQuestion.prompt,
    choices: officialQuestion.choices.map((c) => c.text),
    choiceLanguage: "korean",
    originalPreparedPath: originalPath,
    originalPreparedSha256,
    nativePreparedPath: nativePath,
    nativePreparedSha256,
    sourceQuestionPdfSha256: pdfHash,
    sourcePage: 1,
  };
  const baselines = editableInput.groups[0].questions.map((q, index) => ({
    sourceNumber: q.sourceNumber!,
    prompt: q.prompt,
    choices: q.choices.map((c) => c.text),
    correctChoiceOneBased: 2,
    explanation: q.explanation,
    evidenceQuotes: includedGrounding[index].evidenceQuotes,
    questionType: "detail" as const,
    topics: q.metadata!.topics,
    keywords: q.metadata!.keywords,
    sourceSegmentIds: includedGrounding[index].sourceSegmentIds,
  }));
  const candidates = baselines.map((question, index) => ({
    ...question,
    prompt:
      options.semanticCase && index === 0
        ? "대화를 듣고, 소포를 받을 날로 가장 적절한 것을 고르시오."
        : "대화를 듣고, 말하는 사람이 구입할 시계로 가장 적절한 것을 고르시오.",
    choices:
      options.semanticCase && index === 0
        ? [
            "월요일",
            options.semanticCase === "deadline_preserved"
              ? "금요일까지"
              : "금요일",
            "일요일",
            "화요일",
            "목요일",
          ]
        : ["둥근 시계", "네모난 시계", "빨간 시계", "파란 시계", "검은 시계"],
    explanation:
      options.semanticCase && index === 0
        ? "금요일까지 소포를 받는다고 말했다."
        : "네모난 시계를 구입한다고 말했다.",
  }));
  const bindings = Object.fromEntries(
    baselines.map((question) => [question.sourceNumber, [template]]),
  );
  const generationRequest = {
    model: "deepseek-v4-pro",
    max_tokens: 24000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: LISTENING_KOREAN_STYLE_INSTRUCTIONS },
      {
        role: "user",
        content: JSON.stringify({
          version: "korean-official-style-v2-20261005",
          task: "Revise every existing newly reconstructed item in existing order.",
          sourceRecordId: id,
          level: "중3",
          sourceAudioSha256: audioHash,
          asrSha256,
          actualOfficialExamples: [template],
          existingQuestions: baselines.map((question) => ({
            ...question,
            styleTemplateIds: [`${officialId}:1`],
            selectedActualAsrSegments: segments.filter((s) =>
              question.sourceSegmentIds.includes(s.id),
            ),
          })),
        }),
      },
    ],
  };
  type Reference = {
    kind: "generation" | "answer_verification" | "style_verification";
    requestPath: string;
    requestHash: string;
    receiptPath: string;
    receiptSha256: string;
    actualModel: string;
  };
  const references: Reference[] = [];
  async function saveReceipt(
    stem: string,
    kind: Reference["kind"],
    request: unknown,
    response: { model: string },
  ) {
    const requestPath = join(auditDirectory, `${stem}.request.json`),
      receiptPath = join(auditDirectory, `${stem}.receipt.json`),
      requestHash = sha(JSON.stringify(request));
    await write(requestPath, request);
    const receiptSha256 = await write(receiptPath, {
      requestHash,
      receivedAt: time,
      response,
    });
    references.push({
      kind,
      requestPath,
      requestHash,
      receiptPath,
      receiptSha256,
      actualModel: response.model,
    });
  }
  const rawCandidates = candidates.map((candidate, index) =>
    options.generationRecovery && (index === 0 || index === 2)
      ? {
          ...candidate,
          sourceRecordId: id,
          level: "중3",
          questionType:
            options.generationRecoveryVersion === "structural-metadata-v2" &&
            index === 2
              ? "action"
              : "reason",
        }
      : candidate,
  );
  await saveReceipt("generation", "generation", generationRequest, {
    model: "deepseek-v4-pro",
    choices: [
      {
        finish_reason: "stop",
        message: { content: JSON.stringify({ questions: rawCandidates }) },
      },
    ],
  } as { model: string });
  const grounded = validateListeningStyleRevision(segments, baselines, {
    questions: candidates,
  });
  const groundingJudgments = new Map(),
    styleJudgments = new Map();
  for (let offset = 0; offset < 5; offset += 4) {
    const questions = grounded.questions.slice(offset, offset + 4),
      items = grounded.items.slice(offset, offset + 4);
    const answers = Object.fromEntries(
      questions.flatMap((q) => {
        const choice = q.sourceNumber === baselines[4].sourceNumber ? "1" : "2";
        return [
          [
            `answer_${q.sourceNumber}`,
            {
              type: "choice",
              choice,
              confidence: 0.98,
              probabilities: {
                "1": choice === "1" ? 0.98 : 0.004,
                "2": choice === "2" ? 0.98 : 0.004,
                "3": 0.004,
                "4": 0.004,
                "5": 0.004,
                no_unique_supported_answer: 0.004,
              },
            },
          ],
          [`grounded_${q.sourceNumber}`, { type: "noul", noul: 0.98 }],
          [`explanation_${q.sourceNumber}`, { type: "noul", noul: 0.98 }],
        ];
      }),
    );
    const styleAnswers = Object.fromEntries(
      questions.flatMap((q) =>
        [
          "taskStyle",
          "choiceStyle",
          "gradeAppropriate",
          "parallelDistractors",
        ].map((dimension) => [
          `style_${dimension}_${q.sourceNumber}`,
          judgmentVersion === "4"
            ? {
                type: "choice",
                choice: "pass",
                confidence: 0.98,
                probabilities: {
                  pass:
                    q.sourceNumber === baselines[3].sourceNumber ? 0.89 : 0.98,
                  fail:
                    q.sourceNumber === baselines[3].sourceNumber ? 0.11 : 0.02,
                },
              }
            : {
                type: "noul",
                noul:
                  q.sourceNumber === baselines[3].sourceNumber ? 0.89 : 0.98,
              },
        ]),
      ),
    );
    await saveReceipt(
      `answer-${offset + 1}`,
      "answer_verification",
      {
        model: "jev-latest",
        ...buildListeningReconstructionChecks(items, questions),
      },
      { model: "jev-1.13.0", answers } as { model: string },
    );
    await saveReceipt(
      `style-${offset + 1}`,
      "style_verification",
      {
        model: "jev-latest",
        ...buildListeningStyleChecks(
          items,
          questions,
          "중3",
          bindings,
          judgmentVersion,
        ),
      },
      { model: "jev-1.13.0", answers: styleAnswers } as { model: string },
    );
    questions.forEach((q) => {
      groundingJudgments.set(
        q.sourceNumber,
        readListeningStyleGroundingJudgment(answers, q.sourceNumber),
      );
      styleJudgments.set(
        q.sourceNumber,
        readListeningStyleJudgment(
          styleAnswers,
          q.sourceNumber,
          judgmentVersion,
        ),
      );
    });
  }
  const verdicts = candidates.map((candidate, index) => {
    const old = editableInput.groups[0].questions[index],
      semanticWarnings = listeningStyleSemanticWarnings(
        baselines[index],
        candidate,
        grounded.items[index].transcript,
      ),
      gate = listeningStyleRevisionVerification(
        2,
        groundingJudgments.get(candidate.sourceNumber),
        styleJudgments.get(candidate.sourceNumber),
        segments[index].uncertain,
        semanticWarnings,
      );
    return {
      questionId: old.id,
      generatedOrdinal: candidate.sourceNumber,
      originalAnswerChoiceId: old.answerChoiceId!,
      revisedAnswerChoiceId: old.answerChoiceId!,
      sourceSegmentIds: candidate.sourceSegmentIds,
      evidenceQuotes: candidate.evidenceQuotes,
      asrUncertain: segments[index].uncertain,
      semanticWarnings,
      priorVerification: old.metadata!.reconstruction!.verification,
      groundingJudgment: groundingJudgments.get(candidate.sourceNumber),
      styleJudgment: styleJudgments.get(candidate.sourceNumber),
      correctChoiceOneBased: 2,
      ...gate,
      verification:
        old.metadata!.reconstruction!.verification === "needs_review"
          ? ("needs_review" as const)
          : gate.verification,
      templateBindings: [template],
    };
  });
  const audit = listeningStyleRevisionAuditSchema.parse({
    version:
      judgmentVersion === "4"
        ? options.legacy
          ? "korean-official-style-v3-20261005"
          : "korean-official-style-v4-20261005"
        : "korean-official-style-v2-20261005",
    judgmentVersion,
    draftOnly: true,
    humanReviewed: false,
    audioAlignmentVerified: false,
    baselinePath,
    baselineSha256,
    baselineEditableInputSha256: listeningValueHash(editableInput),
    asrPath,
    asrSha256,
    sourceAudioSha256: audioHash,
    auditDirectory,
    generatedAt: time,
    originalQuestionNumbersRecovered: false,
    threshold: 0.9,
    ...(options.generationRecovery
      ? {
          generationNormalization: {
            version:
              options.generationRecoveryVersion ?? "structural-metadata-v1",
            steps: [
              baselines[0].sourceNumber,
              baselines[2].sourceNumber,
            ].flatMap((sourceNumber) => [
              { sourceNumber, field: "sourceRecordId", from: id, to: null },
              { sourceNumber, field: "level", from: "중3", to: null },
              {
                sourceNumber,
                field: "questionType",
                from:
                  options.generationRecoveryVersion ===
                    "structural-metadata-v2" &&
                  sourceNumber === baselines[2].sourceNumber
                    ? "action"
                    : "reason",
                to: "detail",
              },
            ]),
          },
        }
      : {}),
    receipts: references,
    questionVerdicts: verdicts,
    eligibleQuestionIds: verdicts
      .filter((v) => v.eligible)
      .map((v) => v.questionId),
    needsReviewQuestionIds: verdicts
      .filter((v) => !v.eligible)
      .map((v) => v.questionId),
  });
  const staged = {
    ...baseline,
    editableInput: {
      ...editableInput,
      groups: editableInput.groups.map((group) => ({
        ...group,
        questions: group.questions.map((q, index) =>
          !verdicts[index].eligible
            ? q
            : {
                ...q,
                prompt: candidates[index].prompt,
                choices: q.choices.map((choice, i) => ({
                  ...choice,
                  text: candidates[index].choices[i],
                })),
                explanation: candidates[index].explanation,
                metadata: {
                  ...q.metadata!,
                  topics: candidates[index].topics,
                  classification: {
                    ...q.metadata!.classification,
                    model: "deepseek-v4-pro",
                  },
                  reconstruction: {
                    ...q.metadata!.reconstruction!,
                    model: "deepseek-v4-pro",
                    generatedAt: time,
                    verification: verdicts[index].verification,
                  },
                },
              },
        ),
      })),
    },
    verification: { ...baseline.verification, styleRevision: audit },
  };
  await write(file, staged);
  return {
    root,
    file,
    staged,
    baseline,
    audit,
    audioPath,
    asrPath,
    baselinePath,
    pdfPath,
    originalPath,
    nativePath,
    saveStage: () => write(file, staged),
    async rewriteReceipt(index: number, request: unknown, saved: unknown) {
      const ref = audit.receipts[index];
      await write(ref.requestPath, request);
      ref.requestHash = sha(JSON.stringify(request));
      const receiptValue = zReceipt(saved);
      receiptValue.requestHash = ref.requestHash;
      ref.receiptSha256 = await write(ref.receiptPath, receiptValue);
      await write(file, staged);
    },
  };
}
// JSON from disk deliberately remains untyped here so tests can inject invalid shapes.
const zReceipt = (value: unknown) => JSON.parse(JSON.stringify(value));
