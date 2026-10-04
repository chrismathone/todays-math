# Reconstructed listening style revision, 2026-10-05

The offline operator `scripts/qa/english-listening/reconstruct-style.ts` revises existing audio-grounded private drafts using actual same-grade Korean listening questions. It never imports a database client, downloads media, transcribes audio, or changes the original prepared payloads. Root owns review, receipt replay, revision/CAS adoption, and live writes.

## Corpus and exact references

MAIN is `C:/Creative/testautocreator`. The immutable inputs are its `output/listening-assessments/prepared-historical-registration`, `prepared-registration`, `prepared-native-registration`, and `prepared-reconstructed-registration` directories. The audit found 121 official sets / 2,417 original questions, 1,957 usable native text templates, and 72 reconstructed sets / 1,282 questions. All 1,282 reconstructed prompts were English at audit time. There are 460 original questions excluded from the text template catalog because usable native text choices or nonvisual prompts are unavailable; their image content is never fabricated.

| Grade | Official sets | Usable text templates |
| ----- | ------------: | --------------------: |
| 중1   |            18 |                   288 |
| 중2   |            18 |                   306 |
| 중3   |            18 |                   288 |
| 고1   |            23 |                   353 |
| 고2   |            22 |                   380 |
| 고3   |            22 |                   342 |

Each template binds the original prepared SHA-256, native prepared SHA-256, exact question/choice IDs, question PDF SHA-256, page, grade, source record and original question number. The operator validates the actual PDF hash and native extraction provenance before using the prompt and five choices. Template answers are excluded from generation examples and blind style state. The saved `official-style-templates.json` contains the actual prompts and choices, not a generic grade description.

Every reconstruction binds the existing prepared SHA-256, canonical editable-input hash, original audio SHA-256 and complete cached ASR file SHA-256. The full-population preflight checks unique existing ordinals, five choice IDs, answer reference, selected segment identity and every exact evidence quotation. ASR normalization keeps only existing segment id/text/uncertain fields for judgments; the full original ASR receipt remains unchanged and hash-bound.

## Generation and verification

Production audit version is `korean-official-style-v4-20261005` and style judgment version 4. The paid Flash pilot/batch used generation recipe 3; future default recipe 4 adds the exact output-field whitelist and supported questionType enum without changing grounding gates. Requests and complete responses have immutable files and SHA-256 references. The global application model stays `deepseek-v4-pro`; the offline operator supports an explicit `--model deepseek-flash`, currently the official DeepSeek V4.1 Flash alias. Actual response model and usage are recorded. Paid calls have no automatic retries; a started call without a successful receipt blocks replay.

Prompts follow Korean 발문. Content, purpose, detail and reason choices normally use concise Korean phrases; response choices may remain English. Amount/date/time choices use consistent conventional notation. All alternatives must share semantic category and grammatical form with similar specificity and plausible distractors. No unsupplied image question, invented audio, recovered official answer-sheet claim, speaker name or unsupported role is allowed. Recipe 3 explicitly preserves deadlines, temporal qualifiers, amount/unit meaning and source-bound speaker labels.

The original answer/evidence/explanation checks retain the existing 0.90 thresholds. Independent Jev style requests contain only written prompts/choices, grade, inferred task and exact same-grade reference prompts/choices; they contain no correct position, explanation, transcript or official answer. Four independent properties are classified pass/fail: task style, choice language/form, grade suitability and parallel distractors. Each property requires both Choice confidence and P(pass) >= 0.90; malformed or incomplete distributions fail closed.

The shared literal semantic guard additionally holds detected deadline, before/after, approximation, minimum/maximum, weekday/date/clock and quantity/unit drift. Root owns `reconstructionStyleSemantics.ts`; core wraps it with literal selected-ASR speaker gender/role checks. Version 4 requires an explicit `semanticWarnings` array on every item and refuses eligibility when nonempty. Empty warnings prove no general semantic equivalence: grounding and human review remain necessary. Old versions retain their original receipt interpretation for forensic replay; adoption must require the current guard.

Stable question/group/choice IDs, answer positions, source audio/transcript assets, source data and rights are copied from baseline. Only eligible items are changed in staged editable payloads; held items retain baseline content. Existing `needs_review` remains `needs_review`. The payload remains draft-only, humanReviewed=false, audioAlignmentVerified=false and originalQuestionNumbersRecovered=false. Prior generation/grounding receipts are retained alongside the new style audit.

## Controls and pilot evidence

The independent controls are saved under MAIN `output/listening-assessments/style-revision-20261005/official-controls-*`. Narrow Noul criteria accepted only 3/20 actual official positive controls, while the calibrated Choice form accepted 11/20 and rejected all 36 negative controls across six grades. The negatives include English comprehension prompts, unsuitable choice language, invented visuals, mismatched grade, unusually long correct options and overlapping reply options. This limited sample demonstrates a substantial false-negative rate; thresholds were not relaxed and low-scoring originals were not declared defective.

The full 20-question `ebs-middle-3-2017-2` pilot has before/after files and actual API receipts in these separate ignored MAIN directories:

| Directory suffix                   | Generation / style experiment               | Eligible / held |
| ---------------------------------- | ------------------------------------------- | --------------: |
| `style-revision-20261005`          | Pro recipe 1 / broad Noul                   |          1 / 19 |
| `style-revision-20261005-v2`       | Pro recipe 2 / narrow Noul                  |          0 / 20 |
| `style-revision-20261005-v3`       | Immutable v2 generation reused / Choice     |          5 / 15 |
| `style-revision-20261005-flash-v4` | Flash recipe 3 / Choice plus semantic guard |          6 / 14 |

The v2 pilot exposed a real false positive: original correct “By this Friday” became “금요일” while the answer judgment reported confidence=1, P(selected)=1 and grounding=0.98. Style held the item, and version 4 now deterministically holds a dropped deadline even if both probabilistic judgments pass. Before/after-swaps and amount/unit changes are tested; exact conversions remain allowed.

Flash accepted ordinals 2/4/8/14/19/20 after all checks: phone purpose, cat/food-festival reason, boy-and-dog book content, $20+$10 total, helmet gift and project/lunch reason. Ordinal 19 keeps its prior needs_review. Example exact grade/template bindings are `ebs-middle-3-2019-1` Q3/Q15 for purpose, `ebs-middle-3-2018-1` Q2/Q5 for detail, and the same set Q10/Q16 for number. They are bound examples for newly reconstructed questions, not recovered original 2017 sheet content. Numeric choice order may remain unusual because preserving the correct choice ID/position takes precedence over sorting.

The Flash pilot response recorded model `deepseek-flash`, 8,709 prompt tokens, 17,460 completion tokens including 13,148 reasoning tokens, and 64,055ms generation latency. Official balance GET returned available USD 2.46 at 2026-10-04 16:55:09 UTC; receipts are saved. The operator reserves conservative published peak-rate bounds and settles completed requests from actual model/tokens/time. This balance is an observed timestamped value, not a promise about later availability.

## Batch operation

The all-72 run uses cached ASR, concurrency 2, recipe 3 and a USD 2.30 generation ceiling. The same Flash directory contains `manifest.json`, raw generation/answer/style request and response files, `before-after.json` per record and prepared draft JSON. Its manifest records generating/prepared/failed states explicitly. Strict schema failures, uncertain ASR and low judgments preserve baseline content; no failed call is automatically paid again. Current failures include unsupported questionType and copied extra fields in generated question objects, rather than silent normalization.

```powershell
node node_modules/tsx/dist/cli.mjs scripts/qa/english-listening/reconstruct-style.ts `
  --main-root C:/Creative/testautocreator `
  --output C:/Creative/testautocreator/output/listening-assessments/style-revision-20261005-flash-v4 `
  --env-file C:/Creative/testautocreator/.env `
  --model deepseek-flash --instruction-version 3 --generation-effort low `
  --concurrency 2 --max-generation-usd 2.30 --check-balance --execute
```

Omit `--execute` for a read-only corpus audit; omit `--check-balance` to avoid even the authenticated balance request. `--only ebs-middle-3-2017-2` limits a new pilot. Prepared results in the same output can be reused only against the identical baseline; raw request hashes prevent changing a started/completed paid request in place. `--reuse-audit-root` references immutable prior generation and answer receipts for an explicitly new independent verification run; it never rewrites their model or version. Do not rerun uncertain paid attempts automatically.

An explicit `--normalize-structural-metadata` recovery requires `--reuse-audit-root` and a new output directory, so no new DeepSeek generation is possible. The shared `normalizeListeningStyleGeneration` performs only versioned `structural-metadata-v1` changes: the `reason` taxonomy alias becomes `detail`, and per-question `sourceRecordId`/`level` fields are removed only when they exactly equal the bound source. The audit records ordered sourceNumber/field/from/to steps. No prompt, choice, answer index, explanation, evidence or segment ID changes. Other labels including `action`, identity mismatch and all other extra fields remain strict errors. Loader must recompute the same transformation from the immutable raw receipt and compare the declared steps; the existing semantic/grounding/style gates still apply. Completed exact verification requests may be reused; a prior started request without receipt remains blocked, and structural failures with no prior verifier call can receive a first verification call.

Cross-grade inspection found a staged candidate whose cached ASR evidence is entirely Korean dialogue despite uncertain=false (`ebs-middle-2-2006-2` ordinal 5). This is exact cached evidence, but it cannot establish alignment to English speech. Root has been notified to quarantine such candidates during adoption review; no audio-alignment claim is made and no source transcription is replaced.

Validation: 27 focused reconstruction/style tests, scoped TypeScript and repository-wide TypeScript pass; owned-file ESLint is checked before commit. The tests cover deadline drift despite passing judgments, before/after swaps, amount/unit changes, exact conversions, unsupported speaker labels, source/answer/order/full-coverage invariants, no answer leakage, strict audit derivation, malformed judgment rejection, and structural recovery with raw immutability/substantive-field equality/mismatched-identity rejection. Live application DB changes and media/playback validation are outside this worker's scope.
