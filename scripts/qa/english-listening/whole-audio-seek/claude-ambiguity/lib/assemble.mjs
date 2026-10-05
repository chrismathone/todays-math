/**
 * Finds, among the stored bounded recognitions of a source, the ones that can
 * carry a claim. Finding is not proving: whatever is picked here is replayed by
 * `identity.mjs` from the raw files, and a pick that does not replay is a hold.
 */
import { RULES, cueReading, uncertain } from "./identity.mjs";
import { ScriptError, scriptSection, sectionOpenings } from "./script.mjs";
import { englishWords, occurrences } from "./words.mjs";

/**
 * A clip planned to hold the spoken number alone: the plain one, the one
 * through the pause after it, and the one that ends at its last sound.
 */
export const isNumberOnlyClip = (purpose) =>
  purpose === "cue_only" ||
  purpose === "cue_only_wide" ||
  purpose === "cue_only_tight";

const languageOf = (loaded, probe) =>
  probe.requestedLanguage ?? loaded.container.requestedLanguage;

const reference = (loaded, probe) => ({
  path: loaded.path,
  sha256: loaded.containerSha256,
  probeId: probe.id,
});

const sameNumbers = (a, b) =>
  Array.isArray(a) &&
  Array.isArray(b) &&
  a.length === b.length &&
  a.every((n, i) => n === b[i]);

const safeReading = (probe) => {
  try {
    return cueReading(probe);
  } catch {
    return null;
  }
};

/** Every Korean recognition that begins at exactly this start, with what it wrote first. */
export function koreanReadingsAtStart(store, sourceRecordId, startFrame) {
  const found = [];
  for (const loaded of store.containers(sourceRecordId))
    for (const probe of loaded.container.probes) {
      if (probe.startFrame !== startFrame || languageOf(loaded, probe) !== "ko")
        continue;
      const reading = safeReading(probe);
      found.push({
        ...reference(loaded, probe),
        purpose: probe.purpose,
        frameCount: probe.frameCount,
        onsetFrame: probe.onsetFrame,
        overflow: probe.overflow,
        numbers: reading?.numbers ?? null,
        form: reading?.form ?? null,
        text: reading?.text ?? null,
        firstSegmentReliable: reading?.firstSegmentReliable ?? false,
        firstSpeechSeconds: reading?.firstSpeechSeconds ?? null,
      });
    }
  return found;
}

/**
 * A short listening at this start that wrote the literal number ("N번") first,
 * reliably: the number alone, or the first four seconds. `attempts` lists
 * every such listening and what it wrote.
 */
export function findNumberClip(
  store,
  sourceRecordId,
  startFrame,
  onsetFrame,
  rate,
  expected,
) {
  const attempts = koreanReadingsAtStart(
    store,
    sourceRecordId,
    startFrame,
  ).filter(
    (r) =>
      (isNumberOnlyClip(r.purpose) || r.purpose === "cue_context") &&
      r.onsetFrame === onsetFrame &&
      r.frameCount <= RULES.maximumNumberClipSeconds * rate,
  );
  const good = attempts.filter(
    (r) =>
      !r.overflow &&
      r.firstSegmentReliable &&
      r.form &&
      r.form !== "bare" &&
      sameNumbers(r.numbers, expected) &&
      r.firstSpeechSeconds <= RULES.maximumFirstSpeechSeconds,
  );
  // The number alone first (three seconds at most); the four-second listening
  // only where no number-only clip wrote the literal number reliably.
  const numberOnly = good.filter((r) => isNumberOnlyClip(r.purpose));
  const chosen = numberOnly.at(-1) ?? good.at(-1) ?? null;
  return {
    reference: chosen
      ? { path: chosen.path, sha256: chosen.sha256, probeId: chosen.probeId }
      : null,
    attempts,
  };
}

/** The shortest run of consecutive reliable segments whose words hold `words`. */
function hearingOf(probe, words) {
  const segments = probe.segments;
  for (let size = 1; size <= 4; size++)
    for (let from = 0; from + size <= segments.length; from++) {
      const run = segments.slice(from, from + size);
      if (run.some((s) => uncertain(s))) continue;
      if (
        occurrences(englishWords(run.map((s) => s.text).join(" ")), words) >= 1
      )
        return run.map((s) => s.id);
    }
  return null;
}

/**
 * The best exact opening of this question's own section that an English
 * recognition heard from a measured onset after the number: the longest
 * opening first, then the earliest listening.
 */
export function findOwnDialogue(
  store,
  sourceRecordId,
  scriptText,
  sourceQuestions,
  question,
  onsetFrame,
  rate,
) {
  let section;
  try {
    section = scriptSection(
      scriptText ?? "",
      sourceQuestions,
      question.sourceNumber,
    );
  } catch (error) {
    if (!(error instanceof ScriptError)) throw error;
    return { reference: null, reason: error.reason, listened: [] };
  }
  const openings = sectionOpenings(scriptText, section);
  const within = (RULES.dialogueWithinSeconds[question.kind] ?? 20) * rate;
  const listened = [];
  let best = null;
  for (const loaded of store.containers(sourceRecordId))
    for (const probe of loaded.container.probes) {
      if (languageOf(loaded, probe) !== "en" || probe.overflow) continue;
      if (probe.startFrame < onsetFrame || probe.onsetFrame <= onsetFrame)
        continue;
      if (probe.onsetFrame - onsetFrame > within) continue;
      listened.push({
        ...reference(loaded, probe),
        startFrame: probe.startFrame,
        text: probe.segments
          .map((s) => s.text)
          .join(" ")
          .slice(0, 160),
      });
      for (const opening of openings) {
        const ids = hearingOf(probe, opening.words);
        if (!ids) continue;
        const better =
          !best ||
          opening.words.length > best.opening.words.length ||
          (opening.words.length === best.opening.words.length &&
            probe.startFrame < best.startFrame);
        if (better)
          best = {
            reference: reference(loaded, probe),
            startFrame: probe.startFrame,
            opening,
            ids,
          };
        break;
      }
    }
  if (!best)
    return {
      reference: null,
      reason: openings.length
        ? "own_dialogue_opening_not_heard_exactly"
        : "own_dialogue_has_no_script_unique_opening",
      listened,
      officialFirstUtterance: section.turns[0]?.text ?? null,
    };
  return {
    reference: best.reference,
    opening: {
      method: best.opening.method,
      quotes: best.opening.quotes,
      dialogueProbeSegmentIds: best.ids,
    },
    listened,
  };
}
