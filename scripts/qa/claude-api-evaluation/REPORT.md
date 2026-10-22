# Claude API evaluation — 2026-10-22

The authorized scope is complete: **287 model requests**, with no pending or
active calls, against a 300-request cap. Official Models API authentication
succeeded before model work. Observed usage estimates **USD 2.276654** at the
official prices captured for this run. No product code, production data,
deployment, main branch or shared dependency tree was changed.

This is QA evidence, not a claim that every response is correct. The original
text cohort retains 14 mapped answer-field disagreements, the feature replay
retains two quality failures, and the separate order study retains 24 refusals.
The API key is excluded from code, Git, prompts, request evidence and logs.

## Scope and cost

| Phase | Calls | Strictly accepted | Retained rejected | Estimated USD |
| --- | ---: | ---: | ---: | ---: |
| Original text cohort, including schema-only corrections | 236 | 202 | 34 format failures | 1.579182 |
| Existing feature paths | 9 | 9 | 0 transport/contract failures | 0.584028 |
| Separate post-hoc order/effort experiment | 42 | 18 | 24 refusals | 0.113444 |
| Total | 287 | 229 | 58 | 2.276654 |

All 287 responses were HTTP 200 with unique request and message IDs. There were
263 `end_turn` completions and 24 `refusal` outcomes, no output truncations and
no observed tool calls. Maximum observed concurrency was two. Total usage was
251,304 input and 89,986 output tokens. Median per-call latency was 3.479 seconds
(range 1.274–18.501); these are one-run observations, not service guarantees.

| Actual model | Calls | Input tokens | Output tokens | Estimated USD |
| --- | ---: | ---: | ---: | ---: |
| Sonnet 5.5 | 171 | 94,516 | 45,329 | 0.642322 |
| Opus 5.5 | 108 | 51,358 | 42,935 | 1.064132 |
| Opus 5 | 8 | 105,430 | 1,722 | 0.570200 |

Prices used were USD 2/10, 4/20 and 5/25 per million input/output tokens,
respectively, from the [official pricing documentation](https://platform.claude.com/docs/en/about-claude/pricing).
No cache usage was reported. This estimates token charges; the account invoice,
remaining credits and credential expiry were not inspected. No further calls
are planned; the unused 13-request allowance is not authorization to expand.

## Original text cohort

The prepared denominator is 458 packets across 229 targets. The frozen eligible
scope is **114 text packets** (91 DB projections and 23 original-text
projections), covering 91 targets. The other 138 targets retain both-side holds
(124 visual, 14 other). No unapproved original source image was transmitted.
Exact student-byte deduplication yielded **101 unique projections**, each sent
to Sonnet 5.5 medium/4,096 and Opus 5.5 high/8,192: 202 original calls. The 26
reused mapping slots remain explicit and are not independent responses.

The original calls produced 168 strict JSON passes and 34 format failures.
Only those format failures received one separately frozen schema-constrained
request with the same student prompt, model and effort. All 34 passed, giving
202 selected responses mapped back to all 114 packets; the original 34 failures
remain rejected. No answer, other model response, reference or correction was
included in the blind requests. Reference answers were first read after the
blind response seal, at 08:50:48 UTC.

The deliberately narrow machine comparator reports 50 matches, 60 holds and
four differences across the 114 mapped model pairs. Direct reading of all
pairs establishes **100 answer-equivalent pairs and 14 answer-field
differences**, covering 12 unique projections and 11 targets. Those 14 Sonnet
answer fields conflict with their own later reasoning and with Opus plus the
direct calculation. A correction in reasoning never replaces the recorded
answer field. These agreement counts do not prove that all 100 equivalent
pairs are mathematically correct.

Independent deterministic calculations cover 24 checks over 23 packet
samples, including rational arithmetic, enumeration, critical values and
systems; the sign case additionally has a universal algebraic proof. Direct
review preserves an incomplete-choice source hold and an impossible-probability
source hold. Model agreement does not clear either source problem.

All 114 original-reference comparisons remain held by the limited comparator:
the extracted HWP references can be partial derivations or conflicting fragments.
This is not a count of 114 wrong original answers. A few apparent reference
disagreements remain candidates for source verification, with no automatic
answer/database correction. Sonnet and Opus are two models from one provider,
not independent-provider verification.

## Existing webapp features

The actual server functions and parsers completed all **eight specimens across
seven feature paths**, consuming nine raw API phases. Six specimens pass the
independent quality checks. The two retained failures are:

- English OCR translated the instruction under the current Korean-only prompt;
  a separate Korean five-choice control passes. The four-choice warning is
  produced by the existing deterministic normalizer, not missing model text.
- Page OCR crops cut a mandatory printed choice row and the second question's
  printed answer space. The first omission alone establishes the failure.

Figure detection, strict figure redraw plus review, figure edit commands,
solution generation and English photo reading pass their scoped checks. The
redraw was rendered by the actual strict Python engine and visually inspected.
Its comparison compositor uses an explicitly declared native-image seam;
Chromium, UI, routes, auth, persistence and editor application were not run.
Studio uses its current allowlisted Opus 5; English separately allows Opus 5.5.
Evaluation effort/token caps were injected explicitly, without changing product
defaults. Final real-response replay intentionally exits 1 for the two quality
failures. See [the feature report](features/REPORT.md) for source attribution,
the preserved checker correction, wrapper tool-block gap and detailed limits.

## Separate post-hoc order/effort study

After the original study, a separately authorized 42-call experiment selected
12 known discrepancy projections and two previously correct controls. Each
case was called once per arm using Sonnet 5.5/4,096, with fixed-seed interleaving
and no retries, including no 429 retries. A uses the current answer-first
schema and medium effort; B preserves reasoning/answer/status property order
and states that output order, with medium effort; C differs from B only by high
effort. Actual frozen UTF-8 HTTP bytes match the recorded `Request.data` hashes.
No previous response/reference was included. All raw outcomes were sealed
before final comparison; original selections and judgments remain unchanged.

| Arm | Complete denominator | Accepted | Refused/held | Correct consistent answers | Answer/reasoning contradictions |
| --- | ---: | ---: | ---: | ---: | ---: |
| A, answer first, medium | 14 | 14 | 0 | 4 | 10 |
| B, reasoning first, medium | 14 | 2 | 12 | 2 | 0 among accepted |
| C, reasoning first, high | 14 | 2 | 12 | 2 | 0 among accepted |

All 18 accepted responses have a correct final calculation in their reasoning;
ten A responses retain a wrong or incomplete answer field. Actual output key
order is answer/reasoning/status for A's 14 accepted turns and
reasoning/answer/status for the four accepted B/C turns. Refused responses are
never extracted, repaired or included as correct. The cause of refusal is
unknown. Post-hoc selection, one sample per arm and 12 refusals in each B/C arm
prevent a general accuracy or causal conclusion about order or effort.

## Verification and provenance

- 23 Python guards pass, including immutable-byte, schema, completion, actual
  model, credential boundary, request cap, resume/retry, raw-order/transmission
  and refused-envelope checks.
- Six earlier runner/comparator mutations were all detected. This mutation run
  predates the later order-specific additions and does not claim their coverage.
- The helper reports 20 synthetic feature guards and 158 existing regressions
  passing, plus scoped TypeScript, ESLint and affordance checks.
- The final raw audit reports zero audit errors, all 287 calls bound to frozen
  requests/raw response hashes, zero active calls, and **4,118 prior evidence
  files unchanged**. The original 458-packet preparation audit also passes.
- The two historical CLI failures remain intact. This API run does not rewrite
  their outcomes or claim visual-source approval, official curriculum alignment,
  production readiness or measured learning effects.

External evidence root:
`/Users/pss/Desktop/creative/display-survey/consensus/claude-api-evaluation-20261022`.
Protected student content, images, prompts, raw responses, references and direct
mathematical review remain outside the product repository. `final-audit-summary.json`
and `private/final-attempt-ledger.json` bind all 287 outcomes;
`private/order-v1-review.json` holds the separate full-denominator study review.

| Seal | Local private Git commit |
| --- | --- |
| Original student/request freeze | `b2a17f42a2d8e599e32498abacb58c2224d495ed` |
| Schema-only correction freeze | `e75d9cff85cec3bc50e3deb3367d27349ca29cba` |
| Original blind response seal | `9253be78e4711a742b6170eaa3b0fae33d6f6561` |
| Order study request freeze | `e4382674afc55ac0b19fba69c45778cfb354538c` |
| All raw outcomes, including order refusals | `96e9c40cee88523aee280e6de234a346e2acf603` |

The coordinator's independent auditor reviews the final code SHA and evidence
seals before any main integration. Worktree cleanup and integration remain the
coordinator's responsibility; no push or merge to main was performed here.
