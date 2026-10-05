# AssemblyAI transcripts against held whole-original starts — diagnostic alignment

`alignment.mjs` reads completed AssemblyAI transcripts of an **unchanged whole
original recording** and asks, for every question the independent certificate
still holds: in which explicitly bounded original passage was its own evidence
heard, and under which spoken number was that passage announced?

It produces **proposals to look at**. Nothing it writes is a start:

- no `audioRange` on any row, no DB, Storage or media write, no clip, no call to
  a provider, no secret. Node builtins only.
- a question that already has a start (2,727 in certificate `776d313a…`) is
  echoed with its exact range and is never a subject.
  `assertExistingStartsUntouched` runs on every report, and again on the bytes
  about to be written.
- provider word times are estimates. An announcement is reported as the
  **silence-bounded window** its number was written in; a native onset
  measurement still has to narrow it. Admission stays with the independent
  verifier and the root operator.

The displayed number of a reconstructed question decides nothing. It is not
read when a passage is chosen.

## Inputs, and what binds them

| input                             | bound by                                                                                                                                                   |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| inventory, clock                  | their SHA-256 in the certificate's own `inputs`                                                                                                            |
| certificate                       | `--certificate-sha256` (the reviewed hash)                                                                                                                 |
| headings envelope + raw response  | raw bytes SHA = envelope; transcript id, `completed`, model, languages, word count, provider duration within 1.5 s of the playback duration                |
| English envelope + raw response   | the same checks (`english_…`), English-only request, another transcript id and other bytes than the first                                                  |
| recording                         | envelope source/playback SHA and duration = inventory = clock; clock `passed` with offset 0; original file re-hashed, its length and path = both envelopes |
| certificate rows                  | same source, audio, playback, revision and document as the inventory; a held row has no range, a row with a range ends at the whole original's end         |
| generation quotes (reconstructed) | prepared file SHA = inventory; alignment file names the same prepared file and audio; quotes are taken **by question id**                                  |
| official script                   | live snapshot SHA = inventory; document SHA = inventory record                                                                                             |

One failed check and nothing is read from the transcript: every held question of
that source is held as `binding_failed:<check>`, with no passages and no
evidence. Only whitelisted fields of the raw response are read; its upload URL
never reaches a report.

## Rules

**Numbers.** A number is digits followed by `번`, as the provider wrote it:
`1번`, `5번.`, `1번입니다.` (also digits and `번` as two words). `한 번씩만`,
`두 번`, `번호`, `3번째` are not numbers. Bare digits before an instruction
(`3. 다음을 듣고 …`) are recorded and bound a passage, but establish no number.
Spelled numerals (`삼번`) are not read at all. Nothing is respelled.

**Instruction.** An announcement is a number whose very next words are a Korean
instruction ending on an instruction verb (`고르시오`, `고르세요`, `답하시오`, …)
before any other number, with at most two words without Hangul inside.

**One heading for several numbers.** `19번과 20번, …` / `19번부터 20번까지 …` with
an instruction is one heading. English after it makes it a shared passage
(scope `[19,20]`, its members' own sentences are not repeats); none makes it a
shared instruction whose members (`19번입니다.`) inherit it. The same form
without an instruction (`1번부터 15번까지는 한 번만 들려주고`) heads nothing.

**A passage** runs from its heading to the next written number, or to the
closing announcement after the last one. It is established only when

- its number was announced once, in order (no lower number after it), in digits,
  with an instruction;
- the very next heading is the next number (or its shared heading) and is itself
  established — a missing number leaves both neighbours open;
- no second instruction sentence stands inside it (a lost heading usually
  leaves its sentence behind);
- the last passage ends at a closing announcement.

**Reconstructed questions.** Every generation quote of at least four words
must stand **word for word** (case, punctuation and apostrophes aside) and
every place it stands must be inside one and the same passage. A shorter quote
cannot anchor; it must be heard in that passage too. A quote that is missing,
crosses an announcement, lies outside every passage or in two passages holds
the question. For a missing quote the longest exact run is printed as
`longestExactRunNotEvidence` — a hint for a reader, never used.

**Official questions.** The script must print every question number exactly
once, in order. A section's sentences that the script prints once are its
anchors. The question's own number must be announced, at least one own sentence
must be heard inside that passage, none in another passage, and no other
section's sentence inside it. The instruction heard is compared with the
printed one on its Hangul and reported (`exact` / `inexact`); it holds the
question only when it is literally another section's sentence and not its own.

**Existing starts.** Each start the certificate holds is compared with the
window in which the transcript wrote the same original scope (a reconstructed
row's proven scope; official rows that share a start share a scope). One start
outside its window (±2.5 s) holds the whole source as
`source_existing_start_outside_announcement_window`. A proposal for a scope
that already has a start names it (`sharesExistingStart`); a proposal on the
wrong side of another scope's start is held.

For a shared instruction followed immediately by its first original member,
the comparison and candidate search use the **shared heading's** window. The
first member keeps its own singleton scope and dialogue evidence. Later members
use their own number's window. The first-member candidate is explicitly labeled
`shared_instruction_first_member_heading`; its estimate still requires native
re-recognition, measured onset and independent admission. This semantic correction
was added after the 2026-10-06 investigation; prior immutable reports are unchanged.

**Two transcripts.** The transcript that hears Korean gives numbers,
instructions and passages. With `--english-envelope`, dialogue words come from
the English-only transcript **alone** and are placed by provider time: a
passage holds what was spoken after its own instruction ended and before the
next number's instruction began (±500 ms). A number without an instruction of
its own leaves its whole window to neither side. An English word is never a
number. Without the English envelope the same transcript gives both, and
quotes are placed by word order.

## Why a window, and three kinds of doubt

The provider leaves the first word after a silence where the silence began.
In `ebsi-high-3-2016-2`, 14 existing starts could be compared; all 14 lie in
the window of their own number, but only nine number tokens start within a
second of the verified start (+363…+385 ms for seven of them: the fixed lead).
The other five are 4.8, 9.9, 9.9, 10.1 and 19.0 s early, each exactly 3,000 ms
long. So an announcement is given as `[end of the word before, start of the
word after]`, and a held row says which doubt holds it:

| class             | meaning                                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `binding`         | not this recording, clock or certificate                                                                                          |
| `structure`       | the words themselves: missing, repeated, out of order, crossing, elsewhere                                                        |
| `provider_timing` | only that the provider did not time a number (`instruction_after_unmeasured_provider_gap`, `next_announcement_timing_unmeasured`) |
| `confidence_only` | only the provider's own confidence (`…_low_confidence`)                                                                           |

Provider confidence can hold a row and never admits one. A quote found word for
word is already two recognizers, or a recognizer and the printed script,
writing the same words; that, not a score, is the evidence. No similarity
measure decides anything here.

The historical `binding` label also includes source-wide timing diagnostics
(provider duration, words beyond the end, and existing-window disagreement).
It alone does not establish wrong source identity. Consumers must read the
specific checks and reasons. A localized native-evidence route can investigate
other spans independently, while retaining every original raw timing issue and
the strict physical source, document and clock checks.

## What was fixed before the data, and what was not

Thresholds (`POLICY`) and the rules above were written and committed before the
utility was run on the pilot transcripts (`36cb4f5b2`, then `c6607dce0` for the
two-transcript rules and their 500 ms tolerance). Three things changed after
transcript words had been seen — the first two while reading raw words for
their format, before the first run; the third after the first two-transcript
run. They are named here so nobody takes them for foresight:

1. The existing-start check compares with the silence-bounded window, not the
   number token's start. Reading the first transcript for its format showed
   tokens seconds before verified starts.
2. A long provider gap between a number and its instruction was first
   `instruction_context_missing`; it is now its own reason and class. The row is
   held either way.
3. An official sentence the English provider timed over its own number and
   instruction (question 11: five words in 100 ms) was first counted as own
   dialogue outside its passage. It is now not counted at all — neither heard
   nor elsewhere. This one changes an outcome class (question 11 moved from
   `structure` to `provider_timing`); it admits nothing.

No threshold was changed. `--policy` takes other values; a report then lists
them in `policyDiffersFromPreregistered`.

## Commands

```sh
OUT=C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005/codex-held-validation-20261005
T=C:/Creative/testautocreator/.qa-artifacts/assemblyai-seek-20261005/transcripts

node alignment.mjs \
  --inventory $OUT/rebase-final-001/inventory.json \
  --certificate $OUT/replay-final-002/certificate.json \
  --certificate-sha256 776d313ae3ffc626627c722a93e2c24e7eff0284890f4e268bf676114d6e6046 \
  --clock $OUT/rebase-final-001/clock.json \
  --envelope $T/<source>/569dfdef9953/envelope.json \
  --english-envelope $T/<source>/6369ffcc124c/envelope.json \
  --out <a new directory of your own>

node --test alignment.test.mjs   # synthetic transcripts; no corpus, network or provider
```

`--envelope` and `--english-envelope` repeat, one per source. Every file is
written once (`wx`): `<source>.alignment.json`, `summary.json`, `REPORT.md`. The
output directory may not hold an input.

## Tests

`alignment.test.mjs`, 43 tests on synthetic transcripts shaped like the
provider's real output. What the task asked to be refused, and where:

| refused                                | test                                                                                                                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| a guessed number                       | "placed by its quotes, never by its shown number"; "a shown number that was announced perfectly proves nothing…"                                                                                       |
| repeated announcements                 | "a number announced twice is not chosen between"; "…written twice in a row is a repeat…"                                                                                                               |
| a quote crossing the next announcement | "a quote that runs across the next announcement is refused"; "…runs across a Korean heading it did not write…"                                                                                         |
| another audio hash or clock            | "a transcript of another recording, clock or certificate is not read at all"; "an existing start outside the window of its own number…"; "the English transcript must be of the same bytes and clock…" |
| uncertain or conflicting numbering     | "a number without its instruction, in bare digits or out of order…"; "provider doubt holds a row…"; "the same digits without an instruction make the number ambiguous"                                 |
| an edited existing start               | "a question that already has a start is echoed exactly and never proposed" (frozen inputs, a doctored report in nine ways); "the command … leaves every input as it was"                               |

Each guard was also removed in turn on scratch copies of the two files (66
mutations, the tracked files untouched); the tests catch every one. The ones
that first survived led to nine stronger tests and to deleting a redundant
condition and an unused field.

## Pilot, 2026-10-05

Three sources, 45 held questions. Numbers from `universal-2` (en+ko), dialogue
words from `universal-3-5-pro` (en). Preregistered thresholds; the same input
gives the same bytes on a second run.

| source                                | held | candidates | held: structure | provider timing | confidence only | clock checks         |
| ------------------------------------- | ---: | ---------: | --------------: | --------------: | --------------: | -------------------- |
| `ebs-middle-3-2017-2` (reconstructed) |   20 |          0 |               9 |               9 |               2 | none available       |
| `ebs-middle-2-2007-2` (reconstructed) |   20 |          7 |               4 |               3 |               6 | none available       |
| `ebsi-high-3-2016-2` (official)       |    5 |          0 |               0 |               3 |               2 | 14 agree, 0 disagree |

The seven candidates, none under its shown number:

|      shown | original | announcement (headings transcript) | window ms     | a quote (English transcript)                                    |
| ---------: | -------: | ---------------------------------- | ------------- | --------------------------------------------------------------- |
|       6, 7 |        5 | word 255 «5번입니다.» 0.83         | 201353–219258 | words 186–194 «We're having a special sale in our food corner,» |
|     15, 16 |       12 | word 556 «12번입니다.» 0.82        | 512279–530041 | words 543–551 «Turn off the light when you leave the room.»     |
| 18, 19, 20 |       16 | word 633 «16번입니다.» 0.83        | 661156–693305 | words 718–723 «I fell over while playing soccer.»               |

What holds the other 38 (a row can carry several): `ordinal_low_confidence` 26,
`next_announcement_low_confidence` 19, `next_announcement_timing_unmeasured` 16,
`instruction_after_unmeasured_provider_gap` 14,
`generation_quote_missing_in_transcript` 12,
`next_announcement_not_contiguous` 2, `second_instruction_inside_passage` 2,
`quote_low_confidence` 1, `generation_quotes_in_different_passages` 1.

- **Missing quotes** are the stored quotes against another recognizer's
  spelling: `Spider-Man 3` / `Spider-Man three`, `press 0` / `press zero`,
  `favour` / `favor`, `Kathy` / `Cathy`, `OK` / `Okay`, a leading `1.` or `Um,`.
  They stay held; the near-miss run is in the report.
- **2017-2 middle 3** has no `8번` in the transcript: the passage of `7번` holds
  two instruction sentences and is followed by `9번`. Both guards fire.
- **One sentence in two dialogues** («Then why don't you ask her?», under 9 and 11) holds shown question 15.
- With the two provider gates set to zero in a run labelled as such
  (`pilot-003-sensitivity-no-provider-gates`), exactly the 25 `provider_timing`
  and `confidence_only` rows join the seven: 32 placed, 13 held by structure.
  That is a count, not a recommendation.

Cross-checks that were not used to decide anything:

- the six placed questions the frozen mapping audit had already mapped carry
  the same original number here (4 and 11);
- all five earlier measured starts of the official held questions lie inside
  the windows reported here (e.g. question 1: 46,720 ms in 45,273–47,773).

About the 0.8 number threshold: the 14 verified numbers of the official source
were written with confidence 0.52–0.77. At 0.8 every one of them would have
been held. The threshold was fixed before that was known and is left as it is;
whoever sets it next should know this figure. Number-token confidence: median
0.67 / 0.84 / 0.63 for the three sources.

Private results (not tracked):
`<worktree>/output/assemblyai-seek-20261005/pilot-003-english-quotes/`
(`REPORT.md`, `summary.json`, one `*.alignment.json` per source with every word
index, quote, window and reason), `pilot-003-bilingual-only/` (one transcript,
word order: 1 candidate) and `pilot-001`, `pilot-002-english-quotes` from
earlier tool versions.

## Limits

- Nobody listened. Recognition text is model output, and a window is not an
  onset.
- A placed quote in two-transcript mode rests on two providers' word times
  agreeing within the tolerance around a passage's own instruction. A word left
  early or late makes a hold, and a whole sentence written into 100 ms can fit
  two passages; both are tested. A quote wholly mistimed by more than an
  instruction's length into a neighbouring passage would not be seen.
- The last passage of a reconstructed source has no next number. If its true
  last heading was not written, with its instruction, the dialogue after it is
  taken for the passage before. The closing announcement and the second
  instruction guard do not cover that case.
- Official blocks that share only an instruction (members with their own
  dialogues), scripts that number with `N.` and spelled numerals are held, not
  handled.
- Shared-instruction members are offered at their own cue
  (`shared_instruction_member_cue`), with the shared heading's window beside
  it. Which of the two a seek should use is not decided here.
- Thresholds are not calibrated. The pilot is three sources.

## TypeSafe

Read for this task: the project skill (`.agents/skills/typesafe-ai/SKILL.md`)
and the live confidence, citation-check and pre-parsed value extraction pages.
What was taken from them: code finds the candidate spans and owns the strings;
a quote is matched exactly before anything else is asked; a confidence is a
shape of a distribution, not correctness and not permission to act. This
utility makes no model call and replaces nothing in the stack. Where a semantic
judgment is wanted later (is this the same sentence despite `3` / `three`?), it
belongs in a separate, typed step over these exact spans, with its own no-match
answer — not in a looser match here.
