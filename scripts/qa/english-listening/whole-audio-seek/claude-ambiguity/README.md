# Held whole-original starts — what can be told apart (claude)

The completed whole-original replay
(`codex/replay-final-002`, 193 sources / 3,699 questions) left 1,496 questions
without a start: 397 official and 1,099 reconstructed. This folder asks, for
each of them, whether its beginning can be located in the **unchanged whole
recording** from real, source-bound evidence — and says so row by row.

Nothing here cuts, re-encodes, uploads or rewrites audio, questions,
transcripts, recognition caches, the database or Storage. A start is a point to
seek to; playback continues to the end of the original. The 2,203 starts that
already exist are a fixed baseline: no row here touches one, and a question
that has one is refused outright.

What this folder produces is an **offline finding**. Admission is the
independent verifier's (`../codex/`): it replays every offered row from the
original bytes, with its own decode, and decides.

## The question that started it

`ebsi-high-2-2018-2` questions 2 and 3 were held as
`official_instruction_not_unique`: the same "appropriate response" sentence is
printed for questions 1, 3 and 17, and another for 2 and 16. The long Korean
probe had written their numbers as bare digits (`2.`, `3.`), which sends a row
down the route that needs a script-unique sentence.

A sentence the script prints for several questions identifies none of them.
What does identify one is the conjunction of

| part         | what replays                                                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **place**    | a measured native onset with measured quiet before it, and the fixed lead of the existing start policy                       |
| **number**   | the question's own number written first by a bounded recognition that begins at that start                                   |
| **section**  | the official script's own numbered section of that question (every number printed once, in order)                            |
| **sentence** | that section's printed sentence heard after the number, compared on its Hangul                                               |
| **dialogue** | an exact, script-unique opening of that section's first utterance, heard from a later measured onset inside the same passage |
| **order**    | the nearest earlier known start before it, and the very next question's known start after it and after the quoted dialogue   |

For question 2: a number-only clip from the measured start wrote exactly `2번`;
the long probe from the same frame wrote `2.` and then section 2's sentence; an
English probe 9.2 s later wrote "Mom, you'd better park your car in the …", the
first utterance of section 2, which the script holds once. Question 16 prints
the same sentence and has another dialogue 17 minutes later.

This is method `numbered_section_own_dialogue_v1` (`lib/identity.mjs`). It is
separate from the existing contract and turns off none of its rules.

### What counts as the number

- written as `N번` (or a spelled ordinal with `번`) by the long probe itself, or
- written as bare digits directly before the question's own sentence **and**
  as `N번`, alone and reliably, by a number-only clip of at most three seconds
  cut from the very same start frame.

A recognition the recognizer flagged uncertain proves nothing and is not
repaired. Any other stored recognition from the same start that wrote a
different number is a contradiction and holds the row — this happened once in
the corpus (a clip wrote `1번` where the question is 2) and that row stays held.

### What counts as the sentence

The section's own printed sentence, literally. Its Hangul is compared as bigrams
with what the long probe wrote after the number (at least 0.8, at least 12
syllables). An English name or numeral printed in the sentence is read aloud and
a Korean recognizer writes it in Hangul; those tokens are listed
(`notCompared`), never transliterated, repaired or guessed. They do not carry
identity — the exact English opening of the own dialogue does.

### What counts as the dialogue

Word for word, from the first word of the section's first utterance: four to
eight words when that utterance has four or more
(`first_utterance_prefix`); a shorter first utterance whole plus the exact start
of the next turn (`exact_original_opening_v1`); a whole first utterance that the
script prints more than once, plus the next turn until the script holds it once
(`exact_original_opening_v2`). No word is skipped and no spelling is repaired:
`Sara` heard as `Sarah` ends the opening.

## Routes and tiers

`lib/supplement.mjs` offers a replayed start only on a route the independent
verifier has:

| route                                    | what the row carries beyond the frozen producer row                      |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| `explicit_numbered_section_own_dialogue` | `officialIdentityEvidence{method}`; `numberClipEvidence` for bare digits |
| `existing_member_route`                  | nothing: it was held only for its next question's missing start          |
| `existing_shared_passage_route`          | nothing: two literal numbers and the frozen shared instruction           |
| `existing_ordinal_only_route`            | nothing: stands only inside a complete chronology of its recording       |

Everything weaker is **reported, not offered** (`evidence_below_agreed_route`):
a number and its sentence without an exact opening; a number and an exact
opening with the sentence heard below the threshold; a literal number that only
a four-second clip (number plus the start of the sentence) wrote; an image-only
question whose sentence exists in the script section alone.

## Reconstructed questions

A reconstructed question belongs to an original numbered passage through its
frozen generation anchors. That mapping is the frozen mapping audit's
(`codex/reconstructed-mapping-audit-003.json`) and is **not** re-decided here: a
question the audit holds stays held and is only counted.

For a passage the audit maps, `lib/reconstructed.mjs` answers one thing from
stored bounded recognitions: at which measured onset, inside the estimated span
of that passage's own number in the frozen whole-record recognition, was that
number written first, as `N번`, reliably. One such place makes a conditional row
in the frozen ledger's candidate shape; two distant places, a bare or flagged
number, a number written late, or a hearing outside the span hold it. A
generated display number decides nothing.

## Commands

All commands run from this directory. Node comes from the installed checkout;
this worktree needs no `node_modules`. The frozen inputs and their SHA-256
values are fixed in `lib/store.mjs`; a changed input is refused. Every output is
written once (`wx`).

```sh
OUT=C:/Creative/testautocreator/output/listening-assessments/whole-audio-seek-20261005
HELD=$OUT/claude-held-validation-20261005
INV=C:/Creative/testautocreator/.qa-artifacts/whole-audio-seek-20261005/inventory.json

# number-only and four-second clips at already measured starts
node plan-cue-clips.mjs --inventory $INV --native $OUT/claude --targets <targets.json> \
     --out $HELD --round 002 [--variants cue_only,cue_context | cue_only_wide,cue_only_tight]

# bounded listenings at measured onsets of mapped reconstructed passages
node plan-reconstructed-onsets.mjs --out $HELD --round 003 [--dry-run]

# recognition: the existing runner, shared GPU lock, model resident only under the lock
$OUT/claude/asr-venv/Scripts/python.exe -u ../claude/run_probes.py \
     --requests $HELD/probe-requests/round-00N.json --out $HELD \
     --lock $OUT/gpu-probe.lock --model-cache <model cache> --owner claude:<dispatch> \
     --runtime-root $OUT/decoder-runtime

# replay and write
node build-official-supplement.mjs --run supplement-00N [--dry-run]
node build-reconstructed-census.mjs --run census-00N [--dry-run]
node build-disposition.mjs --official supplement-00N --reconstructed census-00N --run report-00N

# tests (synthetic fixtures; no corpus, GPU or network)
node --test "tests/*.test.mjs"
```

## Limits

- Recognition text is model output. Nobody listened to these starts; no row
  claims human review.
- The identity replay here reads stored probe files by hash and re-measures
  every onset from the native loudness cache. It does not decode audio again;
  the independent verifier does.
- A measured onset needs measured quiet before it. Where a number is spoken
  over music or hiss, this folder states no place for it.
- The script section parser refuses a script that does not print every question
  number exactly once in order; such a source has no dialogue proof here.
