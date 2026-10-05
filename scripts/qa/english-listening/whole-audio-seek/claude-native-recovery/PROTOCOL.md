# Native recovery of held whole-original starts — evidence protocol 3

Producer: `claude-native-recovery`. Reconstructed route
**`native_numbered_passage_literal_quote_v1`**, offered in the independent
verifier's adapter shape `native-localized-generation-v2`. Official route
**`native_numbered_passage_script_sentence_v1`**, offered apart; its rows that
also meet the verifier's official gate are shaped for the verifier's wrapper
`official-catalogued-native-v1`.

Protocol 1 (sent before any recognition ran) and protocol 2 are kept unchanged
at `<OUT>/protocol/PROTOCOL-v1.md` and `PROTOCOL-v2.md`. Protocol 2 differed
where the coordinator and the verifier asked for more: **every** frozen quote
in **one** clip, cited generation segments without a quote heard whole, the
verifier's field names, its named noise tiers, a complete probe catalog.
Protocol 3 writes down what was added after the pilot, each at the
coordinator's or the verifier's request: one catalog per source, raw-word
checks on a quote, a passage that may end where the next number is first heard
(rule 7b, countable apart), the official wrapper with its number clip, the
converted original on its own clock, and a receipt of what was asked against
what was heard. Nothing was loosened; no start tier was added or changed.

An offered row is an offline finding. Admission is the independent verifier's;
nothing here writes a database, Storage, media or a clip, and no row claims
human review.

## What decides, and what never does

| link         | authority                                                                                                             | never                                           |
| ------------ | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| clock        | full decode of the original bytes; PCM SHA-256 equal to the frozen clock record                                       | a provider duration, a second decode's estimate |
| heading      | a measured native onset after measured quiet; start = onset − min(400 ms, quiet)                                      | a provider or recognizer time                   |
| number       | a bounded Korean recognition that begins at that start writes the literal number first, reliably, at the onset        | a displayed number, a neighbour, a confidence   |
| next heading | the same, for the very next original number; after the last number a literal closing                                  | the next number that happened to be found       |
| passage      | native frames `[headingStartFrame, nextHeadingStartFrame)`                                                            | a transcript window                             |
| mapping      | every frozen generation quote, word for word, in one English clip whose **whole clip lies inside the passage frames** | similarity, topic, recognizer time of the words |

Provider and recognizer times are read to decide where to listen and in two
hold-only checks. The only numbers taken from this corpus are those search
bands; a wrong band can lose a row and cannot admit one.

## Inputs (bound by SHA-256 of bytes)

- inventory `58a53b05…`, clock `bb8b37dd…` (the exact-live rebase of
  2026-10-06) and certificate `776d313a…`. Row identity (`revision`,
  `documentSha256`) is joined from the inventory, so the same physical evidence
  can be rebuilt on a later exact rebase without new recognition.
- original audio; prepared file (`verification.grounding[ordinal].evidenceQuotes`
  and `sourceSegmentIds`); generation alignment (joins `questionId` to the
  ordinal; must name the same frozen recognition and the same segment ids);
  frozen whole-record recognition (the literal text of those segments).
- search only: the two provider transcripts (raw response hashes).
- `ebs-middle-1-2006-2` (converted original, M4A) is not decoded here. Its
  clock is the decode of the authenticated playback MP3, bound to the original
  by the verifier's landmark proof (`convertedClockProof`); its clips are cut
  by the verifier's own `codex/native-windows.mts`, read only, by a separate
  runner (`run-converted.sh`). Its rows carry that proof in their clock
  identity and are otherwise judged by the same rules.

## Measurement

20 ms windows; a window's level is the larger channel's sum of squared PCM16
samples. `absolute_energy_v2`: sound is ≥ −50 dBFS; an onset follows ≥ 100 ms of
quiet. `noise_floor_contrast_v1` / `noise_floor_contrast_1second_v1` (the
verifier's existing named tiers, unchanged): a stationary baseline of 100 / 50
windows before the onset (nearest-rank p90 − p10 ≤ 6 dB, all below median +
10 dB), the onset and three of its first five windows at or above that level.
Either way: `startFrame = onsetFrame − min(20, quietWindows) × windowFrames`,
quiet counted against the tier's own threshold; the two seconds after the onset
hold at least 240 ms of sound; `seekStartMs = floor(startFrame × 1000 /
sampleRate)`; `seekEndMs` is the frozen playback duration.

## Rules an offered reconstructed row satisfies

1. **Clock.** The decode reproduces the frozen clock record.
2. **Heading place.** `onsetFrame` / `startFrame` satisfy the measurement above.
3. **Heading number.** The Korean probe begins at `startFrame`, is at most 14 s,
   has no overflow and no segment without duration. Its first segment is its
   first speech, reliable by its raw metrics (recomputed; never cleared), begins
   no later than 0.5 s after the onset and does not end before it, and starts
   with a literal `N번` (or a spelled ordinal with `번`). Bare digits and
   `N번째` are not a number. Every other recognition from the same start is
   listed; a different number in any of them holds the start.
4. **Instruction.** The same probe writes the announcer's instruction after the
   number, in reliable segments. A lone `N번입니다.` is a member only inside
   the nearest earlier shared heading that names it.
5. **Shared instruction.** The first member starts at the shared heading
   (`kind shared_instruction_head`, `cueSpokenNumbers` the pair or the two ends
   of a range, scope the first number). Later members start at their own cue
   and carry `sharedHeadProbeEvidence`.
6. **One place.** The same number as a heading at two measured onsets more than
   3 s apart holds every row of that number.
7. **Next boundary.** The heading of the very next original number by rules
   2–4 (`nextProbeEvidence`, `nextNativeEvidence`). After the last number: a
   literal closing announcement at a measured onset (`terminalProbeEvidence`),
   no larger number written by any transcript or recognition, and every
   long-quiet onset up to the closing listened to. A passage ends at the
   earlier of the native and the certified start of the next number. Where
   only a certified start bounds it, `nextProbeEvidence` is null and the row
   names the certificate that admitted that start (`nextCertificateEvidence`).

   **7b. First speech of the next number** (`nextBoundary.kind
next_number_first_speech_boundary`, added after the pilot). Where the next
   number's heading does not stand as a start, a passage may still END at the
   measured start of a Korean recognition whose first speech is the literal
   next number, reliably, followed by its complete instruction — or the number
   is a later member of a shared heading that stands — whatever time the
   recognizer wrote for the number. The start must be the measured lead before
   a measured onset; the number must not be written at two places more than 3 s
   apart nor contradicted from the same start; the earliest such start is
   taken. It ends a passage and is never a seek start
   (`nextBoundaryProbeEvidence`, `nextBoundaryNativeEvidence`). Rows that rest
   on it are counted apart in `summary.offeredByNextBoundary` and can be left
   out as a group.

8. **Nothing else inside.** No stored Korean recognition that begins inside the
   passage frames wrote another possible heading first, in any form, flagged or
   not (bare digits count before an instruction).
9. **Certified start wins.** A passage with a certified start is offered only
   with a native heading at exactly the certified start and onset frames.
10. **Frozen quotes.** Every `evidenceQuote` stands literally in a contiguous
    run of the question's frozen generation segments (`sourceSegmentIds`,
    `startCharacter`, `endCharacter` in their space-joined text) and exactly
    once in the whole frozen recognition. At least one has four words.
11. **Native quotes.** The quotes of four words or more are heard in exactly
    one passage and in no clip that lies wholly elsewhere. One English clip
    (`dialogueProbeEvidence`, purpose `localized_generation`, at most 60 s) with
    `passage.fromFrame ≤ startFrame` and `startFrame + frameCount ≤
passage.toFrame` writes every quote, short ones included, as consecutive
    words of reliable segments (`probeSegmentIds`). A flagged segment is a
    barrier, and so is a segment whose raw words do not spell its own text,
    in order and inside it, each with a duration and a probability (the
    verifier's raw-word checks; nothing is repaired). Words are compared by the
    verifier's `dotted_initialism_v1` rule.
12. **Cited segments without a quote.** Each frozen generation segment that no
    quote touches is written whole, exactly once, by the same clip
    (`localizedMappingEvidence.anchorSegments`).
13. **Estimates hold only.** A literal occurrence of a heard anchor in the
    provider's English transcript more than 10 s outside the passage, or frozen
    anchor segments estimated more than 10 s outside it, holds the row.
14. **Order.** Starts increase with original number against every certified
    start and every native heading; a native start on the wrong side is dropped.

## Row (`candidates.json`)

Identity `sourceRecordId setId revision documentSha256 questionId sourceNumber
sourceAudioSha256 playbackSha256 provider reconstructed`; then

```
status "candidate"   route   evidenceAdapter "native-localized-generation-v2"
seekStartMs seekEndMs cueNumber cueSpokenNumbers cueForm scopeQuestionNumbers kind
cueSegmentIds []      anchorSegmentIds = frozen generation ids
nativeEvidence        { cachePath cacheSha256 energyPath energySha256 sampleRate channels frameCount pcmSha256
                        onsetMethod startFrame onsetFrame quietBeforeFrames leadFrames leadPeakDbfs
                        soundWindowsInFirstTwoSeconds [noiseFloorEvidence]
                        [quietEvidenceMethod rawProbeQuietBeforeFrames quietDiscoveryEvidence] }
probeEvidence         { path sha256 probeId segmentIds text inputMonoFloat32Sha256 clipPcmSha256 startFrame frameCount }
nextProbeEvidence nextNativeEvidence | sharedHeadProbeEvidence sharedHeadNativeEvidence | terminalProbeEvidence terminalNativeEvidence
dialogueProbeEvidence same reference shape, purpose "localized_generation"
mappingEvidence       { alignment questionId sourceSegmentIds }
localizedMappingEvidence { method "exact_generation_anchor_native_v2" alignment prepared questionId generatedOrdinal
                        sourceSegmentIds quotes[{ text sourceSegmentIds startCharacter endCharacter probeSegmentIds }]
                        anchorSegments[{ sourceSegmentId text probeSegmentIds }] }
nativeRecovery        { passageFrames dialogueClipFrames headCovers sharedHeadCovers existingCertifiedStart
                        nextBoundary{kind …} quotes siblingReadings uncoveredAnchorSegmentIds
                        verifierPreconditions holdOnlyChecks peers neighbors }
probeCatalog          { path sha256 }
```

The three quiet fields appear only where the request that found a noise-tier
onset stored the baseline length as its quiet; the block then states the full
measured quiet and names the raw value and its baseline. Raw requests and
containers are never changed.

`catalogs/<sourceRecordId>.json` is fixed when a run is written, one per
source: every container of that source in the roots — used or not — as one
entry per file (`roots[{ path, pattern }]`, the pattern a literal file path),
with SHA-256, request path and hash, and the raw recognitions behind a
certified start that bounds one of its passages. `catalogs.json` indexes them;
`adversarial-catalogs/` lists the deliberately damaged clips apart. Containers
are written by the existing runner (`../claude/run_probes.py`, shape
`claude-native-probe-v1`) at `<root>/probes/round-NNN/<sourceRecordId>.json`.

## Official rows (`official-candidates.json`)

The passage is built the same way, with two things an official source allows:
a long reading that wrote bare digits before the instruction and a short clip
from the same start that wrote the literal number are one heading; and after
the last printed question number the passage may end with the recording
(`officialTerminalEvidence`). Identity in this producer's route is a sentence
of four words or more of the question's own script section that the whole
script prints once, heard by one English clip wholly inside the passage, while
no other section's such sentence is heard in any clip inside it and no own
sentence in a clip wholly outside it. Script offsets are on the original
prepared transcript, which must equal the live snapshot's text.

A row is shaped for the verifier's wrapper (`official-candidates.json`,
`evidenceAdapter official-catalogued-native-v1`) only when, in addition, the
exact opening of the section's first utterance is heard in a clip that begins
at a measured onset inside the passage, and — where the heading rests on a
separate number clip — that clip is at most 3 s, one segment, the literal
number, and nothing after it but an optional `입니다` and punctuation. Keys:
`probeEvidence` the long reading with the instruction, `numberClipEvidence`,
`nextProbeEvidence` and `nextNumberClipEvidence` for the next heading,
`scriptEvidence` (transcript hash, the section's characters, the instruction
quote with its start character and probe segments, the first dialogue quote
with its opening evidence and probe segments). A row bound only by a later own
sentence is reported in `official-later-sentence-findings.json` and is not
offered for admission. The verifier's own route for placeholder and
question-19 rows (`official-pdf-native-scope-v2`) is not touched here.

## Controls and adversarial inputs (in every run's `controls.json`)

- **Blind control replay.** Questions that already have a certified start are
  run through the same code with the certificate unread; reported by the
  coordinator's family-separated partition, with the sources inspected during
  development apart: identical start, earlier, later, other scope, held.
- **Heading comparison.** For each original number with both a certified start
  and a blind native heading: the difference in milliseconds.
- **Wrong number.** Each established heading is asked for `N−1` and `N+1`.
- **Neighbour quote.** Each offered row's quotes, with its own passage taken
  away, must bind to no other passage.
- **Shared head.** The first member of every shared heading starts at the
  heading even where its own number was also heard.
- **Damaged clips.** Real clips cut 400 ms after the measured onset, and begun
  300 ms after it, recognized and judged by the same rules. The cuts are placed
  from the machine-measured energy onset: they are not human-marked and are
  not proved truncations of the spoken number (where the onset is a sound
  before the number, the late clip still holds the whole number).
- **Another source's container.** Refused by hash.

## What was asked against what was heard

A round is a request file (`probe-requests/round-NNN.json`) and one raw
container per requested source. A round number is used once: a number that has
a request, raw containers or a temporary folder is never planned over. Each
driver stage leaves a line in `logs/stages.jsonl`. `listening-receipt.json` in
a run (and `<OUT>/receipts/<name>.json`) lists every request with its exact
source and probe counts, checked container by container against the request's
bytes, the original's bytes and the requested probes; the requests declared
stopped, by name and reason (`stopped-requests.json`), with how many of their
unanswered probes were heard in another round and how many nowhere; and the
stage records. The full run is built only when every request is finished or
declared stopped, no stage failed undeclared and no raw folder lies without its
request. A stopped request's containers are read like any other.

## Replay recipe

For each candidate: hash the original; decode; compare with the clock record;
recompute 20 ms energy; re-measure onset, quiet, lead and sound of the head,
next, shared-head and terminal places under their named tier; for every
referenced probe recompute the clip PCM SHA-256 at `[startFrame, startFrame +
frameCount)` and the 16 kHz mono float32 SHA-256, check container and request
hashes, recompute each segment's uncertainty; parse the literal cue of each
Korean probe; check the English clip's bounds against the head and next starts;
re-read the prepared file, the alignment and the frozen recognition by hash and
check each quote's literal text and character span; re-match the quote words in
the named native segments; read every other container of the source from the
catalog for a contradicting number; re-run the order check.
