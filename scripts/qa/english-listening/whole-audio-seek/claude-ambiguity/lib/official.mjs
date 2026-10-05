/**
 * Replays every held official question against the stored recognitions and
 * returns, per question, either a proof or the first reason it does not hold.
 *
 * The earlier producer's row supplies only WHERE to look (a measured start and
 * onset frame and the probe that began there). What that place proves is
 * decided here from the raw files.
 */
import { questionPlans, ownSentence } from "../../claude/lib/questions.mjs";
import {
  findNumberClip,
  findOwnDialogue,
  koreanReadingsAtStart,
} from "./assemble.mjs";
import {
  Hold,
  completeChronology,
  cueReading,
  verifyOrder,
  verifyOrdinalOnly,
  verifyOwnEvidence,
} from "./identity.mjs";
import { ProbeStore, loadNativeEnergy, officialScript } from "./store.mjs";

/** The frozen facts of one source that the identity replay compares against. */
export function sourceFacts(record, clock) {
  const plans = questionPlans(record);
  return {
    sourceRecordId: record.sourceRecordId,
    sourceAudioSha256: record.sourceAudioSha256,
    playbackDurationMs: record.audio.durationMs,
    clock: {
      sampleRate: clock.sampleRate,
      channels: clock.channels,
      frameCount: clock.frameCount,
      pcmSha256: clock.decodedInterleavedInt16Sha256,
    },
    questions: record.questions.map((q, i) => ({
      questionId: q.id,
      sourceNumber: q.sourceNumber,
      instruction: q.instruction ?? null,
      promptSentence: ownSentence(q) || null,
      kind: plans[i].kind,
      spokenNumbers: plans[i].spokenNumbers,
      scopeQuestionNumbers: plans[i].scopeQuestionNumbers,
    })),
  };
}

/** Places worth replaying for one held row: the producer's start, or where it heard the number. */
function placesOf(mark, store, sourceRecordId) {
  if (mark?.status === "candidate" && mark.nativeEvidence && mark.probeEvidence)
    return [
      {
        startFrame: mark.nativeEvidence.startFrame,
        onsetFrame: mark.nativeEvidence.onsetFrame,
        cueProbe: {
          path: mark.probeEvidence.path,
          sha256: mark.probeEvidence.sha256,
          probeId: mark.probeEvidence.probeId,
        },
      },
    ];
  const places = [];
  for (const heard of mark?.heldDiagnostics?.numberHeard ?? []) {
    const loaded = store.load(sourceRecordId, heard.probePath);
    const probe = loaded?.container.probes.find((p) => p.id === heard.probeId);
    if (!probe || probe.startFrame !== heard.startFrame) continue;
    places.push({
      startFrame: probe.startFrame,
      onsetFrame: probe.onsetFrame,
      cueProbe: {
        path: loaded.path,
        sha256: loaded.containerSha256,
        probeId: probe.id,
      },
      producerReasons: heard.reasons,
    });
  }
  return places;
}

/**
 * `context`: { inventory, clockBySource, frozenFilesBySource, liveBySet,
 *              marksByQuestion, baselineByQuestion, nativeDir, probeRoots }
 * `held`: the held official rows of the frozen replay.
 * Returns { results: Map(questionId -> result), sources, store }.
 */
export function replayOfficial(context, held) {
  const store = new ProbeStore(context.probeRoots);
  const recordById = new Map(
    context.inventory.records.map((r) => [r.sourceRecordId, r]),
  );
  const results = new Map();
  const sources = new Map();
  const bySource = new Map();
  for (const row of held) {
    if (!bySource.has(row.sourceRecordId)) bySource.set(row.sourceRecordId, []);
    bySource.get(row.sourceRecordId).push(row);
  }

  for (const [sourceRecordId, rows] of bySource) {
    const record = recordById.get(sourceRecordId);
    const clock = context.clockBySource.get(sourceRecordId);
    const facts = sourceFacts(record, clock);
    const native = loadNativeEnergy(context.nativeDir, record, clock);
    const script = officialScript(
      record,
      context.frozenFilesBySource.get(sourceRecordId),
      context.liveBySet,
    );
    sources.set(sourceRecordId, { record, facts, native, script });
    const rate = clock.sampleRate;

    for (const row of rows) {
      const question = facts.questions.find(
        (q) => q.questionId === row.questionId,
      );
      const mark = context.marksByQuestion.get(row.questionId);
      const base = {
        questionId: row.questionId,
        sourceRecordId,
        sourceNumber: row.sourceNumber,
        priorReasons: row.reasons,
        kind: question.kind,
        producerStatus: mark?.status ?? null,
      };
      const places = placesOf(mark, store, sourceRecordId);
      if (!places.length) {
        results.set(row.questionId, {
          ...base,
          outcome: "held",
          reason: "no_measured_place_to_replay",
          producerReasons: mark?.reasons ?? [],
        });
        continue;
      }
      let best = null;
      const world = { record, facts, native, script, rate };
      search: for (const place of places) {
        // The producer's own probe first. Where that one's number is flagged
        // uncertain or missing, a short listening from the very same frame
        // that wrote the literal number reliably may stand in its place.
        const clips = findNumberClip(
          store,
          sourceRecordId,
          place.startFrame,
          place.onsetFrame,
          rate,
          question.spokenNumbers,
        );
        const primaries = [place.cueProbe];
        if (clips.reference)
          primaries.push({
            ...clips.reference,
            standsInForProducerProbe: true,
          });
        for (const cueProbe of primaries) {
          const attempt = replayPlace(context, store, world, row, question, {
            ...place,
            cueProbe,
          });
          if (attempt.outcome === "own_evidence_replayed") {
            best = attempt;
            break search;
          }
          best ??= attempt;
          const reason = attempt.reason;
          if (
            reason !== "spoken_number_segment_uncertain" &&
            reason !== "spoken_number_missing" &&
            reason !== "probe_does_not_begin_at_spoken_cue"
          )
            break;
        }
      }
      results.set(row.questionId, {
        ...base,
        ...best,
        placesTried: places.length,
      });
    }
  }

  settleOrder(context, results, sources);
  return { results, sources, store };
}

function replayPlace(context, store, world, row, question, place) {
  const { record, facts, native, script, rate } = world;
  const sourceRecordId = record.sourceRecordId;
  const { startFrame, onsetFrame } = place;
  const claim = {
    seekStartMs: Math.floor((startFrame * 1000) / rate),
    seekEndMs: record.audio.durationMs,
    startFrame,
    onsetFrame,
    cueProbe: {
      path: place.cueProbe.path,
      sha256: place.cueProbe.sha256,
      probeId: place.cueProbe.probeId,
    },
  };
  const loaded = { cueProbe: store.load(sourceRecordId, place.cueProbe.path) };
  const primary = loaded.cueProbe?.container.probes.find(
    (p) => p.id === place.cueProbe.probeId,
  );
  let primaryReading = null;
  try {
    primaryReading = primary ? cueReading(primary) : null;
  } catch {
    primaryReading = null;
  }
  const clip = findNumberClip(
    store,
    sourceRecordId,
    startFrame,
    onsetFrame,
    rate,
    question.spokenNumbers,
  );
  if (
    clip.reference &&
    !(
      clip.reference.path === loaded.cueProbe?.path &&
      clip.reference.probeId === place.cueProbe.probeId
    )
  ) {
    claim.numberClip = clip.reference;
    loaded.numberClip = store.load(sourceRecordId, clip.reference.path);
  }
  const others = koreanReadingsAtStart(
    store,
    sourceRecordId,
    startFrame,
  ).filter(
    (r) =>
      !(
        r.path === loaded.cueProbe?.path && r.probeId === place.cueProbe.probeId
      ),
  );
  let dialogue = null;
  if (question.kind !== "shared_passage") {
    dialogue = findOwnDialogue(
      store,
      sourceRecordId,
      script.text,
      facts.questions,
      question,
      onsetFrame,
      rate,
    );
    if (dialogue.reference) {
      claim.dialogueProbe = dialogue.reference;
      claim.opening = dialogue.opening;
      loaded.dialogueProbe = store.load(
        sourceRecordId,
        dialogue.reference.path,
      );
    }
  }
  const input = {
    question,
    source: facts,
    native,
    script: { text: script.text },
    claim,
    loaded,
    readingsAtStart: others,
    baseline: {
      hasVerifiedStart: context.baselineByQuestion.has(row.questionId),
    },
  };
  const diagnostics = {
    producerReasonsAtPlace: place.producerReasons ?? null,
    cueProbeStandsInForProducerProbe:
      place.cueProbe.standsInForProducerProbe === true,
    primaryReading: primaryReading
      ? {
          text: primaryReading.text,
          numbers: primaryReading.numbers,
          form: primaryReading.form,
          firstSegmentReliable: primaryReading.firstSegmentReliable,
        }
      : null,
    numberClipAttempts: clip.attempts.map((a) => ({
      path: a.path,
      sha256: a.sha256,
      probeId: a.probeId,
      text: a.text,
      firstSegmentReliable: a.firstSegmentReliable,
    })),
    otherReadingsAtStart: others.map((r) => ({
      path: r.path,
      probeId: r.probeId,
      purpose: r.purpose,
      text: r.text,
      numbers: r.numbers,
      form: r.form,
      firstSegmentReliable: r.firstSegmentReliable,
    })),
    dialogueSearch: dialogue
      ? {
          reason: dialogue.reason ?? null,
          officialFirstUtterance: dialogue.officialFirstUtterance ?? null,
          listened: dialogue.listened,
        }
      : null,
    scriptUnavailable: script.reason ?? null,
  };
  const attempt = (verify) => {
    try {
      return {
        outcome: "own_evidence_replayed",
        claim,
        proof: verify(input),
        diagnostics,
        input,
      };
    } catch (error) {
      if (!(error instanceof Hold)) throw error;
      return {
        outcome: "held",
        reason: error.reason,
        detail: error.detail,
        claim,
        diagnostics,
      };
    }
  };
  const first = attempt(verifyOwnEvidence);
  // Nothing official to compare with at all: the literal number alone, which
  // stands only inside a complete chronology of the recording.
  const nothingToCompare =
    (first.reason === "official_sentence_unavailable" &&
      question.kind === "single") ||
    (first.reason === "member_needs_own_dialogue_opening" &&
      !script.text?.match(/[A-Za-z]{3}/));
  if (first.outcome === "held" && nothingToCompare) {
    input.officialTextToCompare = false;
    return attempt(verifyOrdinalOnly);
  }
  return first;
}

/**
 * Neighbours and whole-recording chronology, to a fixed point: a start that
 * depends on another proposed start stands only while that one stands.
 */
export function settleOrder(context, results, sources) {
  const standing = (r) =>
    r && (r.outcome === "own_evidence_replayed" || r.outcome === "candidate");
  const known = (sourceRecordId) => {
    const { record } = sources.get(sourceRecordId);
    const starts = new Map();
    for (const q of record.questions) {
      const baseline = context.baselineByQuestion.get(q.id);
      if (baseline)
        starts.set(q.sourceNumber, {
          startMs: baseline.startMs,
          provenance: baseline.provenance,
          questionId: q.id,
        });
      const result = results.get(q.id);
      if (standing(result))
        starts.set(q.sourceNumber, {
          startMs: result.claim.seekStartMs,
          provenance: "proposed_here",
          questionId: q.id,
          tier: result.proof.tier,
        });
    }
    return starts;
  };
  for (let changed = true; changed;) {
    changed = false;
    for (const result of results.values()) {
      if (!standing(result)) continue;
      const { record, facts } = sources.get(result.sourceRecordId);
      const question = facts.questions.find(
        (q) => q.questionId === result.questionId,
      );
      const starts = known(result.sourceRecordId);
      const numbers = record.questions
        .map((q) => q.sourceNumber)
        .sort((a, b) => a - b);
      const scope = question.scopeQuestionNumbers;
      const earlier = numbers
        .filter((n) => n < scope[0] && starts.has(n))
        .at(-1);
      const isLastQuestion = scope.at(-1) === numbers.at(-1);
      const next = starts.get(scope.at(-1) + 1);
      const neighbors = {
        previous:
          earlier === undefined
            ? null
            : { sourceNumber: earlier, ...starts.get(earlier) },
        next:
          isLastQuestion || !next
            ? null
            : { sourceNumber: scope.at(-1) + 1, ...next },
        isLastQuestion,
      };
      try {
        result.neighbors = verifyOrder(
          result.proof,
          question,
          facts,
          result.claim,
          neighbors,
        );
        // Both questions of one shared passage begin at one and the same place.
        for (const peer of scope) {
          const other = starts.get(peer);
          if (!other || other.startMs !== result.claim.seekStartMs)
            throw new Hold("shared_passage_start_mismatch", peer);
        }
        if (result.proof.tier === "ordinal_only_complete_chronology") {
          const flat = new Map([...starts].map(([n, s]) => [n, s.startMs]));
          if (!completeChronology(numbers, flat))
            throw new Hold(
              "ordinal_only_complete_source_chronology_missing",
              numbers.filter((n) => !starts.has(n)),
            );
        }
        // Proposed starts this one leans on; if one of them is not accepted, neither is this.
        const leansOn = new Set();
        // The next question's start bounds the quoted dialogue. An earlier
        // proposed start only has to lie before this one; nothing rests on it.
        if (neighbors.next?.provenance === "proposed_here")
          leansOn.add(neighbors.next.questionId);
        if (result.proof.tier === "ordinal_only_complete_chronology")
          for (const s of starts.values())
            if (s.provenance === "proposed_here") leansOn.add(s.questionId);
        leansOn.delete(result.questionId);
        result.dependsOnProposed = [...leansOn];
        result.outcome = "candidate";
      } catch (error) {
        if (!(error instanceof Hold)) throw error;
        result.outcome = "held";
        result.reason = error.reason;
        result.detail = error.detail;
        result.ownEvidenceReplayed = true;
        changed = true;
      }
    }
  }
}
