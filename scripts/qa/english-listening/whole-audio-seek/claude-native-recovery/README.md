# Native recovery of held whole-original starts (claude)

After the wave of 2026-10-05, 972 of 3,699 questions still have no start in
their unchanged whole recording: 885 reconstructed, 87 official. This folder
listens again — in bounded clips cut from the original's own decoded frames —
and says, row by row, where a held question begins or why it stays held.

Nothing here cuts, re-encodes, uploads or rewrites audio, questions,
transcripts, recognition caches, the database or Storage, and no paid
transcription is requested. A start is a point to seek to; playback continues
to the end of the original. What this folder produces is an **offline
finding**: admission is the independent verifier's (`../codex/`, adapter
`native-localized-generation-v2`), which decodes every original again and
replays every offered row. Nobody listened to these starts; no row claims human
review. Results of the run are in [RESULTS.md](RESULTS.md); the evidence
contract is [PROTOCOL.md](PROTOCOL.md).

## Why the earlier routes left these rows

A reconstructed question belongs to an original numbered passage through the
quotes its generation kept. The earlier route found that passage in the frozen
whole-record recognition: its segment order, its numbers, its estimated spans.
Where that recognition lacks a number, flags it, or times it badly — and the
provider transcripts stamp most number tokens as 3,000 ms artefacts seconds
before the sound — the row was held. The audio itself was never the problem.

So this route measures the structure instead of estimating it:

| link    | what decides                                                                                                                   |
| ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| clock   | a full decode of the original bytes that reproduces the frozen clock record (rate, channels, frames, PCM SHA-256)              |
| heading | a measured native onset after measured quiet; the start is the existing fixed lead before it                                   |
| number  | a bounded Korean recognition that **begins at that start** writes the literal number first, reliably, then an instruction      |
| passage | the native frames from that start to the start of the very next original number, found the same way                            |
| mapping | **every** frozen generation quote of the question, word for word, in **one** English clip that lies wholly inside those frames |

Containment is physical. A clip cut from frames inside a passage cannot hold
words spoken outside it, whatever time a recognizer writes for them. Provider
and recognizer times are read in `plan.mjs` to decide where to listen, and in
two hold-only checks; they never admit a row. The displayed number of a
reconstructed question is not read at all.

## Rules

All in `lib/rules.mjs` (pure) and `lib/resolve.mjs` (one source).

- **Onset.** 20 ms windows of the larger channel's summed squares. Sound is at
  or above −50 dBFS; an onset follows at least 100 ms of quiet; the start is
  `min(400 ms, quiet)` before it; the next two seconds hold at least 240 ms of
  sound. Recordings from 2006–2008 hiss above −50 dBFS almost throughout, so
  there the verifier's two named noise-floor tiers are used as they are
  (`noise_floor_contrast_v1`, `…_1second_v1`: a stationary baseline, the onset
  10 dB above its median). No new threshold was introduced.
- **Number.** The probe's first segment is its first speech, reliable by the
  recognizer's own raw metrics (recomputed, never cleared), a literal `N번` (or
  a spelled ordinal with `번`), and sits at the measured onset. Bare digits,
  `5번째` (an ordinal word) and a number written late are not a heading.
  Every other recognition from the same start stays listed; a different number
  in any of them holds the start. The same number at two places more than 3 s
  apart holds the number.
- **Instruction.** A question heading is followed by the announcer's
  instruction. A lone `N번입니다.` is a member only inside the nearest earlier
  shared heading that names it.
- **Shared instruction.** The first member's passage starts at the shared
  heading (`19번과 20번은 …`, `18번부터 20번까지는 …`), with the heading's
  numbers as `cueSpokenNumbers` and the first number as scope. Later members
  start at their own number.
- **Next boundary.** The heading of the very next original number — nothing
  else. A skipped number leaves both neighbours open. After the last number:
  a literal closing announcement at a measured onset, no larger number written
  by any transcript or recognition, and every long-quiet onset up to the
  closing listened to. Added after the pilot and countable apart
  (`summary.offeredByNextBoundary`): where the next number's heading does not
  stand as a start, a passage may end at the measured start of a recognition
  whose first speech is the literal next number with its complete instruction
  (or a later member of a standing shared heading). That ends a passage; it is
  never a seek start.
- **Nothing else inside.** If any stored Korean recognition that begins inside
  a passage wrote another possible heading first — in any form, flagged or not
  — the passage is held. A missed heading must not let one passage swallow the
  next.
- **Certified starts.** A passage that already has a certified start keeps
  exactly that start and onset; a new peer needs a native heading at those very
  frames. A passage ends at the earlier of the certified and the native start
  of the next number.
- **Quotes.** The quotes are `verification.grounding[ordinal].evidenceQuotes`
  of the frozen prepared file, joined by `questionId` through the frozen
  generation alignment. Each must stand literally in the frozen segments the
  generation named, and once in the whole frozen recognition. A quote of four
  words or more is an anchor: anchors are heard in exactly one passage and in
  no clip elsewhere. Then one English clip inside that passage writes every
  quote — short ones too — and, whole, every named generation segment that no
  quote touches. A flagged segment is a barrier; nothing is respelled.
- **Estimates hold, never admit.** A literal occurrence of an anchor in the
  provider's English transcript more than 10 s outside the passage, or frozen
  anchor segments estimated more than 10 s outside it, holds the row.

## Commands

All from this directory; Node and the pinned MP3 decoder come from the main
checkout, recognition from the existing isolated environment. The frozen
baseline and its hashes are in `lib/store.mjs`; a changed input is refused.
Every output file is written once (`wx`).

```sh
OUT=C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261006/native-recovery/claude

node measure-native.mjs --scope reconstructed        # full decode against the frozen clock; keeps 20 ms loudness only
node measure-native.mjs --scope official             # official sources that still hold a question
node plan.mjs --stage headings --round 001 --scope pilot [--dry-run]
./run-rounds.sh pilot 2 headings context variants gaps variants terminal quotes+controls truncation
./run-rounds.sh official 31 headings context variants quotes
node build-ledger.mjs --run pilot-002 --scope pilot [--dry-run]      # scopes: pilot | reconstructed | official | held

node --test "tests/*.test.mjs"                        # synthetic fixtures; no corpus, GPU or network
```

`run-rounds.sh` plans each stage from what the earlier rounds actually heard
and recognizes it with `../claude/run_probes.py` (Whisper medium int8, the
frozen snapshot, one model resident only under the shared exclusive GPU lock,
temporary clips deleted after each source). A start frame already listened to
is not asked again; earlier bounded recognitions by the same runner are read by
hash from `claude-held-validation-20261005` and `whole-audio-seek-20261005/claude`.
Do not edit `run-rounds.sh` while it runs: the shell reads it as it goes.

A round number is three digits, 001..999, and is used once. The number given to
a driver is where it starts looking: a number that already has a request, raw
containers (with or without their request) or a temporary folder is passed over
(`lib/rounds.sh`), so an earlier request, finished or interrupted, is never
planned over. A stage that plans nothing uses no number. Each stage appends one
line to `logs/stages.jsonl` (driver, scope, stage, round or null, planned
probes, recognizer exit or null); a recognizer that fails stops the driver with
its status after that line is written.

```sh
node receipt.mjs --name <name> [--sweep]   # $OUT/receipts/<name>.json, written once; exit 3 when coverage is not complete
```

The receipt compares every request with its round's raw containers: one
container per requested source, bound to the request's bytes and the original's
bytes, holding exactly the requested probes (`lib/coverage.mjs`). Coverage is
complete when every request is finished or named in `stopped-requests.json`
with its reason, no stage on record failed without such a declaration, and no
raw folder lies without its request. A stopped request is not thereby finished:
the receipt says how many of its probes were heard in another round and how
many nowhere. `build-ledger.mjs --scope held` writes no run unless coverage is
complete, and every run carries `listening-receipt.json`. `--sweep` adds what
each stage would still plan, in dry-run, from everything heard.

| stage        | what it listens to                                                                                                                                                                     |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `headings`   | Korean, 8 s, from every measured onset in the seconds before the provider's instruction for a number                                                                                   |
| `context`    | Korean, 14 s, from a start where the number was written but eight seconds ended before the instruction verb                                                                            |
| `variants`   | Korean, 6 s and 4.5 s, from a start where the number was written first but stamped late by the recognizer                                                                              |
| `terminal`   | Korean, from every long-quiet onset after the last heading                                                                                                                             |
| `gaps`       | Korean, from long-quiet onsets between two established headings whose numbers are not consecutive                                                                                      |
| `quotes`     | English, up to 60 s: the dialogue of an established passage, from the end of its heading to the next start                                                                             |
| `truncation` | adversarial clips at established headings, in their own folder: cut 400 ms after the measured onset; begun 300 ms after it (machine-placed cuts, not proved truncations of the number) |

For an official source only a held question's own number, and the next number
where that has no certified start, are sought.

## Official questions

An official question keeps its own number, so the passage is its own measured
heading to the next number's start (a certified start bounds it, named with the
certificate that admitted it). Two things an official source allows: a short
clip that wrote the literal number and a long reading from the same start that
wrote bare digits before the instruction are one heading; and after the last
printed question number the passage may end with the recording.

Identity in this producer's route (`native_numbered_passage_script_sentence_v1`,
`lib/official.mjs`) is a sentence of four words or more of the question's own
script section that the whole script prints once, written by an English clip
wholly inside the passage — with no other section's such sentence inside it.
The independent verifier's official route needs more: the exact opening of the
first utterance, from a clip that begins at a measured onset. A row that has
that too is shaped for the verifier's wrapper (`official-candidates.json`); a
row bound only by a later own sentence is reported apart
(`official-later-sentence-findings.json`) and is **not** offered for admission.

## A run (`<OUT>/runs/<run>/`)

- `ledger.json` — one row per held question of the scope: `candidate` or
  `held` with its reason and whatever was tested.
- `candidates.json` — the offered rows, in the verifier's shape
  (`evidenceAdapter`, `nativeEvidence`, `probeEvidence`, `nextProbeEvidence`,
  `sharedHeadProbeEvidence`, `terminalProbeEvidence`, `dialogueProbeEvidence`,
  `localizedMappingEvidence`) plus this producer's own facts under
  `nativeRecovery`.
- `tables.json` — per source: every native heading, closing, number written
  anywhere, passage and hold.
- `controls.json` — the blind replay of questions that already have a
  certified start (the same code, the certificate unread while deciding), the
  heading-level comparison, and the adversarial inputs.
- `official-candidates.json`, `official-later-sentence-findings.json` — see
  above.
- `catalogs/<sourceRecordId>.json` — one immutable catalog per source: every
  bounded recognition of that source that exists in the roots, used or not, by
  literal round folder and file name, and the raw recognitions behind a
  certified start that bounds one of its passages. A row's `probeCatalog` names
  its own source's catalog. `adversarial-catalogs/` lists the deliberately
  damaged clips, which are never a row's evidence. `catalogs.json` indexes both.
- `summary.json` — counts, the 35-question pilot cohort one line each, input
  and tool hashes.

## Limits

- Recognition text is model output. The quotes were kept by the generation
  from a Whisper medium whole-record recognition; hearing them again with the
  same model in a bounded clip proves **where** those words are, not that a
  human would write them the same way.
- Where no quiet and no stationary noise floor precedes a spoken number (bridge
  music running into it), no start is stated for that number, and its
  neighbours' passages stay open.
- The control replay compares with certified starts that were themselves
  machine-certified. Agreement shows the routes do not disagree; it is not a
  listening test.
- `ebs-middle-1-2006-2`, the converted original (M4A), is not decoded here: it
  is listened to on the verifier's authenticated playback clock, with clips cut
  by the verifier's own tool (`run-converted.sh`).
- The damaged-clip controls are cut from a machine-measured onset; they are not
  proved truncations of a spoken number.
