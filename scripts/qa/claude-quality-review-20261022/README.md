# Scoped Claude quality review — 2026-10-22

This directory contains QA tooling only. It does not load app `.env` files, start
servers, write source records, change product routing, or install dependencies.
Protected inputs, prompts, images, raw responses, candidate bindings, accounting,
and Git seals stay in the separately private external `api/` evidence repository.
The single credential remains in its original private location and is read into
memory only by the authorized owner; it is never passed to subprocesses.

The main review covers 101 unique original text projections and both selected
candidate answers, with one fresh high-effort Opus 5.5 and Sonnet 5.5 turn per
projection. Candidate authors are hidden with fixed-seed A/B ordering. This is
nonblind verification from one provider, not blind solving or provider independence.
Source sufficiency, answer correctness, and answer/explanation consistency are
separate judgments. Models provide concise checkable evidence, not private
chain-of-thought. Corrections are review material, never database changes.

`review.py` owns official HTTPS-only transport, fresh-auth and model gates,
exclusive execution, a global 600-request ceiling, concurrency three, no automatic
retries, strict raw parsing, and a usage/cost ledger. It reuses the original QA
transport helpers without changing that directory. Refusals, truncation, unexpected
blocks, malformed JSON, empty evidence, missing candidates, or actual-model
mismatches are not accepted. Existing attempts are preserved on resume, and
superseded series cannot execute.

`packages.py` freezes actual-function OCR HTTP bodies unchanged and checks their
embedded image hashes. Shadow captures declare the experimental model/configuration
and do not change the app allowlist. `corrections.py` implements only the separately
authorized one-time format clarifications; both wire JSON and normalized bindings
remain explicit. `code_review.py` freezes author-blinded static reviews without
helper outcomes. `summarize.py` and `controls_summary.py` preserve raw verdicts,
source holds, full denominators, order differences, and rejected outcomes.
`final_audit.py` reparses every accepted and rejected raw, checks frozen request
ancestry and exact expected sets, rebinds the old 202 candidates directly to raw,
and verifies the final paired arms differ only in their three declared config fields.

Offline checks:

```sh
python3 -m unittest discover -s scripts/qa/claude-quality-review-20261022 -p 'test_*.py' -q
python3 scripts/qa/claude-quality-review-20261022/review.py audit
python3 scripts/qa/claude-quality-review-20261022/final_audit.py --complete
```

API execution is scoped to the explicit owner brief and coordinator authorizations;
the unused ceiling is not permission for additional experiments. The old 287-call
ledger is never extended or rewritten. Mathematical disagreements and product
quality failures remain reportable outcomes, not reasons for silent extraction,
success-chasing retries, automatic repair, or production approval.
