/**
 * One ledger row per current question, in the start-only evidence contract.
 *
 * Every quoted text is copied verbatim from a hash-bound file and named by its
 * raw segment ids or its character position, so a replay can read the same
 * bytes and compare.
 */
import { FIRST_DIALOGUE_WORDS } from "./evidence.mjs";
import { POLICY } from "./policy.mjs";
import { strictCoverage } from "./text.mjs";

const joined = (segments) => segments.map((segment) => segment.text).join(" ");

/** Reference to one stored probe and the raw segments quoted from it. */
export function probeReference(item, segments) {
  const { set, probe } = item;
  return {
    path: set.path,
    sha256: set.sha256,
    round: set.round,
    probeId: probe.id,
    purpose: probe.purpose,
    requestedLanguage: item.language,
    startFrame: probe.startFrame,
    frameCount: probe.frameCount,
    sampleRate: probe.sampleRate,
    durationSeconds: probe.durationSeconds,
    clipPcmSha256: probe.clipPcmSha256,
    inputSampleCount: probe.inputSampleCount,
    inputMonoFloat32Sha256: probe.inputMonoFloat32Sha256,
    overflow: probe.overflow,
    segmentIds: segments.map((segment) => segment.id),
    text: joined(segments),
  };
}

export const certainLead = (probe) => {
  const out = [];
  for (const segment of probe.segments) {
    if (segment.uncertain) break;
    out.push(segment);
  }
  return out;
};

/**
 * How a candidate start is grounded:
 *   instruction_grounded     its number and its official sentence in one probe
 *   first_dialogue_grounded  its number, then its own official first utterance
 *   ordinal_only             its number in order; no official text exists
 */
export function startGrade(plan, pick) {
  if (plan.officialInstruction) return "instruction_grounded";
  return pick.dialogue ? "first_dialogue_grounded" : "ordinal_only";
}

/**
 * @param record   frozen inventory record
 * @param native   measured native cache
 * @param row      one row of resolveSource(...)
 * @param section  official script section of the question, or null
 * @param transcriptSha256 SHA-256 of the frozen official transcript text
 * @param check    probe item heard at an existing verified start, or null
 */
export function assembleRow({
  record,
  native,
  row,
  section,
  transcriptSha256,
  check,
}) {
  const { plan, question } = row;
  const pcm = native.meta.pcm;
  const identity = [...row.identity];
  const notes = [];
  const reasons = [...row.reasons];
  let nativeEvidence = null;
  let probeEvidence = null;
  let dialogueProbeEvidence = null;
  let existingCheckProbe = null;
  let scriptEvidence = null;
  let grade = null;
  const cache = {
    sourceAudioSha256: record.sourceAudioSha256,
    sampleRate: pcm.sampleRate,
    channels: pcm.channels,
    frameCount: pcm.frameCount,
    pcmSha256: pcm.sha256,
    windowFrames: native.windowFrames,
    quietThresholdDbfs: POLICY.quietThresholdDbfs,
    cachePath: native.metaPath,
    cacheSha256: native.metaSha256,
    energyPath: native.energyPath,
    energySha256: native.meta.energy.sha256,
  };
  if (row.status === "candidate") {
    const pick = row.accepted;
    const cueItem = pick.cue.item;
    const strict = plan.officialInstruction
      ? strictCoverage(
          plan.officialInstruction,
          cueItem.reading.certainCue.rest,
        )
      : null;
    probeEvidence = {
      ...probeReference(cueItem, certainLead(cueItem.probe)),
      firstSpeechSeconds: cueItem.reading.firstSpeechSeconds,
      spokenNumbers: cueItem.reading.cue.numbers,
      cueForm: pick.cue.verdict.cueForm,
      instructionCoverage: pick.cue.verdict.instructionCoverage,
      strictInstructionCoverage: strict,
    };
    nativeEvidence = {
      ...cache,
      startFrame: pick.fact.startFrame,
      onsetFrame: pick.fact.onsetFrame,
      cueOnsetFrame: pick.fact.onsetFrame,
      leadFrames: pick.fact.onsetFrame - pick.fact.startFrame,
      quietBeforeFrames: pick.fact.quietBeforeFrames,
      leadPeakDbfs: pick.fact.leadPeakDbfs,
      onsetDbfs: pick.fact.onsetDbfs,
      probe: { path: cueItem.set.path, sha256: cueItem.set.sha256 },
      probeOffsetFrame: cueItem.probe.startFrame,
      probeFrameCount: cueItem.probe.frameCount,
      cueProbeSegmentIds: probeEvidence.segmentIds,
    };
    grade = startGrade(plan, pick);
    identity.unshift("spoken_ordinal_first_at_start");
    if (plan.officialInstruction)
      identity.push("official_instruction_after_ordinal");
    if (pick.dialogue) {
      const item = pick.dialogue.item;
      dialogueProbeEvidence = {
        ...probeReference(
          item,
          item.probe.segments.filter((segment) => !segment.uncertain),
        ),
        firstDialogueShare: pick.dialogue.share,
        officialFirstWords: section.words.slice(0, FIRST_DIALOGUE_WORDS),
      };
      identity.push("official_first_dialogue_at_start");
      if (!pick.dialogue.quote)
        notes.push("first_utterance_not_heard_as_exact_quote");
    }
    if (grade === "ordinal_only") {
      // The frozen prompt of an image-only question is "original paper
      // question N": its number is its whole printed identity.
      if (plan.placeholderNumber === plan.sourceNumber)
        identity.push("frozen_prompt_names_original_question_number");
      reasons.push("official_text_unavailable");
      if (plan.kind === "shared_instruction_member")
        notes.push("member_first_dialogue_unverifiable_no_official_script");
    }
    identity.push("starts_in_question_order");
    const supported = Boolean(pick.dialogue);
    if (probeEvidence.cueForm === "bare") {
      notes.push("spoken_number_written_as_bare_digits");
      if (!supported) notes.push("bare_digits_without_first_dialogue_support");
    } else if (probeEvidence.cueForm === "spelled")
      notes.push("spoken_number_spelled_out");
    if (strict !== null && strict < POLICY.minimumInstructionCoverage) {
      notes.push("official_instruction_matched_on_hangul_only");
      if (!supported) notes.push("hangul_only_without_first_dialogue_support");
    }
    if (section)
      scriptEvidence = {
        source: "frozen live snapshot group transcript text",
        transcriptSha256,
        sectionStartCharacter: section.charStart,
        sectionEndCharacter: section.charEnd,
        instructionQuote: section.instruction?.text ?? null,
        instructionStartCharacter: section.instruction?.start ?? null,
        instructionProbeSegmentIds: plan.officialInstruction
          ? probeEvidence.segmentIds
          : null,
        firstUtteranceStartCharacter: section.firstUtterance?.start ?? null,
        firstDialogueQuote: pick.dialogue?.quote?.quote ?? null,
        firstDialogueStartCharacter:
          pick.dialogue?.quote?.startCharacter ?? null,
        firstDialogueWords: pick.dialogue?.quote?.words ?? null,
        dialogueProbeSegmentIds: pick.dialogue?.quote?.segmentIds ?? null,
      };
  } else if (row.status === "existing_verified") {
    const exact = (row.seekStartMs * pcm.sampleRate) / 1000;
    nativeEvidence = {
      ...cache,
      startFrame: Math.round(exact),
      startFrameIsWhole: Number.isInteger(exact),
      measuredBy:
        "earlier verification; the stored value is preserved unchanged",
    };
    grade = "existing_verified";
    identity.unshift("existing_verified_start_preserved");
    if (check) {
      existingCheckProbe = {
        ...probeReference(check, check.probe.segments),
        spokenNumbers: check.reading.cue ? check.reading.cue.numbers : null,
      };
      const numbers = check.reading.cue?.numbers ?? [];
      if (numbers.join() === plan.spokenNumbers.join())
        identity.push("independent_probe_heard_ordinal_at_existing_start");
      else notes.push("independent_probe_did_not_hear_ordinal_first");
    }
  }
  if (row.cueSegments.length) identity.push("whole_asr_cue_segment");
  const settled = row.status !== "held";
  return {
    evidenceContractVersion: 1,
    sourceRecordId: record.sourceRecordId,
    setId: record.setId,
    revision: record.revision,
    documentSha256: record.documentSha256,
    questionId: question.id,
    sourceNumber: question.sourceNumber,
    status: row.status,
    startGrade: grade,
    seekStartMs: row.seekStartMs,
    seekEndMs: settled ? record.audio.durationMs : null,
    sourceAudioSha256: record.sourceAudioSha256,
    playbackSha256: record.audio.sha256,
    asrPath: record.asrPath,
    asrSha256: record.asrSha256,
    cueSegmentIds: row.cueSegments.map((segment) => segment.id),
    cueText: row.cueSegments.length ? joined(row.cueSegments) : null,
    anchorSegmentIds: row.anchorSegments.map((segment) => segment.id),
    anchorText: row.anchorSegments.length ? joined(row.anchorSegments) : null,
    cueNumber: settled ? plan.spokenNumbers[0] : null,
    cueSpokenNumbers: settled ? plan.spokenNumbers : null,
    cueForm: probeEvidence ? probeEvidence.cueForm : null,
    scopeQuestionNumbers: plan.scopeQuestionNumbers,
    kind: plan.kind,
    officialInstruction: plan.officialInstruction
      ? { text: plan.officialInstruction, source: plan.instructionSource }
      : null,
    nativeEvidence,
    probeEvidence,
    dialogueProbeEvidence,
    scriptEvidence,
    existingCheckProbe,
    identityEvidence: identity,
    notes,
    heldDiagnostics:
      row.status === "held"
        ? {
            provenStartFrames: row.clusters.map((cluster) =>
              cluster.map((entry) => entry.startFrame),
            ),
            numberHeard: row.near.map((item) => ({
              startFrame: item.startFrame,
              reasons: item.reasons,
              probePath: item.probe.set.path,
              probeId: item.probe.probe.id,
              text: joined(item.probe.probe.segments),
            })),
          }
        : null,
    reasons,
  };
}
