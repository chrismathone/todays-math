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
  spokenCorpus,
} from "../../claude-ambiguity/lib/script.mjs";
import { passageEvidence, reference, sourceStructure } from "./resolve.mjs";
import {
  Hold,
  RULES,
  clipInside,
  countOccurrences,
  hearQuote,
  quoteWords,
} from "./rules.mjs";

export const OFFICIAL_ROUTE = "native_numbered_passage_script_sentence_v1";

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
      rows.push({
        ...base,
        status: "candidate",
        evidenceAdapter: null,
        ...common.fields,
        cueSegmentIds: [],
        anchorSegmentIds: [],
        dialogueProbeEvidence: reference(
          listening.ref,
          listening.probe.segments.filter((s) => quoted.has(s.id)),
          { purpose: listening.purpose },
        ),
        scriptEvidence: {
          method: "script_unique_own_sentence_inside_native_passage_v1",
          transcriptSha256: input.script.sha256,
          sectionStartCharacter: own.section.sectionStartCharacter,
          sectionEndCharacter: own.section.sectionEndCharacter,
          instructionQuote: own.section.instruction?.text ?? null,
          ownScriptUniqueSentences: own.anchors.length,
          sentences: heard.map(({ sentence, hits }) => ({
            text: sentence.text,
            startCharacter: sentence.startCharacter,
            endCharacter: sentence.endCharacter,
            words: sentence.words.length,
            probeSegmentIds: hits[0].segmentIds,
          })),
          otherSectionsSentencesHeardInPassage: 0,
        },
        nativeRecovery: {
          ...common.nativeRecovery,
          dialogueClipFrames: {
            startFrame: listening.startFrame,
            frameCount: listening.frameCount,
          },
          englishClipsInsidePassage: inside.length,
        },
      });
    } catch (error) {
      if (!(error instanceof Hold)) throw error;
      rows.push({ ...base, status: "held", reasons: [error.reason], tested });
    }
  }
  return { table, passages, rows };
}
