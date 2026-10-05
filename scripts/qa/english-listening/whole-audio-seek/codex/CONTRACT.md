# Whole-original seek admission, evidence contract 1

This independent verifier admits starts into the entire original recording. A
range ends at the frozen playback duration. Dialogue completeness, repetition
completion, quiet cuts, and physical splitting are outside this proof. Existing
strict cut verifiers remain untouched. Nothing here applies metadata or promotes
human review.

## Proposal identity and completeness

`marks.json` has `schemaVersion:1`, `evidenceContractVersion:1`, `provider`,
`inventorySha256`, and `records`: exactly one row for each current question assigned
to that provider. Every row retains the initial protocol fields and adds
`documentSha256`. Hashes are SHA-256 of actual bytes, not file names. Current
`sourceNumber` and original spoken `cueNumber` are different fields. All identity,
revision, original audio, playback, prepared input, full ASR and frozen live
document checks are deterministic. Missing, duplicate, extra, wrong-provider or
stale rows invalidate completeness and hold affected candidates.

`held` rows may have null starts and evidence, but must state reasons.
`existing_verified` rows must exactly reproduce both endpoints of the frozen
existing audioRange (provide `seekStartMs` and optional `seekEndMs`). The certificate
copies all 38 existing ranges unchanged even when a new candidate is held; any
attempted alteration is a certificate error. The frozen snapshot is authoritative,
not a model's assertion that a start was previously verified.

## Start evidence

Candidates have integer `seekStartMs`, raw `cueSegmentIds`, `anchorSegmentIds`,
`cueNumber`, and increasing `scopeQuestionNumbers` reflecting original speech.
IDs refer to immutable full ASR unless an explicit hash-bound raw-probe reference
is provided. Unknown IDs, duplicates, uncertain evidence, source/probe overflow
and estimated times outside the actual decoded original hold the candidate.
Uncertainty is recomputed using raw metrics in addition to the raw `uncertain`
flag; estimates are retained as estimates.

`nativeEvidence` identifies `sourceAudioSha256`, `sampleRate`, `startFrame`,
`probe:{path,sha256}`, `probeOffsetFrame`, `probeFrameCount`,
`cueProbeSegmentIds`, `cueOnsetFrame`, and `pcmSha256`. A raw probe binds actual
source bytes, decoder, sample rate, original offset and actual number of decoded
frames. Its segment estimates stay local to that immutable probe; the verifier
adds the exact original offset. Decode replay must reproduce the probe PCM hash.
No native timestamp may be justified merely by copying a long full-ASR start or
dividing duration. No media or persistent full-source PCM is written.

The measured start must precede the verified cue onset by 0–500ms. A source-bound
native speech onset must correspond to the selected cue in the bounded probe,
and raw cue numbering must parse to the declared original scope. Start-frame to
millisecond conversion is `floor(startFrame*1000/sampleRate)`; truncation is never
used to fix invalid bounds. Probe maximum duration is 120 seconds. Native PCM
clock and production whole-original playback clock must match within 50ms across
the complete source and use offset zero; production duration itself must match
the production decoder exactly.

## Scope and reconstructed mapping

A cue for 16–17 requires the complete spoken scope `[16,17]`; both questions share
the same start, probe cue and passage. A printed instruction covering 19–20 does
not create a shared passage when the source separately announces each and reads
different dialogues. Individual cues contained in an announced shared scope are
not independent passage starts. Starts increase in **original spoken order**, not
generated current index; equal starts require identical true shared scope.

For reconstructed questions, `mappingEvidence` references an immutable
`alignment:{path,sha256}` belonging to the original source and current question
ID. Its `verified_generation_evidence_segments` anchor IDs must be present in the
selected current proposal and lie inside the true original spoken passage.
Generated ordinal equality, topic-only similarity and nearest-number inference
cannot establish this mapping. An independent current-question/source citation
cross-check can be supplied explicitly; missing original grounding stays held.

Optional official full-ASR observations whose passage cannot be established use
`diagnosticAsrSegmentIds` and exact `diagnosticAsrText`, not admission cue/anchor
IDs. They still require known, unique, ordered IDs and unchanged literal text in
the frozen source ASR. Their complete raw metrics, uncertainty and estimates are
retained under `diagnosticRawEstimates` without claiming passage proof. Required
reconstructed generation anchors cannot be downgraded to diagnostics.

`official_alignment` can resolve a missing/ambiguous spoken numeral only with an
immutable source-bound official script section, unique verbatim instruction and
first-dialogue alignment in a reliable raw bounded probe, and measured source
onset. Both quotes and their unique occurrences must replay. The script's exact
original section scope determines the ordinals. This route cannot silently repair
an uncertain or contradictory number by borrowing the nearest expected ordinal.

## Semantic evidence boundary

The project TypeSafe skill and live API, confidence, citation-check and
pre-parsed-value-selection documentation were read on 2026-10-05. If a semantic
judgment is needed, select among explicit source-bound spans with a no-match
outcome, retain raw probabilities and question/state, and evaluate thresholds
against this dataset. Typed output and model agreement are not proof. This
offline replay does not add a provider integration or use an uncalibrated model
confidence as admission authority. Code owns identity/hash/math/order/bounds;
unresolved semantic evidence remains held.

References: https://docs.typesafe.ai/api,
https://docs.typesafe.ai/confidence,
https://docs.typesafe.ai/cookbooks/citation_check,
https://docs.typesafe.ai/cookbooks/pre_parsed_value_extraction_cookbook.

## Replay artifacts

Each replay writes an immutable `certificate.json`, `held-diagnostics.json` and
input/file hash manifest under a new output directory. The certificate includes
one outcome per inventory question, actual source/provider/status counts, full
original continuation endpoints, exact preserved starts, input hashes, verifier
implementation hashes and errors. A complete replay processes all 193 sources /
3699 questions; an unavailable queue is reported as unavailable, never as success.

## Named native adapter: claude-native-probe-v1

An explicit second shape is supported under evidence contract 1. `nativeEvidence`
has `sampleRate,channels,frameCount,pcmSha256,startFrame,onsetFrame,
quietBeforeFrames,leadPeakDbfs,cachePath,cacheSha256,energyPath,energySha256`.
`probeEvidence` has `path,sha256,probeId,segmentIds,text,inputMonoFloat32Sha256`.
Its container preserves the immutable request path/hash, original source
identity, full native PCM identity, decoder/model settings, and an array of raw
bounded probes with native source `startFrame/frameCount/onsetFrame`, actual
duration, native clip PCM hash, recognition-input mono float32 hash/count, raw
local segments/word bounds/metrics/uncertainty and overflow. A separate
`dialogueProbeEvidence` uses the same reference shape, with its actual duration
and hashes replayed separately. Its default binds the same source start/onset;
the explicitly named measured offset form below binds a later original dialogue
onset. The cue and
`member_dialogue` probes stay at most 14 seconds. A separately named
`first_dialogue` probe may extend up to 60 seconds (the current producer uses
24 seconds) to reach the first utterance after a long official instruction. Its
actual source bounds, clip PCM and recognition-input hashes remain mandatory;
this provides no dialogue-END/cut proof and adds no question cutoff.

The independent production decoder replays all source bytes. Native PCM16 and
20ms energy windows are recomputed exactly; no provider energy cache is treated
as authority. An onset is the first sound window at or above -50dBFS after at
least 100ms measured quiet. The explicit `whole-audio-seek-start-v2` policy uses
`leadWindows=min(20,quietWindows)`: exactly 400ms before the onset when available,
otherwise the first quiet window after the preceding music/sound. A start cannot
skip measured quiet or reach backward into sound. Candidate discovery may use
300ms or 100ms island separation; replay remeasures the actual quiet and first
sound rather than trusting that candidate discovery. Raw recognition must start with the
selected original spoken number and support the corresponding instruction/scope.
The verifier recomputes clip PCM and PyAV 16kHz mono float32 input hashes in RAM.
All segment and word bounds must stay inside the actual probe duration; even a
producer overflow tolerance cannot clamp or legalize out-of-bounds raw words.

Full-ASR IDs may be empty when the immutable bounded native numbered probe
supplies the missing cue. Raw full-ASR estimates and uncertainties remain intact.
`cueSpokenNumbers` describes what was announced, while `scopeQuestionNumbers`
describes the true passage that begins here. A shared instruction head can
announce `[19,20]` while starting passage `[19]`; the member's own `20번` starts
`[20]`. A true shared passage uses `[16,17]` or `[19,20]` on both rows with the same
native cue proof and start. Frozen official instructions and actual raw speech
establish this distinction.

A bare `N.` or uncertain numeral requires `scriptEvidence` with actual original
transcript `sectionStartCharacter/sectionEndCharacter`, unique `instructionQuote`
and reliable `instructionProbeSegmentIds`, and unique `firstDialogueQuote`
matching the **first** official utterance plus `dialogueProbeSegmentIds`. The
first dialogue quote has at least four English words and must occur uniquely in
the entire original script. A contradictory spoken numeral still holds. An
English entity omitted from a Korean similarity score is resolved by this
explicit alignment route, not by silently changing coverage rules.

The explicit `official_alignment` cue form can use no recognized numeral only
after that same unique original instruction/first-dialogue proof. It retains
`cueSpokenNumbers:[]` rather than inventing a number heard by the recognizer.
Character offsets and optional UTF-8 transcript SHA must match actual original
substrings. Original bracketed stage directions are parsed separately from the
first actual utterance without changing any original text.

`measured_original_passage_offset_v1` permits a separately measured first-dialogue
probe when recognition at the numbered cue skipped the following dialogue. Its
integer `dialogueProbeEvidence.offsetFromStartFrames` must equal the actual raw
dialogue start frame minus the numbered probe's start frame. The dialogue start
is after the original numbered onset; its measured onset stays within six seconds
for `shared_instruction_member`, or twenty seconds otherwise. Both clips bind
the same independently replayed full original PCM/clock and separate immutable
request/source/input hashes. The later onset and 100–400ms lead are remeasured
from the original energy, rather than inferred from the quote. Final checks
require the selected raw quote bounds to end before the next original question's
admitted or preserved start; a missing next measured passage boundary holds this
offset form. The last original question uses the full source end. These are
passage identity checks, not a dialogue-END/cut proof. The numbered seek start
remains unchanged.

When the actual first utterance has fewer than four English words, the separately
named `scriptEvidence.firstDialogueOpeningEvidence` can use
`{method:"exact_original_opening_v1",quotes:[{text,startCharacter,endCharacter},...]}`.
It includes the first actual short utterance and immediately following original
turns, at most three; every preceding quoted turn is complete and the last is an
exact prefix. Combined words must number at least four and occur uniquely in the
original script with speaker formatting removed. Every quote retains its literal
original source character bounds and all words must occur exactly, in order, in
the unchanged reliable raw probe segments named by `dialogueProbeSegmentIds`.
For example, actual `Hello?` followed by `Hi, this is` proves the opening without
altering a later proper name. Skipping the short first utterance, later-only
quotes, section overlap, forged offsets, nonunique openings and similarity scores
cannot pass. Blank printed answers with nonspoken bracketed stage directions are
parsed as source structure; real short speech is never skipped.

Official script headings use a complete, unique and ordered literal source
style (`N번` or `N.`). A complete `N번` style excludes incidental calendar or
dialogue decimals. A literal joint header such as `【19-20】` may cover those
missing individual headings only with the actual frozen shared instruction
(`물음에 답하시오`) and both original question identities; it provides one true
shared passage heading, never separate guessed member starts. Duplicated real
headings, incomplete mixed styles and reversed original headings remain held.
An instruction head ends before nonspoken bracketed stage directions preceding
the first actual speaker. These parsing rules select unchanged original text;
they do not rewrite the script or infer spoken numbers from calendar dates.

For reconstructed rows this native adapter uses reliable bounded original
numbered recognition, a reliable full-ASR cue with the same original spoken
numbers, anchors inside that original passage before the next original cue,
and exact frozen generation-alignment IDs/current question identity. When raw
ASR repeats a numeral, exactly one reliable matching raw estimated cue interval
must contain the independently measured original `onsetFrame/sampleRate`, and
it must be the selected cue. Overlapping or non-containing estimates remain
held. This explicit source-bound containment rule contributes no physical
timestamp authority to the raw estimate and never selects the nearest numeral.
Final starts must still pass the complete original-order neighbor checks.
`kind:single` describes a one-number original scope, independently of generated
display index. It does not compare the generated prompt as an official
instruction. Shared passage evidence needs the actual original shared-question
instruction; a shared instruction head instead needs the separate native member
cue. Bare, missing or uncertain reconstructed ordinals remain held.

CPU Silero speech-onset estimates from the actual reproduced recognition input
are diagnostic only. They neither override measured sound/numbered source
evidence nor create admission authority. The diagnostic includes exact original
offset, input hashes and unchanged raw word estimates. Known preserved starts,
including starts retaining an introduction, provide a calibration comparison;
the existing 38 stay unchanged regardless of these diagnostics.

## Named noisy-source onset: noise_floor_contrast_v1

Steady radio hiss can be louder than -50dBFS. Seeking a whole source requires a
proven leading cue, not physical silence. `nativeEvidence.onsetMethod` can select
this explicit tier while keeping original samples unchanged. The verifier
replays all PCM/energy before deriving the actual two-second baseline immediately
before the candidate onset: exactly 100 native 20ms max-channel energy bins.
`noiseFloorEvidence` stores `baselineStartFrame,baselineFrameCount,
baselineEnergySha256,medianDbfs,p10Dbfs,p90Dbfs,thresholdDbfs,contrastDb,
percentileMethod`. The baseline SHA covers its actual float64 little-endian
energy bytes. Percentiles use the nearest-rank definition. All bins are positive,
the p90-p10 range is at most 6dB and every baseline bin stays below the measured
threshold `medianDbfs+10`. The onset exceeds that threshold with at least three
of its next five bins exceeding it, excluding an isolated short click.

The relative quiet count, actual RMS lead peak and native 100-400ms lead are
recomputed against this threshold. This nominates a measurable sound onset;
admission still needs source-bound bounded recognition of the reliable original
number first, raw cue-interval correspondence, correct frozen source/current
question identity, actual generation anchors within the original passage and
original ordinal ordering. Music, previous speech in the baseline, wrong
numbers, forged statistics/hashes and overflow stay held. Contrast or VAD alone
provides no admission. An old immutable request's absolute-threshold quiet count
remains its original value; the separately named row proof supplies and verifies
the relative threshold measurement for the same unchanged source input frames.

The separately named `noise_floor_contrast_1second_v1` applies the same exact
statistical/hash/persistence rules to fifty original 20ms bins immediately before
the onset. This explicit one-second span handles a real numbered cue following
an introduction that lies in the preceding second. Its span SHA, nearest-rank
percentiles, native onset/lead and reliable original numbered recognition still
replay independently. It cannot reuse a two-second span proof, shorten the span
arbitrarily, ignore preceding speech inside its own baseline, or admit from
contrast alone. The existing two-second tier and absolute-energy tier remain
unchanged; both named noise tiers use the same strict cue/anchor/order rules.

## Official ordinal-only tier

An original official question without usable instruction/script text can use
`evidenceGrade:ordinal_only`. It requires a clear, reliable, unambiguous raw
native numbered announcement, the measured onset and production clock, exact
current question identity and original source number, and the actual original
question PDF SHA verified against prepared provenance and frozen metadata. The
complete original ordinal chronology must be covered by admitted or preserved
starts and pass ordered-neighbor checks; incomplete chronology holds this tier.
Missing text stays visible in diagnostics. This tier provides no dialogue or
human-review certification and never applies to reconstructed questions.

## Actual converted playback exception

`ebs-middle-1-2006-2` is original MP4 with an already existing normalized MP3
playback. Its original and playback hashes stay separate. The actual
authenticated playback was supplied by the coordinator. Nine independent
eight-second waveform correlation landmarks spanning 2–97% of the recording
measured zero offset at 16kHz, with no duration difference; the actual production
MP3 decode matches the frozen playback duration. These measured artifacts are
combined with the other 192 complete original-MPEG-frame proofs. Zero offset was
measured rather than assumed from duration. New seeking evidence for this source
must still bind the correct original/playback clock and actual spoken cue.

## Independent reconstructed mapping audit and assembler provenance

`mapping_audit.py` checks every current reconstructed question against the frozen
live revision/content, source/hash, actual clock and generation alignment. Exact
immutable ASR array positions determine the one numbered passage containing all
frozen anchor IDs. Uncertain and unresolved numbered headings remain barriers;
they are never skipped to attach anchors to a prior reliable number. Raw times
stay estimates and cannot become seek timestamps. Unknown, duplicate, uncertain,
cross-passage anchors and contradictory array/time order remain held.

Several current generated questions may share original scope `[N]`. Each needs
its own frozen current-question grounding, with identical actual native proof
identity and start for all peers. Generated row multiplicity never establishes
original scope `[N,N+1]`; a true joint spoken instruction or an explicitly
separate member cue is required by the existing scope rules. Official duplicate
single-number rows remain rejected. The audit includes explicit producer mapping
cross-checks and structurally supported source-bound probe references; it is
diagnostic only and does not replace actual source decode/onset/hash replay.

The queue `provider` remains the frozen lane (`claude` or `grok`). A replacement
assembler declares `compilerProvider`, `compilerModel`, `upstreamProducer` and
nonempty `upstreamArtifacts` containing immutable path/SHA references. All four
fields are required together; upstream producer must match the lane. Certificates
expose `producerProvenance` separately from lane counts, and upstream artifact
hashes are checked before and after replay. An undeclared compiler is recorded
as undeclared, without inventing an actual provider/model.

## Repeated exact first utterance

`exact_original_opening_v1` retains its short-first-utterance rule.
`exact_original_opening_v2` covers a complete first utterance of at least four
English words whose literal words occur multiple times in the original script.
It requires the complete first utterance plus an exact immediate next-turn
prefix (at most three turns total) that makes the complete opening unique.
Exact source character bounds, complete preceding turns, no skipped words,
unchanged reliable native raw words and all source/onset/neighbor checks remain
mandatory. A unique first utterance uses the existing single-prefix route.
Repeated combined context, truncation or a borrowed later reply remains held.

English word comparison uses deterministic `dotted_initialism_v1`: contiguous
dotted letter initials (`H.J.`, `p.m.`, `U.S.A.`) compare to their undotted forms.
Literal source quotes, raw ASR text, hashes and character positions remain
unchanged. Spaces, names, spelling and numeric values are never repaired.
Dialogue proof keys expose both normalization and the opening method.

## Explicit incomplete-identity metadata adapter

`recover_queue_identity.py` can derive a separate immutable reconstructed queue
by filling only blank `sourceAudioSha256`, `playbackSha256`, `asrPath` and
`asrSha256` from the frozen inventory. It requires the complete current question
population and all other typed source/current/revision/document identities.
Populated conflicting identities, stale revisions, wrong or duplicate IDs,
omissions and existing verified rows reject the join. It never changes a
question, choice, script, raw evidence, scope, cue, timestamp or row status.
The original assembler artifact stays unchanged and its compiler provenance is
retained; `metadataAdapters` explicitly attributes the mechanical join to Codex
and binds its implementation, original proposal and inventory hashes. The
complete actual-source verifier must then replay all derived proposals; metadata
completion provides no cue, timestamp, semantic or admission authority.

## Original reconstructed scope boundaries v2

`original_instruction_neighbors_v2` binds a reconstructed current question to
its immutable anchor array positions and the selected original heading.
Literal numbered Korean headings and bare numbered English instruction headings
starting `Listen`, `Choose`, `Look at` or `Read` remain passage barriers even
when unresolved or uncertain. Bare headings do not become heard ordinals.
English answer options such as `Number 1`, `4. Sorry ...` and `5. Are you ...`
are not promoted to original question headings. A Korean spoken ordinal needs
literal reliable question-instruction context before the first English utterance;
an immediate separately announced second member can inherit its explicit paired
instruction. Generated order and question multiplicity provide no such evidence.

The next literal original heading must begin with the next number after the
proven scope. A missing ordinal, contradictory number or missing following
heading is held explicitly, including the terminal interval when no original
terminal identity is available. This conservative identity proof neither claims
a complete-dialogue ending nor requires quiet/cut evidence. Playback of every
admitted start continues to the full original source end.

Every independently measured reconstructed native onset, including a unique
ordinal, must be contained in the selected immutable full-ASR cue search span.
Duplicate ordinals still require one uniquely containing span. Raw times stay
estimates: the rule can hold a legitimate onset outside an inaccurate estimate;
it never clamps, pads, rewrites the estimate, guesses by proximity or treats an
answer-option ordinal elsewhere in the source as the question cue. The v2
mapping audit scans every finished round receipt and is diagnostic until actual
source/clock/PCM/raw recognition/onset replay succeeds.
