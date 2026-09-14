# Unified bank query parity — 2026-09-14

The unified bank now uses the existing bank's validated query fields, answer
sentinel, source/review labels, curriculum order and derived-format classifier.
Filtering applies before totals and pagination. Unit ranges resolve stored unit
IDs/order, reverse bounds are normalized, and invalid or missing ranges produce
400 rather than silently disappearing. Search covers content, code, answer,
solution, school and printed numeric question number; existing unit-section
search is retained. Whole problem codes use their indexed equality path.

Default results still satisfy shared issuance eligibility. Explicit state filters
can inspect shared pending/rejected/locked questions and return the shared
ineligibility reason. Private pools remain invisible. The row and workspace
selection boundaries reject ineligible additions, while removal remains possible.

## Real corpus failure fixed while restoring format filters

The old bank's format-query function fetched every undecided content ID in one
statement and placed all rejected IDs into a second statement. The live corpus
now has **99,128 eligible rows**. It exceeded PostgreSQL's 32,767 bind-parameter
limit during both content lookup and the final count query (47,944 parameters
in the latter). Simply batching content reads was insufficient.

The shared `findProblemIdsByFormat` retains exactly the existing classification,
reads undecided content in batches of at most 5,000 IDs, and keeps matched IDs in
server order. Both bank routes paginate those IDs before fetching final rows.
The final query contains at most one page's IDs, with visibility/search conditions
reapplied. Counts cover all matched IDs; format pages are not skipped twice.
No schema migration, stored-question mutation or alternate classifier was used.

## Verification

Five focused suites passed **82 tests**: unified filters, original problem API,
original derived-format API, large-corpus transport and workspace eligibility.
The 66,010-candidate regression exceeds the bind limit on both sides, covers a
missing content row, and checks bounded reads and stable matching order. Both
bank APIs have pagination regressions for the format path.

Actual read-only Next dev responses:

| Query | Status | Total |
| --- | --- | ---: |
| Default eligible bank | 200 | 99,128 |
| `format=short_answer` | 200 | 51,189 |
| `source=past_exam&hasFigure=true&hasSolution=true` | 200 | 57 |
| `reviewStatus=pending` | 200 | 0 |
| Attempted `pool=private` override | 400 | — |

The returned short-answer page contains only the same derived short-answer type,
all default rows are eligible, and unit-range metadata contains 735 units. The
empty live pending set is not evidence of state-filter correctness on its own;
seeded shared/private/locked/pending/missing-answer test rows cover that behavior.
Private question contents are not included in these QA artifacts.
