# Ownership A delivery — 2026-10-11

Base: `e2de60f0d`. Worktree: `textbook-db-batch-20261011`.

Implemented `dbRetryGeneration.ts`, the pending-only CLI in
`scripts/import/textbook/db-retry-20261011/`, and two unit suites. Source DB
JSON is immutable and source/context/figure byte/candidate/storage digests are
retained. Existing `tb-retry-v1` pairs are skipped, partial pairs conflict,
and new transactions insert exactly two pending rows with preallocated UUID
ownership receipts. No originals, prior variants, students or authorization
settings are modified by the code path.

Generation preserves the installed DeepSeek OpenAI-compatible stack and pro
model for text; it reuses transform prompts and production math normalization
with actual DB grade/unit and original question format. Diagram sources require
real C-loaded bytes, Flash image input and C's strict new SVG renderer.
Generator reproduction is explicitly recorded as self-reproduction only;
even a matching answer and plausible solution cannot approve a candidate.
The worked-solution counterexample is retained in a test as a pending draft
for B/root to reject independently.

CLI defaults to offline/no-write/no-paid-call planning; generation and insertion
are separate opt-ins. Paid/write runs require `--limit` 1–1,000, default
concurrency 2 bounded at 8. Per-source atomic files retain success/failure,
historical call usage/latency/model and insertion intent; exact snapshot-byte
matching and output locking protect resume. A lost commit receipt is recovered
only for matching preallocated owned UUIDs. There is no overwrite, partial
completion, automatic promotion or cleanup/delete command.

Commands actually executed in this worker (all local/offline):

```powershell
node node_modules/vitest/vitest.mjs run src/__tests__/unit/schoolTextbookDbRetryGeneration.test.ts src/__tests__/unit/schoolTextbookDbRetryBatch.test.ts src/__tests__/unit/schoolTextbookRetryPairPlan.test.ts
node node_modules/typescript/bin/tsc --noEmit -p scripts/import/textbook/db-retry-20261011/tsconfig.json
node node_modules/eslint/bin/eslint.js src/lib/import/schoolTextbook/dbRetryGeneration.ts scripts/import/textbook/db-retry-20261011/*.ts src/__tests__/unit/schoolTextbookDbRetryGeneration.test.ts src/__tests__/unit/schoolTextbookDbRetryBatch.test.ts
node node_modules/tsx/dist/cli.mjs scripts/import/textbook/db-retry-20261011/cli.ts --snapshot C:/Creative/testautocreator/.qa-artifacts/textbook-db-variants-20261011/baseline/source-snapshot.json --limit 2
```

The two new suites passed **36 tests**; the final run also included the existing
12 insertion-plan tests, for **48 passing tests across three files**. Local
PGlite PostgreSQL exercised actual
advisory locks and source/unit `FOR SHARE`, exactly-two pending insertion,
transaction rollback after first/second-row and readback faults, source/unit
changes, complete existing approved/edited pair preservation, partial-pair
refusal and lost-receipt recovery. Checkpoint and generation tests cover
byte/source/payload tampering, immutable snapshots, bounded concurrency,
explicit write gates, parse-only retries, paid usage on failure, missing
diagram refusal and reproduction/solution evidence without approval.
Scoped TypeScript and owned-file lint passed. The real baseline dry-run found
12,301 originals, 893 preexisting complete pairs, 475 ineligible originals,
zero partial pairs and selected two eligible sources with zero model calls and
zero DB writes. Root's later pilot made 894 pairs; generation's live preflight
skips that newer pair even with the earlier snapshot.

Read the installed Next environment-variable guide (non-public server secrets;
outside-runtime env loading), Orca orchestration guide and Supabase/Postgres
transaction guidance. Current provider contracts were verified against
[DeepSeek quick start](https://api-docs.deepseek.com/quick_start) and
[DeepSeek vision](https://api-docs.deepseek.com/guides/vision/): keep the existing
OpenAI-compatible pro text API and use Flash for actual image input. Prisma's
installed 6.19 types were used rather than current online ORM-8 signatures.

No paid API request or shared DB write was executed in this worker. The main
`node_modules` junction was retained and never recursively removed. B/C and
root must integrate their owned modules, then run representative real
generation, blind solution/semantic review, production rendering, pending
insertion and separate qualification before any full batch. Run instructions
and recovery details are in the CLI README; the coordinator completion message
contains the exact delivery commit.
