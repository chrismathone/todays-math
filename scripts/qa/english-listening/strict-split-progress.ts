/** Offline only: immutable raw evidence, native PCM proof and derivative WAVs. No DB imports. */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { open } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  questionAudioCueNumbers,
  verifyQuestionAudioPassageEvidence,
  type QuestionAudioAlignment,
  type QuestionAudioAsr,
  type QuestionAudioPassageEvidenceInput,
  type QuestionAudioScript,
  type QuestionAudioActivity,
  type QuestionAudioRawActivity,
  type QuestionAudioKoreanAsr,
} from "../../../src/lib/english/listening/questionAudioProof";
import { decodeListeningMp3Pcm } from "../../../src/lib/english/listening/media/mp3Clip";
import {
  findListeningBoundaryRefinement,
  type ListeningBoundaryRefinement,
} from "../../../src/lib/english/listening/media/audioBoundary";
import { planListeningSampleClip } from "../../../src/lib/english/listening/media/sampleClip";

type Ref = { path: string; sha256: string };
type Cue = QuestionAudioAlignment["questions"][number]["cue"];
type Copy = QuestionAudioAlignment["questions"][number]["copies"][number] & {
  startSample: number;
  endSample: number;
  cue: Cue | null;
};
interface CandidateQuestion {
  questionId: string;
  sourceNumber: number;
  scriptSectionId: string;
  scriptQuestionNumbers: number[];
  decision: string;
  reasons: string[];
  copies: Copy[];
}
interface CandidateReview {
  sourceAudio: Ref;
  prepared: Ref;
  officialScript: Ref;
  activity: Ref;
  asr: { auto: Ref; english: Ref; korean?: Ref };
  baselineEnglishPreserved: Ref;
  questions: CandidateQuestion[];
}
interface PreparedSource {
  sourceFiles: (Ref & { bytes: number })[];
  editableInput: {
    groups: {
      transcript: { text: string };
      questions: { id: string; sourceNumber: number }[];
    }[];
  };
}
interface PriorManifest {
  records: { sourceRecordId: string }[];
  fixedPreviousSource: Ref;
}
interface QuestionResult {
  questionId: string;
  sourceNumber: number;
  priorCandidateDecision?: string;
  priorCandidateReasons?: string[];
  status: string;
  fallback: { sourceAudio: Ref };
  reasons: string[];
  physicalBoundary?: ListeningBoundaryRefinement;
  speechProof?: {
    status: string;
    reason?: string;
    selectedNumbers?: number[];
    groups?: unknown[];
  };
  exactEvidence?: unknown;
  verificationInputs?: unknown;
  alignment?: Ref;
  clip?: Ref & {
    bytes: number;
    startFrame: number;
    endFrame: number;
    sampleRate: number;
    channels: number;
    durationSeconds: number;
    sourceStartSeconds: number;
    sourceEndSeconds: number;
  };
}
interface SourceResult {
  sourceRecordId: string;
  sourceAudio: Ref;
  prepared: Ref;
  officialScript: Ref;
  sourceTranscriptSha256: string;
  sourceQuestionCount: number;
  humanReviewed: false;
  questions: QuestionResult[];
  overlongKoreanProbeSegments: unknown[];
  nativePcm?: unknown;
  trustedContainerConversion?: unknown;
  counts?: {
    physicalQuietCandidates: number;
    strictSpeechPassed: number;
    stagedQuestions: number;
  };
}

async function main() {
  const { values } = parseArgs({
    options: {
      base: { type: "string" },
      run: { type: "string", default: "scan-001" },
      "source-id": { type: "string", multiple: true },
      "ffmpeg-path": { type: "string" },
    },
  });
  if (!values.base || !/^[a-z0-9-]+$/.test(values.run!))
    throw Error("--base and safe --run name required");
  const base = resolve(values.base),
    prior = resolve(base, "strict-stage-20261004");
  const output = resolve(base, "strict-split-progress-20261005", values.run!);
  if (existsSync(output))
    throw Error("Immutable run already exists: " + output);
  mkdirSync(output, { recursive: true });
  const sha = (bytes: Uint8Array | string) =>
    createHash("sha256").update(bytes).digest("hex");
  const inventory = new Map<
    string,
    { path: string; sha256: string; bytes: number }
  >();
  function protect(path: string) {
    path = resolve(path);
    const rel = relative(base, path);
    if (!rel || rel.startsWith("..") || isAbsolute(rel))
      throw Error("Input outside source archive: " + path);
    const bytes = readFileSync(path),
      current = { path, sha256: sha(bytes), bytes: bytes.length };
    const before = inventory.get(path);
    if (before && before.sha256 !== current.sha256)
      throw Error("Immutable input changed: " + path);
    inventory.set(path, current);
    return bytes;
  }
  const read = <T>(path: string): T =>
    JSON.parse(protect(path).toString("utf8")) as T;
  function readRef<T>(ref: Ref): T {
    const bytes = protect(ref.path);
    if (sha(bytes) !== ref.sha256)
      throw Error("Raw artifact SHA differs: " + ref.path);
    return JSON.parse(bytes.toString("utf8")) as T;
  }
  function save(name: string, value: unknown) {
    const path = resolve(output, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
    return { path, sha256: sha(readFileSync(path)) };
  }
  function protectTree(path: string) {
    for (const file of readdirSync(path, { withFileTypes: true })) {
      const child = resolve(path, file.name);
      if (file.isDirectory()) protectTree(child);
      else if (file.isFile()) protect(child);
    }
  }
  protectTree(prior);
  // Freeze the already adopted proof, source and every original prepared artifact too.
  const frozenId = "ebsi-high-1-2022-2";
  for (const name of readdirSync(resolve(base, "question-alignment")))
    if (name.startsWith(frozenId))
      protect(resolve(base, "question-alignment", name));
  const frozenPreparedPath = [
    "prepared-registration",
    "prepared-historical-registration",
  ]
    .map((folder) => resolve(base, folder, frozenId + ".json"))
    .find(existsSync);
  if (!frozenPreparedPath)
    throw Error("Missing frozen original prepared source");
  const frozenPrepared = read<PreparedSource>(frozenPreparedPath);
  for (const ref of frozenPrepared.sourceFiles) {
    const bytes = protect(ref.path);
    if (sha(bytes) !== ref.sha256 || bytes.length !== ref.bytes)
      throw Error("Frozen original differs");
  }
  const previous = read<PriorManifest>(resolve(prior, "manifest.json"));
  const sourceIds =
    values["source-id"] ?? previous.records.map((r) => r.sourceRecordId);
  if (sourceIds.includes(frozenId))
    throw Error("Already adopted source is frozen");
  const corePath = resolve("src/lib/english/listening/questionAudioProof.ts");
  const boundaryPath = resolve(
    "src/lib/english/listening/media/audioBoundary.ts",
  );
  const stagingPath = resolve(
    "scripts/qa/english-listening/strict-split-progress.ts",
  );
  const codeHashes = {
    strictCoreSha256: sha(readFileSync(corePath)),
    boundaryCoreSha256: sha(readFileSync(boundaryPath)),
    stagingScriptSha256: sha(readFileSync(stagingPath)),
  };
  const records: SourceResult[] = [];
  for (const sourceId of sourceIds) {
    if (!previous.records.some((r) => r.sourceRecordId === sourceId))
      throw Error("Unknown prior source");
    const review = read<CandidateReview>(
      resolve(prior, sourceId + ".boundary-review.json"),
    );
    const prepared = readRef<PreparedSource>(review.prepared),
      script = readRef<QuestionAudioScript>(review.officialScript);
    const activity = readRef<QuestionAudioActivity>(review.activity),
      rawActivity = readRef<QuestionAudioRawActivity>(activity.rawArtifact);
    const originalQuestions = prepared.editableInput.groups.flatMap(
      (g) => g.questions,
    );
    const originalTranscript = prepared.editableInput.groups
      .map((g) => g.transcript.text)
      .join("\n");
    if (
      script.sourceTranscriptText !== originalTranscript ||
      sha(originalTranscript) !== script.sourceTranscriptSha256
    )
      throw Error("Original transcript differs");
    if (
      originalQuestions.length !== review.questions.length ||
      review.questions.some(
        (q, i: number) =>
          q.questionId !== originalQuestions[i].id ||
          q.sourceNumber !== originalQuestions[i].sourceNumber,
      )
    )
      throw Error("Original question identities differ");
    for (const ref of prepared.sourceFiles) {
      const bytes = protect(ref.path);
      if (sha(bytes) !== ref.sha256 || bytes.length !== ref.bytes)
        throw Error("Original file differs: " + ref.path);
    }
    const originalAudio = protect(review.sourceAudio.path);
    if (sha(originalAudio) !== review.sourceAudio.sha256)
      throw Error("Original source audio differs");
    const rawAuto: QuestionAudioAsr = readRef(review.asr.auto),
      aggregate: QuestionAudioAsr = readRef(review.asr.english);
    const baselineEnglish: QuestionAudioAsr = readRef(
      review.baselineEnglishPreserved,
    );
    const korean = review.asr.korean
      ? readRef<QuestionAudioKoreanAsr>(review.asr.korean)
      : undefined;
    if (
      korean &&
      (resolve(korean.activityPath) !== resolve(activity.rawArtifact.path) ||
        korean.activitySha256 !== activity.rawArtifact.sha256)
    )
      throw Error("Korean probe activity binding differs");
    const origins: Record<string, QuestionAudioAsr> = {};
    for (const ref of aggregate.derivedFrom ?? [])
      origins[ref.sha256] = readRef(ref);
    const originRefs = new Map(
      (aggregate.derivedFrom ?? []).map((ref) => [ref.sha256, ref]),
    );
    const record: SourceResult = {
      sourceRecordId: sourceId,
      sourceAudio: review.sourceAudio,
      prepared: review.prepared,
      officialScript: review.officialScript,
      sourceTranscriptSha256: script.sourceTranscriptSha256,
      sourceQuestionCount: originalQuestions.length,
      humanReviewed: false,
      questions: [],
      overlongKoreanProbeSegments:
        korean?.segments
          .filter((s) => s.localEndSeconds > 12)
          .map((s) => ({
            id: s.id,
            probeId: s.probeId,
            text: s.text,
            localEndSeconds: s.localEndSeconds,
          })) ?? [],
    };
    // Always measure actual PCM, even if a candidate's semantic checks will later reject it.
    let source;
    try {
      let encoded: Buffer = originalAudio;
      if (originalAudio.subarray(4, 8).toString() === "ftyp") {
        if (!values["ffmpeg-path"])
          throw Error(
            "M4A requires --ffmpeg-path and the trusted native conversion",
          );
        const { prepareListeningM4aPlayback } =
          await import("../../../src/lib/english/listening/media/trustedM4a");
        const converted = await prepareListeningM4aPlayback({
          sourcePath: review.sourceAudio.path,
          ffmpegPath: values["ffmpeg-path"],
        });
        if (sha(converted.sourceBytes) !== review.sourceAudio.sha256)
          throw Error("M4A source changed during conversion");
        encoded = converted.playbackDerivative.bytes;
        record.trustedContainerConversion =
          converted.playbackDerivative.conversion;
      }
      source = await decodeListeningMp3Pcm(encoded);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      record.questions = review.questions.map((q) => ({
        questionId: q.questionId,
        sourceNumber: q.sourceNumber,
        status: "rejected",
        fallback: { sourceAudio: review.sourceAudio },
        reasons: ["native_decode:" + reason],
      }));
      record.counts = {
        physicalQuietCandidates: 0,
        strictSpeechPassed: 0,
        stagedQuestions: 0,
      };
      save(sourceId + ".review.json", record);
      records.push(record);
      console.log(
        JSON.stringify({
          sourceRecordId: sourceId,
          ...record.counts,
          decodeError: reason,
        }),
      );
      continue;
    }
    try {
      if (
        Math.abs(
          activity.decodedSampleCount -
            Math.round((source.frameCount * 16000) / source.sampleRate),
        ) > 1
      )
        throw Error("VAD resampling frame identity differs");
      record.nativePcm = {
        pcmSha256: source.pcmSha256,
        sampleRate: source.sampleRate,
        channels: source.channels,
        frameCount: source.frameCount,
        durationSeconds: source.frameCount / source.sampleRate,
      };
      const ranges = review.questions.map((q) =>
        q.copies.length
          ? {
              startSample: Math.min(...q.copies.map((c) => c.startSample)),
              endSample: Math.max(...q.copies.map((c) => c.endSample)),
            }
          : null,
      );
      for (const [index, question] of review.questions.entries()) {
        const result: QuestionResult = {
          questionId: question.questionId,
          sourceNumber: question.sourceNumber,
          priorCandidateDecision: question.decision,
          priorCandidateReasons: question.reasons,
          status: "rejected",
          fallback: { sourceAudio: review.sourceAudio },
          reasons: [],
        };
        record.questions.push(result);
        const range = ranges[index];
        if (!range) {
          result.reasons.push("no_candidate_range");
          continue;
        }
        const frameRange = (r: { startSample: number; endSample: number }) => ({
          startFrame: Math.floor((r.startSample * source.sampleRate) / 16000),
          endFrame: Math.ceil((r.endSample * source.sampleRate) / 16000),
        });
        const selectedIds = question.copies.flatMap((c) =>
          c.segmentIds.map((id: number) =>
            (c.cache === "auto" ? rawAuto : aggregate).segments.find(
              (s) => s.id === id,
            ),
          ),
        );
        const anchors = selectedIds
          .filter((s): s is NonNullable<typeof s> => s !== undefined)
          .map((s) =>
            frameRange({
              startSample: Math.floor(s.estimatedStartSeconds * 16000),
              endSample: Math.ceil(s.estimatedEndSeconds * 16000),
            }),
          );
        // The neighboring original candidate limits include uncertain neighbors. Never expand into them.
        const previousRange = ranges
          .slice(0, index)
          .reverse()
          .find((r) => r && r.endSample <= range.startSample);
        const nextRange = ranges
          .slice(index + 1)
          .find((r) => r && r.startSample >= range.endSample);
        const refinement = await findListeningBoundaryRefinement(source, {
          ...frameRange(range),
          anchors,
          previous: previousRange ? frameRange(previousRange) : null,
          next: nextRange ? frameRange(nextRange) : null,
        });
        result.physicalBoundary = refinement;
        if (!refinement.candidate)
          result.reasons.push(...refinement.reasons.map((r) => "pcm:" + r));
        if (question.decision !== "candidate_checks_passed")
          result.reasons.push(
            ...question.reasons.map((r: string) => "candidate:" + r),
          );
        const finalRange = refinement.candidate?.range ?? frameRange(range);
        // A frame cut is represented conservatively on the 16 kHz speech-proof clock too.
        const proofStart = Math.ceil(
          (finalRange.startFrame * 16000) / source.sampleRate,
        );
        const proofEnd = Math.floor(
          (finalRange.endFrame * 16000) / source.sampleRate,
        );
        const selectedNumbers = [
          ...new Set<number>([
            ...question.scriptQuestionNumbers,
            ...(question.copies[0]?.cue?.scopeEvidence
              ? question.copies[0].cue.questionNumbers
              : []),
          ]),
        ].sort((a, b) => a - b);
        const selectedQuestions = review.questions.filter((q) =>
          selectedNumbers.includes(q.sourceNumber),
        );
        let english = aggregate,
          englishRef = review.asr.english;
        const usedEnglish = selectedQuestions.flatMap((q) =>
          q.copies
            .filter((c) => c.cache === "english")
            .flatMap((c) => c.segmentIds),
        );
        const usedOrigins = new Set(
          usedEnglish.map(
            (id: number) =>
              aggregate.segments.find((s) => s.id === id)?.origin
                ?.artifactSha256,
          ),
        );
        if (!usedEnglish.length) {
          english = baselineEnglish;
          englishRef = review.baselineEnglishPreserved;
        } else if (usedOrigins.size === 1 && !usedOrigins.has(undefined)) {
          const rawSha = [...usedOrigins][0]!;
          const ref = originRefs.get(rawSha);
          if (!ref) throw Error("Missing raw English artifact reference");
          english = origins[rawSha];
          englishRef = ref;
        }
        const remap = (ids: number[]) =>
          english === aggregate
            ? ids
            : ids.map((id) => {
                const segment = aggregate.segments.find((s) => s.id === id);
                if (!segment?.origin)
                  throw Error("Missing exact English origin");
                return segment.origin.segmentId;
              });
        let useKorean = false;
        const ledger = review.questions.map((q, i: number) => {
          const selected = selectedNumbers.includes(q.sourceNumber),
            qRange = ranges[i];
          let cue = q.copies[0]?.cue;
          if (selected && qRange && cue) {
            const section = script.sections.find(
              (s) => s.id === q.scriptSectionId,
            )!;
            // Prefer an unchanged, direct ordinal within this passage if raw ASR provides one.
            // This is an alternate reference, never a rewrite or a fabricated cue.
            for (const [cache, file] of [
              ["auto", rawAuto],
              ["english", english],
            ] as const) {
              const alternative = file.segments.find(
                (s) =>
                  !s.uncertain &&
                  JSON.stringify(questionAudioCueNumbers(s.text)) ===
                    JSON.stringify(section.questionNumbers) &&
                  s.estimatedStartSeconds * 16000 >= qRange.startSample &&
                  s.estimatedEndSeconds * 16000 <= qRange.endSample,
              );
              if (alternative) {
                cue = {
                  cache,
                  segmentIds: [alternative.id],
                  questionNumbers: section.questionNumbers,
                };
                break;
              }
            }
            if (
              cue.cache === "english" &&
              english !== aggregate &&
              cue === q.copies[0].cue
            )
              cue = { ...cue, segmentIds: remap(cue.segmentIds) };
            if (cue.cache === "korean") useKorean = true;
          }
          return {
            questionId: q.questionId,
            sourceNumber: q.sourceNumber,
            decision:
              selected && q.decision === "candidate_checks_passed"
                ? "qualified"
                : "uncertain",
            reasons: selected ? q.reasons : ["whole_source_fallback"],
            scriptSectionId: q.scriptSectionId,
            startSample:
              selected && qRange?.startSample === range.startSample
                ? proofStart
                : qRange?.startSample,
            endSample:
              selected && qRange?.endSample === range.endSample
                ? proofEnd
                : qRange?.endSample,
            cue,
            copies: q.copies.map((c) => ({
              cache: c.cache,
              segmentIds:
                selected && c.cache === "english"
                  ? remap(c.segmentIds)
                  : c.segmentIds,
              firstSegmentIds:
                selected && c.cache === "english"
                  ? remap(c.firstSegmentIds)
                  : c.firstSegmentIds,
              lastSegmentIds:
                selected && c.cache === "english"
                  ? remap(c.lastSegmentIds)
                  : c.lastSegmentIds,
            })),
            ...(q.scriptQuestionNumbers.length > 1
              ? { sharedPassageQuestionNumbers: q.scriptQuestionNumbers }
              : {}),
          };
        });
        const alignment: QuestionAudioPassageEvidenceInput["alignment"] = {
          schemaVersion: 1,
          sourceRecordId: sourceId,
          humanReviewed: false,
          sourceAudio: review.sourceAudio,
          prepared: review.prepared,
          officialScript: review.officialScript,
          activity: review.activity,
          asr: {
            auto: review.asr.auto,
            english: englishRef,
            ...(useKorean ? { korean: review.asr.korean } : {}),
          },
          questions: ledger,
        };
        const evidence: QuestionAudioPassageEvidenceInput = {
          alignment,
          script,
          activity,
          rawActivity,
          asr: { auto: rawAuto, english, ...(useKorean ? { korean } : {}) },
          derivedAsrOrigins: english.derivedFrom ? origins : {},
        };
        result.verificationInputs = {
          asr: alignment.asr,
          originalReview: {
            path: resolve(prior, sourceId + ".boundary-review.json"),
            sha256: sha(
              readFileSync(resolve(prior, sourceId + ".boundary-review.json")),
            ),
          },
          selectedSourceNumbers: selectedNumbers,
          selectedKoreanProbeIds:
            useKorean && korean
              ? [
                  ...new Set(
                    ledger
                      .filter((q) => selectedNumbers.includes(q.sourceNumber))
                      .flatMap((q) =>
                        q.cue?.cache === "korean"
                          ? q.cue.segmentIds.map(
                              (id: number) =>
                                korean.segments.find((s) => s.id === id)
                                  ?.probeId,
                            )
                          : [],
                      ),
                  ),
                ]
              : [],
          rawArtifactsFilteredOrRewritten: false,
        };
        try {
          const proven = verifyQuestionAudioPassageEvidence(
            evidence,
            selectedNumbers,
          );
          result.speechProof = {
            status: "passed",
            selectedNumbers,
            groups: proven.map((g) => ({
              sourceNumbers: g.questions.map((q) => q.sourceNumber),
              startSample: g.startSample,
              endSample: g.endSample,
              vadLeadingPadMs: g.leadingSilenceMs,
              vadTrailingPadMs: g.trailingSilenceMs,
            })),
          };
          const current = ledger[index];
          if (!current.cue)
            throw Error("Selected cue disappeared after verification");
          const verifiedCue = current.cue;
          result.exactEvidence = {
            sourceUtterances: script.sections.find(
              (s) => s.id === current.scriptSectionId,
            )?.utterances,
            cue: {
              ...verifiedCue,
              utterances: verifiedCue.segmentIds.map((id) =>
                evidence.asr[verifiedCue.cache]?.segments.find(
                  (s) => s.id === id,
                ),
              ),
            },
            copies: current.copies.map((c) => ({
              ...c,
              utterances: c.segmentIds.map((id) =>
                evidence.asr[c.cache].segments.find((s) => s.id === id),
              ),
            })),
          };
          if (!result.reasons.length && refinement.candidate) {
            const clip = planListeningSampleClip(
              source,
              finalRange.startFrame,
              finalRange.endFrame,
            );
            const path = resolve(
              output,
              "clips",
              sourceId,
              String(question.sourceNumber).padStart(2, "0") + ".wav",
            );
            mkdirSync(dirname(path), { recursive: true });
            const handle = await open(path, "wx"),
              clipHash = createHash("sha256");
            try {
              for await (const part of clip.read()) {
                clipHash.update(part);
                await handle.writeFile(part);
              }
            } finally {
              await handle.close();
            }
            const clipSha256 = clipHash.digest("hex");
            if (
              clipSha256 !== refinement.candidate.measurement.clipSha256 ||
              sha(readFileSync(path)) !== clipSha256
            )
              throw Error("Clip differs from physically measured bytes");
            const alignmentRef = save(
              "proofs/" +
                sourceId +
                "-" +
                question.sourceNumber +
                ".alignment.json",
              alignment,
            );
            result.status = "staged_verified_derivative";
            result.alignment = alignmentRef;
            result.clip = {
              path,
              sha256: clipSha256,
              bytes: statSync(path).size,
              ...finalRange,
              sampleRate: source.sampleRate,
              channels: source.channels,
              durationSeconds:
                (finalRange.endFrame - finalRange.startFrame) /
                source.sampleRate,
              sourceStartSeconds: finalRange.startFrame / source.sampleRate,
              sourceEndSeconds: finalRange.endFrame / source.sampleRate,
            };
          }
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          result.speechProof = { status: "rejected", reason };
          result.reasons.push("speech:" + reason);
        }
      }
    } finally {
      await source.dispose();
    }
    record.counts = {
      physicalQuietCandidates: record.questions.filter(
        (q) => q.physicalBoundary?.candidate,
      ).length,
      strictSpeechPassed: record.questions.filter(
        (q) => q.speechProof?.status === "passed",
      ).length,
      stagedQuestions: record.questions.filter(
        (q) => q.status === "staged_verified_derivative",
      ).length,
    };
    save(sourceId + ".review.json", record);
    records.push(record);
    console.log(JSON.stringify({ sourceRecordId: sourceId, ...record.counts }));
  }
  const protectedFiles = [...inventory.values()].sort((a, b) =>
    a.path.localeCompare(b.path),
  );
  for (const ref of protectedFiles)
    if (sha(readFileSync(ref.path)) !== ref.sha256)
      throw Error("Input changed during scan: " + ref.path);
  if (
    sha(readFileSync(corePath)) !== codeHashes.strictCoreSha256 ||
    sha(readFileSync(boundaryPath)) !== codeHashes.boundaryCoreSha256 ||
    sha(readFileSync(stagingPath)) !== codeHashes.stagingScriptSha256
  )
    throw Error("Verification code changed during scan");
  const protection = save("immutable-inputs.json", {
    schemaVersion: 1,
    verifiedBeforeAndAfter: true,
    files: protectedFiles,
  });
  save("manifest.json", {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    policy: "offline-independent-complete-passage-native-quiet-v1",
    humanReviewed: false,
    writesDatabase: false,
    writesStorage: false,
    productionPartialAdmissionSupported: false,
    originalAudioModified: false,
    officialContentModified: false,
    fixedPreviousSource: previous.fixedPreviousSource,
    ...codeHashes,
    immutableInputs: protection,
    sourceRecords: records.length,
    questions: records.reduce((n, r) => n + r.questions.length, 0),
    physicalQuietCandidates: records.reduce(
      (n, r) => n + (r.counts?.physicalQuietCandidates ?? 0),
      0,
    ),
    strictSpeechPassed: records.reduce(
      (n, r) => n + (r.counts?.strictSpeechPassed ?? 0),
      0,
    ),
    stagedQuestions: records.reduce(
      (n, r) => n + (r.counts?.stagedQuestions ?? 0),
      0,
    ),
    records: records.map((r) => ({
      sourceRecordId: r.sourceRecordId,
      counts: r.counts,
      review: {
        path: resolve(output, r.sourceRecordId + ".review.json"),
        sha256: sha(
          readFileSync(resolve(output, r.sourceRecordId + ".review.json")),
        ),
      },
    })),
  });
  console.log(JSON.stringify({ manifest: resolve(output, "manifest.json") }));
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
