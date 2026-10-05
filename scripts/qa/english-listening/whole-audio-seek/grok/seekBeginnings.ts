/**
 * Whole-original seek beginnings for audio-reconstructed national listening.
 *
 * The stored question sourceNumber is the generated ordinal. Spoken item
 * numbers come only from announcer cue text plus the reconstruction's
 * grounding segment ids. ASR times stay estimates: nativeEvidence is set
 * only when a sample clock is actually measured.
 */
/**
 * Copied from src/lib/english/listening/questionAudioProof.ts
 * questionAudioCueNumbers. This runner does not import the app module so it
 * can execute with Node alone. The test locks these literals to that file.
 */
const spokenCueNumbers = [
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
  const numberWord = "(?:[1-9]\\d?|" + spokenCueNumbers.slice(1).join("|") + ")";
  const korean = new RegExp(
    `^(\\d{1,2})\\s*번(?:\\s*(?:부터|~|～|-|과|와)\\s*(\\d{1,2})\\s*번)?`,
  );
  const english = new RegExp(
    `^(?:number|questions?)\\s+(${numberWord})(?:\\s*(?:and|to|through|~|-)\\s*(?:number\\s+)?(${numberWord}))?\\b`,
  );
  const matched = korean.exec(value) ?? english.exec(value);
  if (!matched) return [];
  const asNumber = (word: string) =>
    /^\d+$/.test(word) ? Number(word) : spokenCueNumbers.indexOf(word);
  const first = asNumber(matched[1]),
    last = matched[2] ? asNumber(matched[2]) : first;
  if (first < 1 || last < first || last > 30) return [];
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

export const MARKS_SCHEMA_VERSION = 1;
export const MARKS_PROVIDER = "grok";

export type SeekStatus = "candidate" | "held" | "existing_verified";

export type AsrSegment = {
  id: number;
  text: string;
  uncertain: boolean;
  estimatedStartSeconds: number;
  estimatedEndSeconds?: number;
  avgLogProbability?: number;
  noSpeechProbability?: number;
  compressionRatio?: number;
};

export type GroundingItem = {
  generatedOrdinal: number;
  sourceSegmentIds: number[];
  evidenceQuotes: string[];
  asrUncertain?: boolean;
  included?: boolean;
};

export type PreparedQuestion = {
  id: string;
  sourceNumber: number;
};

export type InventoryQuestion = {
  questionId: string;
  sourceNumber: number;
  existingStartMs?: number | null;
  existingEndMs?: number | null;
};

export type SourceInput = {
  sourceRecordId: string;
  setId: string;
  revision: number;
  questions: InventoryQuestion[];
  preparedQuestions: PreparedQuestion[];
  grounding: GroundingItem[];
  segments: AsrSegment[];
  sourceAudioSha256: string;
  actualSourceAudioSha256: string | null;
  playbackSha256: string;
  playbackDurationMs: number;
  asrPath: string;
  asrSha256: string;
  actualAsrSha256: string | null;
  preparedSha256: string;
  actualPreparedSha256: string | null;
  asrDurationMs: number | null;
  asrDeclaredSourceAudioSha256: string | null;
  documentSha256: string;
  alignmentPath: string;
  alignmentSha256: string;
  actualAlignmentSha256: string | null;
  alignmentAnchorsByQuestionId: Record<string, number[]>;
};

export type MappingEvidence = {
  alignment: { path: string; sha256: string };
  questionId: string;
  method: "verified_generation_evidence_segments";
  sourceSegmentIds: number[];
};

export type NativeEvidence = {
  sourceAudioSha256: string;
  sampleRate: number;
  startFrame: number;
  probe: { path: string; sha256: string };
  probeOffsetFrame: number;
  probeFrameCount: number;
  cueProbeSegmentIds: number[];
  cueOnsetFrame: number;
  pcmSha256: string;
  decodedAudioSha256: string;
  channels: number;
  pcmLayout: "float32le-interleaved";
};

export type SeekRecord = {
  sourceRecordId: string;
  setId: string;
  revision: number;
  questionId: string;
  sourceNumber: number;
  status: SeekStatus;
  seekStartMs: number | null;
  seekEndMs: number | null;
  sourceAudioSha256: string;
  playbackSha256: string;
  asrPath: string;
  asrSha256: string;
  documentSha256: string;
  evidenceContractVersion: 1;
  cueSegmentIds: number[];
  anchorSegmentIds: number[];
  cueTexts: string[];
  anchorTexts: string[];
  cueNumber: number | null;
  scopeQuestionNumbers: number[];
  mappingEvidence: MappingEvidence | null;
  nativeEvidence: NativeEvidence | null;
  reasons: string[];
};

export type MarksFile = {
  schemaVersion: 1;
  evidenceContractVersion: 1;
  provider: "grok";
  inventorySha256: string;
  records: SeekRecord[];
};

type CueKind = "ordinal" | "dotted_instruction";

type ParsedCue = {
  numbers: number[];
  outOfRange: boolean;
  kind: CueKind | null;
};

type Passage = {
  kind: "passage";
  openedNumbers: number[];
  numbers: number[];
  cueSegmentIds: number[];
  dottedCueIds: number[];
  startSeconds: number;
  definingCueId: number;
  flags: Array<"duplicate_ordinal" | "non_monotonic">;
  narrowed: boolean;
  segmentIds: number[];
};

type Ambiguous = {
  kind: "ambiguous";
  reason: "uncertain_cue" | "out_of_range_cue";
  observedNumbers: number[];
  cueSegmentIds: number[];
  segmentIds: number[];
};

type Preface = { kind: "preface"; segmentIds: number[] };

type Region = Passage | Ambiguous | Preface;

type AnchorClass =
  | {
      ok: true;
      passage: Passage;
      scope: number[];
      cueSegmentIds: number[];
    }
  | {
      ok: false;
      reasons: string[];
      cueSegmentIds: number[];
      observedNumbers: number[];
    };

/** Digit-dot announcer lines the ordinal regex does not see. Choice lists stay out. */
export function dottedInstructionCueNumbers(
  text: string,
): number[] | "out_of_range" | null {
  const match = /^(\d{1,3})[.．]\s*([\s\S]+)$/.exec(text.trim());
  if (!match) return null;
  const rest = match[2].trim();
  const instruction =
    /듣고[\s\S]*고르시(?:오|요|어)?[.。]?\s*$/.test(rest) ||
    /^(?:listen to|after listening)\b[\s\S]*\bchoose\b/i.test(rest);
  if (!instruction) return null;
  const number = Number(match[1]);
  if (!Number.isInteger(number) || number < 1 || number > 30)
    return "out_of_range";
  return [number];
}

export function parseCue(text: string): ParsedCue {
  const ordinal = questionAudioCueNumbers(text);
  if (ordinal.length) return { numbers: ordinal, outOfRange: false, kind: "ordinal" };
  const dotted = dottedInstructionCueNumbers(text);
  if (Array.isArray(dotted))
    return { numbers: dotted, outOfRange: false, kind: "dotted_instruction" };
  if (dotted === "out_of_range")
    return { numbers: [], outOfRange: true, kind: "dotted_instruction" };
  const bare = /^(\d{1,3})\s*번/.exec(text.trim());
  if (bare) {
    const number = Number(bare[1]);
    if (number < 1 || number > 30)
      return { numbers: [], outOfRange: true, kind: "ordinal" };
  }
  const english = /^(?:number|questions?)\s+(\d{1,3})\b/i.exec(text.trim());
  if (english) {
    const number = Number(english[1]);
    if (number < 1 || number > 30)
      return { numbers: [], outOfRange: true, kind: "ordinal" };
  }
  return { numbers: [], outOfRange: false, kind: null };
}

/** English speech. A Korean instruction with one embedded gloss is not dialogue. */
export function hasDialogue(text: string): boolean {
  if (/[가-힣]/.test(text)) return false;
  return /[A-Za-z]{2,}/.test(text);
}

export function secondsToMs(seconds: number): number | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0)
    return null;
  const ms = Math.round(seconds * 1000);
  return Number.isSafeInteger(ms) ? ms : null;
}

/** Source clock used for admitted starts. Truncation is not a bounds repair. */
export function frameToMs(startFrame: number, sampleRate: number): number | null {
  if (
    !Number.isSafeInteger(startFrame) ||
    startFrame < 0 ||
    !Number.isSafeInteger(sampleRate) ||
    sampleRate < 1
  )
    return null;
  const ms = Math.floor((startFrame * 1000) / sampleRate);
  return Number.isSafeInteger(ms) ? ms : null;
}

export function metricsUncertain(segment: AsrSegment): boolean {
  if (segment.uncertain) return true;
  const logprob = segment.avgLogProbability;
  const compression = segment.compressionRatio;
  const noSpeech = segment.noSpeechProbability;
  if (typeof logprob !== "number") return false;
  return (
    logprob < -1 ||
    (typeof compression === "number" && compression > 2.4) ||
    (typeof noSpeech === "number" &&
      noSpeech > 0.6 &&
      logprob < -0.6)
  );
}

function sameNumbers(left: number[], right: number[]): boolean {
  return left.length === right.length && left.every((n, i) => n === right[i]);
}

function isNarrowing(current: number[], next: number[]): boolean {
  if (next.length === 0 || next.length >= current.length) return false;
  const allowed = new Set(current);
  return next.every((n) => allowed.has(n));
}

function usableSegment(segment: AsrSegment): boolean {
  return Number.isSafeInteger(segment.id) && segment.id >= 1;
}

export function buildRegions(segments: AsrSegment[]): Region[] {
  const regions: Region[] = [];
  let current: Region | null = null;
  let seenDialogue = false;
  const used = new Set<number>();

  const closePassage = () => {
    if (current?.kind === "passage") {
      for (const n of current.numbers) used.add(n);
    }
  };

  for (const segment of segments) {
    if (!usableSegment(segment)) continue;
    const parsed = parseCue(segment.text);
    const cueLike = parsed.numbers.length > 0 || parsed.outOfRange;
    if (segment.uncertain && cueLike) {
      closePassage();
      current = {
        kind: "ambiguous",
        reason: parsed.outOfRange ? "out_of_range_cue" : "uncertain_cue",
        observedNumbers: parsed.numbers,
        cueSegmentIds: [segment.id],
        segmentIds: [segment.id],
      };
      seenDialogue = false;
      regions.push(current);
      continue;
    }
    if (!segment.uncertain && parsed.outOfRange) {
      closePassage();
      current = {
        kind: "ambiguous",
        reason: "out_of_range_cue",
        observedNumbers: [],
        cueSegmentIds: [segment.id],
        segmentIds: [segment.id],
      };
      seenDialogue = false;
      regions.push(current);
      continue;
    }
    if (!segment.uncertain && parsed.numbers.length > 0 && parsed.kind) {
      const numbers = parsed.numbers;
      if (
        current?.kind === "passage" &&
        sameNumbers(current.numbers, numbers) &&
        !seenDialogue
      ) {
        current.cueSegmentIds.push(segment.id);
        if (parsed.kind === "dotted_instruction")
          current.dottedCueIds.push(segment.id);
        current.segmentIds.push(segment.id);
        continue;
      }
      if (
        current?.kind === "passage" &&
        current.openedNumbers.length > 1 &&
        isNarrowing(current.openedNumbers, numbers) &&
        seenDialogue
      ) {
        current.cueSegmentIds.push(segment.id);
        if (parsed.kind === "dotted_instruction")
          current.dottedCueIds.push(segment.id);
        current.segmentIds.push(segment.id);
        continue;
      }
      if (
        current?.kind === "passage" &&
        !seenDialogue &&
        isNarrowing(current.openedNumbers, numbers)
      ) {
        current.openedNumbers = numbers;
        current.numbers = numbers;
        current.narrowed = true;
        current.definingCueId = segment.id;
        current.startSeconds = segment.estimatedStartSeconds;
        current.cueSegmentIds = [segment.id];
        current.dottedCueIds =
          parsed.kind === "dotted_instruction" ? [segment.id] : [];
        current.segmentIds.push(segment.id);
        continue;
      }
      const flags: Passage["flags"] = [];
      if (numbers.some((n) => used.has(n))) flags.push("duplicate_ordinal");
      const previousFirst =
        current?.kind === "passage" ? current.numbers[0] : null;
      const maxUsed = used.size > 0 ? Math.max(...used) : null;
      if (
        (previousFirst != null && numbers[0] < previousFirst) ||
        (maxUsed != null && numbers[0] < maxUsed)
      )
        flags.push("non_monotonic");
      closePassage();
      const start = segment.estimatedStartSeconds;
      current = {
        kind: "passage",
        openedNumbers: numbers,
        numbers,
        cueSegmentIds: [segment.id],
        dottedCueIds: parsed.kind === "dotted_instruction" ? [segment.id] : [],
        startSeconds: start,
        definingCueId: segment.id,
        flags,
        narrowed: false,
        segmentIds: [segment.id],
      };
      seenDialogue = false;
      regions.push(current);
      continue;
    }
    if (!current) {
      current = { kind: "preface", segmentIds: [] };
      regions.push(current);
    }
    current.segmentIds.push(segment.id);
    if (!segment.uncertain && hasDialogue(segment.text)) seenDialogue = true;
  }
  return regions;
}

function indexRegions(regions: Region[]): Map<number, Region> {
  const map = new Map<number, Region>();
  for (const region of regions) {
    for (const id of region.segmentIds) {
      if (map.has(id)) throw new Error("segment assigned to two regions");
      map.set(id, region);
    }
  }
  return map;
}

function classifyAnchors(
  anchorIds: number[],
  regions: Map<number, Region>,
): AnchorClass {
  const found: Region[] = [];
  for (const id of anchorIds) {
    const region = regions.get(id);
    if (!region) {
      return {
        ok: false,
        reasons: ["held_anchor_segment_missing"],
        cueSegmentIds: [],
        observedNumbers: [],
      };
    }
    if (!found.includes(region)) found.push(region);
  }
  if (found.length !== 1) {
    const observed = found.flatMap((region) =>
      region.kind === "passage"
        ? region.numbers
        : region.kind === "ambiguous"
          ? region.observedNumbers
          : [],
    );
    return {
      ok: false,
      reasons: ["held_anchors_span_multiple_passages"],
      cueSegmentIds: found.flatMap((region) =>
        region.kind === "preface" ? [] : region.cueSegmentIds,
      ),
      observedNumbers: observed,
    };
  }
  const region = found[0];
  if (region.kind === "preface") {
    return {
      ok: false,
      reasons: ["held_anchor_before_first_cue"],
      cueSegmentIds: [],
      observedNumbers: [],
    };
  }
  if (region.kind === "ambiguous") {
    return {
      ok: false,
      reasons: [
        region.reason === "uncertain_cue"
          ? "held_uncertain_cue"
          : "held_out_of_range_cue",
      ],
      cueSegmentIds: region.cueSegmentIds,
      observedNumbers: region.observedNumbers,
    };
  }
  if (region.flags.length > 0) {
    return {
      ok: false,
      reasons: region.flags.map((flag) =>
        flag === "duplicate_ordinal"
          ? "held_duplicate_ordinal"
          : "held_non_monotonic_cue",
      ),
      cueSegmentIds: region.cueSegmentIds,
      observedNumbers: region.numbers,
    };
  }
  const scope = anchorIds.every((id) => id >= region.definingCueId)
    ? region.numbers
    : region.openedNumbers;
  return { ok: true, passage: region, scope, cueSegmentIds: region.cueSegmentIds };
}

function bindingProblems(source: SourceInput): string[] {
  const reasons: string[] = [];
  if (source.actualSourceAudioSha256 == null)
    reasons.push("held_source_audio_missing");
  else if (source.actualSourceAudioSha256 !== source.sourceAudioSha256)
    reasons.push(
      `held_source_audio_hash_mismatch:actual:${source.actualSourceAudioSha256}`,
    );
  if (source.actualAsrSha256 == null) reasons.push("held_asr_missing");
  else if (source.actualAsrSha256 !== source.asrSha256)
    reasons.push(`held_asr_hash_mismatch:actual:${source.actualAsrSha256}`);
  if (source.actualPreparedSha256 == null) reasons.push("held_prepared_missing");
  else if (source.actualPreparedSha256 !== source.preparedSha256)
    reasons.push(
      `held_prepared_hash_mismatch:actual:${source.actualPreparedSha256}`,
    );
  if (source.asrDeclaredSourceAudioSha256 !== source.sourceAudioSha256)
    reasons.push("held_asr_source_audio_binding");
  if (source.actualAlignmentSha256 == null)
    reasons.push("held_alignment_missing");
  else if (source.actualAlignmentSha256 !== source.alignmentSha256)
    reasons.push("held_alignment_hash_mismatch");
  if (source.asrDurationMs == null) reasons.push("held_missing_asr_duration");
  else if (Math.abs(source.asrDurationMs - source.playbackDurationMs) > 1500)
    reasons.push("held_playback_timeline_mismatch");
  const ids = source.segments.filter(usableSegment).map((segment) => segment.id);
  if (new Set(ids).size !== ids.length)
    reasons.push("held_duplicate_asr_segment_id");
  return reasons;
}

function frozenEndpoint(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    return null;
  return value;
}

function segmentTexts(
  ids: number[],
  segmentsById: Map<number, AsrSegment>,
): string[] {
  return ids.map((id) => segmentsById.get(id)?.text ?? "");
}

function mappingFor(
  source: SourceInput,
  questionId: string,
  anchorIds: number[],
): MappingEvidence | null {
  if (
    source.actualAlignmentSha256 == null ||
    source.actualAlignmentSha256 !== source.alignmentSha256
  )
    return null;
  const aligned = source.alignmentAnchorsByQuestionId[questionId];
  if (!aligned || aligned.length !== anchorIds.length) return null;
  if (aligned.some((id, index) => id !== anchorIds[index])) return null;
  return {
    alignment: { path: source.alignmentPath, sha256: source.alignmentSha256 },
    questionId,
    method: "verified_generation_evidence_segments",
    sourceSegmentIds: [...anchorIds],
  };
}

function baseRecord(
  source: SourceInput,
  question: InventoryQuestion,
  patch: Pick<
    SeekRecord,
    | "status"
    | "seekStartMs"
    | "seekEndMs"
    | "cueSegmentIds"
    | "anchorSegmentIds"
    | "cueTexts"
    | "anchorTexts"
    | "cueNumber"
    | "scopeQuestionNumbers"
    | "mappingEvidence"
    | "nativeEvidence"
    | "reasons"
  >,
): SeekRecord {
  return {
    sourceRecordId: source.sourceRecordId,
    setId: source.setId,
    revision: source.revision,
    questionId: question.questionId,
    sourceNumber: question.sourceNumber,
    status: patch.status,
    seekStartMs: patch.seekStartMs,
    seekEndMs: patch.seekEndMs,
    sourceAudioSha256: source.sourceAudioSha256,
    playbackSha256: source.playbackSha256,
    asrPath: source.asrPath,
    asrSha256: source.asrSha256,
    documentSha256: source.documentSha256,
    evidenceContractVersion: 1,
    cueSegmentIds: patch.cueSegmentIds,
    anchorSegmentIds: patch.anchorSegmentIds,
    cueTexts: patch.cueTexts,
    anchorTexts: patch.anchorTexts,
    cueNumber: patch.cueNumber,
    scopeQuestionNumbers: patch.scopeQuestionNumbers,
    mappingEvidence: patch.mappingEvidence,
    nativeEvidence: patch.nativeEvidence,
    reasons: patch.reasons,
  };
}

function observedReason(numbers: number[]): string | null {
  if (numbers.length === 0) return null;
  return `observed_numbers:${numbers.join("+")}`;
}

function heldRecord(
  source: SourceInput,
  question: InventoryQuestion,
  reasons: string[],
  extra?: {
    cueSegmentIds?: number[];
    cueTexts?: string[];
    anchorSegmentIds?: number[];
    anchorTexts?: string[];
    observedNumbers?: number[];
    mappingEvidence?: MappingEvidence | null;
  },
): SeekRecord {
  const observed = observedReason(extra?.observedNumbers ?? []);
  return baseRecord(source, question, {
    status: "held",
    seekStartMs: null,
    seekEndMs: null,
    cueSegmentIds: extra?.cueSegmentIds ?? [],
    anchorSegmentIds: extra?.anchorSegmentIds ?? [],
    cueTexts: extra?.cueTexts ?? [],
    anchorTexts: extra?.anchorTexts ?? [],
    cueNumber: null,
    scopeQuestionNumbers: [],
    mappingEvidence: extra?.mappingEvidence ?? null,
    nativeEvidence: null,
    reasons: observed ? [...reasons, observed] : reasons,
  });
}

function assessQuestion(
  source: SourceInput,
  question: InventoryQuestion,
  preparedById: Map<string, PreparedQuestion[]>,
  groundingByOrdinal: Map<number, GroundingItem[]>,
  segmentsById: Map<number, AsrSegment>,
  regions: Map<number, Region>,
  seenQuestionIds: Set<string>,
): SeekRecord {
  const preservedStart = frozenEndpoint(question.existingStartMs);
  const preservedEnd = frozenEndpoint(question.existingEndMs);
  if (preservedStart != null && preservedEnd != null && preservedEnd > preservedStart) {
    return baseRecord(source, question, {
      status: "existing_verified",
      seekStartMs: preservedStart,
      seekEndMs: preservedEnd,
      cueSegmentIds: [],
      anchorSegmentIds: [],
      cueTexts: [],
      anchorTexts: [],
      cueNumber: null,
      scopeQuestionNumbers: [],
      mappingEvidence: null,
      nativeEvidence: null,
      reasons: ["existing_verified_range_preserved"],
    });
  }
  if (seenQuestionIds.has(question.questionId))
    return heldRecord(source, question, ["held_duplicate_question_id"]);
  seenQuestionIds.add(question.questionId);

  const prepared = preparedById.get(question.questionId) ?? [];
  if (prepared.length !== 1)
    return heldRecord(source, question, ["held_question_identity"]);
  const grounding = groundingByOrdinal.get(prepared[0].sourceNumber) ?? [];
  if (grounding.length === 0)
    return heldRecord(source, question, ["held_missing_grounding"]);
  if (grounding.length !== 1)
    return heldRecord(source, question, ["held_duplicate_grounding"]);
  const item = grounding[0];
  const anchorIds = item.sourceSegmentIds;
  if (!anchorIds.length || anchorIds.some((id) => !Number.isSafeInteger(id)))
    return heldRecord(source, question, ["held_missing_grounding"]);

  const reasons: string[] = [];
  if (prepared[0].sourceNumber !== question.sourceNumber)
    reasons.push("inventory_source_number_differs_from_prepared_ordinal");
  if (item.included === false) reasons.push("held_grounding_not_included");
  if (item.asrUncertain === true) reasons.push("held_grounding_uncertain");
  if (
    anchorIds.some((id) => {
      const segment = segmentsById.get(id);
      return segment ? metricsUncertain(segment) : false;
    })
  )
    reasons.push("held_uncertain_anchor");
  if (anchorIds.some((id) => !segmentsById.has(id)))
    reasons.push("held_anchor_segment_missing");

  const quotes = item.evidenceQuotes ?? [];
  const joined = anchorIds
    .map((id) => segmentsById.get(id)?.text ?? "")
    .join(" ");
  if (
    quotes.length === 0 ||
    quotes.some((quote) => quote.length === 0 || !joined.includes(quote))
  )
    reasons.push("held_evidence_quote_mismatch");

  let classified: AnchorClass | null = null;
  if (!reasons.includes("held_anchor_segment_missing"))
    classified = classifyAnchors(anchorIds, regions);
  if (classified && !classified.ok) reasons.push(...classified.reasons);
  if (
    classified?.ok &&
    classified.cueSegmentIds.some((id) => {
      const segment = segmentsById.get(id);
      return segment ? metricsUncertain(segment) : true;
    })
  )
    reasons.push("held_uncertain_cue");
  const mapping = mappingFor(source, question.questionId, anchorIds);
  if (!mapping) reasons.push("held_alignment_anchor_mismatch");

  const blocking = reasons.some((reason) => reason.startsWith("held_"));
  if (blocking || !classified || !classified.ok) {
    return heldRecord(source, question, reasons, {
      anchorSegmentIds: anchorIds,
      anchorTexts: segmentTexts(anchorIds, segmentsById),
      cueSegmentIds: classified && !classified.ok ? classified.cueSegmentIds : [],
      cueTexts: segmentTexts(
        classified && !classified.ok ? classified.cueSegmentIds : [],
        segmentsById,
      ),
      observedNumbers:
        classified && !classified.ok ? classified.observedNumbers : [],
      mappingEvidence: mapping,
    });
  }

  const seekStartMs = secondsToMs(classified.passage.startSeconds);
  const limit =
    source.asrDurationMs == null
      ? source.playbackDurationMs
      : Math.min(source.playbackDurationMs, source.asrDurationMs);
  const anchorStarts = anchorIds.map(
    (id) => segmentsById.get(id)?.estimatedStartSeconds,
  );
  if (
    seekStartMs == null ||
    !Number.isSafeInteger(limit) ||
    seekStartMs >= limit
  )
    reasons.push("held_seek_outside_duration");
  if (
    anchorStarts.some((start) => typeof start !== "number" || !Number.isFinite(start))
  )
    reasons.push("held_missing_anchor_timestamp");
  else if (
    typeof classified.passage.startSeconds === "number" &&
    classified.passage.startSeconds >
      Math.min(...(anchorStarts as number[])) + 0.5
  )
    reasons.push("held_cue_time_after_anchor");

  if (reasons.some((reason) => reason.startsWith("held_"))) {
    return heldRecord(source, question, reasons, {
      anchorSegmentIds: anchorIds,
      cueSegmentIds: classified.cueSegmentIds,
      observedNumbers: classified.scope,
    });
  }

  const cueNumber = classified.scope[0] ?? null;
  const candidateReasons = [
    "seek_start_is_asr_cue_estimate",
    "cue_recovered_from_anchor_position",
    "evidence_quotes_match_joined_anchor_text",
    "source_audio_hash_verified",
    "asr_hash_verified",
    "prepared_hash_verified",
    "generated_ordinal_not_used_as_evidence",
    `playback_duration_delta_ms:${(source.asrDurationMs ?? 0) - source.playbackDurationMs}`,
    "playback_sha_from_live_snapshot",
    "alignment_anchor_ids_match_grounding",
    "native_clock_not_measured",
    ...reasons,
  ];
  if (cueNumber !== question.sourceNumber)
    candidateReasons.push("generated_ordinal_differs_from_cue_number");
  if (classified.scope.length > 1)
    candidateReasons.push("shared_source_passage");
  if (classified.passage.narrowed)
    candidateReasons.push("narrowed_shared_announcement");
  if (classified.passage.dottedCueIds.length > 0)
    candidateReasons.push("dotted_instruction_cue");

  return baseRecord(source, question, {
    status: "candidate",
    seekStartMs,
    seekEndMs: null,
    cueSegmentIds: classified.cueSegmentIds,
    anchorSegmentIds: anchorIds,
    cueTexts: segmentTexts(classified.cueSegmentIds, segmentsById),
    anchorTexts: segmentTexts(anchorIds, segmentsById),
    cueNumber,
    scopeQuestionNumbers: classified.scope,
    mappingEvidence: mapping,
    nativeEvidence: null,
    reasons: candidateReasons,
  });
}

export function buildSourceRecords(source: SourceInput): SeekRecord[] {
  const problems = bindingProblems(source);
  if (problems.length > 0) {
    return source.questions.map((question) => {
      const preservedStart = frozenEndpoint(question.existingStartMs);
      const preservedEnd = frozenEndpoint(question.existingEndMs);
      if (
        preservedStart != null &&
        preservedEnd != null &&
        preservedEnd > preservedStart
      ) {
        return baseRecord(source, question, {
          status: "existing_verified",
          seekStartMs: preservedStart,
          seekEndMs: preservedEnd,
          cueSegmentIds: [],
          anchorSegmentIds: [],
          cueTexts: [],
          anchorTexts: [],
          cueNumber: null,
          scopeQuestionNumbers: [],
          mappingEvidence: null,
          nativeEvidence: null,
          reasons: ["existing_verified_range_preserved", ...problems],
        });
      }
      return heldRecord(source, question, problems);
    });
  }

  const preparedById = new Map<string, PreparedQuestion[]>();
  for (const question of source.preparedQuestions) {
    const list = preparedById.get(question.id) ?? [];
    list.push(question);
    preparedById.set(question.id, list);
  }
  const groundingByOrdinal = new Map<number, GroundingItem[]>();
  for (const item of source.grounding) {
    const list = groundingByOrdinal.get(item.generatedOrdinal) ?? [];
    list.push(item);
    groundingByOrdinal.set(item.generatedOrdinal, list);
  }
  const segmentsById = new Map<number, AsrSegment>();
  for (const segment of source.segments) {
    if (usableSegment(segment)) segmentsById.set(segment.id, segment);
  }
  const regions = indexRegions(buildRegions(source.segments));
  const seen = new Set<string>();
  return enforceSpokenOrder(
    source.questions.map((question) =>
      assessQuestion(
        source,
        question,
        preparedById,
        groundingByOrdinal,
        segmentsById,
        regions,
        seen,
      ),
    ),
  );
}

export function buildMarks(
  sources: SourceInput[],
  inventorySha256: string,
): MarksFile {
  return {
    schemaVersion: MARKS_SCHEMA_VERSION,
    evidenceContractVersion: 1,
    provider: MARKS_PROVIDER,
    inventorySha256,
    records: sources.flatMap((source) => buildSourceRecords(source)),
  };
}

function scopeKey(scope: number[]): string {
  return scope.join(",");
}

/** Spoken order owns start order. Equal starts must be the same scope. */
export function enforceSpokenOrder(records: SeekRecord[]): SeekRecord[] {
  const byScope = new Map<string, { start: number; scope: number[] }>();
  const conflict = new Set<string>();
  for (const record of records) {
    if (record.status !== "candidate" || record.seekStartMs == null) continue;
    const key = scopeKey(record.scopeQuestionNumbers);
    const previous = byScope.get(key);
    if (!previous) {
      byScope.set(key, {
        start: record.seekStartMs,
        scope: record.scopeQuestionNumbers,
      });
    } else if (previous.start !== record.seekStartMs) conflict.add(key);
  }
  const ordered = [...byScope.values()].sort(
    (left, right) => left.scope[0] - right.scope[0] || left.scope.length - right.scope.length,
  );
  for (let index = 1; index < ordered.length; index += 1) {
    const earlier = ordered[index - 1];
    const current = ordered[index];
    if (current.start < earlier.start || current.start === earlier.start)
      conflict.add(scopeKey(current.scope));
    if (current.start === earlier.start) conflict.add(scopeKey(earlier.scope));
  }
  if (conflict.size === 0) return records;
  return records.map((record) => {
    if (record.status !== "candidate") return record;
    const key = scopeKey(record.scopeQuestionNumbers);
    if (!conflict.has(key)) return record;
    return {
      ...record,
      status: "held",
      seekStartMs: null,
      cueNumber: null,
      scopeQuestionNumbers: [],
      nativeEvidence: null,
      reasons: [
        ...record.reasons.filter(
          (reason) => reason !== "seek_start_uses_source_frame_clock",
        ),
        "held_spoken_start_order",
      ],
    };
  });
}

const HEX64 = /^[0-9a-f]{64}$/;

/** Replace an ASR estimate with a measured source frame. Returns null when the clock is not admissible. */
export function publishNativeStart(
  record: SeekRecord,
  native: NativeEvidence,
): SeekRecord | null {
  if (record.status !== "candidate" || !Number.isSafeInteger(record.seekStartMs))
    return null;
  if (native.sourceAudioSha256 !== record.sourceAudioSha256) return null;
  if (native.pcmLayout !== "float32le-interleaved") return null;
  if (!HEX64.test(native.pcmSha256) || !HEX64.test(native.probe.sha256))
    return null;
  if (!HEX64.test(native.decodedAudioSha256)) return null;
  if (
    !Number.isSafeInteger(native.startFrame) ||
    !Number.isSafeInteger(native.cueOnsetFrame) ||
    !Number.isSafeInteger(native.sampleRate) ||
    !Number.isSafeInteger(native.probeFrameCount) ||
    !Number.isSafeInteger(native.probeOffsetFrame) ||
    native.sampleRate < 1 ||
    native.startFrame < 0 ||
    native.probeOffsetFrame !== native.startFrame ||
    native.probeFrameCount < 1 ||
    native.probeFrameCount / native.sampleRate > 120
  )
    return null;
  if (native.startFrame > native.cueOnsetFrame) return null;
  if (
    native.cueProbeSegmentIds.length === 0 ||
    native.cueProbeSegmentIds.some((id) => !record.cueSegmentIds.includes(id))
  )
    return null;
  const seek = frameToMs(native.startFrame, native.sampleRate);
  const onset = frameToMs(native.cueOnsetFrame, native.sampleRate);
  if (seek == null || onset == null || seek > onset || onset - seek > 500)
    return null;
  const asrMs = record.seekStartMs;
  return {
    ...record,
    seekStartMs: seek,
    nativeEvidence: native,
    reasons: [
      ...record.reasons.filter(
        (reason) =>
          reason !== "native_clock_not_measured" &&
          reason !== "seek_start_is_asr_cue_estimate",
      ),
      "seek_start_uses_source_frame_clock",
      `asr_cue_estimate_ms:${asrMs}`,
    ],
  };
}

export function auditMarks(
  sources: SourceInput[],
  marks: MarksFile,
  inventorySha256: string,
  options?: { requireNative?: boolean },
): string[] {
  const problems: string[] = [];
  if (marks.schemaVersion !== 1) problems.push("schema");
  if (marks.evidenceContractVersion !== 1) problems.push("contract");
  if (marks.provider !== "grok") problems.push("provider");
  if (marks.inventorySha256 !== inventorySha256) problems.push("inventory hash");
  const expected = sources.flatMap((source) =>
    source.questions.map((question) => ({
      sourceRecordId: source.sourceRecordId,
      questionId: question.questionId,
      sourceNumber: question.sourceNumber,
      setId: source.setId,
      revision: source.revision,
      documentSha256: source.documentSha256,
    })),
  );
  if (marks.records.length !== expected.length)
    problems.push(`count ${marks.records.length} != ${expected.length}`);
  const seen = new Set<string>();
  marks.records.forEach((record, index) => {
    const want = expected[index];
    if (!want) return;
    if (
      record.sourceRecordId !== want.sourceRecordId ||
      record.questionId !== want.questionId ||
      record.sourceNumber !== want.sourceNumber ||
      record.setId !== want.setId ||
      record.revision !== want.revision ||
      record.documentSha256 !== want.documentSha256 ||
      record.evidenceContractVersion !== 1
    )
      problems.push(`identity ${record.questionId}`);
    if (seen.has(record.questionId))
      problems.push(`duplicate record ${record.questionId}`);
    seen.add(record.questionId);
    if (record.status === "candidate") {
      if (record.seekEndMs !== null)
        problems.push(`candidate end ${record.questionId}`);
      if (!record.mappingEvidence)
        problems.push(`candidate mapping ${record.questionId}`);
      if (!Number.isSafeInteger(record.seekStartMs))
        problems.push(`candidate seek ${record.questionId}`);
      if (record.scopeQuestionNumbers.length === 0)
        problems.push(`candidate scope ${record.questionId}`);
      if (record.cueNumber !== record.scopeQuestionNumbers[0])
        problems.push(`candidate cue ${record.questionId}`);
      if (record.cueSegmentIds.length === 0 || record.anchorSegmentIds.length === 0)
        problems.push(`candidate refs ${record.questionId}`);
      const requireNative = options?.requireNative === true;
      if (requireNative)
        problems.push(`energy_onset_is_not_recognition ${record.questionId}`);
      for (const reason of requireNative
        ? ["generated_ordinal_not_used_as_evidence", "seek_start_uses_source_frame_clock"]
        : [
            "seek_start_is_asr_cue_estimate",
            "generated_ordinal_not_used_as_evidence",
            "native_clock_not_measured",
          ]) {
        if (!record.reasons.includes(reason))
          problems.push(`missing ${reason} ${record.questionId}`);
      }
      if (requireNative) {
        const native = record.nativeEvidence;
        const seek =
          native == null ? null : frameToMs(native.startFrame, native.sampleRate);
        const onset =
          native == null
            ? null
            : frameToMs(native.cueOnsetFrame, native.sampleRate);
        if (
          native == null ||
          seek == null ||
          onset == null ||
          record.seekStartMs !== seek ||
          native.startFrame > native.cueOnsetFrame ||
          seek > onset ||
          onset - seek > 500 ||
          native.probeOffsetFrame !== native.startFrame ||
          native.probeFrameCount < 1 ||
          native.probeFrameCount / native.sampleRate > 120 ||
          native.sourceAudioSha256 !== record.sourceAudioSha256 ||
          native.pcmLayout !== "float32le-interleaved" ||
          !/^[0-9a-f]{64}$/.test(native.pcmSha256) ||
          !/^[0-9a-f]{64}$/.test(native.probe.sha256) ||
          native.cueProbeSegmentIds.length === 0 ||
          native.cueProbeSegmentIds.some((id) => !record.cueSegmentIds.includes(id)) ||
          !record.reasons.some((reason) => /^asr_cue_estimate_ms:\d+$/.test(reason)) ||
          record.reasons.includes("native_clock_not_measured") ||
          record.reasons.includes("seek_start_is_asr_cue_estimate")
        )
          problems.push(`native ${record.questionId}`);
      } else if (record.nativeEvidence != null) {
        problems.push(`provisional native ${record.questionId}`);
      }
      if (
        record.sourceNumber !== record.cueNumber &&
        !record.reasons.includes("generated_ordinal_differs_from_cue_number")
      )
        problems.push(`missing differs ${record.questionId}`);
      if (
        record.scopeQuestionNumbers.length > 1 &&
        !record.reasons.includes("shared_source_passage")
      )
        problems.push(`missing shared ${record.questionId}`);
      if (record.reasons.some((reason) => reason.startsWith("held_")))
        problems.push(`candidate held reason ${record.questionId}`);
    } else if (record.status === "held") {
      if (record.seekStartMs !== null || record.cueNumber !== null)
        problems.push(`held published a start ${record.questionId}`);
      if (!record.reasons.some((reason) => reason.startsWith("held_")))
        problems.push(`held without reason ${record.questionId}`);
    } else if (record.status === "existing_verified") {
      if (!Number.isSafeInteger(record.seekStartMs))
        problems.push(`verified seek ${record.questionId}`);
      if (!record.reasons.includes("existing_verified_range_preserved"))
        problems.push(`verified reason ${record.questionId}`);
      if (
        !Number.isSafeInteger(record.seekEndMs) ||
        record.seekEndMs == null ||
        record.seekStartMs == null ||
        record.seekEndMs <= record.seekStartMs
      )
        problems.push(`verified end ${record.questionId}`);
    } else problems.push(`status ${record.questionId}`);
  });
  return problems;
}
