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
   containers, so both share one MPEG frame sequence and one clock; every source's
   playback SHA-256 and duration are reproduced from the original bytes.
2. Loudness is measured in fixed 20 ms windows (larger channel's sum of squared
   PCM16 samples — an exact integer). A window at or above −50 dBFS is sound.
   Runs of sound separated by less than 300 ms of quiet form one island.
3. The start is **400 ms before the first sound window of the spoken number**,
   and all of those 400 ms are measured quiet. Where bridge music runs closer
   than that to the number (about 200 places in these recordings), the start is
   the **first quiet window after the music** instead; at least 100 ms of
   measured quiet must precede the number. The lead is always
   `min(400 ms, measured quiet)` — never a point that leaves quiet unused behind
   it or reaches back into sound. `seekStartMs = startFrame × 1000 / sampleRate`
   is an exact integer on the window grid.
4. A bounded recognition probe (≤ 14 s, Korean, same frozen Whisper medium/int8
   snapshot as the whole-record ASR) is cut from the native PCM **beginning
   exactly at that frame**. The start is a candidate only when the first thing
   the probe hears is the question's own spoken number, followed by its official
   instruction, in segments the recognizer did not mark uncertain.

No model timestamp is ever used as a start. The frozen whole-record ASR is quoted
by raw segment id as supporting evidence only; its segment starts absorb bridge
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
number and its own dialogue. A member has no Korean sentence after its number, so
it needs two probes from the same frame: a short Korean one that holds the
number alone, and an English one that hears the official first utterance of that
question (word-trigram share ≥ 0.6 against the official script section).

## Identity evidence

Each candidate lists what was actually established (`identityEvidence`):

- `spoken_ordinal_first_at_start` — the probe that begins at the start.
- `official_instruction_after_ordinal` — ≥ 0.8 of the official sentence's Hangul
  character bigrams follow the number (English names and numerals in the official
  sentence are skipped: the announcer reads them and a Korean recognizer writes
  them in Hangul).
- `official_first_dialogue_at_start` — members only.
- `dialogue_anchor` — frozen-ASR utterances that the official script assigns to
  this question lie between this start and the next one.
- `whole_asr_cue_segment` — the frozen ASR also wrote this number near the start.
- `starts_in_question_order` — every recording's starts are strictly increasing.
- `frozen_prompt_names_original_question_number` — image-only questions whose
  frozen prompt is literally "원본 문제지 N번 문항" (see Limits).

`notes` carry caveats on candidates; `reasons` explain holds.

## Pipeline

All commands run from this directory. Node and the decoder come from the
installed checkout named by the inventory (`inventory.root`); this worktree needs
no `node_modules`. `<inv>` is the frozen inventory path.

```sh
# 1. Native clock and loudness of every original (CPU, ~15 s per source)
node measure-native.mjs --inventory <inv> --out <out>

# 2. Round 1 requests: first sound after a long island (bridge music) or long quiet
node plan-probes.mjs --inventory <inv> --out <out> --round 001 --mode bridge

# 3. Bounded probes under the shared GPU lock (isolated venv, see below)
<out>/asr-venv/Scripts/python.exe -u run_probes.py --requests <out>/probe-requests/round-001.json \
  --out <out> --lock <shared>/gpu-probe.lock --model-cache <model cache> --owner claude:<dispatch>

# 4. Ledger; then targeted rounds for what is still held
node build-marks.mjs --inventory <inv> --out <out> --run r1
node plan-probes.mjs --inventory <inv> --out <out> --round 002 --mode gaps --ledger <out>/runs/r1/ledger.json
#    ... run_probes.py, build-marks.mjs again ...

# 5. Replay the finished ledger against the frozen inputs
node verify-marks.mjs --inventory <inv> --out <out> --marks <out>/runs/<run>/marks.json [--decode]

# Tests (synthetic fixtures; no corpus, GPU or network)
node --test "tests/*.test.mjs"
```

Every output is written once (`wx`); an existing round, run or cache is refused,
never overwritten. `gaps` rounds listen only where the previous ledger still has
a held question:

- every still-unheard first sound after a long island or long quiet inside the
  open stretch, under the normal 300 ms split and a finer 100 ms split (the finer
  split separates a spoken number from bridge music that runs into it);
- onsets near any place the frozen ASR wrote that number in any form (including
  its own English rendering — a hint, never evidence), or near the position the
  recording's own measured spacing predicts;
- for a shared-instruction member, the short number-only clip and the English
  first-dialogue probe at each such onset.

`summarize.mjs --marks <marks.json>` prints the exact counts of a ledger.

## Probe runner and GPU lock

`run_probes.py` cuts each source's clips from the native PCM with
`extract-clips.mjs` (so a probe's `startFrame` is a source frame, not a second
decode's estimate), recognizes them, stores text and model times exactly as
returned, and deletes the temporary clips. A probe whose recognized times run
past its real duration is flagged `overflow`; nothing is clamped, and such a
probe proves nothing.

Lock protocol (`<shared>/gpu-probe.lock`, shared with the other providers):
atomic exclusive create with `{owner,pid,host,acquiredAt}`; only the owner
removes it; a waiter polls and never removes a live owner's lock; a lock whose
same-host pid is dead is renamed aside. One source is one batch; the runner
releases the lock after each batch, sleeps 3 s, and unloads its model whenever it
finds the lock taken. One model is loaded on the GPU at a time.

The venv is isolated under `<out>/asr-venv` with the pinned
`scripts/qa/english-listening/asr-requirements.txt` plus the CUDA wheels named in
`official-asr-stage/RESUME.md`. No project lock file changed.

## `marks.json`

`schemaVersion 1`, `evidenceContractVersion 1`, `provider "claude"`,
`inventorySha256`, the fixed `policy`, tool SHA-256s, per-source input hashes and
exactly one record per current question in inventory order. Record fields:

- identity: `sourceRecordId setId revision documentSha256 questionId sourceNumber
sourceAudioSha256 playbackSha256 asrPath asrSha256`
- `status`: `candidate` | `held` | `existing_verified`
- `seekStartMs` (integer or null) and `seekEndMs` (the full original duration)
- `cueNumber cueSpokenNumbers scopeQuestionNumbers kind officialInstruction`
- `cueSegmentIds cueText anchorSegmentIds anchorText` — frozen whole-record ASR,
  verbatim, possibly empty when that ASR skipped the Korean cue
- `nativeEvidence`: `sampleRate channels frameCount pcmSha256 startFrame
onsetFrame/cueOnsetFrame leadFrames quietBeforeFrames leadPeakDbfs`, the native
  cache and energy file hashes, and the probe binding
  (`probe{path,sha256} probeOffsetFrame probeFrameCount cueProbeSegmentIds`)
- `probeEvidence`: the stored probe that begins at the start (`path sha256
probeId segmentIds text inputMonoFloat32Sha256 clipPcmSha256 …`)
- `dialogueProbeEvidence` (members), `existingCheckProbe` (existing rows)
- `identityEvidence notes heldDiagnostics reasons`

`existing_verified` rows reproduce the frozen `audioRange` exactly and are never
re-decided. Each of them also has an independent probe at the stored start, so
the method can be compared with the earlier verification.

A candidate is an offline finding. It is not permission to write the database,
and no row claims human review.

## Limits

- Recognition text is model output, not human reviewed. The number and the
  sentence are compared; the dialogue after them is not certified here.
- Browsers seek MP3 by their own decoder; the 400 ms quiet lead absorbs decoder
  delay differences, but a variable-bit-rate file without a seek table can land
  elsewhere in some browsers. That is a playback property of the stored asset,
  outside this ledger.
- Sources whose official script is empty in the frozen snapshot have no
  first-dialogue evidence for members, and image-only questions there have no
  official sentence at all; their rows say so in `notes`.
