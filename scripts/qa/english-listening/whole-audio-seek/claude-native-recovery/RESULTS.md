# Results — native recovery of held whole-original starts

Run of 2026-10-06. Method and field meanings are in [README.md](README.md) and
[PROTOCOL.md](PROTOCOL.md). Every count below is read from the files named
here.

- writesDatabase **false** · writesStorage **false** · writesMedia **false** ·
  humanReview **false** · paid transcription requests **0**
- "Offered" means an offline finding handed to the independent verifier. It is
  not an admission. Nobody listened to these starts.
- Baseline: inventory `58a53b05…`, clock `bb8b37dd…` (exact-live rebase of
  2026-10-06, all 2,727 starts in the live documents), certificate `776d313a…`.
  No existing start was re-decided; a passage that has one keeps exactly it.

Artifacts are under
`C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261006/native-recovery/claude/`
(`<OUT>`); each run directory is written once.

## What was held, and what this run says

972 questions had no start: 885 reconstructed (72 sources) and 87 official
(47 sources).

| population                         | rows | offered                          | reported, not offered | held |
| ---------------------------------- | ---: | -------------------------------- | --------------------: | ---: |
| reconstructed, 15 pilot sources    |  216 | 64 (50 original passages)        |                     — |  152 |
| official, all 47 sources           |   87 | 17 (verifier's official wrapper; third freeze) | 27 |   43 |
| reconstructed, other 57 sources    |  669 | see "Full run" below             |                     — |      |

### Pilot — `runs/pilot-002/` (supersedes `pilot-001`; same evidence, per-source catalogs)

| file              | SHA-256                                                            |
| ----------------- | ------------------------------------------------------------------ |
| `candidates.json` | `14a01c6143428034d3a27388f64673df220a856f9409e6b427951ce337270a73` |
| `ledger.json`     | `d2a32191d3bddbc54f56bbe665e814e5a8186c4ee6d52681eb8ae9119e504ce6` |
| `catalogs.json`   | `5c384383bc0f505bfd97f203c3ca8859969dc95f8d33cda2a7a682978bd14196` |
| `controls.json`   | `d79c975fa31c45188dbcd2a189688025abd5e2f5d13d95d0dbc340114ca700eb` |
| `summary.json`    | `5ddd7f101de9a536d1e368e4ef46a71261ea6d17e2419fd37686967d69d95204` |

64 offered rows: 58 single, 4 first members of a shared instruction (start at
the shared heading), 2 later members (start at their own number). Onset tier:
absolute 17, noise floor 47 — the 2006–2008 recordings hiss above −50 dBFS in
93–100 % of their windows, so a heading there is measurable only against its
own noise floor (the verifier's existing named tiers, unchanged). Next
boundary: the next number's own native heading in 63, a literal closing in 1.

The research plan's 35 pilot questions (15 sources, 29 scopes): **12 offered,
23 held**. All 12 carry the same original scope the provider-transcript
diagnostic had guessed, though here the scope came only from native headings
and the clip that wrote the quotes. Three of the seven first members of a
shared instruction are offered, each at the shared heading. The other four are
held and none was moved to the member's own number: in three the member or
closing that ends the passage was not established, and in one
(`ebs-middle-1-2009-2`) the shared heading itself follows bridge music with
under 100 ms of quiet and no stationary noise floor, so no start can be stated
for it.

Held, by first reason (152):

| rows | reason                                                                                         |
| ---: | ---------------------------------------------------------------------------------------------- |
|  137 | no anchor quote heard in an established passage; each row says where the frozen recognition places it and what stands there (below) |
|    6 | no quote of four words                                                                         |
|    5 | a quote stands more than once in the frozen recognition                                        |
|    4 | not every frozen quote written by one clip inside the passage                                  |

The 137, by what stands where the frozen recognition places the question (a
diagnosis from estimates; it decided nothing):

| rows | at that place                                                          |
| ---: | ---------------------------------------------------------------------- |
|   94 | a heading stands, the very next number's heading does not              |
|   17 | the last standing heading, with no closing or with later numbers unheard |
|    7 | another possible heading was written inside the passage                |
|    7 | no native heading before it                                            |
|    6 | the passage stands and was listened to; the quote was not written      |
|    4 | the passage's own start is missing                                     |
|    2 | a native start on the wrong side of a certified one                    |

So the pilot is limited by missing headings, not by quotes: where both ends of
a passage stand, the quote was written in all but 6 cases.

### Official — `runs/official-001/`

| file                                    | SHA-256                                                            |
| --------------------------------------- | ------------------------------------------------------------------ |
| `official-candidates.json`              | `412d16079e12be2b62627f194dda2df328475dcd19ae69b10e232752d195559a` |
| `official-later-sentence-findings.json` | `8587bcd9bc6886798143fdfd0be1700380ac1d1ac90dcbb6210b918d2a5aa718` |
| `ledger.json`                           | `6eb54811bae25fa4ad37463cf4317d3b585799bc618197e47b3802292989d75d` |
| `catalogs.json`                         | `cad9fceae0a7480100ccffb4b95998282e33bc8a5fce006607b916f1c1f4b1b3` |
| `summary.json`                          | `c453bbaadc228161fc7993e65e1a6791fa5f047d848970de10fd0b3e79dcb157` |

- **19 offered** in the verifier's existing official key roles: the literal
  number at a measured onset (12 through a short literal clip beside a long
  reading that wrote bare digits before the instruction), the question's own
  instruction, and the exact opening of its first utterance from a clip that
  begins at a measured onset inside the passage. None uses a later sentence.
  They were held before because their next question was itself held, or
  because the recognizer stamped the number late and a shorter clip from the
  same start now places it at the onset.
- **19 reported, not offered**: the question's own later script sentence was
  heard inside its passage, but not the exact first opening (a name spelled
  another way, a first turn under four words with no measured-onset clip). The
  verifier has no route for that, and it was not asked to make one.
- **49 held**: 12 another possible heading written inside the passage, 11
  instruction not heard after the literal number, 7 no official script, 6 own
  number not heard at a measured onset, 3 next heading missing, 3 number at two
  distant places, 3 last-question boundary, 2 number stamped late, 1 script
  numbering not unique, 1 own sentence not heard.

### What the independent verifier did with these (its certificate, not this producer's claim)

Codex replayed the 64 pilot rows of `pilot-002` and the 19 official rows from
the original bytes (`codex/pilot-official-certificate-001`, SHA-256
`0e6ff4dc64de25541efc7a810c4d62dd92fa784a4839ec562c42f5756372af55`), with all
2,727 existing starts preserved:

| offered                 | passed | held by the verifier                                                                                                   |
| ----------------------- | -----: | ---------------------------------------------------------------------------------------------------------------------- |
| 64 reconstructed, pilot |     50 | 14: instruction incomplete 4, number at two distant onsets 3, a number read inside the passage 3, raw-word artefact in the English clip 3, a word outside its segment 1 |
| 19 official             |      0 | 19: number clip longer than its 3 s cap 7, instruction not the current question's 4, own instruction absent in the probe 3, next-boundary instruction incomplete 3, neighbour boundary metadata 2 |

The official result stands as it is. The seven number clips are this
producer's 4.5 s and 6 s same-start readings; the earlier wave's shorter
number-only clips at those starts had been flagged, and no duration was edited.
The other twelve are differences between this export and the existing gate's
instruction and neighbour roles that were not resolved here. The verifier's
raw-word checks were added to this producer afterwards, so a quoted segment
whose words do not spell it is now a barrier here too.

### Official, second freeze — `runs/official-002/`

After that result the seven starts whose literal number existed only in a
4-second clip were heard again: 48 new clips of 2, 2.5 and 3 s from the
identical measured start and onset of 16 starts (round 035, 0 overflow). A
bare-digit instruction reading now needs the shortest reliable literal reading
of **at most 3 s** as its number clip, or the row is not offered; the next
heading is exported by the reading that carries its complete instruction.

| file                                    | SHA-256                                                            |
| --------------------------------------- | ------------------------------------------------------------------ |
| `official-candidates.json`              | `e98c6aae3ad9374d68b7691a56307aadd1dd43d03926640ceb91c5adcf469f60` |
| `official-later-sentence-findings.json` | `f35c7c6bc12015ce70aa35e567d484969e4b7fca35abaa70b0ee802bff28e602` |
| `ledger.json`                           | `2119c72a7b724b81d74ec1a742af651b6b9d7be26f9ef490a92b2669b01d1929` |
| `summary.json`                          | `3ff04fdedce1fc79353378d3fc3e634ad3f39abff992501e5cdc242ecf7546ae` |

87 rows: **22 offered** to the verifier's official wrapper, 22 later-sentence
findings not offered, 43 held. Six of the seven now have a number clip of
1.1–2.5 s; in four of them the short clip wrote the literal number and the first
words of the instruction, because the announcer runs on — whether that
satisfies "the number alone" is the verifier's call. The seventh is no longer
offered: with the raw-word check its English segment is a barrier. This freeze
has not been replayed by the verifier at the time of writing.

### Official, third freeze — `runs/official-003/` (the current one)

The coordinator held to the existing gate: a number clip says the number and
nothing after it. So the producer now takes as number clip only the shortest
reading of at most 3 s that is one segment, the literal number, and at most
"입니다" and punctuation; and 39 more clips of 1.4, 1.6 and 1.8 s were recorded
from the same measured starts (round 036, 0 overflow).

| file                                    | SHA-256                                                            |
| --------------------------------------- | ------------------------------------------------------------------ |
| `official-candidates.json`              | `c70c9e35f9bed9743e401c8f1337adac1f017d73f2759382e090e0926eb7aba8` |
| `official-later-sentence-findings.json` | `6dbd2b67a43540d0f9c07020438e72dc09c08aa28cdeb1fd3b3ccee9365d57f1` |
| `ledger.json`                           | `7a04b68048de810c70f3273e800f9a81738e0125531c2b4db74542da068c5eaa` |
| `summary.json`                          | `9ebd1073eeca1e3127dc304a1d808199b555dd7d72bb87a6d86148a1e16922fa` |

87 rows: **17 offered**, 27 not offered, 43 held. Every number clip among the
offered rows reads exactly `1번`, `2번` or `8번`. Offers fell from 22 to 17
because the rule removed six rows whose only short literal reading also carried
instruction words; no evidence was lost, and those rows say so. Of the seven
rows first refused for an over-long number clip, four now have a number-only
clip of 1.1–2.46 s, two have none at any length tried and are not offered, and
one is held. Not yet replayed by the verifier at the time of writing.

### A passage may end where the next number is first heard — `runs/pilot-003/`

Added **after** the pilot outcome was seen, and reported as such. In
`pilot-002`, 94 of the 152 held rows sat where a heading stands but the very
next number's heading does not; in 41 of those 48 passages a stored Korean
probe had written the next number first and reliably and failed only as a
*start* (a chime runs into the number, so the recognizer stamps it about a
second after the measured onset). The rule lets such a reading **end** the
passage before it; it never becomes a seek start.

`pilot-003` (candidates `73e24dbd…`, ledger `335e1053…`, controls
`89e86a2d…`, summary `380f8772…`) is frozen with the first form of the rule:
85 offered — the same 63 + 1 as before and **21** that end at such a boundary.
Blind controls through that boundary: 3 identical, 0 later, 0 earlier, 0 other
scope. The coordinator then constrained it: the reading must also carry the
complete instruction, or the number must be a later member of a shared heading
that stands (a number alone can be an answer option read aloud). The code and
the full run follow the constrained form; such rows are tagged
`native-localized-generation-boundary-v3`, the verifier's separately named
tier, and can be dropped by that tag. `pilot-003` itself was not altered.

After it, what holds the pilot rows is no longer the passage's end but its own
start: 51 rows whose number is written first and reliably 0.9–2 s after the
measured onset. That is a start-policy question and was not touched.

## Controls and adversarial inputs (pilot sources; `runs/pilot-002/controls.json`)

The same code, with the certificate unread while deciding, replayed the 50
reconstructed questions of the pilot sources that already have a certified
start:

| outcome         | rows | note                                                                                                   |
| --------------- | ---: | ------------------------------------------------------------------------------------------------------ |
| identical start |   23 | to the millisecond                                                                                     |
| later           |    3 | 140–760 ms: the certified start is an absolute-threshold crossing of hiss, the replay the noise-tier speech onset of the same announcement |
| earlier         |    0 |                                                                                                        |
| other scope     |    0 | no control question was bound to another original passage                                              |
| held            |   24 | passage or quote not established by this route                                                         |

Heading level: 26 original numbers have both a certified start and a blind
native heading — 24 identical, 2 later.

| adversarial input on real evidence                                         | tried | accepted |
| -------------------------------------------------------------------------- | ----: | -------: |
| a heading asked for the number before and after it                         |   378 |        0 |
| an offered row's quotes, its own passage taken away                        |    64 |        0 |
| first member of a shared heading moved to its own number                   |    14 |        0 |
| another source's recognition container                                     |    14 |        0 |
| real clip cut 400 ms after the measured onset (38 still wrote the number)  |   190 |        0 |
| real clip begun 300 ms after the measured onset (23 still wrote the number first) | 190 |   0 |

What the last two rows are, and are not. Both cuts are placed from the
**machine-measured energy onset** of the heading. Nobody listened to these 380
clips and nothing establishes where the spoken number begins in them, so they
are not gold truncations of a number and must not be counted as such. Where the
measured onset is a sound before the number (a chime, a breath), a clip "begun
300 ms after the onset" still holds the whole number: the independent CTC study
found exactly that for one of them (`c30` in
`../native-korean-alignment/RESULTS.md` — the clip starts 160 ms _before_ the
models' first-syllable estimate). The request purpose
`adversarial_begun_300ms_into_number` and the key `begun300msIntoNumber` in the
runs frozen before this note name the clips by what was intended; later runs
call the key `begun300msAfterMeasuredOnset`. The coordinator's independent
replay of the same 380 clips reports 312 matched as held and 68 unmatched; that
replay is the coordinator's, not reproduced here.

What the rows do show is narrower: from a clip whose start is not the measured
lead before a measured onset, or which carries no instruction, this producer
accepted nothing (0 of 380), although the recognizer wrote the number in 61 of
them. That is a statement about this producer's rule, not about truncation.

The control figures are reported by the coordinator's family-separated
partition in `summary.json`; three pilot sources whose readings were read by
eye while the rules were written (`ebs-middle-1-2007-2`, `ebs-middle-1-2009-2`,
`ebs-middle-2-2007-2`) are counted apart. The certified starts are themselves
machine-certified: agreement is a regression check, not a listening test.

## Recognition actually run

Whisper medium int8 (the frozen snapshot), one model resident only under the
shared exclusive GPU lock, temporary clips deleted after each source, 0
overflow in every round.

| rounds                    | what                                                            | bounded recognitions |
| ------------------------- | --------------------------------------------------------------- | -------------------: |
| 001–005, 010 (pilot)      | Korean: headings, shorter and longer same-start clips, gap and terminal scans |          1,041 |
| 006 (pilot)               | English passage clips (3,779 s)                                 |                   87 |
| adversarial 001           | clips cut short or begun late relative to the measured onset, own folder, never evidence | 380 |
| 030–036 (official)        | Korean 198 + 5 + 304 + 48 + 39 number clips (+ 10 of a round stopped as planned too broadly), English 3 |    607 |
| 040–044 (converted)       | `ebs-middle-1-2006-2` on its authenticated playback clock, own runner: Korean 100, English 13 | 113 |
| 011 (pilot)               | English clips for passages ended by a first-speech boundary     |                   25 |
| 020 onward                | the other 56 reconstructed sources — see "Full run"             |                      |

All 71 reconstructed MP3 originals and the 47 official sources with a held
question were decoded once and reproduced the frozen clock (PCM SHA-256); only
20 ms loudness was kept. The one converted original (`ebs-middle-1-2006-2`,
M4A) was not decoded: its clock is the decode of the authenticated playback
MP3, bound to the original by the verifier's nine-landmark proof, and every
clip was cut by the verifier's own `codex/native-windows.mts` (read only),
which re-checks the original's hash, the proof and the full PCM. Its loudness
hash equals the value the earlier converted runner had recorded.

## Full run

To be completed when `runs/full-001/` is written (heading round 020 for the
other 56 reconstructed sources, then context, shorter-clip, gap, terminal and
English rounds, then one ledger over the whole held population).

## What stays held, and what it would take

- **A lower-level sound runs into the number** (many 2008–2010 headings): the
  measured onset is a chime or breath about a second before the number, with no
  100 ms of quiet and no stationary noise floor between. The recognizer writes
  the number, but not at the onset. A start before that sound would be a
  natural place to seek to; stating one needs a named onset tier that the
  verifier agrees to, which this work did not introduce.
- **A shared heading straight after bridge music**: the same, for the heading
  of the first member.
- **Quotes that repeat or are too short**: held by the frozen side alone; no
  audio decides them.
- **Official rows with only a later own sentence** (19): a route the verifier
  would have to evaluate.

## Attempts that failed, were stopped or were resumed

Nothing below was removed or rewritten: every request and every raw container
these attempts left is still where it was written.

1. **A driver edited while it ran** (pilot). `run-rounds.sh` was changed while
   the shell was still reading it; the driver ended with status 127 after its
   last stage had already completed. No round was lost. The drivers are no
   longer edited while one runs.
2. **Official heading round 030, planned too broadly.** It asked for 2,279
   probes over every number of the 47 official sources instead of the held
   numbers. Stopped on purpose after 1 source (33 probes). The planner was
   narrowed and the stage planned again as round 031 (198 probes, complete).
   Round 030 stays unfinished and is named in `stopped-requests.json`.
3. **Heading round 020 failed at 19 of 56 sources.** The extractor could not
   write the first clip of `ebs-middle-2-2006-1`. The cause was this producer's
   own drivers, which swept every empty folder under `tmp` after each round;
   another round's extractor makes its source folder seconds before it writes
   into it, and a concurrent sweep removed it. (A first guess of memory
   contention was wrong and was withdrawn.) Fix, commit `413115b24`: a round's
   cleanup removes only its own folder and only when empty; the extractor keeps
   a marker file in its folder until the clips and their manifest are written.
   On a real, already recognized probe the patched extractor produced the
   identical clip hash. Round 020 was then **resumed on the same request**: the
   finished containers were not touched, nothing was recognized twice, and it
   ended at 56 of 56 sources, 3,676 of 3,676 probes.
4. **A follow-up driver outlived its stop.** After round 020 failed, the chain
   went on to rounds 021 (longer context, 14 sources, 29 probes, complete) and
   022 (shorter clips) from the 19 sources heard so far. Stopping its parent
   shell left the driver running as an orphan beside the resumed round 020; it
   was found and ended by hand after 16 of 38 sources of round 022 (122 of 224
   probes). Round 022 stays unfinished and is named in
   `stopped-requests.json`; its containers are read like any other.
5. **A commit failed for lack of disk space** (0.63 GB free). Nothing was
   written; the commit was repeated after space was freed.
6. **Round numbers.** The follow-up stages after the resumed round 020 would
   have been planned as 021 again and stopped on the existing request, and the
   chain would have gone on to build a ledger without them. Found before it
   happened (coordinator and producer independently); fixed in commits
   `b0b525b30` and `066601acb`: a stage takes the next number that has no
   request, no raw containers and no temporary folder, and everything round 022
   had not finished was planned afresh from all 56 sources under new numbers.
7. **Since then** every stage leaves a record (`logs/stages.jsonl`) and
   `build-ledger.mjs --scope held` writes no run unless every request is
   finished or named as stopped (`lib/coverage.mjs`, commit `89f442162`). The
   full run's receipt is in "Full run" below.

## Not done

- No database or Storage write, no upload, no clip kept, no transcoding, no
  change to audio, questions, transcripts, recognition caches or any existing
  script. No push, no merge. No file outside
  `scripts/qa/english-listening/whole-audio-seek/claude-native-recovery/` was
  changed in the repository.
- The commit hooks of this worktree do not run; the folder holds `.mjs`, `.md`
  and one `.sh`.
