# Scoped Claude API evaluation

QA-only tools for the explicitly authorized 2026-10-22 evaluation. They do not
load app environment files, call production routes or databases, change models
in the app, install dependencies, build, push, or deploy.

The evidence directory is outside this repository, under the evaluation brief's
`claude-api-evaluation-20261022` folder. Its `private/cohort` is a separate local
Git repository; the credential is a sibling and is never added to that Git.
Source text, prompts, images, raw responses, reference answers, and detailed
mathematical checks remain outside the product repository.

## Execution and review

```sh
python3 -B -m unittest discover -s scripts/qa/claude-api-evaluation -p 'test_*.py' -v
python3 -B scripts/qa/claude-api-evaluation/cohort.py freeze
python3 -B scripts/qa/claude-api-evaluation/cohort.py pilot
python3 -B scripts/qa/claude-api-evaluation/cohort.py run
# Only original completed JSON-format failures qualify; no answers enter requests.
python3 -B scripts/qa/claude-api-evaluation/cohort.py freeze-format
python3 -B scripts/qa/claude-api-evaluation/cohort.py run --series format --first 3
python3 -B scripts/qa/claude-api-evaluation/cohort.py run --series format
python3 -B scripts/qa/claude-api-evaluation/cohort.py seal
python3 -B scripts/qa/claude-api-evaluation/verify.py --compare
# Subsequent audits reproduce evidence without modifying prior review files.
python3 -B scripts/qa/claude-api-evaluation/verify.py --compare --read-only --include-features
```

The commands are not an instruction to repeat the completed cohort. An existing
attempt directory is preserved. An unfinished or ambiguous network attempt is
not automatically reissued. In the original phases only HTTP 429 gets bounded backoff, with each
attempt consuming the same 300-request ledger. A process lock and two-worker
executor keep the evaluation at two simultaneous requests. HTTP 401/402/403
halts further dispatch. The actual key expiry and credit balance are unknown.

The fixed HTTPS destination is `api.anthropic.com`; certificate verification is
on, redirects and environment proxies are disabled. Authentication is built in
memory and never included in request evidence, logs, subprocess arguments, or
model prompts. Unknown exceptions are recorded by class only. The runner does
not execute tools: no tools are declared, and unexpected content blocks are
rejected. Actual response model, stop reason, request/message IDs, usage, exact
request/response bytes, and timestamped attempts are retained.

The original 114 packets are 91 DB and 23 original-text projections. Identical
student bytes reduce them to 101 distinct projections, each independently sent
to Sonnet 5.5 medium and Opus 5.5 high. This is **two models from one provider**.
It is not provider-independent evidence. Every reused mapping remains explicit.

The 202 original calls produced 168 strict JSON passes and 34 format failures.
Only those 34 failures received a new frozen, schema-constrained blind request;
all 34 passed. Original failures remain in the ledger. Schema compliance is not
mathematical correctness: the review retains answer/reasoning contradictions
and does not replace an answer with a correction embedded in its explanation.

Reference answers are first read semantically after strict Git ancestry and
sealed raw-to-parsed checks. `verify.py` uses a small rational/ordered-list
comparator, not a general symbolic solver. Unsupported equivalence is a hold.
Mixed prose/JSON diagnostic extraction is not used for answer comparison.
Original HWP answer fragments can contain partial derivations or competing
values; a string-comparison hold is not an original-answer error count.

## Existing webapp features

`features_api.py` freezes the helper's actual-function requests into the same
private ledger; each phase uses a distinct `features-NN` series. Completed
phases are replayed locally. The helper owns `features/`, including its fixture,
capture/replay, strict-render, and negative-contract checks. Current studio
model choices and separately supported English model choices are reported
explicitly; the evaluation does not silently add 5.5 to the studio allowlist.

```sh
python3 -B scripts/qa/claude-api-evaluation/features_api.py freeze --series features-01
python3 -B scripts/qa/claude-api-evaluation/cohort.py run --series features-01
python3 -B scripts/qa/claude-api-evaluation/features_api.py map
```

Read the external report for final counts, observed failures, exact seals,
limitations, and whether a later feature phase remains pending. No historical
CLI failure, legacy generation, unapproved source image, source right, official
curriculum alignment, or production write is certified by this evaluation.

## Separate post-hoc order study and final audit

The separately approved `order_experiment.py` freezes 14 selected projections
and 42 fresh requests across three arms. It preserves actual serialized schema
property order rather than using the canonical serializer for HTTP bodies.
The runner records the SHA of `Request.data`; no prior answer or reference is
included in a request. The manifest disables every retry, including HTTP 429.
Original cohort responses, selections, judgments and seals remain unchanged.

The study has finished. Do not rerun it or expand the call budget. All 24
refusals remain rejected and are included in the 42-call denominator. Only the
18 accepted responses receive mathematical review. This is a selected,
single-run protocol observation, not a general accuracy or causal estimate.

```sh
# Read-only: verifies all phase freezes, raw seal, transmitted study bytes,
# refused envelopes, original preservation, unique IDs, budget and concurrency.
python3 -B scripts/qa/claude-api-evaluation/final_audit.py
```

See [REPORT.md](REPORT.md) for the completed scope and observed results.
