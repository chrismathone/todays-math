/**
 * Decides, for one original recording, which measured starts are proven.
 *
 * A start is proven for a question only when a bounded recognition that begins
 * EXACTLY at that native frame heard the question's own spoken number first,
 * the frame lies a fixed lead inside measured quiet before the first sound, and
 * the chosen starts of the whole recording are in question order. Everything
 * else is held with its reasons. Nothing is interpolated or spaced evenly.
 */
import { dbfsOfEnergy, energyAtDbfs, quietBefore } from "./activity.mjs";
import {
  MINIMUM_FIRST_DIALOGUE_SHARE,
  assertProbeShape,
  firstDialogueShare,
  heardFirstUtterance,
  judgeProbe,
  readProbe,
} from "./evidence.mjs";
import { POLICY, leadFor } from "./policy.mjs";
import { coverage, hintNumbers, leadingCue, strictCoverage } from "./text.mjs";

export class ResolveError extends Error {}

const fail = (message) => {
  throw new ResolveError(message);
};

/** Probes that begin at a proposed start, as opposed to checks of stored starts. */
export const START_PURPOSES = new Set([
  "bridge_onset",
  "gap_onset",
  "fine_onset",
  "cue_only",
  "member_dialogue",
  "first_dialogue",
]);
/** English listenings for the official first utterance; never a number proof. */
export const DIALOGUE_PURPOSES = new Set(["member_dialogue", "first_dialogue"]);
/**
 * How long after a start its own first utterance may begin: right after a
 * member's number, or after the number and its sentence for any other question.
 */
export const dialogueReachSeconds = (plan) =>
  plan.kind === "shared_instruction_member" ? 6 : 20;
/** Proven starts closer than this are one cue heard from two nearby onsets. */
const SAME_CUE_SECONDS = 3;
/** Frozen-ASR utterances of a question, all placed elsewhere, that hold its start. */
const ANCHOR_CONFLICT_SEGMENTS = 3;

/**
 * Re-measures the lead of a start on the native energy. Returns the native
 * facts or a reason; a request's own numbers are never trusted.
 */
export function measureStart(native, startFrame) {
  const frames = native.windowFrames;
  if (!Number.isSafeInteger(startFrame) || startFrame % frames !== 0)
    return { reason: "start_off_window_grid" };
  const startWindow = startFrame / frames;
  const energy = native.energy;
  if (startWindow < 0 || startWindow >= energy.length)
    return { reason: "start_outside_audio" };
  const threshold = energyAtDbfs(POLICY.quietThresholdDbfs, frames);
  if (energy[startWindow] >= threshold)
    return { reason: "start_is_inside_sound" };
  // The onset is the first sound after the start; it is measured, not given.
  let onsetWindow = startWindow;
  while (
    onsetWindow < energy.length &&
    onsetWindow - startWindow <= POLICY.leadWindows &&
    energy[onsetWindow] < threshold
  )
    onsetWindow++;
  if (
    onsetWindow >= energy.length ||
    onsetWindow - startWindow > POLICY.leadWindows
  )
    return { reason: "no_sound_at_onset" };
  const quiet = quietBefore(energy, threshold, onsetWindow);
  if (quiet < POLICY.minimumQuietBeforeWindows)
    return { reason: "quiet_before_onset_too_short" };
  // Either the full lead, or the whole of a shorter quiet: never a point that
  // leaves measured quiet unused behind it or reaches back into sound.
  if (onsetWindow - startWindow !== leadFor(quiet))
    return { reason: "start_is_not_the_policy_lead" };
  let peak = 0;
  for (let w = startWindow; w < onsetWindow; w++)
    if (energy[w] > peak) peak = energy[w];
  return {
    startFrame,
    onsetFrame: onsetWindow * frames,
    quietBeforeFrames: quiet * frames,
    // Unrounded, so a replay can compare the same arithmetic.
    leadPeakDbfs: peak > 0 ? dbfsOfEnergy(peak, frames) : null,
    onsetDbfs: dbfsOfEnergy(energy[onsetWindow], frames),
  };
}

/**
 * What the probes that begin at ONE frame prove for one question.
 * `items` are { probe, reading } of that frame.
 *
 * The spoken number and, where the question has one, its official sentence must
 * be heard by a single probe. A question whose number is followed directly by
 * its own dialogue also needs an English probe from the same frame that heard
 * the official first utterance, whenever an official script section exists.
 */
export function proveAtStart(
  plan,
  items,
  sharedInstruction,
  section,
  later = [],
) {
  const judged = items
    .filter((item) => !DIALOGUE_PURPOSES.has(item.probe.purpose))
    .map((item) => ({
      item,
      verdict: judgeProbe(plan, item.reading, sharedInstruction),
    }));
  const whole = judged.find((entry) => entry.verdict.ok) ?? null;
  // The number itself is proven although its sentence was not heard well
  // enough; bare digits never stand without their sentence.
  const numbered =
    whole ??
    judged.find(
      (entry) =>
        entry.verdict.cueForm !== "bare" &&
        entry.verdict.reasons.every(
          (reason) => reason === "official_instruction_not_heard",
        ),
    ) ??
    null;
  const needsDialogue =
    plan.kind === "shared_instruction_member" && Boolean(section);
  // The best English listening for the official first utterance, where an
  // official script section exists: required for a member, supporting for any
  // other question. It begins at this frame or at a later measured onset
  // (`later`): a recognizer that hears "Number 20" and then a pause ends its
  // window there, so the dialogue is heard from its own first sound instead.
  let dialogue = null;
  let dialogueShare = null;
  if (section)
    for (const item of [...items, ...later]) {
      if (!DIALOGUE_PURPOSES.has(item.probe.purpose) || item.probe.overflow)
        continue;
      const share = firstDialogueShare(section.words, item.probe);
      const quote = heardFirstUtterance(section.firstUtterance, item.probe);
      if (dialogueShare === null || share > dialogueShare)
        dialogueShare = share;
      const heard = share >= MINIMUM_FIRST_DIALOGUE_SHARE || Boolean(quote);
      if (heard && (!dialogue || share > dialogue.share))
        dialogue = { item, share, quote };
    }
  let proof = null;
  if (whole && (!needsDialogue || dialogue))
    proof = {
      cue: whole,
      dialogue,
      grounding: plan.officialInstruction
        ? "instruction"
        : dialogue
          ? "first_dialogue"
          : "ordinal",
    };
  else if (numbered && plan.officialInstruction && dialogue?.quote)
    // Its own official first utterance, heard word for word from the same
    // frame, grounds a number whose sentence the recognizer garbled.
    proof = { cue: numbered, dialogue, grounding: "first_dialogue" };
  return {
    proof,
    judged,
    cue: whole,
    numbered,
    needsDialogue,
    wantsDialogue:
      needsDialogue ||
      Boolean(
        !whole &&
        numbered &&
        plan.officialInstruction &&
        section?.firstUtterance,
      ),
    dialogueShare,
  };
}

/** Longest strictly increasing subsequence by value; returns kept indexes. */
function increasingChain(values) {
  const best = values.map(() => 1);
  const from = values.map(() => -1);
  let end = -1;
  values.forEach((value, i) => {
    for (let j = 0; j < i; j++)
      if (values[j] < value && best[j] + 1 > best[i]) {
        best[i] = best[j] + 1;
        from[i] = j;
      }
    if (end < 0 || best[i] > best[end]) end = i;
  });
  const kept = new Set();
  for (let i = end; i >= 0; i = from[i]) kept.add(i);
  return kept;
}

const sharedInstructionFor = (plans, plan) =>
  plan.kind === "shared_instruction_member"
    ? (plans.find(
        (other) =>
          other.kind === "shared_instruction_head" &&
          other.spokenNumbers[1] === plan.sourceNumber,
      )?.officialInstruction ?? null)
    : null;

/**
 * @param record    frozen inventory record
 * @param plans     question plans with every known official instruction
 * @param native    measured native cache of the original
 * @param probeSets [{ path, sha256, round, artifact }] stored probe files of this source
 * @param asr       frozen whole-record ASR
 * @param dialogue  Map(sourceNumber -> owned whole-ASR segments) or null
 * @param sections  official script sections or null
 */
export function resolveSource({
  record,
  plans,
  native,
  probeSets,
  asr,
  dialogue,
  sections,
}) {
  const pcm = native.meta.pcm;
  const rate = pcm.sampleRate;
  const seconds = (frame) => frame / rate;

  // 1. Every stored probe, shape-checked and bound to this original.
  const heard = [];
  for (const set of probeSets) {
    const artifact = set.artifact;
    if (
      artifact.sourceRecordId !== record.sourceRecordId ||
      artifact.sourceAudioSha256 !== record.sourceAudioSha256 ||
      artifact.nativePcm.sha256 !== pcm.sha256 ||
      artifact.nativePcm.sampleRate !== rate ||
      artifact.nativePcm.channels !== pcm.channels ||
      artifact.nativePcm.frameCount !== pcm.frameCount
    )
      fail("Probe file belongs to another original: " + set.path);
    for (const probe of artifact.probes) {
      assertProbeShape(probe, pcm);
      heard.push({
        set,
        probe,
        reading: readProbe(probe),
        language: probe.requestedLanguage ?? artifact.requestedLanguage,
      });
    }
  }
  const byStart = new Map();
  for (const item of heard) {
    if (!START_PURPOSES.has(item.probe.purpose)) continue;
    const key = item.probe.startFrame;
    if (!byStart.has(key)) byStart.set(key, []);
    byStart.get(key).push(item);
  }
  const measured = new Map();
  for (const startFrame of byStart.keys())
    measured.set(startFrame, measureStart(native, startFrame));

  // English listenings that begin at a later measured onset, close enough after
  // a start to be that question's own first utterance.
  const dialogueItems = heard
    .filter(
      (item) =>
        DIALOGUE_PURPOSES.has(item.probe.purpose) &&
        !measured.get(item.probe.startFrame).reason,
    )
    .sort((a, b) => a.probe.startFrame - b.probe.startFrame);
  // Every frame where a Korean probe heard some number for certain. The first
  // such frame after a start that belongs to ANOTHER question ends the stretch
  // in which that start's own dialogue can begin.
  const numberFrames = heard
    .filter(
      (item) =>
        START_PURPOSES.has(item.probe.purpose) &&
        !DIALOGUE_PURPOSES.has(item.probe.purpose) &&
        item.reading.certainCue,
    )
    .map((item) => ({
      frame: item.probe.startFrame,
      number: item.reading.certainCue.numbers[0],
    }))
    .sort((a, b) => a.frame - b.frame);
  const dialogueAfter = (startFrame, plan) => {
    const reach = dialogueReachSeconds(plan) * rate;
    const stop =
      numberFrames.find(
        (entry) =>
          entry.frame > startFrame + 2 * rate &&
          entry.number !== plan.sourceNumber,
      )?.frame ?? Infinity;
    return dialogueItems.filter(
      (item) =>
        item.probe.startFrame > startFrame &&
        item.probe.startFrame <= startFrame + reach &&
        item.probe.startFrame < stop,
    );
  };
  // Where the dialogue can begin: after everything the number probe heard for
  // certain (the number, and its sentence when it has one).
  const afterNumber = (item) => {
    const end = item.probe.segments
      .filter((segment) => !segment.uncertain)
      .reduce((max, segment) => Math.max(max, segment.localEndSeconds), 0);
    return (
      item.probe.startFrame +
      Math.max(native.windowFrames, Math.round((end - 0.5) * rate))
    );
  };

  // 2. Proven starts per question.
  const proofs = plans.map((plan) => {
    const shared = sharedInstructionFor(plans, plan);
    const section = sections?.get(plan.sourceNumber) ?? null;
    const found = [];
    const near = [];
    for (const [startFrame, items] of byStart) {
      const fact = measured.get(startFrame);
      const later = dialogueAfter(startFrame, plan);
      const outcome = proveAtStart(plan, items, shared, section, later);
      if (outcome.proof && !fact.reason) {
        found.push({ startFrame, fact, ...outcome.proof });
        continue;
      }
      const sameNumber = outcome.judged.find(
        (entry) =>
          entry.item.reading.cue &&
          entry.item.reading.cue.numbers.join() === plan.spokenNumbers.join(),
      );
      if (!sameNumber && !outcome.proof) continue;
      const why = [];
      if (fact.reason) why.push(fact.reason);
      if (!outcome.cue && sameNumber) why.push(...sameNumber.verdict.reasons);
      if (outcome.numbered && outcome.wantsDialogue && !outcome.proof)
        why.push(
          outcome.dialogueShare === null
            ? "first_dialogue_not_probed"
            : "first_dialogue_not_heard",
        );
      near.push({
        startFrame,
        reasons: why,
        probe: (outcome.numbered ?? sameNumber).item,
        numberProven: Boolean(outcome.numbered),
        hasCueOnly: items.some((item) => item.probe.purpose === "cue_only"),
        hasDialogue: later.length > 0,
        needsDialogue: outcome.wantsDialogue,
        afterFrame: afterNumber((outcome.numbered ?? sameNumber).item),
      });
    }
    found.sort((a, b) => a.startFrame - b.startFrame);
    // Cluster starts that hear the same cue from neighbouring onsets.
    const clusters = [];
    for (const entry of found) {
      const last = clusters.at(-1);
      if (
        last &&
        seconds(entry.startFrame - last.at(-1).startFrame) <= SAME_CUE_SECONDS
      )
        last.push(entry);
      else clusters.push([entry]);
    }
    return { plan, clusters, near };
  });

  // 3. Existing verified starts are fixed points and never re-decided.
  const existing = new Map();
  for (const question of record.questions)
    if (question.audioRange)
      existing.set(question.sourceNumber, question.audioRange.startMs);

  const chosen = new Map();
  const reasons = new Map(plans.map((plan) => [plan.sourceNumber, []]));
  proofs.forEach(({ plan, clusters }) => {
    if (existing.has(plan.sourceNumber)) return;
    // The latest onset of a cluster is the one nearest the spoken number.
    if (clusters.length === 1)
      chosen.set(plan.sourceNumber, clusters[0].at(-1));
  });

  // 4. Order: the starts of one recording follow the question order.
  const positionMs = (number) =>
    existing.has(number)
      ? existing.get(number)
      : chosen.has(number)
        ? (chosen.get(number).startFrame * 1000) / rate
        : null;
  const blockKey = (plan) => plan.blockHead ?? plan.sourceNumber;
  const drop = (number, reason) => {
    if (existing.has(number)) return;
    chosen.delete(number);
    if (!reasons.get(number).includes(reason)) reasons.get(number).push(reason);
  };
  const blocksNow = () => {
    const blocks = [];
    for (const plan of plans) {
      const ms = positionMs(plan.sourceNumber);
      if (ms === null) continue;
      const last = blocks.at(-1);
      if (last && last.key === blockKey(plan)) {
        if (last.ms !== ms) last.split = true;
        last.numbers.push(plan.sourceNumber);
      } else
        blocks.push({ key: blockKey(plan), ms, numbers: [plan.sourceNumber] });
    }
    return blocks;
  };
  for (const block of blocksNow().filter((b) => b.split))
    for (const number of block.numbers)
      drop(number, "shared_passage_rows_disagree");
  {
    const blocks = blocksNow();
    const kept = increasingChain(blocks.map((block) => block.ms));
    blocks.forEach((block, index) => {
      if (kept.has(index)) return;
      for (const number of block.numbers)
        drop(number, "ordinal_order_conflict");
    });
  }

  // 5. Several distant proven places: keep the one the neighbours allow, if one.
  const bound = (index, step) => {
    for (let i = index + step; i >= 0 && i < plans.length; i += step) {
      if (blockKey(plans[i]) === blockKey(plans[index])) continue;
      const ms = positionMs(plans[i].sourceNumber);
      if (ms !== null) return ms;
    }
    return step < 0 ? -Infinity : Infinity;
  };
  proofs.forEach(({ plan, clusters }, index) => {
    if (existing.has(plan.sourceNumber) || chosen.has(plan.sourceNumber))
      return;
    if (clusters.length < 2) return;
    const low = bound(index, -1);
    const high = bound(index, 1);
    const allowed = clusters.filter((cluster) => {
      const ms = (cluster.at(-1).startFrame * 1000) / rate;
      return ms > low && ms < high;
    });
    if (allowed.length === 1) chosen.set(plan.sourceNumber, allowed[0].at(-1));
    else reasons.get(plan.sourceNumber).push("ambiguous_cue_positions");
  });
  // A shared passage has one start: both rows or neither.
  for (const plan of plans) {
    if (plan.kind !== "shared_passage") continue;
    const starts = plan.scopeQuestionNumbers.map((n) => positionMs(n));
    if (starts.some((ms) => ms === null) || starts[0] !== starts[1])
      for (const number of plan.scopeQuestionNumbers)
        if (chosen.has(number)) drop(number, "shared_passage_rows_disagree");
  }

  // 6. Frozen whole-record ASR references: quoted, never edited. A dialogue
  //    that the frozen ASR places wholly outside the question's own stretch
  //    contradicts the start and holds it.
  const segments = asr.segments;
  const byId = new Map(segments.map((segment) => [segment.id, segment]));
  const anchors = new Map();
  proofs.forEach(({ plan }, index) => {
    const startMs = positionMs(plan.sourceNumber);
    if (startMs === null) return;
    const startSeconds = startMs / 1000;
    const high = bound(index, 1);
    const until = Number.isFinite(high) ? high / 1000 : pcm.frameCount / rate;
    const supporting = [];
    let conflicting = 0;
    for (const item of dialogue?.get(plan.sourceNumber) ?? []) {
      const segment = byId.get(item.segmentId);
      if (
        segment.estimatedEndSeconds >= startSeconds - 1 &&
        segment.estimatedStartSeconds <= until + 1
      )
        supporting.push(segment);
      else if (
        segment.estimatedEndSeconds < startSeconds - 5 ||
        segment.estimatedStartSeconds > until + 5
      )
        conflicting++;
    }
    anchors.set(plan.sourceNumber, { supporting, conflicting, startSeconds });
  });
  // One stray utterance is alignment noise; several with none in place is a
  // contradiction.
  for (const [number, anchor] of anchors)
    if (
      !anchor.supporting.length &&
      anchor.conflicting >= ANCHOR_CONFLICT_SEGMENTS &&
      chosen.has(number)
    )
      drop(number, "dialogue_anchor_conflict");

  const rows = proofs.map(({ plan, clusters, near }, index) => {
    const question = record.questions[index];
    const rowReasons = reasons.get(plan.sourceNumber);
    const accepted = chosen.get(plan.sourceNumber) ?? null;
    const isExisting = existing.has(plan.sourceNumber);
    const startMs = positionMs(plan.sourceNumber);
    // Frozen whole-record ASR references. A cue segment is one that wrote this
    // number and whose estimated span holds the measured onset. An anchor is the
    // official sentence written right at that cue segment. Everything else that
    // merely lies nearby is quoted as diagnostic, not as cue or anchor.
    const cueSegments = [];
    const anchorSegments = [];
    const diagnosticSegments = [];
    const identity = [];
    if (startMs !== null) {
      const startSeconds = startMs / 1000;
      const onsetSeconds = accepted
        ? accepted.fact.onsetFrame / rate
        : startSeconds + (POLICY.leadWindows * POLICY.windowMs) / 1000;
      const numbers = plan.spokenNumbers.join();
      const official = plan.officialInstruction;
      const heardOfficial = (text) =>
        official &&
        coverage(official, text) >= POLICY.minimumInstructionCoverage;
      segments.forEach((segment, at) => {
        const cue = leadingCue(segment.text);
        const bound =
          cue &&
          cue.numbers.join() === numbers &&
          segment.estimatedStartSeconds - 2 <= onsetSeconds &&
          onsetSeconds <= segment.estimatedEndSeconds + 2;
        if (bound) {
          cueSegments.push(segment);
          if (heardOfficial(cue.rest)) anchorSegments.push(segment);
          else if (segments[at + 1] && heardOfficial(segments[at + 1].text))
            anchorSegments.push(segments[at + 1]);
          return;
        }
        const nearby =
          segment.estimatedEndSeconds >= startSeconds - 2 &&
          segment.estimatedStartSeconds <= startSeconds + 20;
        if (nearby && heardOfficial(segment.text))
          diagnosticSegments.push(segment);
      });
      const anchor = anchors.get(plan.sourceNumber);
      if (anchor.supporting.length) {
        identity.push(
          anchor.conflicting ? "dialogue_anchor_partial" : "dialogue_anchor",
        );
        for (const segment of anchor.supporting.slice(0, 3))
          diagnosticSegments.push(segment);
      }
    }
    const unique = (list) => [...new Set(list)].sort((x, y) => x.id - y.id);
    if (!isExisting && !accepted && !rowReasons.length)
      rowReasons.push(
        clusters.length
          ? "start_not_accepted"
          : near.length
            ? "number_heard_but_not_proven"
            : "no_probe_heard_this_number",
      );
    return {
      plan,
      question,
      status: isExisting
        ? "existing_verified"
        : accepted
          ? "candidate"
          : "held",
      seekStartMs: isExisting
        ? existing.get(plan.sourceNumber)
        : accepted
          ? (accepted.startFrame * 1000) / rate
          : null,
      accepted,
      near,
      clusters,
      cueSegments,
      anchorSegments: unique(anchorSegments),
      diagnosticSegments: unique(
        diagnosticSegments.filter(
          (segment) =>
            !cueSegments.includes(segment) && !anchorSegments.includes(segment),
        ),
      ),
      identity,
      reasons: rowReasons,
    };
  });
  for (const row of rows)
    if (row.seekStartMs !== null && !Number.isInteger(row.seekStartMs))
      fail("Seek start is not whole milliseconds: " + row.question.id);

  // 7. Where to listen next for the questions still held. These are listening
  //    hints only: an expected place from the recording's own measured spacing
  //    and any place where the frozen ASR wrote this number in any form.
  const openGaps = [];
  const cueOnly = [];
  const memberDialogue = [];
  const spacings = [];
  for (let i = 1; i < plans.length; i++) {
    const a = positionMs(plans[i - 1].sourceNumber);
    const b = positionMs(plans[i].sourceNumber);
    if (a !== null && b !== null && b > a) spacings.push(b - a);
  }
  spacings.sort((x, y) => x - y);
  const spacingMs = spacings.length
    ? spacings[Math.floor(spacings.length / 2)]
    : null;
  rows.forEach((row, index) => {
    if (row.status !== "held") return;
    const low = bound(index, -1);
    const high = bound(index, 1);
    let expectedMs = null;
    if (spacingMs !== null)
      for (let step = 1; step < plans.length && expectedMs === null; step++) {
        const before = plans[index - step];
        const after = plans[index + step];
        const beforeMs = before ? positionMs(before.sourceNumber) : null;
        const afterMs = after ? positionMs(after.sourceNumber) : null;
        if (beforeMs !== null) expectedMs = beforeMs + spacingMs * step;
        else if (afterMs !== null) expectedMs = afterMs - spacingMs * step;
      }
    const lowSeconds = Number.isFinite(low) ? low / 1000 : 0;
    const highSeconds = Number.isFinite(high)
      ? high / 1000
      : pcm.frameCount / rate;
    const hints = [];
    for (const segment of segments) {
      if (
        segment.estimatedEndSeconds < lowSeconds ||
        segment.estimatedStartSeconds > highSeconds
      )
        continue;
      if (hintNumbers(segment.text)[0] === row.plan.spokenNumbers[0])
        hints.push({
          segmentId: segment.id,
          fromFrame: Math.round(segment.estimatedStartSeconds * rate),
          toFrame: Math.round(segment.estimatedEndSeconds * rate),
        });
    }
    openGaps.push({
      sourceNumber: row.plan.sourceNumber,
      afterFrame: Number.isFinite(low) ? Math.round((low * rate) / 1000) : 0,
      beforeFrame: Number.isFinite(high)
        ? Math.round((high * rate) / 1000)
        : pcm.frameCount,
      expectedFrame:
        expectedMs === null ? null : Math.round((expectedMs * rate) / 1000),
      hints,
    });
    for (const item of row.near) {
      const startMs = (item.startFrame * 1000) / rate;
      if (startMs <= low || startMs >= high) continue;
      if (
        row.plan.kind === "shared_instruction_member" &&
        !item.numberProven &&
        !item.hasCueOnly &&
        item.reasons.some((reason) => reason.includes("uncertain"))
      )
        cueOnly.push({
          sourceNumber: row.plan.sourceNumber,
          startFrame: item.startFrame,
        });
      if (item.needsDialogue && !item.hasDialogue)
        memberDialogue.push({
          sourceNumber: row.plan.sourceNumber,
          startFrame: item.startFrame,
          afterFrame: item.afterFrame,
          reachFrames: dialogueReachSeconds(row.plan) * rate,
        });
    }
  });
  // 8. Supporting English listenings for starts whose number was written as
  //    bare digits, or whose official sentence prints an English name or numeral
  //    that the Korean probe wrote in Hangul. They add evidence to a candidate;
  //    they never decide its status here.
  const dialogueWanted = [];
  for (const row of rows) {
    if (row.status !== "candidate") continue;
    if (row.plan.kind === "shared_instruction_member") continue;
    if (!sections?.get(row.plan.sourceNumber)?.firstUtterance) continue;
    const pick = row.accepted;
    // Already supported, or already listened to from a later onset.
    if (pick.dialogue || dialogueAfter(pick.startFrame, row.plan).length)
      continue;
    const heardText = pick.cue.item.reading.certainCue?.rest ?? "";
    const onHangulOnly =
      row.plan.officialInstruction &&
      strictCoverage(row.plan.officialInstruction, heardText) <
        POLICY.minimumInstructionCoverage;
    if (pick.cue.verdict.cueForm === "bare" || onHangulOnly)
      dialogueWanted.push({
        sourceNumber: row.plan.sourceNumber,
        startFrame: pick.startFrame,
        afterFrame: afterNumber(pick.cue.item),
        reachFrames: dialogueReachSeconds(row.plan) * rate,
      });
  }
  const candidateStarts = rows
    .filter((row) => row.status === "candidate")
    .map((row) => ({
      sourceNumber: row.plan.sourceNumber,
      startFrame: row.accepted.startFrame,
    }));
  return {
    rows,
    openGaps,
    cueOnly,
    memberDialogue,
    dialogueWanted,
    candidateStarts,
    heard,
  };
}
