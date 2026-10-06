# Original listening production patterns

This repository retains **abstract production patterns derived locally from all 193 external source records and all 3,699 live document questions**. It retains no source library, source examples, source transcripts, source identifiers, answer sequences, or embeddings. These patterns are persistent reference data for a future original listening studio. No model weights were trained, no provider was called for this analysis, and no learner feedback feature was created.

## Population and evidence

The live private corpus packet was authoritative for document questions. The frozen inventory supplied the census and local supplemental file locations. The analyzer matched every inventory member to one live document, visited every live question, and read 193 existing ASR files, 193 prepared files, and 193 alignment files. There were zero missing supplemental files, duplicate identities, unmatched transcript rows, or frozen/live question-count differences. Frozen prepared questions never override live documents.

| Attribution | Sources | Live questions | Appropriate use |
| --- | ---: | ---: | --- |
| Official documents | 121 | 2,417 | Question format and style observations, with metadata/inference distinctions |
| Audio-only reconstructions | 72 | 1,282 | Separate reconstructed format statistics and recording/transcript proxies |
| Complete population | 193 | 3,699 | Coverage and aggregate recording observations |

Reconstructed questions were generated previously from recordings. They are **not evidence of official question style**, even when their metadata supplies a type. The blueprint builder excludes them from official quotas. All 1,282 reconstructed type labels are recorded as inferred metadata; none is observed official metadata.

The packet contained 193 English-profile and 193 bilingual-profile DB transcript rows. All 193 sources had nonempty English-profile text, which was selected once per source for word/topic proxies. Bilingual rows were inspected for availability but did not add a second English-word observation. Local ASR text was available for every source. Five official document transcript fields were empty after trimming whitespace, but their DB English transcripts covered them; no source lacked a selected transcript. This distinction is retained explicitly, rather than treating document-field missingness as missing source coverage. Selection order for other packets is DB English, document spoken/text, then local ASR. A bilingual-only source remains missing English unless another fallback exists.

The per-source coverage receipt is written only to MAIN's ignored retirement directory. It contains private matching identities and coverage booleans for the coordinator's review; it is not part of the retained bundle. The coordinator must destroy that receipt and all private corpus inputs during final retirement. The worker does not perform retirement or alter separately authored/TTS assets.

## What was observed and what was inferred

Official metadata supplies 1,373 non-unknown labels with the `source_label` method. The remaining 1,044 official metadata labels were unknown. Conservative Korean stem rules infer 581 additional types; **463 remain unresolved**. A generic selection verb alone does not establish a type. Regex labels are unvalidated heuristics, not semantic or teacher certification. Contradictory source-label metadata and stem signals remain visible in the separate frequency fields; observed metadata takes precedence in the effective type count.

| Grade | Official sources / questions | Observed labels | Stem-inferred labels | Unresolved | Reconstructed sources / questions |
| --- | ---: | ---: | ---: | ---: | ---: |
| middle1 | 18 / 360 | 63 | 155 | 142 | 24 / 409 |
| middle2 | 18 / 360 | 146 | 113 | 101 | 24 / 429 |
| middle3 | 18 / 360 | 204 | 85 | 71 | 24 / 444 |
| high1 | 23 / 457 | 276 | 114 | 67 | 0 / 0 |
| high2 | 22 / 440 | 358 | 60 | 22 | 0 / 0 |
| high3 | 22 / 440 | 326 | 54 | 60 | 0 / 0 |

`assessment-patterns.json` stores grade and attribution splits for every retained count. `types.observedMetadata`, `types.inferredMetadata`, `types.inferredStem`, and `types.unresolved` are mutually exclusive accounting categories. `types.effective` combines them for a reviewable quota proposal, retaining unknowns. Stem-form counts instead describe the text's structural signal, including negative selection and unmatched stems; they are not a second independent question-type census.

## Grade question-count and type blueprints

Every official source has 20 questions except one high1 document with 17. The observed official mode is 20 for each of the six grades. Reconstructed counts range from 7 to 20 in middle1, 10 to 20 in middle2, and 13 to 20 in middle3; these recovery counts do not redefine the official question-count default.

The table below gives **effective official type counts**, combining observed labels and explicitly inferred stem labels. Read it together with the attribution table above; it is not a gold label distribution.

| Grade | Detail | Emotion | Relation | Location | Reply | Purpose | Visual | Number | Gist | Opinion | Unknown |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| middle1 | 111 | 16 | 2 | 17 | 36 | 18 | 0 | 18 | 0 | 0 | 142 |
| middle2 | 111 | 14 | 18 | 18 | 36 | 35 | 16 | 10 | 1 | 0 | 101 |
| middle3 | 95 | 13 | 0 | 6 | 72 | 32 | 31 | 40 | 0 | 0 | 71 |
| high1 | 125 | 2 | 18 | 2 | 109 | 21 | 40 | 28 | 29 | 16 | 67 |
| high2 | 105 | 0 | 21 | 0 | 124 | 23 | 40 | 21 | 40 | 44 | 22 |
| high3 | 93 | 0 | 19 | 1 | 114 | 19 | 38 | 20 | 38 | 38 | 60 |

Official inference and sequence types have zero recognized labels in all six grades. Zero means absent recognized evidence, not that the skill is prohibited. Very sparse relation/location/emotion/gist categories and missing visual labels, particularly in middle1, should not be filled with reconstructed frequencies or borrowed source examples. A teacher may commission additional original types, but that is an authored design decision rather than a measured corpus requirement. Unknown quota slots explicitly need design/review.

`buildCreationBlueprint(grade, optionalQuestionCount)` uses the official mode, or a requested count from 1 to 100. It allocates effective official frequencies with deterministic largest remainders, breaking ties in the fixed type order. Unknown frequency participates in allocation. With no official support for a grade, it reports missing support and leaves requested slots unknown. The return value reports observed, inferred, unresolved and excluded reconstructed evidence counts alongside source-level proxies and generation constraints. It does not create a test, connect a provider, or publish anything.

## Korean stem and response structures

Future original prompts are in Korean. The author-written `KOREAN_STEM_STRUCTURE` catalog describes each type's structural purpose without reproducing a whole source prompt: identify the listening target, identify the information or inference required, and specify the response operation. It covers detail, affect, participant relationship, setting, response completion, intention, visual mapping, quantity calculation, global meaning, viewpoint, inference, sequence, and unresolved design.

All 2,417 official and all 1,282 reconstructed live questions have five choices. There are zero observed short-response questions and zero other choice counts. Phrases asking a learner to answer do not establish a short-response format. A future short-response mode requires independent teacher design, an answer-normalization/rubric specification and review; no corpus-derived frequency is claimed.

Choose the option language according to the assessed skill. English utterance choices suit pragmatic response selection; Korean category choices can isolate comprehension of a meaning, setting, purpose or affect; freshly drawn visuals or numeric choices can assess mapping/calculation. These are production proposals. Per-grade `choiceLanguage` counts record actual Korean/English/mixed/nonverbal signals, rather than forcing every option to one language.

## Dialogue, monologue, sharing and topics

Stem/instruction rules suggest 1,793 dialogue and 179 monologue questions in official documents, with 445 unresolved; the reconstructed split is 282 dialogue, 6 monologue and 994 unresolved. These are prompt signals, not verified acoustic structures. Mentioning both gender roles occurred in 590 official stems, but does not prove that a recording has exactly two speakers.

None of the 193 selected transcript texts contains recognized line speaker markers; none of the 193 local ASR files has diarization. Therefore speaker and turn counts are unknown for all 193, and the corresponding summaries have zero measured values and 193 missing observations across the splits. ASR segments and punctuation sentences are not turns. New scripts must explicitly author speaker identities, speaking order, turn boundaries and consistent voices; a production teacher sets their complexity.

The current question text exposes zero recognized explicit shared-question instructions. Sharing remains unknown for all 3,699 questions. Overlapping seek ranges cannot establish shared stimulus groups. If a new studio uses a shared dialogue/monologue for two questions, author an explicit shared stimulus relation, ensure the questions test separate information, and have a teacher review it. This is a proposed design capability without a learned frequency or recovered source sequence.

Topics are limited to eleven generic domains: school, home, shopping, travel, health, leisure, work, community, environment, technology and culture. Fixed keyword rules map question metadata, question/choice text, and selected transcripts into separate multi-label counters. No metadata keyword, scene, title, named person or excerpt is retained. Domain hits can overlap and reflect announcements, options or incidental words rather than the main topic. All 193 selected transcripts have at least one generic signal; 1,304 official and 441 reconstructed questions have no recognized question-topic signal. These unknowns are preserved. Rotate new scenes within generic domains rather than retrieving an old scenario.

## Difficulty proxies and timing limits

These are recording-level, ASR-derived **proxies**, not validated difficulty levels, CEFR scores, speech rates or per-item script budgets. The English-profile text contains Korean material in 190 of 193 sources. The tokenizer counts Latin word tokens only, including any repeated delivery and English instructions. Source recordings include instructions, pauses and repeated speech. English words per audio minute measures whole-recording density, not articulation rate. A long word has at least eight Latin letters; unique-word ratio and punctuation-based sentence length are descriptive only. Tokenizer/ASR errors affect every lexical measure.

| Grade | Official duration seconds p10 / median / p90 | English tokens p10 / median / p90 | Median long-word share |
| --- | ---: | ---: | ---: |
| middle1 | 965.729 / 999.720 / 1045.935 | 854.8 / 962 / 1018.9 | 5.0% |
| middle2 | 1101.083 / 1138.176 / 1215.689 | 1239.9 / 1282 / 1320.6 | 5.7% |
| middle3 | 1203.024 / 1271.001 / 1311.649 | 1483.3 / 1596.5 / 1734.5 | 5.8% |
| high1 | 1209.166 / 1306.416 / 1417.017 | 1549.4 / 1814 / 2074.8 | 7.3% |
| high2 | 1301.317 / 1377.346 / 1495.712 | 1905.9 / 2070 / 2191 | 8.9% |
| high3 | 1311.576 / 1380.725 / 1491.742 | 1968.6 / 2152 / 2212 | 9.4% |

All source duration and selected transcript token observations are present. Corresponding reconstructed summaries are retained separately for the three middle grades; there are no reconstructed high-grade observations. A new studio can use these broad grade trends to commission increasing lexical and total listening load, then measure its own original scripts, instruction overhead and TTS durations. Do not divide corpus token totals into exact individual dialogue quotas or impose a monotonic grade requirement on every recording. Control vocabulary, syntax, inferential load, distractor similarity, repetition, delivery and turn complexity deliberately and validate difficulty with teachers.

ASR marked 930 of 33,298 existing segments uncertain: 744 official and 186 reconstructed. No ASR or alignment file was human-reviewed. Of the English DB profiles, 190 had matched duration metadata and 3 did not; only 80 had all word intervals positive and within source bounds, while 113 had defective or missing word intervals. Numerically valid timing is still estimated timing and does not certify transcript truth or question alignment.

All 3,009 in-bounds live question ranges end at the recording end: 2,339 official and 670 reconstructed. They are playback seek tails, **not question spans**. Another 690 ranges are missing or invalid: 78 official and 612 reconstructed. Seek ranges overlap in 191 sources. No per-question duration, per-question word count or exact answer-aligned segment is inferred from these ranges. The bundle retains only timing coverage/defect counts. Newly authored/TTS timings should come from the new script and audio, then be checked locally and reviewed.

## Distractor construction

The analyzer records structural option signals without preserving options or answers. Signals overlap and do not establish whether an alternative is actually wrong.

| Inferred signal | Official questions | Reconstructed questions |
| --- | ---: | ---: |
| Every option contains a numeric alternative | 156 | 122 |
| Negative truth selection in the stem | 301 | 12 |
| Response selection type | 491 | 10 |
| Visual mapping type | 165 | 0 |
| A Latin vocabulary token shared by every option | 12 | 117 |
| All alternatives have brief parallel word counts | 1,722 | 957 |

Proposed original construction rules: keep numeric alternatives in the same unit with new values and one correct calculation; keep semantic categories parallel; make response distractors plausible utterances that fail the authored intent/context; make newly drawn visual alternatives differ on a relevant audible attribute; and use topical vocabulary across choices while changing the supported proposition. For negative selection, explicitly check polarity. Role reversal, a rejected plan versus an updated plan, and a mentioned detail versus an entailed conclusion are useful teacher-designed variants; their occurrence is not claimed by the simple corpus detector.

Never transform an old answer list, retain an old numeric sequence, or change only names in an old scene. Write a new situation, relationships, facts, names, numbers and script from the generic constraints. If a planned distractor is also supported by the new script, revise the script/options before recording.

## Original production and verification

1. Load a grade blueprint and its observed/inferred/unknown evidence. A teacher resolves unsupported slots and any additional short-response/shared-stimulus requirements.
2. Commission an original scene and script, with explicit speaker identities, new facts and a unique assessed skill. Use generic topic domains and structural descriptions only.
3. Write the Korean stem and purpose-appropriate options. Specify the answer and its supporting proposition in the newly authored script.
4. Check schema, five unique option IDs, nonduplicate alternatives, one designated answer belonging to the choices, units/arithmetic, polarity and any explicit shared links deterministically. Having one answer ID is necessary but does not prove semantic uniqueness.
5. Verify that exactly one option satisfies the new stem against the new script, and that each distractor fails for a documented reason. Check transcript-to-answer agreement, referents, chronology and pragmatic response fit. Uncertain or unsupported judgments require revision and teacher review.
6. Generate original audio/TTS from the new script, measure its durations, verify transcript/audio agreement and speaker consistency, and obtain teacher review before publication. Preserve authored/TTS assets as new production assets.

Future semantic verification may use the project's TypeSafe stack for narrow support/contradiction, alternative-answer and pragmatic-fit judgments over **newly authored material only**. Counts, quotas, arithmetic and publication decisions remain in code, following the [TypeSafe building guide](https://docs.typesafe.ai/concepts/how-to-build-with-system-one). The [citation-check cookbook](https://docs.typesafe.ai/cookbooks/citation_check) provides a useful pattern for separating mechanical evidence checks from semantic support judgments. Probabilities or confidence do not establish truth; assess thresholds on teacher-labeled original items and route uncertain cases to review, following the [confidence documentation](https://docs.typesafe.ai/confidence). No Jev integration, API credentials, calls or external corpus uploads are implemented here.

## Reproduction and retained-data checks

Before the coordinator destroys private inputs, run from this checkout:

```powershell
npx tsx scripts/qa/english-listening/pattern-learning/analyze.ts --main C:/Creative/testautocreator
npx tsc --noEmit --pretty false -p scripts/qa/english-listening/pattern-learning/tsconfig.json
npx vitest run src/__tests__/unit/englishListeningAssessmentPatterns.test.ts
npx tsx scripts/qa/english-listening/pattern-learning/verify-private.ts --main C:/Creative/testautocreator
```

The analyzer makes no network, database or Storage calls. The JSON has only fixed field names, numbers, nulls and aggregate question-count histogram bins; its strict recursive schema rejects additional fields or source text. Computation does not depend on input order, dates, hashes, provider output or randomness. Quantiles use linear interpolation at `(n - 1) * p`; summaries are rounded to three decimals. Missing observations remain missing, and empty populations have null measurements.

Focused synthetic tests exercise the 193-member census, split separation even with misleading reconstructed metadata, transcript fallbacks and missingness, English/bilingual nonduplication, seek-tail interpretation, live-document authority, strict leakage rejection and six-grade quota totals. The private verifier additionally recomputes the real aggregate byte-for-byte and scans the retained files locally for source identities, long exact source strings and transcript n-grams. It reports only aggregate pass/fail counts and never prints matched content. Per-source evidence remains ignored in MAIN.

After retirement, private-input reproduction deliberately becomes unavailable. The aggregate JSON, deterministic code, guide and synthetic tests remain usable without originals or access to external sources. Maintain future patterns using separately authorized, original production evidence; do not restore the retired corpus to fill unknowns.
