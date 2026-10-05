/**
 * Held reconstructed questions: a census of all of them, and a native number
 * hearing for those whose original numbered passage the frozen mapping audit
 * already established.
 *
 * Nothing here maps a question to a passage. That mapping (the frozen
 * generation anchors inside one numbered passage of the frozen whole-record
 * recognition) is taken from the audit as it stands; a question the audit holds
 * stays held and is only counted. For a mapped passage this module answers one
 * thing from stored bounded recognitions: at which measured onset, inside the
 * estimated span of that passage's own number, was that number written first
 * and reliably. Generated display numbers decide nothing.
 */
import { leadingCue } from "../../claude/lib/text.mjs";
import {
  Hold,
  boundProbe,
  cueReading,
  measuredStart,
  RULES,
  uncertain,
} from "./identity.mjs";
import { ProbeStore, loadNativeEnergy, readBoundJson } from "./store.mjs";

const sameNumbers = (a, b) =>
  Array.isArray(a) &&
  Array.isArray(b) &&
  a.length === b.length &&
  a.every((n, i) => n === b[i]);

/** Hearings of one number closer together than this are one place (a click, then the number). */
const ONE_PLACE_SECONDS = 3;
const LISTEN_BEFORE_SECONDS = 2.5;
const LISTEN_AFTER_SECONDS = 1;

const passageKey = (row) =>
  row.sourceRecordId + "#" + row.cueSegmentIds.join(",");

/**
 * `context`: loadContext() plus { audit, ledger, nativeDir, probeRoots }.
 * Returns { census: [one row per held reconstructed question], candidates: [ledger-shaped rows] }.
 */
export function replayReconstructed(context) {
  const store = new ProbeStore(context.probeRoots);
  const recordById = new Map(
    context.inventory.records.map((r) => [r.sourceRecordId, r]),
  );
  const auditById = new Map(
    context.audit.records.map((r) => [r.questionId, r]),
  );
  const ledgerById = new Map(
    context.ledger.records.map((r) => [r.questionId, r]),
  );
  const held = context.held.filter((row) => row.reconstructed);

  /** Starts already verified in each source, by ORIGINAL spoken number. */
  const baseline = new Map();
  for (const row of context.certificate.records) {
    if (!row.reconstructed || row.status !== "admitted") continue;
    if (!baseline.has(row.sourceRecordId))
      baseline.set(row.sourceRecordId, new Map());
    for (const number of row.scopeQuestionNumbers)
      baseline
        .get(row.sourceRecordId)
        .set(number, {
          startMs: row.audioRange.startMs,
          provenance: "certificate_admitted",
        });
  }

  const passages = new Map();
  for (const row of held) {
    const audit = auditById.get(row.questionId);
    if (audit?.status !== "mapped") continue;
    const key = passageKey(audit);
    if (!passages.has(key)) passages.set(key, { key, audit, questionIds: [] });
    passages.get(key).questionIds.push(row.questionId);
  }

  const worlds = new Map();
  const world = (sourceRecordId) => {
    if (worlds.has(sourceRecordId)) return worlds.get(sourceRecordId);
    const record = recordById.get(sourceRecordId);
    const clock = context.clockBySource.get(sourceRecordId);
    let value;
    if (!/\.mp3$/i.test(record.sourceAudioPath))
      value = {
        record,
        unavailable: "converted_playback_clock_source_not_listened",
      };
    else {
      const native = loadNativeEnergy(context.nativeDir, record, clock);
      const asr = readBoundJson(
        record.asrPath,
        record.asrSha256,
        "Whole-record recognition",
      );
      value = {
        record,
        native,
        // Every place the frozen whole-record recognition wrote a number first.
        numberedSegments: asr.segments
          .map((s) => ({
            id: s.id,
            numbers: leadingCue(s.text)?.numbers ?? null,
            start: s.estimatedStartSeconds,
            end: s.estimatedEndSeconds,
            reliable: !uncertain(s),
          }))
          .filter((s) => s.numbers),
        facts: {
          sourceRecordId,
          sourceAudioSha256: record.sourceAudioSha256,
          playbackDurationMs: record.audio.durationMs,
          clock: {
            sampleRate: clock.sampleRate,
            channels: clock.channels,
            frameCount: clock.frameCount,
            pcmSha256: clock.decodedInterleavedInt16Sha256,
          },
        },
      };
    }
    worlds.set(sourceRecordId, value);
    return value;
  };

  // 1. What every stored Korean listening near each passage's number wrote.
  for (const passage of passages.values()) {
    const { audit } = passage;
    const w = world(audit.sourceRecordId);
    passage.listened = [];
    if (w.unavailable) {
      passage.outcome = "held";
      passage.reason = w.unavailable;
      continue;
    }
    const rate = w.native.sampleRate;
    const from = audit.rawEstimatedCueStartSeconds;
    const to = audit.rawEstimatedCueEndSeconds;
    for (const loaded of store.containers(audit.sourceRecordId))
      for (const raw of loaded.container.probes) {
        if (
          (raw.requestedLanguage ?? loaded.container.requestedLanguage) !== "ko"
        )
          continue;
        const onset = raw.onsetFrame / rate;
        if (!(
          onset >= from - LISTEN_BEFORE_SECONDS &&
          onset <= to + LISTEN_AFTER_SECONDS
        ))
          continue;
        const reference = {
          path: loaded.path,
          sha256: loaded.containerSha256,
          probeId: raw.id,
        };
        const entry = {
          ...reference,
          purpose: raw.purpose,
          onsetMethod: raw.onsetMethod ?? raw.purpose,
          startFrame: raw.startFrame,
          onsetFrame: raw.onsetFrame,
          onsetSeconds: onset,
          insideEstimatedCueSpan: onset >= from && onset <= to,
        };
        try {
          const probe = boundProbe(
            loaded,
            reference,
            w.facts,
            RULES.maximumCueProbeSeconds,
          );
          const reading = cueReading(probe);
          Object.assign(entry, {
            text: (reading.text ?? "").slice(0, 120),
            numbers: reading.numbers,
            form: reading.form,
            firstSegmentReliable: reading.firstSegmentReliable,
            firstSpeechSeconds: reading.firstSpeechSeconds,
            firstSegmentId: reading.firstSegmentId ?? null,
            firstSegmentText: probe.segments[0]?.text ?? null,
            inputMonoFloat32Sha256: probe.inputMonoFloat32Sha256,
          });
          const place = measuredStart(
            w.native,
            probe.startFrame,
            probe.onsetFrame,
          );
          entry.place = place;
          const first = reading.firstSegmentNumbers;
          entry.hearsOwnNumberFirst =
            place.soundWindowsInFirstTwoSeconds >=
              RULES.minimumSoundAfterOnsetWindows &&
            reading.form !== null &&
            reading.form !== "bare" &&
            sameNumbers(reading.numbers, audit.cueSpokenNumbers) &&
            sameNumbers(first, audit.cueSpokenNumbers) &&
            reading.firstSegmentReliable &&
            reading.firstSpeechSeconds <= RULES.maximumFirstSpeechSeconds;
        } catch (error) {
          if (!(error instanceof Hold)) throw error;
          entry.notUsable = error.reason;
          entry.hearsOwnNumberFirst = false;
        }
        passage.listened.push(entry);
      }
    passage.listened.sort((a, b) => a.onsetFrame - b.onsetFrame);

    const heard = passage.listened.filter((e) => e.hearsOwnNumberFirst);
    const inside = heard.filter((e) => e.insideEstimatedCueSpan);
    const places = [];
    for (const entry of inside) {
      const last = places.at(-1);
      if (
        last &&
        entry.onsetSeconds - last.at(-1).onsetSeconds <= ONE_PLACE_SECONDS
      )
        last.push(entry);
      else places.push([entry]);
    }
    const otherNumber = (startFrame) =>
      passage.listened.filter(
        (e) =>
          e.startFrame === startFrame &&
          e.numbers &&
          e.form !== "bare" &&
          !sameNumbers(e.numbers, audit.cueSpokenNumbers),
      );
    if (places.length === 1) {
      // The onset where the number begins right at the probe start; the later one on a tie.
      const chosen = [...places[0]].sort(
        (a, b) =>
          a.firstSpeechSeconds - b.firstSpeechSeconds ||
          b.onsetFrame - a.onsetFrame,
      )[0];
      // Where the frozen whole-record recognition wrote this number more than
      // once, only the selected segment's estimated span may hold the onset.
      const rivals = w.numberedSegments.filter(
        (s) =>
          s.reliable &&
          sameNumbers(s.numbers, audit.cueSpokenNumbers) &&
          !audit.cueSegmentIds.includes(s.id) &&
          s.start <= chosen.onsetSeconds &&
          chosen.onsetSeconds <= s.end,
      );
      if (otherNumber(chosen.startFrame).length) {
        passage.outcome = "held";
        passage.reason = "contradictory_spoken_number_at_same_start";
      } else if (rivals.length) {
        passage.outcome = "held";
        passage.reason =
          "duplicate_original_cue_not_uniquely_bound_to_native_onset";
      } else {
        passage.outcome = "heard";
        passage.chosen = chosen;
      }
    } else {
      passage.outcome = "held";
      const anyMeasuredOnsetInside = passage.listened.some(
        (e) => e.insideEstimatedCueSpan,
      );
      const numberSomewhere = passage.listened.some((e) =>
        sameNumbers(e.numbers, audit.cueSpokenNumbers),
      );
      passage.reason =
        places.length > 1
          ? "original_number_heard_at_two_distant_places"
          : heard.length
            ? "original_number_heard_first_only_outside_frozen_cue_span"
            : numberSomewhere
              ? "original_number_written_late_bare_or_flagged_uncertain"
              : !anyMeasuredOnsetInside
                ? "no_listening_at_a_measured_onset_inside_cue_span"
                : "original_number_not_heard_at_any_measured_onset";
    }
  }

  // 2. Order by original spoken number against every known start, to a fixed point.
  for (let changed = true; changed;) {
    changed = false;
    const bySource = new Map();
    for (const passage of passages.values()) {
      if (passage.outcome !== "heard") continue;
      if (!bySource.has(passage.audit.sourceRecordId))
        bySource.set(passage.audit.sourceRecordId, []);
      bySource.get(passage.audit.sourceRecordId).push(passage);
    }
    for (const [sourceRecordId, list] of bySource) {
      const rate = world(sourceRecordId).native.sampleRate;
      const known = new Map(baseline.get(sourceRecordId) ?? []);
      for (const passage of list) {
        const startMs = Math.floor((passage.chosen.startFrame * 1000) / rate);
        passage.seekStartMs = startMs;
        for (const number of passage.audit.scopeQuestionNumbers) {
          const existing = known.get(number);
          if (
            existing &&
            existing.provenance !== "certificate_admitted" &&
            existing.passage !== passage
          ) {
            passage.outcome = existing.passage.outcome = "held";
            passage.reason = existing.passage.reason =
              "two_passages_claim_one_original_number";
            changed = true;
          } else if (existing?.provenance === "certificate_admitted") {
            passage.outcome = "held";
            passage.reason = "original_number_already_has_a_verified_start";
            changed = true;
          } else
            known.set(number, {
              startMs,
              provenance: "proposed_here",
              passage,
            });
        }
      }
      for (const passage of list) {
        if (passage.outcome !== "heard") continue;
        const scope = passage.audit.scopeQuestionNumbers;
        const numbers = [...known.keys()].sort((a, b) => a - b);
        const lower = numbers.filter((n) => n < scope[0]).at(-1);
        const higher = numbers.find((n) => n > scope.at(-1));
        const before =
          lower === undefined
            ? null
            : {
                originalNumber: lower,
                startMs: known.get(lower).startMs,
                provenance: known.get(lower).provenance,
              };
        const after =
          higher === undefined
            ? null
            : {
                originalNumber: higher,
                startMs: known.get(higher).startMs,
                provenance: known.get(higher).provenance,
              };
        passage.neighbors = { previous: before, next: after };
        if (
          (before && before.startMs >= passage.seekStartMs) ||
          (after && after.startMs <= passage.seekStartMs)
        ) {
          passage.outcome = "held";
          passage.reason = "original_spoken_order_conflict_with_known_start";
          changed = true;
        }
      }
    }
  }

  // 3. One census row per held question; one ledger-shaped row per offered question.
  const census = [];
  const candidates = [];
  for (const row of held) {
    const audit = auditById.get(row.questionId);
    const ledger = ledgerById.get(row.questionId);
    const base = {
      questionId: row.questionId,
      sourceRecordId: row.sourceRecordId,
      setId: row.setId,
      sourceNumber: row.sourceNumber,
      reconstructed: true,
      priorReasons: row.reasons,
      frozenMappingAudit: audit
        ? { status: audit.status, reason: audit.reason ?? null }
        : null,
    };
    if (audit?.status !== "mapped") {
      census.push({
        ...base,
        outcome: "held",
        reason:
          "frozen_mapping_audit_holds_the_passage:" +
          (audit?.reason ?? "unknown"),
        tested: { newListening: false },
      });
      continue;
    }
    const passage = passages.get(passageKey(audit));
    const tested = {
      newListening: true,
      originalCueNumber: audit.cueNumber,
      originalCueSegmentIds: audit.cueSegmentIds,
      estimatedCueSpanSeconds: [
        audit.rawEstimatedCueStartSeconds,
        audit.rawEstimatedCueEndSeconds,
      ],
      peersInOriginalPassage: passage.questionIds.length,
      listened: passage.listened.map((e) => ({
        path: e.path,
        sha256: e.sha256,
        probeId: e.probeId,
        onsetSeconds: Number(e.onsetSeconds.toFixed(3)),
        insideEstimatedCueSpan: e.insideEstimatedCueSpan,
        text: e.text ?? null,
        numbers: e.numbers ?? null,
        form: e.form ?? null,
        firstSegmentReliable: e.firstSegmentReliable ?? null,
        firstSpeechSeconds: e.firstSpeechSeconds ?? null,
        hearsOwnNumberFirst: e.hearsOwnNumberFirst,
        notUsable: e.notUsable ?? null,
      })),
    };
    if (passage.outcome !== "heard") {
      census.push({ ...base, outcome: "held", reason: passage.reason, tested });
      continue;
    }
    const w = world(row.sourceRecordId);
    const { chosen } = passage;
    const usable =
      ledger &&
      sameNumbers(ledger.cueSegmentIds, audit.cueSegmentIds) &&
      sameNumbers(ledger.cueSpokenNumbers, audit.cueSpokenNumbers);
    if (!usable) {
      census.push({
        ...base,
        outcome: "held",
        reason: "frozen_ledger_row_differs_from_mapping_audit",
        tested,
      });
      continue;
    }
    // Identity, passage and mapping fields of the frozen ledger row; its own
    // native and probe evidence (if it had any) is not carried over.
    const {
      reasons: _reasons,
      nativeEvidence: _native,
      probeEvidence: _probe,
      seekStartMs: _start,
      seekEndMs: _end,
      ...kept
    } = ledger;
    candidates.push({
      ...kept,
      status: "candidate",
      seekStartMs: passage.seekStartMs,
      seekEndMs: w.record.audio.durationMs,
      nativeEvidence: {
        onsetMethod: "absolute_energy_v2",
        cachePath: w.native.cachePath.replace(/\\/g, "/"),
        cacheSha256: w.native.cacheSha256,
        energyPath: w.native.energyPath.replace(/\\/g, "/"),
        energySha256: w.native.energySha256,
        sampleRate: w.native.sampleRate,
        channels: w.native.channels,
        frameCount: w.native.frameCount,
        pcmSha256: w.native.pcmSha256,
        startFrame: chosen.startFrame,
        onsetFrame: chosen.onsetFrame,
        quietBeforeFrames: chosen.place.quietBeforeFrames,
        leadPeakDbfs: chosen.place.leadPeakDbfs,
      },
      probeEvidence: {
        path: chosen.path.replace(/\\/g, "/"),
        sha256: chosen.sha256,
        probeId: chosen.probeId,
        segmentIds: [chosen.firstSegmentId],
        text: chosen.firstSegmentText,
        inputMonoFloat32Sha256: chosen.inputMonoFloat32Sha256,
      },
      claudeHeldValidation: {
        route: "existing_reconstructed_native_adapter",
        conditional:
          "Not an admission claim. The passage is the frozen mapping audit's; this adds only the native hearing of its number. Original-scope inheritance against existing reconstructed starts is the coordinator's separate check.",
        originalNumberNeighbors: passage.neighbors,
        peerQuestionIdsInPassage: passage.questionIds,
      },
    });
    census.push({
      ...base,
      outcome: "offered_conditional",
      reason: null,
      seekStartMs: passage.seekStartMs,
      seekEndMs: w.record.audio.durationMs,
      neighbors: passage.neighbors,
      tested,
    });
  }
  return { census, candidates, passages };
}
