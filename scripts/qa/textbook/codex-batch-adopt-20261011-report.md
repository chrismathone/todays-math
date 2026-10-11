# Completed Codex cohort adoption

The new `codex-batch-adopt-20261011.ts` CLI plans adoption by default. It accepts only
`--snapshot`, `--generation-dir`, `--review-dir`, `--out`, and optional `--apply`;
apply also requires inherited `ALLOW_SHARED_IMPORT=1`. The exported
`parseCodexBatchAdoptOptions` and `runCodexBatchAdopt(options, { runProcess, env,
log? })` support offline testing without invoking any real child pipeline.

## Evidence and execution

- Requires a completed review summary, matching manifest and numbered batch files,
  valid review digests, unique UUID sources, source/checkpoint bindings, and intact
  ordered two-slot pairs. At most 256 reviewed sources are accepted.
- Rechecks current candidate hashes for every case, the actual successful Codex
  receipt/output/schema bytes, independent subscription sessions, and passed case
  evidence against the actual grouped outputs. It invokes the existing deterministic
  case checks; it performs no new inference.
- `packet.json` and `source-ids.json` contain only passed pairs. `full-reviews.json`
  contains each selected batch in full, including held siblings, original case
  positions and shared communications. `cohort-reviews.json` additionally retains
  wholly held batches, which can legitimately have stopped before phase three and
  therefore are not submitted to the qualifier. No single-pair proof is fabricated.
- `plan.json` records exact input paths and byte hashes. `originals/` preserves exact
  input bytes, including the original generation checkpoint files and actual proof
  artifacts. Existing output is accepted only when identical; missing or changed
  saved inputs fail closed. Output overlap and nested junctions/symlinks are rejected.
- Apply runs the existing production renderer `retry-render-20261011/run.cjs`, reads
  its actual `browser-qa.json`, and checks the exact input/payload, candidate counts,
  all four 1440/390 screen/print modes and failure indicators before insertion.
- The original generation manifest and selected source checkpoints are copied
  byte-for-byte to `insertion/`. Only this clone is passed to the old
  `db-retry-20261011/cli.ts --apply --resume`, with explicit source IDs, bounded
  limit and concurrency 1. There is no `--generate` path and no adoption-created
  ownership ID. Already inserted owned checkpoints are verified and reused.
- Qualification runs `codex-batch-qualify-20261011.ts --apply`, with the original
  `--generation-dir`, real `--receipt-root review-dir/artifacts`, and each verified
  inserted checkpoint as an `--owner-receipt`. The existing qualifier reloads live
  DB sources and figure bytes and checks complete batch bindings before promotion.
- Children use `process.execPath`, an argv array, `shell:false` and
  `windowsHide:true`. Unicode and spaces remain individual arguments. An environment
  allowlist retains DB/runtime/renderer settings and strips provider credentials,
  model routing, proxy settings, `NODE_OPTIONS` and dotenv configuration. A generated
  CJS preload prevents `.env` file reads, including Prisma's implicit autoload and
  `process.loadEnvFile`; children receive no `--env-file` argument.
- `stages/` stores append-only start/result status and output byte counts, without
  raw child stdout, stderr, credentials, URLs or stack traces. Renderer attempts use
  new directories. The actual child renderer and qualifier files remain preserved.

The generation `.run.lock` and review `.review.lock` must be absent before apply
and at stage boundaries; existing insertion locks remain owned by the existing
inserter. Adoption has its own exclusive lock. An empty/all-held selection returns
`empty` without any process or DB work.

## Recovery

Renderer failure stops before insertion. Insertion failure stops before
qualification. A durable `inserting` checkpoint can be handed back to the existing
inserter with the same saved IDs; missing ownership checkpoints are never regenerated
after insertion starts. Unowned/preexisting pairs are not treated as owned success.

`qualification-started.json` is written before launching qualification. If that
attempt has no durable qualification receipt, the tool preserves all rows/proofs
and stops with `qualification-receipt-missing-audit-required`; root must audit the
actual DB state. It does not guess whether a transaction committed or retry a
possibly completed promotion. A complete existing qualification receipt is verified
against packet, full selected reviews, render and ownership file hashes, exact
intended IDs/external IDs, proof kind and approval states, then returned with no
new filesystem writes or processes. A changed proof/ownership file fails closed.

## Concrete PowerShell launch from the main repository root

Run this only after `grouped-stream-2-review/summary.json` exists and both the
generation/review jobs have released their locks. These are the current cohort
paths; the snapshot hash was checked against the generation/review manifest:
`451dfad3a613bb10327361fac42a91863a4d7e3b4736367070ae7e2757d75535`.
This command is documented for root; this worker did not execute it.

```powershell
$env:ALLOW_SHARED_IMPORT = '1'
node .\node_modules\tsx\dist\cli.mjs --env-file=.env .\scripts\qa\textbook\codex-batch-adopt-20261011.ts `
  --snapshot '.qa-artifacts\textbook-codex-plan-20261011\after-drafts-snapshot\source-snapshot.json' `
  --generation-dir '.qa-artifacts\textbook-codex-plan-20261011\grouped-generation' `
  --review-dir '.qa-artifacts\textbook-codex-plan-20261011\grouped-stream-2-review' `
  --out '.qa-artifacts\textbook-codex-plan-20261011\grouped-stream-2-adoption' `
  --apply
```

For an offline plan, omit `--apply`, the environment assignment and `--env-file=.env`.
Use the same output directory to apply that unchanged plan or verify its successful
receipt. Do not delete a qualification marker to bypass the audit boundary.

## Validation and scope

- 40 tests passed in the single scoped test file using the dedicated Vitest config.
  Fixtures are synthetic and local to temporary directories. Process APIs are
  blocked by the existing test safety setup; DB/model imports and network fetches
  are blocked in the test file. Stage runners are injected functions only.
- Scoped strict TypeScript checking and ESLint with zero warnings passed.
- Tests cover incomplete/corrupt proofs, held siblings and wholly held batches,
  duplicate/wrong source/slot, changed payloads, plan isolation, stripped credentials
  with retained DB vars, dotenv preload guards, Unicode argv, stage ordering,
  failure stops, locks, path overlap/junctions, ownership recovery, existing receipt
  integrity, no-write successful reuse, and lost receipt preservation.
- Real inference calls: **0**. Real DB operations: **0**. Real production renderer,
  figure engine, insertion or qualification process calls: **0**. No `.env` file
  was read by this worker. No human review logs were created.
- The initial test run exposed the repository-documented Windows `rmSync` crash
  with Unicode paths; fixture cleanup now uses async directory removal and explicit
  file unlinking. The complete scoped suite then passed with no skipped tests or
  unhandled errors.

Checks from the repository root:

```powershell
node node_modules/vitest/vitest.mjs run --config scripts/qa/textbook/codex-batch-adopt-20261011.vitest.config.mts
node node_modules/typescript/bin/tsc --noEmit --project scripts/qa/textbook/codex-batch-adopt-20261011.tsconfig.json
node node_modules/eslint/bin/eslint.js scripts/qa/textbook/codex-batch-adopt-20261011.ts scripts/qa/textbook/codex-batch-adopt-20261011.test.ts scripts/qa/textbook/codex-batch-adopt-20261011.vitest.config.mts --max-warnings 0
```

Only the new adopter, its scoped test/config files and this report are owned changes.
Root still owns integration, the real adoption pipeline and the post-import data
census. The node_modules junction is preserved; root owns worktree cleanup.
