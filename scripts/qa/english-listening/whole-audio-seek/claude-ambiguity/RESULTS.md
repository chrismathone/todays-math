# Results — which held whole-original starts can be told apart

Run of 2026-10-05. Method and field meanings are in [README.md](README.md).
Every count below is read from the files named here; the generated tables are
in `report/report-001/REPORT.md`.

- writesDatabase **false** · writesStorage **false** · writesMedia **false** ·
  humanReview **false**
- The 2,203 existing starts were read as a fixed baseline. None was re-decided;
  a question that has one is refused by the replay.
- "Offered" means an offline finding handed to the independent verifier. It is
  not an admission.

## The screenshot: `ebsi-high-2-2018-2` questions 2 and 3

Both can be told apart.

|                                                     | Q2 `0dcb9024-…`                                               | Q3 `f172e320-…`                                               |
| --------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------- |
| seek start → end                                    | 87,800 ms → 1,540,224 ms                                      | 123,380 ms → 1,540,224 ms                                     |
| start frame / number onset frame (48 kHz)           | 4,214,400 / 4,233,600                                         | 5,922,240 / 5,941,440                                         |
| long Korean probe from that frame                   | "2. 대화를 듣고 남자의 마지막 말에 대한 여자의 응답으로 …"    | "3. 대화를 듣고 여자의 마지막 말에 대한 남자의 응답으로 …"    |
| number-only clip from the same frame (new)          | "2번"                                                         | "3번"                                                         |
| that sentence in the official script                | printed 2× (Q2, Q16)                                          | printed 3× (Q1, Q3, Q17)                                      |
| own first utterance, heard word for word in English | "Mom, you'd better park your car in the" from frame 4,657,920 | "Hello, Mr. Watson. What do you want to" from frame 6,385,920 |
| that opening in the official script                 | once                                                          | once                                                          |
| known starts on both sides                          | 48,780 ms (Q1) · 123,380 ms (Q3)                              | 87,800 ms (Q2) · 161,480 ms (Q4)                              |

They had been held because the long probe wrote the numbers as bare digits,
which needs a script-unique sentence, and these sentences repeat. The number
itself, at a measured onset, plus the question's own section and its own
dialogue is unique. The independent verifier decoded the original again and its
own check of both rows passed at these two starts
(`.qa-artifacts/claude-held-validation-20261005/screenshot-calibration-001.json`).

## Where it is

Under
`C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/claude-held-validation-20261005/`:

| what                                     | file                                                 | SHA-256                                                            |
| ---------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| official candidate supplement (310 rows) | `official/supplement-002/candidates.json`            | `67a808163110165068f229caa38ccc8009670c753ddfe1d463581f69005613cb` |
| official disposition (397 rows)          | `official/supplement-002/disposition.json`           | `2a7b6766b14136da9f02713d08af5b62ca4ca598bd13760737db2de32f2d6f8e` |
| reconstructed conditional rows (214)     | `reconstructed/census-001/candidates.json`           | `0208c46d7ef82e1bedc10acecc80d62412b921ec0da68e687c5db7b84d99096e` |
| reconstructed census (1,099 rows)        | `reconstructed/census-001/census.json`               | `523485b1dc0421a0e5e78b601616e301e6581dd04dfea033f61872e8307b3921` |
| all 1,496 held questions, one row each   | `report/report-001/disposition.json`                 | `3cce0372ea92385ad897e7b1c749694fe1c87ac6165a883318bcd67f3272b8ea` |
| generated tables                         | `report/report-001/REPORT.md`                        | `eb0832ccaae446d4713d4b3a34d462105e923c1d275a82e0d2412e58f5ac0c1c` |
| recognition requests / results / logs    | `probe-requests/`, `probes/round-00{1..5}/`, `logs/` | each result names its request's SHA-256                            |

`official/supplement-001` (244 rows) is the first delivery; its rows are in
`supplement-002` with identical evidence.

## Counts

All 1,496 held questions have exactly one row (397 official, 1,099
reconstructed; 1,496 unique question IDs).

### Official — 397

| rows | outcome                                                          |
| ---: | ---------------------------------------------------------------- |
|  310 | offered                                                          |
|   58 | evidence present, below the agreed route (reported, not offered) |
|   29 | held                                                             |

Offered rows by route: 243 explicit numbered section + own dialogue, 36
ordinal-only inside a now complete chronology, 29 shared-instruction members, 2
shared-passage rows. By number: 225 written as `N번` by the row's own probe, 85
bare digits plus a number-only clip from the same start that wrote exactly
`N번`. 87 sources. 121 rows lean on another offered start as their next
boundary; each row lists which.

By prior hold reason:

| prior reason                                             | rows | offered | not offered |
| -------------------------------------------------------- | ---: | ------: | ----------: |
| `official_unique_instruction_absent_in_probe`            |  181 |     169 |          12 |
| `official_instruction_not_unique`                        |   91 |      72 |          19 |
| `ordinal_only_complete_source_chronology_missing`        |   35 |      33 |           2 |
| `official_first_dialogue_quote_missing`                  |   33 |       0 |          33 |
| `dialogue_offset_next_original_passage_boundary_missing` |   32 |      28 |           4 |
| `provider_held:number_heard_but_not_proven`              |   14 |       6 |           8 |
| `ambiguous_cue_missing_official_alignment`               |    5 |       0 |           5 |
| `missing_segment_ids`                                    |    3 |       0 |           3 |
| `official_section_not_current_original_number`           |    2 |       2 |           0 |
| `official_transcript_numbering_not_unique`               |    1 |       0 |           1 |

The 181 "instruction absent" rows are all sentences that print an English name
(for example "Skyview Hot-Air Balloon Program") which the Korean recognizer
wrote in Hangul. Their Hangul is heard; nothing is transliterated or repaired;
the exact English opening of the own dialogue carries the identity.

260 of the 397 rows were replayed from recognitions that already existed; 137
have a new recognition at their start. Of the 310 offered rows, 222 rest on
cached recognitions alone.

### Reconstructed — 1,099

| rows | outcome                                                                      |
| ---: | ---------------------------------------------------------------------------- |
|  214 | offered, conditional (174 original passages, 52 sources)                     |
|  167 | mapped by the frozen audit, held here after listening                        |
|  718 | held by the frozen mapping audit itself — counted only, **no new listening** |

The 167:

| rows | why                                                                                                                                                               |
| ---: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   56 | the number was written first only shortly **before** the estimated span of its own cue in the frozen whole-record recognition (39 passages, 0.01 to 1.26 s ahead) |
|   46 | the number was not written at any measured onset of the span                                                                                                      |
|   45 | the span holds no onset after measured quiet (hiss or music) — nowhere to listen under this policy                                                                |
|   11 | `ebs-middle-1-2006-2`, the converted original with its own playback clock: not listened                                                                           |
|    5 | written late, as bare digits, or in a flagged segment                                                                                                             |
|    4 | written first only from a start that is not a measured quiet onset                                                                                                |

The 718, by the audit's own reason: 449 neighbour scope gap, 107 cue number
unresolved, 83 instruction context missing, 45 next heading unresolved, 21 raw
cue uncertain, 12 shared-instruction member cue, 1 anchors outside one passage.

A conditional row says one thing: at exactly one measured onset inside that
span the passage's own number was written first, as `N번`, reliably. Which
passage a question belongs to is the frozen audit's and was not re-decided.
213 of the 214 rest on new recognitions, 1 on an existing one.

## What was run

**Recognition** (Korean, the frozen Whisper medium/int8 snapshot, one model
resident only under the shared GPU lock, temporary clips deleted after each
source; 0 overflow in every round):

| round | what                                                                 | sources | recognitions | audio s |
| ----- | -------------------------------------------------------------------- | ------: | -----------: | ------: |
| 001   | number-only clips, screenshot questions                              |       1 |            2 |       3 |
| 002   | number-only + four-second clips at 130 bare or flagged starts        |      65 |          260 |     696 |
| 003   | measured onsets of 297 mapped reconstructed passages, 8 s each       |      59 |          892 |   7,136 |
| 004   | clips at the other places where the producer had heard a held number |       7 |           16 |      43 |
| 005   | two more number-only clip bounds where the first clip was flagged    |      33 |           86 |     127 |

1,256 bounded recognitions. No whole-record transcription was run, no PCM of a
whole record was kept, no original was modified.

**Replay.** Every offered row was replayed by `lib/identity.mjs` /
`lib/reconstructed.mjs` from the stored files: hash of every container and of
the request it names, the source and full-PCM identity against the frozen clock
proof, the onset re-measured from the native loudness cache, the script section
re-parsed from the frozen original prepared file, order against the baseline.

**Tests.** `node --test "tests/*.test.mjs"`: 49 tests, all passing. Among them,
by name: borrowed dialogue of the other question that prints the same sentence;
wrong number in the long probe and in the clip; another number from the same
start; an opening the script prints twice; a quote from the wrong section, with
forged offsets, or of a later turn; the same topic in other words; a
differently spelled first word; probes outside the original, past their own
duration, or flagged overflow; forged container, request and PCM hashes; a
question that already has a start; a start that is not the measured lead; an
uncertain number or dialogue segment; dialogue heard from another passage or
past the next question.

**Mutation check.** On a scratch copy, each of 43 hold reasons of
`lib/identity.mjs` was disabled in turn; the test suite failed for every one,
judged by exit code.

**The independent verifier's own check, as a diagnostic.** Its adapter was
imported read-only from the main checkout and its per-row `validate()` run on
the offered rows, with its own decode of every original and of every probe's
PCM. It is a diagnostic of the rows' shape, not an admission (no chronology, no
complete replay):

| rows                                                                                                                                                                | file                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 244 / 244 of supplement-001 passed                                                                                                                                  | `official/supplement-001/root-adapter-diagnostic-full.json`        |
| 112 / 112 rows of the 21 sources with rows new in 002 passed                                                                                                        | `official/supplement-002/root-adapter-diagnostic-new-sources.json` |
| 67 / 67 reconstructed rows of the first 16 of 52 sources passed; **incomplete** — stopped at the coordinator's request as redundant, 147 rows of 36 sources not run | `reconstructed/census-001/root-adapter-diagnostic-INCOMPLETE.json` |

Together every one of the 310 official rows passed that per-row check. For the
214 reconstructed rows it was run on 67 only; nothing is claimed for the rest
beyond this folder's own replay.

## What stays held, and what it would take

Official, not offered (87):

| rows | state                                                                                                                                              | what it would take                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---: | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|   38 | number and own sentence heard; the own opening is not word for word                                                                                | 26 were listened to in English and the first utterance is not heard word for word from its first word — mostly a spelled name or word (Yoonho / "You know", Jadon / Jayden, Jina / Gina, cellphone / cell phone), in a few the listening began after the first utterance: a human listening, or a rule that tolerates a name, which nobody decided. 6 are in sources with no official script. 6 have a script but no English listening within 20 s — one more bounded English round could decide those |
|   16 | own evidence replays; the very next question is one of the rows above                                                                              | follows that question                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
|    9 | number, sentence and own opening all replay; the question paper prints the question as an image, so its sentence exists in the script section only | the verifier's explicit route compares with the question's own printed sentence; reading the section head for image-only questions (as its older route does) would cover them                                                                                                                                                                                                                                                                                                                          |
|    7 | bare digits; no number-only clip wrote the number reliably, a four-second clip did                                                                 | a clip of four seconds is not "the number alone"                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
|    6 | shared-instruction members whose opening begins with a differently spelled name                                                                    | as the 38                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
|    3 | literal number and exact own opening; the sentence was heard below 0.8                                                                             | the agreed route needs the sentence too                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
|    3 | bare digits before a repeated sentence; every number clip flagged uncertain                                                                        | not repaired                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
|    2 | ordinal-only rows of sources whose chronology is still incomplete                                                                                  | follows the rest of that source                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
|    1 | sentence at 0.8 by Hangul runs, under it by the verifier's whole-kernel measure                                                                    | not offered                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
|    1 | **a contradiction**: a clip from the start of question 2 wrote "1번" (`ebsi-high-3-2020-1`)                                                        | held on purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
|    1 | bare digits, no reliable number clip, and an opening that differs by a name (`ebsi-high-1-2025-2` Q9)                                              | as the 38                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

Reconstructed: the 56 "before the span" rows (39 passages) have the number
written first and reliably at a measured onset 0.01 to 1.26 s (median 0.21 s)
ahead of an estimated span that the contract treats as a search area and never
pads; they are listed with their probes for the verifier to judge. The 45
need the noise-floor onset tier, which this work did not attempt. The 718 need
the missing or uncertain original headings established first; that is a mapping
question, and no audio was listened for them here.

## Things to know before relying on a row

- **Flagged readings.** For 6 offered rows the producer's own row had been held
  and the place and probe are stated by this replay
  (`evidenceFieldsStatedByThisReplay`): 3 members and 3 ordinal-only rows. The
  same number was written by every stored recognition from those starts, but
  most were flagged by the `noSpeech > 0.6 and logprob < −0.6` clause; for the
  3 members 1 of 6 readings is unflagged, for `ebsi-high-2-2022-1` Q3 1 of 5
  literal readings plus a reliable bare long probe. 33 ordinal-only rows lean on
  those 3. Each row lists every other recognition from its start with
  `flaggedUncertain`; 49 offered rows have at least one flagged sibling.
  Nothing was repaired. Whether one unflagged reading among flagged ones is
  enough is the verifier's and the coordinator's call; the coordinator replied
  that its contract accepts a reliable, unchanged number-only recognition even
  where other readings of the same number were flagged, that no flag may be
  rewritten, and that any conflicting number stays a hold. Its full-source
  replay decides.
- **Frozen identities.** Rows carry the frozen producer identities (set
  revision and document hash of the frozen inventory). The live sets have moved
  on since the 2,203 starts were registered; rebasing is the coordinator's.
- **No one listened.** All text is model output.

## Not done

- No database or Storage write, no upload, no clip, no transcoding, no change
  to audio, questions, options, answers, images, transcripts, recognition
  caches, `src`, the schema or any lock file. No push, no merge.
- No file under `../codex/`, `../claude/`, `../gemini/` or `../grok/` was
  changed, and no completed archive, probe or certificate.
- The commit hooks of this worktree do not run (`core.hooksPath` points at a
  folder that does not exist here); the staged files (`.mjs`, `.md` under
  `scripts/`) have no lint-staged task in any case. Files were formatted with
  the repository's prettier from the main checkout.
- One parser observation was reported to the coordinator rather than patched:
  `claude_adapter.leading_cue` ended with `lstrip(" .,:;까지입니다")`, a
  character set that also removes the first syllable of "다음을 …"; it cost
  `ebsi-high-3-2017-2` Q19/Q20 two bigrams of eleven.
