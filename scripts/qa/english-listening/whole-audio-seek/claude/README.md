# Whole-original seek starts — official sources (claude share)

Offline evidence for **where each official question begins inside its unchanged
whole-round recording**. A start is a point to move `currentTime` to; playback
then continues to the end of the original. Nothing here cuts, re-encodes, uploads
or rewrites audio, questions, transcripts, ASR caches, the database or Storage.

Scope: the 121 official sources / 2,417 current questions assigned to `claude`
in the frozen inventory
`C:/Creative/testautocreator/.qa-artifacts/whole-audio-seek-20261005/inventory.json`.
Artifacts live under
`C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/claude/`
(`<out>` below). Results of the completed run are in [RESULTS.md](RESULTS.md).

## What a start is

`seekStartMs` is a **measured native frame of the original recording**:

1. The original MP3 is decoded once with the product's decoder (`mpg123-decoder`,
   gapless) to PCM16. The stored playback asset is the same file without its ID3
   containers, so both share one MPEG frame sequence and one clock; every
   source's playback SHA-256 and duration are reproduced from the original bytes.
2. Loudness is measured in fixed 20 ms windows (larger channel's sum of squared
   PCM16 samples — an exact integer). A window at or above −50 dBFS is sound.
   Runs of sound separated by less than 300 ms of quiet form one island.
3. The start is **400 ms before the first sound window of the spoken number**,
   and all of those 400 ms are measured quiet. Where bridge music runs closer
   than that to the number, the start is the **first quiet window after the
   music** instead; at least 100 ms of measured quiet must precede the number.
   The lead is always `min(400 ms, measured quiet)` — never a point that leaves
   quiet unused behind it or reaches back into sound.
   `seekStartMs = startFrame × 1000 / sampleRate` is an exact integer on the
   window grid.

   The two seconds after that first sound must hold at least 240 ms of measured
   sound — a spoken number is longer. A click followed by silence is therefore
   never a start, whatever time a recognizer writes for speech that comes later
   (a recognizer that began 4.6 s early at a 40 ms click, before a chime, wrote
   the number at 1.9 s). Every accepted start has 520 ms or more.

4. A bounded recognition probe (≤ 14 s, Korean, the same frozen Whisper
   medium/int8 snapshot as the whole-record ASR) is cut from the native PCM
   **beginning exactly at that frame**. The start is a candidate only when the
   first thing the probe hears is the question's own spoken number, in segments
   the recognizer did not mark uncertain, and the question is grounded as below.

No model timestamp is ever used as a start. The frozen whole-record ASR is quoted
by raw segment id as supporting evidence only: its segment starts absorb bridge
music and silence (a spoken "5번" was stamped 223.10–239.43 s while its sound
begins at 237.8 s) and it lacks roughly a third of the Korean number cues.

Nothing is interpolated: a question nobody heard stays `held` with its reasons,
even when both neighbours are known.

## Spoken forms

Derived from the frozen official fields only (`lib/questions.mjs`):

| kind                        | sound at the start                                            | rows                                                                               |
| --------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `single`                    | "5번" + own instruction                                       | one start                                                                          |
| `shared_instruction_head`   | "19번과 20번" + one instruction, then "19번" + dialogue       | start of the announcement; `cueSpokenNumbers [19,20]`, `scopeQuestionNumbers [19]` |
| `shared_instruction_member` | "20번" + its own dialogue                                     | its own start; `scope [20]`                                                        |
| `shared_passage`            | "19번과 20번" + "다음을 듣고, 물음에 답하시오." + ONE passage | both rows share one start; `cueNumber 19`, `scope [19,20]`                         |

A shared instruction is not a shared passage: its second question has its own
number and its own dialogue. The 2017 recordings announce a shared block as
"16번에서 17번"; both particles name the same two numbers.

## How a start is grounded (`startGrade`)

- `instruction_grounded` — the probe that begins at the start heard the number
  and then at least 0.8 of the official sentence's Hangul character bigrams.
  English names and numerals printed in the official sentence are skipped: the
  announcer reads them and a Korean recognizer writes them in Hangul
  (`strictInstructionCoverage` records the share with them counted).
- `first_dialogue_grounded` — the number, then the question's **own official
  first utterance** heard by an English probe. This is how a shared-instruction
  member is grounded (its number is followed directly by its dialogue), and the
  only way a number whose sentence the recognizer garbled becomes a candidate.
  Only an **exact opening** of the official dialogue counts: four to eight words,
  word for word and in order, in segments the recognizer did not mark uncertain.
  Words are compared in lower case without punctuation; an initialism is one
  word however it is printed ("H.J." = "HJ"). A name the recognizer spelled
  differently ("Minsu" / "Minsoo") is a different word and ends the opening.
  A first utterance of four words or more is quoted alone; a shorter one
  ("Hello?") is quoted whole together with the exact start of the next utterance.
  A word-trigram share is recorded but decides nothing.

  The English probe begins at the start or at a **later measured onset**: an
  English recognition that begins at the spoken number often writes only
  "Number 20" and ends its window at the pause that follows, so the dialogue is
  heard from its own first sound instead. That onset lies within 6 s of the start
  for a member and 20 s otherwise (after the number and its sentence), is itself
  a policy start on the native clock, and never lies past a frame where another
  question's number was heard. The row's `seekStartMs` stays at the number.

- `ordinal_only` — the number in question order, for questions with no official
  text at all in the frozen inputs (image-only prompt "원본 문제지 N번 문항" in a
  source whose official script is empty). Such rows keep
  `reasons: ["official_text_unavailable"]`.

Digits written with only a period ("2.") count as a number only directly before
the question's own sentence, never alone.

`identityEvidence` lists what was established for the row; `notes` carry caveats
(for example `spoken_number_written_as_bare_digits`,
`official_instruction_matched_on_hangul_only` and whether an English probe then
supplied first-dialogue support); `reasons` explain holds.

`scriptEvidence` gives exact character positions in the frozen official
transcript (the live snapshot's `group.transcript.text`): the question's section,
its instruction sentence, and the opening that the English probe heard word for
word — `firstDialogueQuote` for one utterance, or `firstDialogueOpeningEvidence`
(`exact_original_opening_v1`: whole earlier utterances and a last exact prefix)
— with the probe segment ids that carry it.

Frozen whole-record ASR references are strict: `cueSegmentIds` is the one
segment that wrote this number and whose estimated span holds the measured onset
(none when the ASR repeated the announcement), `anchorSegmentIds` is the official
sentence at that segment, and anything merely nearby is quoted under
`diagnosticAsrSegmentIds`.

## Pipeline

All commands run from this directory. Node and the decoder come from the
installed checkout named by the inventory (`inventory.root`); this worktree needs
no `node_modules`. `<inv>` is the frozen inventory path.

`--runtime-root <dir>` (on `measure-native.mjs`, `extract-clips.mjs`,
`run_probes.py` and `verify-marks.mjs --decode`) names another folder whose
`node_modules` holds the same pinned decoder (`mpg123-decoder` 1.0.3,
`@wasm-audio-decoders/common` 9.0.7, `@eshaz/web-worker` 1.2.2, `simple-yenc`
1.0.4). Whatever decoder is used, a decode whose sample rate, channels, frame
count or PCM SHA-256 differs from the measured native cache is refused, so the
clock cannot move with the runtime.

```sh
# 1. Native clock and loudness of every original (CPU, ~15 s per source)
node measure-native.mjs --inventory <inv> --out <out>

# 2. First listening: first sound after bridge music or a long quiet
node plan-probes.mjs --inventory <inv> --out <out> --round 001 --mode bridge [--modal] [--only-unprobed]

# 3. Bounded probes under the shared GPU lock (isolated venv, see below)
<out>/asr-venv/Scripts/python.exe -u run_probes.py --requests <out>/probe-requests/round-001.json \
  --out <out> --lock <shared>/gpu-probe.lock --model-cache <model cache> --owner claude:<dispatch>

# 4. Ledger; then targeted rounds for what is still held
node build-marks.mjs --inventory <inv> --out <out> --run r1
node plan-probes.mjs --inventory <inv> --out <out> --round 002 --mode gaps --ledger <out>/runs/r1/ledger.json
#    ... run_probes.py, build-marks.mjs again ...

# 5. Replay the finished ledger against the frozen inputs; exact counts
node verify-marks.mjs --inventory <inv> --out <out> --marks <out>/runs/<run>/marks.json [--decode]
node summarize.mjs --marks <out>/runs/<run>/marks.json

# Tests (synthetic fixtures; no corpus, GPU or network)
node --test "tests/*.test.mjs"
```

Every output is written once (`wx`); an existing round, run or cache is refused,
never overwritten. A round plans around what was **actually heard** (stored probe
results), not around what an earlier round merely requested.

`--modal` keeps, for a first listening, only the onsets after islands of the
recording's own bridge-music length (the same clip is reused before every
question, so its length is the largest cluster of long islands). It only orders
the work; other long islands are heard in a `gaps` round if a question is still
held there.

`gaps` rounds listen only where the previous ledger still has a held question:

- every still-unheard first sound after a long island or long quiet inside the
  open stretch, under the normal 300 ms split and a finer 100 ms split (the finer
  split separates a spoken number from bridge music that runs into it);
- onsets near any place the frozen ASR wrote that number in any form (including
  its own English rendering — a hint, never evidence), or near the position the
  recording's own measured spacing predicts;
- where a candidate start sits before a sound too short to be a spoken number
  (a click after the music), the next onset, so the start can move up to the
  number itself;
- for a shared-instruction member, the short number-only clip and an English
  first-dialogue probe from the first onsets after the number;
- an English first-dialogue probe from the first onsets after the number and its
  sentence, for a start whose number was written as bare digits, whose sentence
  matched on Hangul only, or whose sentence was garbled.

- where a probe heard a held question's number a few seconds in (a chime or a
  breath came first, or a sound effect follows the number and the recognizer
  wrote its time late), or wrote it as bare digits before a sentence that has no
  official text: every onset of that short stretch as a full probe and as the
  clip that holds the number alone, and for a member English from the onsets
  that follow. The probe's own time only bounds where to listen.

`--only held` listens for held questions only; `--only number` only for that
last kind; `--only support` adds English support to candidates only, and
`--support-list <json>` limits that to the questions an independent verifier
named (`{records:[{sourceRecordId, sourceNumber}]}`).

## Probe runner and GPU lock

`run_probes.py` cuts each source's clips from the native PCM with
`extract-clips.mjs` (so a probe's `startFrame` is a source frame, not a second
decode's estimate), recognizes them, stores text and model times exactly as
returned, and deletes the temporary clips. A probe whose recognized times run
past its real duration is flagged `overflow`; nothing is clamped, and such a
probe proves nothing. Each probe has one fixed language: the round's (`ko`) or
its own (`en`).

Lock protocol (`<shared>/gpu-probe.lock`, shared with the other providers):

- atomic exclusive create with `{owner,pid,host,acquiredAt}`; only the owner
  removes it; a lock whose same-host pid is dead is renamed aside, and a live
  owner's lock is never touched;
- **the model is resident only while the lock is held** — it is unloaded before
  every release, on errors too;
- a waiter writes `gpu-probe.lock.waiting-<pid>` beside the lock. At a source
  boundary, once a source-sized batch ran in the current hold
  (`--min-probes-per-hold`, default 30 probes), the holder hands over (unload,
  release, stay away 3 s) — but only when another live waiter has announced
  itself, so a single runner does not reload its model between sources.

Another provider can call this runner as is with its own `--requests`, `--out`
and `--owner`; `--max-sources 1` alternates fairly, one source each.

The venv is isolated under `<out>/asr-venv` with the pinned
`scripts/qa/english-listening/asr-requirements.txt` plus the CUDA wheels named in
`official-asr-stage/RESUME.md`. No project lock file changed.

## `marks.json`

`schemaVersion 1`, `evidenceContractVersion 1`, `provider "claude"`,
`inventorySha256`, the fixed `policy`, tool hashes and commit, per-source input
hashes and exactly one record per current question in inventory order:

- identity: `sourceRecordId setId revision documentSha256 questionId sourceNumber
sourceAudioSha256 playbackSha256 asrPath asrSha256`
- `status`: `candidate` | `held` | `existing_verified`; `startGrade`
- `seekStartMs` (integer or null) and `seekEndMs` (the full original duration)
- `cueNumber cueSpokenNumbers cueForm scopeQuestionNumbers kind
officialInstruction`
- `cueSegmentIds cueText anchorSegmentIds anchorText diagnosticAsrSegmentIds
diagnosticAsrText` — frozen whole-record ASR, verbatim, possibly empty when
  that ASR skipped or repeated the Korean cue
- `nativeEvidence`: `sampleRate channels frameCount pcmSha256 startFrame
onsetFrame/cueOnsetFrame leadFrames quietBeforeFrames leadPeakDbfs`, the native
  cache and energy file hashes, and the probe binding
  (`probe{path,sha256} probeOffsetFrame probeFrameCount cueProbeSegmentIds`)
- `probeEvidence`: the stored Korean probe that begins at the start
  (`path sha256 probeId segmentIds text inputMonoFloat32Sha256 clipPcmSha256 …`)
- `dialogueProbeEvidence`: the English probe that heard the opening, with its own
  `startFrame` and `offsetFromStartFrames`; `scriptEvidence`;
  `existingCheckProbe` (existing rows)
- `identityEvidence notes heldDiagnostics reasons`

`existing_verified` rows reproduce the frozen `audioRange` exactly and are never
re-decided. Each of them also has an independent probe at the stored start, so
the method can be compared with the earlier verification.

A candidate is an offline finding. It is not permission to write the database,
and no row claims human review.

## Limits

- Recognition text is model output, not human reviewed. The number, the
  sentence and the first utterance are compared; the rest of a dialogue is not
  certified here.
- Browsers seek MP3 by their own decoder; the quiet lead absorbs decoder delay
  differences, but a variable-bit-rate file without a seek table can land
  elsewhere in some browsers. That is a playback property of the stored asset,
  outside this ledger.
- Where a recording has no measurable quiet at all before a spoken number, no
  start is stated for that question.
- Sources whose official script is empty in the frozen snapshot have no
  first-dialogue evidence, and image-only questions there have no official
  sentence at all; their rows say so.
