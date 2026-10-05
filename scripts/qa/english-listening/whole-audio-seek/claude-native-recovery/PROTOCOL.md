# Native recovery of held whole-original starts — evidence protocol 1

Producer: `claude-native-recovery`. Route name:
**`native_numbered_passage_literal_quote_v1`**.

This is what an offered row carries and what an independent replay can
recompute from the original bytes and the frozen mappings. An offered row is an
offline finding. Admission is the independent verifier's; nothing here writes a
database, Storage, media or a clip, and no row claims human review.

## Why a new route

The 885 held reconstructed questions are held because the frozen whole-record
recognition (or the provider transcript) lacks a reliable number, instruction
or neighbour for the passage — or timed it badly. The existing reconstructed
route binds a question to its passage through that recognition's segment order
and estimated spans. This route replaces **estimated structure** with
**measured structure**:

| link         | authority                                                                                            | never                                              |
| ------------ | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| clock        | full decode of the original bytes, PCM SHA-256 equal to the frozen clock proof                       | a provider duration, a second decode's estimate    |
| heading      | measured native onset after measured quiet; start = onset − min(400 ms, quiet)                       | a provider or model timestamp                      |
| number       | a bounded Korean recognition that **begins at that start** writes the literal number first, reliably | a displayed number, a neighbour, a confidence      |
| next heading | the same, for the very next original number (or an existing certified start, or the closing)         | "the next number we happened to find"              |
| passage      | the native frames `[headingStartFrame, nextHeadingStartFrame)`                                       | a transcript window                                |
| mapping      | the question's own frozen generation quote, word for word, in an English recognition whose **whole clip lies inside the passage frames** | similarity, topic, recognizer time of the words |

Containment is physical: a clip cut from frames inside the passage cannot hold
words spoken outside it, whatever times the recognizer writes. Recognizer and
provider times are used to decide **where to listen** and to **hold** a row,
never to admit one.

## Inputs (all bound by SHA-256 of bytes)

- inventory, clock, certificate (`776d313a…`) — the frozen baseline. Identity
  fields of a row (`revision`, `documentSha256`) are joined from the inventory
  given on the command line, so the same physical evidence can be rebuilt on a
  later exact metadata rebase without new recognition.
- original audio (`record.sourceAudioPath`, `sourceAudioSha256`).
- prepared file (`record.preparedPath`, `preparedSha256`): the generation quotes
  are `verification.grounding[generatedOrdinal].evidenceQuotes`.
- generation alignment (`record.alignmentPath`, hash recorded in the row): joins
  `questionId` to `generatedOrdinal` and names its frozen whole-record segments.
- search hints only: the two provider transcripts (raw response hashes) and the
  frozen whole-record recognition (`asrPath`, `asrSha256`).

`ebs-middle-1-2006-2` (converted original with its own playback clock) is not
listened to by this route; its rows stay held.

## Measurement (unchanged policy `whole-audio-seek-start-v3`)

20 ms windows; a window's level is the larger channel's sum of squared PCM16
samples; sound is ≥ −50 dBFS. An onset is the first sound window after at least
100 ms of measured quiet. `startFrame = onsetFrame − min(20, quietWindows) ×
windowFrames`. The two seconds after the onset hold at least 240 ms of sound.
`seekStartMs = floor(startFrame × 1000 / sampleRate)`, `seekEndMs` = the frozen
playback duration. Noise-floor tiers are not used by this producer (rows whose
heading has no absolute-quiet onset are held as such).

## Row (`ledger.json` → `records[]`, one per held question)

Common identity: `sourceRecordId setId revision documentSha256 questionId
sourceNumber sourceAudioSha256 playbackSha256 reconstructed provider`.
`status` is `candidate` or `held`; a held row has `reasons[]` and whatever
evidence exists under `tested`.

A `candidate` adds:

```
route                 "native_numbered_passage_literal_quote_v1"
seekStartMs seekEndMs
cueNumber             first original number of the scope
cueSpokenNumbers      numbers literally announced by the heading ([19,20]; a range "18번부터 20번" is [18,20] with cueForm "range")
cueForm               "beon" | "spelled" | "pair" | "range"
scopeQuestionNumbers  the one original passage that starts here, e.g. [18]
kind                  "single" | "shared_instruction_head" | "shared_instruction_member"
nativeEvidence        { onsetMethod:"absolute_energy_v2", sampleRate, channels, frameCount, pcmSha256,
                        startFrame, onsetFrame, quietBeforeFrames, leadFrames, leadPeakDbfs,
                        soundWindowsInFirstTwoSeconds }
headingEvidence       { source:"native_probe"|"existing_certificate",
                        probe:{ path, sha256, probeId, startFrame, frameCount, clipPcmSha256, inputMonoFloat32Sha256 },
                        segmentIds, text, firstSpeechSeconds, instruction:{ segmentIds, text, verb } | null,
                        siblingReadings:[{ probe ref, text, numbers, form, flaggedUncertain }],
                        sharedHead:{ ...same shape... } | null        // members only
                        existing:{ certificateSha256, questionId, startMs, scope } | null }
nextBoundaryEvidence  { kind:"next_heading_native_probe"|"existing_certificate_start"|"closing_announcement",
                        originalNumbers, startFrame, onsetFrame, probe ref / existing ref, text }
passageFrames         { fromFrame: heading startFrame, toFrame: next boundary startFrame }
mappingEvidence       { prepared:{ path, sha256 }, generationAlignment:{ path, sha256 },
                        generatedOrdinal, frozenSourceSegmentIds, evidenceQuotes:[literal strings],
                        quotes:[{ index, text, words, anchor:boolean,
                                  heard:[{ probe ref, segmentIds, wordRange:[from,to] }] }],
                        anchorsHeardInPassage, anchorsTotal }
holdOnlyChecks        { nativeOtherPassageHearings:[], providerEnglishOccurrences:[{ startMs, endMs, insidePassage }],
                        frozenAsrSegmentSpanSeconds:[from,to], frozenAsrOverlapsPassage }
peers                 other question ids offered for the same passage (identical start and native proof)
neighbors             { previous:{ originalNumber, startMs, provenance }, next:{ ... } }
```

Probe containers are written by the existing runner (`../claude/run_probes.py`,
shape `claude-native-probe-v1`): request path and SHA-256, source and full-PCM
identity, model and decode settings, and per probe `startFrame frameCount
clipPcmSha256 inputMonoFloat32Sha256 durationSeconds overflow segments[words]`
exactly as returned. The existing adapter's decode-and-hash replay of a
container applies unchanged.

## Rules an offered row satisfies

1. **Clock.** Decoded PCM identity equals the frozen clock record (rate,
   channels, frame count, SHA-256); the clock record is `passed`, offset 0.
2. **Heading place.** `onsetFrame`/`startFrame` satisfy the measurement policy
   when recomputed from the decode.
3. **Heading number.** The Korean probe begins at `startFrame`, is at most 14 s,
   has no overflow. Its first non-empty segment is reliable (flag recomputed
   from raw metrics), begins within 2 s, and starts with the literal cue
   (`N번`, or a spelled ordinal with `번`; never bare digits). No other stored
   recognition from the same start wrote a different number.
4. **Heading is a question heading.** After the cue the same probe writes a
   Korean instruction ending on an instruction verb, in reliable segments. A
   member (`N번입니다.` followed by its dialogue) instead needs its shared head:
   a heading by rules 2–4 that literally announces a pair or range containing
   `N`, earlier, with only members of that head between them.
5. **First member keeps the shared head.** The passage of the first number of a
   shared instruction starts at the shared heading (`kind
   shared_instruction_head`, `cueSpokenNumbers` the pair or range, scope the
   first number). Later members start at their own cue.
6. **One place.** The same literal number as a heading at two measured onsets
   more than 3 s apart holds every row of that number.
7. **Next boundary.** The very next original number's heading by rules 2–4 (a
   shared head counts for its first number), or an existing certified start
   whose proven original scope begins with that number, or — after the last
   number only — a literal closing announcement at a measured onset. A missing
   or skipped next heading holds the row.
8. **Existing start wins.** If the passage already has a certified start, the
   row takes exactly that start and scope; nothing is re-measured for it.
9. **Quote.** At least one of the question's frozen quotes with four or more
   words is heard word for word (lower case, punctuation and apostrophe style
   aside; `dotted_initialism_v1`; nothing respelled) as consecutive words of
   reliable segments of **one** English probe with
   `passageFrames.fromFrame ≤ probe.startFrame` and `probe.startFrame +
   probe.frameCount ≤ passageFrames.toFrame`. A flagged segment is a barrier:
   no match crosses or uses it.
10. **No contradiction.** No quote of the question is heard word for word in a
    stored English probe that lies outside the passage. Hold-only, from
    estimates: a literal occurrence of a heard anchor in the provider English
    transcript or in the frozen whole-record recognition whose estimated
    midpoint is more than 10 s outside the passage holds the row; so does a
    frozen anchor segment span that does not overlap the passage ±10 s.
11. **Order.** Starts increase with original number against every certified
    start (by its proven original scope) and every offered row; equal starts
    only for an identical scope.

Rules 1–9 and 11 contain no number taken from this corpus. The only
data-chosen quantity is where to listen first; a wrong search band can lose a
row and cannot admit one.

## What stays held, by name

`converted_playback_clock_source_not_listened`, `no_search_hint_for_heading`,
`no_measured_quiet_onset_in_search_band`, `number_not_written_first_at_any_onset`,
`number_written_bare_or_flagged`, `contradictory_number_at_same_start`,
`number_heard_at_two_distant_places`, `instruction_context_not_heard`,
`shared_head_not_established`, `next_heading_not_established`,
`terminal_boundary_not_established`, `no_anchor_quote_of_four_words`,
`anchor_quote_not_heard_in_any_established_passage`,
`quote_heard_in_two_passages`, `quote_also_placed_elsewhere_by_frozen_transcript`,
`frozen_anchor_segments_outside_passage`, `original_order_conflict`,
`passage_start_conflicts_with_certified_scope`, `probe_overflow`,
`official_question_not_in_scope_of_this_route`.

## Controls and adversarial inputs (reported with every run)

- **Blind control replay.** Reconstructed questions that already have a
  certified start are run through the same code as if held; their start, onset
  and scope are not read until the comparison. Reported per stratum: identical
  start, earlier, later (false late), other scope, held (with reasons).
- **Wrong number.** The heading reading of `N` is asked for `N−1` and `N+1`.
- **Neighbour quote.** Each heard quote is tested against the previous and the
  next established passage's probes.
- **Shared member as head / head as member.**
- **Truncation.** The same clips cut to stop before the number ends, and quote
  clips cut inside the quote; a clip whose bounds leave the passage.
- **Another source's clock or probe container.**

Every adversarial case that passes is listed by name; the expected count is 0.

## Replay recipe for an independent verifier

For each candidate: hash the original; decode; compare with the clock record;
recompute 20 ms energy; check onset, quiet, lead and sound at `onsetFrame` /
`startFrame`; for every referenced probe recompute the clip PCM SHA-256 from
the decode at `[startFrame, startFrame + frameCount)` and the 16 kHz mono
float32 SHA-256, check container and request hashes, recompute each segment's
uncertainty; parse the literal cue of the heading and next-boundary probes;
check clip bounds against `passageFrames`; re-read the prepared file and the
generation alignment by hash and check that the quote text is literally
`evidenceQuotes[index]` of this `questionId`; re-match the quote words in the
named segments; re-run the order check against the certificate.
