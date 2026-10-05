/**
 * Shapes replayed official starts into the candidate supplement the independent
 * verifier reads, and decides which replayed tiers belong in it.
 *
 * A supplement row is the frozen producer row of a prior-held question, byte
 * for byte in its identity, plus only the evidence this work adds:
 *
 *   officialIdentityEvidence { method }     the explicit numbered-section route
 *   numberClipEvidence { path, sha256, … }  the number-only clip, for a start
 *                                           whose long probe wrote bare digits
 *
 * Tiers the agreed route does not cover stay out of the supplement. They are
 * reported with their evidence as diagnostics, never as candidates.
 */
import { resolve } from "node:path";
import { leadingCue } from "../../claude/lib/text.mjs";
import { isNumberOnlyClip } from "./assemble.mjs";
import { METHOD, uncertain } from "./identity.mjs";
import { settleOrder } from "./official.mjs";
import { compact, strictCoverage } from "./words.mjs";

const hangulKernel = (text) =>
  String(text)
    .normalize("NFKC")
    .replace(/[^가-힣]/g, "");
/** What the independent verifier's cue parser leaves after a number: it strips this character set. */
const afterNumber = (text) => {
  let rest = text;
  while (rest.length && " .,:;까지입니다".includes(rest[0]))
    rest = rest.slice(1);
  return rest;
};

/**
 * A producer-side lint of one explicit-route row against the interface the
 * independent verifier published. It predicts nothing about admission: it only
 * keeps a row that cannot fit the interface out of the supplement, and says why.
 */
export function interfacePrecheck(row, question, store) {
  const load = (evidence) => {
    const loaded = store.load(row.sourceRecordId, evidence.path);
    return (
      loaded?.container.probes.find((probe) => probe.id === evidence.probeId) ??
      null
    );
  };
  if (row.kind !== "single") return "explicit_route_is_for_single_questions";
  const long = load(row.probeEvidence);
  const picked = (ids) =>
    (ids ?? []).map((id) => long.segments.find((s) => s.id === id));
  const selected = picked(row.probeEvidence.segmentIds);
  if (!selected.length || selected.some((s) => !s || uncertain(s)))
    return "long_probe_selected_segment_missing_or_uncertain";
  const raw = selected.map((s) => s.text).join(" ");
  const cue = leadingCue(raw);
  let rest;
  if (cue && cue.form !== "bare") {
    if (cue.numbers.length !== 1 || cue.numbers[0] !== row.sourceNumber)
      return "long_probe_number_differs";
    rest = afterNumber(cue.rest);
  } else {
    const bare = raw.match(/^\s*(\d{1,2})\.\s+/);
    if (!bare || Number(bare[1]) !== row.sourceNumber)
      return "long_probe_has_no_own_number";
    rest = raw.slice(bare[0].length);
    const clipEvidence = row.numberClipEvidence;
    if (!clipEvidence) return "bare_digits_without_number_only_clip";
    const clip = load(clipEvidence);
    if (!clip) return "number_clip_missing";
    for (const key of [
      "sampleRate",
      "channels",
      "startFrame",
      "onsetFrame",
      "quietBeforeFrames",
    ])
      if (clip[key] !== long[key])
        return "number_clip_differs_from_long_probe:" + key;
    if (clip.frameCount > 3 * clip.sampleRate)
      return "number_clip_longer_than_three_seconds";
    const segments = (clipEvidence.segmentIds ?? []).map((id) =>
      clip.segments.find((s) => s.id === id),
    );
    if (!segments.length || segments.some((s) => !s || uncertain(s)))
      return "number_clip_segment_missing_or_uncertain";
    if (
      segments[0].id !== clip.segments[0].id ||
      segments[0].localStartSeconds > 2
    )
      return "number_clip_not_first_at_start";
    const text = segments.map((s) => s.text).join(" ");
    const heard = leadingCue(text);
    if (
      !heard ||
      heard.form === "bare" ||
      heard.numbers.length !== 1 ||
      heard.numbers[0] !== row.sourceNumber ||
      afterNumber(heard.rest).trim()
    )
      return "number_clip_is_not_the_number_alone";
    const onset = (clip.onsetFrame - clip.startFrame) / clip.sampleRate;
    if (!(
      segments[0].localStartSeconds - 0.5 <= onset &&
      onset <= segments[0].localEndSeconds
    ))
      return "number_clip_onset_outside_number_segment";
  }
  const script = row.scriptEvidence;
  if (
    !script?.instructionQuote ||
    !Number.isInteger(script.instructionStartCharacter)
  )
    return "own_instruction_quote_missing";
  if (
    !question.promptSentence ||
    compact(question.promptSentence) !== compact(script.instructionQuote)
  )
    return "question_sentence_and_script_sentence_differ";
  const want = hangulKernel(script.instructionQuote);
  const instructionSegments = picked(script.instructionProbeSegmentIds);
  if (
    !instructionSegments.length ||
    instructionSegments.some((s) => !s || uncertain(s))
  )
    return "instruction_segment_missing_or_uncertain";
  const heardKernel = hangulKernel(
    instructionSegments.map((s) => s.text).join(" "),
  );
  if (
    want.length < 12 ||
    strictCoverage(want, heardKernel) < 0.8 ||
    strictCoverage(want, hangulKernel(rest)) < 0.8
  )
    return "own_instruction_hangul_kernel_below_threshold";
  const dialogue = row.dialogueProbeEvidence
    ? load(row.dialogueProbeEvidence)
    : null;
  if (
    !dialogue ||
    dialogue.requestedLanguage !== "en" ||
    !(dialogue.startFrame > long.startFrame)
  )
    return "separate_english_dialogue_probe_missing";
  if (!script.firstDialogueQuote && !script.firstDialogueOpeningEvidence)
    return "own_dialogue_opening_missing";
  return null;
}

/** Why a replayed tier is or is not offered, in one place. */
export function classify(result) {
  const { tier, numberGrade, sentence, number } = result.proof;
  const literal = numberGrade === "literal_number_at_start";
  const clipped = numberGrade === "bare_digits_with_literal_number_clip";
  const clipIsNumberOnly =
    clipped && isNumberOnlyClip(result.numberClipPurpose);
  switch (tier) {
    case "number_sentence_and_own_dialogue":
      if (literal || clipIsNumberOnly)
        return {
          offered: true,
          route: "explicit_numbered_section_own_dialogue",
        };
      if (
        numberGrade === "bare_digits_with_script_unique_sentence" &&
        sentence.strictShare >= 0.8
      )
        return { offered: true, route: "existing_alignment_route" };
      return { offered: false, why: "bare_digits_without_number_only_clip" };
    case "member_number_and_own_dialogue":
      return literal
        ? { offered: true, route: "existing_member_route" }
        : { offered: false, why: "member_bare_digits" };
    case "ordinal_only_complete_chronology":
      return literal || clipIsNumberOnly
        ? { offered: true, route: "existing_ordinal_only_route" }
        : { offered: false, why: "bare_digits_without_number_only_clip" };
    case "shared_passage_numbers_and_instruction":
      // Both numbers and the shared instruction are heard; the existing core
      // route decides (the independent verifier's own cue parser, not this one).
      return { offered: true, route: "existing_shared_passage_route" };
    case "number_and_own_dialogue":
      return { offered: false, why: "own_sentence_heard_below_threshold" };
    case "number_and_sentence":
    case "number_and_sentence_on_hangul_only":
      return { offered: false, why: "own_dialogue_opening_not_heard_exactly" };
    default:
      return {
        offered: false,
        why: "unknown_tier:" + tier + ":" + (number?.form ?? ""),
      };
  }
}

/**
 * Drops every replayed start the agreed routes do not cover, then settles the
 * order again so nothing offered leans on something that is not.
 */
export function settleOffered(context, results, sources, store) {
  for (let changed = true; changed;) {
    changed = false;
    for (const result of results.values()) {
      if (result.outcome !== "candidate") continue;
      if (result.interfaceChecked) continue;
      const clipRef = result.claim.numberClip;
      if (clipRef) {
        const loaded = store.load(result.sourceRecordId, clipRef.path);
        result.numberClipPurpose =
          loaded.container.probes.find((p) => p.id === clipRef.probeId)
            ?.purpose ?? null;
      }
      const decision = classify(result);
      result.route = decision.route ?? null;
      if (
        decision.offered &&
        result.route === "explicit_numbered_section_own_dialogue"
      ) {
        const { facts, script } = sources.get(result.sourceRecordId);
        const question = facts.questions.find(
          (q) => q.questionId === result.questionId,
        );
        const row = supplementRow(
          result,
          context.marksByQuestion.get(result.questionId),
          sources.get(result.sourceRecordId),
          store,
        );
        const problem = interfacePrecheck(row, question, store);
        if (problem) {
          decision.offered = false;
          decision.why = "interface_precheck:" + problem;
        }
      }
      if (!decision.offered) {
        result.outcome = "diagnostic";
        result.reason = decision.why;
        changed = true;
      } else result.interfaceChecked = true;
    }
    if (changed) settleOrder(context, results, sources);
  }
}

const probeEvidenceOf = (loaded, probe, extra = {}) => ({
  path: loaded.path,
  sha256: loaded.containerSha256,
  round: "round-" + loaded.container.round,
  probeId: probe.id,
  purpose: probe.purpose,
  requestedLanguage:
    probe.requestedLanguage ?? loaded.container.requestedLanguage,
  startFrame: probe.startFrame,
  frameCount: probe.frameCount,
  sampleRate: probe.sampleRate,
  durationSeconds: probe.durationSeconds,
  clipPcmSha256: probe.clipPcmSha256,
  inputSampleCount: probe.inputSampleCount,
  inputMonoFloat32Sha256: probe.inputMonoFloat32Sha256,
  overflow: probe.overflow,
  ...extra,
});

/** One supplement row for an offered result. `frozen` is the producer's frozen row. */
export function supplementRow(result, frozen, world, store) {
  const { script, native, facts } = world;
  const question = facts.questions.find(
    (q) => q.questionId === result.questionId,
  );
  const row = structuredClone(frozen);
  const { proof, claim } = result;
  const replaced = [];
  row.status = "candidate";
  // A row the producer itself held has no start fields; state them from the replay.
  if (
    !Number.isInteger(row.seekStartMs) ||
    row.seekStartMs !== claim.seekStartMs
  ) {
    row.seekStartMs = claim.seekStartMs;
    row.seekEndMs = claim.seekEndMs;
    replaced.push("seekStartMs");
  }
  // The bounded recognition the row rests its number on. Where only a number
  // clip wrote the literal number of a question without official text, that
  // clip is the row's probe: the existing routes read the number from it.
  const numberFromClip =
    result.route === "existing_ordinal_only_route" &&
    proof.numberGrade === "bare_digits_with_literal_number_clip";
  const cueReference = numberFromClip ? claim.numberClip : claim.cueProbe;
  const sameCueProbe =
    row.nativeEvidence &&
    row.probeEvidence &&
    row.nativeEvidence.startFrame === claim.startFrame &&
    row.nativeEvidence.onsetFrame === claim.onsetFrame &&
    row.probeEvidence.probeId === cueReference.probeId &&
    resolve(row.probeEvidence.path) === resolve(cueReference.path);
  if (!sameCueProbe) {
    // The producer held this row, or its own probe is not the one that proves
    // the number: state the place and the probe from this replay, and claim
    // nothing about the whole-record recognition.
    const loaded = store.load(result.sourceRecordId, cueReference.path);
    const probe = loaded.container.probes.find(
      (p) => p.id === cueReference.probeId,
    );
    const used = probe.segments.filter((s, i) => i === 0 || !uncertain(s));
    const heard = leadingCue(used.map((s) => s.text).join(" "));
    row.startGrade =
      proof.tier === "ordinal_only_complete_chronology"
        ? "ordinal_only"
        : proof.dialogue
          ? "first_dialogue_grounded"
          : "instruction_grounded";
    row.cueNumber = question.scopeQuestionNumbers[0];
    row.cueSpokenNumbers = question.spokenNumbers;
    row.cueForm = heard?.form ?? null;
    row.scopeQuestionNumbers = question.scopeQuestionNumbers;
    Object.assign(row, {
      cueSegmentIds: [],
      cueText: null,
      anchorSegmentIds: [],
      anchorText: null,
      diagnosticAsrSegmentIds: [],
      diagnosticAsrText: null,
    });
    row.nativeEvidence = {
      sourceAudioSha256: row.sourceAudioSha256,
      sampleRate: native.sampleRate,
      channels: native.channels,
      frameCount: native.frameCount,
      pcmSha256: native.pcmSha256,
      windowFrames: native.windowFrames,
      quietThresholdDbfs: -50,
      cachePath: native.cachePath,
      cacheSha256: native.cacheSha256,
      energyPath: native.energyPath,
      energySha256: native.energySha256,
      startFrame: claim.startFrame,
      onsetFrame: claim.onsetFrame,
      cueOnsetFrame: claim.onsetFrame,
      leadFrames: proof.place.leadFrames,
      quietBeforeFrames: proof.place.quietBeforeFrames,
      leadPeakDbfs: proof.place.leadPeakDbfs,
      probe: { path: loaded.path, sha256: loaded.containerSha256 },
      probeOffsetFrame: probe.startFrame,
      probeFrameCount: probe.frameCount,
      cueProbeSegmentIds: [used[0].id],
    };
    row.probeEvidence = {
      ...probeEvidenceOf(loaded, probe),
      segmentIds: used.map((s) => s.id),
      text: used.map((s) => s.text).join(" "),
      firstSpeechSeconds: used[0].localStartSeconds,
      spokenNumbers: heard?.numbers ?? null,
      cueForm: heard?.form ?? null,
    };
    row.identityEvidence = ["spoken_ordinal_first_at_start"];
    row.notes = [];
    row.heldDiagnostics = null;
    replaced.push("nativeEvidence", "probeEvidence", "cueFields");
  }
  if (result.route === "explicit_numbered_section_own_dialogue") {
    row.officialIdentityEvidence = { method: METHOD };
    if (proof.numberGrade === "bare_digits_with_literal_number_clip") {
      const loaded = store.load(result.sourceRecordId, claim.numberClip.path);
      const probe = loaded.container.probes.find(
        (p) => p.id === claim.numberClip.probeId,
      );
      row.numberClipEvidence = {
        ...probeEvidenceOf(loaded, probe),
        onsetFrame: probe.onsetFrame,
        segmentIds: probe.segments.map((s) => s.id),
        text: probe.segments.map((s) => s.text).join(" "),
      };
    }
  }
  // Dialogue and script quotes: the frozen row's own when it already carries
  // them, otherwise the ones this replay found and proved.
  if (proof.dialogue) {
    const frozenHasDialogue =
      row.dialogueProbeEvidence &&
      row.scriptEvidence &&
      (row.scriptEvidence.firstDialogueQuote ||
        row.scriptEvidence.firstDialogueOpeningEvidence) &&
      row.scriptEvidence.instructionQuote !== undefined;
    const needsInstruction =
      result.kind === "single" && !row.scriptEvidence?.instructionQuote;
    if (!frozenHasDialogue || needsInstruction) {
      const loaded = store.load(
        result.sourceRecordId,
        claim.dialogueProbe.path,
      );
      const probe = loaded.container.probes.find(
        (p) => p.id === claim.dialogueProbe.probeId,
      );
      const selected = probe.segments.filter((s) =>
        proof.dialogue.selectedSegmentIds.includes(s.id),
      );
      row.dialogueProbeEvidence = probeEvidenceOf(loaded, probe, {
        segmentIds: probe.segments.map((s) => s.id),
        text: probe.segments.map((s) => s.text).join(" "),
        offsetFromStartFrames: proof.dialogue.offsetFromStartFrames,
      });
      const single = proof.dialogue.method === "first_utterance_prefix";
      row.scriptEvidence = {
        source: "frozen official script (original prepared group transcripts)",
        transcriptSha256: script.sha256,
        sectionStartCharacter: proof.section.sectionStartCharacter,
        sectionEndCharacter: proof.section.sectionEndCharacter,
        instructionQuote: proof.sentence?.text ?? null,
        instructionStartCharacter: proof.sentence?.startCharacter ?? null,
        instructionProbeSegmentIds: proof.sentence
          ? proof.number.segmentIds
          : null,
        firstUtteranceStartCharacter: proof.dialogue.quotes[0].startCharacter,
        firstDialogueQuote: single ? proof.dialogue.quotes[0].text : null,
        firstDialogueStartCharacter: single
          ? proof.dialogue.quotes[0].startCharacter
          : null,
        firstDialogueOpeningEvidence: single
          ? null
          : { method: proof.dialogue.method, quotes: proof.dialogue.quotes },
        firstDialogueWords: proof.dialogue.words.length,
        dialogueProbeSegmentIds: selected.map((s) => s.id),
      };
      replaced.push("dialogueProbeEvidence", "scriptEvidence");
    }
  }
  row.reasons = [];
  row.claudeHeldValidation = {
    route: result.route,
    tier: proof.tier,
    numberGrade: proof.numberGrade,
    priorHoldReasons: result.priorReasons,
    dependsOnProposedQuestionIds: result.dependsOnProposed ?? [],
    evidenceFieldsStatedByThisReplay: replaced,
    // Every other stored Korean recognition that begins at this same start,
    // whatever it wrote and whether or not the recognizer flagged it. A row
    // whose number is reliable in one listening and flagged in others says so.
    otherRecognitionsFromSameStart: (
      result.diagnostics?.otherReadingsAtStart ?? []
    ).map((reading) => ({
      path: reading.path,
      probeId: reading.probeId,
      purpose: reading.purpose,
      text: reading.text,
      numbers: reading.numbers,
      form: reading.form,
      flaggedUncertain: !reading.firstSegmentReliable,
    })),
    producerIdentityKeptFromFrozenRow: true,
  };
  return row;
}
