/** Offline evidence protocol. A status flag never replaces the underlying hashes and speech references. */
import { createHash } from "node:crypto";
import { z } from "zod";

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const id = z.uuid();
const integer = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const number = integer.min(1).max(30);
const numbers = z.array(number).min(1).max(30);
const segmentIds = z.array(integer.min(1).max(10000)).min(1).max(100);
const cache = z.enum(["auto", "english"]);
const cueCache = z.enum(["auto", "english", "korean"]);
const artifact = z.strictObject({ path: z.string().min(1), sha256: hash });
export const questionAudioSourceIdSchema = z
  .string()
  .regex(/^(ebs|ebsi)-(middle|high)-[1-3]-\d{4}-(1|2|09-mock)$/);
const span = z.strictObject({
  startCharacter: integer,
  endCharacter: integer,
  text: z.string().min(1).max(40000),
});
export const listeningQuestionAudioScriptSchema = z.strictObject({
  schemaVersion: z.literal(1),
  sourceRecordId: questionAudioSourceIdSchema,
  sourceAudioSha256: hash,
  sourceTranscriptFileSha256: hash,
  sourceTranscriptSha256: hash,
  sourceTranscriptText: z.string().min(1).max(40000),
  sections: z
    .array(
      z.strictObject({
        id: z.string().min(1).max(100),
        questionNumbers: numbers,
        startCharacter: integer,
        endCharacter: integer,
        utterances: z.array(span).min(1).max(200),
        expectedRepetitions: z.union([z.literal(1), z.literal(2)]),
        repetitionEvidence: span,
      }),
    )
    .min(1)
    .max(30),
});
export const listeningQuestionAudioAsrSchema = z.object({
  sourceAudioSha256: hash,
  durationSeconds: z.number().finite().positive().max(1800),
  segments: z
    .array(
      z.object({
        id: integer.min(1).max(10000),
        text: z.string().min(1).max(10000),
        estimatedStartSeconds: z.number().finite().nonnegative().max(1800),
        estimatedEndSeconds: z.number().finite().positive().max(1800),
        uncertain: z.boolean(),
        origin: z
          .strictObject({
            artifactSha256: hash,
            segmentId: integer.min(1).max(10000),
          })
          .optional(),
        windowId: integer.min(1).optional(),
        localStartSeconds: z.number().finite().nonnegative().optional(),
        localEndSeconds: z.number().finite().positive().optional(),
      }),
    )
    .min(1)
    .max(10000),
  derivedFrom: z.array(artifact).min(1).max(3).optional(),
  windows: z
    .array(
      z.object({
        id: integer.min(1),
        questionNumbers: numbers,
        cueSegmentIds: segmentIds,
        firstActivityEventId: integer.min(1),
        nextActivityEventId: integer.min(1),
        startSample: integer,
        endSample: integer,
        sampleRate: z.literal(16000),
        originalSourceAudioSha256: hash,
        decodedMonoFloat32Sha256: hash,
        segmentIds,
        purpose: z.literal("recognition_only_not_clip_boundaries"),
      }),
    )
    .min(1)
    .max(10000)
    .optional(),
});
export const listeningQuestionAudioActivitySchema = z.strictObject({
  schemaVersion: z.literal(1),
  sourceAudioSha256: hash,
  decoder: z.literal("pyav-faster-whisper"),
  sampleRate: z.literal(16000),
  decodedSampleCount: integer.min(1).max(1800 * 16000),
  rawArtifact: artifact,
  events: z
    .array(
      z.strictObject({
        id: integer.min(1),
        startSample: integer,
        endSample: integer,
      }),
    )
    .min(1)
    .max(10000),
});
export const listeningQuestionAudioKoreanAsrSchema =
  // Separate unpadded VAD pass measures the real model's speech margins.
  listeningQuestionAudioAsrSchema.extend({
    requestedLanguage: z.literal("ko"),
    activityPath: z.string().min(1),
    activitySha256: hash,
    probes: z
      .array(
        z.object({
          id: integer.min(1),
          sourceEventId: integer.min(1),
          startSample: integer,
          endSample: integer,
          sampleRate: z.literal(16000),
          decodedMonoFloat32Sha256: hash,
          segmentIds,
          originalSourceAudioSha256: hash,
        }),
      )
      .min(1)
      .max(10000),
    segments: z
      .array(
        listeningQuestionAudioAsrSchema.shape.segments.element.extend({
          probeId: integer.min(1),
          sourceEventId: integer.min(1),
          localStartSeconds: z.number().finite().nonnegative().max(12),
          localEndSeconds: z.number().finite().positive().max(12),
        }),
      )
      .min(1)
      .max(10000),
  });
export const listeningQuestionAudioAlignmentSchema = z.strictObject({
  schemaVersion: z.literal(1),
  sourceRecordId: questionAudioSourceIdSchema,
  humanReviewed: z.literal(false),
  sourceAudio: artifact,
  prepared: artifact,
  asr: z.strictObject({
    auto: artifact,
    english: artifact,
    korean: artifact.optional(),
  }),
  officialScript: artifact,
  activity: artifact,
  questions: z
    .array(
      z.strictObject({
        questionId: id,
        sourceNumber: number,
        decision: z.enum(["qualified", "uncertain", "excluded"]),
        reasons: z.array(z.string().min(1).max(2000)).max(50),
        scriptSectionId: z.string().min(1).max(100),
        startSample: integer,
        endSample: integer,
        cue: z.strictObject({
          cache: cueCache,
          segmentIds,
          questionNumbers: numbers,
          scopeEvidence: span.optional(),
        }),
        copies: z
          .array(
            z.strictObject({
              cache,
              segmentIds,
              firstSegmentIds: segmentIds,
              lastSegmentIds: segmentIds,
            }),
          )
          .min(1)
          .max(2),
        sharedPassageQuestionNumbers: numbers.optional(),
      }),
    )
    .min(1)
    .max(30),
});
export const listeningQuestionAudioSnapshotSchema = z.strictObject({
  schemaVersion: z.literal(1),
  sourceRecordId: questionAudioSourceIdSchema,
  alignment: artifact,
  expectedSet: z.strictObject({
    setId: id,
    ownerId: id,
    branchId: id.nullable(),
    revision: integer.min(1).max(2147483646),
    documentSha256: hash,
    originalAssetId: id,
  }),
});
export type QuestionAudioAlignment = z.infer<
  typeof listeningQuestionAudioAlignmentSchema
>;
export type QuestionAudioSnapshot = z.infer<
  typeof listeningQuestionAudioSnapshotSchema
>;
export type QuestionAudioScript = z.infer<
  typeof listeningQuestionAudioScriptSchema
>;
export type QuestionAudioAsr = z.infer<typeof listeningQuestionAudioAsrSchema>;
export type QuestionAudioActivity = z.infer<
  typeof listeningQuestionAudioActivitySchema
>;
export const listeningQuestionAudioRawActivitySchema = z.object({
  schemaVersion: z.literal(1),
  sourceAudioSha256: hash,
  decoder: z.literal("faster_whisper.audio.decode_audio/PyAV"),
  sampleRate: z.literal(16000),
  decodedSampleCount: integer.min(1).max(1800 * 16000),
  decodedMonoFloat32Sha256: hash,
  humanReviewed: z.literal(false),
  originalAudioModified: z.literal(false),
  options: z.object({
    threshold: z.literal(0.5),
    minSilenceDurationMs: z.literal(2000),
    speechPadMs: z.literal(400),
  }),
  chunks: z
    .array(z.object({ startSample: integer, endSample: integer }))
    .min(1)
    .max(10000),
  unpaddedChunks: z
    .array(z.object({ startSample: integer, endSample: integer }))
    .min(1)
    .max(10000),
});
export type QuestionAudioRawActivity = z.infer<
  typeof listeningQuestionAudioRawActivitySchema
>;
export type QuestionAudioKoreanAsr = z.infer<
  typeof listeningQuestionAudioKoreanAsrSchema
>;
export const questionAudioSha256 = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
function fail(message: string): never {
  throw Error("Question audio proof: " + message);
}
const sameNumbers = (a: number[], b: number[]) =>
  a.length === b.length && a.every((n, i) => n === b[i]);
function tokens(text: string) {
  return (
    text
      .normalize("NFKC")
      .replace(/[‘’]/g, "'")
      .replace(/^\s*\d+\.\s*(?=[^a-zA-Z])/gm, " ")
      .replace(/\b(?:ANN|[MW]\d?)\s*:/g, " ")
      .replace(/(?:^|\n)\s*[A-Z][a-z]{1,20}\s*:/g, " ")
      .replace(/\[[^\]]*\]/g, " ")
      .toLowerCase()
      .match(/[a-z]+(?:'[a-z]+)?|\d+/g) ?? []
  );
}
function coverage(expected: string, observed: string) {
  const a = tokens(expected),
    b = tokens(observed);
  if (!a.length || a.length > 6000 || b.length > 6000)
    return { recall: 0, precision: 0 };
  const row = new Uint16Array(b.length + 1);
  for (const word of a) {
    let diagonal = 0;
    for (let j = 1; j <= b.length; j++) {
      const previous = row[j];
      row[j] = word === b[j - 1] ? diagonal + 1 : Math.max(row[j], row[j - 1]);
      diagonal = previous;
    }
  }
  return {
    recall: row[b.length] / a.length,
    precision: b.length ? row[b.length] / b.length : 0,
  };
}

/** Short, positional token anchors cannot be replaced by the complete dialogue. */
function verifyDialogueEdgeAnchors(
  expectedFirst: string,
  expectedLast: string,
  observed: string,
) {
  const first = tokens(expectedFirst).slice(0, 8);
  const last = tokens(expectedLast).slice(-8);
  const actual = tokens(observed);
  for (const [expected, edge] of [
    [first, actual.slice(0, first.length)],
    [last, actual.slice(-last.length)],
  ] as const) {
    if (
      !expected.length ||
      coverage(expected.join(" "), edge.join(" ")).recall < 0.9
    )
      fail("positional dialogue edge token anchor is incomplete");
  }
}

/** A quoted once/twice directive must apply to this section, rather than another question range. */
function verifyRepetitionScope(text: string, sectionNumbers: number[]) {
  const normalized = text.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
  if (
    /(한번|once|onetime)/.test(normalized) &&
    /(두번|twice|twotimes|\[repeat\])/.test(normalized)
  )
    fail("repetition instruction scope mixes different broadcast counts");
  const range =
    /(?<!\d)(\d{1,2})번(?:부터|~|～|–|—|-)(\d{1,2})번(?:까지)?/.exec(
      normalized,
    ) ??
    /(?:questions?|numbers?)(\d{1,2})(?:to|through|-)(\d{1,2})/.exec(
      normalized,
    );
  if (range) {
    const first = Number(range[1]),
      last = Number(range[2]);
    if (
      first < 1 ||
      last > 30 ||
      first > last ||
      sectionNumbers.some((n) => n < first || n > last)
    )
      fail("repetition instruction scope does not include this question");
    return;
  }
  if (
    !/(모든문제|전체문제|allquestions|allthequestions|everyquestion)/.test(
      normalized,
    )
  )
    fail(
      "repetition instruction has no explicit whole-source or numbered scope",
    );
}

/** Check outside producer-selected bounds too: trimming a section must not hide speech. */
export function verifyQuestionAudioSourceSpeech(script: QuestionAudioScript) {
  const text = script.sourceTranscriptText;
  const speakers = Array.from(
    text.matchAll(/\b(ANN|[A-Z]\d?|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*:\s*/g),
  );
  let sourceSpeechCount = 0;
  let previousEnd = -1;
  for (const section of script.sections) {
    if (section.startCharacter < previousEnd)
      fail("whole official speaker speech sections overlap or are reordered");
    previousEnd = section.endCharacter;
  }
  for (const [index, speaker] of speakers.entries()) {
    if (speaker[1] === "ANN") continue;
    const start = speaker.index! + speaker[0].length;
    let end = speakers[index + 1]?.index ?? text.length;
    const body = text.slice(start, end);
    const instruction =
      /ⓒ|©|\b\d{1,2}\s*번|\b\d{1,2}\s*\.\s*(?=[가-힣]|[^:]{0,180}고르시오)|[\[【]\s*\d{1,2}\s*[~～–—-]\s*\d{1,2}\s*[\]】]/.exec(
        body,
      );
    if (instruction) {
      end = start + instruction.index;
      // The mock-exam PDF puts a standalone page number before its next question.
      const footer = /\n\s*\d{1,3}\s*$/.exec(text.slice(start, end));
      if (footer) end = start + footer.index;
    }
    const spoken = text.slice(start, end);
    // Only a bare answer blank has no source speech to prove. Written prefixes
    // such as "Monica, ____" may actually be spoken and cannot be discarded.
    if (/^\s*_{3,}\s*[.!?]?\s*$/.test(spoken)) continue;
    const expected = tokens(spoken);
    if (!expected.length) continue;
    sourceSpeechCount++;
    const covered = script.sections
      .filter((s) => s.startCharacter < end && s.endCharacter > start)
      .map((s) =>
        text.slice(
          Math.max(start, s.startCharacter),
          Math.min(end, s.endCharacter),
        ),
      )
      .join("\n");
    const actual = tokens(covered);
    if (
      expected.length !== actual.length ||
      expected.some((word, i) => word !== actual[i])
    )
      fail(
        "whole official speaker speech is omitted outside selected section bounds",
      );
  }
  if (!sourceSpeechCount)
    fail("whole official speaker speech has no source labels");
}
const spokenNumbers = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
];
/** Only explicit announcer numbering; numbers inside a conversation do not count. */
export function questionAudioCueNumbers(text: string) {
  const value = text.trim().toLowerCase();
  const numberWord = "(?:[1-9]\\d?|" + spokenNumbers.slice(1).join("|") + ")";
  const korean = new RegExp(
    `^(\\d{1,2})\\s*번(?:\\s*(?:부터|~|～|-|과|와)\\s*(\\d{1,2})\\s*번)?`,
  );
  const english = new RegExp(
    `^(?:number|questions?)\\s+(${numberWord})(?:\\s*(?:and|to|through|~|-)\\s*(?:number\\s+)?(${numberWord}))?\\b`,
  );
  const matched = korean.exec(value) ?? english.exec(value);
  if (!matched) return [];
  const asNumber = (word: string) =>
    /^\d+$/.test(word) ? Number(word) : spokenNumbers.indexOf(word);
  const first = asNumber(matched[1]),
    last = matched[2] ? asNumber(matched[2]) : first;
  if (first < 1 || last < first || last > 30) return [];
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

/** Bounded Korean probes sometimes spell "2번" as "2."; require the original instruction too. */
export function questionAudioKoreanInstructionCueNumbers(
  text: string,
  script: QuestionAudioScript,
  section: QuestionAudioScript["sections"][number],
) {
  if (section.questionNumbers.length !== 1) return [];
  const match = /^(\d{1,2})[.．]\s*([\s\S]+)$/.exec(text.trim());
  const number = section.questionNumbers[0];
  if (
    !match ||
    Number(match[1]) !== number ||
    !/듣고[\s\S]*고르시오[.。]?\s*$/.test(match[2])
  )
    return [];
  const index = script.sections.findIndex((s) => s.id === section.id);
  if (index < 0) return [];
  const before = script.sourceTranscriptText.slice(
    index ? script.sections[index - 1].endCharacter : 0,
    section.startCharacter,
  );
  const markers = Array.from(before.matchAll(/(?<!\d)(\d{1,2})\s*번/g));
  const marker = markers.at(-1);
  if (!marker || Number(marker[1]) !== number) return [];
  const original = before
    .slice(marker.index! + marker[0].length)
    .replace(/\b(?:[A-Z]\d?|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*:\s*$/, "");
  const normalize = (value: string) =>
    value.normalize("NFKC").replace(/[\s,.，。?!'‘’"“”]/g, "");
  return normalize(original) === normalize(match[2]) ? [number] : [];
}

/** Recomputes dialogue/copies and boundaries from exact file contents, not producer booleans. */
export interface QuestionAudioEvidenceInput {
  alignment: QuestionAudioAlignment;
  script: QuestionAudioScript;
  asr: {
    auto: QuestionAudioAsr;
    english: QuestionAudioAsr;
    korean?: QuestionAudioKoreanAsr;
  };
  activity: QuestionAudioActivity;
  rawActivity: QuestionAudioRawActivity;
  derivedAsrOrigins?: Record<string, QuestionAudioAsr>;
}

/** An unresolved neighbor keeps its real identity without inventing cue/copy evidence. */
export type QuestionAudioPassageEvidenceInput = Omit<
  QuestionAudioEvidenceInput,
  "alignment"
> & {
  alignment: Omit<QuestionAudioAlignment, "questions"> & {
    questions: (
      | QuestionAudioAlignment["questions"][number]
      | {
          questionId: string;
          sourceNumber: number;
          scriptSectionId: string;
          [field: string]: unknown;
        }
    )[];
  };
};

/** Production admission remains whole-source. */
export function verifyQuestionAudioEvidence(input: QuestionAudioEvidenceInput) {
  return verifyEvidence(input);
}

/**
 * Offline passage staging only. Keep the complete official script, alignment identities,
 * raw caches and activity; every selected passage passes the same speech checks as a round.
 * Unselected questions retain whole-source fallback. This does not authorize DB adoption.
 */
export function verifyQuestionAudioPassageEvidence(
  input: QuestionAudioPassageEvidenceInput,
  sourceNumbers: number[],
) {
  if (
    !sourceNumbers.length ||
    sourceNumbers.some(
      (n, i) =>
        !Number.isSafeInteger(n) ||
        n < 1 ||
        (i > 0 && n <= sourceNumbers[i - 1]),
    )
  )
    fail("invalid passage selection");
  return verifyEvidence(input, new Set(sourceNumbers));
}

function verifyEvidence(
  input: QuestionAudioPassageEvidenceInput,
  staged?: Set<number>,
) {
  // In passage mode the full ledger proves original identities; unresolved neighbors
  // have no speech references to parse. No selected question can bypass the full schema.
  const originalIdentities = input.alignment.questions.map((q) =>
    z
      .strictObject({
        questionId: id,
        sourceNumber: number,
        scriptSectionId: z.string().min(1),
      })
      .parse({
        questionId: q.questionId,
        sourceNumber: q.sourceNumber,
        scriptSectionId: q.scriptSectionId,
      }),
  );
  if (
    originalIdentities.some((q, i) => q.sourceNumber !== i + 1) ||
    new Set(originalIdentities.map((q) => q.questionId)).size !==
      originalIdentities.length
  )
    fail("question numbering or identity differs");
  const alignment = listeningQuestionAudioAlignmentSchema.parse(
    staged
      ? {
          ...input.alignment,
          questions: input.alignment.questions.filter((q) =>
            staged.has(q.sourceNumber),
          ),
        }
      : input.alignment,
  );
  const script = listeningQuestionAudioScriptSchema.parse(input.script);
  const activity = listeningQuestionAudioActivitySchema.parse(input.activity);
  const rawActivity = listeningQuestionAudioRawActivitySchema.parse(
    input.rawActivity,
  );
  if (
    rawActivity.sourceAudioSha256 !== activity.sourceAudioSha256 ||
    rawActivity.decodedSampleCount !== activity.decodedSampleCount ||
    rawActivity.chunks.length !== activity.events.length ||
    rawActivity.unpaddedChunks.length !== activity.events.length ||
    activity.events.some((event, i) => {
      const padded = rawActivity.chunks[i],
        speech = rawActivity.unpaddedChunks[i];
      return (
        padded.startSample !== event.startSample ||
        padded.endSample !== event.endSample ||
        speech.startSample >= speech.endSample ||
        speech.startSample < padded.startSample ||
        speech.endSample > padded.endSample
      );
    })
  )
    fail("raw VAD activity identity differs");
  // Keep every segment of each referenced Korean probe. Unrelated probes are still
  // retained in the raw artifact and reported by staging, but do not certify this passage.
  const koreanProbeIds = new Set(
    staged
      ? alignment.questions
          .filter((q) => q.cue.cache === "korean")
          .flatMap((q) =>
            q.cue.segmentIds.map(
              (segmentId) =>
                input.asr.korean?.segments.find((s) => s.id === segmentId)
                  ?.probeId,
            ),
          )
      : [],
  );
  const selectedKorean =
    staged && input.asr.korean
      ? {
          ...input.asr.korean,
          probes: input.asr.korean.probes.filter((p) =>
            koreanProbeIds.has(p.id),
          ),
          segments: input.asr.korean.segments.filter((s) =>
            koreanProbeIds.has(s.probeId),
          ),
        }
      : input.asr.korean;
  const asr = {
    auto: listeningQuestionAudioAsrSchema.parse(input.asr.auto),
    english: listeningQuestionAudioAsrSchema.parse(input.asr.english),
    ...(selectedKorean
      ? {
          korean: listeningQuestionAudioKoreanAsrSchema.parse(selectedKorean),
        }
      : {}),
  };
  const origins = Object.fromEntries(
    Object.entries(input.derivedAsrOrigins ?? {}).map(([sha, file]) => [
      sha,
      listeningQuestionAudioAsrSchema.parse(file),
    ]),
  );
  for (const file of [asr.auto, asr.english]) {
    if (file.derivedFrom) {
      if (
        file.windows ||
        new Set(file.derivedFrom.map((r) => r.sha256)).size !==
          file.derivedFrom.length
      )
        fail("invalid derived ASR provenance");
      const used = new Set<string>();
      const segmentOrigins = new Set<string>();
      for (const segment of file.segments) {
        const origin = segment.origin,
          original = origin ? origins[origin.artifactSha256] : undefined;
        const exact = original?.segments.find(
          (s) => s.id === origin?.segmentId,
        );
        if (
          !origin ||
          !file.derivedFrom.some((r) => r.sha256 === origin.artifactSha256) ||
          !original ||
          original.derivedFrom ||
          original.sourceAudioSha256 !== file.sourceAudioSha256 ||
          original.durationSeconds !== file.durationSeconds ||
          !exact ||
          exact.text !== segment.text ||
          exact.estimatedStartSeconds !== segment.estimatedStartSeconds ||
          exact.estimatedEndSeconds !== segment.estimatedEndSeconds ||
          exact.uncertain !== segment.uncertain
        )
          fail("derived ASR segment differs from exact raw origin");
        used.add(origin.artifactSha256);
        const identity = origin.artifactSha256 + ":" + origin.segmentId;
        if (segmentOrigins.has(identity))
          fail("derived ASR duplicates a raw speech segment");
        segmentOrigins.add(identity);
      }
      if (file.derivedFrom.some((r) => !used.has(r.sha256)))
        fail("unused derived ASR origin");
    } else if (file.segments.some((s) => s.origin))
      fail("ASR origin has no raw file provenance");
  }
  if (
    script.sourceRecordId !== alignment.sourceRecordId ||
    [
      script,
      activity,
      asr.auto,
      asr.english,
      ...(asr.korean ? [asr.korean] : []),
    ].some((file) => file.sourceAudioSha256 !== alignment.sourceAudio.sha256) ||
    questionAudioSha256(script.sourceTranscriptText) !==
      script.sourceTranscriptSha256
  )
    fail("source identity differs");
  if (new Set(script.sections.map((s) => s.id)).size !== script.sections.length)
    fail("duplicate official sections");
  const completeNumbers = script.sections
    .flatMap((s) => s.questionNumbers)
    .sort((a, b) => a - b);
  if (
    !sameNumbers(
      completeNumbers,
      originalIdentities.map((q) => q.sourceNumber),
    )
  )
    fail("whole official source question set differs");
  if (staged && [...staged].some((n) => !completeNumbers.includes(n)))
    fail("selected passage is outside the official source");
  for (const cache of [...Object.values(asr), ...Object.values(origins)])
    if (
      new Set(cache.segments.map((s) => s.id)).size !== cache.segments.length ||
      cache.segments.some(
        (s) =>
          s.estimatedEndSeconds <= s.estimatedStartSeconds ||
          s.estimatedEndSeconds > cache.durationSeconds + 0.01,
      )
    )
      fail("invalid ASR identity or times");
  let lastEventEnd = 0;
  for (const event of activity.events) {
    if (
      event.startSample < lastEventEnd ||
      event.startSample >= event.endSample ||
      event.endSample > activity.decodedSampleCount
    )
      fail("invalid VAD event order");
    lastEventEnd = event.endSample;
  }
  if (new Set(activity.events.map((e) => e.id)).size !== activity.events.length)
    fail("duplicate VAD event ids");
  for (const file of [asr.auto, asr.english, ...Object.values(origins)])
    if (file.windows) {
      if (new Set(file.windows.map((w) => w.id)).size !== file.windows.length)
        fail("duplicate recognition windows");
      for (const window of file.windows) {
        if (
          staged &&
          !alignment.questions.some(
            (q) =>
              (window.startSample < q.endSample &&
                window.endSample > q.startSample) ||
              file.segments.some(
                (s) =>
                  s.windowId === window.id &&
                  s.estimatedStartSeconds * 16000 < q.endSample &&
                  s.estimatedEndSeconds * 16000 > q.startSample,
              ),
          )
        )
          continue;
        const first = activity.events.find(
            (e) => e.id === window.firstActivityEventId,
          ),
          next = activity.events.find(
            (e) => e.id === window.nextActivityEventId,
          );
        if (
          !first ||
          !next ||
          first.id >= next.id ||
          window.startSample >= window.endSample ||
          window.endSample > activity.decodedSampleCount ||
          window.startSample < first.startSample ||
          window.endSample > next.startSample ||
          window.originalSourceAudioSha256 !== alignment.sourceAudio.sha256
        )
          fail("recognition window source bounds differ");
        const actual = file.segments.filter((s) => s.windowId === window.id);
        if (
          !sameNumbers(
            actual.map((s) => s.id),
            window.segmentIds,
          )
        )
          fail("recognition window segment references differ");
        for (const segment of actual)
          if (
            segment.localStartSeconds === undefined ||
            segment.localEndSeconds === undefined ||
            segment.localEndSeconds <= segment.localStartSeconds ||
            Math.abs(
              segment.estimatedStartSeconds -
                window.startSample / 16000 -
                segment.localStartSeconds,
            ) > 1e-7 ||
            Math.abs(
              segment.estimatedEndSeconds -
                window.startSample / 16000 -
                segment.localEndSeconds,
            ) > 1e-7 ||
            segment.estimatedEndSeconds * 16000 > window.endSample + 1e-5
          )
            fail("recognition window timestamp offset differs");
      }
      if (
        file.segments.some(
          (s) => !file.windows!.some((w) => w.id === s.windowId),
        )
      )
        fail("unproven localized speech segment");
    }
  if (asr.korean) {
    const korean = asr.korean;
    if (new Set(korean.probes.map((p) => p.id)).size !== korean.probes.length)
      fail("duplicate announcement probes");
    for (const probe of korean.probes) {
      const event = activity.events.find((e) => e.id === probe.sourceEventId);
      if (
        !event ||
        probe.id !== probe.sourceEventId ||
        probe.originalSourceAudioSha256 !== alignment.sourceAudio.sha256 ||
        probe.startSample !== event.startSample ||
        probe.endSample !==
          Math.min(probe.startSample + 12 * 16000, activity.decodedSampleCount)
      )
        fail("announcement probe source offset differs");
      const actual = korean.segments.filter((s) => s.probeId === probe.id);
      if (
        !sameNumbers(
          actual.map((s) => s.id),
          probe.segmentIds,
        )
      )
        fail("announcement probe segment references differ");
      for (const segment of actual)
        if (
          segment.sourceEventId !== probe.sourceEventId ||
          segment.localEndSeconds <= segment.localStartSeconds ||
          Math.abs(
            segment.estimatedStartSeconds -
              probe.startSample / 16000 -
              segment.localStartSeconds,
          ) > 1e-7 ||
          Math.abs(
            segment.estimatedEndSeconds -
              probe.startSample / 16000 -
              segment.localEndSeconds,
          ) > 1e-7 ||
          segment.estimatedEndSeconds * 16000 > probe.endSample + 1e-5
        )
          fail("announcement timestamp offset differs");
    }
    if (
      korean.segments.some(
        (s) => !korean.probes.some((p) => p.id === s.probeId),
      )
    )
      fail("unproven announcement segment");
  }
  function spanText(value: z.infer<typeof span>) {
    if (
      value.startCharacter >= value.endCharacter ||
      script.sourceTranscriptText.slice(
        value.startCharacter,
        value.endCharacter,
      ) !== value.text
    )
      fail("official text span differs");
    return value.text;
  }
  for (const section of script.sections) {
    if (
      section.startCharacter >= section.endCharacter ||
      section.endCharacter > script.sourceTranscriptText.length
    )
      fail("invalid official section bounds");
    let end = section.startCharacter;
    for (const utterance of section.utterances) {
      spanText(utterance);
      if (
        utterance.startCharacter < end ||
        utterance.endCharacter > section.endCharacter
      )
        fail("official utterance order differs");
      end = utterance.endCharacter;
    }
    let rawSection = script.sourceTranscriptText.slice(
      section.startCharacter,
      section.endCharacter,
    );
    for (const utterance of section.utterances) {
      const named = /^\s*([A-Z][a-z]{1,20})\s*:/.exec(utterance.text)?.[1];
      if (named)
        rawSection = rawSection.replace(
          new RegExp("\\b" + named + "\\s*:", "g"),
          " ",
        );
    }
    const all = tokens(rawSection);
    const selected = tokens(section.utterances.map((u) => u.text).join("\n"));
    if (
      all.length !== selected.length ||
      all.some((word, i) => word !== selected[i])
    )
      fail("official middle dialogue is omitted");
    const repetition = spanText(section.repetitionEvidence)
      .replace(/\s+/g, "")
      .toLowerCase();
    if (
      section.expectedRepetitions === 1
        ? !/(한번|once|onetime)/.test(repetition)
        : !/(두번|twice|twotimes|\[repeat\])/.test(repetition)
    )
      fail("repetition count has no explicit source evidence");
    verifyRepetitionScope(repetition, section.questionNumbers);
  }
  verifyQuestionAudioSourceSpeech(script);
  const noSpeech = (start: number, end: number) =>
    !activity.events.some((e) => e.startSample < end && e.endSample > start);
  const selected = (
    kind: "auto" | "english" | "korean",
    ids: number[],
    question: QuestionAudioAlignment["questions"][number],
  ) => {
    if (new Set(ids).size !== ids.length)
      fail("duplicate ASR speech reference");
    return ids.map((segmentId) => {
      const segment = asr[kind]?.segments.find((s) => s.id === segmentId);
      if (!segment || segment.uncertain)
        fail("missing or uncertain ASR speech reference");
      const start = Math.floor(segment.estimatedStartSeconds * 16000),
        end = Math.ceil(segment.estimatedEndSeconds * 16000);
      // A timestamp can extend into the same silence gap, but cannot cross any real speech.
      if (
        end <= question.startSample ||
        start >= question.endSample ||
        (start < question.startSample &&
          !noSpeech(start, question.startSample)) ||
        (end > question.endSample && !noSpeech(question.endSample, end))
      )
        fail("ASR reference crosses adjacent speech");
      return segment;
    });
  };
  const scopes = new Map<string, { numbers: number[]; actual: number[] }>();
  const groups: {
    section: QuestionAudioScript["sections"][number];
    questions: QuestionAudioAlignment["questions"];
    startSample: number;
    endSample: number;
    leadingSilenceMs: number;
    trailingSilenceMs: number;
  }[] = [];
  const identities = new Set<string>();
  for (const [index, question] of alignment.questions.entries()) {
    if (
      (!staged && question.sourceNumber !== index + 1) ||
      identities.has(question.questionId)
    )
      fail("question numbering or identity differs");
    identities.add(question.questionId);
    if (staged && !staged.has(question.sourceNumber)) continue;
    if (question.decision !== "qualified" || question.reasons.length)
      fail("unqualified question cannot be approved");
    const section = script.sections.find(
      (s) => s.id === question.scriptSectionId,
    );
    if (!section || !section.questionNumbers.includes(question.sourceNumber))
      fail("missing official dialogue section");
    if (
      question.startSample >= question.endSample ||
      question.endSample > activity.decodedSampleCount ||
      !activity.events.some(
        (e) =>
          e.startSample >= question.startSample &&
          e.endSample <= question.endSample,
      ) ||
      activity.events.some(
        (e) =>
          e.startSample < question.endSample &&
          e.endSample > question.startSample &&
          (e.startSample < question.startSample ||
            e.endSample > question.endSample),
      )
    )
      fail("clip cuts a real speech event");
    const contained = activity.events
      .map((e, i) => ({ event: e, speech: rawActivity.unpaddedChunks[i] }))
      .filter(
        ({ event: e }) =>
          e.startSample >= question.startSample &&
          e.endSample <= question.endSample,
      );
    const leadingSilenceMs =
        (contained[0].speech.startSample - question.startSample) / 16,
      trailingSilenceMs =
        (question.endSample - contained.at(-1)!.speech.endSample) / 16;
    if (
      leadingSilenceMs < rawActivity.options.speechPadMs ||
      trailingSilenceMs < rawActivity.options.speechPadMs
    )
      fail("speech boundary padding is incomplete");
    const commonScope = question.cue.scopeEvidence;
    if (
      new Set(question.cue.segmentIds).size !== question.cue.segmentIds.length
    )
      fail("duplicate numbering references");
    if (commonScope) {
      const text = spanText(commonScope).normalize("NFKC").replace(/\s+/g, "");
      const match =
        /(?:\[|^)(\d{1,2})(?:번)?(?:~|～|–|—|-|부터)(\d{1,2})(?:번)?(?:까지)?(?:\]|$)/.exec(
          text,
        );
      if (
        !match ||
        !sameNumbers(
          Array.from(
            { length: Number(match[2]) - Number(match[1]) + 1 },
            (_, i) => Number(match[1]) + i,
          ),
          question.cue.questionNumbers,
        ) ||
        !section.questionNumbers.every((n) =>
          question.cue.questionNumbers.includes(n),
        )
      )
        fail("common numbering has no exact official scope");
    }
    const cue = commonScope
      ? question.cue.segmentIds.map((segmentId) => {
          const segment = asr[question.cue.cache]?.segments.find(
            (s) => s.id === segmentId,
          );
          if (
            !segment ||
            segment.uncertain ||
            segment.estimatedEndSeconds * 16000 > question.endSample
          )
            fail("missing or late common numbering reference");
          return segment;
        })
      : selected(question.cue.cache, question.cue.segmentIds, question);
    const cueText = cue.map((s) => s.text).join(" ");
    const regularCue = questionAudioCueNumbers(cueText);
    const spokenCue = regularCue.length
      ? regularCue
      : question.cue.cache === "korean" && !commonScope
        ? questionAudioKoreanInstructionCueNumbers(cueText, script, section)
        : [];
    if (
      !sameNumbers(spokenCue, question.cue.questionNumbers) ||
      (!commonScope &&
        !sameNumbers(question.cue.questionNumbers, section.questionNumbers))
    )
      fail("spoken numbering differs");
    if (commonScope) {
      const key = question.cue.cache + ":" + question.cue.segmentIds.join(",");
      const scope = scopes.get(key);
      if (scope && !sameNumbers(scope.numbers, question.cue.questionNumbers))
        fail("common numbering scope changed");
      if (scope) scope.actual.push(question.sourceNumber);
      else
        scopes.set(key, {
          numbers: question.cue.questionNumbers,
          actual: [question.sourceNumber],
        });
    }
    if (question.copies.length !== section.expectedRepetitions)
      fail("broadcast repetition incomplete");
    const dialogue = section.utterances.map((s) => s.text).join("\n");
    let previousEnd = -1;
    const usedSegments = new Set<string>();
    for (const copy of question.copies) {
      const segments = selected(copy.cache, copy.segmentIds, question);
      if (
        Math.max(...cue.map((s) => s.estimatedStartSeconds)) >
        segments[0].estimatedStartSeconds
      )
        fail("numbering follows the dialogue");
      if (
        !sameNumbers(
          copy.firstSegmentIds,
          copy.segmentIds.slice(0, copy.firstSegmentIds.length),
        ) ||
        !sameNumbers(
          copy.lastSegmentIds,
          copy.segmentIds.slice(-copy.lastSegmentIds.length),
        )
      )
        fail("first or last utterance is not the dialogue prefix or suffix");
      const first = selected(copy.cache, copy.firstSegmentIds, question),
        last = selected(copy.cache, copy.lastSegmentIds, question);
      if (first[0].estimatedStartSeconds > last.at(-1)!.estimatedEndSeconds)
        fail("first and last utterances are reversed");
      const full = coverage(dialogue, segments.map((s) => s.text).join(" "));
      for (const [i, segment] of segments.entries())
        for (const prior of segments.slice(0, i)) {
          const start = Math.floor(
              Math.max(
                segment.estimatedStartSeconds,
                prior.estimatedStartSeconds,
              ) * 16000,
            ),
            end = Math.ceil(
              Math.min(segment.estimatedEndSeconds, prior.estimatedEndSeconds) *
                16000,
            );
          // Exactly touching timestamps have zero overlap before sample rounding.
          if (
            Math.max(
              segment.estimatedStartSeconds,
              prior.estimatedStartSeconds,
            ) <
              Math.min(
                segment.estimatedEndSeconds,
                prior.estimatedEndSeconds,
              ) &&
            !noSpeech(start, end)
          )
            fail("dialogue references duplicate overlapping speech");
        }
      if (
        full.recall < 0.9 ||
        full.precision < 0.7 ||
        coverage(section.utterances[0].text, first.map((s) => s.text).join(" "))
          .recall < 0.9 ||
        coverage(
          section.utterances.at(-1)!.text,
          last.map((s) => s.text).join(" "),
        ).recall < 0.9
      )
        fail("complete dialogue or first/last utterance not covered");
      verifyDialogueEdgeAnchors(
        section.utterances[0].text,
        section.utterances.at(-1)!.text,
        segments.map((s) => s.text).join(" "),
      );
      if (
        segments.some(
          (s, i) =>
            i > 0 &&
            s.estimatedStartSeconds < segments[i - 1].estimatedStartSeconds,
        ) ||
        segments[0].estimatedStartSeconds < previousEnd
      )
        fail("broadcast copies overlap or are reordered");
      previousEnd = segments.at(-1)!.estimatedEndSeconds;
      for (const segmentId of copy.segmentIds) {
        const key = copy.cache + ":" + segmentId;
        if (usedSegments.has(key)) fail("repeat reuses the same ASR speech");
        usedSegments.add(key);
      }
    }
    // A producer cannot hide a spoken prefix, a second broadcast, or a foreign
    // instruction simply by leaving its segment ID out of an otherwise valid copy.
    for (const kind of new Set(question.copies.map((c) => c.cache))) {
      const assigned = new Set(
        question.copies
          .filter((c) => c.cache === kind)
          .flatMap((c) => c.segmentIds),
      );
      if (question.cue.cache === kind)
        for (const segmentId of question.cue.segmentIds)
          assigned.add(segmentId);
      for (const segment of asr[kind].segments) {
        const numbering = questionAudioCueNumbers(segment.text);
        const numeralOnly =
          /^\d{1,2}\s*번[.。]?\s*$/.test(segment.text.trim()) ||
          /^\s*(?:number|questions?)\s+(?:[a-z]+|\d+)(?:\s*(?:and|to|through)\s*(?:number\s+)?(?:[a-z]+|\d+))?[.?!]*\s*$/i.test(
            segment.text,
          );
        const numberingOnly =
          numbering.length > 0 &&
          numbering.every((n) => section.questionNumbers.includes(n)) &&
          numeralOnly;
        if (
          segment.estimatedStartSeconds * 16000 < question.endSample &&
          segment.estimatedEndSeconds * 16000 > question.startSample &&
          !noSpeech(
            Math.max(
              question.startSample,
              Math.floor(segment.estimatedStartSeconds * 16000),
            ),
            Math.min(
              question.endSample,
              Math.ceil(segment.estimatedEndSeconds * 16000),
            ),
          ) &&
          !assigned.has(segment.id) &&
          !numberingOnly
        )
          fail("unclassified ASR speech inside question passage");
      }
    }
    const shared = section.questionNumbers.length > 1;
    if (
      shared
        ? !question.sharedPassageQuestionNumbers ||
          !sameNumbers(
            question.sharedPassageQuestionNumbers,
            section.questionNumbers,
          )
        : question.sharedPassageQuestionNumbers !== undefined
    )
      fail("shared passage lacks source evidence");
    const previous = groups.at(-1);
    if (shared && previous?.section.id === section.id) {
      if (
        previous.startSample !== question.startSample ||
        previous.endSample !== question.endSample
      )
        fail("shared passage ranges differ");
      previous.questions.push(question);
    } else {
      if (previous && question.startSample < previous.endSample)
        fail("neighboring question speech overlaps");
      groups.push({
        section,
        questions: [question],
        startSample: question.startSample,
        endSample: question.endSample,
        leadingSilenceMs,
        trailingSilenceMs,
      });
    }
  }
  for (const group of groups)
    if (
      !sameNumbers(
        group.questions.map((q) => q.sourceNumber),
        group.section.questionNumbers,
      )
    )
      fail("shared dialogue question set incomplete");
  for (const scope of scopes.values())
    if (!sameNumbers(scope.numbers, scope.actual))
      fail("common numbering scope is incomplete or reordered");
  // Deduplicated groups cover genuine common passages once. A VAD island in
  // an internal gap may be a missed second broadcast and must never disappear.
  const firstSample = groups[0].startSample;
  const lastSample = groups.at(-1)!.endSample;
  for (const event of activity.events) {
    if (
      event.startSample >= firstSample &&
      event.endSample <= lastSample &&
      // Only complete-source admission owns gaps between independently staged passages.
      // Within each selected range, all source events still have exactly one owner.
      (!staged ||
        groups.some(
          (g) =>
            event.startSample < g.endSample && event.endSample > g.startSample,
        )) &&
      groups.filter(
        (g) =>
          event.startSample >= g.startSample && event.endSample <= g.endSample,
      ).length !== 1
    )
      fail("unassigned source activity between question passages");
  }
  return groups;
}
