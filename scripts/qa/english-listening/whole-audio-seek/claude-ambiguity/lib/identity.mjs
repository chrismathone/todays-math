/**
 * Identity of a question's beginning inside its unchanged whole recording.
 *
 * A start is admitted to the candidate list only when ALL of this replays from
 * raw, hash-bound inputs:
 *
 *   place     a measured native onset with measured quiet before it, and the
 *             fixed lead of the existing start policy
 *   number    the question's own number written first by a bounded recognition
 *             that begins at that start
 *   section   the official script's own numbered section of that question
 *   sentence  that section's printed sentence heard after the number
 *   dialogue  an exact, script-unique opening of that section's first utterance
 *             heard from a later measured onset inside the same passage
 *   order     the neighbouring questions' known starts on both sides
 *
 * The method is separate from the existing admission contract: it never turns
 * off a uniqueness rule there. A sentence the script prints for several
 * questions does not identify one of them, so the dialogue opening must — and
 * that opening has to be the section's own, word for word, in one place only.
 *
 * Every function is pure. Reasons are stable strings.
 */
import { leadingCue } from "../../claude/lib/text.mjs";
import { ScriptError, scriptSection, sectionOpenings } from "./script.mjs";
import {
  englishWords,
  hangulCoverage,
  occurrences,
  sentenceRuns,
  squeeze,
  strictCoverage,
} from "./words.mjs";

export const METHOD = "numbered_section_own_dialogue_v1";

export const RULES = Object.freeze({
  windowMs: 20,
  quietThresholdDbfs: -50,
  leadWindows: 20,
  minimumQuietBeforeWindows: 5,
  /** A spoken number holds at least this much sound in its first two seconds. */
  minimumSoundAfterOnsetWindows: 12,
  soundSearchWindows: 100,
  maximumFirstSpeechSeconds: 2,
  maximumCueProbeSeconds: 14,
  maximumDialogueProbeSeconds: 60,
  maximumNumberClipSeconds: 4,
  /** The dialogue is heard this soon after the number's onset. */
  dialogueWithinSeconds: { single: 20, shared_instruction_member: 6 },
  minimumSentenceShare: 0.8,
  minimumSentenceSyllables: 12,
  /** A clearly different sentence after a literal number is a contradiction. */
  contradictingSentenceShare: 0.5,
  minimumOpeningWords: 4,
});

export class Hold extends Error {
  constructor(reason, detail) {
    super(reason);
    this.reason = reason;
    this.detail = detail ?? null;
  }
}

const hold = (reason, detail) => {
  throw new Hold(reason, detail);
};
const need = (condition, reason, detail) => {
  if (!condition) hold(reason, detail);
};
const isInteger = (value) => Number.isSafeInteger(value);
const isNumber = (value) => typeof value === "number" && Number.isFinite(value);

/** The frozen uncertainty rule, recomputed from the raw metrics. */
export function uncertain(segment) {
  need(typeof segment.uncertain === "boolean", "missing_raw_uncertainty");
  const {
    avgLogProbability: logp,
    compressionRatio: ratio,
    noSpeechProbability: silent,
  } = segment;
  need([logp, ratio, silent].every(isNumber), "missing_raw_confidence_metrics");
  need(
    silent >= 0 && silent <= 1 && ratio >= 0 && logp <= 0,
    "invalid_raw_confidence_metrics",
  );
  return (
    segment.uncertain ||
    logp < -1 ||
    ratio > 2.4 ||
    (silent > 0.6 && logp < -0.6)
  );
}

/** Re-measures a start from the native loudness; nothing is taken on trust. */
export function measuredStart(native, startFrame, onsetFrame) {
  const { energy, windowFrames: frames, sampleRate, frameCount } = native;
  need(
    isInteger(startFrame) &&
      isInteger(onsetFrame) &&
      startFrame >= 0 &&
      startFrame < onsetFrame &&
      onsetFrame < frameCount,
    "native_start_or_onset_overflow",
  );
  need(
    startFrame % frames === 0 && onsetFrame % frames === 0,
    "native_start_off_measured_window_grid",
  );
  const threshold = frames * 32768 ** 2 * 10 ** (RULES.quietThresholdDbfs / 10);
  const onset = onsetFrame / frames;
  need(
    onset < energy.length && energy[onset] >= threshold,
    "native_onset_is_not_sound",
  );
  let quiet = 0;
  for (let w = onset - 1; w >= 0 && energy[w] < threshold; w--) quiet++;
  need(quiet >= RULES.minimumQuietBeforeWindows, "native_quiet_lead_too_short");
  const lead = Math.min(RULES.leadWindows, quiet);
  need(
    onsetFrame - startFrame === lead * frames,
    "native_start_not_measured_quiet_lead",
  );
  let sound = 0;
  const limit = Math.min(energy.length, onset + RULES.soundSearchWindows);
  for (let w = onset; w < limit; w++) if (energy[w] >= threshold) sound++;
  let peak = 0;
  for (let w = startFrame / frames; w < onset; w++)
    if (energy[w] > peak) peak = energy[w];
  return {
    sampleRate,
    windowFrames: frames,
    startFrame,
    onsetFrame,
    quietBeforeFrames: quiet * frames,
    leadFrames: lead * frames,
    soundWindowsInFirstTwoSeconds: sound,
    leadPeakDbfs: peak > 0 ? 10 * Math.log10(peak / frames / 32768 ** 2) : null,
  };
}

/**
 * One stored bounded recognition, checked against its container, its frozen
 * request and the source it claims. `loaded` = { container, containerSha256,
 * requestSha256, request } as read from disk by the caller; `reference` =
 * { path, sha256, probeId } as claimed by a row.
 */
export function boundProbe(loaded, reference, source, maximumSeconds) {
  need(loaded && reference, "missing_bounded_native_probe");
  need(
    loaded.containerSha256 === reference.sha256,
    "artifact_hash_mismatch",
    "probe container",
  );
  const { container } = loaded;
  need(
    container.sourceRecordId === source.sourceRecordId &&
      container.sourceAudioSha256 === source.sourceAudioSha256,
    "bounded_probe_wrong_source",
  );
  need(
    container.originalAudioModified === false &&
      container.humanReviewed === false,
    "probe_original_or_review_mutation",
  );
  const pcm = container.nativePcm ?? {};
  need(
    pcm.sha256 === source.clock.pcmSha256 &&
      pcm.sampleRate === source.clock.sampleRate &&
      pcm.channels === source.clock.channels &&
      pcm.frameCount === source.clock.frameCount,
    "raw_probe_native_clock_mismatch",
  );
  need(
    loaded.requestSha256 === container.requestSha256,
    "artifact_hash_mismatch",
    "probe request",
  );
  const requested = (loaded.request.sources ?? []).filter(
    (s) => s.sourceRecordId === source.sourceRecordId,
  );
  need(
    requested.length === 1 &&
      requested[0].sourceAudioSha256 === source.sourceAudioSha256,
    "probe_request_wrong_source",
  );
  const wanted = requested[0].probes.filter((p) => p.id === reference.probeId);
  const found = (container.probes ?? []).filter(
    (p) => p.id === reference.probeId,
  );
  need(
    wanted.length === 1 && found.length === 1,
    "unknown_or_duplicate_probe_id",
  );
  // Round one stored the fixed language on the container only.
  const probe = {
    ...found[0],
    requestedLanguage:
      found[0].requestedLanguage ?? container.requestedLanguage,
  };
  for (const key of [
    "startFrame",
    "frameCount",
    "onsetFrame",
    "quietBeforeFrames",
  ])
    need(probe[key] === wanted[0][key], "raw_probe_request_bounds", key);
  const rate = source.clock.sampleRate;
  need(
    isInteger(probe.startFrame) &&
      isInteger(probe.frameCount) &&
      probe.startFrame >= 0 &&
      probe.frameCount > 0 &&
      probe.startFrame + probe.frameCount <= source.clock.frameCount,
    "probe_source_overflow",
  );
  need(
    probe.frameCount <= maximumSeconds * rate,
    "probe_overflow_or_unbounded",
  );
  need(
    probe.sampleRate === rate &&
      probe.durationSeconds === probe.frameCount / rate,
    "raw_probe_actual_duration_mismatch",
  );
  need(probe.overflow === false, "raw_probe_overflow");
  need(
    /^[0-9a-f]{64}$/.test(probe.clipPcmSha256 ?? "") &&
      /^[0-9a-f]{64}$/.test(probe.inputMonoFloat32Sha256 ?? ""),
    "raw_probe_input_hash_missing",
  );
  need(Array.isArray(probe.segments), "missing_raw_segments");
  let last = -1;
  const ids = new Set();
  for (const segment of probe.segments) {
    need(
      isInteger(segment.id) && !ids.has(segment.id),
      "duplicate_or_invalid_raw_segment_id",
    );
    ids.add(segment.id);
    need(
      typeof segment.text === "string" && segment.text.trim(),
      "empty_raw_segment",
    );
    const { localStartSeconds: a, localEndSeconds: b } = segment;
    need(
      isNumber(a) &&
        isNumber(b) &&
        a >= 0 &&
        a < b &&
        b <= probe.durationSeconds,
      "raw_probe_segment_overflow",
    );
    need(a >= last, "raw_segment_order");
    last = a;
    for (const word of segment.words ?? [])
      need(
        isNumber(word.localStartSeconds) &&
          isNumber(word.localEndSeconds) &&
          word.localStartSeconds >= 0 &&
          word.localStartSeconds <= word.localEndSeconds &&
          word.localEndSeconds <= probe.durationSeconds,
        "raw_probe_word_overflow",
      );
    uncertain(segment);
  }
  return probe;
}

/** What a probe wrote first: its leading number, if any, and what follows. */
export function cueReading(probe) {
  const segments = probe.segments;
  if (!segments.length)
    return {
      numbers: null,
      form: null,
      rest: "",
      segmentIds: [],
      reliable: false,
      firstSpeechSeconds: null,
    };
  // The number and its sentence may be one segment or several. Later segments
  // the recognizer was unsure of are left out: they prove nothing.
  const used = segments.filter((s, i) => i === 0 || !uncertain(s));
  const text = used.map((s) => s.text).join(" ");
  const cue = leadingCue(text);
  return {
    numbers: cue ? cue.numbers : null,
    form: cue ? cue.form : null,
    rest: cue ? cue.rest : text,
    text,
    segmentIds: used.map((s) => s.id),
    skippedUncertainSegmentIds: segments
      .filter((s) => !used.includes(s))
      .map((s) => s.id),
    firstSegmentId: segments[0].id,
    firstSegmentReliable: !uncertain(segments[0]),
    firstSegmentNumbers: leadingCue(segments[0].text)?.numbers ?? null,
    firstSpeechSeconds: segments[0].localStartSeconds,
  };
}

const sameNumbers = (a, b) =>
  Array.isArray(a) &&
  Array.isArray(b) &&
  a.length === b.length &&
  a.every((n, i) => n === b[i]);

/**
 * Replays one claimed start. `input`:
 *   question   { questionId, sourceNumber, kind, spokenNumbers, promptSentence }
 *   source     { sourceRecordId, sourceAudioSha256, playbackDurationMs,
 *                clock { sampleRate, channels, frameCount, pcmSha256 },
 *                questions [{ sourceNumber, instruction }] }
 *   native     { energy, windowFrames, sampleRate, frameCount }
 *   script     { text }
 *   claim      { seekStartMs, seekEndMs, startFrame, onsetFrame,
 *                cueProbe, numberClip?, dialogueProbe?, opening? }
 *   loaded     { cueProbe, numberClip?, dialogueProbe? }   (see boundProbe)
 *   readingsAtStart  other stored recognitions that begin at this same start
 *   neighbors  { previous: { sourceNumber, startMs } | null,
 *                next: { sourceNumber, startMs } | null, isLastQuestion }
 *   baseline   { hasVerifiedStart }
 * Returns the proof, or throws Hold(reason).
 */
export function verifyIdentity(input) {
  const proof = verifyOwnEvidence(input);
  return {
    ...proof,
    neighbors: verifyOrder(
      proof,
      input.question,
      input.source,
      input.claim,
      input.neighbors,
    ),
  };
}

/**
 * The order part: the nearest earlier known start lies before this one, and
 * the very next question's known start lies after this one and after the
 * dialogue that was quoted for it. A missing next boundary holds the start;
 * only the last question of a recording has none.
 */
export function verifyOrder(proof, question, source, claim, neighbors) {
  const rate = source.clock.sampleRate;
  const startMs = claim.seekStartMs;
  const { previous, next, isLastQuestion } = neighbors;
  // `previous` is the nearest earlier question whose start is known, if any.
  if (previous)
    need(
      previous.sourceNumber < question.scopeQuestionNumbers[0] &&
        previous.startMs < startMs,
      "start_not_after_previous_question",
    );
  if (!isLastQuestion) {
    need(
      next && next.sourceNumber === question.scopeQuestionNumbers.at(-1) + 1,
      "next_original_passage_boundary_missing",
    );
    need(startMs < next.startMs, "start_not_before_next_question");
    if (proof.dialogue)
      need(
        proof.dialogue.onsetFrame * 1000 < next.startMs * rate &&
          proof.dialogue.selectedEstimatedEndFrame * 1000 <=
            next.startMs * rate,
        "dialogue_probe_beyond_next_original_question",
      );
  } else need(next == null, "last_question_has_no_next_boundary");
  return { previous: previous ?? null, next: next ?? null, isLastQuestion };
}

/** The measured place and the number written there; shared by every tier. */
function verifyPlaceAndNumber(input) {
  const { question, source, native, claim, loaded, baseline } = input;
  need(
    baseline && baseline.hasVerifiedStart === false,
    "question_already_has_verified_start",
  );
  const rate = source.clock.sampleRate;
  need(
    native.sampleRate === rate && native.frameCount === source.clock.frameCount,
    "native_replay_clock_mismatch",
  );

  // place
  const place = measuredStart(native, claim.startFrame, claim.onsetFrame);
  need(
    place.soundWindowsInFirstTwoSeconds >= RULES.minimumSoundAfterOnsetWindows,
    "native_onset_sound_too_short_for_a_spoken_number",
  );
  need(
    claim.seekStartMs === Math.floor((claim.startFrame * 1000) / rate),
    "seek_native_clock_mismatch",
  );
  need(
    claim.seekEndMs === source.playbackDurationMs,
    "seek_end_is_not_full_original_duration",
  );
  need(
    Math.ceil((source.clock.frameCount * 1000) / rate) ===
      source.playbackDurationMs,
    "native_frame_duration_mismatch",
  );

  // number
  const cueProbe = boundProbe(
    loaded.cueProbe,
    claim.cueProbe,
    source,
    RULES.maximumCueProbeSeconds,
  );
  need(cueProbe.requestedLanguage === "ko", "cue_probe_language");
  need(
    cueProbe.startFrame === claim.startFrame &&
      cueProbe.onsetFrame === claim.onsetFrame,
    "raw_probe_wrong_native_start",
  );
  const reading = cueReading(cueProbe);
  need(
    reading.segmentIds.length &&
      reading.firstSpeechSeconds <= RULES.maximumFirstSpeechSeconds,
    "probe_does_not_begin_at_spoken_cue",
  );
  need(reading.firstSegmentReliable, "spoken_number_segment_uncertain");
  need(reading.numbers, "spoken_number_missing");
  need(
    sameNumbers(reading.numbers, question.spokenNumbers),
    "spoken_number_mismatch",
    { heard: reading.numbers },
  );
  need(
    reading.firstSegmentNumbers &&
      reading.firstSegmentNumbers[0] === reading.numbers[0],
    "spoken_number_not_in_first_segment",
  );
  const contradicting = (input.readingsAtStart ?? []).filter(
    (other) =>
      other.numbers && !sameNumbers(other.numbers, question.spokenNumbers),
  );
  need(
    !contradicting.length,
    "contradictory_spoken_number_at_same_start",
    contradicting,
  );

  let clip = null;
  if (claim.numberClip) {
    const clipProbe = boundProbe(
      loaded.numberClip,
      claim.numberClip,
      source,
      RULES.maximumNumberClipSeconds,
    );
    need(clipProbe.requestedLanguage === "ko", "cue_probe_language");
    need(
      clipProbe.startFrame === claim.startFrame &&
        clipProbe.onsetFrame === claim.onsetFrame,
      "number_clip_wrong_native_start",
    );
    const heard = cueReading(clipProbe);
    need(
      heard.numbers &&
        heard.form !== "bare" &&
        sameNumbers(heard.numbers, question.spokenNumbers),
      "number_clip_did_not_hear_literal_number",
      heard.text ?? null,
    );
    need(
      heard.firstSegmentReliable &&
        heard.firstSpeechSeconds <= RULES.maximumFirstSpeechSeconds,
      "number_clip_uncertain",
    );
    clip = {
      probeId: clipProbe.id,
      text: heard.text,
      segmentIds: heard.segmentIds,
      clipPcmSha256: clipProbe.clipPcmSha256,
      inputMonoFloat32Sha256: clipProbe.inputMonoFloat32Sha256,
    };
  }
  return { place, cueProbe, reading, clip };
}

const numberProof = (cueProbe, reading, clip) => ({
  probeId: cueProbe.id,
  form: reading.form,
  numbers: reading.numbers,
  text: reading.text,
  segmentIds: reading.segmentIds,
  skippedUncertainSegmentIds: reading.skippedUncertainSegmentIds,
  clipPcmSha256: cueProbe.clipPcmSha256,
  inputMonoFloat32Sha256: cueProbe.inputMonoFloat32Sha256,
  numberClip: clip,
});

/**
 * A question that has no official text at all in the frozen inputs (an
 * image-only question of a recording whose script is empty): its literal
 * number at a measured start. This says nothing about what follows the number,
 * so it stands only where EVERY question of the recording has a known start in
 * order — the caller checks that with `completeChronology`.
 */
export function verifyOrdinalOnly(input) {
  const { question } = input;
  need(
    ["single", "shared_instruction_member"].includes(question.kind),
    "unsupported_question_kind_for_this_method",
  );
  need(
    input.officialTextToCompare === false,
    "ordinal_only_is_for_questions_without_official_text",
  );
  const { place, cueProbe, reading, clip } = verifyPlaceAndNumber(input);
  need(reading.form !== "bare" || clip, "bare_digits_without_literal_number");
  return {
    method: METHOD,
    tier: "ordinal_only_complete_chronology",
    numberGrade:
      reading.form !== "bare"
        ? "literal_number_at_start"
        : "bare_digits_with_literal_number_clip",
    place,
    number: numberProof(cueProbe, reading, clip),
    section: null,
    sentence: null,
    dialogue: null,
  };
}

/** True when every question number of the recording has a known start, strictly increasing. */
export function completeChronology(sourceNumbers, knownStartMs) {
  let last = -1;
  for (const number of [...sourceNumbers].sort((a, b) => a - b)) {
    const start = knownStartMs.get(number);
    if (!isInteger(start)) return false;
    if (start < last) return false;
    last = start;
  }
  return true;
}

/** Everything about one start except its neighbours. */
export function verifyOwnEvidence(input) {
  const { question, source, native, script, claim, loaded } = input;
  need(
    ["single", "shared_instruction_member", "shared_passage"].includes(
      question.kind,
    ),
    "unsupported_question_kind_for_this_method",
  );
  const rate = source.clock.sampleRate;
  const { place, cueProbe, reading, clip } = verifyPlaceAndNumber(input);

  // section and sentence
  let section = null;
  let sectionUnavailable = null;
  try {
    // A shared passage is identified by its two spoken numbers and the frozen
    // shared instruction; no dialogue is quoted for it here.
    if (question.kind === "shared_passage")
      throw new ScriptError("not_used_for_shared_passage");
    section = scriptSection(
      script.text ?? "",
      source.questions,
      question.sourceNumber,
    );
    need(
      sameNumbers(section.numbers, question.scopeQuestionNumbers),
      "official_section_not_current_original_number",
    );
  } catch (error) {
    if (!(error instanceof ScriptError)) throw error;
    // Without a numbered section there is no dialogue proof; the question's own
    // printed sentence from the frozen question paper can still be compared.
    sectionUnavailable = error.reason;
  }
  let sentence = null;
  let sentenceRepeats = null;
  if (question.kind === "shared_passage") {
    // One announcement for two questions: the frozen shared instruction itself.
    const printed = question.instruction;
    need(
      printed && /물음에\s*답하/.test(printed),
      "shared_passage_missing_official_scope_instruction",
    );
    const peers = source.questions.filter((q) =>
      question.scopeQuestionNumbers.includes(q.sourceNumber),
    );
    need(
      peers.length === 2 && peers.every((q) => q.instruction === printed),
      "shared_passage_official_scope_mismatch",
    );
    const heard = hangulCoverage(printed, reading.rest);
    sentenceRepeats =
      source.questions.filter((q) => q.instruction === printed).length / 2;
    sentence = {
      source: "frozen_shared_instruction",
      text: printed,
      startCharacter: null,
      endCharacter: null,
      hangulShare: heard.share,
      hangulSyllables: heard.syllables,
      strictShare: strictCoverage(printed, reading.rest),
      notCompared: sentenceRuns(printed).notCompared,
      occurrencesInScript: sentenceRepeats,
      heardAtLeast:
        heard.share >= RULES.minimumSentenceShare &&
        heard.syllables >= RULES.minimumSentenceSyllables,
    };
    need(reading.form !== "bare", "shared_passage_needs_literal_numbers");
    need(
      sentence.heardAtLeast &&
        sentence.strictShare >= RULES.minimumSentenceShare,
      "shared_passage_instruction_not_heard",
    );
  }
  if (question.kind === "single") {
    const fromSection = section?.instruction?.text ?? null;
    need(
      question.promptSentence || fromSection,
      "official_sentence_unavailable",
    );
    if (section) need(section.instruction, "official_section_sentence_missing");
    const printed = fromSection ?? question.promptSentence;
    // An image-only question has no printed sentence of its own to compare with.
    if (section && question.promptSentence)
      need(
        hangulCoverage(question.promptSentence, printed).share >= 0.9 &&
          hangulCoverage(printed, question.promptSentence).share >= 0.9,
        "official_section_sentence_is_not_the_current_question",
      );
    const heard = hangulCoverage(printed, reading.rest);
    const strict = strictCoverage(printed, reading.rest);
    // How many of this recording's questions print this very sentence.
    const sameInPaper = source.questions.filter(
      (q) => q.promptSentence && squeeze(q.promptSentence) === squeeze(printed),
    ).length;
    sentenceRepeats = Math.max(
      sameInPaper,
      section ? countLiteral(squeeze(script.text), squeeze(printed)) : 0,
    );
    sentence = {
      source: section ? "official_script_section" : "frozen_question_prompt",
      questionPromptIsImageOnly: !question.promptSentence,
      text: printed,
      startCharacter: section ? section.instruction.startCharacter : null,
      endCharacter: section ? section.instruction.endCharacter : null,
      hangulShare: heard.share,
      hangulSyllables: heard.syllables,
      strictShare: strict,
      notCompared: sentenceRuns(printed).notCompared,
      occurrencesInScript: sentenceRepeats,
      heardAtLeast:
        heard.share >= RULES.minimumSentenceShare &&
        heard.syllables >= RULES.minimumSentenceSyllables,
    };
    if (reading.form === "bare")
      need(
        sentence.heardAtLeast,
        "bare_digits_not_directly_before_own_sentence",
      );
    else
      need(
        heard.share >= RULES.contradictingSentenceShare,
        "different_sentence_after_spoken_number",
      );
  }
  const literalNumber = reading.form !== "bare";
  let numberGrade;
  if (literalNumber) numberGrade = "literal_number_at_start";
  else if (clip) numberGrade = "bare_digits_with_literal_number_clip";
  else if (sentenceRepeats === 1)
    numberGrade = "bare_digits_with_script_unique_sentence";
  else hold("bare_digits_before_repeated_sentence_without_literal_number");

  // dialogue
  let dialogue = null;
  if (claim.dialogueProbe) {
    need(section, "official_section_unavailable", sectionUnavailable);
    need(
      claim.opening &&
        Array.isArray(claim.opening.quotes) &&
        claim.opening.quotes.length,
      "own_dialogue_opening_missing",
    );
    const probe = boundProbe(
      loaded.dialogueProbe,
      claim.dialogueProbe,
      source,
      RULES.maximumDialogueProbeSeconds,
    );
    need(probe.requestedLanguage === "en", "dialogue_probe_language");
    const dialoguePlace = measuredStart(
      native,
      probe.startFrame,
      probe.onsetFrame,
    );
    const within = RULES.dialogueWithinSeconds[question.kind] * rate;
    need(
      probe.startFrame >= claim.onsetFrame &&
        probe.onsetFrame > claim.onsetFrame &&
        probe.onsetFrame - claim.onsetFrame <= within,
      "dialogue_probe_offset_outside_original_passage_limit",
    );
    const allowed = sectionOpenings(script.text, section);
    const quotes = claim.opening.quotes;
    const match = allowed.find(
      (candidate) =>
        candidate.method === claim.opening.method &&
        candidate.quotes.length === quotes.length &&
        candidate.quotes.every(
          (quote, i) =>
            quotes[i] &&
            quote.text === quotes[i].text &&
            quote.startCharacter === quotes[i].startCharacter &&
            quote.endCharacter === quotes[i].endCharacter,
        ),
    );
    // Not the section's own first turn(s), not literal, or printed elsewhere too.
    if (!match) {
      const inside = quotes.every(
        (q) =>
          isInteger(q.startCharacter) &&
          q.startCharacter >= section.sectionStartCharacter &&
          q.endCharacter <= section.sectionEndCharacter,
      );
      need(inside, "own_dialogue_opening_outside_current_section");
      const literal = quotes.every(
        (q) => script.text.slice(q.startCharacter, q.endCharacter) === q.text,
      );
      need(literal, "own_dialogue_opening_quote_or_offsets_mismatch");
      const first = section.turns[0];
      need(
        first && quotes[0].startCharacter === first.startCharacter,
        "own_dialogue_opening_is_not_first_turn",
      );
      const words = quotes.flatMap((q) => englishWords(q.text));
      need(
        words.length >= RULES.minimumOpeningWords,
        "own_dialogue_opening_too_short",
      );
      hold("own_dialogue_opening_not_unique_or_not_exact_prefix");
    }
    const ids = claim.opening.dialogueProbeSegmentIds;
    need(
      Array.isArray(ids) && ids.length && new Set(ids).size === ids.length,
      "missing_segment_ids",
    );
    const byId = new Map(probe.segments.map((s) => [s.id, s]));
    need(
      ids.every((id) => byId.has(id)),
      "unknown_segment_id",
    );
    const selected = ids.map((id) => byId.get(id));
    need(
      selected.every(
        (s, i) =>
          !i || s.localStartSeconds >= selected[i - 1].localStartSeconds,
      ),
      "selected_segment_order",
    );
    need(!selected.some(uncertain), "uncertain_raw_evidence");
    const heardWords = englishWords(selected.map((s) => s.text).join(" "));
    need(
      occurrences(heardWords, match.words) >= 1,
      "own_dialogue_opening_not_heard_exactly",
    );
    const endSeconds = Math.max(...selected.map((s) => s.localEndSeconds));
    dialogue = {
      method: match.method,
      quotes: match.quotes,
      words: match.words,
      occurrencesInScript: 1,
      probeId: probe.id,
      startFrame: probe.startFrame,
      onsetFrame: probe.onsetFrame,
      offsetFromStartFrames: probe.startFrame - claim.startFrame,
      quietBeforeFrames: dialoguePlace.quietBeforeFrames,
      selectedSegmentIds: ids,
      selectedEstimatedEndFrame:
        probe.startFrame + Math.ceil(endSeconds * rate),
      clipPcmSha256: probe.clipPcmSha256,
      inputMonoFloat32Sha256: probe.inputMonoFloat32Sha256,
    };
  }

  // What together identifies this question, and nothing weaker.
  let tier;
  if (question.kind === "shared_passage")
    tier = "shared_passage_numbers_and_instruction";
  else if (question.kind === "shared_instruction_member") {
    // A member's number is followed directly by its own dialogue.
    need(dialogue, "member_needs_own_dialogue_opening");
    tier = "member_number_and_own_dialogue";
  } else if (dialogue && sentence.heardAtLeast)
    tier = "number_sentence_and_own_dialogue";
  else if (dialogue && literalNumber) tier = "number_and_own_dialogue";
  else if (
    !sentence.heardAtLeast ||
    numberGrade === "bare_digits_with_script_unique_sentence"
  )
    hold("own_dialogue_opening_required");
  else if (sentence.strictShare >= RULES.minimumSentenceShare)
    tier = "number_and_sentence";
  else tier = "number_and_sentence_on_hangul_only";

  return {
    method: METHOD,
    tier,
    numberGrade,
    place,
    number: numberProof(cueProbe, reading, clip),
    section: section
      ? {
          numbers: section.numbers,
          headingStartCharacter: section.headingStartCharacter,
          sectionStartCharacter: section.sectionStartCharacter,
          sectionEndCharacter: section.sectionEndCharacter,
        }
      : null,
    sectionUnavailable,
    sentence,
    dialogue,
  };
}

function countLiteral(haystack, needle) {
  if (!needle) return 0;
  let count = 0;
  for (
    let at = haystack.indexOf(needle);
    at >= 0;
    at = haystack.indexOf(needle, at + needle.length)
  )
    count++;
  return count;
}
