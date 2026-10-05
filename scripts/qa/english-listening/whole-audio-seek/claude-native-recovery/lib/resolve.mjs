/**
 * One source: native headings, certified starts, passages, and one row per
 * target question. Pure over already loaded and hash-bound inputs.
 *
 * In `blind` mode the certified starts of the source are not read while
 * deciding: every passage start is the native heading, and the result can be
 * compared with the certificate afterwards (a control replay).
 */
import {
  Hold,
  ROUTE,
  RULES,
  bindQuotes,
  countOccurrences,
  establishHeadings,
  instructed,
  estimateContradiction,
  locateFrozenQuote,
  passageStarts,
  quoteWords,
  startMsOf,
} from "./rules.mjs";

/** The independent verifier's adapter these rows are shaped for. */
export const ADAPTER = "native-localized-generation-v2";

/** Certified starts of a source by the first original number of their proven scope. */
export function certifiedStarts(certRows, sampleRate, admissions = null) {
  const starts = new Map();
  for (const row of certRows) {
    if (!row.audioRange) continue;
    const scope =
      row.scopeQuestionNumbers ??
      row.originalScopeEvidence?.scopeQuestionNumbers ??
      (row.reconstructed ? null : [row.sourceNumber]);
    if (!scope?.length) continue;
    const startFrame = (row.audioRange.startMs * sampleRate) / 1000;
    const key = scope[0];
    const known = starts.get(key);
    if (known) {
      if (
        known.startMs !== row.audioRange.startMs ||
        known.scope.join() !== scope.join()
      )
        known.conflict = true;
      known.questionIds.push(row.questionId);
      continue;
    }
    starts.set(key, {
      number: key,
      scope,
      startMs: row.audioRange.startMs,
      startFrame,
      onsetFrame:
        row.nativeEvidence?.onsetFrame ??
        row.originalScopeEvidence?.onsetFrame ??
        null,
      questionIds: [row.questionId],
      // The certificate that admitted this start, when one did and still agrees.
      admission: (() => {
        const found = admissions?.get(row.questionId);
        return found &&
          found.startMs === row.audioRange.startMs &&
          found.scopeQuestionNumbers?.join() === scope.join() &&
          Number.isInteger(found.nativeOnsetFrame)
          ? found
          : null;
      })(),
      conflict: !Number.isInteger(startFrame),
    });
  }
  return starts;
}

/** A stored probe in the verifier's raw reference shape, with the segments it is quoted for. */
export function reference(listeningRef, segments, extra = {}) {
  return {
    path: listeningRef.path,
    sha256: listeningRef.sha256,
    probeId: listeningRef.probeId,
    segmentIds: segments.map((s) => s.id),
    text: segments.map((s) => s.text).join(" "),
    inputMonoFloat32Sha256: listeningRef.inputMonoFloat32Sha256,
    clipPcmSha256: listeningRef.clipPcmSha256,
    startFrame: listeningRef.startFrame,
    frameCount: listeningRef.frameCount,
    ...extra,
  };
}

/** The segments a heading is quoted for: the number through its instruction verb. */
function headingReference(heading) {
  const wanted = new Set(
    heading.reading.instruction?.segmentIds ?? [heading.reading.firstSegmentId],
  );
  return reference(
    heading.ref,
    heading.probe.segments.filter((s) => wanted.has(s.id)),
  );
}

/**
 * The measured place of a heading or closing. Where the request that found a
 * noise-tier onset wrote only the baseline length as its quiet (rounds planned
 * before the full count was stored), the row states the full measured quiet
 * and names that raw value and its baseline, in the independent verifier's
 * terms; nothing in the raw request or container is changed.
 */
function placeEvidence(at) {
  const { place, probe, ref } = at;
  const evidence = {
    onsetMethod: place.onsetMethod,
    startFrame: place.startFrame,
    onsetFrame: place.onsetFrame,
    quietBeforeFrames: place.quietBeforeFrames,
    leadFrames: place.leadFrames,
    leadPeakDbfs: place.leadPeakDbfs,
    soundWindowsInFirstTwoSeconds: place.soundWindowsInFirstTwoSeconds,
  };
  const noise = place.noiseFloorEvidence;
  if (!noise) return evidence;
  evidence.noiseFloorEvidence = noise;
  if (
    probe.quietBeforeFrames !== place.quietBeforeFrames &&
    probe.quietBeforeFrames ===
      Math.min(place.quietBeforeFrames, noise.baselineFrameCount)
  ) {
    evidence.quietEvidenceMethod = "independent_full_source_quiet_v1";
    evidence.rawProbeQuietBeforeFrames = probe.quietBeforeFrames;
    evidence.quietDiscoveryEvidence = {
      method: "noise_baseline_capped_discovery_v1",
      contextStartFrame: noise.baselineStartFrame,
      contextFrameCount: noise.baselineFrameCount,
      contextEnergySha256: noise.baselineEnergySha256,
      request: { path: ref.requestPath, sha256: ref.requestSha256 },
      probeId: ref.probeId,
    };
  }
  return evidence;
}

/**
 * What every offered row says about its passage: the heading that starts it,
 * the boundary that ends it, and their probes in the verifier's reference
 * shape. A passage that already has a certified start is offered only with a
 * native heading at exactly the certified frames.
 */
export function passageEvidence(input, passage, tested = {}) {
  const { record, native } = input;
  const rate = native.sampleRate;
  const { start, boundary } = passage;
  const certifiedStart = start.source === "certified";
  let heading = start.native?.heading ?? null;
  if (certifiedStart && heading) {
    // Another measured onset of the same place, with the same kind of
    // reading, may be the very frame the certificate holds.
    const same = [heading, ...(heading.alternates ?? [])].find(
      (h) =>
        h.startFrame === start.startFrame &&
        h.onsetFrame === start.onsetFrame &&
        (start.native.kind === "shared_instruction_member" ||
          instructed(h)),
    );
    if (same && same !== heading)
      heading = { ...same, kind: heading.kind, sharedHead: heading.sharedHead };
  }
  if (
    certifiedStart &&
    (!heading ||
      heading.startFrame !== start.startFrame ||
      heading.onsetFrame !== start.onsetFrame)
  ) {
    tested.certifiedStartMs = start.certified.startMs;
    tested.nativeHeadingStartMs = heading
      ? startMsOf(heading.startFrame, rate)
      : null;
    throw new Hold("native_heading_differs_from_certified_start");
  }
  const kind = start.native.kind;
  const head = heading.sharedHead ?? null;
  const nextHeading = boundary.heading ?? null;
  return {
    heading,
    head,
    nextHeading,
    fields: {
      seekStartMs: startMsOf(start.startFrame, rate),
      seekEndMs: record.audio.durationMs,
      cueNumber: start.number,
      cueSpokenNumbers: start.native.cueSpokenNumbers,
      cueForm: start.native.cueForm,
      scopeQuestionNumbers: start.scope,
      kind,
      nativeEvidence: {
        cachePath: native.cachePath,
        cacheSha256: native.cacheSha256,
        energyPath: native.energyPath,
        energySha256: native.energySha256,
        sampleRate: rate,
        channels: native.channels,
        frameCount: native.frameCount,
        pcmSha256: native.pcmSha256,
        ...placeEvidence(heading),
      },
      probeEvidence: headingReference(heading),
      // The same-start reading that wrote the instruction after bare digits.
      instructionProbeEvidence: heading.instructionSibling
        ? reference(
            heading.instructionSibling.ref,
            heading.instructionSibling.probe.segments.filter((s) =>
              heading.instructionSibling.reading.instruction.segmentIds.includes(s.id),
            ),
          )
        : null,
      nextProbeEvidence: nextHeading ? headingReference(nextHeading) : null,
      nextNativeEvidence: nextHeading ? placeEvidence(nextHeading) : null,
      // Where no native heading bounds the passage: the certificate that
      // admitted the next number's start, in the verifier's shape.
      nextCertificateEvidence:
        !nextHeading && boundary.existing?.admission
          ? boundary.existing.admission
          : null,
      sharedHeadProbeEvidence:
        kind === "shared_instruction_member" ? headingReference(head) : null,
      sharedHeadNativeEvidence:
        kind === "shared_instruction_member" ? placeEvidence(head) : null,
      terminalProbeEvidence: boundary.closing
        ? reference(
            boundary.closing.ref,
            boundary.closing.probe.segments.filter(
              (s) => s.id === boundary.closing.reading.firstSegmentId,
            ),
          )
        : null,
      terminalNativeEvidence: boundary.closing
        ? placeEvidence(boundary.closing)
        : null,
    },
    nativeRecovery: {
      evidenceProtocol: 1,
      passageFrames: { fromFrame: passage.fromFrame, toFrame: passage.toFrame },
      headCovers: heading.covers,
      sharedHeadCovers: head?.covers ?? null,
      existingCertifiedStart: certifiedStart
        ? {
            certificateSha256: input.certificateSha256,
            questionId: start.certified.questionIds[0],
            startMs: start.certified.startMs,
            scope: start.certified.scope,
          }
        : null,
      nextBoundary: {
        kind: boundary.kind,
        originalNumbers: boundary.originalNumbers,
        startFrame: boundary.startFrame,
        existing: boundary.existing ?? null,
        largestNumberWrittenAnywhere:
          boundary.largestNumberWrittenAnywhere ?? null,
        longQuietOnsetsListened: boundary.longQuietOnsetsListened ?? null,
      },
      siblingReadings: heading.siblings,
    },
  };
}

/**
 * The measured structure of one source: native headings, certified starts and
 * the passages that stand on both sides. `input`: { native, certRows,
 * koListenings, hints, blind, certificateSha256, terminalScan }.
 */
export function sourceStructure(input) {
  const { native, hints } = input;
  const rate = native.sampleRate;
  const { headings, closings, held, written } = establishHeadings(
    native,
    input.koListenings,
    { instructionFromBareSibling: Boolean(input.instructionFromBareSibling) },
  );
  const nativeStarts = passageStarts(headings);
  const certified = input.blind
    ? new Map()
    : certifiedStarts(input.certRows, rate, input.admissions);

  // Every known passage start by original number; a certified one wins.
  const starts = new Map();
  for (const [number, entry] of nativeStarts)
    starts.set(number, {
      number,
      scope: [number],
      startFrame: entry.heading.startFrame,
      onsetFrame: entry.heading.onsetFrame,
      source: "native",
      native: entry,
    });
  for (const [number, entry] of certified) {
    if (entry.conflict) {
      starts.delete(number);
      held.set(number, "passage_start_conflicts_with_certified_scope");
      continue;
    }
    const nativeEntry = starts.get(number)?.native ?? null;
    starts.set(number, {
      number,
      scope: entry.scope,
      startFrame: entry.startFrame,
      onsetFrame: entry.onsetFrame,
      source: "certified",
      certified: entry,
      native: nativeEntry,
    });
    // Later numbers of a certified shared passage start nothing of their own.
    for (const inner of entry.scope.slice(1))
      if (starts.get(inner)?.source === "native") starts.delete(inner);
  }

  // Order by original number; a native start on the wrong side of another is dropped.
  for (let changed = true; changed; ) {
    changed = false;
    const ordered = [...starts.values()].sort((a, b) => a.number - b.number);
    for (let i = 1; i < ordered.length; i++) {
      const [a, b] = [ordered[i - 1], ordered[i]];
      if (a.startFrame < b.startFrame) continue;
      for (const bad of [a, b])
        if (bad.source === "native") {
          starts.delete(bad.number);
          held.set(bad.number, "original_order_conflict");
          changed = true;
        }
      if (changed) break;
      // Two certified starts out of order: nothing here may lean on either.
      held.set(a.number, "original_order_conflict");
      held.set(b.number, "original_order_conflict");
      starts.delete(a.number);
      starts.delete(b.number);
      changed = true;
      break;
    }
  }

  const hintedMaximum = Math.max(
    0,
    ...hints.numbers.map((h) => h.number),
    ...headings.flatMap((h) => h.covers),
    ...written
      .filter((reading) => reading.possibleHeading)
      .flatMap((reading) => reading.covers),
    ...[...certified.values()].flatMap((c) => c.scope),
  );
  const ordered = [...starts.values()].sort((a, b) => a.number - b.number);
  const passages = [];
  for (const start of ordered) {
    const last = start.scope.at(-1);
    const next = starts.get(last + 1);
    let boundary = null;
    let reason = null;
    if (next) {
      const heading = next.native?.heading ?? null;
      const existing =
        next.source === "certified"
          ? {
              certificateSha256: input.certificateSha256,
              questionId: next.certified.questionIds[0],
              startMs: next.certified.startMs,
              scope: next.certified.scope,
              startFrame: next.certified.startFrame,
              admission: next.certified.admission,
            }
          : null;
      boundary = {
        // The earlier of the two when both are known: nothing is taken from
        // the stretch between a certified start and the native heading.
        startFrame: Math.min(
          next.startFrame,
          heading?.startFrame ?? next.startFrame,
        ),
        kind: heading
          ? "next_heading_native_probe"
          : "existing_certificate_start",
        originalNumbers: heading ? next.native.cueSpokenNumbers : next.scope,
        heading,
        existing,
      };
    } else if (ordered.some((other) => other.number > last))
      reason = "next_heading_not_established";
    else {
      // After the last number only: a literal closing at a measured onset, no
      // later number written anywhere, and every long-quiet onset up to the
      // closing listened to.
      const closing = closings.find((c) => c.startFrame > start.startFrame);
      const scan = input.terminalScan?.(start.startFrame, closing?.startFrame);
      if (
        input.lastOfficialNumber !== undefined &&
        last === input.lastOfficialNumber &&
        last >= hintedMaximum
      )
        // An official source prints its questions: after its last number
        // nothing but that question's passage and the closing remain.
        boundary = {
          startFrame: closing?.startFrame ?? native.frameCount,
          kind: closing
            ? "closing_announcement"
            : "source_end_after_last_official_number",
          originalNumbers: [],
          closing: closing ?? null,
          largestNumberWrittenAnywhere: hintedMaximum,
          lastOfficialNumber: input.lastOfficialNumber,
        };
      else if (!closing || last < hintedMaximum || (scan && scan.missing > 0))
        reason = "terminal_boundary_not_established";
      else
        boundary = {
          startFrame: closing.startFrame,
          kind: "closing_announcement",
          originalNumbers: [],
          closing,
          largestNumberWrittenAnywhere: hintedMaximum,
          longQuietOnsetsListened: scan ?? null,
        };
    }
    if (reason) {
      held.set(start.number + ":next", reason);
      continue;
    }
    // Any other number that a recognition wrote first from a start inside
    // these frames — in any form, however unreliably — means the structure of
    // the passage is not understood; its quotes could be another question's.
    const own = new Set([
      ...start.scope,
      ...(start.native?.heading.covers ?? []),
    ]);
    const stray = written.find(
      (reading) =>
        reading.possibleHeading &&
        reading.startFrame > start.startFrame &&
        reading.startFrame < boundary.startFrame &&
        (reading.numbers[0] !== start.number ||
          reading.covers.some((n) => !own.has(n))),
    );
    if (stray) {
      held.set(
        start.number + ":inside",
        "unresolved_number_reading_inside_passage",
      );
      continue;
    }
    passages.push({
      key: start.number,
      scope: start.scope,
      fromFrame: start.startFrame,
      toFrame: boundary.startFrame,
      start,
      boundary,
    });
  }

  const known = [...starts.values()].sort((a, b) => a.number - b.number);
  return {
    rate,
    headings,
    closings,
    held,
    written,
    starts,
    known,
    passages,
    hintedMaximum,
    table: {
      headings: headings.map((h) => ({
        numbers: h.numbers,
        covers: h.covers,
        form: h.form,
        kind: h.kind,
        onsetMethod: h.place.onsetMethod,
        startFrame: h.startFrame,
        onsetFrame: h.onsetFrame,
        startMs: startMsOf(h.startFrame, rate),
        text: h.reading.text,
        instruction: instructed(h)?.text ?? null,
        instructionFromBareSibling: Boolean(h.instructionSibling),
        probe: h.ref,
      })),
      closings: closings.map((c) => ({
        startFrame: c.startFrame,
        startMs: startMsOf(c.startFrame, rate),
        text: c.reading.text,
      })),
      numbersWritten: written.map((r) => ({
        startMs: startMsOf(r.startFrame, rate),
        numbers: r.numbers,
        form: r.form,
        reliable: r.reliable,
        possibleHeading: r.possibleHeading,
      })),
      held: Object.fromEntries(held),
      starts: known.map((s) => ({
        number: s.number,
        scope: s.scope,
        source: s.source,
        startMs: startMsOf(s.startFrame, rate),
        nativeStartMs: s.native
          ? startMsOf(s.native.heading.startFrame, rate)
          : null,
      })),
      passages: passages.map((p) => ({
        key: p.key,
        scope: p.scope,
        fromFrame: p.fromFrame,
        toFrame: p.toFrame,
        boundary: p.boundary.kind,
      })),
      largestNumberWrittenAnywhere: hintedMaximum,
    },
  };
}

/**
 * `input`: { record, native, certRows, koListenings, enListenings, generation,
 * hints, targets:[certificate rows], blind, certificateSha256, terminalScan }.
 * Returns { table, passages, rows }.
 */
export function resolveSource(input) {
  const { record, native, hints } = input;
  const { rate, passages, known, table } = sourceStructure(input);

  const englishFlat = [];
  hints.englishWords.forEach((word, i) =>
    quoteWords(word.text).forEach((part) => englishFlat.push({ part, i })),
  );
  const providerOccurrences = (words) => {
    const out = [];
    for (let i = 0; i + words.length <= englishFlat.length; i++)
      if (words.every((word, k) => englishFlat[i + k].part === word)) {
        const a = hints.englishWords[englishFlat[i].i];
        const b = hints.englishWords[englishFlat[i + words.length - 1].i];
        out.push({
          startMs: a.start,
          endMs: b.end,
          midSeconds: (a.start + b.end) / 2000,
        });
      }
    return out;
  };
  const asrById = new Map(hints.asrSegments.map((s) => [s.id, s]));
  const asrTokens = quoteWords(hints.asrSegments.map((s) => s.text).join(" "));

  const rows = [];
  for (const target of input.targets) {
    const base = {
      sourceRecordId: record.sourceRecordId,
      setId: record.setId,
      revision: record.revision,
      documentSha256: record.documentSha256,
      questionId: target.questionId,
      sourceNumber: target.sourceNumber,
      provider: target.provider,
      sourceAudioSha256: record.sourceAudioSha256,
      playbackSha256: record.audio.sha256,
      reconstructed: true,
      route: ROUTE,
    };
    const generation = input.generation.byQuestion.get(target.questionId);
    const tested = {};
    try {
      if (!generation?.evidenceQuotes.length)
        throw new Hold("generation_evidence_missing");
      if (generation.groundingIntact === false)
        throw new Hold("generation_grounding_differs_from_alignment");

      // Frozen side first: where each quote stands in the generation's own segments.
      const ids = generation.frozenSourceSegmentIds;
      const frozen = generation.evidenceQuotes.map((text) => ({
        text,
        located: locateFrozenQuote(text, ids, hints.asrSegments),
        occurrencesInFrozenRecognition: countOccurrences(
          quoteWords(text),
          asrTokens,
        ),
      }));
      tested.frozenQuotes = frozen.map((q) => ({
        text: q.text,
        literalInGenerationSegments: Boolean(q.located),
        occurrencesInFrozenRecognition: q.occurrencesInFrozenRecognition,
      }));
      if (frozen.some((q) => !q.located))
        throw new Hold("frozen_quote_not_literal_in_generation_segments");
      if (frozen.some((q) => q.occurrencesInFrozenRecognition !== 1))
        throw new Hold("quote_repeats_in_frozen_recognition");

      // Frozen anchor segments that no frozen quote touches.
      const covered = new Set();
      for (const q of frozen) {
        let cursor = 0;
        for (const id of q.located.sourceSegmentIds) {
          const end = cursor + asrById.get(id).text.length;
          if (
            Math.max(q.located.startCharacter, cursor) <
            Math.min(q.located.endCharacter, end)
          )
            covered.add(id);
          cursor = end + 1;
        }
      }
      const uncovered = ids.filter((id) => !covered.has(id));
      const position = new Map(hints.asrSegments.map((s, i) => [s.id, i]));
      const contiguous = ids.every(
        (id, i) => !i || position.get(id) === position.get(ids[i - 1]) + 1,
      );

      tested.generationSegmentsWithoutQuote = uncovered;

      const bound = bindQuotes(
        generation.evidenceQuotes,
        passages,
        input.enListenings,
        uncovered.map((id) => ({ id, text: asrById.get(id).text })),
      );
      tested.quotes = bound.quotes;
      const passage = passages.find((p) => p.key === bound.passageKey);
      tested.passageOriginalNumbers = passage.scope;
      const seconds = [passage.fromFrame / rate, passage.toFrame / rate];
      const occurrences = bound.quotes
        .filter((q) => q.anchor)
        .flatMap((q) => providerOccurrences(quoteWords(q.text)));
      const anchorSegments = ids.map((id) => asrById.get(id)).filter(Boolean);
      const frozenSpan = anchorSegments.length
        ? [
            Math.min(...anchorSegments.map((s) => s.startSeconds)),
            Math.max(...anchorSegments.map((s) => s.endSeconds)),
          ]
        : null;
      const holdOnlyChecks = {
        toleranceSeconds: RULES.holdOnlyToleranceSeconds,
        providerEnglishOccurrences: occurrences.map((o) => ({
          startMs: o.startMs,
          endMs: o.endMs,
          insidePassage:
            o.midSeconds >= seconds[0] && o.midSeconds <= seconds[1],
        })),
        frozenAsrSegmentSpanSeconds: frozenSpan,
      };
      tested.holdOnlyChecks = holdOnlyChecks;
      const contradiction = estimateContradiction(seconds, occurrences, frozenSpan);
      if (contradiction) throw new Hold(contradiction);

      const common = passageEvidence(input, passage, tested);
      const { heading, head, nextHeading } = common;

      const clip = input.enListenings.find(
        (l) =>
          l.ref.path === bound.clip.ref.path &&
          l.ref.probeId === bound.clip.ref.probeId,
      );
      const quoted = new Set([
        ...bound.quotes.flatMap((q) => q.probeSegmentIds),
        ...bound.anchorSegments.flatMap((a) => a.probeSegmentIds),
      ]);
      const alignment = input.generation.inputs.generationAlignment;
      rows.push({
        ...base,
        status: "candidate",
        evidenceAdapter: ADAPTER,
        ...common.fields,
        cueSegmentIds: [],
        anchorSegmentIds: ids,
        dialogueProbeEvidence: reference(
          clip.ref,
          clip.probe.segments.filter((s) => quoted.has(s.id)),
          { purpose: clip.purpose },
        ),
        mappingEvidence: {
          alignment,
          questionId: target.questionId,
          sourceSegmentIds: ids,
        },
        localizedMappingEvidence: {
          method: "exact_generation_anchor_native_v2",
          alignment,
          prepared: input.generation.inputs.prepared,
          questionId: target.questionId,
          generatedOrdinal: generation.generatedOrdinal,
          sourceSegmentIds: ids,
          quotes: frozen.map((q, index) => ({
            text: q.text,
            ...q.located,
            probeSegmentIds: bound.quotes[index].probeSegmentIds,
          })),
          // Generation segments no quote touches, each written whole by the same clip.
          anchorSegments: bound.anchorSegments,
        },
        nativeRecovery: {
          ...common.nativeRecovery,
          dialogueClipFrames: {
            startFrame: clip.startFrame,
            frameCount: clip.frameCount,
          },
          quotes: bound.quotes.map((q) => ({
            index: q.index,
            words: q.words,
            anchor: q.anchor,
            wordRange: q.wordRange,
            hearings: q.heard.length,
          })),
          uncoveredAnchorSegmentIds: uncovered,
          verifierPreconditions: {
            nextHeadingIsANativeProbe: Boolean(nextHeading),
            nextBoundaryIsProvable: Boolean(
              nextHeading ||
                passage.boundary.closing ||
                passage.boundary.existing?.admission,
            ),
            everyAnchorSegmentTouchedByAQuote: uncovered.length === 0,
            everyUntouchedAnchorSegmentHeardWhole: true,
            anchorSegmentsContiguous: contiguous,
            headIsAnAdjacentPairOrSingle:
              heading.form !== "range" && (head?.form ?? "pair") !== "range",
          },
          holdOnlyChecks,
        },
      });
    } catch (error) {
      if (!(error instanceof Hold)) throw error;
      if (error.detail?.quotes) tested.quotes = error.detail.quotes;
      rows.push({ ...base, status: "held", reasons: [error.reason], tested });
    }
  }
  // Peers: every question offered for one passage shares one start and proof.
  const byPassage = new Map();
  for (const row of rows)
    if (row.status === "candidate") {
      if (!byPassage.has(row.cueNumber)) byPassage.set(row.cueNumber, []);
      byPassage.get(row.cueNumber).push(row.questionId);
    }
  for (const row of rows)
    if (row.status === "candidate") {
      const lower = known.filter((s) => s.number < row.cueNumber).at(-1);
      const higher = known.find((s) => s.number > row.scopeQuestionNumbers.at(-1));
      const describe = (s) =>
        s
          ? {
              originalNumber: s.number,
              startMs: startMsOf(s.startFrame, rate),
              provenance: s.source,
            }
          : null;
      row.nativeRecovery.peers = byPassage
        .get(row.cueNumber)
        .filter((id) => id !== row.questionId);
      row.nativeRecovery.neighbors = {
        previous: describe(lower),
        next: describe(higher),
      };
    }

  return { table, passages, rows };
}
