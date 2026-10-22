# Claude quality review — API owner, 2026-10-22

The authorized execution is complete: **366 model requests**, **341 strict
acceptances**, **25 preserved schema failures**, **zero active calls**, and an
estimated **USD 15.306279** in token charges. The ceiling was 600 and observed
concurrency never exceeded three. No product files, app environment, shared
dependencies, production data, main branch, build, merge, or push were changed
by this owner. Integration belongs to the coordinator.

Fresh official Models authentication and capability verification succeeded
before model work. Every model request was frozen in a separate private Git
repository before transmission. All 366 responses were HTTP 200/end_turn, with
unique request/message IDs, recorded actual model and usage, no tool blocks,
and no observed truncation or refusal. HTTP/envelope acceptance does not imply
mathematical correctness, valid product output, or source completeness.

## Calls and cost

| Phase | Calls | Strict accepted | Estimated USD |
| --- | ---: | ---: | ---: |
| Initial two-reviewer text verification | 202 | 179 | 2.325908 |
| Authorized format-only clarifications | 23 | 23 | 0.226674 |
| Independent authored order/injection controls | 24 | 22 | 0.210864 |
| Original baseline/fixed/independent OCR waves | 46 | 46 | 4.935425 |
| Final current configuration, 30-case confirmation | 30 | 30 | 3.226625 |
| Final experimental configuration, same 30 cases | 30 | 30 | 2.836120 |
| Post-final-prompt four cases, both configurations | 8 | 8 | 0.638323 |
| Three separately versioned static code reviews | 3 | 3 | 0.906340 |
| Total | 366 | 341 | 15.306279 |

| Actual model | Calls | Input tokens | Output tokens | Estimated USD |
| --- | ---: | ---: | ---: | ---: |
| Sonnet 5.5 | 134 | 218,049 | 55,374 | 0.989838 |
| Opus 5.5 | 152 | 999,234 | 91,343 | 5.823796 |
| Opus 5 | 80 | 1,600,244 | 19,657 | 8.492645 |

Total usage was 2,817,527 input and 166,374 output tokens, with no reported cache
usage. Standard input/output USD per million tokens were 2/10, 4/20 and 5/25,
respectively, from the [official pricing documentation](https://platform.claude.com/docs/en/about-claude/pricing).
These are usage estimates, not an invoice or remaining-credit check. Effort and
schema handling follow the [official effort](https://platform.claude.com/docs/en/build-with-claude/effort)
and [structured-output](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
documentation; actual capabilities are in the fresh Models response.

There were no automatic retries. The 23 main schema failures received exactly
one separately authorized, frozen format clarification after the original 202
raw responses were sealed. No accepted main review, refusal, or supplementary
control failure was retried. The old-prompt 30-case shadow freeze was superseded
before any calls. A replacement set of four authored cases was also unused.

## Mathematical verification

All **101 unique original student text projections** and both selected candidate
answers/explanations received two fresh review turns: Opus 5.5 high/8,192 and
Sonnet 5.5 high/8,192. The 202 turns contain 404 candidate judgments. Authors were
hidden by fixed-seed A/B order, and request execution was randomized and frozen.
No original answer vault, old judge verdict, or other review response appeared
in a request. This is disclosed **nonblind verification by one provider**, not
blind re-solving, provider independence, or a measured accuracy study.

Source sufficiency, answer-field mathematical correctness/completeness, and
answer/explanation consistency are separate. The initial 23 rejects all emitted
one candidate; 19 also had empty source evidence and 17 had empty candidate
evidence (overlapping counts). None was an enum failure or a mathematical-error
classification. The clarified schema uses explicit candidateA/candidateB objects;
wire JSON and normalized bindings are both preserved. Initial outcomes remain
unchanged. All 23 clarified turns passed the strict checks, yielding 202 selected
reviews without silently extracting or repairing a failed answer.

| Reviewer | Candidate author | Recorded answer correctness counts |
| --- | --- | --- |
| Opus 5.5 | Original Opus | 101 correct |
| Opus 5.5 | Original Sonnet | 88 correct, 12 incorrect, 1 incomplete |
| Sonnet 5.5 | Original Opus | 100 correct, 1 undetermined |
| Sonnet 5.5 | Original Sonnet | 86 correct, 13 incorrect, 1 incomplete, 1 undetermined |

These are model verdicts, not certified correctness totals. Both reviewers flag
12 original Sonnet answer/explanation contradictions. Three flags concern the
former answer-agreement cohort: q047 and q167 retain their original source holds;
q069 is a **new reviewer's label/evidence contradiction**. That review records
an incorrect label while its evidence explicitly concludes the candidate is
correct. Independent Codex recomputation/adjudication is stored separately, and
neither the raw label nor these counts was rewritten. No human person performed
these agent checks, and no database answer was changed. Agreement cannot clear
missing source conditions or inconsistent premises.

The separate 24-turn authored control study has 22 strict acceptances and two
preserved schema failures. Of ten order pairs with both turns accepted, eight
have identical mapped verdicts. Exact expected-object comparison matches 14
accepted turns; conservative variants and verdict defects remain for independent
Codex disposition. One sample per order/model and this small authored set do not
establish general order invariance or resistance to prompt injection.

## Actual-function OCR and code reviews

The owner executed **114 authored OCR requests** captured through actual product
functions: 16 baseline, 24 fixed controls, six independent cases after the first
patch freeze, 60 final-prompt configuration comparisons, and eight calls on the
four authoritative cases authored after the final prompt freeze. Those four
are post-prompt-freeze cases, not post-UI-code-freeze cases. Source images,
expectations, and earlier failures remain preserved.

The final paired arms share identical messages, system content and image bytes.
Only model, effort and token cap differ: app-supported Opus 5 medium/4,096 versus
experimental Opus 5.5 high/8,192. The latter is a disclosed QA routing override,
not a production allowlist change. These are post-hoc configurations; three
variables change together, so causal or general performance claims are unsupported.

The product worker's deterministic actual-function replays report:

| Cohort/configuration | Cases | Quality pass | Quality failed | Parser/schema failed |
| --- | ---: | ---: | ---: | ---: |
| Original baseline | 16 | 10 | 5 | 1 |
| Original fixed controls | 24 | 14 | 10 | 0 |
| Independent post-first-freeze | 6 | 4 | 2 | 0 |
| Final current, reused confirmation cohort | 30 | 20 | 9 | 1 |
| Final experimental, same confirmation cohort | 30 | 20 | 10 | 0 |
| Post-final-prompt four, current | 4 | 1 | 3 | 0 |
| Post-final-prompt four, experimental | 4 | 4 | 0 | 0 |

The final experimental 30-case failures include six OCR structure/count failures
and four crop-geometry failures; they are not ten instances of the same defect.
The source attribution records five legacy-shape and one native-shape OCR
failures, with only two raw fifth-choice mismatches on partly visible cut rows;
those observations do not establish hallucination. A crop warning is not a
repair, proof of semantic completeness, or import gate. Geometry failures and
adjacent-source contamination remain failures even when warnings are visible.

Three separate author-blinded Opus high static reviews cover the initial product
patch, the warning-propagation delta, and the final prompt/rotation-warning delta.
Requests exclude author test outcomes and earlier review conclusions. Their
findings are candidates requiring independent Codex verification/disposition;
model authority alone never establishes a defect. The final review retains three
residual candidates concerning text-layer warning lifetime, a non-five-choice
layout example, and short-answer-marker wording. No further model tuning loop
or product edit was performed by this API owner. Product source/commit mapping
and exact finding dispositions remain in the product worker's evidence.

This scope did not run browser/UI E2E, a server, production routes/authentication,
production persistence, builds, curriculum alignment, or a measured learning study.

## Verification and evidence

- **28 offline guards pass**, including cap-before-transport, refusal/resume,
  malformed/duplicate JSON, mixed tools, completion/model matching, format binding,
  missing expected calls, raw/request tampering, and exact rejected-reason checks.
- Full offline audit: expected 366, started 366, pending zero, errors zero; all
  frozen requests/ancestry and every accepted/rejected raw are reparsed.
- Old selected candidates are rebound directly to the original 202 raw responses;
  exact 101-projection/202-turn sets, aliases and displayed candidates are checked.
- Final 30-case and four-case pair bindings confirm only the declared configuration
  differences. The superseded old shadow has zero attempts.
- All **7,085 prior noncredential evidence files** in the old evaluation root are
  unchanged. The credential is deliberately excluded from that fingerprint set.
  The old 287 ledger, historical source/provenance gaps, and source holds remain.
- No raw source material, prompts, images, responses, credential, or original answer
  vault is added to product Git. The source worktree contains only this QA directory.

Private evidence root:
`/Users/pss/Desktop/creative/display-survey/consensus/claude-quality-review-20261022/api`.
The old root and key location remain unchanged. `ledger.json`, `audit.json`,
`full-audit.json`, selected/initial review summaries, response maps and Git freezes
provide exact bindings; protected calculations and raw content stay external.

| Important private evidence seal | SHA |
| --- | --- |
| Fresh Models authentication/capability | `8fa1b663d28567772eb324de66baab626d143d15` |
| Original 202 request freeze | `227debb282d07494fe1ab3eba2d34fa95880cdf2` |
| Original 202 raw outcomes | `9a57de18d0f6941168066f708e15215c48bda4e1` |
| Format clarification request freeze | `c2933c4b9ee94cdba3dc832405c9ae0049501b5e` |
| Selected 202 reviews, originals retained | `ffcb099ec052431b42dfb8034cfc18c7071110c4` |
| All 366 raw outcomes and response maps | `0e5b6dd60a885f2e491422009fe7b66e610402c7` |
| Complete offline audit and owner adjudication | `53a23f1a38ba6092815a06a8399ee5a09f07ffe0` |

The final code SHA, report hashes and final delivery seal are sent to the
independent Codex auditor and coordinator. Their acceptance and any main
integration remain separate from this API owner's completed execution.
