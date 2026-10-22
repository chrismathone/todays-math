# Fraction insight independent audit

Product source is read-only here. Ordinary tests are offline, use synthetic course
transitions, and never load credentials or make model/DB calls. The lead owns
integration, production verification, build and deployment.

```sh
node node_modules/vitest/vitest.mjs run --config scripts/qa/math-insight-eval/vitest.config.mts
node node_modules/typescript/bin/tsc --noEmit -p scripts/qa/math-insight-eval/tsconfig.json
```

The audit evidence is external to the product repository:
`/Users/pss/Desktop/creative/display-survey/consensus/ontology-pilot-20261022/audit`.
Its Git history freezes synthetic sources, actual server prompts/transport bodies,
expected outcomes, source hashes and tool versions before each paid cohort, then
seals raw responses and all failures. `summarize.py` verifies each pre-call Git
blob and raw response hash and estimates token cost, including truncated calls.

`capture.test.ts` requires explicit `INSIGHT_AUDIT_MODE=capture`; it intercepts
the actual `runModelApi` request using placeholder credentials. `replay.test.ts`
requires `INSIGHT_AUDIT_MODE=replay` and feeds saved raw provider output through
the actual transport, parser and composer. Source hashes must match. It reports
guard acceptance separately from semantic intent quality.

`live.py` is an explicitly invoked, task-authorized runner, never a unit-test
helper. It alone loads the assigned existing credentials into memory and sends
already-frozen synthetic request bodies. It permits at most two concurrent calls,
48 total attempts, one attempt per ID, and no retries. Feature cohorts preserve
the actual 700-token and 20-second runtime limits. Architecture/source review
cohorts disclose their separate budgets and do not certify feature runtime.
Gemini credential/CLI unavailability is preserved; a configured production Secret
was not exported or bypassed. No production requests were made by this worker.

The 18 baseline cases are a small authored regression set. A later same-case
repair cohort is not independent heldout accuracy. Four predeclared followups
distinguish new queries on baseline states from new generated record states.
These checks make no official curriculum, diagnosis, mastery, learning-effect or
all-content certification claim.
