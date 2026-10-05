# Results — whole-original seek starts, official sources (claude share)

Run `final-002`, 2026-10-05. Method and field meanings are in
[README.md](README.md). Everything below is read from the files named here; no
number is an estimate.

## Where it is

| what                 | path / value                                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| ledger               | `C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/claude/runs/final-002/marks.json` |
| ledger SHA-256       | `31c9caa808038c2286a44bbddaef0eb729a6d5b9fd6d5cfa164db977dd2c58de`                                                    |
| next-listening notes | `…/runs/final-002/ledger.json` (SHA-256 `7cd897e9823374b683b7b77f3d18f9667f3934364dcc9f973b5e91f0bbcabbbe`)           |
| tools                | commit `32e530fe50427124b97e3c770329aa7a2a38ad11`, 0 uncommitted tool files when the ledger was built                 |
| policy               | `whole-audio-seek-start-v3`                                                                                           |
| frozen inventory     | SHA-256 `beb63eeb348ea93a39fa87bcc594cb018104260b800c1b423bff378cb7f3c1ef`                                            |
| native clocks        | `…/claude/native/` — 121 `*.native.json` + `*.energy.f64`                                                             |
| probes               | `…/claude/probes/round-{001,002,004,005,006,007,008,009,010}/` — 412 files                                            |
| replay log           | `…/claude/logs/verify-final-002.log`                                                                                  |

This document was added in the commit after `32e530fe5`, which changes only
this file and one test; the hashed tool files (`build-marks.mjs`, `lib/*`) are
the same in both.

`final-001` (SHA-256 `3d89916e…d63b12`, tools `dd92e1b74`) is the same ledger
except for one label: the opening of ebsi-high-1-2018-1 Q17 is named
`exact_original_opening_v2` in `final-002`, as the independent replay expects
for a complete first utterance that the script prints twice.

## Counts

All 121 assigned sources and all 2,417 current questions have exactly one row.

| level        | sources | questions | candidate | existing_verified | held |
| ------------ | ------: | --------: | --------: | ----------------: | ---: |
| ebs-middle-1 |      18 |       360 |       350 |                 9 |    1 |
| ebs-middle-2 |      18 |       360 |       346 |                 8 |    6 |
| ebs-middle-3 |      18 |       360 |       359 |                 0 |    1 |
| ebsi-high-1  |      23 |       457 |       434 |                20 |    3 |
| ebsi-high-2  |      22 |       440 |       438 |                 1 |    1 |
| ebsi-high-3  |      22 |       440 |       438 |                 0 |    2 |
| **total**    |     121 |     2,417 |     2,365 |                38 |   14 |

| spoken form                 | questions | candidate | existing_verified | held |
| --------------------------- | --------: | --------: | ----------------: | ---: |
| `single`                    |     2,139 |     2,103 |                33 |    3 |
| `shared_instruction_head`   |        94 |        91 |                 3 |    0 |
| `shared_instruction_member` |        94 |        81 |                 2 |   11 |
| `shared_passage`            |        90 |        90 |                 0 |    0 |

Before this work 38 questions had a start. 2,365 more now have a candidate start
and 14 are held without one.

### How the 2,365 candidates are grounded

| `startGrade`              |  rows | meaning                                                                    |
| ------------------------- | ----: | -------------------------------------------------------------------------- |
| `instruction_grounded`    | 2,232 | number, then ≥ 0.8 of the official Korean sentence, in one probe           |
| `first_dialogue_grounded` |    80 | number, then an exact opening of the question's own official dialogue      |
| `ordinal_only`            |    53 | number in "N번" form and question order; no official text exists (says so) |

- 1,843 candidates are `instruction_grounded`, heard as "N번", with no caveat note.
- 443 candidates also carry an exact literal opening of their official English
  first utterance (420 of them heard from a later measured onset, 23 from the
  start frame itself).
- The number was written as "N번" for 2,168 and as bare digits ("2.") directly
  before the question's own sentence for 197.
- The start is 400 ms before the number's first sound for 2,320; for 45 the
  measured quiet is shorter (bridge music runs closer) and the start is the first
  quiet window, 120 ms at the least.
- A frozen whole-record ASR segment is bound as the cue for 1,452 and as the
  anchor sentence for 1,089. The others quote that ASR only as a diagnostic: it
  skipped or repeated the Korean number there.

Caveat notes on candidates (a row may have several):

| note                                                    | rows |
| ------------------------------------------------------- | ---: |
| `official_instruction_matched_on_hangul_only`           |  206 |
| `spoken_number_written_as_bare_digits`                  |  197 |
| `hangul_only_without_first_dialogue_support`            |   21 |
| `bare_digits_without_first_dialogue_support`            |   16 |
| `member_first_dialogue_unverifiable_no_official_script` |    4 |
| `official_instruction_not_fully_heard`                  |    3 |

## The 14 held rows

Every one of them has its number recognized somewhere; none has a start.
Nothing was interpolated between neighbours.

**A. The recognizer wrote the number but flagged it uncertain (8 rows).** The
clip that holds the number alone wrote "N번" each time, and one clause of the
frozen uncertainty rule (`noSpeech > 0.6 AND logprob < −0.6`; these have logprob
−0.61 … −0.78) marks the segment. For the five members the long probe at the
same start wrote the same, flagged the same way. An uncertain number is not
repaired.

| source              |   Q | form                                                                       |
| ------------------- | --: | -------------------------------------------------------------------------- |
| ebs-middle-1-2025-2 |  20 | member; its English opening is heard exactly                               |
| ebs-middle-2-2024-1 |  20 | member; its English opening is heard exactly                               |
| ebs-middle-2-2026-2 |  20 | member; its English opening is heard exactly                               |
| ebsi-high-1-2022-1  |  19 | member; its English opening is heard exactly                               |
| ebsi-high-1-2024-2  |  19 | member; its English opening is heard exactly                               |
| ebsi-high-2-2022-1  |   3 | no official text; long probe wrote "3." (bare), short clip "3번" uncertain |
| ebsi-high-3-2022-1  |   1 | no official text; long probe wrote "1." (bare), short clip "1번" uncertain |
| ebsi-high-3-2022-1  |   3 | no official text; long probe wrote "3." (bare), short clip "3번" uncertain |

**B. The number is certain at its start, but the official first utterance begins
with a name the recognizer spelled differently (6 rows).** A member's number is
followed directly by its dialogue, so it needs an exact opening of four words or
more; the name breaks it at word 1–2 although every later word matches.

| source              |   Q | official → heard |
| ------------------- | --: | ---------------- |
| ebs-middle-2-2018-2 |  20 | Junho → Juno     |
| ebs-middle-2-2020-2 |  20 | Sera → Sarah     |
| ebs-middle-2-2022-1 |  20 | Sumin → Soomin   |
| ebs-middle-2-2026-1 |  20 | Minsu → Minsoo   |
| ebs-middle-3-2021-1 |  19 | Sujin → Soojin   |
| ebsi-high-1-2024-1  |  19 | Puri → Prudy     |

A separately labelled tier ("literal opening after a differently spelled name")
would decide class B. It was offered to the coordinator and is **not**
implemented.

## Candidates the independent verifier may still hold

The codex replay asks for a literal English opening on 395 of the r3 candidates
(`codex/claude-r3-required-english-001.json`). In `final-002` 358 of them have
one. The other 37 were listened to and have none:

| why                                                                                                                                                                             | rows |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---: |
| the opening is not heard word for word from its first word: the first official word differs or is missing (17), or the first one to three words match and the next differs (10) |   27 |
| the source's official script is empty in the frozen snapshot                                                                                                                    |    9 |
| no English listening within 20 s of the start (ebsi-high-3-2024-2 Q14)                                                                                                          |    1 |

Typical of the 27: Jina/Gina, Sara/Sarah, Susie/Suzy, Bryan/Brian,
Greenhills/Green Hills, "Ms."/"Miss", "All right"/"Alright"; in a few the
English listening began after the first utterance. They remain candidates here
on their Korean number and sentence, with the notes above; whether that
suffices is the verifier's and the coordinator's call.

## Existing verified starts

All 38 are reproduced exactly from the frozen `audioRange` and were never
re-decided (ebsi-high-1-2022-2 ×20, ebs-middle-1-2026-2 ×9, ebs-middle-2-2026-2
×8, ebsi-high-2-2026-2 ×1). An independent probe at each stored start heard the
question's number first for 36. The other two are question 1 of
ebs-middle-2-2026-2 (64,436 ms) and of ebsi-high-1-2022-2 (51,184 ms): the stored
start is at the announcement "이제 시작하겠습니다." that precedes "1번". The
values are unchanged; the rows carry the note
`independent_probe_did_not_hear_ordinal_first`.

## What was measured and run

- **Native clock.** Each of the 121 originals was decoded once with the product
  decoder (`mpg123-decoder` 1.0.3, gapless). The PCM SHA-256, frame count and
  rate of all 121 equal the codex worker's independent `native-clock.json`.
  Of the 2,403 rows with a start, 2,206 are on a 48 kHz clock and 197 on
  44.1 kHz.
- **Probes.** 5,478 bounded recognitions (4,388 Korean, 1,090 English; 20.6 h of
  audio in windows of at most 14 s) in nine rounds under the shared GPU lock, one
  loaded model at a time. One probe ran past its real duration; it is flagged
  `overflow`, unclamped, and proves nothing. No whole-record transcription was
  run and no PCM of a whole record was kept.
- **Decoder runtime.** At 07:17:53 UTC the installed checkout's `node_modules`
  was emptied by something outside this worktree. Rounds 007 (remaining 8
  sources), 008, 009 and 010 decoded through
  `…/whole-audio-seek-20261005/decoder-runtime` instead: the same four pinned
  packages, their integrity strings equal to the project lock. The clip
  extractor refuses a decode whose PCM hash differs from the frozen native
  cache, and it refused none.
- **Replay.** `verify-marks.mjs` on `final-002`: 0 errors over 2,417 rows
  (identity, unchanged existing starts, re-measured native start, re-read probe
  files and quotes, recomputed proof, grade, script quotes, ASR references, order,
  shared scope, full-duration end). The same replay with every original decoded
  again (`--decode`, through the isolated decoder) was run on r6, whose status,
  start, grade and native evidence are identical to `final-002` in all 2,417
  rows: 121 originals decoded, every PCM hash equal to its native cache, 0
  errors (`…/claude/logs/verify-r6-decode.log`).
- **Plain re-count without the tool library.** Row identity against the
  inventory, 38 existing starts equal, every candidate start equal to its native
  frame on the 20 ms grid, order inside each original, 45 shared-passage pairs
  as the only equal starts: 0 problems. Consecutive starts are at least 30.52 s
  apart (median 58.10 s) and no original has four identical spacings — nothing
  was divided evenly.
- **Tests.** 88 tests, all passing. Among them, by the acceptance list: missing
  numbers ("a probe that heard no number proves nothing", "a question nobody
  heard stays held; its start is never filled in", "a missing, extra or
  reordered row is found"), off-clock probes ("an off-clock probe is rejected",
  "a start that is not the measured native frame is rejected", "a replay refuses
  a dialogue probe moved out of reach or onto no onset"), malformed raw segment
  bounds ("malformed raw segment bounds are rejected", "recognized time past the
  real clip is overflow and is never hidden"), ambiguous ordinal or anchor
  mapping ("the same number proven at two distant places is ambiguous", "starts
  out of question order are held, not reordered", "several frozen-ASR utterances
  placed elsewhere hold a start"), wrong question identity ("another question's
  number is refused", "the right number with another question's sentence is
  refused", "a row of another question is a wrong identity", "a probe file of
  another original is refused outright").
- **Mutation check.** 61 single-rule mutations of the tools on a copy (43 of the
  earlier rules, 18 of the rules added on the last day); the test suite failed
  for each of them, judged by exit code.

## Ledgers on the way

| run       | candidate | existing | held | probe rounds read            | policy |
| --------- | --------: | -------: | ---: | ---------------------------- | ------ |
| r1        |     2,131 |       38 |  248 | 001, 002, 004                | v2     |
| r2        |     2,177 |       38 |  202 | + 005                        | v2     |
| r3        |     2,346 |       38 |   33 | + 006                        | v2     |
| r5        |     2,360 |       38 |   19 | + 007                        | v3     |
| r6        |     2,365 |       38 |   14 | + 008, 009                   | v3     |
| final-001 |     2,365 |       38 |   14 | + 010 (English support only) | v3     |
| final-002 |     2,365 |       38 |   14 | the same; one method label   | v3     |

No candidate of r1, r2, r3 or r4 is held in `final-002`. One row was held in the
intermediate r5 only: ebs-middle-1-2019-1 Q20, because the new sound rule was at
first also applied to the place where its English probe begins to listen; from
r6 it is a candidate again at the same start (875,620 ms) and the rule applies
to number starts only. Between r1 and `final-002` 37 accepted starts moved, all
of them later, by 420 to 1,200 ms: to a later onset within the same three
seconds at which a probe also heard the number first (a click or another short
sound comes before the number there). One of those moves is after r3
(ebsi-high-2-2020-1 Q8, 414,420 → 414,740 ms).

From 33 held rows in r3 to 14, by cause (19 rows):

- Round 007, a wider listening where a question was still held: 7 rows (six of
  the 2026-09 mock, where a chime comes before the number, and
  ebsi-high-3-2018-1 Q1).
- "16번에서 17번" is read as the two-number announcement of a shared block
  (2017 recordings): 6 rows.
- A number start needs 240 ms of measured sound within the two seconds after
  its onset. Two question-1 rows had been held as ambiguous because a 40 ms
  click 4.6 s and 5.1 s earlier also "proved" them; they are candidates at the
  spoken number now: 2 rows. Every start accepted before the rule had 520 ms or
  more, so none of them changed because of it.
- A number heard a few seconds into a probe, or written as bare digits where no
  official sentence exists, is listened to again as a number-only clip
  (round 009, 22 probes): 3 rows (ebsi-high-1-2018-2 Q17 and the shared passage
  16–17 of the 2026-09 mock).
- English words: an initialism is one word however it is printed (H.J. = HJ):
  1 row. An opening the official script prints twice is quoted on until it is
  unique: 1 row's quote (ebsi-high-1-2018-1 Q17), no status change. Of the 443
  literal openings 429 quote one utterance, 13 a short first utterance with the
  start of the next (`exact_original_opening_v1`) and 1 is that repeated
  opening (`exact_original_opening_v2`).

## Not done

- No database or Storage write, no upload, no change to audio, questions,
  transcripts, ASR caches, prepared files, `src`, the schema or any lock file. No
  push.
- No human listened to these starts. A candidate is an offline finding.
- The 14 held rows above have no start.
- The codex replay of `final-002` and the coordinator's decision on class B and
  on the 37 candidates without a literal English opening are outside this run.
