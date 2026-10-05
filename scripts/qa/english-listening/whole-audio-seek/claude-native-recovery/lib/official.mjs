/**
 * Held official questions on the same measured passages.
 *
 * An official question keeps its own number; what was missing was proof that
 * the dialogue after that number is its own. The earlier route needed the exact
 * opening of the first utterance, and a name the recognizer spelled another way
 * ended it. Here the passage is the native frames from the question's own
 * measured heading to the start of the next number, and identity is any
 * sentence of the question's own printed script section that the script prints
 * once, written word for word by an English clip that lies wholly inside those
 * frames — while no other section's such sentence is written inside them.
 *
 * Route `native_numbered_passage_script_sentence_v1`. The independent verifier
 * has no adapter for it yet; rows are offered apart from the reconstructed ones.
 */
import {
  ScriptError,
  scriptSection,
  sectionOpenings,
  spokenCorpus,
} from "../../claude-ambiguity/lib/script.mjs";
import { passageEvidence, reference, sourceStructure } from "./resolve.mjs";
import {
  Hold,
  RULES,
  clipInside,
  countOccurrences,
  hearQuote,
  measuredStart,
  quoteWords,
} from "./rules.mjs";

export const OFFICIAL_ROUTE = "native_numbered_passage_script_sentence_v1";
/** The verifier's wrapper around its existing official gates. */
export const OFFICIAL_ADAPTER = "official-catalogued-native-v1";

/** Sentences of a section's spoken turns, each with its literal character bounds. */
export function sectionSentences(section) {
  const sentences = [];
  for (const turn of section.turns)
    for (const match of turn.text.matchAll(/[^.!?]+(?:[.!?]+["'”’)\]]*|$)/g)) {
      const lead = match[0].length - match[0].trimStart().length;
      const text = match[0].trim();
      if (!text) continue;
      const startCharacter = turn.startCharacter + match.index + lead;
      sentences.push({
        text,
        startCharacter,
        endCharacter: startCharacter + text.length,
        words: quoteWords(text),
      });
    }
  return sentences;
}

/**
 * For every question number: its section and the sentences of four words or
 * more that the whole script holds exactly once. Throws ScriptError when the
 * script does not print every number once, in order.
 */
export function scriptAnchors(text, questions) {
  const corpus = spokenCorpus(text);
  const byNumber = new Map();
  for (const question of questions) {
    const section = scriptSection(text, questions, question.sourceNumber);
    const anchors = sectionSentences(section).filter(
      (sentence) =>
        sentence.words.length >= RULES.minimumAnchorWords &&
        countOccurrences(sentence.words, corpus) === 1,
    );
    byNumber.set(question.sourceNumber, { section, anchors });
  }
  return byNumber;
}

/**
 * `input`: { record, native, certRows, koListenings, enListenings, hints,
 * targets:[held certificate rows], certificateSha256, terminalScan,
 * script:{ text, sha256 } | { reason } }. Returns { table, passages, rows }.
 */
export function resolveOfficial(input) {
  const { record } = input;
  const structure = sourceStructure({
    ...input,
    blind: false,
    instructionFromBareSibling: true,
    lastOfficialNumber: Math.max(...record.questions.map((q) => q.sourceNumber)),
  });
  const { passages, held, table } = structure;
  const questions = record.questions.map((q) => ({
    sourceNumber: q.sourceNumber,
    instruction: q.instruction ?? null,
  }));
  let anchors = null;
  let scriptReason = input.script?.reason ?? null;
  if (!scriptReason && !String(input.script?.text ?? "").trim())
    scriptReason = "official_text_unavailable";
  if (!scriptReason)
    try {
      anchors = scriptAnchors(input.script.text, questions);
    } catch (error) {
      if (!(error instanceof ScriptError)) throw error;
      scriptReason = "official_script_sections_unavailable:" + error.reason;
    }

  const rows = [];
  for (const target of input.targets) {
    const number = target.sourceNumber;
    const base = {
      sourceRecordId: record.sourceRecordId,
      setId: record.setId,
      revision: record.revision,
      documentSha256: record.documentSha256,
      questionId: target.questionId,
      sourceNumber: number,
      provider: target.provider,
      sourceAudioSha256: record.sourceAudioSha256,
      playbackSha256: record.audio.sha256,
      reconstructed: false,
      route: OFFICIAL_ROUTE,
    };
    const tested = {};
    try {
      if (scriptReason) throw new Hold(scriptReason);
      const passage = passages.find((p) => p.key === number);
      if (!passage)
        throw new Hold(
          held.get(number) ??
            held.get(number + ":next") ??
            held.get(number + ":inside") ??
            "own_number_not_heard_at_any_measured_onset",
        );
      if (passage.scope.length !== 1 || passage.start.source !== "native")
        throw new Hold("passage_is_not_this_questions_own_native_heading");
      const own = anchors.get(number);
      tested.ownScriptUniqueSentences = own.anchors.length;
      if (!own.anchors.length)
        throw new Hold("no_script_unique_sentence_of_four_words");

      const inside = input.enListenings.filter((l) =>
        clipInside(l, passage.fromFrame, passage.toFrame),
      );
      tested.englishClipsInsidePassage = inside.length;
      // Another section's sentence inside these frames contradicts the passage.
      for (const [other, value] of anchors) {
        if (other === number) continue;
        for (const sentence of value.anchors)
          if (inside.some((l) => hearQuote(l.probe, sentence.words).length)) {
            tested.foreignSection = other;
            throw new Hold("another_sections_sentence_heard_in_passage");
          }
      }
      // The own sentences, clip by clip; the clip that wrote the most, then the earliest.
      const perClip = inside
        .map((listening) => ({
          listening,
          heard: own.anchors
            .map((sentence) => ({
              sentence,
              hits: hearQuote(listening.probe, sentence.words),
            }))
            .filter((entry) => entry.hits.length === 1),
        }))
        .filter((entry) => entry.heard.length)
        .sort(
          (a, b) =>
            b.heard.length - a.heard.length ||
            a.listening.startFrame - b.listening.startFrame,
        );
      if (!perClip.length)
        throw new Hold("own_script_sentence_not_heard_in_passage_clip");
      // The same sentence written by a clip wholly outside the passage is a second place.
      const elsewhere = input.enListenings.filter(
        (l) =>
          l.startFrame + l.frameCount <= passage.fromFrame ||
          l.startFrame >= passage.toFrame,
      );
      if (
        own.anchors.some((sentence) =>
          elsewhere.some((l) => hearQuote(l.probe, sentence.words).length),
        )
      )
        throw new Hold("own_script_sentence_heard_outside_passage");

      const common = passageEvidence(input, passage, tested);
      const [{ listening, heard }] = perClip;
      const quoted = new Set(heard.flatMap((entry) => entry.hits[0].segmentIds));

      // The independent verifier's official route needs the exact opening of
      // the first utterance, from a clip that begins at a measured onset. Say
      // whether that stricter thing was heard too; only then is the row shaped
      // for its adapter. A later own sentence alone stays a separate finding.
      let opening = null;
      for (const candidate of sectionOpenings(input.script.text, own.section)) {
        for (const clip of inside) {
          const hits = hearQuote(clip.probe, candidate.words);
          if (hits.length !== 1) continue;
          let atMeasuredOnset = false;
          if (clip.onsetFrame !== null)
            try {
              measuredStart(
                input.native,
                clip.startFrame,
                clip.onsetFrame,
                clip.probe.onsetMethod,
              );
              atMeasuredOnset = true;
            } catch (error) {
              if (!(error instanceof Hold)) throw error;
            }
          if (!opening || (atMeasuredOnset && !opening.atMeasuredOnset))
            opening = { candidate, clip, hit: hits[0], atMeasuredOnset };
        }
        if (opening?.atMeasuredOnset) break;
      }
      const adapter = opening?.atMeasuredOnset ? OFFICIAL_ADAPTER : null;
      const { heading } = common;
      const ownSentences = heard.map(({ sentence, hits }) => ({
        text: sentence.text,
        startCharacter: sentence.startCharacter,
        endCharacter: sentence.endCharacter,
        words: sentence.words.length,
        probeSegmentIds: hits[0].segmentIds,
      }));
      const shared = {
        ...base,
        status: "candidate",
        evidenceAdapter: adapter,
        ...common.fields,
        cueSegmentIds: [],
        anchorSegmentIds: [],
        officialInstruction: own.section.instruction
          ? { text: own.section.instruction.text, source: "official_script_section" }
          : null,
        numberWrittenAs: heading.instructionSibling
          ? "literal_number_clip_and_bare_digits_before_the_instruction"
          : "literal_number_before_the_instruction",
        nativeRecovery: {
          ...common.nativeRecovery,
          englishClipsInsidePassage: inside.length,
          ownScriptUniqueSentences: own.anchors.length,
          ownSentencesHeard: ownSentences,
          ownSentenceClip: reference(
            listening.ref,
            listening.probe.segments.filter((s) => quoted.has(s.id)),
            { purpose: listening.purpose },
          ),
          otherSectionsSentencesHeardInPassage: 0,
          firstUtteranceOpening: opening
            ? {
                method: opening.candidate.method,
                words: opening.candidate.words.length,
                clipBeginsAtMeasuredOnset: opening.atMeasuredOnset,
              }
            : null,
        },
      };
      if (!adapter) {
        // A later own sentence only: this producer's finding, in its own shape.
        rows.push({
          ...shared,
          dialogueProbeEvidence: shared.nativeRecovery.ownSentenceClip,
          scriptEvidence: {
            method: "script_unique_own_sentence_inside_native_passage_v1",
            transcriptSha256: input.script.sha256,
            sectionStartCharacter: own.section.sectionStartCharacter,
            sectionEndCharacter: own.section.sectionEndCharacter,
            instructionQuote: own.section.instruction?.text ?? null,
            sentences: ownSentences,
          },
        });
        continue;
      }
      // The verifier's existing official gate, key for key: the reading that
      // wrote the instruction is the probe; where it wrote bare digits, the
      // short literal reading from the same start is the number clip; the
      // dialogue probe is the clip at a measured onset that wrote the exact
      // first-utterance opening; offsets address the original transcript.
      const long = heading.instructionSibling ?? heading;
      const instructionIds = long.reading.instruction.segmentIds;
      const single = opening.candidate.method === "first_utterance_prefix";
      const terminal =
        passage.boundary.kind === "source_end_after_last_official_number";
      rows.push({
        ...shared,
        cueForm: heading.instructionSibling ? "bare" : shared.cueForm,
        officialIdentityEvidence: { method: "numbered_section_own_dialogue_v1" },
        probeEvidence: reference(
          long.ref,
          long.probe.segments.filter((s) => instructionIds.includes(s.id)),
        ),
        instructionProbeEvidence: null,
        numberClipEvidence: heading.instructionSibling
          ? reference(
              heading.ref,
              heading.probe.segments.filter(
                (s) => s.id === heading.reading.firstSegmentId,
              ),
              {
                purpose: heading.probe.purpose ?? null,
                requestedLanguage: "ko",
                sampleRate: input.native.sampleRate,
                durationSeconds: heading.probe.durationSeconds,
                onsetFrame: heading.onsetFrame,
                overflow: heading.probe.overflow,
              },
            )
          : null,
        dialogueProbeEvidence: reference(
          opening.clip.ref,
          opening.clip.probe.segments.filter((s) =>
            opening.hit.segmentIds.includes(s.id),
          ),
          {
            purpose: opening.clip.purpose,
            requestedLanguage: "en",
            sampleRate: input.native.sampleRate,
            durationSeconds: opening.clip.probe.durationSeconds,
            onsetFrame: opening.clip.onsetFrame,
            quietBeforeFrames: opening.clip.probe.quietBeforeFrames ?? null,
            overflow: opening.clip.probe.overflow,
            offsetFromStartFrames:
              opening.clip.startFrame - shared.nativeEvidence.startFrame,
          },
        ),
        scriptEvidence: {
          source:
            "original prepared file group transcript text (identical to the frozen live snapshot's)",
          transcriptSha256: input.script.sha256,
          sectionStartCharacter: own.section.sectionStartCharacter,
          sectionEndCharacter: own.section.sectionEndCharacter,
          instructionQuote: own.section.instruction?.text ?? null,
          instructionStartCharacter: own.section.instruction?.startCharacter ?? null,
          instructionProbeSegmentIds: instructionIds,
          firstUtteranceStartCharacter: own.section.turns[0].startCharacter,
          firstDialogueQuote: single ? opening.candidate.quotes[0].text : null,
          firstDialogueStartCharacter: opening.candidate.quotes[0].startCharacter,
          firstDialogueOpeningEvidence: single
            ? null
            : { method: opening.candidate.method, quotes: opening.candidate.quotes },
          firstDialogueWords: opening.candidate.words.length,
          dialogueProbeSegmentIds: opening.hit.segmentIds,
        },
        officialTerminalEvidence: terminal
          ? {
              method: "exact_official_original_population_end_v1",
              prepared: input.script.prepared ?? null,
              originalPrepared: input.script.originalPrepared ?? null,
              questionFile: input.script.questionFile ?? null,
              lastOriginalNumber: passage.boundary.lastOfficialNumber,
              sourceFrameCount: input.native.frameCount,
            }
          : null,
      });
    } catch (error) {
      if (!(error instanceof Hold)) throw error;
      rows.push({ ...base, status: "held", reasons: [error.reason], tested });
    }
  }
  return { table, passages, rows };
}
