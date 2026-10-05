/**
 * One ledger row per current question, in the start-only evidence contract.
 *
 * Every quoted text is copied verbatim from a hash-bound file and named by its
 * raw segment ids, so a replay can read the same bytes and compare.
 */
import { FIRST_DIALOGUE_WORDS } from "./evidence.mjs";
import { POLICY } from "./policy.mjs";

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

const certainLead = (probe) => {
  const out = [];
  for (const segment of probe.segments) {
    if (segment.uncertain) break;
    out.push(segment);
  }
  return out;
};

/**
 * @param record   frozen inventory record
 * @param native   measured native cache
 * @param row      one row of resolveSource(...)
 * @param section  official script section of the question, or null
 * @param check    probe item heard at an existing verified start, or null
 */
export function assembleRow({ record, native, row, section, check }) {
  const { plan, question } = row;
  const pcm = native.meta.pcm;
  const identity = [...row.identity];
  const notes = [];
  const reasons = [...row.reasons];
  let nativeEvidence = null;
  let probeEvidence = null;
  let dialogueProbeEvidence = null;
  let existingCheckProbe = null;
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
    probeEvidence = {
      ...probeReference(cueItem, certainLead(cueItem.probe)),
      firstSpeechSeconds: cueItem.reading.firstSpeechSeconds,
      spokenNumbers: cueItem.reading.cue.numbers,
      cueForm: pick.cue.verdict.cueForm,
      instructionCoverage: pick.cue.verdict.instructionCoverage,
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
    identity.unshift("spoken_ordinal_first_at_start");
    if (plan.officialInstruction)
      identity.push("official_instruction_after_ordinal");
    else if (plan.kind === "single") {
      // The frozen prompt is only "original paper question N"; the number is
      // the whole printed identity of this question.
      if (plan.placeholderNumber === plan.sourceNumber)
        identity.push("frozen_prompt_names_original_question_number");
      notes.push("official_text_unavailable");
    }
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
    } else if (plan.kind === "shared_instruction_member")
      notes.push("member_first_dialogue_unverifiable_no_official_script");
    identity.push("starts_in_question_order");
    if (probeEvidence.cueForm !== "beon")
      notes.push("spoken_number_written_as_" + probeEvidence.cueForm);
  } else if (row.status === "existing_verified") {
    const exact = (row.seekStartMs * pcm.sampleRate) / 1000;
    nativeEvidence = {
      ...cache,
      startFrame: Math.round(exact),
      startFrameIsWhole: Number.isInteger(exact),
      measuredBy:
        "earlier verification; the stored value is preserved unchanged",
    };
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
    scopeQuestionNumbers: plan.scopeQuestionNumbers,
    kind: plan.kind,
    officialInstruction: plan.officialInstruction
      ? { text: plan.officialInstruction, source: plan.instructionSource }
      : null,
    nativeEvidence,
    probeEvidence,
    dialogueProbeEvidence,
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
